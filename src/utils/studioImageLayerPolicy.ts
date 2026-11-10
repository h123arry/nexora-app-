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
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

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
  };
}

export function isStudioImageLayerVisible(layer: StudioImageLayer, elapsed: number, totalDuration: number): boolean {
  const safeElapsed = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const safeTotal = Math.max(0, Number.isFinite(totalDuration) ? totalDuration : 0);
  return safeElapsed >= layer.start && safeElapsed <= (layer.end > 0 ? layer.end : safeTotal);
}
