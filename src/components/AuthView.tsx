import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Smartphone,
  Lock,
  Mail,
  User as UserIcon,
  X,
  ShieldCheck,
  FileText,
  Scale
} from 'lucide-react';

import { User } from '../types';
import { INITIAL_USER, MOCK_CREATORS, ADDITIONAL_TEST_ACCOUNTS, INITIAL_CIRCLES } from '../data/database';
import { followUserDb, unfollowUserDb, joinCircleDb, leaveCircleDb, isFollowingDb, isCircleJoinedDb, getRichUser } from '../data/database';
import NexoraPremiumLogo from './NexoraPremiumLogo';

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
        <li>Provide accurate registration information</li>
        <li>Maintain a secure account</li>
      </ul>
      <p>NEXORA may suspend or terminate accounts that violate eligibility requirements.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">3. Account Responsibility</h4>
      <p>You are responsible for:</p>
      <ul className="list-disc pl-4 space-y-1 text-purple-200/90">
        <li>Your account</li>
        <li>Your password</li>
        <li>Your activity</li>
        <li>Content posted from your account</li>
      </ul>
      <p>Do not share your login credentials with others.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">4. Acceptable Use</h4>
      <p>You agree not to:</p>
      <ul className="list-none space-y-1 pl-1 text-purple-200/90">
        <li>❌ Harass or threaten others</li>
        <li>❌ Promote violence</li>
        <li>❌ Share malicious software</li>
        <li>❌ Conduct scams or fraud</li>
        <li>❌ Impersonate individuals or organizations</li>
        <li>❌ Manipulate followers, reputation, sparks, or engagement</li>
        <li>❌ Create fake accounts for deceptive purposes</li>
        <li>❌ Interfere with platform security</li>
      </ul>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">5. Content Ownership</h4>
      <p>You retain ownership of content you create.</p>
      <p>By posting content on NEXORA, you grant NEXORA a non-exclusive license to Host, Display, Store, and Distribute your content for platform functionality.</p>
      <p>You remain the owner of your content.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">6. Reputation Integrity</h4>
      <p>NEXORA's Reputation System is based on authentic participation.</p>
      <p>Users may not purchase reputation, artificially inflate reputation, use bots, create fake engagement, or manipulate rankings. Violations may result in penalties or account removal.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">7. Communities and Circles</h4>
      <p>Community owners and moderators must follow NEXORA rules, maintain healthy discussions, avoid abuse of power, and prevent harmful content. NEXORA reserves the right to intervene where necessary.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">8. Platform Moderation</h4>
      <p>NEXORA may remove content, restrict visibility, suspend accounts, and permanently ban users when required to protect users and platform integrity.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">9. Intellectual Property</h4>
      <p>The NEXORA brand, logo, design system, and platform technologies belong to NEXORA. Unauthorized use is prohibited.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">10. Termination</h4>
      <p>Users may delete their account and stop using NEXORA at any time. NEXORA may suspend or terminate access for violations of these Terms.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-[#A78BFA]">11. Changes to Terms</h4>
      <p>NEXORA may update these Terms periodically. Continued use constitutes acceptance of updated Terms.</p>
    </div>
  </div>
);

