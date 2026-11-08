import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { CREATOR_MEMBERSHIP_TIER_LIMIT, validateCreatorMembershipTierId, validateCreatorMembershipTierInput } from './creatorMembershipPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const tiers = db.collection('creatorMembershipTiers');

function requireCreator(request: { auth?: { uid: string } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to manage creator memberships.');
  return request.auth.uid;
}
function asIso(value: any): string | null { return value?.toDate?.()?.toISOString?.() || null; }
function validateInput(value: unknown) {
  try { return validateCreatorMembershipTierInput(value); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Membership tier details are invalid.'); }
}
function validateId(value: unknown) {
  try { return validateCreatorMembershipTierId(value); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Membership tier reference is invalid.'); }
}

export const listCreatorMembershipTiers = onCall({ maxInstances: 10 }, async request => {
  const creatorId = requireCreator(request);
  const snapshot = await tiers.where('creatorId', '==', creatorId).limit(10).get();
  return { checkoutEnabled: false as const, tiers: snapshot.docs.map(doc => {
    const data = doc.data();
    return { id: doc.id, name: data.name, description: data.description, benefits: data.benefits, status: data.status,
      createdAt: asIso(data.createdAt), updatedAt: asIso(data.updatedAt), version: data.version };
  }).sort((a,b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')) };
});

export const createCreatorMembershipTier = onCall({ maxInstances: 10 }, async request => {
  const creatorId = requireCreator(request);
  const input = validateInput(request.data);
  const ref = tiers.doc();
  try {
    await db.runTransaction(async tx => {
      const existing = await tx.get(tiers.where('creatorId', '==', creatorId));
      const active = existing.docs.filter(doc => doc.data().status !== 'archived');
      if (active.length >= CREATOR_MEMBERSHIP_TIER_LIMIT) throw new HttpsError('resource-exhausted', 'Creators can configure up to three membership tiers.');
      tx.create(ref, { creatorId, ...input, status: 'draft', checkoutEnabled: false, version: 1,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    });
    return { tierId: ref.id, status: 'draft' as const, checkoutEnabled: false as const };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'The membership tier could not be saved. Please retry.');
  }
});

export const updateCreatorMembershipTier = onCall({ maxInstances: 10 }, async request => {
  const creatorId = requireCreator(request);
  const tierId = validateId(request.data?.tierId);
  const input = validateInput(request.data?.tier);
  const ref = tiers.doc(tierId);
  try {
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists || snapshot.data()?.creatorId !== creatorId) throw new HttpsError('not-found', 'This membership tier is unavailable.');
      if (snapshot.data()?.status === 'archived') throw new HttpsError('failed-precondition', 'Archived membership tiers cannot be edited.');
      tx.update(ref, { ...input, version: (Number.isSafeInteger(snapshot.data()?.version) ? snapshot.data()?.version : 1) + 1, updatedAt: FieldValue.serverTimestamp() });
    });
    return { tierId, status: 'draft' as const, checkoutEnabled: false as const };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'The membership tier could not be updated. Please retry.');
  }
});

export const archiveCreatorMembershipTier = onCall({ maxInstances: 10 }, async request => {
  const creatorId = requireCreator(request);
  const tierId = validateId(request.data?.tierId);
  const ref = tiers.doc(tierId);
  try {
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists || snapshot.data()?.creatorId !== creatorId) throw new HttpsError('not-found', 'This membership tier is unavailable.');
      if (snapshot.data()?.status !== 'archived') tx.update(ref, { status: 'archived', checkoutEnabled: false, updatedAt: FieldValue.serverTimestamp() });
    });
    return { tierId, status: 'archived' as const, checkoutEnabled: false as const };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'The membership tier could not be archived. Please retry.');
  }
});
