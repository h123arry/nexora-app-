export type StudioTimelineClip = { id: string; start: number; end: number };
export type StudioTimelinePosition = { clipId: string; clipIndex: number; globalTime: number; localTime: number; clipOffset: number };

export function getStudioClipTimelinePosition(
  clips: StudioTimelineClip[],
  requestedTime: number,
): StudioTimelinePosition | null {
  if (!clips.length || !Number.isFinite(requestedTime)) return null;
  const durations = clips.map(clip => Math.max(0, clip.end - clip.start));
  const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
  if (totalDuration <= 0) return null;
  const globalTime = normalizeStudioTimelineTime(requestedTime, totalDuration);
  let offset = 0;
  for (let index = 0; index < clips.length; index += 1) {
    const clip = clips[index];
    const duration = durations[index];
    const isLast = index === clips.length - 1;
    if (globalTime < offset + duration || isLast) {
      const elapsed = Math.min(duration, Math.max(0, globalTime - offset));
      return {
        clipId: clip.id,
        clipIndex: index,
        globalTime,
        localTime: Math.min(clip.end, Math.max(clip.start, clip.start + elapsed)),
        clipOffset: offset,
      };
    }
    offset += duration;
  }
  return null;
}

export function normalizeStudioTimelineTime(requestedTime: number, totalDuration: number): number {
  if (!Number.isFinite(totalDuration) || totalDuration <= 0) return 0;
  if (!Number.isFinite(requestedTime)) return 0;
  return Math.round(Math.min(Math.max(0, totalDuration - 0.001), Math.max(0, requestedTime)) * 1000) / 1000;
}
