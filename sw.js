const CACHE_NAME = 'streamflix-cache-v2.8';

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll([
                '/',
                '/index.html',
                '/css/style.css?v=2.8',
                '/js/config.js?v=2.8',
                '/js/utils.js?v=2.8',
                '/js/vip.js?v=2.8',
                '/js/ads.js?v=2.8',
                '/js/hero.js?v=2.8',
                '/js/filmes.js?v=2.8',
                '/js/busca.js?v=2.8',
                '/js/series.js?v=2.8',
                '/js/tv.js?v=2.8',
                '/js/modal.js?v=2.8',
                '/js/player.js?v=2.8',
                '/js/navigation.js?v=2.8'
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

// ESTRATÉGIA STALE-WHILE-REVALIDATE (Cache primeiro, atualiza depois)
self.addEventListener('fetch', (event) => {
    // Não intercepta chamadas de API
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
