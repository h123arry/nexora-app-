export type NexoraWorldArCapabilities = {
  secureContext: boolean;
  camera: boolean;
  webgl: boolean;
  immersiveAr: boolean;
  supported: boolean;
  reason: 'ready' | 'insecure-context' | 'camera-unavailable' | 'webgl-unavailable' | 'immersive-ar-unavailable';
};

type NavigatorWithXR = Navigator & {
  xr?: { isSessionSupported?: (mode: 'immersive-ar') => Promise<boolean> };
};

export async function detectNexoraWorldArCapabilities(
  environment: {
    secureContext: boolean;
    mediaDevices?: { getUserMedia?: unknown };
    createCanvas?: () => { getContext: (name: string) => unknown };
    xr?: { isSessionSupported?: (mode: 'immersive-ar') => Promise<boolean> };
  },
): Promise<NexoraWorldArCapabilities> {
  const secureContext = environment.secureContext;
  const camera = typeof environment.mediaDevices?.getUserMedia === 'function';
  let webgl = false;
  try { webgl = Boolean(environment.createCanvas?.().getContext('webgl2') || environment.createCanvas?.().getContext('webgl')); } catch { webgl = false; }
  let immersiveAr = false;
  if (secureContext && environment.xr?.isSessionSupported) {
    try { immersiveAr = await environment.xr.isSessionSupported('immersive-ar'); } catch { immersiveAr = false; }
  }
  const reason = !secureContext ? 'insecure-context'
    : !camera ? 'camera-unavailable'
      : !webgl ? 'webgl-unavailable'
        : !immersiveAr ? 'immersive-ar-unavailable' : 'ready';
  return { secureContext, camera, webgl, immersiveAr, supported: reason === 'ready', reason };
}

export function getNexoraWorldArStatusLabel(capabilities: NexoraWorldArCapabilities | null): string {
  if (!capabilities) return 'Checking device…';
  if (capabilities.supported) return 'World AR supported';
  if (capabilities.reason === 'insecure-context') return 'World AR needs a secure connection';
  if (capabilities.reason === 'camera-unavailable') return 'Camera API unavailable';
  if (capabilities.reason === 'webgl-unavailable') return '3D graphics unavailable';
  return 'Face AR available · World AR unsupported';
}

export async function detectCurrentNexoraWorldArCapabilities(): Promise<NexoraWorldArCapabilities> {
  const nav = navigator as NavigatorWithXR;
  return detectNexoraWorldArCapabilities({
    secureContext: window.isSecureContext,
    mediaDevices: nav.mediaDevices,
    createCanvas: () => document.createElement('canvas'),
    xr: nav.xr,
  });
}
