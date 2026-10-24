import { Post } from '../../types';

export type FeedMode = 'forYou' | 'following' | 'latest' | 'trending';

export interface RankingContext {
  followingIds?: string[];
  interestDNA?: Record<string, number>;
  mutedCreatorIds?: string[];
  blockedCreatorIds?: string[];
  notInterestedTags?: string[];
  hiddenPostIds?: string[];
  seenPostIds?: string[];
  mode?: FeedMode;
  maxPostsPerCreator?: number;
  now?: number;
}

export interface RankedPost<T extends Post = Post> {
  post: T;
  score: number;
  reasons: string[];
}

export const RANKING_WEIGHTS = Object.freeze({
  follow: 24,
  interest: 8,
  recency: 1.6,
  meaningfulConversation: 3,
  verifiedTrust: 2,
  popularity: 4,
  unseen: 10,
});

function ageHours(timestamp: unknown, now: number): number {
  if (timestamp instanceof Date) return Math.max(0, (now - timestamp.getTime()) / 3_600_000);
  if (typeof timestamp === 'number') return Math.max(0, (now - timestamp) / 3_600_000);
  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    if (!Number.isNaN(parsed)) return Math.max(0, (now - parsed) / 3_600_000);
  }
  return 24;
}

function normalizedTags(post: Post): string[] {
  return (post.tags || []).map(tag => tag.replace(/^#/, '').trim().toLowerCase()).filter(Boolean);
}

function engagementScore(post: Post): number {
  // Log scaling prevents a historically large account from dominating solely
  // because of lifetime counters. Conversation and sharing carry more signal
  // than passive likes, but all values are bounded by the logarithm.
  const likes = Math.log1p(Math.max(0, post.likes || 0));
  const comments = Math.log1p(Math.max(0, post.commentsCount || post.comments?.length || 0));
  const shares = Math.log1p(Math.max(0, post.shares || 0));
  const saves = Math.log1p(Math.max(0, post.bookmarksCount || post.saves || 0));
  return likes + comments * RANKING_WEIGHTS.meaningfulConversation + shares * 2 + saves * 1.5;
}

function stableTieBreak<T extends Post>(a: { post: T; index: number }, b: { post: T; index: number }): number {
  return a.index - b.index || String(a.post.id).localeCompare(String(b.post.id));
}

export function rankPosts<T extends Post>(posts: T[], context: RankingContext = {}): RankedPost<T>[] {
  const now = context.now ?? Date.now();
  const following = new Set(context.followingIds || []);
  const muted = new Set(context.mutedCreatorIds || []);
  const blocked = new Set(context.blockedCreatorIds || []);
  const hidden = new Set(context.hiddenPostIds || []);
  const seen = new Set(context.seenPostIds || []);
  const notInterested = new Set((context.notInterestedTags || []).map(tag => tag.replace(/^#/, '').toLowerCase()));
  const interests = Object.entries(context.interestDNA || {}).reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key.replace(/^#/, '').toLowerCase()] = Number.isFinite(value) ? Math.max(0, value) : 0;
    return acc;
  }, {});
  const mode = context.mode || 'forYou';
  const maxPostsPerCreator = Math.max(1, context.maxPostsPerCreator ?? 3);

  const candidates = posts
    .map((post, index) => ({ post, index }))
    .filter(({ post }) => !muted.has(post.userId) && !blocked.has(post.userId) && !hidden.has(post.id))
    .filter(({ post }) => !normalizedTags(post).some(tag => notInterested.has(tag)))
    .filter(({ post }) => !post.isArchived && (!post.scheduledTime || new Date(post.scheduledTime).getTime() <= now))
    .map(({ post, index }) => {
      const tags = normalizedTags(post);
      const matchedTags = tags.filter(tag => interests[tag] > 0);
      const interestScore = matchedTags.reduce((sum, tag) => sum + Math.min(3, interests[tag]), 0) * RANKING_WEIGHTS.interest;
      const age = ageHours(post.timestamp, now);
      const freshness = Math.max(0, 48 - age) * RANKING_WEIGHTS.recency;
      const followBoost = following.has(post.userId) ? RANKING_WEIGHTS.follow : 0;
      const unseenBoost = seen.has(post.id) ? 0 : RANKING_WEIGHTS.unseen;
      const score = mode === 'latest'
        ? Math.max(0, 7 * 24 - age)
        : mode === 'following'
          ? freshness + followBoost + unseenBoost
          : mode === 'trending'
            ? Math.min(60, engagementScore(post) * RANKING_WEIGHTS.popularity) + Math.max(0, 72 - age) * 1.8
            : interestScore + freshness + followBoost + unseenBoost
              + engagementScore(post) * RANKING_WEIGHTS.popularity
              + (post.isVerified ? RANKING_WEIGHTS.verifiedTrust : 0);
      const reasons: string[] = [];
      if (followBoost) reasons.push('from an account you follow');
      if (matchedTags.length) reasons.push(`matches topics ${matchedTags.slice(0, 2).map(tag => `#${tag}`).join(' and ')}`);
      if (age < 24) reasons.push('recently published');
      if (!seen.has(post.id)) reasons.push('new to your feed');
      if (mode === 'trending') reasons.push('showing recent community activity');
      if (reasons.length === 0) reasons.push('eligible from available post metadata');
      return { post, index, score, reasons };
    })
    .sort((a, b) => b.score - a.score || stableTieBreak(a, b));

  // Greedy author diversity is applied after scoring so relevant content stays
  // eligible without allowing one prolific account to monopolize the page.
  const selected: RankedPost<T>[] = [];
  const authorCounts = new Map<string, number>();
  const deferred: RankedPost<T>[] = [];
  for (const candidate of candidates) {
    const count = authorCounts.get(candidate.post.userId) || 0;
    const ranked = { post: candidate.post, score: Math.round(candidate.score * 100) / 100, reasons: candidate.reasons };
    if (count < maxPostsPerCreator) {
      selected.push(ranked);
      authorCounts.set(candidate.post.userId, count + 1);
    } else {
      deferred.push(ranked);
    }
  }
  return selected.concat(deferred);
}

export function searchPosts<T extends Post>(posts: T[], query: string, options: { videosOnly?: boolean; limit?: number } = {}): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  const limit = Math.min(100, Math.max(1, options.limit ?? 100));
  const candidates = posts.filter(post => !post.isArchived && (!options.videosOnly || Boolean(post.videoUrl)));
  if (!normalizedQuery) return candidates.slice(0, limit);
  if (normalizedQuery.length > 120) return [];
  const terms = normalizedQuery.replace(/^#/, '').split(/\s+/).filter(Boolean);
  return candidates
    .map((post, index) => {
      const fields = [post.content, post.username, post.name, post.communityName || '', ...(post.tags || [])].map(value => String(value).toLowerCase());
      const score = terms.reduce((total, term) => total + fields.reduce((fieldScore, field) => fieldScore + (field === term ? 5 : field.includes(term) ? 1 : 0), 0), 0);
      return { post, score, index };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(result => result.post);
}
