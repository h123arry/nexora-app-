import { FieldPath, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { getFirebaseAdminApp, resolveFirestoreDatabaseId } from './runtimeConfig.js';

const db = getFirestore(getFirebaseAdminApp(), resolveFirestoreDatabaseId());
const PAGE_SIZE = 20;
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

type DiscoveryCursor = { v: 1; query: string; updatedAtSeconds: number; updatedAtNanoseconds: number; id: string };

function normalize(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim().replace(/\s+/g, ' ').slice(0, 60)
    : '';
}
function dateOf(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value
    && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}
function decodeCursor(value: unknown, query: string): DiscoveryCursor | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) {
    throw new HttpsError('invalid-argument', 'The WorldWeave discovery cursor is invalid. Restart discovery.');
  }
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<DiscoveryCursor>;
    if (parsed.v !== 1 || parsed.query !== query || typeof parsed.id !== 'string'
      || !ID_PATTERN.test(parsed.id) || !Number.isInteger(parsed.updatedAtSeconds)
      || (parsed.updatedAtSeconds as number) < 0 || !Number.isInteger(parsed.updatedAtNanoseconds)
      || (parsed.updatedAtNanoseconds as number) < 0 || (parsed.updatedAtNanoseconds as number) >= 1000000000) throw new Error('invalid');
    return parsed as DiscoveryCursor;
  } catch {
    throw new HttpsError('invalid-argument', 'The WorldWeave discovery cursor is invalid. Restart discovery.');
  }
}
function encodeCursor(query: string, snapshot: FirebaseFirestore.QueryDocumentSnapshot): string {
  const updatedAt = snapshot.get('updatedAt');
  const timestamp = updatedAt instanceof Timestamp
    ? updatedAt
    : Timestamp.fromDate(dateOf(updatedAt));
  return Buffer.from(JSON.stringify({
    v: 1,
    query,
    updatedAtSeconds: timestamp.seconds,
    updatedAtNanoseconds: timestamp.nanoseconds,
    id: snapshot.id,
  } satisfies DiscoveryCursor)).toString('base64url');
}
function blockedIds(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string').slice(0, 500)
    : [];
}

/**
 * Public-only, cursor-paginated WorldWeave discovery. The response is a strict
 * projection: participant IDs, invite state, private media paths, and member
 * documents are never returned.
 */
