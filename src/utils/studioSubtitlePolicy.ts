export type StudioSubtitleSegment = { id: string; text: string; start: number; end: number };

export function normalizeStudioSubtitleSegment(
  value: Partial<StudioSubtitleSegment> | null | undefined,
  fallbackId: string,
  totalDuration = 600,
): StudioSubtitleSegment {
  const duration = Number.isFinite(totalDuration) ? Math.max(0, totalDuration) : 600;
  const start = duration > 0 ? Math.min(Math.max(0, duration - 0.1), Math.max(0, Number.isFinite(value?.start) ? Number(value?.start) : 0)) : Math.max(0, Number.isFinite(value?.start) ? Number(value?.start) : 0);
  const requestedEnd = Number.isFinite(value?.end) ? Number(value?.end) : start + 3;
  const end = Math.min(duration || 600, Math.max(start + 0.1, requestedEnd));
  return {
    id: typeof value?.id === 'string' && value.id.trim() ? value.id.slice(0, 100) : fallbackId,
    text: typeof value?.text === 'string' ? value.text.slice(0, 180) : '',
    start: Math.round(start * 10) / 10,
    end: Math.round(end * 10) / 10,
  };
}

export function isStudioSubtitleVisible(segment: StudioSubtitleSegment, time: number): boolean {
  return Number.isFinite(time) && time >= segment.start && time < segment.end && Boolean(segment.text.trim());
}

export function canAddStudioSubtitle(segments: StudioSubtitleSegment[]): boolean {
  return segments.length < 30;
}
