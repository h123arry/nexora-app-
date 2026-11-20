import React, { lazy, Suspense, useEffect, useState } from 'react';
import type { ConfirmationResult } from 'firebase/auth';
import { motion } from 'motion/react';
import { Sliders, User, Lock, Bell, Palette, ShieldCheck, Link2, Info, Bug, Scale } from 'lucide-react';
import { User as UserType, ThemeMood } from '../types';
import { SettingsService } from '../services/firebase/settingsService';
import { SecurityNotificationService } from '../services/firebase/securityNotificationService';
import { AuthService } from '../services/firebase/authService';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';
import { isNativeRuntime } from '../lib/nativeRuntime';
import { readSoundPreferences, saveSoundPreferences, playNexoraSound, type SoundPreferences } from '../services/soundExperience';

const PrivacySettingsModal = lazy(() => import('./PrivacySettingsModal'));
const OriginAttributionInbox = lazy(() => import('./OriginAttributionInbox'));

interface SettingsViewProps {
  currentUser: UserType;
  theme: ThemeMood;
  setTheme: (theme: ThemeMood) => void;
  onUpdateProfile?: (updatedData: Partial<UserType>) => void;
  initialSection?: 'account' | 'privacy' | 'notifications' | 'appearance' | 'security' | 'connected' | 'about' | 'beta' | 'origin';
}

