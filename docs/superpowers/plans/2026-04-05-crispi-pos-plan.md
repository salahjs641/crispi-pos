# Crispi POS System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tablet-first, dark-themed French POS system for Crispi restaurant with persistent revenue tracking, built-in calculator, product management, and Supabase backend.

**Architecture:** Single-page vanilla web app. All state managed through a central `app` object. localStorage for offline-first operation, Supabase for persistence/backup. Modular JS files: one per feature (products, orders, calculator, storage, UI).

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript (ES modules), Supabase JS client (CDN)

---

## File Structure

```
C:/Users/PABLO/Desktop/CRISPY/
├── index.html              # Single page entry point, full layout
├── css/
│   └── styles.css          # All styles: dark theme, layout, modals, responsive
├── js/
│   ├── app.js              # App initialization, state management, event wiring
│   ├── data.js             # Default product data (from menus)
│   ├── storage.js          # localStorage + Supabase read/write/sync
│   ├── products.js         # Product grid rendering, category tabs
│   ├── orders.js           # Order ticket management (add, remove, validate)
│   ├── calculator.js       # Calculator modal logic
│   ├── product-manager.js  # Add/edit/delete product modals
│   └── supabase-config.js  # Supabase URL + anon key (user fills in)
├── img/                    # Product images directory
│   └── placeholder.png     # Default product image
├── WhatsApp Image ...      # (existing menu photos)
└── docs/                   # (existing)
```

---

### Task 1: HTML Structure & Layout

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create the full HTML structure**

Create `index.html` with the complete page layout. This is a single file with all semantic structure — no templates or components, just clean HTML sections.

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Crispi POS</title>
    <link rel="stylesheet" href="css/styles.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
</head>
<body>
    <!-- TOP BAR -->
    <header class="top-bar">
        <div class="top-bar-left">
            <h1 class="logo">Crispi</h1>
        </div>
        <div class="top-bar-center">
            <div class="chiffre-affaires">
                <span class="ca-label">CHIFFRE D'AFFAIRES:</span>
                <span class="ca-value" id="chiffreAffaires">0.00 DH</span>
            </div>
        </div>
        <div class="top-bar-right">
            <button class="btn-icon" id="btnCalculator" title="Calculatrice">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="4" y="2" width="16" height="20" rx="2"/>
                    <line x1="8" y1="6" x2="16" y2="6"/>
                    <line x1="8" y1="10" x2="10" y2="10"/>
                    <line x1="14" y1="10" x2="16" y2="10"/>
                    <line x1="8" y1="14" x2="10" y2="14"/>
                    <line x1="14" y1="14" x2="16" y2="14"/>
                    <line x1="8" y1="18" x2="10" y2="18"/>
                    <line x1="14" y1="18" x2="16" y2="18"/>
                </svg>
            </button>
            <button class="btn-icon btn-add-product" id="btnAddProduct" title="Ajouter un produit">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
            </button>
            <div class="status-dot" id="statusDot" title="En ligne"></div>
        </div>
    </header>

    <!-- MAIN CONTENT -->
    <main class="main-content">
        <!-- LEFT PANEL: Categories + Products -->
        <section class="products-panel">
            <nav class="category-tabs" id="categoryTabs">
                <button class="tab active" data-category="chawarma">Chawarma</button>
                <button class="tab" data-category="poulet">Poulet</button>
                <button class="tab" data-category="ftour-beldi">Ftour Beldi</button>
                <button class="tab" data-category="ftour-fassi">Ftour Fassi</button>
                <button class="tab" data-category="ftour-express">Ftour Express</button>
                <button class="tab" data-category="boissons">Boissons</button>
            </nav>
            <div class="product-grid" id="productGrid">
                <!-- Products rendered by JS -->
            </div>
        </section>

        <!-- RIGHT PANEL: Order Ticket -->
        <section class="order-panel">
            <div class="order-header">
                <h2>COMMANDE EN COURS</h2>
                <span class="order-number" id="orderNumber">#0001</span>
            </div>
            <div class="order-items" id="orderItems">
                <!-- Order items rendered by JS -->
                <div class="order-empty" id="orderEmpty">Aucun article</div>
            </div>
            <div class="order-footer">
                <div class="order-total">
                    <span>TOTAL:</span>
                    <span id="orderTotal">0.00 DH</span>
                </div>
                <div class="order-actions">
                    <button class="btn btn-cancel" id="btnCancel">Annuler</button>
                    <button class="btn btn-validate" id="btnValidate">Valider Commande</button>
                </div>
            </div>
        </section>

        <!-- Mobile order toggle button -->
        <button class="btn-order-toggle" id="btnOrderToggle">
            <span id="toggleBadge" class="badge">0</span>
            Commande
        </button>
    </main>

    <!-- CALCULATOR MODAL -->
    <div class="modal-overlay" id="calculatorModal">
        <div class="modal calculator-modal">
            <div class="modal-header">
                <h3>Calculatrice</h3>
                <button class="btn-close" data-close="calculatorModal">&times;</button>
            </div>
            <div class="calculator">
                <input type="text" class="calc-display" id="calcDisplay" readonly value="0">
                <div class="calc-buttons">
                    <button class="calc-btn" data-calc="C">C</button>
                    <button class="calc-btn" data-calc="backspace">&larr;</button>
                    <button class="calc-btn calc-op" data-calc="%">%</button>
                    <button class="calc-btn calc-op" data-calc="/">&divide;</button>
                    <button class="calc-btn" data-calc="7">7</button>
                    <button class="calc-btn" data-calc="8">8</button>
                    <button class="calc-btn" data-calc="9">9</button>
                    <button class="calc-btn calc-op" data-calc="*">&times;</button>
                    <button class="calc-btn" data-calc="4">4</button>
                    <button class="calc-btn" data-calc="5">5</button>
                    <button class="calc-btn" data-calc="6">6</button>
                    <button class="calc-btn calc-op" data-calc="-">&minus;</button>
                    <button class="calc-btn" data-calc="1">1</button>
                    <button class="calc-btn" data-calc="2">2</button>
                    <button class="calc-btn" data-calc="3">3</button>
                    <button class="calc-btn calc-op" data-calc="+">+</button>
                    <button class="calc-btn calc-zero" data-calc="0">0</button>
                    <button class="calc-btn" data-calc=".">.</button>
                    <button class="calc-btn calc-eq" data-calc="=">=</button>
                </div>
            </div>
        </div>
    </div>

    <!-- ADD/EDIT PRODUCT MODAL -->
    <div class="modal-overlay" id="productModal">
        <div class="modal product-modal">
            <div class="modal-header">
                <h3 id="productModalTitle">Ajouter un Produit</h3>
                <button class="btn-close" data-close="productModal">&times;</button>
            </div>
            <form id="productForm">
                <input type="hidden" id="productEditId" value="">
                <div class="form-group">
                    <label for="productName">Nom du produit</label>
                    <input type="text" id="productName" required placeholder="Ex: Sandwich Chawarma">
                </div>
                <div class="form-group">
                    <label for="productPrice">Prix (DH)</label>
                    <input type="number" id="productPrice" required min="0" step="0.5" placeholder="Ex: 15">
                </div>
                <div class="form-group">
                    <label for="productCategory">Catégorie</label>
                    <select id="productCategory" required>
                        <option value="chawarma">Chawarma</option>
                        <option value="poulet">Poulet Croustillant</option>
                        <option value="ftour-beldi">Ftour Beldi</option>
                        <option value="ftour-fassi">Ftour Fassi</option>
                        <option value="ftour-express">Ftour Express</option>
                        <option value="boissons">Boissons</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="productImage">Image</label>
                    <div class="image-upload" id="imageUploadArea">
                        <img id="imagePreview" src="" alt="" style="display:none">
                        <span id="imageUploadText">Cliquez pour ajouter une image</span>
                        <input type="file" id="productImage" accept="image/jpeg,image/png,image/webp" hidden>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-cancel btn-delete-product" id="btnDeleteProduct" style="display:none">Supprimer</button>
                    <button type="submit" class="btn btn-validate">Enregistrer</button>
                </div>
            </form>
        </div>
    </div>

    <!-- CONFIRM MODAL -->
    <div class="modal-overlay" id="confirmModal">
        <div class="modal confirm-modal">
            <div class="modal-header">
                <h3 id="confirmTitle">Confirmation</h3>
            </div>
            <p id="confirmMessage">Êtes-vous sûr ?</p>
            <div class="form-actions">
                <button class="btn btn-cancel" id="confirmNo">Non</button>
                <button class="btn btn-validate" id="confirmYes">Oui</button>
            </div>
        </div>
    </div>

    <!-- ORDER SUCCESS TOAST -->
    <div class="toast" id="toast">
        <span id="toastMessage"></span>
    </div>

    <script src="js/supabase-config.js"></script>
    <script src="js/data.js"></script>
    <script src="js/storage.js"></script>
    <script src="js/products.js"></script>
    <script src="js/orders.js"></script>
    <script src="js/calculator.js"></script>
    <script src="js/product-manager.js"></script>
    <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify file opens in browser**

