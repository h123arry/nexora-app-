/**
 * Credit only forward media-time progress that could plausibly have been
 * watched in real time. Seeks, rewinds, paused updates and long timer gaps
 * must never inflate recommendation watch-time signals.
 */
export function getCreditedWatchDelta(
  previousMediaTime: number | null,
  currentMediaTime: number,
  isPlaying: boolean,
  maxDeltaSeconds = 2.5,
): number {
  if (!isPlaying || previousMediaTime === null) return 0;
  if (!Number.isFinite(previousMediaTime) || !Number.isFinite(currentMediaTime)) return 0;
  const delta = currentMediaTime - previousMediaTime;
  if (delta <= 0 || delta > maxDeltaSeconds) return 0;
  return delta;
}
