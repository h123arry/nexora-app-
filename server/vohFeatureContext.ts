export interface VohSnapshotDocument {
  id: string;
  data(): Record<string, unknown>;
  ref?: {
    parent?: {
      parent?: {
        path?: string;
        get(): Promise<VohSnapshotDocument>;
      };
    };
  };
}

interface VohQuerySnapshot {
  docs: VohSnapshotDocument[];
}

interface VohQuery {
  where(field: string, operator: '==', value: unknown): VohQuery;
  orderBy(field: string, direction: 'desc'): VohQuery;
  limit(count: number): VohQuery;
  get(): Promise<VohQuerySnapshot>;
}

interface VohDocumentReference {
  collection(name: string): VohQuery;
  get(): Promise<VohSnapshotDocument>;
}

interface VohCollectionReference extends VohQuery {
  doc(id: string): VohDocumentReference;
}

export interface VohFirestoreReader {
  collection(path: string): VohCollectionReference;
  collectionGroup(name: string): VohQuery;
}

function safeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function timestampText(value: unknown): string {
  if (typeof value === 'string') return value.slice(0, 80);
  if (value && typeof value === 'object' && 'toDate' in value
    && typeof (value as { toDate?: unknown }).toDate === 'function') {
    const date = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  return '';
}

/** Read only the authenticated user's own bounded notification subcollection. */
export async function loadVohOwnNotifications(db: VohFirestoreReader, uid: string) {
  if (!uid) throw new Error('A verified account is required.');
  const snapshot = await db.collection('users').doc(uid)
    .collection('notifications').orderBy('timestamp', 'desc').limit(5).get();
  return snapshot.docs.map(document => {
    const data = document.data();
    return {
      content: safeText(data.content || data.title, 300),
      timestamp: timestampText(data.timestamp || data.createdAt),
    };
  }).filter(item => item.content.length > 0);
}

/**
 * Resolve active memberships to their parent Circle documents. Membership
 * documents are scoped by userId + active status; no global Circle listing,
 * pending requests, moderation data, or member directory is exposed.
 */
export async function loadVohJoinedCommunities(db: VohFirestoreReader, uid: string) {
  if (!uid) throw new Error('A verified account is required.');
  const memberships = await db.collectionGroup('members')
    .where('userId', '==', uid)
    .limit(50)
    .get();

  const activeMemberships = memberships.docs.filter(membership => membership.data().status === 'active').slice(0, 12);
  const resolved = await Promise.all(activeMemberships.map(async membership => {
    const communityRef = membership.ref?.parent?.parent;
    if (!communityRef || !communityRef.path || !/^communities\\/[^/]+$/.test(communityRef.path)) return null;
    const community = await communityRef.get();
    if (!community) return null;
    const data = community.data();
    const name = safeText(data.name, 120);
    if (!name) return null;
    const rawCount = data.membersCount;
    const membersCount = typeof rawCount === 'number' && Number.isFinite(rawCount) && rawCount >= 0
      ? Math.min(1_000_000_000, rawCount)
      : null;
    return {
      id: community.id,
      name,
      description: safeText(data.description, 400),
      creatorId: safeText(data.creatorId || data.ownerId, 128),
      membersCount,
    };
  }));

  const unique = new Map<string, NonNullable<(typeof resolved)[number]>>();
  for (const community of resolved) {
    if (community) unique.set(community.id, community);
  }
  return [...unique.values()].slice(0, 12);
}
