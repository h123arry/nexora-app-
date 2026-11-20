export interface VohSnapshotDocument {
  id: string;
  exists?: boolean;
  data(): Record<string, unknown> | undefined;
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
  if (typeof value === 'number' && Number.isFinite(value)) { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toISOString(); }
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
    const data = document.data() || {};
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
    if (!communityRef || !communityRef.path || !/^communities\/[^/]+$/.test(communityRef.path)) return null;
    const community = await communityRef.get();
    if (!community) return null;
    const data = community.data() || {};
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

/** Read only the authenticated user's saved post drafts; never expose media URLs. */
export async function loadVohOwnDrafts(db: VohFirestoreReader, uid: string) {
  if (!uid) throw new Error('A verified account is required.');
  const snapshot = await db.collection('drafts').where('userId', '==', uid).orderBy('updatedAt', 'desc').limit(10).get();
  return snapshot.docs.map(document => {
    const data = document.data() || {};
    const rawType = data.type;
    const type = rawType === 'video' || rawType === 'image' || rawType === 'text' ? rawType : 'text';
    const tags = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 8).map(tag => safeText(tag, 50)).filter(Boolean) : [];
    return { id: safeText(document.id, 128), caption: safeText(data.caption, 500), type, tags, updatedAt: timestampText(data.updatedAt) };
  }).filter(draft => draft.id);
}

/** Summarize the owner's cloud Studio manifest without loading source media. */
export async function loadVohOwnStudioProject(db: VohFirestoreReader, uid: string) {
  if (!uid) throw new Error('A verified account is required.');
  const snapshot = await db.collection('studioCloudDrafts').doc(uid).get();
  if (!snapshot || snapshot.exists === false) return null;
  const data = snapshot.data() || {};
  const manifest = data.manifest;
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return null;
  const manifestRecord = manifest as Record<string, unknown>;
  if (manifestRecord.schemaVersion !== 1) return null;
  const project = manifestRecord.project;
  if (!project || typeof project !== 'object' || Array.isArray(project)) return null;
  const projectRecord = project as Record<string, unknown>;
  const assets = manifestRecord.assets;
  const assetCount = assets && typeof assets === 'object' && !Array.isArray(assets) ? Math.min(100, Object.keys(assets as Record<string, unknown>).length) : 0;
  const count = (value: unknown, max: number) => Array.isArray(value) ? Math.min(max, value.length) : 0;
  const revision = Number.isInteger(data.revision) && Number(data.revision) >= 0 ? Number(data.revision) : 0;
  return { revision, caption: safeText(projectRecord.caption, 500),
    aspectRatio: projectRecord.aspectRatio === 'square' || projectRecord.aspectRatio === 'landscape' ? projectRecord.aspectRatio : 'portrait',
    clipCount: count(projectRecord.clips, 40), textLayerCount: count(projectRecord.textLayers, 40),
    imageLayerCount: count(projectRecord.imageLayers, 40), subtitleCount: count(projectRecord.subtitleSegments, 30),
    assetCount, updatedAt: timestampText(projectRecord.updatedAt || data.updatedAt),
    hasSoundtrack: Boolean(projectRecord.soundtrack), hasVoiceover: Boolean(projectRecord.voiceover) };
}