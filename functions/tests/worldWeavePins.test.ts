import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { toggleWorldWeaveMomentPin } from '../src/worldWeavePins.js';

type CallableRunner = { run: (request: { data: Record<string, unknown>; auth: { uid: string; token: Record<string, unknown> } }) => Promise<unknown> };
const run = (uid: string, data: Record<string, unknown>) =>
  (toggleWorldWeaveMomentPin as unknown as CallableRunner).run({ data, auth: { uid, token: { uid } } });

const app = getApp();
const db = getFirestore(app);
const weave = db.doc('worldWeaves/pin-test-weave');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'WorldWeave pin tests require the Firestore Emulator.');
  await db.recursiveDelete(weave);
  await weave.set({
    id: weave.id, ownerId: 'alice', ownerName: 'Alice', title: 'Pin test',
    description: '', visibility: 'private', participantIds: ['alice', 'bob'],
    memberCount: 2, momentCount: 4, createdAt: new Date(), updatedAt: new Date(),
  });
  for (const id of ['moment-1', 'moment-2', 'moment-3', 'moment-4']) {
    await weave.collection('moments').doc(id).set({
      id, weaveId: weave.id, authorId: 'bob', text: 'Memory ' + id, mediaType: 'text',
    });
  }
});

after(async () => {
  await db.recursiveDelete(weave);
  await deleteApp(app);
});

describe('trusted WorldWeave pinned moments', () => {
  it('pins and unpins moments transactionally and records activity', async () => {
    const pinned = await run('alice', { weaveId: weave.id, momentId: 'moment-1' }) as { pinned: boolean; pinnedMomentIds: string[] };
    assert.equal(pinned.pinned, true);
    assert.deepEqual(pinned.pinnedMomentIds, ['moment-1']);
    const unpinned = await run('alice', { weaveId: weave.id, momentId: 'moment-1' }) as { pinned: boolean; pinnedMomentIds: string[] };
    assert.equal(unpinned.pinned, false);
    assert.deepEqual(unpinned.pinnedMomentIds, []);
    assert.equal((await weave.collection('activity').where('action', '==', 'moment_pinned').get()).size, 1);
    assert.equal((await weave.collection('activity').where('action', '==', 'moment_unpinned').get()).size, 1);
  });

  it('allows only the owner to curate pins', async () => {
    await assert.rejects(run('bob', { weaveId: weave.id, momentId: 'moment-1' }), /Only the WorldWeave owner/);
    assert.deepEqual((await weave.get()).get('pinnedMomentIds') || [], []);
  });

  it('caps the featured list at three unique moments', async () => {
    await run('alice', { weaveId: weave.id, momentId: 'moment-1' });
    await run('alice', { weaveId: weave.id, momentId: 'moment-2' });
    await run('alice', { weaveId: weave.id, momentId: 'moment-3' });
    await assert.rejects(run('alice', { weaveId: weave.id, momentId: 'moment-4' }), /up to three pinned moments/);
    assert.deepEqual((await weave.get()).get('pinnedMomentIds'), ['moment-1', 'moment-2', 'moment-3']);
  });

  it('rejects a moment that does not belong to the experience', async () => {
    await assert.rejects(run('alice', { weaveId: weave.id, momentId: 'missing-moment' }), /no longer available to pin/);
  });
});
