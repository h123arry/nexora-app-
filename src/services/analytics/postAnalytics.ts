import { Post } from '../../types';

export interface PostAnalyticsSnapshot {
  views: number | null;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  totalInteractions: number;
  engagementRate: number | null;
}

function safeCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/**
 * Derive creator-facing metrics only from counters actually stored on a post.
 * A null view count means the rate is unavailable, not zero.
 */
export function buildPostAnalytics(post: Pick<Post,
  'views' | 'likes' | 'commentsCount' | 'comments' | 'shares' | 'saves' | 'bookmarksCount'
>): PostAnalyticsSnapshot {
  const views = typeof post.views === 'number' && Number.isFinite(post.views)
    ? safeCount(post.views)
    : null;
  const likes = safeCount(post.likes);
  const comments = safeCount(post.commentsCount ?? post.comments?.length ?? 0);
  const shares = safeCount(post.shares);
  const saves = safeCount(post.bookmarksCount ?? post.saves ?? 0);
  const totalInteractions = likes + comments + shares + saves;

  return {
    views,
    likes,
    comments,
    shares,
    saves,
    totalInteractions,
    engagementRate: views !== null && views > 0
      ? Number((totalInteractions / views * 100).toFixed(2))
      : null,
  };
}
