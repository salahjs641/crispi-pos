// js/orders.js — Order ticket: add/remove items, validate, cancel

const Orders = {
    items: [],  // Array of { product: {...}, quantity: number, note: string }

    init() {
        this.render();
        this.updateOrderNumber();
        this.bindEvents();
        this.initPayment();
        this.initNoteModal();
    },

    bindEvents() {
        document.getElementById('btnValidate').addEventListener('click', () => this.validate());
        document.getElementById('btnCancel').addEventListener('click', () => this.cancel());

        // Order type selector (Sur place / A emporter)
        document.querySelectorAll('.order-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.updateValidateButton();
            });
        });

        // Server selector
        document.getElementById('serverButtons').addEventListener('click', (e) => {
            const btn = e.target.closest('.server-btn');
            if (!btn) return;
            document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });

        // Table number selector
        this.initTableSelector();

        // Quantity +/- buttons AND note click (delegated)
        document.getElementById('orderItems').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (btn) {
                const id = btn.dataset.id;
                const action = btn.dataset.action;
                if (action === 'plus') this.changeQty(id, 1);
                if (action === 'minus') this.changeQty(id, -1);
                return;
            }

            // Click on item name/info area to add note
            const noteTarget = e.target.closest('.order-item-info');
            if (noteTarget) {
                const itemEl = noteTarget.closest('.order-item');
                if (itemEl) this.openNoteModal(itemEl.dataset.itemId);
            }
        });

        // Mobile toggle
        document.getElementById('btnOrderToggle').addEventListener('click', () => {
            document.querySelector('.order-panel').classList.toggle('open');
        });
    },

    initTableSelector() {
        const grid = document.getElementById('tableGrid');
        const toggle = document.getElementById('tableToggleBtn');
        const dropdown = document.getElementById('tableDropdown');
        const hiddenInput = document.getElementById('tableNumber');

        // Build table number buttons 1-30
        for (let i = 1; i <= 30; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'table-num-btn';
            btn.textContent = i;
            btn.dataset.table = i;
            grid.appendChild(btn);
        }

        // Toggle dropdown — highlight occupied tables
        toggle.addEventListener('click', () => {
            dropdown.classList.toggle('open');
            if (dropdown.classList.contains('open')) {
                grid.querySelectorAll('.table-num-btn').forEach(btn => {
                    const num = btn.dataset.table;
                    const occupied = Tables.getTable(num);
                    btn.classList.toggle('occupied', !!occupied);
                });
            }
        });

        // Select table number
        grid.addEventListener('click', (e) => {
            const btn = e.target.closest('.table-num-btn');
            if (!btn) return;
            const num = btn.dataset.table;
            hiddenInput.value = num;
            toggle.textContent = num;
            toggle.classList.add('has-value');
            grid.querySelectorAll('.table-num-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            dropdown.classList.remove('open');
            this.updateValidateButton();
        });

        // Close dropdown on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.table-selector')) {
                dropdown.classList.remove('open');
            }
        });
    },

    addItem(product) {
        const existing = this.items.find(i => i.product.id === product.id && !i.note);
        if (existing) {
            existing.quantity++;
        } else {
            this.items.push({ product, quantity: 1, note: '', itemId: 'item-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5) });
        }
        this.render();
        this.updateBadge();

        // Animate
        const card = document.querySelector(`.product-card[data-id="${product.id}"]`);
        if (card) {
            card.classList.remove('order-item-added');
            void card.offsetWidth;
            card.classList.add('order-item-added');
        }
    },

    // ===== CATEGORY-SPECIFIC QUICK NOTES =====
    QUICK_NOTES: {
        chawarma: [
            'Sans tomate', 'Sans oignon', 'Sans salade', 'Sans piment',
            'Sans sauce', 'Sans frites',
            'Sauce Biggy', 'Sauce Algerienne', 'Sauce Samurai', 'Sauce Andalouse',
            'Extra fromage', 'Extra viande', 'Bien cuit'
        ],
        poulet: [
            'Sans tomate', 'Sans oignon', 'Sans salade', 'Sans sauce',
            'Sans frites',
            'Sauce Biggy', 'Sauce Algerienne', 'Sauce Samurai', 'Sauce Andalouse',
            'Extra fromage', 'Extra croustillant', 'Bien cuit'
        ],
        'petit-dejeuner': [
            'Sans tomate', 'Sans oignon', 'Sans piment',
            'Extra fromage', 'Bien cuit', 'Avec frites',
            'Sans beurre', 'Sans miel', 'Sans jben', 'Sans olive',
            'Sans zitoun', 'Extra the', 'Extra pain', 'Sans oeuf'
        ],
        boissons: [
            'Sans sucre', '1 sucre', '2 sucres', '3 sucres',
            'Avec glace', 'Sans glace', 'Bien frais', 'Tiede'
        ]
    },

    // ===== NOTE / CUSTOMIZATION MODAL =====
    initNoteModal() {
        const noteConfirm = document.getElementById('noteConfirm');
        const noteCancel = document.getElementById('noteCancel');
        const noteInput = document.getElementById('noteInput');
        const quickNotes = document.getElementById('quickNotes');
        if (!noteConfirm || !noteCancel || !noteInput || !quickNotes) return;

        noteConfirm.addEventListener('click', () => this.saveNote());
        noteCancel.addEventListener('click', () => App.closeModal('noteModal'));
        noteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.saveNote();
        });

        // Quick note buttons (delegated)
        quickNotes.addEventListener('click', (e) => {
            const btn = e.target.closest('.quick-note-btn');
            if (!btn) return;
            const current = noteInput.value.trim();
            const note = btn.dataset.note;
            noteInput.value = current ? current + ', ' + note : note;
            noteInput.focus();
        });
    },

    openNoteModal(itemId) {
        const item = this.items.find(i => i.itemId === itemId);
        if (!item) return;
        this._noteItemId = itemId;
        document.getElementById('noteItemName').textContent = item.product.name;
        document.getElementById('noteInput').value = item.note || '';

        // Swap quick notes based on product category
        const category = item.product.category || '';
        const notes = this.QUICK_NOTES[category] || this.QUICK_NOTES['chawarma'];
        const quickNotes = document.getElementById('quickNotes');
        quickNotes.innerHTML = notes.map(n =>
            `<button class="quick-note-btn" data-note="${n}">${n}</button>`
        ).join('');

        App.openModal('noteModal');
        setTimeout(() => document.getElementById('noteInput').focus(), 100);
    },

    saveNote() {
        const item = this.items.find(i => i.itemId === this._noteItemId);
        if (!item) return;
        item.note = document.getElementById('noteInput').value.trim();
        App.closeModal('noteModal');
        this.render();
    },

    changeQty(itemId, delta) {
        const item = this.items.find(i => i.itemId === itemId);
        if (!item) return;
        item.quantity += delta;
        if (item.quantity <= 0) {
            this.items = this.items.filter(i => i.itemId !== itemId);
        }
        this.render();
        this.updateBadge();
    },

    getTotal() {
        return this.items.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
    },

    render() {
        const container = document.getElementById('orderItems');
        const totalEl = document.getElementById('orderTotal');

        if (this.items.length === 0) {
            container.innerHTML = '<div class="order-empty">Aucun article</div>';
            totalEl.textContent = '0.00 DH';
            return;
        }

        container.innerHTML = this.items.map(i => `
            <div class="order-item" data-item-id="${i.itemId}">
                <div class="order-item-info">
                    <div class="order-item-name">${i.product.name}</div>
                    ${i.note ? `<div class="order-item-note">${i.note}</div>` : '<div class="order-item-note-hint">+ personnaliser</div>'}
                    <div class="order-item-unit-price">${i.product.price.toFixed(2)} DH</div>
                </div>
                <div class="order-item-qty">
                    <button data-action="minus" data-id="${i.itemId}">&minus;</button>
                    <span>${i.quantity}</span>
                    <button data-action="plus" data-id="${i.itemId}">+</button>
                </div>
                <div class="order-item-total">${(i.product.price * i.quantity).toFixed(2)} DH</div>
            </div>
        `).join('');

        totalEl.textContent = this.getTotal().toFixed(2) + ' DH';
    },

    updateBadge() {
        const count = this.items.reduce((sum, i) => sum + i.quantity, 0);
        document.getElementById('toggleBadge').textContent = count;
    },

    updateOrderNumber() {
        const num = Storage.getOrderNumber();
        document.getElementById('orderNumber').textContent = '#' + String(num).padStart(4, '0');
    },

    validate() {
        if (this.items.length === 0) return;

        // If in table add mode, add items to the table and return
        if (this._tableMode) {
            const tableNum = this._tableMode;
            const serverBtn = document.querySelector('.server-btn.active');
            const serverName = serverBtn ? serverBtn.dataset.server : '';

            const itemsToAdd = this.items.map(i => ({
                product_id: i.product.id,
                name: i.product.name,
                quantity: i.quantity,
                price: i.product.price,
                line_total: i.product.price * i.quantity,
                note: i.note || ''
            }));

            Tables.addItemsToTable(tableNum, itemsToAdd, serverName);
            Tables.updateBadge();

            // Reset
            this.items = [];
            this._tableMode = null;
            this.render();
            this.updateBadge();
            this.resetTableMode();

            document.querySelector('.order-panel').classList.remove('open');
            App.showToast('Articles ajoutes a Table ' + tableNum);
            // Go back to landing
            Tables.showLanding();
            return;
        }

        this.openPaymentModal();
    },

    resetTableMode() {
        this._tableMode = null;
        document.querySelector('.order-header h2').textContent = 'COMMANDE EN COURS';
        document.getElementById('btnValidate').textContent = 'Valider Commande';
        document.getElementById('tableNumber').value = '';
        document.getElementById('tableToggleBtn').textContent = '-';
        document.getElementById('tableToggleBtn').classList.remove('has-value');
        document.querySelectorAll('.table-num-btn').forEach(b => b.classList.remove('active'));
    },

    updateValidateButton() {
        if (this._tableMode) return; // Already in table add mode, don't change
        const activeType = document.querySelector('.order-type-btn.active');
        const orderType = activeType ? activeType.dataset.type : '';
        const tableNum = document.getElementById('tableNumber').value;

        if (orderType === 'Sur place' && tableNum) {
            document.getElementById('btnValidate').textContent = 'Ajouter a Table ' + tableNum;
        } else {
            document.getElementById('btnValidate').textContent = 'Valider Commande';
        }
    },

    // ===== PAYMENT MODAL =====
    openPaymentModal() {
        const total = this.getTotal();
        document.getElementById('paymentTotal').textContent = total.toFixed(2) + ' DH';
        document.getElementById('paymentAmount').value = '';
        document.getElementById('paymentChangeRow').style.display = 'none';
        document.getElementById('paymentError').style.display = 'none';
        App.openModal('paymentModal');
        setTimeout(() => document.getElementById('paymentAmount').focus(), 100);
    },

    initPayment() {
        const amountInput = document.getElementById('paymentAmount');

        // Numpad click handler
        document.getElementById('paymentNumpad').addEventListener('click', (e) => {
            const btn = e.target.closest('.numpad-btn');
            if (!btn) return;
            const val = btn.dataset.val;

            if (val === 'del') {
                amountInput.value = amountInput.value.slice(0, -1);
            } else if (val === '.') {
                if (!amountInput.value.includes('.')) {
                    amountInput.value = (amountInput.value || '0') + '.';
                }
            } else {
                amountInput.value = (amountInput.value || '') + val;
            }

            this.updatePaymentChange();
        });

        document.getElementById('paymentConfirm').addEventListener('click', () => this.confirmPayment());
        document.getElementById('paymentCancel').addEventListener('click', () => {
            this._tablePayMode = null;
            this._tablePayItems = null;
            this._tablePayTotal = null;
            this._tablePayServer = null;
            App.closeModal('paymentModal');
        });
    },

    updatePaymentChange() {
        const amountInput = document.getElementById('paymentAmount');
        const changeRow = document.getElementById('paymentChangeRow');
        const changeEl = document.getElementById('paymentChange');
        const errorEl = document.getElementById('paymentError');
        const paid = parseFloat(amountInput.value) || 0;
        const total = this._tablePayMode ? this._tablePayTotal : this.getTotal();

        if (!amountInput.value || paid === 0) {
            changeRow.style.display = 'none';
            errorEl.style.display = 'none';
            return;
        }

        if (paid < total) {
            changeRow.style.display = 'none';
            errorEl.style.display = '';
        } else {
            errorEl.style.display = 'none';
            changeRow.style.display = 'flex';
            changeEl.textContent = (paid - total).toFixed(2) + ' DH';
        }
    },

    lastOrder: null,
    _printQueue: [],    // queue for chained prints
    _printing: false,   // flag to prevent overlapping prints

    confirmPayment() {
        const paid = parseFloat(document.getElementById('paymentAmount').value) || 0;

        // If paying a table, delegate to Tables
        if (this._tablePayMode) {
            const total = this._tablePayTotal;
            if (paid > 0 && paid < total) {
                document.getElementById('paymentError').style.display = '';
                return;
            }
            Tables.confirmTablePayment(paid);
            return;
        }

        const total = this.getTotal();

        // Allow confirming with exact amount or more, or with 0 (no change needed, e.g. card payment)
        if (paid > 0 && paid < total) {
            document.getElementById('paymentError').style.display = '';
            return;
        }

        const change = paid > 0 ? paid - total : 0;
        const orderNumber = Storage.getOrderNumber();

        // Get order type, server name and table number
        const activeType = document.querySelector('.order-type-btn.active');
        const orderType = activeType ? activeType.dataset.type : 'Sur place';
        const activeServer = document.querySelector('.server-btn.active');
        const serverName = activeServer ? activeServer.dataset.server : '';
        const tableNumber = document.getElementById('tableNumber').value || '';

        // Save order
        const order = {
            id: 'order-' + Date.now(),
            orderNumber: orderNumber,
            items: this.items.map(i => ({
                product_id: i.product.id,
                name: i.product.name,
                quantity: i.quantity,
                price: i.product.price,
                line_total: i.product.price * i.quantity,
                note: i.note || ''
            })),
            total: total,
            orderType: orderType,
            serverName: serverName,
            tableNumber: tableNumber,
            timestamp: new Date().toISOString()
        };

        Storage.saveOrder(order);
        this.lastOrder = order;

        // Update revenue
        const newRevenue = Storage.addRevenue(total);
        App.updateRevenue(newRevenue);

        // Increment order number
        Storage.incrementOrderNumber();

        // Clear order
        this.items = [];
        this.render();
        this.updateOrderNumber();
        this.updateBadge();

        // Reset table number for next order
        document.getElementById('tableNumber').value = '';
        document.getElementById('tableToggleBtn').textContent = '-';
        document.getElementById('tableToggleBtn').classList.remove('has-value');
        document.querySelectorAll('.table-num-btn').forEach(b => b.classList.remove('active'));

        // Close mobile panel
        document.querySelector('.order-panel').classList.remove('open');

        this.showSuccessAndPrint(order, paid, change, orderNumber, total);
    },

    showSuccessAndPrint(order, paid, change, orderNumber, total) {
        // Show success screen inside the payment modal
        const modal = document.querySelector('.payment-modal');
        const changeHTML = change > 0
            ? `<div class="detail-row change-row"><span>MONNAIE:</span><span>${change.toFixed(2)} DH</span></div>`
            : '';

        modal.innerHTML = `
            <div class="modal-header">
                <h3>Commande validee</h3>
                <button class="btn-close" id="successClose">&times;</button>
            </div>
            <div class="payment-body">
                <div class="payment-success">
                    <div class="payment-success-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <h4>Commande #${String(orderNumber).padStart(4, '0')}</h4>
                    <div class="payment-success-details">
                        <div class="detail-row"><span>Total:</span><span>${total.toFixed(2)} DH</span></div>
                        ${paid > 0 ? `<div class="detail-row"><span>Recu:</span><span>${paid.toFixed(2)} DH</span></div>` : ''}
                        ${changeHTML}
                    </div>
                    <div class="payment-success-actions">
                        <button class="btn btn-print-receipt" id="successPrint">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 6 2 18 2 18 9"/>
                                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                                <rect x="6" y="14" width="12" height="8"/>
                            </svg>
                            Re-imprimer
                        </button>
                        <button class="btn btn-validate" id="successDone">Fermer</button>
                    </div>
                </div>
            </div>
        `;

        // Bind success screen buttons
        document.getElementById('successClose').addEventListener('click', () => this.closeSuccess());
        document.getElementById('successDone').addEventListener('click', () => this.closeSuccess());
        document.getElementById('successPrint').addEventListener('click', () => this.printLastReceipt());

        // AUTO-PRINT: send to both printers automatically
        this.autoPrintDual(order);
    },

    // Same success screen but only prints caisse receipt (for table payments)
    showSuccessAndPrintCaisse(order, paid, change, orderNumber, total) {
        const modal = document.querySelector('.payment-modal');
        const changeHTML = change > 0
            ? `<div class="detail-row change-row"><span>MONNAIE:</span><span>${change.toFixed(2)} DH</span></div>`
            : '';

        modal.innerHTML = `
            <div class="modal-header">
                <h3>Commande validee</h3>
                <button class="btn-close" id="successClose">&times;</button>
            </div>
            <div class="payment-body">
                <div class="payment-success">
                    <div class="payment-success-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <h4>Commande #${String(orderNumber).padStart(4, '0')}</h4>
                    <div class="payment-success-details">
                        <div class="detail-row"><span>Total:</span><span>${total.toFixed(2)} DH</span></div>
                        ${paid > 0 ? `<div class="detail-row"><span>Recu:</span><span>${paid.toFixed(2)} DH</span></div>` : ''}
                        ${changeHTML}
                    </div>
                    <div class="payment-success-actions">
                        <button class="btn btn-print-receipt" id="successPrint">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 6 2 18 2 18 9"/>
                                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                                <rect x="6" y="14" width="12" height="8"/>
                            </svg>
                            Re-imprimer
                        </button>
                        <button class="btn btn-validate" id="successDone">Fermer</button>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('successClose').addEventListener('click', () => this.closeSuccess());
        document.getElementById('successDone').addEventListener('click', () => this.closeSuccess());
        document.getElementById('successPrint').addEventListener('click', () => {
            document.getElementById('receipt').innerHTML = this.buildClientReceipt(order);
            setTimeout(() => window.print(), 300);
        });

        // Print ONLY client/caisse receipt
        document.getElementById('receipt').innerHTML = this.buildClientReceipt(order);
        setTimeout(() => window.print(), 300);
    },

    closeSuccess() {
        App.closeModal('paymentModal');
        this.restorePaymentModal();
        // Return to landing screen
        Tables.showLanding();
    },

    restorePaymentModal() {
        const modal = document.querySelector('.payment-modal');
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Paiement</h3>
                <button class="btn-close" data-close="paymentModal">&times;</button>
            </div>
            <div class="payment-body">
                <div class="payment-total-row">
                    <span>TOTAL A PAYER:</span>
                    <span class="payment-total" id="paymentTotal">0.00 DH</span>
                </div>
                <div class="payment-input-group">
                    <label>Montant reçu (DH)</label>
                    <input type="text" id="paymentAmount" readonly placeholder="0" autocomplete="off">
                </div>
                <div class="numpad" id="paymentNumpad">
                    <button class="numpad-btn" data-val="1">1</button>
                    <button class="numpad-btn" data-val="2">2</button>
                    <button class="numpad-btn" data-val="3">3</button>
                    <button class="numpad-btn" data-val="4">4</button>
                    <button class="numpad-btn" data-val="5">5</button>
                    <button class="numpad-btn" data-val="6">6</button>
                    <button class="numpad-btn" data-val="7">7</button>
                    <button class="numpad-btn" data-val="8">8</button>
                    <button class="numpad-btn" data-val="9">9</button>
                    <button class="numpad-btn" data-val=".">.</button>
                    <button class="numpad-btn" data-val="0">0</button>
                    <button class="numpad-btn numpad-del" data-val="del">&larr;</button>
                </div>
                <div class="payment-change-row" id="paymentChangeRow" style="display:none">
                    <span>MONNAIE A RENDRE:</span>
                    <span class="payment-change" id="paymentChange">0.00 DH</span>
                </div>
                <div class="payment-error" id="paymentError" style="display:none">Montant insuffisant</div>
            </div>
            <div class="form-actions">
                <button class="btn btn-cancel" id="paymentCancel">Annuler</button>
                <button class="btn btn-validate" id="paymentConfirm">Confirmer</button>
            </div>
        `;

        // Re-bind events
        this.initPayment();
    },

    // ===== PRINTER SETTINGS =====
    getPrinterMode() {
        // 'dual' = two separate printers, 'single' = one printer both tickets
        return localStorage.getItem('crispi_printer_mode') || 'dual';
    },

    // ===== RECEIPT BUILDERS =====
    buildClientReceipt(order) {
        const date = new Date(order.timestamp);
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const itemsRows = order.items.map(item => `
            <tr>
                <td class="item-qty">${item.quantity}x</td>
                <td class="item-name">${item.name}${item.note ? `<br><small class="item-note">${item.note}</small>` : ''}</td>
                <td class="item-price">${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');

        const typeLine = order.orderType ? `<br><strong style="font-size:14px;">${order.orderType.toUpperCase()}</strong>` : '';
        const serverLine = order.serverName ? `<br>Serveur: ${order.serverName}` : '';
        const tableLine = order.tableNumber ? ` | Table: ${order.tableNumber}` : '';

        return `
            <div class="receipt-header">
                <h2>CRISPI</h2>
                <p>Restaurant</p>
                <p>Tel: 06 04 08 49 17</p>
            </div>
            <hr class="receipt-separator">
            <div class="receipt-info">
                <strong>Commande #${String(order.orderNumber).padStart(4, '0')}</strong>${typeLine}<br>
                Date: ${dateStr} ${timeStr}${serverLine}${tableLine}
            </div>
            <hr class="receipt-separator">
            <table class="receipt-items">
                ${itemsRows}
            </table>
            <div class="receipt-total">
                TOTAL: ${order.total.toFixed(2)} DH
            </div>
            <hr class="receipt-separator">
            <div class="receipt-footer">
                <p><strong>Merci et bon appetit!</strong></p>
                <p>A bientot chez Crispi</p>
            </div>
        `;
    },

    buildKitchenReceipt(order) {
        const date = new Date(order.timestamp);
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        const itemsRows = order.items.map(item => `
            <tr>
                <td class="item-qty">${item.quantity}x</td>
                <td class="item-name"><strong>${item.name}</strong>${item.note ? `<br><span class="kitchen-note">** ${item.note} **</span>` : ''}</td>
                <td class="item-price">${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');

        const typeLine = order.orderType ? `<br><strong style="font-size:14px;">${order.orderType.toUpperCase()}</strong>` : '';
        const serverLine = order.serverName ? `<br>Serveur: ${order.serverName}` : '';
        const tableLine = order.tableNumber ? `<br>Table: ${order.tableNumber}` : '';

        return `
            <div class="receipt-header">
                <h2>-- CUISINE --</h2>
            </div>
            <hr class="receipt-separator">
            <div class="receipt-info" style="text-align:center;">
                <strong style="font-size:16px;">Commande #${String(order.orderNumber).padStart(4, '0')}</strong>${typeLine}<br>
                ${timeStr}${serverLine}${tableLine}
            </div>
            <hr class="receipt-separator">
            <table class="receipt-items">
                ${itemsRows}
            </table>
            <div class="receipt-total">
                TOTAL: ${order.total.toFixed(2)} DH
            </div>
            <hr class="receipt-separator">
        `;
    },

    // ===== AUTO DUAL PRINT (two separate print jobs) =====
    autoPrintDual(order) {
        const mode = this.getPrinterMode();

        if (mode === 'single') {
            // Single printer: both tickets in one print job with cut line
            document.getElementById('receipt').innerHTML =
                this.buildKitchenReceipt(order) +
                '<div class="receipt-cut"></div>' +
                this.buildClientReceipt(order);
            setTimeout(() => window.print(), 300);
            return;
        }

        // Dual printer mode: two separate print jobs
        // Step 1: Print CUISINE ticket
        document.getElementById('receipt').innerHTML = this.buildKitchenReceipt(order);

        // Use a flag to chain the second print after the first dialog closes
        this._pendingCaissePrint = order;

        setTimeout(() => {
            window.print();
        }, 300);
    },

    // Called by the afterprint handler to send the second print job
    _printCaisseTicket() {
        const order = this._pendingCaissePrint;
        if (!order) return;
        this._pendingCaissePrint = null;

        // Step 2: Print CAISSE (client) ticket
        document.getElementById('receipt').innerHTML = this.buildClientReceipt(order);

        setTimeout(() => {
            window.print();
        }, 500);
    },

    // Manual reprint (both tickets)
    printLastReceipt() {
        const order = this.lastOrder;
        if (!order) return;
        this.autoPrintDual(order);
    },

    cancel() {
        if (this.items.length === 0 && !this._tableMode) return;
        App.confirm('Annuler la commande en cours ?', () => {
            this.items = [];
            this.render();
            this.updateBadge();
            if (this._tableMode) this.resetTableMode();
            document.querySelector('.order-panel').classList.remove('open');
            Tables.showLanding();
        });
    }
};
