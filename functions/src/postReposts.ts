import { createHash, randomUUID } from 'node:crypto';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';

export interface PostRepostResult {
  reposted: boolean;
  repostPostId: string;
  shares: number;
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 150 && !value.includes('/');
}

/** Create a durable, attributed repost and its private idempotency marker atomically. */
export async function createPublicPostRepost(
  db: Firestore,
  uid: string,
  postId: string,
  rawQuoteText?: string,
): Promise<PostRepostResult> {
  if (!uid || typeof uid !== 'string') throw new Error('Authentication is required.');
  if (!validId(postId)) throw new Error('Invalid post ID.');
  const quoteText = typeof rawQuoteText === 'string' ? rawQuoteText.trim() : '';
  if (quoteText.length > 500) throw new Error('Quote text cannot exceed 500 characters.');

  const sourceRef = db.collection('posts').doc(postId);
  const markerRef = db.collection('users').doc(uid).collection('postReposts').doc(postId);
  const actorRef = db.collection('publicProfiles').doc(uid);
  const repostId = `repost_${createHash('sha256').update(uid + ':' + postId).digest('hex').slice(0, 48)}`;
  const repostRef = db.collection('posts').doc(repostId);

  return db.runTransaction(async transaction => {
    const [source, marker, actor] = await Promise.all([
      transaction.get(sourceRef),
      transaction.get(markerRef),
      transaction.get(actorRef),
    ]);
    if (!source.exists || source.get('audience') !== 'public') {
      throw new Error('This public post is unavailable.');
    }
    const sourceData = source.data() || {};
    const currentShares = Number.isSafeInteger(sourceData.shares) && sourceData.shares >= 0 ? sourceData.shares : 0;
    if (marker.exists) {
      return {
        reposted: true,
        repostPostId: String(marker.get('repostPostId') || repostId),
        shares: currentShares,
      };
    }
    if (!actor.exists) throw new Error('Complete your public profile before reposting.');

    const profile = actor.data() || {};
    const originalPostId = validId(sourceData.sourcePostId) ? sourceData.sourcePostId : postId;
    const repost = {
      id: repostId,
      userId: uid,
      authorId: uid,
      username: String(profile.username || 'member').slice(0, 80),
      name: String(profile.name || profile.username || 'NEXORA member').slice(0, 100),
      avatar: typeof profile.avatar === 'string' ? profile.avatar.slice(0, 1000) : '',
      isVerified: profile.isVerified === true,
      content: quoteText || String(sourceData.sourcePostContent || sourceData.content || '').slice(0, 5000),
      quoteText: quoteText || undefined,
      isQuoteRepost: Boolean(quoteText),
      sourcePostContent: String(sourceData.sourcePostContent || sourceData.content || '').slice(0, 5000),
      sourceAuthorId: String(sourceData.sourceAuthorId || sourceData.userId || sourceData.authorId || ''),
      sourceAuthorUsername: String(sourceData.sourceAuthorUsername || sourceData.username || 'member').slice(0, 80),
      sourceAuthorName: String(sourceData.sourceAuthorName || sourceData.name || 'NEXORA member').slice(0, 100),
      sourceAuthorAvatar: String(sourceData.sourceAuthorAvatar || sourceData.avatar || '').slice(0, 1000),
      audience: 'public',
      tags: Array.isArray(sourceData.tags) ? sourceData.tags.filter((tag: unknown) => typeof tag === 'string').slice(0, 20) : [],
      likes: 0,
      commentsCount: 0,
      shares: 0,
      views: 0,
      saves: 0,
      comments: [],
      timestamp: new Date().toISOString(),
      isRepost: true,
      sourcePostId: originalPostId,
      repostedBy: uid,
      repostedAt: FieldValue.serverTimestamp(),
    } as Record<string, unknown>;

    for (const key of ['image', 'images', 'videoUrl', 'voiceAudioUrl', 'voiceTranscript', 'isVoice', 'voiceDuration', 'videoDuration', 'media', 'location']) {
      if (sourceData[key] !== undefined) repost[key] = sourceData[key];
    }
    transaction.create(repostRef, repost);
    transaction.create(markerRef, {
      postId,
      repostPostId: repostId,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.update(sourceRef, { shares: currentShares + 1 });

    const authorId = String(sourceData.userId || sourceData.authorId || '');
    if (authorId && authorId !== uid) {
      const notificationRef = db.collection('users').doc(authorId).collection('notifications').doc(`repost_${randomUUID()}`);
      transaction.create(notificationRef, {
        id: notificationRef.id,
        type: 'repost',
        userId: authorId,
        username: String(profile.username || 'A Nexora member').slice(0, 80),
        avatar: typeof profile.avatar === 'string' ? profile.avatar.slice(0, 1000) : '',
        targetId: postId,
        content: 'reposted your public post',
        timestamp: new Date().toISOString(),
        isRead: false,
      });
    }
    return { reposted: true, repostPostId: repostId, shares: currentShares + 1 };
  });
}
