import assert from 'node:assert/strict';
import test from 'node:test';
import { canViewPublicPostMedia } from '../src/publicMediaPlaybackPolicy.js';

const base = {
  viewerUid: 'viewer', ownerUid: 'creator',
  viewerSettings: { privacy: { blockedUserIds: [] }, messaging: { blockedUserIds: [] }, feed: { blockedCreatorIds: [] } },
  ownerSettings: { privacy: { isPrivate: false, isPrivateAccount: false, blockedUserIds: [] }, messaging: { blockedUserIds: [] }, feed: { blockedCreatorIds: [] } },
  viewerProfile: {}, ownerProfile: {}, viewerStatus: {}, ownerStatus: {},
  followsOwner: false,
  post: { audience: 'public', status: 'published' },
};

test('allows public available media when neither account restricts the other', () => {
  assert.equal(canViewPublicPostMedia(base), true);
});

test('private creator accounts require a follow relationship, including both privacy flag spellings', () => {
  assert.equal(canViewPublicPostMedia({ ...base, ownerSettings: { privacy: { isPrivate: true } } }), false);
  assert.equal(canViewPublicPostMedia({ ...base, ownerSettings: { privacy: { isPrivateAccount: true } } }), false);
  assert.equal(canViewPublicPostMedia({ ...base, ownerSettings: { privacy: { isPrivate: true } }, followsOwner: true }), true);
  assert.equal(canViewPublicPostMedia({ ...base, viewerUid: 'creator', ownerUid: 'creator', ownerSettings: { privacy: { isPrivate: true } } }), true);
});

test('blocks access in both directions across privacy, messaging and feed block lists', () => {
  assert.equal(canViewPublicPostMedia({ ...base, viewerSettings: { privacy: { blockedUserIds: ['creator'] } } }), false);
  assert.equal(canViewPublicPostMedia({ ...base, ownerSettings: { privacy: { blockedUserIds: ['viewer'] } } }), false);
  assert.equal(canViewPublicPostMedia({ ...base, viewerSettings: { messaging: { blockedUserIds: ['creator'] } } }), false);
  assert.equal(canViewPublicPostMedia({ ...base, ownerSettings: { messaging: { blockedUserIds: ['viewer'] } } }), false);
  assert.equal(canViewPublicPostMedia({ ...base, viewerSettings: { feed: { blockedCreatorIds: ['creator'] } } }), false);
  assert.equal(canViewPublicPostMedia({ ...base, ownerSettings: { feed: { blockedCreatorIds: ['viewer'] } } }), false);
});

test('rejects unavailable source posts and restricted accounts', () => {
  for (const post of [
    { audience: 'followers', status: 'published' },
    { audience: 'public', status: 'hidden' },
    { audience: 'public', deleted: true },
    { audience: 'public', hidden: true },
    { audience: 'public', moderationStatus: 'restricted' },
  ]) assert.equal(canViewPublicPostMedia({ ...base, post }), false);
  assert.equal(canViewPublicPostMedia({ ...base, ownerProfile: { isBanned: true } }), false);
  assert.equal(canViewPublicPostMedia({ ...base, viewerStatus: { suspended: true } }), false);
  assert.equal(canViewPublicPostMedia({ ...base, ownerStatus: { suspended: true, expiresAt: new Date(Date.now() + 60_000) } }), false);
  assert.equal(canViewPublicPostMedia({ ...base, ownerStatus: { suspended: true, expiresAt: new Date(Date.now() - 60_000) } }), true);
});
