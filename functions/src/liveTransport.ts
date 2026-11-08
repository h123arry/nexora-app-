import { createHash } from 'node:crypto';
import { AccessToken } from 'livekit-server-sdk';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { resolveLiveTransportRole } from './liveTransportPolicy.js';
import { validateLiveConnectionId, validateLiveSessionId } from './liveSessionsPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const LIVEKIT_API_KEY = defineSecret('LIVEKIT_API_KEY');
const LIVEKIT_API_SECRET = defineSecret('LIVEKIT_API_SECRET');
const LIVEKIT_URL = defineString('LIVEKIT_URL', { default: '' });

function restricted(data: Record<string, any> | undefined, field: string): boolean {
  if (!data?.[field]) return false;
  const expiresAt = data.expiresAt?.toMillis?.();
  return !expiresAt || expiresAt > Date.now();
}

export const getLiveTransportToken = onCall({
  secrets: [LIVEKIT_API_KEY, LIVEKIT_API_SECRET],
  maxInstances: 20,
}, async request => {
  const userId = request.auth?.uid;
  if (!userId) throw new HttpsError('unauthenticated', 'Sign in before connecting to live video.');

  let sessionId: string;
  let connectionId: string;
  try {
    sessionId = validateLiveSessionId(request.data?.sessionId);
    connectionId = validateLiveConnectionId(request.data?.connectionId);
  } catch (error) {
    throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'Live transport details are invalid.');
  }

  const sessionRef = db.collection('liveSessions').doc(sessionId);
  const [sessionSnapshot, accountSnapshot] = await Promise.all([
    sessionRef.get(),
    db.collection('accountStatus').doc(userId).get(),
  ]);
  if (!sessionSnapshot.exists) throw new HttpsError('not-found', 'This live room is unavailable.');
  const session = sessionSnapshot.data() || {};
  const account = accountSnapshot.data() || {};
  if (restricted(account, 'suspended')) throw new HttpsError('permission-denied', 'This account cannot connect to live video.');

  const isHost = session.hostId === userId;
  if (isHost && restricted(account, 'postingRestricted')) {
    throw new HttpsError('permission-denied', 'This account cannot publish a live broadcast.');
  }

  const viewerRef = db.collection('liveSessionViewers').doc(
    createHash('sha256').update(sessionId + ':' + userId).digest('hex'),
  );
  const viewerSnapshot = isHost ? null : await viewerRef.get();
  const viewerData = viewerSnapshot?.data() || {};
  let role: 'host' | 'viewer';
  try {
    role = resolveLiveTransportRole({
      status: session.status,
      hostId: session.hostId,
      userId,
      connectionId,
      viewerConnectionIds: viewerData.connectionIds,
      viewerExpiresAtMs: viewerData.expiresAt?.toMillis?.() ?? null,
      hostExpiresAtMs: session.hostExpiresAt?.toMillis?.() ?? null,
      nowMs: Date.now(),
    });
  } catch (error) {
    throw new HttpsError('failed-precondition', error instanceof Error ? error.message : 'Live video access is unavailable.');
  }

  const apiKey = LIVEKIT_API_KEY.value().trim();
  const apiSecret = LIVEKIT_API_SECRET.value().trim();
  const serverUrl = LIVEKIT_URL.value().trim().replace(/\/$/, '');
  if (!apiKey || !apiSecret || !/^wss:\/\//i.test(serverUrl) && !/^ws:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(serverUrl)) {
    throw new HttpsError('failed-precondition', 'Live video transport is not configured for this environment. Chat and gifts remain available.');
  }

  const profile = await db.collection('users').doc(userId).get();
  const displayName = String(profile.data()?.username || profile.data()?.name || 'NEXORA member').slice(0, 80);
  const roomName = 'nexora-live-' + sessionId;
  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: displayName,
    ttl: '10m',
  });
  token.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: role === 'host',
    canSubscribe: true,
    canPublishData: role === 'host',
  });

  await sessionRef.update({
    videoTransport: 'livekit',
    videoTransportProvider: 'livekit',
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    provider: 'livekit' as const,
    serverUrl,
    roomName,
    role,
    participantToken: await token.toJwt(),
    expiresInSeconds: 600,
  };
});
