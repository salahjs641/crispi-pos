// js/tables.js — Table management: landing screen, open tabs, cuisine print, pay

const Tables = {
    _data: {},

    init() {
        this._data = JSON.parse(localStorage.getItem('crispi_tables') || '{}');
        this.buildLandingGrid();
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

    addItemsToTable(tableNum, items, serverName) {
        const key = String(tableNum);
        if (!this._data[key]) {
            this._data[key] = {
                items: [],
                serverName: serverName || '',
                openedAt: new Date().toISOString()
            };
        }
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

    closeTable(tableNum) {
        const key = String(tableNum);
        const table = this._data[key];
        if (!table) return null;
        delete this._data[key];
        this.save();
        return table;
    },

    // ===== LANDING SCREEN =====
    buildLandingGrid() {
        const grid = document.getElementById('landingTablesGrid');
        if (!grid) return;
        grid.innerHTML = '';
        for (let i = 1; i <= 30; i++) {
            const occupied = this.getTable(i);
            const btn = document.createElement('button');
            btn.className = 'landing-table-btn' + (occupied ? ' occupied' : '');
            btn.dataset.table = i;
            btn.innerHTML = occupied
                ? `<span class="lt-num">${i}</span><span class="lt-status">${this.getTableTotal(i).toFixed(0)} DH</span>`
                : `<span class="lt-num">${i}</span><span class="lt-status">Libre</span>`;
            grid.appendChild(btn);
        }
    },

    refreshLanding() {
        this.buildLandingGrid();
        this.updateBadge();
    },

    showLanding() {
        document.getElementById('landingScreen').style.display = '';
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('tablesFullscreen').style.display = 'none';
        this.refreshLanding();
    },

    showMenu() {
        document.getElementById('landingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = '';
        document.getElementById('tablesFullscreen').style.display = 'none';
    },

    showOccupiedTables() {
        document.getElementById('landingScreen').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
        document.getElementById('tablesFullscreen').style.display = '';
        this.renderOccupiedTables();
    },

    bindEvents() {
        // Landing: "A emporter" button
        const emporterBtn = document.getElementById('landingEmporter');
        if (emporterBtn) {
            emporterBtn.addEventListener('click', () => {
                this.showMenu();
                // Set A emporter mode
                document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
                document.querySelector('.order-type-btn[data-type="A emporter"]').classList.add('active');
                document.getElementById('tableNumber').value = '';
                document.getElementById('tableToggleBtn').textContent = '-';
                document.getElementById('tableToggleBtn').classList.remove('has-value');
                Orders.resetTableMode();
                Orders.items = [];
                Orders.render();
                Orders.updateBadge();
            });
        }

        // Landing: table button click
        const landingGrid = document.getElementById('landingTablesGrid');
        if (landingGrid) {
            landingGrid.addEventListener('click', (e) => {
                const btn = e.target.closest('.landing-table-btn');
                if (!btn) return;
                const num = parseInt(btn.dataset.table);
                const occupied = this.getTable(num);

                if (occupied) {
                    // Show occupied tables view focused on this table
                    this.showOccupiedTables();
                } else {
                    // Open menu for this new table
                    this.openMenuForTable(num);
                }
            });
        }

        // Top bar Tables button -> show occupied tables full screen
        const btnTables = document.getElementById('btnTables');
        if (btnTables) {
            btnTables.addEventListener('click', () => this.showOccupiedTables());
        }

        // Close occupied tables full screen -> back to landing
        const closeBtn = document.getElementById('tablesFullscreenClose');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.showLanding());
        }
    },

    openMenuForTable(tableNum) {
        this.showMenu();

        // Clear current order
        Orders.items = [];
        Orders._tableMode = parseInt(tableNum);

        // Set up UI
        document.getElementById('tableNumber').value = tableNum;
        document.getElementById('tableToggleBtn').textContent = tableNum;
        document.getElementById('tableToggleBtn').classList.add('has-value');

        document.querySelector('.order-header h2').textContent = `TABLE ${tableNum} — AJOUTER`;
        document.getElementById('btnValidate').textContent = 'Ajouter a Table ' + tableNum;

        document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.order-type-btn[data-type="Sur place"]').classList.add('active');

        Orders.render();
        Orders.updateBadge();
    },

    // ===== OCCUPIED TABLES FULL SCREEN WITH PAGINATION =====
    _currentPage: 0,
    TABLES_PER_PAGE: 6,

    renderOccupiedTables() {
        const occupied = this.getOccupiedTables();
        const container = document.getElementById('tablesListBody');
        const pagination = document.getElementById('tablesPagination');

        if (occupied.length === 0) {
            container.innerHTML = '<div class="tables-empty">Aucune table occupee</div>';
            pagination.innerHTML = '';
            return;
        }

        const totalPages = Math.ceil(occupied.length / this.TABLES_PER_PAGE);
        if (this._currentPage >= totalPages) this._currentPage = totalPages - 1;
        if (this._currentPage < 0) this._currentPage = 0;

        const start = this._currentPage * this.TABLES_PER_PAGE;
        const pageTables = occupied.slice(start, start + this.TABLES_PER_PAGE);

        container.innerHTML = pageTables.map(t => {
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
                        <button class="btn btn-table-cuisine" data-table-cuisine="${t.num}">Cuisine</button>
                        <button class="btn btn-table-pay" data-table-pay="${t.num}">Payer</button>
                    </div>
                </div>
            `;
        }).join('');

        // Pagination controls
        if (totalPages > 1) {
            pagination.innerHTML = `
                <button class="page-btn page-prev" id="pagePrev" ${this._currentPage === 0 ? 'disabled' : ''}>&#8592; Precedent</button>
                <span class="page-info">${this._currentPage + 1} / ${totalPages}</span>
                <button class="page-btn page-next" id="pageNext" ${this._currentPage >= totalPages - 1 ? 'disabled' : ''}>Suivant &#8594;</button>
            `;
            document.getElementById('pagePrev').addEventListener('click', () => {
                this._currentPage--;
                this.renderOccupiedTables();
            });
            document.getElementById('pageNext').addEventListener('click', () => {
                this._currentPage++;
                this.renderOccupiedTables();
            });
        } else {
            pagination.innerHTML = '';
        }

        // Bind action buttons
        container.querySelectorAll('[data-table-add]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.startAddingToTable(btn.dataset.tableAdd);
            });
        });

        container.querySelectorAll('[data-table-cuisine]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.sendToCuisine(btn.dataset.tableCuisine);
            });
        });

        container.querySelectorAll('[data-table-pay]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.payTable(btn.dataset.tablePay);
            });
        });
    },

    // ===== SEND KITCHEN TICKET =====
    sendToCuisine(tableNum) {
        const table = this.getTable(tableNum);
        if (!table) return;

        const total = this.getTableTotal(tableNum);
        const date = new Date();
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const itemsRows = table.items.map(item => `
            <tr>
                <td class="item-qty">${item.quantity}x</td>
                <td class="item-name"><strong>${item.name}</strong>${item.note ? `<br><span class="kitchen-note">** ${item.note} **</span>` : ''}</td>
                <td class="item-price">${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');

        const serverLine = table.serverName ? `<br>Serveur: ${table.serverName}` : '';

        document.getElementById('receipt').innerHTML = `
            <div class="receipt-header">
                <h2>-- CUISINE --</h2>
            </div>
            <hr class="receipt-separator">
            <div class="receipt-info" style="text-align:center;">
                <strong style="font-size:16px;">Table ${tableNum}</strong>
                <br><strong style="font-size:14px;">SUR PLACE</strong><br>
                ${timeStr}${serverLine}
            </div>
            <hr class="receipt-separator">
            <table class="receipt-items">
                ${itemsRows}
            </table>
            <div class="receipt-total">
                TOTAL: ${total.toFixed(2)} DH
            </div>
            <hr class="receipt-separator">
        `;

        setTimeout(() => window.print(), 300);
        App.showToast('Ticket cuisine envoye - Table ' + tableNum);
    },

    // ===== ADD MORE ITEMS =====
    startAddingToTable(tableNum) {
        this.openMenuForTable(parseInt(tableNum));
    },

    // ===== PAY TABLE (caisse receipt only) =====
    payTable(tableNum) {
        const table = this.getTable(tableNum);
        if (!table) return;

        const total = this.getTableTotal(tableNum);

        Orders._tablePayMode = parseInt(tableNum);
        Orders._tablePayItems = table.items;
        Orders._tablePayTotal = total;
        Orders._tablePayServer = table.serverName;

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

        const newRevenue = Storage.addRevenue(total);
        App.updateRevenue(newRevenue);

        Storage.incrementOrderNumber();
        Orders.updateOrderNumber();

        this.closeTable(tableNum);

        Orders._tablePayMode = null;
        Orders._tablePayItems = null;
        Orders._tablePayTotal = null;
        Orders._tablePayServer = null;

        // Print ONLY caisse receipt (not kitchen — that was already sent)
        Orders.showSuccessAndPrintCaisse(order, paid, change, orderNumber, total);
    },

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
