import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldPauseMotion } from '../src/utils/motionLifecycle.ts';

const active = { reducedMotion: false, inViewport: true, pageVisible: true };

test('decorative motion runs only while visible and allowed', () => {
  assert.equal(shouldPauseMotion(active), false);
});

test('reduced-motion preference always pauses decorative motion', () => {
  assert.equal(shouldPauseMotion({ ...active, reducedMotion: true }), true);
});

test('offscreen stages pause without being unmounted', () => {
  assert.equal(shouldPauseMotion({ ...active, inViewport: false }), true);
});

test('background tabs pause decorative motion', () => {
  assert.equal(shouldPauseMotion({ ...active, pageVisible: false }), true);
});

test('motion resumes when all lifecycle conditions become active', () => {
  assert.equal(shouldPauseMotion(active), false);
});
