import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { runPublicAudienceBackfill } from '../src/migrations/backfillPublicPostAudience.js';

const projectId = 'demo-nexora-public-post-migration';
const app = initializeApp({ projectId }, 'public-post-migration-tests');
const db = getFirestore(app);

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Migration tests require the Firestore Emulator.');
  await db.recursiveDelete(db.collection('posts'));
});
after(async () => {
  await db.recursiveDelete(db.collection('posts'));
  await deleteApp(app);
});

function approved(id: string) {
  return { id, confirmedPublic: true as const, evidence: 'Reviewed source confirms originally public post.' };
}

describe('reviewed public-post audience backfill', () => {
  it('dry-runs without writing and only previews explicitly approved records', async () => {
    await db.doc('posts/legacy-dry').set({ userId: 'author', content: 'preserve this', likes: 4, createdAt: 'legacy-time' });
    const summary = await runPublicAudienceBackfill(db, { version: 1, entries: [approved('legacy-dry')] }, { dryRun: true });
    assert.equal(summary.wouldUpdate, 1);
    const result = await db.doc('posts/legacy-dry').get();
    assert.equal(result.get('audience'), undefined);
    assert.equal(result.get('likes'), 4);
    assert.equal(result.get('createdAt'), 'legacy-time');
  });

  it('updates only reviewed records, leaves restricted/missing records unchanged, and preserves all other fields', async () => {
    await db.doc('posts/legacy-public').set({ userId: 'author', content: 'post body', images: ['gs://bucket/object'], likes: 9, timestamp: 123 });
    await db.doc('posts/private-post').set({ userId: 'author', audience: 'followers', content: 'private body', likes: 2 });
    const summary = await runPublicAudienceBackfill(db, {
      version: 1,
      entries: [approved('legacy-public'), approved('private-post'), approved('missing-post')],
    }, { dryRun: false });
    assert.equal(summary.updated, 1);
    assert.equal(summary.restricted, 1);
    assert.equal(summary.missing, 1);
    const migrated = await db.doc('posts/legacy-public').get();
    assert.equal(migrated.get('audience'), 'public');
    assert.equal(migrated.get('content'), 'post body');
    assert.deepEqual(migrated.get('images'), ['gs://bucket/object']);
    assert.equal(migrated.get('likes'), 9);
    assert.equal(migrated.get('timestamp'), 123);
    assert.equal((await db.doc('posts/private-post').get()).get('audience'), 'followers');
  });

  it('is idempotent and processes manifests larger than one bounded batch', async () => {
    const entries = Array.from({ length: 205 }, (_, index) => approved(`legacy-batch-${index}`));
    const batch = db.batch();
    for (const entry of entries) batch.set(db.doc(`posts/${entry.id}`), { userId: 'author', likes: 1, content: 'body' });
    await batch.commit();
    const first = await runPublicAudienceBackfill(db, { version: 1, entries }, { dryRun: false });
    assert.equal(first.updated, 205);
    assert.equal(first.scanned, 205);
    const second = await runPublicAudienceBackfill(db, { version: 1, entries }, { dryRun: false });
    assert.equal(second.updated, 0);
    assert.equal(second.alreadyPublic, 205);
  });

  it('rejects unconfirmed, unsupported, duplicate, and weak-evidence manifests', async () => {
    await assert.rejects(
      runPublicAudienceBackfill(db, { version: 1, entries: [{ id: 'no-proof', confirmedPublic: false, evidence: 'reviewed' } as never] }, { dryRun: true }),
      /explicit public confirmation/,
    );
    await assert.rejects(
      runPublicAudienceBackfill(db, { version: 1, entries: [{ id: 'weak-proof', confirmedPublic: true, evidence: 'maybe' }] }, { dryRun: true }),
      /evidence note/,
    );
    await assert.rejects(
      runPublicAudienceBackfill(db, { version: 1, entries: [approved('duplicate'), approved('duplicate')] }, { dryRun: true }),
      /Duplicate manifest/,
    );
  });
});
