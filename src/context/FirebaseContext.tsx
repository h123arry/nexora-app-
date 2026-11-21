import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDocFromServer, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onIdTokenChanged, signInAnonymously, User as FirebaseUser, ConfirmationResult, setPersistence, browserLocalPersistence } from 'firebase/auth';
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
    let observedUid = null as string | null;
    let hydratedIdentity = null as string | null;
    let inFlightHydration: { key: string; promise: Promise<User | null> } | null = null;
    let anonymousBootstrapStarted = false;
    const persistenceReady = setPersistence(auth, browserLocalPersistence);

    const unsubscribe = onIdTokenChanged(auth, async (fbUser) => {
      const currentSequence = ++sequence;
      const nextUid = fbUser?.uid ?? null;

      setFirebaseUser(fbUser);
      if (observedUid !== nextUid) {
        observedUid = nextUid;
        setUser(null);
        setError(null);
        setInitializing(true);
      }

      if (!fbUser) {
        hydratedIdentity = null;
        inFlightHydration = null;
        setUser(null);
        setError(null);
        if (!anonymousBootstrapStarted) {
          anonymousBootstrapStarted = true;
          setInitializing(true);
          void persistenceReady.then(() => signInAnonymously(auth)).catch((bootstrapError) => {
            const code = (bootstrapError as { code?: string } | null)?.code || 'anonymous-auth-unavailable';
            if (auth.currentUser) return;
            setError(`Unable to start your NEXORA session (${code}). Tap to retry.`);
            anonymousBootstrapStarted = false;
            setInitializing(false);
          });
          return;
        }
        setInitializing(false);
        return;
      }

      try {
        await fbUser.getIdTokenResult();
        const isApprovedBetaMember = true;
        const identityKey = getAuthSessionIdentityKey(fbUser, isApprovedBetaMember);
        if (!identityKey) throw new Error('Authenticated session is missing its identity key.');

        if (!shouldHydrateAuthSession(hydratedIdentity, identityKey)) {
          if (currentSequence === sequence && auth.currentUser?.uid === fbUser.uid) setInitializing(false);
          return;
        }

        setInitializing(true);
        // Reuse the same profile request if Firebase emits overlapping token changes.
        let profilePromise: Promise<User | null>;
        if (inFlightHydration?.key === identityKey) {
          profilePromise = inFlightHydration.promise;
        } else {
          // Public anonymous accounts are first-class NEXORA members:
          // self-heal a missing private profile instead of leaving them blocked.
          profilePromise = ProfileService.getOrCreateProfile(fbUser);
          inFlightHydration = { key: identityKey, promise: profilePromise };
        }

        const profile = await profilePromise;
        if (currentSequence === sequence && auth.currentUser?.uid === fbUser.uid) {
          hydratedIdentity = identityKey;
          setUser(profile);
          setError(null);
        }
      } catch (error) {
        const code = (error as { code?: string } | null)?.code || 'unknown';
        console.error('[NEXORA] Auth-state profile hydration failed', { code, uid: fbUser.uid });
        if (currentSequence === sequence && auth.currentUser?.uid === fbUser.uid) {
          setError(`Unable to load your account profile (${code}). Please retry or contact NEXORA support with this code.`);
        }
      } finally {
        if (currentSequence === sequence) {
          setInitializing(false);
          inFlightHydration = null;
        }
      }
    });

    return () => {
      sequence++;
      unsubscribe();
    };
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

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    }
    testConnection();
  }, []);

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
      // A failed first anonymous bootstrap must be recoverable without forcing
      // visitors through email/password authentication or a page refresh.
      if (!currentUser) {
        const credential = await signInAnonymously(auth);
        currentUser = credential.user;
      }
      await currentUser.getIdTokenResult(true);
      const profile = await ProfileService.getOrCreateProfile(currentUser);
      if (!profile) throw new Error('NEXORA could not find or create your private account profile.');

      if (auth.currentUser?.uid === currentUser.uid) {
        setFirebaseUser(currentUser);
        setUser(profile);
        setError(null);
      }
    } catch (err) {
      const source = err as { code?: string; message?: string } | null;
      const code = source?.code || 'profile-setup-failed';
      const message = source?.message || 'NEXORA could not synchronize your account profile.';
      setError(`${message} (${code})`);
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
