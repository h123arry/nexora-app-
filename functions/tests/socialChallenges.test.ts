import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createSocialChallenge, joinSocialChallenge, recordSocialChallengePost, listSocialChallenges } from '../src/socialChallenges.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-challenges' }, 'social-challenge-tests');
const db = getFirestore(app);
const ids: string[] = [];

before(() => { assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Challenge tests require the Firestore Emulator.'); });
after(async () => {
  for (const id of ids) {
    const ref = db.collection('socialChallenges').doc(id);
    for (const name of ['participants', 'entries']) {
      const docs = await ref.collection(name).get();
      await Promise.all(docs.docs.map(doc => doc.ref.delete()));
    }
    await ref.delete();
  }
  await deleteApp(app);
});

describe('server-backed social challenges', () => {
  it('creates an active challenge and automatically enrolls its creator', async () => {
    const created = await createSocialChallenge(db, 'creator-a', {
      title: 'Share your creative process', description: 'Show the community how you make something useful.',
      topic: 'Creativity', durationDays: 7, targetPosts: 1,
    });
    ids.push(created.challengeId);
    assert.match(created.postTag, /^#nxchallenge_/);
    assert.equal((await db.doc(`socialChallenges/${created.challengeId}/participants/creator-a`).get()).exists, true);
    const listed = await listSocialChallenges(db, 'creator-a');
    const own = listed.challenges.find(item => item.id === created.challengeId);
    assert.equal(own?.joinedByMe, true);
    assert.equal(own?.myContributionCount, 0);
    assert.equal((await listSocialChallenges(db, 'someone-else')).challenges.find(item => item.id === created.challengeId)?.joinedByMe, false);
  });

  it('joins once and increments the participant count once', async () => {
    const created = await createSocialChallenge(db, 'creator-b', {
      title: 'Build in public', description: 'Share a useful update about a project you are building.',
      topic: 'Building', durationDays: 5, targetPosts: 2,
    });
    ids.push(created.challengeId);
    assert.deepEqual(await joinSocialChallenge(db, 'member-a', created.challengeId), { joined: true });
    assert.deepEqual(await joinSocialChallenge(db, 'member-a', created.challengeId), { joined: false });
    assert.equal((await db.doc(`socialChallenges/${created.challengeId}`).get()).get('participantCount'), 2);
  });

  it('records a public-post contribution only once for an enrolled member', async () => {
    const created = await createSocialChallenge(db, 'creator-c', {
      title: 'One helpful post', description: 'Publish one practical tip that helps another member.',
      topic: 'Community', durationDays: 7, targetPosts: 2,
    });
    ids.push(created.challengeId);
    await joinSocialChallenge(db, 'member-b', created.challengeId);
    assert.deepEqual(await recordSocialChallengePost(db, 'member-b', 'post-one', created.challengeId), { recorded: true });
    assert.deepEqual(await recordSocialChallengePost(db, 'member-b', 'post-one', created.challengeId), { recorded: false });
    assert.equal((await db.doc(`socialChallenges/${created.challengeId}`).get()).get('contributionCount'), 1);
    assert.deepEqual(await recordSocialChallengePost(db, 'not-joined', 'post-two', created.challengeId), { recorded: false });
  });

  it('rejects malformed challenge definitions', async () => {
    await assert.rejects(createSocialChallenge(db, 'creator-d', { title: 'x', description: 'short', topic: 'a', durationDays: 90 }), /details are invalid/);
  });
});
