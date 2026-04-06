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

        // Quick note buttons
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
        this.openPaymentModal();
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
        document.getElementById('paymentCancel').addEventListener('click', () => App.closeModal('paymentModal'));
    },

    updatePaymentChange() {
        const amountInput = document.getElementById('paymentAmount');
        const changeRow = document.getElementById('paymentChangeRow');
        const changeEl = document.getElementById('paymentChange');
        const errorEl = document.getElementById('paymentError');
        const paid = parseFloat(amountInput.value) || 0;
        const total = this.getTotal();

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

    confirmPayment() {
        const paid = parseFloat(document.getElementById('paymentAmount').value) || 0;
        const total = this.getTotal();

        // Allow confirming with exact amount or more, or with 0 (no change needed, e.g. card payment)
        if (paid > 0 && paid < total) {
            document.getElementById('paymentError').style.display = '';
            return;
        }

        const change = paid > 0 ? paid - total : 0;
        const orderNumber = Storage.getOrderNumber();

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

        // Close mobile panel
        document.querySelector('.order-panel').classList.remove('open');

        // Show success screen inside the payment modal
        const modal = document.querySelector('.payment-modal');
        const changeHTML = change > 0
            ? `<div class="detail-row change-row"><span>MONNAIE:</span><span>${change.toFixed(2)} DH</span></div>`
            : '';

        modal.innerHTML = `
            <div class="modal-header">
                <h3>Commande validée</h3>
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
                        ${paid > 0 ? `<div class="detail-row"><span>Reçu:</span><span>${paid.toFixed(2)} DH</span></div>` : ''}
                        ${changeHTML}
                    </div>
                    <div class="payment-success-actions">
                        <button class="btn btn-print-receipt" id="successPrint">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 6 2 18 2 18 9"/>
                                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                                <rect x="6" y="14" width="12" height="8"/>
                            </svg>
                            Imprimer
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
    },

    closeSuccess() {
        App.closeModal('paymentModal');
        // Restore the payment modal HTML for next use
        this.restorePaymentModal();
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

    // ===== DUAL TICKET PRINTING (Client + Kitchen) =====
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

        return `
            <div class="receipt-header">
                <h2>CRISPI</h2>
                <p>Restaurant</p>
                <p>Tel: 06 04 08 49 17</p>
            </div>
            <hr class="receipt-separator">
            <div class="receipt-info">
                <strong>Commande #${String(order.orderNumber).padStart(4, '0')}</strong><br>
                Date: ${dateStr} ${timeStr}
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

        return `
            <div class="receipt-header">
                <h2>-- CUISINE --</h2>
            </div>
            <hr class="receipt-separator">
            <div class="receipt-info" style="text-align:center;">
                <strong style="font-size:16px;">Commande #${String(order.orderNumber).padStart(4, '0')}</strong><br>
                ${timeStr}
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

    printLastReceipt() {
        const order = this.lastOrder;
        if (!order) return;

        // Print both tickets: kitchen first, then client
        document.getElementById('receipt').innerHTML =
            this.buildKitchenReceipt(order) +
            '<div class="receipt-cut"></div>' +
            this.buildClientReceipt(order);

        setTimeout(() => window.print(), 200);
    },

    cancel() {
        if (this.items.length === 0) return;
        App.confirm('Annuler la commande en cours ?', () => {
            this.items = [];
            this.render();
            this.updateBadge();
            document.querySelector('.order-panel').classList.remove('open');
        });
    }
};
