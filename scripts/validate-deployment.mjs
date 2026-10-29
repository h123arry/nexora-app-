import { existsSync, readFileSync } from 'node:fs';

const failures = [];
const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    failures.push(`${file}: missing or invalid JSON`);
    return null;
  }
};

const firebase = readJson('firebase.json');
const aliases = readJson('.firebaserc');
const webConfig = readJson('firebase-applet-config.json');
const messagingWorker = existsSync('public/firebase-messaging-sw.js')
  ? readFileSync('public/firebase-messaging-sw.js', 'utf8')
  : '';
const rootPackage = readJson('package.json');
const functionsPackage = readJson('functions/package.json');

if (firebase) {
  if (firebase.functions?.source !== 'functions') failures.push('firebase.json: functions.source must be functions');
  if (firebase.functions?.runtime !== 'nodejs22') failures.push('firebase.json: Functions runtime must be nodejs22');
  if (!firebase.storage?.rules || !existsSync(firebase.storage.rules)) failures.push('firebase.json: Storage rules file is missing');
  if (!Array.isArray(firebase.firestore) || firebase.firestore.length === 0) failures.push('firebase.json: no Firestore database configuration found');
  for (const database of firebase.firestore || []) {
    if (!database.rules || !existsSync(database.rules)) failures.push(`firebase.json: Firestore rules missing for ${database.database}`);
    if (!database.indexes || !existsSync(database.indexes)) failures.push(`firebase.json: Firestore indexes missing for ${database.database}`);
    if (typeof database.database === 'string' && database.database.includes('<owner-')) failures.push('firebase.json: the owner-verified Firestore database ID is still required');
  }
}

if (aliases?.projects?.default !== 'nexora-prod-voiceharrison' || aliases?.projects?.production !== 'nexora-prod-voiceharrison') {
  failures.push('.firebaserc: default and production aliases must target nexora-prod-voiceharrison');
}

if (webConfig) {
  if (webConfig.projectId !== 'nexora-prod-voiceharrison') failures.push('firebase-applet-config.json: projectId must target nexora-prod-voiceharrison');
  for (const [name, value] of Object.entries(webConfig)) {
    if (typeof value === 'string' && value.includes('<owner-')) failures.push(`firebase-applet-config.json: ${name} still requires owner-provided configuration`);
  }
  const workerValue = (name) => messagingWorker.match(new RegExp(`${name}:\\s*["']([^"']+)["']`))?.[1];
  for (const name of ['projectId', 'appId', 'apiKey', 'messagingSenderId']) {
    if (workerValue(name) !== webConfig[name]) failures.push(`public/firebase-messaging-sw.js: ${name} must match firebase-applet-config.json`);
  }
}

if (rootPackage?.engines?.node !== '22') failures.push('package.json: Node engine must be 22');
if (functionsPackage?.engines?.node !== '22') failures.push('functions/package.json: Node engine must be 22');
for (const required of ['package-lock.json', 'functions/package-lock.json', '.env.example', 'firestore.rules', 'storage.rules']) {
  if (!existsSync(required)) failures.push(`${required}: required release asset is missing`);
}

if (failures.length > 0) {
  console.error('Deployment validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Deployment metadata validation passed.');
