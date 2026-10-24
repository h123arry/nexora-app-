import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateAnalyticsRows, engagementRate, isValidAnalyticsProperties } from '../src/services/analytics/analyticsPolicy.ts';

test('analytics properties are bounded and reject sensitive payloads', () => {
  assert.equal(isValidAnalyticsProperties({ screen: 'feed', latencyMs: 42, qualified: true }), true);
  assert.equal(isValidAnalyticsProperties({ message: 'private text' }), false);
  assert.equal(isValidAnalyticsProperties({ token: 'secret' }), false);
  assert.equal(isValidAnalyticsProperties(Object.fromEntries(Array.from({ length: 13 }, (_, i) => [`p${i}`, i]))), false);
  assert.equal(isValidAnalyticsProperties({ screen: 'x'.repeat(161) }), false);
});

test('daily aggregation counts event types and unique actor-days', () => {
  const result = aggregateAnalyticsRows([
    { day: '2026-10-24', eventType: 'content_impression', actorId: 'a' },
    { day: '2026-10-24', eventType: 'content_impression', actorId: 'a' },
    { day: '2026-10-24', eventType: 'meaningful_interaction', actorId: 'a' },
    { day: '2026-10-25', eventType: 'content_impression', actorId: 'a' },
  ]);
  assert.equal(result.totalEvents, 4);
  assert.equal(result.uniqueActorDays, 2);
  assert.deepEqual(result.byType, { content_impression: 3, meaningful_interaction: 1 });
});

test('engagement rate is unavailable when there is no qualified denominator', () => {
  assert.equal(engagementRate(3, 0), null);
  assert.equal(engagementRate(3, 10), 30);
  assert.equal(engagementRate(-1, 10), 0);
});
