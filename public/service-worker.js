importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

firebase.initializeApp({
  projectId: "nexora-prod-voiceharrison",
  appId: "1:128918144717:web:1bf7a574fddb18bc3e0b84",
  apiKey: "AIzaSyA8RyvP6crBpl4Zg_bgjlTqqgZkMA85NT4",
  messagingSenderId: "128918144717"
});

const nexoraMessaging = firebase.messaging();
nexoraMessaging.onBackgroundMessage(payload => {
  // FCM displays notification-payload messages automatically. Only data-only
  // messages need an explicit notification here.
  if (payload.notification) return;
  const data = payload.data || {};
  const title = data.title || (data.username ? `@${data.username}` : 'NEXORA');
  self.registration.showNotification(title, {
    body: data.body || data.content || 'You have a new NEXORA update.',
    icon: '/nexora-mark.png',
    badge: '/icons/icon-48.png',
    tag: data.notificationId || `nexora-${data.type || 'update'}-${data.targetId || 'general'}`,
    data,
  });
});

const CACHE_NAME = 'nexora-shell-cache-v3';
const MAX_DYNAMIC_ENTRIES = 80;
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/nexora-mark.png',
  '/logo.png',
  '/icons/icon-48.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
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
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
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


// Keep notification routing in the same root-scoped worker as the PWA shell.
// FCM's automatic click handler is stopped so the existing app window is reused.
self.addEventListener('notificationclick', event => {
  event.stopImmediatePropagation();
  event.notification.close();
  const data = event.notification.data || {};
  const target = new URL(data.url || '/', self.location.origin);
  target.searchParams.set('nxPushType', data.type || 'system');
  if (data.userId) target.searchParams.set('nxPushUser', data.userId);
  if (data.targetId) target.searchParams.set('nxPushTarget', data.targetId);
  if (data.notificationId) target.searchParams.set('nxPushNotification', data.notificationId);
  const targetUrl = target.toString();

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        client.postMessage({ type: 'NEXORA_PUSH_OPEN', data });
        return;
      }
    }
    await clients.openWindow(targetUrl);
  })());
});
