export type StudioTextLayer = {
  id: string;
  text: string;
  color: string;
  start: number;
  end: number;
  position: 'top' | 'center' | 'bottom';
  fontSize: number;
  opacity: number;
  scale: number;
  rotation: number;
};

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

export function normalizeStudioTextLayer(value: Partial<StudioTextLayer>, fallbackId: string): StudioTextLayer {
  const color = typeof value.color === 'string' && /^#[0-9a-f]{6}$/i.test(value.color) ? value.color : '#FFFFFF';
  const position = value.position === 'top' || value.position === 'center' || value.position === 'bottom' ? value.position : 'bottom';
  return {
    id: typeof value.id === 'string' && value.id ? value.id : fallbackId,
    text: typeof value.text === 'string' ? value.text.slice(0, 120) : '',
    color,
    start: clamp(Number(value.start ?? 0), 0, 86400),
    end: clamp(Number(value.end ?? 0), 0, 86400),
    position,
    fontSize: clamp(Number(value.fontSize ?? 54), 18, 100),
    opacity: clamp(Number(value.opacity ?? 1), 0, 1),
    scale: clamp(Number(value.scale ?? 1), 0.5, 2),
    rotation: clamp(Number(value.rotation ?? 0), -180, 180),
  };
}

export function isStudioTextLayerVisible(layer: StudioTextLayer, elapsed: number, totalDuration: number): boolean {
  const safeElapsed = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const safeTotal = Math.max(0, Number.isFinite(totalDuration) ? totalDuration : 0);
  return Boolean(layer.text.trim()) && safeElapsed >= layer.start && safeElapsed <= (layer.end > layer.start ? layer.end : safeTotal);
}
