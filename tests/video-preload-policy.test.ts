import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { getVideoPreloadPlan, shouldLoadVideoPoster } from '../src/utils/videoPreloadPolicy';

const base = {
  isVideo: true,
  postIndex: 3,
  activePostIndex: 3,
  postVideoIndex: 1,
  activeVideoIndex: 1,
  isSlowConnection: false,
};

test('preloads nearby videos while the feed is open on a non-video post', () => {
  assert.deepEqual(getVideoPreloadPlan({
    ...base,
    isActive: false,
    postIndex: 2,
    activePostIndex: 1,
    postVideoIndex: 0,
    activeVideoIndex: -1,
  }), {
    shouldPreload: true,
    isReleased: false,
    preloadMode: 'auto',
  });
});

test('does not preload feed videos until a visible feed position is known', () => {
  assert.deepEqual(getVideoPreloadPlan({
    ...base,
    isActive: false,
    activePostIndex: -1,
    activeVideoIndex: -1,
  }), {
    shouldPreload: false,
    isReleased: true,
    preloadMode: 'none',
  });
});

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


test('loads posters for active and preloaded video players, not broad observer neighbors', () => {
  assert.equal(shouldLoadVideoPoster({ isActive: true, isNearby: false, shouldPreload: false }), true);
  assert.equal(shouldLoadVideoPoster({ isActive: false, isNearby: true, shouldPreload: false }), false);
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
  assert.ok(profile.includes('const savedPoster = (post as any).videoThumbnailUrl || (post as any).posterUrl || post.image'));
  assert.ok(profile.includes('videoThumbnailUrl: uploaded.downloadUrl,'));
  assert.ok(profile.includes('posterUrl: uploaded.downloadUrl,'));
  assert.ok(!profile.includes('objectUrls.forEach(url => URL.revokeObjectURL(url))'));
});

test('feed player prefers the persisted video poster fields', async () => {
  const player = await readFile(new URL('../src/components/NexoraVideoPlayer.tsx', import.meta.url), 'utf8');
  assert.ok(player.includes('const posterUrl = safeMediaDeliveryUrl(normalizeMediaDeliveryUrl((post as any).videoThumbnailUrl || (post as any).posterUrl'));
  assert.ok(player.includes('poster={shouldLoadVideoPoster({ isActive, isNearby, shouldPreload, isReleased }) ? (posterUrl || undefined) : undefined}'));
});


test('feed player only attaches video sources inside the parent preload window', async () => {
  const player = await readFile(new URL('../src/components/NexoraVideoPlayer.tsx', import.meta.url), 'utf8');
  assert.ok(player.includes('((isActive ?? true) || shouldPreload ? finalVideoUrl : undefined)'));
  assert.ok(!player.includes('((isActive ?? true) || isNearby || shouldPreload ? finalVideoUrl : undefined)'));
});

test('feed uploader uses the shared verified badge and honors verified creator state', async () => {
  const feedCard = await readFile(new URL('../src/components/FeedPostCard.tsx', import.meta.url), 'utf8');
  assert.ok(feedCard.includes("import PurpleVerifiedBadge from './VohVerifiedBadge';"));
  assert.ok(feedCard.includes('post.isVerified || post.username ==='));
  assert.ok(feedCard.includes('<PurpleVerifiedBadge className="h-3.5 w-3.5 shrink-0"'));
});

test('video creator avatar resolves delivery URLs and has a deterministic fallback', async () => {
  const player = await readFile(new URL('../src/components/NexoraVideoPlayer.tsx', import.meta.url), 'utf8');
  assert.ok(player.includes('normalizeMediaDeliveryUrl(post.avatar)'));
  assert.ok(player.includes("(post.name || post.username || 'N').trim().charAt(0).toUpperCase()"));
  assert.ok(player.includes('<PurpleVerifiedBadge className="h-3.5 w-3.5 shrink-0"'));
});

test('profile video grid fallback is a clean frame preview without player controls', async () => {
  const profile = await readFile(new URL('../src/components/ProfileView.tsx', import.meta.url), 'utf8');
  assert.ok(profile.includes('src={videoSource ? safeMediaDeliveryUrl(normalizeMediaDeliveryUrl(videoSource)) : undefined}'));
  assert.ok(profile.includes('controls={false}'));
});


test('does not eagerly load posters just because a distant card intersects the broad observer', () => {
  assert.equal(shouldLoadVideoPoster({
    isActive: false,
    isNearby: true,
    shouldPreload: false,
    isReleased: false,
  }), false);
});

test('loads posters for the active card and the explicit preload window', () => {
  assert.equal(shouldLoadVideoPoster({
    isActive: true,
    isNearby: false,
    shouldPreload: false,
    isReleased: false,
  }), true);
  assert.equal(shouldLoadVideoPoster({
    isActive: false,
    isNearby: false,
    shouldPreload: true,
    isReleased: false,
  }), true);
});

test('does not load posters for released cards even if marked nearby', () => {
  assert.equal(shouldLoadVideoPoster({
    isActive: false,
    isNearby: true,
    shouldPreload: true,
    isReleased: true,
  }), false);
});


test('profile video tiles prefer the uploaded post cover image before opening a video fallback', async () => {
  const profile = await readFile(new URL('../src/components/ProfileView.tsx', import.meta.url), 'utf8');
  assert.ok(profile.includes('|| post.image\n            || post.images?.find(Boolean)'));
  assert.ok(profile.includes('if (!repairVideoPosters) return;'));
  assert.ok(profile.includes('const savedPoster = (post as any).videoThumbnailUrl || (post as any).posterUrl || post.image'));
});
