import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

const script = 'scripts/validate-staging-config.mjs';
const requiredNames = [
  'NEXORA_ENV',
  'NODE_ENV',
  'GCLOUD_PROJECT',
  'NEXORA_STAGING_PROJECT_ID',
  'FIRESTORE_DATABASE_ID',
  'FIREBASE_STORAGE_BUCKET',
  'STAGING_APP_URL',
  'VITE_NEXORA_ENV',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APPCHECK_SITE_KEY',
];
const validConfig = {
  NEXORA_ENV: 'staging',
  NODE_ENV: 'staging',
  GCLOUD_PROJECT: 'nexora-staging-example',
  NEXORA_STAGING_PROJECT_ID: 'nexora-staging-example',
  FIRESTORE_DATABASE_ID: 'staging-db',
  FIREBASE_STORAGE_BUCKET: 'nexora-staging-example.appspot.com',
  STAGING_APP_URL: 'https://staging.nexora.example',
  VITE_NEXORA_ENV: 'staging',
  VITE_FIREBASE_PROJECT_ID: 'nexora-staging-example',
  VITE_FIREBASE_APP_ID: '1:123456:web:staging',
  VITE_FIREBASE_API_KEY: 'public-staging-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'nexora-staging-example.firebaseapp.com',
  VITE_FIREBASE_DATABASE_ID: 'staging-db',
  VITE_FIREBASE_STORAGE_BUCKET: 'nexora-staging-example.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456',
  VITE_FIREBASE_APPCHECK_SITE_KEY: 'staging-recaptcha-enterprise-site-key',
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
  assert.equal(output.appCheckSiteKeyConfigured, true);
  assert.equal(output.appIdMatchesSenderId, true);
  assert.match(output.note, /does not prove Firebase access, deployed rules\/Functions, or Console-side App Check enforcement/);
});

test('rejects missing required staging values', () => {
  const result = runValidator({ NEXORA_STAGING_PROJECT_ID: '' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing staging configuration: NEXORA_STAGING_PROJECT_ID/);
});

test('rejects staging configuration without the App Check site key', () => {
  const result = runValidator({ VITE_FIREBASE_APPCHECK_SITE_KEY: '' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Missing staging configuration: VITE_FIREBASE_APPCHECK_SITE_KEY/);
});

test('rejects non-staging runtime modes in server or browser configuration', () => {
  for (const overrides of [
    { NEXORA_ENV: 'production' },
    { NODE_ENV: 'production' },
    { VITE_NEXORA_ENV: 'production' },
  ]) {
    const result = runValidator(overrides);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must be exactly staging/);
  }
});

test('rejects the production project in server or browser configuration', () => {
  for (const overrides of [
    { NEXORA_STAGING_PROJECT_ID: 'nexora-prod-voiceharrison' },
    { VITE_FIREBASE_PROJECT_ID: 'nexora-prod-voiceharrison' },
    { GCLOUD_PROJECT: 'nexora-prod-voiceharrison' },
  ]) {
    const result = runValidator(overrides);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing to validate staging configuration against the production Firebase project/);
  }
});

test('rejects a server project ID that differs from the staging project', () => {
  const result = runValidator({ GCLOUD_PROJECT: 'another-staging-project' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /GCLOUD_PROJECT must match NEXORA_STAGING_PROJECT_ID/);
});

test('rejects mismatched browser and server project IDs', () => {
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

test('rejects an Auth domain that belongs to a different Firebase project', () => {
  const result = runValidator({ VITE_FIREBASE_AUTH_DOMAIN: 'another-project.firebaseapp.com' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /VITE_FIREBASE_AUTH_DOMAIN must match/);
});

test('rejects a Web App ID registered to a different messaging sender', () => {
  const result = runValidator({ VITE_FIREBASE_APP_ID: '1:999999:web:wrong-project' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /VITE_FIREBASE_APP_ID must be a Web App registered/);
});

test('rejects emulator endpoints in staging configuration', () => {
  const result = runValidator({ __emulator: true });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /refuses Firebase emulator configuration/);
});

test('requires a valid non-local HTTPS staging URL', () => {
  for (const url of ['http://staging.nexora.example', 'https://localhost:3000', 'https://user:pass@staging.nexora.example']) {
    const result = runValidator({ STAGING_APP_URL: url });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must be a non-local HTTPS staging URL/);
  }
});

test('rejects malformed Firebase project IDs', () => {
  const result = runValidator({ NEXORA_STAGING_PROJECT_ID: 'INVALID PROJECT ID', VITE_FIREBASE_PROJECT_ID: 'INVALID PROJECT ID', GCLOUD_PROJECT: 'INVALID PROJECT ID' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not a valid Firebase project ID/);
});
