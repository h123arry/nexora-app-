import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const script = 'scripts/validate-staging-config.mjs';
const requiredNames = [
  'NEXORA_ENV',
  'NEXORA_STAGING_PROJECT_ID',
  'FIRESTORE_DATABASE_ID',
  'FIREBASE_STORAGE_BUCKET',
  'STAGING_APP_URL',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
];
const validConfig = {
  NEXORA_ENV: 'staging',
  NEXORA_STAGING_PROJECT_ID: 'nexora-staging-example',
  FIRESTORE_DATABASE_ID: 'staging-db',
  FIREBASE_STORAGE_BUCKET: 'nexora-staging-example.appspot.com',
  STAGING_APP_URL: 'https://staging.nexora.example',
  VITE_FIREBASE_PROJECT_ID: 'nexora-staging-example',
  VITE_FIREBASE_APP_ID: '1:123456:web:staging',
  VITE_FIREBASE_API_KEY: 'public-staging-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'nexora-staging-example.firebaseapp.com',
  VITE_FIREBASE_DATABASE_ID: 'staging-db',
  VITE_FIREBASE_STORAGE_BUCKET: 'nexora-staging-example.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456',
};

function runValidator(overrides = {}) {
  const env = { ...process.env, ...validConfig, ...overrides };
  for (const name of requiredNames) {
    if (!(name in overrides) && !(name in validConfig)) delete env[name];
  }
  for (const name of ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'VITE_USE_FIREBASE_EMULATORS']) {
    delete env[name];
  }
  if (Object.hasOwn(overrides, '__emulator')) {
    env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';
    delete env.__emulator;
  }
  return spawnSync(process.execPath, [script], { encoding: 'utf8', env });
}

test('accepts a complete, isolated non-production staging configuration', () => {
  const result = runValidator();
  assert.equal(result.status, 0, result.stderr);
  const output = JSON.parse(result.stdout);
  assert.equal(output.status, 'valid');
  assert.equal(output.projectId, validConfig.NEXORA_STAGING_PROJECT_ID);
  assert.match(output.note, /does not prove Firebase access or deployment/);
});

test('rejects missing required staging values', () => {
  const result = runValidator({ NEXORA_STAGING_PROJECT_ID: '' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing staging configuration: NEXORA_STAGING_PROJECT_ID/);
});

test('rejects a non-staging runtime mode', () => {
  const result = runValidator({ NEXORA_ENV: 'production' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must be exactly staging/);
});

test('rejects the production project in either server or browser configuration', () => {
  for (const overrides of [
    { NEXORA_STAGING_PROJECT_ID: 'nexora-prod-voiceharrison' },
    { VITE_FIREBASE_PROJECT_ID: 'nexora-prod-voiceharrison' },
  ]) {
    const result = runValidator(overrides);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing to validate staging configuration against the production Firebase project/);
  }
});

test('rejects mismatched server and browser project IDs', () => {
  const result = runValidator({ VITE_FIREBASE_PROJECT_ID: 'another-staging-project' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must match NEXORA_STAGING_PROJECT_ID/);
});

test('rejects mismatched Firestore database IDs', () => {
  const result = runValidator({ VITE_FIREBASE_DATABASE_ID: 'another-db' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must match FIRESTORE_DATABASE_ID/);
});

test('rejects Storage buckets that do not belong to the staging project', () => {
  const result = runValidator({
    FIREBASE_STORAGE_BUCKET: 'different-project.appspot.com',
    VITE_FIREBASE_STORAGE_BUCKET: 'different-project.appspot.com',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Storage buckets must belong to the declared staging project/);
});

test('rejects emulator endpoints in staging configuration', () => {
  const result = runValidator({ __emulator: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refuses Firebase emulator configuration/);
});

test('requires a non-local HTTPS staging URL', () => {
  for (const url of ['http://staging.nexora.example', 'https://localhost:3000']) {
    const result = runValidator({ STAGING_APP_URL: url });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must be a non-local HTTPS staging URL/);
  }
});

test('rejects malformed Firebase project IDs', () => {
  const result = runValidator({ NEXORA_STAGING_PROJECT_ID: 'INVALID PROJECT ID', VITE_FIREBASE_PROJECT_ID: 'INVALID PROJECT ID' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not a valid Firebase project ID/);
});
