import assert from 'node:assert/strict';
import test from 'node:test';
import { getDevicePerformanceProfile } from '../src/utils/devicePerformance';

test('unknown device hints keep the standard visual profile', () => {
  assert.deepEqual(getDevicePerformanceProfile({}), {
    constrained: false,
    saveData: false,
  });
});

test('data saver enables constrained mode and data-saving presentation', () => {
  assert.deepEqual(getDevicePerformanceProfile({ saveData: true }), {
    constrained: true,
    saveData: true,
  });
});

test('low-memory and low-core devices receive the constrained profile', () => {
  assert.equal(getDevicePerformanceProfile({ deviceMemory: 2 }).constrained, true);
  assert.equal(getDevicePerformanceProfile({ hardwareConcurrency: 4 }).constrained, true);
  assert.equal(getDevicePerformanceProfile({ deviceMemory: 8, hardwareConcurrency: 8 }).constrained, false);
});

test('invalid and zero browser hints are ignored', () => {
  assert.equal(getDevicePerformanceProfile({ deviceMemory: 0, hardwareConcurrency: Number.NaN }).constrained, false);
});
