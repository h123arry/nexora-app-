import { randomUUID } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import {
  CREATOR_LENS_LIMIT,
  canReviewCreatorLens,
  canSubmitCreatorLens,
  creatorLensFilter,
  validateCreatorLensId,
  validateCreatorLensInput,
} from './creatorLensPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());

type Request = {
  auth?: { uid: string; token?: Record<string, unknown> } | null;
  data?: Record<string, unknown>;
};

function requireUid(request: Request): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to create and manage NEXORA lenses.');
  return request.auth.uid;
}

function requireReviewer(request: Request): string {
  const uid = requireUid(request);
  const token = request.auth?.token || {};
  const role = typeof token.role === 'string' ? token.role : '';
  if (token.moderator !== true && token.admin !== true && !['moderator', 'senior_moderator', 'admin', 'founder'].includes(role)) {
    throw new HttpsError('permission-denied', 'Lens moderation access is required.');
  }
  return uid;
}

function asLensSummary(snapshot: FirebaseFirestore.QueryDocumentSnapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    name: data.name,
    recipe: data.recipe,
    filter: data.filter,
    status: data.status,
    version: data.version,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null,
    reviewNote: data.reviewNote || '',
  };
}

export const saveCreatorLens = onCall({ maxInstances: 10 }, async request => {
  const uid = requireUid(request as Request);
  const data = request.data || {};
  let input;
  try { input = validateCreatorLensInput(data); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Invalid lens details.'); }

  const lensId = typeof data.lensId === 'string'
    ? (() => { try { return validateCreatorLensId(data.lensId); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Invalid lens reference.'); } })()
    : randomUUID();
  const ref = db.collection('creatorLenses').doc(lensId);
  const existing = await ref.get();
  if (existing.exists && existing.get('ownerId') !== uid) throw new HttpsError('permission-denied', 'You cannot edit another creator’s lens.');
  if (existing.exists && !['draft', 'rejected'].includes(String(existing.get('status')))) {
    throw new HttpsError('failed-precondition', 'A lens in review or already published cannot be edited.');
  }
  if (!existing.exists) {
    const count = await db.collection('creatorLenses').where('ownerId', '==', uid).count().get();
    if (count.data().count >= CREATOR_LENS_LIMIT) throw new HttpsError('resource-exhausted', 'You have reached the 50-lens creator limit.');
  }
  const version = Number(existing.get('version') || 0) + 1;
  await ref.set({
    id: lensId,
    ownerId: uid,
    name: input.name,
    recipe: input.recipe,
    filter: creatorLensFilter(input.recipe),
    status: 'draft',
    version,
    createdAt: existing.exists ? existing.get('createdAt') : FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    schemaVersion: 1,
  });
  return { lensId, saved: true, version, status: 'draft' };
});

export const submitCreatorLensForReview = onCall({ maxInstances: 10 }, async request => {
  const uid = requireUid(request as Request);
  let lensId: string;
  try { lensId = validateCreatorLensId(request.data?.lensId); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'A lens reference is required.'); }
  const ref = db.collection('creatorLenses').doc(lensId);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Creator lens not found.');
    if (snapshot.get('ownerId') !== uid) throw new HttpsError('permission-denied', 'You cannot submit another creator’s lens.');
    if (!canSubmitCreatorLens(snapshot.get('status'))) throw new HttpsError('failed-precondition', 'Only draft or rejected lenses can be submitted for review.');
    transaction.update(ref, { status: 'pending_review', submittedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), reviewNote: '' });
    const audit = db.collection('creatorLensAuditEvents').doc();
    transaction.create(audit, { lensId, ownerId: uid, event: 'submitted_for_review', version: snapshot.get('version'), createdAt: FieldValue.serverTimestamp() });
  });
  return { lensId, submitted: true, status: 'pending_review' };
});

export const reviewCreatorLens = onCall({ maxInstances: 10 }, async request => {
  const reviewerId = requireReviewer(request as Request);
  const data = request.data || {};
  let lensId: string;
  try { lensId = validateCreatorLensId(data.lensId); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'A lens reference is required.'); }
  if (!['approved', 'rejected'].includes(String(data.decision))) throw new HttpsError('invalid-argument', 'Choose approve or reject.');
  const reviewNote = typeof data.reviewNote === 'string' ? data.reviewNote.trim().slice(0, 1000) : '';
  const ref = db.collection('creatorLenses').doc(lensId);
  const approved = data.decision === 'approved';
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'Creator lens not found.');
    if (!canReviewCreatorLens(snapshot.get('status'))) throw new HttpsError('failed-precondition', 'Only pending lenses can be reviewed.');
    transaction.update(ref, {
      status: approved ? 'approved' : 'rejected',
      reviewNote,
      reviewedBy: reviewerId,
      reviewedAt: FieldValue.serverTimestamp(),
      publishedAt: approved ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    const audit = db.collection('creatorLensAuditEvents').doc();
    transaction.create(audit, {
      lensId, ownerId: snapshot.get('ownerId'), reviewerId,
      event: approved ? 'approved' : 'rejected',
      version: snapshot.get('version'), reviewNote,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  return { lensId, status: approved ? 'approved' : 'rejected' };
});

export const listMyCreatorLenses = onCall({ maxInstances: 10 }, async request => {
  const uid = requireUid(request as Request);
  const snapshot = await db.collection('creatorLenses').where('ownerId', '==', uid).orderBy('updatedAt', 'desc').limit(CREATOR_LENS_LIMIT).get();
  return { lenses: snapshot.docs.map(asLensSummary) };
});

export const listPublishedCreatorLenses = onCall({ maxInstances: 10 }, async () => {
  const snapshot = await db.collection('creatorLenses').where('status', '==', 'approved').orderBy('publishedAt', 'desc').limit(60).get();
  return { lenses: snapshot.docs.map(item => {
    const data = item.data();
    return { id: item.id, name: data.name, recipe: data.recipe, filter: data.filter, creatorId: data.ownerId, version: data.version, publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() || null };
  }) };
});
