export type StudioVisualFilter = 'none' | 'cinematic' | 'warm' | 'monochrome' | 'vivid';

const FILTERS: Record<StudioVisualFilter, string> = {
  none: 'none',
  cinematic: 'contrast(1.12) saturate(0.88) brightness(0.94)',
  warm: 'sepia(0.18) saturate(1.15) brightness(1.02)',
  monochrome: 'grayscale(1) contrast(1.08)',
  vivid: 'saturate(1.35) contrast(1.06)',
};

export function normalizeStudioVisualFilter(value: unknown): StudioVisualFilter {
  return value === 'cinematic' || value === 'warm' || value === 'monochrome' || value === 'vivid' ? value : 'none';
}

/** The same filter string is consumed by CSS preview and Canvas 2D export. */
export function getStudioVisualFilterCss(value: unknown): string {
  return FILTERS[normalizeStudioVisualFilter(value)];
}
