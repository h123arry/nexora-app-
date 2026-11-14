import { randomUUID } from 'node:crypto';
import { getFirestore, FieldValue, type DocumentSnapshot } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const MAX_CHAPTERS = 30;

function validId(value: unknown): value is string {
  return typeof value === 'string' && ID_PATTERN.test(value);
}
function cleanText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function requireOwner(weave: DocumentSnapshot, uid: string) {
  if (weave.get('ownerId') !== uid) throw new HttpsError('permission-denied', 'Only the WorldWeave owner can organize story chapters.');
}

export const createWorldWeaveChapter = onCall({ maxInstances: 15 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to organize this WorldWeave.');
  const weaveId = request.data?.weaveId;
  if (!validId(weaveId)) throw new HttpsError('invalid-argument', 'A valid WorldWeave is required.');
  const title = typeof request.data?.title === 'string' ? request.data.title.trim() : '';
  const description = cleanText(request.data?.description, 250);
  if (title.length < 2 || title.length > 60) throw new HttpsError('invalid-argument', 'A chapter title must contain 2 to 60 characters.');
  if (typeof request.data?.description === 'string' && request.data.description.trim().length > 250) {
    throw new HttpsError('invalid-argument', 'Chapter descriptions must be 250 characters or fewer.');
  }

  const weaveRef = db.collection('worldWeaves').doc(weaveId);
  const chaptersRef = weaveRef.collection('chapters');
  const chapterRef = chaptersRef.doc();
  const activityRef = weaveRef.collection('activity').doc(randomUUID());
  return db.runTransaction(async tx => {
    const [weave, chapters] = await Promise.all([tx.get(weaveRef), tx.get(chaptersRef)]);
    if (!weave.exists) throw new HttpsError('not-found', 'This WorldWeave no longer exists.');
    requireOwner(weave, uid);
    if (chapters.size >= MAX_CHAPTERS) throw new HttpsError('resource-exhausted', 'A WorldWeave can have up to 30 chapters.');
    const position = chapters.docs.reduce((max, item) => Math.max(max, Number(item.get('position') || 0)), -1) + 1;
    tx.create(chapterRef, {
      id: chapterRef.id,
      weaveId,
      title,
      description,
      position,
      createdBy: uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.create(activityRef, {
      id: activityRef.id, actorUid: uid, targetUid: uid, chapterId: chapterRef.id,
      chapterTitle: title, action: 'chapter_created', createdAt: FieldValue.serverTimestamp(),
    });
    return { chapterId: chapterRef.id, title, description, position };
  });
});

export const updateWorldWeaveChapter = onCall({ maxInstances: 15 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to organize this WorldWeave.');
  const weaveId = request.data?.weaveId;
  const chapterId = request.data?.chapterId;
  if (!validId(weaveId) || !validId(chapterId)) throw new HttpsError('invalid-argument', 'A valid WorldWeave chapter is required.');
  const title = cleanText(request.data?.title, 60);
  const description = cleanText(request.data?.description, 250);
  if (title.length < 2) throw new HttpsError('invalid-argument', 'A chapter title must contain 2 to 60 characters.');
  if (typeof request.data?.description === 'string' && request.data.description.trim().length > 250) {
    throw new HttpsError('invalid-argument', 'Chapter descriptions must be 250 characters or fewer.');
  }

  const weaveRef = db.collection('worldWeaves').doc(weaveId);
  const chapterRef = weaveRef.collection('chapters').doc(chapterId);
  const activityRef = weaveRef.collection('activity').doc(randomUUID());
  return db.runTransaction(async tx => {
    const [weave, chapter] = await Promise.all([tx.get(weaveRef), tx.get(chapterRef)]);
    if (!weave.exists || !chapter.exists) throw new HttpsError('not-found', 'This WorldWeave chapter no longer exists.');
    requireOwner(weave, uid);
    tx.update(chapterRef, { title, description, updatedAt: FieldValue.serverTimestamp() });
    tx.create(activityRef, {
      id: activityRef.id, actorUid: uid, targetUid: uid, chapterId,
      chapterTitle: title, action: 'chapter_updated', createdAt: FieldValue.serverTimestamp(),
    });
    return { chapterId, title, description };
  });
});
