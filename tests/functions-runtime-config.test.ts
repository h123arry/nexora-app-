import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveFirestoreDatabaseId } from '../functions/src/runtimeConfig.ts';

test('requires an explicit database ID outside the Firestore emulator', () => {
  assert.throws(
    () => resolveFirestoreDatabaseId({}),
    /FIRESTORE_DATABASE_ID must be explicitly configured.*refusing to assume \(default\)/,
  );
});

test('rejects an unresolved owner placeholder even when running an emulator', () => {
  assert.throws(
    () => resolveFirestoreDatabaseId({
      FIRESTORE_DATABASE_ID: '<owner-verified-firestore-database-id>',
      FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
    }),
    /still an owner placeholder/,
  );
});

test('uses the explicitly configured database ID', () => {
  assert.equal(resolveFirestoreDatabaseId({ FIRESTORE_DATABASE_ID: 'owner-confirmed-db' }), 'owner-confirmed-db');
});

test('uses the emulator-only default when no database ID is supplied', () => {
  assert.equal(resolveFirestoreDatabaseId({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }), '(default)');
});
