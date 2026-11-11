import type { Firestore } from 'firebase-admin/firestore';
import { buildCommentNotification } from './commentNotificationPolicy.js';

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 150 && !value.includes('/');
}

export interface PublicPostComment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  name: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
}

export async function addPublicPostComment(
  db: Firestore,
  uid: string,
  postId: string,
  rawContent: string,
  commentId: string,
): Promise<{ comment: PublicPostComment; created: boolean; commentsCount: number }> {
  if (!validId(uid)) throw new Error('Authentication is required.');
  if (!validId(postId) || !validId(commentId)) throw new Error('A valid post and comment ID are required.');
  const content = typeof rawContent === 'string' ? rawContent.trim() : '';
  if (!content || content.length > 500) throw new Error('Comments must be between 1 and 500 characters.');

  const postRef = db.collection('posts').doc(postId);
  const actorRef = db.collection('publicProfiles').doc(uid);
  const timestamp = new Date().toISOString();

  return db.runTransaction(async transaction => {
    const post = await transaction.get(postRef);
    if (!post.exists || post.get('audience') !== 'public') throw new Error('This public post is unavailable.');
    if (post.get('commentsDisabled') === true) throw new Error('Comments are disabled for this post.');

    const comments = Array.isArray(post.get('comments')) ? [...post.get('comments')] : [];
    const existing = comments.find((comment: any) => comment?.id === commentId);
    const currentCountValue = post.get('commentsCount');
    const currentCount = Number.isSafeInteger(currentCountValue) && currentCountValue >= 0
      ? currentCountValue as number : comments.length;
    if (existing) {
      if (existing.userId !== uid) throw new Error('This comment ID is already in use.');
      return { comment: existing as PublicPostComment, created: false, commentsCount: currentCount };
    }
    if (comments.length >= 1000) throw new Error('This post has reached its comment limit.');

    const actor = await transaction.get(actorRef);
    if (!actor.exists) throw new Error('Complete your public profile before commenting.');
    const profile = actor.data() || {};
    const comment: PublicPostComment = {
      id: commentId,
      postId,
      userId: uid,
      username: String(profile.username || 'member').slice(0, 80),
      name: String(profile.name || profile.username || 'NEXORA member').slice(0, 100),
      avatar: typeof profile.avatar === 'string' ? profile.avatar.slice(0, 1000) : '',
      content,
      timestamp,
      likes: 0,
    };

    const authorId = String(post.get('userId') || post.get('authorId') || '');
    const recipientProfileRef = authorId && authorId !== uid
      ? db.collection('publicProfiles').doc(authorId) : null;
    const recipientProfile = recipientProfileRef ? await transaction.get(recipientProfileRef) : null;
    const nextCount = currentCount + 1;
    transaction.update(postRef, { comments: [...comments, comment], commentsCount: nextCount });

    if (recipientProfile?.exists && authorId && authorId !== uid) {
      const notification = buildCommentNotification({
        eventId: `${postId}:${commentId}`, commentId, postId, actorId: uid, recipientId: authorId,
        username: comment.username, avatar: comment.avatar, content, timestamp,
      });
      if (notification) {
        const notificationRef = db.collection('users').doc(authorId)
          .collection('notifications').doc(notification.id);
        transaction.create(notificationRef, notification);
      }
    }
    return { comment, created: true, commentsCount: nextCount };
  });
}
