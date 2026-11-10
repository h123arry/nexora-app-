import { randomUUID } from 'node:crypto';
import type { Firestore } from 'firebase-admin/firestore';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { isCircleMuteActive } from './communityGovernance.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 150 && !value.includes('/');

function activeRestriction(status: Record<string, unknown>, field: string, now: Date): boolean {
  if (status[field] !== true) return false;
  const expiresAt = (status.expiresAt as { toDate?: () => Date } | undefined)?.toDate?.();
  return !(expiresAt instanceof Date && expiresAt <= now);
}

export async function createCirclePostForUser(
  store: Firestore,
  uid: string,
  communityId: string,
  content: string,
  now = new Date(),
): Promise<{ postId: string; createdAt: string }> {
  const text = typeof content === 'string' ? content.trim() : '';
  if (!uid || !validId(communityId) || !text || text.length > 3000) {
    throw new HttpsError('invalid-argument', 'A Circle and post between 1 and 3,000 characters are required.');
  }
  const communityRef = store.collection('communities').doc(communityId);
  const memberRef = communityRef.collection('members').doc(uid);
  const profileRef = store.collection('publicProfiles').doc(uid);
  const statusRef = store.collection('accountStatus').doc(uid);
  const muteRef = communityRef.collection('mutes').doc(uid);
  const postRef = communityRef.collection('posts').doc(randomUUID());

  await store.runTransaction(async tx => {
    const [community, member, profile, accountStatus, mute] = await Promise.all([
      tx.get(communityRef), tx.get(memberRef), tx.get(profileRef), tx.get(statusRef), tx.get(muteRef),
    ]);
    if (!community.exists || !member.exists || member.get('status') !== 'active'
      || (Array.isArray(community.get('bannedUsers')) && (community.get('bannedUsers') as unknown[]).includes(uid))) {
      throw new HttpsError('permission-denied', 'Join this Circle to publish a post.');
    }
    if (isCircleMuteActive(mute.data(), now)) {
      throw new HttpsError('permission-denied', 'Your Circle posting access is temporarily muted.');
    }
    const restriction = accountStatus.data() || {};
    if (activeRestriction(restriction, 'postingRestricted', now)
      || activeRestriction(restriction, 'suspended', now)
      || activeRestriction(restriction, 'banned', now)) {
      throw new HttpsError('permission-denied', 'Your account cannot publish posts right now.');
    }
    const identity = profile.data() || {};
    tx.create(postRef, {
      id: postRef.id,
      communityId,
      authorId: uid,
      authorName: String(identity.name || identity.username || 'NEXORA member').slice(0, 80),
      authorUsername: String(identity.username || '').slice(0, 40),
      authorAvatar: typeof identity.avatar === 'string' ? identity.avatar.slice(0, 1200) : '',
      content: text,
      status: 'published',
      likesCount: 0,
      commentsCount: 0,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });
  });
  return { postId: postRef.id, createdAt: now.toISOString() };
}

export const createCommunityPost = onCall({ maxInstances: 10 }, async request => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to post in this Circle.');
  return createCirclePostForUser(db, request.auth.uid, request.data?.communityId, request.data?.content);
});
