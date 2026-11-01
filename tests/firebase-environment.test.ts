import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveFirebaseWebEnvironment } from '../src/lib/firebaseEnvironment.ts';

const completeConfig = {
  VITE_FIREBASE_PROJECT_ID: 'nexora-staging-example',
  VITE_FIREBASE_APP_ID: '1:123:web:staging',
  VITE_FIREBASE_API_KEY: 'staging-public-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'nexora-staging-example.firebaseapp.com',
  VITE_FIREBASE_DATABASE_ID: 'staging-db',
  VITE_FIREBASE_STORAGE_BUCKET: 'nexora-staging-example.firebasestorage.app',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123',
};

test('missing staging configuration fails closed', () => {
  assert.throws(
    () => resolveFirebaseWebEnvironment({ VITE_NEXORA_ENV: 'staging' }),
    /Missing required Firebase staging configuration: VITE_FIREBASE_PROJECT_ID/,
  );
});

test('staging selects only its configured non-production project', () => {
  const resolved = resolveFirebaseWebEnvironment({ VITE_NEXORA_ENV: 'staging', ...completeConfig });
  assert.equal(resolved.environment, 'staging');
  assert.equal(resolved.useEmulators, false);
  assert.equal(resolved.config.projectId, 'nexora-staging-example');
});

test('staging cannot select the production project', () => {
  assert.throws(
    () => resolveFirebaseWebEnvironment({
      VITE_NEXORA_ENV: 'staging',
      ...completeConfig,
      VITE_FIREBASE_PROJECT_ID: 'nexora-prod-voiceharrison',
      VITE_FIREBASE_STORAGE_BUCKET: 'nexora-prod-voiceharrison.appspot.com',
    }),
    /cannot target the production Firebase project/,
  );
});

test('production requires explicit production configuration', () => {
  assert.throws(
    () => resolveFirebaseWebEnvironment({ VITE_NEXORA_ENV: 'production' }),
    /Missing required Firebase production configuration/,
  );
});

test('local mode routes Auth, Firestore, Storage, and Functions to emulators', () => {
  const resolved = resolveFirebaseWebEnvironment({ VITE_NEXORA_ENV: 'local' });
  assert.equal(resolved.useEmulators, true);
  assert.deepEqual(resolved.emulator, {
    auth: { host: '127.0.0.1', port: 9099 },
    firestore: { host: '127.0.0.1', port: 8080 },
    storage: { host: '127.0.0.1', port: 9199 },
    functions: { host: '127.0.0.1', port: 5001 },
  });
});

test('local mode rejects an explicit request to bypass emulators', () => {
  assert.throws(
    () => resolveFirebaseWebEnvironment({ VITE_NEXORA_ENV: 'local', VITE_USE_FIREBASE_EMULATORS: 'false' }),
    /must use Firebase emulators/,
  );
});

test('local mode rejects the production project ID', () => {
  assert.throws(
    () => resolveFirebaseWebEnvironment({ VITE_NEXORA_ENV: 'local', VITE_FIREBASE_PROJECT_ID: 'nexora-prod-voiceharrison' }),
    /cannot use the production Firebase project ID/,
  );
});
