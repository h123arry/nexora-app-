import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); 
export const auth = getAuth();

// Validate connection to Firestore
async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'status'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("⚠️ Firebase connection warning: Client appears offline or unconfigured.");
    }
  }
}
testConnection();

