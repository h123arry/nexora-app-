import type { Firestore } from 'firebase-admin/firestore';

const RESULT_LIMIT = 8;
const QUERY_LIMIT = 40;

function normalizeQuery(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Enter a search term.');
  const normalized = value.normalize('NFKC').trim().toLocaleLowerCase();
  if (normalized.length < 2 || normalized.length > QUERY_LIMIT || /[\u0000-\u001f]/.test(normalized)) {
    throw new Error('Search terms must be between 2 and 40 characters.');
  }
  return normalized;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string').slice(0, 200) : [];
}

export interface DirectorySearchResult {
  people: Array<{ id: string; username: string; name: string; avatar: string; bio: string; isVerified: boolean }>;
  pages: Array<{ id: string; username: string; name: string; avatar: string; category: string; description: string }>;
  circles: Array<{ id: string; name: string; description: string; bannerImage: string }>;
}

/** Server-backed prefix directory search with block, suspension and private-profile filtering. */
export async function searchPublicDirectory(
  db: Firestore, viewerUid: string, rawQuery: unknown,
): Promise<DirectorySearchResult> {
  if (!viewerUid) throw new Error('Sign in to search NEXORA.');
  const term = normalizeQuery(rawQuery);
  const prefixEnd = term + '\uf8ff';
  const titlePrefix = term.charAt(0).toLocaleUpperCase() + term.slice(1);
  const titlePrefixEnd = titlePrefix + '\uf8ff';
  const [viewerSettings, peopleByUsername, pagesByUsername, pagesByName, pagesByTitle, circles, circlesByTitle] = await Promise.all([
    db.collection('users').doc(viewerUid).collection('settings').doc('preferences').get(),
    db.collection('users').orderBy('username').startAt(term).endAt(prefixEnd).limit(RESULT_LIMIT * 2).get(),
    db.collection('pages').orderBy('username').startAt(term).endAt(prefixEnd).limit(RESULT_LIMIT).get(),
    db.collection('pages').orderBy('name').startAt(term).endAt(prefixEnd).limit(RESULT_LIMIT).get(),
    db.collection('pages').orderBy('name').startAt(titlePrefix).endAt(titlePrefixEnd).limit(RESULT_LIMIT).get(),
    db.collection('communities').where('type', '==', 'public').orderBy('name').startAt(term).endAt(prefixEnd).limit(RESULT_LIMIT).get(),
    db.collection('communities').where('type', '==', 'public').orderBy('name').startAt(titlePrefix).endAt(titlePrefixEnd).limit(RESULT_LIMIT).get(),
  ]);

  const viewerData = viewerSettings.data() || {};
  const viewerBlocks = new Set([
    ...strings(viewerData?.messaging?.blockedUserIds),
    ...strings(viewerData?.privacy?.blockedUserIds),
  ]);
  // Apply visibility and block filters before the final result cap. Otherwise a
  // block-heavy prefix can hide eligible accounts that appear later in the query.
  const candidates = [...new Map(peopleByUsername.docs.map(doc => [doc.id, doc])).values()]
    .filter(doc => doc.id !== viewerUid && doc.get('isBanned') !== true && doc.get('isSuspended') !== true && doc.get('isSeedProfile') !== true);

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
  }))).filter((item): item is NonNullable<typeof item> => item !== null).slice(0, RESULT_LIMIT);

  const pages = [...pagesByUsername.docs, ...pagesByName.docs, ...pagesByTitle.docs]
    .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)
    .filter(item => item.get('status') !== 'suspended')
    .slice(0, RESULT_LIMIT)
    .map(item => ({
      id: item.id, username: String(item.get('username') || ''),
      name: String(item.get('name') || 'NEXORA Page'),
      avatar: String(item.get('avatar') || ''),
      category: String(item.get('category') || 'Page'),
      description: String(item.get('description') || '').slice(0, 240),
    }));

  const visibleCircles = [...circles.docs, ...circlesByTitle.docs]
    .filter((item, index, all) => all.findIndex(other => other.id === item.id) === index)
    .filter(item => !strings(item.get('bannedUsers')).includes(viewerUid))
    .map(item => ({
      id: item.id, name: String(item.get('name') || 'Circle'),
      description: String(item.get('description') || '').slice(0, 240),
      bannerImage: String(item.get('bannerImage') || ''),
    }));

  return { people: people.slice(0, RESULT_LIMIT), pages, circles: visibleCircles };
}
