import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeFeedPreferencePatch,
  normalizeFeedPreferences,
  resetFeedPreferences,
} from '../src/services/discovery/feedPreferences';

test('normalizes feed controls, removes duplicates, and bounds persisted values', () => {
  const result = normalizeFeedPreferences({
    tab: 'trending',
    notInterestedTags: [' #AI ', '#ai', '', 42 as any],
    blockedCreatorIds: ['blocked-1', 'blocked-1'],
    mutedCreatorIds: ['creator-1', 'creator-1', ' creator-2 '],
    hiddenPostIds: ['post-1'],
    seenPostIds: Array.from({ length: 600 }, (_, index) => `post-${index}`),
  });

  assert.equal(result.tab, 'trending');
  assert.deepEqual(result.notInterestedTags, ['ai']);
  assert.deepEqual(result.blockedCreatorIds, ['blocked-1']);
  assert.deepEqual(result.mutedCreatorIds, ['creator-1', 'creator-2']);
  assert.equal(result.seenPostIds.length, 500);
});

test('merges feed preference patches without dropping existing controls', () => {
  const current = normalizeFeedPreferences({
    tab: 'following',
    notInterestedTags: ['sports'],
    blockedCreatorIds: ['blocked-1'],
    mutedCreatorIds: ['creator-1'],
  });
  const next = mergeFeedPreferencePatch(current, { hiddenPostIds: ['post-9'] });

  assert.equal(next.tab, 'following');
  assert.deepEqual(next.notInterestedTags, ['sports']);
  assert.deepEqual(next.blockedCreatorIds, ['blocked-1']);
  assert.deepEqual(next.mutedCreatorIds, ['creator-1']);
  assert.deepEqual(next.hiddenPostIds, ['post-9']);
});

test('reset removes recommendation controls while retaining the selected feed tab', () => {
  const reset = resetFeedPreferences({
    tab: 'friends',
    notInterestedTags: ['sports'],
    blockedCreatorIds: ['blocked-1'],
    mutedCreatorIds: ['creator-1'],
    hiddenPostIds: ['post-1'],
    seenPostIds: ['post-2'],
  }, '2026-10-24T00:00:00.000Z');

  assert.equal(reset.tab, 'friends');
  assert.deepEqual(reset.notInterestedTags, []);
  assert.deepEqual(reset.blockedCreatorIds, []);
  assert.deepEqual(reset.mutedCreatorIds, []);
  assert.deepEqual(reset.hiddenPostIds, []);
  assert.deepEqual(reset.seenPostIds, []);
  assert.equal(reset.recommendationResetAt, '2026-10-24T00:00:00.000Z');
});
