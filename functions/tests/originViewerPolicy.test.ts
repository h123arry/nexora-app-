import assert from 'node:assert/strict';
import test from 'node:test';
import { canExposeOriginSource, isOriginAccountBlocked, isOriginPublicPost } from '../src/originViewerPolicy.js';
const base = {
 viewerUid: 'viewer', derivativeOwnerUid: 'remixer', sourceOwnerUid: 'source',
 viewerSettings: { messaging: { blockedUserIds: [] }, feed: { blockedCreatorIds: [] } },
 derivativeSettings: { messaging: { blockedUserIds: [] }, feed: { blockedCreatorIds: [] } },
 sourceSettings: { privacy: { isPrivateAccount: false }, messaging: { blockedUserIds: [] }, feed: { blockedCreatorIds: [] } },
 sourcePost: { audience: 'public', userId: 'source', status: 'published' },
};
test('public viewer projection allows an available public source with no block relationships', () => assert.equal(canExposeOriginSource(base), true));
test('public viewer projection rejects private, non-public, deleted, hidden, archived and mismatched source posts', () => {
 for (const patch of [
  { sourcePost: { audience: 'followers', userId: 'source' } },
  { sourceSettings: { privacy: { isPrivateAccount: true } } },
  { sourcePost: { audience: 'public', userId: 'source', deleted: true } },
  { sourcePost: { audience: 'public', userId: 'source', hidden: true } },
  { sourcePost: { audience: 'public', userId: 'source', isArchived: true } },
  { sourcePost: { audience: 'public', userId: 'someone-else' } },
 ]) assert.equal(canExposeOriginSource({ ...base, ...patch }), false);
});
test('viewer block in either direction hides source attribution', () => {
 assert.equal(canExposeOriginSource({ ...base, viewerSettings: { feed: { blockedCreatorIds: ['source'] } } }), false);
 assert.equal(canExposeOriginSource({ ...base, sourceSettings: { messaging: { blockedUserIds: ['viewer'] } } }), false);
});
test('blocks between derivative owner and source creator hide the relationship', () => {
 assert.equal(canExposeOriginSource({ ...base, derivativeSettings: { feed: { blockedCreatorIds: ['source'] } } }), false);
 assert.equal(canExposeOriginSource({ ...base, sourceSettings: { feed: { blockedCreatorIds: ['remixer'] } } }), false);
});
test('the derivative itself must be a currently public post owned by its recorded creator', () => {
 assert.equal(isOriginPublicPost({ audience: 'public', userId: 'remixer' }, 'remixer'), true);
 assert.equal(isOriginPublicPost({ audience: 'followers', userId: 'remixer' }, 'remixer'), false);
 assert.equal(isOriginPublicPost({ audience: 'public', userId: 'other' }, 'remixer'), false);
});
test('account-level block check treats self-view as allowed and respects either direction', () => {
 assert.equal(isOriginAccountBlocked({ viewerUid: 'same', creatorUid: 'same', viewerSettings: null, creatorSettings: null }), false);
 assert.equal(isOriginAccountBlocked({ viewerUid: 'viewer', creatorUid: 'source', viewerSettings: { messaging: { blockedUserIds: ['source'] } }, creatorSettings: null }), true);
 assert.equal(isOriginAccountBlocked({ viewerUid: 'viewer', creatorUid: 'source', viewerSettings: null, creatorSettings: { feed: { blockedCreatorIds: ['viewer'] } } }), true);
});
