import React, { createContext, useContext, useEffect, useState } from 'react';
import { doc, getDocFromServer } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, ConfirmationResult } from 'firebase/auth';
import { User } from '../types';
import { ProfileService } from '../services/firebase/profileService';
import { AuthService } from '../services/firebase/authService';

interface FirebaseContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  isAuthenticated: boolean;
  initializing: boolean;
  loading: boolean;
  error: string | null;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string, username: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  sendPhoneCode: (phone: string, verifier: any) => Promise<ConfirmationResult>;
  verifyPhoneCode: (confirmation: ConfirmationResult, code: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  refreshVerificationStatus: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<void>;
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
  registerWithEmail: async () => {},
  loginWithGoogle: async () => {},
  sendPhoneCode: async () => ({} as ConfirmationResult),
  verifyPhoneCode: async () => {},
  sendVerificationEmail: async () => {},
  refreshVerificationStatus: async () => false,
  sendPasswordReset: async () => {},
  logout: async () => {},
});

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("🔥 FirebaseProvider: Setting up onAuthStateChanged...");
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          const profile = await ProfileService.getOrCreateProfile(fbUser);
          setUser(profile);
        } catch (e) {
          console.error("Failed to load user profile in provider:", e);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setInitializing(false);
    });
    return unsubscribe;
  }, []);

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

  const logout = async () => {
    setLoading(true);
    try {
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
        isAuthenticated: !!firebaseUser && !!user,
        initializing,
        loading,
        error,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        sendPhoneCode,
        verifyPhoneCode,
        sendVerificationEmail,
        refreshVerificationStatus,
        sendPasswordReset,
        logout,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => useContext(FirebaseContext);
