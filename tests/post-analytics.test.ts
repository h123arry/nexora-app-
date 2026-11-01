import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPostAnalytics } from '../src/services/analytics/postAnalytics';
import { Post } from '../src/types';

const post = (overrides: Partial<Post> = {}): Post => ({
  id: 'post-1',
  userId: 'creator-1',
  username: 'creator',
  name: 'Creator',
  avatar: '',
  isVerified: false,
  content: 'A post',
  tags: [],
  likes: 10,
  commentsCount: 3,
  shares: 2,
  timestamp: '2026-11-01T10:00:00.000Z',
  comments: [],
  ...overrides,
});

test('post analytics uses only recorded counters', () => {
  assert.deepEqual(buildPostAnalytics(post({
    views: 300,
    likes: 10,
    commentsCount: 3,
    shares: 2,
    saves: 5,
  })), {
    views: 300,
    likes: 10,
    comments: 3,
    shares: 2,
    saves: 5,
    totalInteractions: 20,
    engagementRate: 6.67,
  });
});

test('post analytics falls back to loaded comment count when no counter exists', () => {
  const result = buildPostAnalytics(post({
    commentsCount: undefined as unknown as number,
    comments: [{ id: 'c1' } as Post['comments'][number], { id: 'c2' } as Post['comments'][number]],
  }));
  assert.equal(result.comments, 2);
});

test('post analytics marks the rate unavailable without positive recorded views', () => {
  assert.equal(buildPostAnalytics(post()).engagementRate, null);
  assert.equal(buildPostAnalytics(post({ views: 0 })).engagementRate, null);
});

test('post analytics normalizes invalid and negative counters safely', () => {
  const result = buildPostAnalytics(post({
    views: 100,
    likes: -5,
    commentsCount: Number.NaN,
    shares: Number.POSITIVE_INFINITY,
    saves: -1,
  }));
  assert.equal(result.totalInteractions, 0);
  assert.equal(result.engagementRate, 0);
});
