export type VideoPreloadMode = 'auto' | 'metadata' | 'none';

export interface VideoPreloadPlanInput {
  isVideo: boolean;
  isActive: boolean;
  postIndex: number;
  activePostIndex: number;
  postVideoIndex: number;
  activeVideoIndex: number;
  isSlowConnection: boolean;
  isOffline?: boolean;
  isConstrainedDevice?: boolean;
}

export interface VideoPreloadPlan {
  shouldPreload: boolean;
  isReleased: boolean;
  preloadMode: VideoPreloadMode;
}

/**
 * Keeps the active video ready and prepares only its immediate video
 * neighbors. Data-saving/slow connections use metadata-only preparation;
 * offline sessions never start speculative network requests.
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
  const isReleased = hasActiveVideo
    ? !isAdjacentVideo
    : input.activePostIndex < 0 || Math.abs(input.postIndex - input.activePostIndex) > 2;

  if (input.isOffline) {
    return { shouldPreload: false, isReleased: false, preloadMode: 'none' };
  }

  const shouldPreload = isAdjacentVideo;
  return {
    shouldPreload,
    isReleased,
    preloadMode: shouldPreload
      ? (input.isSlowConnection || input.isConstrainedDevice ? 'metadata' : 'auto')
      : 'none',
  };
}


export interface VideoPosterLoadInput {
  isActive?: boolean;
  isNearby: boolean;
  shouldPreload: boolean;
  isReleased?: boolean;
}

/** Avoid fetching poster assets for released/offscreen video players. */
export function shouldLoadVideoPoster(input: VideoPosterLoadInput): boolean {
  if (input.isReleased) return false;
  return (input.isActive ?? true) || input.isNearby || input.shouldPreload;
}
