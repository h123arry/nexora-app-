import { createHash, randomUUID } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

export interface CommentLikeResult {
  liked: boolean;
  likes: number;
  changed: boolean;
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 150 && !value.includes('/');
}

export async function setPublicPostCommentLike(
  db: Firestore, uid: string, postId: string, commentId: string, desiredLiked: boolean,
): Promise<CommentLikeResult> {
  if (!uid) throw new Error('Authentication is required.');
  if (!validId(postId) || !validId(commentId)) throw new Error('A valid post and comment are required.');
  if (typeof desiredLiked !== 'boolean') throw new Error('A desired reaction state is required.');

  const postRef = db.collection('posts').doc(postId);
  const markerId = createHash('sha256').update(`${postId}:${commentId}`).digest('hex');
  const markerRef = db.collection('users').doc(uid).collection('commentLikes').doc(markerId);

  return db.runTransaction(async transaction => {
    const [post, marker] = await Promise.all([transaction.get(postRef), transaction.get(markerRef)]);
    if (!post.exists || post.get('audience') !== 'public') throw new Error('This public post is unavailable.');
    const comments = Array.isArray(post.get('comments')) ? [...post.get('comments')] : [];
    const index = comments.findIndex((comment: any) => comment?.id === commentId);
    if (index < 0) throw new Error('This comment is no longer available.');
    const comment = comments[index] as Record<string, any>;
    const likes = Number.isSafeInteger(comment.likes) && comment.likes >= 0 ? comment.likes : 0;
    if (marker.exists === desiredLiked) return { liked: desiredLiked, likes, changed: false };

    const authorId = String(comment.userId || '');
    const actorSnapshot = desiredLiked && authorId && authorId !== uid
      ? await transaction.get(db.collection('publicProfiles').doc(uid))
      : null;
    const nextLikes = Math.max(0, likes + (desiredLiked ? 1 : -1));
    comments[index] = { ...comment, likes: nextLikes };
    if (desiredLiked) {
      transaction.create(markerRef, { postId, commentId, createdAt: FieldValue.serverTimestamp() });
    } else {
      transaction.delete(markerRef);
    }
    transaction.update(postRef, { comments, commentReactionsUpdatedAt: FieldValue.serverTimestamp() });

    if (actorSnapshot?.exists) {
      const profile = actorSnapshot.data() || {};
      const notificationRef = db.collection('users').doc(authorId).collection('notifications').doc(`comment_like_${randomUUID()}`);
      transaction.create(notificationRef, {
        id: notificationRef.id,
        type: 'comment_like',
        userId: authorId,
        username: String(profile.username || 'A Nexora member').slice(0, 80),
        avatar: typeof profile.avatar === 'string' ? profile.avatar.slice(0, 1000) : '',
        targetId: postId,
        content: 'liked your comment',
        timestamp: new Date().toISOString(),
        isRead: false,
      });
    }
    return { liked: desiredLiked, likes: nextLikes, changed: true };
  });
}
