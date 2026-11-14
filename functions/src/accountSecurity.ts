import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
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
  try {
    await auth.revokeRefreshTokens(uid);
  } catch {
    await auditRef.update({ status: 'failed', updatedAt: FieldValue.serverTimestamp() }).catch(() => undefined);
    throw new HttpsError('internal', 'NEXORA could not revoke your sessions. Please try again.');
  }
  await auditRef.update({
    status: 'completed',
    completedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }).catch(() => undefined);
  return { revoked: true };
});
