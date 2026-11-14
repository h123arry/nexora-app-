import { randomUUID } from 'node:crypto';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { onDocumentDeleted } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_PINNED_MOMENTS = 3;

export const toggleWorldWeaveMomentPin = onCall({ maxInstances: 15 }, async request => {
  const actorUid = request.auth?.uid;
  if (!actorUid) throw new HttpsError('unauthenticated', 'Sign in to curate this WorldWeave.');
  const { weaveId, momentId } = request.data || {};
  if (typeof weaveId !== 'string' || !ID_PATTERN.test(weaveId)
    || typeof momentId !== 'string' || !ID_PATTERN.test(momentId)) {
    throw new HttpsError('invalid-argument', 'A valid WorldWeave and moment are required.');
  }

  const weaveRef = db.collection('worldWeaves').doc(weaveId);
  const momentRef = weaveRef.collection('moments').doc(momentId);
  const activityRef = weaveRef.collection('activity').doc(randomUUID());

  return db.runTransaction(async tx => {
    const [weave, moment] = await Promise.all([tx.get(weaveRef), tx.get(momentRef)]);
    if (!weave.exists || !moment.exists || moment.get('weaveId') !== weaveId) {
      throw new HttpsError('not-found', 'This moment is no longer available to pin.');
    }
    if (weave.get('ownerId') !== actorUid) {
      throw new HttpsError('permission-denied', 'Only the WorldWeave owner can pin story moments.');
    }

    const raw = weave.get('pinnedMomentIds');
    const current = Array.isArray(raw) ? [...new Set(raw.filter((id): id is string => typeof id === 'string'))] : [];
    const isPinned = current.includes(momentId);
    let next: string[];
    if (isPinned) {
      next = current.filter(id => id !== momentId);
    } else {
      if (current.length >= MAX_PINNED_MOMENTS) {
        throw new HttpsError('failed-precondition', 'A WorldWeave can feature up to three pinned moments.');
      }
      next = [...current, momentId];
    }

    tx.update(weaveRef, {
      pinnedMomentIds: next,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(activityRef, {
      id: activityRef.id,
      actorUid,
      targetUid: moment.get('authorId') || actorUid,
      momentId,
      action: isPinned ? 'moment_unpinned' : 'moment_pinned',
      createdAt: FieldValue.serverTimestamp(),
    });
    return { pinned: !isPinned, pinnedMomentIds: next };
  });
});

/** Remove stale pin references when an author or owner deletes a moment. */
export const cleanupDeletedWorldWeaveMomentPin = onDocumentDeleted(
  { document: 'worldWeaves/{weaveId}/moments/{momentId}', retry: true },
  async event => {
    const { weaveId, momentId } = event.params;
    const weaveRef = db.collection('worldWeaves').doc(weaveId);
    const activityRef = weaveRef.collection('activity').doc(randomUUID());
    await db.runTransaction(async tx => {
      const weave = await tx.get(weaveRef);
      if (!weave.exists) return;
      const raw = weave.get('pinnedMomentIds');
      const current = Array.isArray(raw) ? [...new Set(raw.filter((id): id is string => typeof id === 'string'))] : [];
      if (!current.includes(momentId)) return;
      const next = current.filter(id => id !== momentId);
      tx.update(weaveRef, { pinnedMomentIds: next, updatedAt: FieldValue.serverTimestamp() });
      tx.create(activityRef, {
        id: activityRef.id,
        actorUid: event.data?.data()?.authorId || weave.get('ownerId') || 'system',
        targetUid: event.data?.data()?.authorId || '',
        momentId,
        action: 'moment_unpinned',
        reason: 'moment_deleted',
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  },
);
