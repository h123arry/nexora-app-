import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  browserLocalPersistence,
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
  linkWithPopup,
  linkWithCredential,
  linkWithPhoneNumber,
  signOut,
  setPersistence,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { auth, db, firebaseConfigError } from './config';
import { User } from '../../types';
import { ProfileService } from './profileService';
import { EmailService } from './emailService';
import { SecurityNotificationService } from './securityNotificationService';
import { httpsCallable } from 'firebase/functions';
import { functions } from './config';
import { canUpgradeAnonymousBetaSession, hasLinkedProvider, isRecentAuthentication } from './accountLinkingPolicy';
import { isNativeRuntime } from '../../lib/nativeRuntime';
import { apiRequestUrl } from '../../lib/apiBaseUrl';

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

  static getLoginPersistence(_rememberDevice: boolean) {
    // Keep authenticated accounts signed in across refreshes and browser restarts.
    return browserLocalPersistence;
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
        return 'Unable to create an account with these details. Try signing in or recovering your account.';
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
        return 'Unable to use this sign-in method. Try another sign-in method or account recovery.';
      case 'auth/too-many-requests':
        return 'Too many unsuccessful requests. Please try again later.';
      case 'auth/requires-recent-login':
        return 'Please sign in again before changing this password.';
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
      case 'permission-denied':
        return 'Firebase created your account, but Firestore denied profile creation. Your account is safe; the NEXORA database access rules need investigation.';
      case 'unavailable':
        return 'Firebase created your account, but Firestore is temporarily unavailable. Your account is safe; please try signing in again shortly.';
      case 'failed-precondition':
        return 'Firebase created your account, but the database rejected profile setup because a required database condition is not met.';
      case 'unauthenticated':
        return 'Firebase created your account, but Firestore did not receive a valid authenticated session for profile setup.';
      case 'profile-setup-failed':
        return 'Firebase created your account, but NEXORA could not finish setting up your profile. Your account is safe; please try signing in again shortly.';
      case 'functions/resource-exhausted':
        return 'NEXORA Founding Beta is full. All 300 places have been claimed.';
      case 'functions/permission-denied':
        return 'This beta invitation is invalid or has been disabled. Ask the person who invited you for help.';
      case 'functions/invalid-argument':
        return 'This beta invitation link is invalid. Open the complete invitation link you received.';
      case 'functions/failed-precondition':
        return 'Sign in with an email, Google or verified phone account before claiming this invitation.';
      case 'auth/invalid-action-code':
        return 'This recovery or verification link is invalid or has already been used.';
      default: {
        // Keep unknown Firebase failures actionable in the UI. The code is safe to
        // expose and lets us distinguish a rejected Auth request from later profile setup.
        const diagnosticCode = code || 'unknown-error';
        return `Firebase could not complete this request (${diagnosticCode}). Please contact Nexora support with this error code.`;
      }
    }
  }

  /** Device-local UX throttle only; Firebase Auth server protections are authoritative. */
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

  /** Records a local retry delay without treating client storage as an account security boundary. */
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
      
      // This is a device-local UX throttle only. Never send security emails or
      // audit events to a client-supplied identifier after failed credentials.
      // Firebase Authentication's server-side abuse controls remain authoritative.

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

  /** Claim a private beta invitation only after a permanent Firebase sign-in exists. */
  static async claimBetaInvite(code: string): Promise<{ claimed: boolean; alreadyClaimed: boolean; cohort: string }> {
    this.requireConfigured();
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.isAnonymous) {
      throw new Error('Create or sign in to a NEXORA account before claiming this invitation.');
    }
    const cleanCode = code.trim();
    if (!cleanCode) throw new Error('This invitation link is missing its beta access code.');
    try {
      // Linking an email, Google or phone credential to a legacy anonymous UID
      // changes the provider claim. Refresh before the callable inspects it.
      await currentUser.getIdToken(true);
      const claim = httpsCallable<{ code: string }, { claimed: boolean; alreadyClaimed: boolean; cohort: string }>(functions, 'claimBetaInvite');
      const result = await claim({ code: cleanCode });
      await currentUser.getIdToken(true);
      return result.data;
    } catch (error) {
      throw this.publicAuthError(error);
    }
  }

  /**
   * Login with Email & Password
   */
  static async loginWithEmail(email: string, password: string, rememberDevice = true): Promise<{ firebaseUser: FirebaseUser; user: User }> {
    this.requireConfigured();
    const cleanEmail = email.toLowerCase().trim();
    const rateLimit = this.getRateLimitStatus(cleanEmail);
    if (rateLimit.isLocked) {
      throw new Error(`Account temporarily locked. Please retry in ${rateLimit.remainingSeconds} seconds.`);
    }

    if (typeof window !== 'undefined') {
      try {
        await setPersistence(auth, this.getLoginPersistence(rememberDevice));
      } catch (error) {
        throw this.publicAuthError(error);
      }
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
    } catch (profileError: unknown) {
      // Authentication succeeded. Preserve the session and surface the actual
      // Firestore provisioning code so a partial account can be recovered.
      const source = profileError as { code?: string } | null;
      const code = source?.code || 'profile-setup-failed';
      console.error('[NEXORA] Profile load failed after Firebase sign-in', { code });
      const wrapped = new Error(
        `Firebase signed you in, but NEXORA could not load your profile (${code}). Your account is safe; please retry after the database issue is resolved.`
      ) as Error & { code?: string };
      wrapped.code = code;
      throw wrapped;
    }
  }

  /** Request a server-generated, single-use email verification code. */
  static async sendEmailVerificationCode(): Promise<void> {
    this.requireConfigured();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Sign in to request an email verification code.');
    const token = await currentUser.getIdToken();
    const response = await fetch(apiRequestUrl('/api/auth/send-email-otp'), {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'NEXORA could not send your verification code.');
  }

  /** Verify the email code on the server, then refresh Firebase's verified claim. */
  static async verifyEmailVerificationCode(code: string): Promise<void> {
    this.requireConfigured();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Your sign-in session expired. Please sign in and request a new code.');
    const token = await currentUser.getIdToken();
    const response = await fetch(apiRequestUrl('/api/auth/verify-email-otp'), {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ code }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(typeof payload.error === 'string' ? payload.error : 'That verification code could not be confirmed.');
    await reload(currentUser);
    await currentUser.getIdToken(true);
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

    let fbUser: FirebaseUser;
    try {
      const existingUser = auth.currentUser;
      if (existingUser?.isAnonymous) {
        // Upgrade the existing anonymous NEXORA session instead of creating a
        // second UID and abandoning the member's existing profile and activity.
        const linked = await linkWithCredential(
          existingUser,
          EmailAuthProvider.credential(cleanEmail, password)
        );
        fbUser = linked.user;
      } else {
        // Preserve the established standalone signup behaviour when there is
        // no anonymous session to upgrade. Firebase returns email-already-in-use
        // for duplicates, rather than silently reusing another account.
        fbUser = (await createUserWithEmailAndPassword(auth, cleanEmail, password)).user;
      }
    } catch (error) {
      throw this.publicAuthError(error);
    }

    try {
      // Share the exact UID-keyed single-flight provisioning path used by
      // onIdTokenChanged. Signup and auth-state hydration can fire together;
      // they must never race two different default/registration profile writes.
      let userProfile = await ProfileService.getOrCreateProfile(fbUser, {
        name: fullName.trim(),
        username: cleanUsername,
      });

      // If auth-state hydration started first, it may have completed the
      // minimal profile before the signup form supplied its chosen identity.
      // Apply the submitted identity through the existing server-authorized
      // profile mutation path rather than issuing a second create write.
      const identityUpdates: Partial<User> = {};
      if (userProfile.name !== fullName.trim()) identityUpdates.name = fullName.trim();
      if (userProfile.username !== cleanUsername) identityUpdates.username = cleanUsername;
      if (Object.keys(identityUpdates).length) {
        await ProfileService.updateProfile(fbUser.uid, identityUpdates);
        userProfile = { ...userProfile, ...identityUpdates };
      }
      userProfile = { ...userProfile, email: cleanEmail, isVerified: fbUser.emailVerified };

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
    } catch (profileError: unknown) {
      // Firebase Authentication has already created the account. Keep that
      // session available so the user can retry profile provisioning after
      // a transient Firestore/rules issue instead of making the account appear
      // to have vanished behind a generic sign-up failure.
      const source = profileError as { code?: string } | null;
      const code = source?.code || 'profile-setup-failed';
      console.error('[NEXORA] Profile setup failed after Firebase account creation', { code });
      const wrapped = new Error(
        `Your Firebase account is ready, but NEXORA could not finish setting up your profile (${code}). Your account is safe. Please retry shortly.`
      ) as Error & { code?: string };
      wrapped.code = code;
      throw wrapped;
    }
  }

  /**
   * Login with Google
   */
  static async loginWithGoogle(): Promise<{ firebaseUser: FirebaseUser; user: User; isNewUser: boolean }> {
    this.requireConfigured();
    if (isNativeRuntime()) {
      throw new Error('Google sign-in is not enabled in this native build yet. Use an available sign-in method until native OAuth is configured.');
    }
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const existingSession = auth.currentUser;
      const wasAnonymous = Boolean(existingSession?.isAnonymous);
      const credential = existingSession && existingSession.isAnonymous
        ? await linkWithPopup(existingSession, provider)
        : await signInWithPopup(auth, provider);
      const fbUser = credential.user;
      const isNewUser = wasAnonymous || !(await ProfileService.getProfile(fbUser.uid));
      let userProfile = await ProfileService.getOrCreateProfile(fbUser, {
        name: fbUser.displayName || 'Google User',
        avatar: fbUser.photoURL || '',
      });
      const googleProfileUpdates: Partial<User> = {};
      if (isNewUser && userProfile.name !== (fbUser.displayName || 'Google User')) googleProfileUpdates.name = fbUser.displayName || 'Google User';
      if (isNewUser && userProfile.avatar !== (fbUser.photoURL || '')) googleProfileUpdates.avatar = fbUser.photoURL || '';
      if (Object.keys(googleProfileUpdates).length) {
        await ProfileService.updateProfile(fbUser.uid, googleProfileUpdates);
        userProfile = { ...userProfile, ...googleProfileUpdates };
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
      // Keep a successfully authenticated session if profile provisioning fails;
      // the app can retry private-profile synchronization without losing the UID.
      throw this.publicAuthError(err);
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
      const existingSession = auth.currentUser;
      const confirmationResult = existingSession?.isAnonymous
        ? await linkWithPhoneNumber(existingSession, phoneNumber, verifier)
        : await signInWithPhoneNumber(auth, phoneNumber, verifier);
      return confirmationResult;
    } catch (err: any) {
      throw this.publicAuthError(err);
    }
  }

  static async verifyPhoneCode(confirmationResult: ConfirmationResult, code: string): Promise<{ firebaseUser: FirebaseUser; user: User; isNewUser: boolean }> {
    this.requireConfigured();
    try {
      const credential = await confirmationResult.confirm(code);
      const fbUser = credential.user;

      const existingPhoneProfile = await ProfileService.getProfile(fbUser.uid);
      const isNewUser = !existingPhoneProfile
        || existingPhoneProfile.name === 'NEXORA Member'
        || existingPhoneProfile.username.startsWith('member_');
      let userProfile = await ProfileService.getOrCreateProfile(fbUser, {
        name: 'Phone User',
      });
      if (!existingPhoneProfile && userProfile.name !== 'Phone User') {
        await ProfileService.updateProfile(fbUser.uid, { name: 'Phone User' });
        userProfile = { ...userProfile, name: 'Phone User' };
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
      return true;
    } catch (error) {
      if ((error as { code?: string } | null)?.code === 'auth/user-not-found') return true;
      throw this.publicAuthError(error);
    }
  }

  static async updateAccountPassword(currentPassword: string, newPassword: string): Promise<void> {
    this.requireConfigured();
    const currentUser = auth.currentUser;
    if (!currentUser?.email || !currentUser.providerData.some((provider) => provider.providerId === 'password')) {
      throw new Error('Password changes are available only for email/password accounts.');
    }
    if (newPassword.length < 8) throw new Error('Choose a password with at least 8 characters.');
    try {
      await reauthenticateWithCredential(currentUser, EmailAuthProvider.credential(currentUser.email, currentPassword));
      await updatePassword(currentUser, newPassword);
      void SecurityNotificationService.notifySecurityEvent(
        currentUser.uid,
        currentUser.email,
        currentUser.displayName || 'NEXORA member',
        'PASSWORD_CHANGED'
      ).catch(() => console.warn('Password changed successfully; its account notification could not be delivered.'));
    } catch (error) {
      throw this.publicAuthError(error);
    }
  }

  static async reauthenticateForAccountDeletion(password?: string): Promise<void> {
    this.requireConfigured();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Sign in again before requesting account deletion.');

    if (currentUser.providerData.some((provider) => provider.providerId === 'password')) {
      if (!password || !currentUser.email) throw new Error('Enter your current account password to reauthenticate.');
      try {
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);
        await currentUser.getIdToken(true);
        return;
      } catch (error) {
        throw this.publicAuthError(error);
      }
    }

    try {
      const token = await currentUser.getIdTokenResult(true);
      const authTime = Number(token.claims.auth_time);
      if (!Number.isFinite(authTime) || Date.now() / 1000 - authTime > 300) {
        throw new Error('For your safety, sign out and sign in again immediately before requesting account deletion.');
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('For your safety')) throw error;
      throw this.publicAuthError(error);
    }
  }

  private static async unregisterPushForCurrentDevice(): Promise<void> {
    try {
      const { PushNotificationService } = await import('./pushNotificationService');
      await PushNotificationService.unregister();
    } catch (error) {
      // Authentication must remain available even if a stale push token cannot be revoked.
      console.warn('[NEXORA] Could not unregister this device push token before sign-out.', error);
    }
  }

  /**
   * Logout
   */
  static async logout(): Promise<void> {
    this.requireConfigured();
    try {
      await this.unregisterPushForCurrentDevice();
      await signOut(auth);
    } catch (err: any) {
      throw this.publicAuthError(err);
    }
  }

  static getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  private static async requireRecentAccountAuthentication(user: FirebaseUser): Promise<void> {
    const token = await user.getIdTokenResult(true);
    const approvedAnonymousUpgrade = canUpgradeAnonymousBetaSession(
      user.isAnonymous,
      true,
      auth.currentUser?.uid === user.uid,
    );
    // An anonymous member has no existing credential with which to reauthenticate.
    // A refreshed token plus the server-issued beta claim and same active UID are
    // therefore the safe upgrade path; established accounts still require recent auth.
    if (approvedAnonymousUpgrade) return;

    const authTime = Number(token.claims.auth_time);
    if (!isRecentAuthentication(authTime, Date.now() / 1000)) {
      throw new Error('Sign in again immediately before changing your account sign-in methods.');
    }
  }

  static getLinkedProviders(): string[] {
    return (auth.currentUser?.providerData || [])
      .map(provider => provider.providerId)
      .filter(providerId => typeof providerId === 'string' && providerId.length > 0);
  }

  /** Link an email/password credential to the current UID; never create a replacement account. */
  static async linkEmailAccount(email: string, password: string): Promise<void> {
    this.requireConfigured();
    const currentUser = auth.currentUser;
    const cleanEmail = email.trim().toLowerCase();
    if (!currentUser) throw new Error('Sign in before adding an email address.');
    if (hasLinkedProvider(currentUser.providerData.map(provider => provider.providerId), EmailAuthProvider.PROVIDER_ID)) {
      throw new Error('An email and password sign-in method is already connected to this account.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) throw new Error('Enter a valid email address.');
    if (password.length < 8) throw new Error('Choose a password with at least 8 characters.');
    await this.requireRecentAccountAuthentication(currentUser);
    try {
      const result = await linkWithCredential(currentUser, EmailAuthProvider.credential(cleanEmail, password));
      await sendEmailVerification(result.user);
      await result.user.getIdToken(true);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
        throw new Error('That email already belongs to another NEXORA account. Sign in to that account instead; NEXORA will not merge accounts automatically.');
      }
      throw this.publicAuthError(error);
    }
  }

  /** Begin SMS verification by linking the phone credential to the existing UID. */
  static async sendPhoneLinkCode(phoneNumber: string, verifier: RecaptchaVerifier): Promise<ConfirmationResult> {
    this.requireConfigured();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Sign in before adding a phone number.');
    if (hasLinkedProvider(currentUser.providerData.map(provider => provider.providerId), 'phone')) {
      throw new Error('A phone sign-in method is already connected to this account.');
    }
    await this.requireRecentAccountAuthentication(currentUser);
    try {
      return await linkWithPhoneNumber(currentUser, phoneNumber, verifier);
    } catch (error) {
      throw this.publicAuthError(error);
    }
  }

  static async confirmPhoneLink(confirmation: ConfirmationResult, code: string): Promise<void> {
    this.requireConfigured();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Sign in before confirming a phone number.');
    await this.requireRecentAccountAuthentication(currentUser);
    try {
      const result = await confirmation.confirm(code.trim());
      await result.user.getIdToken(true);
    } catch (error) {
      const codeValue = (error as { code?: string })?.code;
      if (codeValue === 'auth/credential-already-in-use' || codeValue === 'auth/phone-number-already-exists') {
        throw new Error('That phone number is already connected to another NEXORA account. Sign in to that account instead.');
      }
      throw this.publicAuthError(error);
    }
  }

  /** Link Google to the currently signed-in account; never create or merge a second NEXORA account. */
  static async revokeAllSessions(): Promise<void> {
    this.requireConfigured();
    if (!auth.currentUser) throw new Error('Sign in before revoking active sessions.');
    const revoke = httpsCallable(functions, 'revokeAllSessions');
    try {
      await this.unregisterPushForCurrentDevice();
      await revoke({});
      await signOut(auth);
    } catch (error) {
      throw this.publicAuthError(error);
    }
  }

  static async linkGoogleAccount(): Promise<string[]> {
    this.requireConfigured();
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('Sign in before connecting a Google account.');
    if (isNativeRuntime()) {
      throw new Error('Google account linking is not available in this native build yet.');
    }
    if (hasLinkedProvider(currentUser.providerData.map(provider => provider.providerId), GoogleAuthProvider.PROVIDER_ID)) {
      return this.getLinkedProviders();
    }

    await this.requireRecentAccountAuthentication(currentUser);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await linkWithPopup(currentUser, provider);
      await result.user.getIdToken(true);
      return result.user.providerData.map(item => item.providerId);
    } catch (error) {
      const code = (error as { code?: string })?.code;
      if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
        throw new Error('That Google account is already connected to another NEXORA account. Sign in to that account instead.');
      }
      throw this.publicAuthError(error);
    }
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
