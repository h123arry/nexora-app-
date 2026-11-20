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

  const activeMemberships = memberships.docs.filter(membership => (membership.data() || {}).status === 'active').slice(0, 12);
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

/**
 * Build a small, privacy-filtered sample of public NEXORA discovery activity.
 * Only public-audience posts are considered; account restrictions, private
 * profiles, bilateral blocks and deleted/archived content are rechecked here.
 * Media URLs, private identifiers and unbounded source documents are omitted.
 */
export async function loadVohPublicDiscovery(db: VohFirestoreReader, viewerUid: string) {
  if (!viewerUid) throw new Error('A verified account is required.');
  const [snapshot, viewerSettingsSnapshot] = await Promise.all([
    db.collection('posts').where('audience', '==', 'public').orderBy('timestamp', 'desc').limit(30).get(),
    db.collection('users').doc(viewerUid).collection('settings').doc('preferences').get(),
  ]);
  const viewerSettings = viewerSettingsSnapshot.data() || {};
  const viewerBlocks = new Set([
    ...(Array.isArray((viewerSettings as any).privacy?.blockedUserIds) ? (viewerSettings as any).privacy.blockedUserIds : []),
    ...(Array.isArray((viewerSettings as any).messaging?.blockedUserIds) ? (viewerSettings as any).messaging.blockedUserIds : []),
  ].filter((value): value is string => typeof value === 'string'));

  const visible = await Promise.all(snapshot.docs.map(async document => {
    const data = document.data() || {};
    if (data.audience !== 'public' || data.isArchived === true || data.deleted === true
      || ['deleted', 'removed', 'suspended', 'draft'].includes(safeText(data.status, 40).toLowerCase())) return null;
    const ownerId = safeText(data.userId || data.authorId || data.ownerId, 150);
    if (!ownerId || viewerBlocks.has(ownerId)) return null;
    const [profileSnapshot, settingsSnapshot, statusSnapshot] = await Promise.all([
      db.collection('users').doc(ownerId).get(),
      db.collection('users').doc(ownerId).collection('settings').doc('preferences').get(),
      db.collection('accountStatus').doc(ownerId).get(),
    ]);
    if (!profileSnapshot || profileSnapshot.exists === false) return null;
    const profile = profileSnapshot.data() || {};
    const settings = settingsSnapshot.data() || {};
    const accountStatus = statusSnapshot.data() || {};
    if (profile.isSeedProfile === true || profile.isBanned === true || profile.isSuspended === true) return null;
    const expiryValue = (accountStatus as any).expiresAt;
    const expiryDate = expiryValue && typeof expiryValue === 'object' && 'toDate' in expiryValue
      && typeof (expiryValue as {toDate?: unknown}).toDate === 'function'
      ? (expiryValue as {toDate: () => Date}).toDate()
      : expiryValue instanceof Date ? expiryValue : typeof expiryValue === 'string' || typeof expiryValue === 'number' ? new Date(expiryValue) : null;
    const hasActiveRestriction = (accountStatus as any).banned === true || (accountStatus as any).suspended === true;
    if (hasActiveRestriction && (!expiryDate || !Number.isFinite(expiryDate.getTime()) || expiryDate.getTime() > Date.now())) return null;
    const ownerBlocks = [
      ...((settings as any).privacy?.blockedUserIds || []),
      ...((settings as any).messaging?.blockedUserIds || []),
    ];
    if (Array.isArray(ownerBlocks) && ownerBlocks.includes(viewerUid)) return null;
    const isPrivate = (settings as any).privacy?.isPrivate === true || (settings as any).privacy?.isPrivateAccount === true;
    if (isPrivate) {
      const follow = await db.collection('follows').doc(viewerUid + '_' + ownerId).get();
      if (!follow || follow.exists === false) return null;
    }
    const content = safeText(data.content || data.caption, 500);
    if (!content) return null;
    const tags = Array.isArray(data.tags)
      ? [...new Set(data.tags.filter((tag): tag is string => typeof tag === 'string').map(tag => safeText(tag.replace(/^#/, ''), 40)).filter(Boolean))].slice(0, 6)
      : [];
    const likes = typeof data.likes === 'number' && Number.isFinite(data.likes) ? Math.max(0, Math.min(1_000_000, Math.floor(data.likes))) : 0;
    const comments = typeof data.commentsCount === 'number' && Number.isFinite(data.commentsCount) ? Math.max(0, Math.min(1_000_000, Math.floor(data.commentsCount))) : 0;
    return {
      id: safeText(document.id, 128),
      username: safeText(profile.username || data.username || 'NEXORA creator', 80),
      content,
      tags,
      timestamp: timestampText(data.timestamp || data.createdAt),
      likes,
      comments,
      creatorKey: ownerId,
    };
  }));

  const posts = visible.filter((item): item is NonNullable<typeof item> => item !== null);
  const groups = new Map<string, { posts: Set<string>; creators: Set<string> }>();
  for (const post of posts) {
    for (const tag of post.tags) {
      const key = tag.toLocaleLowerCase();
      const group = groups.get(key) || { posts: new Set<string>(), creators: new Set<string>() };
      group.posts.add(post.id);
      group.creators.add(post.creatorKey);
      groups.set(key, group);
    }
  }
  const trendingTopics = [...groups.entries()]
    .filter(([, group]) => group.posts.size >= 2 && group.creators.size >= 2)
    .map(([tag, group]) => ({ tag, postCount: group.posts.size, creatorCount: group.creators.size }))
    .sort((a, b) => b.postCount - a.postCount || b.creatorCount - a.creatorCount || a.tag.localeCompare(b.tag))
    .slice(0, 8);
  return {
    sampleSize: posts.length,
    sampledAt: new Date().toISOString(),
    posts: posts.slice(0, 12).map(({ creatorKey: _creatorKey, ...post }) => post),
    trendingTopics,
  };
}
