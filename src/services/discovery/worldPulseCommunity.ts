export interface WorldPulseCommunityPost {
  id: string;
  userId: string;
  timestamp: string | number;
  tags?: string[];
  likes?: number;
  commentsCount?: number;
  shares?: number;
}

export interface WorldPulseCommunitySummary {
  postCount: number;
  creatorCount: number;
  topicCount: number;
  interactionCount: number;
  recentPostCount: number;
}

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;
}

/** Summarizes only the public posts supplied by the caller; it does not imply platform-wide totals. */
export function summarizeWorldPulseCommunity(
  posts: readonly WorldPulseCommunityPost[],
  now: number = Date.now(),
): WorldPulseCommunitySummary {
  const validPosts = posts.filter(post =>
    typeof post.id === 'string' && post.id.length > 0
    && typeof post.userId === 'string' && post.userId.length > 0
    && Number.isFinite(typeof post.timestamp === 'number' ? post.timestamp : Date.parse(post.timestamp)),
  );
  const creators = new Set<string>();
  const topics = new Set<string>();
  let interactionCount = 0;
  let recentPostCount = 0;

  for (const post of validPosts) {
    creators.add(post.userId);
    for (const tag of Array.isArray(post.tags) ? post.tags : []) {
      if (typeof tag !== 'string') continue;
      const normalized = tag.trim().replace(/^#+/, '').toLowerCase();
      if (normalized) topics.add(normalized);
    }
    interactionCount += safeCount(post.likes) + safeCount(post.commentsCount) + safeCount(post.shares);
    const timestamp = typeof post.timestamp === 'number' ? post.timestamp : Date.parse(post.timestamp);
    if (timestamp <= now && timestamp >= now - 24 * 60 * 60 * 1000) recentPostCount += 1;
  }

  return {
    postCount: validPosts.length,
    creatorCount: creators.size,
    topicCount: topics.size,
    interactionCount,
    recentPostCount,
  };
}
