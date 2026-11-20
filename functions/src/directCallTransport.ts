import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { defineSecret } from 'firebase-functions/params';
import { HttpsError } from 'firebase-functions/v2/https';
import { onCallWithSession as onCall } from './callableSession.js';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { directCallRoomName, createDirectCallVideoGrant, validateDirectCallRequest } from './directCallPolicy.js';
import { createLiveKitJwt } from './liveKitTokenPolicy.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const apiKey = defineSecret('LIVEKIT_API_KEY');
const apiSecret = defineSecret('LIVEKIT_API_SECRET');
const DEFAULT_LIVEKIT_URL = 'wss://nexora-live-is43sh5r.livekit.cloud';
const CALL_RING_SECONDS = 45;
const TOKEN_TTL_SECONDS = 10 * 60;
const ACTIVE_CALL_MAX_MS = 12 * 60 * 60 * 1000;

function asText(value: unknown, max = 120): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function accountIsRestricted(data: Record<string, any> | undefined, field: string): boolean {
  if (!data?.[field]) return false;
  const expiry = data.expiresAt?.toMillis?.();
  return !expiry || expiry > Date.now();
}

async function assertCanCall(callerId: string, recipientId: string, chatId: string): Promise<{ callerName: string; recipientName: string }> {
  const chatRef = db.collection('chats').doc(chatId);
  const callerStatusRef = db.collection('accountStatus').doc(callerId);
  const recipientStatusRef = db.collection('accountStatus').doc(recipientId);
  const callerRef = db.collection('users').doc(callerId);
  const recipientRef = db.collection('users').doc(recipientId);
  const [chat, callerStatus, recipientStatus, caller, recipient, recipientPreferences, callerPreferences] = await Promise.all([
    chatRef.get(), callerStatusRef.get(), recipientStatusRef.get(), callerRef.get(), recipientRef.get(),
    recipientRef.collection('settings').doc('preferences').get(),
    callerRef.collection('settings').doc('preferences').get(),
  ]);
  if (!chat.exists) throw new HttpsError('not-found', 'This conversation could not be found.');
  const participants = chat.data()?.participants;
  if (!Array.isArray(participants) || participants.length !== 2 || !participants.includes(callerId) || !participants.includes(recipientId)) {
    throw new HttpsError('permission-denied', 'Calls are only available in a private one-to-one conversation.');
  }
  if (accountIsRestricted(callerStatus.data(), 'suspended') || accountIsRestricted(callerStatus.data(), 'messagingRestricted')) {
    throw new HttpsError('permission-denied', 'This account cannot place calls right now.');
  }
  if (accountIsRestricted(recipientStatus.data(), 'suspended') || accountIsRestricted(recipientStatus.data(), 'messagingRestricted')) {
    throw new HttpsError('failed-precondition', 'This person cannot receive calls right now.');
  }
  const recipientPrefs = recipientPreferences.data() || {};
  const callerPrefs = callerPreferences.data() || {};
  const recipientMessaging = recipientPrefs.messaging || {};
  const callerMessaging = callerPrefs.messaging || {};
  if (recipientPrefs.privacy?.allowDms === false
    || (Array.isArray(recipientMessaging.blockedUserIds) && recipientMessaging.blockedUserIds.includes(callerId))
    || (Array.isArray(callerMessaging.blockedUserIds) && callerMessaging.blockedUserIds.includes(recipientId))) {
    throw new HttpsError('permission-denied', 'This person is not available for calls from this account.');
  }
  const callerData = caller.data() || {};
  const recipientData = recipient.data() || {};
  return {
    callerName: asText(callerData.name || callerData.displayName || callerData.username, 80) || 'NEXORA member',
    recipientName: asText(recipientData.name || recipientData.displayName || recipientData.username, 80) || 'NEXORA member',
  };
}

async function sendIncomingCallPush(recipientId: string, payload: Record<string, string>): Promise<void> {
  const [tokens, preferences] = await Promise.all([
    db.collection('users').doc(recipientId).collection('pushTokens').get(),
    db.collection('users').doc(recipientId).collection('settings').doc('preferences').get(),
  ]);
  if (preferences.data()?.notifications?.push === false) return;
  const tokenValues = tokens.docs.map(doc => doc.data().token).filter((token): token is string =>
    typeof token === 'string' && token.length >= 20 && token.length <= 4096
  );
  if (!tokenValues.length) return;
  const messaging = getMessaging(getFirebaseAdminApp());
  for (let i = 0; i < tokenValues.length; i += 500) {
    await messaging.sendEachForMulticast({
      tokens: tokenValues.slice(i, i + 500),
      data: payload,
      android: { priority: 'high', ttl: CALL_RING_SECONDS * 1000 },
      webpush: { headers: { Urgency: 'high', TTL: String(CALL_RING_SECONDS) }, notification: { requireInteraction: true, tag: 'nexora-call-' + payload.callId } },
    });
  }
}

