import test from 'node:test';
import assert from 'node:assert/strict';
import {
  consumeModerationReportQuota,
  MODERATION_REPORT_WINDOW_LIMIT,
  MODERATION_REPORT_WINDOW_MS,
} from '../src/moderationPolicy.js';

test('allows the first report and increments within the rolling window', () => {
  const first = consumeModerationReportQuota(null, 1_000);
  assert.deepEqual(first, {
    allowed: true, attempts: 1, windowStartedAtMs: 1_000, retryAfterMs: MODERATION_REPORT_WINDOW_MS,
  });
  const second = consumeModerationReportQuota(first, 2_000);
  assert.equal(second.allowed, true);
  assert.equal(second.attempts, 2);
  assert.equal(second.windowStartedAtMs, 1_000);
});

test('blocks the eleventh report in a one-hour window', () => {
  let state = consumeModerationReportQuota(null, 10_000);
  for (let i = 1; i < MODERATION_REPORT_WINDOW_LIMIT; i += 1) {
    state = consumeModerationReportQuota(state, 10_000 + i);
  }
  const blocked = consumeModerationReportQuota(state, 20_000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.attempts, MODERATION_REPORT_WINDOW_LIMIT);
  assert.equal(blocked.retryAfterMs, MODERATION_REPORT_WINDOW_MS - 10_000);
});

test('resets the quota when the one-hour window expires', () => {
  const expired = consumeModerationReportQuota(
    { windowStartedAtMs: 5_000, attempts: MODERATION_REPORT_WINDOW_LIMIT },
    5_000 + MODERATION_REPORT_WINDOW_MS,
  );
  assert.equal(expired.allowed, true);
  assert.equal(expired.attempts, 1);
  assert.equal(expired.windowStartedAtMs, 5_000 + MODERATION_REPORT_WINDOW_MS);
});

test('fails closed on malformed persisted quota state or invalid time', () => {
  assert.equal(consumeModerationReportQuota({ windowStartedAtMs: 'bad', attempts: 2 }, 10_000).allowed, false);
  assert.equal(consumeModerationReportQuota({ windowStartedAtMs: 1, attempts: 99 }, 10_000).allowed, false);
  assert.equal(consumeModerationReportQuota(null, -1).allowed, false);
});


test('resolves a reported community to its canonical owner', async () => {
  const { resolveCommunityOwnerId } = await import('../src/moderationPolicy.js');
  assert.equal(resolveCommunityOwnerId({ ownerId: 'owner-1', creatorId: 'creator-1' }), 'owner-1');
});

test('supports legacy creatorId only when canonical ownerId is absent', async () => {
  const { resolveCommunityOwnerId } = await import('../src/moderationPolicy.js');
  assert.equal(resolveCommunityOwnerId({ creatorId: 'creator-1' }), 'creator-1');
});

test('fails closed when a reported community has no valid owner', async () => {
  const { resolveCommunityOwnerId } = await import('../src/moderationPolicy.js');
  assert.equal(resolveCommunityOwnerId(null), null);
  assert.equal(resolveCommunityOwnerId({ ownerId: '', creatorId: 'bad/path' }), null);
});
