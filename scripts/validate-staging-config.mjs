#!/usr/bin/env node

const required = [
  'NEXORA_STAGING_PROJECT_ID',
  'FIRESTORE_DATABASE_ID',
  'FIREBASE_STORAGE_BUCKET',
  'STAGING_APP_URL',
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(`Missing staging configuration: ${missing.join(', ')}`);
  console.error('Load an owner-provided staging environment; do not use production defaults.');
  process.exit(1);
}

const projectId = process.env.NEXORA_STAGING_PROJECT_ID.trim();
const productionProjectId = 'evident-server-bqmt3';
const databaseId = process.env.FIRESTORE_DATABASE_ID.trim();
const bucket = process.env.FIREBASE_STORAGE_BUCKET.trim();
const appUrl = process.env.STAGING_APP_URL.trim();

if (!/^[a-z][a-z0-9-]{4,29}$/.test(projectId)) {
  console.error('NEXORA_STAGING_PROJECT_ID is not a valid Firebase project ID.');
  process.exit(1);
}
if (projectId === productionProjectId) {
  console.error('Refusing to validate staging configuration against the checked-in production target.');
  process.exit(1);
}
if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(databaseId)) {
  console.error('FIRESTORE_DATABASE_ID contains unsupported characters.');
  process.exit(1);
}
if (!bucket.includes(projectId)) {
  console.error('FIREBASE_STORAGE_BUCKET must belong to the declared staging project.');
  process.exit(1);
}
if (!/^https:\/\//i.test(appUrl) || /localhost|127\.0\.0\.1/i.test(appUrl)) {
  console.error('STAGING_APP_URL must be a non-local HTTPS staging URL.');
  process.exit(1);
}

console.log(JSON.stringify({
  status: 'valid',
  projectId,
  databaseId,
  storageBucket: bucket,
  appUrl,
  note: 'This validates configuration shape and target separation only; it does not prove Firebase access or deployment.',
}, null, 2));
