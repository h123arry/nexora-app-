import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boundedEngagementScore,
  freshnessMultiplier,
  normalizeSearchText,
  scoreSearchTerms,
} from '../src/services/discovery/discoveryQuality';
import { rankPosts, rankTrendingTopics, recommendCreators } from '../src/services/discovery/discoveryService';

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

test('For You ranking lets fresh relevant content outrank stale lifetime-viral content', () => {
  const makePost = (id: string, userId: string, timestamp: string, likes: number) => ({
    id, userId, username: userId, name: userId, avatar: '', isVerified: false,
    content: 'A discovery post', tags: [], likes, commentsCount: 0, shares: 0,
    timestamp, comments: [],
  }) as any;
  const now = Date.parse('2026-11-07T12:00:00.000Z');
  const ranked = rankPosts([
    makePost('old-viral', 'creator-old', '2026-09-01T12:00:00.000Z', 1_000_000),
    makePost('fresh', 'creator-new', '2026-11-07T11:00:00.000Z', 2),
  ], { mode: 'forYou', now });
  assert.equal(ranked[0]?.post.id, 'fresh');
});

test('trending engagement is freshness-weighted and capped per creator contribution', () => {
  const now = Date.parse('2026-11-07T12:00:00.000Z');
  const makePost = (id: string, userId: string, likes: number) => ({
    id, userId, username: userId, name: userId, avatar: '', isVerified: false,
    content: 'A trend post', tags: ['nexora'], likes, commentsCount: 0, shares: 0,
    timestamp: new Date(now - 60 * 60 * 1000).toISOString(), comments: [],
  }) as any;
  const baseline = [
    makePost('a1', 'creator-a', 10),
    makePost('a2', 'creator-a', 10),
    makePost('a3', 'creator-a', 10),
    makePost('a4', 'creator-a', 0),
    makePost('b1', 'creator-b', 10),
  ];
  const manipulated = baseline.map((item, index) => index === 3 ? { ...item, likes: 1_000_000_000 } : item);
  const normalTrend = rankTrendingTopics(baseline, { now, windowHours: 24, minPosts: 2 })[0];
  const manipulatedTrend = rankTrendingTopics(manipulated, { now, windowHours: 24, minPosts: 2 })[0];
  assert.equal(normalTrend?.postCount, 5);
  assert.equal(normalTrend?.creatorCount, 2);
  assert.equal(manipulatedTrend?.engagement, normalTrend?.engagement);
});

test('creator recommendations interleave shared-interest groups without dropping eligible creators', () => {
  const creator = (id: string, interestDNA: Record<string, number>) => ({
    id, username: id, name: id, followers: 100, isVerified: false,
    isBanned: false, isSuspended: false, interestDNA,
  }) as any;
  const results = recommendCreators([
    creator('ai-1', { ai: 100 }),
    creator('ai-2', { ai: 90 }),
    creator('ai-3', { ai: 80 }),
    creator('design-1', { design: 30 }),
  ], { viewerId: 'viewer', interests: { ai: 100, design: 30 }, limit: 4 });
  assert.equal(results.length, 4);
  assert.ok(results.slice(0, 3).some(item => item.sharedTopics.includes('design')));
});

test('For You ranking applies account-scoped positive and negative recommendation feedback', () => {
  const timestamp = '2026-11-07T11:00:00.000Z';
  const makePost = (id: string, userId: string) => ({
    id, userId, username: userId, name: userId, avatar: '', isVerified: false,
    content: 'A discovery post', tags: ['design'], likes: 0, commentsCount: 0,
    shares: 0, timestamp, comments: [],
  }) as any;
  const posts = [makePost('neutral', 'neutral-creator'), makePost('preferred', 'preferred-creator')];
  const ranked = rankPosts(posts, {
    now: Date.parse('2026-11-07T12:00:00.000Z'),
    recommendationSignals: {
      tags: { design: 20 },
      creators: { 'preferred-creator': 60, 'neutral-creator': -80 },
      communities: {},
    },
  });
  assert.equal(ranked[0]?.post.id, 'preferred');
  assert.ok(ranked[0]?.reasons.some(reason => reason.includes('recent feedback')));
  assert.equal(ranked[1]?.post.id, 'neutral');
});
