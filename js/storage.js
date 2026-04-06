// js/storage.js — Data persistence layer (localStorage + Supabase + offline queue)

const Storage = {
    // ===== LOCAL STORAGE =====
    _get(key) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : null;
        } catch { return null; }
    },

    _set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('localStorage write failed:', e);
        }
    },

    // ===== SUPABASE CLIENT =====
    _supabase: null,

    async initSupabase() {
        if (!SUPABASE_ENABLED || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.log('Supabase not configured — running in offline mode');
            return false;
        }
        try {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            this._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase connected');

            // Process offline queue
            await this.processOfflineQueue();

            // Start auto-sync scheduler
            this.startAutoSync();

            // Listen for online/offline events
            window.addEventListener('online', () => {
                console.log('Back online — processing queue');
                this.processOfflineQueue();
            });

            return true;
        } catch (e) {
            console.error('Supabase init failed:', e);
            return false;
        }
    },

    isOnline() {
        return this._supabase !== null && navigator.onLine;
    },

    // ===== PRODUCTS =====
    getProducts() {
        return this._get('crispi_products') || [...DEFAULT_PRODUCTS];
    },

    saveProducts(products) {
        this._set('crispi_products', products);
        this._syncProductsToSupabase(products);
    },

    addProduct(product) {
        const products = this.getProducts();
        product.id = product.id || 'custom-' + Date.now();
        products.push(product);
        this.saveProducts(products);
        return product;
    },

    updateProduct(id, updates) {
        const products = this.getProducts();
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) return null;
        products[idx] = { ...products[idx], ...updates };
        this.saveProducts(products);
        return products[idx];
    },

    deleteProduct(id) {
        const products = this.getProducts().filter(p => p.id !== id);
        this.saveProducts(products);
    },

    // ===== REVENUE (Chiffre d'Affaires) =====
    getRevenue() {
        return this._get('crispi_revenue') || 0;
    },

    addRevenue(amount) {
        const current = this.getRevenue();
        const newTotal = current + amount;
        this._set('crispi_revenue', newTotal);
        this._syncRevenueToSupabase(newTotal);
        return newTotal;
    },

    // ===== ORDERS =====
    getOrderNumber() {
        return this._get('crispi_order_number') || 1;
    },

    incrementOrderNumber() {
        const num = this.getOrderNumber() + 1;
        this._set('crispi_order_number', num);
        return num;
    },

    saveOrder(order) {
        const orders = this._get('crispi_orders') || [];
        orders.push(order);
        if (orders.length > 500) orders.splice(0, orders.length - 500);
        this._set('crispi_orders', orders);
        this._syncOrderToSupabase(order);
    },

    // ===== SOFT DELETE (mark as deleted, keep in DB) =====
    softDeleteOrder(orderId) {
        if (this.isOnline()) {
            this._supabase.from('orders')
                .update({ deleted: true, deleted_at: new Date().toISOString() })
                .eq('id', orderId)
                .then(() => console.log('Order soft-deleted in Supabase'))
                .catch(e => console.error('Soft delete sync failed:', e));
        } else {
            this._addToQueue({ type: 'soft_delete_order', data: { id: orderId, deleted_at: new Date().toISOString() } });
        }
    },

    // ===== OFFLINE QUEUE =====
    _getQueue() {
        return this._get('crispi_offline_queue') || [];
    },

    _saveQueue(queue) {
        this._set('crispi_offline_queue', queue);
    },

    _addToQueue(item) {
        const queue = this._getQueue();
        queue.push({ ...item, queued_at: new Date().toISOString() });
        this._saveQueue(queue);
        console.log('Added to offline queue:', item.type);
    },

    async processOfflineQueue() {
        if (!this.isOnline()) return;

        const queue = this._getQueue();
        if (queue.length === 0) return;

        console.log(`Processing ${queue.length} offline queue items...`);
        const failed = [];

        for (const item of queue) {
            try {
                switch (item.type) {
                    case 'save_order':
                        await this._supabase.from('orders').upsert({
                            id: item.data.id,
                            order_number: item.data.orderNumber,
                            items: item.data.items,
                            total: item.data.total,
                            created_at: item.data.timestamp
                        }, { onConflict: 'id' });
                        break;

                    case 'soft_delete_order':
                        await this._supabase.from('orders')
                            .update({ deleted: true, deleted_at: item.data.deleted_at })
                            .eq('id', item.data.id);
                        break;

                    case 'sync_revenue':
                        await this._supabase.from('revenue').upsert({
                            id: 'main',
                            total: item.data.total,
                            updated_at: new Date().toISOString()
                        }, { onConflict: 'id' });
                        break;

                    case 'sync_products':
                        await this._supabase.from('products').upsert(
                            item.data.map(p => ({
                                id: p.id, name: p.name, price: p.price,
                                category: p.category, image: p.image,
                                position: p.position, updated_at: new Date().toISOString()
                            })),
                            { onConflict: 'id' }
                        );
                        break;

                    default:
                        console.warn('Unknown queue item type:', item.type);
                }
            } catch (e) {
                console.error('Queue item failed:', item.type, e);
                failed.push(item);
            }
        }

        this._saveQueue(failed);
        if (failed.length === 0) {
            console.log('Offline queue fully processed');
        } else {
            console.log(`${failed.length} items still in queue`);
        }
    },

    // ===== AUTO-SYNC (twice per day: 12:00 and 22:00) =====
    _syncTimer: null,

    startAutoSync() {
        // Check every 5 minutes if it's time to sync
        this._syncTimer = setInterval(() => this._checkAutoSync(), 5 * 60 * 1000);
        // Also check immediately
        this._checkAutoSync();
    },

    _checkAutoSync() {
        if (!this.isOnline()) return;

        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();
        const today = now.toISOString().split('T')[0];
        const lastSync = this._get('crispi_last_auto_sync') || '';

        // Sync at 12:00-12:04 or 22:00-22:04 (5-min window)
        const isSyncTime = (hour === 12 || hour === 22) && minute < 5;
        const syncKey = `${today}-${hour}`;

        if (isSyncTime && lastSync !== syncKey) {
            console.log('Auto-sync triggered at', now.toLocaleTimeString());
            this._set('crispi_last_auto_sync', syncKey);
            this.fullSync();
        }
    },

    async fullSync() {
        if (!this.isOnline()) return;

        console.log('Starting full sync...');
        try {
            // 1. Process any pending offline items
            await this.processOfflineQueue();

            // 2. Sync all local orders to Supabase
            const localOrders = this._get('crispi_orders') || [];
            if (localOrders.length > 0) {
                const batch = localOrders.map(o => ({
                    id: o.id,
                    order_number: o.orderNumber,
                    items: o.items,
                    total: o.total,
                    created_at: o.timestamp
                }));

                // Upsert in batches of 50
                for (let i = 0; i < batch.length; i += 50) {
                    const chunk = batch.slice(i, i + 50);
                    await this._supabase.from('orders').upsert(chunk, { onConflict: 'id' });
                }
            }

            // 3. Sync revenue
            await this._supabase.from('revenue').upsert({
                id: 'main',
                total: this.getRevenue(),
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

            // 4. Sync products
            const products = this.getProducts();
            await this._supabase.from('products').upsert(
                products.map(p => ({
                    id: p.id, name: p.name, price: p.price,
                    category: p.category, image: p.image,
                    position: p.position, updated_at: new Date().toISOString()
                })),
                { onConflict: 'id' }
            );

            // 5. Log the sync
            await this._supabase.from('sync_log').insert({
                sync_type: 'full_auto',
                items_count: localOrders.length,
                synced_at: new Date().toISOString()
            });

            console.log('Full sync complete:', localOrders.length, 'orders');
        } catch (e) {
            console.error('Full sync failed:', e);
        }
    },

    // ===== SUPABASE SYNC (individual operations) =====
    async _syncProductsToSupabase(products) {
        if (this.isOnline()) {
            try {
                await this._supabase.from('products').upsert(
                    products.map(p => ({
                        id: p.id, name: p.name, price: p.price,
                        category: p.category, image: p.image,
                        position: p.position, updated_at: new Date().toISOString()
                    })),
                    { onConflict: 'id' }
                );
            } catch (e) { console.error('Product sync failed:', e); }
        } else {
            this._addToQueue({ type: 'sync_products', data: products });
        }
    },

    async _syncRevenueToSupabase(total) {
        if (this.isOnline()) {
            try {
                await this._supabase.from('revenue').upsert({
                    id: 'main',
                    total: total,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });
            } catch (e) { console.error('Revenue sync failed:', e); }
        } else {
            this._addToQueue({ type: 'sync_revenue', data: { total } });
        }
    },

    async _syncOrderToSupabase(order) {
        if (this.isOnline()) {
            try {
                await this._supabase.from('orders').upsert({
                    id: order.id,
                    order_number: order.orderNumber,
                    items: order.items,
                    total: order.total,
                    created_at: order.timestamp
                }, { onConflict: 'id' });
            } catch (e) { console.error('Order sync failed:', e); }
        } else {
            this._addToQueue({ type: 'save_order', data: order });
        }
    },

    async syncFromSupabase() {
        if (!this.isOnline()) return;
        try {
            const { data: revData } = await this._supabase
                .from('revenue')
                .select('total')
                .eq('id', 'main')
                .single();
            if (revData) {
                const localRev = this.getRevenue();
                const remoteRev = revData.total || 0;
                if (remoteRev > localRev) {
                    this._set('crispi_revenue', remoteRev);
                }
            }

            const { data: prodData } = await this._supabase
                .from('products')
                .select('*')
                .order('position');
            if (prodData && prodData.length > 0) {
                this._set('crispi_products', prodData);
            }
        } catch (e) { console.error('Sync from Supabase failed:', e); }
    }
};
