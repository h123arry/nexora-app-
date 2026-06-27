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
  Mail, 
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
  VolumeX
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Notification, User } from '../types';
import RelativeTimestamp from './RelativeTimestamp';
import StoriesView from './StoriesView';

interface NotificationsViewProps {
  notifications: Notification[];
  currentUser: User;
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onViewProfile?: (userId: string) => void;
}

export default function NotificationsView({
  notifications,
  currentUser,
  onMarkAllAsRead,
  onClearNotifications,
  onViewProfile
}: NotificationsViewProps) {
  
  // Local list initialized from props, allowing rapid interactive updates
  const [localNotifications, setLocalNotifications] = useState<Notification[]>(() => {
    const seen = new Set<string>();
    return notifications.filter(n => {
      if (!n || !n.id) return false;
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
  });

  const handleNotificationClick = (notif: Notification) => {
    if (notif.type === 'follow') {
      if (onViewProfile) {
        onViewProfile(notif.userId);
      }
    } else if (notif.type === 'message') {
      const chatId = notif.targetId || `chat-${notif.userId}`;
      window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'matrix', subTab: 'messages' } }));
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('selectChat', { detail: { chatId } }));
      }, 250);
    } else if (notif.type === 'comment' || notif.type === 'spark' || notif.type === 'like') {
      const postId = notif.targetId;
      if (postId) {
        window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'feed' } }));
        setTimeout(() => {
          const element = document.getElementById(`post-${postId}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('ring-4', 'ring-violet-500', 'ring-offset-4', 'scale-[1.01]', 'transition-all');
            setTimeout(() => {
              element.classList.remove('ring-4', 'ring-violet-500', 'ring-offset-4', 'scale-[1.01]');
            }, 3000);
          } else {
            window.dispatchEvent(new CustomEvent('toast', { detail: 'ℹ️ Scrolling to post context failed (Post not found or queued)' }));
          }
        }, 500);
      }
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'followers' | 'comments' | 'mentions' | 'sparks' | 'messages' | 'communities' | 'system'>('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showDailySummary, setShowDailySummary] = useState(true);

  // Watch History System
  const [watchHistory, setWatchHistory] = useState<any[]>([]);
  const [activeHistoryVideo, setActiveHistoryVideo] = useState<any | null>(null);

  useEffect(() => {
    const loadHistory = () => {
      const saved = localStorage.getItem('nexora_watch_history');
      if (saved) {
        setWatchHistory(JSON.parse(saved));
      } else {
        setWatchHistory([]);
      }
    };
    loadHistory();
    window.addEventListener('update-watch-history', loadHistory);
    return () => window.removeEventListener('update-watch-history', loadHistory);
  }, []);

  const handleClearWatchHistory = () => {
    localStorage.removeItem('nexora_watch_history');
    setWatchHistory([]);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Watch history successfully cleared!' }));
  };

  // Quick activity action response states
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [followedUserIds, setFollowedUserIds] = useState<string[]>([]);
  const [joinedCommunityIds, setJoinedCommunityIds] = useState<string[]>([]);
  const [savedNotifIds, setSavedNotifIds] = useState<string[]>([]);

  // Individual notification settings toggles
  const [settingsToggles, setSettingsToggles] = useState({
    messages: true,
    followers: true,
    communities: true,
    worldPulse: true,
    vohAi: true,
    mentions: true,
    comments: true,
    sparks: true,
    email: false,
    push: true
  });

  // Sync state with props
  useEffect(() => {
    const seen = new Set<string>();
    const unique = notifications.filter(n => {
      if (!n || !n.id) return false;
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    });
    setLocalNotifications(unique);
  }, [notifications]);

  // Display a quick feedback toast
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Mark an individual notification as read
  const handleToggleRead = (id: string) => {
    setLocalNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, isRead: !n.isRead } : n)
    );
    // Persist immediately to global storage
    const updated = localNotifications.map(n => n.id === id ? { ...n, isRead: true } : n);
    localStorage.setItem('nexora_notifications', JSON.stringify(updated));
  };

  // Dismiss a notification
  const handleDismissNotification = (id: string) => {
    const updated = localNotifications.filter(n => n.id !== id);
    setLocalNotifications(updated);
    localStorage.setItem('nexora_notifications', JSON.stringify(updated));
    triggerToast("Notification dismissed");
  };

  // Follow Back quick action
  const handleFollowBack = (userId: string, id: string) => {
    if (followedUserIds.includes(userId)) return;
    setFollowedUserIds(prev => [...prev, userId]);
    triggerToast("Following back! You are now mutually following this creator");
    
    // Mark as read too
    handleToggleRead(id);
  };

  // Join Community quick action
  const handleJoinCommunity = (communityId: string, id: string) => {
    if (joinedCommunityIds.includes(communityId)) return;
    setJoinedCommunityIds(prev => [...prev, communityId]);
    triggerToast("Community joined successfully!");
    
    // Increment local communities count just as an indicator
    const currentJoined = JSON.parse(localStorage.getItem('nexora_db_communities') || '[]');
    if (!currentJoined.some((c: any) => c.communityId === communityId)) {
      currentJoined.push({ id: `c-${Date.now()}`, communityId, joinedAt: new Date().toISOString() });
      localStorage.setItem('nexora_db_communities', JSON.stringify(currentJoined));
    }
    
    // Mark notification as read
    handleToggleRead(id);
  };

  // Save / Bookmark notification
  const handleSaveNotification = (id: string) => {
    if (savedNotifIds.includes(id)) {
      setSavedNotifIds(prev => prev.filter(x => x !== id));
      triggerToast("Removed from bookmarks");
    } else {
      setSavedNotifIds(prev => [...prev, id]);
      triggerToast("Bookmarked to your private repository!");
    }
  };

  // Submit quick inline reply
  const handleSubmitReply = (id: string, username: string) => {
    if (!replyText.trim()) return;
    triggerToast(`Sent reply to @${username}: "${replyText}"`);
    setActiveReplyId(null);
    setReplyText('');
    
    // Mark notification as read
    handleToggleRead(id);
  };

  // Priority sorting rules (specified strictly)
  const getPriority = (type: Notification['type']) => {
    switch (type) {
      case 'message': return 1;
      case 'mention': return 2;
      case 'community': return 3;
      case 'follow': return 4;
      case 'comment': return 5;
      case 'spark': case 'like': return 6;
      case 'pulse_alert': return 7;
      case 'ai_recommendation': return 8;
      default: return 9;
    }
  };

  // Resolve custom themed icon based on type
  const resolveIcon = (type: Notification['type']) => {
    switch (type) {
      case 'message':
        return <Mail className="w-4 h-4 text-sky-400" />;
      case 'mention':
        return <AtSign className="w-4 h-4 text-violet-400" />;
      case 'community':
        return <Users className="w-4 h-4 text-teal-400" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-emerald-400" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-pink-400" />;
      case 'spark':
      case 'like':
        return <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20" />;
      case 'pulse_alert':
        return <Globe className="w-4 h-4 text-cyan-400 animate-pulse" />;
      case 'ai_recommendation':
        return <Brain className="w-4 h-4 text-purple-400" />;
      case 'mission_milestone':
        return <Target className="w-4 h-4 text-rose-400" />;
      case 'reputation_milestone':
        return <Award className="w-4 h-4 text-yellow-400" />;
      default:
        return <Bell className="w-4 h-4 text-violet-400" />;
    }
  };

  // Filter and sort core algorithm
  const filteredNotifications = localNotifications
    .filter(notif => {
      // 1. Settings block filtering
      if (notif.type === 'message' && !settingsToggles.messages) return false;
      if (notif.type === 'follow' && !settingsToggles.followers) return false;
      if (notif.type === 'community' && !settingsToggles.communities) return false;
      if (notif.type === 'pulse_alert' && !settingsToggles.worldPulse) return false;
      if (notif.type === 'ai_recommendation' && !settingsToggles.vohAi) return false;
      if (notif.type === 'mention' && !settingsToggles.mentions) return false;
      if (notif.type === 'comment' && !settingsToggles.comments) return false;
      if ((notif.type === 'spark' || notif.type === 'like') && !settingsToggles.sparks) return false;

      // 2. Search query matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const contentMatch = notif.content.toLowerCase().includes(query);
        const usernameMatch = notif.username.toLowerCase().includes(query);
        if (!contentMatch && !usernameMatch) return false;
      }

      // 3. Category matching
      if (activeCategory === 'all') return true;
      if (activeCategory === 'messages') return notif.type === 'message';
      if (activeCategory === 'mentions') return notif.type === 'mention';
      if (activeCategory === 'followers') return notif.type === 'follow';
      if (activeCategory === 'comments') return notif.type === 'comment';
      if (activeCategory === 'sparks') return notif.type === 'spark' || notif.type === 'like';
      if (activeCategory === 'communities') return notif.type === 'community';
      if (activeCategory === 'system') {
        return notif.type === 'pulse_alert' || notif.type === 'ai_recommendation' || notif.type === 'reputation_milestone' || notif.type === 'system';
      }

      return true;
    })
    // Priority Sorting
    .sort((a, b) => getPriority(a.type) - getPriority(b.type));

  const totalUnread = localNotifications.filter(n => !n.isRead).length;

  return (
    <div id="notifications-activity-system" className="space-y-6">
      
      {/* Dynamic Toast Feedback Overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 left-1/4 right-1/4 md:left-auto md:right-10 bg-linear-to-r from-violet-950/90 to-purple-900/90 border border-violet-500/30 text-white font-sans text-xs px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md z-50 text-center"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP HEADER */}
      <div className="flex items-start justify-between border-b border-violet-500/10 pb-4">
        <div>
          <h2 className="text-xl font-black font-sans text-white flex items-center gap-2 tracking-tight">
            <span className="text-xl">🔔</span> Activity
          </h2>
          <p className="text-xs text-violet-300/60 mt-0.5">
            Stay updated with what matters.
          </p>
        </div>

        {/* Header Quick buttons */}
        <div className="flex items-center gap-2">
          {totalUnread > 0 && (
            <button
              onClick={() => {
                onMarkAllAsRead();
                setLocalNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                triggerToast("All marked as read");
              }}
              className="px-2.5 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-[10px] font-mono font-black text-violet-300 border border-violet-500/15 transition-all uppercase flex items-center gap-1 cursor-pointer"
              title="Mark All Read"
            >
              <CheckCheck className="w-3.5 h-3.5 text-violet-400" />
              <span>Read All</span>
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isSettingsOpen 
                ? 'bg-violet-500/20 border-violet-500/50 text-white' 
                : 'bg-black/30 border-violet-500/10 text-violet-300 hover:text-white'
            }`}
            title="Notification Settings"
          >
            <Settings className={`w-4 h-4 ${isSettingsOpen ? 'rotate-45' : ''} transition-transform duration-300`} />
          </button>
        </div>
      </div>

      {/* RENDER THE STORIES / MOMENTS FEATURE AT THE VERY TOP OF ACTIVITY INTERFACE */}
      <StoriesView currentUser={currentUser} />

      


      {/* SEARCH ACTIVITY BAR */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/50" />
        <input 
          type="text" 
          placeholder="Search notifications..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-5 py-3 rounded-2xl bg-black/40 border border-violet-500/10 focus:outline-none focus:border-violet-500/35 focus:bg-[#060411]/90 transition-all font-sans text-xs text-white placeholder:text-violet-400/30"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ACTIVITY FILTER TABS */}
      <div className="flex items-center gap-1 border-b border-violet-500/5 pb-1 max-w-full overflow-x-auto no-scrollbar scroll-smooth">
        {[
          { id: 'all', label: 'All', count: localNotifications.length },
          { id: 'followers', label: 'Followers', count: localNotifications.filter(n => n.type === 'follow').length },
          { id: 'comments', label: 'Comments', count: localNotifications.filter(n => n.type === 'comment').length },
          { id: 'mentions', label: 'Mentions', count: localNotifications.filter(n => n.type === 'mention').length },
          { id: 'sparks', label: 'Sparks', count: localNotifications.filter(n => n.type === 'spark' || n.type === 'like').length },
          { id: 'messages', label: 'Messages', count: localNotifications.filter(n => n.type === 'message').length },
          { id: 'communities', label: 'Communities', count: localNotifications.filter(n => n.type === 'community').length },
          { id: 'system', label: 'Updates', count: localNotifications.filter(n => n.type === 'pulse_alert' || n.type === 'ai_recommendation' || n.type === 'reputation_milestone' || n.type === 'system').length }
        ].map((tab) => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-sans font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isActive 
                  ? 'bg-violet-500/15 border border-violet-500/30 text-white' 
                  : 'bg-transparent border border-transparent text-violet-400/60 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md ${
                  isActive 
                    ? 'bg-violet-500/30 text-white' 
                    : 'bg-violet-950/40 text-violet-400/70'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* FILTER ACTIVE COUNT OR ACTIONS */}
      <div className="flex items-center justify-between text-[10px] font-mono text-violet-400/40 px-1">
        <span>
          Showing {filteredNotifications.length} of {localNotifications.length} total notifications
        </span>
        {filteredNotifications.length > 0 && (
          <button 
            onClick={onClearNotifications}
            className="text-rose-400 hover:text-rose-300 transition-colors uppercase font-bold"
          >
            Flush Visible
          </button>
        )}
      </div>

      {/* NOTIFICATIONS STREAM QUEUE */}
      <div className="space-y-3.5">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-violet-500/10 bg-[#070513]/40 space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-violet-500/5 flex items-center justify-center mx-auto text-violet-400/30 border border-violet-500/10">
              <Bell className="w-5 h-5 text-violet-400/40" />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-xs font-sans font-bold text-white uppercase tracking-wider">🔔 No Activity Yet</h4>
              <p className="text-[10.5px] font-sans text-violet-300/40 leading-relaxed max-w-sm mx-auto">
                When people follow you, comment on your posts, mention you, or invite you to communities, you'll see it here.
              </p>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filteredNotifications.map((notif) => {
              const isFollowed = followedUserIds.includes(notif.userId);
              const isJoined = joinedCommunityIds.includes(notif.targetId || '');
              const isSaved = savedNotifIds.includes(notif.id);
              
              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('button') || target.closest('input')) {
                      return;
                    }
                    handleNotificationClick(notif);
                  }}
                  className={`p-4 rounded-3xl border text-left flex flex-col gap-3 transition-all relative overflow-hidden hover:border-violet-500/35 cursor-pointer ${
                    notif.isRead 
                      ? 'bg-black/30 border-violet-500/5 opacity-75' 
                      : 'bg-[#09071e]/90 border-violet-500/15 shadow-xs shadow-violet-500/2'
                  }`}
                >
                  {/* Decorative faint category indicator on right side */}
                  <span className="absolute top-2 right-3 text-[8px] font-mono text-violet-500/20 uppercase tracking-wider font-extrabold select-none pointer-events-none">
                    {(() => {
                      const mapping: Record<string, string> = {
                        'follow': 'Follow Request',
                        'comment': 'Comment',
                        'spark': 'Spark',
                        'like': 'Spark',
                        'community': 'Community Invite',
                        'pulse_alert': 'Trending Nearby',
                        'ai_recommendation': 'VOH AI Suggestion',
                        'reputation_milestone': 'Reputation Milestone',
                        'message': 'Message Request'
                      };
                      return mapping[notif.type] || mapping[notif.category || ''] || 'Notification';
                    })()}
                  </span>

                  {/* Main Header arrangement */}
                  <div className="flex items-start gap-3">
                    
                    {/* Rounded status indicator icon */}
                    <div className="p-2 rounded-xl bg-[#03010b] border border-violet-500/10 shrink-0 self-start">
                      {resolveIcon(notif.type)}
                    </div>

                    {/* Sender profile avatar (only if they exist) */}
                    {notif.avatar && (
                      <div className="relative shrink-0">
                        <img 
                          src={notif.avatar} 
                          alt={notif.username} 
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-2xl object-cover border border-violet-500/10 shrink-0 ring-1 ring-violet-500/2" 
                        />
                        {/* UNREAD STATUS DOT (🟣) */}
                        {!notif.isRead && (
                          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-linear-to-tr from-violet-600 to-pink-500 border-2 border-[#09071e] shadow-md animate-pulse shrink-0" />
                        )}
                      </div>
                    )}

                    {/* Notification description content */}
                    <div className="flex-1 overflow-hidden font-sans pr-4 self-center">
                      <div className="text-xs text-violet-100 font-sans leading-relaxed">
                        {notif.username && notif.username !== 'system' && (
                          <span className="font-extrabold text-white mr-1.5 hover:underline cursor-pointer">
                            @{notif.username}
                          </span>
                        )}
                        <span>{notif.content}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[9px] font-mono text-violet-400/40">
                          <RelativeTimestamp timestamp={notif.timestamp} />
                        </span>
                        {!notif.isRead && (
                          <button 
                            onClick={() => handleToggleRead(notif.id)}
                            className="text-[8.5px] font-mono font-black text-violet-400 hover:text-violet-300 transition-colors bg-violet-500/5 border border-violet-500/10 px-1.5 py-0.5 rounded"
                          >
                            Mark Read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* QUICK ACTIONS ROW */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-violet-500/5 mt-0.5">
                    
                    {/* Primary Interactive buttons depending on notification type */}
                    <div className="flex items-center gap-2">
                      
                      {/* Follow back action */}
                      {notif.type === 'follow' && (
                        <button
                          onClick={() => handleFollowBack(notif.userId, notif.id)}
                          disabled={isFollowed}
                          className={`text-[9.5px] font-sans font-bold px-3 py-1.5 rounded-xl border transition-all uppercase tracking-wide cursor-pointer flex items-center gap-1 ${
                            isFollowed
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black'
                              : 'bg-violet-600 hover:bg-violet-500 border-violet-500/20 text-white shadow-md'
                          }`}
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>{isFollowed ? 'Following' : 'Follow Back'}</span>
                        </button>
                      )}

                      {/* Community Join invite action */}
                      {notif.type === 'community' && notif.targetId && (
                        <button
                          onClick={() => handleJoinCommunity(notif.targetId!, notif.id)}
                          disabled={isJoined}
                          className={`text-[9.5px] font-sans font-bold px-3 py-1.5 rounded-xl border transition-all uppercase tracking-wide cursor-pointer flex items-center gap-1 ${
                            isJoined
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-black'
                              : 'bg-teal-600 hover:bg-teal-500 border-teal-500/20 text-white shadow-md'
                          }`}
                        >
                          <Building className="w-3 h-3" />
                          <span>{isJoined ? 'Joined community' : 'Join'}</span>
                        </button>
                      )}

                      {/* Message/Mention inline quick reply interface */}
                      {(notif.type === 'message' || notif.type === 'mention' || notif.type === 'comment') && (
                        <button
                          onClick={() => setActiveReplyId(activeReplyId === notif.id ? null : notif.id)}
                          className="text-[9.5px] font-sans font-bold px-3 py-1.5 rounded-xl border border-violet-500/15 bg-black/40 hover:bg-violet-500/10 text-violet-300 transition-all uppercase tracking-wide cursor-pointer flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3 text-violet-400" />
                          <span>Reply</span>
                        </button>
                      )}

                      {/* Default View Post context */}
                      {(notif.type === 'comment' || notif.type === 'spark' || notif.type === 'like') && (
                        <button
                          onClick={() => triggerToast(`Navigating to view post context #post-${notif.targetId || 'primary'}`)}
                          className="text-[9.5px] font-sans font-bold px-2.5 py-1.5 rounded-xl border border-violet-500/5 bg-violet-500/5 hover:bg-violet-500/10 text-violet-300 transition-all uppercase tracking-wide cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3 text-violet-400" />
                          <span>View Post</span>
                        </button>
                      )}

                      {/* Pulse view direct access */}
                      {notif.type === 'pulse_alert' && (
                        <button
                          onClick={() => triggerToast("Opening Live Pulse map coordinate stream")}
                          className="text-[9.5px] font-sans font-bold px-2.5 py-1.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 text-cyan-300 transition-all uppercase tracking-wider cursor-pointer flex items-center gap-1"
                        >
                          <Globe className="w-3 h-3 text-cyan-400" />
                          <span>Launch Map</span>
                        </button>
                      )}

                      {/* Default AI recommendations exploration */}
                      {notif.type === 'ai_recommendation' && (
                        <button
                          onClick={() => triggerToast(`AI Suggested guild matching started: ${notif.content}`)}
                          className="text-[9.5px] font-mono font-bold px-2.5 py-1.5 rounded-xl border border-pink-500/20 bg-pink-500/5 hover:bg-pink-500/15 text-pink-300 transition-all uppercase tracking-wider cursor-pointer flex items-center gap-1"
                        >
                          <Sparkle className="w-3 h-3 text-pink-400 animate-spin" style={{ animationDuration: '3s' }} />
                          <span>Explore</span>
                        </button>
                      )}
                    </div>

                    {/* Secondary Actions (Save/Dismiss) */}
                    <div className="flex items-center gap-1.5">
                      
                      {/* Save/Bookmark action */}
                      <button
                        onClick={() => handleSaveNotification(notif.id)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          isSaved 
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' 
                            : 'bg-black/30 border-violet-500/5 text-violet-400/40 hover:text-violet-300 hover:border-violet-500/10'
                        }`}
                        title={isSaved ? 'Bookmarked' : 'Bookmark notification'}
                      >
                        {isSaved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      </button>

                      {/* Delete/Dismiss action */}
                      <button
                        onClick={() => handleDismissNotification(notif.id)}
                        className="p-1.5 rounded-lg border border-violet-500/5 bg-black/30 text-violet-400/30 hover:text-rose-400 hover:border-rose-500/15 transition-all cursor-pointer"
                        title="Dismiss notification"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Sliding Reply Form interface */}
                  <AnimatePresence>
                    {activeReplyId === notif.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden bg-[#04020b] border border-violet-500/10 rounded-2xl p-2.5 mt-1"
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="text" 
                            placeholder={`Reply to @${notif.username}...`}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSubmitReply(notif.id, notif.username);
                            }}
                            className="flex-1 px-3 py-2 bg-black/50 border border-violet-500/10 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500/40 text-left font-sans"
                          />
                          <button
                            onClick={() => handleSubmitReply(notif.id, notif.username)}
                            className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors cursor-pointer"
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
        )}
      </div>

      {/* WATCH HISTORY & CONTINUE WATCHING DESIGN PLATFORM */}
      <div className="p-5 rounded-3xl bg-[#09071c]/60 border border-violet-500/10 text-left space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-violet-500/5 pb-2">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-mono font-black text-violet-200 uppercase tracking-wider">
              📺 WATCH HISTORY & CONTINUE WATCHING
            </span>
          </div>

          {watchHistory.length > 0 && (
            <button
              onClick={handleClearWatchHistory}
              className="text-[10px] font-mono font-bold text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors uppercase"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
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
                  className="bg-black/40 border border-white/5 rounded-2xl p-3 flex flex-col justify-between hover:border-violet-500/20 transition-all group relative overflow-hidden"
                >
                  <div className="space-y-2.5">
                    {/* Simulated thumbnail */}
                    <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-white/10 group-hover:scale-[1.01] transition-transform">
                      <video 
                        src={item.videoUrl} 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover opacity-70"
                      />
                      <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                        <button
                          onClick={() => setActiveHistoryVideo(item)}
                          className="w-9 h-9 rounded-xl bg-purple-600/90 text-white flex items-center justify-center hover:bg-purple-500 hover:scale-105 active:scale-95 transition-all shadow-[0_0_12px_rgba(139,92,246,0.3)] cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-current ml-0.5" />
                        </button>
                      </div>

                      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[9px] font-mono text-zinc-300 bg-black/75 px-2 py-1 rounded-md backdrop-blur-md">
                        <span>@{item.username}</span>
                        <span>{progressPercentage}% watched</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <img src={item.avatar} alt="" className="w-4 h-4 rounded-full object-cover border border-white/10" />
                        <span className="text-[10px] font-mono text-violet-300 font-bold">{item.name}</span>
                      </div>
                      <p className="text-[11px] text-zinc-100 font-sans line-clamp-2 leading-relaxed">
                        {item.content || "Awesome video moment on Nexora!"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4 decoration-current">
                    {/* Visual Progress tracking bar */}
                    <div className="space-y-1">
                      <div className="h-1 w-full bg-zinc-800 rounded-lg overflow-hidden">
                        <div 
                          className="h-full bg-linear-to-r from-purple-500 to-pink-500 rounded-lg transition-all" 
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-mono text-zinc-500">
                        <span>Resumed position: {Math.floor(item.progress)}s</span>
                        <span>Length: {Math.floor(item.duration)}s</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveHistoryVideo(item)}
                      className="w-full py-1.5 bg-violet-600/10 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/10 rounded-xl text-[10px] font-mono tracking-wider font-extrabold uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Tv className="w-3 h-3" />
                      <span>Continue Watching ⏯️</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-6 text-center text-violet-400/30 font-mono text-[10px] flex flex-col items-center justify-center gap-2">
            <Tv className="w-8 h-8 opacity-25 animate-pulse" />
            <span>Watch standard videos on the Home Feed to populate your watch resume stream here!</span>
          </div>
        )}
      </div>

      {/* DAILY RECAP ENHANCEMENT */}
      {showDailySummary && (
        <div className="p-4 rounded-3xl bg-linear-to-r from-violet-950/40 via-purple-950/20 to-[#070514] border border-violet-500/15 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <button 
            onClick={() => {
              setShowDailySummary(false);
              triggerToast("Recap minimized");
            }}
            className="absolute top-3 right-3 text-violet-400/40 hover:text-white transition-colors"
            title="Minimize Recap"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2.5 mb-3 text-violet-400">
            <Brain className="w-5 h-5 text-violet-400 animate-pulse" />
            <span className="text-xs font-mono uppercase tracking-widest font-black text-violet-300">Today on NEXORA</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 font-sans">
            <div className="p-2.5 rounded-2xl bg-[#09071c]/50 border border-violet-500/5 group hover:border-violet-500/15 transition-all text-left">
              <span className="text-[10px] text-violet-300/50 block font-mono">Follow Alerts</span>
              <span className="text-sm font-bold text-white mt-0.5 block flex items-center gap-1">
                <span>{localNotifications.filter(n => n.type === 'follow').length}</span>
                <span className="text-emerald-400 text-[10px] font-normal">Active</span>
              </span>
            </div>
            
            <div className="p-2.5 rounded-2xl bg-[#09071c]/50 border border-violet-500/5 group hover:border-violet-500/15 transition-all text-left">
              <span className="text-[10px] text-violet-300/50 block font-mono">Spark Factor</span>
              <span className="text-sm font-bold text-white mt-0.5 block flex items-center gap-1">
                <span>{localNotifications.filter(n => n.type === 'spark' || n.type === 'like').length}</span>
                <span className="text-amber-400 text-[10px] font-normal">Sparks</span>
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#09071c]/50 border border-violet-500/5 group hover:border-violet-500/15 transition-all text-left">
              <span className="text-[10px] text-violet-300/50 block font-mono">Discussions</span>
              <span className="text-sm font-bold text-white mt-0.5 block flex items-center gap-1">
                <span>{localNotifications.filter(n => n.type === 'comment').length}</span>
                <span className="text-pink-400 text-[10px] font-normal">Comments</span>
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-[#09071c]/50 border border-violet-500/5 group hover:border-violet-500/15 transition-all text-left">
              <span className="text-[10px] text-violet-300/50 block font-mono">Invitations</span>
              <span className="text-sm font-bold text-white mt-0.5 block flex items-center gap-1">
                <span>{localNotifications.filter(n => n.type === 'community').length}</span>
                <span className="text-cyan-400 text-[10px] font-normal">Invites</span>
              </span>
            </div>

            <div className="p-2.5 rounded-2xl bg-linear-to-tr from-violet-500/10 to-pink-500/5 border border-violet-500/20 text-left col-span-2 sm:col-span-1">
              <span className="text-[10px] text-pink-300/50 block font-mono">Reputation</span>
              <span className="text-sm font-extrabold text-[#F59E0B] mt-0.5 block flex items-center gap-1">
                <span>{currentUser.reputationPoints || 0}</span>
                <span className="text-[#F59E0B] text-[9px] font-black tracking-tighter">PTS</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVITY SETTINGS DRAWER / COLLAPSE PANEL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 rounded-3xl bg-[#09071c] border border-violet-500/20 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-violet-500/5 pb-2">
                <span className="text-xs font-mono font-black text-violet-300 uppercase flex items-center gap-1.5">
                  <Settings className="w-4 h-4 text-violet-400" />
                  Activity Channel Managers
                </span>
                <button 
                  onClick={() => setIsSettingsOpen(false)}
                  className="text-violet-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {Object.entries({
                  messages: 'Unread Messages',
                  followers: 'Followers / Following',
                  communities: 'Community Invites',
                  worldPulse: 'World Pulse Alerts',
                  vohAi: 'VOH AI Suggestions',
                  mentions: '@Username Mentions',
                  comments: 'Post Comments',
                  sparks: 'Post Sparks',
                  email: 'Email Notifications',
                  push: 'Push System Alerts'
                }).map(([key, label]) => {
                  const val = settingsToggles[key as keyof typeof settingsToggles];
                  return (
                    <button
                      key={key}
                      onClick={() => setSettingsToggles(prev => ({
                        ...prev,
                        [key]: !val
                      }))}
                      className={`p-2.5 rounded-2xl border text-left flex items-center justify-between gap-1.5 transition-all text-[11px] font-sans ${
                        val 
                          ? 'bg-violet-950/40 border-violet-500/30 text-white' 
                          : 'bg-black/40 border-violet-500/5 text-violet-400/40'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                        val 
                          ? 'bg-violet-500 border-violet-300 text-white font-extrabold' 
                          : 'bg-transparent border-violet-500/20'
                      }`}>
                        {val && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between items-center pt-2 text-[10px] text-violet-300/40 font-mono">
                <span>Toggle configurations map in real-time to active notification feed filters.</span>
                <button 
                  onClick={() => {
                    setSettingsToggles({
                      messages: true,
                      followers: true,
                      communities: true,
                      worldPulse: true,
                      vohAi: true,
                      mentions: true,
                      comments: true,
                      sparks: true,
                      email: true,
                      push: true
                    });
                    triggerToast("All alert parameters enabled");
                  }}
                  className="text-violet-400 hover:text-violet-300 underline uppercase pr-1"
                >
                  Reset Toggles
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTINUOUS WATCH HISTORY IMMERSIVE PLAYER MODAL */}
      <AnimatePresence>
        {activeHistoryVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-2xl"
          >
            <div className="w-full max-w-2xl bg-slate-950 border border-violet-500/20 rounded-3xl overflow-hidden relative shadow-[0_0_50px_rgba(139,92,246,0.3)]">
              
              {/* Header bar controls */}
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
                <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-white/5">
                  <Tv className="w-3.5 h-3.5 text-pink-400" />
                  <span className="text-[10px] font-mono text-white font-extrabold uppercase">CONTINUE NARRATIVE CHANNEL</span>
                </div>
                
                <button
                  onClick={() => setActiveHistoryVideo(null)}
                  className="pointer-events-auto p-2 bg-black/60 hover:bg-black/90 backdrop-blur-md rounded-full text-zinc-400 hover:text-white border border-white/5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Central Video Frame */}
              <div className="aspect-video w-full bg-black relative flex items-center justify-center">
                <video
                  autoPlay
                  controls
                  src={activeHistoryVideo.videoUrl}
                  // Start playing precisely from saved progress timestamp
                  onLoadedMetadata={(e) => {
                    const video = e.currentTarget;
                    if (video) {
                      video.currentTime = activeHistoryVideo.progress || 0;
                    }
                  }}
                  onTimeUpdate={(e) => {
                    const video = e.currentTarget;
                    if (video && activeHistoryVideo) {
                      // Keep updating saved position so resume session keeps track!
                      localStorage.setItem(`nexora_vid_pos_${activeHistoryVideo.videoUrl}`, String(video.currentTime));
                      
                      // Also update watch history item
                      const saved = localStorage.getItem('nexora_watch_history');
                      if (saved) {
                        try {
                          const list = JSON.parse(saved);
                          const matched = list.map((item: any) => {
                            if (item.postId === activeHistoryVideo.postId) {
                              return { ...item, progress: video.currentTime };
                            }
                            return item;
                          });
                          localStorage.setItem('nexora_watch_history', JSON.stringify(matched));
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }
                  }}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Bottom bio info bar */}
              <div className="p-4 bg-slate-900 border-t border-white/5 flex items-center gap-3">
                <img 
                  src={activeHistoryVideo.avatar} 
                  alt="" 
                  className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0" 
                />
                <div className="text-left min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-white font-sans">{activeHistoryVideo.name}</span>
                    <span className="text-[9.5px] font-mono text-violet-400">@{activeHistoryVideo.username}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans truncate leading-normal mt-0.5">
                    {activeHistoryVideo.content}
                  </p>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

