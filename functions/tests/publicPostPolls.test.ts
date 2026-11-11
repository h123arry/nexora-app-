import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMyPublicPostPollVotes, voteOnPublicPostPoll } from '../src/publicPostPolls.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-feed-polls' }, 'public-post-poll-tests');
const db = getFirestore(app);
const postIds = ['feed-poll-public', 'feed-poll-private', 'feed-poll-concurrent'];

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Public poll tests require the Firestore Emulator.');
  await db.doc('posts/feed-poll-public').set({
    id: 'feed-poll-public', userId: 'poll-author', audience: 'public',
    interactivePoll: { question: 'Which format?', options: [{ id: 'text', text: 'Text', votes: 0 }, { id: 'video', text: 'Video', votes: 0 }] },
  });
  await db.doc('posts/feed-poll-private').set({
    id: 'feed-poll-private', userId: 'poll-author', audience: 'followers',
    interactivePoll: { question: 'Private poll?', options: [{ id: 'yes', text: 'Yes', votes: 0 }, { id: 'no', text: 'No', votes: 0 }] },
  });
});
after(async () => {
  for (const postId of postIds) {
    const votes = await db.doc(`posts/${postId}`).collection('pollVotes').get();
    await Promise.all(votes.docs.map(doc => doc.ref.delete()));
    await db.doc(`posts/${postId}`).delete();
  }
  await deleteApp(app);
});

describe('trusted public feed polls', () => {
  it('records a single vote and restores the account vote across sessions', async () => {
    const first = await voteOnPublicPostPoll(db, 'voter-a', 'feed-poll-public', 'video');
    assert.equal(first.voted, true);
    assert.equal(first.options.find(option => option.id === 'video')?.votes, 1);
    const replay = await voteOnPublicPostPoll(db, 'voter-a', 'feed-poll-public', 'text');
    assert.equal(replay.voted, false);
    assert.equal(replay.selectedOptionId, 'video');
    assert.deepEqual((await getMyPublicPostPollVotes(db, 'voter-a', ['feed-poll-public'])).votes, {
      'feed-poll-public': 'video',
    });
    assert.equal((await db.doc('posts/feed-poll-public').get()).get('interactivePoll.options')[0].votes, 0);
  });

  it('rejects invalid choices and private polls', async () => {
    await assert.rejects(voteOnPublicPostPoll(db, 'voter-b', 'feed-poll-public', 'missing'), /valid poll option/);
    await assert.rejects(voteOnPublicPostPoll(db, 'voter-b', 'feed-poll-private', 'yes'), /unavailable/);
  });

  it('prevents concurrent double voting by the same account', async () => {
    const postRef = db.doc('posts/feed-poll-concurrent');
    await postRef.set({
      id: 'feed-poll-concurrent', userId: 'poll-author', audience: 'public',
      interactivePoll: { question: 'Choose once?', options: [{ id: 'text', text: 'Text', votes: 0 }, { id: 'video', text: 'Video', votes: 0 }] },
    });
    try {
      // Wait for both transactions to settle before any fixture cleanup. Promise.all
      // rejects early and can let teardown race a still-retrying Firestore transaction.
      const outcomes = await Promise.allSettled([
        voteOnPublicPostPoll(db, 'voter-c', 'feed-poll-concurrent', 'text'),
        voteOnPublicPostPoll(db, 'voter-c', 'feed-poll-concurrent', 'video'),
      ]);
      const rejected = outcomes.filter((outcome) => outcome.status === 'rejected');
      assert.equal(rejected.length, 0, rejected.map(outcome => String(outcome.reason)).join('; '));
      const results = outcomes.map(outcome => {
        if (outcome.status === 'rejected') throw outcome.reason;
        return outcome.value;
      });
      assert.equal(results.filter(result => result.voted).length, 1);
      assert.equal(results[0].selectedOptionId, results[1].selectedOptionId);
      const post = await postRef.get();
      const updatedOptions = post.get('interactivePoll.options');
      assert.ok(Array.isArray(updatedOptions), 'poll option counters must remain nested under interactivePoll.options');
      const totalVotes = updatedOptions.reduce((total: number, option: { votes: number }) => total + option.votes, 0);
      assert.equal(totalVotes, 1);
      const voteDocs = await postRef.collection('pollVotes').get();
      assert.equal(voteDocs.size, 1);
    } finally {
      const votes = await postRef.collection('pollVotes').get();
      await Promise.all(votes.docs.map(doc => doc.ref.delete()));
      await postRef.delete();
    }
  });
});
