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

test('uses metadata-only preparation on constrained devices', () => {
  assert.deepEqual(getVideoPreloadPlan({
    ...base,
    isActive: false,
    postVideoIndex: 2,
    isConstrainedDevice: true,
  }), {
    shouldPreload: true,
    isReleased: false,
    preloadMode: 'metadata',
  });
});

test('does not start speculative video requests while offline', () => {
  assert.deepEqual(getVideoPreloadPlan({
    ...base,
    isActive: false,
    postVideoIndex: 2,
    isOffline: true,
  }), {
    shouldPreload: false,
    isReleased: false,
    preloadMode: 'none',
  });
});

test('releases distant video resources while offline without preloading', () => {
  assert.deepEqual(getVideoPreloadPlan({
    ...base,
    isActive: false,
    isOffline: true,
    postIndex: 8,
    activePostIndex: 3,
    postVideoIndex: 6,
    activeVideoIndex: 1,
  }), {
    shouldPreload: false,
    isReleased: true,
    preloadMode: 'none',
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


import { shouldLoadVideoPoster } from '../src/utils/videoPreloadPolicy';

test('loads posters for active, nearby and preloaded video players', () => {
  assert.equal(shouldLoadVideoPoster({ isActive: true, isNearby: false, shouldPreload: false }), true);
  assert.equal(shouldLoadVideoPoster({ isActive: false, isNearby: true, shouldPreload: false }), true);
  assert.equal(shouldLoadVideoPoster({ isActive: false, isNearby: false, shouldPreload: true }), true);
});

test('defers posters for offscreen players and releases poster requests', () => {
  assert.equal(shouldLoadVideoPoster({ isActive: false, isNearby: false, shouldPreload: false }), false);
  assert.equal(shouldLoadVideoPoster({ isActive: true, isNearby: true, shouldPreload: true, isReleased: true }), false);
  assert.equal(shouldLoadVideoPoster({ isNearby: false, shouldPreload: false }), true);
});
