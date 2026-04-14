// Service Worker — enables offline mode and PWA install
const CACHE_NAME = 'crispi-pos-v23';
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
    './js/tables.js',
    './js/calculator.js',
    './js/product-manager.js',
    './js/app.js',
    './js/log.js',
    './js/admin.js',
    './manifest.json',
    // Product images
    './img/products/cw-01.jpeg',
    './img/products/cw-02.jpeg',
    './img/products/cw-03.jpeg',
    './img/products/cw-04.jpeg',
    './img/products/cw-05.jpeg',
    './img/products/cw-06.jpeg',
    './img/products/cw-07.jpeg',
    './img/products/cw-08.jpeg',
    './img/products/cw-09.jpeg',
    './img/products/cw-10.jpeg',
    './img/products/pk-01.jpeg',
    './img/products/pk-02.jpeg',
    './img/products/pk-03.jpeg',
    './img/products/pk-04.jpeg',
    './img/products/pk-05.jpeg',
    './img/products/pk-06.jpeg',
    './img/products/pk-07.jpeg',
    './img/products/pk-08.jpeg',
    './img/products/pk-09.jpeg',
    './img/products/pk-10.jpeg',
    './img/products/om-01.jpg',
    './img/products/om-02.jpg',
    './img/products/om-03.jpg',
    './img/products/om-04.jpg',
    './img/products/om-05.jpg',
    './img/products/fb-01.jpg',
    './img/products/ff-01.jpg',
    './img/products/fc-01.jpg',
    './img/products/bs-01.jpg',
    './img/products/bs-02.jpg',
    './img/products/bs-03.jpg',
    './img/products/bs-04.jpg',
    './img/products/bs-05.jpg',
    './img/products/bs-06.jpg',
    './img/products/bs-07.jpeg',
    './img/products/bs-08.jpeg'
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

// Fetch — network-first for pages/JS/CSS, cache-first for images
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    const isAsset = url.pathname.match(/\.(js|css|html)$/) || url.pathname.endsWith('/');

    if (isAsset) {
        // Network-first: always get latest code, fallback to cache if offline
        e.respondWith(
            fetch(e.request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return response;
            }).catch(() => caches.match(e.request))
        );
    } else {
        // Cache-first for images and other assets
        e.respondWith(
            caches.match(e.request).then(cached => cached || fetch(e.request))
        );
    }
});
