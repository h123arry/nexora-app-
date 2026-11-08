import assert from 'node:assert/strict';
import test from 'node:test';
import { getFeedLoadMoreDecision } from '../src/utils/feedPaginationPolicy';

const base = {
  distanceToBottom: 100,
  visibleCount: 8,
  totalCount: 20,
  hasMorePosts: true,
  isLoadingMorePosts: false,
  requestInFlight: false,
};

test('reveals cached posts and requests another page near the bottom', () => {
  assert.deepEqual(getFeedLoadMoreDecision(base), {
    shouldRevealMore: true,
    shouldRequestMore: true,
  });
});

test('does not request duplicate pages while loading or a request is in flight', () => {
  assert.equal(getFeedLoadMoreDecision({ ...base, isLoadingMorePosts: true }).shouldRequestMore, false);
  assert.equal(getFeedLoadMoreDecision({ ...base, requestInFlight: true }).shouldRequestMore, false);
});

test('does not request another page when the feed is exhausted', () => {
  assert.deepEqual(getFeedLoadMoreDecision({ ...base, hasMorePosts: false }), {
    shouldRevealMore: true,
    shouldRequestMore: false,
  });
});

test('does not reveal or request more when outside the threshold', () => {
  assert.deepEqual(getFeedLoadMoreDecision({ ...base, distanceToBottom: 500 }), {
    shouldRevealMore: false,
    shouldRequestMore: false,
  });
});

test('does not reveal beyond the loaded collection and rejects invalid distances', () => {
  assert.equal(getFeedLoadMoreDecision({ ...base, visibleCount: 20 }).shouldRevealMore, false);
  assert.deepEqual(getFeedLoadMoreDecision({ ...base, distanceToBottom: Number.NaN }), {
    shouldRevealMore: false,
    shouldRequestMore: false,
  });
});
