const CACHE_NAME = 'summer-growth-bank-v16';
const ASSETS = ['manifest.json', 'icon-512.png'];

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Network-only for HTML, cache only for static assets as fallback
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  // Never cache HTML — always fetch from network
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname === '.') {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
    );
    return;
  }
  // For other assets, try network first, fallback to cache
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200) {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() => caches.match(event.request))
  );
});