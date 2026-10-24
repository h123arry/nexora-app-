import { Post } from '../../types';

export interface RankingContext {
  followingIds?: string[];
  interestDNA?: Record<string, number>;
  mutedCreatorIds?: string[];
  notInterestedTags?: string[];
  now?: number;
}

export interface RankedPost<T extends Post = Post> {
  post: T;
  score: number;
  reasons: string[];
}

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
  return (post.tags || []).map(tag => tag.replace(/^#/, '').toLowerCase());
}

export function rankPosts<T extends Post>(posts: T[], context: RankingContext = {}): RankedPost<T>[] {
  const now = context.now ?? Date.now();
  const following = new Set(context.followingIds || []);
  const muted = new Set(context.mutedCreatorIds || []);
  const notInterested = new Set((context.notInterestedTags || []).map(tag => tag.replace(/^#/, '').toLowerCase()));
  const interests = Object.entries(context.interestDNA || {}).reduce<Record<string, number>>((acc, [key, value]) => {
    acc[key.replace(/^#/, '').toLowerCase()] = Number.isFinite(value) ? value : 0;
    return acc;
  }, {});

  return posts
    .filter(post => !muted.has(post.userId) && !normalizedTags(post).some(tag => notInterested.has(tag)))
    .map(post => {
      const tags = normalizedTags(post);
      const interestScore = tags.reduce((sum, tag) => sum + (interests[tag] || 0), 0);
      const engagement = (post.likes || 0) * 1.5 + (post.commentsCount || post.comments?.length || 0) * 2 + (post.shares || 0) * 3 + (post.bookmarksCount || 0) * 2.5;
      const recency = Math.max(0, 24 - ageHours(post.timestamp, now)) * 1.2;
      const followBoost = following.has(post.userId) ? 18 : 0;
      const creatorTrust = post.isVerified ? 3 : 0;
      const score = interestScore + engagement + recency + followBoost + creatorTrust;
      const reasons: string[] = [];
      if (followBoost) reasons.push('from an account you follow');
      if (interestScore > 0) reasons.push('matches topics you interact with');
      if (recency >= 12) reasons.push('recently published');
      if (engagement >= 10) reasons.push('showing meaningful community activity');
      if (creatorTrust) reasons.push('from a verified creator');
      if (reasons.length === 0) reasons.push('eligible from the available post metadata');
      return { post, score, reasons };
    })
    .sort((a, b) => b.score - a.score || String(b.post.id).localeCompare(String(a.post.id)));
}

export function searchPosts<T extends Post>(posts: T[], query: string, options: { videosOnly?: boolean; limit?: number } = {}): T[] {
  const terms = query.trim().toLowerCase().replace(/^#/, '').split(/\s+/).filter(Boolean);
  const candidates = options.videosOnly ? posts.filter(post => Boolean(post.videoUrl)) : posts;
  if (terms.length === 0) return candidates.slice(0, options.limit ?? 100);
  return candidates
    .map(post => {
      const fields = [post.content, post.username, post.name, post.communityName || '', ...(post.tags || [])].map(value => String(value).toLowerCase());
      const score = terms.reduce((total, term) => total + fields.reduce((fieldScore, field) => fieldScore + (field === term ? 5 : field.includes(term) ? 1 : 0), 0), 0);
      return { post, score };
    })
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score || String(b.post.id).localeCompare(String(a.post.id)))
    .slice(0, options.limit ?? 100)
    .map(result => result.post);
}
