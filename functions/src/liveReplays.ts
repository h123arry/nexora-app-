import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { defineSecret, defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { createLiveKitJwt } from './liveKitTokenPolicy.js';
import { canWatchLiveReplay, isSafeLiveReplayObjectPath } from './liveReplaysPolicy.js';

export const liveKitApiKey = defineSecret('LIVEKIT_API_KEY');
export const liveKitApiSecret = defineSecret('LIVEKIT_API_SECRET');
const gcsCredentials = defineSecret('LIVE_REPLAY_GCS_CREDENTIALS');
const replayBucket = defineString('LIVE_REPLAY_GCS_BUCKET');
const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const sessions = db.collection('liveSessions');
const DEFAULT_LIVEKIT_URL = 'wss://nexora-live-is43sh5r.livekit.cloud';
const SIGNED_URL_TTL_MS = 2 * 60 * 60 * 1000;

type EgressFileResult = { filename?: string; location?: string; duration?: number; size?: number };
type EgressResult = { egress_id?: string; status?: string; file_results?: EgressFileResult[]; items?: EgressResult[] };

function requireUid(request: { auth?: { uid: string } | null }): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to manage live recordings.');
  return request.auth.uid;
}
function liveKitBaseUrl(): string {
  return (process.env.LIVEKIT_URL?.trim() || DEFAULT_LIVEKIT_URL).replace(/^wss:/i, 'https:').replace(/\/$/, '');
}
function egressToken(): string {
  const key = liveKitApiKey.value();
  const secret = liveKitApiSecret.value();
  if (!key || !secret) throw new HttpsError('failed-precondition', 'Live recording is not configured on the server.');
  const now = Math.floor(Date.now() / 1000);
  return createLiveKitJwt({
    iss: key, sub: 'nexora-live-recording', nbf: now - 5, iat: now, exp: now + 120,
    video: { roomRecord: true },
  }, secret);
}
async function egressRequest<T extends EgressResult>(method: 'StartEgress' | 'StopEgress' | 'ListEgress', payload: Record<string, unknown>): Promise<T> {
  const response = await fetch(liveKitBaseUrl() + '/twirp/livekit.Egress/' + method, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + egressToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error('LiveKit Egress request failed (' + response.status + '): ' + detail.slice(0, 300));
  }
  return await response.json() as T;
}
function safeObjectPath(value: unknown): string | null { return isSafeLiveReplayObjectPath(value) ? value : null; }

/** Stop an active recording when a host ends a room or the host lease expires. */
export async function stopLiveRecordingForSession(sessionId: string): Promise<void> {
  const sessionRef = sessions.doc(sessionId);
  const snapshot = await sessionRef.get();
  const recording = snapshot.data()?.recording as Record<string, unknown> | undefined;
  const egressId = typeof recording?.egressId === 'string' ? recording.egressId : '';
  if (!egressId || !['starting', 'recording', 'stop_requested', 'stop_failed'].includes(String(recording?.status))) return;
  try {
    const result = await egressRequest<EgressResult>('StopEgress', { egress_id: egressId });
    const filename = result.file_results?.[0]?.filename;
    await sessionRef.update({
      'recording.status': result.status === 'EGRESS_COMPLETE' ? 'completed' : 'processing',
      'recording.objectPath': safeObjectPath(filename) || recording?.objectPath || null,
      'recording.completedAt': result.status === 'EGRESS_COMPLETE' ? FieldValue.serverTimestamp() : null,
      'recording.stopRequestedAt': FieldValue.serverTimestamp(),
      'recording.updatedAt': FieldValue.serverTimestamp(),
    });
  } catch {
    await sessionRef.update({ 'recording.status': 'stop_failed', 'recording.stopRequestedAt': FieldValue.serverTimestamp(), 'recording.updatedAt': FieldValue.serverTimestamp() });
  }
}

