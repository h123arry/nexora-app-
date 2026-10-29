import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification, 
  sendPasswordResetEmail, 
  updatePassword,
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  ConfirmationResult,
  User as FirebaseUser,
  reload,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { auth, db, firebaseConfigError } from './config';
import { User } from '../../types';
import { ProfileService } from './profileService';
import { EmailService } from './emailService';
import { SecurityNotificationService } from './securityNotificationService';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 5 * 60 * 1000; // 5 minutes

export interface RateLimitStatus {
  isLocked: boolean;
  remainingSeconds: number;
  attemptsCount: number;
}

export class AuthService {
  private static requireConfigured(): void {
    if (firebaseConfigError) throw new Error(firebaseConfigError);
  }

  private static publicAuthError(error: unknown): Error & { code?: string } {
    const source = error as { code?: string } | null;
    const wrapped = new Error(this.mapFirebaseError(error)) as Error & { code?: string };
    if (source?.code) wrapped.code = source.code;
    return wrapped;
  }

  /**
   * Centralized Firebase Error Mapper
   */
  static mapFirebaseError(error: any): string {
    const code = error?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'The email or password you entered is incorrect.';
      case 'auth/email-already-in-use':
        return 'An account with this email address already exists.';
      case 'auth/weak-password':
        return 'The password is too weak. Please choose a stronger password.';
      case 'auth/invalid-email':
        return 'The email address format is invalid.';
      case 'auth/popup-closed-by-user':
      case 'auth/cancelled-popup-request':
        return 'Sign-in cancelled by user.';
      case 'auth/popup-blocked':
        return 'Pop-up blocked by browser. Please enable pop-ups for this site.';
      case 'auth/account-exists-with-different-credential':
        return 'An account already exists with the same email address but different sign-in credentials.';
      case 'auth/too-many-requests':
        return 'Too many unsuccessful requests. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact Nexora support.';
      case 'auth/invalid-phone-number':
        return 'Invalid phone number format. Please check the digits and try again.';
      case 'auth/captcha-check-failed':
      case 'auth/invalid-app-credential':
        return 'Phone verification could not be completed. Please refresh and try again.';
      case 'auth/invalid-verification-code':
        return 'Invalid verification code. Please check and try again.';
      case 'auth/code-expired':
        return 'Verification code has expired. Please request a new one.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled in Firebase Authentication. Ask the project owner to enable the required provider.';
      case 'auth/missing-phone-number':
        return 'Phone number is missing.';
      case 'auth/unauthorized-domain':
        return 'This website is not authorized for Firebase sign-in yet. Add the current domain in Firebase Authentication settings.';
      case 'auth/invalid-api-key':
      case 'auth/app-not-authorized':
      case 'auth/configuration-not-found':
        return 'Firebase Authentication is not configured for this application. Check the project configuration.';
      case 'auth/invalid-action-code':
        return 'This recovery or verification link is invalid or has already been used.';
      default:
        return 'An authentication error occurred. Please try again or contact the account owner.';
    }
  }

  static getRateLimitStatus(identifier: string): RateLimitStatus {
    const key = `nexora_lockout_${identifier.toLowerCase().trim()}`;
    const storage = typeof localStorage === 'undefined' ? null : localStorage;
    if (!storage) return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
    const raw = storage.getItem(key);
    if (!raw) return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };

    try {
      const data = JSON.parse(raw);
      const now = Date.now();
      if (data.lockoutUntil && now < data.lockoutUntil) {
        const remainingSeconds = Math.ceil((data.lockoutUntil - now) / 1000);
        return { isLocked: true, remainingSeconds, attemptsCount: data.attempts || MAX_FAILED_ATTEMPTS };
      }
      if (data.lockoutUntil && now >= data.lockoutUntil) {
        storage.removeItem(key);
        return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
      }
      return { isLocked: false, remainingSeconds: 0, attemptsCount: data.attempts || 0 };
    } catch {
      return { isLocked: false, remainingSeconds: 0, attemptsCount: 0 };
    }
  }

  static recordFailedAttempt(identifier: string): RateLimitStatus {
    const clean = identifier.toLowerCase().trim();
    const key = `nexora_lockout_${clean}`;
    const status = this.getRateLimitStatus(clean);
    const newAttempts = status.attemptsCount + 1;

    if (newAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_TIME_MS;
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify({ attempts: newAttempts, lockoutUntil }));
      }
      
      SecurityNotificationService.notifySecurityEvent(
        'anonymous',
        clean.includes('@') ? clean : '',
        clean,
        'SUSPICIOUS_SIGNIN',
        { browser: navigator.userAgent }
      );

      return { isLocked: true, remainingSeconds: 300, attemptsCount: newAttempts };
    }

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify({ attempts: newAttempts, lockoutUntil: 0 }));
    }
    return { isLocked: false, remainingSeconds: 0, attemptsCount: newAttempts };
  }

  static clearFailedAttempts(identifier: string) {
    const clean = identifier.toLowerCase().trim();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`nexora_lockout_${clean}`);
    }
  }

  /**
   * Login with Email & Password
   */
  static async loginWithEmail(email: string, password: string): Promise<{ firebaseUser: FirebaseUser; user: User }> {
    this.requireConfigured();
    const cleanEmail = email.toLowerCase().trim();
    const rateLimit = this.getRateLimitStatus(cleanEmail);
    if (rateLimit.isLocked) {
      throw new Error(`Account temporarily locked. Please retry in ${rateLimit.remainingSeconds} seconds.`);
    }

    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    } catch (error) {
      this.recordFailedAttempt(cleanEmail);
      throw this.publicAuthError(error);
    }

    const fbUser = credential.user;
    this.clearFailedAttempts(cleanEmail);
    try {
      const userProfile = await ProfileService.getOrCreateProfile(fbUser);
      SecurityNotificationService.notifySecurityEvent(
        fbUser.uid,
        cleanEmail,
        userProfile.name,
        'NEW_LOGIN',
        { browser: navigator.userAgent }
      );
      return { firebaseUser: fbUser, user: userProfile };
    } catch {
      await signOut(auth).catch(() => undefined);
      throw new Error('Authentication succeeded, but your Nexora profile could not be loaded. Please try signing in again.');
    }
  }

  /**
   * Register with Email & Password
   */
  static async registerWithEmail(
    email: string,
    password: string,
    fullName: string,
    username: string
  ): Promise<{ firebaseUser: FirebaseUser; user: User }> {
    this.requireConfigured();
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.toLowerCase().trim();

    let credential;
    try {
      credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    } catch (error) {
      throw this.publicAuthError(error);
    }

    const fbUser = credential.user;
    try {
      try {
        await sendEmailVerification(fbUser);
      } catch {
        console.warn('Email verification could not be sent; check Firebase email action configuration.');
      }

      const userProfile = await ProfileService.createProfile(fbUser.uid, {
        name: fullName.trim(),
        username: cleanUsername,
        isVerified: fbUser.emailVerified
      }, cleanEmail);

      EmailService.sendTransactionalEmail('WELCOME', {
        toEmail: cleanEmail,
        userName: fullName.trim()
      });

      SecurityNotificationService.notifySecurityEvent(
        fbUser.uid,
        cleanEmail,
        fullName.trim(),
        'NEW_LOGIN',
        { browser: navigator.userAgent }
      );

      return { firebaseUser: fbUser, user: userProfile };
    } catch {
      await signOut(auth).catch(() => undefined);
      throw new Error('Your Firebase account was created, but Nexora could not finish the profile setup. Please sign in again to retry.');
    }
  }

  /**
   * Login with Google
   */
  static async loginWithGoogle(): Promise<{ firebaseUser: FirebaseUser; user: User; isNewUser: boolean }> {
    this.requireConfigured();
    let authenticatedUser: FirebaseUser | null = null;
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const credential = await signInWithPopup(auth, provider);
      const fbUser = credential.user;
      authenticatedUser = fbUser;

      let userProfile = await ProfileService.getProfile(fbUser.uid);
      let isNewUser = false;

      if (!userProfile) {
        isNewUser = true;
        userProfile = await ProfileService.createProfile(fbUser.uid, {
          name: fbUser.displayName || 'Google User',
          avatar: fbUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
          isVerified: fbUser.emailVerified
        }, fbUser.email || '');
      }

      SecurityNotificationService.notifySecurityEvent(
        fbUser.uid,
        fbUser.email || '',
        userProfile.name,
        'NEW_LOGIN',
        { browser: navigator.userAgent }
      );

      return { firebaseUser: fbUser, user: userProfile, isNewUser };
    } catch (err: any) {
      if (authenticatedUser) await signOut(auth).catch(() => undefined);
      throw new Error(this.mapFirebaseError(err));
    }
  }

  /**
   * Send Phone Verification Code
   */
  static initRecaptchaVerifier(containerId: string): RecaptchaVerifier {
    if (typeof window === 'undefined') throw new Error('Browser window required');
    if ((window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier.clear();
      } catch (e) {}
    }
    const verifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {}
    });
    (window as any).recaptchaVerifier = verifier;
    return verifier;
  }

  static async sendPhoneCode(phoneNumber: string, verifier: RecaptchaVerifier): Promise<ConfirmationResult> {
    this.requireConfigured();
    try {
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      return confirmationResult;
    } catch (err: any) {
      throw this.publicAuthError(err);
    }
  }

  static async verifyPhoneCode(confirmationResult: ConfirmationResult, code: string): Promise<{ firebaseUser: FirebaseUser; user: User }> {
    this.requireConfigured();
    let authenticatedUser: FirebaseUser | null = null;
    try {
      const credential = await confirmationResult.confirm(code);
      const fbUser = credential.user;
      authenticatedUser = fbUser;

      let userProfile = await ProfileService.getProfile(fbUser.uid);
      if (!userProfile) {
        userProfile = await ProfileService.createProfile(fbUser.uid, {
          name: 'Phone User',
          isVerified: true
        }, fbUser.email || `${fbUser.uid}@phone.auth`);
      }

      SecurityNotificationService.notifySecurityEvent(
        fbUser.uid,
        fbUser.email || '',
        userProfile.name,
        'NEW_LOGIN',
        { browser: navigator.userAgent }
      );

      return { firebaseUser: fbUser, user: userProfile };
    } catch (err: any) {
      if (authenticatedUser) await signOut(auth).catch(() => undefined);
      throw this.publicAuthError(err);
    }
  }

  /**
   * Send Verification Email
   */
  static async sendVerificationEmail(user?: FirebaseUser): Promise<boolean> {
    this.requireConfigured();
    const targetUser = user || auth.currentUser;
    if (!targetUser) throw new Error('No user currently authenticated.');
    try {
      await sendEmailVerification(targetUser);
      if (targetUser.email) {
        await EmailService.sendTransactionalEmail('VERIFY_EMAIL', {
          toEmail: targetUser.email,
          userName: targetUser.displayName || 'Nexora User'
        });
      }
      return true;
    } catch (err: any) {
      throw this.publicAuthError(err);
    }
  }

  /**
   * Refresh Verification Status
   */
  static async refreshVerificationStatus(user?: FirebaseUser): Promise<boolean> {
    if (firebaseConfigError) return false;
    const targetUser = user || auth.currentUser;
    if (!targetUser) return false;
    try {
      await reload(targetUser);
      if (targetUser.emailVerified && db) {
        await ProfileService.updateProfile(targetUser.uid, { isVerified: true });
      }
      return targetUser.emailVerified;
    } catch (err) {
      return false;
    }
  }

  /**
   * Send Password Reset Email
   */
  static async sendPasswordReset(email: string): Promise<boolean> {
    this.requireConfigured();
    const cleanEmail = email.toLowerCase().trim();
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      await EmailService.sendTransactionalEmail('PASSWORD_RESET', {
        toEmail: cleanEmail,
        userName: cleanEmail.split('@')[0]
      });
      return true;
    } catch (error) {
      throw this.publicAuthError(error);
    }
  }

  /**
   * Logout
   */
  static async logout(): Promise<void> {
    this.requireConfigured();
    try {
      await signOut(auth);
    } catch (err: any) {
      throw new Error(this.mapFirebaseError(err));
    }
  }

  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  // --- Legacy Aliases for AuthView compatibility ---
  static async signInWithGoogle() {
    return this.loginWithGoogle();
  }

  static async getUserProfile(uid: string) {
    return ProfileService.getProfile(uid);
  }

  static async createUserProfile(user: User, email: string) {
    return ProfileService.createProfile(user.id, user, email);
  }

  static async sendPhoneSMS(phoneNumber: string, verifier: RecaptchaVerifier) {
    return this.sendPhoneCode(phoneNumber, verifier);
  }

  static async confirmPhoneOTP(confirmationResult: ConfirmationResult, otpCode: string) {
    return this.verifyPhoneCode(confirmationResult, otpCode);
  }

  static async registerUserWithEmail(email: string, pass: string, name: string, username: string) {
    return this.registerWithEmail(email, pass, name, username);
  }

  static async updateUserProfile(userId: string, updates: Partial<User>) {
    return ProfileService.updateProfile(userId, updates);
  }
}
