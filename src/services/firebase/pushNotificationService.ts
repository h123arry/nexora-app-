import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { app } from './config';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: {
    type?: 'spark' | 'comment' | 'mention' | 'follow' | 'security' | 'chat' | 'system';
    targetId?: string;
    url?: string;
    senderAvatar?: string;
  };
}

export class PushNotificationService {
  private static messaging: Messaging | null = null;
  private static token: string | null = null;
  private static isInitialized = false;

  /**
   * Initializes Push Notifications & FCM Messaging
   */
  static async init(): Promise<string | null> {
    if (this.isInitialized && this.token) {
      return this.token;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Push Notifications not supported in this environment.');
      return null;
    }

    try {
      // Check or request permission
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        console.warn('Push Notification permission denied by user.');
        return null;
      }

      // Initialize Firebase Messaging if Web Messaging is available
      this.messaging = getMessaging(app);

      // Attempt acquiring FCM Push Registration Token if VAPID key is configured
      const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY;
      if (vapidKey) {
        try {
          const fcmToken = await getToken(this.messaging, { vapidKey });
          if (fcmToken) {
            this.token = fcmToken;
            console.info('FCM device registration is active.');
          }
        } catch {
          console.warn('FCM token registration unavailable; verify the VAPID key and messaging service worker configuration.');
        }
      } else {
        console.info('ℹ️ FCM Web Push: VAPID Key not supplied in VITE_FIREBASE_VAPID_KEY. Operating with Native OS Web Notifications.');
      }

      // Listen for foreground messages
      onMessage(this.messaging, (payload) => {
        if (payload.notification) {
          this.displayNativeNotification({
            title: payload.notification.title || 'Nexora Alert',
            body: payload.notification.body || '',
            icon: payload.notification.icon || '/favicon.ico',
            data: payload.data as any
          });
        }
      });

      this.isInitialized = true;
      return this.token || 'granted_native_active';
    } catch {
      console.warn('Push Notification initialization unavailable in this environment.');
      return null;
    }
  }

  /**
   * Displays native Web Push notification on Desktop / Mobile OS
   */
  static displayNativeNotification(payload: PushNotificationPayload) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    // Filter out low-value interactions (e.g., video replays)
    if (payload.data?.type === 'video_replay' as any) {
      return;
    }

    const nIcon = payload.data?.senderAvatar || payload.icon || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80';

    try {
      const notif = new Notification(payload.title, {
        body: payload.body,
        icon: nIcon,
        badge: '/favicon.ico',
        tag: `nexora-${payload.data?.type || 'general'}-${Date.now()}`,
        data: payload.data,
        silent: false
      });

      notif.onclick = (event) => {
        event.preventDefault();
        window.focus();
        
        // Deep link dispatch
        if (payload.data?.url) {
          window.location.href = payload.data.url;
        } else if (payload.data?.type === 'chat' && payload.data.targetId) {
          window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'inbox', chatId: payload.data.targetId } }));
        } else if (payload.data?.type === 'security') {
          window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'profile', subTab: 'security' } }));
        } else {
          window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'pulse' } }));
        }
        notif.close();
      };
    } catch {
      console.warn('Native notification could not be displayed.');
    }
  }
}
