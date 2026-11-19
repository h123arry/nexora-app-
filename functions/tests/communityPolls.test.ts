import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { castCirclePollVote, createCirclePoll } from '../src/communityPolls.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-engagement';
const app = initializeApp({ projectId }, 'community-poll-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Circle poll tests require the Firestore Emulator.');
  await db.recursiveDelete(db.doc('communities/poll-circle'));
  await db.doc('communities/poll-circle').set({ id: 'poll-circle', ownerId: 'alice', type: 'public' });
  await db.doc('communities/poll-circle/members/alice').set({ userId: 'alice', role: 'owner', status: 'active' });
  await db.doc('communities/poll-circle/members/bob').set({ userId: 'bob', role: 'member', status: 'active' });
  await db.doc('communities/poll-circle/members/muted-poll-user').set({ userId: 'muted-poll-user', role: 'member', status: 'active' });
});

after(async () => {
  await db.recursiveDelete(db.doc('communities/poll-circle'));
  await deleteApp(app);
});

describe('trusted Circle polls', () => {
  it('creates a persisted poll only for active Circle members and validates choices', async () => {
    const created = await createCirclePoll(db, 'alice', 'poll-circle', 'Which topic next?', ['Design', 'Engineering']);
    const poll = await db.doc(`communities/poll-circle/polls/${created.pollId}`).get();
    assert.equal(poll.get('question'), 'Which topic next?');
    assert.deepEqual(poll.get('options').map((option: { votes: number }) => option.votes), [0, 0]);
    await assert.rejects(createCirclePoll(db, 'mallory', 'poll-circle', 'No access?', ['Yes', 'No']), /Join this Circle/);
    await assert.rejects(createCirclePoll(db, 'alice', 'poll-circle', 'Duplicate?', ['Yes', 'yes']), /distinct options/);
  });

  it('blocks poll creation during an active mute and restores it after expiry', async () => {
    const muteRef = db.doc('communities/poll-circle/mutes/muted-poll-user');
    await muteRef.set({ userId: 'muted-poll-user', reason: 'Temporary poll mute', createdAt: new Date(), expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    await assert.rejects(createCirclePoll(db, 'muted-poll-user', 'poll-circle', 'Muted poll?', ['Yes', 'No']), /temporarily muted/);
    await muteRef.update({ expiresAt: new Date(Date.now() - 1000) });
    const created = await createCirclePoll(db, 'muted-poll-user', 'poll-circle', 'After expiry?', ['Yes', 'No']);
    assert.equal((await db.doc(`communities/poll-circle/polls/${created.pollId}`).get()).exists, true);
  });

  it('records one immutable vote per member and updates aggregate counts transactionally', async () => {
    const created = await createCirclePoll(db, 'alice', 'poll-circle', 'Choose one', ['A', 'B']);
    const pollRef = db.doc(`communities/poll-circle/polls/${created.pollId}`);
    const beforePoll = await pollRef.get();
    const optionId = beforePoll.get('options')[0].id;
    assert.deepEqual(await castCirclePollVote(db, 'bob', 'poll-circle', created.pollId, optionId), {
      voted: true, optionId, changed: true,
    });
    assert.deepEqual(await castCirclePollVote(db, 'bob', 'poll-circle', created.pollId, beforePoll.get('options')[1].id), {
      voted: true, optionId, changed: false,
    });
    const afterPoll = await pollRef.get();
    assert.deepEqual(afterPoll.get('options').map((option: { votes: number }) => option.votes), [1, 0]);
    assert.equal((await pollRef.collection('votes').doc('bob').get()).get('optionId'), optionId);
    await assert.rejects(castCirclePollVote(db, 'mallory', 'poll-circle', created.pollId, optionId), /Join this Circle/);
  });
});
