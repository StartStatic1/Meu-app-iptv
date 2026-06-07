// StreamFlix SW — network-first, sem cache proativo que trava o install
const CACHE_NAME = 'streamflix-cache-v8';

self.addEventListener('install', (event) => {
    // Não cacheia nada no install — evita travamento se algum arquivo demorar
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Limpa todos os caches antigos
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
    // Sempre tenta network primeiro; só usa cache se offline
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});
