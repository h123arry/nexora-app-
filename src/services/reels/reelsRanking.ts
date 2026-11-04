import type { Post } from '../../types';

export interface ReelSignals {
  watchedSeconds?: number;
  completed?: boolean;
  rewatches?: number;
  liked?: boolean;
  shared?: boolean;
  saved?: boolean;
  followedCreator?: boolean;
  notInterested?: boolean;
}

export interface ReelRankedPost {
  post: Post;
  score: number;
  reasons: string[];
}

type ReelRankingContext = {
  blockedCreatorIds?: string[];
  mutedCreatorIds?: string[];
  hiddenPostIds?: string[];
  notInterestedTags?: string[];
  viewerId?: string;
  now?: number;
};

const signalStorageKey = (postId: string, viewerId?: string) =>
  `nexora_reel_signals_v2_${encodeURIComponent(viewerId || 'guest')}_${encodeURIComponent(postId)}`;

const normalizeSignals = (value: unknown): ReelSignals => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>;
  const finiteCount = (input: unknown, max: number) =>
    typeof input === 'number' && Number.isFinite(input) ? Math.max(0, Math.min(max, input)) : 0;
  return {
    watchedSeconds: finiteCount(raw.watchedSeconds, 60 * 60),
    rewatches: finiteCount(raw.rewatches, 20),
    completed: raw.completed === true,
    liked: raw.liked === true,
    shared: raw.shared === true,
    saved: raw.saved === true,
    followedCreator: raw.followedCreator === true,
    notInterested: raw.notInterested === true,
  };
};

const readSignals = (postId: string, viewerId?: string): ReelSignals => {
  try {
    const raw = localStorage.getItem(signalStorageKey(postId, viewerId));
    return raw ? normalizeSignals(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
};

export function recordReelSignal(postId: string, patch: ReelSignals, viewerId?: string): void {
  if (!postId || postId.length > 200) return;
  try {
    const key = signalStorageKey(postId, viewerId);
    const next = normalizeSignals({ ...readSignals(postId, viewerId), ...patch });
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Ranking remains usable in private browsing and restricted storage modes.
  }
}

function getAgeHours(timestamp: unknown, now: number): number {
  const parsed = timestamp instanceof Date
    ? timestamp.getTime()
    : typeof timestamp === 'number'
      ? timestamp
      : Date.parse(String(timestamp || ''));
  return Number.isFinite(parsed) ? Math.max(0, (now - parsed) / 3_600_000) : 24;
}

/**
 * Ranks short videos using bounded, explainable signals. Personal signals are
 * stored per viewer so a shared device never blends one account's preferences
 * into another account's reel recommendations.
 */
export function rankReels(
  posts: Post[],
  followingIds: string[],
  interests: Record<string, number> = {},
  context: ReelRankingContext = {},
): ReelRankedPost[] {
  const now = context.now ?? Date.now();
  const following = new Set(followingIds || []);
  const blocked = new Set(context.blockedCreatorIds || []);
  const muted = new Set(context.mutedCreatorIds || []);
  const hidden = new Set(context.hiddenPostIds || []);
  const notInterested = new Set((context.notInterestedTags || []).map(tag => tag.replace(/^#/, '').trim().toLowerCase()));
  const interestScores = Object.entries(interests || {}).reduce<Record<string, number>>((result, [tag, score]) => {
    const key = tag.replace(/^#/, '').trim().toLowerCase();
    if (key && Number.isFinite(score)) result[key] = Math.max(0, Math.min(20, score));
    return result;
  }, {});

  const ranked = posts
    .filter(post => Boolean(post.videoUrl))
    .filter(post => !blocked.has(post.userId || '') && !muted.has(post.userId || ''))
    .filter(post => !hidden.has(post.id))
    .filter(post => !(post.tags || []).some(tag => notInterested.has(tag.replace(/^#/, '').trim().toLowerCase())))
    .map((post, index) => ({ post, index, signals: readSignals(post.id, context.viewerId) }))
    .filter(({ signals }) => !signals.notInterested)
    .map(({ post, index, signals }) => {
      const tags = (post.tags || []).map(tag => tag.replace(/^#/, '').trim().toLowerCase()).filter(Boolean);
      const matchedTags = [...new Set(tags)].filter(tag => interestScores[tag] > 0);
      const ageHours = getAgeHours(post.timestamp, now);
      const freshness = Math.max(0, 36 - ageHours) * 1.25;
      const watchScore = signals.completed
        ? 28
        : Math.min(18, Math.log1p(signals.watchedSeconds || 0) * 5);
      const meaningfulActions =
        (signals.liked ? 8 : 0) +
        (signals.shared ? 16 : 0) +
        (signals.saved ? 13 : 0);
      const rewatchScore = Math.min(16, (signals.rewatches || 0) * 4);
      const followScore = following.has(post.userId || '') ? 22 : signals.followedCreator ? 10 : 0;
      const popularity = Math.min(12, Math.log1p(Math.max(0, post.likes || 0)) * 1.5 +
        Math.log1p(Math.max(0, post.shares || 0)) * 2);
      const interestScore = Math.min(24, matchedTags.reduce((sum, tag) => sum + Math.min(4, interestScores[tag]), 0) * 2);
      const score = Math.round((freshness + watchScore + meaningfulActions + rewatchScore + followScore + popularity + interestScore) * 100) / 100;
      const reasons: string[] = [];
      if (signals.completed || signals.watchedSeconds) reasons.push(signals.completed ? 'You finished this reel' : 'Your watch time informs this pick');
      if (followScore) reasons.push(following.has(post.userId || '') ? 'From a creator you follow' : 'You have engaged with this creator');
      if (matchedTags.length) reasons.push(`Matches ${matchedTags.slice(0, 2).map(tag => `#${tag}`).join(' and ')}`);
      if (freshness >= 18) reasons.push('Fresh in the Nexora network');
      if (meaningfulActions) reasons.push('Based on meaningful interactions');
      if (!reasons.length) reasons.push('A fresh video from the Nexora network');
      return { post, score, reasons, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index || String(a.post.id).localeCompare(String(b.post.id)));

  // Interleave creators without deleting eligible posts. Diversity is a
  // sequence preference, not a hidden penalty against smaller creators.
  const remaining = [...ranked];
  const selected: typeof ranked = [];
  const creatorCounts = new Map<string, number>();
  while (remaining.length) {
    const previousCreator = selected[selected.length - 1]?.post.userId || '';
    let runLength = 0;
    for (let index = selected.length - 1; index >= 0; index -= 1) {
      if ((selected[index].post.userId || '') !== previousCreator) break;
      runLength += 1;
    }
    let nextIndex = remaining.findIndex(item =>
      (creatorCounts.get(item.post.userId || '') || 0) < 3 &&
      ((item.post.userId || '') !== previousCreator || runLength < 1)
    );
    if (nextIndex < 0) nextIndex = remaining.findIndex(item => (creatorCounts.get(item.post.userId || '') || 0) < 3);
    if (nextIndex < 0) break;
    const [next] = remaining.splice(nextIndex, 1);
    selected.push({ post: next.post, score: next.score, reasons: next.reasons, index: next.index });
    const creatorId = next.post.userId || '';
    creatorCounts.set(creatorId, (creatorCounts.get(creatorId) || 0) + 1);
  }
  return selected.map(({ post, score, reasons }) => ({ post, score, reasons }))
    .concat(remaining.map(({ post, score, reasons }) => ({ post, score, reasons })));
}
