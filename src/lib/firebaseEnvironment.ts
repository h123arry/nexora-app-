export type FirebaseEnvironment = 'local' | 'emulator' | 'staging' | 'production';

export interface FirebaseWebConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket: string;
  messagingSenderId: string;
  measurementId?: string;
}

export interface FirebaseEmulatorConfig {
  auth: { host: string; port: number };
  firestore: { host: string; port: number };
  storage: { host: string; port: number };
  functions: { host: string; port: number };
}

export interface ResolvedFirebaseWebEnvironment {
  environment: FirebaseEnvironment;
  useEmulators: boolean;
  config: FirebaseWebConfig;
  emulator: FirebaseEmulatorConfig;
}

const PRODUCTION_PROJECT_ID = 'nexora-prod-voiceharrison';
const LOCAL_PROJECT_ID = 'demo-nexora-local';
const REQUIRED_WEB_FIELDS: Array<keyof FirebaseWebConfig> = [
  'projectId',
  'appId',
  'apiKey',
  'authDomain',
  'firestoreDatabaseId',
  'storageBucket',
  'messagingSenderId',
];

function value(env: Record<string, string | undefined>, name: string): string {
  return env[name]?.trim() || '';
}

function required(env: Record<string, string | undefined>, name: string, environment: FirebaseEnvironment): string {
  const result = value(env, name);
  if (!result || result.includes('<owner-')) {
    throw new Error(`Missing required Firebase ${environment} configuration: ${name}`);
  }
  return result;
}

function port(env: Record<string, string | undefined>, name: string, fallback: number): number {
  const raw = value(env, name);
  if (!raw) return fallback;
  const result = Number(raw);
  if (!Number.isInteger(result) || result < 1 || result > 65535) {
    throw new Error(`${name} must be a valid TCP port.`);
  }
  return result;
}

function host(env: Record<string, string | undefined>, name: string, fallback: string): string {
  return value(env, name) || fallback;
}

function emulatorConfig(env: Record<string, string | undefined>): FirebaseEmulatorConfig {
  return {
    auth: { host: host(env, 'VITE_FIREBASE_AUTH_EMULATOR_HOST', '127.0.0.1'), port: port(env, 'VITE_FIREBASE_AUTH_EMULATOR_PORT', 9099) },
    firestore: { host: host(env, 'VITE_FIREBASE_FIRESTORE_EMULATOR_HOST', '127.0.0.1'), port: port(env, 'VITE_FIREBASE_FIRESTORE_EMULATOR_PORT', 8080) },
    storage: { host: host(env, 'VITE_FIREBASE_STORAGE_EMULATOR_HOST', '127.0.0.1'), port: port(env, 'VITE_FIREBASE_STORAGE_EMULATOR_PORT', 9199) },
    functions: { host: host(env, 'VITE_FIREBASE_FUNCTIONS_EMULATOR_HOST', '127.0.0.1'), port: port(env, 'VITE_FIREBASE_FUNCTIONS_EMULATOR_PORT', 5001) },
  };
}

export function resolveFirebaseWebEnvironment(
  env: Record<string, string | undefined>,
): ResolvedFirebaseWebEnvironment {
  const rawEnvironment = value(env, 'VITE_NEXORA_ENV') || 'local';
  if (!['local', 'emulator', 'staging', 'production'].includes(rawEnvironment)) {
    throw new Error(`VITE_NEXORA_ENV must be local, emulator, staging, or production; received ${rawEnvironment}.`);
  }
  const environment = rawEnvironment as FirebaseEnvironment;
  const useEmulators = environment === 'local' || environment === 'emulator';
  const emulator = emulatorConfig(env);

  if (useEmulators) {
    if (value(env, 'VITE_USE_FIREBASE_EMULATORS') === 'false') {
      throw new Error('Local and emulator environments must use Firebase emulators; refusing a production network target.');
    }
    if (value(env, 'VITE_FIREBASE_PROJECT_ID') === PRODUCTION_PROJECT_ID) {
      throw new Error('Local and emulator environments cannot use the production Firebase project ID.');
    }
    return {
      environment,
      useEmulators: true,
      emulator,
      config: {
        projectId: value(env, 'VITE_FIREBASE_PROJECT_ID') || LOCAL_PROJECT_ID,
        appId: value(env, 'VITE_FIREBASE_APP_ID') || 'demo-app-id',
        apiKey: value(env, 'VITE_FIREBASE_API_KEY') || 'demo-api-key',
        authDomain: value(env, 'VITE_FIREBASE_AUTH_DOMAIN') || `${LOCAL_PROJECT_ID}.firebaseapp.com`,
        firestoreDatabaseId: '(default)',
        storageBucket: value(env, 'VITE_FIREBASE_STORAGE_BUCKET') || `${LOCAL_PROJECT_ID}.appspot.com`,
        messagingSenderId: value(env, 'VITE_FIREBASE_MESSAGING_SENDER_ID') || 'demo-messaging-sender',
      },
    };
  }

  const config: FirebaseWebConfig = {
    projectId: required(env, 'VITE_FIREBASE_PROJECT_ID', environment),
    appId: required(env, 'VITE_FIREBASE_APP_ID', environment),
    apiKey: required(env, 'VITE_FIREBASE_API_KEY', environment),
    authDomain: required(env, 'VITE_FIREBASE_AUTH_DOMAIN', environment),
    firestoreDatabaseId: required(env, 'VITE_FIREBASE_DATABASE_ID', environment),
    storageBucket: required(env, 'VITE_FIREBASE_STORAGE_BUCKET', environment),
    messagingSenderId: required(env, 'VITE_FIREBASE_MESSAGING_SENDER_ID', environment),
    measurementId: value(env, 'VITE_FIREBASE_MEASUREMENT_ID') || undefined,
  };

  if (environment === 'staging' && config.projectId === PRODUCTION_PROJECT_ID) {
    throw new Error('Staging configuration cannot target the production Firebase project.');
  }
  if (environment === 'staging' && !config.storageBucket.includes(config.projectId)) {
    throw new Error('Staging Storage bucket must belong to the configured staging Firebase project.');
  }
  if (environment === 'production' && config.projectId !== PRODUCTION_PROJECT_ID) {
    throw new Error(`Production configuration must target ${PRODUCTION_PROJECT_ID}.`);
  }
  if (value(env, 'VITE_USE_FIREBASE_EMULATORS') === 'true') {
    throw new Error(`${environment} configuration cannot enable Firebase emulators.`);
  }

  for (const field of REQUIRED_WEB_FIELDS) {
    if (!config[field]) throw new Error(`Missing required Firebase ${environment} configuration: ${field}`);
  }
  return { environment, useEmulators: false, config, emulator };
}

export const PRODUCTION_FIREBASE_PROJECT_ID = PRODUCTION_PROJECT_ID;
