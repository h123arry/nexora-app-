import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
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

test('prepares two videos behind the active video before they enter view', () => {
  const plan = getVideoPreloadPlan({ ...base, isActive: false, activeVideoIndex: 3, postVideoIndex: 1 });
  assert.deepEqual(plan, { shouldPreload: true, isReleased: false, preloadMode: 'auto' });
});

test('releases videos outside the two-position preload window', () => {
  const plan = getVideoPreloadPlan({ ...base, isActive: false, postVideoIndex: 4 });
  assert.deepEqual(plan, { shouldPreload: false, isReleased: true, preloadMode: 'none' });
});

test('prepares videos within two video positions and downgrades it on a slow connection', () => {
  assert.deepEqual(getVideoPreloadPlan({
    ...base,
    isActive: false,
    postVideoIndex: 3,
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
    postIndex: 8,
    activePostIndex: 3,
    postVideoIndex: 6,
    activeVideoIndex: 1,
    isOffline: true,
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


test('profile video posters persist in post fields and are not revoked on effect refresh', async () => {
  const profile = await readFile(new URL('../src/components/ProfileView.tsx', import.meta.url), 'utf8');
  assert.ok(profile.includes('temporaryPosterUrls = useRef<string[]>([])'));
  assert.ok(profile.includes('temporaryPosterUrls.current.forEach(url => URL.revokeObjectURL(url))'));
  assert.ok(profile.includes('const savedPoster = (post as any).videoThumbnailUrl || (post as any).posterUrl'));
  assert.ok(profile.includes('videoThumbnailUrl: uploaded.downloadUrl,'));
  assert.ok(profile.includes('posterUrl: uploaded.downloadUrl,'));
  assert.ok(!profile.includes('objectUrls.forEach(url => URL.revokeObjectURL(url))'));
});

test('feed player prefers the persisted video poster fields', async () => {
  const player = await readFile(new URL('../src/components/NexoraVideoPlayer.tsx', import.meta.url), 'utf8');
  assert.ok(player.includes('const posterUrl = (post as any).videoThumbnailUrl || (post as any).posterUrl'));
  assert.ok(player.includes('poster={shouldLoadVideoPoster({ isActive, isNearby, shouldPreload, isReleased }) ? (posterUrl || undefined) : undefined}'));
});
