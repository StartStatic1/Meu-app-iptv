const CACHE_NAME = 'streamflix-cache-v2.8.1';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/css/style.css?v=2.8.1',
                '/js/config.js?v=2.8.1',
                '/js/utils.js?v=2.8.1',
                '/js/vip.js?v=2.8.1',
                '/js/ads.js?v=2.8.1',
                '/js/hero.js?v=2.8.1',
                '/js/filmes.js?v=2.8.1',
                '/js/busca.js?v=2.8.1',
                '/js/series.js?v=2.8.1',
                '/js/tv.js?v=2.8.1',
                '/js/modal.js?v=2.8.1',
                '/js/player.js?v=2.8.1',
                '/js/navigation.js?v=2.8.1'
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

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('/api/') || event.request.url.includes('api.themoviedb.org') || event.request.url.includes('superflixapi.fit')) {
        return;
    }
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => cachedResponse);
            return cachedResponse || fetchPromise;
        })
    );
});
