export type TimelineAudioPosition = { active: boolean; sourceTime: number };

/** Maps a shared project playhead to a source-local audio position. */
export function getStudioTimelineAudioPosition(
  globalTime: number,
  start: number,
  duration: number | null,
  loop = false,
): TimelineAudioPosition {
  const elapsed = Math.max(0, Number.isFinite(globalTime) ? globalTime : 0);
  const safeStart = Math.max(0, Number.isFinite(start) ? start : 0);
  const localTime = elapsed - safeStart;
  if (localTime < 0) return { active: false, sourceTime: 0 };
  if (duration === null || !Number.isFinite(duration) || duration <= 0) {
    return { active: true, sourceTime: localTime };
  }
  if (loop) return { active: true, sourceTime: localTime % duration };
  return { active: localTime < duration, sourceTime: Math.min(localTime, duration) };
}
