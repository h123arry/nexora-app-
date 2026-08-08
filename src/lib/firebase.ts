import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendPasswordResetEmail,
  signOut,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);

export {
  app,
  auth,
  db,
  signInAnonymously,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  sendPasswordResetEmail,
  signOut,
};
