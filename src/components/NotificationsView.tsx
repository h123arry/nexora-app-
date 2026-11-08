import React, { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageSquare, UserPlus, ShieldAlert, CheckCheck, AtSign, Zap, Users, Building, Target, Award, Globe, Brain, Settings, X, Search, Bookmark, BookmarkCheck, Eye, ArrowRight, Sparkle, History, Volume2, VolumeX, AlertTriangle, RefreshCw, Layers, Trash, Star, Radio, Info, ChevronDown, ChevronUp, Sliders, MoreVertical, SlidersHorizontal, Flame, Activity, Maximize2, ThumbsUp, Volume, Clock, CheckSquare, Square, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification, User } from '../types';
import { deleteOwnNotification, deleteOwnNotifications, setNotificationReadState, setNotificationsReadState } from '../services/dataService';
import RelativeTime from './RelativeTime';
import NexoraLoader from './NexoraLoader';
import { getNotificationTimeSection } from '../utils/notificationTime';
import {
  requestPushPermission,
  isPushPermissionGranted,
  playNotificationSound,
} from '../services/notificationService';

interface NotificationsViewProps {
  notifications: Notification[];
  currentUser: User;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onViewProfile?: (userId: string) => void;
}

// UI-only metadata derived from real notification records.
interface RichNotification extends Notification {
  timeSection: 'today' | 'yesterday' | 'this_week' | 'earlier' | 'older';
  priorityLevel: 'high' | 'medium' | 'low';
  mediaThumbnail?: string;
  previewText?: string;
  isArchived?: boolean;
  liveJoined?: boolean;
  reputationAwarded?: number;
  subActivities?: {
    userId: string;
    username: string;
    avatar: string;
    isVerified: boolean;
    timestamp: string;
  }[];
}

