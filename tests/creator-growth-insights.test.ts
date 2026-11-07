import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCreatorGrowthInsights } from '../src/services/analytics/creatorGrowthInsights';

test('returns no recommendations when there are no trusted playback points', () => {
  assert.deepEqual(buildCreatorGrowthInsights([]), []);
});

test('derives bounded watch-time and consistency insights from server aggregates', () => {
  const result = buildCreatorGrowthInsights([
    { day: '2026-11-01', sessionsStarted: 2, uniqueViewers: 2, acceptedWatchSeconds: 120, averageAcceptedWatchSeconds: 60 },
    { day: '2026-11-02', sessionsStarted: 1, uniqueViewers: 1, acceptedWatchSeconds: 90, averageAcceptedWatchSeconds: 90 },
    { day: '2026-11-03', sessionsStarted: 0, uniqueViewers: 0, acceptedWatchSeconds: 0, averageAcceptedWatchSeconds: null },
    { day: '2026-11-04', sessionsStarted: 3, uniqueViewers: 2, acceptedWatchSeconds: 300, averageAcceptedWatchSeconds: 100 },
  ]);
  assert.equal(result[0].value, '8.5 min');
  assert.equal(result[1].value, '3/4 days');
  assert.equal(result[2].id, 'momentum');
  assert.match(result[2].value, /^\+/);
});

test('ignores malformed dates and clamps invalid aggregate counts', () => {
  const result = buildCreatorGrowthInsights([
    { day: 'not-a-day', sessionsStarted: 100, uniqueViewers: 100, acceptedWatchSeconds: 1000, averageAcceptedWatchSeconds: 10 },
    { day: '2026-11-01', sessionsStarted: -2, uniqueViewers: Number.NaN, acceptedWatchSeconds: -20, averageAcceptedWatchSeconds: null },
  ]);
  assert.equal(result.length, 2);
  assert.equal(result[0].value, 'No sessions');
});
