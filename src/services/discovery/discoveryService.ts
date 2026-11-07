import { User, Post } from '../../types';
import { boundedEngagementScore, freshnessMultiplier, normalizeSearchText, scoreSearchTerms } from './discoveryQuality';

export type FeedMode = 'forYou' | 'following' | 'latest' | 'trending';

export interface RankingContext {
  followingIds?: string[];
  interestDNA?: Record<string, number>;
  recommendationSignals?: { tags?: Record<string, number>; creators?: Record<string, number>; communities?: Record<string, number> };
  mutedCreatorIds?: string[];
  blockedCreatorIds?: string[];
  notInterestedTags?: string[];
  hiddenPostIds?: string[];
  seenPostIds?: string[];
  mode?: FeedMode;
  maxPostsPerCreator?: number;
  maxConsecutivePostsPerCreator?: number;
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
  return boundedEngagementScore({
    likes: post.likes,
    comments: post.commentsCount || post.comments?.length || 0,
    shares: post.shares,
    saves: post.bookmarksCount || post.saves || 0,
  });
}

function recommendationSignalScore(post: Post, signals?: RankingContext['recommendationSignals']): number {
  if (!signals) return 0;
  const tags = normalizedTags(post);
  let score = tags.reduce((total, tag) => total + (signals.tags?.[tag] || 0), 0);
  const content = normalizeSearchText(post.content || '');
  for (const [keyword, weight] of Object.entries(signals.tags || {})) {
    const normalized = normalizeSearchText(keyword);
    if (normalized.length > 2 && content.includes(normalized) && !tags.includes(normalized)) score += weight * 0.3;
  }
  score += signals.creators?.[post.userId] || 0;
  if (post.username && post.username !== post.userId) score += signals.creators?.[post.username] || 0;
  if (post.communityName) score += signals.communities?.[post.communityName] || 0;
  return Math.max(-100, Math.min(100, score));
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
    // The Following tab is an eligibility boundary, not merely a ranking hint.
    // Never fill it with unrelated creators when the followed set is small or empty.
    .filter(({ post }) => mode !== 'following' || following.has(post.userId))
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
      const feedbackScore = recommendationSignalScore(post, context.recommendationSignals);
      const score = mode === 'latest'
        // A negative age score preserves chronological order even for posts
        // older than seven days; clamping at zero would make old posts tie.
        ? -age
        : mode === 'following'
          ? freshness + followBoost + unseenBoost
          : mode === 'trending'
            ? Math.min(60, engagementScore(post) * RANKING_WEIGHTS.popularity * freshnessMultiplier(age, 24)) + Math.max(0, 72 - age) * 1.8
            : interestScore + freshness + followBoost + unseenBoost
              + engagementScore(post) * RANKING_WEIGHTS.popularity * freshnessMultiplier(age, 36)
              + (post.isVerified ? RANKING_WEIGHTS.verifiedTrust : 0)
              + feedbackScore * 0.5;
      const reasons: string[] = [];
      if (followBoost) reasons.push('from an account you follow');
      if (matchedTags.length) reasons.push(`matches topics ${matchedTags.slice(0, 2).map(tag => `#${tag}`).join(' and ')}`);
      if (age < 24) reasons.push('recently published');
      if (!seen.has(post.id)) reasons.push('new to your feed');
      if (mode === 'trending') reasons.push('showing recent community activity');
      if (mode === 'forYou' && feedbackScore !== 0) reasons.push('adjusted using your recent feedback');
      if (reasons.length === 0) reasons.push('eligible from available post metadata');
      return { post, index, score, reasons };
    })
    .sort((a, b) => b.score - a.score || stableTieBreak(a, b));

  // Diversify the visible sequence after scoring. A creator can still appear
  // more than once, but a different eligible creator is preferred between
  // consecutive posts. This is a presentation rule, not a popularity penalty.
  const rankedCandidates = candidates.map(candidate => ({
    post: candidate.post,
    score: Math.round(candidate.score * 100) / 100,
    reasons: candidate.reasons,
  }));
  const maxConsecutive = Math.max(1, context.maxConsecutivePostsPerCreator ?? 1);
  const remaining = [...rankedCandidates];
  const selected: RankedPost<T>[] = [];
  const authorCounts = new Map<string, number>();
  while (remaining.length > 0) {
    const previousAuthor = selected[selected.length - 1]?.post.userId;
    let consecutiveRun = 0;
    for (let index = selected.length - 1; index >= 0; index -= 1) {
      if (selected[index].post.userId !== previousAuthor) break;
      consecutiveRun += 1;
    }
    let nextIndex = remaining.findIndex(item =>
      (authorCounts.get(item.post.userId) || 0) < maxPostsPerCreator &&
      (item.post.userId !== previousAuthor || consecutiveRun < maxConsecutive)
    );
    if (nextIndex < 0) {
      nextIndex = remaining.findIndex(item => (authorCounts.get(item.post.userId) || 0) < maxPostsPerCreator);
    }
    if (nextIndex < 0) break;
    const [next] = remaining.splice(nextIndex, 1);
    selected.push(next);
    authorCounts.set(next.post.userId, (authorCounts.get(next.post.userId) || 0) + 1);
  }
  // Keep over-limit candidates available after all eligible authors, rather
  // than silently dropping otherwise valid posts from the loaded page.
  return selected.concat(remaining);
}

