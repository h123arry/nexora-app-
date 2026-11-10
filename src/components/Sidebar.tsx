import { Home, MessageSquare, User as UserIcon, Bell, PlusCircle, Users, Sliders, Sparkles, Compass, BarChart2, Search, Settings2, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import { User, ThemeMood } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import NexoraPremiumLogo from './NexoraPremiumLogo';
import NexoraBranding from './NexoraBranding';
import { getTranslations } from '../utils/translations';

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
  locale?: string;
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
  onOpenAuth,
  locale = 'en'
}: SidebarProps) {
  const copy = getTranslations(locale);
  const destinations = [
    { id: 'feed', label: copy.navHome, hint: copy.navDailySignal, icon: Home },
    { id: 'explore', label: copy.navExplore, hint: copy.navFindPeople, icon: Compass },
    { id: 'giftverse', label: 'Giftverse', hint: 'Discover 120 original creator gifts', icon: Gift },
    { id: 'communities', label: copy.navCommunities, hint: copy.navSharedInterests, icon: Users },
    { id: 'inbox', label: copy.navMessages, hint: copy.navPrivateConversations, icon: MessageSquare, count: unreadMessagesCount },
    { id: 'activity', label: copy.navActivity, hint: copy.navStayInLoop, icon: Bell, count: unreadNotificationsCount },
    { id: 'profile', label: copy.navProfile, hint: copy.navYourSpace, icon: UserIcon }
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
              decoding="async"
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
          <button className="nx-icon-button !min-h-8 !min-w-8 !rounded-xl" aria-label={copy.navProfileSettings} onClick={() => { if (onNavigate) onNavigate('settings'); else setActiveTab('settings'); }}>
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {!isLoggedIn && (
          <div className="mt-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3 text-center">
            <p className="mb-2 text-[10px] font-semibold leading-relaxed text-violet-100">{copy.navVisitorPreview}</p>
            <button onClick={onOpenAuth} className="nx-btn-primary min-h-9 w-full px-3 text-[10px]">{copy.navSignInToPersonalize}</button>
          </div>
        )}
      </div>

      <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{copy.navNavigate}</div>
      <nav className="space-y-1.5" aria-label={copy.navPrimaryNavigation}>
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
              aria-current={isActive ? 'page' : undefined}
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
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-violet-600 px-1.5 text-[9px] font-bold text-white shadow-[0_0_14px_rgba(113,56,255,0.35)]">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      <div className="my-6 h-px bg-white/[0.08]" />
      <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">{copy.navCreateDiscover}</div>
      <div className="space-y-1.5">
        <button onClick={onOpenCreatePost} aria-label="Open the create menu" className="nx-create-action group flex w-full items-center gap-3 rounded-2xl border border-[#7138FF]/35 bg-[#7138FF]/10 px-3 py-3 text-left transition-all hover:border-[#B69BFF]/60 hover:bg-[#7138FF]/20">
          <span className="nx-create-action-icon flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#8A3FFC_0%,#4B10F2_58%,#1600A3_100%)] text-white shadow-[0_8px_20px_rgba(113,56,255,0.32)]"><PlusCircle className="h-[18px] w-[18px]" /></span>
          <span><span className="block text-sm font-bold text-white">{copy.navCreate}</span><span className="block text-[10px] text-violet-200/70">{copy.navShareMoment}</span></span>
        </button>
        <button onClick={() => setActiveTab('creator')} className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-all hover:border-white/10 hover:bg-white/[0.04]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-200"><BarChart2 className="h-[18px] w-[18px]" /></span>
          <span><span className="block text-sm font-semibold text-slate-300 group-hover:text-white">{copy.navCreatorStudio}</span><span className="block text-[10px] text-slate-500">{copy.navGrowSignal}</span></span>
        </button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('open-system-hub'))} className="group flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-left transition-all hover:border-white/10 hover:bg-white/[0.04]">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-200"><Sparkles className="h-[18px] w-[18px]" /></span>
          <span><span className="block text-sm font-semibold text-slate-300 group-hover:text-white">{copy.navSystemHub}</span><span className="block text-[10px] text-slate-500">{copy.navSettingsAccessibility}</span></span>
        </button>
      </div>

      <div className="mt-auto pt-8">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/12 via-transparent to-indigo-500/8 p-3">
          <div className="flex items-center gap-2"><NexoraPremiumLogo className="h-7 w-7" /><span className="text-xs font-bold text-slate-200">Nexora Network</span></div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">A more intentional place to connect, create, and belong.</p>
        </div>
        <p className="mt-4 px-2 text-center text-[9px] font-medium uppercase tracking-[0.18em] text-slate-600">{copy.navPrivateByDesign} · {copy.navPremiumByDefault}</p>
      </div>
    </aside>
  );
}
