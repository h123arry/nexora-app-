import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { createHash, randomUUID } from 'node:crypto';

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
      ? db.collection('users').doc(authorId).collection('notifications').doc(notificationId)
      : null;
    const actorProfileRef = authorId && authorId !== uid
      ? db.collection('publicProfiles').doc(uid)
      : null;
    const recipientPublicRef = authorId && authorId !== uid
      ? db.collection('publicProfiles').doc(authorId)
      : null;
    const recipientPrivateRef = authorId && authorId !== uid
      ? db.collection('users').doc(authorId)
      : null;
    const sparkEventId = createHash('sha256').update(uid + ':' + postId).digest('hex').slice(0, 48);
    const sparkEventRef = authorId && authorId !== uid
      ? db.collection('users').doc(authorId).collection('sparkEvents').doc(sparkEventId)
      : null;
    const [actorProfileSnapshot, recipientPublicSnapshot, recipientPrivateSnapshot] = await Promise.all([
      actorProfileRef ? transaction.get(actorProfileRef) : Promise.resolve(null),
      recipientPublicRef ? transaction.get(recipientPublicRef) : Promise.resolve(null),
      recipientPrivateRef ? transaction.get(recipientPrivateRef) : Promise.resolve(null),
    ]);
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

    // A Spark is a durable relationship with the post author, not merely a
    // notification. Persist the event even when a best-effort public profile
    // projection has not finished provisioning yet.
    if (sparkEventRef && authorId) {
      const publicSparks = recipientPublicSnapshot?.exists ? recipientPublicSnapshot.get('sparks') : undefined;
      const privateSparks = recipientPrivateSnapshot?.exists ? recipientPrivateSnapshot.get('sparks') : undefined;
      const currentValue = publicSparks ?? privateSparks ?? 0;
      const currentReceived = Number.isSafeInteger(currentValue) && Number(currentValue) >= 0 ? Number(currentValue) : 0;
      const nextReceived = Math.max(0, currentReceived + (desiredLiked ? 1 : -1));
      if (recipientPublicSnapshot?.exists) {
        transaction.update(recipientPublicRef!, { sparks: nextReceived });
      } else {
        const privateProfile = recipientPrivateSnapshot?.data() || {};
        transaction.set(recipientPublicRef!, {
          id: authorId,
          username: typeof privateProfile.username === 'string' ? privateProfile.username : 'member',
          name: typeof privateProfile.name === 'string' ? privateProfile.name : 'NEXORA member',
          avatar: typeof privateProfile.avatar === 'string' ? privateProfile.avatar : '',
          followers: Number.isSafeInteger(privateProfile.followers) ? privateProfile.followers : 0,
          following: Number.isSafeInteger(privateProfile.following) ? privateProfile.following : 0,
          sparks: nextReceived,
        }, { merge: true });
      }
      if (recipientPrivateSnapshot?.exists) {
        transaction.update(recipientPrivateRef!, { sparks: nextReceived, updatedAt: FieldValue.serverTimestamp() });
      }
      if (desiredLiked) {
        const actor = actorProfileSnapshot?.data() || {};
        transaction.set(sparkEventRef, {
          id: sparkEventId,
          postId,
          creatorId: authorId,
          fromUserId: uid,
          username: typeof actor.username === 'string' ? actor.username.slice(0, 80) : 'member',
          name: typeof actor.name === 'string' ? actor.name.slice(0, 100) : 'NEXORA member',
          avatar: typeof actor.avatar === 'string' ? actor.avatar.slice(0, 1000) : '',
          createdAt: FieldValue.serverTimestamp(),
        });
      } else {
        transaction.delete(sparkEventRef);
      }
    }
    if (notificationRef && authorId && actorProfileSnapshot) {
      const profile = actorProfileSnapshot.data() || {};
      transaction.create(notificationRef, {
        id: notificationId,
        type: 'spark',
        userId: uid,
        username: typeof profile.username === 'string' ? profile.username.slice(0, 80) : 'A Nexora member',
        actorName: typeof profile.name === 'string' ? profile.name.slice(0, 100) : '',
        avatar: typeof profile.avatar === 'string' ? profile.avatar.slice(0, 1000) : '',
        targetId: postId,
        content: 'sparked your post.',
        timestamp: new Date().toISOString(),
        isRead: false,
      });
    }
    return { liked: desiredLiked, likes: nextCount, changed: true };
  });
}