export const startDirectCall = onCall({ region: 'europe-west1', maxInstances: 30 }, async request => {
  const callerId = request.auth?.uid;
  if (!callerId) throw new HttpsError('unauthenticated', 'Sign in before placing a call.');
  const recipientId = asText(request.data?.recipientId, 128);
  const checked = validateDirectCallRequest({
    callId: request.data?.callId,
    chatId: request.data?.chatId,
    callerId,
    recipientId,
    type: request.data?.type,
  });
  const names = await assertCanCall(callerId, recipientId, checked.chatId);
  const callRef = db.collection('directCalls').doc(checked.callId);
  const roomName = directCallRoomName(checked.callId);
  const now = Date.now();
  const callRecord = {
    id: checked.callId,
    chatId: checked.chatId,
    callerId,
    recipientId,
    participants: [callerId, recipientId],
    type: checked.type,
    status: 'ringing',
    roomName,
    callerName: names.callerName,
    recipientName: names.recipientName,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + CALL_RING_SECONDS * 1000,
  };
  const callerActiveRef = db.collection('activeDirectCalls').doc(callerId);
  const recipientActiveRef = db.collection('activeDirectCalls').doc(recipientId);
  await db.runTransaction(async tx => {
    const [existing, callerActive, recipientActive] = await Promise.all([
      tx.get(callRef), tx.get(callerActiveRef), tx.get(recipientActiveRef),
    ]);
    if (existing.exists) throw new HttpsError('already-exists', 'This call has already been started.');
    if (callerActive.exists && Number(callerActive.data()?.expiresAt || 0) > now) {
      throw new HttpsError('already-exists', 'You are already in another call.');
    }
    if (recipientActive.exists && Number(recipientActive.data()?.expiresAt || 0) > now) {
      throw new HttpsError('failed-precondition', 'This person is already in another call.');
    }
    if (callerActive.exists) tx.delete(callerActiveRef);
    if (recipientActive.exists) tx.delete(recipientActiveRef);
    tx.create(callRef, callRecord);
    tx.set(callerActiveRef, { callId: checked.callId, status: 'ringing', expiresAt: callRecord.expiresAt });
    tx.set(recipientActiveRef, { callId: checked.callId, status: 'ringing', expiresAt: callRecord.expiresAt });
  });
  try {
    await sendIncomingCallPush(recipientId, {
      type: 'incoming_call',
      callId: checked.callId,
      chatId: checked.chatId,
      callerId,
      callerName: names.callerName,
      callType: checked.type,
      url: '/#inbox',
    });
  } catch (error) {
    console.error('[NEXORA calls] Incoming call push delivery failed.', error);
  }
  return { callId: checked.callId, status: 'ringing' as const, expiresAt: callRecord.expiresAt };
});

export const respondToDirectCall = onCall({ region: 'europe-west1', maxInstances: 30 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to answer this call.');
  const callId = asText(request.data?.callId, 128);
  const decision = request.data?.decision;
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(callId) || !['accept', 'decline'].includes(decision)) {
    throw new HttpsError('invalid-argument', 'The call response is invalid.');
  }
  const ref = db.collection('directCalls').doc(callId);
  const result = await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) throw new HttpsError('not-found', 'This call is no longer available.');
    const call = snapshot.data() as any;
    if (call.recipientId !== uid || call.status !== 'ringing') throw new HttpsError('permission-denied', 'Only the invited person can answer this call.');
    const callerPointer = db.collection('activeDirectCalls').doc(call.callerId);
    const recipientPointer = db.collection('activeDirectCalls').doc(call.recipientId);
    const [callerActive, recipientActive] = await Promise.all([tx.get(callerPointer), tx.get(recipientPointer)]);
    const now = Date.now();
    if (call.expiresAt <= now) {
      tx.update(ref, { status: 'missed', updatedAt: now, endedAt: now });
      if (callerActive.data()?.callId === callId) tx.delete(callerPointer);
      if (recipientActive.data()?.callId === callId) tx.delete(recipientPointer);
      return { status: 'missed' as const };
    }
    if (callerActive.data()?.callId !== callId || recipientActive.data()?.callId !== callId) {
      throw new HttpsError('failed-precondition', 'This call is no longer active.');
    }
    const status = decision === 'accept' ? 'accepted' : 'declined';
    tx.update(ref, { status, updatedAt: now, ...(status === 'declined' ? { endedAt: now } : { acceptedAt: now, expiresAt: now + ACTIVE_CALL_MAX_MS }) });
    if (status === 'accepted') {
      tx.set(callerPointer, { callId, status: 'accepted', expiresAt: now + ACTIVE_CALL_MAX_MS });
      tx.set(recipientPointer, { callId, status: 'accepted', expiresAt: now + ACTIVE_CALL_MAX_MS });
    } else {
      tx.delete(callerPointer);
      tx.delete(recipientPointer);
    }
    return { status };
  });
  return result;
});

