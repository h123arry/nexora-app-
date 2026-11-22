export interface IdentifiedMediaPost {
  id: string;
}

/** Keep the active post selected when a feed refreshes or changes its ordering. */
export function resolvePreservedMediaIndex<T extends IdentifiedMediaPost>(
  posts: T[],
  activePostId: string,
  initialPostId: string,
  previousInitialPostId: string,
): number {
  if (posts.length === 0) return 0;
  const preferredId = initialPostId !== previousInitialPostId ? initialPostId : activePostId;
  const index = posts.findIndex(post => post?.id === preferredId);
  return index >= 0 ? index : 0;
}

/** Resolve the nearest full-screen snap page from the native scroll position. */
export function getNearestMediaIndex(scrollTop: number, viewportHeight: number, itemCount: number): number {
  if (!Number.isFinite(scrollTop) || !Number.isFinite(viewportHeight) || viewportHeight <= 0 || itemCount <= 0) return 0;
  const nearest = Math.round(Math.max(0, scrollTop) / viewportHeight);
  return Math.max(0, Math.min(itemCount - 1, nearest));
}
