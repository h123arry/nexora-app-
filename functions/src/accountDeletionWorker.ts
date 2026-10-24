import { randomUUID } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Query, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const PAGE_SIZE = 200;
const LEASE_MS = 10 * 60 * 1000;
const RETENTION_NOTE = 'Backups, legal records, and third-party systems may retain data for a limited period.';

const ownedCollections: Array<{ name: string; field: string }> = [
  { name: 'posts', field: 'userId' },
  { name: 'drafts', field: 'userId' },
  { name: 'activities', field: 'userId' },
  { name: 'creatorAnalytics', field: 'userId' },
  { name: 'notifications', field: 'userId' },
  { name: 'moderationReports', field: 'reporterId' },
  { name: 'moderationAppeals', field: 'userId' },
  { name: 'privacySettings', field: 'userId' },
  { name: 'presence', field: 'userId' },
];

export interface LifecycleRequest {
  type?: string;
  requesterId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempts?: number;
  leaseExpiresAt?: Timestamp;
}

export interface CleanupProgress {
  stage: string;
  deletedDocuments: number;
  deletedFiles: number;
}

const db = getFirestore();

function isExpiredLease(request: LifecycleRequest): boolean {
  return !request.leaseExpiresAt || request.leaseExpiresAt.toMillis() <= Date.now();
}

async function claimRequest(requestId: string, userId: string): Promise<boolean> {
  const requestRef = db.collection('accountLifecycleRequests').doc(requestId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(requestRef);
    if (!snapshot.exists) return false;
    const request = snapshot.data() as LifecycleRequest;
    if (request.type !== 'delete_account' || request.requesterId !== userId) return false;
    if (request.status === 'completed' || request.status === 'cancelled') return false;
    if (request.status === 'processing' && !isExpiredLease(request)) return false;

    transaction.update(requestRef, {
      status: 'processing',
      attempts: (request.attempts || 0) + 1,
      leaseId: randomUUID(),
      leaseExpiresAt: Timestamp.fromMillis(Date.now() + LEASE_MS),
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      progress: { stage: 'claimed', deletedDocuments: 0, deletedFiles: 0 },
    });
    return true;
  });
}

async function updateProgress(requestId: string, progress: CleanupProgress): Promise<void> {
  await db.collection('accountLifecycleRequests').doc(requestId).update({
    progress,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

async function deleteQuery(query: Query, onProgress: (count: number) => Promise<void>): Promise<number> {
  let deleted = 0;
  while (true) {
    const snapshot = await query.limit(PAGE_SIZE).get();
    if (snapshot.empty) return deleted;
    const batch = db.batch();
    snapshot.docs.forEach((document) => batch.delete(document.ref));
    await batch.commit();
    deleted += snapshot.size;
    await onProgress(deleted);
    if (snapshot.size < PAGE_SIZE) return deleted;
  }
}

async function deleteUserSubcollections(userId: string): Promise<number> {
  const subcollections = ['memoryEvents', 'memoryState', 'settings', 'securityLogs', 'activityEvents', 'notifications'];
  let deleted = 0;
  for (const name of subcollections) {
    deleted += await deleteQuery(
      db.collection('users').doc(userId).collection(name),
      async () => undefined,
    );
  }
  return deleted;
}

async function cleanSharedChats(userId: string): Promise<number> {
  let deleted = 0;
  const chats = await db.collection('chats').where('participants', 'array-contains', userId).get();
  for (const chat of chats.docs) {
    const messages = await db.collection('chats').doc(chat.id).collection('messages').where('senderId', '==', userId).get();
    if (messages.size) {
      const batch = db.batch();
      messages.docs.forEach((message) => batch.delete(message.ref));
      await batch.commit();
      deleted += messages.size;
    }
    await chat.ref.update({
      participants: FieldValue.arrayRemove(userId),
      [`deletedParticipants.${userId}`]: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  return deleted;
}

async function deleteOwnedDocuments(userId: string): Promise<number> {
  let deleted = 0;
  for (const collection of ownedCollections) {
    deleted += await deleteQuery(
      db.collection(collection.name).where(collection.field, '==', userId),
      async () => undefined,
    );
  }
  deleted += await deleteQuery(
    db.collection('follows').where('followerId', '==', userId),
    async () => undefined,
  );
  deleted += await deleteQuery(
    db.collection('follows').where('followingId', '==', userId),
    async () => undefined,
  );
  deleted += await deleteQuery(
    db.collection('usernames').where('userId', '==', userId),
    async () => undefined,
  );
  deleted += await cleanSharedChats(userId);
  return deleted;
}

async function deleteStorageObjects(userId: string): Promise<number> {
  const bucket = getStorage().bucket();
  let deleted = 0;
  for (const prefix of [`users/${userId}/`, `media/${userId}/`]) {
    const [files] = await bucket.getFiles({ prefix });
    if (!files.length) continue;
    await Promise.all(files.map((file) => file.delete()));
    deleted += files.length;
  }
  return deleted;
}

export async function processAccountDeletion(requestId: string, userId: string): Promise<void> {
  if (!await claimRequest(requestId, userId)) return;
  const requestRef = db.collection('accountLifecycleRequests').doc(requestId);
  let progress: CleanupProgress = { stage: 'claimed', deletedDocuments: 0, deletedFiles: 0 };
  try {
    progress.stage = 'owned-documents';
    progress.deletedDocuments += await deleteOwnedDocuments(userId);
    await updateProgress(requestId, progress);

    progress.stage = 'user-subcollections';
    progress.deletedDocuments += await deleteUserSubcollections(userId);
    await updateProgress(requestId, progress);

    progress.stage = 'storage';
    progress.deletedFiles += await deleteStorageObjects(userId);
    await updateProgress(requestId, progress);

    progress.stage = 'identity';
    await db.collection('publicProfiles').doc(userId).delete().catch(() => undefined);
    await db.collection('users').doc(userId).delete().catch(() => undefined);
    await getAuth().deleteUser(userId);

    await requestRef.update({
      status: 'completed',
      progress: { ...progress, stage: 'completed' },
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      retentionNote: RETENTION_NOTE,
      leaseExpiresAt: FieldValue.delete(),
      leaseId: FieldValue.delete(),
    });
  } catch (error) {
    await requestRef.update({
      status: 'failed',
      progress: { ...progress, stage: 'failed' },
      errorCode: 'CLEANUP_FAILED',
      errorMessage: 'Trusted cleanup failed and will require an operator retry.',
      updatedAt: FieldValue.serverTimestamp(),
      leaseExpiresAt: FieldValue.delete(),
      leaseId: FieldValue.delete(),
    });
    throw error;
  }
}
