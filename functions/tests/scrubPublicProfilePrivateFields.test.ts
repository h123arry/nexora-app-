import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { runPublicProfilePrivateFieldScrub } from '../src/migrations/scrubPublicProfilePrivateFields.js';

const projectId = 'demo-nexora-public-profile-scrub';
const app = initializeApp({ projectId }, 'public-profile-scrub-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Public profile scrub tests require the Firestore Emulator.');
  await db.recursiveDelete(db.collection('publicProfiles'));
});

after(async () => {
  await db.recursiveDelete(db.collection('publicProfiles'));
  await deleteApp(app);
});

describe('public profile private-field scrub', () => {
  it('dry-runs without writing and identifies only projections containing private fields', async () => {
    await db.doc('publicProfiles/legacy-interest').set({
      id: 'legacy-interest', username: 'legacy', interestDNA: { AI: 0.9 }, bio: 'Keep this bio',
    });
    await db.doc('publicProfiles/legacy-birth').set({
      id: 'legacy-birth', username: 'legacybirth', dateOfBirth: '2000-01-01', bio: 'Keep this bio too',
    });
    await db.doc('publicProfiles/safe').set({
      id: 'safe', username: 'safe', bio: 'Already clean',
    });

    const summary = await runPublicProfilePrivateFieldScrub(db, { dryRun: true });
    assert.equal(summary.scanned, 3);
    assert.equal(summary.wouldScrub, 2);
    assert.equal(summary.scrubbed, 0);
    assert.equal(summary.unchanged, 1);
    assert.deepEqual((await db.doc('publicProfiles/legacy-interest').get()).get('interestDNA'), { AI: 0.9 });
    assert.equal((await db.doc('publicProfiles/legacy-birth').get()).get('dateOfBirth'), '2000-01-01');
  });

  it('removes both private fields while preserving all other public projection fields', async () => {
    await db.doc('publicProfiles/legacy-combined').set({
      id: 'legacy-combined', username: 'legacycombined',
      interestDNA: { AI: 0.9 }, dateOfBirth: '2000-01-01',
      bio: 'Preserve the public bio', followers: 7,
    });

    const summary = await runPublicProfilePrivateFieldScrub(db, { dryRun: false });
    assert.equal(summary.scanned, 4);
    assert.equal(summary.scrubbed, 3);
    assert.equal(summary.wouldScrub, 0);

    const cleaned = await db.doc('publicProfiles/legacy-combined').get();
    assert.equal(cleaned.get('interestDNA'), undefined);
    assert.equal(cleaned.get('dateOfBirth'), undefined);
    assert.equal(cleaned.get('bio'), 'Preserve the public bio');
    assert.equal(cleaned.get('followers'), 7);
  });

  it('is idempotent and safely processes more than one bounded page', async () => {
    const batch = db.batch();
    for (let index = 0; index < 205; index += 1) {
      batch.set(db.doc(`publicProfiles/batch-${String(index).padStart(3, '0')}`), {
        id: `batch-${index}`, username: `batch${index}`,
        ...(index % 2 === 0 ? { interestDNA: { topic: 1 } } : {}),
      });
    }
    await batch.commit();

    const first = await runPublicProfilePrivateFieldScrub(db, { dryRun: false });
    assert.equal(first.scanned, 209);
    assert.equal(first.scrubbed, 103);
    assert.equal(first.pages, 2);

    const second = await runPublicProfilePrivateFieldScrub(db, { dryRun: false });
    assert.equal(second.scrubbed, 0);
    assert.equal(second.unchanged, 209);
  });
});
