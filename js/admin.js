// js/admin.js — Mohamed Base Admin Panel

const DEFAULT_ADMIN_PASSWORD = '6543';

const Admin = {
    orders: [],
    filteredOrders: [],
    deleteTargetId: null,
    changePwdStep: 'old', // 'old', 'new', 'confirm'
    newPassword: '',

    // ===== PASSWORD =====
    getPassword() {
        return localStorage.getItem('crispi_admin_password') || DEFAULT_ADMIN_PASSWORD;
    },

    setPassword(pwd) {
        localStorage.setItem('crispi_admin_password', pwd);
    },

    // ===== INIT =====
    init() {
        this.bindLogin();
    },

    bindLogin() {
        const numpad = document.getElementById('loginNumpad');
        const input = document.getElementById('loginCode');
        const btn = document.getElementById('loginBtn');

        numpad.addEventListener('click', (e) => {
            const b = e.target.closest('.numpad-btn');
            if (!b) return;
            const val = b.dataset.val;
            if (val === 'del') input.value = input.value.slice(0, -1);
            else if (val === 'C') input.value = '';
            else input.value += val;
            document.getElementById('loginError').style.display = 'none';
        });

        btn.addEventListener('click', () => this.tryLogin());

        // Enter key
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('loginScreen').style.display !== 'none' &&
                document.getElementById('loginScreen').offsetParent !== null) {
                if (e.key === 'Enter') this.tryLogin();
            }
        });
    },

    tryLogin() {
        const input = document.getElementById('loginCode');
        if (input.value === this.getPassword()) {
            document.getElementById('loginScreen').style.display = 'none';
            document.getElementById('adminPanel').style.display = '';
            this.loadPanel();
        } else {
            document.getElementById('loginError').style.display = '';
            input.value = '';
        }
    },

    // ===== LOAD PANEL =====
    loadPanel() {
        this.loadOrders();
        this.filteredOrders = [...this.orders];
        this.renderStats();
        this.renderTable();
        this.bindEvents();
    },

    loadOrders() {
        const all = JSON.parse(localStorage.getItem('crispi_orders') || '[]');
        // Filter out deleted orders from display (they stay in localStorage for revenue)
        this.orders = all.filter(o => !o.deleted);
        this.orders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    // ===== EVENTS =====
    bindEvents() {
        // Close modal buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => this.closeModal(btn.dataset.close));
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
                document.querySelectorAll('.modal-overlay.active').forEach(m => this.closeModal(m.id));
            }
        });

        // Table actions (delegated)
        document.getElementById('ordersTableBody').addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete');
            const printBtn = e.target.closest('.btn-print');
            if (deleteBtn) this.promptDelete(deleteBtn.dataset.orderId);
            if (printBtn) this.printReceipt(printBtn.dataset.orderId);
        });

        // Delete modal
        this.bindNumpad('deleteNumpad', 'deletePassword');
        document.getElementById('deleteConfirm').addEventListener('click', () => this.confirmDelete());
        document.getElementById('deleteCancel').addEventListener('click', () => this.closeModal('deleteModal'));

        // Change password
        document.getElementById('btnChangePassword').addEventListener('click', () => this.openChangePassword());
        this.bindNumpad('changePwdNumpad', 'changePwdInput');
        document.getElementById('changePwdConfirm').addEventListener('click', () => this.handleChangePwd());
        document.getElementById('changePwdCancel').addEventListener('click', () => this.closeModal('changePasswordModal'));

        // Logout
        document.getElementById('btnLogout').addEventListener('click', () => {
            document.getElementById('adminPanel').style.display = 'none';
            document.getElementById('loginScreen').style.display = '';
            document.getElementById('loginCode').value = '';
        });

        // Filters
        document.getElementById('filterDate').addEventListener('change', (e) => {
            this.filterByDate(e.target.value);
        });

        document.getElementById('btnFilterToday').addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('filterDate').value = today;
            this.filterByDate(today);
        });

        document.getElementById('btnFilterAll').addEventListener('click', () => {
            document.getElementById('filterDate').value = '';
            document.getElementById('searchInput').value = '';
            this.filteredOrders = [...this.orders];
            this.renderTable();
        });

        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterBySearch(e.target.value);
        });

        // Daily report
        document.getElementById('btnReportToday').addEventListener('click', () => {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('reportDate').value = today;
        });

        document.getElementById('btnPrintDailyReport').addEventListener('click', () => {
            this.printDailyReport();
        });
    },

    bindNumpad(numpadId, inputId) {
        document.getElementById(numpadId).addEventListener('click', (e) => {
            const btn = e.target.closest('.numpad-btn');
            if (!btn) return;
            const val = btn.dataset.val;
            const input = document.getElementById(inputId);
            if (val === 'del') input.value = input.value.slice(0, -1);
            else if (val === 'C') input.value = '';
            else input.value += val;
        });
    },

    // ===== STATS =====
    renderStats() {
        // Revenue from ALL today's orders (including deleted — money was received)
        const revenue = Storage.getRevenue();
        // Order count: only non-deleted visible orders for today
        const todayOrders = Storage.getTodayOrders(false);
        const todayCount = todayOrders.length;

        document.getElementById('totalOrders').textContent = this.orders.length;
        document.getElementById('todayOrders').textContent = todayCount;
        document.getElementById('totalRevenue').textContent = revenue.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' DH';

        // Count deleted
        const deletedCount = parseInt(localStorage.getItem('crispi_deleted_count') || '0');
        document.getElementById('deletedOrders').textContent = deletedCount;

        // Top bar
        document.getElementById('chiffreAffaires').textContent = revenue.toLocaleString('fr-FR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }) + ' DH';
    },

    // ===== FILTERS =====
    filterByDate(dateStr) {
        if (!dateStr) {
            this.filteredOrders = [...this.orders];
        } else {
            this.filteredOrders = this.orders.filter(o => o.timestamp && o.timestamp.startsWith(dateStr));
        }
        this.renderTable();
    },

    filterBySearch(query) {
        const q = query.toLowerCase().trim();
        if (!q) {
            const dateVal = document.getElementById('filterDate').value;
            this.filterByDate(dateVal);
            return;
        }

        const base = document.getElementById('filterDate').value
            ? this.orders.filter(o => o.timestamp && o.timestamp.startsWith(document.getElementById('filterDate').value))
            : this.orders;

        this.filteredOrders = base.filter(o => {
            const numStr = '#' + String(o.orderNumber).padStart(4, '0');
            if (numStr.includes(q)) return true;
            if (o.items && o.items.some(item => item.name.toLowerCase().includes(q))) return true;
            if (String(o.total).includes(q)) return true;
            if (o.serverName && o.serverName.toLowerCase().includes(q)) return true;
            if (o.tableNumber && String(o.tableNumber).includes(q)) return true;
            return false;
        });

        this.renderTable();
    },

    // ===== TABLE =====
    renderTable() {
        const tbody = document.getElementById('ordersTableBody');
        const emptyMsg = document.getElementById('adminEmpty');

        if (this.filteredOrders.length === 0) {
            tbody.innerHTML = '';
            emptyMsg.style.display = '';
            return;
        }

        emptyMsg.style.display = 'none';

        tbody.innerHTML = this.filteredOrders.map(order => {
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

    // ===== DELETE =====
    promptDelete(orderId) {
        this.deleteTargetId = orderId;
        document.getElementById('deletePassword').value = '';
        document.getElementById('deleteError').style.display = 'none';
        this.openModal('deleteModal');
    },

    confirmDelete() {
        const password = document.getElementById('deletePassword').value;
        if (password !== this.getPassword()) {
            document.getElementById('deleteError').style.display = '';
            document.getElementById('deletePassword').value = '';
            return;
        }

        const order = this.orders.find(o => o.id === this.deleteTargetId);
        if (!order) return;

        // Soft-delete in Supabase
        Storage.softDeleteOrder(order.id);

        // Mark as deleted locally (keep in array for accurate revenue)
        order.deleted = true;
        order.deletedAt = new Date().toISOString();
        localStorage.setItem('crispi_orders', JSON.stringify(this.orders));

        // Revenue is computed from orders (including deleted) — no manual subtraction needed

        // Track deleted count
        const deletedCount = parseInt(localStorage.getItem('crispi_deleted_count') || '0');
        localStorage.setItem('crispi_deleted_count', String(deletedCount + 1));

        // Remove from visible lists (still in localStorage for revenue)
        this.orders = this.orders.filter(o => !o.deleted);
        this.filteredOrders = this.filteredOrders.filter(o => o.id !== this.deleteTargetId);
        this.closeModal('deleteModal');
        this.deleteTargetId = null;
        this.renderStats();
        this.renderTable();
        this.showToast('Commande supprimee');
    },

    // ===== CHANGE PASSWORD =====
    openChangePassword() {
        this.changePwdStep = 'old';
        this.newPassword = '';
        document.getElementById('changePwdInput').value = '';
        document.getElementById('changePwdError').style.display = 'none';
        document.getElementById('changePwdLabel').textContent = 'Ancien mot de passe';
        this.openModal('changePasswordModal');
    },

    handleChangePwd() {
        const input = document.getElementById('changePwdInput');
        const error = document.getElementById('changePwdError');
        const label = document.getElementById('changePwdLabel');

        if (this.changePwdStep === 'old') {
            // Verify old password
            if (input.value !== this.getPassword()) {
                error.textContent = 'Mot de passe incorrect';
                error.style.display = '';
                input.value = '';
                return;
            }
            // Move to new password step
            this.changePwdStep = 'new';
            input.value = '';
            error.style.display = 'none';
            label.textContent = 'Nouveau mot de passe';
        } else if (this.changePwdStep === 'new') {
            if (input.value.length < 4) {
                error.textContent = 'Minimum 4 chiffres';
                error.style.display = '';
                return;
            }
            // Move to confirm step
            this.newPassword = input.value;
            this.changePwdStep = 'confirm';
            input.value = '';
            error.style.display = 'none';
            label.textContent = 'Confirmer le nouveau mot de passe';
        } else if (this.changePwdStep === 'confirm') {
            if (input.value !== this.newPassword) {
                error.textContent = 'Les mots de passe ne correspondent pas';
                error.style.display = '';
                input.value = '';
                return;
            }
            // Save new password
            this.setPassword(this.newPassword);
            this.closeModal('changePasswordModal');
            this.showToast('Mot de passe change avec succes');
        }
    },

    // ===== PRINT RECEIPT =====
    printReceipt(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;

        const date = new Date(order.timestamp);
        const dateStr = date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const kitchenRows = order.items.map(item => `
            <tr>
                <td class="item-qty">${item.quantity}x</td>
                <td class="item-name"><strong>${item.name}</strong>${item.note ? `<br><span style="color:#666;font-size:10px">** ${item.note} **</span>` : ''}</td>
                <td class="item-price">${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');

        const clientRows = order.items.map(item => `
            <tr>
                <td class="item-qty">${item.quantity}x</td>
                <td class="item-name">${item.name}${item.note ? `<br><small style="color:#666">${item.note}</small>` : ''}</td>
                <td class="item-price">${(item.quantity * item.price).toFixed(2)}</td>
            </tr>
        `).join('');

        const serverLine = order.serverName ? `<br>Serveur: ${order.serverName}` : '';
        const tableLine = order.tableNumber ? `<br>Table: ${order.tableNumber}` : '';
        const clientServerLine = order.serverName ? `<br>Serveur: ${order.serverName}` : '';
        const clientTableLine = order.tableNumber ? ` | Table: ${order.tableNumber}` : '';

        document.getElementById('receipt').innerHTML = `
            <div class="receipt-header"><h2>-- CUISINE --</h2></div>
            <hr class="receipt-separator">
            <div style="text-align:center">
                <strong style="font-size:16px">Commande #${String(order.orderNumber).padStart(4, '0')}</strong><br>${timeStr}${serverLine}${tableLine}
            </div>
            <hr class="receipt-separator">
            <table class="receipt-items">${kitchenRows}</table>
            <div class="receipt-total">TOTAL: ${order.total.toFixed(2)} DH</div>
            <hr class="receipt-separator">
            <div style="border-top:2px dashed #000;margin:6mm 0;text-align:center;font-size:9px;color:#999">--- couper ici ---</div>
            <div class="receipt-header">
                <h2>CRISPI</h2><p>Restaurant</p><p>Tel: 06 04 08 49 17</p>
            </div>
            <hr class="receipt-separator">
            <div class="receipt-info">
                <strong>Commande #${String(order.orderNumber).padStart(4, '0')}</strong><br>Date: ${dateStr} ${timeStr}${clientServerLine}${clientTableLine}
            </div>
            <hr class="receipt-separator">
            <table class="receipt-items">${clientRows}</table>
            <div class="receipt-total">TOTAL: ${order.total.toFixed(2)} DH</div>
            <hr class="receipt-separator">
            <div style="text-align:center;margin-top:4mm;font-size:11px">
                <p><strong>Merci et bon appetit!</strong></p>
                <p>A bientot chez Crispi</p>
            </div>
        `;

        setTimeout(() => window.print(), 200);
    },

    // ===== PRINT DAILY REPORT =====
    printDailyReport() {
        const reportDate = document.getElementById('reportDate').value;
        if (!reportDate) {
            this.showToast('Selectionnez une date');
            return;
        }

        // Get orders for that date
        const dayOrders = this.orders.filter(o => o.timestamp && o.timestamp.startsWith(reportDate));
        const dayTotal = dayOrders.reduce((sum, o) => sum + o.total, 0);

        // Format date
        const d = new Date(reportDate + 'T12:00:00');
        const dateStr = d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

        // Revenue by server
        const byServer = {};
        dayOrders.forEach(o => {
            const s = o.serverName || 'Non assigne';
            if (!byServer[s]) byServer[s] = { total: 0, count: 0 };
            byServer[s].total += o.total;
            byServer[s].count++;
        });

        const serverRows = Object.entries(byServer).map(([name, data]) =>
            `<tr><td>${name}</td><td style="text-align:center">${data.count}</td><td style="text-align:right">${data.total.toFixed(2)} DH</td></tr>`
        ).join('');

        // Revenue by order type
        const byType = {};
        dayOrders.forEach(o => {
            const t = o.orderType || 'Non defini';
            if (!byType[t]) byType[t] = { total: 0, count: 0 };
            byType[t].total += o.total;
            byType[t].count++;
        });

        const typeRows = Object.entries(byType).map(([type, data]) =>
            `<tr><td>${type}</td><td style="text-align:center">${data.count}</td><td style="text-align:right">${data.total.toFixed(2)} DH</td></tr>`
        ).join('');

        // Top products
        const productMap = {};
        dayOrders.forEach(o => {
            o.items.forEach(item => {
                if (!productMap[item.name]) productMap[item.name] = { qty: 0, total: 0 };
                productMap[item.name].qty += item.quantity;
                productMap[item.name].total += item.quantity * item.price;
            });
        });
        const topProducts = Object.entries(productMap)
            .sort((a, b) => b[1].qty - a[1].qty)
            .slice(0, 10);

        const productRows = topProducts.map(([name, data]) =>
            `<tr><td>${data.qty}x</td><td>${name}</td><td style="text-align:right">${data.total.toFixed(2)} DH</td></tr>`
        ).join('');

        // Build receipt
        document.getElementById('receipt').innerHTML = `
            <div class="receipt-header">
                <h2>CRISPI</h2>
                <p>RAPPORT JOURNALIER</p>
            </div>
            <hr class="receipt-separator">
            <div style="text-align:center;margin:3mm 0;">
                <strong style="font-size:13px;">${dateStr}</strong>
            </div>
            <hr class="receipt-separator">

            <div style="text-align:center;margin:4mm 0;">
                <div style="font-size:10px;color:#555;">CHIFFRE D'AFFAIRES</div>
                <div style="font-size:22px;font-weight:bold;margin:2mm 0;">${dayTotal.toFixed(2)} DH</div>
                <div style="font-size:11px;">${dayOrders.length} commande${dayOrders.length > 1 ? 's' : ''}</div>
            </div>
            <hr class="receipt-separator">

            ${serverRows ? `
            <div style="margin:2mm 0;font-size:11px;">
                <strong>PAR SERVEUR:</strong>
                <table class="receipt-items" style="margin-top:2mm;">
                    <tr><td><strong>Nom</strong></td><td style="text-align:center"><strong>Cmd</strong></td><td style="text-align:right"><strong>Total</strong></td></tr>
                    ${serverRows}
                </table>
            </div>
            <hr class="receipt-separator">
            ` : ''}

            ${typeRows ? `
            <div style="margin:2mm 0;font-size:11px;">
                <strong>PAR TYPE:</strong>
                <table class="receipt-items" style="margin-top:2mm;">
                    <tr><td><strong>Type</strong></td><td style="text-align:center"><strong>Cmd</strong></td><td style="text-align:right"><strong>Total</strong></td></tr>
                    ${typeRows}
                </table>
            </div>
            <hr class="receipt-separator">
            ` : ''}

            ${productRows ? `
            <div style="margin:2mm 0;font-size:11px;">
                <strong>TOP PRODUITS:</strong>
                <table class="receipt-items" style="margin-top:2mm;">
                    ${productRows}
                </table>
            </div>
            <hr class="receipt-separator">
            ` : ''}

            <div style="text-align:center;margin:3mm 0;font-size:10px;color:#555;">
                Imprime le ${new Date().toLocaleDateString('fr-FR')} a ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </div>
        `;

        setTimeout(() => window.print(), 300);
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
document.addEventListener('DOMContentLoaded', () => Admin.init());
