import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_SOUND_PREFERENCES, normalizeSoundPreferences } from '../src/services/soundExperience';
test('sound preferences default to enabled categories', () => assert.deepEqual(normalizeSoundPreferences(null), DEFAULT_SOUND_PREFERENCES));
test('sound preferences preserve explicit choices and default missing values', () => assert.deepEqual(normalizeSoundPreferences({ notifications: false, gifts: false, interface: true }), { notifications: false, interface: true, gifts: false, live: true }));
test('malformed preference data cannot enable arbitrary categories', () => assert.deepEqual(normalizeSoundPreferences({ notifications: 'false', interface: 0, gifts: null, live: true }), { notifications: true, interface: true, gifts: true, live: true }));
