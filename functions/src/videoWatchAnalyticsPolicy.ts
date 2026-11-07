export interface WatchHeartbeatInput { elapsedSeconds: number; previousPositionSeconds: number; nextPositionSeconds: number; }

/** Credit only plausible forward progress over server-measured time. */
export function acceptedWatchCredit({elapsedSeconds,previousPositionSeconds,nextPositionSeconds}: WatchHeartbeatInput): number {
  if (![elapsedSeconds,previousPositionSeconds,nextPositionSeconds].every(Number.isFinite)) return 0;
  if (elapsedSeconds < 2 || elapsedSeconds > 30) return 0;
  const progress = nextPositionSeconds - previousPositionSeconds;
  if (progress <= 0.25 || progress > elapsedSeconds * 1.75 + 2) return 0;
  return Math.min(elapsedSeconds,15);
}
