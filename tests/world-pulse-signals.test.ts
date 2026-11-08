import test from 'node:test';
import assert from 'node:assert/strict';
import { rankRisingTopics } from '../src/services/discovery/worldPulseSignals';

const hour = 60 * 60 * 1000;
const now = Date.parse('2026-11-08T12:00:00.000Z');

function post(id: string, userId: string, hoursAgo: number, tags: string[] = ['nexora']) {
  return { id, userId, timestamp: now - hoursAgo * hour, tags, likes: 4, commentsCount: 1, shares: 0 };
}

test('identifies a new topic only when multiple creators contribute', () => {
  const signals = rankRisingTopics([
    post('a', 'u1', 2), post('b', 'u2', 3),
  ], { now, windowHours: 24 });
  assert.equal(signals.length, 1);
  assert.equal(signals[0].status, 'new');
  assert.equal(signals[0].growthMultiplier, null);
  assert.equal(signals[0].creatorCount, 2);
});

test('compares the current window with the immediately preceding window', () => {
  const signals = rankRisingTopics([
    post('old-1', 'u1', 30), post('old-2', 'u2', 28),
    post('new-1', 'u1', 2), post('new-2', 'u2', 3), post('new-3', 'u3', 4),
  ], { now, windowHours: 24 });
  assert.equal(signals[0].status, 'rising');
  assert.equal(signals[0].growthMultiplier, 1.5);
});

test('ignores archived, future, malformed and single-creator-only activity', () => {
  const signals = rankRisingTopics([
    { ...post('archived', 'u1', 2), isArchived: true },
    { ...post('future', 'u2', -1) },
    { id: 'bad', userId: 'u3', timestamp: 'not-a-date', tags: ['nexora'] },
    post('one', 'u4', 1), post('two', 'u4', 2),
  ], { now, windowHours: 24 });
  assert.deepEqual(signals, []);
});

test('does not label flat or declining conversations as rising', () => {
  const signals = rankRisingTopics([
    post('old-1', 'u1', 30), post('old-2', 'u2', 28), post('old-3', 'u3', 27),
    post('new-1', 'u1', 2), post('new-2', 'u2', 3),
  ], { now, windowHours: 24 });
  assert.deepEqual(signals, []);
});

test('extracts hashtags, normalizes duplicates and caps per-creator engagement influence', () => {
  const signals = rankRisingTopics([
    { ...post('a', 'u1', 2, ['#NEXORA', 'nexora']), content: 'New #WorldPulse launch' },
    { ...post('b', 'u2', 3, ['worldpulse', 'nexora']), content: 'Following #WorldPulse' },
  ], { now, windowHours: 24 });
  assert.deepEqual(signals.map(signal => signal.tag), ['nexora', 'worldpulse']);
});
