export interface WorldPulseSignalPost {
  id: string;
  userId: string;
  timestamp: string | number;
  tags?: string[];
  content?: string;
  likes?: number;
  commentsCount?: number;
  shares?: number;
  isArchived?: boolean;
  scheduledTime?: string;
}

export interface RisingTopicSignal {
  tag: string;
  currentPosts: number;
  previousPosts: number;
  creatorCount: number;
  engagement: number;
  growthMultiplier: number | null;
  status: 'new' | 'rising';
  score: number;
}

function postTime(post: WorldPulseSignalPost): number {
  const value = typeof post.timestamp === 'number' ? post.timestamp : Date.parse(String(post.timestamp || ''));
  return Number.isFinite(value) ? value : NaN;
}

function topicTags(post: WorldPulseSignalPost): string[] {
  const tags = (post.tags || []).map(tag => tag.replace(/^#/, '').trim().toLowerCase());
  const hashtags = (post.content || '').match(/#[\p{L}\p{N}_]{2,40}/gu) || [];
  return [...new Set([...tags, ...hashtags.map(tag => tag.slice(1).toLowerCase())])]
    .filter(tag => /^[\p{L}\p{N}_]{2,40}$/u.test(tag));
}

function boundedEngagement(post: WorldPulseSignalPost): number {
  const likes = Math.max(0, Math.min(1000, Number(post.likes) || 0));
  const comments = Math.max(0, Math.min(500, Number(post.commentsCount) || 0));
  const shares = Math.max(0, Math.min(500, Number(post.shares) || 0));
  return Math.min(25, Math.log1p(likes) * 0.7 + Math.log1p(comments) * 1.8 + Math.log1p(shares) * 2.2);
}

/**
 * Finds conversations gaining momentum in the latest window compared with
 * the immediately preceding window. Only public posts supplied by the caller
 * are considered; this function never invents global or external activity.
 */
export function rankRisingTopics(
  posts: WorldPulseSignalPost[],
  options: { now?: number; windowHours?: number; minPosts?: number; minCreators?: number; limit?: number } = {},
): RisingTopicSignal[] {
  const now = options.now ?? Date.now();
  const windowHours = Math.max(1, Math.min(24 * 14, options.windowHours ?? 24));
  const minPosts = Math.max(2, options.minPosts ?? 2);
  const minCreators = Math.max(2, options.minCreators ?? 2);
  const currentStart = now - windowHours * 3_600_000;
  const previousStart = currentStart - windowHours * 3_600_000;
  const signals = new Map<string, {
    currentPosts: Set<string>;
    previousPosts: Set<string>;
    currentCreators: Set<string>;
    creatorCounts: Map<string, number>;
    engagement: number;
  }>();

  for (const post of posts) {
    if (!post?.id || !post.userId || post.isArchived) continue;
    if (post.scheduledTime && Date.parse(post.scheduledTime) > now) continue;
    const timestamp = postTime(post);
    if (!Number.isFinite(timestamp) || timestamp < previousStart || timestamp > now) continue;

    for (const tag of topicTags(post)) {
      const signal = signals.get(tag) || {
        currentPosts: new Set<string>(),
        previousPosts: new Set<string>(),
        currentCreators: new Set<string>(),
        creatorCounts: new Map<string, number>(),
        engagement: 0,
      };
      const target = timestamp >= currentStart ? signal.currentPosts : signal.previousPosts;
      if (target.has(post.id)) continue;
      target.add(post.id);

      if (timestamp >= currentStart) {
        signal.currentCreators.add(post.userId);
        const creatorCount = signal.creatorCounts.get(post.userId) || 0;
        // Cap engagement contribution per creator to reduce trend manipulation.
        if (creatorCount < 3) {
          signal.engagement += boundedEngagement(post);
          signal.creatorCounts.set(post.userId, creatorCount + 1);
        }
      }
      signals.set(tag, signal);
    }
  }

  return [...signals.entries()]
    .filter(([, signal]) => signal.currentPosts.size >= minPosts && signal.currentCreators.size >= minCreators)
    .map(([tag, signal]) => {
      const currentPosts = signal.currentPosts.size;
      const previousPosts = signal.previousPosts.size;
      const status = previousPosts === 0 ? 'new' as const : 'rising' as const;
      const growthMultiplier = previousPosts === 0 ? null : Math.round((currentPosts / previousPosts) * 100) / 100;
      const acceleration = previousPosts === 0 ? currentPosts + 1 : currentPosts / previousPosts;
      const score = Math.round((currentPosts * 2 + signal.currentCreators.size * 3 + signal.engagement + Math.min(10, acceleration * 2)) * 100) / 100;
      return {
        tag,
        currentPosts,
        previousPosts,
        creatorCount: signal.currentCreators.size,
        engagement: Math.round(signal.engagement * 100) / 100,
        growthMultiplier,
        status,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || b.currentPosts - a.currentPosts || a.tag.localeCompare(b.tag))
    .slice(0, Math.min(20, Math.max(1, options.limit ?? 5)));
}
