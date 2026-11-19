import { Notification, User, Post } from '../types';

// ============================================================================
// 1. CENTRALIZED SOUND EXPERIENCE
// ============================================================================
// Notification delivery is intentionally silent. Refreshes and background
// synchronization must never produce repeated alert sounds or vibration.
export function playNotificationSound(_type: 'spark' | 'comment' | 'follow' | 'profile_view' | 'sync' | 'default' = 'default') {
  return;
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
    const defaultIcon = '/nexora-mark.png';
    const notif = new window.Notification(title, {
      ...options,
      icon: options?.icon || defaultIcon,
      badge: options?.badge || defaultIcon,
      silent: true,
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

// No synthetic creators are used to manufacture engagement or notification activity.
export const NETWORK_CREATORS: User[] = [];

// ============================================================================
// 4. REAL-TIME NOTIFICATION DISPATCH ENGINE
// ============================================================================
export function dispatchRealTimeNotification(notif: Notification, _options: { playSound?: boolean; showWebPush?: boolean; showPop?: boolean } = {}) {
  // Persisted notification subscriptions update the inbox. This event is kept
  // for existing inbox consumers, but never requests a floating banner.
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nexora-realtime-notification', {
      detail: { notification: notif, showPop: false }
    }));
  }
}

// Real engagement is recorded only from authenticated, persisted social actions.
export function triggerEngagementOnNewPost(_post: Post, _currentUser: User) {
  // Deliberately no-op: never fabricate sparks, comments, views, or follows.
}

// ============================================================================
// 6. PROFILE VIEW TRIGGER
// ============================================================================
// Profile visits are local browsing history only. Inbound views must come
// from authenticated server-side activity, never from a simulated actor.
export function recordProfileView(viewedUserId: string, currentUser: User) {
  if (!viewedUserId || viewedUserId === currentUser.id) return;
  try {
    const historyKey = 'nexora_recent_profile_views';
    const existing = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const updated = [
      { userId: viewedUserId, timestamp: Date.now() },
      ...existing.filter((view: { userId?: string }) => view.userId !== viewedUserId),
    ].slice(0, 30);
    localStorage.setItem(historyKey, JSON.stringify(updated));
  } catch {
    // Browsing history is best-effort and never blocks profile navigation.
  }
}

// Legacy test-trigger exports remain inert so they cannot pollute real inboxes.
export function triggerTestSparkPop(_post?: Post) {}
export function triggerTestCommentPop(_post?: Post) {}
export function triggerTestFollowPop() {}
export function triggerTestProfileViewPop(_currentUser?: User) {}
