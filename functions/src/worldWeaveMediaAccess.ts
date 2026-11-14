import { getStorage } from 'firebase-admin/storage';
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirebaseStorageBucket, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const app = getFirebaseAdminApp();
const db = getFirestore(app, resolveFirestoreDatabaseId());
const bucket = getStorage(app).bucket(resolveFirebaseStorageBucket());
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const SIGNED_URL_TTL_MS = 10 * 60 * 1000;

function ids(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').slice(0, 500)
    : [];
}

export function canReadWorldWeaveMedia(input: {
  uid: string;
  ownerId: string;
  authorId?: string;
  visibility: unknown;
  participantIds: unknown;
  viewerBlockedIds?: unknown;
  ownerBlockedIds?: unknown;
  authorBlockedIds?: unknown;
}): boolean {
  if (!input.uid || !input.ownerId) return false;
  const blockedByViewer = ids(input.viewerBlockedIds);
  if (blockedByViewer.includes(input.ownerId) || (input.authorId && blockedByViewer.includes(input.authorId))
    || ids(input.ownerBlockedIds).includes(input.uid) || ids(input.authorBlockedIds).includes(input.uid)) return false;
  if (input.uid === input.ownerId) return true;
  if (input.visibility === 'public') return true;
  if (input.visibility !== 'private') return false;
  return ids(input.participantIds).includes(input.uid);
}

/**
 * Resolve a short-lived read URL only after checking the current WorldWeave
 * visibility and membership. Private uploads should persist an empty mediaUrl
 * and their canonical storagePath; never persist a permanent download token.
 */
export const resolveWorldWeaveMomentMediaUrl = onCall({ maxInstances: 20 }, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to view this WorldWeave media.');

  const weaveId = request.data?.weaveId;
  const momentId = request.data?.momentId;
  if (typeof weaveId !== 'string' || !ID_PATTERN.test(weaveId)
    || typeof momentId !== 'string' || !ID_PATTERN.test(momentId)) {
    throw new HttpsError('invalid-argument', 'A valid WorldWeave moment is required.');
  }

  const weaveRef = db.collection('worldWeaves').doc(weaveId);
  const momentRef = weaveRef.collection('moments').doc(momentId);
  const [weave, moment] = await Promise.all([weaveRef.get(), momentRef.get()]);
  if (!weave.exists || !moment.exists || moment.get('weaveId') !== weaveId) {
    throw new HttpsError('not-found', 'This WorldWeave media is no longer available.');
  }

  const ownerId = weave.get('ownerId');
  const authorId = moment.get('authorId');
  const storagePath = moment.get('storagePath');
  if (typeof ownerId !== 'string' || !ID_PATTERN.test(ownerId)
    || typeof authorId !== 'string' || !ID_PATTERN.test(authorId)
    || typeof storagePath !== 'string'
    || storagePath !== 'users/' + authorId + '/media/' + momentId
    || !['image', 'video', 'audio'].includes(String(moment.get('mediaType')))) {
    throw new HttpsError('failed-precondition', 'This moment does not have a valid private media asset.');
  }

  const [viewerSettingsSnapshot, ownerSettingsSnapshot, authorSettingsSnapshot, ownerStatusSnapshot, authorStatusSnapshot] = await Promise.all([
    db.collection('users').doc(uid).collection('settings').doc('preferences').get(),
    db.collection('users').doc(ownerId).collection('settings').doc('preferences').get(),
    db.collection('users').doc(authorId).collection('settings').doc('preferences').get(),
    db.collection('accountStatus').doc(ownerId).get(),
    db.collection('accountStatus').doc(authorId).get(),
  ]);
  const viewerSettings = viewerSettingsSnapshot.data() || {};
  const ownerSettings = ownerSettingsSnapshot.data() || {};
  const authorSettings = authorSettingsSnapshot.data() || {};
  const ownerStatus = ownerStatusSnapshot.data() || {};
  const authorStatus = authorStatusSnapshot.data() || {};
  const activeRestriction = (status: Record<string, unknown>) => {
    if (status.banned !== true && status.suspended !== true) return false;
    const expiry = status.expiresAt && typeof status.expiresAt === 'object' && 'toDate' in status.expiresAt
      ? (status.expiresAt as { toDate: () => Date }).toDate().getTime()
      : status.expiresAt instanceof Date ? status.expiresAt.getTime() : 0;
    return expiry === 0 || expiry > Date.now();
  };
  if (activeRestriction(ownerStatus) || activeRestriction(authorStatus)) {
    throw new HttpsError('permission-denied', 'This WorldWeave media is unavailable.');
  }
  if (weave.get('visibility') === 'public') {
    const ownerPrivate = ownerSettings?.privacy?.isPrivate === true;
    const authorPrivate = authorSettings?.privacy?.isPrivate === true;
    const followChecks: Promise<FirebaseFirestore.DocumentSnapshot>[] = [];
    if (ownerPrivate && uid !== ownerId) followChecks.push(db.collection('follows').doc(uid + '_' + ownerId).get());
    if (authorPrivate && uid !== authorId) followChecks.push(db.collection('follows').doc(uid + '_' + authorId).get());
    const followSnapshots = await Promise.all(followChecks);
    if (followSnapshots.some(snapshot => !snapshot.exists)) {
      throw new HttpsError('permission-denied', 'Follow the private account before viewing this public WorldWeave media.');
    }
  }
  if (!canReadWorldWeaveMedia({
    uid,
    ownerId,
    authorId,
    visibility: weave.get('visibility'),
    participantIds: weave.get('participantIds'),
    viewerBlockedIds: [
      ...ids(viewerSettings?.privacy?.blockedUserIds),
      ...ids(viewerSettings?.messaging?.blockedUserIds),
    ],
    ownerBlockedIds: [
      ...ids(ownerSettings?.privacy?.blockedUserIds),
      ...ids(ownerSettings?.messaging?.blockedUserIds),
    ],
    authorBlockedIds: [
      ...ids(authorSettings?.privacy?.blockedUserIds),
      ...ids(authorSettings?.messaging?.blockedUserIds),
    ],
  })) {
    throw new HttpsError('permission-denied', 'You no longer have access to this WorldWeave media.');
  }

  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) throw new HttpsError('not-found', 'The original media file is no longer available.');

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + SIGNED_URL_TTL_MS,
    responseDisposition: 'inline',
    responseCacheControl: 'private, no-store, max-age=0',
  });

  // Re-check the parent immediately before returning the URL so a concurrent
  // removal/visibility change during signing does not grant fresh access.
  const latestWeave = await weaveRef.get();
  if (!latestWeave.exists || latestWeave.get('ownerId') !== ownerId
    || !canReadWorldWeaveMedia({
      uid, ownerId, authorId,
      visibility: latestWeave.get('visibility'),
      participantIds: latestWeave.get('participantIds'),
      viewerBlockedIds: [
        ...ids(viewerSettings?.privacy?.blockedUserIds),
        ...ids(viewerSettings?.messaging?.blockedUserIds),
      ],
      ownerBlockedIds: [
        ...ids(ownerSettings?.privacy?.blockedUserIds),
        ...ids(ownerSettings?.messaging?.blockedUserIds),
      ],
      authorBlockedIds: [
        ...ids(authorSettings?.privacy?.blockedUserIds),
        ...ids(authorSettings?.messaging?.blockedUserIds),
      ],
    })) {
    throw new HttpsError('permission-denied', 'Your access to this WorldWeave media has changed.');
  }
  return { url, expiresInSeconds: Math.floor(SIGNED_URL_TTL_MS / 1000) };
});
