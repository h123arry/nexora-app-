export const STUDIO_CROSS_DISSOLVE_SECONDS = 0.6;
export function getCrossDissolveProgress(currentTime: number, clipEnd: number, duration = STUDIO_CROSS_DISSOLVE_SECONDS): number {
  if (![currentTime, clipEnd, duration].every(Number.isFinite) || duration <= 0) return 0;
  return Math.min(1, Math.max(0, (currentTime - (clipEnd - duration)) / duration));
}
