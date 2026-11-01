import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveServerFirebaseConfig } from '../server/runtimeConfig.ts';

const localEmulators = {
  NEXORA_ENV: 'local',
  GCLOUD_PROJECT: 'demo-nexora-local',
  FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080',
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_STORAGE_EMULATOR_HOST: '127.0.0.1:9199',
};

test('local server configuration requires every Firebase emulator', () => {
  assert.throws(
    () => resolveServerFirebaseConfig({ NEXORA_ENV: 'local', FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }),
    /Local development requires Firebase emulators; missing: FIREBASE_AUTH_EMULATOR_HOST, FIREBASE_STORAGE_EMULATOR_HOST/,
  );
});

test('local server configuration cannot target production', () => {
  assert.throws(
    () => resolveServerFirebaseConfig({ ...localEmulators, GCLOUD_PROJECT: 'nexora-prod-voiceharrison' }),
    /cannot target the production Firebase project/,
  );
});

test('staging server configuration must match its declared project and bucket', () => {
  const resolved = resolveServerFirebaseConfig({
    NEXORA_ENV: 'staging',
    NEXORA_STAGING_PROJECT_ID: 'nexora-staging-example',
    GCLOUD_PROJECT: 'nexora-staging-example',
    FIRESTORE_DATABASE_ID: 'staging-db',
    FIREBASE_STORAGE_BUCKET: 'nexora-staging-example.firebasestorage.app',
  });
  assert.equal(resolved.environment, 'staging');
  assert.equal(resolved.projectId, 'nexora-staging-example');
});

test('staging server configuration rejects production', () => {
  assert.throws(
    () => resolveServerFirebaseConfig({
      NEXORA_ENV: 'staging',
      NEXORA_STAGING_PROJECT_ID: 'nexora-prod-voiceharrison',
      GCLOUD_PROJECT: 'nexora-prod-voiceharrison',
      FIRESTORE_DATABASE_ID: 'default',
      FIREBASE_STORAGE_BUCKET: 'nexora-prod-voiceharrison.appspot.com',
    }),
    /cannot target the production Firebase project/,
  );
});

test('production requires explicit project, database, bucket, and release configuration at server startup', () => {
  assert.throws(
    () => resolveServerFirebaseConfig({ NEXORA_ENV: 'production', GCLOUD_PROJECT: 'nexora-prod-voiceharrison' }),
    /Missing required production Firebase configuration: FIRESTORE_DATABASE_ID/,
  );
});
