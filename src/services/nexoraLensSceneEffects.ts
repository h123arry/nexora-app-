import type { NexoraLensCategory } from './nexoraLensCatalog';

export type NexoraSceneParticle = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  rotation: number;
};

export type NexoraSceneEffectProfile = {
  mode: 'aurora' | 'petals' | 'confetti' | 'film';
  particleCount: number;
  palette: readonly string[];
  opacity: number;
};

const PROFILES: Partial<Record<NexoraLensCategory, NexoraSceneEffectProfile>> = {
  Fantasy: { mode: 'aurora', particleCount: 22, palette: ['#C4B5FD', '#8B5CF6', '#E9D5FF'], opacity: 0.34 },
  World: { mode: 'petals', particleCount: 18, palette: ['#F5D08A', '#D8B477', '#E8CFA8'], opacity: 0.28 },
  Playful: { mode: 'confetti', particleCount: 26, palette: ['#C4B5FD', '#F5D08A', '#A78BFA', '#F5F7FF'], opacity: 0.42 },
  Retro: { mode: 'film', particleCount: 12, palette: ['#E8D6B5', '#C6B18F'], opacity: 0.16 },
};

const fract = (value: number) => value - Math.floor(value);

export function getNexoraSceneEffectProfile(category: NexoraLensCategory): NexoraSceneEffectProfile | null {
  return PROFILES[category] || null;
}

export function getNexoraSceneParticles(
  width: number,
  height: number,
  timeMs: number,
  profile: NexoraSceneEffectProfile,
): NexoraSceneParticle[] {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(timeMs)) return [];
  const seconds = Math.max(0, timeMs) / 1000;
  return Array.from({ length: profile.particleCount }, (_, index) => {
    const seed = index + 1;
    const baseX = fract(Math.sin(seed * 127.1) * 43758.5453);
    const baseY = fract(Math.sin(seed * 269.5) * 24634.6345);
    const speed = 0.018 + fract(Math.sin(seed * 71.7) * 9123.1) * 0.045;
    const drift = Math.sin(seconds * (0.55 + baseX) + seed) * width * 0.018;
    const travel = (baseY + seconds * speed) % 1;
    return {
      x: Math.max(0, Math.min(width, baseX * width + drift)),
      y: Math.max(0, Math.min(height, (profile.mode === 'petals' ? travel : (baseY + Math.sin(seconds + seed) * 0.025) % 1) * height)),
      radius: 1.5 + fract(Math.sin(seed * 19.19) * 8912.3) * 5.5,
      alpha: 0.35 + fract(Math.sin(seed * 43.3) * 3123.7) * 0.65,
      rotation: seconds * (0.25 + baseX) + seed,
    };
  });
}
