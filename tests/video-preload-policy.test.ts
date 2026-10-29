import assert from 'node:assert/strict';
import test from 'node:test';
import { getVideoPreloadPlan } from '../src/utils/videoPreloadPolicy';

const base = {
  isVideo: true,
  postIndex: 3,
  activePostIndex: 3,
  postVideoIndex: 1,
  activeVideoIndex: 1,
  isSlowConnection: false,
};

test('keeps the active video playing and does not mark it released', () => {
  assert.deepEqual(getVideoPreloadPlan({ ...base, isActive: true }), {
    shouldPreload: false,
    isReleased: false,
    preloadMode: 'auto',
  });
});

test('prepares only an adjacent video and downgrades it on a slow connection', () => {
  assert.deepEqual(getVideoPreloadPlan({
    ...base,
    isActive: false,
    postVideoIndex: 2,
    isSlowConnection: true,
  }), {
    shouldPreload: true,
    isReleased: false,
    preloadMode: 'metadata',
  });
});

test('releases distant videos and avoids preparing non-video content', () => {
  assert.equal(getVideoPreloadPlan({
    ...base,
    isActive: false,
    postVideoIndex: 4,
  }).isReleased, true);
  assert.deepEqual(getVideoPreloadPlan({ ...base, isActive: false, isVideo: false }), {
    shouldPreload: false,
    isReleased: false,
    preloadMode: 'none',
  });
});
