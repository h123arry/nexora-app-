import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const REACTIONS = ['heart', 'applause', 'insight', 'laugh'] as const;
type Reaction = typeof REACTIONS[number];
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function validId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}

export const setWorldWeaveMomentReaction = onCall({ maxInstances: 30 }, async request => {
  const userId = request.auth?.uid;
  if (!userId) throw new HttpsError('unauthenticated', 'Sign in to react to a WorldWeave moment.');

  const { weaveId, momentId, reaction } = request.data || {};
  if (!validId(weaveId) || !validId(momentId)) {
    throw new HttpsError('invalid-argument', 'A valid WorldWeave and moment are required.');
  }
  if (reaction !== null && !REACTIONS.includes(reaction as Reaction)) {
    throw new HttpsError('invalid-argument', 'Choose a supported moment reaction.');
  }

  const weaveRef = db.collection('worldWeaves').doc(weaveId);
  const momentRef = weaveRef.collection('moments').doc(momentId);
  const reactionRef = momentRef.collection('reactions').doc(userId);

  return db.runTransaction(async tx => {
    const [weave, moment, previous] = await Promise.all([
      tx.get(weaveRef), tx.get(momentRef), tx.get(reactionRef),
    ]);
    if (!weave.exists || !moment.exists || moment.get('weaveId') !== weaveId) {
      throw new HttpsError('not-found', 'This WorldWeave moment is no longer available.');
    }

    const participants = Array.isArray(weave.get('participantIds')) ? weave.get('participantIds') as string[] : [];
    if (weave.get('ownerId') !== userId && !participants.includes(userId)) {
      throw new HttpsError('permission-denied', 'Join this WorldWeave before reacting to its moments.');
    }

    const previousReaction = previous.exists ? previous.get('reaction') as Reaction : null;
    const nextReaction = reaction === previousReaction ? null : reaction as Reaction | null;
    const stored = moment.get('reactionCounts');
    const counts: Record<Reaction, number> = {
      heart: Number(stored?.heart || 0),
      applause: Number(stored?.applause || 0),
      insight: Number(stored?.insight || 0),
      laugh: Number(stored?.laugh || 0),
    };

    if (previousReaction && REACTIONS.includes(previousReaction)) {
      counts[previousReaction] = Math.max(0, counts[previousReaction] - 1);
    }
    if (nextReaction) counts[nextReaction] += 1;

    if (nextReaction) {
      tx.set(reactionRef, {
        userId,
        reaction: nextReaction,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (previous.exists) {
      tx.delete(reactionRef);
    }
    tx.update(momentRef, {
      reactionCounts: counts,
      reactionsUpdatedAt: FieldValue.serverTimestamp(),
    });

    return { reaction: nextReaction, reactionCounts: counts };
  });
});
