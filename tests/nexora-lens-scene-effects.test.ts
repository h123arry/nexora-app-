import test from 'node:test';
import assert from 'node:assert/strict';
import { getNexoraSceneEffectProfile, getNexoraSceneParticles } from '../src/services/nexoraLensSceneEffects';

test('NEXORA scene collections expose distinct, branded animated effect profiles', () => {
  const fantasy = getNexoraSceneEffectProfile('Fantasy');
  const world = getNexoraSceneEffectProfile('World');
  const playful = getNexoraSceneEffectProfile('Playful');
  assert.equal(fantasy?.mode, 'aurora');
  assert.equal(world?.mode, 'petals');
  assert.equal(playful?.mode, 'confetti');
  assert.notDeepEqual(fantasy?.palette, world?.palette);
  assert.equal(getNexoraSceneEffectProfile('Beauty'), null);
});

test('scene particles are deterministic for the same frame and stay inside the camera frame', () => {
  const profile = getNexoraSceneEffectProfile('Fantasy')!;
  const first = getNexoraSceneParticles(720, 1280, 1200, profile);
  const second = getNexoraSceneParticles(720, 1280, 1200, profile);
  assert.deepEqual(first, second);
  assert.equal(first.length, profile.particleCount);
  for (const particle of first) {
    assert.ok(particle.x >= 0 && particle.x <= 720);
    assert.ok(particle.y >= 0 && particle.y <= 1280);
    assert.ok(particle.radius >= 1.5 && particle.radius <= 7);
    assert.ok(particle.alpha >= 0.35 && particle.alpha <= 1);
  }
});

test('scene particles safely handle invalid dimensions and non-finite timestamps', () => {
  const profile = getNexoraSceneEffectProfile('World')!;
  assert.deepEqual(getNexoraSceneParticles(0, 100, 100, profile), []);
  assert.deepEqual(getNexoraSceneParticles(100, 100, Number.NaN, profile), []);
});
