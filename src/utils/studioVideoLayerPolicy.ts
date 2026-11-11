export type StudioVideoKeyframe = {
  time: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
};

export type StudioVideoLayer = {
  id: string;
  start: number;
  end: number;
  volume: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  keyframes: StudioVideoKeyframe[];
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

function normalizeKeyframes(value: unknown): StudioVideoKeyframe[] {
  if (!Array.isArray(value)) return [];
  const frames = value.slice(0, 100).map((frame): StudioVideoKeyframe => ({
    time: clamp(Number(frame?.time ?? 0), 0, 86400),
    x: clamp(Number(frame?.x ?? 0.5), 0, 1),
    y: clamp(Number(frame?.y ?? 0.5), 0, 1),
    scale: clamp(Number(frame?.scale ?? 1), 0.25, 2),
    rotation: clamp(Number(frame?.rotation ?? 0), -180, 180),
    opacity: clamp(Number(frame?.opacity ?? 1), 0, 1),
  })).sort((left, right) => left.time - right.time);
  return frames.filter((frame, index) => index === 0 || frame.time !== frames[index - 1].time);
}

export function normalizeStudioVideoLayer<T extends StudioVideoLayer>(value: T): T {
  return {
    ...value,
    volume: clamp(Number(value.volume ?? 1), 0, 1),
    x: clamp(Number(value.x ?? 0.5), 0, 1),
    y: clamp(Number(value.y ?? 0.5), 0, 1),
    scale: clamp(Number(value.scale ?? 1), 0.25, 2),
    rotation: clamp(Number(value.rotation ?? 0), -180, 180),
    opacity: clamp(Number(value.opacity ?? 1), 0, 1),
    keyframes: normalizeKeyframes(value.keyframes),
  };
}

export type StudioVideoLayerFrame = Omit<StudioVideoKeyframe, 'time'>;

export function getStudioVideoLayerFrame(layer: StudioVideoLayer, elapsed: number): StudioVideoLayerFrame {
  const safeElapsed = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const frames = layer.keyframes || [];
  if (!frames.length) return { x: layer.x, y: layer.y, scale: layer.scale, rotation: layer.rotation, opacity: layer.opacity };
  const toFrame = (frame: StudioVideoKeyframe): StudioVideoLayerFrame => ({
    x: frame.x, y: frame.y, scale: frame.scale, rotation: frame.rotation, opacity: frame.opacity,
  });
  if (safeElapsed <= frames[0].time) return toFrame(frames[0]);
  const last = frames[frames.length - 1];
  if (safeElapsed >= last.time) return toFrame(last);
  const rightIndex = frames.findIndex(frame => frame.time >= safeElapsed);
  const left = frames[rightIndex - 1];
  const right = frames[rightIndex];
  const progress = right.time > left.time ? (safeElapsed - left.time) / (right.time - left.time) : 1;
  const lerp = (a: number, b: number) => a + (b - a) * progress;
  return {
    x: lerp(left.x, right.x),
    y: lerp(left.y, right.y),
    scale: lerp(left.scale, right.scale),
    rotation: lerp(left.rotation, right.rotation),
    opacity: lerp(left.opacity, right.opacity),
  };
}
