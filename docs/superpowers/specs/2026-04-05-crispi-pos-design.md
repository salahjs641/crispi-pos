# Crispi POS System - Design Spec

## Overview
A tablet-first, dark-themed Restaurant POS system in French for the Crispi restaurant. Single-page web app (vanilla HTML/CSS/JS) with Supabase backend and localStorage caching. All UI text is in French.

## Tech Stack
- **Frontend:** Vanilla HTML, CSS, JavaScript (no framework)
- **Database:** Supabase (PostgreSQL) for persistent storage
- **Local cache:** localStorage for offline speed and redundancy
- **Deployment:** Static files, served locally or via any web server

## Layout

### Screen Structure (Tablet landscape, ~1024x768 baseline)
```
+------------------------------------------------------------------+
|  [Crispi Logo]    CHIFFRE D'AFFAIRES: 12,450.00 DH    [Calc] [+] |
+------------------------------------------------------------------+
|                              |                                    |
|  [Chawarma] [Poulet] [Ftour |   COMMANDE EN COURS     #0042     |
|   Beldi] [Ftour Fassi]      |                                    |
|  [Ftour Express] [Boissons] |   Sandwich Chawarma  x2   30 DH   |
|                              |   Chicken Box        x1   30 DH   |
|  +--------+ +--------+      |   Jus d'Orange       x1   14 DH   |
|  | img    | | img    |      |                                    |
|  | name   | | name   |      |   -------------------------------- |
|  | 15 DH  | | 20 DH  |      |                                    |
|  +--------+ +--------+      |   TOTAL:              74.00 DH     |
|  +--------+ +--------+      |                                    |
|  | img    | | img    |      |   [Annuler]    [Valider Commande]  |
|  | name   | | name   |      |                                    |
|  | 25 DH  | | 30 DH  |      |                                    |
|  +--------+ +--------+      |                                    |
+------------------------------------------------------------------+
```

- **Left panel (65%):** Category tabs + product grid (scrollable)
- **Right panel (35%):** Current order, total, action buttons
- **Top bar:** Logo, chiffre d'affaires (always visible), calculator button, add product button

### Responsive Behavior
- Tablet landscape: side-by-side layout as above
- Tablet portrait / phone: order panel slides in as overlay
- PC: same as tablet landscape, max-width ~1400px centered

## Features

### 1. Chiffre d'Affaires (Revenue Tracker)
- Displayed permanently in the top bar
- Shows cumulative total revenue in DH
- **Cannot be deleted or reset** — no UI control to clear it
- Persisted in both Supabase and localStorage
- Updated each time an order is validated
- Format: "CHIFFRE D'AFFAIRES: XX,XXX.XX DH"

### 2. Product Categories & Items

#### Chawarma
| Product | Price (DH) |
|---------|-----------|
| Sandwich Chawarma | 15 |
| Chawarma Pains | 20 |
| Chawarma Frites | 25 |
| Tacos Chawarma | 30 |
| Double Chawarma | 35 |
| Chawarma Sarouki | 45 |
| Chawarma Box | 30 |
| Chawarma Du Bled | 45 |
| Chawarma Arabe | 35 |
| Plat Chawarma | 40 |

#### Poulet Croustillant
| Product | Price (DH) |
|---------|-----------|
| Chicken Khliza (sans frites) | 13 |
| Chicken Sandwich (sans frites) | 18 |
| Chicken Sandwich | 23 |
| Chicken Special | 28 |
| Chicken Tacos | 25 |
| Chicken Burger | 23 |
| Tacos Royale | 45 |
| Chicken Box | 30 |
| Big Chicken Box | 45 |
| Plat Chicken | 30 |

#### Ftour Beldi
- Empty category — user will add products later via "Add Product" feature

#### Ftour Fassi
- Empty category — user will add products later via "Add Product" feature

#### Ftour Express
- Empty category — user will add products later via "Add Product" feature

#### Boissons
| Product | Price (DH) |
|---------|-----------|
| Jus d'Orange | 14 |
| Panache | 10 |
| Jus Avocat | 10 |
| Eau | 6 |
| Semonade | 5 |
| Frites | 5 |

### 3. Order Management
- Tap product card to add to current order (quantity +1)
- Order ticket shows: product name, quantity, line total
- Quantity controls: + / - buttons per line item
- Remove item: decrease to 0 or swipe/delete button
- "Annuler" button: clears current order (with confirmation)
- "Valider Commande" button: completes the order
  - Adds total to chiffre d'affaires
  - Saves order to Supabase (timestamp, items, total)
  - Caches in localStorage
  - Clears the ticket for next order
  - Order number auto-increments

### 4. Calculator
- Triggered by calculator icon button in top bar
- Opens as a modal overlay
- Full calculator: digits 0-9, +, -, x, /, =, C, decimal
- Dark theme matching the app
- Close button (X) to dismiss

### 5. Add Product
- Triggered by "+" button in top bar
- Opens modal form with fields:
  - Nom du produit (text input)
  - Prix (number input, in DH)
  - Categorie (dropdown: Chawarma, Poulet, Ftour Beldi, Ftour Fassi, Ftour Express, Boissons)
  - Image (file upload, accepts jpg/png/webp)
- Image stored as base64 in localStorage and Supabase
- Product appears immediately in its category grid
- Validation: name and price required

### 6. Edit Product / Adjust Prices
- Long-press (mobile) or right-click (desktop) on product card opens edit modal
- Edit modal allows:
  - Change name
  - Change price
  - Change image
  - Change category
  - Delete product (with confirmation)
- Changes saved to both localStorage and Supabase

## Data Model

### Supabase Tables

#### `products`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, auto-generated |
| name | text | Product name |
| price | numeric | Price in DH |
| category | text | Category slug |
| image | text | Base64 image data or URL |
| position | integer | Sort order within category |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto |

#### `orders`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| order_number | integer | Auto-increment display number |
| items | jsonb | Array of {product_id, name, quantity, price, line_total} |
| total | numeric | Order total in DH |
| created_at | timestamptz | Timestamp of validation |

#### `revenue`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK (single row) |
| total | numeric | Cumulative chiffre d'affaires |
| updated_at | timestamptz | Last update |

### localStorage Keys
- `crispi_products` — JSON array of all products
- `crispi_revenue` — cumulative revenue number
- `crispi_orders` — array of recent orders
- `crispi_order_number` — last order number

## Design Tokens (Dark Theme)

| Token | Value |
|-------|-------|
| Background | #1a1a2e |
| Surface/Cards | #16213e |
| Accent/Primary | #e2b714 (Crispi gold) |
| Text primary | #ffffff |
| Text secondary | #a0a0b0 |
| Success (validate) | #00c853 |
| Danger (cancel) | #ff1744 |
| Border | #2a2a4a |
| Card hover | #1f2b47 |

## Error Handling
- If Supabase is unreachable, app works fully offline via localStorage
- When connection restores, sync pending orders to Supabase
- Visual indicator showing online/offline status (small dot in top bar)

## Constraints
- All UI text in French
- Currency is DH (Dirhams)
- Chiffre d'affaires is append-only, no delete/reset capability
- Product images stored as base64 (max 500KB per image, resized on upload)
- App must work offline after first load
