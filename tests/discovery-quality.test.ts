import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boundedEngagementScore,
  freshnessMultiplier,
  normalizeSearchText,
  scoreSearchTerms,
} from '../src/services/discovery/discoveryQuality';

test('engagement signals are finite, non-negative and capped against lifetime-count dominance', () => {
  const normal = boundedEngagementScore({ likes: 100, comments: 10, shares: 5, saves: 2 });
  const extreme = boundedEngagementScore({ likes: 1e15, comments: 1e15, shares: 1e15, saves: 1e15 });
  assert.ok(Number.isFinite(normal) && normal > 0);
  assert.equal(extreme, 40);
  assert.equal(boundedEngagementScore({ likes: -10, comments: Number.NaN }), 0);
});

test('freshness decays smoothly by half-life and never rewards future timestamps', () => {
  assert.equal(freshnessMultiplier(0, 24), 1);
  assert.equal(freshnessMultiplier(24, 24), 0.5);
  assert.equal(freshnessMultiplier(48, 24), 0.25);
  assert.equal(freshnessMultiplier(-4, 24), 1);
  assert.equal(freshnessMultiplier(Number.NaN, 24), 0);
});

test('search normalization handles accents, punctuation and case consistently', () => {
  assert.equal(normalizeSearchText('  Café-Design!  '), 'cafe design');
});

test('search relevance requires every term and ranks exact token matches above prefixes', () => {
  assert.equal(scoreSearchTerms('cafe design', ['Café design systems']), 16);
  assert.equal(scoreSearchTerms('cafe des', ['Café design systems']), 13);
  assert.equal(scoreSearchTerms('cafe missing', ['Café design systems']), null);
  assert.equal(scoreSearchTerms('x'.repeat(121), ['anything']), null);
});
