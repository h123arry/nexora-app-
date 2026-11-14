import { randomUUID } from 'node:crypto';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function requireId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new HttpsError('invalid-argument', `A valid ${label} is required.`);
  }
  return value;
}

function actorFrom(request: { auth?: { uid: string } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to manage this WorldWeave.');
  return request.auth.uid;
}

function memberIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === 'string' && ID_PATTERN.test(item)))];
}

function mapError(error: unknown): never {
  if (error instanceof HttpsError) throw error;
  const message = error instanceof Error ? error.message : 'WorldWeave membership could not be updated.';
  if (message.includes('Only') || message.includes('cannot') || message.includes('must be') || message.includes('no longer')) {
    throw new HttpsError('failed-precondition', message);
  }
  throw new HttpsError('internal', 'WorldWeave membership could not be updated. Try again.');
}

/** A contributor may leave; the owner must transfer ownership before leaving. */
export const leaveWorldWeave = onCall({ maxInstances: 20 }, async request => {
  const actorUid = actorFrom(request);
  const weaveId = requireId(request.data?.weaveId, 'WorldWeave');
  const weaveRef = db.collection('worldWeaves').doc(weaveId);
  const inviteRef = weaveRef.collection('invites').doc(actorUid);
  const activityRef = weaveRef.collection('activity').doc(randomUUID());

  try {
    await db.runTransaction(async tx => {
      const [weave, invite] = await Promise.all([tx.get(weaveRef), tx.get(inviteRef)]);
      if (!weave.exists) throw new Error('This WorldWeave no longer exists.');
      const data = weave.data()!;
      if (data.ownerId === actorUid) throw new Error('The owner must transfer ownership before leaving.');
      const ids = memberIds(data.participantIds);
      if (!ids.includes(actorUid)) {
        if (invite.exists && invite.get('status') === 'pending') tx.delete(inviteRef);
        else throw new Error('You are not an active contributor to this WorldWeave.');
      } else {
        const next = ids.filter(uid => uid !== actorUid);
        tx.update(weaveRef, {
          participantIds: next,
          memberCount: next.length,
          updatedAt: FieldValue.serverTimestamp(),
        });
        if (invite.exists && invite.get('status') === 'pending') tx.delete(inviteRef);
        tx.create(activityRef, {
          id: activityRef.id, actorUid, targetUid: actorUid,
          action: 'member_left', createdAt: FieldValue.serverTimestamp(),
        });
      }
    });
    return { success: true, weaveId };
  } catch (error) { return mapError(error); }
});

/** The owner may remove a contributor, but cannot remove themself or another owner. */
export const removeWorldWeaveContributor = onCall({ maxInstances: 20 }, async request => {
  const actorUid = actorFrom(request);
  const weaveId = requireId(request.data?.weaveId, 'WorldWeave');
  const targetUid = requireId(request.data?.memberId, 'contributor');
  if (actorUid === targetUid) throw new HttpsError('invalid-argument', 'Use ownership transfer before leaving as owner.');

  const weaveRef = db.collection('worldWeaves').doc(weaveId);
  const inviteRef = weaveRef.collection('invites').doc(targetUid);
  const activityRef = weaveRef.collection('activity').doc(randomUUID());
  try {
    await db.runTransaction(async tx => {
      const [weave, invite] = await Promise.all([tx.get(weaveRef), tx.get(inviteRef)]);
      if (!weave.exists || weave.get('ownerId') !== actorUid) {
        throw new Error('Only the WorldWeave owner can remove contributors.');
      }
      const ids = memberIds(weave.get('participantIds'));
      if (!ids.includes(targetUid)) throw new Error('The target is not an active contributor.');
      const next = ids.filter(uid => uid !== targetUid);
      tx.update(weaveRef, {
        participantIds: next,
        memberCount: next.length,
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (invite.exists && invite.get('status') === 'pending') tx.delete(inviteRef);
      tx.create(activityRef, {
        id: activityRef.id, actorUid, targetUid,
        action: 'member_removed', createdAt: FieldValue.serverTimestamp(),
      });
    });
    return { success: true, weaveId, memberId: targetUid };
  } catch (error) { return mapError(error); }
});

/** Transfer ownership atomically while retaining the previous owner as a contributor. */
export const transferWorldWeaveOwnership = onCall({ maxInstances: 10 }, async request => {
  const actorUid = actorFrom(request);
  const weaveId = requireId(request.data?.weaveId, 'WorldWeave');
  const targetUid = requireId(request.data?.memberId, 'new owner');
  if (actorUid === targetUid) throw new HttpsError('invalid-argument', 'Choose another active contributor as the new owner.');

  const weaveRef = db.collection('worldWeaves').doc(weaveId);
  const targetProfileRef = db.collection('publicProfiles').doc(targetUid);
  const activityRef = weaveRef.collection('activity').doc(randomUUID());
  try {
    await db.runTransaction(async tx => {
      const [weave, profile] = await Promise.all([tx.get(weaveRef), tx.get(targetProfileRef)]);
      if (!weave.exists || weave.get('ownerId') !== actorUid) {
        throw new Error('Only the current WorldWeave owner can transfer ownership.');
      }
      const ids = memberIds(weave.get('participantIds'));
      if (!ids.includes(targetUid)) throw new Error('The new owner must already be an active contributor.');
      if (!profile.exists) throw new Error('The new owner profile could not be verified.');
      const nextOwnerName = String(profile.get('name') || profile.get('username') || '').slice(0, 80);
      if (!nextOwnerName) throw new Error('The new owner profile has no display name.');
      tx.update(weaveRef, {
        ownerId: targetUid,
        ownerName: nextOwnerName,
        updatedAt: FieldValue.serverTimestamp(),
      });
      tx.create(activityRef, {
        id: activityRef.id,
        actorUid,
        targetUid,
        previousOwnerId: actorUid,
        action: 'ownership_transferred',
        createdAt: FieldValue.serverTimestamp(),
      });
    });
    return { success: true, weaveId, previousOwnerId: actorUid, ownerId: targetUid };
  } catch (error) { return mapError(error); }
});
