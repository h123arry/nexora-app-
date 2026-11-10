export interface MotionLifecycleState {
  reducedMotion: boolean;
  inViewport: boolean;
  pageVisible: boolean;
}

/** Pause decorative motion when accessibility or page lifecycle requires it. */
export function shouldPauseMotion(state: MotionLifecycleState): boolean {
  return state.reducedMotion || !state.inViewport || !state.pageVisible;
}
