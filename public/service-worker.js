const CACHE_NAME = 'nexora-shell-cache-v2';
const MAX_DYNAMIC_ENTRIES = 80;
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg',
  '/logo.png'
];

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_DYNAMIC_ENTRIES) return;
  await Promise.all(keys.slice(0, keys.length - MAX_DYNAMIC_ENTRIES).map((request) => cache.delete(request)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => Promise.all(ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => undefined))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

function isCacheableShellRequest(request, url) {
  if (request.method !== 'GET' || url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/')) return false;
  if (/\.(mp4|webm|mov|mp3|wav|ogg|m4a|pdf|zip)$/i.test(url.pathname)) return false;
  if (url.hostname.includes('firebase') || url.hostname.includes('googleapis.com') || url.hostname.includes('google.com')) return false;
  return request.mode === 'navigate' || /\.(js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname) || url.pathname === '/manifest.json';
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (!isCacheableShellRequest(event.request, url)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkResponse = fetch(event.request).then((response) => {
        if (response && response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(async (cache) => {
            await cache.put(event.request, copy);
            await trimCache(cache);
          });
        }
        return response;
      });

      if (cachedResponse) {
        event.waitUntil(networkResponse.catch(() => undefined));
        return cachedResponse;
      }

      return networkResponse.catch(() => {
        if (event.request.mode === 'navigate') return caches.match('/index.html');
        throw new Error('Offline and resource is not cached.');
      });
    })
  );
});
