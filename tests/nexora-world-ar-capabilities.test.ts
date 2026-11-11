import test from 'node:test';
import assert from 'node:assert/strict';
import { detectNexoraWorldArCapabilities, getNexoraWorldArStatusLabel } from '../src/services/nexoraWorldArCapabilities';

const supportedEnvironment = () => ({
  secureContext: true,
  mediaDevices: { getUserMedia: () => Promise.resolve() },
  createCanvas: () => ({ getContext: (name: string) => name === 'webgl2' ? {} : null }),
  xr: { isSessionSupported: async (mode: 'immersive-ar') => mode === 'immersive-ar' },
});

test('reports world AR only when secure camera, WebGL and immersive AR are all supported', async () => {
  const result = await detectNexoraWorldArCapabilities(supportedEnvironment());
  assert.equal(result.supported, true);
  assert.equal(result.reason, 'ready');
  assert.equal(getNexoraWorldArStatusLabel(result), 'World AR supported');
});

test('fails closed on insecure contexts and does not probe immersive AR', async () => {
  let probed = false;
  const result = await detectNexoraWorldArCapabilities({
    ...supportedEnvironment(),
    secureContext: false,
    xr: { isSessionSupported: async () => { probed = true; return true; } },
  });
  assert.equal(result.supported, false);
  assert.equal(result.reason, 'insecure-context');
  assert.equal(probed, false);
});

test('identifies missing camera and graphics APIs without claiming AR support', async () => {
  const noCamera = await detectNexoraWorldArCapabilities({
    secureContext: true,
    createCanvas: () => ({ getContext: () => ({}) }),
  });
  assert.equal(noCamera.reason, 'camera-unavailable');
  const noGraphics = await detectNexoraWorldArCapabilities({
    secureContext: true,
    mediaDevices: { getUserMedia: () => Promise.resolve() },
    createCanvas: () => ({ getContext: () => null }),
  });
  assert.equal(noGraphics.reason, 'webgl-unavailable');
});

test('gracefully reports browsers without immersive AR while retaining camera and WebGL support', async () => {
  const result = await detectNexoraWorldArCapabilities({
    secureContext: true,
    mediaDevices: { getUserMedia: () => Promise.resolve() },
    createCanvas: () => ({ getContext: () => ({}) }),
  });
  assert.equal(result.camera, true);
  assert.equal(result.webgl, true);
  assert.equal(result.immersiveAr, false);
  assert.equal(getNexoraWorldArStatusLabel(result), 'Face AR available · World AR unsupported');
});
