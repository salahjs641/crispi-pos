// js/log.js — Log/History page: order list, print receipt (no delete — admin only)

const Log = {
    orders: [],

    init() {
        this.loadOrders();
        this.renderStats();
        this.renderTable();
        this.bindEvents();

        // Chain second print job for dual printer mode
        window.addEventListener('afterprint', () => {
            if (this._pendingCaissePrint) {
                const order = this._pendingCaissePrint;
                this._pendingCaissePrint = null;
                document.getElementById('receipt').innerHTML = this.buildClientReceipt(order);
                setTimeout(() => window.print(), 500);
            }
        });
    },

    loadOrders() {
        this.orders = JSON.parse(localStorage.getItem('crispi_orders') || '[]');
        // Sort newest first
        this.orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    bindEvents() {
        // Close modal buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal(btn.dataset.close);
            });
        });

        // Close modal on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) this.closeModal(overlay.id);
            });
        });

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(m => {
                    this.closeModal(m.id);
                });
            }
        });

        // Table action buttons (delegated) — print only
        document.getElementById('ordersTableBody').addEventListener('click', (e) => {
            const printBtn = e.target.closest('.btn-print');
            if (printBtn) {
                this.printReceipt(printBtn.dataset.orderId);
            }
        });
    },

    // ===== STATS =====
    renderStats() {
        // Compute revenue from actual today's orders (no drift)
        const todayOrders = Storage.getTodayOrders();
        const revenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const todayCount = todayOrders.length;

        document.getElementById('totalOrders').textContent = this.orders.length;
        document.getElementById('todayOrders').textContent = todayCount;
        document.getElementById('totalRevenue').textContent = revenue.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' DH';

        // Top bar revenue
        document.getElementById('chiffreAffaires').textContent = revenue.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' DH';
    },

    // ===== TABLE =====
    renderTable() {
        const tbody = document.getElementById('ordersTableBody');
        const emptyMsg = document.getElementById('logEmpty');

        if (this.orders.length === 0) {
            tbody.innerHTML = '';
            emptyMsg.style.display = '';
            return;
        }

        emptyMsg.style.display = 'none';

        tbody.innerHTML = this.orders.map(order => {
            const date = new Date(order.timestamp);
            const dateStr = date.toLocaleDateString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
            const timeStr = date.toLocaleTimeString('fr-FR', {
                hour: '2-digit', minute: '2-digit'
            });

            const itemsSummary = order.items.map(item =>
                `<span>${item.quantity}x ${item.name}${item.note ? ` <em style="color:var(--accent);font-size:11px">(${item.note})</em>` : ''}</span>`
            ).join(' ');

            const serverName = order.serverName || '-';
            const tableNum = order.tableNumber ? `T${order.tableNumber}` : '-';

            return `
                <tr>
                    <td class="order-num">#${String(order.orderNumber).padStart(4, '0')}</td>
                    <td class="order-date">${dateStr}<br>${timeStr}</td>
                    <td class="order-server-cell">${serverName}</td>
                    <td class="order-table-cell">${tableNum}</td>
                    <td class="order-items-summary">${itemsSummary}</td>
                    <td class="order-total-cell">${order.total.toFixed(2)} DH</td>
                    <td class="actions-cell">
                        <button class="btn-action btn-print" data-order-id="${order.id}" title="Imprimer">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="6 9 6 2 18 2 18 9"/>
                                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
                                <rect x="6" y="14" width="12" height="8"/>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // ===== PRINT RECEIPT (Dual printer support) =====
    _pendingCaissePrint: null,

    buildKitchenReceipt(order) {
        const timeStr = new Date(order.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
        const rows = order.items.map(item => `
            <tr>
                <td class="item-qty">${item.quantity}x</td>
                <td class="item-name"><strong>${item.name}</strong>${item.note ? `<br><span class="kitchen-note">** ${item.note} **</span>` : ''}</td>
                <td class="item-price">${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');

        const serverLine = order.serverName ? `<br>Serveur: ${order.serverName}` : '';
        const tableLine = order.tableNumber ? `<br>Table: ${order.tableNumber}` : '';

        return `
            <div class="receipt-header"><h2>-- CUISINE --</h2></div>
            <hr class="receipt-separator">
            <div class="receipt-info" style="text-align:center;">
                <strong style="font-size:16px;">Commande #${String(order.orderNumber).padStart(4, '0')}</strong><br>${timeStr}${serverLine}${tableLine}
            </div>
            <hr class="receipt-separator">
            <table class="receipt-items">${rows}</table>
            <div class="receipt-total">TOTAL: ${order.total.toFixed(2)} DH</div>
            <hr class="receipt-separator">
        `;
    },

    buildClientReceipt(order) {
        const date = new Date(order.timestamp);
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const rows = order.items.map(item => `
            <tr>
                <td class="item-qty">${item.quantity}x</td>
                <td class="item-name">${item.name}${item.note ? `<br><small class="item-note">${item.note}</small>` : ''}</td>
                <td class="item-price">${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');

        const serverLine = order.serverName ? `<br>Serveur: ${order.serverName}` : '';
        const tableLine = order.tableNumber ? ` | Table: ${order.tableNumber}` : '';

        return `
            <div class="receipt-header"><h2>CRISPI</h2><p>Restaurant</p><p>Tel: 06 04 08 49 17</p></div>
            <hr class="receipt-separator">
            <div class="receipt-info">
                <strong>Commande #${String(order.orderNumber).padStart(4, '0')}</strong><br>Date: ${dateStr} ${timeStr}${serverLine}${tableLine}
            </div>
            <hr class="receipt-separator">
            <table class="receipt-items">${rows}</table>
            <div class="receipt-total">TOTAL: ${order.total.toFixed(2)} DH</div>
            <hr class="receipt-separator">
            <div class="receipt-footer"><p><strong>Merci et bon appetit!</strong></p><p>A bientot chez Crispi</p></div>
        `;
    },

    printReceipt(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const mode = localStorage.getItem('crispi_printer_mode') || 'dual';

        if (mode === 'single') {
            // Single printer: both tickets in one job
            document.getElementById('receipt').innerHTML =
                this.buildKitchenReceipt(order) +
                '<div class="receipt-cut"></div>' +
                this.buildClientReceipt(order);
            setTimeout(() => window.print(), 200);
        } else {
            // Dual: kitchen first, then caisse after dialog closes
            document.getElementById('receipt').innerHTML = this.buildKitchenReceipt(order);
            this._pendingCaissePrint = order;
            setTimeout(() => window.print(), 200);
        }
    },

    // ===== UTILITIES =====
    openModal(id) {
        document.getElementById(id).classList.add('active');
    },

    closeModal(id) {
        document.getElementById(id).classList.remove('active');
    },

    showToast(message) {
        const toast = document.getElementById('toast');
        document.getElementById('toastMessage').textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2500);
    }
};

// Start
document.addEventListener('DOMContentLoaded', () => Log.init());
