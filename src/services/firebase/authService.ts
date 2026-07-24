import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  updatePassword,
  updateEmail,
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult,
  User as FirebaseUser,
  reload
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { User } from '../../types';
import { EmailService } from './emailService';
import { SecurityNotificationService } from './securityNotificationService';

// Brute force rate-limiting store in memory/localStorage
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 5 * 60 * 1000; // 5 minutes

export interface RateLimitStatus {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsCount: number;
}

export class AuthService {
  /**
   * Checks brute-force lock status for an identifier
   */
  static getRateLimitStatus(identifier: string): RateLimitStatus {
    const key = `nexora_lockout_${identifier.toLowerCase().trim()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };

    try {
      const data = JSON.parse(raw);
      const now = Date.now();
      if (data.lockoutUntil && now < data.lockoutUntil) {
        const remainingSeconds = Math.ceil((data.lockoutUntil - now) / 1000);
        return { isLocked: true, remainingSeconds, attemptsCount: data.attempts || MAX_FAILED_ATTEMPTS };
      }
      if (data.lockoutUntil && now >= data.lockoutUntil) {
        // Lockout expired
        localStorage.removeItem(key);
        return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
      }
      return { isLocked: false, remainingSeconds: 0, attemptsCount: data.attempts || 0 };
    } catch {
      return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
    }
  }

  /**
   * Records a failed login attempt and locks account if threshold exceeded
   */
  static recordFailedAttempt(identifier: string): RateLimitStatus {
    const clean = identifier.toLowerCase().trim();
    const key = `nexora_lockout_${clean}`;
    const status = this.getRateLimitStatus(clean);
    const newAttempts = status.attemptsCount + 1;

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_TIME_MS;
      localStorage.setItem(key, JSON.stringify({ attempts: newAttempts, lockoutUntil }));
      
      // Trigger suspicious login security alert
      SecurityNotificationService.notifySecurityEvent(
        'anonymous',
        clean.includes('@') ? clean : '',
        clean,
        'SUSPICIOUS_SIGNIN',
        { browser: navigator.userAgent }
      );

      return { isLocked: true, remainingSeconds: 300, attemptsCount: newAttempts };
    }

    localStorage.setItem(key, JSON.stringify({ attempts: newAttempts, lockoutUntil: 0 }));
    return { isLocked: false, remainingSeconds: 0, attemptsCount: newAttempts };
  }

  /**
   * Resets failed login attempt counter on successful login
   */
  static clearFailedAttempts(identifier: string) {
    const clean = identifier.toLowerCase().trim();
    localStorage.removeItem(`nexora_lockout_${clean}`);
  }

  /**
   * Register a new user with real Firebase Auth and send real verification email
   */
  static async registerUserWithEmail(
    email: string,
    password: string,
    fullName: string,
    username: string
  ): Promise<{ firebaseUser: FirebaseUser; user: User }> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    // 1. Firebase Auth user creation
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const fbUser = credential.user;

    // 2. Trigger real Firebase Auth Email Verification
    try {
      await sendEmailVerification(fbUser);
      console.log('✉️ Real email verification sent to:', cleanEmail);
    } catch (err) {
      console.warn('Firebase sendEmailVerification warning:', err);
    }

    // 3. Construct Nexora User Object
    const newUser: User = {
      id: fbUser.uid,
      username: cleanUsername,
      name: fullName,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
      bio: 'Member of the Nexora community.',
      location: 'Global',
      website: '',
      followers: 0,
      following: 0,
      sparks: 50,
      isVerified: fbUser.emailVerified,
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
      joinedDate: `Joined ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
      reputationPoints: 100,
      reputationBreakdown: { contributions: 50, helpfulness: 50, missionsCompleted: 1, skillsVerified: 0 },
      interestDNA: {},
      skills: []
    };

