import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';

export interface PostLikeResult {
  liked: boolean;
  likes: number;
  changed: boolean;
}

export async function setPostLike(
  db: Firestore,
  uid: string,
  postId: string,
  desiredLiked: boolean,
): Promise<PostLikeResult> {
  if (!uid || typeof uid !== 'string') throw new Error('Authentication is required.');
  if (!postId || typeof postId !== 'string' || postId.length > 150 || postId.includes('/')) throw new Error('Invalid post ID.');
  if (typeof desiredLiked !== 'boolean') throw new Error('A desired like state is required.');

  const postRef = db.collection('posts').doc(postId);
  const likeRef = db.collection('users').doc(uid).collection('postLikes').doc(postId);
  return db.runTransaction(async (transaction) => {
    const [postSnapshot, likeSnapshot] = await Promise.all([
      transaction.get(postRef),
      transaction.get(likeRef),
    ]);
    if (!postSnapshot.exists || postSnapshot.get('audience') !== 'public') {
      throw new Error('This public post is unavailable.');
    }
    const currentlyLiked = likeSnapshot.exists;
    const authorId = String(postSnapshot.get('userId') || postSnapshot.get('authorId') || '');
    const notificationId = `like_${randomUUID()}`;
    const notificationRef = authorId && desiredLiked && authorId !== uid
      ? db.collection('notifications').doc(notificationId)
      : null;
    const actorProfileRef = authorId && desiredLiked && authorId !== uid
      ? db.collection('publicProfiles').doc(uid)
      : null;
    const actorProfileSnapshot = actorProfileRef ? await transaction.get(actorProfileRef) : null;
    const countValue = postSnapshot.get('likes');
    const count = Number.isSafeInteger(countValue) && countValue >= 0 ? countValue as number : 0;
    if (currentlyLiked === desiredLiked) return { liked: currentlyLiked, likes: count, changed: false };

    if (desiredLiked) {
      transaction.create(likeRef, {
        postId,
        userId: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      transaction.delete(likeRef);
    }
    const nextCount = Math.max(0, count + (desiredLiked ? 1 : -1));
    transaction.update(postRef, { likes: nextCount });
    if (notificationRef && authorId && actorProfileSnapshot) {
      const profile = actorProfileSnapshot.data() || {};
      transaction.create(notificationRef, {
        id: notificationId,
        type: 'like',
        userId: authorId,
        username: typeof profile.username === 'string' ? profile.username.slice(0, 80) : 'A Nexora member',
        avatar: typeof profile.avatar === 'string' ? profile.avatar.slice(0, 1000) : '',
        targetId: postId,
        content: 'liked your public post',
        timestamp: new Date().toISOString(),
        isRead: false,
      });
    }
    return { liked: desiredLiked, likes: nextCount, changed: true };
  });
}
