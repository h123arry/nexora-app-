import { getMessaging, getToken, onMessage, Messaging, deleteToken } from 'firebase/messaging';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, app, db } from './config';
import { isNativeRuntime } from '../../lib/nativeRuntime';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: {
    type?: 'spark' | 'like' | 'comment' | 'comment_reply' | 'mention' | 'follow' | 'profile_view' | 'repost' | 'security' | 'chat' | 'message' | 'system';
    targetId?: string;
    notificationId?: string;
    username?: string;
    actorName?: string;
    userId?: string;
    url?: string;
    senderAvatar?: string;
  };
}

export class PushNotificationService {
  private static messaging: Messaging | null = null;
  private static token: string | null = null;
  private static isInitialized = false;
  private static tokenOwnerUid: string | null = null;

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
    this.tokenOwnerUid = uid;
  }

  /**
   * Initializes Push Notifications & FCM Messaging
   */
  static async init(): Promise<string | null> {
    if (isNativeRuntime()) {
      console.info('Native push is not configured in this build; Web Push registration is intentionally disabled inside Capacitor.');
      return null;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    if (this.token && this.tokenOwnerUid && this.tokenOwnerUid !== uid) {
      const previousTokenId = await this.tokenDocumentId(this.token);
      await deleteDoc(doc(db, 'users', this.tokenOwnerUid, 'pushTokens', previousTokenId));
      if (this.messaging) await deleteToken(this.messaging);
      this.token = null;
      this.tokenOwnerUid = null;
      this.isInitialized = false;
    }
    if (this.isInitialized && this.token && this.tokenOwnerUid === uid) {
      return this.token;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      console.warn('Push Notifications not supported in this environment.');
      return null;
    }

    try {
      // Check or request permission
      const permission = Notification.permission;
      // Ask only from the user's explicit Notifications inbox action.
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
            icon: '/nexora-mark.png',
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
    const uid = this.tokenOwnerUid;
    const token = this.token;
    if (!uid || !token) return;
    const tokenId = await this.tokenDocumentId(token);
    await deleteDoc(doc(db, 'users', uid, 'pushTokens', tokenId));
    if (this.messaging) await deleteToken(this.messaging);
    this.token = null;
    this.tokenOwnerUid = null;
    this.isInitialized = false;
  }

  /**
   * Displays native Web Push notification on Desktop / Mobile OS
   */
  static displayNativeNotification(payload: PushNotificationPayload) {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const data = payload.data || {};
    const options: NotificationOptions = {
      body: payload.body,
      icon: '/nexora-mark.png',
      badge: '/icons/icon-48.png',
      tag: data.notificationId || ('nexora-' + (data.type || 'general') + '-' + (data.targetId || 'update')),
      data,
      silent: true,
    };

    // Mobile browsers and installed Android PWAs should display through the service worker.
    const serviceWorkerReady = 'serviceWorker' in navigator
      ? navigator.serviceWorker.ready
      : Promise.reject(new Error('Service workers are unavailable.'));
    void serviceWorkerReady.then(async registration => {
      if (typeof registration.showNotification === 'function') {
        await registration.showNotification(payload.title, options);
        return;
      }
      const notification = new Notification(payload.title, options);
      notification.onclick = () => {
        window.focus();
        if (data.url) window.location.href = data.url;
        else window.dispatchEvent(new CustomEvent('changeTab', {
          detail: { tab: data.type === 'chat' || data.type === 'message' ? 'inbox' : 'activity' }
        }));
        notification.close();
      };
    }).catch(() => {
      try {
        const notification = new Notification(payload.title, options);
        notification.onclick = () => {
          window.focus();
          if (data.url) window.location.href = data.url;
          else window.dispatchEvent(new CustomEvent('changeTab', {
            detail: { tab: data.type === 'chat' || data.type === 'message' ? 'inbox' : 'activity' }
          }));
          notification.close();
        };
      } catch {
        console.warn('Native notification could not be displayed.');
      }
    });
  }}
