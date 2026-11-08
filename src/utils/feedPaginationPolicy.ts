export interface FeedLoadMoreInput {
  distanceToBottom: number;
  threshold?: number;
  visibleCount: number;
  totalCount: number;
  hasMorePosts: boolean;
  isLoadingMorePosts: boolean;
  requestInFlight: boolean;
}

export interface FeedLoadMoreDecision {
  shouldRevealMore: boolean;
  shouldRequestMore: boolean;
}

/** Keeps scroll-driven pagination bounded and prevents duplicate page requests. */
export function getFeedLoadMoreDecision(input: FeedLoadMoreInput): FeedLoadMoreDecision {
  const threshold = typeof input.threshold === 'number' && Number.isFinite(input.threshold)
    ? Math.max(0, input.threshold)
    : 350;
  const nearBottom = Number.isFinite(input.distanceToBottom)
    && input.distanceToBottom >= 0
    && input.distanceToBottom < threshold;

  return {
    shouldRevealMore: nearBottom && input.visibleCount < input.totalCount,
    shouldRequestMore: nearBottom
      && input.hasMorePosts
      && !input.isLoadingMorePosts
      && !input.requestInFlight,
  };
}
