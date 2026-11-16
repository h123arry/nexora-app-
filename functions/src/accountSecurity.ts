import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { isRecentAccountAuthentication } from './accountSecurityPolicy.js';

const app = getFirebaseAdminApp();
const auth = getAuth(app);
const db = getFirestore(app, resolveFirestoreDatabaseId());

type SessionRequest = {
  auth?: { uid: string } | null;
  rawRequest: { headers: { authorization?: string } };
};

export const revokeAllSessions = onCall({ maxInstances: 5 }, async request => {
  const callable = request as SessionRequest;
  const uid = callable.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in before revoking active sessions.');
  const authorization = callable.rawRequest.headers.authorization || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) throw new HttpsError('unauthenticated', 'A current authenticated session is required.');

  let decoded;
  try {
    decoded = await auth.verifyIdToken(token, true);
  } catch {
    throw new HttpsError('unauthenticated', 'Your session is expired or has been revoked. Sign in again.');
  }
  if (decoded.uid !== uid) throw new HttpsError('unauthenticated', 'The authenticated session no longer matches this account.');
  if (!isRecentAccountAuthentication(decoded.auth_time, Date.now() / 1000)) {
    throw new HttpsError('failed-precondition', 'Sign in again immediately before revoking sessions.');
  }

  const auditRef = db.collection('securityAuditEvents').doc();
  await auditRef.create({
    userId: uid,
    action: 'revoke_all_sessions',
    status: 'started',
    createdAt: FieldValue.serverTimestamp(),
  });
  // Publish the direct-client enforcement cutoff before revoking refresh tokens.
  // Firestore and Storage rules compare token auth_time against this server-owned marker.
  // Round up to the next whole second because Firebase auth_time is expressed in seconds.
  const cutoffSeconds = Math.ceil(Date.now() / 1000);
  const cutoff = Timestamp.fromMillis(cutoffSeconds * 1000);
  try {
    await db.collection('accountStatus').doc(uid).set({
      accountId: uid,
      sessionsRevokedAfter: cutoff,
      sessionsRevocationUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch {
    await auditRef.update({ status: 'failed', failureStage: 'write_session_cutoff', updatedAt: FieldValue.serverTimestamp() }).catch(() => undefined);
    throw new HttpsError('internal', 'NEXORA could not secure direct data access for session revocation. Please try again.');
  }

  try {
    await auth.revokeRefreshTokens(uid);
  } catch {
    // Keep the cutoff in place: old ID tokens are already denied by Firestore/Storage rules.
    // A fresh sign-in after the cutoff can recover access while an operator retries Auth revocation.
    await auditRef.update({
      status: 'failed',
      failureStage: 'revoke_refresh_tokens',
      directAccessBlockedAfter: cutoff,
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(() => undefined);
    throw new HttpsError('internal', 'Existing sessions are blocked from direct data access, but NEXORA could not complete token revocation. Please sign in again and retry.');
  }
  await auditRef.update({
    status: 'completed',
    directAccessBlockedAfter: cutoff,
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }).catch(() => undefined);
  return { revoked: true, sessionsRevokedAfter: cutoffSeconds };
});
