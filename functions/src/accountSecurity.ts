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
  // Deny every direct-client session before revoking Auth refresh tokens. This
  // closes the race where a fresh sign-in could otherwise occur between the
  // cutoff write and revokeRefreshTokens(). Pending remains fail-closed if either
  // the Auth revoke or final cutoff publication fails.
  const statusRef = db.collection('accountStatus').doc(uid);
  try {
    await statusRef.set({
      accountId: uid,
      sessionRevocationPending: true,
      sessionRevocationStartedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch {
    await auditRef.update({ status: 'failed', failureStage: 'write_session_revocation_pending', updatedAt: FieldValue.serverTimestamp() }).catch(() => undefined);
    throw new HttpsError('internal', 'NEXORA could not safely start session revocation. Please try again.');
  }

  try {
    await auth.revokeRefreshTokens(uid);
  } catch {
    // Do not clear pending: all direct Firestore/Storage access remains blocked
    // until a retry successfully completes Firebase Auth revocation.
    await auditRef.update({
      status: 'failed',
      failureStage: 'revoke_refresh_tokens',
      directAccessBlocked: true,
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(() => undefined);
    throw new HttpsError('internal', 'Sessions are temporarily blocked while NEXORA retries revocation. Sign in again and retry.');
  }

  // Publish the final auth_time cutoff only after Auth revocation has completed.
  // Round up to the next whole second because Firebase auth_time is second-based.
  const cutoffSeconds = Math.ceil(Date.now() / 1000);
  const cutoff = Timestamp.fromMillis(cutoffSeconds * 1000);
  try {
    await statusRef.set({
      accountId: uid,
      sessionsRevokedAfter: cutoff,
      sessionRevocationPending: false,
      sessionsRevocationUpdatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch {
    // Pending remains true, so no direct client can bypass the unfinished finalization.
    await auditRef.update({
      status: 'failed',
      failureStage: 'publish_session_revocation_cutoff',
      directAccessBlocked: true,
      updatedAt: FieldValue.serverTimestamp(),
    }).catch(() => undefined);
    throw new HttpsError('internal', 'Your sessions were revoked, but access protection is still finalizing. Sign in again and retry.');
  }
  await auditRef.update({
    status: 'completed',
    directAccessBlockedAfter: cutoff,
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }).catch(() => undefined);
  return { revoked: true, sessionsRevokedAfter: cutoffSeconds };
});
