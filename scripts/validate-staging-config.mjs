#!/usr/bin/env node

const required = [
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
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(`Missing staging configuration: ${missing.join(', ')}`);
  console.error('Load an owner-provided staging environment; do not use production defaults.');
  process.exit(1);
}

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

if (process.env.NEXORA_ENV.trim() !== 'staging') {
  fail('NEXORA_ENV must be exactly staging for staging validation.');
}
if (process.env.NODE_ENV.trim() !== 'staging') {
  fail('NODE_ENV must be exactly staging for staging validation.');
}
if (process.env.VITE_NEXORA_ENV.trim() !== 'staging') {
  fail('VITE_NEXORA_ENV must be exactly staging for staging validation.');
}

const projectId = process.env.NEXORA_STAGING_PROJECT_ID.trim();
const productionProjectId = 'nexora-prod-voiceharrison';
const databaseId = process.env.FIRESTORE_DATABASE_ID.trim();
const bucket = process.env.FIREBASE_STORAGE_BUCKET.trim();
const appUrl = process.env.STAGING_APP_URL.trim();
const browserProjectId = process.env.VITE_FIREBASE_PROJECT_ID.trim();
const browserDatabaseId = process.env.VITE_FIREBASE_DATABASE_ID.trim();
const browserBucket = process.env.VITE_FIREBASE_STORAGE_BUCKET.trim();
const authDomain = process.env.VITE_FIREBASE_AUTH_DOMAIN.trim();
const senderId = process.env.VITE_FIREBASE_MESSAGING_SENDER_ID.trim();
const appId = process.env.VITE_FIREBASE_APP_ID.trim();

if (!/^[a-z][a-z0-9-]{4,29}$/.test(projectId)) {
  fail('NEXORA_STAGING_PROJECT_ID is not a valid Firebase project ID.');
}
if (projectId === productionProjectId || browserProjectId === productionProjectId
  || process.env.GCLOUD_PROJECT.trim() === productionProjectId) {
  fail('Refusing to validate staging configuration against the production Firebase project.');
}
if (process.env.GCLOUD_PROJECT.trim() !== projectId) {
  fail('GCLOUD_PROJECT must match NEXORA_STAGING_PROJECT_ID.');
}
if (browserProjectId !== projectId) {
  fail('VITE_FIREBASE_PROJECT_ID must match NEXORA_STAGING_PROJECT_ID.');
}
if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(databaseId)) {
  fail('FIRESTORE_DATABASE_ID contains unsupported characters.');
}
if (!bucket.includes(projectId) || !browserBucket.includes(projectId)) {
  fail('Firebase Storage buckets must belong to the declared staging project.');
}
if (browserDatabaseId !== databaseId) {
  fail('VITE_FIREBASE_DATABASE_ID must match FIRESTORE_DATABASE_ID.');
}
if (authDomain !== `${projectId}.firebaseapp.com`) {
  fail('VITE_FIREBASE_AUTH_DOMAIN must match the declared staging Firebase project.');
}
if (!appId.startsWith(`1:${senderId}:web:`)) {
  fail('VITE_FIREBASE_APP_ID must be a Web App registered to VITE_FIREBASE_MESSAGING_SENDER_ID.');
}
let parsedAppUrl;
try {
  parsedAppUrl = new URL(appUrl);
} catch {
  fail('STAGING_APP_URL must be a valid non-local HTTPS URL.');
}
if (parsedAppUrl.protocol !== 'https:' || !parsedAppUrl.hostname
  || parsedAppUrl.username || parsedAppUrl.password
  || ['localhost', '127.0.0.1', '::1'].includes(parsedAppUrl.hostname)) {
  fail('STAGING_APP_URL must be a non-local HTTPS staging URL.');
}
const emulatorVariables = ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST', 'VITE_USE_FIREBASE_EMULATORS'];
if (emulatorVariables.some((name) => process.env[name]?.trim())) {
  fail('Staging validation refuses Firebase emulator configuration.');
}

console.log(JSON.stringify({
  status: 'valid',
  projectId,
  databaseId,
  storageBucket: bucket,
  browserProjectId,
  browserDatabaseId,
  browserStorageBucket: browserBucket,
  authDomain,
  appIdMatchesSenderId: true,
  appCheckSiteKeyConfigured: Boolean(process.env.VITE_FIREBASE_APPCHECK_SITE_KEY?.trim()),
  appUrl: parsedAppUrl.origin,
  note: 'This validates configuration shape, App Check client-key presence, and target separation only; it does not prove Firebase access, deployed rules/Functions, or Console-side App Check enforcement.',
}, null, 2));
