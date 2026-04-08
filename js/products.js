// js/products.js — Product grid rendering and category tab switching

const Products = {
    currentCategory: 'chawarma',

    init() {
        this.renderTabs();
        this.renderGrid();
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('categoryTabs').addEventListener('click', (e) => {
            const tab = e.target.closest('.tab');
            if (!tab) return;
            this.switchCategory(tab.dataset.category);
        });

        // Product card click — add to order
        document.getElementById('productGrid').addEventListener('click', (e) => {
            const card = e.target.closest('.product-card');
            if (!card) return;

            // If edit badge was clicked, open edit modal instead
            if (e.target.closest('.edit-badge')) {
                ProductManager.openEdit(card.dataset.id);
                return;
            }

            const product = Storage.getProducts().find(p => p.id === card.dataset.id);
            if (product) Orders.addItem(product);
        });

        // Long press for edit on mobile
        let pressTimer = null;
        const grid = document.getElementById('productGrid');

        grid.addEventListener('touchstart', (e) => {
            const card = e.target.closest('.product-card');
            if (!card) return;
            pressTimer = setTimeout(() => {
                ProductManager.openEdit(card.dataset.id);
                pressTimer = null;
            }, 500);
        });

        grid.addEventListener('touchend', () => {
            if (pressTimer) clearTimeout(pressTimer);
        });

        grid.addEventListener('touchmove', () => {
            if (pressTimer) clearTimeout(pressTimer);
        });

        // Right-click for edit on desktop
        grid.addEventListener('contextmenu', (e) => {
            const card = e.target.closest('.product-card');
            if (!card) return;
            e.preventDefault();
            ProductManager.openEdit(card.dataset.id);
        });
    },

    switchCategory(categoryId) {
        this.currentCategory = categoryId;
        this.renderTabs();
        this.renderGrid();
    },

    renderTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.category === this.currentCategory);
        });
    },

    renderGrid() {
        const grid = document.getElementById('productGrid');
        const products = Storage.getProducts().filter(p => p.category === this.currentCategory);

        if (products.length === 0) {
            grid.innerHTML = '<div class="product-grid-empty">Aucun produit dans cette catégorie.<br>Appuyez sur + pour en ajouter.</div>';
            return;
        }

        grid.innerHTML = products
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map(p => `
                <div class="product-card" data-id="${p.id}">
                    <div class="edit-badge" title="Modifier">&#9998;</div>
                    <img src="${p.image}" alt="${p.name}" onerror="this.src='${PLACEHOLDER_IMG}'">
                    <div class="product-name">${p.name}</div>
                    ${p.description ? `<div class="product-desc">${p.description}</div>` : ''}
                    <div class="product-price">${p.price.toFixed(2)} DH</div>
                </div>
            `).join('');
    }
};
