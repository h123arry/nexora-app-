import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import type { Firestore } from 'firebase-admin/firestore';
import type { App } from 'firebase-admin/app';

export interface NotificationRecord {
  type?: string;
  content?: string;
  targetId?: string;
  isRead?: boolean;
}

export function buildNotificationPushData(
  notification: NotificationRecord,
  notificationId: string,
): Record<string, string> {
  const type = typeof notification.type === 'string' ? notification.type.slice(0, 40) : 'system';
  const targetId = typeof notification.targetId === 'string' ? notification.targetId.slice(0, 160) : '';
  return {
    type,
    targetId,
    notificationId,
    url: type === 'message' && targetId ? `/inbox?chatId=${encodeURIComponent(targetId)}` : '/pulse',
  };
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
      if (preferences && typeof preferences === 'object' && (preferences as Record<string, unknown>).push === false) return;

      const tokenDocs = tokensSnapshot.docs.filter((tokenDoc) => {
        const value = tokenDoc.data().token;
        return typeof value === 'string' && value.length >= 20 && value.length <= 4096;
      });
      const tokenValues = tokenDocs.map((tokenDoc) => tokenDoc.data().token as string);
      if (!tokenValues.length) return;

      const type = typeof notification.type === 'string' ? notification.type : 'system';
      const body = typeof notification.content === 'string' ? notification.content.slice(0, 300) : 'You have a new update.';
      const data = buildNotificationPushData(notification, snapshot.id);
      const messaging = getMessaging(app);

      for (const tokenChunk of chunkPushTokens(tokenValues)) {
        const response = await messaging.sendEachForMulticast({
          tokens: tokenChunk,
          notification: { title: notificationTitle(type), body },
          data,
          webpush: {
            fcmOptions: { link: data.url },
            notification: { icon: '/logo.png', badge: '/favicon.ico' },
          },
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
