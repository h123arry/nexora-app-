export type StudioExportResolution = '720p' | '1080p';
export type StudioAspectRatio = 'portrait' | 'square' | 'landscape';
const dimensionsByResolution: Record<StudioExportResolution, number> = { '720p': 720, '1080p': 1080 };
export function getStudioExportDimensions(aspectRatio: StudioAspectRatio, resolution: StudioExportResolution): { width: number; height: number } {
  const longEdge = dimensionsByResolution[resolution] ?? dimensionsByResolution['720p'];
  if (aspectRatio === 'portrait') return { width: longEdge, height: Math.round(longEdge * 16 / 9) };
  if (aspectRatio === 'square') return { width: longEdge, height: longEdge };
  return { width: Math.round(longEdge * 16 / 9), height: longEdge };
}

export function getStudioExpectedExportDuration(
  clipDurations: number[],
  transition: 'cut' | 'fade' | 'cross-dissolve',
  crossDissolveSeconds = 0.6,
  fadeOutSeconds = 0.35,
): number {
  const durations = clipDurations.map(duration => Number.isFinite(duration) ? Math.max(0, duration) : 0);
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  if (transition === 'cross-dissolve') {
    const overlap = durations.slice(0, -1).reduce((sum, duration, index) =>
      sum + Math.min(Math.max(0, crossDissolveSeconds), duration, durations[index + 1]), 0);
    return Math.max(0, total - overlap);
  }
  if (transition === 'fade') return total + Math.max(0, fadeOutSeconds) * Math.max(0, durations.length - 1);
  return total;
}


export type StudioExportQuality = 'balanced' | 'high';

export function getStudioExportBitrates(
  resolution: StudioExportResolution,
  quality: StudioExportQuality,
): { video: number; audio: number } {
  const video = resolution === '1080p'
    ? (quality === 'high' ? 12_000_000 : 7_000_000)
    : (quality === 'high' ? 8_000_000 : 4_500_000);
  return { video, audio: quality === 'high' ? 192_000 : 128_000 };
}

export function estimateStudioExportSizeBytes(
  durationSeconds: number,
  resolution: StudioExportResolution,
  quality: StudioExportQuality,
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return 0;
  const bitrates = getStudioExportBitrates(resolution, quality);
  // Add 8% for container/encoding overhead; this is an estimate, not a guarantee.
  return Math.ceil((durationSeconds * (bitrates.video + bitrates.audio) / 8) * 1.08);
}
