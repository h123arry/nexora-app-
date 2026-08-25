import { Home, MessageSquare, User as UserIcon, Bell, PlusCircle, Globe, Sliders, Sparkles, Target, Compass, Zap, Search, Bot, BarChart2 } from 'lucide-react';
import { motion } from 'motion/react';
import { User, ThemeMood } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import NexoraPremiumLogo from './NexoraPremiumLogo';
import NexoraBranding from './NexoraBranding';
import VohIcon from './VohIcon';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  theme: ThemeMood;
  setTheme: (theme: ThemeMood) => void;
  onOpenCreatePost: () => void;
  onLogout?: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoggedIn?: boolean;
  onOpenAuth?: () => void;
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
  setSearchQuery,
  isLoggedIn = true,
  onOpenAuth
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
      <div id="nexora-brand-header" className="px-4 mb-6">
        <NexoraBranding size="md" showSubtitle={true} />
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
          </div>
          <p className="text-[9px] text-current/50 font-mono truncate">
            @{currentUser.username}
          </p>
        </div>
      </div>

      {/* Guest Sign-in prompt if not logged in */}
      {!isLoggedIn && (
        <div className="mb-5 p-3 rounded-2xl bg-gradient-to-tr from-violet-900/40 via-purple-950/30 to-black border border-violet-500/20 text-center">
          <p className="text-[10px] font-sans text-violet-200 font-bold mb-2">
            Browsing as Visitor 👁️
          </p>
          <button
            onClick={onOpenAuth}
            className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[11px] font-sans font-bold shadow-lg shadow-violet-600/30 transition-all cursor-pointer"
          >
            Sign In / Join Nexora
          </button>
        </div>
      )}

      {/* 🟣 Unified Social Media Navigation Menu */}
      <div className="flex flex-col gap-2.5 mb-5 p-1">
        {[
          { id: 'feed', label: 'Home', desc: 'Feed', icon: Home, count: 0 },
          { id: 'explore', label: 'Search', desc: 'Explore', icon: Search, count: 0 },
          { id: 'menu_gateway', label: 'Navigation ☰', desc: 'All Destinations', icon: Sliders, isMenu: true, count: unreadMessagesCount + unreadNotificationsCount },
          { id: 'create_btn', label: 'Create', desc: 'Post', icon: PlusCircle, isCreate: true, count: 0 },
          { id: 'profile', label: 'Profile', desc: 'Account', icon: UserIcon, count: 0 }
        ].map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={item.id}
              onClick={() => {
                if (item.id === 'explore') {
                  window.dispatchEvent(new CustomEvent('openUniversalSearch'));
                } else if (item.isCreate) {
                  onOpenCreatePost();
                } else if (item.isMenu) {
                  window.dispatchEvent(new CustomEvent('toggleNavMenu'));
                } else {
                  setActiveTab(item.id as any);
                }
              }}
              className={`flex items-center gap-3.5 w-full p-2.5 rounded-xl border transition-all text-left relative group cursor-pointer overflow-hidden ${
                isActive
                  ? 'bg-linear-to-r from-violet-600/25 to-pink-500/10 border-white/10 text-violet-300 ring-1 ring-violet-500/20 shadow-lg shadow-violet-500/5 font-bold'
                  : 'bg-black/35 border-current/5 hover:border-white/10 text-current/70 hover:bg-violet-950/10'
              }`}
            >
              <div className={`p-1.5 rounded-lg transition-all duration-300 ${isActive || item.isMenu ? 'bg-violet-600/20 text-violet-400 scale-105' : 'bg-current/5 text-current/60 group-hover:scale-105 group-hover:text-violet-300'}`}>
                <Icon className="w-4.5 h-4.5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <span className="block text-[11px] font-sans tracking-wide font-black uppercase transition-colors duration-300 group-hover:text-violet-300">
                  {item.label}
                </span>
                <span className="block text-[9px] text-current/40 font-mono truncate transition-colors duration-300 group-hover:text-violet-400/50">
                  {item.desc}
                </span>
              </div>
              {item.count > 0 && (
                <motion.span 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 bg-pink-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full"
                >
                  {item.count}
                </motion.span>
              )}
            </motion.button>
          );
        })}

        {/* Conditional Creator panel link */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setActiveTab('creator')}
          className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl border transition-all text-left group cursor-pointer mt-1 ${
            activeTab === 'creator'
              ? 'bg-linear-to-r from-violet-600/25 to-indigo-500/10 border-white/10 text-violet-300 ring-1 ring-violet-500/20 shadow-lg shadow-violet-500/5'
              : 'bg-black/35 border-white/10 hover:border-white/10 text-violet-400/80 hover:bg-violet-950/10'
          }`}
        >
          <div className="p-1.5 rounded-lg bg-violet-600/10 text-violet-400 transition-transform duration-300 group-hover:scale-105">
            <BarChart2 className="w-3.5 h-3.5 text-violet-500" />
          </div>
          <div className="flex-1 overflow-hidden">
            <span className="block text-[10px] font-sans font-black tracking-widest uppercase text-violet-400 transition-colors duration-300 group-hover:text-violet-300">
              Studio
            </span>
            <span className="block text-[9px] text-current/40 font-mono truncate transition-colors duration-300 group-hover:text-violet-400/60">
              Publishing
            </span>
          </div>
        </motion.button>

        {/* Conditional Admin panel link */}
        {(currentUser.role === 'admin' || currentUser.role === 'founder' || currentUser.username === 'voh') && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl border transition-all text-left group cursor-pointer mt-1 ${
              activeTab === 'admin'
                ? 'bg-linear-to-r from-red-600/25 to-rose-500/10 border-rose-500/40 text-rose-300 ring-1 ring-rose-500/20 shadow-lg shadow-rose-500/5 animate-pulse'
                : 'bg-black/35 border-[#e11d48]/10 hover:border-rose-500/20 text-rose-400/80 hover:bg-rose-950/10'
            }`}
          >
            <div className="p-1.5 rounded-lg bg-rose-600/10 text-rose-400 transition-transform duration-300 group-hover:scale-105">
              <Sliders className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="flex-1 overflow-hidden">
              <span className="block text-[10px] font-sans font-black tracking-widest uppercase text-rose-400 transition-colors duration-300 group-hover:text-rose-300">
                Admin
              </span>
              <span className="block text-[9px] text-current/40 font-mono truncate transition-colors duration-300 group-hover:text-rose-400/60">
                Governance
              </span>
            </div>
          </motion.button>
        )}
      </div>

      {/* System Control Deck Button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => window.dispatchEvent(new CustomEvent('open-system-hub'))}
        className="flex items-center gap-2.5 w-full p-2.5 rounded-xl border bg-black/35 border-current/5 hover:border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/10 transition-all text-left group cursor-pointer mb-3"
      >
        <div className="p-1.5 rounded-lg bg-cyan-600/10 text-cyan-400 transition-transform duration-300 group-hover:scale-105">
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
      </motion.button>

      {/* Quick Action Post Button */}

      {/* Premium Footnotes */}
      <div className="mt-auto pt-4 border-t border-current/5 text-[9px] font-mono text-current/40 text-center uppercase tracking-widest">
        NEXORA Network &bull; Premium
      </div>
    </div>
  );
}
