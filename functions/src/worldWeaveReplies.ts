import { getFirestore, FieldValue, type DocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_REPLY_LENGTH = 1000;
const MAX_REPLIES_PER_MOMENT = 500;

function requireId(value: unknown, label: string): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new HttpsError('invalid-argument', `A valid ${label} is required.`);
  }
  return value;
}
function requireMember(weave: DocumentSnapshot, uid: string) {
  const participants = Array.isArray(weave.get('participantIds')) ? weave.get('participantIds') as string[] : [];
  if (weave.get('ownerId') !== uid && !participants.includes(uid)) {
    throw new HttpsError('permission-denied', 'Join this WorldWeave before replying.');
  }
}
function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? Math.min(value, MAX_REPLIES_PER_MOMENT) : 0;
}

export const addWorldWeaveMomentReply = onCall({ maxInstances: 30 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to reply to this moment.');
  const weaveId = requireId(request.data?.weaveId, 'WorldWeave');
  const momentId = requireId(request.data?.momentId, 'moment');
  const text = typeof request.data?.text === 'string' ? request.data.text.trim() : '';
  if (!text || text.length > MAX_REPLY_LENGTH) {
    throw new HttpsError('invalid-argument', 'A reply must contain 1 to 1,000 characters.');
  }

  const weaveRef = db.collection('worldWeaves').doc(weaveId);
  const momentRef = weaveRef.collection('moments').doc(momentId);
  const profileRef = db.collection('publicProfiles').doc(uid);
  const replyRef = momentRef.collection('replies').doc();

  return db.runTransaction(async tx => {
    const [weave, moment, profile] = await Promise.all([tx.get(weaveRef), tx.get(momentRef), tx.get(profileRef)]);
    if (!weave.exists || !moment.exists || moment.get('weaveId') !== weaveId) {
      throw new HttpsError('not-found', 'This moment is no longer available.');
    }
    requireMember(weave, uid);
    if (!profile.exists) throw new HttpsError('failed-precondition', 'Your public NEXORA profile must be available before replying.');
    const count = safeCount(moment.get('replyCount'));
    if (count >= MAX_REPLIES_PER_MOMENT) {
      throw new HttpsError('resource-exhausted', 'This moment has reached its reply limit.');
    }
    const profileData = profile.data() || {};
    const authorName = String(profileData.name || profileData.username || 'NEXORA member').slice(0, 80);
    const authorUsername = String(profileData.username || '').slice(0, 40);
    tx.create(replyRef, {
      id: replyRef.id,
      weaveId,
      momentId,
      authorId: uid,
      authorName,
      authorUsername,
      text,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(momentRef, {
      replyCount: count + 1,
      repliesUpdatedAt: FieldValue.serverTimestamp(),
    });
    return { replyId: replyRef.id, replyCount: count + 1 };
  });
});

export const deleteWorldWeaveMomentReply = onCall({ maxInstances: 20 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to manage replies.');
  const weaveId = requireId(request.data?.weaveId, 'WorldWeave');
  const momentId = requireId(request.data?.momentId, 'moment');
  const replyId = requireId(request.data?.replyId, 'reply');

  const weaveRef = db.collection('worldWeaves').doc(weaveId);
  const momentRef = weaveRef.collection('moments').doc(momentId);
  const replyRef = momentRef.collection('replies').doc(replyId);

  return db.runTransaction(async tx => {
    const [weave, moment, reply] = await Promise.all([tx.get(weaveRef), tx.get(momentRef), tx.get(replyRef)]);
    if (!weave.exists || !moment.exists || !reply.exists) {
      throw new HttpsError('not-found', 'This reply is no longer available.');
    }
    requireMember(weave, uid);
    if (reply.get('authorId') !== uid && weave.get('ownerId') !== uid) {
      throw new HttpsError('permission-denied', 'Only the reply author or WorldWeave owner can remove this reply.');
    }
    const count = safeCount(moment.get('replyCount'));
    tx.delete(replyRef);
    tx.update(momentRef, {
      replyCount: Math.max(0, count - 1),
      repliesUpdatedAt: FieldValue.serverTimestamp(),
    });
    return { deleted: true, replyCount: Math.max(0, count - 1) };
  });
});
