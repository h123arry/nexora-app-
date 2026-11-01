export type ServerFirebaseEnvironment = 'local' | 'staging' | 'production';

export interface ServerFirebaseConfig {
  environment: ServerFirebaseEnvironment;
  projectId: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  useEmulators: boolean;
}

const PRODUCTION_PROJECT_ID = 'nexora-prod-voiceharrison';
const LOCAL_PROJECT_ID = 'demo-nexora-local';

function required(env: NodeJS.ProcessEnv, name: string, environment: ServerFirebaseEnvironment): string {
  const result = env[name]?.trim();
  if (!result || result.includes('<owner-')) {
    throw new Error(`Missing required ${environment} Firebase configuration: ${name}`);
  }
  return result;
}

export function resolveServerFirebaseConfig(env: NodeJS.ProcessEnv = process.env): ServerFirebaseConfig {
  const requested = env.NEXORA_ENV?.trim() || (env.NODE_ENV === 'production' ? 'production' : env.NODE_ENV === 'staging' ? 'staging' : 'local');
  if (!['local', 'staging', 'production'].includes(requested)) {
    throw new Error(`NEXORA_ENV must be local, staging, or production; received ${requested}.`);
  }
  const environment = requested as ServerFirebaseEnvironment;

  if (environment === 'local') {
    const missingEmulators = ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']
      .filter(name => !env[name]?.trim());
    if (missingEmulators.length > 0) {
      throw new Error(`Local development requires Firebase emulators; missing: ${missingEmulators.join(', ')}.`);
    }
    const projectId = env.GCLOUD_PROJECT?.trim() || env.FIREBASE_PROJECT_ID?.trim() || LOCAL_PROJECT_ID;
    if (projectId === PRODUCTION_PROJECT_ID) {
      throw new Error('Local development cannot target the production Firebase project.');
    }
    return {
      environment,
      projectId,
      firestoreDatabaseId: '(default)',
      storageBucket: env.FIREBASE_STORAGE_BUCKET?.trim() || `${projectId}.appspot.com`,
      useEmulators: true,
    };
  }

  const projectId = required(env, 'GCLOUD_PROJECT', environment);
  const databaseId = required(env, 'FIRESTORE_DATABASE_ID', environment);
  const storageBucket = required(env, 'FIREBASE_STORAGE_BUCKET', environment);
  const emulatorVariables = ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST', 'FIREBASE_STORAGE_EMULATOR_HOST']
    .filter(name => env[name]?.trim());
  if (emulatorVariables.length > 0) {
    throw new Error(`${environment} must not use Firebase emulator variables: ${emulatorVariables.join(', ')}.`);
  }
  if (environment === 'staging') {
    const declaredStagingProject = required(env, 'NEXORA_STAGING_PROJECT_ID', environment);
    if (projectId !== declaredStagingProject) {
      throw new Error('GCLOUD_PROJECT must match NEXORA_STAGING_PROJECT_ID for staging.');
    }
    if (projectId === PRODUCTION_PROJECT_ID) {
      throw new Error('Staging configuration cannot target the production Firebase project.');
    }
    if (!storageBucket.includes(projectId)) {
      throw new Error('Staging Storage bucket must belong to the configured staging Firebase project.');
    }
  } else if (projectId !== PRODUCTION_PROJECT_ID) {
    throw new Error(`Production configuration must target ${PRODUCTION_PROJECT_ID}.`);
  }

  return { environment, projectId, firestoreDatabaseId: databaseId, storageBucket, useEmulators: false };
}