export const discoverPublicWorldWeaves = onCall({ maxInstances: 10 }, async request => {
  const viewerUid = request.auth?.uid;
  if (!viewerUid) throw new HttpsError('unauthenticated', 'Sign in to discover WorldWeaves.');

  const queryText = normalize(request.data?.query);
  if (request.data?.query !== undefined && queryText.length > 0 && queryText.length < 2) {
    throw new HttpsError('invalid-argument', 'Search terms must contain at least 2 characters.');
  }
  if (typeof request.data?.query === 'string' && request.data.query.trim().length > 60) {
    throw new HttpsError('invalid-argument', 'Search terms must be 60 characters or fewer.');
  }
  const cursor = decodeCursor(request.data?.cursor, queryText);
  const viewerSettingsSnapshot = await db.collection('users').doc(viewerUid)
    .collection('settings').doc('preferences').get();
  const viewerSettings = viewerSettingsSnapshot.data() || {};
  const viewerBlocked = new Set([
    ...blockedIds(viewerSettings?.privacy?.blockedUserIds),
    ...blockedIds(viewerSettings?.messaging?.blockedUserIds),
  ]);

  let pageQuery: FirebaseFirestore.Query = db.collection('worldWeaves')
    .where('visibility', '==', 'public')
    .orderBy('updatedAt', 'desc')
    .orderBy(FieldPath.documentId(), 'desc')
    .limit(PAGE_SIZE + 1);
  if (cursor) {
    pageQuery = pageQuery.startAfter(new Timestamp(cursor.updatedAtSeconds, cursor.updatedAtNanoseconds), cursor.id);
  }
  const snapshot = await pageQuery.get();
  const hasMore = snapshot.docs.length > PAGE_SIZE;
  const pageDocs = snapshot.docs.slice(0, PAGE_SIZE);

  const policyCache = new Map<string, Promise<{
    hidden: boolean; blocks: string[]; privateProfile: boolean;
  }>>();
  const visible = await Promise.all(pageDocs.map(async doc => {
    const data = doc.data();
    if (data.deleted === true || data.archived === true
      || ['deleted', 'removed', 'suspended', 'draft'].includes(String(data.status || '').toLowerCase())) return null;

    const title = typeof data.title === 'string' ? data.title.trim().slice(0, 90) : '';
    const description = typeof data.description === 'string' ? data.description.trim().slice(0, 500) : '';
    if (queryText) {
      const searchable = normalize(title + ' ' + description);
      const words = queryText.split(' ').filter(Boolean);
      if (!words.every(word => searchable.includes(word))) return null;
    }

    const ownerId = typeof data.ownerId === 'string' ? data.ownerId : '';
    if (!ID_PATTERN.test(ownerId) || viewerBlocked.has(ownerId)) return null;
    let policy = policyCache.get(ownerId);
    if (!policy) {
      policy = Promise.all([
        db.collection('users').doc(ownerId).get(),
        db.collection('users').doc(ownerId).collection('settings').doc('preferences').get(),
        db.collection('accountStatus').doc(ownerId).get(),
      ]).then(([profileSnapshot, settingsSnapshot, statusSnapshot]) => {
        const profile = profileSnapshot.data() || {};
        const settings = settingsSnapshot.data() || {};
        const status = statusSnapshot.data() || {};
        const expiry = dateOf(status.expiresAt).getTime();
        const activeRestriction = (status.banned === true || status.suspended === true)
          && (expiry === 0 || expiry > Date.now());
        return {
          hidden: !profileSnapshot.exists || profile.isBanned === true
            || profile.isSuspended === true || profile.isSeedProfile === true || activeRestriction,
          privateProfile: settings?.privacy?.isPrivate === true,
          blocks: [
            ...blockedIds(settings?.privacy?.blockedUserIds),
            ...blockedIds(settings?.messaging?.blockedUserIds),
          ],
        };
      });
      policyCache.set(ownerId, policy);
    }
    const ownerPolicy = await policy;
    if (ownerPolicy.hidden || ownerPolicy.blocks.includes(viewerUid)) return null;
    if (ownerPolicy.privateProfile) {
      const follow = await db.collection('follows').doc(viewerUid + '_' + ownerId).get();
      if (!follow.exists) return null;
    }

    const updatedAt = dateOf(data.updatedAt);
    const createdAt = dateOf(data.createdAt);
    return {
      id: doc.id,
      title,
      description,
      ownerId,
      ownerName: typeof data.ownerName === 'string' ? data.ownerName.slice(0, 80) : 'NEXORA member',
      momentCount: Number.isSafeInteger(data.momentCount) ? Math.max(0, Math.min(1000000, data.momentCount as number)) : 0,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString(),
    };
  }));

  const results = visible.filter((item): item is NonNullable<typeof item> => item !== null);
  results.sort((a, b) => {
    const score = (item: typeof a) => {
      const text = normalize(item.title + ' ' + item.description);
      const exactTitle = queryText && normalize(item.title) === queryText ? 20 : 0;
      const titlePrefix = queryText && normalize(item.title).startsWith(queryText) ? 10 : 0;
      const words = queryText.split(' ').filter(Boolean);
      const match = queryText ? words.filter(word => text.includes(word)).length * 2 : 0;
      const ageHours = Math.max(0, (Date.now() - new Date(item.updatedAt).getTime()) / 3600000);
      return exactTitle + titlePrefix + match + Math.max(0, 8 - Math.log2(1 + ageHours / 24));
    };
    return score(b) - score(a) || b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id);
  });

  return {
    results,
    nextCursor: hasMore && pageDocs.length
      ? encodeCursor(queryText, pageDocs[pageDocs.length - 1])
      : null,
    query: queryText,
  };
});
