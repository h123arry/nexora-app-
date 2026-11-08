import test from 'node:test';
import assert from 'node:assert/strict';
import { shapeWorldPulseAiContext } from '../server/vohPulseContext';

test('whitelists aggregate metrics and bounded rising topics', () => {
  assert.deepEqual(shapeWorldPulseAiContext({
    postCount: 30, creatorCount: 12, topicCount: 7, interactionCount: 90, recentPostCount: 8,
    risingTopics: [{ tag: '##AI news!', currentPosts: 5, creatorCount: 3, status: 'new', secret: 'ignore' }],
    privateUserIds: ['user-1'],
  }), {
    postCount: 30, creatorCount: 12, topicCount: 7, interactionCount: 90, recentPostCount: 8,
    risingTopics: [{ tag: 'AInews', currentPosts: 5, creatorCount: 3, status: 'new' }],
  });
});

test('clamps negative, non-finite, and oversized counts', () => {
  const shaped = shapeWorldPulseAiContext({
    postCount: -4, creatorCount: Number.POSITIVE_INFINITY, topicCount: 2_000_000,
    interactionCount: '100', recentPostCount: Number.NaN,
  });
  assert.deepEqual(shaped, {
    postCount: 0, creatorCount: 0, topicCount: 1_000_000, interactionCount: 0,
    recentPostCount: 0, risingTopics: [],
  });
});

test('rejects malformed context and drops malformed topics', () => {
  assert.equal(shapeWorldPulseAiContext(null), null);
  assert.equal(shapeWorldPulseAiContext([]), null);
  const shaped = shapeWorldPulseAiContext({ risingTopics: [null, {}, { tag: '   ' }, { tag: 'valid', status: 'unknown' }] });
  assert.deepEqual(shaped?.risingTopics, [{ tag: 'valid', currentPosts: 0, creatorCount: 0, status: 'rising' }]);
});

test('limits topic count and tag length', () => {
  const shaped = shapeWorldPulseAiContext({
    risingTopics: Array.from({ length: 9 }, (_, index) => ({ tag: 'x'.repeat(100) + index })),
  });
  assert.equal(shaped?.risingTopics.length, 5);
  assert.equal(shaped?.risingTopics[0].tag.length, 60);
});