Open `index.html` in a browser. It should show a blank dark page (no CSS yet) with the raw HTML structure visible.

---

### Task 2: Dark Theme CSS

**Files:**
- Create: `css/styles.css`

- [ ] **Step 1: Create the complete stylesheet**

Create `css/styles.css` with the full dark theme. This is one comprehensive file covering: reset, layout, top bar, product grid, order panel, modals, calculator, responsive breakpoints, animations, and toast notifications.

```css
/* ===== RESET & BASE ===== */
*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --bg-primary: #1a1a2e;
    --bg-surface: #16213e;
    --bg-card: #1c2a4a;
    --bg-card-hover: #243356;
    --accent: #e2b714;
    --accent-glow: rgba(226, 183, 20, 0.3);
    --text-primary: #ffffff;
    --text-secondary: #a0a0b0;
    --success: #00c853;
    --danger: #ff1744;
    --border: #2a2a4a;
    --font: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --radius: 12px;
    --radius-sm: 8px;
    --shadow: 0 4px 24px rgba(0,0,0,0.4);
}

html, body {
    height: 100%;
    font-family: var(--font);
    background: var(--bg-primary);
    color: var(--text-primary);
    overflow: hidden;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
}

/* ===== TOP BAR ===== */
.top-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 64px;
    padding: 0 20px;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    gap: 16px;
    z-index: 10;
}

.logo {
    font-size: 28px;
    font-weight: 800;
    color: var(--accent);
    letter-spacing: 1px;
    text-transform: uppercase;
}

.top-bar-center {
    flex: 1;
    display: flex;
    justify-content: center;
}

.chiffre-affaires {
    background: linear-gradient(135deg, rgba(226,183,20,0.15), rgba(226,183,20,0.05));
    border: 1px solid rgba(226,183,20,0.3);
    padding: 8px 24px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 10px;
}

.ca-label {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-secondary);
    letter-spacing: 1px;
}

.ca-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--accent);
}

.top-bar-right {
    display: flex;
    align-items: center;
    gap: 10px;
}

.btn-icon {
    width: 44px;
    height: 44px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-card);
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.btn-icon:hover {
    background: var(--bg-card-hover);
    border-color: var(--accent);
    color: var(--accent);
}

.btn-add-product {
    background: var(--accent);
    color: var(--bg-primary);
    border-color: var(--accent);
    font-weight: 700;
}

.btn-add-product:hover {
    background: #f0c420;
    color: var(--bg-primary);
}

.status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--success);
    margin-left: 4px;
}

.status-dot.offline {
    background: var(--danger);
}

/* ===== MAIN LAYOUT ===== */
.main-content {
    display: flex;
    height: calc(100vh - 64px);
}

/* ===== PRODUCTS PANEL (LEFT) ===== */
.products-panel {
    flex: 0 0 65%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-right: 1px solid var(--border);
}

.category-tabs {
    display: flex;
    gap: 6px;
    padding: 12px 16px;
    overflow-x: auto;
    background: var(--bg-surface);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
}

.category-tabs::-webkit-scrollbar {
    display: none;
}

.tab {
    padding: 10px 20px;
    border-radius: 50px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;
    font-family: var(--font);
}

.tab:hover {
    border-color: var(--accent);
    color: var(--text-primary);
}

.tab.active {
    background: var(--accent);
    color: var(--bg-primary);
    border-color: var(--accent);
}

.product-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    padding: 16px;
    overflow-y: auto;
    flex: 1;
}

.product-grid::-webkit-scrollbar {
    width: 6px;
}

.product-grid::-webkit-scrollbar-track {
    background: transparent;
}

.product-grid::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 3px;
}

.product-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 8px;
    position: relative;
}

.product-card:hover {
    transform: translateY(-2px);
    border-color: var(--accent);
    box-shadow: 0 4px 20px rgba(226,183,20,0.15);
}

.product-card:active {
    transform: scale(0.97);
}

.product-card img {
    width: 80px;
    height: 80px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    background: var(--bg-surface);
}

.product-card .product-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.3;
    min-height: 32px;
    display: flex;
    align-items: center;
}

.product-card .product-price {
    font-size: 16px;
    font-weight: 700;
    color: var(--accent);
}

.product-card .edit-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(0,0,0,0.5);
    color: var(--text-secondary);
    font-size: 12px;
    display: none;
    align-items: center;
    justify-content: center;
    cursor: pointer;
}

.product-card:hover .edit-badge {
    display: flex;
}

.product-grid-empty {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px 20px;
    color: var(--text-secondary);
    font-size: 14px;
}

/* ===== ORDER PANEL (RIGHT) ===== */
.order-panel {
    flex: 0 0 35%;
    display: flex;
    flex-direction: column;
    background: var(--bg-surface);
}

.order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
}

.order-header h2 {
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1px;
    color: var(--text-secondary);
}

.order-number {
    font-size: 16px;
    font-weight: 700;
    color: var(--accent);
}

.order-items {
    flex: 1;
    overflow-y: auto;
    padding: 12px 0;
}

.order-items::-webkit-scrollbar {
    width: 4px;
}

.order-items::-webkit-scrollbar-thumb {
    background: var(--border);
    border-radius: 2px;
}

.order-empty {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
    font-size: 14px;
    font-style: italic;
}

.order-item {
    display: flex;
    align-items: center;
    padding: 10px 20px;
    gap: 12px;
    border-bottom: 1px solid rgba(42,42,74,0.5);
    transition: background 0.15s;
}

.order-item:hover {
    background: rgba(255,255,255,0.03);
}

.order-item-info {
    flex: 1;
    min-width: 0;
}

.order-item-name {
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.order-item-unit-price {
    font-size: 11px;
    color: var(--text-secondary);
}

.order-item-qty {
    display: flex;
    align-items: center;
    gap: 8px;
}

.order-item-qty button {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 1px solid var(--border);
    background: var(--bg-card);
    color: var(--text-primary);
    font-size: 16px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
    font-family: var(--font);
}

.order-item-qty button:hover {
    border-color: var(--accent);
    color: var(--accent);
}

.order-item-qty span {
    font-weight: 600;
    min-width: 20px;
    text-align: center;
}

.order-item-total {
    font-weight: 700;
    font-size: 14px;
    color: var(--accent);
    min-width: 65px;
    text-align: right;
}

/* ===== ORDER FOOTER ===== */
.order-footer {
    border-top: 2px solid var(--border);
    padding: 16px 20px;
}

.order-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    font-size: 20px;
    font-weight: 700;
}

.order-total span:last-child {
    color: var(--accent);
    font-size: 24px;
}

.order-actions {
    display: flex;
    gap: 10px;
}

.btn {
    flex: 1;
    padding: 14px 20px;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    font-family: var(--font);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.btn-cancel {
    background: rgba(255,23,68,0.15);
    color: var(--danger);
    border: 1px solid rgba(255,23,68,0.3);
}

.btn-cancel:hover {
    background: rgba(255,23,68,0.25);
}

.btn-validate {
    background: var(--success);
    color: #fff;
}

.btn-validate:hover {
    background: #00e65c;
    box-shadow: 0 4px 16px rgba(0,200,83,0.3);
}

/* ===== MODALS ===== */
.modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    display: none;
    align-items: center;
    justify-content: center;
    z-index: 100;
    backdrop-filter: blur(4px);
}

.modal-overlay.active {
    display: flex;
}

.modal {
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    width: 90%;
    max-width: 420px;
    animation: modalIn 0.2s ease;
}

@keyframes modalIn {
    from { opacity: 0; transform: scale(0.95) translateY(10px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
}

.modal-header h3 {
    font-size: 16px;
    font-weight: 700;
}

.btn-close {
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    font-size: 24px;
    cursor: pointer;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s;
}

.btn-close:hover {
    background: rgba(255,255,255,0.1);
    color: var(--text-primary);
}

/* ===== CALCULATOR ===== */
.calculator {
    padding: 16px;
}

.calc-display {
    width: 100%;
    padding: 16px;
    font-size: 28px;
    font-weight: 600;
    text-align: right;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    margin-bottom: 12px;
    font-family: var(--font);
}

.calc-buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
}

.calc-btn {
    padding: 18px;
    font-size: 18px;
    font-weight: 600;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg-card);
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.15s;
    font-family: var(--font);
}

.calc-btn:hover {
    background: var(--bg-card-hover);
}

.calc-btn:active {
    transform: scale(0.95);
}

.calc-op {
    background: rgba(226,183,20,0.15);
    color: var(--accent);
    border-color: rgba(226,183,20,0.3);
}

.calc-op:hover {
    background: rgba(226,183,20,0.25);
}

.calc-eq {
    background: var(--accent);
    color: var(--bg-primary);
    border-color: var(--accent);
    grid-column: span 1;
}

.calc-eq:hover {
    background: #f0c420;
}

.calc-zero {
    grid-column: span 2;
}

/* ===== PRODUCT FORM ===== */
.product-modal form {
    padding: 20px;
}

.form-group {
    margin-bottom: 16px;
}

.form-group label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select {
    width: 100%;
    padding: 12px;
    font-size: 14px;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font);
    transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus {
    outline: none;
    border-color: var(--accent);
}

.form-group select {
    cursor: pointer;
}

.form-group select option {
    background: var(--bg-surface);
}

.image-upload {
    width: 100%;
    height: 120px;
    border: 2px dashed var(--border);
    border-radius: var(--radius-sm);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: border-color 0.2s;
    overflow: hidden;
    position: relative;
}

.image-upload:hover {
    border-color: var(--accent);
}

.image-upload img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.image-upload span {
    color: var(--text-secondary);
    font-size: 13px;
}

.form-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
}

/* ===== CONFIRM MODAL ===== */
.confirm-modal {
    max-width: 360px;
}

.confirm-modal p {
    padding: 20px;
    text-align: center;
    font-size: 15px;
    color: var(--text-secondary);
}

.confirm-modal .form-actions {
    padding: 0 20px 20px;
}

/* ===== TOAST ===== */
.toast {
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: var(--success);
    color: #fff;
    padding: 14px 28px;
    border-radius: 50px;
    font-weight: 600;
    font-size: 14px;
    box-shadow: 0 4px 20px rgba(0,200,83,0.3);
    z-index: 200;
    transition: transform 0.3s ease;
    pointer-events: none;
}

.toast.show {
    transform: translateX(-50%) translateY(0);
}

/* ===== MOBILE ORDER TOGGLE ===== */
.btn-order-toggle {
    display: none;
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 14px 24px;
    background: var(--accent);
    color: var(--bg-primary);
    border: none;
    border-radius: 50px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    z-index: 50;
    box-shadow: 0 4px 20px rgba(226,183,20,0.4);
    font-family: var(--font);
}

.badge {
    background: var(--danger);
    color: #fff;
    border-radius: 50%;
    padding: 2px 7px;
    font-size: 11px;
    font-weight: 700;
    margin-right: 6px;
}

/* ===== RESPONSIVE ===== */
@media (max-width: 900px) {
    .products-panel {
        flex: 1;
        border-right: none;
    }

    .order-panel {
        position: fixed;
        right: 0;
        top: 64px;
        bottom: 0;
        width: 85%;
        max-width: 400px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        z-index: 50;
        box-shadow: -4px 0 30px rgba(0,0,0,0.5);
    }

    .order-panel.open {
        transform: translateX(0);
    }

    .btn-order-toggle {
        display: block;
    }

    .top-bar-center {
        display: none;
    }

    .product-grid {
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    }
}

@media (max-width: 500px) {
    .top-bar {
        padding: 0 12px;
        height: 56px;
    }

    .logo {
        font-size: 22px;
    }

    .category-tabs {
        padding: 8px 12px;
    }

    .tab {
        padding: 8px 14px;
        font-size: 12px;
    }

    .product-grid {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 8px;
        padding: 10px;
    }

    .product-card img {
        width: 60px;
        height: 60px;
    }

    .product-card .product-name {
        font-size: 11px;
    }

    .order-panel {
        width: 100%;
        max-width: none;
    }
}

/* ===== ANIMATIONS ===== */
@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.order-item-added {
    animation: pulse 0.2s ease;
}
```

