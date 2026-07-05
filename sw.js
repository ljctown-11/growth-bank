const CACHE_NAME = 'summer-growth-bank-v3.0';
const ASSETS = ['/', 'index.html', 'bundle.js', 'manifest.json', 'icon-512.png'];

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