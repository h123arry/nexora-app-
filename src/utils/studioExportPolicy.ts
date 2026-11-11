export type StudioExportResolution = '720p' | '1080p';
export type StudioAspectRatio = 'portrait' | 'square' | 'landscape';
const dimensionsByResolution: Record<StudioExportResolution, number> = { '720p': 720, '1080p': 1080 };
export function getStudioExportDimensions(aspectRatio: StudioAspectRatio, resolution: StudioExportResolution): { width: number; height: number } {
  const longEdge = dimensionsByResolution[resolution] ?? dimensionsByResolution['720p'];
  if (aspectRatio === 'portrait') return { width: longEdge, height: Math.round(longEdge * 16 / 9) };
  if (aspectRatio === 'square') return { width: longEdge, height: longEdge };
  return { width: Math.round(longEdge * 16 / 9), height: longEdge };
}
