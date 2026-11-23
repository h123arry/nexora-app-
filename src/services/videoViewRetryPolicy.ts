/** Bounded exponential backoff for transient public-video view write failures. */
export function getPublicVideoViewRetryDelayMs(attempt: number): number {
  const safeAttempt = Number.isFinite(attempt) ? Math.max(1, Math.min(6, Math.floor(attempt))) : 1;
  return Math.min(5 * 60_000, 15_000 * (2 ** (safeAttempt - 1)));
}
