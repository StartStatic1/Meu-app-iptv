// StreamFlix SW — network-first, cache inteligente para assets estáticos
const CACHE_NAME = 'streamflix-cache-v9';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/css/tv-style.css',
  '/js/app.js',
  '/js/config.js',
  '/js/pagamento.js',
  '/js/iptv-canais.js',
  '/js/tv-ao-vivo.js',
  '/js/tv-remote.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) =>
      Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: sempre network, nunca cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Assets estáticos: cache-first com fallback network
  if (STATIC_ASSETS.some(a => url.pathname === a || url.pathname.endsWith(a))) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request))
    );
    return;
  }

  // Todo o resto: network-first com fallback cache (funciona offline)
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
