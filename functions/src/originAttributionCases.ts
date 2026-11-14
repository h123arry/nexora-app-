import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;
const CASES = 'originAttributionCases';

function boundedText(value: unknown, min: number, max: number): string {
  if (typeof value !== 'string') throw new HttpsError('invalid-argument', 'A written explanation is required.');
  const clean = value.trim();
  if (clean.length < min || clean.length > max) throw new HttpsError('invalid-argument', `Text must be between ${min} and ${max} characters.`);
  return clean;
}

/** Private, auditable correction request tied to an immutable lineage event. */
export const requestMyOriginAttributionCorrection = onCall({ maxInstances: 10 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to request an attribution correction.');
  const derivativeAssetId = request.data?.derivativeAssetId;
  const sourceAssetId = request.data?.sourceAssetId;
  if (typeof derivativeAssetId !== 'string' || !SAFE_ID.test(derivativeAssetId)
    || typeof sourceAssetId !== 'string' || !SAFE_ID.test(sourceAssetId)) {
    throw new HttpsError('invalid-argument', 'Choose a valid derivative and source asset.');
  }
  const reason = boundedText(request.data?.reason, 20, 1500);
  const derivativeRef = db.collection('mediaOrigins').doc(derivativeAssetId);
  const eventRef = derivativeRef.collection('events').doc(`derivative_${derivativeAssetId}`);
  const caseRef = db.collection(CASES).doc();
  try {
    await db.runTransaction(async tx => {
      const [derivative, event] = await Promise.all([tx.get(derivativeRef), tx.get(eventRef)]);
      if (!derivative.exists || derivative.get('ownerUid') !== uid || !event.exists) {
        throw new HttpsError('permission-denied', 'Only the derivative creator can request a correction to its recorded lineage.');
      }
      const attribution = event.get('parentAttribution');
      if (!Array.isArray(attribution)) throw new HttpsError('failed-precondition', 'The source attribution record is unavailable.');
      const source = attribution.find((entry: any) => entry?.sourceAssetId === sourceAssetId);
      if (!source || typeof source.creatorUid !== 'string' || !SAFE_ID.test(source.creatorUid)) {
        throw new HttpsError('not-found', 'That source is not part of this remix attribution.');
      }
      tx.create(caseRef, {
        id: caseRef.id,
        derivativeAssetId,
        sourceAssetId,
        derivativeOwnerUid: uid,
        sourceCreatorUid: source.creatorUid,
        requesterUid: uid,
        reason,
        status: 'open',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return { submitted: true as const, caseId: caseRef.id, status: 'open' as const };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[NEXORA Origin] Attribution correction request failed.', error);
    throw new HttpsError('internal', 'Your attribution correction could not be submitted.');
  }
});

/** Source creator may accept/reject; the decision never silently rewrites lineage history. */
export const respondToOriginAttributionCorrection = onCall({ maxInstances: 10 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to respond to an attribution correction.');
  const caseId = request.data?.caseId;
  const decision = request.data?.decision;
  if (typeof caseId !== 'string' || !SAFE_ID.test(caseId) || !['accepted', 'rejected'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'Choose a valid case and decision.');
  }
  const note = boundedText(request.data?.note, 10, 1000);
  const caseRef = db.collection(CASES).doc(caseId);
  try {
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(caseRef);
      if (!snapshot.exists || snapshot.get('sourceCreatorUid') !== uid) {
        throw new HttpsError('permission-denied', 'Only the attributed source creator can respond to this request.');
      }
      if (snapshot.get('status') !== 'open') throw new HttpsError('failed-precondition', 'This correction request is no longer open.');
      tx.update(caseRef, {
        status: decision,
        responseNote: note,
        respondedBy: uid,
        respondedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return { updated: true as const, status: decision };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[NEXORA Origin] Attribution correction response failed.', error);
    throw new HttpsError('internal', 'The correction response could not be saved.');
  }
});

/** Requester may escalate a rejected or accepted correction into a documented dispute. */
export const disputeOriginAttributionCorrection = onCall({ maxInstances: 10 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to dispute an attribution decision.');
  const caseId = request.data?.caseId;
  if (typeof caseId !== 'string' || !SAFE_ID.test(caseId)) throw new HttpsError('invalid-argument', 'Choose a valid correction case.');
  const reason = boundedText(request.data?.reason, 20, 1500);
  const caseRef = db.collection(CASES).doc(caseId);
  try {
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(caseRef);
      if (!snapshot.exists || snapshot.get('requesterUid') !== uid) {
        throw new HttpsError('permission-denied', 'Only the original requester can dispute this decision.');
      }
      if (!['accepted', 'rejected'].includes(snapshot.get('status'))) {
        throw new HttpsError('failed-precondition', 'Only a decided correction can be disputed.');
      }
      tx.update(caseRef, {
        status: 'disputed',
        disputeReason: reason,
        disputedBy: uid,
        disputedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return { disputed: true as const, status: 'disputed' as const };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[NEXORA Origin] Attribution dispute failed.', error);
    throw new HttpsError('internal', 'The attribution dispute could not be submitted.');
  }
});
