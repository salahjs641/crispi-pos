// Service Worker — enables offline mode and PWA install
const CACHE_NAME = 'crispi-pos-v6';
const ASSETS = [
    './',
    './index.html',
    './log.html',
    './admin.html',
    './css/styles.css',
    './css/log.css',
    './css/admin.css',
    './js/supabase-config.js',
    './js/data.js',
    './js/storage.js',
    './js/products.js',
    './js/orders.js',
    './js/calculator.js',
    './js/product-manager.js',
    './js/app.js',
    './js/log.js',
    './js/admin.js',
    './manifest.json'
];

// Install — cache all assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — serve from cache, fallback to network
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
