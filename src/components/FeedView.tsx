import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Zap, Repeat, MessageCircle, Bookmark, Cpu, Play, Pause, Volume2, Mic, Send, Briefcase, Users, Award, Star, Search, X, Plus, Filter, Trash, RefreshCw, Globe, MapPin, Sliders, VolumeX, CheckCircle, ChevronDown, ChevronUp, MoreHorizontal, EyeOff, FolderPlus, Folder, ShieldAlert, Edit2, UserPlus, ThumbsDown, BarChart2, Pin, BookOpen, Archive, Heart, Bell, Wifi, WifiOff, Info, Undo2, Sparkles, TrendingUp, Activity, Menu } from 'lucide-react';
import { User, Post, Comment, ThemeMood } from '../types';
import ReportModal from './ReportModal';
import NexoraVideoPlayer from './NexoraVideoPlayer';
import NexoraImagePlayer from './NexoraImagePlayer';
import NexoraPremiumLogo from './NexoraPremiumLogo';
import NexoraBranding from './NexoraBranding';
import NexoraLoader from './NexoraLoader';
import VohSummaryButton from './VohSummaryButton';
import RelativeTime from './RelativeTime';
import FeedPostCard from './FeedPostCard';
import NexoraVideo from './NexoraVideo';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import { getRecommendationProfile, recordRecommendationEvent, resetRecommendationProfile, saveRecommendationProfile } from '../utils/recommendations';
import { trackClientObservation } from '../services/analyticsService';
import { rankPosts } from '../services/discovery/discoveryService';
import { SettingsService } from '../services/firebase/settingsService';
import { normalizeFeedPreferences, resetFeedPreferences } from '../services/discovery/feedPreferences';
import { auth } from '../services/firebase/config';
import { ProfileService } from '../services/firebase/profileService';
import { readUserScopedJson, writeUserScopedJson } from '../utils/userScopedStorage';
import { globalVideoPlaybackManager } from '../utils/VideoPlaybackManager';
import { getVideoPreloadPlan } from '../utils/videoPreloadPolicy';
import { getDevicePerformanceProfile } from '../utils/devicePerformance';
import { getFeedLoadMoreDecision } from '../utils/feedPaginationPolicy';
import { TERMINOLOGY } from '../services/voh';
import ImmersiveVideoViewer from './ImmersiveVideoViewer';
import StoryRail from './StoryRail';
import { Skeleton } from './Skeleton';
import { rankReels } from '../services/reels/reelsRanking';
import { buildPostAnalytics } from '../services/analytics/postAnalytics';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../lib/firebase';

// Interface extensions for threaded comments and advanced posts
interface ThreadReply {
  id: string;
  userId: string;
  username: string;
  name: string;
  avatar: string;
  content: string;
  timestamp: string;
}

interface InteractiveComment extends Comment {
  replies?: ThreadReply[];
}

interface RefactoredPost extends Post {
  comments: InteractiveComment[];
  isVoice?: boolean;
  voiceDuration?: any;
  voiceTranscript?: string;
  videoUrl?: string;
  location?: string;
  communityName?: string;
  opportunityType?: string;
  opportunityReward?: string;
  opportunitySkills?: string[];
  isSpamBot?: boolean;
  category?: string;
}

