import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, ArrowLeft, Smartphone, Lock, Mail, User as UserIcon, X, 
  ShieldCheck, FileText, Globe, Sparkles, Eye, EyeOff, Check, 
  Search, RefreshCw, AlertCircle, Camera, CheckCircle2, ChevronDown,
  Flame, HelpCircle
} from 'lucide-react';

import { User } from '../types';
import NexoraBranding from './NexoraBranding';
import NexoraLoader from './NexoraLoader';
import VohIcon from './VohIcon';
import { checkUsernameStatus, UsernameStatus } from '../utils/username';
import { auth } from '../services/firebase/config';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  ConfirmationResult,
  sendEmailVerification
} from 'firebase/auth';
import { AuthService } from '../services/firebase/authService';
import { EmailService } from '../services/firebase/emailService';
import { SecurityNotificationService } from '../services/firebase/securityNotificationService';

interface AuthViewProps {
  onLoginSuccess: (loggedUser: User) => void;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'
];

const COUNTRIES = [
  { code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: '+31', name: 'Netherlands', flag: '🇳🇱' }
];

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  // Navigation & Auth Flow Modes
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot_password'>('login');
  
  // Method selection in signup: 'choose' | 'email' | 'phone'
  const [signupMethod, setSignupMethod] = useState<'choose' | 'email' | 'phone'>('choose');

  // Login & Registration Inputs
  const [identifierInput, setIdentifierInput] = useState(''); // Email / Username / Phone
  const [detectedType, setDetectedType] = useState<'email' | 'username' | 'phone'>('username');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Signup fields
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Phone Auth states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]); // USA default
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [phoneConfirmationResult, setPhoneConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Forgot Password states
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryStep, setRecoveryStep] = useState<1 | 2>(1); // 1: Email, 2: Sent
  
  // Status & UI feedback
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Google Account Picker Modal state
  // REMOVED: Using native Firebase picker flow
  
  // Onboarding Wizard states (after signup / new Google user)
  const [onboardingUser, setOnboardingUser] = useState<User | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1); // 1: Username, 2: Photo, 3: Interests
  
  // Step 1 Username
  const [onboardingUsername, setOnboardingUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>({
    status: 'empty',
    message: 'Please choose a username handle.',
    suggestions: []
  });

  // Step 2 Avatar
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // Policy Modal
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyTab, setPolicyTab] = useState<'terms' | 'privacy'>('terms');

  // Detect input type intelligently for login identifier
  useEffect(() => {
    const val = identifierInput.trim();
    if (!val) {
      setDetectedType('username');
      return;
    }

    if (val.includes('@')) {
      setDetectedType('email');
    } else if (/^[\d\+\-\s\(\)]+$/.test(val) && val.replace(/\D/g, '').length >= 7) {
      setDetectedType('phone');
    } else {
      setDetectedType('username');
    }
  }, [identifierInput]);

  // Username validation effect during onboarding
  useEffect(() => {
    if (onboardingUser) {
      const res = checkUsernameStatus(onboardingUsername, onboardingUser.id);
      setUsernameStatus(res);
    }
  }, [onboardingUsername, onboardingUser]);

  // OTP Timer countdown
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Clear messages on mode switch
  const switchAuthMode = (mode: 'login' | 'signup' | 'forgot_password') => {
    setAuthMode(mode);
    setSignupMethod('choose');
    setErrorMsg('');
    setSuccessMsg('');
    setIsPending(false);
    setSmsSent(false);
    setVerificationCode('');
    setRecoveryStep(1);
  };

  // Google Sign In Handler
  const handleGoogleSignInClick = async () => {
    setErrorMsg('');
    setIsPending(true);
    setStatusMessage('Opening Google Account Picker...');

    try {
      const provider = new GoogleAuthProvider();
      // Forces the Google account chooser native interface
      provider.setCustomParameters({ prompt: 'select_account' });
      
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        // Reuse the logic that checks registry and handles user login/onboarding
        await handleSelectGoogleAccount(
          result.user.email || '',
          result.user.displayName || '',
          result.user.photoURL || ''
        );
      }
    } catch (error: any) {
      console.error('Google Auth Error:', error);
      setIsPending(false);
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Sign-in cancelled.');
      } else {
        setErrorMsg('Google Sign-In failed. Please try again.');
      }
    }
  };

  // Select account from Google Picker
  const handleSelectGoogleAccount = async (accountEmail: string, accountName: string, accountAvatar: string) => {
    setShowGooglePicker(false);
    setIsPending(true);
    setStatusMessage(`Connecting with Google (${accountEmail})...`);

    // Attempt real Firebase Google Auth popup if available, fallback gracefully
    try {
      if (auth && auth.app) {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        // Attempt popup if supported
        try {
          const res = await signInWithPopup(auth, provider);
          if (res.user) {
            const fbUser = res.user;
            const registry = loadAccounts();
            const cleanEmail = (fbUser.email || accountEmail).toLowerCase().trim();
            const found = registry.find(a => a.email.toLowerCase() === cleanEmail);

            setIsPending(false);
            if (found) {
              onLoginSuccess(found.user);
              return;
            } else {
              // Create profile for Google user
              const newUser: User = {
                id: fbUser.uid || `user-google-${Date.now()}`,
                username: (fbUser.email?.split('@')[0] || accountEmail.split('@')[0] || 'google_user').toLowerCase().replace(/[^a-z0-9_]/g, ''),
                name: fbUser.displayName || accountName || 'Google User',
                avatar: fbUser.photoURL || accountAvatar,
                bio: '',
                location: 'Global',
                website: '',
                followers: 0,
                following: 0,
                sparks: 0,
                isVerified: false,
                coverImage: '',
                joinedDate: 'Joined July 2026',
                reputationPoints: 0,
                reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
                interestDNA: {},
                skills: []
              };

              const updated = [...registry, { email: cleanEmail, passwordHash: 'google_oauth_pass', user: newUser }];
              localStorage.setItem('nexora_registered_accounts', JSON.stringify(updated));

              // Launch onboarding for username and interests
              setOnboardingUser(newUser);
              setOnboardingUsername(newUser.username);
              setOnboardingStep(1);
              return;
            }
          }
        } catch (popupErr) {
          console.warn('Firebase Popup skipped or closed, proceeding with standard Google credentials:', popupErr);
        }
      }
    } catch (e) {
      console.warn('Firebase Google Auth fallback:', e);
    }

    // Standard smooth Google auth flow fallback
    setTimeout(() => {
      const registry = loadAccounts();
      const cleanEmail = accountEmail.toLowerCase().trim();
      const found = registry.find(a => a.email.toLowerCase() === cleanEmail);

      setIsPending(false);

      if (found) {
        onLoginSuccess(found.user);
      } else {
        const newUser: User = {
          id: `user-google-${Date.now()}`,
          username: cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, ''),
          name: accountName,
          avatar: accountAvatar,
          bio: '',
          location: 'Global',
          website: '',
          followers: 0,
          following: 0,
          sparks: 0,
          isVerified: false,
          coverImage: '',
          joinedDate: 'Joined July 2026',
          reputationPoints: 0,
          reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
          interestDNA: {},
          skills: []
        };

        const updated = [...registry, { email: cleanEmail, passwordHash: 'google_oauth_pass', user: newUser }];
        localStorage.setItem('nexora_registered_accounts', JSON.stringify(updated));

        setOnboardingUser(newUser);
        setOnboardingUsername(newUser.username);
        setOnboardingStep(1);
      }
    }, 1200);
  };

  // Handle Unified Intelligent Login
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifierInput.trim()) {
      setErrorMsg('Please enter your email, username, or phone number.');
      return;
    }
    if (!passwordInput) {
      setErrorMsg('Please enter your password.');
      return;
    }

    const query = identifierInput.trim().toLowerCase();

    // Rate Limiting Check
    const rateLimit = AuthService.getRateLimitStatus(query);
    if (rateLimit.isLocked) {
      setErrorMsg(`🔒 Account temporarily rate-limited due to multiple failed attempts. Please retry in ${rateLimit.remainingSeconds} seconds.`);
      return;
    }

    setIsPending(true);
    setStatusMessage('Verifying credentials via Firebase Authentication...');

    const processLoginResult = async (user: User) => {
      AuthService.clearFailedAttempts(query);
      if (rememberMe) {
        localStorage.setItem('nexora_remembered_identifier', identifierInput);
      } else {
        localStorage.removeItem('nexora_remembered_identifier');
      }

      // Notify security event
      SecurityNotificationService.notifySecurityEvent(
        user.id,
        user.email || '',
        user.name,
        'NEW_LOGIN',
        { browser: navigator.userAgent }
      );

      onLoginSuccess(user);
    };

    // Attempt Firebase Email/Password Authentication
    signInWithEmailAndPassword(auth, query, passwordInput)
      .then(async (userCredential) => {
        setIsPending(false);
        const fbUser = userCredential.user;
        
        // Fetch real user profile from Firestore
        let userProfile = await AuthService.getUserProfile(fbUser.uid);
        
        if (!userProfile) {
          console.warn('Profile missing for user, creating default profile:', fbUser.uid);
          // Create default profile
          const defaultUser: User = {
            id: fbUser.uid,
            username: fbUser.email?.split('@')[0] || `user_${fbUser.uid.substring(0,5)}`,
            name: fbUser.displayName || 'Nexora User',
            avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
            bio: '',
            location: 'Global',
            website: '',
            followers: 0,
            following: 0,
            sparks: 0,
            isVerified: fbUser.emailVerified,
            coverImage: '',
            joinedDate: `Joined ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
            reputationPoints: 0,
            reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
            interestDNA: {},
            skills: []
          };
          
          // Re-create user in Firestore
          await AuthService.createUserProfile(defaultUser, fbUser.email || '');
          userProfile = defaultUser;
        }
        
        processLoginResult(userProfile);
      })
      .catch((fbErr: any) => {
        setIsPending(false);
        console.error("Firebase Authentication Error (Email Login):", {
          code: fbErr.code,
          message: fbErr.message,
          stack: fbErr.stack,
        });
        const lock = AuthService.recordFailedAttempt(query);
        if (lock.isLocked) {
          setErrorMsg(`🔒 Security limit reached. Account locked for 5 minutes.`);
        } else if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/user-not-found' || fbErr.code === 'auth/invalid-credential') {
          setErrorMsg(`The email or password you entered is incorrect. (${MAX_FAILED_ATTEMPTS - lock.attemptsCount} attempts remaining)`);
        } else {
          setErrorMsg(`Authentication failed: ${fbErr.message || 'Please try again.'}`);
        }
      });
  };

  // Handle Phone OTP Request (Production Firebase SMS Auth)
  const handlePhoneOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!phoneNumber.trim() || phoneNumber.trim().length < 7) {
      setErrorMsg('Please enter a valid phone number.');
      return;
    }

    setIsPending(true);
    const fullPhone = `${selectedCountry.code}${phoneNumber.trim()}`;
    setStatusMessage(`Sending SMS verification code to ${fullPhone}...`);

    try {
      // Initialize Firebase RecaptchaVerifier
      const verifier = AuthService.initRecaptchaVerifier('recaptcha-container');
      const confirmationResult = await AuthService.sendPhoneSMS(fullPhone, verifier);
      
      setPhoneConfirmationResult(confirmationResult);
      setIsPending(false);
      setSmsSent(true);
      setOtpCountdown(60);
      setVerificationCode(''); // Never auto-fill or display OTP code
      setSuccessMsg('SMS verification code sent to your phone.');
    } catch (err: any) {
      console.error('Firebase Phone Auth SMS error:', {
        code: err.code,
        message: err.message,
        stack: err.stack,
      });
      setIsPending(false);
      
      if (err.code === 'auth/invalid-phone-number') {
        setErrorMsg('Invalid phone number format. Please check the digits and try again.');
      } else if (err.code === 'auth/captcha-check-failed' || err.code === 'auth/invalid-app-credential') {
        setErrorMsg('Phone verification reCAPTCHA check failed. Please refresh and try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setErrorMsg('Too many SMS requests sent to this number. Please wait before trying again.');
      } else {
        setErrorMsg(`Phone SMS verification failed: ${err.message || 'Please ensure Firebase Phone Authentication is enabled in your Firebase Console.'}`);
      }
    }
  };

  // Handle Phone OTP Verify (Production Firebase SMS Verification)
  const handlePhoneOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanCode = verificationCode.trim();
    if (cleanCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code sent to your SMS inbox.');
      return;
    }

    setIsPending(true);
    setStatusMessage('Verifying security code...');

    try {
      if (phoneConfirmationResult) {
        // Verify code with real Firebase Auth ConfirmationResult
        const { user: nexoraUser } = await AuthService.confirmPhoneOTP(phoneConfirmationResult, cleanCode);

        setIsPending(false);
        onLoginSuccess(nexoraUser);

      } else {
        throw new Error('No active SMS confirmation session. Please request a new verification code.');
      }
    } catch (err: any) {
      console.error('Phone OTP verification error:', {
        code: err.code,
        message: err.message,
        stack: err.stack,
      });
      setIsPending(false);
      if (err.code === 'auth/invalid-verification-code') {
        setErrorMsg('Invalid verification code. Please check the SMS message and enter the correct 6-digit code.');
      } else if (err.code === 'auth/code-expired') {
        setErrorMsg('Verification code has expired. Please tap "Resend SMS Code" to receive a new code.');
      } else {
        setErrorMsg(`Verification failed: ${err.message || 'Please check the code and try again.'}`);
      }
    }
  };

  // Handle Email Account Signup Submit
  const handleEmailSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!signupName.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (signupPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg('Please accept Nexora Terms of Service and Privacy Policy.');
      return;
    }

    setIsPending(true);
    setStatusMessage('Creating your Nexora account...');

    const cleanEmail = signupEmail.toLowerCase().trim();
    const defaultUsername = cleanEmail.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '');

    try {
      // Use production-ready registration
      const res = await AuthService.registerUserWithEmail(
        cleanEmail,
        signupPassword,
        signupName.trim(),
        defaultUsername
      );

      // Onboarding transition
      setIsPending(false);
      setOnboardingUser(res.user);
      setOnboardingUsername(res.user.username);
      setOnboardingStep(1);
    } catch (firebaseErr: any) {
      setIsPending(false);
      console.error('Firebase registration error:', {
        code: firebaseErr.code,
        message: firebaseErr.message,
        stack: firebaseErr.stack,
      });
      if (firebaseErr.code === 'auth/email-already-in-use') {
        setErrorMsg('An account with this email address already exists.');
      } else {
        setErrorMsg(`Failed to create account: ${firebaseErr.message || 'Please try again later.'}`);
      }
    }
  };

  // Password strength meter calculation
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { label: '', color: '', percent: 0 };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { label: 'Weak', color: 'bg-rose-500', percent: 25 };
    if (score === 2) return { label: 'Fair', color: 'bg-amber-500', percent: 50 };
    if (score === 3) return { label: 'Good', color: 'bg-blue-500', percent: 75 };
    return { label: 'Strong', color: 'bg-emerald-500', percent: 100 };
  };

  // Forgot Password Submit Handler (Production Email Verification & Password Recovery System)
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (recoveryStep === 1) {
      if (!recoveryIdentifier.trim()) {
        setErrorMsg('Please enter your account email address or username.');
        return;
      }
      setIsPending(true);
      setStatusMessage('Locating account and generating secure one-time verification code...');

      const query = recoveryIdentifier.trim().toLowerCase();
      const registry = loadAccounts();
      const matchedAccount = registry.find(a => a.email.toLowerCase() === query || a.user.username.toLowerCase() === query);

      const targetEmail = matchedAccount ? matchedAccount.email : (query.includes('@') ? query : '');
      const targetName = matchedAccount ? matchedAccount.user.name : query.split('@')[0];

      if (!targetEmail || !targetEmail.includes('@')) {
        setIsPending(false);
        setErrorMsg('Please enter a valid email address associated with your account.');
        return;
      }

      try {
        // Dispatch secure server-side OTP via /api/auth/send-email-otp
        await AuthService.sendEmailOtp(targetEmail, 'PASSWORD_RESET', targetName);

        // Also trigger Firebase Auth password reset email link if configured
        try {
          await AuthService.sendPasswordReset(targetEmail);
        } catch (fbErr) {
          console.warn('Firebase Password Reset link trigger warning:', fbErr);
        }

        setIsPending(false);
        setRecoveryCode(''); // Never pre-fill or display OTP code
        setRecoveryStep(2);
        setSuccessMsg(`A 6-digit verification code has been dispatched to ${targetEmail}. Please check your email inbox.`);
      } catch (err: any) {
        setIsPending(false);
        setErrorMsg(err.message || 'Failed to send password reset verification code. Please try again.');
      }
    } else if (recoveryStep === 2) {
      const cleanCode = recoveryCode.trim();
      if (cleanCode.length !== 6) {
        setErrorMsg('Please enter the complete 6-digit verification code sent to your email.');
        return;
      }

      setIsPending(true);
      setStatusMessage('Verifying code against security servers...');

      const query = recoveryIdentifier.trim().toLowerCase();
      const registry = loadAccounts();
      const matchedAccount = registry.find(a => a.email.toLowerCase() === query || a.user.username.toLowerCase() === query);
      const targetEmail = matchedAccount ? matchedAccount.email : (query.includes('@') ? query : '');

      try {
        // Verify submitted OTP against hashed OTP in server memory
        await AuthService.verifyEmailOtp(targetEmail, cleanCode, 'PASSWORD_RESET');

        setIsPending(false);
        setRecoveryStep(3);
        setSuccessMsg('Code verified successfully. Please enter your new password.');
      } catch (err: any) {
        setIsPending(false);
        setErrorMsg(err.message || 'Invalid or expired verification code. Please try again.');
      }
    } else if (recoveryStep === 3) {
      if (newPassword.length < 8) {
        setErrorMsg('Password must be at least 8 characters.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setIsPending(true);
      setStatusMessage('Updating password securely...');

      try {
        // Attempt update with Firebase Auth if logged in
        try {
          await AuthService.changeUserPassword(newPassword);
        } catch (e) {}

        const registry = loadAccounts();
        const query = recoveryIdentifier.trim().toLowerCase();
        let targetUserId = 'user';
        let targetEmail = query.includes('@') ? query : '';
        let targetName = 'User';

        const updated = registry.map(acc => {
          if (acc.email.toLowerCase() === query || acc.user.username.toLowerCase() === query) {
            targetUserId = acc.user.id;
            targetEmail = acc.email;
            targetName = acc.user.name;
            return { ...acc, passwordHash: newPassword };
          }
          return acc;
        });

        localStorage.setItem('nexora_registered_accounts', JSON.stringify(updated));

        if (targetEmail) {
          EmailService.sendTransactionalEmail('SECURITY_ALERT_PASSWORD', {
            toEmail: targetEmail,
            userName: targetName
          });

          SecurityNotificationService.notifySecurityEvent(
            targetUserId,
            targetEmail,
            targetName,
            'PASSWORD_CHANGED'
          );
        }

        setIsPending(false);
        setSuccessMsg('Your password has been updated successfully! You can now log in.');

        setTimeout(() => {
          switchAuthMode('login');
          setIdentifierInput(targetEmail || query);
          setPasswordInput('');
        }, 1500);
      } catch (err: any) {
        setIsPending(false);
        setErrorMsg(err.message || 'Failed to update password.');
      }
    }
  };

  // Onboarding Step 1: Save Username
  const handleSaveUsername = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardingUser) return;

    if (usernameStatus.status !== 'available') {
      setErrorMsg(usernameStatus.message);
      return;
    }

    const updatedUser: User = {
      ...onboardingUser,
      username: onboardingUsername.trim().toLowerCase()
    };
    setOnboardingUser(updatedUser);
    setErrorMsg('');
    setOnboardingStep(2);
  };

  // Onboarding Step 2: Profile Photo Upload / Selection
  const handleAvatarSelect = (url: string) => {
    setSelectedAvatar(url);
    setCustomAvatarUrl('');
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const resultStr = uploadEvent.target.result as string;
          setCustomAvatarUrl(resultStr);
          setSelectedAvatar(resultStr);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAvatar = () => {
    if (!onboardingUser) return;
    const updatedUser: User = {
      ...onboardingUser,
      avatar: selectedAvatar
    };
    setOnboardingUser(updatedUser);
    setOnboardingStep(3);
  };

  // Onboarding Step 3: Interests Selection Finish
  const toggleInterest = (topicLabel: string) => {
    setSelectedInterests(prev => 
      prev.includes(topicLabel) ? prev.filter(t => t !== topicLabel) : [...prev, topicLabel]
    );
  };

  const handleCompleteOnboarding = () => {
    if (!onboardingUser) return;

    const interestDNAObj = selectedInterests.reduce((acc, topic) => {
      acc[topic.toLowerCase()] = 99;
      return acc;
    }, {} as Record<string, number>);

    const finalUser: User = {
      ...onboardingUser,
      interestDNA: interestDNAObj
    };

    // Save user in registry
    const registry = loadAccounts();
    const updated = registry.map(a => a.user.id === finalUser.id ? { ...a, user: finalUser } : a);
    localStorage.setItem('nexora_registered_accounts', JSON.stringify(updated));
    localStorage.setItem('nexora_just_signed_up', 'true');

    // Launch into home feed!
    onLoginSuccess(getRichUser(finalUser));
  };

  // Render Onboarding Screen if new user onboarding is active
  if (onboardingUser) {
    return (
      <div className="min-h-screen bg-[#04020a] text-white flex flex-col justify-center items-center p-4 sm:p-8 relative overflow-hidden font-sans">
        {/* Background ambient lighting */}
        <div className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-15%] right-[20%] w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="w-full max-w-lg z-10">
          <div className="flex flex-col items-center mb-6 text-center">
            <NexoraBranding size="lg" showSubtitle={false} className="mb-3" />
            <div className="flex items-center gap-1.5 bg-violet-950/60 border border-white/10 px-3 py-1 rounded-full">
              <span className="text-[10px] font-mono uppercase tracking-widest text-violet-300 font-bold">
                Account Setup • Step {onboardingStep} of 3
              </span>
            </div>
          </div>

          <motion.div 
            key={`onboarding-step-${onboardingStep}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="bg-[#0a0718]/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          >
            {/* Step 1: Choose Username */}
            {onboardingStep === 1 && (
              <form onSubmit={handleSaveUsername} className="space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Choose Your Username</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Your unique handle on Nexora. You can change this anytime.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 block">Username Handle</label>
                  <div className="relative flex items-center">
                    <span className="absolute left-4 text-violet-400 font-bold text-sm">@</span>
                    <input 
                      type="text"
                      value={onboardingUsername}
                      onChange={(e) => setOnboardingUsername(e.target.value.toLowerCase().trim())}
                      placeholder="username"
                      maxLength={20}
                      className="w-full pl-9 pr-10 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-sm font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all"
                    />
                    {usernameStatus.status === 'available' && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute right-3.5" />
                    )}
                  </div>

                  {/* Status Indicator */}
                  {onboardingUsername && (
                    <div className="flex items-center gap-2 mt-2 text-xs font-semibold">
                      {usernameStatus.status === 'available' && (
                        <span className="text-emerald-400 flex items-center gap-1 bg-emerald-950/40 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                          ✓ Available
                        </span>
                      )}
                      {usernameStatus.status === 'taken' && (
                        <span className="text-rose-400 bg-rose-950/40 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                          Already taken
                        </span>
                      )}
                      {usernameStatus.status === 'too_short' && (
                        <span className="text-amber-400 bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          Username too short
                        </span>
                      )}
                      {usernameStatus.status === 'too_long' && (
                        <span className="text-amber-400 bg-amber-950/40 border border-amber-500/20 px-2.5 py-1 rounded-lg">
                          Username too long
                        </span>
                      )}
                      {usernameStatus.status === 'invalid_chars' && (
                        <span className="text-rose-400 bg-rose-950/40 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                          {usernameStatus.message}
                        </span>
                      )}
                      {usernameStatus.status === 'reserved' && (
                        <span className="text-rose-400 bg-rose-950/40 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                          Reserved handle
                        </span>
                      )}
                    </div>
                  )}

                  {/* Suggestions list */}
                  {usernameStatus.suggestions.length > 0 && (
                    <div className="mt-3 p-3 bg-violet-950/30 border border-white/10 rounded-2xl">
                      <span className="text-[10px] font-mono text-violet-300 uppercase font-bold block mb-2">
                        Suggested Handles:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {usernameStatus.suggestions.map((sug) => (
                          <button
                            key={sug}
                            type="button"
                            onClick={() => setOnboardingUsername(sug)}
                            className="px-3 py-1 bg-violet-600/20 hover:bg-violet-600/40 border border-white/10 text-violet-200 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer"
                          >
                            @{sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={usernameStatus.status !== 'available'}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 disabled:opacity-40 text-white font-bold rounded-2xl text-sm transition-all shadow-[0_4px_20px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* Step 2: Profile Photo (Optional) */}
            {onboardingStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Add Profile Photo</h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Choose a profile picture or select one of our default avatars.
                  </p>
                </div>

                {/* Avatar Preview */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative group">
                    <img 
                      src={selectedAvatar} 
                      alt="Avatar preview" 
                      className="w-24 h-24 rounded-full object-cover border-2 border-violet-500 shadow-[0_0_25px_rgba(139,92,246,0.4)]"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-full border-2 border-[#0a0718] shadow-md transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*"
                      onChange={handleCustomAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">@{onboardingUser.username}</span>
                </div>

                {/* Preset Avatars */}
                <div>
                  <span className="text-xs font-bold text-zinc-300 block mb-2">Preset Avatars</span>
                  <div className="grid grid-cols-6 gap-2">
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAvatarSelect(url)}
                        className={`p-1 rounded-full border-2 transition-all cursor-pointer overflow-hidden ${selectedAvatar === url ? 'border-violet-500 scale-110 shadow-[0_0_12px_rgba(139,92,246,0.5)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                      >
                        <img src={url} alt={`Preset ${idx}`} className="w-10 h-10 rounded-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setOnboardingStep(3)}
                    className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Skip for now
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveAvatar}
                    className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(139,92,246,0.3)] cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Select Interests */}
            {onboardingStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">
                    What would you like to discover on Nexora?
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select topics that help shape your first experience. You can always change these later.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-violet-600/30">
                  {INTEREST_TOPICS.map((topic) => {
                    const isSelected = selectedInterests.includes(topic.label);
                    return (
                      <button
                        key={topic.label}
                        type="button"
                        onClick={() => toggleInterest(topic.label)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-violet-600/30 border-violet-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.25)]' 
                            : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{topic.icon}</span>
                          <span className="text-xs font-bold leading-tight">{topic.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleCompleteOnboarding}
                  className="w-full py-4 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-violet-600 hover:opacity-90 text-white font-black rounded-2xl text-sm uppercase tracking-wider transition-all shadow-[0_4px_25px_rgba(139,92,246,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <VohIcon size={18} animated />
                  <span>Welcome to Nexora • Enter Home Feed</span>
                </button>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // Primary Login / Signup / Password Recovery Screen
  return (
    <div id="auth-main-viewport" className="min-h-screen bg-[#04020a] text-white flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#110a29_1px,transparent_1px),linear-gradient(to_bottom,#110a29_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 pointer-events-none" />

      {/* Header */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between z-10 py-2">
        <NexoraBranding size="md" showSubtitle={false} />
        <button
          onClick={() => setShowPolicyModal(true)}
          className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Terms & Privacy</span>
        </button>
      </div>

      {/* Main Form Container */}
      <div className="max-w-md w-full mx-auto z-10 my-auto py-6">
        <motion.div
          key={authMode}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          className="bg-[#0a0718]/80 border border-white/10 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
        >
          {/* Error & Success Messages */}
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-950/60 border border-rose-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-emerald-950/60 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Pending Overlay */}
          {isPending && (
            <div className="mb-5 p-4 bg-violet-950/60 border border-white/10 rounded-2xl flex items-center gap-3 text-xs text-violet-200">
              <RefreshCw className="w-4 h-4 text-violet-400 animate-spin shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* ---------------- LOGIN MODE ---------------- */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Welcome back</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Log in to your Nexora account to continue
                </p>
              </div>

              {/* Identifier Input (Intelligent Detection) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-300">Email, Username, or Phone</label>
                  <span className="text-[10px] font-mono text-violet-400 uppercase font-bold flex items-center gap-1">
                    {detectedType === 'email' && <><Mail className="w-3 h-3" /> Email</>}
                    {detectedType === 'phone' && <><Smartphone className="w-3 h-3" /> Phone</>}
                    {detectedType === 'username' && <><UserIcon className="w-3 h-3" /> Username</>}
                  </span>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={identifierInput}
                    onChange={(e) => setIdentifierInput(e.target.value)}
                    placeholder="e.g. name@example.com, @username, or +1..."
                    required
                    className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all"
                  />
                  <div className="absolute right-3.5 text-zinc-500">
                    {detectedType === 'email' && <Mail className="w-4 h-4 text-violet-400" />}
                    {detectedType === 'phone' && <Smartphone className="w-4 h-4 text-violet-400" />}
                    {detectedType === 'username' && <UserIcon className="w-4 h-4 text-violet-400" />}
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-300">Password</label>
                  <button
                    type="button"
                    onClick={() => switchAuthMode('forgot_password')}
                    className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter password"
                    required
                    className="w-full pl-4 pr-11 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-white/20 bg-black/40 text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <label htmlFor="remember-me" className="text-xs text-zinc-300 cursor-pointer select-none">
                  Remember this device
                </label>
              </div>

              {/* Login Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl text-sm transition-all shadow-[0_4px_20px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span>Log In</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Divider */}
              <div className="relative my-6 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <span className="relative bg-[#0a0718] px-3 text-[11px] font-mono uppercase text-zinc-500 tracking-wider">
                  or continue with
                </span>
              </div>

              {/* Alternative Auth Methods */}
              <div className="grid grid-cols-2 gap-3">
                {/* Official Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignInClick}
                  className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>

                {/* Phone Auth Option */}
                <button
                  type="button"
                  onClick={() => {
                    switchAuthMode('signup');
                    setSignupMethod('phone');
                  }}
                  className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>Phone</span>
                </button>
              </div>

              {/* Bottom Switch to Signup */}
              <div className="pt-2 text-center text-xs text-zinc-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => switchAuthMode('signup')}
                  className="text-violet-400 font-bold hover:underline transition-all cursor-pointer"
                >
                  Sign up
                </button>
              </div>
            </form>
          )}

          {/* ---------------- SIGNUP MODE ---------------- */}
          {authMode === 'signup' && (
            <div className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Create an Account</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  Join Nexora to connect, create, and discover
                </p>
              </div>

              {/* Method Chooser */}
              {signupMethod === 'choose' && (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignInClick}
                    className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-3 transition-all cursor-pointer"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupMethod('phone')}
                    className="w-full py-3.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-white flex items-center justify-center gap-3 transition-all cursor-pointer"
                  >
                    <Smartphone className="w-5 h-5 text-violet-400 shrink-0" />
                    <span>Continue with Phone</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupMethod('email')}
                    className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-3 transition-all shadow-[0_4px_20px_rgba(139,92,246,0.3)] cursor-pointer"
                  >
                    <Mail className="w-5 h-5 shrink-0" />
                    <span>Continue with Email</span>
                  </button>

                  <div className="pt-4 text-center text-xs text-zinc-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => switchAuthMode('login')}
                      className="text-violet-400 font-bold hover:underline cursor-pointer"
                    >
                      Log in
                    </button>
                  </div>
                </div>
              )}

              {/* Email Signup Form */}
              {signupMethod === 'email' && (
                <form onSubmit={handleEmailSignupSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Full Name</label>
                    <input
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      required
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Email Address</label>
                    <input
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Password</label>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        required
                        className="w-full pl-4 pr-11 py-3 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Strength Indicator */}
                    {signupPassword && (
                      <div className="space-y-1 pt-1">
                        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${getPasswordStrength(signupPassword).color}`} 
                            style={{ width: `${getPasswordStrength(signupPassword).percent}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-400">
                          Strength: {getPasswordStrength(signupPassword).label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Terms Checkbox */}
                  <div className="flex items-start gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="terms-signup"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="w-4 h-4 mt-0.5 rounded border-white/20 bg-black/40 text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                    <label htmlFor="terms-signup" className="text-xs text-zinc-400 cursor-pointer select-none leading-normal">
                      I agree to Nexora's{' '}
                      <button
                        type="button"
                        onClick={() => setShowPolicyModal(true)}
                        className="text-violet-400 underline font-semibold"
                      >
                        Terms of Service
                      </button>{' '}
                      and Privacy Policy.
                    </label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSignupMethod('choose')}
                      className="py-3 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(139,92,246,0.3)] cursor-pointer disabled:opacity-50"
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              )}

              {/* Phone Signup / Auth Form */}
              {signupMethod === 'phone' && (
                <div className="space-y-4">
                  {!smsSent ? (
                    <form onSubmit={handlePhoneOtpRequest} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-300">Country & Phone Number</label>

                        {/* Country Selector Button */}
                        <button
                          type="button"
                          onClick={() => setShowCountryPicker(true)}
                          className="w-full px-4 py-3 bg-black/40 border border-white/10 hover:border-white/20 rounded-2xl text-xs font-bold text-white flex items-center justify-between transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{selectedCountry.flag}</span>
                            <span>{selectedCountry.name}</span>
                            <span className="text-violet-400 font-mono">({selectedCountry.code})</span>
                          </div>
                          <ChevronDown className="w-4 h-4 text-zinc-400" />
                        </button>

                        {/* Phone input */}
                        <div className="relative flex items-center mt-2">
                          <span className="absolute left-4 text-xs font-mono font-bold text-violet-400">
                            {selectedCountry.code}
                          </span>
                          <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="Mobile number"
                            required
                            className="w-full pl-16 pr-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all"
                          />
                        </div>
                      </div>

                      {/* Firebase Recaptcha Container */}
                      <div id="recaptcha-container"></div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setSignupMethod('choose')}
                          className="py-3 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                        >
                          Back
                        </button>
                        <button
                          type="submit"
                          disabled={isPending}
                          className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(139,92,246,0.3)] cursor-pointer disabled:opacity-50"
                        >
                          Send Code
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={handlePhoneOtpVerify} className="space-y-4">
                      <div className="p-3 bg-violet-950/40 border border-white/10 rounded-2xl text-xs text-violet-200">
                        We sent a 6-digit code to <span className="font-bold text-white">{selectedCountry.code} {phoneNumber}</span>.
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-zinc-300">Enter Verification Code</label>
                        <input
                          type="text"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          placeholder="──────"
                          required
                          className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-center text-xl font-mono tracking-widest text-white placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition-all"
                        />
                      </div>

                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        {otpCountdown > 0 ? (
                          <span>Resend code in {otpCountdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handlePhoneOtpRequest}
                            className="text-violet-400 font-bold hover:underline cursor-pointer"
                          >
                            Resend SMS Code
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSmsSent(false)}
                          className="text-zinc-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Change number
                        </button>
                      </div>

                      <button
                        type="submit"
                        disabled={isPending}
                        className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(139,92,246,0.3)] cursor-pointer disabled:opacity-50"
                      >
                        Verify & Continue
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ---------------- FORGOT PASSWORD MODE ---------------- */}
          {authMode === 'forgot_password' && (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">Reset Password</h1>
                <p className="text-xs text-zinc-400 mt-1">
                  {recoveryStep === 1 && "Enter your account email or phone to receive a code"}
                  {recoveryStep === 2 && "Enter the 6-digit verification code sent to you"}
                  {recoveryStep === 3 && "Create a new strong password for your account"}
                </p>
              </div>

              {recoveryStep === 1 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Email or Phone Number</label>
                  <input
                    type="text"
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="name@example.com or +1..."
                    required
                    className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all"
                  />
                </div>
              )}

              {recoveryStep === 2 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">Verification Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="──────"
                    required
                    className="w-full px-4 py-3.5 bg-black/40 border border-white/10 rounded-2xl text-center text-xl font-mono tracking-widest text-white placeholder-zinc-700 focus:outline-none focus:border-violet-500 transition-all"
                  />
                </div>
              )}

              {recoveryStep === 3 && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-2xl text-sm font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => switchAuthMode('login')}
                  className="py-3 px-4 bg-white/5 hover:bg-white/10 text-zinc-300 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(139,92,246,0.3)] cursor-pointer disabled:opacity-50"
                >
                  {recoveryStep === 1 && "Send Reset Code"}
                  {recoveryStep === 2 && "Verify Code"}
                  {recoveryStep === 3 && "Save New Password"}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-center z-10 py-2">
        <p className="text-[11px] text-zinc-500 font-mono">
          Nexora • The World's Living Social Platform © 2026
        </p>
      </div>

      {/* ---------------- GOOGLE ACCOUNT PICKER MODAL REMOVED ---------------- */}

      {/* ---------------- COUNTRY PICKER MODAL ---------------- */}
      <AnimatePresence>
        {showCountryPicker && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-[#0a0718] border border-white/10 text-white rounded-3xl p-5 shadow-md flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <h3 className="text-sm font-bold text-white">Select Country Code</h3>
                <button
                  onClick={() => setShowCountryPicker(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Country Filter Search */}
              <div className="relative my-3">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search country..."
                  className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs font-medium text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500"
                />
              </div>

              {/* Country List */}
              <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin scrollbar-thumb-violet-600/30">
                {COUNTRIES
                  .filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase()) || c.code.includes(countrySearch))
                  .map((country, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedCountry(country);
                        setShowCountryPicker(false);
                      }}
                      className={`w-full p-2.5 rounded-xl flex items-center justify-between hover:bg-violet-600/20 text-xs font-bold transition-all cursor-pointer ${selectedCountry.name === country.name ? 'bg-violet-600/30 text-white' : 'text-zinc-300'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-base">{country.flag}</span>
                        <span>{country.name}</span>
                      </div>
                      <span className="font-mono text-violet-400">{country.code}</span>
                    </button>
                  ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ---------------- TERMS & PRIVACY POLICY MODAL ---------------- */}
      <AnimatePresence>
        {showPolicyModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#0a0718] border border-white/10 text-white rounded-3xl p-6 shadow-md flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPolicyTab('terms')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${policyTab === 'terms' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Terms of Service
                  </button>
                  <button
                    onClick={() => setPolicyTab('privacy')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${policyTab === 'privacy' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                  >
                    Privacy Policy
                  </button>
                </div>
                <button
                  onClick={() => setShowPolicyModal(false)}
                  className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs text-zinc-300 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-violet-600/30">
                {policyTab === 'terms' ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white">Nexora Terms of Service</h3>
                    <p>Welcome to Nexora. By creating an account or using our application, you agree to these terms. Nexora provides a living social ecosystem for sharing, discovering, and connecting across global interests.</p>
                    <p className="font-bold text-white">1. Account Security</p>
                    <p>You are responsible for safeguarding your credentials and account access.</p>
                    <p className="font-bold text-white">2. Content Ownership</p>
                    <p>You retain ownership of the content you share on Nexora, while granting Nexora a license to host and display it.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-white">Nexora Privacy Policy</h3>
                    <p>Your privacy is central to Nexora. We protect your personal data and do not sell user information to third parties.</p>
                    <p className="font-bold text-white">1. Information We Collect</p>
                    <p>We collect profile details, account credentials, and platform activity to provide a tailored recommendation experience.</p>
                    <p className="font-bold text-white">2. Data Security</p>
                    <p>We implement industry-standard encryption and security controls to safeguard your account information.</p>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 text-right">
                <button
                  onClick={() => setShowPolicyModal(false)}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
