// js/app.js — App initialization, modal management, toast, confirm dialog

const App = {
    async init() {
        // Initialize storage (try Supabase, fallback to localStorage)
        const online = await Storage.initSupabase();

        // Update status indicator
        const dot = document.getElementById('statusDot');
        dot.classList.toggle('offline', !online);
        dot.title = online ? 'En ligne' : 'Hors ligne';

        // Sync from Supabase if online
        if (online) {
            await Storage.syncFromSupabase();
        }

        // One-time reset to start clean (2026-04-08)
        if (!localStorage.getItem('crispi_clean_reset_20260408')) {
            localStorage.setItem('crispi_revenue', JSON.stringify(0));
            localStorage.setItem('crispi_last_revenue_reset', new Date().toISOString().split('T')[0]);
            localStorage.setItem('crispi_clean_reset_20260408', 'done');
            if (Storage._supabase) Storage._syncRevenueToSupabase(0);
        }

        // Daily revenue reset at 7 AM
        this.checkDailyReset();
        // Check every 2 minutes for 7 AM reset
        setInterval(() => this.checkDailyReset(), 2 * 60 * 1000);

        // Seed products on first run OR reseed when menu version changes
        const MENU_VERSION = 'v3-petit-dejeuner';
        if (!localStorage.getItem('crispi_products') || localStorage.getItem('crispi_menu_version') !== MENU_VERSION) {
            // Keep any custom products (non-default IDs), replace defaults with fresh data
            const old = JSON.parse(localStorage.getItem('crispi_products') || '[]');
            const defaultIds = new Set(DEFAULT_PRODUCTS.map(p => p.id));
            const customProducts = old.filter(p => !defaultIds.has(p.id));
            Storage.saveProducts([...DEFAULT_PRODUCTS, ...customProducts]);
            localStorage.setItem('crispi_menu_version', MENU_VERSION);
        }

        // Initialize modules
        Products.init();
        Orders.init();
        Tables.init();
        Calculator.init();
        ProductManager.init();

        // Update tables badge
        Tables.updateBadge();

        // Display revenue
        this.updateRevenue(Storage.getRevenue());

        // Modal close buttons
        document.querySelectorAll('[data-close]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal(btn.dataset.close);
            });
        });

        // Close modal on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeModal(overlay.id);
                }
            });
        });

        // Keyboard: Escape to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(m => {
                    this.closeModal(m.id);
                });
            }
        });

        // Listen for afterprint to chain the second printer job
        window.addEventListener('afterprint', () => {
            if (Orders._pendingCaissePrint) {
                Orders._printCaisseTicket();
            }
        });

        // Printer settings
        this.initPrinterSettings();

        console.log('Crispi POS initialized');
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

    // ===== DAILY REVENUE RESET (7 AM) =====
    checkDailyReset() {
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const lastResetDate = localStorage.getItem('crispi_last_revenue_reset') || '';

        // If we already reset today, skip
        if (lastResetDate === today) return;

        // Only reset if it's 7 AM or later (and we haven't reset today yet)
        if (now.getHours() >= 7) {
            const currentRevenue = Storage.getRevenue();

            // Figure out which "business day" this revenue belongs to
            // If last reset was yesterday or earlier, save that day's revenue
            if (currentRevenue > 0 || lastResetDate) {
                // Count orders for the previous business day
                const orders = JSON.parse(localStorage.getItem('crispi_orders') || '[]');
                const prevDayOrders = lastResetDate
                    ? orders.filter(o => {
                        const oDate = new Date(o.timestamp);
                        const oDay = oDate.toISOString().split('T')[0];
                        return oDay >= lastResetDate && oDay < today;
                    })
                    : [];

                // Save daily log for previous business day
                if (lastResetDate && currentRevenue > 0) {
                    Storage.saveDailyRevenueLog({
                        date: lastResetDate,
                        total: currentRevenue,
                        orderCount: prevDayOrders.length,
                        closedAt: now.toISOString()
                    });
                }
            }

            // Reset revenue to 0
            localStorage.setItem('crispi_revenue', JSON.stringify(0));
            Storage._syncRevenueToSupabase(0);
            localStorage.setItem('crispi_last_revenue_reset', today);

            // Update display
            this.updateRevenue(0);
            console.log('Daily revenue reset at 7 AM —', today);
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
