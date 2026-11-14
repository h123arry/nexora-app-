import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
  leaveWorldWeave,
  removeWorldWeaveContributor,
  transferWorldWeaveOwnership,
} from '../src/worldWeaveGovernance.js';

type CallableRunner = { run: (request: { data: Record<string, unknown>; auth: { uid: string; token: Record<string, unknown> } }) => Promise<unknown> };
const run = (callable: unknown, uid: string, data: Record<string, unknown>) =>
  (callable as CallableRunner).run({ data, auth: { uid, token: { uid } } });

const app = getApp();
const db = getFirestore(app);
const weave = db.doc('worldWeaves/governance-test-weave');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'WorldWeave governance tests require the Firestore Emulator.');
  await db.recursiveDelete(weave);
  await weave.set({
    id: weave.id, ownerId: 'alice', ownerName: 'Alice', title: 'Governance test',
    description: '', visibility: 'private', participantIds: ['alice', 'bob', 'carol'],
    memberCount: 3, momentCount: 0, createdAt: new Date(), updatedAt: new Date(),
  });
  await db.doc('publicProfiles/bob').set({ id: 'bob', username: 'bob', name: 'Bob' });
  await db.doc('publicProfiles/carol').set({ id: 'carol', username: 'carol', name: 'Carol' });
});

after(async () => {
  await db.recursiveDelete(weave);
  await db.doc('publicProfiles/bob').delete().catch(() => undefined);
  await db.doc('publicProfiles/carol').delete().catch(() => undefined);
  await deleteApp(app);
});

describe('trusted WorldWeave contributor lifecycle', () => {
  it('lets a contributor leave without deleting their historical moments', async () => {
    await weave.collection('moments').doc('bob-memory').set({ authorId: 'bob', text: 'Keep this memory.' });
    await run(leaveWorldWeave, 'bob', { weaveId: weave.id });
    const snapshot = await weave.get();
    assert.deepEqual(snapshot.get('participantIds'), ['alice', 'carol']);
    assert.equal(snapshot.get('memberCount'), 2);
    assert.equal((await weave.collection('moments').doc('bob-memory').get()).exists, true);
    const events = await weave.collection('activity').where('action', '==', 'member_left').get();
    assert.equal(events.size, 1);
    assert.equal(events.docs[0].get('targetUid'), 'bob');
  });

  it('prevents the owner from leaving before transferring ownership', async () => {
    await assert.rejects(run(leaveWorldWeave, 'alice', { weaveId: weave.id }), /owner must transfer ownership/);
    assert.equal((await weave.get()).get('ownerId'), 'alice');
  });

  it('allows only the owner to remove another active contributor', async () => {
    await assert.rejects(
      run(removeWorldWeaveContributor, 'bob', { weaveId: weave.id, memberId: 'carol' }),
      /Only the WorldWeave owner/,
    );
    await run(removeWorldWeaveContributor, 'alice', { weaveId: weave.id, memberId: 'carol' });
    const snapshot = await weave.get();
    assert.deepEqual(snapshot.get('participantIds'), ['alice']);
    assert.equal(snapshot.get('memberCount'), 1);
    const events = await weave.collection('activity').where('action', '==', 'member_removed').get();
    assert.equal(events.size, 1);
  });

  it('transfers ownership atomically to an existing contributor and preserves the former owner as a member', async () => {
    await weave.update({ participantIds: ['alice', 'bob'], memberCount: 2 });
    await run(transferWorldWeaveOwnership, 'alice', { weaveId: weave.id, memberId: 'bob' });
    const snapshot = await weave.get();
    assert.equal(snapshot.get('ownerId'), 'bob');
    assert.equal(snapshot.get('ownerName'), 'Bob');
    assert.deepEqual(snapshot.get('participantIds'), ['alice', 'bob']);
    assert.equal(snapshot.get('memberCount'), 2);
    const events = await weave.collection('activity').where('action', '==', 'ownership_transferred').get();
    assert.equal(events.size, 1);
    assert.equal(events.docs[0].get('previousOwnerId'), 'alice');
  });

  it('rejects self-transfer, non-member recipients, and removal of the owner', async () => {
    await assert.rejects(run(transferWorldWeaveOwnership, 'bob', { weaveId: weave.id, memberId: 'bob' }), /Choose another/);
    await assert.rejects(run(transferWorldWeaveOwnership, 'bob', { weaveId: weave.id, memberId: 'mallory' }), /already be an active contributor/);
    await assert.rejects(run(removeWorldWeaveContributor, 'bob', { weaveId: weave.id, memberId: 'bob' }), /Use ownership transfer/);
  });
});
