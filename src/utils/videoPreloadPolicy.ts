export type VideoPreloadMode = 'auto' | 'metadata' | 'none';

export interface VideoPreloadPlanInput {
  isVideo: boolean;
  isActive: boolean;
  postIndex: number;
  activePostIndex: number;
  postVideoIndex: number;
  activeVideoIndex: number;
  isSlowConnection: boolean;
}

export interface VideoPreloadPlan {
  shouldPreload: boolean;
  isReleased: boolean;
  preloadMode: VideoPreloadMode;
}

/**
 * Keeps only the active video and its immediate video neighbor prepared.
 * Slow/data-saving connections still receive metadata-only preparation.
 */
export function getVideoPreloadPlan(input: VideoPreloadPlanInput): VideoPreloadPlan {
  if (!input.isVideo) {
    return { shouldPreload: false, isReleased: false, preloadMode: 'none' };
  }

  if (input.isActive) {
    return { shouldPreload: false, isReleased: false, preloadMode: 'auto' };
  }

  const hasActiveVideo = input.activeVideoIndex >= 0;
  const isAdjacentVideo = hasActiveVideo
    && Math.abs(input.postVideoIndex - input.activeVideoIndex) === 1;
  const shouldPreload = isAdjacentVideo;
  const isReleased = hasActiveVideo
    ? !isAdjacentVideo
    : input.activePostIndex < 0 || Math.abs(input.postIndex - input.activePostIndex) > 2;

  return {
    shouldPreload,
    isReleased,
    preloadMode: shouldPreload
      ? (input.isSlowConnection ? 'metadata' : 'auto')
      : 'none',
  };
}
