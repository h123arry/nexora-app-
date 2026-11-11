export type StudioImageKeyframe = {
  time: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
};

export type StudioImageLayer = {
  id: string;
  name: string;
  blob: Blob;
  start: number;
  end: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  keyframes: StudioImageKeyframe[];
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

function normalizeKeyframes(value: unknown): StudioImageKeyframe[] {
  if (!Array.isArray(value)) return [];
  const frames = value.slice(0, 100).map((frame): StudioImageKeyframe => ({
    time: clamp(Number(frame?.time ?? 0), 0, 86400),
    x: clamp(Number(frame?.x ?? 0.5), 0, 1),
    y: clamp(Number(frame?.y ?? 0.5), 0, 1),
    scale: clamp(Number(frame?.scale ?? 0.3), 0.05, 1),
    rotation: clamp(Number(frame?.rotation ?? 0), -180, 180),
    opacity: clamp(Number(frame?.opacity ?? 1), 0, 1),
  })).sort((left, right) => left.time - right.time);
  return frames.filter((frame, index) => index === 0 || frame.time !== frames[index - 1].time);
}

export function normalizeStudioImageLayer(value: Partial<StudioImageLayer>, fallbackId: string): StudioImageLayer {
  return {
    id: typeof value.id === 'string' && value.id ? value.id : fallbackId,
    name: typeof value.name === 'string' ? value.name.slice(0, 120) : 'Image layer',
    blob: value.blob as Blob,
    start: clamp(Number(value.start ?? 0), 0, 86400),
    end: clamp(Number(value.end ?? 0), 0, 86400),
    x: clamp(Number(value.x ?? 0.5), 0, 1),
    y: clamp(Number(value.y ?? 0.5), 0, 1),
    scale: clamp(Number(value.scale ?? 0.3), 0.05, 1),
    rotation: clamp(Number(value.rotation ?? 0), -180, 180),
    opacity: clamp(Number(value.opacity ?? 1), 0, 1),
    keyframes: normalizeKeyframes(value.keyframes),
  };
}

export type StudioImageLayerFrame = Omit<StudioImageKeyframe, 'time'>;

export function getStudioImageLayerFrame(layer: StudioImageLayer, elapsed: number, totalDuration: number): StudioImageLayerFrame | null {
  const safeElapsed = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  if (!isStudioImageLayerVisible(layer, safeElapsed, totalDuration)) return null;
  const frames = layer.keyframes || [];
  if (!frames.length) return { x: layer.x, y: layer.y, scale: layer.scale, rotation: layer.rotation, opacity: layer.opacity };
  const toFrame = (frame: StudioImageKeyframe): StudioImageLayerFrame => ({ x: frame.x, y: frame.y, scale: frame.scale, rotation: frame.rotation, opacity: frame.opacity });
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

export function isStudioImageLayerVisible(layer: StudioImageLayer, elapsed: number, totalDuration: number): boolean {
  const safeElapsed = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const safeTotal = Math.max(0, Number.isFinite(totalDuration) ? totalDuration : 0);
  return safeElapsed >= layer.start && safeElapsed <= (layer.end > 0 ? layer.end : safeTotal);
}

export function canAddStudioImageLayer(existing: readonly StudioImageLayer[], image: Blob): boolean {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(image.type)) return false;
  if (image.size <= 0 || image.size > 10 * 1024 * 1024 || existing.length >= 20) return false;
  return existing.reduce((total, layer) => total + layer.blob.size, 0) + image.size <= 40 * 1024 * 1024;
}
