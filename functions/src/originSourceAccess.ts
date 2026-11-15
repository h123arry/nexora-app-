import type { Firestore, QueryDocumentSnapshot, Transaction } from 'firebase-admin/firestore';
import { assertOriginSourceAccess, type OriginSourceAccountSettings } from './originSourceAccessPolicy.js';
/** Resolve one canonical public source post and evaluate server-owned account settings. */
export async function assertCrossAccountOriginSourceAccess(
  db: Firestore, transaction: Transaction,
  input: { derivativeOwnerUid: string; sourceOwnerUid: string; sourceAssetId: string },
): Promise<void> {
  const { derivativeOwnerUid, sourceOwnerUid, sourceAssetId } = input;
  const derivativeSettingsRef = db.collection('users').doc(derivativeOwnerUid).collection('settings').doc('preferences');
  const sourceSettingsRef = db.collection('users').doc(sourceOwnerUid).collection('settings').doc('preferences');
  const sourcePostsQuery = db.collection('posts').where('mediaAssetId', '==', sourceAssetId).limit(2);
  const sourcePostsArrayQuery = db.collection('posts').where('mediaAssetIds', 'array-contains', sourceAssetId).limit(2);
  const [derivativeSettingsSnap, sourceSettingsSnap, sourcePostsSnap, sourcePostsArraySnap] = await Promise.all([
    transaction.get(derivativeSettingsRef), transaction.get(sourceSettingsRef),
    transaction.get(sourcePostsQuery), transaction.get(sourcePostsArrayQuery),
  ]);
  const matchingPosts = new Map<string, QueryDocumentSnapshot>();
  for (const post of [...sourcePostsSnap.docs, ...sourcePostsArraySnap.docs]) matchingPosts.set(post.id, post);
  if (matchingPosts.size !== 1)
    throw new Error('A unique published source post could not be verified for this media asset.');
  const sourcePost = [...matchingPosts.values()][0].data();
  assertOriginSourceAccess({
    derivativeOwnerUid, sourceOwnerUid,
    derivativeSettings: derivativeSettingsSnap.exists ? derivativeSettingsSnap.data() as OriginSourceAccountSettings : null,
    sourceSettings: sourceSettingsSnap.exists ? sourceSettingsSnap.data() as OriginSourceAccountSettings : null,
    sourcePost,
  });
  if (sourcePost.userId !== sourceOwnerUid && sourcePost.authorId !== sourceOwnerUid)
    throw new Error('The source post owner does not match the verified media creator.');
}