- [ ] **Step 2: Verify layout in browser**

Open `index.html`. Verify: dark background, gold logo, top bar visible, two-panel layout, category tabs styled. Resize to test responsive behavior.

---

### Task 3: Default Product Data

**Files:**
- Create: `js/data.js`
- Create: `img/placeholder.png`

- [ ] **Step 1: Create placeholder image**

Create a minimal 1x1 transparent PNG as placeholder. We'll use an inline SVG data URI instead of an actual file for simplicity.

- [ ] **Step 2: Create data.js with all default products**

```javascript
// js/data.js — Default product catalog from Crispi menus
// This data seeds localStorage on first load

const PLACEHOLDER_IMG = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80">' +
    '<rect width="80" height="80" fill="#1c2a4a"/>' +
    '<text x="40" y="44" text-anchor="middle" fill="#a0a0b0" font-size="10" font-family="sans-serif">No image</text>' +
    '</svg>'
);

const CATEGORIES = [
    { id: 'chawarma', name: 'Chawarma' },
    { id: 'poulet', name: 'Poulet Croustillant' },
    { id: 'ftour-beldi', name: 'Ftour Beldi' },
    { id: 'ftour-fassi', name: 'Ftour Fassi' },
    { id: 'ftour-express', name: 'Ftour Express' },
    { id: 'boissons', name: 'Boissons' }
];

const DEFAULT_PRODUCTS = [
    // === CHAWARMA ===
    { id: 'cw-01', name: 'Sandwich Chawarma', price: 15, category: 'chawarma', image: PLACEHOLDER_IMG, position: 1 },
    { id: 'cw-02', name: 'Chawarma Pains', price: 20, category: 'chawarma', image: PLACEHOLDER_IMG, position: 2 },
    { id: 'cw-03', name: 'Chawarma Frites', price: 25, category: 'chawarma', image: PLACEHOLDER_IMG, position: 3 },
    { id: 'cw-04', name: 'Tacos Chawarma', price: 30, category: 'chawarma', image: PLACEHOLDER_IMG, position: 4 },
    { id: 'cw-05', name: 'Double Chawarma', price: 35, category: 'chawarma', image: PLACEHOLDER_IMG, position: 5 },
    { id: 'cw-06', name: 'Chawarma Sarouki', price: 45, category: 'chawarma', image: PLACEHOLDER_IMG, position: 6 },
    { id: 'cw-07', name: 'Chawarma Box', price: 30, category: 'chawarma', image: PLACEHOLDER_IMG, position: 7 },
    { id: 'cw-08', name: 'Chawarma Du Bled', price: 45, category: 'chawarma', image: PLACEHOLDER_IMG, position: 8 },
    { id: 'cw-09', name: 'Chawarma Arabe', price: 35, category: 'chawarma', image: PLACEHOLDER_IMG, position: 9 },
    { id: 'cw-10', name: 'Plat Chawarma', price: 40, category: 'chawarma', image: PLACEHOLDER_IMG, position: 10 },

    // === POULET CROUSTILLANT ===
    { id: 'pk-01', name: 'Chicken Khliza (sans frites)', price: 13, category: 'poulet', image: PLACEHOLDER_IMG, position: 1 },
    { id: 'pk-02', name: 'Chicken Sandwich (sans frites)', price: 18, category: 'poulet', image: PLACEHOLDER_IMG, position: 2 },
    { id: 'pk-03', name: 'Chicken Sandwich', price: 23, category: 'poulet', image: PLACEHOLDER_IMG, position: 3 },
    { id: 'pk-04', name: 'Chicken Special', price: 28, category: 'poulet', image: PLACEHOLDER_IMG, position: 4 },
    { id: 'pk-05', name: 'Chicken Tacos', price: 25, category: 'poulet', image: PLACEHOLDER_IMG, position: 5 },
    { id: 'pk-06', name: 'Chicken Burger', price: 23, category: 'poulet', image: PLACEHOLDER_IMG, position: 6 },
    { id: 'pk-07', name: 'Tacos Royale', price: 45, category: 'poulet', image: PLACEHOLDER_IMG, position: 7 },
    { id: 'pk-08', name: 'Chicken Box', price: 30, category: 'poulet', image: PLACEHOLDER_IMG, position: 8 },
    { id: 'pk-09', name: 'Big Chicken Box', price: 45, category: 'poulet', image: PLACEHOLDER_IMG, position: 9 },
    { id: 'pk-10', name: 'Plat Chicken', price: 30, category: 'poulet', image: PLACEHOLDER_IMG, position: 10 },

    // === BOISSONS ===
    { id: 'bs-01', name: 'Jus d\'Orange', price: 14, category: 'boissons', image: PLACEHOLDER_IMG, position: 1 },
    { id: 'bs-02', name: 'Panache', price: 10, category: 'boissons', image: PLACEHOLDER_IMG, position: 2 },
    { id: 'bs-03', name: 'Jus Avocat', price: 10, category: 'boissons', image: PLACEHOLDER_IMG, position: 3 },
    { id: 'bs-04', name: 'Eau', price: 6, category: 'boissons', image: PLACEHOLDER_IMG, position: 4 },
    { id: 'bs-05', name: 'Semonade', price: 5, category: 'boissons', image: PLACEHOLDER_IMG, position: 5 },
    { id: 'bs-06', name: 'Frites', price: 5, category: 'boissons', image: PLACEHOLDER_IMG, position: 6 }
];
```

