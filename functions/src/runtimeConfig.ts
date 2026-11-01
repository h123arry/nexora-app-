import { applicationDefault, getApps, initializeApp, type App } from 'firebase-admin/app';

const PRODUCTION_PROJECT_ID = 'nexora-prod-voiceharrison';
const LOCAL_PROJECT_ID = 'demo-nexora-local';

function envValue(env: NodeJS.ProcessEnv, name: string): string {
  return env[name]?.trim() || '';
}

function projectFromFirebaseConfig(env: NodeJS.ProcessEnv): string {
  const raw = env.FIREBASE_CONFIG?.trim();
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw) as { projectId?: string };
    return typeof parsed.projectId === 'string' ? parsed.projectId.trim() : '';
  } catch {
    throw new Error('FIREBASE_CONFIG is not valid JSON; refusing to initialize Firebase Admin.');
  }
}

/** Resolve the Firebase project and reject staging/production ambiguity. */
export function resolveFirebaseProjectId(env: NodeJS.ProcessEnv = process.env): string {
  const projectId = envValue(env, 'GCLOUD_PROJECT') || envValue(env, 'GCP_PROJECT') || projectFromFirebaseConfig(env) || LOCAL_PROJECT_ID;
  const environment = envValue(env, 'NEXORA_ENV') || (envValue(env, 'FIRESTORE_EMULATOR_HOST') ? 'local' : 'production');

  if (environment === 'staging') {
    const stagingProject = envValue(env, 'NEXORA_STAGING_PROJECT_ID');
    if (!stagingProject) throw new Error('NEXORA_STAGING_PROJECT_ID is required for staging Functions.');
    if (projectId !== stagingProject) throw new Error('Firebase Functions project does not match NEXORA_STAGING_PROJECT_ID.');
    if (projectId === PRODUCTION_PROJECT_ID) throw new Error('Staging Functions cannot target the production Firebase project.');
  }
  if (environment === 'production' && projectId !== PRODUCTION_PROJECT_ID) {
    throw new Error(`Production Functions must target ${PRODUCTION_PROJECT_ID}.`);
  }
  if (environment === 'local' && projectId === PRODUCTION_PROJECT_ID) {
    throw new Error('Local Functions cannot target the production Firebase project.');
  }
  return projectId;
}

/**
 * Resolve the Firestore target without silently routing production traffic to
 * the project's `(default)` database. The emulator is the only implicit local
 * exception because it does not model named Firestore databases.
 */
export function resolveFirestoreDatabaseId(env: NodeJS.ProcessEnv = process.env): string {
  const configuredId = envValue(env, 'FIRESTORE_DATABASE_ID');
  if (configuredId.includes('<owner-')) {
    throw new Error('FIRESTORE_DATABASE_ID is still an owner placeholder; refusing to initialize Firestore.');
  }
  if (configuredId) return configuredId;
  if (env.FIRESTORE_EMULATOR_HOST) return '(default)';
  throw new Error('FIRESTORE_DATABASE_ID must be explicitly configured outside the Firestore emulator; refusing to assume (default).');
}

export function resolveFirebaseStorageBucket(env: NodeJS.ProcessEnv = process.env): string {
  const configured = envValue(env, 'FIREBASE_STORAGE_BUCKET');
  if (configured.includes('<owner-')) {
    throw new Error('FIREBASE_STORAGE_BUCKET is still an owner placeholder; refusing to initialize Storage.');
  }
  if (configured) return configured;
  if (env.STORAGE_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST) {
    return `${resolveFirebaseProjectId(env)}.appspot.com`;
  }
  throw new Error('FIREBASE_STORAGE_BUCKET must be explicitly configured outside the Storage emulator.');
}

export function getFirebaseAdminApp(env: NodeJS.ProcessEnv = process.env): App {
  const existing = getApps().find(app => app.name === '[DEFAULT]');
  if (existing) return existing;
  const projectId = resolveFirebaseProjectId(env);
  return env.FIRESTORE_EMULATOR_HOST || env.FIREBASE_AUTH_EMULATOR_HOST || env.STORAGE_EMULATOR_HOST || env.FIREBASE_STORAGE_EMULATOR_HOST
    ? initializeApp({ projectId })
    : initializeApp({ credential: applicationDefault(), projectId });
}

export const PRODUCTION_FIREBASE_PROJECT_ID = PRODUCTION_PROJECT_ID;
