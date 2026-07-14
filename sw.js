const CACHE_NAME = 'summer-growth-bank-v3.2.00';
const ASSETS = [
  '/', 'index.html', 'main.js?v=3.2.00', 'manifest.json', 'icon-512.png',
  'assets/watering-can-new.png', // 浇水壶图片（成长树浇水动画，已抠图透明 PNG）
  'core/state.js?v=3.2.00', 'core/data.js?v=3.2.00', 'core/helpers.js?v=3.2.00',
  'features/render.js?v=3.2.00', 'features/password.js?v=3.2.00', 'features/makeup.js?v=3.2.00',
  'features/media.js?v=3.2.00', 'features/parent-center.js?v=3.2.00',
  // 松树精灵图（手绘位图，pine 物种 canvas 渲染路线）：stage 0..4 固化资源（透明 PNG）
  'assets/tree-sprites/pine/pine-0.png', 'assets/tree-sprites/pine/pine-1.png',
  'assets/tree-sprites/pine/pine-2.png', 'assets/tree-sprites/pine/pine-3.png',
  'assets/tree-sprites/pine/pine-4.png',
  // 苹果 / 樱花 / 橙子精灵图（apple/sakura/orange 物种 canvas 渲染路线，同 pine 管线）：stage 0..4
  'assets/tree-sprites/apple/apple-0.png', 'assets/tree-sprites/apple/apple-1.png',
  'assets/tree-sprites/apple/apple-2.png', 'assets/tree-sprites/apple/apple-3.png',
  'assets/tree-sprites/apple/apple-4.png',
  'assets/tree-sprites/sakura/sakura-0.png', 'assets/tree-sprites/sakura/sakura-1.png',
  'assets/tree-sprites/sakura/sakura-2.png', 'assets/tree-sprites/sakura/sakura-3.png',
  'assets/tree-sprites/sakura/sakura-4.png',
  'assets/tree-sprites/orange/orange-0.png', 'assets/tree-sprites/orange/orange-1.png',
  'assets/tree-sprites/orange/orange-2.png', 'assets/tree-sprites/orange/orange-3.png',
  'assets/tree-sprites/orange/orange-4.png'
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