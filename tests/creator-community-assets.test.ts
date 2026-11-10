import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATOR_COMMUNITY_ASSETS, getCreatorCommunityAsset, getCreatorCommunityAssets } from '../src/content/creatorCommunityAssets';

test('creator community asset catalogue has five complete collections of eight unique assets', () => {
  assert.equal(CREATOR_COMMUNITY_ASSETS.length, 40);
  assert.equal(new Set(CREATOR_COMMUNITY_ASSETS.map(asset => asset.id)).size, 40);
  for (const category of ['profile-frame', 'profile-badge', 'circle-cover', 'milestone-art', 'live-overlay'] as const) {
    assert.equal(getCreatorCommunityAssets(category).length, 8);
  }
});

test('profile decoration assets are the only assets that can update profile identity fields', () => {
  const applicable = CREATOR_COMMUNITY_ASSETS.filter(asset => asset.applyField);
  assert.equal(applicable.length, 16);
  assert.ok(applicable.every(asset => asset.category === 'profile-frame' || asset.category === 'profile-badge'));
  assert.ok(CREATOR_COMMUNITY_ASSETS.filter(asset => asset.category === 'circle-cover').every(asset => !asset.applyField));
});

test('asset paths are local, scoped to the creator asset collection and category-matched', () => {
  for (const asset of CREATOR_COMMUNITY_ASSETS) {
    assert.ok(asset.path.startsWith('/creator-assets/'));
    assert.ok(asset.path.endsWith('.svg'));
    assert.ok(asset.path.includes(asset.category === 'profile-frame' ? '/profile-frames/' :
      asset.category === 'profile-badge' ? '/badges/' :
      asset.category === 'circle-cover' ? '/circle-covers/' :
      asset.category === 'milestone-art' ? '/milestones/' : '/live-overlays/'));
    assert.ok(asset.description.length >= 40);
  }
});

test('asset lookup is exact and safely returns null for unknown ids', () => {
  assert.equal(getCreatorCommunityAsset('frame-aurora')?.title, 'Aurora Halo');
  assert.equal(getCreatorCommunityAsset('untrusted-url'), null);
});
