export type StudioVisualFilter = 'none' | 'cinematic' | 'warm' | 'monochrome' | 'vivid';

const FILTERS: Record<StudioVisualFilter, string> = {
  none: 'none',
  cinematic: 'contrast(1.12) saturate(.88)',
  warm: 'sepia(.16) saturate(1.12) hue-rotate(-8deg)',
  monochrome: 'grayscale(1)',
  vivid: 'saturate(1.35) contrast(1.06)',
};

export function normalizeStudioVisualFilter(value: unknown): StudioVisualFilter {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(FILTERS, value)
    ? value as StudioVisualFilter
    : 'none';
}

export function getStudioVisualFilterCss(value: unknown): string {
  return FILTERS[normalizeStudioVisualFilter(value)];
}
