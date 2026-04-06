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

        // Seed products on first run
        if (!localStorage.getItem('crispi_products')) {
            Storage.saveProducts([...DEFAULT_PRODUCTS]);
        }

        // Initialize modules
        Products.init();
        Orders.init();
        Calculator.init();
        ProductManager.init();

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

        console.log('Crispi POS initialized');
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
