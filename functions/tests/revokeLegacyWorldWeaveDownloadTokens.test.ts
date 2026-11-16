import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import {
  firebaseDownloadTokenObjectPath,
  runLegacyWorldWeaveMediaMigration,
  withoutFirebaseDownloadTokens,
} from '../src/migrations/revokeLegacyWorldWeaveDownloadTokens.js';

const projectId = process.env.GCLOUD_PROJECT || 'demo-nexora-legacy-media';
const app = initializeApp({ projectId, storageBucket: `${projectId}.appspot.com` }, 'legacy-worldweave-media-migration-tests');
const db = getFirestore(app);
const bucket = getStorage(app).bucket();

function tokenUrl(path: string, token = 'legacy-token') {
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;
}

async function cleanup(): Promise<void> {
  await db.recursiveDelete(db.collection('worldWeaves').doc('legacy-media-migration-test'));
  await bucket.deleteFiles({ prefix: 'users/legacy-media-author/media/' }).catch(() => undefined);
}

before(async () => {
  assert.ok(process.env.FIRESTORE_EMULATOR_HOST, 'Legacy media migration tests require Firestore Emulator.');
  assert.ok(process.env.STORAGE_EMULATOR_HOST || process.env.FIREBASE_STORAGE_EMULATOR_HOST,
    'Legacy media migration tests require Storage Emulator.');
  await cleanup();
});

after(async () => {
  await cleanup();
  await deleteApp(app);
});

describe('legacy WorldWeave download-token migration', () => {
  it('recognizes only Firebase download URLs with a token and decodes their exact object path', () => {
    const path = 'users/legacy-media-author/media/legacy-image';
    assert.equal(firebaseDownloadTokenObjectPath(tokenUrl(path)), path);
    assert.equal(firebaseDownloadTokenObjectPath('https://example.test/file?token=abc'), null);
    assert.equal(firebaseDownloadTokenObjectPath('https://firebasestorage.googleapis.com/v0/b/bucket/o/file?alt=media'), null);
    assert.equal(firebaseDownloadTokenObjectPath('http://firebasestorage.googleapis.com/v0/b/bucket/o/file?token=abc'), null);
    assert.equal(firebaseDownloadTokenObjectPath('https://firebasestorage.googleapis.com/v0/b/bucket/o/%2E%2E%2Fsecret?token=abc'), null);
  });

  it('removes only the Firebase token metadata and preserves unrelated custom metadata', () => {
    assert.deepEqual(withoutFirebaseDownloadTokens({
      firebaseStorageDownloadTokens: 'token-a,token-b',
      ownerId: 'legacy-media-author',
      purpose: 'worldweave',
    }), {
      ownerId: 'legacy-media-author',
      purpose: 'worldweave',
    });
    assert.deepEqual(withoutFirebaseDownloadTokens(undefined), {});
  });

  it('dry-runs without modifying legacy tokens, then revokes tokens and clears the URL idempotently', async () => {
    const weave = db.collection('worldWeaves').doc('legacy-media-migration-test');
    const moment = weave.collection('moments').doc('legacy-image');
    const storagePath = 'users/legacy-media-author/media/legacy-image';
    const file = bucket.file(storagePath);
    await file.save(Buffer.from('legacy image fixture'), {
      contentType: 'image/jpeg',
      metadata: {
        firebaseStorageDownloadTokens: 'legacy-token',
        ownerId: 'legacy-media-author',
        purpose: 'worldweave',
      },
    });
    await weave.set({
      id: weave.id, ownerId: 'legacy-media-owner', visibility: 'private',
      participantIds: ['legacy-media-owner', 'legacy-media-author'],
    });
    await moment.set({
      id: moment.id, weaveId: weave.id, authorId: 'legacy-media-author',
      mediaType: 'image', mediaUrl: tokenUrl(storagePath), storagePath,
    });

    const dryRun = await runLegacyWorldWeaveMediaMigration(db, bucket, { dryRun: true, maxMoments: 10 });
    assert.equal(dryRun.wouldRevokeAndClear, 1);
    assert.equal(dryRun.revokedAndCleared, 0);
    assert.equal((await moment.get()).get('mediaUrl'), tokenUrl(storagePath));
    assert.equal((await file.getMetadata())[0].metadata?.firebaseStorageDownloadTokens, 'legacy-token');

    const applied = await runLegacyWorldWeaveMediaMigration(db, bucket, { dryRun: false, maxMoments: 10 });
    assert.equal(applied.revokedAndCleared, 1);
    assert.equal((await moment.get()).get('mediaUrl'), '');
    const metadata = (await file.getMetadata())[0].metadata || {};
    assert.equal(metadata.firebaseStorageDownloadTokens, undefined);
    assert.equal(metadata.ownerId, 'legacy-media-author');
    assert.equal(metadata.purpose, 'worldweave');

    const rerun = await runLegacyWorldWeaveMediaMigration(db, bucket, { dryRun: false, maxMoments: 10 });
    assert.equal(rerun.scanned, 0);
  });

  it('does not clear a URL when the Storage object is missing or its path binding is unsafe', async () => {
    const weave = db.collection('worldWeaves').doc('legacy-media-migration-test');
    await weave.set({ id: weave.id, ownerId: 'legacy-media-owner', visibility: 'private' });
    const missing = weave.collection('moments').doc('missing-object');
    const missingPath = 'users/legacy-media-author/media/missing-object';
    await missing.set({
      id: missing.id, weaveId: weave.id, authorId: 'legacy-media-author',
      mediaType: 'image', mediaUrl: tokenUrl(missingPath), storagePath: missingPath,
    });
    const unsafe = weave.collection('moments').doc('unsafe-path');
    const unsafePath = 'users/another-user/media/unsafe-path';
    await unsafe.set({
      id: unsafe.id, weaveId: weave.id, authorId: 'legacy-media-author',
      mediaType: 'image', mediaUrl: tokenUrl(unsafePath), storagePath: unsafePath,
    });

    const summary = await runLegacyWorldWeaveMediaMigration(db, bucket, { dryRun: false, maxMoments: 10 });
    assert.equal(summary.missingObject, 1);
    assert.equal(summary.unsafeReference, 1);
    assert.equal((await missing.get()).get('mediaUrl'), tokenUrl(missingPath));
    assert.equal((await unsafe.get()).get('mediaUrl'), tokenUrl(unsafePath));
  });

  it('enforces the maximum inspected-record bound', async () => {
    const weave = db.collection('worldWeaves').doc('legacy-media-migration-test');
    await weave.set({ id: weave.id, ownerId: 'legacy-media-owner', visibility: 'private' });
    await weave.collection('moments').doc('plain-text').set({
      id: 'plain-text', weaveId: weave.id, authorId: 'legacy-media-author', mediaType: 'text', mediaUrl: '',
    });
    const summary = await runLegacyWorldWeaveMediaMigration(db, bucket, { dryRun: true, maxMoments: 1 });
    assert.equal(summary.inspectedMoments, 1);
    assert.equal(summary.stoppedAtLimit, true);
  });
});
