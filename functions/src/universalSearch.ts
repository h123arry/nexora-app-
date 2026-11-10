import type { Firestore, QueryDocumentSnapshot } from 'firebase-admin/firestore';

export type SearchKind = 'person' | 'post' | 'video' | 'page' | 'circle' | 'live' | 'event' | 'service' | 'update' | 'hashtag';
export interface SearchHit {
  id: string; kind: SearchKind; title: string; subtitle: string; excerpt: string;
  image: string; targetId: string; targetPath: string; ownerId: string;
  verified: boolean; createdAt: string; score: number; tags: string[];
}
export interface UniversalSearchResult { results: SearchHit[]; nextCursor: string | null; query: string; }
const INDEX = 'searchIndex';
const PAGE_SIZE = 120;
const CANDIDATE_LIMIT = PAGE_SIZE + 1;
const MAX_CURSOR = 2048;

export function normalizeSearchText(value: unknown): string {
  return typeof value === 'string'
    ? value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}_#@]+/gu, ' ').trim().slice(0, 4000)
    : '';
}
function tokens(value: unknown): string[] {
  return [...new Set(normalizeSearchText(value).replace(/[#@]/g, '').split(/\s+/).filter(word => word.length >= 2).slice(0, 180))];
}
function searchKeys(value: unknown): string[] {
  const words = tokens(value);
  const keys = new Set<string>();
  for (const word of words) {
    for (let length = 2; length <= Math.min(word.length, 16); length++) keys.add('p:' + word.slice(0, length));
  }
  // Bigram fallback enables a bounded typo-tolerant candidate pass.
  for (const word of words) {
    for (let i = 0; i < word.length - 1; i++) keys.add('b:' + word.slice(i, i + 2));
  }
  return [...keys].slice(0, 260);
}
function asDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as {toDate?: unknown}).toDate === 'function') {
    const date = (value as {toDate: () => Date}).toDate();
    if (Number.isFinite(date.getTime())) return date;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) return date;
  }
  return new Date(0);
}
function safeString(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
function publicRecord(kind: SearchKind, id: string, path: string, data: Record<string, unknown>, parent?: Record<string, unknown>) {
  const title = safeString(data.name || data.title || data.content || data.question || data.serviceName, 180);
  const body = safeString(data.description || data.bio || data.content || data.caption || data.question, 1800);
  const tags = Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string').slice(0, 24) : [];
  const ownerId = safeString(data.userId || data.authorId || data.ownerId || data.hostId || data.createdBy, 150);
  const createdAt = asDate(data.timestamp || data.createdAt || data.startedAt || data.updatedAt);
  const subtitle = safeString(data.username || data.category || data.hostName || data.authorUsername || (kind === 'event' ? data.location : ''), 120);
  const image = safeString(data.avatar || data.authorAvatar || data.thumbnailUrl || data.coverImage || data.bannerImage, 1200);
  const searchText = [title, body, subtitle, safeString(data.username, 80), safeString(data.category, 80), ...tags].join(' ');
  return {
    id, kind, title: title || 'NEXORA', subtitle, excerpt: body.slice(0, 260), image,
    targetId: id, targetPath: path, ownerId, verified: data.isVerified === true,
    createdAt, tags, searchKeys: searchKeys(searchText), normalizedText: normalizeSearchText(searchText),
    isPublic: true, parentId: safeString(parent?.id, 150), bannedUsers: Array.isArray(data.bannedUsers) ? data.bannedUsers.filter((item): item is string => typeof item === 'string').slice(0, 500) : [], scoreSignals: {
      likes: Math.max(0, Math.min(1000000, Number(data.likes || data.likesCount) || 0)),
      comments: Math.max(0, Math.min(1000000, Number(data.commentsCount) || 0)),
      views: Math.max(0, Math.min(10000000, Number(data.views || data.viewCount) || 0)),
    },
  };
}

/** Idempotently synchronize one source record into the private, server-only search projection. */
export async function syncUniversalSearchRecord(
  db: Firestore, kind: SearchKind, id: string, sourcePath: string,
  data: Record<string, unknown> | null, parent?: Record<string, unknown>,
): Promise<void> {
  const ref = db.collection(INDEX).doc(kind + '_' + id);
  if (!data) { await ref.delete().catch(() => undefined); return; }
  const status = safeString(data.status, 40).toLowerCase();
  const isEligible =
    (kind === 'person' && data.isBanned !== true && data.isSuspended !== true && data.isSeedProfile !== true) ||
    (kind === 'post' && (data.audience === 'public' || (parent?.isPrivate !== true && parent?.type !== 'private' && parent?.privacy !== 'private' && parent?.visibility !== 'private')) && status !== 'deleted' && status !== 'removed') ||
    (kind === 'video' && data.audience === 'public' && status !== 'deleted' && status !== 'removed') ||
    (kind === 'page' && status !== 'suspended' && status !== 'deleted' && status !== 'draft') ||
    (kind === 'circle' && data.isPrivate !== true && data.type !== 'private' && data.privacy !== 'private' && data.visibility !== 'private' && status !== 'suspended' && status !== 'deleted') ||
    (kind === 'live' && status === 'live') ||
    (kind === 'event' && status === 'scheduled' && parent?.isPrivate !== true && parent?.type !== 'private' && parent?.privacy !== 'private' && parent?.visibility !== 'private') ||
    (kind === 'service' && status === 'active' && parent?.category === 'Business') ||
    (kind === 'update' && status !== 'deleted' && parent?.status !== 'suspended');
  if (!isEligible) { await ref.delete().catch(() => undefined); return; }
  const record = publicRecord(kind, id, sourcePath, data, parent);
  if (record.title.length < 2 || record.searchKeys.length === 0) { await ref.delete().catch(() => undefined); return; }
  await ref.set(record);
}

function editDistanceAtMostOne(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
}
function relevance(queryWords: string[], doc: FirebaseFirestore.DocumentData): number | null {
  const title = normalizeSearchText(doc.title);
  const text = normalizeSearchText(doc.normalizedText);
  const titleWords = tokens(title);
  const allWords = tokens(text);
  let score = 0;
  for (const word of queryWords) {
    const exactTitle = titleWords.includes(word);
    const prefixTitle = titleWords.some(item => item.startsWith(word));
    const exactBody = allWords.includes(word);
    const prefixBody = allWords.some(item => item.startsWith(word));
    const typo = allWords.some(item => editDistanceAtMostOne(item, word));
    if (!exactTitle && !prefixTitle && !exactBody && !prefixBody && !typo) return null;
    score += exactTitle ? 18 : prefixTitle ? 14 : exactBody ? 10 : prefixBody ? 7 : 3;
  }
  const ageHours = Math.max(0, (Date.now() - asDate(doc.createdAt).getTime()) / 3600000);
  const freshness = Math.max(0, 6 - Math.log2(1 + ageHours / 12));
  const signals = doc.scoreSignals || {};
  const engagement = Math.min(8, Math.log1p(Number(signals.likes || 0)) * 0.7
    + Math.log1p(Number(signals.comments || 0)) * 0.9 + Math.log1p(Number(signals.views || 0)) * 0.2);
  return score + freshness + engagement + (doc.verified ? 1.5 : 0);
}
function decodeCursor(raw: unknown, query: string, key: string): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw !== 'string' || raw.length > MAX_CURSOR) throw new Error('Search cursor is invalid. Restart your search.');
  try {
    const value = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as {v?: number; q?: string; k?: string; after?: string};
    if (value.v !== 1 || value.q !== query || value.k !== key || typeof value.after !== 'string' || value.after.length > 160 || value.after.includes('/')) throw new Error('invalid');
    return value.after;
  } catch { throw new Error('Search cursor is invalid. Restart your search.'); }
}
function encodeCursor(query: string, key: string, after: string | null): string | null {
  return after ? Buffer.from(JSON.stringify({v:1,q:query,k:key,after})).toString('base64url') : null;
}

