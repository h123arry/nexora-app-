import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canReadWorldWeaveMedia, resolveWorldWeaveMomentMediaUrl } from '../src/worldWeaveMediaAccess.js';
import { getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

describe('WorldWeave private media access policy', () => {
  it('allows the owner to resolve media for their own experience', () => {
    assert.equal(canReadWorldWeaveMedia({
      uid: 'alice', ownerId: 'alice', visibility: 'private', participantIds: ['alice'],
    }), true);
  });

  it('allows active contributors to private media and rejects removed or unrelated accounts', () => {
    const base = { ownerId: 'alice', visibility: 'private', participantIds: ['alice', 'bob'] };
    assert.equal(canReadWorldWeaveMedia({ ...base, uid: 'bob' }), true);
    assert.equal(canReadWorldWeaveMedia({ ...base, uid: 'carol' }), false);
    assert.equal(canReadWorldWeaveMedia({ ...base, uid: 'dave', participantIds: ['alice', 'bob'] }), false);
  });

  it('allows signed-in viewers to resolve public media', () => {
    assert.equal(canReadWorldWeaveMedia({
      uid: 'viewer', ownerId: 'alice', visibility: 'public', participantIds: ['alice'],
    }), true);
  });

  it('enforces both-direction blocks for the experience owner and moment author', () => {
    const base = { uid: 'viewer', ownerId: 'alice', authorId: 'bob', visibility: 'public', participantIds: ['alice'] };
    assert.equal(canReadWorldWeaveMedia({ ...base, viewerBlockedIds: ['alice'] }), false);
    assert.equal(canReadWorldWeaveMedia({ ...base, viewerBlockedIds: ['bob'] }), false);
    assert.equal(canReadWorldWeaveMedia({ ...base, ownerBlockedIds: ['viewer'] }), false);
    assert.equal(canReadWorldWeaveMedia({ ...base, authorBlockedIds: ['viewer'] }), false);
    assert.equal(canReadWorldWeaveMedia({ ...base, viewerBlockedIds: [], ownerBlockedIds: [], authorBlockedIds: [] }), true);
  });

  it('fails closed for unknown visibility and malformed membership data', () => {
    assert.equal(canReadWorldWeaveMedia({
      uid: 'viewer', ownerId: 'alice', visibility: 'friends', participantIds: ['viewer'],
    }), false);
    assert.equal(canReadWorldWeaveMedia({
      uid: 'viewer', ownerId: 'alice', visibility: 'private', participantIds: 'viewer',
    }), false);
  });
});


type CallableRunner = { run: (request: { data: Record<string, unknown>; auth?: { uid: string; token: Record<string, unknown> } | null }) => Promise<any> };
const callResolver = (uid: string, data: Record<string, unknown>) =>
  (resolveWorldWeaveMomentMediaUrl as unknown as CallableRunner).run({
    data, auth: { uid, token: { uid } },
  });

const app = getApp();
const db = getFirestore(app);
const weave = db.doc('worldWeaves/media-access-policy-test');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'WorldWeave media resolver tests require the Firestore Emulator.');
  await db.recursiveDelete(weave);
  await weave.set({
    id: weave.id, ownerId: 'media-owner', ownerName: 'Owner', title: 'Private media',
    description: '', visibility: 'private', participantIds: ['media-owner', 'media-author'],
    memberCount: 2, momentCount: 1,
  });
  await weave.collection('moments').doc('private-image').set({
    id: 'private-image', weaveId: weave.id, authorId: 'media-author',
    mediaType: 'image', mediaUrl: '', storagePath: 'users/media-author/media/private-image',
  });
  await db.doc('users/media-owner/settings/preferences').set({
    privacy: { blockedUserIds: ['media-author'] },
  });
});

after(async () => {
  await db.recursiveDelete(weave);
  await db.recursiveDelete(db.doc('users/media-owner'));
  await deleteApp(app);
});

describe('WorldWeave media resolver authorization', () => {
  it('denies a non-member before attempting to sign the Storage object', async () => {
    await assert.rejects(
      callResolver('media-outsider', { weaveId: weave.id, momentId: 'private-image' }),
      /no longer have access/,
    );
  });

  it('denies an active member blocked by the experience owner', async () => {
    await assert.rejects(
      callResolver('media-author', { weaveId: weave.id, momentId: 'private-image' }),
      /no longer have access/,
    );
  });

  it('rejects malformed storage paths rather than signing arbitrary objects', async () => {
    await weave.collection('moments').doc('malformed-path').set({
      id: 'malformed-path', weaveId: weave.id, authorId: 'media-author',
      mediaType: 'image', mediaUrl: '', storagePath: 'users/another-user/media/malformed-path',
    });
    await assert.rejects(
      callResolver('media-owner', { weaveId: weave.id, momentId: 'malformed-path' }),
      /valid private media asset/,
    );
  });
});
