// js/tables.js — Table management: open tabs per table, add items, pay to close

const Tables = {
    // Tables data: { "3": { items: [...], serverName: "Salah", openedAt: "..." }, ... }
    _data: {},

    init() {
        this._data = JSON.parse(localStorage.getItem('crispi_tables') || '{}');
        this.bindEvents();
    },

    save() {
        localStorage.setItem('crispi_tables', JSON.stringify(this._data));
    },

    getTable(num) {
        return this._data[String(num)] || null;
    },

    getOccupiedTables() {
        return Object.keys(this._data)
            .map(num => ({ num: parseInt(num), ...this._data[num] }))
            .sort((a, b) => a.num - b.num);
    },

    // Open or add items to a table
    addItemsToTable(tableNum, items, serverName) {
        const key = String(tableNum);
        if (!this._data[key]) {
            this._data[key] = {
                items: [],
                serverName: serverName || '',
                openedAt: new Date().toISOString()
            };
        }
        // Merge items: if same product + same note, increase qty
        for (const newItem of items) {
            const existing = this._data[key].items.find(
                i => i.product_id === newItem.product_id && (i.note || '') === (newItem.note || '')
            );
            if (existing) {
                existing.quantity += newItem.quantity;
                existing.line_total = existing.quantity * existing.price;
            } else {
                this._data[key].items.push({ ...newItem });
            }
        }
        if (serverName) this._data[key].serverName = serverName;
        this.save();
    },

    getTableTotal(tableNum) {
        const table = this.getTable(tableNum);
        if (!table) return 0;
        return table.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    },

    // Close table after payment — returns the items for order creation
    closeTable(tableNum) {
        const key = String(tableNum);
        const table = this._data[key];
        if (!table) return null;
        delete this._data[key];
        this.save();
        return table;
    },

    bindEvents() {
        const btn = document.getElementById('btnTables');
        if (!btn) return;
        btn.addEventListener('click', () => this.openTablesModal());
    },

    openTablesModal() {
        const occupied = this.getOccupiedTables();
        const container = document.getElementById('tablesListBody');

        if (occupied.length === 0) {
            container.innerHTML = '<div class="tables-empty">Aucune table occupee</div>';
        } else {
            container.innerHTML = occupied.map(t => {
                const total = t.items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
                const itemsList = t.items.map(i =>
                    `<div class="table-detail-item">
                        <span class="table-detail-qty">${i.quantity}x</span>
                        <span class="table-detail-name">${i.name}${i.note ? ` <small>(${i.note})</small>` : ''}</span>
                        <span class="table-detail-price">${(i.price * i.quantity).toFixed(2)}</span>
                    </div>`
                ).join('');

                return `
                    <div class="table-card-occupied" data-table="${t.num}">
                        <div class="table-card-header">
                            <div class="table-card-num">Table ${t.num}</div>
                            <div class="table-card-server">${t.serverName || ''}</div>
                            <div class="table-card-total">${total.toFixed(2)} DH</div>
                        </div>
                        <div class="table-card-items">${itemsList}</div>
                        <div class="table-card-actions">
                            <button class="btn btn-table-add" data-table-add="${t.num}">+ Ajouter</button>
                            <button class="btn btn-table-pay" data-table-pay="${t.num}">Payer</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        App.openModal('tablesModal');

        // Bind action buttons
        container.querySelectorAll('[data-table-add]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const num = btn.dataset.tableAdd;
                this.startAddingToTable(num);
            });
        });

        container.querySelectorAll('[data-table-pay]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const num = btn.dataset.tablePay;
                this.payTable(num);
            });
        });
    },

    // Switch POS to "adding to table X" mode
    startAddingToTable(tableNum) {
        App.closeModal('tablesModal');

        // Clear current order
        Orders.items = [];

        // Set table mode
        Orders._tableMode = parseInt(tableNum);

        // Update UI to show which table we're adding to
        document.getElementById('tableNumber').value = tableNum;
        document.getElementById('tableToggleBtn').textContent = tableNum;
        document.getElementById('tableToggleBtn').classList.add('has-value');

        // Update order header to show table mode
        document.querySelector('.order-header h2').textContent = `TABLE ${tableNum} — AJOUTER`;
        document.getElementById('btnValidate').textContent = 'Ajouter a Table ' + tableNum;

        // Make sure Sur place is selected
        document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.order-type-btn[data-type="Sur place"]').classList.add('active');

        Orders.render();
        Orders.updateBadge();

        // Open order panel on mobile
        document.querySelector('.order-panel').classList.add('open');

        App.showToast('Ajoutez des articles pour Table ' + tableNum);
    },

    // Pay and close a table
    payTable(tableNum) {
        App.closeModal('tablesModal');
        const table = this.getTable(tableNum);
        if (!table) return;

        const total = this.getTableTotal(tableNum);

        // Load items into Orders for the payment flow
        Orders._tablePayMode = parseInt(tableNum);
        Orders._tablePayItems = table.items;
        Orders._tablePayTotal = total;
        Orders._tablePayServer = table.serverName;

        // Show payment modal with table total
        document.getElementById('paymentTotal').textContent = total.toFixed(2) + ' DH';
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentChangeRow').style.display = 'none';
        document.getElementById('paymentError').style.display = 'none';
        App.openModal('paymentModal');
    },

    // Called from Orders.confirmPayment when in table pay mode
    confirmTablePayment(paid) {
        const tableNum = Orders._tablePayMode;
        const table = this.getTable(tableNum);
        if (!table) return;

        const total = this.getTableTotal(tableNum);
        const change = paid > 0 ? paid - total : 0;
        const orderNumber = Storage.getOrderNumber();

        // Create order from table
        const order = {
            id: 'order-' + Date.now(),
            orderNumber: orderNumber,
            items: table.items,
            total: total,
            orderType: 'Sur place',
            serverName: table.serverName,
            tableNumber: String(tableNum),
            timestamp: new Date().toISOString()
        };

        Storage.saveOrder(order);
        Orders.lastOrder = order;

        // Update revenue
        const newRevenue = Storage.addRevenue(total);
        App.updateRevenue(newRevenue);

        // Increment order number
        Storage.incrementOrderNumber();
        Orders.updateOrderNumber();

        // Close the table
        this.closeTable(tableNum);

        // Clean up table pay mode
        Orders._tablePayMode = null;
        Orders._tablePayItems = null;
        Orders._tablePayTotal = null;
        Orders._tablePayServer = null;

        // Show success and print
        Orders.showSuccessAndPrint(order, paid, change, orderNumber, total);
    },

    // Get count of occupied tables for badge
    getOccupiedCount() {
        return Object.keys(this._data).length;
    },

    updateBadge() {
        const badge = document.getElementById('tablesBadge');
        if (!badge) return;
        const count = this.getOccupiedCount();
        badge.textContent = count;
        badge.style.display = count > 0 ? '' : 'none';
    }
};
