import { randomUUID } from 'node:crypto';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Query, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getFirebaseAdminApp, resolveFirebaseStorageBucket, resolveFirestoreDatabaseId } from './runtimeConfig.js';
import { accountStoragePrefixes, deleteUserOwnedDocuments } from './accountDeletionPolicy.js';
import { canClaimDeletionLease, ownsDeletionLease } from './accountDeletionLeasePolicy.js';

const PAGE_SIZE = 200;
const LEASE_MS = 10 * 60 * 1000;
const RETENTION_NOTE = 'Backups, legal records, and third-party systems may retain data for a limited period.';



export interface LifecycleRequest {
  type?: string;
  requesterId?: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  attempts?: number;
  leaseExpiresAt?: Timestamp;
  leaseId?: string;
}

export interface CleanupProgress {
  stage: string;
  deletedDocuments: number;
  deletedFiles: number;
}

const workerApp = getFirebaseAdminApp();
const firestoreDatabaseId = resolveFirestoreDatabaseId();
const db = getFirestore(workerApp, firestoreDatabaseId);
const accountStorageBucket = getStorage(workerApp).bucket(resolveFirebaseStorageBucket());

function isExpiredLease(request: LifecycleRequest): boolean {
  return canClaimDeletionLease(request.status, request.leaseExpiresAt?.toMillis(), Date.now());
}

async function claimRequest(requestId: string, userId: string): Promise<string | null> {
  const requestRef = db.collection('accountLifecycleRequests').doc(requestId);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(requestRef);
    if (!snapshot.exists) return null;
    const request = snapshot.data() as LifecycleRequest;
    if (request.type !== 'delete_account' || request.requesterId !== userId) return null;
    if (request.status === 'completed' || request.status === 'cancelled') return null;
    if (request.status === 'processing' && !isExpiredLease(request)) return null;

    const leaseId = randomUUID();
    transaction.update(requestRef, {
      status: 'processing',
      attempts: (request.attempts || 0) + 1,
      leaseId,
      leaseExpiresAt: Timestamp.fromMillis(Date.now() + LEASE_MS),
      startedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      progress: { stage: 'claimed', deletedDocuments: 0, deletedFiles: 0 },
    });
    return leaseId;
  });
}

