import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sliders, User, Lock, Bell, Palette, ShieldCheck, Link2, Info, Check, Moon, Sun, Smartphone, Globe, Key, Eye } from 'lucide-react';
import { User as UserType, ThemeMood } from '../types';

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
  const [activeSection, setActiveSection] = useState<'account' | 'privacy' | 'notifications' | 'appearance' | 'security' | 'connected' | 'about'>('account');

  // Interactive toggle states
  const [isPrivateAccount, setIsPrivateAccount] = useState(false);
  const [allowDms, setAllowDms] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailDigests, setEmailDigests] = useState(false);
  const [twoFactor, setTwoFactor] = useState(true);

  const sections = [
    { id: 'account', label: 'Account', icon: User, desc: 'Profile details & account identity' },
    { id: 'privacy', label: 'Privacy', icon: Lock, desc: 'Public visibility & permissions' },
    { id: 'notifications', label: 'Notifications', icon: Bell, desc: 'Push alerts & email summaries' },
    { id: 'appearance', label: 'Appearance', icon: Palette, desc: 'Theme, contrast & font sizing' },
    { id: 'security', label: 'Security', icon: ShieldCheck, desc: 'Two-factor & active sessions' },
    { id: 'connected', label: 'Connected Accounts', icon: Link2, desc: 'OAuth & Workspace integrations' },
    { id: 'about', label: 'About Nexora', icon: Info, desc: 'Platform version & legal info' }
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
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white/5 border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white">Private Account</h4>
                    <p className="text-[10px] text-zinc-400">Only approved followers can view your contributions</p>
                  </div>
                  <button
                    onClick={() => setIsPrivateAccount(!isPrivateAccount)}
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
                    onClick={() => setAllowDms(!allowDms)}
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
                    onClick={() => setTheme(t.id as any)}
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
              <div className="space-y-2 text-xs text-zinc-300">
                <p><strong className="text-white">Mesh Network:</strong> Operational & Node Verified</p>
                <p><strong className="text-white">AI Engine:</strong> VOH AI Multimodal Assistant Connected</p>
              </div>
            </div>
          )}

          {['notifications', 'security', 'connected'].includes(activeSection) && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white pb-3 border-b border-white/5 uppercase font-mono tracking-wider text-violet-400">
                {activeSection} Controls
              </h3>
              <p className="text-xs text-zinc-400">
                Configured and synced with your Nexora identity session. All settings apply instantly across connected clients.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
