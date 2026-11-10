import { createHash } from 'node:crypto';
import { createLiveKitJwt } from './liveKitTokenPolicy.js';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const apiKey = defineSecret('LIVEKIT_API_KEY');
const apiSecret = defineSecret('LIVEKIT_API_SECRET');
const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());

type ModerationAction = 'mute_chat' | 'unmute_chat' | 'remove' | 'ban' | 'unban';
const validId = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9._-]{1,128}$/.test(value);

async function removeFromLiveKit(roomName: string, identity: string, key: string, secret: string, baseUrl: string) {
  const now = Math.floor(Date.now() / 1000);
  const token = createLiveKitJwt({
    iss: key, sub: 'nexora-moderation', nbf: now - 5, iat: now, exp: now + 60,
    video: { roomAdmin: true, room: roomName },
  }, secret);
  const response = await fetch(baseUrl.replace(/\/$/, '') + '/twirp/livekit.RoomService/RemoveParticipant', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ room: roomName, identity }),
  });
  if (!response.ok) throw new Error('LiveKit could not remove this participant.');
}

export const moderateLiveParticipant = onCall(
  { region: 'europe-west1', secrets: [apiKey, apiSecret], maxInstances: 10 },
  async request => {
    const hostId = request.auth?.uid;
    if (!hostId) throw new HttpsError('unauthenticated', 'Sign in to moderate a live room.');
    const sessionId = request.data?.sessionId;
    const participantId = request.data?.participantId;
    const action = request.data?.action as ModerationAction;
    if (!validId(sessionId) || !validId(participantId) ||
        !['mute_chat', 'unmute_chat', 'remove', 'ban', 'unban'].includes(action)) {
      throw new HttpsError('invalid-argument', 'The live moderation request is invalid.');
    }
    const sessionRef = db.collection('liveSessions').doc(sessionId);
    const [session, profile] = await Promise.all([
      sessionRef.get(), db.collection('users').doc(participantId).get(),
    ]);
    if (!session.exists || session.data()?.hostId !== hostId) {
      throw new HttpsError('permission-denied', 'Only the live room host can moderate participants.');
    }
    if (session.data()?.status !== 'live') throw new HttpsError('failed-precondition', 'This live room has ended.');
    if (participantId === hostId) throw new HttpsError('failed-precondition', 'The host cannot moderate themselves.');
    const viewerKey = createHashId(sessionId, participantId);
    const viewerRef = db.collection('liveSessionViewers').doc(viewerKey);
    const moderationRef = sessionRef.collection('moderation').doc(participantId);
    const existing = (await moderationRef.get()).data() || {};
    if (action === 'remove' || action === 'ban') {
      const key = apiKey.value();
      const secret = apiSecret.value();
      if (session.data()?.videoTransport === 'livekit' && key && secret) {
        try {
          const baseUrl = (process.env.LIVEKIT_URL || 'wss://nexora-live-is43sh5r.livekit.cloud').replace(/^wss:/i, 'https:');
          await removeFromLiveKit('nexora_' + sessionId, participantId, key, secret, baseUrl);
        } catch {
          throw new HttpsError('unavailable', 'The participant could not be removed from the live video room. Please retry.');
        }
      }
    }
    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp(), updatedBy: hostId };
    if (action === 'mute_chat') update.chatMuted = true;
    if (action === 'unmute_chat') update.chatMuted = false;
    if (action === 'ban') { update.banned = true; update.chatMuted = true; update.bannedAt = FieldValue.serverTimestamp(); }
    if (action === 'unban') { update.banned = false; update.chatMuted = false; update.unbannedAt = FieldValue.serverTimestamp(); }
    if (action === 'remove') update.removedAt = FieldValue.serverTimestamp();
    await moderationRef.set(update, { merge: true });
    if (action === 'remove' || action === 'ban') {
      await viewerRef.delete();
      await sessionRef.collection('guestRequests').doc(participantId).set({
        guestId: participantId, guestName: String(profile.data()?.name || profile.data()?.username || 'NEXORA member').slice(0, 80),
        status: 'denied', reviewedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    await db.collection('liveModerationAudit').add({
      sessionId, hostId, participantId, action, createdAt: FieldValue.serverTimestamp(),
    });
    return { sessionId, participantId, action, updated: true as const };
  },
);

function createHashId(sessionId: string, userId: string) {
  return createHash('sha256').update(sessionId + ':' + userId).digest('hex');
}
