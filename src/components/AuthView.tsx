import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, Smartphone, Lock, Mail, User as UserIcon, X, ShieldCheck, FileText, Key, Trash2, Globe, Sparkles, Info, Eye, EyeOff, Volume2, Check } from 'lucide-react';

import { User } from '../types';
import { INITIAL_USER, MOCK_CREATORS, ADDITIONAL_TEST_ACCOUNTS, INITIAL_CIRCLES } from '../data/database';
import { followUserDb, unfollowUserDb, joinCircleDb, leaveCircleDb, getRichUser } from '../data/database';
import NexoraPremiumLogo from './NexoraPremiumLogo';
import NexoraBranding from './NexoraBranding';
import { validateUsername } from '../utils/username';

// Policy Content Panels
const TERMS_TEXT = (
  <div className="space-y-5 text-xs text-purple-200/80 leading-relaxed font-sans">
    <div className="border-b border-purple-500/10 pb-3">
      <h3 className="text-base font-extrabold text-white">NEXORA Terms of Service</h3>
      <p className="text-[10px] text-purple-300/50 mt-1">Effective Date: June 15, 2026 • Platform: NEXORA — The World's Living Social Network</p>
    </div>
    
    <p>
      Welcome to NEXORA. By creating an account, accessing, or using NEXORA, you agree to these Terms of Service. If you do not agree, you may not use the platform.
    </p>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">1. Our Mission</h4>
      <p>NEXORA exists to help people:</p>
      <ul className="list-disc pl-4 space-y-1 text-purple-200/90">
        <li>Discover what is happening in the world</li>
        <li>Build meaningful communities</li>
        <li>Share knowledge</li>
        <li>Create opportunities</li>
        <li>Develop living reputations</li>
        <li>Collaborate and make impact</li>
      </ul>
      <p>We are committed to maintaining a safe, intelligent, and respectful social ecosystem.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">2. Eligibility</h4>
      <p>To use NEXORA, you must:</p>
      <ul className="list-disc pl-4 space-y-1 text-purple-200/90">
        <li>Meet the minimum age requirement in your country</li>
        <li>Be at least 13 years old where applicable</li>
        <li>Have a valid email address or phone node</li>
        <li>Ensure your profile represents a single legitimate identity</li>
      </ul>
    </div>
  </div>
);

const PRIVACY_TEXT = (
  <div className="space-y-5 text-xs text-purple-200/80 leading-relaxed font-sans">
    <div className="border-b border-purple-500/10 pb-3">
      <h3 className="text-base font-extrabold text-white">NEXORA Privacy Policy</h3>
      <p className="text-[10px] text-purple-300/50 mt-1">Last Updated: June 15, 2026 • Security: Secured Local Sandboxed Encryption</p>
    </div>

    <p>
      Your privacy is paramount on NEXORA. This Privacy Policy details how we handle your personal data when you use our services.
    </p>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Information We Collect</h4>
      <p>We may collect:</p>
      <ul className="list-disc pl-4 space-y-1 text-purple-200/90">
        <li>Profile Details: Display Name, Username handle, Avatar image, Biography, Location preference</li>
        <li>Auth Tokens: Encrypted credentials, OTP delivery tokens, session preferences</li>
        <li>Usage Data: Posts created, bookmarks, sparks earned, messages exchanged, active chats</li>
      </ul>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Data Security</h4>
      <p>
        NEXORA secures all user credentials and session parameters in state-of-the-art sandboxed client directories. Your passwords are double hashed before persistent commitment. We never sell, trade, or share user telemetry to unverified index engines.
      </p>
    </div>
  </div>
);

const GUIDELINES_TEXT = (
  <div className="space-y-5 text-xs text-purple-200/80 leading-relaxed font-sans">
    <div className="border-b border-purple-500/10 pb-3">
      <h3 className="text-base font-extrabold text-white">NEXORA Community Guidelines</h3>
      <p className="text-[10px] text-purple-300/50 mt-1">Content Guidelines</p>
    </div>

    <p>
      To sustain a valuable, civilized, and intellectually rewarding social feed, NEXORA enforces the following strict community boundaries. Violation results in automatic VOH reputation downgrades or account suspensions.
    </p>

    <div className="space-y-2.5">
      <div className="p-3 bg-red-950/25 border border-red-500/15 rounded-xl">
        <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1">🛑 Zero Tolerance: Identity Theft & Fraud</h4>
        <p className="text-[11px] text-purple-200/80">
          Creating parody or fake profiles to impersonate legitimate community figures, developers, or creators is strictly forbidden. Real identities should match verified credentials.
        </p>
      </div>

      <div className="p-3 bg-violet-950/20 border border-purple-500/10 rounded-xl">
        <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">🟣✓ Earned Reputation</h4>
        <p className="text-[11px] text-purple-200/80">
          Reputation is the core value of NEXORA. Users earn points through genuine high-quality contributions, community helpfulness, and creative posts. Do not spam, post low-value automated links, or coordinate inorganic engagement loops.
        </p>
      </div>
    </div>
  </div>
);

interface AuthViewProps {
  onLoginSuccess: (loggedUser: User) => void;
}

interface RegisteredAccount {
  email: string;
  passwordHash: string;
  user: User | null;
}

