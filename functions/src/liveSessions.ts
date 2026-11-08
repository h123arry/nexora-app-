import { createHash } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { nextLiveChatRateState, validateLiveChatMessage, validateLiveSessionId, validateLiveSessionTitle } from './liveSessionsPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const sessions = db.collection('liveSessions');

function uid(request: { auth?: { uid: string } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to use live rooms.');
  return request.auth.uid;
}
function valid<T>(fn: () => T): T {
  try { return fn(); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Live room details are invalid.'); }
}
function accountRestricted(data: FirebaseFirestore.DocumentData | undefined, field: string): boolean {
  if (!data?.[field]) return false;
  const expiresAt = data.expiresAt?.toMillis?.();
  return !expiresAt || expiresAt > Date.now();
}
function rateDocId(sessionId: string, userId: string): string {
  return createHash('sha256').update(sessionId + ':' + userId).digest('hex');
}

export const startLiveSession = onCall({ maxInstances: 10 }, async request => {
  const hostId = uid(request);
  const title = valid(() => validateLiveSessionTitle(request.data?.title));
  const statusRef = db.collection('accountStatus').doc(hostId);
  const status = await statusRef.get();
  if (accountRestricted(status.data(), 'suspended') || accountRestricted(status.data(), 'postingRestricted')) {
    throw new HttpsError('permission-denied', 'This account cannot start a live room right now.');
  }
  const ref = sessions.doc();
  try {
    await db.runTransaction(async tx => {
      const existing = await tx.get(sessions.where('hostId', '==', hostId).where('status', '==', 'live').limit(1));
      if (!existing.empty) throw new HttpsError('already-exists', 'You already have an active live room.');
      tx.create(ref, {
        hostId, title, status: 'live', viewerCount: 0, chatEnabled: true, giftsEnabled: true,
        videoTransport: 'not_configured', startedAt: FieldValue.serverTimestamp(),
        endedAt: null, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return { sessionId: ref.id, status: 'live' as const, viewerCount: 0, videoTransport: 'not_configured' as const };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'Your live room could not be started. Please retry.');
  }
});

export const endLiveSession = onCall({ maxInstances: 10 }, async request => {
  const hostId = uid(request);
  const sessionId = valid(() => validateLiveSessionId(request.data?.sessionId));
  const ref = sessions.doc(sessionId);
  try {
    return await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists || snapshot.data()?.hostId !== hostId) throw new HttpsError('not-found', 'This live room is unavailable.');
      if (snapshot.data()?.status === 'ended') return { sessionId, status: 'ended' as const, replayed: true };
      tx.update(ref, { status: 'ended', viewerCount: 0, endedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      return { sessionId, status: 'ended' as const, replayed: false };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'The live room could not be ended. Please retry.');
  }
});

export const joinLiveSession = onCall({ maxInstances: 20 }, async request => {
  const viewerId = uid(request);
  const sessionId = valid(() => validateLiveSessionId(request.data?.sessionId));
  const sessionRef = sessions.doc(sessionId);
  const viewerRef = db.collection('liveSessionViewers').doc(rateDocId(sessionId, viewerId));
  const statusRef = db.collection('accountStatus').doc(viewerId);
  const account = await statusRef.get();
  if (accountRestricted(account.data(), 'suspended')) throw new HttpsError('permission-denied', 'This account cannot join live rooms.');
  try {
    return await db.runTransaction(async tx => {
      const [session, viewer] = await Promise.all([tx.get(sessionRef), tx.get(viewerRef)]);
      if (!session.exists || session.data()?.status !== 'live') throw new HttpsError('failed-precondition', 'This live room has ended.');
      const hostId = session.data()?.hostId;
      if (viewerId === hostId) return { sessionId, joined: true, viewerCount: Number(session.data()?.viewerCount || 0) };
      if (!viewer.exists) {
        tx.create(viewerRef, { sessionId, viewerId, joinedAt: FieldValue.serverTimestamp() });
        const count = Number.isSafeInteger(session.data()?.viewerCount) && session.data()!.viewerCount >= 0 ? session.data()!.viewerCount : 0;
        tx.update(sessionRef, { viewerCount: count + 1, updatedAt: FieldValue.serverTimestamp() });
        return { sessionId, joined: true, viewerCount: count + 1 };
      }
      return { sessionId, joined: true, viewerCount: Number(session.data()?.viewerCount || 0) };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'You could not join this live room. Please retry.');
  }
});

export const leaveLiveSession = onCall({ maxInstances: 20 }, async request => {
  const viewerId = uid(request);
  const sessionId = valid(() => validateLiveSessionId(request.data?.sessionId));
  const sessionRef = sessions.doc(sessionId);
  const viewerRef = db.collection('liveSessionViewers').doc(rateDocId(sessionId, viewerId));
  try {
    return await db.runTransaction(async tx => {
      const [session, viewer] = await Promise.all([tx.get(sessionRef), tx.get(viewerRef)]);
      if (!viewer.exists) return { sessionId, left: true, viewerCount: Math.max(0, Number(session.data()?.viewerCount || 0)) };
      tx.delete(viewerRef);
      if (!session.exists || session.data()?.status !== 'live') return { sessionId, left: true, viewerCount: 0 };
      const count = Number.isSafeInteger(session.data()?.viewerCount) && session.data()!.viewerCount > 0 ? session.data()!.viewerCount : 0;
      tx.update(sessionRef, { viewerCount: Math.max(0, count - 1), updatedAt: FieldValue.serverTimestamp() });
      return { sessionId, left: true, viewerCount: Math.max(0, count - 1) };
    });
  } catch {
    throw new HttpsError('unavailable', 'You could not leave this live room cleanly. Please retry.');
  }
});

export const sendLiveChatMessage = onCall({ maxInstances: 20 }, async request => {
  const senderId = uid(request);
  const sessionId = valid(() => validateLiveSessionId(request.data?.sessionId));
  const message = valid(() => validateLiveChatMessage(request.data?.message));
  const sessionRef = sessions.doc(sessionId);
  const profileRef = db.collection('users').doc(senderId);
  const statusRef = db.collection('accountStatus').doc(senderId);
  const rateRef = db.collection('liveChatRateLimits').doc(rateDocId(sessionId, senderId));
  const messageRef = sessionRef.collection('messages').doc();
  try {
    return await db.runTransaction(async tx => {
      const [session, profile, status, rate] = await Promise.all([
        tx.get(sessionRef), tx.get(profileRef), tx.get(statusRef), tx.get(rateRef),
      ]);
      if (!session.exists || session.data()?.status !== 'live') throw new HttpsError('failed-precondition', 'This live room is no longer active.');
      if (session.data()?.chatEnabled !== true) throw new HttpsError('failed-precondition', 'Live chat is disabled for this room.');
      if (accountRestricted(status.data(), 'suspended') || accountRestricted(status.data(), 'messagingRestricted')) {
        throw new HttpsError('permission-denied', 'This account cannot send live chat messages.');
      }
      const rateData = rate.data();
      const currentRate = rate.exists ? {
        windowStartedAtMs: rateData?.windowStartedAt?.toMillis?.() || 0,
        messageCount: Number.isSafeInteger(rateData?.messageCount) ? rateData.messageCount : 0,
      } : null;
      let nextRate;
      try { nextRate = nextLiveChatRateState(currentRate, Date.now()); }
      catch (error) { throw new HttpsError('resource-exhausted', error instanceof Error ? error.message : 'You are sending messages too quickly.'); }
      const profileData = profile.data() || {};
      const senderName = String(profileData.name || profileData.username || 'NEXORA member').slice(0, 80);
      tx.set(rateRef, { windowStartedAt: new Date(nextRate.windowStartedAtMs), messageCount: nextRate.messageCount, updatedAt: FieldValue.serverTimestamp() });
      tx.create(messageRef, { senderId, senderName, message, createdAt: FieldValue.serverTimestamp() });
      return { messageId: messageRef.id, sessionId, senderId, senderName, message, status: 'sent' as const };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'Your live chat message could not be sent. Please retry.');
  }
});
