import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { buildRemixLineageRecord } from './originLineagePolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

export const recordMyRemixLineage = onCall({ maxInstances: 20 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to record a remix.');
  const derivativeAssetId = request.data?.derivativeAssetId;
  const parentAssetIds = request.data?.parentAssetIds;
  if (typeof derivativeAssetId !== 'string' || !SAFE_ID.test(derivativeAssetId)
    || !Array.isArray(parentAssetIds) || parentAssetIds.length < 1 || parentAssetIds.length > 5
    || parentAssetIds.some((id: unknown) => typeof id !== 'string' || !SAFE_ID.test(id))) {
    throw new HttpsError('invalid-argument', 'Choose a valid derivative and one to five source assets.');
  }

  const derivativeAssetRef = db.collection('mediaAssets').doc(derivativeAssetId);
  const derivativeOriginRef = db.collection('mediaOrigins').doc(derivativeAssetId);
  const eventRef = derivativeOriginRef.collection('events').doc(`derivative_${derivativeAssetId}`);
  const parentRefs = parentAssetIds.map((id: string) => db.collection('mediaOrigins').doc(id));

  try {
    return await db.runTransaction(async transaction => {
      const [assetSnapshot, derivativeSnapshot, eventSnapshot, ...parentSnapshots] = await Promise.all([
        transaction.get(derivativeAssetRef),
        transaction.get(derivativeOriginRef),
        transaction.get(eventRef),
        ...parentRefs.map(ref => transaction.get(ref)),
      ]);
      const asset = assetSnapshot.data();
      const derivative = derivativeSnapshot.data();
      if (!assetSnapshot.exists || asset?.ownerId !== uid || !derivativeSnapshot.exists || derivative?.ownerUid !== uid) {
        throw new HttpsError('permission-denied', 'Only your uploaded derivative can receive remix lineage.');
      }
      if (asset.status !== 'uploaded' && asset.status !== 'ready') {
        throw new HttpsError('failed-precondition', 'The derivative must finish upload processing before lineage is recorded.');
      }
      if (eventSnapshot.exists) {
        const prior = eventSnapshot.data();
        if (Array.isArray(prior?.parentAssetIds)
          && prior.parentAssetIds.length === parentAssetIds.length
          && prior.parentAssetIds.every((id: string, index: number) => id === parentAssetIds[index])) {
          return { recorded: true as const, alreadyRecorded: true as const };
        }
        throw new HttpsError('already-exists', 'Conflicting remix lineage is already recorded for this derivative.');
      }

      const parents = parentSnapshots.map(snapshot => snapshot.data());
      if (parentSnapshots.some((snapshot, index) => !snapshot.exists || parents[index]?.ownerUid !== uid)) {
        throw new HttpsError('permission-denied', 'Only source assets owned by your account can be linked at this stage.');
      }
      const record = buildRemixLineageRecord({
        derivativeAssetId,
        ownerUid: uid,
        parentAssetIds,
        parentLineageAncestors: parents.map(parent => Array.isArray(parent?.lineageAncestors) ? parent.lineageAncestors : []),
        parentLineageDepths: parents.map(parent => Number.isInteger(parent?.lineageDepth) ? parent.lineageDepth : 0),
      });
      transaction.update(derivativeOriginRef, {
        parentAssetIds: record.parentAssetIds,
        lineageAncestors: record.lineageAncestors,
        lineageDepth: record.lineageDepth,
        lineageState: record.lineageState,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(eventRef, {
        ...record.event,
        createdAt: FieldValue.serverTimestamp(),
      });
      return { recorded: true as const, alreadyRecorded: false as const };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error instanceof Error && /lineage|source asset|source lineage|remix/i.test(error.message)) {
      throw new HttpsError('failed-precondition', error.message);
    }
    console.error('[NEXORA Origin] Unable to record remix lineage.', error);
    throw new HttpsError('internal', 'Remix lineage could not be recorded. Please try again.');
  }
});
