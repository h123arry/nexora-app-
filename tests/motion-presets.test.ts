import test from 'node:test';
import assert from 'node:assert/strict';
import { getMotionPreset } from '../src/utils/motionPresets.ts';

test('shared presets provide consistent menu and panel motion', () => {
  assert.deepEqual(getMotionPreset('menu').animate, { opacity: 1, scale: 1, y: 0 });
  assert.equal(getMotionPreset('panel').transition.duration, 0.18);
});

test('toast and celebration presets remain bounded and finite', () => {
  assert.equal(getMotionPreset('toast').transition.duration, 0.2);
  assert.equal(getMotionPreset('celebration').transition.duration, 0.28);
});

test('reduced motion removes spatial movement and timing', () => {
  const preset = getMotionPreset('toast', true);
  assert.equal(preset.initial, false);
  assert.deepEqual(preset.animate, { opacity: 1 });
  assert.deepEqual(preset.exit, { opacity: 0 });
  assert.equal(preset.transition.duration, 0);
});
