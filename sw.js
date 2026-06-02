const CACHE_NAME = 'streamflix-cache-v2.7';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/css/style.css',
                '/js/app.js',
                '/js/config.js'
            ]);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    return caches.delete(key);
                }
            }));
        })
    );
    self.clients.claim();
});

// ESTRATÉGIA NETWORK FIRST (Internet primeiro, Cache como backup)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).then((response) => {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
            });
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
