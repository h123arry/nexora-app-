import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

const QUERY_LIMIT = 8;
const QUERY_KEYS = [
  'usersUsername', 'usersNameLower', 'usersNameTitle',
  'pagesUsername', 'pagesNameLower', 'pagesNameTitle',
  'circlesNameLower', 'circlesNameTitle',
] as const;
type QueryKey = typeof QUERY_KEYS[number];
type DirectoryCursor = { version: 1; term: string; after: Record<QueryKey, string | null> };

function normalizeQuery(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter a search term.');
  const normalized = value.normalize('NFKC').trim().toLocaleLowerCase();
  if (normalized.length < 2 || normalized.length > 40 || /[\u0000-\u001f]/.test(normalized)) {
    throw new Error('Search terms must be between 2 and 40 characters.');
  }
  return normalized;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 200) : [];
}

function emptyCursor(term: string): DirectoryCursor {
  return {
    version: 1,
    term,
    after: Object.fromEntries(QUERY_KEYS.map(key => [key, null])) as Record<QueryKey, string | null>,
  };
}

function decodeCursor(value: unknown, term: string): DirectoryCursor {
  if (value === undefined || value === null || value === '') return emptyCursor(term);
  if (typeof value !== 'string' || value.length > 4096) throw new Error('The directory cursor is invalid. Restart your search.');
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<DirectoryCursor>;
    if (parsed.version !== 1 || parsed.term !== term || !parsed.after || typeof parsed.after !== 'object') {
      throw new Error('invalid cursor');
    }
    const after = {} as Record<QueryKey, string | null>;
    for (const key of QUERY_KEYS) {
      const id = parsed.after[key];
      if (id !== null && (typeof id !== 'string' || id.length > 150 || id.includes('/'))) throw new Error('invalid cursor');
      after[key] = id || null;
    }
    return { version: 1, term, after };
  } catch {
    throw new Error('The directory cursor is invalid. Restart your search.');
  }
}

