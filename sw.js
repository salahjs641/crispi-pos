// Service Worker — enables offline mode and PWA install
const CACHE_NAME = 'crispi-pos-v26';

// Only cache critical app shell assets on install (keep this small!)
const SHELL_ASSETS = [
    './',
    './index.html',
    './css/styles.css',
    './js/supabase-config.js',
    './js/data.js',
    './js/storage.js',
    './js/products.js',
    './js/orders.js',
    './js/tables.js',
    './js/calculator.js',
    './js/product-manager.js',
    './js/app.js',
    './manifest.json'
];

// Install — cache ONLY the app shell (fast, no images blocking)
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL_ASSETS))
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

// Fetch — network-first for JS/CSS/HTML, cache-first for images (lazy cached on first use)
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Skip non-GET and cross-origin requests (e.g. Supabase, Google Fonts)
    if (e.request.method !== 'GET') return;
    if (url.origin !== self.location.origin) return;

    const isCodeAsset = url.pathname.match(/\.(js|css|html)$/) || url.pathname.endsWith('/');

    if (isCodeAsset) {
        // Network-first: always get latest code, fallback to cache if offline
        e.respondWith(
            fetch(e.request).then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return response;
            }).catch(() => caches.match(e.request))
        );
    } else {
        // Cache-first for images — lazy cache on first fetch
        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(response => {
                    // Only cache successful responses under 5MB
                    if (response.ok && response.headers.get('content-length') < 5 * 1024 * 1024) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                    }
                    return response;
                });
            })
        );
    }
});


