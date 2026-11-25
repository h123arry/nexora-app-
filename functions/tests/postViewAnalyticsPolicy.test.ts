import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canReadPostViewAnalytics,
  isEligiblePublicTextPostView,
  shouldCountTextPostView,
  validTextPostViewRequest,
} from '../src/postViewAnalyticsPolicy.js';

const base = {
  viewerId: 'viewer-1',
  creatorId: 'creator-1',
  audience: 'public',
};

test('qualifies only public text posts viewed by another account', () => {
  assert.equal(isEligiblePublicTextPostView(base), true);
  assert.equal(isEligiblePublicTextPostView({ ...base, viewerId: 'creator-1' }), false);
  assert.equal(isEligiblePublicTextPostView({ ...base, audience: 'followers' }), false);
  assert.equal(isEligiblePublicTextPostView({ ...base, image: 'image.jpg' }), false);
  assert.equal(isEligiblePublicTextPostView({ ...base, images: ['image.jpg'] }), false);
  assert.equal(isEligiblePublicTextPostView({ ...base, videoUrl: 'video.mp4' }), false);
  assert.equal(isEligiblePublicTextPostView({ ...base, mediaType: 'video' }), false);
  assert.equal(isEligiblePublicTextPostView({ ...base, mediaType: 'audio' }), false);
  assert.equal(isEligiblePublicTextPostView({ ...base, isVoice: true }), false);
  assert.equal(isEligiblePublicTextPostView({ ...base, opportunityType: 'Job' }), false);
  assert.equal(isEligiblePublicTextPostView({ ...base, isArchived: true }), false);
  assert.equal(isEligiblePublicTextPostView({ ...base, isDraft: true }), false);
});

test('counts a qualified view only after three visible seconds and once per day', () => {
  assert.equal(shouldCountTextPostView({ eligible: true, visibleSeconds: 3, alreadyCountedToday: false }), true);
  assert.equal(shouldCountTextPostView({ eligible: true, visibleSeconds: 2.99, alreadyCountedToday: false }), false);
  assert.equal(shouldCountTextPostView({ eligible: true, visibleSeconds: 5, alreadyCountedToday: true }), false);
  assert.equal(shouldCountTextPostView({ eligible: false, visibleSeconds: 5, alreadyCountedToday: false }), false);
});

test('rejects malformed or unreasonable view requests', () => {
  assert.equal(validTextPostViewRequest('post-1', 3), true);
  for (const [id, seconds] of [
    ['', 3], ['bad/id', 3], [42, 3], ['post-1', 2], ['post-1', 61], ['post-1', NaN],
  ] as const) assert.equal(validTextPostViewRequest(id, seconds), false);
});

test('only the authenticated post owner can read its private analytics', () => {
  assert.equal(canReadPostViewAnalytics('creator-1', 'creator-1', undefined), true);
  assert.equal(canReadPostViewAnalytics('creator-1', undefined, 'creator-1'), true);
  assert.equal(canReadPostViewAnalytics('viewer-1', 'creator-1', undefined), false);
  assert.equal(canReadPostViewAnalytics('', 'creator-1', undefined), false);
});
