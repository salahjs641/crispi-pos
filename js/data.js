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
    { id: 'omlet', name: 'Omlet' },
    { id: 'ftour-beldi', name: 'Ftour Beldi' },
    { id: 'ftour-fassi', name: 'Ftour Fassi' },
    { id: 'ftour-chamali', name: 'Ftour Chamali' },
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

    // === OMLET ===
    { id: 'om-01', name: 'Omelette Normal', price: 10, category: 'omlet', image: PLACEHOLDER_IMG, position: 1 },
    { id: 'om-02', name: 'Omelette Fromage', price: 15, category: 'omlet', image: PLACEHOLDER_IMG, position: 2 },
    { id: 'om-03', name: 'Omelette Khli3', price: 20, category: 'omlet', image: PLACEHOLDER_IMG, position: 3 },
    { id: 'om-04', name: 'Omelette Avec Tomat', price: 20, category: 'omlet', image: PLACEHOLDER_IMG, position: 4 },
    { id: 'om-05', name: 'Omelette Dinde Fumé', price: 20, category: 'omlet', image: PLACEHOLDER_IMG, position: 5 },

    // === FTOUR CHAMALI ===
    { id: 'fc-01', name: 'Ftour Chamali', price: 30, category: 'ftour-chamali', image: PLACEHOLDER_IMG, position: 1 },

    // === BOISSONS ===
    { id: 'bs-01', name: 'Jus d\'Orange', price: 14, category: 'boissons', image: PLACEHOLDER_IMG, position: 1 },
    { id: 'bs-02', name: 'Panache', price: 10, category: 'boissons', image: PLACEHOLDER_IMG, position: 2 },
    { id: 'bs-03', name: 'Jus Avocat', price: 10, category: 'boissons', image: PLACEHOLDER_IMG, position: 3 },
    { id: 'bs-04', name: 'Jus Banane', price: 10, category: 'boissons', image: PLACEHOLDER_IMG, position: 4 },
    { id: 'bs-05', name: 'Jus Fraise', price: 10, category: 'boissons', image: PLACEHOLDER_IMG, position: 5 },
    { id: 'bs-06', name: 'Eau', price: 6, category: 'boissons', image: PLACEHOLDER_IMG, position: 6 },
    { id: 'bs-07', name: 'Semonade', price: 5, category: 'boissons', image: PLACEHOLDER_IMG, position: 7 },
    { id: 'bs-08', name: 'Frites', price: 5, category: 'boissons', image: PLACEHOLDER_IMG, position: 8 }
];
