import React, { lazy, Suspense, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Sliders, User, Lock, Bell, Palette, ShieldCheck, Link2, Info, Bug } from 'lucide-react';
import { User as UserType, ThemeMood } from '../types';
import { SettingsService } from '../services/firebase/settingsService';
import { readSoundPreferences, saveSoundPreferences, playNexoraSound, type SoundPreferences } from '../services/soundExperience';

const PrivacySettingsModal = lazy(() => import('./PrivacySettingsModal'));

interface SettingsViewProps {
  currentUser: UserType;
  theme: ThemeMood;
  setTheme: (theme: ThemeMood) => void;
  onUpdateProfile?: (updatedData: Partial<UserType>) => void;
}

export default function SettingsView({
  currentUser,
  theme,
  setTheme,
  onUpdateProfile
}: SettingsViewProps) {
  const [activeSection, setActiveSection] = useState<'account' | 'privacy' | 'notifications' | 'appearance' | 'security' | 'connected' | 'about' | 'beta'>('account');
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [allowDms, setAllowDms] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailDigests, setEmailDigests] = useState(false);
  const [savingSetting, setSavingSetting] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState('');
  const [settingsReady, setSettingsReady] = useState(false);
  const [soundPreferences, setSoundPreferences] = useState<SoundPreferences>(() => readSoundPreferences());

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
    return () => { active = false; };
  }, [currentUser.id]);

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
    { id: 'security', label: 'Security', icon: ShieldCheck, desc: 'Two-factor & active sessions' },
    { id: 'connected', label: 'Connected Accounts', icon: Link2, desc: 'OAuth & Workspace integrations' },
    { id: 'about', label: 'About Nexora', icon: Info, desc: 'Platform version & legal info' },
    { id: 'beta', label: 'Beta feedback', icon: Bug, desc: 'Report issues with useful context' }
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
          {activeSection === 'account' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">Account Overview</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-1">Display Name</label>
                  <input
                    type="text"
                    defaultValue={currentUser.name}
                    className="w-full nx-field px-4 py-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-1">Username</label>
                  <input
                    type="text"
                    defaultValue={`@${currentUser.username}`}
                    className="w-full nx-field px-4 py-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-mono text-zinc-400 block mb-1">Bio</label>
                  <textarea
                    rows={3}
                    defaultValue={currentUser.bio}
                    className="w-full nx-field px-4 py-2.5 text-xs"
                  />
                </div>
              </div>
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
                  { id: 'neon-cyber', label: 'Cyber Void', color: 'bg-violet-600' },
                  { id: 'stealth-dark', label: 'Stealth Slate', color: 'bg-zinc-800' },
                  { id: 'emerald-glass', label: 'Matrix Emerald', color: 'bg-emerald-600' },
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
                  { key: 'interface' as const, label: 'Interface feedback', description: 'Soft confirmation and interaction cues' },
                  { key: 'gifts' as const, label: 'Gift delivery sounds', description: 'Gift arrival and creator celebration cues' },
                  { key: 'live' as const, label: 'Live session sounds', description: 'Audience and room interaction cues' },
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
              <p className="text-xs text-zinc-400">Two-factor authentication and active-session management are not enabled from this screen. Your sign-in provider remains responsible for authentication security.</p>
            </div>
          )}

          {activeSection === 'connected' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5">Connected Accounts</h3>
              <p className="text-xs text-zinc-400">No connected-account integrations are currently managed from this screen.</p>
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
