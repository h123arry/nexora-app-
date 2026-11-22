import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onIdTokenChanged, User as FirebaseUser, ConfirmationResult, setPersistence, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { User } from '../types';
import { ProfileService } from '../services/firebase/profileService';
import { AuthService } from '../services/firebase/authService';
import { getAuthSessionIdentityKey, shouldHydrateAuthSession } from '../services/firebase/authSessionPolicy';

interface FirebaseContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  isAuthenticated: boolean;
  initializing: boolean;
  loading: boolean;
  error: string | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithUsername: (username: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string, username: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPhoneCode: (phone: string, verifier: any) => Promise<ConfirmationResult>;
  verifyPhoneCode: (confirmation: ConfirmationResult, code: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
  retryProfileLoad: () => Promise<void>;
  logout: () => Promise<void>;
}

/** Keep infrastructure diagnostics out of account-facing UI. Detailed codes stay in restricted logs. */
function getProfileSyncMessage(error: unknown): string {
  const code = String((error as { code?: string } | null)?.code || '').toLowerCase();
  if (code.includes('resource-exhausted') || code.includes('quota-exceeded')) {
    return 'NEXORA is temporarily unable to sync your profile. Your account and sign-in are safe. Please try again later.';
  }
  if (code === 'unavailable' || code.endsWith('/unavailable') || code.includes('network')) {
    return 'Your profile could not sync because the service is temporarily unavailable. Your sign-in is safe. Please try again shortly.';
  }
  return 'NEXORA could not sync your profile right now. Your account and sign-in are safe. Please try again later.';
}

const FirebaseContext = createContext<FirebaseContextType>({
  firebaseUser: null,
  user: null,
  isAuthenticated: false,
  initializing: true,
  loading: false,
  error: null,
  loginWithEmail: async () => {},
  loginWithUsername: async () => {},
  registerWithEmail: async () => {},
  loginWithGoogle: async () => {},
  sendPhoneCode: async () => ({} as ConfirmationResult),
  verifyPhoneCode: async () => {},
  sendVerificationEmail: async () => {},
  refreshVerificationStatus: async () => false,
  sendPasswordReset: async () => {},
  retryProfileLoad: async () => {},
  logout: async () => {},
});

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let sequence = 0;
    let observedUid: string | null = null;
    let hydratedIdentity: string | null = null;
    let inFlightHydration: { key: string; promise: Promise<User | null> } | null = null;
    let disposed = false;
    let unsubscribe: (() => void) | null = null;

    const handleAuthState = async (fbUser: FirebaseUser | null) => {
      const currentSequence = ++sequence;
      const nextUid = fbUser?.uid ?? null;
      setFirebaseUser(fbUser);
      if (observedUid !== nextUid) { observedUid = nextUid; setUser(null); setError(null); setInitializing(true); }
      if (!fbUser) {
        hydratedIdentity = null; inFlightHydration = null; setUser(null); setError(null);
        // A signed-out visitor stays signed out; never create a hidden visitor account.
        setInitializing(false); return;
      }
      try {
        await fbUser.getIdTokenResult();
        const identityKey = getAuthSessionIdentityKey(fbUser, true);
        if (!identityKey) throw new Error('Authenticated session is missing its identity key.');
        if (!shouldHydrateAuthSession(hydratedIdentity, identityKey)) {
          if (currentSequence === sequence && auth.currentUser?.uid === fbUser.uid) setInitializing(false);
          return;
        }
        setInitializing(true);
        let profilePromise: Promise<User | null>;
        if (inFlightHydration?.key === identityKey) profilePromise = inFlightHydration.promise;
        else { profilePromise = ProfileService.getOrCreateProfile(fbUser); inFlightHydration = { key: identityKey, promise: profilePromise }; }
        const profile = await profilePromise;
        if (!profile) throw new Error('NEXORA could not load the account profile.');
        if (currentSequence === sequence && auth.currentUser?.uid === fbUser.uid) { hydratedIdentity = identityKey; setUser(profile); setError(null); }
      } catch (authError) {
        const code = (authError as { code?: string } | null)?.code || 'unknown';
        console.error('[NEXORA] Auth-state profile hydration failed', { code, uid: fbUser.uid });
        if (currentSequence === sequence && auth.currentUser?.uid === fbUser.uid) setError(getProfileSyncMessage(authError));
      } finally {
        if (currentSequence === sequence) { setInitializing(false); inFlightHydration = null; }
      }
    };

    // Restore durable identity before observing Firebase's initial auth state.
    void (async () => {
      try { await setPersistence(auth, indexedDBLocalPersistence); }
      catch (primaryError) {
        try { await setPersistence(auth, browserLocalPersistence); }
        catch (fallbackError) {
          const code = (fallbackError as { code?: string } | null)?.code || (primaryError as { code?: string } | null)?.code || 'auth-persistence-unavailable';
          if (!disposed) { setError(`NEXORA could not restore sign-in persistence (${code}). Please sign in again.`); setInitializing(false); }
          return;
        }
      }
      if (!disposed) unsubscribe = onIdTokenChanged(auth, handleAuthState);
    })();
    return () => { disposed = true; sequence++; unsubscribe?.(); };
  }, []);

  // Keep the authenticated account model subscribed to its canonical private
  // Firestore document. This makes profile edits from another device/session
  // converge without relying on a refresh or a public-directory cache.
  useEffect(() => {
    const uid = firebaseUser?.uid;
    if (!uid || user?.id !== uid || auth.currentUser?.uid !== uid) return;
    return onSnapshot(doc(db, 'users', uid), snapshot => {
      if (!snapshot.exists() || auth.currentUser?.uid !== uid) return;
      const latest = {
        ...snapshot.data(),
        id: uid,
        ...(firebaseUser.email ? { email: firebaseUser.email } : {}),
        isVerified: firebaseUser.emailVerified,
      } as User;
      setUser(previous => previous?.id === uid ? { ...previous, ...latest } : latest);
    }, error => {
      const code = (error as { code?: string } | null)?.code || 'unknown';
      console.warn('[NEXORA] Live private profile sync paused; keeping last confirmed profile', { code });
    });
  }, [firebaseUser?.uid, firebaseUser?.email, firebaseUser?.emailVerified, user?.id]);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await AuthService.loginWithEmail(email, pass);
      setFirebaseUser(res.firebaseUser);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithUsername = async (username: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await AuthService.loginWithUsername(username, pass, true);
      setFirebaseUser(res.firebaseUser);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string, username: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await AuthService.registerWithEmail(email, pass, name, username);
      setFirebaseUser(res.firebaseUser);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await AuthService.loginWithGoogle();
      setFirebaseUser(res.firebaseUser);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendPhoneCode = async (phone: string, verifier: any) => {
    setLoading(true);
    setError(null);
    try {
      const confirmation = await AuthService.sendPhoneCode(phone, verifier);
      return confirmation;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const verifyPhoneCode = async (confirmation: ConfirmationResult, code: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await AuthService.verifyPhoneCode(confirmation, code);
      setFirebaseUser(res.firebaseUser);
      setUser(res.user);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const sendVerificationEmail = async () => {
    try {
      await AuthService.sendVerificationEmail(firebaseUser || undefined);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const refreshVerificationStatus = async (): Promise<boolean> => {
    try {
      const verified = await AuthService.refreshVerificationStatus(firebaseUser || undefined);
      if (verified && user) {
        setUser({ ...user, isVerified: true });
      }
      return verified;
    } catch (err) {
      return false;
    }
  };

  const sendPasswordReset = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await AuthService.sendPasswordReset(email);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const retryProfileLoad = async () => {
    setLoading(true);
    setInitializing(true);
    setError(null);
    let currentUser = auth.currentUser;
    try {
      // Signed-out visitors must explicitly sign in or register.
      if (!currentUser) throw new Error('Sign in or create a NEXORA account to continue.');
      await currentUser.getIdTokenResult(true);
      const profile = await ProfileService.getOrCreateProfile(currentUser);
      if (!profile) throw new Error('NEXORA could not find or create your private account profile.');

      if (auth.currentUser?.uid === currentUser.uid) {
        setFirebaseUser(currentUser);
        setUser(profile);
        setError(null);
      }
    } catch (err) {
      setError(getProfileSyncMessage(err));
      throw err;
    } finally {
      setInitializing(false);
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      // Revoke this device's push registration while the owning account is still authenticated.
      try {
        const { PushNotificationService } = await import('../services/firebase/pushNotificationService');
        await PushNotificationService.unregister();
      } catch (pushError) {
        console.warn('[NEXORA] Could not unregister push before sign-out.', pushError);
      }
      await AuthService.logout();
      setFirebaseUser(null);
      setUser(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <FirebaseContext.Provider
      value={{
        firebaseUser,
        user,
        isAuthenticated: !!firebaseUser && !!user && user.id === firebaseUser.uid,
        initializing,
        loading,
        error,
        loginWithEmail,
        loginWithUsername,
        registerWithEmail,
        loginWithGoogle,
        sendPhoneCode,
        verifyPhoneCode,
        sendVerificationEmail,
        refreshVerificationStatus,
        sendPasswordReset,
        retryProfileLoad,
        logout,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => useContext(FirebaseContext);
