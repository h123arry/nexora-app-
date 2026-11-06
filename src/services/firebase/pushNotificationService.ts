import { getMessaging, getToken, onMessage, Messaging, deleteToken } from 'firebase/messaging';
import { collection, deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, app, db } from './config';

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

  private static async tokenDocumentId(token: string): Promise<string> {
    const bytes = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  private static async persistToken(token: string): Promise<void> {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('Sign in before registering a push device.');
    const tokenId = await this.tokenDocumentId(token);
    await setDoc(doc(db, 'users', uid, 'pushTokens', tokenId), {
      token,
      platform: 'web',
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

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
            await this.persistToken(fcmToken);
            this.token = fcmToken;
            console.info('FCM device registration is active.');
          }
        } catch {
          console.warn('FCM token registration unavailable; verify the VAPID key and messaging service worker configuration.');
        }
      } else {
        console.info('FCM Web Push is not configured: VITE_FIREBASE_VAPID_KEY is missing. Permission alone does not enable remote push delivery.');
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
      return this.token;
    } catch {
      console.warn('Push Notification initialization unavailable in this environment.');
      return null;
    }
  }

  /** Removes this browser's registration from the signed-in account. */
  static async unregister(): Promise<void> {
    const uid = auth.currentUser?.uid;
    const token = this.token;
    if (!uid || !token) return;
    const tokenId = await this.tokenDocumentId(token);
    await deleteDoc(doc(db, 'users', uid, 'pushTokens', tokenId));
    if (this.messaging) await deleteToken(this.messaging);
    this.token = null;
    this.isInitialized = false;
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
