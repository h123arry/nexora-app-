#!/usr/bin/env node

const required = [
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
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(`Missing staging configuration: ${missing.join(', ')}`);
  console.error('Load an owner-provided staging environment; do not use production defaults.');
  process.exit(1);
}

if (process.env.NEXORA_ENV.trim() !== 'staging') {
  console.error('NEXORA_ENV must be exactly staging for staging validation.');
  process.exit(1);
}

const projectId = process.env.NEXORA_STAGING_PROJECT_ID.trim();
const productionProjectId = 'nexora-prod-voiceharrison';
const databaseId = process.env.FIRESTORE_DATABASE_ID.trim();
const bucket = process.env.FIREBASE_STORAGE_BUCKET.trim();
const appUrl = process.env.STAGING_APP_URL.trim();
const browserProjectId = process.env.VITE_FIREBASE_PROJECT_ID.trim();
const browserDatabaseId = process.env.VITE_FIREBASE_DATABASE_ID.trim();
const browserBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET.trim();

if (!/^[a-z][a-z0-9-]{4,29}$/.test(projectId)) {
  console.error('NEXORA_STAGING_PROJECT_ID is not a valid Firebase project ID.');
  process.exit(1);
}
if (projectId === productionProjectId || browserProjectId === productionProjectId) {
  console.error('Refusing to validate staging configuration against the production Firebase project.');
  process.exit(1);
}
if (browserProjectId !== projectId) {
  console.error('VITE_FIREBASE_PROJECT_ID must match NEXORA_STAGING_PROJECT_ID.');
  process.exit(1);
}
if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(databaseId)) {
  console.error('FIRESTORE_DATABASE_ID contains unsupported characters.');
  process.exit(1);
}
if (!bucket.includes(projectId) || !browserBucket.includes(projectId)) {
  console.error('Firebase Storage buckets must belong to the declared staging project.');
  process.exit(1);
}
if (browserDatabaseId !== databaseId) {
  console.error('VITE_FIREBASE_DATABASE_ID must match FIRESTORE_DATABASE_ID.');
  process.exit(1);
}
if (!/^https:\/\//i.test(appUrl) || /localhost|127\.0\.0\.1/i.test(appUrl)) {
  console.error('STAGING_APP_URL must be a non-local HTTPS staging URL.');
  process.exit(1);
}
const emulatorVariables = ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'VITE_USE_FIREBASE_EMULATORS'];
if (emulatorVariables.some((name) => process.env[name]?.trim())) {
  console.error('Staging validation refuses Firebase emulator configuration.');
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'valid',
  projectId,
  databaseId,
  storageBucket: bucket,
  browserProjectId,
  browserDatabaseId,
  browserStorageBucket: browserBucket,
  appUrl,
  note: 'This validates configuration shape and target separation only; it does not prove Firebase access or deployment.',
}, null, 2));