function PostCarousel({ images, filters }: { images: string[], filters?: string[] }) {
  const [index, setIndex] = useState(0);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index < images.length - 1) setIndex(index + 1);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (index > 0) setIndex(index - 1);
  };

  return (
    <div className="relative overflow-hidden border-b border-white/5 mb-4 aspect-square max-h-[500px] bg-black group select-none">
      <div 
        className="flex h-full transition-transform duration-300 ease-out"
        style={{ transform: `translateX(-${index * (100 / images.length)}%)`, width: `${images.length * 100}%` }}
      >
        {images.map((img, idx) => (
          <div key={idx} className="w-full h-full shrink-0 relative">
            <img 
              src={img} 
              alt={`Slide ${idx + 1}`} 
              className="w-full h-full object-cover pointer-events-none"
              referrerPolicy="no-referrer"
              loading="lazy"
              decoding="async"
              style={{ filter: (filters && filters[idx]) || 'none' }}
            />
          </div>
        ))}
      </div>

      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[9px] font-mono text-white font-bold select-none">
        {index + 1} / {images.length}
      </div>

      {index > 0 && (
        <button 
          onClick={handlePrev}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/80 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer text-sm font-bold leading-none select-none z-10"
        >
          &larr;
        </button>
      )}
      {index < images.length - 1 && (
        <button 
          onClick={handleNext}
          aria-label="Next image"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/80 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 cursor-pointer text-sm font-bold leading-none select-none z-10"
        >
          &rarr;
        </button>
      )}

      <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5 pointer-events-none z-10">
        {images.map((_, i) => (
          <div 
            key={i} 
            className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === index ? 'bg-violet-400 scale-125' : 'bg-white/30'}`}
          />
        ))}
      </div>
    </div>
  );
}

// Normalize the actual posts supplied by the authenticated feed source.
function normalizeFeedPosts(parentPosts: Post[]): RefactoredPost[] {
  const blended: RefactoredPost[] = [];

  // First append parent posts (if any)
  parentPosts.forEach(p => {
    blended.push({
      ...p,
      comments: (p.comments || []).map(c => ({ ...c, replies: (c as any).replies || [] }))
    });
  });

  return blended;
}

// Moments are populated only from saved or user-created content. Never fabricate story authors or activity.

const SEARCHABLE_SYSTEM_USERS: any[] = [];

function FeedHydrationSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading Nexora feed" className="nx-feed-list space-y-4 mx-3 sm:mx-0">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="nx-post-card p-4 space-y-4">
          <div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-2 flex-1"><Skeleton className="h-3 w-32" /><Skeleton className="h-2.5 w-20" /></div><Skeleton className="h-7 w-7 rounded-full" /></div>
          <Skeleton className="h-3 w-4/5" />
          <Skeleton className={`w-full rounded-2xl ${index === 0 ? 'aspect-[4/5]' : 'aspect-[16/10]'}`} />
          <div className="flex gap-5"><Skeleton className="h-7 w-12" /><Skeleton className="h-7 w-12" /><Skeleton className="h-7 w-12" /><Skeleton className="h-7 w-12" /></div>
        </div>
      ))}
    </div>
  );
}

interface FeedViewProps {
  currentUser: User;
  creators?: User[];
  posts: Post[];
  followingIds: string[];
  friendIds?: string[];
  onLikePost: (postId: string) => void;
  onBookmarkPost: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onAddPost: (content: string, imageUrl?: string, tagsString?: string) => string;
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  onViewProfile?: (userId: string) => void;
  onToggleFollow?: (creatorId: string) => void;
  theme?: ThemeMood;
  onSharePost?: (postId: string) => void;
  onRepostPost?: (postId: string) => void;
  onQuotePost?: (postId: string, quoteText: string) => Promise<boolean> | boolean;
  activeTab?: string;
  unreadMessagesCount?: number;
  onOpenMessages?: () => void;
  onOpenVohAi?: () => void;
  isHydrated?: boolean;
  onRequireAuth?: () => void;
  onLoadMorePosts?: () => Promise<void>;
  onRefreshFeed?: () => Promise<void>;
  hasMorePosts?: boolean;
  isLoadingMorePosts?: boolean;
}

export default function FeedView({
  currentUser,
  creators = [],
  posts,
  followingIds,
  friendIds = [],
  onLikePost,
  onBookmarkPost,
  onAddComment,
  onAddPost,
  selectedTag,
  setSelectedTag,
  searchQuery,
  setSearchQuery,
  onViewProfile,
  onToggleFollow,
  theme = 'stealth-dark',
  onSharePost,
  onRepostPost,
  onQuotePost,
  activeTab = 'feed',
  unreadMessagesCount = 0,
  onOpenMessages,
  onOpenVohAi,
  isHydrated = true,
  onRequireAuth,
  onLoadMorePosts,
  onRefreshFeed,
  hasMorePosts = false,
  isLoadingMorePosts = false
}: FeedViewProps) {
  const reduceMotion = useReducedMotion();
  // Database states
  const [localPosts, setLocalPosts] = useState<RefactoredPost[]>([]);
  const [feedTab, setFeedTab] = useState<'posts' | 'following' | 'friends' | 'trending' | 'reels'>(() => {
    const saved = readUserScopedJson<string | null>(localStorage, 'nexora_feed_tab', currentUser.id, null);
    if (!saved || ['communities', 'polls', 'contributions', 'broadcast', 'pulse', 'for_you', 'forYou', 'local'].includes(saved)) return 'posts';
    return (saved as any) || 'posts';
  });

  // Scroll positions memory for each category tab
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const prevTabRef = useRef<string>('posts');

  // Pause previous feed's active video immediately on tab switch and restore position
  useEffect(() => {
    globalVideoPlaybackManager.pauseAll();
    
    // Save scroll position of previous tab
    if (scrollContainerRef.current) {
      scrollPositionsRef.current[prevTabRef.current] = scrollContainerRef.current.scrollTop;
    }
    
    // Set active tab reference
    prevTabRef.current = feedTab;

    // Restore scroll position for new tab
    const restoredScrollTop = scrollPositionsRef.current[feedTab] || 0;
    const timer = setTimeout(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = restoredScrollTop;
      }
    }, 50);

    // Set activePostId to null initially so it evaluates the new first post on scroll evaluation
    setActivePostId(null);

    return () => clearTimeout(timer);
  }, [feedTab, currentUser.id]);

  // Online/Offline tracking
  const [isOffline, setIsOffline] = useState(() => typeof navigator !== 'undefined' ? !navigator.onLine : false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      window.dispatchEvent(new CustomEvent('toast', { detail: '💚 Connected! Restored synchronization tunnel.' }));
    };
    const handleOffline = () => {
      setIsOffline(true);
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Connection lost. Running in isolated cache mode.' }));
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pull-to-refresh state
  const [pullY, setPullY] = useState(0);
  const [pullState, setPullState] = useState<'idle' | 'pulling' | 'refreshing'>('idle');
  const pullStartYRef = useRef<number | null>(null);
  const isMouseDownRef = useRef(false);

  // Double tap floating hearts feedback
  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: string; x: number; y: number }>>([]);

  // Context menu (long press / right-click)
  const [contextualMenuPost, setContextualMenuPost] = useState<RefactoredPost | null>(null);
  const [showTransparencyExplanation, setShowTransparencyExplanation] = useState<boolean>(false);
  const [nidaDiagnosticPost, setNidaDiagnosticPost] = useState<RefactoredPost | null>(null);
  const [lastAction, setLastAction] = useState<{ type: 'not_interested' | 'mute_creator' | 'hide_post'; postId: string; data: any } | null>(null);
  
  const longPressTimerRef = useRef<Record<string, any>>({});

  // Header collapse / restore on scroll state
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const lastScrollTopRef = useRef<number>(0);

  const [qualityFilter, setQualityFilter] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [recommendationsVersion, setRecommendationsVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => {
      setRecommendationsVersion(v => v + 1);
    };
    window.addEventListener('nexora-recommendations-updated', handleUpdate);
    return () => {
      window.removeEventListener('nexora-recommendations-updated', handleUpdate);
    };
  }, []);

  useEffect(() => {
    writeUserScopedJson(localStorage, 'nexora_feed_tab', currentUser.id, feedTab);
  }, [feedTab]);
  
  // Custom interactive features
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});

  useEffect(() => {
    setVotedPolls({});
    if (!currentUser?.id || currentUser.id === 'guest_visitor_id') return;
    const postIds = posts.filter(post => !!post.interactivePoll).slice(0, 60).map(post => post.id);
    if (!postIds.length) return;
    let active = true;
    const loadVotes = httpsCallable<{ postIds: string[] }, { votes: Record<string, string> }>(functions, 'getMyFeedPollVotes');
    loadVotes({ postIds }).then(result => {
      if (active) setVotedPolls(result.data.votes || {});
    }).catch(() => { /* Vote recovery is best-effort; the server still enforces one vote. */ });
    return () => { active = false; };
  }, [currentUser.id, posts]);

  const handleVotePoll = async (postId: string, optionId: string) => {
    if (!currentUser?.id || currentUser.id === 'guest_visitor_id') {
      onRequireAuth?.();
      return;
    }
    try {
      const vote = httpsCallable<{ postId: string; optionId: string }, {
        voted: boolean; selectedOptionId: string; options: { id: string; text: string; votes: number }[];
      }>(functions, 'voteOnFeedPoll');
      const result = await vote({ postId, optionId });
      setVotedPolls(previous => ({ ...previous, [postId]: result.data.selectedOptionId }));
      setLocalPosts(previous => previous.map(post => post.id === postId && post.interactivePoll
        ? { ...post, interactivePoll: { ...post.interactivePoll, options: result.data.options } }
        : post));
    } catch (error) {
      window.dispatchEvent(new CustomEvent('toast', {
        detail: error instanceof Error ? error.message : 'Your vote could not be recorded. Please retry.',
      }));
    }
  };
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const activePostIdRef = useRef<string | null>(null);
  activePostIdRef.current = activePostId;
  const [isScrollingFast, setIsScrollingFast] = useState(false);
  const [userSettled, setUserSettled] = useState(false);
  const [activeVideoFullscreen, setActiveVideoFullscreen] = useState<RefactoredPost | null>(null);
  const [fullscreenVideoMuted, setFullscreenVideoMuted] = useState(() => globalVideoPlaybackManager.getMute());
  const [globalMutedState, setGlobalMutedState] = useState(() => globalVideoPlaybackManager.getMute());
  const [fullscreenPlaying, setFullscreenPlaying] = useState(true);
  const fullscreenVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const handleVolumeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.muted === 'boolean') {
        setGlobalMutedState(customEvent.detail.muted);
        setFullscreenVideoMuted(customEvent.detail.muted);
      }
    };
    window.addEventListener('nexora-volume-change', handleVolumeChange);
    return () => {
      window.removeEventListener('nexora-volume-change', handleVolumeChange);
    };
  }, []);

  useEffect(() => {
    if (activeVideoFullscreen) {
      const syncData = (window as any).nexoraFullscreenSync;
      if (syncData && syncData.postId === activeVideoFullscreen.id) {
        setFullscreenVideoMuted(syncData.isMuted);
        setFullscreenPlaying(syncData.isPlaying);
        
        // Let's stop the inline video element so there's no dual playback
        if (syncData.videoElement) {
          syncData.videoElement.pause();
        }

        setTimeout(() => {
          if (fullscreenVideoRef.current) {
            fullscreenVideoRef.current.currentTime = syncData.currentTime;
            fullscreenVideoRef.current.muted = syncData.isMuted;
            if (syncData.isPlaying) {
              fullscreenVideoRef.current.play().catch(() => {});
            } else {
              fullscreenVideoRef.current.pause();
            }
          }
        }, 50);
      }
    }
  }, [activeVideoFullscreen]);

  const handleCloseFullscreen = () => {
    if (fullscreenVideoRef.current && (window as any).nexoraFullscreenSync) {
      (window as any).nexoraFullscreenSync.onClose(
        fullscreenVideoRef.current.currentTime,
        fullscreenPlaying,
        fullscreenVideoMuted
      );
    }
    setActiveVideoFullscreen(null);
  };

  const handleToggleFullscreenPlay = () => {
    if (fullscreenVideoRef.current) {
      if (fullscreenPlaying) {
        fullscreenVideoRef.current.pause();
        setFullscreenPlaying(false);
      } else {
        fullscreenVideoRef.current.play().catch(() => {});
        setFullscreenPlaying(true);
      }
    }
  };

  const handleToggleFullscreenMute = () => {
    if (fullscreenVideoRef.current) {
      const newMuted = !fullscreenVideoMuted;
      fullscreenVideoRef.current.muted = newMuted;
      setFullscreenVideoMuted(newMuted);
      globalVideoPlaybackManager.setMute(newMuted);
    }
  };

  // New Comments and Replies drafting state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [activeReplyFieldId, setActiveReplyFieldId] = useState<string | null>(null);
  const [quoteTargetPost, setQuoteTargetPost] = useState<Post | null>(null);
  const [quoteDraft, setQuoteDraft] = useState('');
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

  // Phase 6 & Phase 7 - Interactive states
  const [expandedPostIds, setExpandedPostIds] = useState<string[]>([]);
  const [mutedCreatorIds, setMutedCreatorIds] = useState<string[]>(() => readUserScopedJson(localStorage, 'nexora_muted_creators', currentUser.id, []));
  const [pinnedPostIds, setPinnedPostIds] = useState<string[]>(() => {
    if (Array.isArray(currentUser.pinnedPosts)) return currentUser.pinnedPosts.filter(id => typeof id === 'string');
    try {
      const saved = localStorage.getItem(`nexora_pinned_posts_${currentUser.id}`);
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });
  const pinnedPostIdsRef = useRef(pinnedPostIds);
  useEffect(() => {
    pinnedPostIdsRef.current = pinnedPostIds;
    try {
      localStorage.setItem(`nexora_pinned_posts_${currentUser.id}`, JSON.stringify(pinnedPostIds));
    } catch {
      // Firestore remains the durable source; device cache failure must not block the feed.
    }
  }, [pinnedPostIds, currentUser.id]);

  const updatePinnedPostIds: React.Dispatch<React.SetStateAction<string[]>> = nextOrUpdater => {
    const next = typeof nextOrUpdater === 'function' ? nextOrUpdater(pinnedPostIdsRef.current) : nextOrUpdater;
    pinnedPostIdsRef.current = next;
    setPinnedPostIds(next);
    if (auth.currentUser?.uid === currentUser.id) {
      void ProfileService.updateProfile(currentUser.id, { pinnedPosts: next }).catch(() => {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Pinned posts could not be synced. Please try again.' }));
      });
    }
  };
  const [analyticsPost, setAnalyticsPost] = useState<RefactoredPost | null>(null);
  const analyticsSnapshot = analyticsPost ? buildPostAnalytics(analyticsPost) : null;


  // Floating Composer Box
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [composerCategory, setComposerCategory] = useState<'general' | 'pulse' | 'community' | 'opportunity'>('general');
  const [composerImgUrl, setComposerImgUrl] = useState('');
  const [composerOpportunityType, setComposerOpportunityType] = useState<'Job' | 'Collaboration' | 'Startup' | 'Mentorship'>('Collaboration');
  const [composerReward, setComposerReward] = useState('');
  const [composerCommunityName, setComposerCommunityName] = useState('');
  const [composerLocation, setComposerLocation] = useState('');

  // 1. Advanced Moderation States
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>(() => readUserScopedJson(localStorage, 'nexora_hidden_posts', currentUser.id, []));
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => readUserScopedJson(localStorage, 'nexora_blocked_users', currentUser.id, []));
  const [mutedUserIds, setMutedUserIds] = useState<string[]>(() => readUserScopedJson(localStorage, 'nexora_muted_users', currentUser.id, []));
  const [notInterestedTags, setNotInterestedTags] = useState<string[]>(() => readUserScopedJson(localStorage, 'nexora_not_interested_tags', currentUser.id, []));
  const feedPreferencesHydratedRef = useRef(false);
  const impressedPostIdsRef = useRef<Set<string>>(new Set());
  const [recommendationsPersonalizationEnabled, setRecommendationsPersonalizationEnabled] = useState(() => currentUser.id === 'guest_visitor_id');
  const recommendationSyncTimerRef = useRef<number | null>(null);

  useEffect(() => {
    impressedPostIdsRef.current.clear();
  }, [currentUser.id]);

  const handlePostImpression = useCallback((postId: string) => {
    if (!postId || impressedPostIdsRef.current.has(postId)) return;
    impressedPostIdsRef.current.add(postId);
    trackClientObservation({
      eventType: 'content_impression',
      entityType: 'post',
      entityId: postId,
      properties: { surface: 'feed_card', qualification: '50_percent_for_1_second' },
    });
  }, []);

  // Local storage is an offline fallback only. Signed-in users hydrate the
  // authoritative feed controls from owner-scoped Firestore settings.
  useEffect(() => {
    feedPreferencesHydratedRef.current = false;
    if (!currentUser.id || currentUser.id === 'guest_visitor_id' || auth.currentUser?.uid !== currentUser.id) return;
    let cancelled = false;
    SettingsService.getSettings(currentUser.id).then(settings => {
      if (cancelled) return;
      const preferences = normalizeFeedPreferences(settings.feed);
      setRecommendationsPersonalizationEnabled(settings.privacy.recommendationsPersonalization !== false);
      const remoteSignals = preferences.recommendationSignals;
      const hasRemoteSignals = Object.values(remoteSignals).some(values => Object.keys(values).length > 0);
      const localSignals = getRecommendationProfile();
      const hasLocalSignals = Object.values(localSignals).some(values => Object.keys(values).length > 0);
      if (hasRemoteSignals) saveRecommendationProfile(remoteSignals);
      else if (hasLocalSignals && settings.privacy.recommendationsPersonalization !== false) void SettingsService.updateFeed(currentUser.id, { recommendationSignals: localSignals });
      setFeedTab(preferences.tab);
      setNotInterestedTags(preferences.notInterestedTags);
      setBlockedUserIds(preferences.blockedCreatorIds);
      setMutedCreatorIds(preferences.mutedCreatorIds);
      setHiddenPostIds(preferences.hiddenPostIds);
      feedPreferencesHydratedRef.current = true;
    }).catch(() => {
      if (!cancelled) feedPreferencesHydratedRef.current = true;
    });
    return () => { cancelled = true; };
  }, [currentUser.id]);

  const recordAndPersistRecommendationEvent = (
    type: Parameters<typeof recordRecommendationEvent>[0],
    payload: Parameters<typeof recordRecommendationEvent>[1],
  ) => {
    if (!recommendationsPersonalizationEnabled) return;
    if (currentUser.id !== 'guest_visitor_id' && !feedPreferencesHydratedRef.current) return;
    recordRecommendationEvent(type, payload);
    if (auth.currentUser?.uid !== currentUser.id) return;
    if (recommendationSyncTimerRef.current) window.clearTimeout(recommendationSyncTimerRef.current);
    recommendationSyncTimerRef.current = window.setTimeout(() => {
      void SettingsService.updateFeed(currentUser.id, {
        recommendationSignals: getRecommendationProfile(),
      }).catch(() => {
        // Local account-scoped learning remains available when the network is offline.
      });
    }, 400);
  };

  // 2. Custom Pinterest-style collection state
  const [savedCollections, setSavedCollections] = useState<Record<string, string[]>>(() => readUserScopedJson(localStorage, 'nexora_saved_collections', currentUser.id, {
    'Favorites ❤️': [], 'Football ⚽': [], 'Business 💼': [], 'Inspiration ⚡': [], 'Custom Collections 📂': [],
  }));
  const [activeCollectionFolder, setActiveCollectionFolder] = useState<string | null>(null);
  const [showSaveToCollectionModalId, setShowSaveToCollectionModalId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');

  // 3. Search Engine 2.0 States
  const [searchFilterType, setSearchFilterType] = useState<'all' | 'users' | 'posts' | 'videos' | 'voice' | 'communities' | 'hashtags' | 'pulse'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'nearby'>('latest');

  // Premium Search States
  const [searchHistory, setSearchHistory] = useState<string[]>(() => readUserScopedJson(localStorage, 'nexora_search_history', currentUser.id, []));
  const [feedCacheOwnerId, setFeedCacheOwnerId] = useState(currentUser.id);
  useEffect(() => {
    if (feedCacheOwnerId === currentUser.id) return;
    setMutedCreatorIds(readUserScopedJson(localStorage, 'nexora_muted_creators', currentUser.id, []));
    setSavedCollections(readUserScopedJson(localStorage, 'nexora_saved_collections', currentUser.id, {
      'Favorites ❤️': [], 'Football ⚽': [], 'Business 💼': [], 'Inspiration ⚡': [], 'Custom Collections 📂': [],
    }));
    setSearchHistory(readUserScopedJson(localStorage, 'nexora_search_history', currentUser.id, []));
    setHiddenPostIds(readUserScopedJson(localStorage, 'nexora_hidden_posts', currentUser.id, []));
    setBlockedUserIds(readUserScopedJson(localStorage, 'nexora_blocked_users', currentUser.id, []));
    setMutedUserIds(readUserScopedJson(localStorage, 'nexora_muted_users', currentUser.id, []));
    setNotInterestedTags(readUserScopedJson(localStorage, 'nexora_not_interested_tags', currentUser.id, []));
    setPinnedPostIds(Array.isArray(currentUser.pinnedPosts) ? currentUser.pinnedPosts.filter(id => typeof id === 'string') : readUserScopedJson(localStorage, 'nexora_pinned_posts', currentUser.id, []));
    setFeedCacheOwnerId(currentUser.id);
  }, [currentUser.id, currentUser.pinnedPosts, feedCacheOwnerId]);


  const addToSearchHistory = (q: string) => {
    if (!q || !q.trim()) return;
    const query = q.trim();
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 10);
      writeUserScopedJson(localStorage, 'nexora_search_history', feedCacheOwnerId, updated);
      return updated;
    });
  };

  const removeFromSearchHistory = (q: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(h => h !== q);
      writeUserScopedJson(localStorage, 'nexora_search_history', feedCacheOwnerId, updated);
      return updated;
    });
  };

  const clearAllSearchHistory = () => {
    setSearchHistory([]);
    writeUserScopedJson(localStorage, 'nexora_search_history', feedCacheOwnerId, []);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Clear Search history packet successfully executed!' }));
  };

  // 4. Reporting Modal and Post Options Menu
  const [activeDotsMenuPostId, setActiveDotsMenuPostId] = useState<string | null>(null);
  const [reportingPost, setReportingPost] = useState<any | null>(null);

  useEffect(() => {
    const handleEscape = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (reportingPost) {
        setReportingPost(null);
        customEvent.preventDefault();
        return;
      }
      if (showSaveToCollectionModalId) {
        setShowSaveToCollectionModalId(null);
        customEvent.preventDefault();
        return;
      }
      if (composerOpen) {
        setComposerOpen(false);
        customEvent.preventDefault();
        return;
      }
      if (activeDotsMenuPostId) {
        setActiveDotsMenuPostId(null);
        customEvent.preventDefault();
        return;
      }
      if (activeCommentsPostId) {
        setActiveCommentsPostId(null);
        customEvent.preventDefault();
        return;
      }
    };
    window.addEventListener('nexora-escape', handleEscape);
    return () => window.removeEventListener('nexora-escape', handleEscape);
  }, [activeDotsMenuPostId, activeCommentsPostId, composerOpen, reportingPost, showSaveToCollectionModalId]);

  // Listener to open and focus a specific post / comment thread from push alerts or notifications
  useEffect(() => {
    const handleOpenPostEvent = (e: Event) => {
      const { postId, focusComment } = (e as CustomEvent<{ postId: string; focusComment?: boolean }>).detail || {};
      if (!postId) return;
      if (focusComment) {
        setActiveCommentsPostId(postId);
      }
      setTimeout(() => {
        const el = document.getElementById(`post-${postId}`) || document.getElementById(`feed-card-${postId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 120);
    };

    window.addEventListener('nexora-open-post', handleOpenPostEvent as EventListener);
    return () => window.removeEventListener('nexora-open-post', handleOpenPostEvent as EventListener);
  }, []);

  // Inline post editing states
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingPostContent, setEditingPostContent] = useState<string>('');
  
  // Edit history modal view state (optional popover to show past contents)
  const [viewHistoryPost, setViewHistoryPost] = useState<any | null>(null);

  // Sync back state modifications to localStorage
  useEffect(() => {
    writeUserScopedJson(localStorage, 'nexora_hidden_posts', feedCacheOwnerId, hiddenPostIds);
  }, [hiddenPostIds, feedCacheOwnerId]);

  useEffect(() => {
    writeUserScopedJson(localStorage, 'nexora_blocked_users', feedCacheOwnerId, blockedUserIds);
  }, [blockedUserIds, feedCacheOwnerId]);

  useEffect(() => {
    writeUserScopedJson(localStorage, 'nexora_muted_users', feedCacheOwnerId, mutedUserIds);
  }, [mutedUserIds, feedCacheOwnerId]);

  useEffect(() => {
    writeUserScopedJson(localStorage, 'nexora_not_interested_tags', feedCacheOwnerId, notInterestedTags);
  }, [notInterestedTags, feedCacheOwnerId]);
  useEffect(() => {
    if (!feedPreferencesHydratedRef.current || currentUser.id === 'guest_visitor_id' || auth.currentUser?.uid !== currentUser.id) return;
    const timer = window.setTimeout(() => {
      void SettingsService.updateFeed(currentUser.id, {
        tab: feedTab,
        notInterestedTags,
        blockedCreatorIds: blockedUserIds,
        mutedCreatorIds,
        hiddenPostIds,
      }).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [currentUser.id, feedTab, notInterestedTags, blockedUserIds, mutedCreatorIds, hiddenPostIds]);

  useEffect(() => {
    writeUserScopedJson(localStorage, 'nexora_saved_collections', feedCacheOwnerId, savedCollections);
  }, [savedCollections, feedCacheOwnerId]);

  // Handle global updates
  useEffect(() => {
    const handleReportsUpdate = () => {
      // Rehydrate lists if necessary or sync items
    };
    window.addEventListener('reports-updated', handleReportsUpdate);
    return () => window.removeEventListener('reports-updated', handleReportsUpdate);
  }, []);

  // Track search terms in the recommendation engine
  useEffect(() => {
    if (searchQuery && searchQuery.trim().length > 2) {
      const delayDebounce = setTimeout(() => {
        recordAndPersistRecommendationEvent('search', { keyword: searchQuery });
        trackClientObservation({ eventType: 'search_started' });
      }, 1000); // 1s debounce to avoid over-triggering
      return () => clearTimeout(delayDebounce);
    }
  }, [searchQuery]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // State to hold pending posts received in the background while scrolling
  const [pendingPosts, setPendingPosts] = useState<RefactoredPost[]>([]);

  // 1. Hydrate the feed and synchronize with Parent posts
  useEffect(() => {
    const normalizedPosts = normalizeFeedPosts(posts);
    
    setLocalPosts(currentLocalPosts => {
      if (normalizedPosts.length === 0) return [];
      if (currentLocalPosts.length === 0) {
        // Initial load
        return normalizedPosts;
      }
      
      // Separate existing and new posts
      const currentIds = new Set(currentLocalPosts.map(p => p.id));
      const newIncomingPosts = normalizedPosts.filter(p => !currentIds.has(p.id));
      
      // Update existing posts in-place to preserve their exact order and indices
      const updatedLocalPosts = currentLocalPosts.map(existingPost => {
        const matchingIncoming = normalizedPosts.find(p => p.id === existingPost.id);
        if (matchingIncoming) {
          const hasChanged = 
            existingPost.likes !== matchingIncoming.likes ||
            JSON.stringify(existingPost.comments) !== JSON.stringify(matchingIncoming.comments) ||
            existingPost.isLikedByUser !== matchingIncoming.isLikedByUser ||
            existingPost.isBookmarkedByUser !== matchingIncoming.isBookmarkedByUser ||
            existingPost.shares !== matchingIncoming.shares ||
            existingPost.scheduledTime !== matchingIncoming.scheduledTime ||
            existingPost.name !== matchingIncoming.name ||
            existingPost.avatar !== matchingIncoming.avatar ||
            existingPost.username !== matchingIncoming.username ||
            existingPost.isVerified !== matchingIncoming.isVerified;
            
          if (hasChanged) {
            return {
              ...existingPost,
              ...matchingIncoming,
              comments: matchingIncoming.comments
            };
          }
        }
        return existingPost;
      });

      // Handle new incoming posts
      if (newIncomingPosts.length > 0) {
        // Split new posts into user-created posts (prepend immediately) and background posts (queue as pending)
        const currentUserNewPosts = newIncomingPosts.filter(p => p.userId === currentUser.id);
        const otherNewPosts = newIncomingPosts.filter(p => p.userId !== currentUser.id);
        
        // Also check if user is at the top of the feed to allow immediate update for background posts
        const isAtTop = scrollContainerRef.current ? scrollContainerRef.current.scrollTop <= 20 : true;
        
        if (isAtTop && otherNewPosts.length > 0) {
          // Prepend all new posts since user is at top
          return [...newIncomingPosts, ...updatedLocalPosts];
        } else {
          // Add other users' posts to pendingPosts and prepend current user's own posts immediately
          if (otherNewPosts.length > 0) {
            setPendingPosts(prev => {
              const existingPendingIds = new Set(prev.map(p => p.id));
              const freshPending = otherNewPosts.filter(p => !existingPendingIds.has(p.id));
              return [...prev, ...freshPending];
            });
          }
          return [...currentUserNewPosts, ...updatedLocalPosts];
        }
      }

      return updatedLocalPosts;
    });
  }, [posts, currentUser.id]);

  // Header expansion state tracking ref to eliminate duplicate re-renders
  const isHeaderExpandedRef = useRef(true);
  const loadMoreInFlightRef = useRef(false);
  const orderedPostsRef = useRef<RefactoredPost[]>([]);

  // High-performance passive scroll handler for infinite scroll & header collapse.
  // A request lock prevents repeated scroll events from issuing duplicate page loads.
  useEffect(() => {
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        try {
          localStorage.setItem(`nexora_feed_scroll_pos_${currentUser.id}`, String(scrollTop));
        } catch {
          // Scroll restoration is an enhancement; storage failure must not affect scrolling.
        }
      }, 300);

      const loadMoreDecision = getFeedLoadMoreDecision({
        distanceToBottom: scrollHeight - scrollTop - clientHeight,
        visibleCount,
        totalCount: orderedPostsRef.current.length,
        hasMorePosts,
        isLoadingMorePosts,
        requestInFlight: loadMoreInFlightRef.current,
      });
      if (loadMoreDecision.shouldRevealMore) {
        setVisibleCount(prev => Math.min(prev + 6, orderedPostsRef.current.length));
      }
      if (loadMoreDecision.shouldRequestMore && onLoadMorePosts) {
        loadMoreInFlightRef.current = true;
        void (async () => {
          try {
            await onLoadMorePosts();
          } catch {
            window.dispatchEvent(new CustomEvent('toast', { detail: 'Could not load more posts. Please try again.' }));
          } finally {
            loadMoreInFlightRef.current = false;
          }
        })();
      }

      const diff = scrollTop - lastScrollTopRef.current;
      if (scrollTop <= 15) {
        if (!isHeaderExpandedRef.current) {
          isHeaderExpandedRef.current = true;
          setIsHeaderExpanded(true);
        }
      } else if (diff > 12 && scrollTop > 60) {
        if (isHeaderExpandedRef.current) {
          isHeaderExpandedRef.current = false;
          setIsHeaderExpanded(false);
        }
      } else if (diff < -12) {
        if (!isHeaderExpandedRef.current) {
          isHeaderExpandedRef.current = true;
          setIsHeaderExpanded(true);
        }
      }
      lastScrollTopRef.current = Math.max(0, scrollTop);
    };

    const container = scrollContainerRef.current;
    container?.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container?.removeEventListener('scroll', handleScroll);
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [onLoadMorePosts, hasMorePosts, isLoadingMorePosts, visibleCount]);

  // Restore scroll position on load and activeTab change back to 'feed'
  useEffect(() => {
    if (activeTab === 'feed') {
      const savedPos = localStorage.getItem(`nexora_feed_scroll_pos_${currentUser.id}`);
      if (savedPos && scrollContainerRef.current) {
        const timer = setTimeout(() => {
          if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = Number(savedPos);
          }
        }, 150);
        return () => clearTimeout(timer);
      }
    }
  }, [activeTab]);

  // Track previous activeTab to save scroll position right before/during tab switch
  const prevActiveTabRef = useRef(activeTab);
  
  useEffect(() => {
    if (prevActiveTabRef.current === 'feed' && activeTab !== 'feed') {
      if (scrollContainerRef.current) {
        localStorage.setItem(`nexora_feed_scroll_pos_${currentUser.id}`, String(scrollContainerRef.current.scrollTop));
      }
    }
    prevActiveTabRef.current = activeTab;
  }, [activeTab]);

  // Apply pending background posts smoothly
  const handleApplyPendingPosts = () => {
    if (pendingPosts.length > 0) {
      setLocalPosts(prev => [...pendingPosts, ...prev]);
      setPendingPosts([]);
      setVisibleCount(8);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Feed updated with latest background activities!' }));
    }
  };

  // Pull-to-refresh fetches persisted content; it never reorders or fabricates posts.
  const triggerRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    void (async () => {
      try {
        if (!onRefreshFeed) throw new Error('Feed refresh is unavailable.');
        await onRefreshFeed();
        setVisibleCount(8);
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
        }
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Feed refreshed.' }));
      } catch {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Could not refresh the feed. Your current posts are still here. Please retry.' }));
      } finally {
        setIsRefreshing(false);
        setPullState('idle');
        setPullY(0);
      }
    })();
  };

  // Sparks trigger handler
  const handleSpark = (postId: string) => {
    onLikePost(postId);
    trackClientObservation({ eventType: 'meaningful_interaction', entityType: 'post', entityId: postId, properties: { interaction: 'spark_observed' } });
    const post = localPosts.find(p => p.id === postId);
    if (post) {
      recordAndPersistRecommendationEvent('spark', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username, communityName: post.communityName });
    }
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const isLiked = !p.isLikedByUser;
        return {
          ...p,
          isLikedByUser: isLiked,
          likes: isLiked ? p.likes + 1 : p.likes - 1
        };
      }
      return p;
    }));
  };

  // Publish scheduled post now
  const handlePublishScheduledPostNow = (postId: string) => {
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, scheduledTime: undefined };
      }
      return p;
    }));
    window.dispatchEvent(new CustomEvent('toast', { detail: '🚀 Post published immediately!' }));
  };

  // Save edited post content and record to edit history
  const handleSaveEditPost = (postId: string) => {
    if (!editingPostContent.trim()) return;
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const history = p.editHistory ? [...p.editHistory] : [];
        history.push({
          content: p.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString()
        });
        return {
          ...p,
          content: editingPostContent,
          editHistory: history
        };
      }
      return p;
    }));
    setEditingPostId(null);
    setEditingPostContent('');
    window.dispatchEvent(new CustomEvent('toast', { detail: '✏️ Post updated & history preserved!' }));
  };

  // Handle emoji reactions on Broadcast posts
  const handleBroadcastReaction = (postId: string, emoji: string) => {
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const reactions = p.broadcastReactions ? { ...p.broadcastReactions } : { '🔥': 0, '🙌': 0, '⚡': 0, '🏆': 0 };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return {
          ...p,
          broadcastReactions: reactions
        };
      }
      return p;
    }));
    window.dispatchEvent(new CustomEvent('toast', { detail: `🙌 Reacted with ${emoji} to update!` }));
  };

  // Spark / Like status toggle for comments
  const handleSparkComment = (postId: string, commentId: string) => {
    const comment = localPosts.find(post => post.id === postId)?.comments.find(item => item.id === commentId);
    if (!comment) return;
    window.dispatchEvent(new CustomEvent('nexora-spark-comment', {
      detail: { postId, commentId, desiredLiked: !comment.isLikedByUser }
    }));
  };

  // Bookmark / Save handler
  const handleSave = (postId: string) => {
    onBookmarkPost(postId);
    const post = localPosts.find(p => p.id === postId);
    if (post) {
      recordAndPersistRecommendationEvent('save', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username, communityName: post.communityName });
    }
    trackClientObservation({ eventType: 'save', entityType: 'post', entityId: postId });
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return { ...p, isBookmarkedByUser: !p.isBookmarkedByUser };
      }
      return p;
    }));
  };

  // Adding comment handler
  const handleAddCommentSubmit = (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;
    
    // Parent Sync
    onAddComment(postId, content);
    trackClientObservation({ eventType: 'meaningful_interaction', entityType: 'post', entityId: postId, properties: { interaction: 'comment_observed' } });

    const post = localPosts.find(p => p.id === postId);
    if (post) {
      recordAndPersistRecommendationEvent('comment', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username, communityName: post.communityName });
    }

    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
  };

  // Thread reply submission
  const handleAddReplySubmit = (postId: string, commentId: string) => {
    const content = replyInputs[commentId]?.trim();
    if (!content) return;

    const newReply: ThreadReply = {
      id: `reply-new-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      name: currentUser.name,
      avatar: currentUser.avatar,
      content,
      timestamp: "Just now"
    };

    window.dispatchEvent(new CustomEvent('nexora-add-reply', {
      detail: { postId, commentId, replyContent: content, replyId: typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `reply-${Date.now()}-${Math.random().toString(36).slice(2)}` }
    }));

    setReplyInputs(prev => ({ ...prev, [commentId]: '' }));
    setActiveReplyFieldId(null);
  };

  // Float post compose action
  const handleComposeSubmit = () => {
    if (!composerText.trim()) return;

    const tags = composerText.match(/#\w+/g)?.map(t => t.replace('#', '')) || ["NEXORA"];

    onAddPost(composerText, composerImgUrl || undefined, tags.join(','));

    // Reset Composer
    setComposerText('');
    setComposerImgUrl('');
    setComposerCommunityName('');
    setComposerLocation('');
    setComposerReward('');
    setComposerOpen(false);
  };


  // Recommendation Explanation
  const getRecommendationExplanation = (postItem: RefactoredPost) => {
    try {
      const savedProfile = localStorage.getItem('nexora_recommendation_profile');
      let profile = { tags: {} as Record<string, number>, creators: {} as Record<string, number>, communities: {} as Record<string, number> };
      if (savedProfile) {
        profile = JSON.parse(savedProfile);
      }
      const reasons: string[] = [];
      
      let maxTag = '';
      let maxTagScore = -999;
      (postItem.tags || []).forEach(t => {
        const clean = t.toLowerCase().replace('#', '').trim();
        if (profile.tags && profile.tags[clean] !== undefined && profile.tags[clean] > maxTagScore) {
          maxTagScore = profile.tags[clean];
          maxTag = t;
        }
      });
      
      if (maxTagScore > 3) {
        reasons.push(`Your local preference profile shows interest in the topic #${maxTag} (affinity: +${maxTagScore}).`);
      }
      
      const creatorScore = (profile.creators && (profile.creators[postItem.userId] || profile.creators[postItem.username])) || 0;
      if (creatorScore > 3) {
        reasons.push(`Your local preference profile shows previous interaction with @${postItem.username} (affinity: +${creatorScore}).`);
      }
      
      if (reasons.length === 0) {
        if (postItem.isVerified) {
          reasons.push("This item is from a verified creator and is eligible for the current feed.");
        } else {
          reasons.push(`This item is eligible for the ${feedTab} feed based on its current post metadata and your active feed controls.`);
        }
      }
      
      return reasons;
    } catch (e) {
      return [`This item is eligible for the ${feedTab} feed based on the data currently available on this device.`];
    }
  };

  // Undo Recent Choice
  const handleUndoRecentChoice = () => {
    if (!lastAction) return;
    
    if (lastAction.type === 'not_interested') {
      if (lastAction.data.tags && lastAction.data.tags.length > 0) {
        const tagToUnmute = lastAction.data.tags[0];
        setNotInterestedTags(prev => prev.filter(t => t !== tagToUnmute));
      }
      setHiddenPostIds(prev => prev.filter(id => id !== lastAction.postId));
    } else if (lastAction.type === 'mute_creator') {
      setMutedCreatorIds(prev => prev.filter(id => id !== lastAction.data.creatorId));
    } else if (lastAction.type === 'hide_post') {
      setHiddenPostIds(prev => prev.filter(id => id !== lastAction.postId));
    }
    
    setLastAction(null);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🔄 Successfully reverted recent recommendation preference!' }));
  };

  const handleResetRecommendations = () => {
    const reset = resetFeedPreferences({
      tab: feedTab,
      notInterestedTags,
      blockedCreatorIds: blockedUserIds,
      mutedCreatorIds,
      hiddenPostIds,
      seenPostIds: [],
    });
    setNotInterestedTags(reset.notInterestedTags);
    setBlockedUserIds(reset.blockedCreatorIds);
    setMutedCreatorIds(reset.mutedCreatorIds);
    setHiddenPostIds(reset.hiddenPostIds);
    resetRecommendationProfile();
    if (auth.currentUser?.uid === currentUser.id) {
      void SettingsService.updateFeed(currentUser.id, { recommendationSignals: reset.recommendationSignals });
    }
    try {
      sessionStorage.removeItem(`nexora_viewed_posts_${encodeURIComponent(auth.currentUser?.uid || 'guest')}`);
    } catch {
      // Session storage may be disabled; durable controls are still reset.
    }
    setRecommendationsVersion(version => version + 1);
    window.dispatchEvent(new CustomEvent('nexora-recommendations-updated'));
    window.dispatchEvent(new CustomEvent('toast', {
      detail: 'Recommendation controls reset. Your follows, posts, messages, and account were not changed.',
    }));
  };

  const handlePullEnd = () => {
    if (pullStartYRef.current !== null) {
      pullStartYRef.current = null;
      if (pullY > 50) {
        setPullState('refreshing');
        setPullY(50);
        if (navigator.vibrate) navigator.vibrate([30]);
        triggerRefresh();
      } else {
        setPullState('idle');
        setPullY(0);
      }
    }
    isMouseDownRef.current = false;
  };

  // Search filter options
  const filteredPosts = useMemo(() => localPosts.filter(post => {
    // 0. Filter out archived posts
    if (post.isArchived) return false;

    // 1. Core moderation overrides
    if (hiddenPostIds.includes(post.id)) return false;
    if (blockedUserIds.includes(post.userId)) return false;
    if (mutedUserIds.includes(post.userId)) return false;
    if (mutedCreatorIds.includes(post.userId)) return false;
    if (post.tags.some(t => notInterestedTags.includes(t))) return false;

    // 2. Prevent scheduled posts in the future from being visible to others
    if (post.scheduledTime) {
      const isFuture = new Date(post.scheduledTime).getTime() > Date.now();
      if (isFuture) {
        // Keep secret from other users
        if (post.userId !== currentUser.id) return false;
      }
    }

    // 3. Handle Broadcast Posts routing
    if ((feedTab as string) === 'broadcast') {
      if (!post.isBroadcastPost) return false;
    } else {
      if (post.isBroadcastPost) return false;
    }

    // 4. Saved Collections Filter: if activeCollectionFolder is set, only show posts contained in that collection
    if (activeCollectionFolder) {
      const allowedIds = savedCollections[activeCollectionFolder] || [];
      if (!allowedIds.includes(post.id)) return false;
    }

    // Quality filtration logic
    if (qualityFilter && post.isSpamBot) {
      return false;
    }

    // Tab indexing logic
    if (feedTab === 'following') {
      const isPostFromFollowed = followingIds.includes(post.userId) || post.userId === currentUser.id;
      if (!isPostFromFollowed) return false;
    } else if (feedTab === 'friends') {
      // Friends: standard non-institutional users we follow
      const isPostFromFriend = (friendIds.includes(post.userId) && post.userId !== 'user-0' && post.username !== 'voh_ai' && post.username !== 'nexora_ai') || post.userId === currentUser.id;
      if (!isPostFromFriend) return false;
    } else if (feedTab === 'trending') {
      // Trending: highly interactive posts and system updates
      const engagement = (post.likes || 0) + (post.commentsCount || 0) * 3 + (post.shares || 0) * 5;
      const isHot = engagement > 15 || post.isVerified || post.isBroadcastPost;
      if (!isHot) return false;
    }

    // Query text match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchText = post.content.toLowerCase().includes(q) || post.name.toLowerCase().includes(q) || post.username.toLowerCase().includes(q) || post.tags.some(t => t.toLowerCase().includes(q)) || (post.communityName && post.communityName.toLowerCase().includes(q));
      if (!matchText) return false;
    }

    // Search Engine 2.0 Filter Types
    if (searchFilterType === 'videos') {
      if (!post.videoUrl) return false;
    } else if (searchFilterType === 'voice') {
      if (!post.isVoice && !post.content.includes("voice")) return false;
    } else if (searchFilterType === 'communities') {
      if (!post.communityName) return false;
    } else if (searchFilterType === 'pulse') {
      if (post.category !== 'pulse' && !post.location) return false;
    } else if (searchFilterType === 'users') {
      const q = searchQuery.toLowerCase();
      if (searchQuery.trim()) {
        const userMatch = post.name.toLowerCase().includes(q) || post.username.toLowerCase().includes(q);
        if (!userMatch) return false;
      }
    } else if (searchFilterType === 'hashtags') {
      const q = searchQuery.toLowerCase().replace('#', '');
      if (searchQuery.trim()) {
        const tagMatch = post.tags.some(t => t.toLowerCase().includes(q));
        if (!tagMatch) return false;
      }
    }

    // Hashtag match from sidebar / top trend clicks
    if (selectedTag) {
      if (!post.tags.includes(selectedTag)) return false;
    }

    return true;
  }), [
    localPosts,
    hiddenPostIds,
    blockedUserIds,
    mutedUserIds,
    mutedCreatorIds,
    notInterestedTags,
    currentUser.id,
    followingIds,
    feedTab,
    activeCollectionFolder,
    savedCollections,
    qualityFilter,
    searchQuery,
    searchFilterType,
    selectedTag,
  ]);

  // Score analyzer for "For You" Feed ranking
  const getMediaTypeScore = (postItem: any) => {
    const isReel = postItem.videoUrl && (postItem.tags?.includes('reels') || postItem.tags?.includes('reel') || postItem.content.toLowerCase().includes('#reel') || postItem.content.toLowerCase().includes('#reels'));
    const isVideo = postItem.videoUrl && !isReel;
    const isPhoto = !!postItem.image || (!!postItem.images && postItem.images.length > 0);
    const isVoice = !!postItem.isVoice;

    if (isVideo) return 50000;
    if (isReel) return 40000;
    if (isPhoto) return 30000;
    if (isVoice) return 20000;
    return 10000;
  };

  const getRankedPosts = () => {
    let list = [...filteredPosts];

    // Empty Feed Protection: If the Posts feed is empty but there are posts on the platform,
    // fallback to public posts that are not blocked or hidden, ensuring the feed is never blank.
    if (feedTab === 'posts' && list.length === 0 && localPosts.length > 0) {
      const fallbackList = localPosts.filter(post => {
        if (hiddenPostIds.includes(post.id)) return false;
        if (blockedUserIds.includes(post.userId)) return false;
        if (mutedUserIds.includes(post.userId)) return false;
        if (mutedCreatorIds.includes(post.userId)) return false;
        return !post.isBroadcastPost;
      });
      if (fallbackList.length > 0) {
        list = fallbackList;
      }
    }

    // Apply Sorting Filters from Search Engine 2.0
    if (sortBy === 'latest') {
      // Keep feed flow chronological / base sorting
    } else if (sortBy === 'popular') {
      list.sort((a, b) => {
        const scoreA = a.likes + a.shares * 3 + a.comments.length * 2;
        const scoreB = b.likes + b.shares * 3 + b.comments.length * 2;
        return scoreB - scoreA;
      });
    } else if (sortBy === 'nearby') {
      list.sort((a, b) => {
        const hasLocA = a.location ? 1 : 0;
        const hasLocB = b.location ? 1 : 0;
        return hasLocB - hasLocA;
      });
    }

    // Apply Posts Engagement boost only if not strictly sorted or in specialized feeds
    const sorted = (() => {
      let sortedList = [...list];
      if (feedTab === 'posts' || feedTab === 'trending') {
        let viewedPostIds: string[] = [];
        try {
          const rawViewed = sessionStorage.getItem(`nexora_viewed_posts_${encodeURIComponent(auth.currentUser?.uid || 'guest')}`);
          const parsedViewed = rawViewed ? JSON.parse(rawViewed) : [];
          viewedPostIds = Array.isArray(parsedViewed) ? parsedViewed.filter((id): id is string => typeof id === 'string') : [];
        } catch {
          viewedPostIds = [];
        }
        sortedList = rankPosts(sortedList, {
          followingIds,
          interestDNA: recommendationsPersonalizationEnabled ? currentUser.interestDNA : undefined,
          recommendationSignals: recommendationsPersonalizationEnabled ? getRecommendationProfile() : undefined,
          mutedCreatorIds,
          blockedCreatorIds: blockedUserIds,
          hiddenPostIds,
          notInterestedTags,
          seenPostIds: viewedPostIds,
          mode: feedTab === 'trending' ? 'trending' : 'forYou',
          maxPostsPerCreator: 3,
        }).map(({ post }) => post);
      }

      if (feedTab === 'posts') {
        // Dynamic Interleaving Pass with Creator Diversity to mix content types and avoid grouping creators
        const mixed: RefactoredPost[] = [];
        const remaining = [...sortedList];
        
        while (remaining.length > 0) {
          const lastItem = mixed[mixed.length - 1];
          let nextIdx = -1;
          
          if (lastItem) {
            const lastIsVideo = !!lastItem.videoUrl;
            const lastIsVoice = !!lastItem.isVoice;
            const lastIsPhoto = !!lastItem.image || (lastItem.images && lastItem.images.length > 0);
            const lastIsPoll = !!(lastItem.interactivePoll || lastItem.content.toLowerCase().includes('poll'));
            const lastIsText = !lastIsVideo && !lastIsVoice && !lastIsPhoto && !lastIsPoll;
            const lastUserId = lastItem.userId;
            
            // Search for an item that has different mediaType AND different creator
            nextIdx = remaining.findIndex(item => {
              const itemIsVideo = !!item.videoUrl;
              const itemIsVoice = !!item.isVoice;
              const itemIsPhoto = !!item.image || (item.images && item.images.length > 0);
              const itemIsPoll = !!(item.interactivePoll || item.content.toLowerCase().includes('poll'));
              const itemIsText = !itemIsVideo && !itemIsVoice && !itemIsPhoto && !itemIsPoll;
              
              const isSameCreator = item.userId === lastUserId;
              if (isSameCreator) return false; // Force Creator Diversity

              if (lastIsVideo && itemIsVideo) return false;
              if (lastIsVoice && itemIsVoice) return false;
              if (lastIsPhoto && itemIsPhoto) return false;
              if (lastIsPoll && itemIsPoll) return false;
              if (lastIsText && itemIsText) return false;
              return true;
            });

            // If none matches both, fallback to different mediaType only
            if (nextIdx === -1) {
              nextIdx = remaining.findIndex(item => {
                const itemIsVideo = !!item.videoUrl;
                const itemIsVoice = !!item.isVoice;
                const itemIsPhoto = !!item.image || (item.images && item.images.length > 0);
                const itemIsPoll = !!(item.interactivePoll || item.content.toLowerCase().includes('poll'));
                const itemIsText = !itemIsVideo && !itemIsVoice && !itemIsPhoto && !itemIsPoll;
                
                if (lastIsVideo && itemIsVideo) return false;
                if (lastIsVoice && itemIsVoice) return false;
                if (lastIsPhoto && itemIsPhoto) return false;
                if (lastIsPoll && itemIsPoll) return false;
                if (lastIsText && itemIsText) return false;
                return true;
              });
            }

            // Fallback to different creator only
            if (nextIdx === -1) {
              nextIdx = remaining.findIndex(item => item.userId !== lastUserId);
            }
          }
          
          // Absolute fallback: pick the very next item in sorted order
          if (nextIdx === -1) {
            nextIdx = 0;
          }
          
          mixed.push(remaining[nextIdx]);
          remaining.splice(nextIdx, 1);
        }

        return mixed;
      } else if (feedTab === 'following') {
        // Keep Following feed behavior as standard/undisturbed but support basic interleaving
        const mixed: RefactoredPost[] = [];
        const remaining = [...sortedList];
        while (remaining.length > 0) {
          mixed.push(remaining[0]);
          remaining.splice(0, 1);
        }
        return mixed;
      } else if (feedTab === 'reels') {
        // Reels use short-form signals instead of the long-form media mixer.
        // The ranking utility keeps the reasons explainable and deterministic.
        return rankReels(sortedList, followingIds, recommendationsPersonalizationEnabled ? currentUser.interestDNA : {}, {
          mutedCreatorIds, blockedCreatorIds: blockedUserIds, hiddenPostIds, notInterestedTags,
          viewerId: currentUser.id,
        }).map(({ post }) => post as RefactoredPost);
      }
      return sortedList;
    })();

    return sorted;
  };

  // State to hold the stable cached/rendered posts list to prevent re-sorting on engagement updates
  const [orderedPosts, setOrderedPosts] = useState<RefactoredPost[]>([]);
  orderedPostsRef.current = orderedPosts;
  const lastStateKeyRef = useRef<string>('');

  useEffect(() => {
    // Generate a unique state key representing current filters & tab selection
    const stateKey = [
      feedTab,
      sortBy,
      searchFilterType,
      searchQuery,
      selectedTag,
      activeCollectionFolder,
      qualityFilter
    ].join('|');
    
    const hasFiltersChanged = stateKey !== lastStateKeyRef.current;
    lastStateKeyRef.current = stateKey;

    setOrderedPosts(currentOrdered => {
      // If we already have ordered posts and the main filters haven't changed,
      // we only update existing post content (likes, comments, isLikedByUser, etc.)
      // in place to prevent layout shifting or re-ranking during interaction!
      if (currentOrdered.length > 0 && !hasFiltersChanged) {
        const existingIdsOrder = currentOrdered.map(p => p.id);
        const updatedOrdered = existingIdsOrder.map(id => {
          const freshPost = localPosts.find(p => p.id === id);
          const oldPost = currentOrdered.find(p => p.id === id);
          return freshPost || oldPost!;
        }).filter(Boolean) as RefactoredPost[];
        
        // Also prepend any brand-new posts (e.g. if the current user just added a post, or we applied pending posts)
        // without disturbing the rest of the list
        const currentOrderedIds = new Set(existingIdsOrder);
        const brandNewPosts = localPosts.filter(p => !currentOrderedIds.has(p.id));
        if (brandNewPosts.length > 0) {
          return [...brandNewPosts, ...updatedOrdered];
        }
        
        return updatedOrdered;
      }

      // Otherwise, perform the full filtering, sorting and interleaving pass
      return getRankedPosts();
    });
  }, [localPosts, feedTab, sortBy, searchFilterType, searchQuery, selectedTag, activeCollectionFolder, qualityFilter, recommendationsPersonalizationEnabled, recommendationsVersion, currentUser.id, currentUser.interestDNA]);

  const currentDisplayList = useMemo(() => orderedPosts.slice(0, visibleCount), [orderedPosts, visibleCount]);
  const activePostIndex = useMemo(
    () => currentDisplayList.findIndex(post => post.id === activePostId),
    [currentDisplayList, activePostId],
  );
  const videoPosts = useMemo(
    () => currentDisplayList.filter(post => Boolean(post.videoUrl)),
    [currentDisplayList],
  );
  const activeVideoIndex = useMemo(
    () => videoPosts.findIndex(post => post.id === activePostId),
    [videoPosts, activePostId],
  );
  const [isConnectionSlow, setIsConnectionSlow] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    return Boolean(connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType));
  });
  const [isConstrainedDevice] = useState(() => {
    if (typeof navigator === 'undefined') return false;
    return getDevicePerformanceProfile({
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
    }).constrained;
  });

  // Network Information can change while the feed is open (for example,
  // switching between Wi-Fi and mobile data). Keep preload decisions current.
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const updateConnectionQuality = () => {
      setIsConnectionSlow(Boolean(
        connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType),
      ));
    };
    updateConnectionQuality();
    connection?.addEventListener?.('change', updateConnectionQuality);
    return () => connection?.removeEventListener?.('change', updateConnectionQuality);
  }, []);

  // Active Post Viewport Detection using IntersectionObserver
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    // Keep playback usable in older webviews without IntersectionObserver.
    if (typeof IntersectionObserver === 'undefined') {
      const fallbackPost = currentDisplayList.find(post => Boolean(post.videoUrl)) || currentDisplayList[0];
      setActivePostId(fallbackPost?.id ?? null);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0;
        let bestPostId: string | null = null;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            bestPostId = entry.target.getAttribute('data-post-id');
          }
        });
        if (bestPostId) {
          setActivePostId(bestPostId);
          return;
        }

        // Do not leave an offscreen video marked active while the next card
        // is still crossing the visibility threshold.
        const activePostExited = entries.some(entry =>
          entry.target.getAttribute('data-post-id') === activePostIdRef.current
          && (!entry.isIntersecting || entry.intersectionRatio < 0.3)
        );
        if (activePostExited) setActivePostId(null);
      },
      {
        root: container,
        threshold: [0.3, 0.6, 0.9],
      }
    );

    const postElements = container.querySelectorAll('[data-post-id]');
    postElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, [currentDisplayList]);

  // Settle detector (stops predictive loading to save bandwidth if paused on a post)
  useEffect(() => {
    setUserSettled(false);
    const settleTimer = setTimeout(() => {
      setUserSettled(true);
    }, 4000); // User stays on a post for 4 seconds, consider settled (saves bandwidth)
    return () => clearTimeout(settleTimer);
  }, [activePostId]);

  // Scroll speed/velocity detector (predictively triggers prefetching of next-next post if scrolling quickly)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let lastScrollTop = container.scrollTop;
    let lastTime = Date.now();
    let scrollFastTimer: any = null;

    const handleScrollSpeed = () => {
      const now = Date.now();
      const currentScrollTop = container.scrollTop;
      const dt = now - lastTime;
      const dy = Math.abs(currentScrollTop - lastScrollTop);

      if (dt > 0) {
        const velocity = dy / dt; // pixels per millisecond
        if (velocity > 1.2) {
          setIsScrollingFast(true);
          
          if (scrollFastTimer) clearTimeout(scrollFastTimer);
          scrollFastTimer = setTimeout(() => {
            setIsScrollingFast(false);
          }, 400); // Stay in fast scroll mode for 400ms after last fast scroll event
        }
      }

      lastScrollTop = currentScrollTop;
      lastTime = now;
    };

    container.addEventListener('scroll', handleScrollSpeed, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScrollSpeed);
      if (scrollFastTimer) clearTimeout(scrollFastTimer);
    };
  }, []);

  // Suggested item creators
  const suggestedCommunities = [
    { name: "🏟 Football Nigeria", members: "12,420 members", desc: "Nigerian football discussions, daily matches and player analysis." },
    { name: "🏟 Lagos Foodies", members: "4,110 members", desc: "Discovering the best local restaurants and recipes in Lagos." },
    { name: "🎓 Afrobeat Jams", members: "1,840 members", desc: "Conversations on the finest Afrobeat songs and artists." }
  ];

  const suggestedUsers = creators.filter(c => c.id !== currentUser.id && c.id !== 'user-0').slice(0, 4);

  // Theme-aware backdrop container style for the fixed/overlay top navigation
  const getHeaderOverlayClass = () => {
    switch (theme) {
      case 'neon-cyber': return 'bg-[#050409]/80 border-b border-white/10 text-purple-100';
      case 'emerald-glass': return 'bg-[#010403]/80 border-b border-emerald-950/40 text-emerald-100';
      case 'platinum-light': return 'bg-white/80 border-b border-slate-200 text-slate-900';
      case 'stealth-dark':
      default: return 'bg-zinc-950/80 border-b border-zinc-800/40 text-zinc-100';
    }
  };

  return (
    <div className="nx-feed-stage flex flex-col h-full w-full relative overflow-hidden min-h-0">
      
      {/* Floating Pill for Pending background posts */}
      <AnimatePresence>
        {feedTab === 'reels' && (
          <ImmersiveVideoViewer
            initialPost={currentDisplayList.find(p => p.videoUrl) || currentDisplayList[0]}
            creatorPosts={currentDisplayList}
            currentUser={currentUser}
            onClose={() => setFeedTab('posts')}
            onLikePost={onLikePost}
            onToggleFollow={onToggleFollow}
            followingIds={followingIds}
            onAddComment={onAddComment}
          />
        )}

        {pendingPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 12, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            className="absolute top-28 md:top-20 left-1/2 z-50 pointer-events-auto"
          >
            <button
              onClick={handleApplyPendingPosts}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-mono font-bold shadow-lg shadow-violet-950/50 border border-violet-400/20 cursor-pointer backdrop-blur-md transition-all uppercase tracking-widest"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-300 animate-pulse shrink-0" />
              <span>{pendingPosts.length} New {pendingPosts.length === 1 ? 'Post' : 'Posts'} available</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>



      {/* 5. MAIN FEED CONTENT STREAM (With pull-to-refresh & infinite scroll) */}
      <div 
        ref={scrollContainerRef}
        onMouseDown={(e) => {
          if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0 && pullState === 'idle') {
            pullStartYRef.current = e.clientY;
            isMouseDownRef.current = true;
          }
        }}
        onMouseMove={(e) => {
          if (isMouseDownRef.current && pullStartYRef.current !== null) {
            const diffY = e.clientY - pullStartYRef.current;
            if (diffY > 0) {
              const elasticY = Math.min(100, diffY * 0.4);
              setPullY(elasticY);
              setPullState('pulling');
            }
          }
        }}
        onMouseUp={handlePullEnd}
        onMouseLeave={handlePullEnd}
        onTouchStart={(e) => {
          if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0 && pullState === 'idle') {
            pullStartYRef.current = e.touches[0].clientY;
          }
        }}
        onTouchMove={(e) => {
          if (pullStartYRef.current !== null) {
            const diffY = e.touches[0].clientY - pullStartYRef.current;
            if (diffY > 0) {
              const elasticY = Math.min(100, diffY * 0.4);
              setPullY(elasticY);
              setPullState('pulling');
              if (e.cancelable) e.preventDefault();
            }
          }
        }}
        onTouchEnd={handlePullEnd}
        className="w-full h-full overflow-y-auto custom-scrollbar scroll-smooth relative touch-pan-y pb-24 lg:pb-6"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* STAGE 1 — HOME FEED NAVIGATION HEADER */}
        <div className="nx-feed-header sticky top-0 z-30 backdrop-blur-xl border-b border-white/10">
          {/* Brand row */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-7 pt-2.5 pb-1 sm:pt-4 sm:pb-2">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <NexoraPremiumLogo className="h-10 w-10 sm:h-11 sm:w-11 nx-brand-mark drop-shadow-[0_0_6px_rgba(167,139,250,0.3)]" />
              <div className="min-w-0">
                <div className="flex items-center gap-2"><span className="text-xl font-extrabold tracking-[-0.04em] nx-gradient-text leading-none sm:text-2xl">NEXORA</span><span className="hidden rounded-full border border-violet-300/20 bg-violet-400/10 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.14em] text-violet-200 sm:inline">For you</span></div>
                <span className="mt-0.5 sm:mt-1 block truncate text-[11px] font-medium text-slate-500">The World&apos;s Living Social Network</span>
              </div>
            </div>
            <span className={`hidden items-center gap-1.5 text-[10px] font-semibold sm:flex ${isOffline ? 'text-amber-300/80' : 'text-emerald-300/80'}`}><span className={`h-1.5 w-1.5 rounded-full ${isOffline ? 'bg-amber-400' : 'bg-emerald-400'}`} />{isOffline ? 'Offline' : currentUser.id === 'guest_visitor_id' || currentUser.username === 'visitor' ? 'Preview feed' : 'Online'}</span>
          </div>
          {/* Categories + utilities row */}
          <div className="flex items-center justify-between gap-1.5 px-3 sm:px-6 py-1 sm:gap-2 sm:py-2">
          {/* Left: Feed Categories (Exact Order: Posts, Following, Friends, Trending, Reels) */}
          <div role="group" aria-label="Feed categories" className="relative flex flex-1 min-w-0 items-center gap-2 sm:gap-7 overflow-x-auto overscroll-x-contain scrollbar-none pr-3 sm:pr-2 py-0.5 sm:py-1 after:pointer-events-none after:content-[''] after:absolute after:right-0 after:top-0 after:bottom-0 after:w-5 after:bg-gradient-to-l after:from-zinc-950/90 after:to-transparent sm:after:hidden">
            {([
              { id: 'posts', label: 'For You' },
              { id: 'following', label: 'Following' },
              { id: 'friends', label: 'Friends' },
              { id: 'trending', label: 'Trending' },
              { id: 'reels', label: 'Reels' }
            ] as const).map(cat => {
              const isActive = feedTab === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setFeedTab(cat.id as any);
                    setVisibleCount(8);
                    trackClientObservation({ eventType: 'feed_mode_selected', eventId: `feed-mode:${cat.id}`, properties: { mode: cat.id } });
                  }}
                  aria-label={cat.label}
                  aria-pressed={isActive}
                  className={`relative py-1.5 sm:py-2.5 px-1 sm:px-1 text-sm sm:text-base font-sans transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[48px] flex items-center justify-center ${
                    isActive ? 'text-white font-extrabold' : 'text-zinc-400 hover:text-zinc-200 font-medium'
                  }`}
                >
                  <span>{cat.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeFeedTab"
                      className="absolute bottom-0 inset-x-0 h-[2.5px] bg-linear-to-r from-violet-500 to-pink-500 rounded-full"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Right: Frequent Destinations & Utility Menu */}
          <div className="flex items-center gap-1 shrink-0">
            {/* VOH AI Quick Trigger */}
            <button
              onClick={() => {
                if (onOpenVohAi) {
                  onOpenVohAi();
                } else {
                  window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'nida' } }));
                }
              }}
              className="hidden sm:inline-flex nx-icon-button text-fuchsia-300"
              title="VOH AI Intelligence"
              aria-label="Open VOH AI"
            >
              <Sparkles className="w-4.5 h-4.5 text-fuchsia-400 group-hover:scale-110 transition-transform" />
            </button>

            {/* Direct Messages Quick Trigger */}
            <button
              onClick={() => {
                if (onOpenMessages) {
                  onOpenMessages();
                } else {
                  window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'inbox' } }));
                }
              }}
              className="relative hidden sm:inline-flex nx-icon-button text-blue-300"
              title="Messages"
              aria-label="Direct Messages"
            >
              <MessageCircle className="w-4.5 h-4.5 text-zinc-300 group-hover:text-blue-300 transition-colors" />
              {unreadMessagesCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[15px] h-3.5 px-0.5 rounded-full bg-blue-500 text-white text-[9px] font-mono font-bold flex items-center justify-center shadow-xs">
                  {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
                </span>
              )}
            </button>

            {/* Universal Search */}
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('openUniversalSearch'));
              }}
              className="hidden sm:inline-flex nx-icon-button"
              title="Search"
              aria-label="Search Nexora"
            >
              <Search className="w-4.5 h-4.5 stroke-[1.75] text-zinc-300" />
            </button>

            <button
              type="button"
              onClick={handleResetRecommendations}
              className="hidden sm:inline-flex nx-icon-button text-violet-300"
              title="Reset recommendation controls"
              aria-label="Reset recommendation controls"
            >
              <RefreshCw className="w-4 h-4 stroke-[1.8]" />
            </button>

            {/* Utility Chevron Menu */}
            <button
              id="nexora-home-chevron-menu-trigger"
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('toggleNavMenu'));
              }}
              className="inline-flex nx-icon-button gap-1 px-2 text-xs font-sans font-medium"
              title="Open Navigation Menu"
              aria-label="Navigation Menu"
            >
              <Menu className="w-4 h-4 stroke-[2.2] text-zinc-200 group-hover:text-violet-300 transition-colors" />
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-violet-400 transition-transform duration-200" />
            </button>
          </div>
          </div>
        </div>

        {/* STAGE 2 — STORIES RAIL + SEARCH */}
        <StoryRail currentUser={currentUser} onRequireAuth={onRequireAuth} onViewProfile={onViewProfile} />
        <div className="px-4 sm:px-6 pb-3">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('openUniversalSearch'))}
            className="nx-field w-full flex items-center gap-2 px-4 text-sm text-zinc-400 hover:border-violet-500/40 transition-colors cursor-pointer"
            aria-label="Search Nexora"
          >
            <Search className="w-4 h-4 text-violet-300" />
            <span>Search Nexora…</span>
          </button>
        </div>

        {/* INLINE CREATE POST COMPOSER */}
        <div className="nx-composer px-4 sm:px-7 py-5 border-b border-white/10 transition-all">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-500/30 shrink-0 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onViewProfile?.(currentUser.id)}
              referrerPolicy="no-referrer"
            />
            <button
              onClick={() => setComposerOpen(true)}
              className="flex-1 text-left py-3 px-5 rounded-2xl nx-field text-slate-400 hover:text-slate-200 text-sm font-sans transition-all cursor-pointer flex items-center justify-between group"
            >
              <span>What&apos;s on your mind, {(currentUser.name || 'there').split(' ')[0]}?</span>
              <Sparkles className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform shrink-0 ml-2" />
            </button>
          </div>
          <div className="flex items-center justify-between pt-3 mt-4 border-t border-white/5 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap">
              <button
                onClick={() => {
                  setComposerCategory('general');
                  setComposerOpen(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-200 transition-colors text-[11px] font-semibold cursor-pointer"
              >
                <span className="text-violet-400">🖼️</span>
                <span>Post</span>
              </button>
              <button
                onClick={() => setFeedTab('reels')}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-200 transition-colors text-[11px] font-semibold cursor-pointer"
              >
                <span className="text-pink-400">🎬</span>
                <span>Reel</span>
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'live' } }))}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-zinc-200 transition-colors text-[11px] font-semibold cursor-pointer"
              >
                <span className="text-cyan-400">🔴</span>
                <span>Live</span>
              </button>
            </div>
            <button
              onClick={() => setComposerOpen(true)}
              className="nx-btn-primary !min-h-9 px-4 text-[11px]"
            >
              Create
            </button>
          </div>
        </div>
        {/* Animated Pull-To-Refresh indicators */}
        <AnimatePresence>
          {pullY > 0 && (
            <motion.div 
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={reduceMotion ? { opacity: 1 } : { height: pullY, opacity: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.16 }}
              className="w-full overflow-hidden flex flex-col items-center justify-center bg-violet-950/20 border-b border-white/10 shrink-0 select-none"
            >
              <div className="flex items-center gap-2 text-violet-300 font-mono text-[10px] uppercase tracking-widest font-extrabold py-2">
                <NexoraLoader size="xs" />
                <span>
                  {pullState === 'refreshing' 
                    ? 'Updating Nexora Feed...' 
                    : pullY > 50 
                      ? 'Release to Refresh' 
                      : 'Pull to Refresh'}
                </span>
              </div>
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mb-2">
                <motion.div 
                  className="h-full bg-linear-to-r from-violet-500 to-pink-400"
                  animate={pullState === 'refreshing' && !reduceMotion ? { x: [-192, 192] } : { width: `${(pullY / 50) * 100}%` }}
                  transition={reduceMotion ? { duration: 0 } : pullState === 'refreshing' ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0.1 }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Offline Cache warning bar */}
        {isOffline && (
          <div className="mx-4 md:mx-0 bg-red-950/80 border border-red-500/20 p-3 rounded-2xl flex items-center justify-between gap-3 text-red-200 shrink-0 font-sans">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
              <div>
                <p className="text-xs font-bold leading-none">ISOLATED CACHE MODE ACTIVE</p>
                <p className="text-[10px] text-red-300 font-mono mt-0.5">Showing cached offline logs. Updates will queue.</p>
              </div>
            </div>
            <span className="text-[9px] font-mono border border-red-500/30 px-2 py-0.5 rounded uppercase font-black tracking-wide bg-red-500/10 shrink-0">OFFLINE</span>
          </div>
        )}
        {/* Selected Tag Active Indicator (Moved inside scroll) */}
        {selectedTag && (
          <div className="shrink-0 flex items-center justify-between bg-violet-600/10 border border-white/10 px-3 py-1.5 rounded-xl mx-4 md:mx-0">
            <span className="text-xs font-mono text-violet-300">Filtering tags containing: <strong className="text-white">#{selectedTag}</strong></span>
            <button onClick={() => setSelectedTag(null)} className="text-violet-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hydration / Empty feed state */}
        {!isHydrated ? (
          <FeedHydrationSkeleton />
        ) : currentDisplayList.length === 0 && (
          <div className="p-6 md:p-8 rounded-3xl bg-[#09071c]/50 border border-white/10 text-center py-10 space-y-6 mx-4 md:mx-0 relative overflow-hidden">
            {/* Glowing aesthetic backdrop lights */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl" />
            
            <div className="space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-violet-600 to-pink-500 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/10">
                <Globe className="w-6 h-6 text-white animate-pulse" />
              </div>
              <h4 className="text-base font-sans font-extrabold text-white tracking-wide">{localPosts.length === 0 ? 'No posts yet' : 'No posts match these filters'}</h4>
              <p className="text-xs text-violet-300/80 max-w-md mx-auto leading-relaxed">
                {localPosts.length === 0
                  ? 'There is currently no content here. Create a post to get the conversation started.'
                  : 'Try another search or clear your search, filters, or selected tag to see more posts.'}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 relative z-10">
              {localPosts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedTag(null);
                    setSearchFilterType('all');
                    setActiveCollectionFolder(null);
                    setQualityFilter(false);
                  }}
                  className="px-5 py-2.5 border border-white/15 hover:bg-white/5 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
                >Clear search & filters</button>
              )}
              {localPosts.length === 0 && <button
                onClick={() => setComposerOpen(true)}
                className="px-5 py-2.5 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all hover:shadow-lg hover:shadow-violet-500/20 active:scale-95"
              >
                + Create your first post
              </button>}
            </div>
            {localPosts.length === 0 && creators.filter(creator => creator?.id && creator.id !== currentUser.id && !followingIds.includes(creator.id)).length > 0 && (
              <section className="relative z-10 mx-auto max-w-xl space-y-3 text-left" aria-label="Suggested creators to follow">
                <div>
                  <h5 className="text-sm font-bold text-white">Find people to follow</h5>
                  <p className="mt-1 text-xs text-zinc-400">These are registered Nexora accounts. Follow someone to personalize your feed.</p>
                </div>
                <div className="space-y-2">
                  {creators.filter(creator => creator?.id && creator.id !== currentUser.id && !followingIds.includes(creator.id)).slice(0, 3).map(creator => (
                    <div key={creator.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
                      <button type="button" onClick={() => onViewProfile?.(creator.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-label={`View ${creator.name}'s profile`}>
                        <img src={creator.avatar} alt="" loading="lazy" className="h-10 w-10 rounded-full border border-white/10 object-cover" referrerPolicy="no-referrer" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">{creator.name}</span>
                          <span className="block truncate text-xs text-violet-300">@{creator.username}</span>
                        </span>
                      </button>
                      <button type="button" onClick={() => onToggleFollow?.(creator.id)} className="min-h-11 shrink-0 rounded-lg border border-violet-400/40 px-3 text-xs font-bold text-violet-200 hover:bg-violet-500/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300" aria-label={`Follow ${creator.name}`}>
                        Follow
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Profile Searchability Section */}
        {(() => {
          const isSearchingUsers = searchFilterType === 'users';
          const query = searchQuery.trim().toLowerCase();
          const realUsersList = (creators || []).filter(c => c && c.id && c.id !== currentUser.id);
          const matchingUsers = query
            ? realUsersList.filter(u => 
                (u.name || '').toLowerCase().includes(query) || 
                (u.username || '').toLowerCase().includes(query) ||
                (u.bio || '').toLowerCase().includes(query)
              )
            : (isSearchingUsers ? realUsersList : []);

          if (isSearchingUsers && matchingUsers.length === 0) {
            return (
              <div className="p-8 rounded-3xl bg-[#09071c]/50 border border-white/10 text-center py-12 space-y-4">
                <span className="text-3xl select-none">👥</span>
                <h4 className="text-sm font-sans font-bold text-violet-100">No members matched your search query.</h4>
                <p className="text-xs text-violet-300/70 max-w-md mx-auto leading-relaxed">
                  Start connecting with real members on Nexora.
                </p>
              </div>
            );
          }

          if (matchingUsers.length > 0 && (isSearchingUsers || query)) {
            return (
              <div className="space-y-3.5 pt-2 pb-3.5 text-left">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#8B5CF6] font-extrabold flex items-center gap-1.5 px-1">
                  👥 Registered Nexora Accounts ({matchingUsers.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {matchingUsers.map(u => (
                    <div 
                      key={u.id}
                      className="p-4 rounded-3xl bg-[#0e0a2b]/95 border border-white/10 hover:border-white/10 shadow-md flex flex-col justify-between transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex gap-3">
                        <img 
                          src={u.avatar} 
                          alt={u.name}
                          className="w-12 h-12 rounded-full object-cover border border-white/10 cursor-pointer shrink-0"
                          onClick={() => onViewProfile?.(u.id)}
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span 
                              onClick={() => onViewProfile?.(u.id)}
                              className="text-sm font-sans font-black text-white hover:text-[#8B5CF6] transition-colors cursor-pointer leading-tight"
                            >
                              {u.name}
                            </span>
                            {u.isVerified && <PurpleVerifiedBadge className="w-4 h-4 shrink-0" />}
                          </div>
                          <span className="text-[10px] text-violet-400 font-mono font-medium block">@{u.username}</span>
                          <p className="text-[11px] text-zinc-300 leading-snug mt-1.5 font-sans line-clamp-2 select-text">{u.bio}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-3 gap-2">
                        <span className="text-[10px] font-mono text-zinc-400 select-none">
                          👥 <strong>{(u.followers || 0).toLocaleString()}</strong> followers
                        </span>
                        <button
                          type="button"
                          onClick={() => onViewProfile?.(u.id)}
                          className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-[9.5px] font-mono font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all"
                        >
                          Profile
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* UNIFIED FEED REFRESH LOADING STATE */}
        {isRefreshing && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
            <NexoraLoader size="lg" center={true} label="Refreshing feed updates..." />
          </div>
        )}

        {/* POST LIST */}
        {!isRefreshing && searchFilterType !== 'users' && currentDisplayList.map((post, index) => {
          const isCommentsOpen = activeCommentsPostId === post.id;

          // ─── INTENSE MEDIA MANAGEMENT AND PREDICTIVE BUFFERING ───
          const hasVideo = !!post.videoUrl;
          const postVideoIndex = videoPosts.findIndex(p => p.id === post.id);
          const preloadPlan = getVideoPreloadPlan({
            isVideo: hasVideo,
            isActive: activePostId === post.id,
            postIndex: index,
            activePostIndex,
            postVideoIndex,
            activeVideoIndex,
            isSlowConnection: isConnectionSlow,
            isConstrainedDevice,
            isOffline,
          });
          const { shouldPreload, isReleased, preloadMode } = preloadPlan;



          return (
            <React.Fragment key={post.id}>
              <FeedPostCard
                post={post}
                index={index}
                isActive={activePostId === post.id}
                activeCommentsPostId={activeCommentsPostId}
                followingIds={followingIds}
                pinnedPostIds={pinnedPostIds}
                shouldPreload={shouldPreload}
                isReleased={isReleased}
                preloadMode={preloadMode}
                currentUser={currentUser}
                activeDotsMenuPostId={activeDotsMenuPostId}
                setActiveDotsMenuPostId={setActiveDotsMenuPostId}
                onImpression={handlePostImpression}
                onSpark={handleSpark}
                onSave={handleSave}
                onSharePost={onSharePost}
                onRepostPost={onRepostPost}
                onQuotePost={postId => { const target = localPosts.find(post => post.id === postId); if (target) { setQuoteTargetPost(target); setQuoteDraft(''); } }}
                onVotePoll={handleVotePoll}
                onCommentToggle={(postId) => setActiveCommentsPostId(activeCommentsPostId === postId ? null : postId)}
                onToggleFollow={onToggleFollow}
                onViewProfile={onViewProfile}
                setActiveVideoFullscreen={setActiveVideoFullscreen}
                setContextualMenuPost={setContextualMenuPost}
                setMutedUserIds={setMutedUserIds}
                setBlockedUserIds={setBlockedUserIds}
                setPinnedPostIds={updatePinnedPostIds}
                setHiddenPostIds={setHiddenPostIds}
                setNotInterestedTags={setNotInterestedTags}
                setMutedCreatorIds={setMutedCreatorIds}
                handlePublishScheduledPostNow={handlePublishScheduledPostNow}
                handleBroadcastReaction={handleBroadcastReaction}
                votedPolls={votedPolls}
                selectedTag={selectedTag}
                setSelectedTag={setSelectedTag}
                setNidaDiagnosticPost={setNidaDiagnosticPost}
                setAnalyticsPost={setAnalyticsPost}
                setReportingPost={setReportingPost}
                setShowSaveToCollectionModalId={setShowSaveToCollectionModalId}
                setViewHistoryPost={setViewHistoryPost}
                editingPostId={editingPostId}
                editingPostContent={editingPostContent}
                setEditingPostId={setEditingPostId}
                setEditingPostContent={setEditingPostContent}
                handleSaveEditPost={handleSaveEditPost}
                expandedPostIds={expandedPostIds}
                setExpandedPostIds={setExpandedPostIds}
              />

                {/* 5. THREADED COMMENTS DRAWER ACCORDION (Floating bottom sheet drawer style) */}
                <AnimatePresence>
                  {isCommentsOpen && (
                    <motion.div
                      initial={{ y: "100%", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: "100%", opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 220 }}
                      className="comments-container absolute bottom-0 inset-x-0 h-[65%] rounded-t-[32px] bg-zinc-950/95 backdrop-blur-xl border-t border-white/10 z-40 flex flex-col p-5 shadow-md overflow-hidden"
                    >
                      {/* Header of Comments drawer */}
                      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3 shrink-0">
                        <span className="text-[10px] font-mono tracking-widest text-violet-400 font-extrabold uppercase flex items-center gap-1.5">
                          💬 Comments ({post.comments.length})
                        </span>
                        <button
                          onClick={() => setActiveCommentsPostId(null)}
                          className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Comments stream scroll */}
                      <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 mb-4 custom-scrollbar">
                        {post.comments.length === 0 && (
                          <p className="text-[11px] font-mono text-violet-300/40 italic py-2 text-center">
                            No comments yet. Start the conversation!
                          </p>
                        )}
                        {post.comments.map((c, commentIndex) => (
                          <div key={c.id} className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2.5">
                            <div className="flex items-start justify-between gap-2 text-xs">
                              <button type="button" onClick={() => onViewProfile?.(c.userId || c.username)} aria-label={`View @${c.username}'s profile`} className="flex min-h-11 items-center gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-2">
                                <img src={c.avatar} alt="" className="w-7 h-7 rounded-lg object-cover" />
                                <span>
                                  <span className="font-sans font-bold text-violet-200 hover:underline">{c.name}</span>
                                  <span className="block text-[10px] font-mono text-violet-400/60 hover:underline">@{c.username} • <RelativeTime timestamp={c.timestamp} /></span>
                                </span>
                              </button>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button 
                                  onClick={() => handleSparkComment(post.id, c.id)}
                                  className={`flex items-center gap-1 font-mono text-[10px] hover:text-pink-400 ${c.isLikedByUser ? 'text-pink-400' : 'text-violet-400/50'}`}
                                >
                                  <Zap className="w-3 h-3 fill-current" />
                                  <span>{c.likes}</span>
                                </button>
                                {(c.username === currentUser.username || post.userId === currentUser.id) && (
                                  <button
                                    onClick={() => {
                                      if (confirm('Delete this comment?')) {
                                        window.dispatchEvent(new CustomEvent('nexora-delete-comment', { detail: { postId: post.id, commentId: c.id } }));
                                      }
                                    }}
                                    className="p-1 text-red-400 hover:text-red-300 transition-colors rounded-md hover:bg-white/5 cursor-pointer animate-fade-in"
                                    title="Delete comment"
                                  >
                                    <Trash className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <p className="text-xs text-slate-200 pl-9 font-sans">{c.content}</p>

                            {/* Standard Threaded/Nested Replies */}
                            {c.replies && c.replies.length > 0 && (
                              <div className="pl-9 space-y-2.5 pt-1.5 border-l border-white/10 ml-3.5">
                                {c.replies.map(rep => (
                                  <div key={rep.id} className="text-xs bg-white/2 p-2 rounded-xl border border-white/3">
                                    <button type="button" onClick={() => onViewProfile?.(rep.userId || rep.username)} aria-label={`View @${rep.username}'s profile`} className="mb-1 flex min-h-10 items-center gap-2 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-2">
                                      <img src={rep.avatar} alt="" className="h-5 w-5 rounded-md object-cover" />
                                      <span>
                                        <span className="font-sans font-black text-violet-200 text-[11px] hover:underline">{rep.name}</span>
                                        <span className="block text-[9px] font-mono text-violet-400/50 hover:underline">@{rep.username} • <RelativeTime timestamp={rep.timestamp} /></span>
                                      </span>
                                    </button>
                                    <p className="text-violet-200 pl-7 text-[11.5px] leading-relaxed">{rep.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Reply compose activator */}
                            <div className="pl-9">
                              {activeReplyFieldId === c.id ? (
                                <div className="flex gap-2 mt-2">
                                  <input 
                                    type="text"
                                    placeholder="Write nested thread reply..."
                                    aria-label={`Reply to ${c.username}'s comment`}
                                    value={replyInputs[c.id] || ''}
                                    onChange={(e) => setReplyInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddReplySubmit(post.id, c.id); } }}
                                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl py-1 px-3 text-xs text-white focus:outline-hidden"
                                  />
                                  <button 
                                    type="button"
                                    onClick={() => handleAddReplySubmit(post.id, c.id)}
                                    aria-label={`Send reply to ${c.username}'s comment`}
                                    className="bg-violet-600 hover:bg-violet-550 p-1.5 rounded-xl text-white cursor-pointer"
                                  >
                                    <Send className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => setActiveReplyFieldId(null)}
                                    className="text-violet-400 text-xs hover:text-white"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => setActiveReplyFieldId(c.id)}
                                  className="text-[10px] font-mono text-violet-400 hover:text-white flex items-center gap-1 mt-1 cursor-pointer"
                                >
                                  Reply to Thread 💬
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Main comment form */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5 shrink-0">
                        <input 
                          type="text" 
                          placeholder="Write your comment..."
                          aria-label={`Write a comment on @${post.username}'s post`}
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCommentSubmit(post.id); } }}
                          className="flex-1 bg-slate-950/60 border border-white/5 focus:border-white/10 text-xs text-white placeholder:text-violet-400/40 py-2.5 px-4 rounded-xl focus:outline-hidden"
                        />
                        <button 
                          type="button"
                          onClick={() => handleAddCommentSubmit(post.id)}
                          aria-label={`Send comment on @${post.username}'s post`}
                          className="p-2.5 bg-violet-600 hover:bg-violet-550 rounded-xl text-white transition-colors cursor-pointer"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
            </React.Fragment>
          );
        })}

        {/* Infinite Scroll / Pagination Loading State */}
        {(visibleCount < orderedPosts.length || isLoadingMorePosts) && (
          <div className="py-8 flex flex-col items-center justify-center space-y-2">
            <NexoraLoader size="md" center={true} />
            <span className="text-[10px] font-mono font-bold text-violet-400/80 uppercase tracking-widest">
              {isLoadingMorePosts ? 'Loading more Nexora posts...' : 'Preparing more Nexora posts...'}
            </span>
          </div>
        )}

        {!isLoadingMorePosts && !hasMorePosts && visibleCount >= orderedPosts.length && orderedPosts.length > 0 && (
          <div className="py-8 text-center space-y-1.5 opacity-80">
            <div className="w-2 h-2 bg-gradient-to-r from-violet-500 to-pink-500 rounded-full mx-auto animate-pulse" />
            <p className="text-[11px] font-mono font-extrabold text-violet-300 uppercase tracking-widest">
              You're all caught up on Nexora
            </p>
            <p className="text-[10px] font-sans text-zinc-500">
              Check back soon for new updates or share your own post.
            </p>
          </div>
        )}

        {/* Clean spacing at the bottom of the feed for uninterrupted scrolling */}
        <div className="h-32 pointer-events-none" />
      </div>

      {/* COMPOSER OVERLAY DIALOG */}
      <AnimatePresence>
        {composerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-[#0b0821] border border-white/10 p-5 md:p-6 rounded-3xl w-full max-w-lg space-y-4 shadow-md"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-mono font-extrabold text-[#A78BFA] uppercase tracking-widest flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-pink-400" />
                  <span>Create Post</span>
                </span>
                <button onClick={() => setComposerOpen(false)} className="text-violet-400 hover:text-white p-1 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Audience Matrix tabs */}
              <div className="grid grid-cols-4 gap-1.5 bg-slate-950/40 p-1 rounded-xl border border-white/5">
                {(['general', 'pulse', 'community', 'opportunity'] as const).map(cat => (
                  <button
                    key={cat}
                    onClick={() => setComposerCategory(cat)}
                    className={`py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider font-extrabold transition-all cursor-pointer ${
                      composerCategory === cat ? 'bg-violet-600 text-white' : 'text-violet-400/50 hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Text Input area */}
              <div className="space-y-1">
                <textarea
                  rows={4}
                  placeholder="What's on your mind? Share an update, media, or opportunity..."
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  className="nx-composer-field w-full bg-[#120E2B] border border-[#302653] focus:border-violet-300/60 text-sm text-white rounded-xl p-3 focus:outline-hidden placeholder:text-[#8E86AA] resize-none font-sans"
                />
              </div>

              {/* Image URL attachment input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-violet-400 block uppercase">Attachment Image/Asset URL</label>
                <input 
                  type="text"
                  placeholder="https://images.unsplash.com/... (optional)"
                  value={composerImgUrl}
                  onChange={(e) => setComposerImgUrl(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-white/10 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
                />
              </div>

              {/* Conditional parameters based on category */}
              {composerCategory === 'pulse' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-400 block uppercase">Pulse Location Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Port Harcourt, Nigeria"
                    value={composerLocation}
                    onChange={(e) => setComposerLocation(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/5 focus:border-white/10 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
                  />
                </div>
              )}

              {composerCategory === 'community' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-400 block uppercase">Target Community Space</label>
                  <input 
                    type="text"
                    placeholder="e.g. Football Nigeria, Tech Labs"
                    value={composerCommunityName}
                    onChange={(e) => setComposerCommunityName(e.target.value)}
                    className="w-full bg-slate-950/50 border border-white/5 focus:border-white/10 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
                  />
                </div>
              )}

              {composerCategory === 'opportunity' && (
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-violet-400 block uppercase">Opportunity Category</label>
                    <select
                      value={composerOpportunityType}
                      onChange={(e) => setComposerOpportunityType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-white/5 text-xs text-white rounded-xl py-2 px-2.5 focus:outline-hidden"
                    >
                      <option value="Collaboration">Collaboration</option>
                      <option value="Job">Job Opportunity</option>
                      <option value="Startup">Startup Seeking Co-Founder</option>
                      <option value="Mentorship">Mentorship</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-violet-400 block uppercase">Dividend/Reward Structure</label>
                    <input 
                      type="text"
                      placeholder="e.g. Equity, $120,000 baseline"
                      value={composerReward}
                      onChange={(e) => setComposerReward(e.target.value)}
                      className="w-full bg-slate-950/50 border border-white/5 focus:border-white/10 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
                    />
                  </div>
                </div>
              )}

              {/* Submit trigger */}
              <div className="pt-2 border-t border-white/5 flex gap-2.5 justify-end">
                <button 
                  onClick={() => setComposerOpen(false)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-violet-300 text-xs font-mono font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleComposeSubmit}
                  className="px-5 py-2 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 rounded-xl text-white text-xs font-mono font-black uppercase tracking-wider cursor-pointer"
                >
                  Publish Post ⚡
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* FULLSCREEN IMMERSIVE VIDEO PLAYER OVERLAY */}
      <AnimatePresence>
        {activeVideoFullscreen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden touch-pan-y"
          >
            {/* Left Column: Full Immersive Video Player */}
            <div className="flex-1 bg-black relative flex items-center justify-center touch-pan-y">
              <NexoraVideo 
                ref={fullscreenVideoRef}
                src={activeVideoFullscreen.videoUrl}
                autoPlay
                muted={fullscreenVideoMuted}
                loop
                playsInline
                onClick={handleToggleFullscreenPlay}
                className="w-full h-full max-h-screen object-contain cursor-pointer touch-pan-y"
              />
              
              {/* Play/Pause state overlay indicator */}
              {!fullscreenPlaying && (
                <div 
                  onClick={handleToggleFullscreenPlay}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10"
                >
                  <div className="p-5 rounded-full bg-black/60 border border-white/10 text-white animate-scale-up">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                </div>
              )}

              <button 
                onClick={handleToggleFullscreenMute}
                className="absolute top-4 left-4 p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl text-white border border-white/10 cursor-pointer z-20"
              >
                {fullscreenVideoMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
              </button>

              <button 
                onClick={handleCloseFullscreen}
                className="absolute top-4 right-4 p-2.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-xl text-white border border-white/10 cursor-pointer z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title & metadata bar at bottom inside video */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/5 space-y-2.5 max-w-lg z-20">
                <div className="flex items-center gap-2.5">
                  <img src={activeVideoFullscreen.avatar} alt={activeVideoFullscreen.name} className="w-8 h-8 rounded-lg object-cover" />
                  <div>
                    <span className="font-sans font-black text-xs text-white">{activeVideoFullscreen.name}</span>
                    <span className="text-[9.5px] font-mono text-violet-300 block">@{activeVideoFullscreen.username}</span>
                  </div>
                </div>
                <p className="text-xs text-violet-100 font-sans leading-normal line-clamp-2">{activeVideoFullscreen.content}</p>
                <span className="text-[8.5px] font-mono text-pink-400 block tracking-widest uppercase animate-pulse">
                  Tap video to play/pause | Synced inline position
                </span>
              </div>
            </div>

            {/* Right Column: Mini Interaction Control Panel (Visible on Desktop, hidden on tight layouts) */}
            <div className="w-full md:w-80 bg-[#09071a] border-t md:border-t-0 md:border-l border-white/10 p-5 flex flex-col justify-between shrink-0">
              <div className="space-y-4">
                <span className="text-[10px] font-mono text-violet-400 uppercase tracking-widest block font-bold border-b border-white/5 pb-2">Narrative Matrix Controller</span>
                
                <div className="flex gap-4 items-center">
                  <button 
                    onClick={() => handleSpark(activeVideoFullscreen.id)}
                    className="flex-1 flex flex-col items-center p-3 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-pink-500/25 text-pink-400 cursor-pointer"
                  >
                    <Zap className="w-5 h-5 fill-current mb-1" />
                    <span className="text-xs font-mono font-bold">{activeVideoFullscreen.likes} Sparks</span>
                  </button>

                  <button 
                    onClick={() => {
                      setActiveCommentsPostId(activeVideoFullscreen.id);
                      handleCloseFullscreen();
                    }}
                    className="flex-1 flex flex-col items-center p-3 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-white/10 text-violet-300 cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5 mb-1" />
                    <span className="text-xs font-mono font-bold">{activeVideoFullscreen.comments.length} Reply</span>
                  </button>
                </div>

                <div className="p-3.5 bg-violet-950/20 rounded-2xl border border-white/10 space-y-1">
                  <span className="text-[8.5px] font-mono text-violet-400 block uppercase font-bold tracking-widest">Active Hashtags</span>
                  <div className="flex flex-wrap gap-1">
                    {activeVideoFullscreen.tags.map(t => (
                      <span key={t} className="text-[9.5px] font-mono text-cyan-400">#{t}</span>
                    ))}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleCloseFullscreen}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-mono font-bold text-xs uppercase rounded-xl transition-all tracking-wider cursor-pointer mt-4"
              >
                Close Narrative Grid
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⚠️ REPORT MODERATION MODAL CONTAINER */}
      <ReportModal
        isOpen={!!reportingPost}
        onClose={() => setReportingPost(null)}
        targetType="post"
        targetId={reportingPost?.id || ''}
        targetContent={reportingPost?.content || reportingPost?.targetContent || ''}
        reporterUsername={currentUser.username}
        onSubmitSuccess={() => {}}
      />

      {/* 🧬 NIDA DIAGNOSTICS MODAL OVERLAY */}
      <AnimatePresence>
        {nidaDiagnosticPost && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-[#0a071c]/98 border border-white/10 rounded-2xl overflow-hidden p-6 md:p-8 text-left relative space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Close Button */}
              <button 
                onClick={() => setNidaDiagnosticPost(null)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer border border-white/5"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title & Badge */}
              <div className="space-y-1.5 pr-8">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-violet-600 to-pink-500 text-[10px] font-mono font-black text-white uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-200" />
                    NIDA Core Engine
                  </span>
                  <span className="text-[10px] font-mono text-cyan-300 bg-cyan-900/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                    Calculated Live
                  </span>
                </div>
                <h3 className="text-xl font-black font-sans tracking-tight text-white uppercase">
                  NIDA Algorithmic Diagnostic Report
                </h3>
                <p className="text-xs text-zinc-400 font-sans">
                  Interactive real-time audit log of how the Nexora Intelligent Discovery Algorithm evaluates this post.
                </p>
              </div>

              {/* Post Preview */}
              <div className="bg-white/2 border border-white/5 p-4 rounded-2xl space-y-1">
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Post Context Preview</p>
                <p className="text-xs font-sans text-zinc-200 font-extrabold line-clamp-2">"{nidaDiagnosticPost.content}"</p>
                <p className="text-[10px] font-mono text-pink-400 mt-1">
                  By @{nidaDiagnosticPost.username} • Topic: {nidaDiagnosticPost.category || (nidaDiagnosticPost.tags && nidaDiagnosticPost.tags[0]) || 'Social'}
                </p>
              </div>

              {/* NIDA PILLARS - SECRET SAUCE */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono font-black text-violet-400 uppercase tracking-widest border-b border-white/5 pb-1 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-cyan-400" /> Four Balanced Pillars (Secret Sauce)
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(() => {
                    const isHighRep = nidaDiagnosticPost.username === 'voh' || nidaDiagnosticPost.username === 'nexora_ai' || nidaDiagnosticPost.username === 'voh_ai';
                    
                    const pillars = [
                      { label: 'Interest Alignment', val: isHighRep ? 95 : 75, desc: 'Relevance to your personalized DNA interests.', color: 'bg-violet-500' },
                      { label: 'Engagement Quality', val: nidaDiagnosticPost.likeCount && nidaDiagnosticPost.likeCount > 1000 ? 98 : 65, desc: 'Pure completion rates and organic shares.', color: 'bg-pink-500' },
                      { label: 'Creator Trust Reputation', val: isHighRep ? 100 : 85, desc: 'Historical compliance and content age.', color: 'bg-cyan-500' },
                      { label: 'Content Freshness', val: 90, desc: 'Recency and rapid velocity trend scaling.', color: 'bg-yellow-500' },
                    ];

                    return pillars.map(p => (
                      <div key={p.label} className="bg-black/25 p-3.5 rounded-xl border border-white/3 space-y-1.5">
                        <div className="flex justify-between items-center text-xs font-mono font-extrabold text-zinc-300">
                          <span>{p.label}</span>
                          <span className="text-cyan-400">{p.val}%</span>
                        </div>
                        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden">
                          <div className={`h-full ${p.color}`} style={{ width: `${p.val}%` }} />
                        </div>
                        <p className="text-[9px] text-zinc-500 leading-tight">{p.desc}</p>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* STAGES & SATISFACTION CHECKS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Stages Waves & Reach */}
                <div className="bg-[#120f32]/40 border border-white/10 p-4.5 rounded-2xl space-y-3">
                  <h4 className="text-xs font-mono font-black text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4" /> Wave Distribution Status
                  </h4>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-400">Current Ingestion Wave:</span>
                      <span className="font-extrabold text-pink-400 uppercase tracking-widest">
                        {nidaDiagnosticPost.likeCount && nidaDiagnosticPost.likeCount > 5000 ? 'Global Wave' : 'Regional Wave'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-400">Sandbox Test Group:</span>
                      <span className="text-emerald-400 font-black">Passed (180 seed users)</span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-zinc-400">Creator Fairness Factor:</span>
                      <span className="text-cyan-400 font-black">ACTIVE (Legacy bias bypassed)</span>
                    </div>
                  </div>
                </div>

                {/* Satisfaction Signal Vectors */}
                <div className="bg-zinc-950/40 border border-white/5 p-4.5 rounded-2xl space-y-3">
                  <h4 className="text-xs font-mono font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4" /> Satisfaction Signal Vectors
                  </h4>

                  <div className="space-y-1.5 text-[10px] font-mono">
                    <div className="flex justify-between text-emerald-400">
                      <span>👍 Positive Loop Indicators:</span>
                      <span>Strong</span>
                    </div>
                    <p className="text-zinc-500 text-[9px] leading-tight pl-2">
                      Completed 100% video/narrative loop, Saved to folders, Zero skips, Shared link externally.
                    </p>

                    <div className="flex justify-between text-yellow-400 mt-1">
                      <span>👎 Negative Dampener Risks:</span>
                      <span>Negligible</span>
                    </div>
                    <p className="text-zinc-500 text-[9px] leading-tight pl-2">
                      No rapid swipe-away, Not Hidden, Original media (no duplication hashes), No reported violations.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer Notice */}
              <div className="text-[10px] text-zinc-500 text-center font-mono uppercase tracking-widest pt-2 border-t border-white/5">
                NEXORA PROPRIETARY NIDA ALGORITHM &bull; 100% DECENTRALIZED AUDITING ENFORCED
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📁 INSTAGRAM/PINTEREST COLLECTIONS FOLDER SELECTION MODAL */}
      <AnimatePresence>
        {showSaveToCollectionModalId && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-100 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#0b081c]/98 border border-rose-500/20 rounded-[28px] overflow-hidden p-6 text-left relative"
            >
              <button 
                onClick={() => setShowSaveToCollectionModalId(null)}
                className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-4">
                <div className="flex items-center gap-2 text-pink-400">
                  <Folder className="w-5 h-5 font-bold" />
                  <h3 className="text-sm font-black font-mono uppercase tracking-widest leading-none">
                    Organize to Collections
                  </h3>
                </div>

                <p className="text-[11px] text-zinc-400 font-sans leading-normal">
                  Organize and group posts into categorized collection folders (like Football, Business, Inspiration, Friends). These lists are persistent.
                </p>

                {/* Listed current folders */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.keys(savedCollections).map(folder => {
                    const containsPost = savedCollections[folder].includes(showSaveToCollectionModalId);
                    return (
                      <button
                        key={folder}
                        onClick={() => {
                          setSavedCollections(prev => {
                            const current = prev[folder] || [];
                            const updatedList = current.includes(showSaveToCollectionModalId)
                              ? current.filter(id => id !== showSaveToCollectionModalId)
                              : [...current, showSaveToCollectionModalId];
                            
                            window.dispatchEvent(new CustomEvent('toast', { 
                              detail: current.includes(showSaveToCollectionModalId) 
                                ? `🗑️ Removed post from ${folder}`
                                : `📁 Organized to collection folder: ${folder}` 
                            }));
                            return { ...prev, [folder]: updatedList };
                          });
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border font-sans text-xs font-semibold cursor-pointer transition-all ${containsPost ? 'bg-pink-950/30 border-pink-500/35 text-pink-300' : 'bg-black/30 border-white/5 text-zinc-300 hover:bg-white/5'}`}
                      >
                        <span className="flex items-center gap-2">
                          <Folder className="w-4 h-4 shrink-0" />
                          {folder}
                        </span>
                        <span className="text-[10px] font-mono leading-none bg-black/40 px-2 py-1 rounded-md">
                          {containsPost ? '📂 Organized' : 'Save'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Form to create a new folder */}
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 font-bold block">
                    Create Custom Pinterest Folder:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Football ⚽, Business 💼, Friends 🤝"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      className="flex-1 p-2 bg-black/50 border border-white/5 rounded-lg text-xs text-white focus:outline-hidden focus:border-pink-500/40"
                    />
                    <button
                      onClick={() => {
                        const name = newCollectionName.trim();
                        if (!name) return;
                        if (savedCollections[name]) {
                          window.dispatchEvent(new CustomEvent('toast', { detail: `❌ Collection folder "${name}" already exists!` }));
                          return;
                        }
                        setSavedCollections(prev => ({
                          ...prev,
                          [name]: []
                        }));
                        setNewCollectionName('');
                        window.dispatchEvent(new CustomEvent('toast', { detail: `📁 Folder "${name}" created successfully!` }));
                      }}
                      className="p-2 px-4 bg-pink-600 hover:bg-pink-700 text-white font-mono text-xs font-extrabold uppercase rounded-lg cursor-pointer transition-colors shrink-0"
                    >
                      Create
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 border-t border-white/5 pt-3">
                  <button
                    onClick={() => setShowSaveToCollectionModalId(null)}
                    className="p-2 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-xs rounded-xl cursor-pointer"
                  >
                    Finish Organizing
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. POST REVISION HISTORY MODAL */}
      <AnimatePresence>
        {viewHistoryPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b091f] border border-white/10 rounded-2xl p-5 md:p-6 w-full max-w-lg relative overflow-hidden text-left"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4">
                <span className="text-xs font-mono text-violet-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  ✏️ REVISION LOGS AUDIT
                </span>
                <button 
                  onClick={() => setViewHistoryPost(null)}
                  className="p-1 px-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-mono"
                >
                  Close ×
                </button>
              </div>

              <div className="space-y-4 max-h-[320px] overflow-y-auto pr-1">
                {/* Original content first */}
                <div className="p-3 bg-zinc-950/45 rounded-2xl border border-[#171526] space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-mono text-zinc-500">
                    <span className="font-bold">🌱 INITIAL SEED CONTENT</span>
                    <span>Originally Published</span>
                  </div>
                  <p className="text-xs text-zinc-400 font-sans leading-relaxed italic">
                    "{viewHistoryPost.content}"
                  </p>
                </div>

                {/* Interactive progression logs */}
                {viewHistoryPost.editHistory?.map((h: any, idx: number) => (
                  <div key={idx} className="p-3 bg-violet-950/15 rounded-2xl border border-white/10 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-violet-400">
                      <span className="font-bold flex items-center gap-1">✏️ UPDATE ITERATION #{idx + 1}</span>
                      <span>{h.timestamp}</span>
                    </div>
                    <p className="text-xs text-violet-200 font-sans leading-relaxed">
                      "{h.content}"
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-[10px] font-mono text-zinc-500 text-center mt-4">
                All changes are cryptographically secured & signed locally.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. CREATOR PERFORMANCE ANALYTICS MODAL */}
      <AnimatePresence>
        {analyticsPost && analyticsSnapshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-gradient-to-b from-[#110e2e]/95 to-[#070519]/95 border border-violet-500/30 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-md relative overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4 relative z-10">
                <span className="text-xs font-mono text-violet-300 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4" /> POST INSIGHTS
                </span>
                <button
                  onClick={() => setAnalyticsPost(null)}
                  className="p-1 px-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-mono border border-white/5"
                >
                  Close ×
                </button>
              </div>

              <div className="p-3 bg-white/3 rounded-xl border border-white/5 space-y-1 mb-5 relative z-10">
                <span className="text-[8.5px] font-mono text-violet-400">SELECTED POST</span>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed line-clamp-2 italic">
                  "{analyticsPost.content || 'Untitled post'}"
                </p>
                <p className="text-[9px] text-zinc-500">
                  Published {new Date(analyticsPost.timestamp).toLocaleString()}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 relative z-10">
                {[
                  { label: 'Recorded views', value: analyticsSnapshot.views === null ? 'Not recorded' : analyticsSnapshot.views.toLocaleString() },
                  { label: 'Likes', value: analyticsSnapshot.likes.toLocaleString() },
                  { label: 'Comments', value: analyticsSnapshot.comments.toLocaleString() },
                  { label: 'Shares', value: analyticsSnapshot.shares.toLocaleString() },
                  { label: 'Saves', value: analyticsSnapshot.saves.toLocaleString() },
                  { label: 'Total interactions', value: analyticsSnapshot.totalInteractions.toLocaleString() },
                ].map((metric) => (
                  <div key={metric.label} className="p-3.5 bg-[#0d0a26] border border-white/5 rounded-2xl space-y-1">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">{metric.label}</span>
                    <div className="text-lg font-black text-white font-sans">{metric.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3.5 bg-violet-600/10 border border-white/10 rounded-2xl space-y-2 relative z-10">
                <span className="text-[9px] font-mono text-violet-300 font-black uppercase tracking-widest block">
                  RECORDED ENGAGEMENT RATE
                </span>
                <p className="text-xl font-black text-white">
                  {analyticsSnapshot.engagementRate === null ? 'Not available' : `${analyticsSnapshot.engagementRate.toFixed(2)}%`}
                </p>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  {analyticsSnapshot.engagementRate === null
                    ? 'A rate is shown only when this post has a positive recorded view count.'
                    : 'Calculated as recorded likes, comments, shares and saves divided by recorded views. One person may contribute more than one interaction.'}
                </p>
              </div>

              <p className="mt-4 text-[10px] text-zinc-500 leading-relaxed text-center">
                These figures come from counters stored on this post. Unique reach, profile visits, follower gains, audience demographics and historical comparisons are not available from this record.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔟 CONTEXTUAL ACTION BOTTOM SHEET (Triggered on long-press or right-click) */}
      <AnimatePresence>
        {contextualMenuPost && (
          <div className="fixed inset-0 z-100 bg-black/75 backdrop-blur-md flex items-end justify-center" onClick={() => setContextualMenuPost(null)}>
            <motion.div
              initial={{ y: "100%", opacity: 0.5 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0.5 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-lg bg-[#0e0c25] border-t border-white/10 rounded-t-2xl p-6 text-left relative space-y-4 pb-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag indicator bar */}
              <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-2" />

              <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                <img src={contextualMenuPost.avatar} alt={contextualMenuPost.username} className="w-10 h-10 rounded-xl object-cover" />
                <div>
                  <h4 className="text-xs font-sans font-black text-white">{contextualMenuPost.name}</h4>
                  <p className="text-[10px] font-mono text-violet-400">@{contextualMenuPost.username} • {contextualMenuPost.timestamp}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {/* Save post */}
                <button
                  onClick={() => {
                    setShowSaveToCollectionModalId(contextualMenuPost.id);
                    setContextualMenuPost(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white/3 hover:bg-white/10 rounded-xl text-left text-xs font-sans font-bold text-violet-100 transition-colors"
                >
                  <Folder className="w-4 h-4 text-pink-400" />
                  Save to Pinterest Collections Folder
                </button>

                {/* Transparency controls: Explain Why */}
                <button
                  onClick={() => {
                    setShowTransparencyExplanation(true);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white/3 hover:bg-white/10 rounded-xl text-left text-xs font-sans font-bold text-violet-100 transition-colors"
                >
                  <Info className="w-4 h-4 text-cyan-400" />
                  Explain why I see this recommendation
                </button>

                {/* Not interested */}
                <button
                  onClick={() => {
                    setHiddenPostIds(prev => [...prev, contextualMenuPost.id]);
                    const cleanTag = (contextualMenuPost.tags?.[0] || 'nexora').toLowerCase().replace('#', '');
                    setNotInterestedTags(prev => [...prev, cleanTag]);
                    recordAndPersistRecommendationEvent('not_interested', {
                      tags: contextualMenuPost.tags,
                      creatorId: contextualMenuPost.userId,
                      creatorUsername: contextualMenuPost.username,
                      communityName: contextualMenuPost.communityName,
                    });
                    trackClientObservation({
                      eventType: 'not_interested',
                      entityType: 'post',
                      entityId: contextualMenuPost.id,
                      properties: { feedback: 'not_interested' },
                    });
                    setLastAction({ type: 'not_interested', postId: contextualMenuPost.id, data: { tags: [cleanTag] } });
                    setContextualMenuPost(null);
                    window.dispatchEvent(new CustomEvent('toast', { detail: '👎 Tag muted. Recommendation engine updated.' }));
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white/3 hover:bg-white/10 rounded-xl text-left text-xs font-sans font-bold text-violet-100 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Not Interested in this topic (#{contextualMenuPost.tags?.[0] || 'Nexora'})
                </button>

                {/* Mute Creator */}
                <button
                  onClick={() => {
                    setMutedCreatorIds(prev => [...prev, contextualMenuPost.userId]);
                    setLastAction({ type: 'mute_creator', postId: contextualMenuPost.id, data: { creatorId: contextualMenuPost.userId } });
                    setContextualMenuPost(null);
                    window.dispatchEvent(new CustomEvent('toast', { detail: `🔇 Creator @${contextualMenuPost.username} muted in recommendation feeds.` }));
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white/3 hover:bg-white/10 rounded-xl text-left text-xs font-sans font-bold text-violet-100 transition-colors"
                >
                  <VolumeX className="w-4 h-4 text-red-400" />
                  Mute and Hide posts from this creator
                </button>

                {/* Report post */}
                <button
                  onClick={() => {
                    if (currentUser.id === 'guest_visitor_id' || currentUser.username === 'visitor') {
                      setContextualMenuPost(null);
                      onRequireAuth?.();
                      return;
                    }
                    setReportingPost(contextualMenuPost);
                    setContextualMenuPost(null);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-red-950/20 hover:bg-red-900/30 border border-red-500/10 rounded-xl text-left text-xs font-sans font-bold text-red-200 transition-colors"
                >
                  <Trash className="w-4 h-4 text-red-400" />
                  Report or Moderation Flag
                </button>
              </div>

              <button
                onClick={() => setContextualMenuPost(null)}
                className="w-full py-2.5 bg-violet-950 hover:bg-violet-900 text-violet-300 font-mono font-bold text-xs uppercase rounded-xl transition-colors tracking-wider cursor-pointer"
              >
                Close Control Menu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. RECOMMENDATION TRANSPARENCY EXPLANATORY MODAL */}
      <AnimatePresence>
        {showTransparencyExplanation && contextualMenuPost && (
          <div className="fixed inset-0 z-200 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b081c] border border-white/10 rounded-2xl p-5 md:p-6 w-full max-w-md relative text-left"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                <span className="text-xs font-mono text-cyan-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-cyan-400" /> RECOMMENDER TRANSPARENCY INDEX
                </span>
                <button 
                  onClick={() => setShowTransparencyExplanation(false)}
                  className="p-1 px-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-mono"
                >
                  Close X
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Nexora explains this recommendation using the preference signals currently stored on this device and the active feed mode. It does not expose hidden personal data or claim that this explanation is a complete description of every ranking decision.
                </p>

                <div className="p-3 bg-[#0d0a26] border border-white/5 rounded-2xl space-y-2">
                  <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest block font-black">Personalized Recommendation Details</span>
                  {getRecommendationExplanation(contextualMenuPost).map((reason, idx) => (
                    <div key={idx} className="flex gap-2 text-xs font-sans text-violet-200 leading-normal">
                      <span className="text-pink-500 font-mono">▸</span>
                      <span>{reason}</span>
                    </div>
                  ))}
                </div>

                <div className="text-[10px] font-mono text-zinc-500 leading-normal bg-zinc-950/40 p-3 rounded-xl border border-white/3">
                  💡 <strong>Recommendation Control:</strong> If this content is not relevant, you can mute topic tags or block this creator directly using the options.
                </div>
              </div>

              <button 
                onClick={() => {
                  setShowTransparencyExplanation(false);
                  setContextualMenuPost(null);
                }}
                className="w-full py-2.5 bg-linear-to-r from-violet-600 to-pink-500 text-white font-mono font-bold text-xs uppercase rounded-xl transition-all tracking-wider cursor-pointer mt-5"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {quoteTargetPost && (
          <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => !isSubmittingQuote && setQuoteTargetPost(null)}>
            <motion.section
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              onClick={event => event.stopPropagation()}
              className="w-full max-w-xl rounded-3xl border border-violet-400/25 bg-[#090714] p-5 shadow-2xl shadow-violet-950/40"
              role="dialog" aria-modal="true" aria-labelledby="nexora-quote-title"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 id="nexora-quote-title" className="text-lg font-black text-white">Quote post</h2>
                  <p className="mt-1 text-xs text-violet-200/70">Add your perspective before sharing it with your network.</p>
                </div>
                <button type="button" onClick={() => setQuoteTargetPost(null)} disabled={isSubmittingQuote} aria-label="Close quote composer" className="rounded-xl p-2 text-zinc-400 hover:bg-white/5 hover:text-white disabled:opacity-40"><X className="h-5 w-5" /></button>
              </div>
              <textarea value={quoteDraft} onChange={event => setQuoteDraft(event.target.value.slice(0, 500))} maxLength={500} rows={4} autoFocus placeholder="What do you want to add to this conversation?" className="w-full resize-y rounded-2xl border border-white/10 bg-[#120e2b] p-4 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-violet-500" />
              <div className="mt-1 flex justify-end text-[10px] text-zinc-500">{quoteDraft.length}/500</div>
              <div className="mt-3 rounded-2xl border border-violet-400/20 bg-violet-950/20 p-4">
                <p className="text-xs font-bold text-violet-200">{quoteTargetPost.name} <span className="font-normal text-violet-300/70">@{quoteTargetPost.username}</span></p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-zinc-300">{quoteTargetPost.content.slice(0, 700)}{quoteTargetPost.content.length > 700 ? '…' : ''}</p>
                <p className="mt-3 text-[10px] text-violet-300/70">Original post will remain attributed to its creator.</p>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setQuoteTargetPost(null)} disabled={isSubmittingQuote} className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-zinc-300 hover:bg-white/5 disabled:opacity-40">Cancel</button>
                <button type="button" disabled={isSubmittingQuote || !quoteDraft.trim() || !onQuotePost} onClick={async () => {
                  if (!quoteTargetPost || !onQuotePost || !quoteDraft.trim()) return;
                  setIsSubmittingQuote(true);
                  try {
                    const success = await onQuotePost(quoteTargetPost.id, quoteDraft.trim());
                    if (success) { setQuoteTargetPost(null); setQuoteDraft(''); }
                  } finally { setIsSubmittingQuote(false); }
                }} className="rounded-xl bg-violet-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-violet-500 disabled:opacity-40">{isSubmittingQuote ? 'Posting…' : 'Quote post'}</button>
              </div>
            </motion.section>
          </div>
        )}
      </AnimatePresence>

      {/* 12. UNDO FLOATING SNACKBAR (For reversing recommendation actions) */}
      <AnimatePresence>
        {lastAction && (
          <div className="fixed bottom-24 inset-x-4 z-100 flex justify-center pointer-events-none">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-[#0e0c25] border border-white/10 px-4 py-3 rounded-2xl shadow-md flex items-center justify-between gap-4 text-xs font-sans text-white pointer-events-auto max-w-sm w-full"
            >
              <div className="flex items-center gap-2">
                <Undo2 className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Preference updated. Changed your mind?</span>
              </div>
              <button
                onClick={handleUndoRecentChoice}
                className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white font-mono font-black text-[10px] uppercase rounded-lg cursor-pointer transition-colors shrink-0"
              >
                Undo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