    // 4. Save to Firestore
    try {
      if (db) {
        await setDoc(doc(db, 'users', fbUser.uid), {
          ...newUser,
          email: cleanEmail,
          emailVerified: fbUser.emailVerified,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } catch (e) {
      console.warn('Firestore user save warning:', e);
    }

    // 5. Trigger Welcome Email & Security Log
    EmailService.sendTransactionalEmail('WELCOME', {
      toEmail: cleanEmail,
      userName: fullName
    });

    SecurityNotificationService.notifySecurityEvent(
      fbUser.uid,
      cleanEmail,
      fullName,
      'NEW_LOGIN',
      { browser: navigator.userAgent }
    );

    return { firebaseUser: fbUser, user: newUser };
  }

  /**
   * Send or Resend Email Verification for currently logged in user
   */
  static async sendEmailVerificationLink(user?: FirebaseUser): Promise<boolean> {
    const targetUser = user || auth.currentUser;
    if (!targetUser) throw new Error('No user currently authenticated to send verification.');

    await sendEmailVerification(targetUser);

    if (targetUser.email) {
      await EmailService.sendTransactionalEmail('VERIFY_EMAIL', {
        toEmail: targetUser.email,
        userName: targetUser.displayName || 'Nexora User'
      });
    }

    return true;
  }

  /**
   * Check if current Firebase User has verified their email inbox
   */
  static async checkVerificationStatus(userId: string): Promise<boolean> {
    const user = auth.currentUser;
    if (user) {
      await reload(user);
      if (user.emailVerified) {
        // Sync Firestore
        try {
          if (db) {
            await updateDoc(doc(db, 'users', userId), {
              isVerified: true,
              emailVerified: true
            });
          }
        } catch (e) {
          console.warn('Firestore verification sync error:', e);
        }

        if (user.email) {
          SecurityNotificationService.notifySecurityEvent(
            userId,
            user.email,
            user.displayName || 'User',
            'VERIFICATION_APPROVED'
          );
        }

        return true;
      }
    }
    return false;
  }

  /**
   * Real Password Reset via Firebase Auth Email Link
   */
  static async sendPasswordReset(email: string): Promise<boolean> {
    const cleanEmail = email.toLowerCase().trim();
    
    // Trigger real Firebase Auth password reset email
    await sendPasswordResetEmail(auth, cleanEmail);

    // Trigger branded email copy
    await EmailService.sendTransactionalEmail('PASSWORD_RESET', {
      toEmail: cleanEmail,
      userName: cleanEmail.split('@')[0]
    });

    return true;
  }

  /**
   * Initializes Firebase RecaptchaVerifier for Phone SMS Auth
   */
  static initRecaptchaVerifier(containerId: string): RecaptchaVerifier {
    if (typeof window === 'undefined') throw new Error('Browser window required for RecaptchaVerifier');
    
    // Clear any previous recaptcha instances
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch (e) {}
    }

    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        console.log('Recaptcha resolved');
      }
    });

    (window as any).recaptchaVerifier = verifier;
    return verifier;
  }

  /**
   * Sends real SMS OTP Code via Firebase Phone Auth
   */
  static async sendPhoneSMS(phoneNumber: string, verifier: RecaptchaVerifier): Promise<ConfirmationResult> {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
    console.log('📱 Real Firebase SMS sent to:', phoneNumber);
    return confirmationResult;
  }

  /**
   * Verifies Phone SMS OTP code with Firebase
   */
  static async confirmPhoneOTP(confirmationResult: ConfirmationResult, otpCode: string): Promise<FirebaseUser> {
    const credential = await confirmationResult.confirm(otpCode);
    const fbUser = credential.user;

    SecurityNotificationService.notifySecurityEvent(
      fbUser.uid,
      fbUser.email || '',
      fbUser.displayName || 'Phone User',
      'NEW_LOGIN',
      { browser: navigator.userAgent }
    );

    return fbUser;
  }

  /**
   * Change user password with security notification
   */
  static async changeUserPassword(newPassword: string): Promise<boolean> {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated.');

    await updatePassword(user, newPassword);

    if (user.email) {
      SecurityNotificationService.notifySecurityEvent(
        user.uid,
        user.email,
        user.displayName || 'Nexora User',
        'PASSWORD_CHANGED'
      );
    }

    return true;
  }
}
