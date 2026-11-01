import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { resolveFirebaseWebEnvironment } from './firebaseEnvironment';

const viteEnv = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env || {}) as Record<string, string | undefined>;
const firebaseEnvironment = resolveFirebaseWebEnvironment(viteEnv);
const app = initializeApp(firebaseEnvironment.config);
export { app };

export const firebaseConfigError: string | null = null;
export const db = getFirestore(app, firebaseEnvironment.config.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, 'us-central1');

const appCheckSiteKey = (globalThis as typeof globalThis & {
  __NEXORA_APPCHECK_SITE_KEY__?: string;
}).__NEXORA_APPCHECK_SITE_KEY__;
export const appCheck: AppCheck | null = !firebaseEnvironment.useEmulators && appCheckSiteKey
  ? initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  : null;

if (firebaseEnvironment.useEmulators) {
  connectAuthEmulator(auth, `http://${firebaseEnvironment.emulator.auth.host}:${firebaseEnvironment.emulator.auth.port}`, { disableWarnings: true });
  connectFirestoreEmulator(db, firebaseEnvironment.emulator.firestore.host, firebaseEnvironment.emulator.firestore.port);
  connectStorageEmulator(storage, firebaseEnvironment.emulator.storage.host, firebaseEnvironment.emulator.storage.port);
  connectFunctionsEmulator(functions, firebaseEnvironment.emulator.functions.host, firebaseEnvironment.emulator.functions.port);
}
