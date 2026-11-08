import { createHash, createHmac } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const apiKey = defineSecret('LIVEKIT_API_KEY');
const apiSecret = defineSecret('LIVEKIT_API_SECRET');
const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const TOKEN_TTL_SECONDS = 10 * 60;

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}
function issueToken(claims: Record<string, unknown>, secret: string): string {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode(claims);
  const unsigned = header + '.' + payload;
  const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
  return unsigned + '.' + signature;
}

/**
 * Issues short-lived LiveKit credentials only after deriving identity, room and
 * publish permissions from Firebase Auth and the server-owned live session.
 * The browser never receives the LiveKit API secret.
 */
export const getLiveKitToken = onCall(
  { secrets: [apiKey, apiSecret], maxInstances: 20 },
  async request => {
    const userId = request.auth?.uid;
    if (!userId) throw new HttpsError('unauthenticated', 'Sign in to connect to NEXORA Live.');
    const sessionId = typeof request.data?.sessionId === 'string' ? request.data.sessionId.trim() : '';
    const connectionId = typeof request.data?.connectionId === 'string' ? request.data.connectionId.trim() : '';
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(sessionId) || !/^[A-Za-z0-9_-]{8,100}$/.test(connectionId)) {
      throw new HttpsError('invalid-argument', 'The live room connection is invalid.');
    }
    const sessionRef = db.collection('liveSessions').doc(sessionId);
    const [session, account] = await Promise.all([
      sessionRef.get(),
      db.collection('accountStatus').doc(userId).get(),
    ]);
    if (!session.exists || session.data()?.status !== 'live') {
      throw new HttpsError('failed-precondition', 'This live room is not active.');
    }
    const restricted = account.data() || {};
    const activeRestriction = (field: string) => {
      if (!restricted[field]) return false;
      const expiry = restricted.expiresAt?.toMillis?.();
      return !expiry || expiry > Date.now();
    };
    if (activeRestriction('suspended')) throw new HttpsError('permission-denied', 'This account cannot join live video.');
    const roomName = 'nexora_' + sessionId;
    const isHost = session.data()?.hostId === userId;
    if (!isHost) {
      const viewerId = createHash('sha256').update(sessionId + ':' + userId).digest('hex');
      const viewer = await db.collection('liveSessionViewers').doc(viewerId).get();
      const connections: unknown = viewer.data()?.connectionIds;
      if (!viewer.exists || !Array.isArray(connections) || !connections.includes(connectionId)) {
        throw new HttpsError('permission-denied', 'Join this live room before connecting to its video.');
      }
    }
    const key = apiKey.value();
    const secret = apiSecret.value();
    const wsUrl = process.env.LIVEKIT_URL?.trim();
    if (!key || !secret || !wsUrl || !/^wss:\/\//i.test(wsUrl)) {
      throw new HttpsError('failed-precondition', 'NEXORA Live video is not configured by the server yet.');
    }
    const now = Math.floor(Date.now() / 1000);
    const token = issueToken({
      iss: key,
      sub: userId,
      nbf: now - 5,
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
      name: String(session.data()?.hostName || 'NEXORA member').slice(0, 80),
      video: {
        roomJoin: true,
        room: roomName,
        canPublish: isHost,
        canPublishData: true,
        canSubscribe: true,
        canUpdateOwnMetadata: false,
      },
    }, secret);
    await sessionRef.update({ videoTransport: 'livekit', videoTransportConnectedAt: new Date() });
    return { token, wsUrl, roomName, role: isHost ? 'host' : 'viewer', expiresAt: (now + TOKEN_TTL_SECONDS) * 1000 };
  },
);
