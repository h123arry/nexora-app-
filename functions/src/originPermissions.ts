import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { buildRemixPermissionEvent, normalizeOriginRemixPolicy, type OriginRemixPolicy } from './originPermissionPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());

export const setMyOriginRemixPolicy = onCall({ maxInstances: 20 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to manage remix permissions.');
  const assetId = request.data?.assetId;
  const requestedPolicy = request.data?.policy;
  if (typeof assetId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(assetId)
    || !['closed', 'allow_with_attribution'].includes(requestedPolicy)) {
    throw new HttpsError('invalid-argument', 'Choose a valid asset and remix permission.');
  }

  const assetRef = db.collection('mediaAssets').doc(assetId);
  const originRef = db.collection('mediaOrigins').doc(assetId);
  const eventRef = originRef.collection('events').doc();
  const nextPolicy = requestedPolicy as OriginRemixPolicy;

  try {
    return await db.runTransaction(async transaction => {
      const [assetSnapshot, originSnapshot] = await Promise.all([
        transaction.get(assetRef),
        transaction.get(originRef),
      ]);
      if (!assetSnapshot.exists || assetSnapshot.data()?.ownerId !== uid
        || !originSnapshot.exists || originSnapshot.data()?.ownerUid !== uid) {
        throw new HttpsError('permission-denied', 'Only the account that uploaded this asset can change its remix permissions.');
      }
      const previousPolicy = normalizeOriginRemixPolicy(originSnapshot.data()?.remixPolicy);
      if (previousPolicy === nextPolicy) return { updated: true as const, unchanged: true as const, policy: nextPolicy };

      const event = buildRemixPermissionEvent({
        assetId,
        actorUid: uid,
        previousPolicy,
        nextPolicy,
        eventId: eventRef.id,
      });
      transaction.update(originRef, {
        remixPolicy: nextPolicy,
        remixPolicyUpdatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(eventRef, {
        ...event,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { updated: true as const, unchanged: false as const, policy: nextPolicy };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[NEXORA Origin] Unable to update remix permission.', error);
    throw new HttpsError('internal', 'Remix permissions could not be updated. Please retry.');
  }
});
