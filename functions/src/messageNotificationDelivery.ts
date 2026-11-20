import type { Firestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';

export function buildDirectMessageNotification(input: {
  messageId: string;
  chatId: string;
  senderId: string;
  username: string;
  actorName: string;
  avatar: string;
  preview: string;
  timestamp: string;
}) {
  return {
    id: `message_${input.messageId}`,
    type: 'message' as const,
    category: 'messages',
    userId: input.senderId,
    username: input.username,
    actorName: input.actorName,
    avatar: input.avatar,
    targetId: input.chatId,
    content: input.preview,
    timestamp: input.timestamp,
    isRead: false,
    priority: 3,
    actionText: 'Open conversation',
    actionType: 'open_chat',
  };
}

function messagePreview(message: Record<string, unknown>): string {
  const content = typeof message.content === 'string' ? message.content.trim() : '';
  if (content) return content.slice(0, 180);
  const mediaType = String(message.customMediaType || message.mediaType || '').toLowerCase();
  if (mediaType === 'image') return 'Sent you a photo';
  if (mediaType === 'video') return 'Sent you a video';
  if (mediaType === 'audio' || mediaType === 'voice') return 'Sent you a voice message';
  if (mediaType === 'document') return 'Sent you a document';
  return 'Sent you a message';
}

export function createDirectMessageNotificationDelivery(db: Firestore) {
  return onDocumentCreated(
    { document: 'chats/{chatId}/messages/{messageId}', retry: true },
    async event => {
      const message = event.data?.data() as Record<string, unknown> | undefined;
      const chatId = event.params.chatId;
      const messageId = event.params.messageId;
      const senderId = message?.senderId;
      if (!message || typeof senderId !== 'string' || !senderId || !chatId || !messageId) return;

      const chatSnapshot = await db.collection('chats').doc(chatId).get();
      const participants = chatSnapshot.data()?.participants;
      if (!chatSnapshot.exists || !Array.isArray(participants)) return;
      const recipients = [...new Set(participants.filter((id): id is string =>
        typeof id === 'string' && id.length > 0 && id !== senderId && !id.includes('/')))];
      if (!recipients.length) return;

      const [publicProfile, privateProfile] = await Promise.all([
        db.collection('publicProfiles').doc(senderId).get(),
        db.collection('users').doc(senderId).get(),
      ]);
      const profile = publicProfile.exists ? publicProfile.data() : privateProfile.data();
      const username = String(profile?.username || 'nexora_member').replace(/^@+/, '').slice(0, 40);
      const actorName = String(profile?.name || username).slice(0, 100);
      const avatar = typeof profile?.avatar === 'string' ? profile.avatar.slice(0, 1000) : '';
      const timestamp = typeof message.timestamp === 'string' && Number.isFinite(Date.parse(message.timestamp))
        ? new Date(message.timestamp).toISOString()
        : typeof event.time === 'string' && Number.isFinite(Date.parse(event.time))
          ? new Date(event.time).toISOString()
          : new Date().toISOString();
      const preview = messagePreview(message);

      const refs = recipients.map(recipientId =>
        db.collection('users').doc(recipientId).collection('notifications').doc(`message_${messageId}`));
      const existing = await db.getAll(...refs);
      const batch = db.batch();
      let writes = 0;
      existing.forEach(snapshot => {
        if (snapshot.exists) return;
        batch.set(snapshot.ref, buildDirectMessageNotification({
          messageId, chatId, senderId, username, actorName, avatar, preview, timestamp,
        }));
        writes++;
      });
      if (writes) await batch.commit();
    },
  );
}
