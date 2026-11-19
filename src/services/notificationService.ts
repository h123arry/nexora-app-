import { Notification } from '../types';
import { playNexoraSound } from './soundExperience';

// ============================================================================
// 1. CENTRALIZED SOUND EXPERIENCE
// ============================================================================
export function playNotificationSound(type: 'spark' | 'comment' | 'follow' | 'profile_view' | 'sync' | 'default' = 'default') {
  const soundType = type === 'spark' ? 'notification.spark'
    : type === 'comment' ? 'notification.comment'
    : type === 'follow' ? 'notification.follow'
    : type === 'sync' ? 'interface.confirmation'
    : type === 'profile_view' ? 'notification.profile'
    : 'notification.default';
  playNexoraSound(soundType);
  if (type !== 'sync' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate([25, 20, 35]); } catch { /* Haptics are optional. */ }
  }
}

// ============================================================================
// 2. WEB PUSH NOTIFICATION API (Native Device Notifications)
// ============================================================================
export async function requestPushPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission = await window.Notification.requestPermission();
    localStorage.setItem('nexora_web_push_permission', permission);
    return permission;
  } catch (err) {
    console.error('[WebPush] Error requesting notification permission:', err);
    return 'denied';
  }
}

export function isPushPermissionGranted(): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  return window.Notification.permission === 'granted';
}

export function showWebPushNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (window.Notification.permission !== 'granted') return;

  try {
    const defaultIcon = '/logo.png';
    const notif = new window.Notification(title, {
      icon: defaultIcon,
      badge: defaultIcon,
      silent: true, // We play our custom Web Audio sound
      ...options
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
      if (options?.data?.url) {
        window.location.hash = options.data.url;
      }
    };
  } catch (err) {
    console.debug('[WebPush] Native notification display skipped:', err);
  }
}

// ============================================================================
// 4. REAL-TIME NOTIFICATION DISPATCH ENGINE
// ============================================================================
export function dispatchRealTimeNotification(notif: Notification, options: { playSound?: boolean; showWebPush?: boolean; showPop?: boolean } = {}) {
  const { playSound = true, showWebPush = true, showPop = true } = options;

  // 1. Play synthesized audio feedback
  if (playSound) {
    const soundType = notif.type === 'spark' || notif.type === 'like' ? 'spark'
      : notif.type === 'comment' ? 'comment'
      : notif.type === 'follow' ? 'follow'
      : notif.type === 'profile_view' ? 'profile_view'
      : 'default';
    playNotificationSound(soundType);
  }

  // 2. Dispatch custom event for the in-app Pop banner & notifications store
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexora-realtime-notification', {
      detail: {
        notification: notif,
        showPop
      }
    }));
  }

  // 3. Fire native Web Push notification if allowed & user is in background
  if (showWebPush && isPushPermissionGranted()) {
    const titleMap: Record<string, string> = {
      spark: `⚡ ${notif.actorName || notif.username} sparked your post!`,
      like: `⚡ ${notif.actorName || notif.username} sparked your post!`,
      comment: `💬 ${notif.actorName || notif.username} commented on your post`,
      follow: `👤 ${notif.actorName || notif.username} started following you`,
      profile_view: `👁️ ${notif.actorName || notif.username} viewed your profile`,
      mention: `🏷️ ${notif.actorName || notif.username} mentioned you`,
      message: `✉️ New message from ${notif.actorName || notif.username}`,
      system: `🔔 NEXORA Network Notification`
    };

    const pushTitle = titleMap[notif.type] || `🔔 NEXORA: ${notif.actorName || notif.username}`;
    showWebPushNotification(pushTitle, {
      body: notif.content,
      icon: notif.avatar,
      tag: `nexora-notif-${notif.type}-${Date.now()}`
    });
  }
}