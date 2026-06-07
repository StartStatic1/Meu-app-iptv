// StreamFlix SW — network-first, versão anti-splash-bug
const CACHE_NAME = 'streamflix-cache-v9';

self.addEventListener('install', (event) => {
    self.skipWaiting(); // Ativa imediatamente, sem esperar
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) =>
            Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }))
        ).then(() => self.clients.claim()) // Toma controle imediato de todas as abas
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Nunca cacheia chamadas de API
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(fetch(event.request));
        return;
    }

    // Network-first para tudo — garante sempre versão atualizada
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cacheia resposta válida
                if (response && response.status === 200) {
                    const cloned = response.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
                }
                return response;
            })
            .catch(() => caches.match(event.request)) // Offline: usa cache
    );
});
