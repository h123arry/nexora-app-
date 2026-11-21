export type StudioAutoCutClip = {
  id: string;
  name: string;
  start: number;
  end: number;
  duration: number;
  keyframes: Array<{ time: number; x: number; y: number; scale: number; rotation: number; opacity: number }>;
  [key: string]: unknown;
};

export type StudioBeatAnalysis = {
  bpm: number;
  beatInterval: number;
  beats: number[];
  confidence: number;
  duration: number;
};

export function analyzeStudioAudioBeats(samples: Float32Array, sampleRate: number): StudioBeatAnalysis {
  if (!Number.isFinite(sampleRate) || sampleRate < 8000 || samples.length < sampleRate * 0.5) {
    return { bpm: 120, beatInterval: 0.5, beats: [], confidence: 0, duration: samples.length / Math.max(1, sampleRate) };
  }
  const windowSize = Math.max(128, Math.round(sampleRate * 0.025));
  const energy: number[] = [];
  for (let start = 0; start + windowSize <= samples.length; start += windowSize) {
    let sum = 0;
    for (let i = start; i < start + windowSize; i += 1) sum += samples[i] * samples[i];
    energy.push(Math.sqrt(sum / windowSize));
  }
  if (energy.length < 20) return { bpm: 120, beatInterval: 0.5, beats: [], confidence: 0, duration: samples.length / sampleRate };
  const onset = energy.map((value, index) => Math.max(0, value - (energy[index - 1] || 0)));
  const smoothed = onset.map((_, index) => {
    const from = Math.max(0, index - 1);
    const to = Math.min(onset.length - 1, index + 1);
    return onset.slice(from, to + 1).reduce((sum, value) => sum + value, 0) / (to - from + 1);
  });
  const mean = smoothed.reduce((sum, value) => sum + value, 0) / smoothed.length;
  const variance = smoothed.reduce((sum, value) => sum + (value - mean) ** 2, 0) / smoothed.length;
  if (variance < 1e-9) return { bpm: 120, beatInterval: 0.5, beats: [], confidence: 0, duration: samples.length / sampleRate };

  const minLag = Math.max(1, Math.floor(60 / 160 / 0.025));
  const maxLag = Math.ceil(60 / 65 / 0.025);
  let bestLag = 24;
  let bestScore = -Infinity;
  let secondScore = -Infinity;
  for (let lag = minLag; lag <= Math.min(maxLag, Math.floor(smoothed.length / 2)); lag += 1) {
    let score = 0;
    let normLeft = 0;
    let normRight = 0;
    for (let i = lag; i < smoothed.length; i += 1) {
      const left = smoothed[i] - mean;
      const right = smoothed[i - lag] - mean;
      score += left * right;
      normLeft += left * left;
      normRight += right * right;
    }
    const normalized = score / Math.sqrt(Math.max(1e-12, normLeft * normRight));
    if (normalized > bestScore) {
      secondScore = bestScore;
      bestScore = normalized;
      bestLag = lag;
    } else if (normalized > secondScore) secondScore = normalized;
  }
  const interval = bestLag * 0.025;
  const bpm = Math.round(60 / interval);
  const phaseWindow = Math.min(bestLag, smoothed.length);
  let phase = 0;
  for (let i = 1; i < phaseWindow; i += 1) if (smoothed[i] > smoothed[phase]) phase = i;
  const duration = samples.length / sampleRate;
  const confidence = Math.max(0, Math.min(1, (bestScore - Math.max(0, secondScore)) / Math.max(0.05, 1 - Math.max(0, secondScore))));
  const beats: number[] = [];
  for (let time = phase * 0.025; time < duration; time += interval) beats.push(Number(time.toFixed(3)));
  return { bpm: Math.max(65, Math.min(160, bpm)), beatInterval: interval, beats, confidence, duration };
}

export function createStudioFallbackBeatGrid(duration: number, interval = 1.2): number[] {
  if (!Number.isFinite(duration) || duration <= 0) return [];
  const safeInterval = Math.max(0.55, Math.min(3.2, Number.isFinite(interval) ? interval : 1.2));
  const beats: number[] = [];
  for (let time = safeInterval; time < duration - 0.25; time += safeInterval) beats.push(Number(time.toFixed(3)));
  return beats;
}

export function buildStudioAutoCutSegments<T extends StudioAutoCutClip>(
  clips: readonly T[],
  beatTimes: readonly number[],
  createId: () => string,
  minimumSegmentSeconds = 0.45,
): T[] {
  const minSegment = Math.max(0.25, Math.min(1.5, minimumSegmentSeconds));
  const result: T[] = [];
  let globalOffset = 0;
  for (const clip of clips) {
    const sourceDuration = Math.max(0, clip.end - clip.start);
    if (sourceDuration <= 0) continue;
    const boundaries = [clip.start];
    for (const beat of beatTimes) {
      const local = beat - globalOffset + clip.start;
      if (local > clip.start + minSegment && local < clip.end - minSegment) boundaries.push(local);
    }
    boundaries.push(clip.end);
    boundaries.sort((a, b) => a - b);
    const safeBoundaries = [boundaries[0]];
    for (let i = 1; i < boundaries.length - 1; i += 1) {
      if (boundaries[i] - safeBoundaries[safeBoundaries.length - 1] >= minSegment
        && clip.end - boundaries[i] >= minSegment) safeBoundaries.push(boundaries[i]);
    }
    safeBoundaries.push(clip.end);
    for (let i = 0; i < safeBoundaries.length - 1; i += 1) {
      const start = safeBoundaries[i];
      const end = safeBoundaries[i + 1];
      const sourceOffset = start - clip.start;
      const keyframes = (clip.keyframes || [])
        .filter(frame => frame.time >= sourceOffset && frame.time <= sourceOffset + (end - start))
        .map(frame => ({ ...frame, time: Math.max(0, frame.time - sourceOffset) }));
      result.push({
        ...clip,
        id: createId(),
        name: safeBoundaries.length > 2 ? `${clip.name} · ${i + 1}` : clip.name,
        start,
        end,
        keyframes,
      });
    }
    globalOffset += sourceDuration;
  }
  return result;
}