const PRIVACY_TEXT = (
  <div className="space-y-5 text-xs text-purple-200/80 leading-relaxed font-sans">
    <div className="border-b border-purple-500/10 pb-3">
      <h3 className="text-base font-extrabold text-white">NEXORA Privacy Policy</h3>
      <p className="text-[10px] text-purple-300/50 mt-1">Your privacy matters. • NEXORA is committed to transparency and protecting user data.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Information We Collect</h4>
      <p className="font-semibold text-purple-300">Account Information</p>
      <ul className="list-disc pl-4 space-y-1 text-purple-200/90">
        <li>Full name</li>
        <li>Username</li>
        <li>Email address</li>
        <li>Phone number</li>
        <li>Profile details</li>
      </ul>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Content Information</h4>
      <p>Content you create including: Posts, Comments, Voice posts, Messages, Communities, Circles, and Polls.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Usage Information</h4>
      <p>We may collect: Device information, Login activity, App interactions, Feature usage, and Security events.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Why We Collect Information</h4>
      <p>To create and manage accounts, deliver platform features, personalize recommendations, improve VOH AI, detect abuse, maintain security, and improve overall user experience.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">VOH AI Processing</h4>
      <p>VOH AI may process user content to generate summaries, recommend communities, recommend people, enable translation, and improve discovery. VOH AI does not sell user conversations to advertisers.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Data Security</h4>
      <p>NEXORA implements security measures designed to protect user information, including secure authentication, encrypted communications where applicable, access controls, and active monitoring and abuse prevention.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">User Rights</h4>
      <p>Users may edit account information, download account data, delete content, and delete their account at any time.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Third-Party Services</h4>
      <p>NEXORA may use trusted third-party services including Google Authentication, Supabase, analytics providers, payment providers, and infrastructure providers to operate the platform.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Data Retention</h4>
      <p>We retain information only as long as reasonably necessary to operate services, maintain security, and meet legal obligations.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Children's Privacy</h4>
      <p>NEXORA does not knowingly collect personal information from users below the minimum age requirement.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-[#A78BFA]">Policy Updates</h4>
      <p>We may update this Privacy Policy periodically. Changes will be communicated within the platform.</p>
    </div>
  </div>
);

const GUIDELINES_TEXT = (
  <div className="space-y-5 text-xs text-purple-200/80 leading-relaxed font-sans">
    <div className="border-b border-purple-500/10 pb-3">
      <h3 className="text-base font-extrabold text-white">NEXORA Community Guidelines</h3>
      <p className="text-[10px] text-purple-300/50 mt-1">Building the World's Living Social Network</p>
    </div>

    <p className="font-semibold text-purple-300">
      NEXORA is built around: 🧠 Knowledge • 🤝 Collaboration • 🌍 Community • 🚀 Innovation • ⭐ Reputation
    </p>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-emerald-400">What We Encourage</h4>
      <ul className="list-disc pl-4 space-y-1.5 text-purple-200/90">
        <li><strong>Respect:</strong> Treat others with dignity.</li>
        <li><strong>Meaningful Discussions:</strong> Share ideas, experiences, knowledge, and insights.</li>
        <li><strong>Community Building:</strong> Create communities that help people learn, grow, and collaborate.</li>
        <li><strong>Authenticity:</strong> Be yourself, use your real voice, and build genuine relationships.</li>
        <li><strong>Constructive Debate:</strong> Disagreement is allowed. Personal attacks are not.</li>
      </ul>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-rose-400">What Is Not Allowed</h4>
      <ul className="list-disc pl-4 space-y-1.5 text-purple-200/90">
        <li><strong>Hate Speech:</strong> Content attacking people based on identity is prohibited.</li>
        <li><strong>Harassment:</strong> Bullying, intimidation, or targeted abuse is prohibited.</li>
        <li><strong>Fraud and Scams:</strong> Misleading users for financial or personal gain is prohibited.</li>
        <li><strong>Spam:</strong> Repeated unwanted content, mass promotion, or manipulation is prohibited.</li>
        <li><strong>Impersonation:</strong> Pretending to be another person, brand, or organization is prohibited.</li>
        <li><strong>Reputation Manipulation:</strong> Users may not buy followers, buy reputation, use bots, or generate fake engagement.</li>
        <li><strong>Harmful Content:</strong> Content that promotes violence, exploitation, or illegal activities is prohibited.</li>
      </ul>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">Communities</h4>
      <p>Community leaders are expected to promote healthy participation, enforce guidelines fairly, encourage collaboration, and prevent abuse.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-purple-400">VOH AI and Moderation</h4>
      <p>VOH AI may assist in detecting spam, identifying abuse, flagging harmful content, and improving community safety. Human review may be used where appropriate.</p>
    </div>

    <div className="space-y-2">
      <h4 className="text-xs font-bold text-white uppercase tracking-wider text-[#A78BFA]">Enforcement</h4>
      <p>Violations may result in: ⚠️ Warnings, 🚫 Content removal, ⏸ Account restrictions, 🔒 Suspension, or ❌ Permanent bans.</p>
    </div>
  </div>
);

const CORE_PRINCIPLE_TEXT = (
  <div className="p-4 bg-purple-950/20 border border-purple-500/10 rounded-2xl text-xs space-y-2 leading-relaxed">
    <h4 className="text-xs font-black text-purple-400 flex items-center gap-1.5 font-sans uppercase tracking-wider">
      <span>🟣✓</span> NEXORA'S CORE PRINCIPLE
    </h4>
    <blockquote className="border-l-2 border-purple-500 pl-3 italic text-purple-200/90">
      “NEXORA is not built around popularity. It is built around reputation, community, knowledge, opportunity, and meaningful human connection. Every follower should be earned. Every reputation point should be earned. Every contribution should matter.”
    </blockquote>
  </div>
);

interface AuthViewProps {
  onLoginSuccess: (loggedUser: User) => void;
}

interface RegisteredAccount {
  email: string;
  passwordHash: string;
  user: User;
}

const loadAccounts = (): RegisteredAccount[] => {
  const stored = localStorage.getItem('nexora_registered_accounts');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      // fallback
    }
  }
  const defaults: RegisteredAccount[] = [
    { email: 'ogoulu131@gmail.com', passwordHash: 'password123', user: INITIAL_USER },
    { email: 'voh@nexora.com', passwordHash: 'password123', user: INITIAL_USER },
    { email: 'ai@nexora.com', passwordHash: 'password123', user: MOCK_CREATORS[0] },
    { email: 'voh_ai@nexora.com', passwordHash: 'password123', user: MOCK_CREATORS[1] }
  ];
  localStorage.setItem('nexora_registered_accounts', JSON.stringify(defaults));
  return defaults;
};

