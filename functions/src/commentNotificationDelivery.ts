import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { buildCommentNotification } from './commentNotificationPolicy.js';

/**
 * Converts newly appended public-post comments into durable inbox records.
 * Existing comment IDs are ignored, and event-derived IDs make retries idempotent.
 */
export function createPostCommentNotificationDelivery(db: Firestore) {
  return onDocumentUpdated(
    { document: 'posts/{postId}', retry: true },
    async event => {
      const before = event.data?.before.data() || {};
      const after = event.data?.after.data() || {};
      const postId = event.params.postId;
      const recipientId = typeof after.userId === 'string' ? after.userId
        : typeof after.authorId === 'string' ? after.authorId : '';
      if (!recipientId || recipientId.includes('/')) return;

      const previousIds = new Set(
        (Array.isArray(before.comments) ? before.comments : [])
          .map((comment: Record<string, unknown>) => comment?.id)
          .filter((id: unknown): id is string => typeof id === 'string'),
      );
      const addedComments = (Array.isArray(after.comments) ? after.comments : [])
        .filter((comment: Record<string, unknown>) => comment && typeof comment.id === 'string'
          && !previousIds.has(comment.id))
        .slice(0, 10);
      if (!addedComments.length) return;

      // Page-owned posts do not use a user Activity inbox.
      const recipientProfile = await db.collection('publicProfiles').doc(recipientId).get();
      if (!recipientProfile.exists) return;

      const timestamp = typeof event.time === 'string' && Number.isFinite(Date.parse(event.time))
        ? new Date(event.time).toISOString()
        : new Date().toISOString();

      for (const comment of addedComments) {
        const actorId = typeof comment.userId === 'string' ? comment.userId : '';
        const commentId = typeof comment.id === 'string' ? comment.id : '';
        if (!actorId || actorId === recipientId || actorId.includes('/')) continue;
        const actorProfile = await db.collection('publicProfiles').doc(actorId).get();
        const username = typeof actorProfile.get('username') === 'string' ? actorProfile.get('username') : 'nexora_member';
        const avatar = typeof actorProfile.get('avatar') === 'string' ? actorProfile.get('avatar') : '';
        const content = typeof comment.content === 'string' ? comment.content : '';
        const notification = buildCommentNotification({
          eventId: event.id, commentId, postId, actorId, recipientId,
          username, avatar, content, timestamp,
        });
        if (!notification) continue;

        const notificationRef = db.collection('users').doc(recipientId)
          .collection('notifications').doc(notification.id);
        await db.runTransaction(async transaction => {
          const existing = await transaction.get(notificationRef);
          if (existing.exists) return;
          transaction.create(notificationRef, {
            ...notification,
            createdAt: FieldValue.serverTimestamp(),
          });
        });
      }
    },
  );
}
