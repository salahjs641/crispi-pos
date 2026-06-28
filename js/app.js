// js/app.js — App initialization, modal management, toast, confirm dialog

const App = {
    async init() {
        // ── STEP 1: Boot UI immediately from localStorage (zero wait) ──
        const dot = document.getElementById('statusDot');
        dot.classList.add('offline');
        dot.title = 'Connexion...';

        // One-time reset to start clean (2026-04-08)
        if (!localStorage.getItem('crispi_clean_reset_20260408')) {
            localStorage.setItem('crispi_revenue', JSON.stringify(0));
            localStorage.setItem('crispi_last_revenue_reset', this._localDateStr());
            localStorage.setItem('crispi_clean_reset_20260408', 'done');
        }

        // Daily revenue reset at 7 AM (local)
        this.checkDailyReset();
        setInterval(() => this.checkDailyReset(), 2 * 60 * 1000);

        // Seed products
        const MENU_VERSION = 'v6-menu-update';
        if (!localStorage.getItem('crispi_products') || localStorage.getItem('crispi_menu_version') !== MENU_VERSION) {
            const old = JSON.parse(localStorage.getItem('crispi_products') || '[]');
            const defaultIds = new Set(DEFAULT_PRODUCTS.map(p => p.id));
            const customProducts = old.filter(p => !defaultIds.has(p.id));
            Storage.saveProducts([...DEFAULT_PRODUCTS, ...customProducts]);
            localStorage.setItem('crispi_menu_version', MENU_VERSION);
        }

        // Initialize all modules immediately
        Products.init();
        Orders.init();
        Tables.init();
        Calculator.init();
        ProductManager.init();
        Tables.updateBadge();
        this.updateRevenue(Storage.getRevenue());

        // Bind all events
        document.getElementById('chiffreAffairesBtn').addEventListener('click', () => this.openDailySummary());
        document.getElementById('dailySummaryClose').addEventListener('click', () => this.closeModal('dailySummaryModal'));

        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(btn.dataset.close));
        });

        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeModal(overlay.id);
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(m => this.closeModal(m.id));
            }
        });

        window.addEventListener('afterprint', () => {
            if (Orders._pendingCaissePrint) Orders._printCaisseTicket();
        });

        this.initPrinterSettings();

        // ── STEP 2: Connect Supabase in background (non-blocking) ──
        Storage.initSupabase().then(online => {
            dot.classList.toggle('offline', !online);
            dot.title = online ? 'En ligne' : 'Hors ligne';
            if (online) {
                Storage.syncFromSupabase().catch(() => {});
            }
        }).catch(() => {
            dot.classList.add('offline');
            dot.title = 'Hors ligne';
        });

        console.log('Crispi POS ready');
    },

    // ===== PRINTER SETTINGS =====
    initPrinterSettings() {
        const btnSettings = document.getElementById('btnPrinterSettings');
        if (!btnSettings) return;

        btnSettings.addEventListener('click', () => {
            this.openPrinterSettings();
        });

        // Mode toggle buttons
        document.querySelectorAll('.printer-mode-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.printer-mode-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const mode = btn.dataset.mode;
                document.getElementById('printerDualInfo').style.display = mode === 'dual' ? '' : 'none';
                document.getElementById('printerSingleInfo').style.display = mode === 'single' ? '' : 'none';
            });
        });

        // Save button
        document.getElementById('printerSave').addEventListener('click', () => {
            const mode = document.querySelector('.printer-mode-btn.active').dataset.mode;
            localStorage.setItem('crispi_printer_mode', mode);
            this.closeModal('printerModal');
            this.showToast(mode === 'dual' ? '2 imprimantes configurees' : '1 imprimante configuree');
        });
    },

    openPrinterSettings() {
        const currentMode = localStorage.getItem('crispi_printer_mode') || 'dual';

        document.querySelectorAll('.printer-mode-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.mode === currentMode);
        });

        document.getElementById('printerDualInfo').style.display = currentMode === 'dual' ? '' : 'none';
        document.getElementById('printerSingleInfo').style.display = currentMode === 'single' ? '' : 'none';

        this.openModal('printerModal');
    },

    // ===== DAILY REVENUE RESET (7 AM local time) =====
    checkDailyReset() {
        const now = new Date();
        // Use LOCAL date (not UTC) for reset tracking
        const today = this._localDateStr(now);
        const lastResetDate = localStorage.getItem('crispi_last_revenue_reset') || '';

        // If we already reset today, skip
        if (lastResetDate === today) return;

        // Only reset if it's 7 AM or later LOCAL time (and we haven't reset today yet)
        if (now.getHours() >= 7) {
            // Compute previous day's revenue from orders
            const orders = JSON.parse(localStorage.getItem('crispi_orders') || '[]');
            const prevDayOrders = lastResetDate
                ? orders.filter(o => {
                    if (!o.timestamp) return false;
                    const oLocalDate = this._localDateStr(new Date(o.timestamp));
                    return oLocalDate >= lastResetDate && oLocalDate < today;
                })
                : [];
            const prevRevenue = prevDayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

            // Save daily log for previous business day
            if (lastResetDate && prevRevenue > 0) {
                Storage.saveDailyRevenueLog({
                    date: lastResetDate,
                    total: prevRevenue,
                    orderCount: prevDayOrders.length,
                    closedAt: now.toISOString()
                });
            }

            // Set reset date to today (LOCAL) — revenue auto-computes from orders >= today
            localStorage.setItem('crispi_last_revenue_reset', today);
            localStorage.setItem('crispi_revenue', JSON.stringify(0));
            Storage._syncRevenueToSupabase(0);

            // Update display
            this.updateRevenue(Storage.getRevenue());
            console.log('Daily revenue reset at 7 AM (local) —', today);
        }
    },

    // ===== REVENUE DISPLAY =====
    updateRevenue(amount) {
        const formatted = amount.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        document.getElementById('chiffreAffaires').textContent = formatted + ' DH';
    },

    // ===== REVENUE (Chiffre d'Affaires) — computed from actual orders =====
    getRevenue() {
        const todayOrders = this.getTodayOrders();
        return todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    },

    addRevenue(amount) {
        const newTotal = this.getRevenue();
        this._set('crispi_revenue', newTotal);
        this._syncRevenueToSupabase(newTotal);
        return newTotal;
    },

    // Get local date string YYYY-MM-DD (in device's local timezone)
    _localDateStr(date) {
        const d = date || new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    },

    // Get today's non-deleted orders (since last reset date, using LOCAL date)
    getTodayOrders() {
        const orders = JSON.parse(localStorage.getItem('crispi_orders') || '[]');
        const resetDate = localStorage.getItem('crispi_last_revenue_reset') || this._localDateStr();
        return orders.filter(o => {
            if (!o.timestamp) return false;
            if (o.deleted) return false;
            // Convert order timestamp to LOCAL date string
            const oLocalDate = this._localDateStr(new Date(o.timestamp));
            return oLocalDate >= resetDate;
        });
    },

    // ===== DAILY SUMMARY =====
    openDailySummary() {
        const todayOrders = this.getTodayOrders();
        const revenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const orderCount = todayOrders.length;
        const products = Storage.getTodayProductBreakdown();

        // Show the business day (reset date), not the calendar date
        const businessDay = localStorage.getItem('crispi_last_revenue_reset') || new Date().toISOString().split('T')[0];
        const businessDate = new Date(businessDay + 'T12:00:00');
        const dateStr = businessDate.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

        document.getElementById('dailySummaryTitle').textContent = 'Résumé du Jour';

        // Group products by category
        const catNames = {};
        CATEGORIES.forEach(c => { catNames[c.id] = c.name; });

        let productsHTML = '';
        let currentCat = null;
        for (const p of products) {
            if (p.category !== currentCat) {
                currentCat = p.category;
                productsHTML += `<div class="ds-category-header">${catNames[currentCat] || currentCat}</div>`;
            }
            const dimClass = p.qty === 0 ? ' ds-product-zero' : '';
            productsHTML += `
                <div class="ds-product-row${dimClass}">
                    <span class="ds-product-qty">${p.qty === 0 ? '0' : p.qty + 'x'}</span>
                    <span class="ds-product-name">${p.name}</span>
                    <span class="ds-product-total">${p.total.toFixed(2)} DH</span>
                </div>`;
        }

        document.getElementById('dailySummaryBody').innerHTML = `
            <div class="ds-date">${dateStr}</div>
            <div class="ds-stats">
                <div class="ds-stat-card ds-stat-revenue">
                    <div class="ds-stat-label">Chiffre d'Affaires</div>
                    <div class="ds-stat-value">${revenue.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH</div>
                </div>
                <div class="ds-stat-card ds-stat-orders">
                    <div class="ds-stat-label">Commandes</div>
                    <div class="ds-stat-value">${orderCount}</div>
                </div>
            </div>
            <div class="ds-products-section">
                <div class="ds-products-header">Tous les Produits</div>
                <div class="ds-products-list">
                    ${productsHTML}
                </div>
            </div>
        `;

        this.openModal('dailySummaryModal');
    },

    // ===== MODAL MANAGEMENT =====
    openModal(id) {
        document.getElementById(id).classList.add('active');
    },

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    },

    // ===== CONFIRM DIALOG =====
    confirm(message, onConfirm) {
        document.getElementById('confirmMessage').textContent = message;
        this.openModal('confirmModal');

        const yesBtn = document.getElementById('confirmYes');
        const noBtn = document.getElementById('confirmNo');

        const cleanup = () => {
            this.closeModal('confirmModal');
            yesBtn.removeEventListener('click', handleYes);
            noBtn.removeEventListener('click', handleNo);
        };

        const handleYes = () => { cleanup(); onConfirm(); };
        const handleNo = () => { cleanup(); };

        yesBtn.addEventListener('click', handleYes);
        noBtn.addEventListener('click', handleNo);
    },

    // ===== TOAST NOTIFICATION =====
    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }
};

// Start the app
document.addEventListener('DOMContentLoaded', () => App.init());

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(() => {
        console.log('Service Worker registered');
    }).catch(e => {
        console.log('Service Worker registration failed:', e);
    });
}
