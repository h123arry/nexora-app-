import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Flame, 
  MessageSquare, 
  UserPlus, 
  Eye, 
  X, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  Bell, 
  Volume2, 
  VolumeX, 
  ExternalLink,
  ShieldCheck,
  Heart,
  ChevronRight,
  Radio
} from 'lucide-react';
import { Notification, User } from '../types';
import { requestPushPermission, isPushPermissionGranted, playNotificationSound } from '../services/notificationService';

interface NotificationPopBannerProps {
  onNavigateToPost?: (postId: string, focusComment?: boolean) => void;
  onNavigateToProfile?: (userId: string) => void;
  onNavigateToInbox?: (chatId?: string) => void;
  onFollowBack?: (userId: string) => void;
}

interface QueuedPop {
  id: string;
  notification: Notification;
  durationMs: number;
  addedAt: number;
}

export default function NotificationPopBanner({
  onNavigateToPost,
  onNavigateToProfile,
  onNavigateToInbox,
  onFollowBack
}: NotificationPopBannerProps) {
  const [queue, setQueue] = useState<QueuedPop[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [soundMuted, setSoundMuted] = useState(() => {
    return localStorage.getItem('nexora_notif_sound') === 'false';
  });
  const [hasPush, setHasPush] = useState(false);

  const activePop = queue[0] || null;
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(100);

  // Check native push status
  useEffect(() => {
    setHasPush(isPushPermissionGranted());
  }, []);

  // Listen for real-time notification events
  useEffect(() => {
    const handleRealtimeNotif = (e: Event) => {
      const customEvent = e as CustomEvent<{ notification: Notification; showPop?: boolean }>;
      const { notification, showPop = true } = customEvent.detail || {};
      
      if (!notification || showPop === false) return;

      const newPop: QueuedPop = {
        id: notification.id || `pop-${Date.now()}-${Math.random()}`,
        notification,
        durationMs: 5500,
        addedAt: Date.now()
      };

      setQueue(prev => {
        // Prevent immediate duplicate pops
        if (prev.some(p => p.notification.id === notification.id)) return prev;
        return [...prev, newPop];
      });
    };

    window.addEventListener('nexora-realtime-notification', handleRealtimeNotif as EventListener);
    return () => {
      window.removeEventListener('nexora-realtime-notification', handleRealtimeNotif as EventListener);
    };
  }, []);

  // Dismiss current pop
  const dismissCurrent = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setQueue(prev => prev.slice(1));
    setProgress(100);
  }, []);

  // Countdown timer for active pop
  useEffect(() => {
    if (!activePop) {
      setProgress(100);
      return;
    }

    if (isPaused) return;

    const totalDuration = activePop.durationMs;
    const intervalTime = 40;
    const step = (intervalTime / totalDuration) * 100;

    setProgress(100);

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev <= step) {
          dismissCurrent();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [activePop, isPaused, dismissCurrent]);

  const toggleSound = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !soundMuted;
    setSoundMuted(next);
    localStorage.setItem('nexora_notif_sound', next ? 'false' : 'true');
    if (!next) {
      playNotificationSound('spark');
    }
  };

  const handleEnablePush = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await requestPushPermission();
    setHasPush(result === 'granted');
    if (result === 'granted') {
      window.dispatchEvent(new CustomEvent('toast', { detail: '🔔 Phone push alerts enabled! You will be notified instantly.' }));
    }
  };

  if (!activePop) return null;

  const notif = activePop.notification;
  const isSpark = notif.type === 'spark' || notif.type === 'like';
  const isComment = notif.type === 'comment';
  const isFollow = notif.type === 'follow';
  const isProfileView = notif.type === 'profile_view';
  const isMention = notif.type === 'mention';
  const isMessage = notif.type === 'message';

  // Badge icon & theme styles
  let badgeIcon = <Sparkles className="w-3.5 h-3.5 text-amber-300" />;
  let badgeBg = "from-amber-500 to-rose-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]";
  let glowColor = "rgba(245, 158, 11, 0.25)";
  let actionLabel = "⚡ Sparked your post";

  if (isSpark) {
    badgeIcon = <Flame className="w-3.5 h-3.5 text-white" />;
    badgeBg = "from-pink-500 via-rose-500 to-amber-500 shadow-[0_0_14px_rgba(244,63,94,0.6)]";
    glowColor = "rgba(244, 63, 94, 0.3)";
    actionLabel = "⚡ Sparked your post";
  } else if (isComment) {
    badgeIcon = <MessageSquare className="w-3.5 h-3.5 text-white" />;
    badgeBg = "from-violet-500 via-indigo-500 to-cyan-500 shadow-[0_0_14px_rgba(99,102,241,0.6)]";
    glowColor = "rgba(99, 102, 241, 0.3)";
    actionLabel = "💬 Commented on your post";
  } else if (isFollow) {
    badgeIcon = <UserPlus className="w-3.5 h-3.5 text-white" />;
    badgeBg = "from-emerald-500 via-teal-500 to-cyan-500 shadow-[0_0_14px_rgba(16,185,129,0.6)]";
    glowColor = "rgba(16, 185, 129, 0.3)";
    actionLabel = "👤 Started following you";
  } else if (isProfileView) {
    badgeIcon = <Eye className="w-3.5 h-3.5 text-white" />;
    badgeBg = "from-cyan-500 via-blue-500 to-violet-500 shadow-[0_0_14px_rgba(6,182,212,0.6)]";
    glowColor = "rgba(6, 182, 212, 0.3)";
    actionLabel = "👁️ Viewed your profile";
  } else if (isMessage) {
    badgeIcon = <Radio className="w-3.5 h-3.5 text-white" />;
    badgeBg = "from-blue-500 via-indigo-500 to-purple-500 shadow-[0_0_14px_rgba(59,130,246,0.6)]";
    glowColor = "rgba(59, 130, 246, 0.3)";
    actionLabel = "✉️ New Direct Transmission";
  }

  const handleBannerClick = () => {
    if (isProfileView || isFollow) {
      if (onNavigateToProfile && notif.userId) {
        onNavigateToProfile(notif.userId);
      }
    } else if (isSpark || isComment) {
      if (onNavigateToPost && notif.targetId) {
        onNavigateToPost(notif.targetId, isComment);
      }
    } else if (isMessage) {
      if (onNavigateToInbox) {
        onNavigateToInbox(notif.targetId);
      }
    } else if (onNavigateToPost && notif.targetId) {
      onNavigateToPost(notif.targetId);
    }
    dismissCurrent();
  };

  const handleQuickAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFollow) {
      if (onFollowBack && notif.userId) {
        onFollowBack(notif.userId);
        window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Following @${notif.username} back!` }));
      } else if (onNavigateToProfile && notif.userId) {
        onNavigateToProfile(notif.userId);
      }
    } else if (isComment || isSpark) {
      if (onNavigateToPost && notif.targetId) {
        onNavigateToPost(notif.targetId, isComment);
      }
    } else if (isProfileView) {
      if (onNavigateToProfile && notif.userId) {
        onNavigateToProfile(notif.userId);
      }
    }
    dismissCurrent();
  };

  return (
    <div 
      id="nexora-pop-notification-wrapper"
      className="fixed top-3 sm:top-5 left-3 right-3 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md z-[120] pointer-events-auto"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={activePop.id}
          initial={{ y: -70, opacity: 0, scale: 0.93, filter: 'blur(4px)' }}
          animate={{ y: 0, opacity: 1, scale: 1, filter: 'blur(0px)' }}
          exit={{ y: -50, opacity: 0, scale: 0.94, filter: 'blur(4px)', transition: { duration: 0.22 } }}
          transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          drag="y"
          dragConstraints={{ top: -100, bottom: 0 }}
          dragElastic={0.4}
          onDragEnd={(_, info) => {
            if (info.offset.y < -25 || info.velocity.y < -300) {
              dismissCurrent();
            }
          }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onClick={handleBannerClick}
          className="relative group cursor-pointer overflow-hidden rounded-2xl bg-zinc-950/95 border border-white/15 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.85),0_0_24px_rgba(139,92,246,0.2)] hover:border-violet-500/40 transition-all duration-300 select-none"
          style={{
            boxShadow: `0 16px 40px rgba(0,0,0,0.85), 0 0 24px ${glowColor}`
          }}
        >
          {/* Top subtle brand & action bar */}
          <div className="px-3.5 pt-2.5 pb-1 flex items-center justify-between text-[10px] text-zinc-400 font-mono border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
              <span className="font-semibold tracking-wider text-violet-300 uppercase">NEXORA ALERT</span>
              <span className="text-zinc-600">•</span>
              <span className="text-zinc-400">Just now</span>
              {queue.length > 1 && (
                <span className="px-1.5 py-0.2 rounded-full bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30 text-[9px]">
                  +{queue.length - 1} more
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {/* Sound toggle */}
              <button
                type="button"
                onClick={toggleSound}
                className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title={soundMuted ? "Unmute alert sounds" : "Mute alert sounds"}
              >
                {soundMuted ? <VolumeX className="w-3 h-3 text-zinc-500" /> : <Volume2 className="w-3 h-3 text-violet-300" />}
              </button>

              {/* Push permission enable helper */}
              {!hasPush && (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  className="px-1.5 py-0.5 rounded bg-violet-600/30 hover:bg-violet-600/50 text-[9px] text-violet-200 border border-violet-500/30 flex items-center gap-0.5"
                  title="Enable phone push notifications"
                >
                  <Bell className="w-2.5 h-2.5" /> Push
                </button>
              )}

              {/* Dismiss button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissCurrent();
                }}
                className="p-1 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white transition-colors ml-0.5"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Main notification body */}
          <div className="p-3 sm:p-3.5 flex items-start gap-3">
            {/* Avatar with dynamic ring & badge */}
            <div className="relative shrink-0 mt-0.5">
              <div className="w-11 h-11 rounded-full p-[1.5px] bg-gradient-to-tr from-violet-500 via-pink-500 to-amber-400">
                <img
                  src={notif.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={notif.username}
                  className="w-full h-full rounded-full object-cover bg-zinc-900"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-tr ${badgeBg} flex items-center justify-center border-2 border-zinc-950`}>
                {badgeIcon}
              </div>
            </div>

            {/* Notification Text content */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-white text-xs sm:text-sm tracking-tight truncate max-w-[150px]">
                  {notif.actorName || notif.username}
                </span>
                <span className="text-[11px] text-zinc-400 font-mono">
                  @{notif.username}
                </span>
                {notif.matchPercentage && (
                  <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono text-[9px] border border-cyan-500/30">
                    {notif.matchPercentage}% DNA
                  </span>
                )}
              </div>

              {/* Action content */}
              <p className="text-xs text-zinc-200 mt-0.5 font-normal leading-relaxed line-clamp-2">
                {isSpark && (
                  <span className="font-medium text-pink-300">sparked your post </span>
                )}
                {isComment && (
                  <span className="font-medium text-violet-300">commented: </span>
                )}
                {isFollow && (
                  <span className="font-medium text-emerald-300">started following you </span>
                )}
                {isProfileView && (
                  <span className="font-medium text-cyan-300">viewed your profile </span>
                )}
                
                {isComment ? (
                  <span className="italic text-white">"{notif.content.replace(/^commented:\s*"/, '').replace(/"$/, '')}"</span>
                ) : isSpark ? (
                  <span className="text-zinc-300">{notif.content.replace(/^sparked your post:\s*/, '')}</span>
                ) : isProfileView ? (
                  <span className="text-zinc-300">from {notif.location || 'Global Network'}</span>
                ) : (
                  <span className="text-zinc-300">{notif.content}</span>
                )}
              </p>

              {/* Quick Action Button row */}
              <div className="mt-2.5 flex items-center gap-2">
                {isFollow && (
                  <button
                    type="button"
                    onClick={handleQuickAction}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[11px] font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <UserPlus className="w-3 h-3" /> Follow Back
                  </button>
                )}
                {isComment && (
                  <button
                    type="button"
                    onClick={handleQuickAction}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[11px] font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" /> Reply
                  </button>
                )}
                {isSpark && (
                  <button
                    type="button"
                    onClick={handleQuickAction}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-pink-600 to-rose-600 text-white text-[11px] font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Flame className="w-3 h-3" /> View Post
                  </button>
                )}
                {isProfileView && (
                  <button
                    type="button"
                    onClick={handleQuickAction}
                    className="px-3 py-1 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-[11px] font-bold shadow-sm hover:brightness-110 active:scale-95 transition-all flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" /> View Profile
                  </button>
                )}
                
                <span className="text-[10px] text-zinc-500 ml-auto flex items-center gap-0.5 group-hover:text-zinc-300 transition-colors">
                  Tap to view <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>

            {/* Post preview thumbnail if present */}
            {notif.targetPostImage && (
              <div className="shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-white/15 bg-zinc-900 shadow-inner">
                <img
                  src={notif.targetPostImage}
                  alt="Post preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>

          {/* Glowing Hairline Progress countdown bar */}
          <div className="h-0.5 w-full bg-white/5 overflow-hidden">
            <motion.div
              className={`h-full bg-gradient-to-r ${badgeBg}`}
              style={{ width: `${progress}%` }}
              transition={{ ease: 'linear' }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
