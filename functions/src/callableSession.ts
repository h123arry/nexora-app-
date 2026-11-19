import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall as firebaseOnCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

type SessionStatus = {
  sessionRevocationPending?: unknown;
  sessionsRevokedAfter?: unknown;
};

/** Fail closed for callable handlers that use the Admin SDK and bypass Firestore Rules. */
export function callableSessionStatusAllows(status: SessionStatus | null | undefined, authTime: unknown): boolean {
  if (!status) return true;
  if (status.sessionRevocationPending === true) return false;
  if (!Object.prototype.hasOwnProperty.call(status, 'sessionsRevokedAfter')) return true;
  const cutoff = status.sessionsRevokedAfter as { toMillis?: () => number } | null | undefined;
  if (!cutoff || typeof cutoff.toMillis !== 'function') return false;
  const cutoffSeconds = cutoff.toMillis() / 1000;
  return Number.isSafeInteger(authTime) && (authTime as number) > cutoffSeconds;
}

export async function assertCallableSessionActive(
  db: Firestore,
  uid: string,
  authTime: unknown,
): Promise<void> {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  // A Firestore read error must reject the callable rather than bypass revocation.
  let snapshot;
  try {
    snapshot = await db.collection('accountStatus').doc(uid).get();
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    console.error('[NEXORA] Callable session status lookup failed', {
      code: typeof code === 'string' ? code : 'unknown',
    });
    // Fail closed, but distinguish an unavailable security store from a bad sign-in.
    throw new HttpsError('unavailable', 'NEXORA could not verify your account security status. Please retry shortly.');
  }
  if (!callableSessionStatusAllows(snapshot.data(), authTime)) {
    throw new HttpsError('unauthenticated', 'Your session is being secured or has been revoked. Sign in again to continue.');
  }
}


const callableSessionDb = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());

/**
 * Drop-in onCall wrapper for Admin-SDK callable modules. Public callables remain
 * public when no user is signed in; authenticated requests must pass the server
 * revocation-state check before their handler runs.
 */
export const onCallWithSession = ((options: any, handler: (request: any) => any) =>
  firebaseOnCall(options, async (request: any) => {
    if (request.auth?.uid) {
      await assertCallableSessionActive(callableSessionDb, request.auth.uid, request.auth.token?.auth_time);
    }
    return handler(request);
  })) as typeof firebaseOnCall;
