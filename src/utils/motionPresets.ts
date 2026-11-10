export type MotionPresetName = 'menu' | 'panel' | 'toast' | 'celebration';

export interface MotionPreset {
  initial: false | Record<string, number>;
  animate: Record<string, number>;
  exit: Record<string, number>;
  transition: { duration: number; ease?: string };
}

const PRESETS: Record<MotionPresetName, MotionPreset> = {
  menu: {
    initial: { opacity: 0, scale: 0.95, y: -5 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: -5 },
    transition: { duration: 0.14, ease: 'easeOut' },
  },
  panel: {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.98, y: 6 },
    transition: { duration: 0.18, ease: 'easeOut' },
  },
  toast: {
    initial: { opacity: 0, y: -24, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -16, scale: 0.98 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  celebration: {
    initial: { opacity: 0, scale: 0.78, y: 14 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.94 },
    transition: { duration: 0.28, ease: 'easeOut' },
  },
};

/** Return consistent, accessible entrance/exit props for common UI surfaces. */
export function getMotionPreset(name: MotionPresetName, reducedMotion = false): MotionPreset {
  if (reducedMotion) {
    return {
      initial: false,
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0 },
    };
  }
  return PRESETS[name];
}