---

### Task 4: Storage Layer (localStorage + Supabase)

**Files:**
- Create: `js/supabase-config.js`
- Create: `js/storage.js`

- [ ] **Step 1: Create Supabase config file**

```javascript
// js/supabase-config.js — Supabase connection config
// Replace these values with your actual Supabase project credentials
const SUPABASE_URL = '';  // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = '';  // e.g., 'eyJhbGciOiJIUzI1NiIs...'

// Set to true once you've configured the above values
const SUPABASE_ENABLED = false;
```

- [ ] **Step 2: Create storage.js with all data operations**

```javascript
// js/storage.js — Data persistence layer (localStorage + Supabase)

const Storage = {
    // ===== LOCAL STORAGE =====
    _get(key) {
        try {
            const val = localStorage.getItem(key);
            return val ? JSON.parse(val) : null;
        } catch { return null; }
    },

    _set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            console.error('localStorage write failed:', e);
        }
    },

    // ===== SUPABASE CLIENT =====
    _supabase: null,

    async initSupabase() {
        if (!SUPABASE_ENABLED || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.log('Supabase not configured — running in offline mode');
            return false;
        }
        try {
            // Load Supabase client from CDN
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
            this._supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('Supabase connected');
            return true;
        } catch (e) {
            console.error('Supabase init failed:', e);
            return false;
        }
    },

    isOnline() {
        return this._supabase !== null;
    },

    // ===== PRODUCTS =====
    getProducts() {
        return this._get('crispi_products') || [...DEFAULT_PRODUCTS];
    },

    saveProducts(products) {
        this._set('crispi_products', products);
        this._syncProductsToSupabase(products);
    },

    addProduct(product) {
        const products = this.getProducts();
        product.id = product.id || 'custom-' + Date.now();
        products.push(product);
        this.saveProducts(products);
        return product;
    },

    updateProduct(id, updates) {
        const products = this.getProducts();
        const idx = products.findIndex(p => p.id === id);
        if (idx === -1) return null;
        products[idx] = { ...products[idx], ...updates };
        this.saveProducts(products);
        return products[idx];
    },

    deleteProduct(id) {
        const products = this.getProducts().filter(p => p.id !== id);
        this.saveProducts(products);
    },

    // ===== REVENUE (Chiffre d'Affaires) =====
    getRevenue() {
        return this._get('crispi_revenue') || 0;
    },

    addRevenue(amount) {
        const current = this.getRevenue();
        const newTotal = current + amount;
        this._set('crispi_revenue', newTotal);
        this._syncRevenueToSupabase(newTotal);
        return newTotal;
    },

    // ===== ORDERS =====
    getOrderNumber() {
        return this._get('crispi_order_number') || 1;
    },

    incrementOrderNumber() {
        const num = this.getOrderNumber() + 1;
        this._set('crispi_order_number', num);
        return num;
    },

    saveOrder(order) {
        const orders = this._get('crispi_orders') || [];
        orders.push(order);
        // Keep last 500 orders locally
        if (orders.length > 500) orders.splice(0, orders.length - 500);
        this._set('crispi_orders', orders);
        this._syncOrderToSupabase(order);
    },

    // ===== SUPABASE SYNC =====
    async _syncProductsToSupabase(products) {
        if (!this.isOnline()) return;
        try {
            // Upsert all products
            await this._supabase.from('products').upsert(
                products.map(p => ({
                    id: p.id,
                    name: p.name,
                    price: p.price,
                    category: p.category,
                    image: p.image,
                    position: p.position,
                    updated_at: new Date().toISOString()
                })),
                { onConflict: 'id' }
            );
        } catch (e) { console.error('Product sync failed:', e); }
    },

    async _syncRevenueToSupabase(total) {
        if (!this.isOnline()) return;
        try {
            await this._supabase.from('revenue').upsert({
                id: 'main',
                total: total,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        } catch (e) { console.error('Revenue sync failed:', e); }
    },

    async _syncOrderToSupabase(order) {
        if (!this.isOnline()) return;
        try {
            await this._supabase.from('orders').insert({
                id: order.id,
                order_number: order.orderNumber,
                items: order.items,
                total: order.total,
                created_at: order.timestamp
            });
        } catch (e) { console.error('Order sync failed:', e); }
    },

    // Pull latest data from Supabase (run on startup if online)
    async syncFromSupabase() {
        if (!this.isOnline()) return;
        try {
            // Sync revenue — take the higher value
            const { data: revData } = await this._supabase
                .from('revenue')
                .select('total')
                .eq('id', 'main')
                .single();
            if (revData) {
                const localRev = this.getRevenue();
                const remoteRev = revData.total || 0;
                if (remoteRev > localRev) {
                    this._set('crispi_revenue', remoteRev);
                }
            }

            // Sync products — prefer remote if available
            const { data: prodData } = await this._supabase
                .from('products')
                .select('*')
                .order('position');
            if (prodData && prodData.length > 0) {
                this._set('crispi_products', prodData);
            }
        } catch (e) { console.error('Sync from Supabase failed:', e); }
    }
};
```

