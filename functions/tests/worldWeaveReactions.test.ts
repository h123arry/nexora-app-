import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setWorldWeaveMomentReaction } from '../src/worldWeaveReactions.js';

type CallableRunner = { run: (request: { data: Record<string, unknown>; auth: { uid: string; token: Record<string, unknown> } }) => Promise<unknown> };
const run = (uid: string, data: Record<string, unknown>) =>
  (setWorldWeaveMomentReaction as unknown as CallableRunner).run({ data, auth: { uid, token: { uid } } });

const app = getApp();
const db = getFirestore(app);
const weave = db.doc('worldWeaves/reaction-test-weave');
const moment = weave.collection('moments').doc('moment-1');

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'WorldWeave reaction tests require the Firestore Emulator.');
  await db.recursiveDelete(weave);
  await weave.set({
    id: weave.id, ownerId: 'alice', ownerName: 'Alice', title: 'Reaction test',
    description: '', visibility: 'private', participantIds: ['alice', 'bob'],
    memberCount: 2, momentCount: 1, createdAt: new Date(), updatedAt: new Date(),
  });
  await moment.set({ id: moment.id, weaveId: weave.id, authorId: 'alice', text: 'A shared memory.', mediaType: 'text' });
});

after(async () => {
  await db.recursiveDelete(weave);
  await deleteApp(app);
});

describe('trusted WorldWeave moment reactions', () => {
  it('toggles one reaction on and off with correct aggregate counts', async () => {
    const first = await run('bob', { weaveId: weave.id, momentId: moment.id, reaction: 'heart' }) as { reaction: string; reactionCounts: Record<string, number> };
    assert.equal(first.reaction, 'heart');
    assert.equal(first.reactionCounts.heart, 1);
    assert.equal((await moment.collection('reactions').doc('bob').get()).get('reaction'), 'heart');

    const second = await run('bob', { weaveId: weave.id, momentId: moment.id, reaction: 'heart' }) as { reaction: null; reactionCounts: Record<string, number> };
    assert.equal(second.reaction, null);
    assert.equal(second.reactionCounts.heart, 0);
    assert.equal((await moment.collection('reactions').doc('bob').get()).exists, false);
  });

  it('switches a contributor reaction without double-counting', async () => {
    await run('bob', { weaveId: weave.id, momentId: moment.id, reaction: 'applause' });
    const switched = await run('bob', { weaveId: weave.id, momentId: moment.id, reaction: 'insight' }) as { reactionCounts: Record<string, number> };
    assert.equal(switched.reactionCounts.applause, 0);
    assert.equal(switched.reactionCounts.insight, 1);
    const reactions = await moment.collection('reactions').get();
    assert.equal(reactions.size, 1);
    assert.equal(reactions.docs[0].id, 'bob');
    assert.equal(reactions.docs[0].get('reaction'), 'insight');
  });

  it('rejects non-members, unsupported reactions, and missing moments', async () => {
    await assert.rejects(run('charlie', { weaveId: weave.id, momentId: moment.id, reaction: 'heart' }), /Join this WorldWeave/);
    await assert.rejects(run('bob', { weaveId: weave.id, momentId: moment.id, reaction: 'fireworks' }), /supported moment reaction/);
    await assert.rejects(run('bob', { weaveId: weave.id, momentId: 'missing-moment', reaction: 'heart' }), /no longer available/);
  });
});