export const startLiveRecording = onCall(
  { region: 'europe-west1', secrets: [liveKitApiKey, liveKitApiSecret, gcsCredentials], maxInstances: 5 },
  async request => {
    const hostId = requireUid(request);
    const sessionId = typeof request.data?.sessionId === 'string' ? request.data.sessionId.trim() : '';
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(sessionId)) throw new HttpsError('invalid-argument', 'The live room ID is invalid.');
    const sessionRef = sessions.doc(sessionId);
    const session = await sessionRef.get();
    if (!session.exists || session.data()?.hostId !== hostId) throw new HttpsError('permission-denied', 'Only the host can record this live room.');
    if (session.data()?.status !== 'live') throw new HttpsError('failed-precondition', 'Only an active live room can be recorded.');
    const bucket = replayBucket.value().trim();
    if (!bucket || bucket.includes('/') || bucket.includes('..')) throw new HttpsError('failed-precondition', 'The private replay bucket has not been configured.');
    let credentials: Record<string, unknown>;
    try { credentials = JSON.parse(gcsCredentials.value()) as Record<string, unknown>; }
    catch { throw new HttpsError('failed-precondition', 'The replay storage service account secret is invalid.'); }
    if (credentials.type !== 'service_account' || typeof credentials.client_email !== 'string' || typeof credentials.private_key !== 'string') {
      throw new HttpsError('failed-precondition', 'The replay storage secret must contain a Google Cloud service-account JSON key.');
    }
    const reservation = await db.runTransaction(async tx => {
      const current = await tx.get(sessionRef);
      if (!current.exists || current.data()?.hostId !== hostId || current.data()?.status !== 'live') {
        throw new HttpsError('failed-precondition', 'This live room is no longer available for recording.');
      }
      const existing = current.data()?.recording as Record<string, unknown> | undefined;
      if (existing && ['starting', 'recording', 'processing', 'completed'].includes(String(existing.status))) {
        return { start: false as const, status: String(existing.status) };
      }
      tx.update(sessionRef, {
        recording: { status: 'starting', startedBy: hostId, startedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() },
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { start: true as const, status: 'starting' };
    });
    if (!reservation.start) return { sessionId, status: reservation.status, replayed: true };
    try {
      const roomName = 'nexora_' + sessionId;
      const result = await egressRequest<EgressResult>('StartEgress', {
        room_name: roomName,
        template: { layout: 'grid-dark' },
        outputs: [{ file: { file_type: 'MP4', filepath: 'nexora-live/' + sessionId + '/{time}.mp4' } }],
        storage: { gcp: { credentials: JSON.stringify(credentials), bucket } },
      });
      if (!result.egress_id) throw new Error('LiveKit did not return a recording job ID.');
      await sessionRef.update({
        recording: {
          status: 'recording', egressId: result.egress_id, startedBy: hostId,
          startedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
          bucket, objectPath: null,
        },
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { sessionId, status: 'recording' as const, egressId: result.egress_id, replayed: false };
    } catch (error) {
      await sessionRef.update({ 'recording.status': 'failed', 'recording.failureCode': 'egress_start_failed', 'recording.updatedAt': FieldValue.serverTimestamp() });
      throw new HttpsError('unavailable', error instanceof Error ? error.message.slice(0, 240) : 'The live recording could not be started.');
    }
  },
);

export const stopLiveRecording = onCall(
  { region: 'europe-west1', secrets: [liveKitApiKey, liveKitApiSecret], maxInstances: 5 },
  async request => {
    const hostId = requireUid(request);
    const sessionId = typeof request.data?.sessionId === 'string' ? request.data.sessionId.trim() : '';
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(sessionId)) throw new HttpsError('invalid-argument', 'The live room ID is invalid.');
    const sessionRef = sessions.doc(sessionId);
    const session = await sessionRef.get();
    if (!session.exists || session.data()?.hostId !== hostId) throw new HttpsError('permission-denied', 'Only the host can stop this recording.');
    await stopLiveRecordingForSession(sessionId);
    const latest = await sessionRef.get();
    const status = String(latest.data()?.recording?.status || 'not_started');
    if (status === 'stop_failed') throw new HttpsError('unavailable', 'The recording could not be stopped. Please retry.');
    return { sessionId, status, stopped: true as const };
  },
);

export const getLiveReplayPlayback = onCall(
  { region: 'europe-west1', secrets: [liveKitApiKey, liveKitApiSecret], maxInstances: 10 },
  async request => {
    const userId = requireUid(request);
    const sessionId = typeof request.data?.sessionId === 'string' ? request.data.sessionId.trim() : '';
    if (!/^[A-Za-z0-9_-]{10,128}$/.test(sessionId)) throw new HttpsError('invalid-argument', 'The live room ID is invalid.');
    const sessionRef = sessions.doc(sessionId);
    const session = await sessionRef.get();
    if (!session.exists || session.data()?.status !== 'ended') throw new HttpsError('failed-precondition', 'This replay is not available yet.');
    const data = session.data()!;
    const audience = data.hostId === userId ? null : await sessionRef.collection('audience').doc(userId).get();
    if (!canWatchLiveReplay(String(data.hostId || ''), userId, audience?.exists === true)) throw new HttpsError('permission-denied', 'Only the host and people who attended this live room can watch its replay.');
    const recording = data.recording as Record<string, unknown> | undefined;
    const egressId = typeof recording?.egressId === 'string' ? recording.egressId : '';
    if (!egressId || !['recording', 'processing', 'completed', 'stop_failed'].includes(String(recording?.status))) {
      throw new HttpsError('not-found', 'This live room has no completed recording.');
    }
    let objectPath = safeObjectPath(recording?.objectPath);
    try {
      const response = await egressRequest<EgressResult>('ListEgress', { egress_id: egressId });
      const result = response.items?.[0] || response;
      const completed = result.file_results?.find(file => typeof file.filename === 'string');
      if (completed?.filename) objectPath = safeObjectPath(completed.filename);
      if (result.status === 'EGRESS_COMPLETE' && objectPath) {
        await sessionRef.update({ 'recording.status': 'completed', 'recording.objectPath': objectPath, 'recording.completedAt': FieldValue.serverTimestamp(), 'recording.updatedAt': FieldValue.serverTimestamp() });
      } else {
        throw new HttpsError('failed-precondition', 'Your replay is still being processed. Please try again shortly.');
      }
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('unavailable', 'Replay processing status could not be checked. Please retry.');
    }
    if (!objectPath) throw new HttpsError('not-found', 'The completed replay file could not be located.');
    const bucket = replayBucket.value().trim();
    if (!bucket) throw new HttpsError('failed-precondition', 'Replay storage is not configured.');
    try {
      const [url] = await getStorage(getFirebaseAdminApp()).bucket(bucket).file(objectPath).getSignedUrl({
        action: 'read', expires: Date.now() + SIGNED_URL_TTL_MS, version: 'v4',
      });
      return { sessionId, url, expiresAt: Date.now() + SIGNED_URL_TTL_MS };
    } catch {
      throw new HttpsError('unavailable', 'The replay file is not accessible yet. Check the replay storage permissions.');
    }
  },
);