const loadAccounts = (): RegisteredAccount[] => {
  const stored = localStorage.getItem('nexora_registered_accounts');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {}
  }
  const defaults: RegisteredAccount[] = [
    { 
      email: 'ogoulu131@gmail.com', 
      passwordHash: 'password123', 
      user: {
        id: 'user-ogoulu',
        username: 'ogoulu131',
        name: 'Ogoulu',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: 'Premium NEXORA Creator 🚀 Exploring music, design, and football.',
        location: 'Port Harcourt, Nigeria',
        website: 'ogoulu.nexora.io',
        followers: 120,
        following: 80,
        sparks: 1450,
        isVerified: false,
        coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
        joinedDate: 'Joined June 2026',
        preferredLanguage: 'English',
        reputationPoints: 2450,
        reputationBreakdown: {
          contributions: 1200,
          helpfulness: 800,
          missionsCompleted: 15,
          skillsVerified: 30
        },
        interestDNA: { 'sports': 99, 'music': 99, 'tech': 99 },
        skills: ['Content Creation', 'UI Design', 'Music Curation']
      }
    }
  ];
  localStorage.setItem('nexora_registered_accounts', JSON.stringify(defaults));
  return defaults;
};

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [authMode, setAuthMode] = useState<'signup' | 'login' | 'forgot_password'>('login');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Symmetrical state variables for policies
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showAgreementError, setShowAgreementError] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState<'terms' | 'privacy' | 'guidelines'>('terms');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  
  // Simulated authentication states
  const [authMethod, setAuthMethod] = useState<'none' | 'email' | 'phone' | 'google'>('none');
  const [isPending, setIsPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // OTP States
  const [smsSent, setSmsSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState({ code: '+234', name: 'Nigeria 🇳🇬' });
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  // Password Recovery States
  const [recoveryStep, setRecoveryStep] = useState<1 | 2 | 3>(1); // 1: Email, 2: OTP, 3: New Password
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showRecoverPasswordCheck, setShowRecoverPasswordCheck] = useState(false);

  // Live Toast Messages Simulation (SMS / Email OTP)
  const [incomingNotification, setIncomingNotification] = useState<{ title: string; body: string; code: string } | null>(null);

  // Google SSO Account list Simulation
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [showGooglePermission, setShowGooglePermission] = useState(false);
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState<any>(null);

  // Saved accounts list state (remembered accounts on device)
  const [savedAccounts, setSavedAccounts] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem('nexora_saved_accounts');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  // Owner Mode unlocking mechanism (5 logo clicks)
  const [logoClicks, setLogoClicks] = useState(0);
  const isOwnerMode = email.trim().toLowerCase() === 'ogoulu131@gmail.com' || logoClicks >= 5;

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const next = prev + 1;
      if (next === 5) {
        window.dispatchEvent(new CustomEvent('toast', { detail: '⚡ Nexora developer shortcuts unlocked!' }));
      }
      return next;
    });
  };

  // Onboarding Wizard states
  const [onboardingUser, setOnboardingUser] = useState<User | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [onboardingLanguage, setOnboardingLanguage] = useState<'en' | 'fr' | 'ar' | 'pt'>('en');
  const [onboardingFollows, setOnboardingFollows] = useState<string[]>([]);
  const [onboardingCircles, setOnboardingCircles] = useState<string[]>([]);

  // OTP Countdown Timer Effect
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Handle incoming OTP simulation notification auto-dismiss / auto-populate
  useEffect(() => {
    if (incomingNotification) {
      const timer = setTimeout(() => {
        setIncomingNotification(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [incomingNotification]);

  // Saved accounts state synchronization helper
  const handleRemoveSavedAccount = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(acc => acc.id !== userId);
    setSavedAccounts(updated);
    localStorage.setItem('nexora_saved_accounts', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Saved account removed from device' }));
  };

  const handleSavedAccountClick = (user: User) => {
    setIsPending(true);
    setStatusMessage(`Restoring session for @${user.username}...`);
    setTimeout(() => {
      setIsPending(false);
      // Synchronize in main app
      onLoginSuccess(user);
    }, 1200);
  };

  // Google Sign-In Selection flow
  const handleSelectGoogleAccount = (act: any) => {
    setSelectedGoogleAccount(act);
    setShowGoogleChooser(false);
    setShowGooglePermission(true);
  };

  const handleConfirmGooglePermissions = () => {
    setShowGooglePermission(false);
    setIsPending(true);
    setStatusMessage(`Securing federated single sign-on token for ${selectedGoogleAccount.email}...`);

    setTimeout(() => {
      const registry = loadAccounts();
      const cleanEmail = selectedGoogleAccount.email.toLowerCase().trim();
      const found = registry.find(a => a.email === cleanEmail);
      setIsPending(false);

      if (found) {
        onLoginSuccess(found.user);
      } else {
        // Register Google User
        const prefix = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
        const googleUser: User = {
          id: `user-google-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          username: `g_${prefix || 'explorer'}`,
          name: selectedGoogleAccount.name || 'Google Explorer',
          avatar: selectedGoogleAccount.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          bio: `Joined via Google Single Sign-On node.`,
          location: 'Global Range',
          website: '',
          followers: 0,
          following: 0,
          isVerified: false,
          coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
          joinedDate: 'Joined June 2026',
          reputationPoints: 0,
          reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
          interestDNA: {},
          skills: []
        };
        const updatedRegistry = [...registry, { email: cleanEmail, passwordHash: 'password123', user: googleUser }];
        localStorage.setItem('nexora_registered_accounts', JSON.stringify(updatedRegistry));
        
        setOnboardingUser(googleUser);
        setOnboardingStep(1);
      }
    }, 1500);
  };

  // Password Strength Evaluation Helper
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Empty', color: 'bg-zinc-700' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    switch (score) {
      case 1:
        return { score: 25, label: 'Weak 🔴', color: 'bg-rose-500' };
      case 2:
        return { score: 50, label: 'Fair 🟠', color: 'bg-amber-500' };
      case 3:
        return { score: 75, label: 'Good 🟡', color: 'bg-purple-500' };
      case 4:
        return { score: 100, label: 'Strong! 🟢', color: 'bg-emerald-500' };
      default:
        return { score: 10, label: 'Weak 🔴', color: 'bg-rose-500' };
    }
  };

  // Password Recovery Submit Handler
  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (recoveryStep === 1) {
      if (!recoveryEmail.includes('@')) {
        setErrorMsg('Please specify a valid email address.');
        return;
      }
      setIsPending(true);
      setStatusMessage('Locating secure node ID...');
      
      setTimeout(() => {
        setIsPending(false);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setRecoveryCode(code);
        setRecoveryStep(2);
        
        // Simulating the email OTP incoming notification
        setIncomingNotification({
          title: '📧 Password Recovery OTP Code',
          body: `Nexora Security: Use code ${code} to authorize password recovery.`,
          code: code
        });
      }, 1200);
    } else if (recoveryStep === 2) {
      if (verificationCode.trim() !== recoveryCode) {
        setErrorMsg('Invalid or expired OTP. Please try again.');
        return;
      }
      setRecoveryStep(3);
    } else if (recoveryStep === 3) {
      if (newPassword.length < 8) {
        setErrorMsg('Password must contain at least 8 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }

      setIsPending(true);
      setStatusMessage('Re-encrypting secure authentication parameters...');

      setTimeout(() => {
        setIsPending(false);
        const registry = loadAccounts();
        const updated = registry.map(act => {
          if (act.email.toLowerCase() === recoveryEmail.toLowerCase()) {
            return { ...act, passwordHash: newPassword };
          }
          return act;
        });
        localStorage.setItem('nexora_registered_accounts', JSON.stringify(updated));
        
        setAuthMode('login');
        setRecoveryStep(1);
        setSuccessMsg('🛡️ Security Credentials Updated! You can now log in.');
        window.dispatchEvent(new CustomEvent('toast', { detail: '🔒 Password recovered successfully' }));
      }, 1500);
    }
  };

  // Custom Google Login direct overlay
  const triggerOAuthSimulation = () => {
    setAuthMethod('google');
    setShowGoogleChooser(true);
  };

  // Phone submission handler
  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!smsSent) {
      if (phoneNumber.trim().length < 7) {
        setErrorMsg('Enter a valid phone number.');
        return;
      }
      setIsPending(true);
      setStatusMessage('Delivering verification code via SMS channel...');

      setTimeout(() => {
        setIsPending(false);
        setSmsSent(true);
        setOtpCountdown(59);
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        setVerificationCode(''); // Clear code input
        
        // Simulating the OTP SMS Toast notification
        setIncomingNotification({
          title: '💬 SMS from Nexora Security',
          body: `OTP: Use code ${generatedCode} to authenticate. Valid for 10 minutes.`,
          code: generatedCode
        });

        // Optimistic auto-detect: autofill code after 2.5s
        setTimeout(() => {
          setVerificationCode(generatedCode);
          window.dispatchEvent(new CustomEvent('toast', { detail: '📱 OTP Autofilled successfully!' }));
        }, 2500);

      }, 1500);
    } else {
      if (!verificationCode) {
        setErrorMsg('Enter the 6-digit verification code.');
        return;
      }
      setIsPending(true);
      setStatusMessage('Authenticating secure phone session...');

      setTimeout(() => {
        setIsPending(false);
        const registry = loadAccounts();
        const phoneEmail = `phone_${phoneNumber.replace(/\D/g, '')}@nexora.com`;
        
        const existing = registry.find(a => a.email === phoneEmail);
        if (existing) {
          onLoginSuccess(existing.user);
        } else {
          // New User Progressive Onboarding Setup
          const generatedUsername = `phone_user_${phoneNumber.slice(-4) || 'explorer'}`;
          const phoneUser: User = {
            id: `user-phone-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            username: generatedUsername,
            name: `Phone User (${selectedCountry.code} ${phoneNumber})`,
            avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
            bio: `Authenticated securely with mobile SMS link routing.`,
            location: 'Mobile Range',
            website: `nexora.ai/${generatedUsername}`,
            followers: 0,
            following: 0,
            sparks: 0,
            isVerified: false,
            coverImage: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1000&auto=format&fit=crop&q=80',
            joinedDate: 'Joined June 2026',
            reputationPoints: 0,
            reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
            interestDNA: {},
            skills: []
          };
          const updatedRegistry = [...registry, { email: phoneEmail, passwordHash: 'password123', user: phoneUser }];
          localStorage.setItem('nexora_registered_accounts', JSON.stringify(updatedRegistry));
          
          setOnboardingUser(phoneUser);
          setOnboardingStep(1);
        }
      }, 1500);
    }
  };

  // Voice call fallback OTP mechanism
  const triggerVoiceOTP = () => {
    setIsPending(true);
    setStatusMessage('Initiating security phone call line...');
    
    setTimeout(() => {
      setIsPending(false);
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      setSmsSent(true);
      setOtpCountdown(59);

      setIncomingNotification({
        title: '📞 Secure Phone Call Received',
        body: `Voice verification: Your code is ${generatedCode.split('').join(' ')}. Repeating: ${generatedCode}.`,
        code: generatedCode
      });

      setTimeout(() => {
        setVerificationCode(generatedCode);
        window.dispatchEvent(new CustomEvent('toast', { detail: '📞 Voice OTP detected!' }));
      }, 3000);
    }, 2000);
  };

  // Email/Password login signup handler
  const handleEmailAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (authMode === 'signup') {
      if (!acceptedTerms) {
        setShowAgreementError(true);
        return;
      }
      if (!usernameInput) {
        setErrorMsg('Please specify a unique username handle.');
        return;
      }
      
      const usernameError = validateUsername(usernameInput);
      if (usernameError) {
        setErrorMsg(usernameError);
        return;
      }

      if (password.length < 8) {
        setErrorMsg('Password must contain at least 8 characters.');
        return;
      }

      setIsPending(true);
      setStatusMessage('Compiling secure metadata index...');

      setTimeout(() => {
        const registry = loadAccounts();
        const cleanEmail = email.toLowerCase().trim();
        const cleanUsername = usernameInput.toLowerCase().trim();

        const existsEmail = registry.some(a => a.email.toLowerCase() === cleanEmail);
        const existsUser = registry.some(a => a.user.username.toLowerCase() === cleanUsername);

        setIsPending(false);

        if (existsEmail) {
          setErrorMsg('An account with this email address already exists.');
          return;
        }
        if (existsUser) {
          setErrorMsg('This username is already claimed on Nexora.');
          return;
        }

        const newUser: User = {
          id: `user-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          username: cleanUsername,
          name: fullName || 'New User',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          bio: 'Member of the NEXORA community.',
          location: 'Global Hub',
          website: '',
          followers: 0,
          following: 0,
          sparks: 0,
          isVerified: false,
          coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
          joinedDate: 'Joined June 2026',
          reputationPoints: 0,
          reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
          interestDNA: {},
          skills: []
        };

        const updated = [...registry, { email: cleanEmail, passwordHash: password, user: newUser }];
        localStorage.setItem('nexora_registered_accounts', JSON.stringify(updated));

        // Direct user into progressive onboarding
        setOnboardingUser(newUser);
        setOnboardingStep(1);
      }, 1500);

    } else {
      // Normal Login
      setIsPending(true);
      setStatusMessage('Querying decentralized credential files...');

      setTimeout(() => {
        const registry = loadAccounts();
        const found = registry.find(
          a => a.email.toLowerCase() === email.toLowerCase().trim() && a.passwordHash === password
        );
        setIsPending(false);

        if (found) {
          onLoginSuccess(found.user);
        } else {
          setErrorMsg('The credentials specified do not match our database records.');
        }
      }, 1200);
    }
  };

  // Onboarding Skip Utility: allows entering home feed instantly
  const handleOnboardingSkip = () => {
    if (onboardingUser) {
      localStorage.setItem('nexora_just_signed_up', 'true');
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚡ Welcome! Profile setup skipped (you can finish later)' }));
      onLoginSuccess(getRichUser(onboardingUser));
    }
  };

  // Onboarding recommended loaders
  if (onboardingUser) {
    const getRecommendations = () => {
      const recs: typeof MOCK_CREATORS = [];
      if (INITIAL_USER) {
        recs.push(INITIAL_USER);
      }

      MOCK_CREATORS.forEach(cr => {
        if (!recs.some(r => r.id === cr.id)) {
          recs.push(cr);
        }
      });
      return recs;
    };

    const getCircleRecommendations = () => {
      const recs: typeof INITIAL_CIRCLES = [];
      INITIAL_CIRCLES.forEach(circle => {
        let match = false;
        if (selectedInterests.includes('Football') && circle.name.toLowerCase().includes('football')) match = true;
        if (selectedInterests.includes('Gaming') && circle.name.toLowerCase().includes('football')) match = true;
        if (selectedInterests.includes('Technology') && circle.name.toLowerCase().includes('synthesizer')) match = true;
        if (selectedInterests.includes('Business') && circle.name.toLowerCase().includes('synthesizer')) match = true;
        if (selectedInterests.includes('Education') && circle.name.toLowerCase().includes('synthesizer')) match = true;
        if (selectedInterests.includes('Music') && circle.name.toLowerCase().includes('photographer')) match = true;
        if (selectedInterests.includes('Creators') && (circle.name.toLowerCase().includes('photographer') || circle.name.toLowerCase().includes('synthesizer'))) match = true;
        if (selectedInterests.includes('News') && circle.name.toLowerCase().includes('photographer')) match = true;
        if (selectedInterests.includes('Entertainment') && circle.name.toLowerCase().includes('photographer')) match = true;

        if (match) {
          recs.push(circle);
        }
      });
      if (recs.length === 0 && INITIAL_CIRCLES.length > 0) {
        recs.push(INITIAL_CIRCLES[1]);
      }
      return recs;
    };

    const recsList = getRecommendations();
    const circlesList = getCircleRecommendations();

    const INTEREST_OPTIONS = [
      { label: 'Football', icon: '⚽', desc: 'Real-time pitch dynamics & leagues' },
      { label: 'Technology', icon: '🧠', desc: 'AI topics, developer tools & codebases' },
      { label: 'Business', icon: '💼', desc: 'Growth loops, startup metrics & ecosystems' },
      { label: 'Gaming', icon: '🎮', desc: 'Builders, speedruns & physical engines' },
      { label: 'Music', icon: '🎵', desc: 'Acoustics, ambient synthesis & audio streams' },
      { label: 'Creators', icon: '🎨', desc: 'Visual direction, designs & public builds' },
      { label: 'News', icon: '🌍', desc: 'Regional streams, live feeds & global events' },
      { label: 'Education', icon: '📚', desc: 'Skill ladders, research logs & physics' },
      { label: 'Entertainment', icon: '🎬', desc: 'Cinematics, voice drafts & playbacks' }
    ];

    const toggleInterest = (label: string) => {
      setSelectedInterests(prev => 
        prev.includes(label) ? prev.filter(x => x !== label) : [...prev, label]
      );
    };

    const handleOnboardingFollowToggle = (creatorId: string) => {
      const isFollowing = onboardingFollows.includes(creatorId);
      if (isFollowing) {
        unfollowUserDb(onboardingUser.id, creatorId);
        setOnboardingFollows(prev => prev.filter(id => id !== creatorId));
      } else {
        followUserDb(onboardingUser.id, creatorId);
        setOnboardingFollows(prev => [...prev, creatorId]);
      }
    };

    const handleOnboardingCircleJoinToggle = (circleId: string) => {
      const isJoined = onboardingCircles.includes(circleId);
      if (isJoined) {
        leaveCircleDb(onboardingUser.id, circleId);
        setOnboardingCircles(prev => prev.filter(id => id !== circleId));
      } else {
        joinCircleDb(onboardingUser.id, circleId);
        setOnboardingCircles(prev => [...prev, circleId]);
      }
    };

    const finalizeOnboarding = () => {
      const finalUser: User = {
        ...onboardingUser,
        preferredLanguage: onboardingLanguage,
        interestDNA: selectedInterests.reduce((acc, interest) => ({ ...acc, [interest]: 99 }), {}),
      };

      const registry = loadAccounts();
      const updatedRegistry = registry.map(a => {
        if (a.user.id === onboardingUser.id) {
          return { ...a, user: finalUser };
        }
        return a;
      });
      localStorage.setItem('nexora_registered_accounts', JSON.stringify(updatedRegistry));
      localStorage.setItem('nexora_just_signed_up', 'true');
      onLoginSuccess(getRichUser(finalUser));
    };

    return (
      <div 
        id="auth-flow-viewport" 
        className="min-h-screen bg-[#030208] text-[#F3F4F6] flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden"
      >
        {/* Background Ambience Glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl from-[#8B5CF6]/8 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[#8B5CF6]/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0b091f_1px,transparent_1px),linear-gradient(to_bottom,#0b091f_1px,transparent_1px)] bg-[size:36px_36px] opacity-15" />

        <div className="flex justify-between items-center max-w-2xl w-full mx-auto mb-4 z-10">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-purple-400">
            Account Setup
          </span>
          <button
            onClick={handleOnboardingSkip}
            className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-mono text-[10px] font-bold rounded-lg uppercase tracking-wider transition-all cursor-pointer"
          >
            Skip Setup ➔
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full mx-auto z-10"
        >
          {/* Branding */}
          <div className="flex flex-col items-center text-center mb-6">
            <NexoraBranding size="lg" showSubtitle={false} className="mb-4" />
            <h1 className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-300 to-white font-sans select-none uppercase">
              Onboarding Setup
            </h1>
          </div>

          <div className="bg-[#0b091c]/65 border border-purple-500/10 backdrop-blur-2xl rounded-[28px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {onboardingStep === 1 ? (
              <div id="onboarding-step-1">
                <div className="mb-6 text-left">
                  <h2 className="text-lg font-bold text-white tracking-wide">Choose Your Interests & Language</h2>
                  <p className="text-xs text-purple-200/60 mt-1">
                    Welcome, <span className="text-violet-400 font-mono">@{onboardingUser.username}</span>! Customize your initial feed experience. Choose your primary language and select topics that align with your profile.
                  </p>
                </div>

                {/* Language Protocol selection block */}
                <div className="mb-6 bg-purple-950/20 border border-purple-500/10 p-4 rounded-2xl text-left">
                  <span className="text-[10px] uppercase font-mono text-purple-400 font-extrabold tracking-widest block mb-2 font-black">
                    🌐 SELECT PREFERRED SYSTEM LANGUAGE:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { code: 'en', name: 'English 🇺🇸' },
                      { code: 'fr', name: 'Français 🇫🇷' },
                      { code: 'ar', name: 'العربية 🇸🇦' },
                      { code: 'pt', name: 'Português 🇧🇷' }
                    ].map(lang => (
                      <button
                        key={lang.code}
                        type="button"
                        onClick={() => setOnboardingLanguage(lang.code as any)}
                        className={`p-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${onboardingLanguage === lang.code ? 'bg-purple-600 border-purple-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.3)]' : 'bg-black/30 border-white/5 text-zinc-400 hover:text-zinc-200'}`}
                      >
                        {lang.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {INTEREST_OPTIONS.map(opt => {
                    const isSelected = selectedInterests.includes(opt.label);
                    return (
                      <button
                        key={opt.label}
                        onClick={() => toggleInterest(opt.label)}
                        className={`p-4 rounded-2xl text-left border relative transition-all duration-300 select-none cursor-pointer flex flex-col gap-2 ${
                          isSelected
                            ? 'bg-purple-950/30 border-purple-500/60 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                            : 'bg-[#060410]/80 border-purple-950/40 hover:border-purple-800/40 hover:bg-purple-950/10'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xl">{opt.icon}</span>
                          {isSelected && (
                            <span className="w-4.5 h-4.5 rounded-full bg-purple-500 flex items-center justify-center text-[10px] text-white font-bold">✓</span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{opt.label}</p>
                          <p className="text-[10px] text-purple-200/40 leading-tight mt-0.5">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end mt-8 pt-4 border-t border-purple-950/40">
                  <button
                    disabled={selectedInterests.length === 0}
                    onClick={() => setOnboardingStep(2)}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none tracking-widest cursor-pointer uppercase flex items-center gap-1.5"
                  >
                    Generate Alignments
                  </button>
                </div>
              </div>
            ) : (
              <div id="onboarding-step-2">
                <div className="mb-6 text-left">
                  <h2 className="text-lg font-bold text-white tracking-wide">Connect & Follow</h2>
                  <p className="text-xs text-purple-200/60 mt-1">
                    Based on your selected interests in <span className="text-violet-400 font-bold">{selectedInterests.join(', ')}</span>. Meet active creators and circles aligned with your profile. Users choose who they follow.
                  </p>
                </div>

                <div className="space-y-6 text-left">
                  {/* Recommended Accounts */}
                  <div>
                    <h3 className="text-xs font-bold text-purple-300 uppercase font-mono tracking-widest mb-3">Recommended Creators</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {recsList.map(cr => {
                        const isFollowing = onboardingFollows.includes(cr.id);
                        return (
                          <div 
                            key={cr.id}
                            className="p-3 bg-[#060410]/80 border border-purple-950/40 rounded-2xl flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <img src={cr.avatar} alt={cr.name} className="w-9 h-9 rounded-xl object-cover border border-purple-500/10 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-extrabold text-white truncate flex items-center gap-1">
                                  {cr.name}
                                  {cr.username === 'voh' && <span className="text-purple-400 text-[10px]">✓</span>}
                                </p>
                                <p className="text-[10px] text-purple-300/50 font-mono truncate">@{cr.username}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleOnboardingFollowToggle(cr.id)}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                isFollowing 
                                  ? 'bg-purple-950/40 text-purple-300 border border-purple-500/30'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white'
                              }`}
                            >
                              {isFollowing ? 'Following' : 'Follow'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recommended Communities */}
                  <div>
                    <h3 className="text-xs font-bold text-purple-300 uppercase font-mono tracking-widest mb-3">Recommended Communities</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {circlesList.map(circle => {
                        const isJoined = onboardingCircles.includes(circle.id);
                        return (
                          <div 
                            key={circle.id}
                            className="p-3 bg-[#060410]/80 border border-purple-950/40 rounded-2xl flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-extrabold text-white truncate">🔵 {circle.name}</p>
                              <p className="text-[9px] text-purple-300/40 truncate mt-0.5">{circle.description}</p>
                            </div>
                            <button
                              onClick={() => handleOnboardingCircleJoinToggle(circle.id)}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer ${
                                isJoined
                                  ? 'bg-pink-950/40 text-pink-300 border border-pink-500/30'
                                  : 'bg-pink-600 hover:bg-pink-500 text-white'
                              }`}
                            >
                              {isJoined ? 'Joined' : 'Join'}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between mt-8 pt-4 border-t border-purple-950/40 items-center">
                  <button
                    onClick={() => setOnboardingStep(1)}
                    className="text-[11px] text-purple-300/50 hover:text-purple-300 font-mono transition-colors cursor-pointer"
                  >
                    ← BACK TO TOPICS
                  </button>

                  <button
                    onClick={finalizeOnboarding}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all tracking-widest uppercase cursor-pointer"
                  >
                    Complete Setup & Enter
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <div className="flex-1" />
      </div>
    );
  }

  // Choose display content depending on states
  return (
    <div 
      id="auth-flow-viewport" 
      className="min-h-screen bg-[#030208] text-[#F3F4F6] flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden"
    >
      {/* Background Ambience Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl from-[#8B5CF6]/8 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[#8B5CF6]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0b091f_1px,transparent_1px),linear-gradient(to_bottom,#0b091f_1px,transparent_1px)] bg-[size:36px_36px] opacity-15 pointer-events-none" />

      {/* Dynamic Simulated Incoming SMS/Email OTP Banner */}
      <AnimatePresence>
        {incomingNotification && (
          <motion.div
            initial={{ opacity: 0, y: -80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 20, stiffness: 400 }}
            onClick={() => {
              if (authMethod === 'phone') {
                setVerificationCode(incomingNotification.code);
              } else if (authMode === 'forgot_password' && recoveryStep === 2) {
                setVerificationCode(incomingNotification.code);
              }
              setIncomingNotification(null);
            }}
            className="fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-sm bg-zinc-950/95 border-2 border-violet-500/40 p-4 rounded-2xl z-[9999] shadow-2xl flex gap-3 cursor-pointer hover:border-violet-400 transition-all active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-600/25 flex items-center justify-center border border-violet-500/30 text-base shrink-0 animate-pulse">
              📬
            </div>
            <div className="min-w-0 text-left">
              <h4 className="text-xs font-sans font-black text-white">{incomingNotification.title}</h4>
              <p className="text-[10px] text-zinc-300 leading-normal mt-0.5 font-sans">{incomingNotification.body}</p>
              <span className="text-[9px] font-mono text-purple-400 mt-1 block uppercase font-extrabold tracking-widest">
                👉 Click to automatically copy/autofill OTP
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1" />

      {/* Main Form container block */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full mx-auto z-10"
      >
        {/* Branding Area */}
        <div className="flex flex-col items-center text-center mb-10 px-4">
          <NexoraBranding size="xl" showSubtitle={true} onClick={handleLogoClick} />
        </div>

        {/* Form Panel Box */}
        <div className="bg-[#0b091c]/65 border border-purple-500/10 backdrop-blur-2xl rounded-[28px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative text-left">
          
          <AnimatePresence mode="wait">
            {isPending ? (
              <motion.div
                key="loading-pantheon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 flex flex-col items-center justify-center text-center space-y-5"
              >
                <div className="w-10 h-10 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono tracking-wider font-semibold text-purple-300">{statusMessage}</p>
              </motion.div>
            ) : authMethod === 'google' ? (
              /* Simulated Google Single Sign-On Account Picker */
              <motion.div
                key="google-selector-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-5"
              >
                {showGoogleChooser && (
                  <>
                    <div className="text-center pb-1">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-[#8B5CF6] uppercase block mb-1">
                        Google Secure login
                      </span>
                      <h3 className="text-base font-black text-white tracking-tight">
                        Choose an Account
                      </h3>
                      <p className="text-[10px] text-purple-200/50 mt-1">
                        to continue to <span className="text-violet-400 font-bold">Nexora</span>
                      </p>
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {[
                        { email: 'ogoulu131@gmail.com', name: 'Ogoulu', desc: 'Voice of Harrison', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80' },
                        { email: 'voh@nexora.com', name: 'VOH Creator', desc: 'Nexora Creator', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80' },
                        { email: 'guest.explorer@gmail.com', name: 'Guest Explorer', desc: 'Guest Explorer', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80' }
                      ].map((act, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSelectGoogleAccount(act)}
                          className="w-full text-left p-3 rounded-2xl bg-white/[0.02] hover:bg-purple-950/30 border border-white/5 hover:border-[#8B5CF6]/30 active:scale-98 transition-all flex items-center gap-3 cursor-pointer"
                        >
                          <img src={act.avatar} alt={act.name} className="w-8 h-8 rounded-full object-cover ring-2 ring-violet-500/20" />
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-bold text-white leading-tight">{act.name}</div>
                            <div className="text-[10px] text-purple-300/40 leading-none mt-1 truncate">{act.email}</div>
                          </div>
                          <span className="text-xs text-zinc-500 font-mono">🔑</span>
                        </button>
                      ))}

                      {/* Add Another Google Account Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedGoogleAccount({ email: 'new_sso_explorer@gmail.com', name: 'Google Explorer' });
                          setShowGoogleChooser(false);
                          setShowGooglePermission(true);
                        }}
                        className="w-full p-3 rounded-2xl bg-[#1E1B4B]/30 hover:bg-[#1E1B4B]/50 border border-purple-500/10 text-center text-xs font-sans text-purple-300 hover:text-white transition-all cursor-pointer"
                      >
                        ➕ Use another Google account
                      </button>
                    </div>
                  </>
                )}

                {showGooglePermission && selectedGoogleAccount && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-violet-600/20 border border-violet-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <ShieldCheck className="w-6 h-6 text-violet-400" />
                      </div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Access Authorization Requested</h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed mt-2">
                        <span className="text-white font-semibold">Nexora App</span> wants to access your Google Profile information and primary email address (<span className="text-violet-400">{selectedGoogleAccount.email}</span>).
                      </p>
                    </div>

                    <div className="p-3 bg-black/40 border border-white/5 rounded-2xl space-y-2 text-[10px] text-zinc-400 leading-normal">
                      <div className="flex gap-2 items-start">
                        <span className="text-violet-400 font-black">✓</span>
                        <span>Read your public profile name, avatar photo, and handle.</span>
                      </div>
                      <div className="flex gap-2 items-start">
                        <span className="text-violet-400 font-black">✓</span>
                        <span>Associate your verified Google email with your Nexora account.</span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={handleConfirmGooglePermissions}
                        className="flex-1 py-3 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                      >
                        Grant & Continue
                      </button>
                      <button
                        onClick={() => {
                          setShowGooglePermission(false);
                          setShowGoogleChooser(true);
                        }}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border border-white/10"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('none');
                    setErrorMsg('');
                  }}
                  className="mx-auto block text-[9px] uppercase font-mono font-bold tracking-widest text-[#8B5CF6] hover:text-[#9F7AEA] transition-colors pt-2 cursor-pointer"
                >
                  ← Go Back To Credentials
                </button>
              </motion.div>
            ) : authMethod === 'phone' ? (
              /* Upgraded SMS Verification Mode with country picker and flag */
              <motion.form
                key="phone-verification-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handlePhoneSubmit}
                className="space-y-5"
              >
                <div className="text-center pb-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#8B5CF6] uppercase block mb-1">
                    Phone Authentication
                  </span>
                  <h3 className="text-lg font-extrabold text-white tracking-tight">
                    {smsSent ? 'Verify Access Code' : 'Enter Phone Number'}
                  </h3>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium font-sans flex items-start gap-2">
                    <span className="font-mono text-rose-500 mt-0.5">⚡</span>
                    <span className="flex-1 leading-normal">{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {!smsSent ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-purple-200/80">Phone Number</label>
                      <div className="flex gap-2 relative">
                        {/* Country Picker Toggle */}
                        <button
                          type="button"
                          onClick={() => setShowCountryPicker(!showCountryPicker)}
                          className="px-3 bg-purple-950/20 hover:bg-purple-950/40 border border-purple-500/10 rounded-xl flex items-center gap-1.5 text-xs text-white font-bold cursor-pointer"
                        >
                          <span>{selectedCountry.code}</span>
                          <span className="text-[10px] text-zinc-500">▼</span>
                        </button>

                        <div className="relative flex-1">
                          <Smartphone className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                          <input
                            type="tel"
                            required
                            placeholder="803 000 0000"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                            className="w-full pl-11 pr-4 py-3.5 text-xs bg-purple-950/10 border border-purple-500/10 focus:border-[#8B5CF6] rounded-xl font-mono text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all placeholder-purple-200/30"
                          />
                        </div>

                        {/* Country Picker Dropdown */}
                        {showCountryPicker && (
                          <div className="absolute left-0 top-14 w-48 bg-zinc-950 border border-purple-500/20 rounded-xl z-50 overflow-hidden shadow-2xl p-1 animate-fadeIn">
                            {[
                              { code: '+234', name: 'Nigeria 🇳🇬' },
                              { code: '+1', name: 'United States 🇺🇸' },
                              { code: '+44', name: 'United Kingdom 🇬🇧' },
                              { code: '+55', name: 'Brazil 🇧🇷' },
                              { code: '+91', name: 'India 🇮🇳' }
                            ].map((c) => (
                              <button
                                key={c.code}
                                type="button"
                                onClick={() => {
                                  setSelectedCountry(c);
                                  setShowCountryPicker(false);
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-purple-950/30 text-xs text-white font-sans transition-all flex justify-between cursor-pointer"
                              >
                                <span>{c.name}</span>
                                <span className="font-mono text-purple-400">{c.code}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-1.5"
                    >
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-purple-200/80">6-Digit Verification Code</label>
                        {otpCountdown > 0 ? (
                          <span className="text-[10px] font-mono text-purple-400">Resend in {otpCountdown}s</span>
                        ) : (
                          <button
                            type="button"
                            onClick={handlePhoneSubmit} // simulate resending OTP
                            className="text-[10px] font-mono text-violet-400 hover:underline cursor-pointer font-bold uppercase"
                          >
                            Resend Code
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="••••••"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-11 pr-4 py-3 text-xs bg-purple-950/10 border border-purple-500/10 focus:border-[#8B5CF6] rounded-xl font-mono text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all placeholder-purple-200/30 tracking-[1em] text-center text-sm font-black"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-lg active:scale-98 flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <span>{smsSent ? 'Verify Code & Launch' : 'Send Verification SMS'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {/* Voice Call Fallback button if SMS not receiving */}
                {smsSent && (
                  <button
                    type="button"
                    onClick={triggerVoiceOTP}
                    className="w-full text-center py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-mono text-purple-300 flex items-center justify-center gap-1.5 cursor-pointer uppercase"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Call me instead (Voice Fallback)
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('none');
                    setSmsSent(false);
                    setErrorMsg('');
                  }}
                  className="mx-auto block text-[10px] uppercase font-mono font-bold tracking-widest text-purple-300/60 hover:text-white transition-colors"
                >
                  ← Go Back To Credentials
                </button>
              </motion.form>
            ) : authMode === 'forgot_password' ? (
              /* Completely New Password Recovery / Password Reset screen */
              <motion.form
                key="password-recovery-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleForgotPasswordSubmit}
                className="space-y-5"
              >
                <div className="text-center pb-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-pink-400 uppercase block mb-1">
                    Credential Recovery
                  </span>
                  <h3 className="text-lg font-extrabold text-white tracking-tight">
                    {recoveryStep === 1 ? 'Recover Password' : recoveryStep === 2 ? 'Verify Security OTP' : 'Reset Password'}
                  </h3>
                  <p className="text-[10px] text-zinc-400 leading-normal mt-1 max-w-xs mx-auto">
                    {recoveryStep === 1 ? 'Enter your registered email node below to fetch access codes.' : recoveryStep === 2 ? `A verification code was routed to ${recoveryEmail}.` : 'Securely create a strong replacement password.'}
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium font-sans flex items-start gap-2">
                    <span className="font-mono text-rose-500 mt-0.5">⚡</span>
                    <span className="flex-1 leading-normal">{errorMsg}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {recoveryStep === 1 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-purple-200/80">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                        <input
                          type="email"
                          required
                          placeholder="alex@nexora.com"
                          value={recoveryEmail}
                          onChange={(e) => setRecoveryEmail(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 text-xs bg-purple-950/10 border border-purple-500/10 focus:border-[#8B5CF6] rounded-xl font-sans text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all"
                        />
                      </div>
                    </div>
                  )}

                  {recoveryStep === 2 && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-purple-200/80">Email Code OTP</label>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                        <input
                          type="text"
                          required
                          placeholder="••••••"
                          maxLength={6}
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-11 pr-4 py-3 text-xs bg-purple-950/10 border border-purple-500/10 focus:border-[#8B5CF6] rounded-xl font-mono text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all tracking-[1em] text-center font-bold"
                        />
                      </div>
                    </div>
                  )}

                  {recoveryStep === 3 && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-purple-200/80">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                          <input
                            type={showRecoverPasswordCheck ? 'text' : 'password'}
                            required
                            placeholder="Set complex replacement..."
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full pl-11 pr-10 py-3 text-xs bg-purple-950/10 border border-purple-500/10 focus:border-[#8B5CF6] rounded-xl font-sans text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRecoverPasswordCheck(!showRecoverPasswordCheck)}
                            className="absolute right-3 top-3 text-purple-400 hover:text-purple-300"
                          >
                            {showRecoverPasswordCheck ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {/* Beautiful password strength progress bar indicator */}
                        {newPassword && (
                          <div className="space-y-1.5 pt-1 animate-fadeIn">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-mono text-zinc-500 uppercase">Password Security Index:</span>
                              <span className="text-[9px] font-mono font-extrabold text-purple-400 uppercase">
                                {getPasswordStrength(newPassword).label}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${getPasswordStrength(newPassword).color} transition-all duration-300`} 
                                style={{ width: `${getPasswordStrength(newPassword).score}%` }} 
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-purple-200/80">Confirm New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                          <input
                            type={showRecoverPasswordCheck ? 'text' : 'password'}
                            required
                            placeholder="Re-enter password..."
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 text-xs bg-purple-950/10 border border-purple-500/10 focus:border-[#8B5CF6] rounded-xl font-sans text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-full bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-lg active:scale-98 flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase tracking-wider"
                >
                  <span>
                    {recoveryStep === 1 ? 'Send Recovery OTP' : recoveryStep === 2 ? 'Verify OTP Code' : 'Save Credentials'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setRecoveryStep(1);
                    setErrorMsg('');
                  }}
                  className="mx-auto block text-[10px] uppercase font-mono font-bold tracking-widest text-purple-300/60 hover:text-white transition-colors"
                >
                  ← Return to Login page
                </button>
              </motion.form>
            ) : savedAccounts.length > 0 && authMode === 'login' ? (
              /* Remembered Accounts list on current device (Skip typing email/password) */
              <motion.div
                key="saved-accounts-panel"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <span className="text-[10px] font-mono font-extrabold tracking-widest text-[#8B5CF6] uppercase block mb-1">
                    Welcome Back to Nexora
                  </span>
                  <h3 className="text-lg font-extrabold text-white tracking-tight">Who is signing in?</h3>
                  <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                    Select a remembered node on this browser to authenticate instantly.
                  </p>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {savedAccounts.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => handleSavedAccountClick(user)}
                      className="w-full text-left p-3.5 rounded-2xl bg-white/[0.02] hover:bg-purple-950/30 border border-white/5 hover:border-violet-500/30 active:scale-98 transition-all flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-xl object-cover border border-purple-500/10 ring-2 ring-purple-500/20"
                          />
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#0e0b24]" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-white truncate flex items-center gap-1 font-sans">
                            {user.name}
                            {user.isVerified && <span className="text-purple-400 text-[10px]">⭐</span>}
                          </h4>
                          <p className="text-[10px] text-purple-300/50 font-mono truncate">@{user.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleRemoveSavedAccount(user.id, e)}
                        className="p-1.5 rounded-lg bg-red-500/5 hover:bg-red-500/20 border border-red-500/10 text-zinc-500 hover:text-red-400 transition-all cursor-pointer"
                        title="Remove Account from device"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="border-t border-purple-500/10 pt-4 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      // Bypass saved account list and load empty input form
                      setSavedAccounts([]);
                    }}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 text-xs font-semibold rounded-xl text-center uppercase tracking-wider cursor-pointer"
                  >
                    ➕ Use a different account
                  </button>
                </div>
              </motion.div>
            ) : (
              /* Upgrade Credentials Inputs Form - More spacious & glowing input */
              <motion.form
                key="credentials-main-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleEmailAuthSubmit}
                className="space-y-4"
              >
                {/* Error / Success message slots */}
                {errorMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium font-sans flex items-start gap-2"
                  >
                    <span className="font-mono text-rose-500 mt-0.5">⚡</span>
                    <span className="flex-1 leading-normal">{errorMsg}</span>
                  </motion.div>
                )}

                {successMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium font-sans flex items-start gap-2"
                  >
                    <span className="font-mono text-emerald-500 mt-0.5">🟢</span>
                    <span className="flex-1 leading-normal">{successMsg}</span>
                  </motion.div>
                )}

                {authMode === 'signup' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-purple-200/90">Full Name</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400 transition-colors" />
                        <input
                          type="text"
                          required
                          placeholder="Alex Sterling"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 text-xs bg-purple-950/10 border border-purple-500/10 focus:border-[#8B5CF6] rounded-xl font-sans text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all placeholder-purple-200/30"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-purple-200/90">Username Handle (Lower Unique ID)</label>
                      <div className="relative group">
                        <span className="absolute left-3.5 top-3 text-purple-400 font-mono text-xs">@</span>
                        <input
                          type="text"
                          required
                          placeholder="alex_sterling"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          className="w-full pl-8 pr-4 py-3 text-xs bg-purple-950/10 border border-purple-500/10 focus:border-[#8B5CF6] rounded-xl font-mono text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all placeholder-purple-200/30"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-purple-200/90">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400 transition-colors" />
                    <input
                      type="email"
                      required
                      placeholder="alex@nexora.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 text-xs bg-purple-950/10 border border-purple-500/10 focus:border-[#8B5CF6] rounded-xl font-sans text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all placeholder-purple-200/30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-purple-200/90">
                      {authMode === 'signup' ? 'Create Password' : 'Password'}
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot_password');
                          setRecoveryStep(1);
                          setErrorMsg('');
                        }}
                        className="text-[10px] font-bold text-violet-400 hover:underline cursor-pointer uppercase"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-purple-400" />
                    <input
                      type="password"
                      required
                      placeholder={authMode === 'signup' ? 'Set Access Password' : 'Enter password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 text-xs bg-purple-950/10 border border-purple-500/10 focus:border-[#8B5CF6] rounded-xl font-sans text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all placeholder-purple-200/30"
                    />
                  </div>
                </div>

                {authMode === 'signup' && (
                  <div className="flex items-start gap-2.5 pt-2 pb-1 text-left select-none">
                    <input
                      id="agreement-checkbox"
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(e) => setAcceptedTerms(e.target.checked)}
                      className="w-4 h-4 min-w-[16px] rounded border-purple-500/30 text-purple-600 focus:ring-purple-500/20 mt-0.5 accent-purple-600 bg-purple-950/20 cursor-pointer"
                    />
                    <label htmlFor="agreement-checkbox" className="text-[11px] text-purple-200/80 leading-normal font-sans cursor-pointer">
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePolicyTab('terms');
                          setShowPolicyModal(true);
                        }}
                        className="text-purple-400 font-bold hover:underline bg-transparent border-none p-0 inline"
                      >
                        NEXORA Terms of Service
                      </button>
                      ,{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePolicyTab('privacy');
                          setShowPolicyModal(true);
                        }}
                        className="text-purple-400 font-bold hover:underline bg-transparent border-none p-0 inline"
                      >
                        Privacy Policy
                      </button>
                      , and{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setActivePolicyTab('guidelines');
                          setShowPolicyModal(true);
                        }}
                        className="text-purple-400 font-bold hover:underline bg-transparent border-none p-0 inline"
                      >
                        Community Guidelines
                      </button>
                      .
                    </label>
                  </div>
                )}

                {/* Main Action - Glowing purple button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] hover:from-[#7C3AED] hover:to-[#8B5CF6] text-white font-black text-xs uppercase tracking-wider shadow-lg active:scale-98 flex items-center justify-center gap-1.5 transition-all cursor-pointer relative overflow-hidden group"
                  >
                    <span className="relative z-10 flex items-center gap-1">
                      {authMode === 'signup' ? 'Join NEXORA' : 'Log In'}{' '}
                      <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                    </span>
                    <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>

                {/* Symmetrical Mode swap */}
                <div className="text-center text-xs text-purple-200/60 pt-1">
                  {authMode === 'signup' ? (
                    <p>
                      Already a member?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('login');
                          setAuthMethod('none');
                          setErrorMsg('');
                        }}
                        className="text-[#8B5CF6] hover:text-purple-300 font-extrabold cursor-pointer hover:underline transition-colors ml-1"
                      >
                        Log In
                      </button>
                    </p>
                  ) : (
                    <p>
                      New to the social network?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('signup');
                          setAuthMethod('none');
                          setErrorMsg('');
                        }}
                        className="text-[#8B5CF6] hover:text-purple-300 font-extrabold cursor-pointer hover:underline transition-colors ml-1"
                      >
                        Join NEXORA
                      </button>
                    </p>
                  )}
                </div>

                {/* TESTING ASSISTANT SHORTCUT CARDS */}
                {authMode === 'login' && isOwnerMode && (
                  <div className="border-t border-purple-500/10 pt-3 mt-1 text-left space-y-1.5">
                    <span className="text-[10px] font-mono tracking-wider font-extrabold text-purple-400 block">
                      ⚡ PRE-CONFIGURED ACCOUNTS (Click to autofill):
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: 'Voice of Harrison', email: 'ogoulu131@gmail.com', role: 'Founder' },
                        { label: 'test1@nexora.com', email: 'test1@nexora.com', role: 'Tester 1' },
                        { label: 'test2@nexora.com', email: 'test2@nexora.com', role: 'Tester 2' },
                        { label: 'user3@gmail.com', email: 'user3@gmail.com', role: 'User 3' }
                      ].map((item, id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setEmail(item.email);
                            setPassword('password123');
                          }}
                          className="p-1.5 px-2 rounded-lg bg-white/[0.02] hover:bg-purple-950/30 border border-white/5 hover:border-[#8B5CF6]/30 text-left transition-all"
                        >
                          <div className="text-[10px] font-bold text-white leading-tight truncate">{item.label}</div>
                          <div className="text-[8px] text-purple-300/40 leading-none truncate mt-0.5">{item.role} (Key: password123)</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Native looking Social login segment */}
                <div className="relative my-7 text-center">
                  <span className="text-[9px] font-mono font-bold text-purple-300/40 uppercase tracking-widest relative z-10 bg-[#09071b] px-4 select-none">
                    OR CONTINUE WITH
                  </span>
                  <div className="absolute inset-y-1/2 left-0 right-0 h-px bg-purple-500/10" />
                </div>

                <div className="space-y-3">
                  {/* Google Button */}
                  <button
                    type="button"
                    onClick={triggerOAuthSimulation}
                    className="w-full flex items-center justify-start px-6 py-3.5 rounded-full bg-white text-zinc-900 hover:bg-zinc-100 active:scale-98 transition-all gap-3 shadow-md font-medium text-xs hover:shadow-lg cursor-pointer"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span className="flex-1 text-center font-black text-zinc-800">Continue with Google</span>
                  </button>

                  {/* Phone Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('phone');
                      setPhoneNumber('');
                      setSmsSent(false);
                      setErrorMsg('');
                    }}
                    className="w-full flex items-center justify-start px-6 py-3.5 rounded-full bg-[#1E1B4B]/80 text-white border border-purple-500/20 hover:bg-[#251E5C] hover:border-purple-500/45 active:scale-98 transition-all gap-3 shadow-md font-medium text-xs cursor-pointer"
                  >
                    <span className="text-base shrink-0 select-none">📱</span>
                    <span className="flex-1 text-center font-black text-purple-100">Continue with Phone Number</span>
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Micro trust line built premium style */}
          <div className="mt-6 text-center select-none">
            <span className="text-[10px] text-purple-200/35 block tracking-wide font-medium leading-relaxed">
              By continuing, you agree to NEXORA{' '}
              <button
                type="button"
                onClick={() => {
                  setActivePolicyTab('terms');
                  setShowPolicyModal(true);
                }}
                className="text-purple-400 hover:text-purple-300 underline cursor-pointer font-sans bg-transparent border-none p-0 inline font-bold"
              >
                Terms of Service
              </button>
              ,{' '}
              <button
                type="button"
                onClick={() => {
                  setActivePolicyTab('privacy');
                  setShowPolicyModal(true);
                }}
                className="text-purple-400 hover:text-purple-300 underline cursor-pointer font-sans bg-transparent border-none p-0 inline font-bold"
              >
                Privacy Policy
              </button>
              , and{' '}
              <button
                type="button"
                onClick={() => {
                  setActivePolicyTab('guidelines');
                  setShowPolicyModal(true);
                }}
                className="text-purple-400 hover:text-purple-300 underline cursor-pointer font-sans bg-transparent border-none p-0 inline font-bold"
              >
                Community Guidelines
              </button>
              .
            </span>
          </div>

        </div>

      </motion.div>

      <div className="flex-1" />

      {/* NEXORA POLICY TABS OVERLAY SCREEN */}
      <AnimatePresence>
        {showPolicyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[2000] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-[#0a071c] border border-violet-500/20 p-6 rounded-3xl space-y-4 shadow-2xl relative text-left"
            >
              <div className="flex items-center justify-between border-b border-violet-500/10 pb-3">
                <div className="flex gap-2">
                  {[
                    { id: 'terms', name: 'Terms of Service', icon: FileText },
                    { id: 'privacy', name: 'Privacy Center', icon: ShieldCheck },
                    { id: 'guidelines', name: 'Guidelines', icon: Info }
                  ].map((tb) => (
                    <button
                      key={tb.id}
                      onClick={() => setActivePolicyTab(tb.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${activePolicyTab === tb.id ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 hover:bg-white/10 text-zinc-400 border-transparent'}`}
                    >
                      <tb.icon className="w-3.5 h-3.5" />
                      <span>{tb.name}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setShowPolicyModal(false)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Policy Body */}
              <div className="max-h-96 overflow-y-auto pr-1">
                {activePolicyTab === 'terms' && TERMS_TEXT}
                {activePolicyTab === 'privacy' && PRIVACY_TEXT}
                {activePolicyTab === 'guidelines' && GUIDELINES_TEXT}
              </div>

              <div className="border-t border-white/5 pt-3 flex justify-end">
                <button
                  onClick={() => setShowPolicyModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-linear-to-r from-violet-600 to-pink-600 hover:brightness-110 text-white font-sans text-xs font-black transition-all cursor-pointer shadow-md uppercase"
                >
                  Acknowledge & Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Symmetrical Modal for showing agreement check error */}
      <AnimatePresence>
        {showAgreementError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2010] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-[#0f0b24] border border-red-500/25 p-6 rounded-3xl space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-xl">
                ⚠️
              </div>
              <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider">Agreement Required</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                Before creating a secure Nexora account, you must review and explicitly agree to the Nexora Terms of Service, Privacy Policy, and Community Guidelines.
              </p>
              <button
                onClick={() => {
                  setShowAgreementError(false);
                  setAcceptedTerms(true);
                  window.dispatchEvent(new CustomEvent('toast', { detail: '✓ Terms Accepted' }));
                }}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-sans text-xs font-black rounded-xl transition-all uppercase cursor-pointer"
              >
                I Agree & Accept Terms
              </button>
              <button
                onClick={() => setShowAgreementError(false)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-zinc-400 font-mono text-[10px] font-bold rounded-xl transition-all uppercase border border-white/5 cursor-pointer"
              >
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
