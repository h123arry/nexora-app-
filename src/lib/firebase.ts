import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import firebaseConfig from '../../firebase-applet-config.json';

type FirebaseWebConfig = typeof firebaseConfig;
const viteEnv = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env || {}) as Record<string, string | undefined>;
const resolvedConfig: FirebaseWebConfig = {
  ...firebaseConfig,
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: viteEnv.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  firestoreDatabaseId: viteEnv.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId,
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
};
const isEmulatorRuntime = typeof process !== 'undefined' && Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const unresolvedConfigFields = Object.entries(resolvedConfig)
  .filter(([name, value]) => name !== 'measurementId' && (typeof value !== 'string' || !value.trim() || value.includes('<owner-')))
  .map(([name]) => name);
if (resolvedConfig.projectId !== 'nexora-prod-voiceharrison') {
  throw new Error('Firebase configuration targets an unexpected project. Expected nexora-prod-voiceharrison.');
}
if (!isEmulatorRuntime && unresolvedConfigFields.length > 0) {
  throw new Error(`Firebase web configuration is incomplete. Provide owner-verified values for: ${unresolvedConfigFields.join(', ')}.`);
}

const app = initializeApp(resolvedConfig);
export { app };
const firestoreDatabaseId = typeof process !== 'undefined' && process.env.FIRESTORE_EMULATOR_HOST
  ? '(default)'
  : resolvedConfig.firestoreDatabaseId;
const appCheckSiteKey = (globalThis as typeof globalThis & {
  __NEXORA_APPCHECK_SITE_KEY__?: string;
}).__NEXORA_APPCHECK_SITE_KEY__;
export const appCheck: AppCheck | null = appCheckSiteKey
  ? initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  : null;
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth();
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

const useEmulators = (globalThis as typeof globalThis & {
  __NEXORA_FIREBASE_EMULATORS__?: boolean;
}).__NEXORA_FIREBASE_EMULATORS__ === true;

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}
