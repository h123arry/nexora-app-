import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { nextLiveChatRateState, validateLiveChatMessage, validateLiveConnectionId, validateLiveSessionId, validateLiveSessionTitle, validateLiveSessionSettings, validateLiveGuestDecision, validateLiveGuestId } from './liveSessionsPolicy.js';

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
function accountRestricted(data: Record<string, any> | undefined, field: string): boolean {
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
  const profileRef = db.collection('users').doc(hostId);
  const [status, profile] = await Promise.all([statusRef.get(), profileRef.get()]);
  if (accountRestricted(status.data(), 'suspended') || accountRestricted(status.data(), 'postingRestricted')) {
    throw new HttpsError('permission-denied', 'This account cannot start a live room right now.');
  }
  const ref = sessions.doc();
  try {
    await db.runTransaction(async tx => {
      const existing = await tx.get(sessions.where('hostId', '==', hostId).where('status', '==', 'live').limit(1));
      if (!existing.empty) throw new HttpsError('already-exists', 'You already have an active live room.');
      tx.create(ref, {
        hostId, hostName: String(profile.data()?.name || profile.data()?.username || 'NEXORA creator').slice(0, 80), title, status: 'live', viewerCount: 0, chatEnabled: true, giftsEnabled: true,
        videoTransport: 'not_configured', hostExpiresAt: Timestamp.fromMillis(Date.now() + 90_000), startedAt: FieldValue.serverTimestamp(),
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

export const updateLiveSessionSettings = onCall({ maxInstances: 10 }, async request => {
  const hostId = uid(request);
  const sessionId = valid(() => validateLiveSessionId(request.data?.sessionId));
  const settings = valid(() => validateLiveSessionSettings(request.data?.settings));
  const ref = sessions.doc(sessionId);
  try {
    return await db.runTransaction(async tx => {
      const snapshot = await tx.get(ref);
      if (!snapshot.exists || snapshot.data()?.hostId !== hostId) {
        throw new HttpsError('permission-denied', 'Only the live room host can change these settings.');
      }
      if (snapshot.data()?.status !== 'live') throw new HttpsError('failed-precondition', 'This live room has already ended.');
      tx.update(ref, { ...settings, updatedAt: FieldValue.serverTimestamp() });
      return { sessionId, ...settings, updated: true as const };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'Live room settings could not be updated. Please retry.');
  }
});

export const joinLiveSession = onCall({ maxInstances: 20 }, async request => {
  const viewerId = uid(request);
  const sessionId = valid(() => validateLiveSessionId(request.data?.sessionId));
  const connectionId = valid(() => validateLiveConnectionId(request.data?.connectionId));
  const sessionRef = sessions.doc(sessionId);
  const viewerRef = db.collection('liveSessionViewers').doc(rateDocId(sessionId, viewerId));
  const statusRef = db.collection('accountStatus').doc(viewerId);
  const account = await statusRef.get();
  const moderationRef = sessionRef.collection('moderation').doc(viewerId);
  const moderation = await moderationRef.get();
  if (moderation.data()?.banned === true) throw new HttpsError('permission-denied', 'You are not allowed to join this live room.');
  if (accountRestricted(account.data(), 'suspended')) throw new HttpsError('permission-denied', 'This account cannot join live rooms.');
  try {
    return await db.runTransaction(async tx => {
      const [session, viewer] = await Promise.all([tx.get(sessionRef), tx.get(viewerRef)]);
      if (!session.exists || session.data()?.status !== 'live') throw new HttpsError('failed-precondition', 'This live room has ended.');
      const hostId = session.data()?.hostId;
      if (viewerId === hostId) return { sessionId, joined: true, viewerCount: Number(session.data()?.viewerCount || 0) };
      if (!viewer.exists) {
        tx.create(viewerRef, { sessionId, viewerId, connectionIds: [connectionId], joinedAt: FieldValue.serverTimestamp(), lastSeenAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 90_000) });
        const count = Number.isSafeInteger(session.data()?.viewerCount) && session.data()!.viewerCount >= 0 ? session.data()!.viewerCount : 0;
        tx.update(sessionRef, { viewerCount: count + 1, updatedAt: FieldValue.serverTimestamp() });
        return { sessionId, joined: true, viewerCount: count + 1 };
      }
      const connections = Array.isArray(viewer.data()?.connectionIds) ? viewer.data()!.connectionIds.filter((item: unknown): item is string => typeof item === 'string') : [];
      const nextConnections = connections.includes(connectionId) ? connections : [...connections, connectionId];
      tx.update(viewerRef, { connectionIds: nextConnections, lastSeenAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 90_000) });
      return { sessionId, joined: true, viewerCount: Number(session.data()?.viewerCount || 0) };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'You could not join this live room. Please retry.');
  }
});

export const requestLiveGuestAccess = onCall({ maxInstances: 20 }, async request => {
  const guestId = uid(request);
  const sessionId = valid(() => validateLiveSessionId(request.data?.sessionId));
  const connectionId = valid(() => validateLiveConnectionId(request.data?.connectionId));
  const sessionRef = sessions.doc(sessionId);
  const viewerRef = db.collection('liveSessionViewers').doc(rateDocId(sessionId, guestId));
  const requestRef = sessionRef.collection('guestRequests').doc(guestId);
  const profileRef = db.collection('users').doc(guestId);
  const statusRef = db.collection('accountStatus').doc(guestId);
  try {
    return await db.runTransaction(async tx => {
      const [session, viewer, existing, profile, status] = await Promise.all([
        tx.get(sessionRef), tx.get(viewerRef), tx.get(requestRef), tx.get(profileRef), tx.get(statusRef),
      ]);
      if (!session.exists || session.data()?.status !== 'live') throw new HttpsError('failed-precondition', 'This live room is no longer active.');
      if (session.data()?.hostId === guestId) throw new HttpsError('failed-precondition', 'The host is already on stage.');
      const connections = viewer.data()?.connectionIds;
      if (!viewer.exists || !Array.isArray(connections) || !connections.includes(connectionId)) {
        throw new HttpsError('permission-denied', 'Join the live room before requesting stage access.');
      }
      if (accountRestricted(status.data(), 'suspended') || accountRestricted(status.data(), 'postingRestricted')) {
        throw new HttpsError('permission-denied', 'This account cannot request live stage access.');
      }
      const current = existing.data()?.status;
      if (current === 'pending' || current === 'approved') return { sessionId, status: current as 'pending' | 'approved', replayed: true };
      const guestName = String(profile.data()?.name || profile.data()?.username || 'NEXORA member').slice(0, 80);
      tx.set(requestRef, {
        guestId, guestName, status: 'pending', requestedAt: FieldValue.serverTimestamp(),
        reviewedAt: null, updatedAt: FieldValue.serverTimestamp(),
      });
      return { sessionId, status: 'pending' as const, replayed: false };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'Your stage request could not be sent. Please retry.');
  }
});

export const reviewLiveGuestAccess = onCall({ maxInstances: 10 }, async request => {
  const hostId = uid(request);
  const sessionId = valid(() => validateLiveSessionId(request.data?.sessionId));
  const guestId = valid(() => validateLiveGuestId(request.data?.guestId));
  const decision = valid(() => validateLiveGuestDecision(request.data?.decision));
  const sessionRef = sessions.doc(sessionId);
  const requestRef = sessionRef.collection('guestRequests').doc(guestId);
  try {
    return await db.runTransaction(async tx => {
      const [session, guestRequest] = await Promise.all([tx.get(sessionRef), tx.get(requestRef)]);
      if (!session.exists || session.data()?.hostId !== hostId) throw new HttpsError('permission-denied', 'Only the live room host can review stage requests.');
      if (session.data()?.status !== 'live') throw new HttpsError('failed-precondition', 'This live room has already ended.');
      if (!guestRequest.exists || guestRequest.data()?.status !== 'pending') throw new HttpsError('failed-precondition', 'This guest request is no longer pending.');
      tx.update(requestRef, { status: decision, reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
      return { sessionId, guestId, status: decision, updated: true as const };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'The guest request could not be reviewed. Please retry.');
  }
});

export const heartbeatLiveSession = onCall({ maxInstances: 20 }, async request => {
  const viewerId = uid(request);
  const sessionId = valid(() => validateLiveSessionId(request.data?.sessionId));
  const connectionId = valid(() => validateLiveConnectionId(request.data?.connectionId));
  const sessionRef = sessions.doc(sessionId);
  const viewerRef = db.collection('liveSessionViewers').doc(rateDocId(sessionId, viewerId));
  try {
    return await db.runTransaction(async tx => {
      const [session, viewer] = await Promise.all([tx.get(sessionRef), tx.get(viewerRef)]);
      if (!session.exists || session.data()?.status !== 'live') throw new HttpsError('failed-precondition', 'This live room has ended.');
      const connections = Array.isArray(viewer.data()?.connectionIds) ? viewer.data()!.connectionIds : [];
      if (session.data()?.hostId === viewerId) {
        tx.update(sessionRef, { hostLastSeenAt: FieldValue.serverTimestamp(), hostExpiresAt: Timestamp.fromMillis(Date.now() + 90_000), updatedAt: FieldValue.serverTimestamp() });
        return { sessionId, active: true };
      }
      if (!viewer.exists || !connections.includes(connectionId)) throw new HttpsError('permission-denied', 'Join this live room before sending a heartbeat.');
      tx.update(viewerRef, { lastSeenAt: FieldValue.serverTimestamp(), expiresAt: Timestamp.fromMillis(Date.now() + 90_000) });
      return { sessionId, active: true };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'Your live connection could not be refreshed.');
  }
});
export const leaveLiveSession = onCall({ maxInstances: 20 }, async request => {
  const viewerId = uid(request);
  const sessionId = valid(() => validateLiveSessionId(request.data?.sessionId));
  const connectionId = valid(() => validateLiveConnectionId(request.data?.connectionId));
  const sessionRef = sessions.doc(sessionId);
  const viewerRef = db.collection('liveSessionViewers').doc(rateDocId(sessionId, viewerId));
  try {
    return await db.runTransaction(async tx => {
      const [session, viewer] = await Promise.all([tx.get(sessionRef), tx.get(viewerRef)]);
      if (!viewer.exists) return { sessionId, left: true, viewerCount: Math.max(0, Number(session.data()?.viewerCount || 0)) };
      const rawConnections: unknown = viewer.data()?.connectionIds;
      const connections: string[] = Array.isArray(rawConnections)
        ? rawConnections.filter((item: unknown): item is string => typeof item === 'string')
        : [];
      if (!connections.includes(connectionId)) {
        return { sessionId, left: true, viewerCount: Math.max(0, Number(session.data()?.viewerCount || 0)) };
      }
      const remaining = connections.filter((item: string) => item !== connectionId);
      if (remaining.length > 0) {
        tx.update(viewerRef, { connectionIds: remaining, updatedAt: FieldValue.serverTimestamp() });
        return { sessionId, left: true, viewerCount: Number(session.data()?.viewerCount || 0) };
      }
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
  const connectionId = valid(() => validateLiveConnectionId(request.data?.connectionId));
  const message = valid(() => validateLiveChatMessage(request.data?.message));
  const sessionRef = sessions.doc(sessionId);
  const profileRef = db.collection('users').doc(senderId);
  const viewerRef = db.collection('liveSessionViewers').doc(rateDocId(sessionId, senderId));
  const statusRef = db.collection('accountStatus').doc(senderId);
  const rateRef = db.collection('liveChatRateLimits').doc(rateDocId(sessionId, senderId));
  const moderationRef = sessionRef.collection('moderation').doc(senderId);
  const moderation = await moderationRef.get();
  if (moderation.data()?.banned === true) throw new HttpsError('permission-denied', 'You are not allowed to participate in this live room.');
  if (moderation.data()?.chatMuted === true) throw new HttpsError('permission-denied', 'The host has temporarily muted your live chat.');
  const messageRef = sessionRef.collection('messages').doc();
  try {
    return await db.runTransaction(async tx => {
      const [session, profile, status, rate, viewer] = await Promise.all([
        tx.get(sessionRef), tx.get(profileRef), tx.get(statusRef), tx.get(rateRef), tx.get(viewerRef),
      ]);
      if (!session.exists || session.data()?.status !== 'live') throw new HttpsError('failed-precondition', 'This live room is no longer active.');
      if (session.data()?.chatEnabled !== true) throw new HttpsError('failed-precondition', 'Live chat is disabled for this room.');
      const connections = Array.isArray(viewer.data()?.connectionIds) ? viewer.data()!.connectionIds : [];
      if (session.data()?.hostId !== senderId && (!viewer.exists || !connections.includes(connectionId))) throw new HttpsError('permission-denied', 'Join this live room before chatting.');
      if (accountRestricted(status.data(), 'suspended') || accountRestricted(status.data(), 'messagingRestricted')) {
        throw new HttpsError('permission-denied', 'This account cannot send live chat messages.');
      }
      const rateData = rate.data();
      const currentRate = rate.exists ? {
        windowStartedAtMs: rateData?.windowStartedAt?.toMillis?.() || 0,
        messageCount: Number.isSafeInteger(rateData?.messageCount) ? Number(rateData?.messageCount) : 0,
      } : null;
      let nextRate: ReturnType<typeof nextLiveChatRateState>;
      try { nextRate = nextLiveChatRateState(currentRate, Date.now()); }
      catch (error) { throw new HttpsError('resource-exhausted', error instanceof Error ? error.message : 'You are sending messages too quickly.'); }
      const profileData = profile.data() || {};
      const senderName = String(profileData.name || profileData.username || 'NEXORA member').slice(0, 80);
      tx.set(rateRef, { windowStartedAt: Timestamp.fromMillis(nextRate.windowStartedAtMs), messageCount: nextRate.messageCount, expireAt: Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000), updatedAt: FieldValue.serverTimestamp() });
      tx.create(messageRef, { senderId, senderName, message, createdAt: FieldValue.serverTimestamp() });
      return { messageId: messageRef.id, sessionId, senderId, senderName, message, status: 'sent' as const };
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('unavailable', 'Your live chat message could not be sent. Please retry.');
  }
});

async function endExpiredHostSessions() {
  const now = Timestamp.now();
  const expired = await sessions.where('status', '==', 'live').where('hostExpiresAt', '<=', now).limit(100).get();
  for (const sessionDoc of expired.docs) {
    await db.runTransaction(async tx => {
      const snapshot = await tx.get(sessionDoc.ref);
      if (!snapshot.exists || snapshot.data()?.status !== 'live') return;
      const expiresAt = snapshot.data()?.hostExpiresAt?.toMillis?.() || 0;
      if (expiresAt > Date.now()) return;
      tx.update(sessionDoc.ref, { status: 'ended', viewerCount: 0, endedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), endReason: 'host_connection_expired' });
    });
  }
}
export const reconcileLiveSessionViewers = onSchedule({
  schedule: 'every 1 minutes', timeZone: 'Africa/Lagos', maxInstances: 1,
}, async () => {
  await endExpiredHostSessions();
  const now = Timestamp.now();
  const expired = await db.collection('liveSessionViewers').where('expiresAt', '<=', now).limit(500).get();
  for (const viewerDoc of expired.docs) {
    const sessionId = viewerDoc.data().sessionId;
    if (typeof sessionId !== 'string') { await viewerDoc.ref.delete(); continue; }
    const sessionRef = sessions.doc(sessionId);
    await db.runTransaction(async tx => {
      const [viewer, session] = await Promise.all([tx.get(viewerDoc.ref), tx.get(sessionRef)]);
      if (!viewer.exists) return;
      const expiresAt = viewer.data()?.expiresAt?.toMillis?.() || 0;
      if (expiresAt > Date.now()) return;
      tx.delete(viewerDoc.ref);
      if (session.exists && session.data()?.status === 'live' && viewer.data()?.viewerId !== session.data()?.hostId) {
        const count = Number.isSafeInteger(session.data()?.viewerCount) && session.data()!.viewerCount > 0 ? session.data()!.viewerCount : 0;
        tx.update(sessionRef, { viewerCount: Math.max(0, count - 1), updatedAt: FieldValue.serverTimestamp() });
      }
    });
  }
});
