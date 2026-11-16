import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

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
  return Number.isSafeInteger(authTime) && (authTime as number) >= cutoffSeconds;
}

export async function assertCallableSessionActive(
  db: Firestore,
  uid: string,
  authTime: unknown,
): Promise<void> {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  // A Firestore read error must reject the callable rather than bypass revocation.
  const snapshot = await db.collection('accountStatus').doc(uid).get();
  if (!callableSessionStatusAllows(snapshot.data(), authTime)) {
    throw new HttpsError('unauthenticated', 'Your session is being secured or has been revoked. Sign in again to continue.');
  }
}
