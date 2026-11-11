import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { accountStoragePrefixes, deleteUserOwnedDocuments } from '../src/accountDeletionPolicy.js';

const app = initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-nexora-engagement' }, 'account-deletion-policy-tests');
const db = getFirestore(app);

async function cleanupOriginFixtures(): Promise<void> {
  for (const userId of ['account-delete-test', 'account-delete-other']) {
    const origins = await db.collection('mediaOrigins').where('ownerUid', '==', userId).get();
    for (const origin of origins.docs) {
      const events = await origin.ref.collection('events').get();
      for (const event of events.docs) await event.ref.delete();
      await origin.ref.delete();
    }
  }
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Account deletion policy tests require the Firestore Emulator.');
  await cleanupOriginFixtures();
  for (const collection of ['mediaAssets', 'academyProgress', 'academyLessonNotes', 'posts']) {
    const rows = await db.collection(collection).where('ownerId', '==', 'account-delete-test').get();
    for (const row of rows.docs) await row.ref.delete();
    const userRows = await db.collection(collection).where('userId', '==', 'account-delete-test').get();
    for (const row of userRows.docs) await row.ref.delete();
  }
});
after(async () => {
  await cleanupOriginFixtures();
  for (const collection of ['mediaAssets', 'academyProgress', 'academyLessonNotes', 'posts']) {
    for (const userId of ['account-delete-test', 'account-delete-other']) {
      const rows = await db.collection(collection).where('ownerId', '==', userId).get();
      for (const row of rows.docs) await row.ref.delete();
      const userRows = await db.collection(collection).where('userId', '==', userId).get();
      for (const row of userRows.docs) await row.ref.delete();
    }
  }
  await deleteApp(app);
});

describe('account deletion data and storage scope', () => {
  it('removes user-owned media and Academy records without touching another account', async () => {
    await db.collection('mediaAssets').doc('delete-media').set({ ownerId: 'account-delete-test' });
    await db.collection('academyProgress').doc('delete-progress').set({ userId: 'account-delete-test' });
    await db.collection('academyLessonNotes').doc('delete-note').set({ userId: 'account-delete-test' });
    await db.collection('posts').doc('delete-post').set({ userId: 'account-delete-test' });
    const origin = db.collection('mediaOrigins').doc('delete-origin');
    await origin.set({ assetId: 'delete-origin', ownerUid: 'account-delete-test' });
    await origin.collection('events').doc('upload-event').set({ eventType: 'uploaded_to_nexora' });
    await db.collection('mediaAssets').doc('keep-media').set({ ownerId: 'account-delete-other' });
    await db.collection('academyProgress').doc('keep-progress').set({ userId: 'account-delete-other' });
    await db.collection('mediaOrigins').doc('keep-origin').set({ assetId: 'keep-origin', ownerUid: 'account-delete-other' });

    const deleted = await deleteUserOwnedDocuments(db, 'account-delete-test');
    assert.equal(deleted, 6);
    assert.equal((await db.collection('mediaAssets').doc('delete-media').get()).exists, false);
    assert.equal((await db.collection('academyProgress').doc('delete-progress').get()).exists, false);
    assert.equal((await db.collection('academyLessonNotes').doc('delete-note').get()).exists, false);
    assert.equal((await db.collection('posts').doc('delete-post').get()).exists, false);
    assert.equal((await db.collection('mediaOrigins').doc('delete-origin').get()).exists, false);
    assert.equal((await db.collection('mediaOrigins').doc('delete-origin').collection('events').get()).size, 0);
    assert.equal((await db.collection('mediaAssets').doc('keep-media').get()).exists, true);
    assert.equal((await db.collection('academyProgress').doc('keep-progress').get()).exists, true);
    assert.equal((await db.collection('mediaOrigins').doc('keep-origin').get()).exists, true);
    assert.equal(await deleteUserOwnedDocuments(db, 'account-delete-test'), 0);
  });

  it('includes processed media renditions in the account storage deletion scope', () => {
    assert.deepEqual(accountStoragePrefixes('creator-123'), [
      'users/creator-123/', 'media/creator-123/', 'processed/creator-123/',
    ]);
    assert.throws(() => accountStoragePrefixes('../other-user'), /valid account ID/);
  });
});
