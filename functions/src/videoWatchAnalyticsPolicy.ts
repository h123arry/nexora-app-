export interface WatchHeartbeatInput { elapsedSeconds: number; previousPositionSeconds: number; nextPositionSeconds: number; }

/** Credit only plausible forward progress over server-measured time. */
export function acceptedWatchCredit({elapsedSeconds,previousPositionSeconds,nextPositionSeconds}: WatchHeartbeatInput): number {
  if (![elapsedSeconds,previousPositionSeconds,nextPositionSeconds].every(Number.isFinite)) return 0;
  if (elapsedSeconds < 2 || elapsedSeconds > 30) return 0;
  const progress = nextPositionSeconds - previousPositionSeconds;
  if (progress <= 0.25 || progress > elapsedSeconds * 1.75 + 2) return 0;
  return Math.min(elapsedSeconds,15);
}

export interface PublicVideoViewEligibilityInput {
  viewerId: string;
  creatorId: string;
  audience: unknown;
  creditedSeconds: number;
  alreadyCounted: boolean;
}

/** Count a public post view only after qualified playback, once per viewer/day marker. */
export function shouldCountPublicVideoView(input: PublicVideoViewEligibilityInput): boolean {
  return input.viewerId.length > 0
    && input.creatorId.length > 0
    && input.viewerId !== input.creatorId
    && input.audience === 'public'
    && Number.isFinite(input.creditedSeconds)
    && input.creditedSeconds > 0
    && input.alreadyCounted === false;
}