export default function SettingsView({
  currentUser,
  theme,
  setTheme,
  onUpdateProfile,
  initialSection = 'account'
}: SettingsViewProps) {
  const [activeSection, setActiveSection] = useState<'account' | 'privacy' | 'notifications' | 'appearance' | 'security' | 'connected' | 'about' | 'beta' | 'origin'>(initialSection);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [allowDms, setAllowDms] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailDigests, setEmailDigests] = useState(false);
  const [savingSetting, setSavingSetting] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState('');
  const [settingsReady, setSettingsReady] = useState(false);
  const [soundPreferences, setSoundPreferences] = useState<SoundPreferences>(() => readSoundPreferences());
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [sessionRevokeError, setSessionRevokeError] = useState('');
  const [linkedProviders, setLinkedProviders] = useState<string[]>(() => AuthService.getLinkedProviders());
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [linkedAccountMessage, setLinkedAccountMessage] = useState('');
  const [linkedAccountError, setLinkedAccountError] = useState('');
  const [securityEmail, setSecurityEmail] = useState('');
  const [securityPassword, setSecurityPassword] = useState('');
  const [securityPhone, setSecurityPhone] = useState('');
  const [securityOtp, setSecurityOtp] = useState('');
  const [phoneLinkConfirmation, setPhoneLinkConfirmation] = useState<ConfirmationResult | null>(null);
  const [linkingEmail, setLinkingEmail] = useState(false);
  const [sendingPhoneCode, setSendingPhoneCode] = useState(false);
  const [confirmingPhone, setConfirmingPhone] = useState(false);
  const [canIssueBetaInvite, setCanIssueBetaInvite] = useState(false);
  const [creatingBetaInvite, setCreatingBetaInvite] = useState(false);
  const [betaInviteLink, setBetaInviteLink] = useState('');
  const [betaInviteError, setBetaInviteError] = useState('');

  useEffect(() => {
    const handleOpenSettingsSection = (event: Event) => {
      const section = (event as CustomEvent<{ section?: string }>).detail?.section;
      if (section && ['account', 'privacy', 'notifications', 'appearance', 'security', 'connected', 'about', 'beta', 'origin'].includes(section)) {
        setActiveSection(section as typeof activeSection);
      }
    };
    window.addEventListener('nexora-open-settings', handleOpenSettingsSection);
    return () => window.removeEventListener('nexora-open-settings', handleOpenSettingsSection);
  }, []);

  useEffect(() => {
    let active = true;
    setSettingsReady(false);
    SettingsService.getSettings(currentUser.id).then(settings => {
      if (!active) return;
      setIsPrivateAccount(settings.privacy.isPrivateAccount);
      setAllowDms(settings.privacy.allowDms);
      setPushNotifications(settings.notifications.pushEnabled);
      setEmailDigests(settings.notifications.emailDigests);
      setSettingsReady(true);
    }).catch(() => {
      if (active) setSettingsError('Could not load your saved settings. Try reopening this screen.');
    });
    setLinkedProviders(AuthService.getLinkedProviders());
    return () => { active = false; };
  }, [currentUser.id]);

  useEffect(() => {
    let active = true;
    const firebaseUser = AuthService.getCurrentUser();
    if (!firebaseUser) {
      setCanIssueBetaInvite(false);
      return () => { active = false; };
    }
    firebaseUser.getIdTokenResult(true).then(token => {
      const role = token.claims.role;
      if (active) setCanIssueBetaInvite(token.claims.admin === true || token.claims.founder === true || role === 'admin' || role === 'founder');
    }).catch(() => { if (active) setCanIssueBetaInvite(false); });
    return () => { active = false; };
  }, [currentUser.id]);

  const generateBetaInviteLink = async () => {
    if (creatingBetaInvite || !canIssueBetaInvite) return;
    setCreatingBetaInvite(true);
    setBetaInviteError('');
    setBetaInviteLink('');
    try {
      const createInvite = httpsCallable<{}, { inviteUrl: string; maxClaims: number }>(functions, 'createBetaInviteLink');
      const result = await createInvite({});
      setBetaInviteLink(result.data.inviteUrl);
    } catch (error) {
      setBetaInviteError(error instanceof Error ? error.message : 'The beta invitation link could not be created.');
    } finally {
      setCreatingBetaInvite(false);
    }
  };

  const copyBetaInviteLink = async () => {
    if (!betaInviteLink) return;
    try {
      await navigator.clipboard.writeText(betaInviteLink);
      setLinkedAccountMessage('The 300-person beta invitation link has been copied.');
    } catch {
      setBetaInviteError('Copy was blocked by this browser. Select and copy the link manually.');
    }
  };

  const saveSetting = async (key: string, save: () => Promise<void>) => {
    if (!settingsReady || savingSetting) return;
    setSavingSetting(key);
    setSettingsError('');
    try { await save(); }
    catch {
      setSettingsError('Could not save this change. Check your connection and try again.');
      try {
        const latest = await SettingsService.getSettings(currentUser.id);
        setIsPrivateAccount(latest.privacy.isPrivateAccount);
        setAllowDms(latest.privacy.allowDms);
        setPushNotifications(latest.notifications.pushEnabled);
        setEmailDigests(latest.notifications.emailDigests);
      } catch { /* Keep the last known values and show the save error. */ }
    } finally { setSavingSetting(null); }
  };

  const togglePrivacy = (key: 'isPrivateAccount' | 'allowDms', value: boolean) => {
    if (key === 'isPrivateAccount') setIsPrivateAccount(value); else setAllowDms(value);
    void saveSetting(key, () => SettingsService.updatePrivacy(currentUser.id, { [key]: value }));
  };

  const revokeAllSessions = async () => {
    if (revokingSessions) return;
    const confirmed = typeof window !== 'undefined'
      && window.confirm('Sign out of all devices? This device will also sign out, and you’ll need to sign in again everywhere.');
    if (!confirmed) return;
    setRevokingSessions(true);
    setSessionRevokeError('');
    try {
      await AuthService.revokeAllSessions();
    } catch (error) {
      setSessionRevokeError(error instanceof Error ? error.message : 'Couldn’t sign out of your other devices. Please try again.');
      setRevokingSessions(false);
    }
  };

  const connectGoogleAccount = async () => {
    if (linkingGoogle) return;
    setLinkingGoogle(true);
    setLinkedAccountError('');
    setLinkedAccountMessage('');
    try {
      const providers = await AuthService.linkGoogleAccount();
      setLinkedProviders(providers);
      setLinkedAccountMessage('Google is now connected to this NEXORA account.');
    } catch (error) {
      setLinkedAccountError(error instanceof Error ? error.message : 'Google could not be connected. Try again.');
    } finally {
      setLinkingGoogle(false);
    }
  };

  const connectEmailAccount = async () => {
    if (linkingEmail) return;
    setLinkingEmail(true);
    setLinkedAccountError('');
    setLinkedAccountMessage('');
    try {
      await AuthService.linkEmailAccount(securityEmail, securityPassword);
      try { await SecurityNotificationService.notifySecurityEvent(currentUser.id, currentUser.email || securityEmail, currentUser.name || currentUser.username, 'EMAIL_LINKED'); }
      catch { console.warn('Email connection succeeded; its account notification could not be delivered.'); }
      setLinkedProviders(AuthService.getLinkedProviders());
      setSecurityEmail('');
      setSecurityPassword('');
      setLinkedAccountMessage('Email connected to this account. Check your inbox to verify it.');
    } catch (error) {
      setLinkedAccountError(error instanceof Error ? error.message : 'Email could not be connected. Please try again.');
    } finally {
      setLinkingEmail(false);
    }
  };

  const sendPhoneLinkCode = async () => {
    if (sendingPhoneCode) return;
    setSendingPhoneCode(true);
    setLinkedAccountError('');
    setLinkedAccountMessage('');
    try {
      const verifier = AuthService.initRecaptchaVerifier('nexora-phone-link-recaptcha');
      const confirmation = await AuthService.sendPhoneLinkCode(securityPhone, verifier);
      setPhoneLinkConfirmation(confirmation);
      setLinkedAccountMessage('Verification code sent. Enter the code to connect this phone to your current account.');
    } catch (error) {
      setLinkedAccountError(error instanceof Error ? error.message : 'A verification code could not be sent.');
    } finally {
      setSendingPhoneCode(false);
    }
  };

  const confirmPhoneLinkCode = async () => {
    if (!phoneLinkConfirmation || confirmingPhone) return;
    setConfirmingPhone(true);
    setLinkedAccountError('');
    setLinkedAccountMessage('');
    try {
      await AuthService.confirmPhoneLink(phoneLinkConfirmation, securityOtp);
      try { await SecurityNotificationService.notifySecurityEvent(currentUser.id, currentUser.email || '', currentUser.name || currentUser.username, 'PHONE_LINKED'); }
      catch { console.warn('Phone verification succeeded; its account notification could not be delivered.'); }
      setLinkedProviders(AuthService.getLinkedProviders());
      setPhoneLinkConfirmation(null);
      setSecurityOtp('');
      setSecurityPhone('');
      setLinkedAccountMessage('Your phone number is now verified and connected to this same NEXORA account.');
    } catch (error) {
      setLinkedAccountError(error instanceof Error ? error.message : 'Phone verification could not be completed.');
    } finally {
      setConfirmingPhone(false);
    }
  };

  const updateSoundPreference = (key: keyof SoundPreferences, value: boolean) => {
    setSoundPreferences(previous => {
      const next = { ...previous, [key]: value };
      saveSoundPreferences(next);
      return next;
    });
  };

  const toggleNotification = (key: 'pushEnabled' | 'emailDigests', value: boolean) => {
    if (key === 'pushEnabled') setPushNotifications(value); else setEmailDigests(value);
    void saveSetting(key, () => SettingsService.updateNotifications(currentUser.id, { [key]: value }));
  };

  const sections = [
    { id: 'account', label: 'Account', icon: User, desc: 'Profile details & account identity' },
    { id: 'privacy', label: 'Privacy', icon: Lock, desc: 'Public visibility & permissions' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Push alerts & email summaries' },
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme, contrast & font sizing' },
    { id: 'security', label: 'Security', icon: ShieldCheck, desc: 'Sign-in checks and devices' },
    { id: 'connected', label: 'Connected Accounts', icon: Link2, desc: 'Connected apps' },
    { id: 'about', label: 'About Nexora', icon: Info, desc: 'Platform version & legal info' },
    { id: 'beta', label: 'Beta feedback', icon: Bug, desc: 'Report issues with useful context' },
    { id: 'origin', label: 'NEXORA Origin', icon: Scale, desc: 'Attribution, corrections & disputes' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-28 sm:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-zinc-900 via-purple-950/20 to-black border border-white/10 backdrop-blur-xl shadow-md text-left">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-zinc-800 text-violet-400 border border-white/10">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-sans font-black tracking-tight text-white flex items-center gap-2">
              Settings & Preferences
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage your Nexora account configuration, privacy controls, and app customization
            </p>
          </div>
        </div>
      </div>

      {/* Main settings grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        {/* Navigation Sidebar */}
        <div className="md:col-span-1 space-y-2">
          {sections.map(section => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id as any)}
                className={`w-full p-3.5 rounded-2xl border transition-all text-left flex items-center justify-between cursor-pointer ${
                  isActive
                    ? 'bg-violet-600/25 border-white/10 text-white font-bold shadow-md shadow-violet-500/10'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-violet-600 text-white' : 'bg-white/5 text-zinc-400'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-sans block truncate">{section.label}</span>
                    <span className="text-[10px] text-zinc-500 font-sans block truncate">{section.desc}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Section Content Panel */}
        <div className="md:col-span-2 p-6 rounded-3xl nx-surface shadow-md space-y-6">
          {activeSection === 'origin' && (
            <div className="space-y-3">
              <div>
                <h3 className="text-sm font-bold text-white">NEXORA Origin</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Review recorded remix attribution, request corrections, respond to creator requests, and follow disputes. Staff review access is enforced by the server.</p>
              </div>
              <Suspense fallback={<p role="status" className="text-xs text-zinc-500">Loading Origin attribution tools…</p>}>
                <OriginAttributionInbox />
              </Suspense>
            </div>
          )}

          {activeSection === 'account' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white">Your account</h3>
                <p className="mt-1 text-xs text-zinc-400">Your profile details and the information people see on NEXORA.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <img src={currentUser.avatar || '/nexora-mark.png'} alt="" className="h-12 w-12 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{currentUser.name}</p>
                    <p className="truncate text-xs text-violet-300">@{currentUser.username}</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <div><p className="text-zinc-500">Email</p><p className="mt-1 break-all text-zinc-200">{currentUser.email || 'Not added'}</p></div>
                  <div><p className="text-zinc-500">Profile</p><p className="mt-1 text-zinc-200">Name, photo, bio and links</p></div>
                </div>
              </div>
              <button type="button" onClick={() => window.dispatchEvent(new CustomEvent('nexora-open-profile-editor'))}
                className="w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500">
                Edit profile
              </button>
              <p className="text-[11px] leading-relaxed text-zinc-500">To change your email, password or sign-in methods, use the Security section.</p>
            </div>
          )}

          {activeSection === 'privacy' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">Privacy & Safety</h3>
                  <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-white">Full privacy controls</h4>
                        <p className="text-[10px] text-violet-100/70">Presence, profile visibility, messaging, calls, discovery, and safety.</p>
                      </div>
                      <button type="button" onClick={() => setShowPrivacyDetails(true)} className="shrink-0 rounded-xl bg-violet-600 px-3 py-2 text-[10px] font-bold uppercase text-white hover:bg-violet-500">Open</button>
                    </div>
                  </div>
                  <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Private account preference</h4>
                    <p className="text-[10px] text-zinc-400">Saved to your account. Posts remain public until private-audience access is implemented.</p>
                  </div>
                  <button
                    disabled={!settingsReady || savingSetting !== null}
                    aria-label="Toggle private account"
                    aria-pressed={isPrivateAccount}
                    onClick={() => togglePrivacy('isPrivateAccount', !isPrivateAccount)}
                    className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer ${isPrivateAccount ? 'bg-violet-600' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${isPrivateAccount ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Direct Messaging</h4>
                    <p className="text-[10px] text-zinc-400">Allow incoming direct chats from community members</p>
                  </div>
                  <button
                    disabled={!settingsReady || savingSetting !== null}
                    aria-label="Toggle direct messaging"
                    aria-pressed={allowDms}
                    onClick={() => togglePrivacy('allowDms', !allowDms)}
                    className={`w-11 h-6 rounded-full transition-colors p-1 cursor-pointer ${allowDms ? 'bg-violet-600' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${allowDms ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'appearance' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">Theme & Atmosphere</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'neon-cyber', label: 'Violet', color: 'bg-violet-600' },
                  { id: 'stealth-dark', label: 'Stealth Slate', color: 'bg-zinc-800' },
                  { id: 'emerald-glass', label: 'Emerald', color: 'bg-emerald-600' },
                  { id: 'platinum-light', label: 'Ivory Platinum', color: 'bg-slate-200' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTheme(t.id as ThemeMood);
                      void saveSetting('theme', () => SettingsService.updateAppearance(currentUser.id, { theme: t.id }));
                    }}
                    className={`p-3 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
                      theme === t.id
                        ? 'bg-violet-600/30 border-violet-500 text-white font-bold'
                        : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full ${t.color}`} />
                    <span className="text-xs">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeSection === 'about' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">About Nexora Platform</h3>
              <div className="space-y-3 text-xs text-zinc-300">
                <p><strong className="text-white">Environment:</strong> Beta preparation; staging activation is still owner-controlled.</p>
                <p><strong className="text-white">Service status:</strong> Individual features show their own verified or unavailable state. This screen does not claim that unverified backends are live.</p>
              </div>
            </div>
          )}

          {activeSection === 'beta' && (
            <div className="space-y-4">
              {canIssueBetaInvite && (
                <div className="rounded-2xl border border-violet-400/25 bg-violet-500/10 p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-white">Founding 300 invitation link</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-violet-100/80">Create one reusable private link for the first 300 eligible beta members. The server enforces the cap across all invitation claims and administrator-created founding accounts.</p>
                  </div>
                  <button type="button" disabled={creatingBetaInvite} onClick={() => void generateBetaInviteLink()} className="rounded-xl bg-violet-600 px-4 py-2.5 text-[11px] font-bold text-white disabled:opacity-50">{creatingBetaInvite ? 'Creating secure link…' : 'Generate 300-person invitation link'}</button>
                  {betaInviteLink && (
                    <div className="space-y-2">
                      <input readOnly value={betaInviteLink} onFocus={event => event.currentTarget.select()} className="w-full nx-field px-3 py-2.5 text-[11px]" aria-label="Founding beta invitation link" />
                      <button type="button" onClick={() => void copyBetaInviteLink()} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-[10px] font-semibold text-violet-200">Copy invitation link</button>
                    </div>
                  )}
                  {betaInviteError && <p role="alert" className="text-[11px] text-rose-300">{betaInviteError}</p>}
                </div>
              )}

              <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">Beta feedback</h3>
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 space-y-2">
                <p className="text-xs font-semibold text-white">Help us reproduce the problem</p>
                <p className="text-[11px] leading-relaxed text-violet-100/80">For a bug report, include the screen, exact steps, what you expected, what happened, your browser/device, viewport width, and whether the network was offline. Never include passwords, tokens, or private messages.</p>
              </div>
              <div className="space-y-2 text-xs text-zinc-300">
                <p><strong className="text-white">Content or account safety:</strong> Use the in-product Report or Block controls on the relevant content or profile.</p>
                <p><strong className="text-white">Unavailable service:</strong> Record the exact message and time; do not treat a placeholder, simulation, or unavailable card as a successful operation.</p>
                <p><strong className="text-white">Owner triage:</strong> Keep the report linked to the beta build/commit and mark it as reproduction-ready only after another tester can follow the same steps.</p>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">Notification Preferences</h3>
              <p className="text-xs text-zinc-400">These preferences are saved to your Nexora account. Actual delivery still depends on the relevant provider being configured.</p>
              {[
                { label: 'Push notifications', value: pushNotifications, change: (value: boolean) => toggleNotification('pushEnabled', value) },
                { label: 'Email digests', value: emailDigests, change: (value: boolean) => toggleNotification('emailDigests', value) },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/5 p-3.5">
                  <span className="text-xs font-bold text-white">{item.label}</span>
                  <button type="button" disabled={!settingsReady || savingSetting !== null} aria-pressed={item.value} onClick={() => item.change(!item.value)} className={'h-6 w-11 shrink-0 rounded-full p-1 transition-colors disabled:opacity-40 ' + (item.value ? 'bg-violet-600' : 'bg-zinc-700')}>
                    <span className={'block h-4 w-4 rounded-full bg-white transition-transform ' + (item.value ? 'translate-x-5' : 'translate-x-0')} />
                  </button>
                </div>
              ))}
              <div className="mt-5 border-t border-white/10 pt-5 space-y-3">
                <div><h4 className="text-xs font-bold text-white">Sound experience</h4><p className="mt-1 text-[10px] text-zinc-400">These controls apply on this device. Sounds only play after your browser allows audio playback.</p></div>
                {[
                  { key: 'notifications' as const, label: 'Notification sounds', description: 'New messages, replies and social activity' },
                  { key: 'interface' as const, label: 'Button sounds', description: 'Sounds when you tap buttons' },
                  { key: 'gifts' as const, label: 'Gift delivery sounds', description: 'Gift arrival and creator celebration cues' },
                  { key: 'live' as const, label: 'Live sounds', description: 'Sounds during live videos' },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/5 p-3.5">
                    <div><span className="block text-xs font-bold text-white">{item.label}</span><span className="mt-1 block text-[10px] text-zinc-400">{item.description}</span></div>
                    <button type="button" aria-label={item.label} aria-pressed={soundPreferences[item.key]} onClick={() => updateSoundPreference(item.key, !soundPreferences[item.key])} className={'h-6 w-11 shrink-0 rounded-full p-1 transition-colors ' + (soundPreferences[item.key] ? 'bg-violet-600' : 'bg-zinc-700')}>
                      <span className={'block h-4 w-4 rounded-full bg-white transition-transform ' + (soundPreferences[item.key] ? 'translate-x-5' : 'translate-x-0')} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => playNexoraSound('interface.confirmation')} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-[11px] font-semibold text-violet-200 hover:bg-violet-500/20">Preview interface sound</button>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">Security</h3>
              <p className="text-xs text-zinc-400">Two-factor authentication is not enabled in NEXORA yet. You can revoke refresh-token sessions below. This device signs out immediately; other devices must reauthenticate when their current ID token expires.</p>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-xs font-bold text-white">Session control</p>
                <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">Use this if a device is lost or you suspect someone else has access. Recent authentication is required.</p>
                <button type="button" disabled={revokingSessions} onClick={() => void revokeAllSessions()} className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-2.5 text-[11px] font-semibold text-rose-200 disabled:opacity-50">
                  {revokingSessions ? 'Signing out…' : 'Sign out of all devices'}
                </button>
                {sessionRevokeError && <p role="alert" className="mt-2 text-[11px] text-rose-300">{sessionRevokeError}</p>}
              </div>
            </div>
          )}

          {activeSection === 'connected' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">Connected Accounts</h3>
              <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-white">Google</p>
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {linkedProviders.includes('google.com') ? 'Connected to this NEXORA account' : 'Link Google as another sign-in method'}
                  </p>
                </div>
                {linkedProviders.includes('google.com') ? (
                  <span className="shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-semibold text-emerald-300">Connected</span>
                ) : isNativeRuntime() ? (
                  <span className="shrink-0 text-[10px] text-zinc-500">Web linking only</span>
                ) : (
                  <button type="button" disabled={linkingGoogle} onClick={() => void connectGoogleAccount()} className="shrink-0 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-[10px] font-semibold text-violet-200 disabled:opacity-50">
                    {linkingGoogle ? 'Connecting…' : 'Connect Google'}
                  </button>
                )}
              </div>
              <p className="text-[10px] leading-relaxed text-zinc-500">Connecting a provider adds another sign-in method to this same account. It does not merge separate NEXORA accounts. Sign in again first if your current session is older than five minutes.</p>
              <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold text-white">Secure this NEXORA account</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-violet-100/80">Add and verify an email address and phone number. These credentials are linked to your existing account, so your profile, posts, messages and uploads stay with the same UID.</p>
                </div>
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold text-white">Email and password</p>
                  {linkedProviders.includes('password') ? (
                    <p className="text-[11px] text-emerald-300">Email sign-in is connected. Check your inbox if email verification is still pending.</p>
                  ) : (
                    <>
                      <input type="email" value={securityEmail} onChange={event => setSecurityEmail(event.target.value)} placeholder="Email address" autoComplete="email" className="w-full nx-field px-3 py-2.5 text-xs" />
                      <input type="password" value={securityPassword} onChange={event => setSecurityPassword(event.target.value)} placeholder="Create a password (8+ characters)" autoComplete="new-password" className="w-full nx-field px-3 py-2.5 text-xs" />
                      <button type="button" disabled={linkingEmail || !securityEmail.trim() || securityPassword.length < 8} onClick={() => void connectEmailAccount()} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-[10px] font-semibold text-violet-200 disabled:opacity-40">{linkingEmail ? 'Connecting email…' : 'Connect email'}</button>
                    </>
                  )}
                </div>
                <div className="border-t border-white/10 pt-3 space-y-2">
                  <p className="text-[11px] font-semibold text-white">Phone number</p>
                  {linkedProviders.includes('phone') ? (
                    <p className="text-[11px] text-emerald-300">A verified phone number is connected to this account.</p>
                  ) : (
                    <>
                      <input type="tel" value={securityPhone} onChange={event => setSecurityPhone(event.target.value)} placeholder="Phone number, e.g. +2348012345678" autoComplete="tel" className="w-full nx-field px-3 py-2.5 text-xs" />
                      <div id="nexora-phone-link-recaptcha" />
                      {!phoneLinkConfirmation ? (
                        <button type="button" disabled={sendingPhoneCode || !securityPhone.trim()} onClick={() => void sendPhoneLinkCode()} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-[10px] font-semibold text-violet-200 disabled:opacity-40">{sendingPhoneCode ? 'Sending code…' : 'Send phone verification code'}</button>
                      ) : (
                        <div className="space-y-2">
                          <input inputMode="numeric" value={securityOtp} onChange={event => setSecurityOtp(event.target.value)} placeholder="6-digit verification code" className="w-full nx-field px-3 py-2.5 text-xs" />
                          <button type="button" disabled={confirmingPhone || securityOtp.trim().length < 4} onClick={() => void confirmPhoneLinkCode()} className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-[10px] font-semibold text-violet-200 disabled:opacity-40">{confirmingPhone ? 'Verifying…' : 'Verify and connect phone'}</button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              {linkedAccountMessage && <p role="status" className="text-xs text-emerald-300">{linkedAccountMessage}</p>}
              {linkedAccountError && <p role="alert" className="text-xs text-rose-300">{linkedAccountError}</p>}
            </div>
          )}

          {settingsError && <p role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-200">{settingsError}</p>}
          {!settingsReady && <p role="status" className="text-[10px] text-zinc-500">Loading your saved account settings…</p>}
          {savingSetting && <p role="status" className="text-[10px] text-violet-300">Saving {savingSetting.replace(/([A-Z])/g, ' $1').toLowerCase()}…</p>}
        </div>
      </div>
      <Suspense fallback={null}>
        <PrivacySettingsModal
          isOpen={showPrivacyDetails}
          onClose={() => setShowPrivacyDetails(false)}
          userId={currentUser.id}
          profilePreview={{ name: currentUser.name, username: currentUser.username, avatar: currentUser.avatar, bio: currentUser.bio, location: currentUser.location, coverImage: currentUser.coverImage }}
        />
      </Suspense>
    </div>
  );
}