async function updateProgress(requestId: string, leaseId: string, progress: CleanupProgress): Promise<void> {
  const requestRef = db.collection('accountLifecycleRequests').doc(requestId);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(requestRef);
    const request = snapshot.data() as LifecycleRequest | undefined;
    if (!snapshot.exists || !ownsDeletionLease(request?.status, request?.leaseId, leaseId)) {
      throw new Error('Account deletion worker lease is no longer current.');
    }
    transaction.update(requestRef, {
      progress,
      leaseExpiresAt: Timestamp.fromMillis(Date.now() + LEASE_MS),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

async function finishRequest(requestId: string, leaseId: string, progress: CleanupProgress): Promise<void> {
  const requestRef = db.collection('accountLifecycleRequests').doc(requestId);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(requestRef);
    const request = snapshot.data() as LifecycleRequest | undefined;
    if (!snapshot.exists || !ownsDeletionLease(request?.status, request?.leaseId, leaseId)) {
      throw new Error('Account deletion worker lease is no longer current.');
    }
    transaction.update(requestRef, {
      status: 'completed',
      progress: { ...progress, stage: 'completed' },
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      retentionNote: RETENTION_NOTE,
      leaseExpiresAt: FieldValue.delete(),
      leaseId: FieldValue.delete(),
    });
  });
}

async function failRequest(requestId: string, leaseId: string, progress: CleanupProgress): Promise<void> {
  const requestRef = db.collection('accountLifecycleRequests').doc(requestId);
  await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(requestRef);
    const request = snapshot.data() as LifecycleRequest | undefined;
    if (!snapshot.exists || request?.status !== 'processing' || request.leaseId !== leaseId) return;
    transaction.update(requestRef, {
      status: 'failed',
      progress: { ...progress, stage: 'failed' },
      errorCode: 'CLEANUP_FAILED',
      errorMessage: 'Trusted cleanup failed and will require an operator retry.',
      updatedAt: FieldValue.serverTimestamp(),
      leaseExpiresAt: FieldValue.delete(),
      leaseId: FieldValue.delete(),
    });
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

async function deleteUserSubcollections(userId: string, onBatch?: () => Promise<void>): Promise<number> {
  const subcollections = ['memoryEvents', 'memoryState', 'settings', 'securityLogs', 'activityEvents', 'notifications', 'postLikes'];
  let deleted = 0;
  for (const name of subcollections) {
    deleted += await deleteQuery(
      db.collection('users').doc(userId).collection(name),
      async () => { await onBatch?.(); },
    );
  }
  return deleted;
}

async function deleteStoragePrefix(prefix: string, onBatch?: () => Promise<void>): Promise<number> {
  let deleted = 0;
  let pageToken: string | undefined;
  do {
    const page = await accountStorageBucket.getFiles({ prefix, maxResults: PAGE_SIZE, pageToken }) as unknown as [Array<{ delete: () => Promise<unknown> }>, unknown, { nextPageToken?: string }?];
    const files = page[0];
    for (let offset = 0; offset < files.length; offset += PAGE_SIZE) {
      const batch = files.slice(offset, offset + PAGE_SIZE);
      await Promise.all(batch.map(file => file.delete()));
      deleted += batch.length;
      await onBatch?.();
    }
    pageToken = page[2]?.nextPageToken;
  } while (pageToken);
  return deleted;
}

async function cleanSharedChats(userId: string, onBatch?: () => Promise<void>): Promise<{ deletedDocuments: number; deletedFiles: number }> {
  let deletedDocuments = 0;
  let deletedFiles = 0;
  while (true) {
    const chats = await db.collection('chats')
      .where('participants', 'array-contains', userId)
      .limit(PAGE_SIZE)
      .get();
    if (chats.empty) return { deletedDocuments, deletedFiles };
    for (const chat of chats.docs) {
      const messageQuery = chat.ref.collection('messages').where('senderId', '==', userId);
      deletedDocuments += await deleteQuery(messageQuery, async () => { await onBatch?.(); });
      deletedFiles += await deleteStoragePrefix(`chats/${chat.id}/audio/${userId}/`, onBatch);
      await chat.ref.update({
        participants: FieldValue.arrayRemove(userId),
        [`deletedParticipants.${userId}`]: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await onBatch?.();
    }
  }
}

async function deleteOwnedDocuments(userId: string, onBatch?: () => Promise<void>): Promise<{ deletedDocuments: number; deletedFiles: number }> {
  let deleted = await deleteUserOwnedDocuments(db, userId, onBatch);
  deleted += await deleteQuery(
    db.collection('follows').where('followerId', '==', userId),
    async () => { await onBatch?.(); },
  );
  deleted += await deleteQuery(
    db.collection('follows').where('followingId', '==', userId),
    async () => { await onBatch?.(); },
  );
  deleted += await deleteQuery(
    db.collection('usernames').where('userId', '==', userId),
    async () => { await onBatch?.(); },
  );
  const chatCleanup = await cleanSharedChats(userId, onBatch);
  return { deletedDocuments: deleted + chatCleanup.deletedDocuments, deletedFiles: chatCleanup.deletedFiles };
}

async function deleteStorageObjects(userId: string, onBatch?: () => Promise<void>): Promise<number> {
  let deleted = 0;
  for (const prefix of accountStoragePrefixes(userId)) {
    deleted += await deleteStoragePrefix(prefix, onBatch);
  }
  return deleted;
}

export async function processAccountDeletion(requestId: string, userId: string): Promise<void> {
  const leaseId = await claimRequest(requestId, userId);
  if (!leaseId) return;
  let progress: CleanupProgress = { stage: 'claimed', deletedDocuments: 0, deletedFiles: 0 };
  try {
    progress.stage = 'owned-documents';
    const heartbeat = async () => updateProgress(requestId, leaseId, progress);
    const ownedCleanup = await deleteOwnedDocuments(userId, heartbeat);
    progress.deletedDocuments += ownedCleanup.deletedDocuments;
    progress.deletedFiles += ownedCleanup.deletedFiles;
    await updateProgress(requestId, leaseId, progress);

    progress.stage = 'user-subcollections';
    progress.deletedDocuments += await deleteUserSubcollections(userId, heartbeat);
    await updateProgress(requestId, leaseId, progress);

    progress.stage = 'storage';
    progress.deletedFiles += await deleteStorageObjects(userId, heartbeat);
    await updateProgress(requestId, leaseId, progress);

    progress.stage = 'identity';
    await db.collection('publicProfiles').doc(userId).delete().catch(() => undefined);
    await db.collection('users').doc(userId).delete().catch(() => undefined);
    try {
      await getAuth(workerApp).deleteUser(userId);
    } catch (error) {
      if ((error as { code?: string })?.code !== 'auth/user-not-found') throw error;
    }

    await finishRequest(requestId, leaseId, progress);
  } catch (error) {
    await failRequest(requestId, leaseId, progress);
    throw error;
  }
}
