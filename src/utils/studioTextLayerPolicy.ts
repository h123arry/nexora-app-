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
  animation: 'none' | 'fade' | 'zoom' | 'slide-up' | 'pop';
  animationDuration: number;
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
    animation: value.animation === 'fade' || value.animation === 'zoom' || value.animation === 'slide-up' || value.animation === 'pop' ? value.animation : 'none',
    animationDuration: clamp(Number(value.animationDuration ?? 0.6), 0.1, 5),
  };
}

export function isStudioTextLayerVisible(layer: StudioTextLayer, elapsed: number, totalDuration: number): boolean {
  const safeElapsed = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const safeTotal = Math.max(0, Number.isFinite(totalDuration) ? totalDuration : 0);
  return Boolean(layer.text.trim()) && safeElapsed >= layer.start && safeElapsed <= (layer.end > 0 ? layer.end : safeTotal);
}

export type StudioTextLayerFrame = { opacity: number; scale: number; offsetY: number; rotation: number };

const clamp01 = (value: number): number => Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

function easeOutBack(value: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const shifted = value - 1;
  return 1 + c3 * shifted * shifted * shifted + c1 * shifted * shifted;
}

export function getStudioTextLayerFrame(layer: StudioTextLayer, elapsed: number, totalDuration: number): StudioTextLayerFrame | null {
  if (!isStudioTextLayerVisible(layer, elapsed, totalDuration)) return null;
  if (layer.animation === 'none') return { opacity: layer.opacity, scale: layer.scale, offsetY: 0, rotation: 0 };
  const safeElapsed = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const duration = clamp(layer.animationDuration, 0.1, 5);
  const entrance = clamp01((safeElapsed - layer.start) / duration);
  const exit = layer.end > layer.start ? clamp01((layer.end - safeElapsed) / duration) : 1;
  const opacity = layer.opacity * Math.min(entrance, exit);
  if (layer.animation === 'fade') return { opacity, scale: layer.scale, offsetY: 0, rotation: 0 };
  if (layer.animation === 'zoom') return { opacity, scale: layer.scale * (0.78 + 0.22 * entrance) * (0.9 + 0.1 * exit), offsetY: 0, rotation: 0 };
  if (layer.animation === 'slide-up') return { opacity, scale: layer.scale, offsetY: 64 * (1 - entrance) - 24 * (1 - exit), rotation: 0 };
  return { opacity, scale: layer.scale * (0.55 + 0.45 * easeOutBack(entrance)) * (0.9 + 0.1 * exit), offsetY: 0, rotation: 0 };
}
