import { Home, MessageSquare, User as UserIcon, Bell, PlusCircle, Users, Sliders, Sparkles, Compass, BarChart2, Search, Settings2 } from 'lucide-react';
import { motion } from 'motion/react';
import { User, ThemeMood } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import NexoraPremiumLogo from './NexoraPremiumLogo';
import NexoraBranding from './NexoraBranding';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  theme: ThemeMood;
  setTheme: (theme: ThemeMood) => void;
  onOpenCreatePost: () => void;
  onNavigate?: (tab: string) => void;
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
  onOpenCreatePost,
  onNavigate,
  isLoggedIn = true,
  onOpenAuth
}: SidebarProps) {
  const destinations = [
    { id: 'feed', label: 'Home', hint: 'Your daily signal', icon: Home },
    { id: 'explore', label: 'Explore', hint: 'Find your people', icon: Compass },
    { id: 'communities', label: 'Communities', hint: 'Shared interests', icon: Users },
    { id: 'inbox', label: 'Messages', hint: 'Private conversations', icon: MessageSquare, count: unreadMessagesCount },
    { id: 'activity', label: 'Activity', hint: 'Stay in the loop', icon: Bell, count: unreadNotificationsCount },
    { id: 'profile', label: 'Profile', hint: 'Your space', icon: UserIcon }
  ];

  return (
    <aside id="nexora-sidebar-panel" className="nx-sidebar-shell flex h-full flex-col overflow-y-auto px-4 py-5 xl:px-5 custom-scrollbar">
      <div id="nexora-brand-header" className="mb-7 px-2">
        <NexoraBranding size="md" showSubtitle={true} />
      </div>

      <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.035] p-3.5 shadow-[0_12px_30px_rgba(1,4,13,0.2)]">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-2xl object-cover ring-2 ring-violet-400/35"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0b1224] bg-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h3 className="truncate text-sm font-bold text-white">{currentUser.name}</h3>
              {(currentUser.isVerified || currentUser.username === 'voh') && <PurpleVerifiedBadge className="h-3.5 w-3.5 shrink-0" />}
            </div>
            <p className="mt-0.5 truncate text-[10px] font-medium tracking-wide text-slate-400">@{currentUser.username}</p>
          </div>
          <button className="nx-icon-button !min-h-8 !min-w-8 !rounded-xl" aria-label="Profile settings" onClick={() => { if (onNavigate) onNavigate('settings'); else setActiveTab('settings'); }}>
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {!isLoggedIn && (
          <div className="mt-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 text-center">
            <p className="mb-2 text-[10px] font-semibold leading-relaxed text-violet-100">Visitor preview. Sample content may appear; sign in for real account actions.</p>
            <button onClick={onOpenAuth} className="nx-btn-primary min-h-9 w-full px-3 text-[10px]">Sign in to personalize</button>
          </div>
        )}
      </div>

      <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Navigate</div>
      <nav className="space-y-1.5" aria-label="Primary navigation">
        {destinations.map(({ id, label, hint, icon: Icon, count }) => {
          const isActive = activeTab === id;
          return (
            <motion.button
              key={id}
              whileTap={{ scale: 0.98 }}
              data-active={isActive}
              onClick={() => {
                if (id === 'explore') {
                  onNavigate?.('explore');
                  return;
                }
                if (onNavigate) onNavigate(id); else setActiveTab(id);
              }}
              className="nx-sidebar-nav-item group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all"
            >
              <span className={`nx-nav-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors ${isActive ? 'bg-violet-500/20 text-violet-200' : 'bg-white/[0.045] text-slate-400 group-hover:text-violet-200'}`}>
                <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.2 : 1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-semibold ${isActive ? 'text-white' : 'text-slate-300 group-hover:text-white'}`}>{label}</span>
                <span className="mt-0.5 block truncate text-[10px] text-slate-500 group-hover:text-slate-400">{hint}</span>
              </span>
              {!!count && count > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1.5 text-[9px] font-bold text-white shadow-[0_0_14px_rgba(217,70,239,0.45)]">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="my-6 h-px bg-white/[0.08]" />
      <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">Create & discover</div>
      <div className="space-y-1.5">
        <button onClick={onOpenCreatePost} className="nx-create-action group flex w-full items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-3 py-3 text-left transition-all hover:border-violet-300/40 hover:bg-violet-500/15">
          <span className="nx-create-action-icon flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_8px_20px_rgba(139,92,246,0.28)]"><PlusCircle className="h-[18px] w-[18px]" /></span>
          <span><span className="block text-sm font-bold text-white">Create</span><span className="block text-[10px] text-violet-200/70">Share a moment</span></span>
        </button>
        <button onClick={() => setActiveTab('creator')} className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-all hover:border-white/10 hover:bg-white/[0.04]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300"><BarChart2 className="h-[18px] w-[18px]" /></span>
          <span><span className="block text-sm font-semibold text-slate-300 group-hover:text-white">Creator Studio</span><span className="block text-[10px] text-slate-500">Grow your signal</span></span>
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-system-hub'))} className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-all hover:border-white/10 hover:bg-white/[0.04]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-400/10 text-sky-300"><Sparkles className="h-[18px] w-[18px]" /></span>
          <span><span className="block text-sm font-semibold text-slate-300 group-hover:text-white">System Hub</span><span className="block text-[10px] text-slate-500">Settings & accessibility</span></span>
        </button>
      </div>

      <div className="mt-auto pt-8">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-transparent to-cyan-400/5 p-3">
          <div className="flex items-center gap-2"><NexoraPremiumLogo className="h-7 w-7" /><span className="text-xs font-bold text-slate-200">Nexora Network</span></div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">A more intentional place to connect, create, and belong.</p>
        </div>
        <p className="mt-4 px-2 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-slate-600">Private by design · Premium by default</p>
      </div>
    </aside>
  );
}