export function searchPosts<T extends Post>(posts: T[], query: string, options: { videosOnly?: boolean; limit?: number } = {}): T[] {
  const normalizedQuery = normalizeSearchText(query);
  const limit = Math.min(100, Math.max(1, options.limit ?? 100));
  const candidates = posts.filter(post => !post.isArchived && (!options.videosOnly || Boolean(post.videoUrl)));
  if (!normalizedQuery) return candidates.slice(0, limit);
  if (normalizedQuery.length > 120) return [];
  return candidates
    .map((post, index) => {
      const fields = [post.content, post.username, post.name, post.communityName || '', ...(post.tags || [])];
      const score = scoreSearchTerms(normalizedQuery, fields);
      return { post, score: score ?? -1, index };
    })
    .filter(result => result.score >= 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(result => result.post);
}

/**
 * Search creators already loaded by the client. This is bounded local search,
 * not a claim that NEXORA has a global server-side people index.
 */
export function searchCreators<T extends User>(
  creators: T[],
  query: string,
  options: { limit?: number } = {},
): T[] {
  const normalizedQuery = normalizeSearchText(query).replace(/^@/, '');
  const limit = Math.min(100, Math.max(1, options.limit ?? 50));
  const uniqueCreators = creators.filter((creator, index, all) =>
    !creator.isBanned &&
    !creator.isSuspended &&
    all.findIndex(candidate => candidate.id === creator.id) === index
  );

  if (!normalizedQuery) return uniqueCreators.slice(0, limit);
  if (normalizedQuery.length > 120) return [];

  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  return uniqueCreators
    .map((creator, index) => {
      const username = normalizeSearchText(creator.username || '').replace(/^@/, '');
      const name = normalizeSearchText(creator.name || '');
      const bio = normalizeSearchText(creator.bio || '');
      const skills = (creator.skills || []).map(skill => normalizeSearchText(skill));
      const interestTags = Object.keys(creator.interestDNA || {}).map(tag => normalizeSearchText(tag));
      const fields = [username, name, bio, ...skills, ...interestTags];
      const termScores = terms.map(term => {
        if (username === term) return 12;
        if (username.startsWith(term)) return 8;
        if (name === term) return 10;
        if (name.startsWith(term)) return 7;
        return fields.reduce((fieldScore, field) =>
          fieldScore + (field === term ? 5 : field.includes(term) ? 1 : 0), 0);
      });
      const score = termScores.reduce((total, value) => total + value, 0);
      return { creator, score, matchedAllTerms: termScores.every(value => value > 0), index };
    })
    .filter(result => result.matchedAllTerms)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(result => result.creator);
}


export interface CreatorRecommendation<T extends User = User> {
  creator: T;
  score: number;
  sharedTopics: string[];
  reason: string;
}

/** Recommend creators using explicit interest overlap, never synthetic global popularity. */
export function recommendCreators<T extends User>(
  creators: T[],
  options: {
    viewerId?: string;
    followingIds?: string[];
    blockedCreatorIds?: string[];
    mutedCreatorIds?: string[];
    interests?: Record<string, number>;
    limit?: number;
  } = {},
): CreatorRecommendation<T>[] {
  const following = new Set(options.followingIds || []);
  const blocked = new Set(options.blockedCreatorIds || []);
  const muted = new Set(options.mutedCreatorIds || []);
  const interests = Object.entries(options.interests || {}).reduce<Record<string, number>>((out, [tag, value]) => {
    const key = tag.replace(/^#/, '').trim().toLowerCase();
    if (key && Number.isFinite(value)) out[key] = Math.max(0, Math.min(100, value));
    return out;
  }, {});
  const limit = Math.min(50, Math.max(1, options.limit ?? 12));
  const unique = creators.filter((creator, index, all) =>
    creator.id !== options.viewerId && !following.has(creator.id) &&
    !blocked.has(creator.id) && !muted.has(creator.id) &&
    !creator.isBanned && !creator.isSuspended &&
    all.findIndex(item => item.id === creator.id) === index
  );
  const ranked = unique.map((creator, index) => {
    const sharedTopics = Object.keys(creator.interestDNA || {})
      .map(tag => tag.replace(/^#/, '').trim().toLowerCase())
      .filter((tag, tagIndex, all) => Boolean(tag) && all.indexOf(tag) === tagIndex && interests[tag] > 0)
      .sort((a, b) => (interests[b] || 0) - (interests[a] || 0))
      .slice(0, 3);
    const overlap = sharedTopics.reduce((sum, tag) =>
      sum + Math.min(interests[tag] || 0, Math.max(0, Math.min(100, Number(creator.interestDNA[tag] || creator.interestDNA[`#${tag}`] || 0)))), 0);
    const score = Math.round(overlap + (creator.isVerified ? 3 : 0) + Math.min(5, Math.log1p(Math.max(0, creator.followers || 0))));
    return { creator, score, sharedTopics, reason: sharedTopics.length ? `Shares your interest in ${sharedTopics.map(tag => `#${tag}`).join(', ')}` : 'A creator to discover', index };
  })
    .filter(item => item.score > 0 && (Object.keys(interests).length === 0 || item.sharedTopics.length > 0))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  // Prevent one dominant interest from occupying the entire recommendation
  // shelf. The cap is soft: if no alternative topic exists, eligible creators
  // remain discoverable rather than disappearing.
  const topicCap = Math.max(2, Math.ceil(limit / 3));
  const topicCounts = new Map<string, number>();
  const selected: typeof ranked = [];
  const remaining = [...ranked];
  while (remaining.length && selected.length < limit) {
    let nextIndex = remaining.findIndex(item => {
      const topic = item.sharedTopics[0] || 'general';
      return (topicCounts.get(topic) || 0) < topicCap;
    });
    if (nextIndex < 0) nextIndex = 0;
    const [next] = remaining.splice(nextIndex, 1);
    selected.push(next);
    const topic = next.sharedTopics[0] || 'general';
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
  }
  return selected.map(({ index: _index, ...item }) => item);
}

export interface TrendingTopic {
  tag: string;
  postCount: number;
  creatorCount: number;
  engagement: number;
  score: number;
}

/** Rank topics from recent loaded posts, requiring activity from multiple creators. */
export function rankTrendingTopics(
  posts: Post[],
  options: { now?: number; windowHours?: number; minPosts?: number; limit?: number } = {},
): TrendingTopic[] {
  const now = options.now ?? Date.now();
  const windowHours = Math.max(1, Math.min(24 * 30, options.windowHours ?? 24 * 7));
  const minPosts = Math.max(1, options.minPosts ?? 2);
  const cutoff = now - windowHours * 3_600_000;
  const topics = new Map<string, { postIds: Set<string>; creators: Set<string>; creatorContributions: Map<string, number>; engagement: number; newest: number }>();
  for (const post of posts) {
    if (post.isArchived || (post.scheduledTime && Date.parse(post.scheduledTime) > now)) continue;
    const timestamp = Date.parse(String(post.timestamp || ''));
    if (!Number.isFinite(timestamp) || timestamp < cutoff || timestamp > now) continue;
    for (const tag of normalizedTags(post)) {
      const entry = topics.get(tag) || { postIds: new Set<string>(), creators: new Set<string>(), creatorContributions: new Map<string, number>(), engagement: 0, newest: 0 };
      if (entry.postIds.has(post.id)) continue;
      entry.postIds.add(post.id);
      entry.creators.add(post.userId);
      const creatorContributionCount = entry.creatorContributions.get(post.userId) || 0;
      // Count all unique posts and creators, but cap each creator's engagement
      // contribution so one prolific account cannot manufacture a trend spike.
      if (creatorContributionCount < 3) {
        const age = Math.max(0, (now - timestamp) / 3_600_000);
        entry.engagement += boundedEngagementScore({ likes: post.likes, comments: post.commentsCount, shares: post.shares }) * freshnessMultiplier(age, Math.max(6, windowHours / 2));
        entry.creatorContributions.set(post.userId, creatorContributionCount + 1);
      }
      entry.newest = Math.max(entry.newest, timestamp);
      topics.set(tag, entry);
    }
  }
  return [...topics.entries()]
    .filter(([, item]) => item.postIds.size >= minPosts && item.creators.size >= 2)
    .map(([tag, item]) => {
      const freshness = Math.max(0, 1 - (now - item.newest) / (windowHours * 3_600_000));
      const score = Math.round((item.postIds.size * 2 + item.creators.size * 3 + item.engagement + freshness * 5) * 100) / 100;
      return { tag, postCount: item.postIds.size, creatorCount: item.creators.size, engagement: Math.round(item.engagement * 100) / 100, score };
    })
    .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag))
    .slice(0, Math.min(30, Math.max(1, options.limit ?? 10)));
}
