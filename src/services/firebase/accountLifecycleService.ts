import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { auth, db } from './config';

type LifecycleRequestType = 'delete_account';
type LifecycleRequestStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface AccountDeletionRequest {
  id: string;
  type: LifecycleRequestType;
  requesterId: string;
  status: LifecycleRequestStatus;
  createdAt: string | null;
  updatedAt?: string | null;
  retentionNote?: string;
}

function requireCurrentUser(userId: string) {
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Sign in again before managing account data.');
  }
}

function serialise(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialise);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, serialise(item)]));
  }
  return value;
}

function serialiseRecord(value: Record<string, unknown>) {
  return serialise(value) as Record<string, unknown>;
}

async function readOwnedCollection(name: string, userId: string, field: string = 'userId') {
  const snapshot = await getDocs(query(collection(db, name), where(field, '==', userId), limit(500)));
  return snapshot.docs.map((item) => ({ id: item.id, ...serialiseRecord(item.data()) }));
}

async function readSubcollection(path: string) {
  const snapshot = await getDocs(query(collection(db, path), limit(500)));
  return snapshot.docs.map((item) => ({ id: item.id, ...serialiseRecord(item.data()) }));
}

export async function exportAccountData(userId: string) {
  requireCurrentUser(userId);

  const [user, publicProfile, posts, drafts, followsAsFollower, followsAsFollowing, activities, analytics, notifications, reports, appeals, memoryEvents, memoryState, settings] = await Promise.all([
    getDoc(doc(db, 'users', userId)),
    getDoc(doc(db, 'publicProfiles', userId)),
    readOwnedCollection('posts', userId),
    readOwnedCollection('drafts', userId),
    readOwnedCollection('follows', userId, 'followerId'),
    readOwnedCollection('follows', userId, 'followingId'),
    readOwnedCollection('activities', userId),
    readOwnedCollection('creatorAnalytics', userId),
    readOwnedCollection('notifications', userId),
    readOwnedCollection('moderationReports', userId, 'reporterId'),
    readOwnedCollection('moderationAppeals', userId),
    readSubcollection(`users/${userId}/memoryEvents`),
    readSubcollection(`users/${userId}/memoryState`),
    readSubcollection(`users/${userId}/settings`)
  ]);

  const localStorageData: Record<string, unknown> = {};
  if (typeof localStorage !== 'undefined') {
    Object.keys(localStorage)
      .filter((key) => key.startsWith('nexora_') || key.startsWith('nx_') || key.startsWith('voh_'))
      .sort()
      .forEach((key) => {
        const value = localStorage.getItem(key);
        if (value === null) return;
        try { localStorageData[key] = JSON.parse(value); } catch { localStorageData[key] = value; }
      });
  }

  return {
    schemaVersion: '2026-10-account-export-v1',
    exportedAt: new Date().toISOString(),
    account: {
      user: user.exists() ? { id: user.id, ...serialiseRecord(user.data() || {}) } : null,
      publicProfile: publicProfile.exists() ? { id: publicProfile.id, ...serialiseRecord(publicProfile.data() || {}) } : null
    },
    collections: {
      posts,
      drafts,
      follows: { asFollower: followsAsFollower, asFollowing: followsAsFollowing },
      activities,
      creatorAnalytics: analytics,
      notifications,
      moderationReports: reports,
      moderationAppeals: appeals,
      memoryEvents,
      memoryState,
      settings
    },
    deviceStorage: localStorageData,
    limitations: [
      'This export includes data readable by the signed-in account and allowlisted Nexora/VOH device storage.',
      'Private conversations and media binaries are not embedded in this JSON export.',
      'Uploaded media and external provider backups require separate lifecycle processing.'
    ]
  };
}

export async function requestAccountDeletion(userId: string): Promise<AccountDeletionRequest> {
  requireCurrentUser(userId);

  const existing = await getDocs(query(
    collection(db, 'accountLifecycleRequests'),
    where('requesterId', '==', userId),
    limit(20)
  ));
  const active = existing.docs
    .map((item) => ({ id: item.id, ...item.data() } as AccountDeletionRequest))
    .find((item) => item.type === 'delete_account' && ['pending', 'processing'].includes(item.status));
  if (active) return active;

  const requestRef = await addDoc(collection(db, 'accountLifecycleRequests'), {
    type: 'delete_account',
    requesterId: userId,
    status: 'pending',
    policyVersion: '2026-10',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    retentionNote: 'Deletion requires asynchronous cleanup. Backups, legal records, and third-party systems may retain data for a limited period.'
  });

  return {
    id: requestRef.id,
    type: 'delete_account',
    requesterId: userId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    retentionNote: 'Deletion requires asynchronous cleanup. Backups, legal records, and third-party systems may retain data for a limited period.'
  };
}

export async function getLatestAccountDeletionRequest(userId: string): Promise<AccountDeletionRequest | null> {
  requireCurrentUser(userId);
  const snapshot = await getDocs(query(
    collection(db, 'accountLifecycleRequests'),
    where('requesterId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(10)
  ));
  const request = snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() } as AccountDeletionRequest))
    .find((item) => item.type === 'delete_account');
  return request || null;
}