export const endDirectCall = onCall({ region: 'europe-west1', maxInstances: 30 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to end this call.');
  const callId = asText(request.data?.callId, 128);
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(callId)) throw new HttpsError('invalid-argument', 'The call ID is invalid.');
  const ref = db.collection('directCalls').doc(callId);
  const result = await db.runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (!snapshot.exists) return { ended: true };
    const call = snapshot.data() as any;
    if (call.callerId !== uid && call.recipientId !== uid) throw new HttpsError('permission-denied', 'You are not part of this call.');
    const callerPointer = db.collection('activeDirectCalls').doc(call.callerId);
    const recipientPointer = db.collection('activeDirectCalls').doc(call.recipientId);
    const [callerActive, recipientActive] = await Promise.all([tx.get(callerPointer), tx.get(recipientPointer)]);
    const now = Date.now();
    if (['ringing', 'accepted'].includes(call.status)) {
      const status = call.status === 'accepted' ? 'ended' : call.callerId === uid ? 'missed' : 'declined';
      tx.update(ref, { status, updatedAt: now, endedAt: now });
    }
    if (callerActive.data()?.callId === callId) tx.delete(callerPointer);
    if (recipientActive.data()?.callId === callId) tx.delete(recipientPointer);
    return { ended: true };
  });
  return result;
});

export const getDirectCallToken = onCall({ region: 'europe-west1', secrets: [apiKey, apiSecret], maxInstances: 30 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to connect to this call.');
  const callId = asText(request.data?.callId, 128);
  if (!/^[A-Za-z0-9_-]{12,128}$/.test(callId)) throw new HttpsError('invalid-argument', 'The call ID is invalid.');
  const snapshot = await db.collection('directCalls').doc(callId).get();
  if (!snapshot.exists) throw new HttpsError('not-found', 'This call could not be found.');
  const call = snapshot.data() as any;
  if (!Array.isArray(call.participants) || !call.participants.includes(uid) || ![call.callerId, call.recipientId].includes(uid)) {
    throw new HttpsError('permission-denied', 'You are not part of this call.');
  }
  if (call.status !== 'accepted') throw new HttpsError('failed-precondition', 'The other person has not answered yet.');
  const [callerStatus, recipientStatus] = await Promise.all([
    db.collection('accountStatus').doc(call.callerId).get(),
    db.collection('accountStatus').doc(call.recipientId).get(),
  ]);
  if (accountIsRestricted(callerStatus.data(), 'suspended') || accountIsRestricted(callerStatus.data(), 'messagingRestricted')
    || accountIsRestricted(recipientStatus.data(), 'suspended') || accountIsRestricted(recipientStatus.data(), 'messagingRestricted')) {
    throw new HttpsError('permission-denied', 'This call is no longer allowed for one of the accounts.');
  }
  const key = apiKey.value();
  const secret = apiSecret.value();
  const wsUrl = process.env.LIVEKIT_URL?.trim() || DEFAULT_LIVEKIT_URL;
  if (!key || !secret || !/^wss:\/\//i.test(wsUrl)) throw new HttpsError('failed-precondition', 'NEXORA calling is not configured on the server yet.');
  const now = Math.floor(Date.now() / 1000);
  const token = createLiveKitJwt({
    iss: key,
    sub: uid,
    nbf: now - 5,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
    name: uid === call.callerId ? call.callerName : call.recipientName,
    video: createDirectCallVideoGrant(call.roomName || directCallRoomName(callId)),
  }, secret);
  return { token, wsUrl, roomName: call.roomName || directCallRoomName(callId), expiresAt: (now + TOKEN_TTL_SECONDS) * 1000, callType: call.type };
});
