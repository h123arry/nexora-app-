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
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Nexora Alert';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: payload.notification?.icon || '/logo.png',
    badge: '/icons/icon-48.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
