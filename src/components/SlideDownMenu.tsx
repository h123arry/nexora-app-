import React from 'react';
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
import NexoraBranding from './NexoraBranding';

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

  // Strict required order:
  // 1. Home
  // 2. World Pulse
  // 3. Communities
  // 4. Circles
  // 5. Messages
  // 6. Notifications
  // 7. Missions
  // 8. Opportunities
  // 9. VOH AI
  // 10. Saved
  // 11. Creator Hub
  // 12. Wallet
  // 13. Settings
  const menuItems = [
    {
      id: 'home',
      label: 'Home',
      desc: 'Feed & latest updates',
      icon: Home,
      tab: 'feed',
      badge: 0,
      color: 'from-violet-500 to-indigo-500'
    },
    {
      id: 'world-pulse',
      label: 'World Pulse',
      desc: 'Live global trends & conversations',
      icon: Globe,
      tab: 'pulse',
      badge: 0,
      color: 'from-cyan-500 to-blue-500'
    },
    {
      id: 'communities',
      label: 'Communities',
      desc: 'Hubs, spaces & creator pages',
      icon: Compass,
      tab: 'communities',
      badge: 0,
      color: 'from-purple-500 to-pink-500'
    },
    {
      id: 'circles',
      label: 'Circles',
      desc: 'Interactive networks & friends',
      icon: Users,
      tab: 'matrix',
      subTab: 'circles',
      badge: 0,
      color: 'from-emerald-500 to-teal-500'
    },
    {
      id: 'messages',
      label: 'Messages',
      desc: 'Direct chats & group messaging',
      icon: MessageSquare,
      tab: 'inbox',
      badge: unreadMessagesCount,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'notifications',
      label: 'Notifications',
      desc: 'Activity alerts, likes & interactions',
      icon: Bell,
      tab: 'activity',
      badge: unreadNotificationsCount,
      color: 'from-pink-500 to-rose-500'
    },
    {
      id: 'missions',
      label: 'Missions',
      desc: 'Social tasks & community quests',
      icon: Target,
      tab: 'matrix',
      subTab: 'missions',
      badge: 0,
      color: 'from-amber-500 to-orange-500'
    },
    {
      id: 'opportunities',
      label: 'Opportunities',
      desc: 'Gigs, bounties & career sparks',
      icon: Briefcase,
      tab: 'matrix',
      subTab: 'opportunities',
      badge: 0,
      color: 'from-emerald-400 to-cyan-500'
    },
    {
      id: 'voh-ai',
      label: 'VOH AI',
      desc: 'Next-gen intelligence assistant',
      icon: Sparkles,
      tab: 'nida',
      badge: 0,
      color: 'from-violet-400 to-fuchsia-500'
    },
    {
      id: 'saved',
      label: 'Saved',
      desc: 'Bookmarks & saved collections',
      icon: Bookmark,
      tab: 'saved',
      badge: 0,
      color: 'from-yellow-500 to-amber-600'
    },
    {
      id: 'creator-hub',
      label: 'Creator Hub',
      desc: 'Studio, monetization & analytics',
      icon: BarChart2,
      tab: 'creator',
      badge: 0,
      color: 'from-purple-600 to-indigo-600'
    },
    {
      id: 'wallet',
      label: 'Wallet',
      desc: 'Sparks, earnings & transactions',
      icon: Wallet,
      tab: 'wallet',
      badge: 0,
      color: 'from-emerald-500 to-green-600'
    },
    {
      id: 'settings',
      label: 'Settings',
      desc: 'Privacy, security & preferences',
      icon: Sliders,
      tab: 'settings',
      badge: 0,
      color: 'from-zinc-400 to-zinc-600'
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
        <div className="fixed inset-0 z-[100] flex justify-center items-start pt-3 sm:pt-6 px-3 sm:px-4 pb-12 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md cursor-pointer"
          />

          {/* Menu Card Container with Swipe-to-Dismiss */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.8 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 80 || info.offset.y < -80) {
                onClose();
              }
            }}
            initial={{ y: -30, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -25, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="w-full max-w-xl bg-[#09061a]/95 border border-white/10 rounded-3xl p-4 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-white backdrop-blur-2xl relative z-10 my-auto sm:my-0 touch-none"
          >
            {/* Top Drag Handle for Mobile */}
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-3 sm:hidden" />

            {/* Header bar */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <NexoraBranding size="sm" showSubtitle={true} />
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-violet-400/90 bg-violet-950/60 px-2.5 py-1 rounded-full border border-white/10 shadow-xs">
                  Unified Navigation
                </span>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Close Menu"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid of menu items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[70vh] overflow-y-auto pr-1 custom-scrollbar">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);

                return (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelect(item)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all text-left cursor-pointer group ${
                      active 
                        ? 'bg-linear-to-r from-violet-900/60 via-purple-900/40 to-pink-900/30 border-violet-500 text-white shadow-lg shadow-violet-500/20 ring-1 ring-violet-500/50' 
                        : 'bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10 text-zinc-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2.5 rounded-xl bg-linear-to-br ${item.color} text-white shrink-0 shadow-sm group-hover:scale-105 transition-transform`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-sans font-bold text-xs truncate block ${active ? 'text-violet-200' : 'text-zinc-100 group-hover:text-violet-300'} transition-colors`}>
                            {item.label}
                          </span>
                          {item.badge > 0 && (
                            <span className="bg-pink-500 text-white text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                              {item.badge}
                            </span>
                          )}
                          {active && (
                            <span className="text-[8px] font-mono font-bold text-violet-300 bg-violet-600/40 border border-violet-400/40 px-1.5 py-0.2 rounded-md uppercase">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-zinc-400 font-sans truncate block">
                          {item.desc}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 ${active ? 'text-violet-300' : 'text-zinc-500 group-hover:text-violet-400'} group-hover:translate-x-0.5 transition-all shrink-0 ml-2`} />
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
