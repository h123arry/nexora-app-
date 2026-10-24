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
