import { createHash, randomBytes } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { assertCallableSessionActive } from './callableSession.js';

const app = getFirebaseAdminApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());
const auth = getAuth(app);
const COHORT_ID = 'founding_300';
const COHORT_LIMIT = 300;
const APP_ORIGIN = 'https://nexoraapp.com.ng';

const hashInvite = (code: string) => createHash('sha256').update(code).digest('hex');

function isAdministrator(token: Record<string, unknown>): boolean {
  const role = typeof token.role === 'string' ? token.role : '';
  return token.admin === true || token.founder === true || role === 'admin' || role === 'founder';
}

/**
 * Creates one reusable, private beta link. The raw code is returned once and
 * only to an authenticated founder/admin; Firestore stores only its SHA-256 hash.
 */
export const createBetaInviteLink = onCall({ maxInstances: 2 }, async request => {
  const caller = request.auth;
  if (!caller?.uid) throw new HttpsError('unauthenticated', 'Sign in with an administrator account.');
  await assertCallableSessionActive(db, caller.uid, caller.token?.auth_time);
  if (!isAdministrator((caller.token || {}) as Record<string, unknown>)) {
    throw new HttpsError('permission-denied', 'Only a NEXORA founder or administrator can issue the beta link.');
  }

  const code = randomBytes(32).toString('base64url');
  const inviteId = hashInvite(code);
  await db.collection('betaInvites').doc(inviteId).create({
    cohort: COHORT_ID,
    active: true,
    maxClaims: COHORT_LIMIT,
    claims: 0,
    createdBy: caller.uid,
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection('adminAuditEvents').add({
    actorUid: caller.uid,
    action: 'beta_invite_link_created',
    cohort: COHORT_ID,
    maxClaims: COHORT_LIMIT,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    created: true,
    cohort: COHORT_ID,
    maxClaims: COHORT_LIMIT,
    inviteUrl: `${APP_ORIGIN}/?beta=${encodeURIComponent(code)}`,
  };
});

/**
 * Claims one of the 300 beta places for an authenticated, non-anonymous NEXORA UID.
 * The transaction is idempotent per UID and shares the existing founding_300
 * counter with administrator-created founding accounts.
 */
export const claimBetaInvite = onCall({ maxInstances: 20 }, async request => {
  const caller = request.auth;
  const uid = caller?.uid;
  if (!caller || !uid) throw new HttpsError('unauthenticated', 'Sign in to NEXORA before claiming this invitation.');
  await assertCallableSessionActive(db, uid, caller.token?.auth_time);

  const firebaseClaims = (caller.token.firebase || {}) as Record<string, unknown>;
  if (firebaseClaims.sign_in_provider === 'anonymous') {
    throw new HttpsError('failed-precondition', 'Complete sign-up with email, Google or phone before claiming this invitation.');
  }

  const code = typeof request.data?.code === 'string' ? request.data.code.trim() : '';
  if (code.length < 32 || code.length > 128) {
    throw new HttpsError('invalid-argument', 'This beta invitation link is invalid.');
  }

  const inviteRef = db.collection('betaInvites').doc(hashInvite(code));
  const claimRef = db.collection('betaClaims').doc(uid);
  const cohortRef = db.collection('foundingMemberCohorts').doc(COHORT_ID);

  const outcome = await db.runTransaction(async transaction => {
    const [claimSnapshot, inviteSnapshot, cohortSnapshot] = await Promise.all([
      transaction.get(claimRef),
      transaction.get(inviteRef),
      transaction.get(cohortRef),
    ]);

    if (claimSnapshot.exists) {
      const existing = claimSnapshot.data() || {};
      if (existing.cohort !== COHORT_ID) {
        throw new HttpsError('permission-denied', 'This account is not eligible for this beta invitation.');
      }
      return { alreadyClaimed: true };
    }

    if (!inviteSnapshot.exists || inviteSnapshot.get('active') !== true) {
      throw new HttpsError('permission-denied', 'This beta invitation is invalid or has been disabled.');
    }

    const inviteClaims = Number(inviteSnapshot.get('claims')) || 0;
    const inviteLimit = Math.min(Number(inviteSnapshot.get('maxClaims')) || COHORT_LIMIT, COHORT_LIMIT);
    const cohortCount = Number(cohortSnapshot.get('count')) || 0;
    if (inviteClaims >= inviteLimit || cohortCount >= COHORT_LIMIT) {
      throw new HttpsError('resource-exhausted', 'NEXORA Founding Beta is full. All 300 places have been claimed.');
    }

    transaction.create(claimRef, {
      uid,
      cohort: COHORT_ID,
      inviteId: inviteRef.id,
      claimedAt: FieldValue.serverTimestamp(),
      accountType: 'member',
    });
    transaction.set(inviteRef, {
      claims: inviteClaims + 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.set(cohortRef, {
      cohort: COHORT_ID,
      count: cohortCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    transaction.create(db.collection('adminAuditEvents').doc(), {
      targetUid: uid,
      action: 'beta_invite_claimed',
      cohort: COHORT_ID,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { alreadyClaimed: false };
  });

  const identity = await auth.getUser(uid);
  await auth.setCustomUserClaims(uid, {
    ...(identity.customClaims || {}),
    betaMember: true,
    betaCohort: COHORT_ID,
  });

  return { claimed: true, alreadyClaimed: outcome.alreadyClaimed, cohort: COHORT_ID };
});