export async function searchNexoraContent(
  db: Firestore, viewerUid: string, rawQuery: unknown, rawCursor?: unknown, rawKinds?: unknown,
): Promise<UniversalSearchResult> {
  if (!viewerUid) throw new Error('Sign in to search NEXORA.');
  const query = normalizeSearchText(rawQuery);
  if (query.length < 2 || query.length > 80) throw new Error('Search terms must be between 2 and 80 characters.');
  const queryWords = tokens(query).slice(0, 6);
  if (!queryWords.length) throw new Error('Enter a search term.');
  const prefixKey = 'p:' + queryWords[0].slice(0, 16);
  const typoKeys = queryWords[0].length >= 3 ? [...new Set(Array.from({length: queryWords[0].length - 1}, (_, i) => 'b:' + queryWords[0].slice(i, i + 2)))].slice(0, 2) : [];
  const allowedKinds: SearchKind[] = ['person','post','video','page','circle','live','event','service','update','hashtag'];
  const requestedKinds = Array.isArray(rawKinds) ? rawKinds.filter((kind): kind is SearchKind => allowedKinds.includes(kind as SearchKind)) : allowedKinds;
  const key = prefixKey;
  const after = decodeCursor(rawCursor, query, key);
  let base = db.collection(INDEX).where('searchKeys', 'array-contains', key).limit(CANDIDATE_LIMIT);
  if (after) {
    const previous = await db.collection(INDEX).doc(after).get();
    if (!previous.exists) throw new Error('Search cursor is stale. Restart your search.');
    base = base.startAfter(previous) as typeof base;
  }
  const snapshot = await base.get();
  let candidateDocs: QueryDocumentSnapshot[] = [...snapshot.docs];
  let usedTypoFallback = false;
  if (snapshot.empty && !after && typoKeys.length) {
    const typoSnapshots = await Promise.all(typoKeys.map(searchKey => db.collection(INDEX).where('searchKeys','array-contains',searchKey).limit(60).get()));
    const docs = new Map<string, QueryDocumentSnapshot>();
    typoSnapshots.forEach(result => result.docs.forEach(doc => docs.set(doc.id, doc)));
    candidateDocs = [...docs.values()];
    usedTypoFallback = true;
  }
  const candidates = candidateDocs.filter(doc => requestedKinds.includes(doc.get('kind')) && doc.get('isPublic') === true);
  const viewerSettings = await db.collection('users').doc(viewerUid).collection('settings').doc('preferences').get();
  const viewerData = viewerSettings.data() || {};
  const blocked = new Set<string>([
    ...(Array.isArray(viewerData?.privacy?.blockedUserIds) ? viewerData.privacy.blockedUserIds : []),
    ...(Array.isArray(viewerData?.messaging?.blockedUserIds) ? viewerData.messaging.blockedUserIds : []),
  ].filter((item): item is string => typeof item === 'string'));
  const visibleCandidates = await Promise.all(candidates.map(async candidate => {
    const data = candidate.data();
    const ownerId = String(data.ownerId || '');
    if (ownerId && (blocked.has(ownerId) || (data.kind === 'person' && ownerId === viewerUid))) return null;
    if (ownerId && ['person','post','video','live'].includes(String(data.kind))) {
      const [ownerSettings, follow] = await Promise.all([
        db.collection('users').doc(ownerId).collection('settings').doc('preferences').get(),
        db.collection('follows').doc(viewerUid + '_' + ownerId).get(),
      ]);
      const privacy = ownerSettings.data() || {};
      const ownerBlocks = [
        ...(Array.isArray(privacy?.privacy?.blockedUserIds) ? privacy.privacy.blockedUserIds : []),
        ...(Array.isArray(privacy?.messaging?.blockedUserIds) ? privacy.messaging.blockedUserIds : []),
      ];
      if (ownerBlocks.includes(viewerUid)) return null;
      if (privacy?.privacy?.isPrivate === true && !follow.exists) return null;
    }
    if (data.kind === 'circle' && Array.isArray(data.bannedUsers) && data.bannedUsers.includes(viewerUid)) return null;
    return candidate;
  }));
  const hits: SearchHit[] = [];
  for (const candidate of visibleCandidates) {
    if (!candidate) continue;
    const data = candidate.data();
    const score = relevance(queryWords, data);
    if (score === null) continue;
    hits.push({
      id: candidate.id, kind: data.kind, title: String(data.title || ''), subtitle: String(data.subtitle || ''),
      excerpt: String(data.excerpt || ''), image: String(data.image || ''), targetId: String(data.targetId || ''),
      targetPath: String(data.targetPath || ''), ownerId: String(data.ownerId || ''), verified: data.verified === true,
      createdAt: asDate(data.createdAt).toISOString(), score, tags: Array.isArray(data.tags) ? data.tags.slice(0, 12) : [],
    });
  }
  const hashtagGroups = new Map<string, {count:number;creators:Set<string>;score:number;createdAt:string}>();
  for (const candidate of candidates) {
    const data = candidate.data();
    const score = relevance(queryWords, data);
    if (score === null || !Array.isArray(data.tags)) continue;
    for (const rawTag of data.tags) {
      if (typeof rawTag !== 'string') continue;
      const tag = normalizeSearchText(rawTag.replace(/^#/, '')).replace(/\\s+/g, ' ').slice(0, 40);
      if (!tag || !queryWords.some(word => tag.includes(word) || editDistanceAtMostOne(tag.split(' ')[0] || tag, word))) continue;
      const entry = hashtagGroups.get(tag) || {count:0,creators:new Set<string>(),score:0,createdAt:''};
      entry.count += 1;
      if (data.ownerId) entry.creators.add(String(data.ownerId));
      entry.score += score;
      entry.createdAt = [entry.createdAt, asDate(data.createdAt).toISOString()].sort().at(-1) || '';
      hashtagGroups.set(tag,entry);
    }
  }
  if (requestedKinds.includes('hashtag')) {
    for (const [tag, entry] of hashtagGroups) hits.push({
      id: 'hashtag_' + tag.replace(/[^a-z0-9]+/g,'_'), kind: 'hashtag', title: '#' + tag,
      subtitle: entry.count + ' matching public posts', excerpt: 'Explore public posts using this topic',
      image: '', targetId: tag, targetPath: 'explore', ownerId: '', verified: false,
      createdAt: entry.createdAt, score: entry.score + Math.min(5, entry.count), tags: [tag],
    });
  }
  hits.sort((a,b) => b.score - a.score || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  const results = hits.slice(0, PAGE_SIZE);
  const lastDoc = snapshot.docs.length >= CANDIDATE_LIMIT && !usedTypoFallback ? snapshot.docs[PAGE_SIZE - 1].id : null;
  return { results, nextCursor: encodeCursor(query,key,lastDoc), query };
}

export async function getNexoraTrending(db: Firestore): Promise<Array<{tag:string;score:number;postCount:number;creatorCount:number}>> {
  const posts = await db.collection('posts').where('audience','==','public').orderBy('timestamp','desc').limit(250).get();
  const groups = new Map<string,{score:number;posts:Set<string>;creators:Set<string>}>();
  const now = Date.now();
  for (const post of posts.docs) {
    const data = post.data();
    const ageHours = Math.max(0,(now-asDate(data.timestamp).getTime())/3600000);
    const tags = Array.isArray(data.tags) ? data.tags : [];
    const creator = String(data.userId || data.authorId || '');
    for (const raw of tags) {
      const tag = normalizeSearchText(String(raw).replace(/^#/,'')).replace(/\s+/g,' ').slice(0,40);
      if (!tag || tag.length < 2) continue;
      const entry = groups.get(tag) || {score:0,posts:new Set<string>(),creators:new Set<string>()};
      entry.posts.add(post.id); if (creator) entry.creators.add(creator);
      entry.score += Math.min(30,Math.log1p(Number(data.likes)||0)*2 + Math.log1p(Number(data.commentsCount)||0)*3) * Math.pow(0.5,ageHours/12);
      groups.set(tag,entry);
    }
  }
  return [...groups.entries()].filter(([,entry])=>entry.posts.size>=2 && entry.creators.size>=2)
    .map(([tag,entry])=>({tag,score:Math.round(entry.score*100)/100,postCount:entry.posts.size,creatorCount:entry.creators.size}))
    .sort((a,b)=>b.score-a.score).slice(0,20);
}