export default function NotificationsView({
  notifications: propNotifications,
  currentUser,
  onMarkAllAsRead,
  onClearNotifications,
  onViewProfile
}: NotificationsViewProps) {
  
  // ---------------------------------------------------------------------------
  // STATE DEFINITIONS
  // ---------------------------------------------------------------------------
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [visibleCount, setVisibleCount] = useState(12);

  // Multi-select management state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);


  // Floating notifications/toast feedback system
  const [toasts, setToasts] = useState<{ id: string; content: string }[]>([]);

  // Confetti / Celebration active state
  const [confettiParticles, setConfettiParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; rotation: number; speedY: number; speedX: number }[]>([]);
  const confettiIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Watch History (reused from existing template specs)
  const [watchHistory, setWatchHistory] = useState<any[]>([]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  // Notification configuration preferences
  const [settingsToggles, setSettingsToggles] = useState({
    likes: true,
    comments: true,
    followers: true,
    mentions: true,
    communities: true,
    events: true,
    verification: true,
    creatorUploads: true,
    friendRequests: true,
    securityAlerts: true,
  });

  // Notifications are hydrated from the real notification prop; no sample activity is seeded.
  const [notificationsList, setNotificationsList] = useState<RichNotification[]>([]);

  // ---------------------------------------------------------------------------
  // TOAST EMITTER
  // ---------------------------------------------------------------------------
  const addToast = (content: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, content }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // ---------------------------------------------------------------------------
  // CONFETTI LAUNCHER (Creator Milestone reward)
  // ---------------------------------------------------------------------------
  const triggerConfetti = () => {
    addToast("🎉 Milestone reached. Enjoy the celebration!");
    const colors = ["#8B5CF6", "#EC4899", "#10B981", "#F59E0B", "#3B82F6", "#EF4444"];
    const particles = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: -20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 6,
      rotation: Math.random() * 360,
      speedY: Math.random() * 5 + 3,
      speedX: Math.random() * 4 - 2
    }));
    setConfettiParticles(particles);

    let frames = 0;
    const interval = setInterval(() => {
      setConfettiParticles(prev => {
        if (prev.length === 0 || frames > 120) {
          clearInterval(interval);
          return [];
        }
        frames++;
        return prev.map(p => ({
          ...p,
          y: p.y + p.speedY,
          x: p.x + p.speedX,
          rotation: p.rotation + 4
        })).filter(p => p.y < window.innerHeight + 20);
      });
    }, 16);
  };

  // ---------------------------------------------------------------------------
  // INITIAL DATA SEEDING (Merged with Prop Notifications)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const hydrateNotifications = () => {
      // Convert propNotifications to RichNotifications if any are supplied by the app
      const resolvedProps = (propNotifications || []).map(n => ({
        ...n,
        timeSection: getNotificationTimeSection(n.timestamp),
        priorityLevel: (n.type === 'mention' || n.type === 'system' ? 'high' : 'medium') as any,
        isRead: n.isRead
      }));

      const finalSet = resolvedProps.filter((notification, index, all) =>
        all.findIndex(candidate => candidate.id === notification.id) === index
      );
      setNotificationsList(finalSet);
    };

    hydrateNotifications();

  }, [propNotifications]);

  // ---------------------------------------------------------------------------
  // INTERACTIVE ACTION HANDLERS
  // ---------------------------------------------------------------------------
  const handleMarkAllAsReadLocal = async () => {
    const unreadIds = notificationsList.filter(item => !item.isRead).map(item => item.id);
    try {
      await setNotificationsReadState(currentUser.id, unreadIds, true);
      setNotificationsList(prev => prev.map(item => ({ ...item, isRead: true })));
      onMarkAllAsRead();
      addToast("✨ Marked all notifications as read!");
    } catch {
      addToast("Couldn't update all notifications. Please try again.");
    }
  };

  const handleClearAllLocal = async () => {
    const ids = notificationsList.map(item => item.id);
    try {
      await deleteOwnNotifications(currentUser.id, ids);
      setNotificationsList([]);
      onClearNotifications();
      addToast("🗑️ Notifications inbox cleared.");
    } catch {
      addToast("Couldn't clear all notifications. Please try again.");
    }
  };

  const handleToggleRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const notification = notificationsList.find(item => item.id === id);
    if (!notification) return;
    const nextState = !notification.isRead;
    try {
      await setNotificationReadState(currentUser.id, id, nextState);
      setNotificationsList(prev => prev.map(item => item.id === id ? { ...item, isRead: nextState } : item));
      addToast(nextState ? "Marked notification as read" : "Marked notification as unread");
    } catch {
      addToast("Couldn't update this notification. Please try again.");
    }
  };

  const handleMarkSelectedRead = async () => {
    const unreadIds = notificationsList
      .filter(item => selectedIds.includes(item.id) && !item.isRead)
      .map(item => item.id);
    if (unreadIds.length === 0) return;
    try {
      await setNotificationsReadState(currentUser.id, unreadIds, true);
      setNotificationsList(prev => prev.map(item => unreadIds.includes(item.id) ? { ...item, isRead: true } : item));
      addToast(`✨ Marked ${unreadIds.length} selected as read!`);
      setSelectedIds([]);
      setIsMultiSelectMode(false);
    } catch {
      addToast("Some notifications couldn't be updated. Please try again.");
    }
  };

  const handleDeleteSelected = async () => {
    const ids = notificationsList.filter(n => selectedIds.includes(n.id)).map(n => n.id);
    if (ids.length === 0) return;
    try {
      await deleteOwnNotifications(currentUser.id, ids);
      setNotificationsList(prev => prev.filter(n => !ids.includes(n.id)));
      addToast(`🗑️ Removed ${ids.length} notifications!`);
      setSelectedIds([]);
      setIsMultiSelectMode(false);
    } catch {
      addToast("Some notifications couldn't be deleted. Please try again.");
    }
  };

  const handlePullToRefresh = () => {
    addToast('Notifications update automatically when new activity arrives.');
  };

  const handleLoadMore = () => {
    setVisibleCount(previous => previous + 5);
  };

  const handleSelectAll = () => {
    const visibleIds = getFilteredAndSortedNotifications().map(n => n.id);
    if (selectedIds.length === visibleIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleIds);
    }
  };

  const handleDismissSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteOwnNotification(currentUser.id, id);
      setNotificationsList(prev => prev.filter(n => n.id !== id));
      addToast("Notification dismissed");
    } catch {
      addToast("Couldn't dismiss this notification. Please try again.");
    }
  };

  // Navigate only to records and routes that exist.
  const handleDeepLinkClick = (notif: RichNotification) => {
    if (isMultiSelectMode) {
      // Toggle selection in multi-select mode instead of deep linking
      setSelectedIds(prev => prev.includes(notif.id) ? prev.filter(id => id !== notif.id) : [...prev, notif.id]);
      return;
    }


    // Mark as read automatically on tap
    if (!notif.isRead) {
      void setNotificationReadState(currentUser.id, notif.id, true)
        .then(() => setNotificationsList(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)))
        .catch(() => addToast("Couldn't mark this notification as read. Please try again."));
    }

    // Interactive custom routing checks
    if (notif.type === 'comment' || notif.type === 'spark' || notif.type === 'like') {
      // Redirect to Feed, look for element
      window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'feed' } }));
      setTimeout(() => {
        const targetPostId = notif.targetId;
        if (!targetPostId) {
          addToast('This notification does not contain a linked post.');
          return;
        }
        const element = document.getElementById(`post-${targetPostId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-violet-500', 'ring-offset-4', 'scale-[1.01]', 'transition-all');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-violet-500', 'ring-offset-4', 'scale-[1.01]');
          }, 4000);
          addToast("🎯 Highlighted post and filtered replies successfully!");
        } else {
          addToast('The linked post is not currently available in your feed.');
        }
      }, 500);
    } else if (notif.type === 'follow' || notif.type === 'profile_view') {
      if (onViewProfile && notif.userId && notif.userId !== 'multiple') {
        onViewProfile(notif.userId);
      } else {
        window.dispatchEvent(new CustomEvent('nexora-view-profile', { detail: { userIdOrUsername: notif.userId || notif.username } }));
        addToast(`Viewing profile of @${notif.username}`);
      }
    } else if (notif.type === 'pulse_alert') {
      window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'pulse' } }));
    } else if (notif.type === 'reputation_milestone' && notif.reputationAwarded) {
      triggerConfetti();
    }
  };

  // ---------------------------------------------------------------------------
  // FILTERING & SORTING LOGIC (With intelligent smart grouping)
  // ---------------------------------------------------------------------------
  const getFilteredAndSortedNotifications = (): RichNotification[] => {
    // 1. Initial filter by category selection
    let filtered = notificationsList.filter(n => {
      if (n.isArchived) return false;

      // Filter settings blocks
      if (n.type === 'like' && !settingsToggles.likes) return false;
      if (n.type === 'comment' && !settingsToggles.comments) return false;
      if (n.type === 'follow' && !settingsToggles.followers) return false;
      if (n.type === 'mention' && !settingsToggles.mentions) return false;
      if (n.type === 'community' && !settingsToggles.communities) return false;
      if (n.type === 'system' && !settingsToggles.securityAlerts) return false;

      // Match categories
      if (activeCategory === 'all') return true;
      if (activeCategory === 'mentions') return n.type === 'mention';
      if (activeCategory === 'comments') return n.type === 'comment';
      if (activeCategory === 'likes') return n.type === 'like' || n.type === 'spark';
      if (activeCategory === 'followers') return n.type === 'follow';
      if (activeCategory === 'profile_views') return n.type === 'profile_view';
      if (activeCategory === 'system') return n.type === 'system';
      if (activeCategory === 'communities') return n.type === 'community';
      if (activeCategory === 'live') return n.type === 'pulse_alert' && n.content.includes('LIVE');
      if (activeCategory === 'verification') return n.type === 'reputation_milestone' && n.content.includes('Verification');
      if (activeCategory === 'creator') return n.type === 'reputation_milestone' && n.content.includes('Milestone');

      return true;
    });

    // 2. Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n => 
        n.content.toLowerCase().includes(q) || 
        n.username.toLowerCase().includes(q) ||
        (n.previewText && n.previewText.toLowerCase().includes(q))
      );
    }

    // 3. Sort by priority and timestamp
    // Sort logic: Pinned first, then Priority (High -> Medium -> Low), then Time.
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    
    return filtered.sort((a, b) => {
      // Priority Level weighting
      const aWeight = priorityWeight[a.priorityLevel] || 1;
      const bWeight = priorityWeight[b.priorityLevel] || 1;
      if (aWeight !== bWeight) return bWeight - aWeight;

      // Treat as standard order
      return 0; 
    });
  };

  // Group notifications into Time Sections: Today, Yesterday, This Week, Earlier, Older
  const groupNotificationsByTime = (list: RichNotification[]) => {
    const grouped: { [key in RichNotification['timeSection']]: RichNotification[] } = {
      today: [],
      yesterday: [],
      this_week: [],
      earlier: [],
      older: []
    };

    list.forEach(item => {
      grouped[item.timeSection].push(item);
    });

    return grouped;
  };

  // Resolve Type Icons
  const resolveIcon = (type: string, themeColor: string) => {
    switch (type) {
      case 'like':
      case 'spark':
        return <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-pink-400" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'profile_view':
        return <Eye className="w-4 h-4 text-cyan-400" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-violet-400" />;
      case 'system':
        return <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse" />;
      case 'reputation_milestone':
        return <Award className="w-4 h-4 text-yellow-400" />;
      case 'community':
        return <Users className="w-4 h-4 text-cyan-400" />;
      case 'pulse_alert':
        return <Radio className="w-4 h-4 text-sky-400 animate-pulse" />;
      default:
        return <Bell className="w-4 h-4 text-purple-400" />;
    }
  };

  const getPriorityBadge = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return <span className="px-1.5 py-0.5 rounded-sm bg-rose-500/10 border border-rose-500/20 text-[8px] font-mono font-extrabold text-rose-400 uppercase tracking-widest">HIGH PRIORITY</span>;
      case 'medium':
        return <span className="px-1.5 py-0.5 rounded-sm bg-amber-500/10 border border-amber-500/20 text-[8px] font-mono font-extrabold text-amber-400 uppercase tracking-widest">MEDIUM</span>;
      case 'low':
        return <span className="px-1.5 py-0.5 rounded-sm bg-zinc-500/10 border border-zinc-500/20 text-[8px] font-mono font-extrabold text-zinc-400 uppercase tracking-widest">LOW PRIORITY</span>;
    }
  };

  const activeGroupedNotifications = getFilteredAndSortedNotifications();
  const timeGroupedNotifications = groupNotificationsByTime(activeGroupedNotifications.slice(0, visibleCount));
  const totalUnread = notificationsList.filter(n => !n.isRead).length;

  // ---------------------------------------------------------------------------
  // RENDERING COMPONENTS
  // ---------------------------------------------------------------------------
  return (
    <div id="nexora-notification-suite" className="nx-page-shell nx-soft-card space-y-6 rounded-2xl p-4 sm:p-5 relative select-none">
      
      {/* Toast Feedback Layer */}
      <div className="fixed bottom-10 right-10 z-50 flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="bg-[#0b0821]/95 border border-white/10 text-violet-100 font-sans text-xs px-4 py-3 rounded-2xl shadow-md backdrop-blur-md flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-violet-400">✨</span>
                <span>{t.content}</span>
              </div>
              <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} className="text-zinc-500 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confetti Particle Layer */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {confettiParticles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-xs"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size * 1.5,
              backgroundColor: p.color,
              transform: `rotate(${p.rotation}deg)`,
              opacity: 0.85,
              transition: 'top 0.016s linear, left 0.016s linear'
            }}
          />
        ))}
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* HEADER SECTION */}
      {/* ----------------------------------------------------------------------- */}
      <div className="nx-page-header flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-violet-600 text-white relative">
              <Bell className="w-5 h-5 animate-swing" />
              {totalUnread > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 rounded-full bg-red-500 text-[9px] font-mono font-black items-center justify-center border border-slate-950 animate-bounce">
                  {totalUnread}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-black font-sans text-white tracking-tight flex items-center gap-2">
                Notifications
              </h2>
            </div>
          </div>
        </div>

        {/* Global actions row */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
            className={`min-h-11 px-3 rounded-xl border text-[11px] font-sans font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              isMultiSelectMode
                ? 'bg-amber-500/25 border-amber-400/40 text-amber-300'
                : 'bg-black/30 border-white/10 text-violet-300 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isMultiSelectMode ? 'Cancel Selection' : 'Manage / Select'}</span>
          </button>

          {totalUnread > 0 && (
            <button
              onClick={handleMarkAllAsReadLocal}
              className="min-h-11 px-3 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-[11px] font-sans font-extrabold text-violet-300 border border-white/10 transition-all uppercase flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`nx-icon-button inline-flex border transition-all cursor-pointer ${
              isSettingsOpen 
                ? 'bg-violet-500/20 border-white/10 text-white' 
                : 'bg-black/30 border-white/10 text-violet-300 hover:text-white'
            }`}
            title="Notification Configuration"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={handlePullToRefresh}
            className="nx-icon-button inline-flex text-violet-300"
            title="Notifications update automatically"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* MULTI-SELECT ACTIVE MANAGEMENT DRAWER */}
      {/* ----------------------------------------------------------------------- */}
      <AnimatePresence>
        {isMultiSelectMode && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="bg-[#120e2e]/90 border border-amber-500/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden shadow-md"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-white/10 text-violet-300 hover:text-white transition-all text-xs font-mono font-bold uppercase flex items-center gap-1.5"
              >
                {selectedIds.length === getFilteredAndSortedNotifications().length ? (
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>Select All</span>
              </button>
              <span className="text-xs font-mono text-zinc-300">
                <strong className="text-amber-400 font-extrabold">{selectedIds.length}</strong> items marked in active registry
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkSelectedRead}
                disabled={selectedIds.length === 0}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white rounded-xl text-xs font-sans font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Mark Read</span>
              </button>

              <button
                onClick={handleDeleteSelected}
                disabled={selectedIds.length === 0}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-xs font-sans font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------------- */}
      {/* SETTINGS DRAWER */}
      {/* ----------------------------------------------------------------------- */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-5 rounded-3xl bg-[#09071c] border border-white/10 space-y-5 shadow-md text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-mono font-black text-violet-300 uppercase flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-violet-400" />
                  Inbox display filters
                </span>
                <button onClick={() => setIsSettingsOpen(false)} className="text-violet-400 hover:text-white transition-colors">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Grid of Toggle preferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* Local display filters only */}
                <div className="p-3.5 rounded-2xl bg-black/45 border border-white/5 space-y-3">
                  <span className="text-[10px] font-mono text-violet-400/60 uppercase tracking-widest font-bold block">Activity Categories</span>
                  <div className="space-y-2 text-xs font-sans">
                    {[
                      { key: 'likes', label: 'Likes & Sparks' },
                      { key: 'comments', label: 'Comments & Replies' },
                      { key: 'followers', label: 'Followers' },
                      { key: 'mentions', label: 'Mentions (@)' },
                      { key: 'communities', label: 'Communities' },
                      { key: 'events', label: 'Events Registration' },
                      { key: 'verification', label: 'Verification Status' },
                      { key: 'securityAlerts', label: 'Security & Auth Alerts' }
                    ].map(pref => {
                      const val = settingsToggles[pref.key as keyof typeof settingsToggles];
                      return (
                        <label key={pref.key} className="flex items-center justify-between cursor-pointer group">
                          <span className="text-zinc-300 group-hover:text-white transition-colors">{pref.label}</span>
                          <input
                            type="checkbox"
                            checked={val as boolean}
                            onChange={() => setSettingsToggles(prev => ({ ...prev, [pref.key]: !val }))}
                            className="w-4 h-4 text-violet-500 rounded-sm border-zinc-700 bg-zinc-900 focus:ring-violet-500 focus:ring-offset-zinc-900"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[10px] leading-relaxed text-zinc-500">These switches only filter which activity appears in this inbox view. They do not change push, email, sound, vibration, or server delivery settings.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------------------------- */}
      {/* ⚡ REAL-TIME NOTIFICATION SYSTEM CONTROLS & DEVICE NOTIFICATION CONTROLS */}
      {/* ----------------------------------------------------------------------- */}
      <div className="p-4 rounded-3xl bg-linear-to-r from-[#0d0a22]/90 via-[#0a0718]/90 to-[#04010b]/90 border border-violet-500/20 shadow-[0_4px_24px_rgba(139,92,246,0.12)] text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping" />
            <span className="text-xs font-mono font-black text-violet-200 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Browser notification permission
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                const res = await requestPushPermission();
                if (res === 'granted') {
                  addToast("Browser notification permission granted. Device push delivery still requires a registered token.");
                } else {
                  addToast("⚠️ Push permission was not granted by the browser.");
                }
              }}
              className="px-2.5 py-1 rounded-xl bg-violet-600/20 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Bell className="w-3 h-3 text-violet-400" />
              <span>{isPushPermissionGranted() ? 'Browser Permission Granted' : 'Request Browser Permission'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playNotificationSound('spark');
                addToast("Notification sound test played on this device.");
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/10 transition-colors"
              title="Test chime sound"
            >
              <Volume2 className="w-3.5 h-3.5 text-violet-300" />
            </button>
          </div>
        </div>

      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* SEARCH AND INSTANT FILTER TABS */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 gap-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-violet-400/50" />
          <input 
            type="text" 
            placeholder="Search notification history (usernames, tags, keywords, system status...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-black/40 border border-white/10 focus:outline-none focus:border-white/10 focus:bg-[#060411]/90 transition-all font-sans text-xs text-white placeholder:text-violet-400/30"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Categories Horizontal Slider */}
        <div className="flex items-center gap-1.5 border-b border-white/10 pb-2.5 max-w-full overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'mentions', label: 'Mentions' },
            { id: 'comments', label: 'Comments' },
            { id: 'likes', label: 'Sparks & Likes' },
            { id: 'followers', label: 'Followers' },
            { id: 'profile_views', label: 'Profile Views' },
            { id: 'live', label: 'Live Streams' },
            { id: 'communities', label: 'Communities' },
            { id: 'creator', label: 'Creator Milestones' },
            { id: 'system', label: 'Security & Core' }
          ].map((tab) => {
            const isActive = activeCategory === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 relative ${
                  isActive 
                    ? 'bg-violet-600/10 text-white border border-white/10' 
                    : 'bg-transparent border border-transparent text-violet-400/50 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeChipUnderlay"
                    className="absolute inset-0 bg-violet-600/5 rounded-xl border border-white/10 -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>


      {/* ----------------------------------------------------------------------- */}
      {/* NOTIFICATIONS STREAM RENDERING */}
      {/* ----------------------------------------------------------------------- */}
      {activeGroupedNotifications.length === 0 ? (
        // Beautiful Empty State Illustration
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-16 text-center rounded-3xl border border-dashed border-white/10 bg-[#070513]/40 space-y-5 max-w-lg mx-auto"
        >
          <div className="w-16 h-16 rounded-full bg-violet-600/5 border border-white/10 flex items-center justify-center mx-auto text-violet-400/40">
            <CheckCheck className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h4 className="text-sm font-sans font-extrabold text-white uppercase tracking-wider">You're all caught up!</h4>
            <p className="text-xs font-sans text-violet-300/40 leading-relaxed max-w-sm mx-auto">
              We'll let you know when something new comes up.
            </p>
          </div>

          <button
            onClick={() => {
              handlePullToRefresh();
            }}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-colors flex items-center gap-2 mx-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {Object.entries(timeGroupedNotifications).map(([timeSection, list]) => {
            if (list.length === 0) return null;

            // Header mapping
            const sectionHeaders: { [key: string]: string } = {
              today: 'Today',
              yesterday: 'Yesterday',
              this_week: 'This Week',
              earlier: 'Earlier',
              older: 'Older Logs'
            };

            return (
              <div key={timeSection} className="space-y-3.5 text-left">
                {/* Time Section Label */}
                <h3 className="text-[10px] font-mono font-black text-violet-300 uppercase tracking-widest pl-2 mb-3 mt-6 sticky top-0 bg-[#030112]/95 backdrop-blur-sm py-2 border-b border-white/10">
                  {sectionHeaders[timeSection]}
                </h3>

                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {list.map(notif => {
                      const isSelected = selectedIds.includes(notif.id);

                      // Smart Expand State for grouped Likes
                      const isGroupExpanded = expandedGroups[notif.id] || false;
                      const setIsGroupExpanded = (val: boolean) => setExpandedGroups(prev => ({ ...prev, [notif.id]: val }));

                      return (
                        <motion.div
                          key={notif.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`nx-soft-card p-4 rounded-3xl border text-left flex flex-col gap-3.5 transition-all relative overflow-hidden group/item ${
                            isSelected
                                ? 'bg-[#15112f] border-amber-500/20'
                                : notif.isRead
                                  ? 'bg-black/35 border-white/10 opacity-70 hover:opacity-100 hover:border-white/10'
                                  : 'bg-[#09071f]/85 border-white/10 shadow-[0_0_15px_rgba(139,92,246,0.03)] hover:border-white/10'
                          }`}
                          onClick={() => handleDeepLinkClick(notif)}
                        >
                          {/* Top Tag detail and Drag Swipe quick visual hints */}
                          <div className="absolute top-2.5 right-4 flex items-center gap-2">
                            {getPriorityBadge(notif.priorityLevel)}
                          </div>

                          {/* Main Row layout with checkbox if multiselect is on */}
                          <div className="flex items-start gap-3.5">
                            {isMultiSelectMode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedIds(prev => prev.includes(notif.id) ? prev.filter(id => id !== notif.id) : [...prev, notif.id]);
                                }}
                                className="mt-1 shrink-0 p-1 rounded-lg hover:bg-white/5 transition-all"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-amber-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-zinc-500" />
                                )}
                              </button>
                            )}

                            {/* Type badge icon */}
                            <div className="p-2.5 rounded-2xl bg-[#03010b] border border-white/10 shrink-0 self-start">
                              {resolveIcon(notif.type, notif.priorityLevel)}
                            </div>

                            {/* Profile Image with verification and Live Pulse Ring */}
                            {notif.userId !== 'system' && (
                              <button
                                type="button"
                                aria-label={`View @${notif.username || 'user'} profile`}
                                className="relative shrink-0 cursor-pointer hover:opacity-85 transition-opacity rounded-2xl focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-2"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (notif.userId || notif.username) {
                                    window.dispatchEvent(new CustomEvent('nexora-view-profile', { detail: { userIdOrUsername: notif.userId !== 'multiple' ? notif.userId : notif.username } }));
                                  }
                                }}
                              >
                                <img 
                                  src={notif.avatar} 
                                  alt="" 
                                  className={`w-11 h-11 rounded-2xl object-cover border border-white/10 ${
                                    notif.type === 'pulse_alert' && notif.content.includes('LIVE')
                                      ? 'ring-2 ring-red-500 animate-pulse'
                                      : ''
                                  }`} 
                                  referrerPolicy="no-referrer"
                                />
                                {/* Verification small overlay */}
                                {notif.userId !== 'multiple' && (
                                  <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-violet-600 border border-slate-900 flex items-center justify-center text-[8px] text-white">
                                    ★
                                  </span>
                                )}
                                {/* Pulse red indicator for live stream */}
                                {notif.type === 'pulse_alert' && notif.content.includes('LIVE') && (
                                  <span className="absolute -top-1 -right-1 h-3.5 px-1 bg-red-500 border border-slate-950 rounded-md text-[7px] font-bold font-mono text-white animate-pulse">
                                    LIVE
                                  </span>
                                )}
                              </button>
                            )}

                            {/* Description Copy */}
                            <div className="flex-1 overflow-hidden pr-2">
                              <div className="text-xs text-violet-100 font-sans leading-relaxed">
                                {notif.userId !== 'system' && notif.userId !== 'multiple' && (
                                  <button
                                    type="button"
                                    className="font-extrabold text-white mr-1.5 hover:underline cursor-pointer focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-2 rounded-sm"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (notif.userId || notif.username) {
                                        window.dispatchEvent(new CustomEvent('nexora-view-profile', { detail: { userIdOrUsername: notif.userId !== 'multiple' ? notif.userId : notif.username } }));
                                      }
                                    }}
                                  >
                                    @{notif.username}
                                  </button>
                                )}
                                <span>{notif.content}</span>
                              </div>

                              {/* Preview text slot if applicable */}
                              {notif.previewText && (
                                <p className="text-[10.5px] font-sans text-violet-400/50 mt-1 pl-2 border-l border-white/10 italic">
                                  "{notif.previewText}"
                                </p>
                              )}

                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-[9px] font-mono text-violet-400/30 uppercase">
                                  <RelativeTime timestamp={notif.timestamp} />
                                </span>
                                {!notif.isRead && (
                                  <button
                                    onClick={(e) => handleToggleRead(notif.id, e)}
                                    className="text-[8px] font-mono font-bold text-violet-400 hover:text-white transition-colors bg-violet-500/5 border border-white/10 px-1.5 py-0.5 rounded"
                                  >
                                    Mark Read
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Media thumbnail preview on right side if exists */}
                            {notif.mediaThumbnail && (
                              <img 
                                src={notif.mediaThumbnail} 
                                alt="Post thumbnail preview" 
                                className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0 hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>

                          {/* --------------------------------------------------- */}
                          {/* ACTION PANEL BAR (INSTANT INTERACTIVITY) */}
                          {/* --------------------------------------------------- */}
                          <div className="flex flex-wrap items-center justify-between gap-3.5 pt-3.5 border-t border-white/10 mt-1">
                            
                            {/* Primary Category Buttons */}
                            <div className="flex items-center gap-2">
                              {/* Smart Group expansion trigger */}
                              {notif.subActivities && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsGroupExpanded(!isGroupExpanded);
                                  }}
                                  className="px-3 py-1.5 bg-[#0e0c24] border border-white/10 text-violet-200 hover:text-white rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <span>{isGroupExpanded ? 'Collapse Cluster' : `Expand Cluster (${notif.subActivities.length})`}</span>
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isGroupExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              )}

                            </div>

                            <div className="flex items-center gap-1.5 opacity-60 group-hover/item:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => void handleDismissSingle(notif.id, e)}
                                className="p-1.5 rounded-lg border border-white/5 bg-black/30 text-zinc-500 hover:text-red-400 hover:border-red-500/15 transition-all"
                                title="Delete notification"
                                aria-label="Delete notification"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Group Cluster expanded accordions */}
                          <AnimatePresence>
                            {isGroupExpanded && notif.subActivities && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden bg-[#03010b] border border-white/10 rounded-2xl p-3 space-y-2 text-left"
                              >
                                <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block font-bold">Spark Cluster Members</span>
                                <div className="divide-y divide-white/5">
                                  {notif.subActivities.map(user => (
                                    <div key={user.userId} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                                      <div className="flex items-center gap-2">
                                        <img src={user.avatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
                                        <div className="text-left leading-none">
                                          <span className="text-xs text-white font-bold block">@{user.username}</span>
                                          <span className="text-[8.5px] font-mono text-zinc-500 block mt-0.5">{user.timestamp}</span>
                                        </div>
                                      </div>

                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* INFINITE SCROLL LOADER OR ARCHIVED INDICES */}
      {/* ----------------------------------------------------------------------- */}
      {activeGroupedNotifications.length > visibleCount && (
        <div className="pt-4 pb-8">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2.5 rounded-2xl bg-black/40 border border-white/10 hover:border-white/10 text-violet-300 hover:text-white text-xs font-mono font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Show More Notifications</span>
            </>
          </button>
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-[#09071c]/55 p-5 text-left" aria-labelledby="watch-history-title">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-violet-300" />
          <h2 id="watch-history-title" className="text-xs font-bold uppercase tracking-wider text-violet-100">Watch history</h2>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Account-scoped watch history and resume playback are not connected to this inbox yet. No local or cross-account playback records are displayed here.
        </p>
      </section>

    </div>
  );
}
