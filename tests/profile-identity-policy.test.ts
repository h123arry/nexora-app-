import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateProfileIdentityCooldown,
  PROFILE_IDENTITY_GRACE_END,
  PROFILE_IDENTITY_GRACE_START,
} from '../server/profileIdentityPolicy';

const day = 86_400_000;
const duringGrace = Date.parse('2026-11-22T12:00:00.000Z');
const afterGrace = PROFILE_IDENTITY_GRACE_END + 1;

test('grace allows one display-name update despite a recent pre-window change', () => {
  const result = evaluateProfileIdentityCooldown({
    lastChangedAt: '2026-11-19T12:00:00.000Z',
    graceUsedAt: undefined,
    now: duringGrace,
    cooldownMs: 7 * day,
  });
  assert.deepEqual(result, { allowed: true, graceUsed: true, remainingMs: 0 });
});

test('a second change during grace is blocked for the full field cooldown', () => {
  const usedAt = '2026-11-22T12:00:00.000Z';
  const result = evaluateProfileIdentityCooldown({
    lastChangedAt: usedAt,
    graceUsedAt: usedAt,
    now: duringGrace + 60_000,
    cooldownMs: 7 * day,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.graceUsed, false);
  assert.equal(result.remainingMs, 7 * day - 60_000);
});

test('a legacy client timestamp inside the grace window counts as the one-time use', () => {
  const result = evaluateProfileIdentityCooldown({
    lastChangedAt: new Date(PROFILE_IDENTITY_GRACE_START + 60_000).toISOString(),
    graceUsedAt: undefined,
    now: duringGrace,
    cooldownMs: 30 * day,
  });
  assert.equal(result.allowed, false);
  assert.equal(result.graceUsed, false);
});

test('after the grace cutoff, recent display-name and username changes obey separate cooldowns', () => {
  const displayName = evaluateProfileIdentityCooldown({
    lastChangedAt: new Date(afterGrace - 3 * day).toISOString(),
    graceUsedAt: undefined,
    now: afterGrace,
    cooldownMs: 7 * day,
  });
  const username = evaluateProfileIdentityCooldown({
    lastChangedAt: new Date(afterGrace - 10 * day).toISOString(),
    graceUsedAt: undefined,
    now: afterGrace,
    cooldownMs: 30 * day,
  });
  assert.equal(displayName.allowed, false);
  assert.equal(username.allowed, false);
  assert.equal(displayName.remainingMs, 4 * day);
  assert.equal(username.remainingMs, 20 * day);
});

test('a completed cooldown permits a change without reopening grace', () => {
  const result = evaluateProfileIdentityCooldown({
    lastChangedAt: new Date(afterGrace - 8 * day).toISOString(),
    graceUsedAt: undefined,
    now: afterGrace,
    cooldownMs: 7 * day,
  });
  assert.deepEqual(result, { allowed: true, graceUsed: false, remainingMs: 0 });
});

test('display-name and username grace usage remain independent', () => {
  const displayName = evaluateProfileIdentityCooldown({
    lastChangedAt: '2026-11-22T12:00:00.000Z',
    graceUsedAt: '2026-11-22T12:00:00.000Z',
    now: duringGrace + 1,
    cooldownMs: 7 * day,
  });
  const username = evaluateProfileIdentityCooldown({
    lastChangedAt: '2026-11-19T12:00:00.000Z',
    graceUsedAt: undefined,
    now: duringGrace + 1,
    cooldownMs: 30 * day,
  });
  assert.equal(displayName.allowed, false);
  assert.equal(username.allowed, true);
  assert.equal(username.graceUsed, true);
});
