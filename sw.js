const CACHE_NAME = 'summer-growth-bank-v3.1.06';
const ASSETS = [
  '/', 'index.html', 'main.js?v=3.1.06', 'manifest.json', 'icon-512.png',
  'core/state.js?v=3.1.06', 'core/data.js?v=3.1.06', 'core/helpers.js?v=3.1.06',
  'features/render.js?v=3.1.06', 'features/password.js?v=3.1.06', 'features/makeup.js?v=3.1.06',
  'features/media.js?v=3.1.06', 'features/parent-center.js?v=3.1.06'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cache-first for all requests: instant offline loading, auto-update on next visit
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      // 如果缓存命中，直接返回；否则尝试网络并缓存
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // 网络也失败，返回空白页（不会崩溃）
        return new Response('离线模式：请联网后刷新页面', {
          status: 503,
          headers: {'Content-Type': 'text/plain; charset=utf-8'}
        });
      });
    })
  );
});