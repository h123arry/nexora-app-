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

const readSignals = (postId: string): ReelSignals => {
  try {
    const raw = localStorage.getItem(`nexora_reel_signals_${postId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export function recordReelSignal(postId: string, patch: ReelSignals): void {
  try {
    const next = { ...readSignals(postId), ...patch };
    localStorage.setItem(`nexora_reel_signals_${postId}`, JSON.stringify(next));
  } catch {
    // Ranking remains usable in private browsing and restricted storage modes.
  }
}

/**
 * Ranks short videos without hiding the reason each item was selected.
 * The formula is deliberately bounded so one noisy signal cannot dominate.
 */
export function rankReels(
  posts: Post[],
  followingIds: string[],
  interests: Record<string, number> = {},
  context: { blockedCreatorIds?: string[]; mutedCreatorIds?: string[]; hiddenPostIds?: string[]; notInterestedTags?: string[]; now?: number } = {},
): ReelRankedPost[] {
  const now = context.now ?? Date.now();
  const blocked = new Set(context.blockedCreatorIds || []);
  const muted = new Set(context.mutedCreatorIds || []);
  const hidden = new Set(context.hiddenPostIds || []);
  const notInterested = new Set((context.notInterestedTags || []).map(tag => tag.replace(/^#/, '').toLowerCase()));
  return posts
    .filter(post => Boolean(post.videoUrl) && !blocked.has(post.userId) && !muted.has(post.userId) && !hidden.has(post.id) && !(post.tags || []).some(tag => notInterested.has(tag.replace(/^#/, '').toLowerCase())))
    .map(post => {
      const signals = readSignals(post.id);
      if (signals.notInterested) return { post, score: -Infinity, reasons: ['Marked not interested'] };
      const parsedTimestamp = post.timestamp instanceof Date ? post.timestamp.getTime() : typeof post.timestamp === 'number' ? post.timestamp : Date.parse(String(post.timestamp || ''));
      const ageHours = Number.isFinite(parsedTimestamp) ? Math.max(0, (now - parsedTimestamp) / 3_600_000) : 24;
      const freshness = Math.max(0, 24 - ageHours) * 1.5;
      const completion = signals.completed ? 28 : Math.min(18, (signals.watchedSeconds || 0) * 2);
      const social = (signals.liked ? 10 : 0) + (signals.shared ? 16 : 0) + (signals.saved ? 12 : 0);
      const rewatch = Math.min(18, (signals.rewatches || 0) * 6);
      const followBoost = followingIds.includes(post.userId) ? 26 : signals.followedCreator ? 12 : 0;
      const popularity = Math.min(18, (post.likes || 0) / 1000 + (post.shares || 0) / 500);
      const matchedTags = (post.tags || []).filter(tag => (interests[tag] || interests[tag.toLowerCase()]) > 0);
      const interestBoost = Math.min(20, matchedTags.length * 7);
      const score = Math.round(freshness + completion + social + rewatch + followBoost + popularity + interestBoost);
      const reasons: string[] = [];
      if (completion > 0) reasons.push(signals.completed ? 'You finished this reel' : 'Strong watch-time signal');
      if (followBoost > 0) reasons.push(followingIds.includes(post.userId) ? 'From a creator you follow' : 'You often engage with this creator');
      if (interestBoost > 0) reasons.push(`Matches ${matchedTags.slice(0, 2).map(tag => `#${tag}`).join(' and ')}`);
      if (freshness >= 18) reasons.push('Fresh in the Nexora network');
      if (reasons.length === 0) reasons.push('Popular with the Nexora community');
      return { post, score, reasons };
    })
    .filter(item => item.score !== -Infinity)
    .sort((a, b) => b.score - a.score || String(a.post.id).localeCompare(String(b.post.id)));
}
