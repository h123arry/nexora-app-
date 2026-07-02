const CACHE_NAME = 'nexora-pulse-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static assets');
      const cachePromises = ASSETS_TO_CACHE.map((url) => {
        return cache.add(url).catch((err) => {
          console.warn(`[Service Worker] Failed to pre-cache ${url}:`, err);
        });
      });
      return Promise.all(cachePromises);
    }).then(() => self.skipWaiting())
  );
});

// Activate handler
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing ancient cache nodes:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Proxy network calls
self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch fresh copy in background to keep cache updated (stale-while-revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => { /* mute background fetch failure */ });
        return cachedResponse;
      }

      // If not in cache, fetch from network
      return fetch(event.request)
        .then((response) => {
          // If valid response, clone and cache it for future offline usage
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch((err) => {
          // Offline fallback
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          throw err;
        });
    })
  );
});
