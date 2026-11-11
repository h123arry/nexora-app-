export type StudioShapeKind = 'rectangle' | 'circle' | 'line';

export type StudioShapeLayer = {
  id: string;
  shape: StudioShapeKind;
  color: string;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  start: number;
  end: number;
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

export function normalizeStudioShapeLayer(value: Partial<StudioShapeLayer>, fallbackId: string): StudioShapeLayer {
  const shape: StudioShapeKind = value.shape === 'circle' || value.shape === 'line' ? value.shape : 'rectangle';
  const color = typeof value.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color : '#A855F7';
  return {
    id: typeof value.id === 'string' && value.id ? value.id : fallbackId,
    shape,
    color,
    opacity: clamp(Number(value.opacity ?? 0.85), 0, 1),
    x: clamp(Number(value.x ?? 0.5), 0, 1),
    y: clamp(Number(value.y ?? 0.5), 0, 1),
    width: clamp(Number(value.width ?? 0.42), 0.02, 1),
    height: clamp(Number(value.height ?? 0.2), 0.002, 1),
    rotation: clamp(Number(value.rotation ?? 0), -180, 180),
    start: clamp(Number(value.start ?? 0), 0, 86400),
    end: clamp(Number(value.end ?? 0), 0, 86400),
  };
}

export function getStudioShapeLayerFrame(layer: StudioShapeLayer, elapsed: number, totalDuration: number): StudioShapeLayer | null {
  const time = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const end = layer.end > layer.start ? layer.end : Math.max(0, totalDuration);
  return time >= layer.start && time <= end ? layer : null;
}
