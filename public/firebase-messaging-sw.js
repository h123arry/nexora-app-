importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker using the same registered
// web app configuration as the main NEXORA client.
firebase.initializeApp({
  projectId: "nexora-prod-voiceharrison",
  appId: "1:128918144717:web:1bf7a574fddb18bc3e0b84",
  apiKey: "AIzaSyA8RyvP6crBpl4Zg_bgjlTqqgZkMA85NT4",
  messagingSenderId: "128918144717"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // FCM automatically displays notification-payload messages in the background.
  // Only create a notification here for data-only messages to avoid duplicates.
  if (payload.notification) return;
  const data = payload.data || {};
  const notificationTitle = data.title || (data.username ? `@${data.username}` : 'NEXORA');
  const notificationOptions = {
    body: data.body || data.content || 'You have a new NEXORA update.',
    icon: '/nexora-mark.png',
    badge: '/icons/icon-48.png',
    tag: data.notificationId || `nexora-${data.type || 'update'}-${data.targetId || 'general'}`,
    data
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
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
        if ('navigate' in client) await client.navigate(targetUrl);
        await client.focus();
        return;
      }
    }
    await clients.openWindow(targetUrl);
  })());
});
