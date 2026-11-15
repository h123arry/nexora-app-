import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { canReviewerResolveOriginDispute, isOriginReviewer } from './originCaseOperationsPolicy.js';
import { writeOriginAttributionCaseNotifications } from './originCaseNotifications.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const CASES = 'originAttributionCases';
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

function requireReviewer(request: { auth?: { uid: string; token: Record<string, unknown> } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to access the Origin review queue.');
  if (!isOriginReviewer(request.auth.token)) throw new HttpsError('permission-denied', 'Origin review access is restricted to authorized moderators.');
  return request.auth.uid;
}

export const getOriginAttributionDisputeQueue = onCall({ maxInstances: 5 }, async request => {
  requireReviewer(request);
  try {
    const snapshot = await db.collection(CASES).where('status', '==', 'disputed').limit(100).get();
    const ordered = snapshot.docs.sort((left, right) =>
      (right.get('disputedAt')?.toMillis?.() || 0) - (left.get('disputedAt')?.toMillis?.() || 0));
    return { cases: ordered.map(item => {
      const data = item.data();
      return {
        id: item.id,
        derivativeAssetId: data.derivativeAssetId,
        sourceAssetId: data.sourceAssetId,
        requesterUid: data.requesterUid,
        sourceCreatorUid: data.sourceCreatorUid,
        reason: data.reason,
        responseNote: data.responseNote || null,
        disputeReason: data.disputeReason || null,
        disputedAt: data.disputedAt?.toMillis?.() || null,
      };
    }) };
  } catch (error) {
    console.error('[NEXORA Origin] Dispute queue unavailable.', error);
    throw new HttpsError('unavailable', 'The Origin dispute queue is temporarily unavailable.');
  }
});

export const resolveOriginAttributionDispute = onCall({ maxInstances: 5 }, async request => {
  const reviewerUid = requireReviewer(request);
  const caseId = request.data?.caseId;
  const outcome = request.data?.outcome;
  const note = request.data?.note;
  if (typeof caseId !== 'string' || !SAFE_ID.test(caseId)) throw new HttpsError('invalid-argument', 'A valid attribution case is required.');
  if (typeof note !== 'string' || note.trim().length < 20 || note.trim().length > 1500) {
    throw new HttpsError('invalid-argument', 'A review explanation between 20 and 1,500 characters is required.');
  }
  const ref = db.collection(CASES).doc(caseId);
  try {
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists) throw new HttpsError('not-found', 'Attribution case not found.');
      if (reviewerUid === snapshot.get('requesterUid') || reviewerUid === snapshot.get('sourceCreatorUid')) {
        throw new HttpsError('permission-denied', 'A creator involved in this attribution case cannot review or decide their own dispute.');
      }
      if (!canReviewerResolveOriginDispute({
        status: snapshot.get('status'),
        outcome,
        reviewerUid,
        requesterUid: snapshot.get('requesterUid'),
        sourceCreatorUid: snapshot.get('sourceCreatorUid'),
      })) {
        throw new HttpsError('failed-precondition', 'Only an open dispute can receive a final review decision.');
      }
      tx.update(ref, {
        status: 'resolved',
        reviewOutcome: outcome,
        reviewNote: note.trim(),
        reviewedBy: reviewerUid,
        reviewedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.create(db.collection('originAttributionAuditEvents').doc(), {
        type: 'dispute_resolved', caseId, actorUid: reviewerUid, outcome,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return { resolved: true as const, status: 'resolved' as const, outcome };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error('[NEXORA Origin] Dispute resolution failed.', error);
    throw new HttpsError('internal', 'The Origin dispute decision could not be saved.');
  }
});

/** Delivers idempotent inbox notifications for each meaningful case-state transition. */
export const deliverOriginAttributionCaseNotifications = onDocumentWritten(
  { document: 'originAttributionCases/{caseId}', retry: true },
  async event => {
    const after = event.data?.after;
    if (!after?.exists) return;
    const before = event.data?.before;
    await writeOriginAttributionCaseNotifications(
      db,
      event.params.caseId,
      before?.exists ? before.get('status') : null,
      after.data() || {},
      event.time,
    );
  },
);
