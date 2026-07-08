import { Home, MessageSquare, User as UserIcon, Bell, PlusCircle, Globe, Sliders, Sparkles, Target, Compass, Zap, Search, Bot, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { User, ThemeMood } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import NexoraPremiumLogo from './NexoraPremiumLogo';

interface SidebarProps {
  currentUser: User;
  activeTab: 'feed' | 'explore' | 'inbox' | 'pulse' | 'matrix' | 'activity' | 'profile' | 'admin' | 'nida' | 'creator' | 'communities';
  setActiveTab: (tab: 'feed' | 'explore' | 'inbox' | 'pulse' | 'matrix' | 'activity' | 'profile' | 'admin' | 'nida' | 'creator' | 'communities') => void;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  theme: ThemeMood;
  setTheme: (theme: ThemeMood) => void;
  onOpenCreatePost: () => void;
  onLogout?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function Sidebar({
  currentUser,
  activeTab,
  setActiveTab,
  unreadMessagesCount,
  unreadNotificationsCount,
  theme,
  setTheme,
  onOpenCreatePost,
  onLogout,
  searchQuery,
  setSearchQuery
}: SidebarProps) {
  
  const themes: { id: ThemeMood; label: string; desc: string; color: string }[] = [
    { id: 'neon-cyber', label: 'Cyber Void', desc: 'Neon violet & fluorescent cyan', color: 'bg-violet-600' },
    { id: 'stealth-dark', label: 'Stealth Slate', desc: 'Classic monochrome metal', color: 'bg-zinc-800' },
    { id: 'emerald-glass', label: 'Matrix Emerald', desc: 'Sleek luxury green fusion', color: 'bg-emerald-600' },
    { id: 'platinum-light', label: 'Ivory Platinum', desc: 'Symmetrical light luxury', color: 'bg-amber-100 border border-slate-300' }
  ];

  return (
    <div id="nexora-sidebar-panel" className="flex flex-col h-full py-6 pr-4 border-r border-current/10">
      {/* Brand & Identity */}
      <div id="nexora-brand-header" className="flex items-center gap-3 px-4 mb-6">
        <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-[#03010a] border border-violet-500/25 shadow-lg shadow-cyan-500/5 overflow-hidden group">
          <span className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-fuchsia-500/10 opacity-60" />
          <NexoraPremiumLogo className="w-8 h-8" glow={true} />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-wider bg-clip-text text-transparent bg-linear-to-r from-violet-400 via-pink-400 to-cyan-400 font-sans">
            NEXORA
          </h1>
          <p className="text-[9px] font-sans font-semibold text-purple-400 leading-tight">
            Discover people. Build communities. Shape what's happening.
          </p>
        </div>
      </div>

      {/* Compact User block replacing basic follower metrics or stats dashboards */}
      <div id="sidebar-user-anchor" className="flex items-center gap-3 p-3.5 mb-5 rounded-2xl bg-current/5 border border-current/5 hover:bg-current/8 transition-all">
        <div className="relative">
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            referrerPolicy="no-referrer"
            className="w-10 h-10 rounded-xl object-cover ring-2 ring-violet-500/50" 
          />
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-900" />
        </div>
        <div className="overflow-hidden">
          <div className="flex items-center gap-1 flex-wrap">
            <h3 className="font-semibold text-xs truncate font-sans text-current flex items-center gap-0.5">
              {currentUser.name}
            </h3>
            {currentUser.username === 'voh' && <PurpleVerifiedBadge className="w-3.5 h-3.5" type="founder" />}
            <span className="text-[#8B5CF6] text-[9px]" title="Founder Account">⭐</span>
          </div>
          <p className="text-[9px] text-current/50 font-mono truncate">
            @{currentUser.username}
          </p>
        </div>
      </div>

      {/* 🟣 Simplified Social Media Navigation Menu */}
      <div className="flex flex-col gap-2.5 mb-5 p-1">
        {[
          { id: 'feed', label: 'Home', desc: 'Sleek social feed', icon: Home, count: 0 },
          { id: 'explore', label: 'Search', desc: 'Find trends & tags', icon: Search, count: 0 },
          { id: 'communities', label: 'Hub', desc: 'Communities & Pages', icon: Compass, count: 0 },
          { id: 'nida', label: 'NIDA AI', desc: 'Discovery Algorithm', icon: Sparkles, count: 0 },
          { id: 'create_btn', label: 'Create Post', desc: 'Share photos, video, voice, poll', icon: PlusCircle, isCreate: true, count: 0 },
          { id: 'inbox', label: 'Inbox', desc: 'Messages & Alerts', icon: MessageSquare, count: unreadMessagesCount + unreadNotificationsCount },
          { id: 'profile', label: 'Profile', desc: 'Your personal views', icon: UserIcon, count: 0 }
        ].map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.isCreate) {
                  onOpenCreatePost();
                } else {
                  setActiveTab(item.id as any);
                }
              }}
              className={`flex items-center gap-3.5 w-full p-2.5 rounded-xl border transition-all text-left relative group cursor-pointer ${
                isActive
                  ? 'bg-linear-to-r from-violet-600/25 to-pink-500/10 border-violet-500/40 text-violet-300 ring-1 ring-violet-500/20 shadow-lg shadow-violet-500/5 font-bold'
                  : 'bg-black/35 border-current/5 hover:border-violet-500/20 text-current/70 hover:bg-violet-950/10'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-violet-600/10 text-violet-400' : 'bg-current/5 text-current/60 group-hover:scale-105 transition-all'}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <span className="block text-[11px] font-sans tracking-wide font-black uppercase">
                  {item.label}
                </span>
                <span className="block text-[9px] text-current/40 font-mono truncate">
                  {item.desc}
                </span>
              </div>
              {item.count > 0 && (
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-pink-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        {/* Conditional Creator panel link */}
        <button
          onClick={() => setActiveTab('creator')}
          className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl border transition-all text-left group cursor-pointer mt-1 ${
            activeTab === 'creator'
              ? 'bg-linear-to-r from-violet-600/25 to-indigo-500/10 border-violet-500/40 text-violet-300 ring-1 ring-violet-500/20 shadow-lg shadow-violet-500/5'
              : 'bg-black/35 border-violet-500/10 hover:border-violet-500/20 text-violet-400/80 hover:bg-violet-950/10'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-violet-600/10 text-violet-400 group-hover:scale-105 transition-all">
            <BarChart2 className="w-3.5 h-3.5 text-violet-500" />
          </div>
          <div className="flex-1 overflow-hidden">
            <span className="block text-[10px] font-sans font-black tracking-widest uppercase text-violet-400 group-hover:text-violet-300">
              Nexora Studio 📈
            </span>
            <span className="block text-[9px] text-current/40 font-mono truncate">
              Professional Publishing
            </span>
          </div>
        </button>

        {/* Conditional Admin panel link */}
        {(currentUser.role === 'admin' || currentUser.role === 'founder' || currentUser.username === 'voh') && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl border transition-all text-left group cursor-pointer mt-1 ${
              activeTab === 'admin'
                ? 'bg-linear-to-r from-red-600/25 to-rose-500/10 border-rose-500/40 text-rose-300 ring-1 ring-rose-500/20 shadow-lg shadow-rose-500/5 animate-pulse'
                : 'bg-black/35 border-[#e11d48]/10 hover:border-rose-500/20 text-rose-400/80 hover:bg-rose-950/10'
            }`}
          >
            <div className="p-1.5 rounded-lg bg-rose-600/10 text-rose-400 group-hover:scale-105 transition-all">
              <Sliders className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="flex-1 overflow-hidden">
              <span className="block text-[10px] font-sans font-black tracking-widest uppercase text-rose-400 group-hover:text-rose-300">
                Admin Panel ⚔️
              </span>
              <span className="block text-[9px] text-current/40 font-mono truncate">
                Founder Governance Deck
              </span>
            </div>
          </button>
        )}
      </div>

      {/* System Control Deck Button */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-system-hub'))}
        className="flex items-center gap-2.5 w-full p-2.5 rounded-xl border bg-black/35 border-current/5 hover:border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/10 transition-all text-left group cursor-pointer mb-3"
      >
        <div className="p-1.5 rounded-lg bg-cyan-600/10 text-cyan-400 group-hover:scale-105 transition-all">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex-1 overflow-hidden">
          <span className="block text-[10px] font-sans font-black tracking-widest uppercase text-cyan-300 group-hover:text-cyan-200">
            System Core Hub ⚡
          </span>
          <span className="block text-[9px] text-current/40 font-mono truncate">
            Settings & Accessibility
          </span>
        </div>
      </button>

      {/* Quick Action Post Button */}
      <button 
        id="sidebar-create-post-cta"
        onClick={onOpenCreatePost}
        className="w-full py-2.5 px-4 mb-4 flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-violet-600 via-pink-600 to-cyan-500 text-white font-sans text-xs font-black shadow-md hover:shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" />
        <span>➕ Create Post</span>
      </button>

      {/* Premium Footnotes */}
      <div className="mt-auto pt-4 border-t border-current/5 text-[9px] font-mono text-current/40 text-center uppercase tracking-widest">
        NEXORA Network &bull; Premium
      </div>
    </div>
  );
}
