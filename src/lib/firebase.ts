import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

console.log("🔥 Initializing Firebase...");
const app = initializeApp(firebaseConfig);
export { app };
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
export { signInAnonymously };
console.log("✅ Firebase Initialized.");