---

### Task 5: Product Grid Rendering

**Files:**
- Create: `js/products.js`

- [ ] **Step 1: Create products.js**

```javascript
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
                    <div class="product-price">${p.price.toFixed(2)} DH</div>
                </div>
            `).join('');
    }
};
```

---

### Task 6: Order Management

**Files:**
- Create: `js/orders.js`

- [ ] **Step 1: Create orders.js**

```javascript
// js/orders.js — Order ticket: add/remove items, validate, cancel

const Orders = {
    items: [],  // Array of { product: {...}, quantity: number }

    init() {
        this.render();
        this.updateOrderNumber();
        this.bindEvents();
    },

    bindEvents() {
        document.getElementById('btnValidate').addEventListener('click', () => this.validate());
        document.getElementById('btnCancel').addEventListener('click', () => this.cancel());

        // Quantity +/- buttons (delegated)
        document.getElementById('orderItems').addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action]');
            if (!btn) return;
            const id = btn.dataset.id;
            const action = btn.dataset.action;
            if (action === 'plus') this.changeQty(id, 1);
            if (action === 'minus') this.changeQty(id, -1);
        });

        // Mobile toggle
        document.getElementById('btnOrderToggle').addEventListener('click', () => {
            document.querySelector('.order-panel').classList.toggle('open');
        });
    },

    addItem(product) {
        const existing = this.items.find(i => i.product.id === product.id);
        if (existing) {
            existing.quantity++;
        } else {
            this.items.push({ product, quantity: 1 });
        }
        this.render();
        this.updateBadge();

        // Animate
        const card = document.querySelector(`.product-card[data-id="${product.id}"]`);
        if (card) {
            card.classList.remove('order-item-added');
            void card.offsetWidth; // force reflow
            card.classList.add('order-item-added');
        }
    },

    changeQty(productId, delta) {
        const item = this.items.find(i => i.product.id === productId);
        if (!item) return;
        item.quantity += delta;
        if (item.quantity <= 0) {
            this.items = this.items.filter(i => i.product.id !== productId);
        }
        this.render();
        this.updateBadge();
    },

    getTotal() {
        return this.items.reduce((sum, i) => sum + (i.product.price * i.quantity), 0);
    },

    render() {
        const container = document.getElementById('orderItems');
        const emptyMsg = document.getElementById('orderEmpty');
        const totalEl = document.getElementById('orderTotal');

        if (this.items.length === 0) {
            container.innerHTML = '<div class="order-empty" id="orderEmpty">Aucun article</div>';
            totalEl.textContent = '0.00 DH';
            return;
        }

        container.innerHTML = this.items.map(i => `
            <div class="order-item">
                <div class="order-item-info">
                    <div class="order-item-name">${i.product.name}</div>
                    <div class="order-item-unit-price">${i.product.price.toFixed(2)} DH</div>
                </div>
                <div class="order-item-qty">
                    <button data-action="minus" data-id="${i.product.id}">&minus;</button>
                    <span>${i.quantity}</span>
                    <button data-action="plus" data-id="${i.product.id}">+</button>
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

        const total = this.getTotal();
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
                line_total: i.product.price * i.quantity
            })),
            total: total,
            timestamp: new Date().toISOString()
        };

        Storage.saveOrder(order);

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

        // Show success toast
        App.showToast(`Commande #${String(orderNumber).padStart(4, '0')} validée — ${total.toFixed(2)} DH`);
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
```

---

### Task 7: Calculator Modal

**Files:**
- Create: `js/calculator.js`

- [ ] **Step 1: Create calculator.js**

```javascript
// js/calculator.js — Calculator modal logic

const Calculator = {
    display: null,
    currentValue: '0',
    previousValue: '',
    operation: null,
    resetNext: false,

    init() {
        this.display = document.getElementById('calcDisplay');

        document.getElementById('btnCalculator').addEventListener('click', () => {
            this.reset();
            App.openModal('calculatorModal');
        });

        document.querySelector('.calc-buttons').addEventListener('click', (e) => {
            const btn = e.target.closest('.calc-btn');
            if (!btn) return;
            this.handleInput(btn.dataset.calc);
        });
    },

    handleInput(value) {
        if (value === 'C') {
            this.reset();
            return;
        }

        if (value === 'backspace') {
            this.currentValue = this.currentValue.length > 1
                ? this.currentValue.slice(0, -1)
                : '0';
            this.updateDisplay();
            return;
        }

        if (value === '=') {
            this.calculate();
            this.operation = null;
            this.previousValue = '';
            this.resetNext = true;
            return;
        }

        if (['+', '-', '*', '/', '%'].includes(value)) {
            if (this.operation && !this.resetNext) {
                this.calculate();
            }
            this.operation = value;
            this.previousValue = this.currentValue;
            this.resetNext = true;
            return;
        }

        // Number or decimal
        if (value === '.' && this.currentValue.includes('.')) return;

        if (this.resetNext) {
            this.currentValue = value === '.' ? '0.' : value;
            this.resetNext = false;
        } else {
            this.currentValue = this.currentValue === '0' && value !== '.'
                ? value
                : this.currentValue + value;
        }

        this.updateDisplay();
    },

    calculate() {
        if (!this.operation || !this.previousValue) return;
        const prev = parseFloat(this.previousValue);
        const curr = parseFloat(this.currentValue);
        let result = 0;

        switch (this.operation) {
            case '+': result = prev + curr; break;
            case '-': result = prev - curr; break;
            case '*': result = prev * curr; break;
            case '/': result = curr !== 0 ? prev / curr : 0; break;
            case '%': result = prev % curr; break;
        }

        this.currentValue = parseFloat(result.toFixed(10)).toString();
        this.updateDisplay();
    },

    reset() {
        this.currentValue = '0';
        this.previousValue = '';
        this.operation = null;
        this.resetNext = false;
        this.updateDisplay();
    },

    updateDisplay() {
        this.display.value = this.currentValue;
    }
};
```

---

### Task 8: Product Manager (Add/Edit/Delete)

**Files:**
- Create: `js/product-manager.js`

- [ ] **Step 1: Create product-manager.js**

```javascript
// js/product-manager.js — Add, edit, delete products with image upload

const ProductManager = {
    currentImageData: null,

    init() {
        document.getElementById('btnAddProduct').addEventListener('click', () => this.openAdd());

        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.save();
        });

        document.getElementById('btnDeleteProduct').addEventListener('click', () => this.deleteProduct());

        // Image upload
        const uploadArea = document.getElementById('imageUploadArea');
        const imageInput = document.getElementById('productImage');

        uploadArea.addEventListener('click', () => imageInput.click());

        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            this.processImage(file);
        });

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = 'var(--accent)';
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.style.borderColor = '';
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.processImage(file);
            }
        });
    },

    processImage(file) {
        // Resize and compress image to max 500KB
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 300;
                let w = img.width;
                let h = img.height;

                if (w > maxSize || h > maxSize) {
                    if (w > h) {
                        h = Math.round((h * maxSize) / w);
                        w = maxSize;
                    } else {
                        w = Math.round((w * maxSize) / h);
                        h = maxSize;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);

                this.currentImageData = canvas.toDataURL('image/jpeg', 0.7);

                // Show preview
                const preview = document.getElementById('imagePreview');
                const text = document.getElementById('imageUploadText');
                preview.src = this.currentImageData;
                preview.style.display = 'block';
                text.style.display = 'none';
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    },

    openAdd() {
        document.getElementById('productModalTitle').textContent = 'Ajouter un Produit';
        document.getElementById('productForm').reset();
        document.getElementById('productEditId').value = '';
        document.getElementById('btnDeleteProduct').style.display = 'none';
        document.getElementById('imagePreview').style.display = 'none';
        document.getElementById('imageUploadText').style.display = '';
        this.currentImageData = null;
        App.openModal('productModal');
    },

    openEdit(productId) {
        const product = Storage.getProducts().find(p => p.id === productId);
        if (!product) return;

        document.getElementById('productModalTitle').textContent = 'Modifier le Produit';
        document.getElementById('productEditId').value = product.id;
        document.getElementById('productName').value = product.name;
        document.getElementById('productPrice').value = product.price;
        document.getElementById('productCategory').value = product.category;
        document.getElementById('btnDeleteProduct').style.display = '';

        // Show current image
        const preview = document.getElementById('imagePreview');
        const text = document.getElementById('imageUploadText');
        if (product.image && product.image !== PLACEHOLDER_IMG) {
            preview.src = product.image;
            preview.style.display = 'block';
            text.style.display = 'none';
            this.currentImageData = product.image;
        } else {
            preview.style.display = 'none';
            text.style.display = '';
            this.currentImageData = null;
        }

        App.openModal('productModal');
    },

    save() {
        const editId = document.getElementById('productEditId').value;
        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);
        const category = document.getElementById('productCategory').value;
        const image = this.currentImageData || PLACEHOLDER_IMG;

        if (!name || isNaN(price) || price < 0) return;

        if (editId) {
            // Update existing
            Storage.updateProduct(editId, { name, price, category, image });
            App.showToast('Produit modifié');
        } else {
            // Add new
            const products = Storage.getProducts();
            const categoryProducts = products.filter(p => p.category === category);
            Storage.addProduct({
                name,
                price,
                category,
                image,
                position: categoryProducts.length + 1
            });
            App.showToast('Produit ajouté');
        }

        App.closeModal('productModal');
        Products.renderGrid();
    },

    deleteProduct() {
        const editId = document.getElementById('productEditId').value;
        if (!editId) return;

        App.confirm('Supprimer ce produit ?', () => {
            Storage.deleteProduct(editId);
            App.closeModal('productModal');
            Products.renderGrid();
            App.showToast('Produit supprimé');
        });
    }
};
```

---

### Task 9: App Initialization & Utilities

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: Create app.js with initialization and utility functions**

```javascript
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
```

---

### Task 10: Create Placeholder Image & Directory

**Files:**
- Create: `img/` directory

- [ ] **Step 1: Create img directory**

```bash
mkdir -p img
```

The placeholder image is handled as an inline SVG data URI in `data.js` so no actual file is needed. The `img/` directory exists for user-uploaded product images in the future.

---

### Task 11: Manual End-to-End Verification

- [ ] **Step 1: Open index.html in browser**

Open `C:/Users/PABLO/Desktop/CRISPY/index.html` in Chrome/Edge. Verify:
- Dark theme loads correctly
- "CRISPI" logo in gold at top left
- Chiffre d'affaires shows "0.00 DH" in top bar
- Calculator and + buttons visible in top bar
- 6 category tabs visible and scrollable
- "Chawarma" tab active by default with 10 product cards
- Each card shows placeholder image, name, price in gold

- [ ] **Step 2: Test adding items to order**

Click a few product cards. Verify:
- Items appear in right panel with quantity 1
- Click same product again — quantity increases
- +/- buttons work on order items
- Total updates correctly
- "Valider Commande" button is green

- [ ] **Step 3: Test validating an order**

Click "Valider Commande". Verify:
- Toast shows "Commande #0001 validée — XX.XX DH"
- Chiffre d'affaires updates in top bar
- Order panel clears
- Order number increments to #0002

- [ ] **Step 4: Test calculator**

Click calculator icon. Verify:
- Modal opens with dark calculator
- Type "25 + 15 =" — display shows "40"
- "C" resets to 0
- Close button dismisses modal

- [ ] **Step 5: Test adding a product**

Click "+" button. Verify:
- "Ajouter un Produit" modal opens
- Fill in name, price, select category
- Upload an image (optional)
- Click "Enregistrer"
- Product appears in the selected category grid

- [ ] **Step 6: Test editing a product**

Right-click (or long-press on touch) a product card. Verify:
- "Modifier le Produit" modal opens
- Fields pre-filled with product data
- Change price, click "Enregistrer"
- Product card updates with new price

- [ ] **Step 7: Verify chiffre d'affaires persistence**

Refresh the page. Verify:
- Chiffre d'affaires remains the same value
- All products still present
- Order number continues from where it was

- [ ] **Step 8: Test responsive layout**

Resize browser to narrow width (<900px). Verify:
- Order panel hidden
- "Commande" floating button appears
- Tap it — order panel slides in from right
- Product grid adjusts to fewer columns
