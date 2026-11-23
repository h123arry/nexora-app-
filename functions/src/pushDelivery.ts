import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import type { Firestore } from 'firebase-admin/firestore';
import type { App } from 'firebase-admin/app';

export interface NotificationRecord {
  type?: string;
  content?: string;
  username?: string;
  actorName?: string;
  userId?: string;
  targetId?: string;
  isRead?: boolean;
}

export function buildNotificationPushData(
  notification: NotificationRecord,
  notificationId: string,
): Record<string, string> {
  const type = typeof notification.type === 'string' ? notification.type.slice(0, 40) : 'system';
  const targetId = typeof notification.targetId === 'string' ? notification.targetId.slice(0, 160) : '';
  const username = typeof notification.username === 'string' ? notification.username.replace(/^@+/, '').slice(0, 40) : '';
  const actorName = typeof notification.actorName === 'string' ? notification.actorName.slice(0, 80) : '';
  const userId = typeof notification.userId === 'string' ? notification.userId.slice(0, 128) : '';
  const params = new URLSearchParams({ nxPushType: type, nxPushNotification: notificationId });
  if (targetId) params.set('nxPushTarget', targetId);
  if (userId) params.set('nxPushUser', userId);
  const destination = type === 'message' || type === 'chat'
    ? '/#inbox'
    : type === 'follow' || type === 'profile_view'
      ? '/#profile'
      : type === 'pulse_alert'
        ? '/#live'
        : '/#activity';
  return {
    type,
    targetId,
    notificationId,
    username,
    actorName,
    userId,
    url: `/?${params.toString()}${destination.slice(1)}`,
  };
}

export type NotificationPreferenceKey =
  | 'likes' | 'comments' | 'followers' | 'reposts' | 'mentions'
  | 'communities' | 'events' | 'verification' | 'creatorUploads'
  | 'friendRequests' | 'securityAlerts';

/** Resolve an inbox event to the user's matching push preference. Unknown
 * notification types remain deliverable rather than being silently dropped. */
export function notificationPreferenceKey(type: string): NotificationPreferenceKey | null {
  if (type === 'spark' || type === 'like') return 'likes';
  if (type === 'comment' || type === 'comment_reply' || type === 'reply') return 'comments';
  if (type === 'follow' || type === 'profile_view') return 'followers';
  if (type === 'repost') return 'reposts';
  if (type === 'mention') return 'mentions';
  if (type === 'event' || type.startsWith('event_') || type === 'community_event') return 'events';
  if (type.startsWith('community_') || type === 'community') return 'communities';
  if (type === 'verification' || type.startsWith('verification_') || type === 'identity_verification') return 'verification';
  if (type === 'creator_upload' || type === 'creator_uploads') return 'creatorUploads';
  if (type === 'friend_request' || type === 'friend_request_received') return 'friendRequests';
  if (type === 'security' || type === 'security_alert' || type.startsWith('security_') || type === 'account_security') return 'securityAlerts';
  return null;
}

export function shouldSendNotificationPush(preferences: unknown, type: string): boolean {
  if (!preferences || typeof preferences !== 'object') return true;
  const settings = preferences as Record<string, unknown>;
  if (settings.push === false) return false;
  const key = notificationPreferenceKey(type);
  return !key || settings[key] !== false;
}

export function chunkPushTokens(tokens: string[], size = 500): string[][] {
  if (!Number.isInteger(size) || size < 1 || size > 500) throw new Error('Push token batch size must be between 1 and 500.');
  const chunks: string[][] = [];
  for (let index = 0; index < tokens.length; index += size) chunks.push(tokens.slice(index, index + size));
  return chunks;
}

function notificationTitle(type: string): string {
  if (type === 'message') return 'New message on NEXORA';
  if (type === 'follow') return 'You have a new follower';
  if (type === 'comment') return 'New comment on NEXORA';
  if (type === 'comment_reply') return 'Someone replied to your comment';
  if (type === 'repost') return 'Someone reposted your post';
  if (type === 'mention') return 'You were mentioned on NEXORA';
  if (type === 'pulse_alert') return 'Someone you follow is live on NEXORA';
  if (type === 'spark' || type === 'like') return 'Someone engaged with your post';
  return 'NEXORA notification';
}

/** Sends newly-created trusted inbox notifications to the account's registered web devices. */
export function createNotificationPushDelivery(db: Firestore, app: App) {
  return onDocumentCreated(
    { document: 'users/{userId}/notifications/{notificationId}', retry: true },
    async (event) => {
      const snapshot = event.data;
      const userId = event.params.userId;
      if (!snapshot || !userId) return;
      const notification = snapshot.data() as NotificationRecord;
      if (notification.isRead === true) return;

      const [tokensSnapshot, preferencesSnapshot] = await Promise.all([
        db.collection('users').doc(userId).collection('pushTokens').get(),
        db.collection('users').doc(userId).collection('settings').doc('preferences').get(),
      ]);
      if (tokensSnapshot.empty) return;

      const preferences = preferencesSnapshot.data()?.notifications;
      const type = typeof notification.type === 'string' ? notification.type : 'system';
      if (!shouldSendNotificationPush(preferences, type)) return;

      const tokenDocs = tokensSnapshot.docs.filter((tokenDoc) => {
        const value = tokenDoc.data().token;
        return typeof value === 'string' && value.length >= 20 && value.length <= 4096;
      });
      const tokenValues = tokenDocs.map((tokenDoc) => tokenDoc.data().token as string);
      if (!tokenValues.length) return;

      const detail = typeof notification.content === 'string' ? notification.content.slice(0, 300) : 'You have a new update.';
      const username = typeof notification.username === 'string' ? notification.username.replace(/^@+/, '').slice(0, 40) : '';
      const title = username ? `@${username}` : notificationTitle(type);
      const data = buildNotificationPushData(notification, snapshot.id);
      const messaging = getMessaging(app);

      for (const tokenChunk of chunkPushTokens(tokenValues)) {
        const response = await messaging.sendEachForMulticast({
          tokens: tokenChunk,
          // Data-only messages are rendered by NEXORA's root service worker,
          // giving every alert one predictable click/deep-link handler.
          data: { ...data, title, body: detail },
        });
        const staleTokenIds: string[] = [];
        response.responses.forEach((result, index) => {
          if (!result.success && (
            result.error?.code === 'messaging/registration-token-not-registered'
            || result.error?.code === 'messaging/invalid-registration-token'
          )) {
            const tokenDoc = tokenDocs.find((candidate) => candidate.data().token === tokenChunk[index]);
            if (tokenDoc) staleTokenIds.push(tokenDoc.id);
          }
        });
        if (staleTokenIds.length) {
          const batch = db.batch();
          staleTokenIds.forEach((tokenId) => batch.delete(db.collection('users').doc(userId).collection('pushTokens').doc(tokenId)));
          await batch.commit();
        }
      }
    },
  );
}