function encodeCursor(cursor: DirectoryCursor): string | null {
  if (QUERY_KEYS.every(key => cursor.after[key] === null)) return null;
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

export interface DirectorySearchResult {
  people: Array<{ id: string; username: string; name: string; avatar: string; bio: string; isVerified: boolean }>;
  pages: Array<{ id: string; username: string; name: string; avatar: string; category: string; description: string }>;
  circles: Array<{ id: string; name: string; description: string; bannerImage: string }>;
  nextCursor: string | null;
}

/** Cursor-paginated server directory search with block, suspension and private-profile filtering. */
export async function searchPublicDirectory(
  db: Firestore, viewerUid: string, rawQuery: unknown, rawCursor?: unknown,
): Promise<DirectorySearchResult> {
  if (!viewerUid) throw new Error('Sign in to search NEXORA.');
  const term = normalizeQuery(rawQuery);
  const cursor = decodeCursor(rawCursor, term);
  const prefixEnd = term + '\uf8ff';
  const titlePrefix = term.charAt(0).toLocaleUpperCase() + term.slice(1);
  const titlePrefixEnd = titlePrefix + '\uf8ff';

  const queryPage = async (collection: 'users' | 'pages' | 'communities', field: string, start: string, end: string, key: QueryKey) => {
    let query = db.collection(collection).orderBy(field).startAt(start).endAt(end).limit(QUERY_LIMIT + 1);
    const afterId = cursor.after[key];
    if (afterId) {
      const afterDoc = await db.collection(collection).doc(afterId).get();
      if (!afterDoc.exists) throw new Error('The directory cursor is stale. Restart your search.');
      query = query.startAfter(afterDoc);
    }
    const snapshot = await query.get();
    cursor.after[key] = snapshot.size > QUERY_LIMIT ? snapshot.docs[QUERY_LIMIT - 1].id : null;
    return snapshot.docs.slice(0, QUERY_LIMIT);
  };

  const [viewerSettings, peopleByUsername, peopleByName, peopleByTitle, pagesByUsername, pagesByName, pagesByTitle, circlesByName, circlesByTitle] = await Promise.all([
    db.collection('users').doc(viewerUid).collection('settings').doc('preferences').get(),
    queryPage('users', 'username', term, prefixEnd, 'usersUsername'),
    queryPage('users', 'name', term, prefixEnd, 'usersNameLower'),
    queryPage('users', 'name', titlePrefix, titlePrefixEnd, 'usersNameTitle'),
    queryPage('pages', 'username', term, prefixEnd, 'pagesUsername'),
    queryPage('pages', 'name', term, prefixEnd, 'pagesNameLower'),
    queryPage('pages', 'name', titlePrefix, titlePrefixEnd, 'pagesNameTitle'),
    queryPage('communities', 'name', term, prefixEnd, 'circlesNameLower'),
    queryPage('communities', 'name', titlePrefix, titlePrefixEnd, 'circlesNameTitle'),
  ]);

  const viewerData = viewerSettings.data() || {};
  const viewerBlocks = new Set([
    ...strings(viewerData?.messaging?.blockedUserIds),
    ...strings(viewerData?.privacy?.blockedUserIds),
  ]);
  const candidates = [...new Map([...peopleByUsername, ...peopleByName, ...peopleByTitle].map(doc => [doc.id, doc])).values()]
    .filter(doc => doc.id !== viewerUid && doc.get('isBanned') !== true && doc.get('isSuspended') !== true && doc.get('isSeedProfile') !== true)
    .sort((a, b) => {
      const relevance = (doc: QueryDocumentSnapshot) => {
        const username = String(doc.get('username') || '').toLocaleLowerCase();
        const name = String(doc.get('name') || '').toLocaleLowerCase();
        if (username === term) return 0;
        if (username.startsWith(term)) return 1;
        if (name === term) return 2;
        if (name.startsWith(term)) return 3;
        return 4;
      };
      return relevance(a) - relevance(b) || String(a.get('username') || '').localeCompare(String(b.get('username') || ''));
    });

  const people = (await Promise.all(candidates.map(async candidate => {
    if (viewerBlocks.has(candidate.id)) return null;
    const [settings, follow] = await Promise.all([
      db.collection('users').doc(candidate.id).collection('settings').doc('preferences').get(),
      db.collection('follows').doc(viewerUid + '_' + candidate.id).get(),
    ]);
    const privacy = settings.data() || {};
    const candidateBlocks = [
      ...strings(privacy?.messaging?.blockedUserIds),
      ...strings(privacy?.privacy?.blockedUserIds),
    ];
    if (candidateBlocks.includes(viewerUid)) return null;
    if (privacy?.privacy?.isPrivate === true && !follow.exists) return null;
    const data = candidate.data();
    return {
      id: candidate.id,
      username: String(data.username || ''),
      name: String(data.name || data.username || 'NEXORA member'),
      avatar: String(data.avatar || ''),
      bio: String(data.bio || ''),
      isVerified: data.isVerified === true,
    };
  }))).filter((item): item is NonNullable<typeof item> => item !== null);

  const pages = [...new Map([...pagesByUsername, ...pagesByName, ...pagesByTitle].map(doc => [doc.id, doc])).values()]
    .filter(item => item.get('status') !== 'suspended')
    .map(item => ({
      id: item.id, username: String(item.get('username') || ''),
      name: String(item.get('name') || 'NEXORA Page'),
      avatar: String(item.get('avatar') || ''),
      category: String(item.get('category') || 'Page'),
      description: String(item.get('description') || '').slice(0, 240),
    }));

  const circles = [...new Map([...circlesByName, ...circlesByTitle].map(doc => [doc.id, doc])).values()]
    .filter(item => item.get('type') === 'public' && !strings(item.get('bannedUsers')).includes(viewerUid))
    .map(item => ({
      id: item.id, name: String(item.get('name') || 'Circle'),
      description: String(item.get('description') || '').slice(0, 240),
      bannerImage: String(item.get('bannerImage') || ''),
    }));

  return { people, pages, circles, nextCursor: encodeCursor(cursor) };
}