export default function AuthView({ onLoginSuccess }: AuthViewProps) {
  const [authMode, setAuthMode] = useState<'signup' | 'login'>('login');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Symmetrical state variables for Terms of Service, Privacy Policy, and Community Guidelines integration
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showAgreementError, setShowAgreementError] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState<'terms' | 'privacy' | 'guidelines'>('terms');
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  
  // Simulated authentication state
  const [authMethod, setAuthMethod] = useState<'none' | 'email' | 'phone' | 'google'>('none');
  const [isPending, setIsPending] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [googleChosenEmail, setGoogleChosenEmail] = useState('');

  // Owner Mode unlocking mechanism (Secret key or 5 logo clicks)
  const [logoClicks, setLogoClicks] = useState(0);

  const isOwnerMode = email.trim().toLowerCase() === 'ogoulu131@gmail.com' || 
                      googleChosenEmail.trim().toLowerCase() === 'ogoulu131@gmail.com' ||
                      logoClicks >= 5;

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const next = prev + 1;
      if (next === 5) {
        window.dispatchEvent(new CustomEvent('toast', { detail: '⚡ Nexora dev shortcuts unlocked!' }));
      }
      return next;
    });
  };

  // Immersive Onboarding Wizard State
  const [onboardingUser, setOnboardingUser] = useState<User | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [onboardingFollows, setOnboardingFollows] = useState<string[]>([]);
  const [onboardingCircles, setOnboardingCircles] = useState<string[]>([]);
  const [onboardingLanguage, setOnboardingLanguage] = useState<'en' | 'fr' | 'ar' | 'pt'>('en');

  const handleEmailAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // REQUIRED ERROR MESSAGE: Gating account creation until Terms are accepted
    if (authMode === 'signup' && !acceptedTerms) {
      setShowAgreementError(true);
      return;
    }

    setAuthMethod('email');
    setIsPending(true);
    setStatusMessage(authMode === 'signup' ? 'Creating your NEXORA account...' : 'Logging into your NEXORA account...');

    setTimeout(() => {
      const registry = loadAccounts();
      const lowerEmail = email.toLowerCase().trim();

      if (authMode === 'login') {
        const found = registry.find(a => a.email.toLowerCase() === lowerEmail);
        if (!found) {
          setIsPending(false);
          setAuthMethod('none');
          setErrorMsg('Identity not recognized in the NEXORA registry. Please sign up to create this account!');
          return;
        }
        if (found.passwordHash !== password) {
          setIsPending(false);
          setAuthMethod('none');
          setErrorMsg('Incorrect secure access key. Please verify your password!');
          return;
        }
        setIsPending(false);
        onLoginSuccess(found.user);
      } else {
        // Sign up flow
        const cleanUsername = usernameInput.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        if (!cleanUsername) {
          setIsPending(false);
          setAuthMethod('none');
          setErrorMsg('Username must contain only alphanumeric characters or underscores!');
          return;
        }

        const emailExists = registry.some(a => a.email.toLowerCase() === lowerEmail);
        if (emailExists) {
          setIsPending(false);
          setAuthMethod('none');
          setErrorMsg('This email address is already connected to an active account.');
          return;
        }

        const usernameClashInRegistry = registry.some(a => a.user.username.trim().toLowerCase() === cleanUsername);
        const usernameClashInCreators = MOCK_CREATORS.some(c => c.username.trim().toLowerCase() === cleanUsername);
        const usernameClashInAdditional = ADDITIONAL_TEST_ACCOUNTS.some(t => t.username.trim().toLowerCase() === cleanUsername);
        const usernameClashInInitial = INITIAL_USER.username.trim().toLowerCase() === cleanUsername;

        if (usernameClashInRegistry || usernameClashInCreators || usernameClashInAdditional || usernameClashInInitial) {
          setIsPending(false);
          setAuthMethod('none');
          setErrorMsg('This username handle is already locked by another active account. Please select another!');
          return;
        }

        // Create new User profile dynamically
        const newUser: User = {
          id: `user-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          username: cleanUsername,
          name: fullName.trim() || 'New Explorer',
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
          bio: `Exploring interests as connected member level 1. Bio details not loaded yet.`,
          location: 'Earth Orbit',
          website: `nexora.ai/${cleanUsername}`,
          followers: 0,
          following: 0,
          sparks: 0,
          isVerified: false,
          coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
          joinedDate: 'Joined June 2026',
          reputationPoints: 0,
          reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
          interestDNA: {},
          skills: [],
          nexBalance: 0,
          totalEarnedNex: 0,
          pendingNex: 0,
          thisWeekEarnedNex: 0,
          thisMonthEarnedNex: 0,
          creatorModeEnabled: false
        };

        const updated = [...registry, { email: lowerEmail, passwordHash: password, user: newUser }];
        localStorage.setItem('nexora_registered_accounts', JSON.stringify(updated));

        setIsPending(false);
        setOnboardingUser(newUser);
        setOnboardingStep(1);
      }
    }, 1200);
  };

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!smsSent) {
      setAuthMethod('phone');
      setIsPending(true);
      setStatusMessage('Sending verification SMS...');
      
      setTimeout(() => {
        setIsPending(false);
        setSmsSent(true);
        setStatusMessage('Verification code sent to your phone.');
      }, 1000);
    } else {
      setIsPending(true);
      setStatusMessage('Verifying code & connecting your account...');
      
      setTimeout(() => {
        setIsPending(false);
        const registry = loadAccounts();
        const phoneEmail = `phone_${phoneNumber.replace(/\D/g, '')}@nexora.com`;
        
        const existing = registry.find(a => a.email === phoneEmail);
        if (existing) {
          onLoginSuccess(existing.user);
        } else {
          const generatedUsername = `phone_user_${phoneNumber.slice(-4) || 'explorer'}`;
          const phoneUser: User = {
            id: `user-phone-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            username: generatedUsername,
            name: `Phone Node (${phoneNumber})`,
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
            skills: [],
            nexBalance: 0,
            totalEarnedNex: 0,
            pendingNex: 0,
            thisWeekEarnedNex: 0,
            thisMonthEarnedNex: 0,
            creatorModeEnabled: false
          };

          const updated = [...registry, { email: phoneEmail, passwordHash: 'password123', user: phoneUser }];
          localStorage.setItem('nexora_registered_accounts', JSON.stringify(updated));
          setOnboardingUser(phoneUser);
          setOnboardingStep(1);
        }
      }, 1200);
    }
  };

  const triggerOAuthSimulation = () => {
    setAuthMethod('google');
    // We will make the Google auth open an direct selector layout inside the UI
  };

  if (onboardingUser) {
    // Recommend Accounts
    const getRecommendations = () => {
      const recs: typeof MOCK_CREATORS = [];
      const vohUser = INITIAL_USER;
      recs.push(vohUser);

      MOCK_CREATORS.forEach(cr => {
        if (!recs.some(r => r.id === cr.id)) {
          recs.push(cr);
        }
      });
      return recs;
    };

    // Recommend Circles
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
        // Fallback
        recs.push(INITIAL_CIRCLES[1]); // AI Synthesizers
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

      // Update registry
      const registry = loadAccounts();
      const updatedRegistry = registry.map(a => {
        if (a.user.id === onboardingUser.id) {
          return { ...a, user: finalUser };
        }
        return a;
      });
      localStorage.setItem('nexora_registered_accounts', JSON.stringify(updatedRegistry));

      // Redirect session in App.tsx
      onLoginSuccess(getRichUser(finalUser));
    };

    return (
      <div 
        id="auth-flow-viewport" 
        className="min-h-screen bg-[#030208] text-[#F3F4F6] flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden selection:bg-[#8B5CF6] selection:text-white"
      >
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl from-[#8B5CF6]/8 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[#8B5CF6]/5 to-transparent blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#0b091f_1px,transparent_1px),linear-gradient(to_bottom,#0b091f_1px,transparent_1px)] bg-[size:36px_36px] opacity-15" />

        <div className="flex-1" />

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl w-full mx-auto"
        >
          {/* Branding */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl bg-[#03010a]/80 border border-violet-500/15 mb-3 overflow-hidden">
              <NexoraPremiumLogo className="w-8 h-8" glow={true} />
            </div>
            <h1 className="text-xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-300 to-white font-sans select-none uppercase">
              Onboarding Setup
            </h1>
            <p className="text-xs text-purple-200/50 font-mono mt-1">NEXORA WELCOME SETUP</p>
          </div>

          <div className="bg-[#0b091c]/65 border border-purple-500/10 backdrop-blur-2xl rounded-[28px] p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {onboardingStep === 1 ? (
              <div id="onboarding-step-1">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white tracking-wide">Choose Your Interests & Language</h2>
                  <p className="text-xs text-purple-200/60 mt-1">
                    Welcome, <span className="text-violet-400 font-mono">@{onboardingUser.username}</span>! Customize your initial feed experience. Choose your primary language and select topics that align with your profile.
                  </p>
                </div>

                {/* 🌍 Language Protocol selection block */}
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
                            <span className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center text-[9px] text-white font-bold">✓</span>
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
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-white tracking-wide">Connect & Follow</h2>
                  <p className="text-xs text-purple-200/60 mt-1">
                    Based on your selected interests in <span className="text-violet-400 font-bold">{selectedInterests.join(', ')}</span>. Meet active creators and circles aligned with your profile. Users choose who they follow.
                  </p>
                </div>

                <div className="space-y-6">
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
                    Initialize Node & Enter
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

  return (
    <div 
      id="auth-flow-viewport" 
      className="min-h-screen bg-[#030208] text-[#F3F4F6] flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden selection:bg-[#8B5CF6] selection:text-white"
    >
      
      {/* Background Ambience Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-bl from-[#8B5CF6]/8 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-tr from-[#8B5CF6]/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0b091f_1px,transparent_1px),linear-gradient(to_bottom,#0b091f_1px,transparent_1px)] bg-[size:36px_36px] opacity-15" />

      {/* Decorative Flex spacing spacer */}
      <div className="flex-1" />

      {/* Main Container Core Box */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full mx-auto"
      >
        
        {/* Branding Area */}
        <div className="flex flex-col items-center text-center mb-8 px-4">
          <div 
            onClick={handleLogoClick}
            className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-[#03010a]/80 shadow-2xl shadow-cyan-500/10 border border-violet-500/15 mb-5 overflow-hidden group cursor-pointer transition-transform hover:scale-105 active:scale-95"
          >
            <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-cyan-500/10 to-transparent blur-md" />
            <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-fuchsia-500/10 to-transparent blur-md" />
            <NexoraPremiumLogo className="w-14 h-14" glow={true} />
          </div>

          <h1 className="text-4xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-purple-300 to-white font-sans select-none">
            NEXORA
          </h1>
          
          <h2 className="text-sm font-medium text-purple-200/90 mt-3 italic tracking-wide max-w-sm">
            “Discover people. Build communities. Shape what’s happening.”
          </h2>
          
          <p className="text-xs font-normal text-purple-200/60 mt-2 tracking-wide">
            Join millions discovering what’s happening in real time.
          </p>
        </div>

        {/* Content Box with Form & Social Sign-in */}
        <div className="bg-[#0b091c]/65 border border-purple-500/10 backdrop-blur-2xl rounded-[28px] p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">
          
          <AnimatePresence mode="wait">
            {isPending ? (
              <motion.div
                key="loading-pantheon"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="py-16 flex flex-col items-center justify-center text-center space-y-5"
              >
                <div className="w-10 h-10 border-2 border-[#8B5CF6] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-mono tracking-wider font-semibold text-purple-300">{statusMessage}</p>
              </motion.div>
            ) : authMethod === 'google' ? (
              /* Upgraded Federated Google Identity Selector */
              <motion.div
                key="google-selector-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5 text-left"
              >
                <div className="text-center pb-1">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#8B5CF6] uppercase block mb-1">
                    Google Sign-In Center
                  </span>
                  <h3 className="text-base font-black text-white tracking-tight">
                    {isOwnerMode ? 'Select an Identity' : 'Simulated Google Sign-In'}
                  </h3>
                  <p className="text-[10px] text-purple-200/50 mt-1 max-w-xs mx-auto">
                    {isOwnerMode ? 'Sign in dynamically as any pre-existing or custom identity.' : 'Sign in securely using your Google account identifier.'}
                  </p>
                </div>

                {isOwnerMode && (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {[
                      { email: 'ogoulu131@gmail.com', name: 'Voice of Harrison', desc: 'Founder & Primary Node' },
                      { email: 'test1@nexora.com', name: 'Test Account One', desc: 'Debugging Streams' },
                      { email: 'test2@nexora.com', name: 'Test Account Two', desc: 'Community Co-builder' },
                      { email: 'user3@gmail.com', name: 'User Three', desc: 'Quantum DNA Explorer' }
                    ].map((act, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setIsPending(true);
                          setStatusMessage(`Authenticating single sign-on token for ${act.email}...`);
                          setTimeout(() => {
                            const registry = loadAccounts();
                            const found = registry.find(a => a.email.toLowerCase() === act.email.toLowerCase());
                            setIsPending(false);
                            if (found) {
                              onLoginSuccess(found.user);
                            }
                          }, 1200);
                        }}
                        className="w-full text-left p-2.5 rounded-xl bg-white/[0.02] hover:bg-purple-950/30 border border-white/5 hover:border-[#8B5CF6]/30 active:scale-98 transition-all flex items-center justify-between"
                      >
                        <div>
                          <div className="text-[11px] font-black text-white leading-tight">{act.name}</div>
                          <div className="text-[9px] text-purple-300/40 leading-none mt-1">{act.email} ({act.desc})</div>
                        </div>
                        <span className="text-xs select-none">🔑</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-purple-500/10 pt-3">
                  <label className="text-[9px] font-bold text-purple-400 block mb-1.5 uppercase tracking-wider">
                    Or input custom Google email:
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="email"
                      placeholder="custom_gmail@gmail.com"
                      value={googleChosenEmail}
                      onChange={(e) => setGoogleChosenEmail(e.target.value)}
                      className="flex-1 px-3 py-2 bg-purple-950/20 border border-purple-500/10 hover:border-purple-500/25 focus:border-[#8B5CF6] rounded-xl font-sans text-white text-xs outline-hidden focus:ring-1 focus:ring-[#8B5CF6]/15 transition-all placeholder-purple-200/20"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!googleChosenEmail.includes('@')) {
                          setErrorMsg('Specify a valid email address.');
                          return;
                        }
                        setIsPending(true);
                        setStatusMessage(`Parsing custom SSO: ${googleChosenEmail}...`);
                        setTimeout(() => {
                          const registry = loadAccounts();
                          const cleanEmail = googleChosenEmail.toLowerCase().trim();
                          const found = registry.find(a => a.email === cleanEmail);
                          setIsPending(false);
                          if (found) {
                            onLoginSuccess(found.user);
                          } else {
                            // Register user on file
                            const prefix = cleanEmail.split('@')[0].replace(/[^a-z0-9_]/g, '');
                            const googleUser: User = {
                              id: `user-google-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
                              username: `g_${prefix || 'explorer'}`,
                              name: prefix.charAt(0).toUpperCase() + prefix.slice(1) || 'Google User',
                              avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
                              bio: `Signed up with Google`,
                              location: 'Google Account',
                              website: '',
                              followers: 0,
                              following: 0,
                              isVerified: cleanEmail.toLowerCase() === 'ogoulu131@gmail.com',
                              coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
                              joinedDate: 'Joined June 2026',
                              reputationPoints: 0,
                              reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
                              interestDNA: {},
                              skills: []
                            };
                            const updated = [...registry, { email: cleanEmail, passwordHash: 'password123', user: googleUser }];
                            localStorage.setItem('nexora_registered_accounts', JSON.stringify(updated));
                            setOnboardingUser(googleUser);
                            setOnboardingStep(1);
                          }
                        }, 1200);
                      }}
                      className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs rounded-xl active:scale-95 transition-all text-center leading-none"
                    >
                      Connect
                    </button>
                  </div>
                  {errorMsg && (
                    <p className="text-[9px] text-rose-400 font-mono mt-1.5 animate-pulse">
                      ⚡ {errorMsg}
                    </p>
                  )}
                </div>

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
              /* Upgraded SMS Verification Mode */
              <motion.form
                key="phone-verification-panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handlePhoneSubmit}
                className="space-y-6"
              >
                <div className="text-center pb-2">
                  <span className="text-[10px] font-mono font-bold tracking-widest text-[#8B5CF6] uppercase block mb-1">
                    Phone Authentication
                  </span>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    {smsSent ? 'Verify Access Code' : 'Enter Phone Number'}
                  </h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-purple-200/80">Phone Number</label>
                    <div className="relative group">
                      <Smartphone className="absolute left-3.5 top-3 w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                      <input
                        type="tel"
                        required
                        placeholder="+234 (803) 000-0000"
                        disabled={smsSent}
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 text-xs bg-purple-950/10 border border-purple-500/10 hover:border-purple-500/25 focus:border-[#8B5CF6] rounded-xl font-sans text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all placeholder-purple-200/30"
                      />
                    </div>
                  </div>

                  {smsSent && (
                    <motion.div 
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-1.5"
                    >
                      <label className="text-xs font-semibold text-purple-200/80">Verification Code</label>
                      <div className="relative group">
                        <Lock className="absolute left-3.5 top-3 w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                        <input
                          type="text"
                          required
                          placeholder="Enter 6-digit SMS code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 text-xs bg-purple-950/10 border border-purple-500/10 hover:border-purple-500/25 focus:border-[#8B5CF6] rounded-xl font-mono text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/20 transition-all placeholder-purple-200/30 tracking-widest text-center text-sm font-bold"
                        />
                      </div>
                    </motion.div>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-bold text-xs shadow-lg shadow-purple-500/15 active:scale-98 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>{smsSent ? 'Verify Code & Launch' : 'Send Verification SMS'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAuthMethod('none');
                    setSmsSent(false);
                  }}
                  className="mx-auto block text-[10px] uppercase font-mono font-bold tracking-widest text-purple-300/60 hover:text-white transition-colors"
                >
                  ← Go Back To Credentials
                </button>
              </motion.form>
            ) : (
              /* Upgrade Credentials Inputs Form - More spacious & glowing input */
              <motion.form
                key="credentials-main-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleEmailAuthSubmit}
                className="space-y-4"
              >
                {/* Error message slot */}
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

                {authMode === 'signup' && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-purple-200/90">Full Name</label>
                      <div className="relative group">
                        <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                        <input
                          type="text"
                          required
                          placeholder="Alex Sterling"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 text-xs bg-purple-950/10 border border-purple-500/10 hover:border-purple-500/25 focus:border-[#8B5CF6] rounded-xl font-sans text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all placeholder-purple-200/30"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-purple-200/90">Username Handle (Lower Unique ID)</label>
                      <div className="relative group">
                        <span className="absolute left-3.5 top-2.5 text-purple-400 font-mono text-xs">@</span>
                        <input
                          type="text"
                          required
                          placeholder="alex_sterling"
                          value={usernameInput}
                          onChange={(e) => setUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          className="w-full pl-8 pr-4 py-2.5 text-xs bg-purple-950/10 border border-purple-500/10 hover:border-purple-500/25 focus:border-[#8B5CF6] rounded-xl font-mono text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all placeholder-purple-200/30"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-purple-200/90">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-3 w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    <input
                      type="email"
                      required
                      placeholder="alex@nexora.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 text-xs bg-purple-950/10 border border-purple-500/10 hover:border-purple-500/25 focus:border-[#8B5CF6] rounded-xl font-sans text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all placeholder-purple-200/30"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-purple-200/90">
                    {authMode === 'signup' ? 'Create Password' : 'Password'}
                  </label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
                    <input
                      type="password"
                      required
                      placeholder={authMode === 'signup' ? 'Set Access Password' : 'Enter password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-2.5 text-xs bg-purple-950/10 border border-purple-500/10 hover:border-purple-500/25 focus:border-[#8B5CF6] rounded-xl font-sans text-white focus:outline-hidden focus:ring-2 focus:ring-[#8B5CF6]/15 transition-all placeholder-purple-200/30"
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
                  {authMode === 'signup' ? (
                    <button
                      type="submit"
                      className="w-full py-3 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] hover:from-[#7C3AED] hover:to-[#8B5CF6] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/15 active:scale-98 flex items-center justify-center gap-1.5 transition-all cursor-pointer relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center gap-1">
                        Join NEXORA <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                      </span>
                      <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      className="w-full py-3 rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#A78BFA] hover:from-[#7C3AED] hover:to-[#8B5CF6] text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-purple-500/15 active:scale-98 flex items-center justify-center gap-1.5 transition-all cursor-pointer relative overflow-hidden group"
                    >
                      <span className="relative z-10 flex items-center gap-1">
                        Log In <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                      </span>
                      <span className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>

                {/* Symmetrical Mode swap - Log In / Create account choice secondary link */}
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
                          className="p-1 px-2 rounded-lg bg-white/[0.02] hover:bg-purple-950/30 border border-white/5 hover:border-[#8B5CF6]/30 text-left transition-all"
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
                  {/* Upgrade 1: Google Button */}
                  <button
                    type="button"
                    onClick={triggerOAuthSimulation}
                    className="w-full flex items-center justify-start px-6 py-3 rounded-full bg-white text-zinc-900 hover:bg-zinc-100 active:scale-98 transition-all gap-3 shadow-md font-medium text-xs hover:shadow-lg"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span className="flex-1 text-center font-bold text-zinc-800">Continue with Google</span>
                  </button>

                  {/* Upgrade 2: Phone Button */}
                  <button
                    type="button"
                    onClick={() => setAuthMethod('phone')}
                    className="w-full flex items-center justify-start px-6 py-3 rounded-full bg-[#1E1B4B]/80 text-white border border-purple-500/20 hover:bg-[#251E5C] hover:border-purple-500/45 active:scale-98 transition-all gap-3 shadow-md font-medium text-xs scale-100"
                  >
                    <span className="text-base shrink-0 select-none">📱</span>
                    <span className="flex-1 text-center font-bold text-purple-100">Continue with Phone</span>
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

      {/* Decorative Flexible Lower Gap spacing */}
      <div className="flex-1" />

      {/* NEXORA POLICY TABS OVERLAY SCREEN */}
      <AnimatePresence>
        {showPolicyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b091c] border border-purple-500/20 max-w-2xl w-full rounded-3xl p-5 sm:p-7 relative flex flex-col max-h-[85vh] shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
            >
              <button
                type="button"
                onClick={() => setShowPolicyModal(false)}
                className="absolute top-4 right-4 text-purple-300/40 hover:text-white p-2 hover:bg-white/5 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Tabs selector */}
              <div className="flex border-b border-purple-500/10 pb-2 mt-2 gap-1 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActivePolicyTab('terms')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activePolicyTab === 'terms'
                      ? 'bg-purple-600/25 text-white border border-purple-500/30'
                      : 'text-purple-300/50 hover:text-purple-300 hover:bg-white/5'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  Terms of Service
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicyTab('privacy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activePolicyTab === 'privacy'
                      ? 'bg-purple-600/25 text-white border border-purple-500/30'
                      : 'text-purple-300/50 hover:text-purple-300 hover:bg-white/5'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Privacy Policy
                </button>
                <button
                  type="button"
                  onClick={() => setActivePolicyTab('guidelines')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activePolicyTab === 'guidelines'
                      ? 'bg-purple-600/25 text-white border border-purple-500/30'
                      : 'text-purple-300/50 hover:text-purple-300 hover:bg-white/5'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  Community Guidelines
                </button>
              </div>

              {/* Content Panel */}
              <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
                {activePolicyTab === 'terms' && TERMS_TEXT}
                {activePolicyTab === 'privacy' && PRIVACY_TEXT}
                {activePolicyTab === 'guidelines' && (
                  <div className="space-y-5">
                    {GUIDELINES_TEXT}
                    {CORE_PRINCIPLE_TEXT}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-3 border-t border-purple-500/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 hover:scale-102 transition-all text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  I Understand
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REQUIRED AGREEMENT ERROR MESSAGE MODAL */}
      <AnimatePresence>
        {showAgreementError && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#0b0916] border border-rose-500/30 max-w-sm w-full rounded-2xl p-6 text-center shadow-2xl relative space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-400 flex items-center justify-center mx-auto text-lg animate-pulse">
                ⚠️
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider font-sans">
                  Agreement Required
                </h3>
                <p className="text-xs text-purple-200/70 leading-relaxed font-sans">
                  You must agree to the NEXORA Terms of Service, Privacy Policy, and Community Guidelines before creating an account.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAgreementError(false)}
                  className="w-full py-2.5 bg-rose-700 hover:bg-rose-600 text-white font-extrabold text-xs rounded-xl active:scale-97 select-none transition-all cursor-pointer uppercase tracking-wider"
                >
                  [ OK ]
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
