import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { deleteApp, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import {
  firebaseDownloadTokenObjectPath,
  runLegacyWorldWeaveMediaMigration,
  metadataWithRotatedFirebaseDownloadToken,
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
  await db.recursiveDelete(db.collection('worldWeaves').doc('legacy-media-public-test'));
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
    assert.equal(firebaseDownloadTokenObjectPath(tokenUrl(path), 'another-bucket'), null);
    assert.equal(firebaseDownloadTokenObjectPath(tokenUrl(path), bucket.name), path);
    assert.equal(firebaseDownloadTokenObjectPath('https://example.test/file?token=abc'), null);
    assert.equal(firebaseDownloadTokenObjectPath('https://firebasestorage.googleapis.com/v0/b/bucket/o/file?alt=media'), null);
    assert.equal(firebaseDownloadTokenObjectPath('http://firebasestorage.googleapis.com/v0/b/bucket/o/file?token=abc'), null);
    assert.equal(firebaseDownloadTokenObjectPath('https://firebasestorage.googleapis.com/v0/b/bucket/o/%2E%2E%2Fsecret?token=abc'), null);
  });

  it('rotates only the Firebase token and preserves unrelated custom metadata', () => {
    const rotated = metadataWithRotatedFirebaseDownloadToken({
      firebaseStorageDownloadTokens: 'token-a,token-b',
      ownerId: 'legacy-media-author',
      purpose: 'worldweave',
    });
    assert.equal(typeof rotated.firebaseStorageDownloadTokens, 'string');
    assert.notEqual(rotated.firebaseStorageDownloadTokens, 'token-a,token-b');
    assert.equal(rotated.ownerId, 'legacy-media-author');
    assert.equal(rotated.purpose, 'worldweave');
    const emptyMetadata = metadataWithRotatedFirebaseDownloadToken(undefined);
    assert.equal(typeof emptyMetadata.firebaseStorageDownloadTokens, 'string');
  });

  it('dry-runs without modifying legacy tokens, then revokes tokens and clears the URL idempotently', async () => {
    const weave = db.collection('worldWeaves').doc('legacy-media-migration-test');
    const moment = weave.collection('moments').doc('legacy-image');
    const storagePath = 'users/legacy-media-author/media/legacy-image';
    const file = bucket.file(storagePath);
    await file.save(Buffer.from('legacy image fixture'), {
      contentType: 'image/jpeg',
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: 'legacy-token',
          ownerId: 'legacy-media-author',
          purpose: 'worldweave',
        },
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
    const storedMetadata = (await file.getMetadata())[0];
    const metadata = storedMetadata.metadata || {};
    assert.equal(storedMetadata.cacheControl, 'private, no-store, max-age=0');
    assert.equal(typeof metadata.firebaseStorageDownloadTokens, 'string');
    assert.notEqual(metadata.firebaseStorageDownloadTokens, 'legacy-token');
    assert.equal(metadata.ownerId, 'legacy-media-author');
    assert.equal(metadata.purpose, 'worldweave');

    const rerun = await runLegacyWorldWeaveMediaMigration(db, bucket, { dryRun: false, maxMoments: 10 });
    assert.equal(rerun.scanned, 0);
  });

  it('leaves intentionally public WorldWeave media and its existing token untouched', async () => {
    const weave = db.collection('worldWeaves').doc('legacy-media-public-test');
    const moment = weave.collection('moments').doc('public-image');
    const storagePath = 'users/legacy-media-author/media/public-image';
    const file = bucket.file(storagePath);
    await file.save(Buffer.from('public image fixture'), {
      contentType: 'image/jpeg',
      metadata: { metadata: { firebaseStorageDownloadTokens: 'public-legacy-token', ownerId: 'legacy-media-author' } },
    });
    await weave.set({ id: weave.id, ownerId: 'legacy-media-owner', visibility: 'public' });
    await moment.set({
      id: moment.id, weaveId: weave.id, authorId: 'legacy-media-author',
      mediaType: 'image', mediaUrl: tokenUrl(storagePath, 'public-legacy-token'), storagePath,
    });

    const summary = await runLegacyWorldWeaveMediaMigration(db, bucket, { dryRun: false, maxMoments: 10 });
    assert.equal(summary.skippedPublic, 1);
    assert.equal((await moment.get()).get('mediaUrl'), tokenUrl(storagePath, 'public-legacy-token'));
    assert.equal((await file.getMetadata())[0].metadata?.firebaseStorageDownloadTokens, 'public-legacy-token');
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
    const foreignBucket = weave.collection('moments').doc('foreign-bucket');
    const foreignBucketPath = 'users/legacy-media-author/media/foreign-bucket';
    await foreignBucket.set({
      id: foreignBucket.id, weaveId: weave.id, authorId: 'legacy-media-author',
      mediaType: 'image',
      mediaUrl: `https://firebasestorage.googleapis.com/v0/b/another-bucket/o/${encodeURIComponent(foreignBucketPath)}?alt=media&token=foreign-token`,
      storagePath: foreignBucketPath,
    });

    const summary = await runLegacyWorldWeaveMediaMigration(db, bucket, { dryRun: false, maxMoments: 10 });
    assert.equal(summary.missingObject, 1);
    assert.equal(summary.unsafeReference, 2);
    assert.equal((await missing.get()).get('mediaUrl'), tokenUrl(missingPath));
    assert.equal((await unsafe.get()).get('mediaUrl'), tokenUrl(unsafePath));
    assert.equal((await foreignBucket.get()).get('mediaUrl'), `https://firebasestorage.googleapis.com/v0/b/another-bucket/o/${encodeURIComponent(foreignBucketPath)}?alt=media&token=foreign-token`);
  });

  it('enforces the maximum inspected-record bound', async () => {
    const weave = db.collection('worldWeaves').doc('legacy-media-migration-test');
    await weave.set({ id: weave.id, ownerId: 'legacy-media-owner', visibility: 'private' });
    await weave.collection('moments').doc('plain-text').set({
      id: 'plain-text', weaveId: weave.id, authorId: 'legacy-media-author', mediaType: 'text', mediaUrl: '',
    });
    await weave.collection('moments').doc('plain-text-2').set({
      id: 'plain-text-2', weaveId: weave.id, authorId: 'legacy-media-author', mediaType: 'text', mediaUrl: '',
    });
    const summary = await runLegacyWorldWeaveMediaMigration(db, bucket, { dryRun: true, maxMoments: 1 });
    assert.equal(summary.inspectedMoments, 1);
    assert.equal(summary.stoppedAtLimit, true);
  });
});
