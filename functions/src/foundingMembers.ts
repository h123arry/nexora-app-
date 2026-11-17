import { randomBytes } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { assertCallableSessionActive } from './callableSession.js';

const app = getFirebaseAdminApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());
const auth = getAuth(app);
const RESERVED_USERNAMES = new Set([
  'admin', 'support', 'nexora', 'official', 'security', 'api', 'help',
  'system', 'developer', 'root', 'voh', 'voh_ai', 'nexora_ai',
]);

export type FoundingMemberInput = {
  email: string;
  fullName: string;
  username: string;
};

export function validateFoundingMemberInput(input: unknown): FoundingMemberInput {
  const data = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : '';
  const fullName = typeof data.fullName === 'string' ? data.fullName.trim() : '';
  const username = typeof data.username === 'string' ? data.username.trim().toLowerCase() : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }
  if (fullName.length < 2 || fullName.length > 80) {
    throw new HttpsError('invalid-argument', 'The member name must contain 2 to 80 characters.');
  }
  if (username.length < 3 || username.length > 20 || !/^[a-z0-9._]+$/.test(username)) {
    throw new HttpsError('invalid-argument', 'The username must be 3 to 20 characters and use letters, numbers, periods or underscores.');
  }
  if (RESERVED_USERNAMES.has(username)
    || ['official', 'verified', 'support', 'help', 'admin', 'moderator'].some(word =>
      username === word || username.startsWith(word + '_') || username.endsWith('_' + word))) {
    throw new HttpsError('invalid-argument', 'That username is reserved. Choose another handle.');
  }
  return { email, fullName, username };
}

function makeTemporaryPassword(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * Creates a real Firebase Authentication user from the trusted admin backend.
 * The random initial password is never returned or persisted. The administrator
 * receives a one-time Firebase password-reset link to share privately.
 */
export const createFoundingMemberAccount = onCall({ maxInstances: 3 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in with an administrator account.');
  await assertCallableSessionActive(db, uid, request.auth?.token?.auth_time);

  const claims = (request.auth?.token || {}) as Record<string, unknown>;
  const role = typeof claims.role === 'string' ? claims.role : '';
  if (!(claims.admin === true || claims.founder === true || role === 'admin' || role === 'founder')) {
    throw new HttpsError('permission-denied', 'Only an administrator can create founding member accounts.');
  }

  const { email, fullName, username } = validateFoundingMemberInput(request.data);
  let createdUid: string | null = null;

  try {
    const identity = await auth.createUser({
      email,
      displayName: fullName,
      password: makeTemporaryPassword(),
      emailVerified: false,
      disabled: false,
    });
    createdUid = identity.uid;

    // Generate the reset link before committing profile records. The link is
    // returned only to the authenticated administrator and is never logged or stored.
    const passwordResetLink = await auth.generatePasswordResetLink(email);

    const userRef = db.collection('users').doc(identity.uid);
    const publicProfileRef = db.collection('publicProfiles').doc(identity.uid);
    const usernameRef = db.collection('usernames').doc(username);
    const foundingMemberRef = db.collection('foundingMembers').doc(identity.uid);
    const cohortCounterRef = db.collection('foundingMemberCohorts').doc('founding_300');
    const existingPublicProfiles = db.collection('publicProfiles')
      .where('username', '==', username).limit(1);
    const joinedDate = `Joined ${new Date().toLocaleString('en-US', { month: 'long' })} ${new Date().getFullYear()}`;
    const reputationBreakdown = {
      contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0,
    };

    await db.runTransaction(async transaction => {
      const [usernameClaim, matchingProfiles, cohortCounter] = await Promise.all([
        transaction.get(usernameRef),
        transaction.get(existingPublicProfiles),
        transaction.get(cohortCounterRef),
      ]);
      if (usernameClaim.exists || !matchingProfiles.empty) {
        throw new HttpsError('already-exists', 'That username is already taken. Choose another handle.');
      }
      const cohortCount = Number(cohortCounter.get('count')) || 0;
      if (cohortCount >= 300) {
        throw new HttpsError('resource-exhausted', 'The first 300 founding member accounts have already been allocated.');
      }

      transaction.create(usernameRef, {
        userId: identity.uid,
        username,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(userRef, {
        id: identity.uid,
        username,
        name: fullName,
        email,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: '',
        location: 'Global',
        website: '',
        followers: 0,
        following: 0,
        sparks: 0,
        isVerified: false,
        isFoundingMember: true,
        coverImage: '',
        joinedDate,
        reputationPoints: 0,
        reputationBreakdown,
        interestDNA: {},
        skills: [],
        role: 'user',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.create(publicProfileRef, {
        id: identity.uid,
        username,
        name: fullName,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: '',
        website: '',
        followers: 0,
        following: 0,
        sparks: 0,
        isVerified: false,
        coverImage: '',
        joinedDate,
        reputationPoints: 0,
        reputationBreakdown,
        skills: [],
      });
      transaction.set(cohortCounterRef, {
        cohort: 'founding_300',
        count: cohortCount + 1,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      transaction.create(foundingMemberRef, {
        uid: identity.uid,
        email,
        username,
        createdBy: uid,
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.create(db.collection('adminAuditEvents').doc(), {
        actorUid: uid,
        targetUid: identity.uid,
        action: 'founding_member_account_created',
        createdAt: FieldValue.serverTimestamp(),
      });
    });

    return {
      created: true,
      uid: identity.uid,
      email,
      username,
      passwordResetLink,
      cohort: 'founding_300',
    };
  } catch (error) {
    if (createdUid) {
      try {
        await auth.deleteUser(createdUid);
      } catch {
        console.error('[FoundingMembers] Auth rollback needs reconciliation.', { uid: createdUid });
        throw new HttpsError('internal', 'Account provisioning failed and automatic rollback could not be confirmed. Contact NEXORA support with the account UID.');
      }
    }
    if (error instanceof HttpsError) throw error;
    const code = (error as { code?: string } | null)?.code;
    if (code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'A Firebase Authentication account already exists for this email address.');
    }
    console.error('[FoundingMembers] Account provisioning failed.', { code: code || 'unknown' });
    throw new HttpsError('internal', 'The founding member account could not be created. No partial account was retained.');
  }
});
