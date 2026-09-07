import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  Globe, 
  Compass, 
  Users, 
  MessageSquare, 
  Bell, 
  Target, 
  Briefcase, 
  Sparkles, 
  Bookmark, 
  BarChart2, 
  Wallet, 
  Sliders, 
  X, 
  ChevronRight 
} from 'lucide-react';

interface SlideDownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  matrixSubTabRedirect?: string;
  unreadMessagesCount?: number;
  unreadNotificationsCount?: number;
}

export default function SlideDownMenu({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  matrixSubTabRedirect,
  unreadMessagesCount = 0,
  unreadNotificationsCount = 0
}: SlideDownMenuProps) {

  // Close on Escape key press or Android Back event
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const handleEscape = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('nexora-escape', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('nexora-escape', handleEscape);
    };
  }, [isOpen, onClose]);

  // Comprehensive list of all 13 core Nexora destinations in logical order
  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      desc: 'Feed & latest updates',
      icon: Home,
      tab: 'feed',
      badge: 0,
      iconColor: 'text-violet-400 bg-violet-500/10'
    },
    {
      id: 'world-pulse',
      label: 'World Pulse',
      desc: 'Live global trends & radar',
      icon: Globe,
      tab: 'pulse',
      badge: 0,
      iconColor: 'text-cyan-400 bg-cyan-500/10'
    },
    {
      id: 'communities',
      label: 'Communities',
      desc: 'Public spaces',
      icon: Compass,
      tab: 'communities',
      badge: 0,
      iconColor: 'text-purple-400 bg-purple-500/10'
    },
    {
      id: 'circles',
      label: 'Circles',
      desc: 'Your audiences',
      icon: Users,
      tab: 'matrix',
      subTab: 'circles',
      badge: 0,
      iconColor: 'text-emerald-400 bg-emerald-500/10'
    },
    {
      id: 'messages',
      label: 'Messages',
      desc: 'Direct chats',
      icon: MessageSquare,
      tab: 'inbox',
      badge: unreadMessagesCount,
      iconColor: 'text-blue-400 bg-blue-500/10'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      desc: 'Activity & alerts',
      icon: Bell,
      tab: 'activity',
      badge: unreadNotificationsCount,
      iconColor: 'text-pink-400 bg-pink-500/10'
    },
    {
      id: 'missions',
      label: 'Missions',
      desc: 'Social tasks & quests',
      icon: Target,
      tab: 'matrix',
      subTab: 'missions',
      badge: 0,
      iconColor: 'text-amber-400 bg-amber-500/10'
    },
    {
      id: 'opportunities',
      label: 'Opportunities',
      desc: 'Gigs & bounties',
      icon: Briefcase,
      tab: 'matrix',
      subTab: 'opportunities',
      badge: 0,
      iconColor: 'text-emerald-300 bg-emerald-500/10'
    },
    {
      id: 'voh-ai',
      label: 'VOH AI',
      desc: 'AI co-pilot & speech',
      icon: Sparkles,
      tab: 'nida',
      badge: 0,
      iconColor: 'text-fuchsia-400 bg-fuchsia-500/10'
    },
    {
      id: 'saved',
      label: 'Saved',
      desc: 'Bookmarks & collections',
      icon: Bookmark,
      tab: 'saved',
      badge: 0,
      iconColor: 'text-yellow-400 bg-yellow-500/10'
    },
    {
      id: 'creator-hub',
      label: 'Creator Hub',
      desc: 'Creator studio & analytics',
      icon: BarChart2,
      tab: 'creator',
      badge: 0,
      iconColor: 'text-indigo-400 bg-indigo-500/10'
    },
    {
      id: 'wallet',
      label: 'Wallet',
      desc: 'Wallet & balance',
      icon: Wallet,
      tab: 'wallet',
      badge: 0,
      iconColor: 'text-green-400 bg-green-500/10'
    },
    {
      id: 'settings',
      label: 'Settings',
      desc: 'Preferences & privacy',
      icon: Sliders,
      tab: 'settings',
      badge: 0,
      iconColor: 'text-zinc-300 bg-zinc-500/10'
    }
  ];

  const isItemActive = (item: typeof menuItems[0]) => {
    if (item.id === 'home') return activeTab === 'feed';
    if (item.id === 'world-pulse') return activeTab === 'pulse';
    if (item.id === 'communities') return activeTab === 'communities';
    if (item.id === 'circles') return activeTab === 'matrix' && matrixSubTabRedirect === 'circles';
    if (item.id === 'messages') return activeTab === 'inbox';
    if (item.id === 'notifications') return activeTab === 'activity';
    if (item.id === 'missions') return (activeTab === 'matrix' && matrixSubTabRedirect === 'missions') || (activeTab === 'nida' && matrixSubTabRedirect === 'missions');
    if (item.id === 'opportunities') return activeTab === 'matrix' && matrixSubTabRedirect === 'opportunities';
    if (item.id === 'voh-ai') return activeTab === 'nida' && (matrixSubTabRedirect === 'ai' || !matrixSubTabRedirect);
    if (item.id === 'saved') return activeTab === 'saved';
    if (item.id === 'creator-hub') return activeTab === 'creator';
    if (item.id === 'wallet') return activeTab === 'wallet';
    if (item.id === 'settings') return activeTab === 'settings';
    return activeTab === item.tab;
  };

  const handleSelect = (item: typeof menuItems[0]) => {
    window.dispatchEvent(new CustomEvent('changeTab', { 
      detail: { 
        tab: item.tab, 
        subTab: item.subTab 
      } 
    }));
    setActiveTab(item.tab);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Subtle click-catcher backdrop - preserves full view of Home feed underneath */}
          <motion.div
            key="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-black/30 sm:bg-black/20 backdrop-blur-[1.5px] cursor-pointer"
            aria-hidden="true"
          />

          {/* Compact Top-Right Popover Dropdown */}
          <motion.div
            key="menu-popover"
            id="nexora-home-dropdown-popover"
            initial={{ opacity: 0, scale: 0.94, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -8 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: 'top right' }}
            className="fixed top-13 sm:top-15 right-2 sm:right-4 md:right-6 lg:right-8 z-[95] w-72 sm:w-80 max-w-[calc(100vw-16px)] max-h-[min(520px,calc(100dvh-76px))] flex flex-col bg-[#0c0a18]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_1px_1px_rgba(139,92,246,0.25)] text-white overflow-hidden"
          >
            {/* Compact Header */}
            <div className="px-3.5 py-2.5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                <span className="text-[11px] font-mono font-bold tracking-wider text-zinc-300 uppercase">
                  Menu Navigation
                </span>
              </div>
              
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable list of compact destination items */}
            <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all cursor-pointer group ${
                      active 
                        ? 'bg-violet-600/20 border border-violet-500/40 text-white shadow-xs' 
                        : 'border border-transparent hover:bg-white/5 hover:border-white/5 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${item.iconColor} transition-transform group-hover:scale-105`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-sans text-xs truncate font-medium ${active ? 'text-violet-200 font-semibold' : 'text-zinc-200 group-hover:text-white'}`}>
                            {item.label}
                          </span>
                          {item.badge > 0 && (
                            <span className="bg-pink-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-sans truncate block">
                          {item.desc}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ml-2 transition-transform ${
                      active 
                        ? 'text-violet-300 translate-x-0.5' 
                        : 'text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5'
                    }`} />
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
