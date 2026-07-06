import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Heart, 
  MessageSquare, 
  UserPlus, 
  ShieldAlert, 
  Sparkles, 
  CheckCheck, 
  AtSign, 
  Zap, 
  Users, 
  Building,
  Target, 
  Award, 
  Globe, 
  Brain, 
  Settings, 
  X, 
  Search, 
  Bookmark, 
  Send, 
  BookmarkCheck,
  Eye, 
  ArrowRight,
  Sparkle,
  History,
  Tv,
  Trash2,
  Play,
  Volume2,
  VolumeX,
  Shield,
  UserCheck,
  AlertTriangle,
  RefreshCw,
  Layers,
  Check,
  CheckSquare,
  Square,
  Trash,
  Archive,
  Star,
  Calendar,
  Radio,
  Info,
  ChevronDown,
  ChevronUp,
  Sliders,
  MoreVertical,
  SlidersHorizontal,
  Flame,
  Activity,
  Maximize2,
  ThumbsUp,
  Volume,
  Clock,
  Pin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification, User } from '../types';
import StoriesView from './StoriesView';
import RelativeTime from './RelativeTime';

interface NotificationsViewProps {
  notifications: Notification[];
  currentUser: User;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onViewProfile?: (userId: string) => void;
}

// Extended Local Notification type to support grouping, interactive mock states, and rich visuals
interface RichNotification extends Notification {
  timeSection: 'today' | 'yesterday' | 'this_week' | 'earlier' | 'older';
  priorityLevel: 'high' | 'medium' | 'low';
  mediaThumbnail?: string;
  previewText?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  friendRequestStatus?: 'pending' | 'accepted' | 'declined';
  eventStatus?: 'unregistered' | 'registered';
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

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);

  // Multi-select management state
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Interactive inline replies state
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  // Floating notifications/toast feedback system
  const [toasts, setToasts] = useState<{ id: string; content: string }[]>([]);

  // Confetti / Celebration active state
  const [confettiParticles, setConfettiParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; rotation: number; speedY: number; speedX: number }[]>([]);
  const confettiIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulated Live Streaming overlay
  const [activeLiveStream, setActiveLiveStream] = useState<{ username: string; avatar: string; viewers: string; title: string } | null>(null);
  const [liveHearts, setLiveHearts] = useState<{ id: number; left: number }[]>([]);
  const [liveChat, setLiveChat] = useState<{ username: string; text: string }[]>([
    { username: "cyber_junkie", text: "Wow, this glassmorphic shader is super slick!" },
    { username: "voh_node_9", text: "Does this support high FPS rendering?" },
    { username: "lucid_dreamer", text: "NEXORA is leveling up!" }
  ]);
  const [liveInput, setLiveInput] = useState('');

  // Watch History (reused from existing template specs)
  const [watchHistory, setWatchHistory] = useState<any[]>([]);

  // Pinned Notification overlay/highlight
  const [pinnedNotifId, setPinnedNotifId] = useState<string | null>(null);
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
    channels: {
      push: true,
      email: false,
      inApp: true,
    },
    sound: true,
    vibration: true,
    pushDelay: 'batch_5m' // 'immediate' | 'batch_5m' | 'batch_1h'
  });

  // Comprehensive mockup dataset that incorporates EVERY required category, priority, time-section, and layout
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
    addToast("🎉 Milestone unlocked! Glittering Spark rewards transferred to your balance!");
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
    const seedMockNotifications = () => {
      const mockNotifs: RichNotification[] = [];

      // Convert propNotifications to RichNotifications if any are supplied by the app
      const resolvedProps = (propNotifications || []).map((n, i) => ({
        ...n,
        timeSection: (i < 2 ? 'today' : i < 5 ? 'yesterday' : 'this_week') as any,
        priorityLevel: (n.type === 'mention' || n.type === 'system' ? 'high' : 'medium') as any,
        isRead: n.isRead
      }));

      // Merge avoiding duplicates
      const finalSet = [...mockNotifs];
      resolvedProps.forEach(pn => {
        if (!finalSet.some(m => m.id === pn.id || m.content === pn.content)) {
          finalSet.push(pn as any);
        }
      });

      setNotificationsList(finalSet);
    };

    seedMockNotifications();

    // Load watch history
    const savedHistory = localStorage.getItem('nexora_watch_history');
    if (savedHistory) {
      try {
        setWatchHistory(JSON.parse(savedHistory));
      } catch (err) {
        console.error("Failed to parse watch history", err);
      }
    }
  }, [propNotifications]);

  // ---------------------------------------------------------------------------
  // INTERACTIVE ACTION HANDLERS
  // ---------------------------------------------------------------------------
  const handleMarkAllAsReadLocal = () => {
    setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
    onMarkAllAsRead();
    addToast("✨ Marked all notifications as read!");
  };

  const handleClearAllLocal = () => {
    setNotificationsList([]);
    onClearNotifications();
    addToast("🗑️ Notifications list completely flushed!");
  };

  const handleToggleRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setNotificationsList(prev => prev.map(n => {
      if (n.id === id) {
        const nextState = !n.isRead;
        if (nextState) {
          addToast("Marked notification as read");
        }
        return { ...n, isRead: nextState };
      }
      return n;
    }));
  };

  const handleMarkSelectedRead = () => {
    if (selectedIds.length === 0) return;
    setNotificationsList(prev => prev.map(n => selectedIds.includes(n.id) ? { ...n, isRead: true } : n));
    addToast(`✨ Marked ${selectedIds.length} selected as read!`);
    setSelectedIds([]);
    setIsMultiSelectMode(false);
  };

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setNotificationsList(prev => prev.filter(n => !selectedIds.includes(n.id)));
    addToast(`🗑️ Removed ${selectedIds.length} selected notifications!`);
    setSelectedIds([]);
    setIsMultiSelectMode(false);
  };

  const handleArchiveSelected = () => {
    if (selectedIds.length === 0) return;
    setNotificationsList(prev => prev.map(n => selectedIds.includes(n.id) ? { ...n, isArchived: true } : n));
    addToast(`📦 Archived ${selectedIds.length} notifications!`);
    setSelectedIds([]);
    setIsMultiSelectMode(false);
  };

  const handleSelectAll = () => {
    const visibleIds = getFilteredAndSortedNotifications().map(n => n.id);
    if (selectedIds.length === visibleIds.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleIds);
    }
  };

  const handleDismissSingle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationsList(prev => prev.filter(n => n.id !== id));
    addToast("Notification dismissed");
  };

  // Friend Request actions
  const handleFriendRequest = (id: string, status: 'accepted' | 'declined', e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationsList(prev => prev.map(n => {
      if (n.id === id) {
        return { 
          ...n, 
          friendRequestStatus: status,
          content: status === 'accepted' 
            ? "is now a mutual Connection! Start chatting anytime in Direct Messages." 
            : "Connection request declined.",
          isRead: true
        };
      }
      return n;
    }));
    if (status === 'accepted') {
      addToast("🤝 Connection accepted! Mutual developer link established.");
    } else {
      addToast("Connection request declined.");
    }
  };

  // Event Register action
  const handleEventRegister = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotificationsList(prev => prev.map(n => {
      if (n.id === id) {
        return { 
          ...n, 
          eventStatus: 'registered',
          content: "You're registered for Global Design-Con! Added to your schedule list. Check email for virtual coordinates.",
          isRead: true
        };
      }
      return n;
    }));
    addToast("🎟️ Registered successfully! Calendar ticket dispatched.");
  };

  // Deep linking simulator
  const handleDeepLinkClick = (notif: RichNotification) => {
    if (isMultiSelectMode) {
      // Toggle selection in multi-select mode instead of deep linking
      setSelectedIds(prev => prev.includes(notif.id) ? prev.filter(id => id !== notif.id) : [...prev, notif.id]);
      return;
    }

    addToast(`🔗 Deep linking: Simulating navigation to ${notif.username || 'System'}'s activity focus...`);

    // Mark as read automatically on tap
    if (!notif.isRead) {
      setNotificationsList(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    }

    // Interactive custom routing checks
    if (notif.type === 'comment' || notif.type === 'spark' || notif.type === 'like') {
      // Redirect to Feed, look for element
      window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'feed' } }));
      setTimeout(() => {
        const targetPostId = notif.targetId || 'post-glass-ui';
        const element = document.getElementById(`post-${targetPostId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-violet-500', 'ring-offset-4', 'scale-[1.01]', 'transition-all');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-violet-500', 'ring-offset-4', 'scale-[1.01]');
          }, 4000);
          addToast("🎯 Highlighted post and filtered replies successfully!");
        } else {
          // If the post is not in the active list, provide a rich modal simulation or info
          addToast(`💡 Highlighted Comment from @${notif.username}: "${notif.previewText || notif.content}"`);
        }
      }, 500);
    } else if (notif.type === 'follow') {
      if (onViewProfile && notif.userId !== 'multiple') {
        onViewProfile(notif.userId);
      } else {
        addToast(`Viewing connection profile of @${notif.username}`);
      }
    } else if (notif.type === 'pulse_alert') {
      if (notif.id === 'notif-live-1') {
        // Trigger live stream
        setActiveLiveStream({
          username: notif.username,
          avatar: notif.avatar,
          viewers: "1.2K",
          title: "Framer Motion Drag Gestures Masterclass 🔮"
        });
      } else {
        window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'pulse' } }));
      }
    } else if (notif.type === 'reputation_milestone' && notif.reputationAwarded) {
      triggerConfetti();
    }
  };

  // Inline Reply submission
  const handleInlineReplySubmit = (id: string, username: string) => {
    if (!replyText.trim()) return;
    addToast(`💬 Replied to @${username}: "${replyText}"`);
    setActiveReplyId(null);
    setReplyText('');

    // Update notification content to show reply has been sent
    setNotificationsList(prev => prev.map(n => {
      if (n.id === id) {
        return {
          ...n,
          isRead: true,
          content: `${n.content} (You replied: "${replyText}")`
        };
      }
      return n;
    }));
  };

  // Swipe Simulation Buttons action helper
  const handleSwipeActionMock = (id: string, action: 'delete' | 'archive' | 'mute' | 'read' | 'pin', e: React.MouseEvent) => {
    e.stopPropagation();
    if (action === 'delete') {
      setNotificationsList(prev => prev.filter(n => n.id !== id));
      addToast("Notification permanently deleted");
    } else if (action === 'archive') {
      setNotificationsList(prev => prev.map(n => n.id === id ? { ...n, isArchived: true } : n));
      addToast("Notification sent to archive vault");
    } else if (action === 'read') {
      setNotificationsList(prev => prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n));
      addToast("Read status toggled");
    } else if (action === 'pin') {
      setPinnedNotifId(prev => prev === id ? null : id);
      addToast(pinnedNotifId === id ? "Notification unpinned" : "Notification pinned to top spotlight banner!");
    } else if (action === 'mute') {
      addToast(`Muted future activity updates from this specific category thread`);
    }
  };

  // Refresh trigger (Pull-To-Refresh simulator)
  const handlePullToRefresh = () => {
    setIsRefreshing(true);
    addToast("♻️ Syncing notification center...");
    setTimeout(() => {
      setIsRefreshing(false);
      addToast("🟢 Notifications updated! All caught up.");
    }, 1500);
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setLoadingMore(false);
      setVisibleCount(prev => prev + 5);
      addToast("📥 Loaded older archived notification indices.");
    }, 1200);
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
      if (activeCategory === 'system') return n.type === 'system';
      if (activeCategory === 'communities') return n.type === 'community';
      if (activeCategory === 'live') return n.type === 'pulse_alert' && n.content.includes('LIVE');
      if (activeCategory === 'verification') return n.type === 'reputation_milestone' && n.content.includes('Verification');
      if (activeCategory === 'creator') return n.type === 'reputation_milestone' && n.content.includes('Milestone');
      if (activeCategory === 'requests') return n.type === 'follow' && n.friendRequestStatus === 'pending';

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
      // Pinned items take ultimate precedence
      const aPinned = a.id === pinnedNotifId ? 1 : 0;
      const bPinned = b.id === pinnedNotifId ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

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
    <div id="nexora-notification-suite" className="space-y-6 relative select-none">
      
      {/* Toast Feedback Layer */}
      <div className="fixed bottom-10 right-10 z-50 flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9 }}
              className="bg-[#0b0821]/95 border border-violet-500/30 text-violet-100 font-sans text-xs px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3"
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-violet-500/10 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-linear-to-tr from-violet-600 to-pink-500 text-white relative">
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
            className={`px-3 py-1.5 rounded-xl border text-[11px] font-sans font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer ${
              isMultiSelectMode
                ? 'bg-amber-500/25 border-amber-400/40 text-amber-300'
                : 'bg-black/30 border-violet-500/10 text-violet-300 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isMultiSelectMode ? 'Cancel Selection' : 'Manage / Select'}</span>
          </button>

          {totalUnread > 0 && (
            <button
              onClick={handleMarkAllAsReadLocal}
              className="px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-[11px] font-sans font-extrabold text-violet-300 border border-violet-500/15 transition-all uppercase flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>Mark All Read</span>
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isSettingsOpen 
                ? 'bg-violet-500/20 border-violet-500/50 text-white' 
                : 'bg-black/30 border-violet-500/10 text-violet-300 hover:text-white'
            }`}
            title="Notification Configuration"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={handlePullToRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-black/30 border border-violet-500/10 text-violet-300 hover:text-white transition-all cursor-pointer"
            title="Refresh Notification Sync"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* RENDER THE STORIES / MOMENTS FEATURE AT THE VERY TOP */}
      <StoriesView currentUser={currentUser} />

      {/* ----------------------------------------------------------------------- */}
      {/* MULTI-SELECT ACTIVE MANAGEMENT DRAWER */}
      {/* ----------------------------------------------------------------------- */}
      <AnimatePresence>
        {isMultiSelectMode && (
          <motion.div
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="bg-[#120e2e]/90 border border-amber-500/25 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden shadow-xl"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 border border-violet-500/15 text-violet-300 hover:text-white transition-all text-xs font-mono font-bold uppercase flex items-center gap-1.5"
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
                onClick={handleArchiveSelected}
                disabled={selectedIds.length === 0}
                className="px-3 py-1.5 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/25 disabled:opacity-40 text-indigo-300 rounded-xl text-xs font-sans font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive</span>
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
            <div className="p-5 rounded-3xl bg-[#09071c] border border-violet-500/20 space-y-5 shadow-2xl text-left">
              <div className="flex items-center justify-between border-b border-violet-500/5 pb-3">
                <span className="text-xs font-mono font-black text-violet-300 uppercase flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-violet-400" />
                  Premium Activity Preferences Manager
                </span>
                <button onClick={() => setIsSettingsOpen(false)} className="text-violet-400 hover:text-white transition-colors">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Grid of Toggle preferences */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {/* 1. Category notifications */}
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
                      { key: 'friendRequests', label: 'Friend/Connection Requests' },
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

                {/* 2. Channel settings */}
                <div className="p-3.5 rounded-2xl bg-black/45 border border-white/5 space-y-3">
                  <span className="text-[10px] font-mono text-violet-400/60 uppercase tracking-widest font-bold block">Delivery Channels</span>
                  <div className="space-y-2 text-xs font-sans">
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-zinc-300">Push Notifications</span>
                      <input
                        type="checkbox"
                        checked={settingsToggles.channels.push}
                        onChange={() => setSettingsToggles(prev => ({
                          ...prev,
                          channels: { ...prev.channels, push: !prev.channels.push }
                        }))}
                        className="w-4 h-4 text-violet-600 rounded-sm"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-zinc-300">Email Updates</span>
                      <input
                        type="checkbox"
                        checked={settingsToggles.channels.email}
                        onChange={() => setSettingsToggles(prev => ({
                          ...prev,
                          channels: { ...prev.channels, email: !prev.channels.email }
                        }))}
                        className="w-4 h-4 text-violet-600 rounded-sm"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer group">
                      <span className="text-zinc-300">In-App Ledger</span>
                      <input
                        type="checkbox"
                        checked={settingsToggles.channels.inApp}
                        onChange={() => setSettingsToggles(prev => ({
                          ...prev,
                          channels: { ...prev.channels, inApp: !prev.channels.inApp }
                        }))}
                        className="w-4 h-4 text-violet-600 rounded-sm"
                      />
                    </label>
                  </div>

                  {/* Vibration / Haptic */}
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <label className="flex items-center justify-between cursor-pointer text-xs font-sans">
                      <span className="text-zinc-300">Sound Effects</span>
                      <input
                        type="checkbox"
                        checked={settingsToggles.sound}
                        onChange={() => setSettingsToggles(prev => ({ ...prev, sound: !prev.sound }))}
                        className="w-4 h-4 text-violet-600 rounded-sm"
                      />
                    </label>
                    <label className="flex items-center justify-between cursor-pointer text-xs font-sans">
                      <span className="text-zinc-300">Vibration Feedback</span>
                      <input
                        type="checkbox"
                        checked={settingsToggles.vibration}
                        onChange={() => setSettingsToggles(prev => ({ ...prev, vibration: !prev.vibration }))}
                        className="w-4 h-4 text-violet-600 rounded-sm"
                      />
                    </label>
                  </div>
                </div>

                {/* 3. Push intelligence delay (Anti-Spam) */}
                <div className="p-3.5 rounded-2xl bg-black/45 border border-white/5 space-y-4">
                  <div>
                    <span className="text-[10px] font-mono text-violet-400/60 uppercase tracking-widest font-bold block">Push Intelligence Engine</span>
                    <p className="text-[10px] text-zinc-500 leading-relaxed mt-1">
                      Instead of spamming 15 separate notifications, we intelligently queue and batch similar actions before sending.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono text-zinc-400 block">Delay & Grouping Strategy</span>
                    <div className="grid grid-cols-3 gap-1 bg-black/60 p-1 rounded-xl">
                      {[
                        { id: 'immediate', label: 'None' },
                        { id: 'batch_5m', label: '5 Mins' },
                        { id: 'batch_1h', label: 'Hourly' }
                      ].map(strat => (
                        <button
                          key={strat.id}
                          onClick={() => setSettingsToggles(prev => ({ ...prev, pushDelay: strat.id }))}
                          className={`py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider ${
                            settingsToggles.pushDelay === strat.id
                              ? 'bg-violet-600 text-white font-extrabold'
                              : 'text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {strat.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            className="w-full pl-11 pr-11 py-3.5 rounded-2xl bg-black/40 border border-violet-500/10 focus:outline-none focus:border-violet-500/40 focus:bg-[#060411]/90 transition-all font-sans text-xs text-white placeholder:text-violet-400/30"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filter Categories Horizontal Slider */}
        <div className="flex items-center gap-1.5 border-b border-violet-500/5 pb-2.5 max-w-full overflow-x-auto no-scrollbar scroll-smooth">
          {[
            { id: 'all', label: 'All Activity' },
            { id: 'mentions', label: 'Mentions' },
            { id: 'comments', label: 'Comments' },
            { id: 'likes', label: 'Sparks & Likes' },
            { id: 'followers', label: 'Followers' },
            { id: 'requests', label: 'Requests' },
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
                    ? 'bg-violet-600/10 text-white border border-violet-500/30' 
                    : 'bg-transparent border border-transparent text-violet-400/50 hover:text-white'
                }`}
              >
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeChipUnderlay"
                    className="absolute inset-0 bg-violet-600/5 rounded-xl border border-violet-500/20 -z-10"
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
          className="p-16 text-center rounded-3xl border border-dashed border-violet-500/10 bg-[#070513]/40 space-y-5 max-w-lg mx-auto"
        >
          <div className="w-16 h-16 rounded-full bg-violet-600/5 border border-violet-500/15 flex items-center justify-center mx-auto text-violet-400/40">
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
                <h3 className="text-[10px] font-mono font-black text-violet-400 uppercase tracking-widest border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-violet-500" />
                  <span>{sectionHeaders[timeSection]}</span>
                  <span className="text-[8.5px] px-1 py-0.2 rounded bg-violet-950/40 font-normal">({list.length})</span>
                </h3>

                <div className="space-y-3">
                  <AnimatePresence initial={false}>
                    {list.map(notif => {
                      const isSelected = selectedIds.includes(notif.id);
                      const isPinned = notif.id === pinnedNotifId;

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
                          className={`p-4 rounded-3xl border text-left flex flex-col gap-3.5 transition-all relative overflow-hidden group/item ${
                            isPinned 
                              ? 'bg-linear-to-r from-[#170a2c] via-[#100720] to-[#04010b] border-amber-500/30'
                              : isSelected
                                ? 'bg-[#15112f] border-amber-500/20'
                                : notif.isRead
                                  ? 'bg-black/35 border-violet-500/5 opacity-70 hover:opacity-100 hover:border-violet-500/15'
                                  : 'bg-[#09071f]/85 border-violet-500/15 shadow-[0_0_15px_rgba(139,92,246,0.03)] hover:border-violet-500/25'
                          }`}
                          onClick={() => handleDeepLinkClick(notif)}
                        >
                          {/* Top Tag detail and Drag Swipe quick visual hints */}
                          <div className="absolute top-2.5 right-4 flex items-center gap-2">
                            {isPinned && <Pin className="w-3 h-3 text-amber-400" />}
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
                            <div className="p-2.5 rounded-2xl bg-[#03010b] border border-violet-500/15 shrink-0 self-start">
                              {resolveIcon(notif.type, notif.priorityLevel)}
                            </div>

                            {/* Profile Image with verification and Live Pulse Ring */}
                            {notif.userId !== 'system' && (
                              <div className="relative shrink-0">
                                <img 
                                  src={notif.avatar} 
                                  alt="" 
                                  className={`w-11 h-11 rounded-2xl object-cover border border-violet-500/15 ${
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
                              </div>
                            )}

                            {/* Description Copy */}
                            <div className="flex-1 overflow-hidden pr-2">
                              <div className="text-xs text-violet-100 font-sans leading-relaxed">
                                {notif.userId !== 'system' && notif.userId !== 'multiple' && (
                                  <span className="font-extrabold text-white mr-1.5 hover:underline cursor-pointer">
                                    @{notif.username}
                                  </span>
                                )}
                                <span>{notif.content}</span>
                              </div>

                              {/* Preview text slot if applicable */}
                              {notif.previewText && (
                                <p className="text-[10.5px] font-sans text-violet-400/50 mt-1 pl-2 border-l border-violet-500/10 italic">
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
                                    className="text-[8px] font-mono font-bold text-violet-400 hover:text-white transition-colors bg-violet-500/5 border border-violet-500/10 px-1.5 py-0.5 rounded"
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
                                className="w-12 h-12 rounded-xl object-cover border border-violet-500/10 shrink-0 hover:scale-105 transition-transform"
                                referrerPolicy="no-referrer"
                              />
                            )}
                          </div>

                          {/* --------------------------------------------------- */}
                          {/* ACTION PANEL BAR (INSTANT INTERACTIVITY) */}
                          {/* --------------------------------------------------- */}
                          <div className="flex flex-wrap items-center justify-between gap-3.5 pt-3.5 border-t border-violet-500/5 mt-1">
                            
                            {/* Primary Category Buttons */}
                            <div className="flex items-center gap-2">
                              {/* Friend Connection Request Pending state */}
                              {notif.type === 'follow' && notif.friendRequestStatus === 'pending' && (
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={(e) => handleFriendRequest(notif.id, 'accepted', e)}
                                    className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-sans font-bold uppercase transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-violet-600/10"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Accept Link</span>
                                  </button>
                                  <button
                                    onClick={(e) => handleFriendRequest(notif.id, 'declined', e)}
                                    className="px-2.5 py-1.5 bg-black/40 hover:bg-black/60 border border-violet-500/15 text-zinc-400 hover:text-white rounded-xl text-[10px] font-sans font-bold uppercase transition-all cursor-pointer"
                                  >
                                    <span>Decline</span>
                                  </button>
                                </div>
                              )}

                              {/* Follow Back state (accepted connection) */}
                              {notif.type === 'follow' && notif.friendRequestStatus === 'accepted' && (
                                <span className="text-[10px] font-sans font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5" />
                                  <span>MUTUAL DEVELOPER SYNCED</span>
                                </span>
                              )}

                              {/* Live Stream Play action */}
                              {notif.type === 'pulse_alert' && notif.content.includes('LIVE') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveLiveStream({
                                      username: notif.username,
                                      avatar: notif.avatar,
                                      viewers: "1.2K",
                                      title: "Framer Motion Masterclass master level!"
                                    });
                                  }}
                                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-[10px] font-sans font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 animate-pulse"
                                >
                                  <Play className="w-3 h-3 fill-current text-white" />
                                  <span>Join Stream</span>
                                </button>
                              )}

                              {/* Event registration action */}
                              {notif.type === 'community' && notif.eventStatus === 'unregistered' && (
                                <button
                                  onClick={(e) => handleEventRegister(notif.id, e)}
                                  className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-[10px] font-sans font-extrabold uppercase transition-all cursor-pointer flex items-center gap-1 shadow-md shadow-cyan-600/10"
                                >
                                  <Calendar className="w-3 h-3 text-cyan-100" />
                                  <span>Register Ticket</span>
                                </button>
                              )}

                              {notif.type === 'community' && notif.eventStatus === 'registered' && (
                                <span className="text-[10px] font-sans font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>TICKET SECURED</span>
                                </span>
                              )}

                              {/* Inline comments response trigger */}
                              {(notif.type === 'comment' || notif.type === 'mention') && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveReplyId(activeReplyId === notif.id ? null : notif.id);
                                  }}
                                  className="px-3 py-1.5 bg-[#0e0c24] hover:bg-violet-600/10 border border-violet-500/10 hover:border-violet-500/20 text-violet-300 rounded-xl text-[10px] font-sans font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <MessageSquare className="w-3 h-3 text-violet-400" />
                                  <span>Reply Direct</span>
                                </button>
                              )}

                              {/* Smart Group expansion trigger */}
                              {notif.subActivities && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsGroupExpanded(!isGroupExpanded);
                                  }}
                                  className="px-3 py-1.5 bg-[#0e0c24] border border-violet-500/10 text-violet-200 hover:text-white rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <span>{isGroupExpanded ? 'Collapse Cluster' : `Expand Cluster (${notif.subActivities.length})`}</span>
                                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isGroupExpanded ? 'rotate-180' : ''}`} />
                                </button>
                              )}

                              {/* Security alerting direct verification */}
                              {notif.type === 'system' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    addToast("🛡️ Device ledger verified! Unknown Berlin agent flagged as safe.");
                                  }}
                                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-300 rounded-xl text-[10px] font-sans font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Shield className="w-3 h-3 text-rose-400" />
                                  <span>Approve Session</span>
                                </button>
                              )}

                              {/* Creator reward trigger */}
                              {notif.type === 'reputation_milestone' && notif.reputationAwarded && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    triggerConfetti();
                                  }}
                                  className="px-3.5 py-1.5 bg-linear-to-r from-yellow-500 to-amber-500 text-slate-950 font-black rounded-xl text-[10px] font-sans uppercase transition-all cursor-pointer flex items-center gap-1 hover:scale-103 shadow-md shadow-amber-500/15"
                                >
                                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                                  <span>Claim Reward pts</span>
                                </button>
                              )}
                            </div>

                            {/* Secondary Actions hover toolbar (Swipe Gestures Fallback for desktop mouse) */}
                            <div className="flex items-center gap-1.5 opacity-60 group-hover/item:opacity-100 transition-opacity">
                              <button
                                onClick={(e) => handleSwipeActionMock(notif.id, 'pin', e)}
                                className={`p-1.5 rounded-lg border transition-colors ${
                                  isPinned 
                                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' 
                                    : 'bg-black/30 border-white/5 text-zinc-500 hover:text-white hover:border-violet-500/10'
                                }`}
                                title={isPinned ? 'Unpin' : 'Pin to spotlight banner'}
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleSwipeActionMock(notif.id, 'archive', e)}
                                className="p-1.5 rounded-lg border border-white/5 bg-black/30 text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/15 transition-all"
                                title="Send to Archive"
                              >
                                <Archive className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => handleSwipeActionMock(notif.id, 'delete', e)}
                                className="p-1.5 rounded-lg border border-white/5 bg-black/30 text-zinc-500 hover:text-red-400 hover:border-red-500/15 transition-all"
                                title="Delete forever"
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
                                className="overflow-hidden bg-[#03010b] border border-violet-500/10 rounded-2xl p-3 space-y-2 text-left"
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
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          addToast(`Following back @${user.username}!`);
                                        }}
                                        className="px-2.5 py-1 bg-violet-600/15 border border-violet-500/20 hover:bg-violet-600 hover:text-white rounded-lg text-[9px] font-sans font-bold uppercase transition-all"
                                      >
                                        Follow Back
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Inline Reply slide form */}
                          <AnimatePresence>
                            {activeReplyId === notif.id && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden bg-[#030109] border border-violet-500/10 rounded-2xl p-2.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    placeholder={`Type reply to @${notif.username}...`}
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleInlineReplySubmit(notif.id, notif.username);
                                    }}
                                    className="flex-1 px-3 py-2 bg-black/50 border border-violet-500/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500/40 text-left"
                                  />
                                  <button
                                    onClick={() => handleInlineReplySubmit(notif.id, notif.username)}
                                    className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-all cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
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
            disabled={loadingMore}
            className="px-6 py-2.5 rounded-2xl bg-black/40 border border-violet-500/10 hover:border-violet-500/25 text-violet-300 hover:text-white text-xs font-mono font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            {loadingMore ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-400" />
                <span>Synchronizing older index layers...</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 animate-bounce" />
                <span>Load More Older Indices</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* WATCH HISTORY (Symmetrically layouted with existing custom player) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="p-5 rounded-3xl bg-[#09071c]/55 border border-violet-500/10 text-left space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-violet-500/5 pb-2.5">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-mono font-black text-violet-200 uppercase tracking-wider">
              Continue Watching Session Logs
            </span>
          </div>

          {watchHistory.length > 0 && (
            <button
              onClick={() => {
                localStorage.removeItem('nexora_watch_history');
                setWatchHistory([]);
                addToast("🗑️ Watch sessions permanently cleared!");
              }}
              className="text-[10px] font-mono font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors uppercase cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Flush Logs</span>
            </button>
          )}
        </div>

        {watchHistory.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {watchHistory.map((item: any) => {
              const progressPercentage = item.duration ? Math.min(100, Math.floor((item.progress / item.duration) * 100)) : 0;
              return (
                <div 
                  key={item.postId}
                  className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:border-violet-500/20 transition-all group relative overflow-hidden text-left"
                >
                  <div className="space-y-2.5">
                    {/* Simulated video wrapper */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-white/10">
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                        <button
                          onClick={() => addToast(`▶️ Opening resumed watch state at ${Math.floor(item.progress)}s`)}
                          className="w-9 h-9 rounded-xl bg-purple-600/90 text-white flex items-center justify-center hover:bg-purple-500 hover:scale-105 transition-all cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5 text-white" />
                        </button>
                      </div>

                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-zinc-300 bg-black/75 px-2 py-1 rounded-md">
                        <span>@{item.username}</span>
                        <span>{progressPercentage}% watched</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-zinc-100 font-sans line-clamp-2 leading-relaxed">
                        {item.content || "Awesome tech segment on Nexora!"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <div className="h-1 w-full bg-zinc-800 rounded-lg overflow-hidden">
                      <div 
                        className="h-full bg-linear-to-r from-purple-500 to-pink-500 rounded-lg" 
                        style={{ width: `${progressPercentage}%` }}
                      />
                    </div>
                    <button
                      onClick={() => addToast(`Resume state initiated: ${item.postId}`)}
                      className="w-full py-1.5 bg-violet-600/10 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/10 rounded-xl text-[10px] font-mono tracking-wider font-extrabold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Tv className="w-3 h-3" />
                      <span>Resume Playback ⏯️</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center text-violet-400/30 font-mono text-[10px] flex flex-col items-center justify-center gap-2">
            <Tv className="w-8 h-8 opacity-25" />
            <span>Play short videos on home feed to log active playback landmarks here!</span>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* FULL SCREEN INTERACTIVE SIMULATED LIVE STREAM OVERLAY */}
      {/* ----------------------------------------------------------------------- */}
      <AnimatePresence>
        {activeLiveStream && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <div className="bg-[#0b0821] w-full max-w-4xl rounded-3xl border border-violet-500/20 overflow-hidden shadow-2xl relative flex flex-col md:flex-row h-[85vh]">
              
              {/* Live Video canvas on left */}
              <div className="flex-1 bg-black relative flex items-center justify-center h-1/2 md:h-full">
                {/* Visual live simulator graphics */}
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-950/20 via-black to-pink-950/20" />
                
                {/* Stream visual placeholder */}
                <div className="text-center space-y-4 z-10 p-6">
                  <div className="w-20 h-20 rounded-full bg-red-600/10 border border-red-500/40 flex items-center justify-center mx-auto animate-pulse">
                    <Radio className="w-10 h-10 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white uppercase tracking-wider animate-pulse">
                      Simulated Live Stream
                    </h3>
                    <p className="text-xs text-zinc-400 mt-1">
                      Stream source: RTMP Encrypted Feed • 1080p 60fps
                    </p>
                  </div>
                </div>

                {/* Live stream stats overlays */}
                <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
                  <span className="px-2.5 py-1 bg-red-600 text-white font-mono text-[9px] font-black rounded-lg uppercase tracking-widest animate-pulse flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
                    <span>LIVE NOW</span>
                  </span>
                  <span className="px-2.5 py-1 bg-black/70 text-zinc-300 font-mono text-[9px] rounded-lg backdrop-blur-md flex items-center gap-1">
                    <Users className="w-3 h-3 text-violet-400" />
                    <span>{activeLiveStream.viewers} watching</span>
                  </span>
                </div>

                <div className="absolute top-4 right-4 z-20">
                  <button 
                    onClick={() => setActiveLiveStream(null)}
                    className="p-1.5 rounded-xl bg-black/50 hover:bg-black/80 border border-white/10 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Heart float animation canvas inside video stream */}
                <div className="absolute bottom-4 right-4 z-20 w-16 h-48 pointer-events-none relative">
                  <AnimatePresence>
                    {liveHearts.map(h => (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 1, y: 0, scale: 0.8, x: h.left }}
                        animate={{ opacity: 0, y: -150, scale: 1.4, x: h.left + Math.sin(h.id) * 20 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2.2 }}
                        className="absolute bottom-0 text-red-500 text-xl"
                      >
                        ❤️
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2">
                  <img src={activeLiveStream.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border border-violet-500/20" />
                  <div className="text-left">
                    <span className="text-xs text-white font-black block">@{activeLiveStream.username}</span>
                    <span className="text-[10px] text-zinc-400 block line-clamp-1">{activeLiveStream.title}</span>
                  </div>
                </div>
              </div>

              {/* Chat column on right */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-violet-500/10 flex flex-col justify-between bg-[#04020c] h-1/2 md:h-full text-left">
                
                {/* Chat header */}
                <div className="p-3.5 border-b border-violet-500/10 flex items-center justify-between">
                  <span className="text-xs font-mono font-black text-violet-300 uppercase tracking-widest">Live Chat Stream</span>
                  <button onClick={() => setActiveLiveStream(null)} className="p-1 text-zinc-500 hover:text-white transition-all">
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Chat scroll */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {liveChat.map((msg, i) => (
                    <div key={i} className="text-xs font-sans">
                      <span className="font-extrabold text-violet-400 mr-1.5">@{msg.username}:</span>
                      <span className="text-zinc-200">{msg.text}</span>
                    </div>
                  ))}
                </div>

                {/* Chat controls & Reactions launcher */}
                <div className="p-3 bg-black/40 border-t border-violet-500/10 space-y-3">
                  <div className="flex items-center gap-1 bg-[#09071c] p-1.5 rounded-xl border border-violet-500/10">
                    <input
                      type="text"
                      placeholder="Comment on live feed..."
                      value={liveInput}
                      onChange={(e) => setLiveInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && liveInput.trim()) {
                          setLiveChat(prev => [...prev, { username: currentUser.username, text: liveInput }]);
                          setLiveInput('');
                          // Auto trigger hearts on chat
                          setLiveHearts(prev => [...prev, { id: Date.now(), left: Math.random() * 20 }]);
                        }
                      }}
                      className="flex-1 px-2.5 py-1.5 bg-transparent text-xs text-white placeholder-zinc-600 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        if (liveInput.trim()) {
                          setLiveChat(prev => [...prev, { username: currentUser.username, text: liveInput }]);
                          setLiveInput('');
                          setLiveHearts(prev => [...prev, { id: Date.now(), left: Math.random() * 20 }]);
                        }
                      }}
                      className="p-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg text-white"
                    >
                      <Send className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono text-zinc-500 pt-1">
                    <span>Press ❤️ to send Sparks</span>
                    <button
                      onClick={() => {
                        setLiveHearts(prev => [...prev, { id: Date.now(), left: Math.random() * 20 }]);
                      }}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-full text-red-400 hover:scale-110 active:scale-95 transition-all"
                      title="Double Tap Spark"
                    >
                      ❤️ Love
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
