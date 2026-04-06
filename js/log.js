// js/log.js — Log/History page: order list, delete with password, print receipt

const DELETE_PASSWORD = '1937';

const Log = {
    orders: [],
    deleteTargetId: null,

    init() {
        this.loadOrders();
        this.renderStats();
        this.renderTable();
        this.bindEvents();
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

        // Password modal buttons
        document.getElementById('passwordConfirm').addEventListener('click', () => this.confirmDelete());
        document.getElementById('passwordCancel').addEventListener('click', () => this.closeModal('passwordModal'));

        // Password numpad
        document.getElementById('passwordNumpad').addEventListener('click', (e) => {
            const btn = e.target.closest('.numpad-btn');
            if (!btn) return;
            const val = btn.dataset.val;
            const input = document.getElementById('deletePassword');

            if (val === 'del') {
                input.value = input.value.slice(0, -1);
            } else if (val === 'C') {
                input.value = '';
            } else {
                input.value += val;
            }

            // Hide error when typing
            document.getElementById('passwordError').style.display = 'none';
        });

        // Table action buttons (delegated)
        document.getElementById('ordersTableBody').addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete');
            const printBtn = e.target.closest('.btn-print');

            if (deleteBtn) {
                this.promptDelete(deleteBtn.dataset.orderId);
            }

            if (printBtn) {
                this.printReceipt(printBtn.dataset.orderId);
            }
        });
    },

    // ===== STATS =====
    renderStats() {
        const revenue = Storage.getRevenue();
        const today = new Date().toISOString().split('T')[0];
        const todayCount = this.orders.filter(o => o.timestamp && o.timestamp.startsWith(today)).length;

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

            return `
                <tr>
                    <td class="order-num">#${String(order.orderNumber).padStart(4, '0')}</td>
                    <td class="order-date">${dateStr}<br>${timeStr}</td>
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
                        <button class="btn-action btn-delete" data-order-id="${order.id}" title="Supprimer">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                                <line x1="10" y1="11" x2="10" y2="17"/>
                                <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    // ===== DELETE WITH PASSWORD =====
    promptDelete(orderId) {
        this.deleteTargetId = orderId;
        document.getElementById('deletePassword').value = '';
        document.getElementById('passwordError').style.display = 'none';
        document.getElementById('passwordModal').classList.add('active');
        setTimeout(() => document.getElementById('deletePassword').focus(), 100);
    },

    confirmDelete() {
        const password = document.getElementById('deletePassword').value;

        if (password !== DELETE_PASSWORD) {
            document.getElementById('passwordError').style.display = '';
            document.getElementById('deletePassword').value = '';
            document.getElementById('deletePassword').focus();
            return;
        }

        // Find the order to delete
        const order = this.orders.find(o => o.id === this.deleteTargetId);
        if (!order) return;

        // Soft-delete in Supabase (keeps the order in DB with deleted=true)
        Storage.softDeleteOrder(order.id);

        // Remove from local orders array
        this.orders = this.orders.filter(o => o.id !== this.deleteTargetId);

        // Save updated orders to localStorage
        localStorage.setItem('crispi_orders', JSON.stringify(this.orders));

        // Subtract from revenue
        const currentRevenue = Storage.getRevenue();
        const newRevenue = Math.max(0, currentRevenue - order.total);
        localStorage.setItem('crispi_revenue', JSON.stringify(newRevenue));

        // Sync revenue
        Storage._syncRevenueToSupabase(newRevenue);

        // Close modal and refresh
        this.closeModal('passwordModal');
        this.deleteTargetId = null;
        this.renderStats();
        this.renderTable();
        this.showToast('Commande supprimée');
    },

    // ===== PRINT RECEIPT (Dual: Kitchen + Client) =====
    printReceipt(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const date = new Date(order.timestamp);
        const dateStr = date.toLocaleDateString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric'
        });
        const timeStr = date.toLocaleTimeString('fr-FR', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });

        // Kitchen ticket (with prices)
        const kitchenItemsRows = order.items.map(item => `
            <tr>
                <td class="item-qty">${item.quantity}x</td>
                <td class="item-name"><strong>${item.name}</strong>${item.note ? `<br><span class="kitchen-note">** ${item.note} **</span>` : ''}</td>
                <td class="item-price">${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');

        const kitchenHTML = `
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
                ${kitchenItemsRows}
            </table>
            <div class="receipt-total">
                TOTAL: ${order.total.toFixed(2)} DH
            </div>
            <hr class="receipt-separator">
        `;

        // Client ticket (with prices)
        const clientItems = order.items.map(item => `
            <tr>
                <td class="item-qty">${item.quantity}x</td>
                <td class="item-name">${item.name}${item.note ? `<br><small class="item-note">${item.note}</small>` : ''}</td>
                <td class="item-price">${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');

        const clientHTML = `
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
                ${clientItems}
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

        document.getElementById('receipt').innerHTML =
            kitchenHTML +
            '<div class="receipt-cut"></div>' +
            clientHTML;

        setTimeout(() => window.print(), 200);
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
