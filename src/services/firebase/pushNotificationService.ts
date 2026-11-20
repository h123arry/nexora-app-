import { getMessaging, getToken, onMessage, Messaging, deleteToken } from 'firebase/messaging';
import { onIdTokenChanged } from 'firebase/auth';
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

type StoredRegistration = { uid: string; tokenId: string };
const REGISTRATION_STORAGE_KEY = 'nexora_push_registration_owner';

export class PushNotificationService {
  private static messaging: Messaging | null = null;
  private static token: string | null = null;
  private static isInitialized = false;
  private static tokenOwnerUid: string | null = null;
  private static initPromise: Promise<string | null> | null = null;
  private static unsubscribeAuth: (() => void) | null = null;
  private static unsubscribeMessage: (() => void) | null = null;

  private static async tokenDocumentId(token: string): Promise<string> {
    const bytes = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  private static readStoredRegistration(): StoredRegistration | null {
    try {
      const raw = localStorage.getItem(REGISTRATION_STORAGE_KEY);
      if (!raw) return null;
      const value = JSON.parse(raw) as Partial<StoredRegistration>;
      return typeof value.uid === 'string' && typeof value.tokenId === 'string'
        ? { uid: value.uid, tokenId: value.tokenId }
        : null;
    } catch {
      return null;
    }
  }

  private static async persistToken(token: string, uid: string): Promise<void> {
    const tokenId = await this.tokenDocumentId(token);
    const previous = this.readStoredRegistration();
    if (previous && (previous.uid !== uid || previous.tokenId !== tokenId)) {
      await deleteDoc(doc(db, 'users', previous.uid, 'pushTokens', previous.tokenId)).catch(() => undefined);
    }
    if (auth.currentUser?.uid !== uid) throw new Error('The signed-in account changed during push registration.');
    await setDoc(doc(db, 'users', uid, 'pushTokens', tokenId), {
      token,
      platform: 'web',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    localStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify({ uid, tokenId }));
    this.tokenOwnerUid = uid;
    this.token = token;
  }

  private static async registerWebPush(uid: string): Promise<string | null> {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return null;
    if (Notification.permission !== 'granted') return null;

    const vapidKey = (import.meta as any).env?.VITE_FIREBASE_VAPID_KEY?.trim();
    if (!vapidKey) {
      console.warn('FCM Web Push is not configured: VITE_FIREBASE_VAPID_KEY is missing.');
      return null;
    }

    const registration = await navigator.serviceWorker.register('/service-worker.js');
    await navigator.serviceWorker.ready;
    if (auth.currentUser?.uid !== uid) return null;

    this.messaging = getMessaging(app);
    const token = await getToken(this.messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) return null;
    await this.persistToken(token, uid);

    if (!this.unsubscribeAuth) {
      this.unsubscribeAuth = onIdTokenChanged(auth, user => {
        const owner = this.tokenOwnerUid || this.readStoredRegistration()?.uid || null;
        if (owner && user?.uid !== owner) {
          void this.removeStoredRegistration();
        }
      });
    }

    this.unsubscribeMessage?.();
    this.unsubscribeMessage = onMessage(this.messaging, payload => {
      const data = payload.data || {};
      const title = payload.notification?.title || data.title || 'NEXORA';
      const body = payload.notification?.body || data.body || data.content || 'You have a new update.';
      this.displayNativeNotification({
        title,
        body,
        data: data as PushNotificationPayload['data'],
      });
    });

    this.isInitialized = true;
    return token;
  }

  private static async removeStoredRegistration(): Promise<void> {
    const stored = this.readStoredRegistration();
    if (stored) {
      await deleteDoc(doc(db, 'users', stored.uid, 'pushTokens', stored.tokenId)).catch(() => undefined);
      localStorage.removeItem(REGISTRATION_STORAGE_KEY);
    }
    if (this.messaging) await deleteToken(this.messaging).catch(() => undefined);
    this.unsubscribeMessage?.();
    this.unsubscribeMessage = null;
    this.token = null;
    this.tokenOwnerUid = null;
    this.isInitialized = false;
  }

  /** Register this browser only after the user has explicitly granted push permission. */
  static async init(): Promise<string | null> {
    if (isNativeRuntime()) {
      console.info('Native push is not configured in this build; native device delivery remains disabled.');
      return null;
    }
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    if (this.isInitialized && this.token && this.tokenOwnerUid === uid) return this.token;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.registerWebPush(uid)
      .catch(error => {
        console.warn('NEXORA push registration could not be completed.', error);
        return null;
      })
      .finally(() => { this.initPromise = null; });
    return this.initPromise;
  }

  /** Remove this browser's token from its owning account and revoke the FCM token. */
  static async unregister(): Promise<void> {
    await this.removeStoredRegistration();
  }

  static displayNativeNotification(payload: PushNotificationPayload): void {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
    const data = payload.data || {};
    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/nexora-mark.png',
      badge: payload.badge || '/icons/icon-48.png',
      tag: data.notificationId || `nexora-${data.type || 'general'}-${data.targetId || 'update'}`,
      data,
      silent: true,
    };
    void navigator.serviceWorker.ready.then(async registration => {
      await registration.showNotification(payload.title, options);
    }).catch(() => {
      try {
        const notification = new Notification(payload.title, options);
        notification.onclick = () => {
          window.focus();
          if (data.url) window.location.href = data.url;
          else window.dispatchEvent(new CustomEvent('changeTab', {
            detail: { tab: data.type === 'chat' || data.type === 'message' ? 'inbox' : 'activity' },
          }));
          notification.close();
        };
      } catch {
        console.warn('NEXORA could not display this device notification.');
      }
    });
  }
}
