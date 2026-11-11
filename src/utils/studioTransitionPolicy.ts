export const STUDIO_CROSS_DISSOLVE_SECONDS = 0.6;
export function getCrossDissolveProgress(currentTime: number, clipEnd: number, duration = STUDIO_CROSS_DISSOLVE_SECONDS): number {
  if (![currentTime, clipEnd, duration].every(Number.isFinite) || duration <= 0) return 0;
  return Math.round(Math.min(1, Math.max(0, (currentTime - (clipEnd - duration)) / duration)) * 1000) / 1000;
}

export function getCrossDissolveAudioGains(progress: number): { outgoing: number; incoming: number } {
  const normalized = Number.isFinite(progress) ? Math.min(1, Math.max(0, progress)) : 0;
  return {
    outgoing: Math.cos(normalized * Math.PI / 2),
    incoming: Math.sin(normalized * Math.PI / 2),
  };
}
