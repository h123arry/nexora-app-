export type VideoPreloadMode = 'auto' | 'metadata' | 'none';
export type VideoQualityTier = 'high' | 'medium' | 'low';

export interface VideoNetworkHints {
  effectiveType?: string;
  saveData?: boolean;
  downlinkMbps?: number;
  rttMs?: number;
}

export interface VideoNetworkPolicy {
  qualityTier: VideoQualityTier;
  activePreload: 'auto' | 'metadata';
  neighborPreload: 'metadata' | 'none';
  maxPreloadedNeighbors: 0 | 1 | 2;
  dataSaver: boolean;
}

/**
 * Conservative network policy for mobile-first video delivery.
 * This selects browser loading behavior only; it does not claim to transcode
 * media or switch CDN renditions when the source has no adaptive manifest.
 */
export function getVideoNetworkPolicy(hints: VideoNetworkHints = {}): VideoNetworkPolicy {
  const effectiveType = String(hints.effectiveType || '').toLowerCase();
  const downlink = Number.isFinite(hints.downlinkMbps) ? Math.max(0, hints.downlinkMbps as number) : null;
  const rtt = Number.isFinite(hints.rttMs) ? Math.max(0, hints.rttMs as number) : null;
  const dataSaver = hints.saveData === true || effectiveType === 'slow-2g' || effectiveType === '2g';
  const constrained = dataSaver || effectiveType === '3g' || (downlink !== null && downlink < 1.5) || (rtt !== null && rtt > 700);
  const low = dataSaver || effectiveType === '3g' || (downlink !== null && downlink < 0.8) || (rtt !== null && rtt > 1200);
  return {
    qualityTier: low ? 'low' : constrained ? 'medium' : 'high',
    activePreload: dataSaver ? 'metadata' : 'auto',
    neighborPreload: constrained ? 'metadata' : 'metadata',
    maxPreloadedNeighbors: dataSaver ? 0 : constrained ? 1 : 2,
    dataSaver,
  };
}

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

/** Keeps the active video and at most its immediate video neighbor prepared. */
export function getVideoPreloadPlan(input: VideoPreloadPlanInput): VideoPreloadPlan {
  if (!input.isVideo) return { shouldPreload: false, isReleased: false, preloadMode: 'none' };
  if (input.isActive) return { shouldPreload: false, isReleased: false, preloadMode: 'auto' };
  const hasActiveVideo = input.activeVideoIndex >= 0;
  const isAdjacentVideo = hasActiveVideo && Math.abs(input.postVideoIndex - input.activeVideoIndex) === 1;
  const shouldPreload = isAdjacentVideo;
  const isReleased = hasActiveVideo
    ? !isAdjacentVideo
    : input.activePostIndex < 0 || Math.abs(input.postIndex - input.activePostIndex) > 2;
  return {
    shouldPreload,
    isReleased,
    preloadMode: shouldPreload ? (input.isSlowConnection ? 'metadata' : 'auto') : 'none',
  };
}
