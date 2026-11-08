import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeWorldPulseCommunity } from '../src/services/discovery/worldPulseCommunity';

const now = Date.parse('2026-11-08T12:00:00.000Z');

test('summarizes post, creator, topic and interaction counts from supplied posts', () => {
  const summary = summarizeWorldPulseCommunity([
    { id: 'p1', userId: 'u1', timestamp: now - 1000, tags: ['#AI', 'Nexora'], likes: 4, commentsCount: 2, shares: 1 },
    { id: 'p2', userId: 'u2', timestamp: now - 2000, tags: ['ai', 'Creators'], likes: 3, commentsCount: 1, shares: 0 },
  ], now);
  assert.deepEqual(summary, {
    postCount: 2, creatorCount: 2, topicCount: 3, interactionCount: 11, recentPostCount: 2,
  });
});

test('normalizes repeated tags and ignores empty tags', () => {
  const summary = summarizeWorldPulseCommunity([
    { id: 'p1', userId: 'u1', timestamp: now, tags: [' #AI ', 'ai', '###', ''] },
  ], now);
  assert.equal(summary.topicCount, 1);
});

test('does not count future posts in the recent 24-hour signal', () => {
  const summary = summarizeWorldPulseCommunity([
    { id: 'past', userId: 'u1', timestamp: now - 24 * 60 * 60 * 1000 - 1 },
    { id: 'recent', userId: 'u2', timestamp: now - 1000 },
    { id: 'future', userId: 'u3', timestamp: now + 1000 },
  ], now);
  assert.equal(summary.postCount, 3);
  assert.equal(summary.recentPostCount, 1);
});

test('ignores malformed posts and negative or non-finite engagement', () => {
  const summary = summarizeWorldPulseCommunity([
    { id: 'valid', userId: 'u1', timestamp: now, likes: -5, commentsCount: Number.NaN, shares: 2 },
    { id: '', userId: 'u2', timestamp: now, likes: 100 },
    { id: 'missing-user', userId: '', timestamp: now, likes: 100 },
    { id: 'bad-time', userId: 'u3', timestamp: 'not-a-date', likes: 100 },
  ], now);
  assert.equal(summary.postCount, 1);
  assert.equal(summary.interactionCount, 2);
});
