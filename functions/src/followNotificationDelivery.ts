import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { buildFollowNotification } from './followNotificationPolicy.js';

/**
 * Converts a trusted follow-edge creation into the recipient's durable Activity
 * record. The event-derived document ID makes delivery idempotent across retries.
 */
export function createFollowInboxNotification(db: Firestore) {
  return onDocumentCreated(
    { document: 'follows/{followId}', retry: true },
    async event => {
      const edge = event.data?.data();
      const followerId = edge?.followerId;
      const followingId = edge?.followingId;
      if (typeof followerId !== 'string' || typeof followingId !== 'string'
        || !followerId || !followingId || followerId === followingId
        || followerId.includes('/') || followingId.includes('/')) return;

      const [publicProfile, privateProfile, recipientProfile] = await Promise.all([
        db.collection('publicProfiles').doc(followerId).get(),
        db.collection('users').doc(followerId).get(),
        db.collection('publicProfiles').doc(followingId).get(),
      ]);
      // Page follows share the same canonical edge collection but are not user inboxes.
      if (!recipientProfile.exists) return;
      const profile = publicProfile.exists ? publicProfile : privateProfile;
      const username = typeof profile.get('username') === 'string' ? profile.get('username') : 'nexora_member';
      const actorName = typeof profile.get('name') === 'string' ? profile.get('name') : username;
      const avatar = typeof profile.get('avatar') === 'string' ? profile.get('avatar') : '';
      const timestamp = typeof event.time === 'string' && Number.isFinite(Date.parse(event.time))
        ? new Date(event.time).toISOString()
        : new Date().toISOString();
      const notification = buildFollowNotification({
        eventId: event.id, followerId, followingId, username, actorName, avatar, timestamp,
      });
      if (!notification) return;

      const notificationRef = db.collection('users').doc(followingId)
        .collection('notifications').doc(notification.id);
      await db.runTransaction(async transaction => {
        const existing = await transaction.get(notificationRef);
        if (existing.exists) return;
        transaction.create(notificationRef, {
          ...notification,
          createdAt: FieldValue.serverTimestamp(),
        });
      });
    },
  );
}
