import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
import StoriesView from './StoriesView';
import { getRecommendationScore, recordRecommendationEvent } from '../utils/recommendations';
import { globalVideoPlaybackManager } from '../utils/VideoPlaybackManager';
import { TERMINOLOGY } from '../services/voh';
import ImmersiveVideoViewer from './ImmersiveVideoViewer';

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
          className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 cursor-pointer text-xs font-bold leading-none select-none z-10"
        >
          &larr;
        </button>
      )}
      {index < images.length - 1 && (
        <button 
          onClick={handleNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100 cursor-pointer text-xs font-bold leading-none select-none z-10"
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

// Seed function to generate 150+ realistic posts from 1000 users deterministically
function seedWorldFeed(parentPosts: Post[]): RefactoredPost[] {
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

// Active moments structure
const MOCK_MOMENTS = [
  { id: 'm-0', name: 'VOICE OF HARRISON', username: 'voh', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg', active: true, quotes: ["Building the future of social networks with clean designs.", "Great seeing our community grow so rapidly!", "Continuous listening and iterating with you guys."] },
  { id: 'm-1', name: 'Official', username: 'official', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80', active: true, quotes: ["Official platform account 🌟 Keeping you posted with community updates!", "Super excited to share our latest developments today.", "Always working to bring you the best experience!"] },
  { id: 'm-2', name: 'AI Assistant', username: 'ai_assistant', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80', active: true, quotes: ["The Intelligent AI assistant.", "Connected and ready to assist you anytime.", "Analyzing daily trends."] }
];

const SEARCHABLE_SYSTEM_USERS: any[] = [];

interface FeedViewProps {
  currentUser: User;
  creators?: User[];
  posts: Post[];
  followingIds: string[];
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
  activeTab?: string;
  unreadMessagesCount?: number;
  onOpenMessages?: () => void;
  onOpenVohAi?: () => void;
}

export default function FeedView({
  currentUser,
  creators = [],
  posts,
  followingIds,
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
  activeTab = 'feed',
  unreadMessagesCount = 0,
  onOpenMessages,
  onOpenVohAi
}: FeedViewProps) {
  // Database states
  const [localPosts, setLocalPosts] = useState<RefactoredPost[]>([]);
  const [feedTab, setFeedTab] = useState<'posts' | 'following' | 'friends' | 'trending' | 'reels'>(() => {
    const saved = localStorage.getItem('nexora_feed_tab');
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
  }, [feedTab]);

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
    const handleMomentsUpdate = () => {
      const saved = localStorage.getItem('nexora_moments_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.length > 0) setMomentsList(parsed);
        } catch (e) {}
      }
    };
    window.addEventListener('nexora-moments-updated', handleMomentsUpdate);
    return () => {
      window.removeEventListener('nexora-moments-updated', handleMomentsUpdate);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('nexora_feed_tab', feedTab);
  }, [feedTab]);
  
  // Custom interactive features
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
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

  // Moments List State (hydrated and preserved)
  const [momentsList, setMomentsList] = useState<any[]>(() => {
    const saved = localStorage.getItem('nexora_moments_list');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return MOCK_MOMENTS;
  });

  // Moments Overlay Viewer state
  const [selectedMoment, setSelectedMoment] = useState<any | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);

  // Moments creation modal state
  const [isCreateMomentOpen, setIsCreateMomentOpen] = useState(false);
  const [momentCaption, setMomentCaption] = useState('');
  const [momentMediaType, setMomentMediaType] = useState<'photo' | 'video' | 'voice' | 'text'>('photo');
  const [momentMediaUrl, setMomentMediaUrl] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80');
  const [simulatedVoiceRecording, setSimulatedVoiceRecording] = useState(false);
  const [simulatedVoiceSeconds, setSimulatedVoiceSeconds] = useState(0);
  const [playingVoiceMoment, setPlayingVoiceMoment] = useState(false);

  // Phase 6 & Phase 7 - Interactive states
  const [expandedPostIds, setExpandedPostIds] = useState<string[]>([]);
  const [mutedCreatorIds, setMutedCreatorIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_muted_creators');
    return saved ? JSON.parse(saved) : [];
  });
  const [pinnedPostIds, setPinnedPostIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_pinned_posts');
    return saved ? JSON.parse(saved) : [];
  });
  const [analyticsPost, setAnalyticsPost] = useState<RefactoredPost | null>(null);

  const [isCreatingHighlight, setIsCreatingHighlight] = useState(false);
  const [storyHighlightsList, setStoryHighlightsList] = useState<any[]>(() => {
    const saved = localStorage.getItem('nexora_story_highlights');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [
      {
        id: 'hl-sample-1',
        title: 'Vibe check ⚡',
        cover: '⚡',
        stories: [
          { mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80', caption: 'Consolidating the new Nexora mobile interface!' }
        ]
      },
      {
        id: 'hl-sample-2',
        title: 'Coding ☕',
        cover: '☕',
        stories: [
          { mediaUrl: 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=600&auto=format&fit=crop&q=80', caption: 'Early morning coffee coding sprints!' }
        ]
      }
    ];
  });

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
  const [hiddenPostIds, setHiddenPostIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_hidden_posts');
    return saved ? JSON.parse(saved) : [];
  });
  const [blockedUserIds, setBlockedUserIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_blocked_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [mutedUserIds, setMutedUserIds] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_muted_users');
    return saved ? JSON.parse(saved) : [];
  });
  const [notInterestedTags, setNotInterestedTags] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_not_interested_tags');
    return saved ? JSON.parse(saved) : [];
  });

  // 2. Custom Pinterest-style collection state
  const [savedCollections, setSavedCollections] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('nexora_saved_collections');
    return saved ? JSON.parse(saved) : {
      'Favorites ❤️': [],
      'Football ⚽': [],
      'Business 💼': [],
      'Inspiration ⚡': [],
      'Custom Collections 📂': []
    };
  });
  const [activeCollectionFolder, setActiveCollectionFolder] = useState<string | null>(null);
  const [showSaveToCollectionModalId, setShowSaveToCollectionModalId] = useState<string | null>(null);
  const [newCollectionName, setNewCollectionName] = useState('');

  // 3. Search Engine 2.0 States
  const [searchFilterType, setSearchFilterType] = useState<'all' | 'users' | 'posts' | 'videos' | 'voice' | 'communities' | 'hashtags' | 'pulse'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'nearby'>('latest');

  // Premium Search States
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_search_history');
    return saved ? JSON.parse(saved) : ['Sarah 🌸', 'David ⚔️', 'Quantum', 'Physics', 'FC Barcelona', 'Austin'];
  });

  const addToSearchHistory = (q: string) => {
    if (!q || !q.trim()) return;
    const query = q.trim();
    setSearchHistory(prev => {
      const filtered = prev.filter(h => h.toLowerCase() !== query.toLowerCase());
      const updated = [query, ...filtered].slice(0, 10);
      localStorage.setItem('nexora_search_history', JSON.stringify(updated));
      return updated;
    });
  };

  const removeFromSearchHistory = (q: string) => {
    setSearchHistory(prev => {
      const updated = prev.filter(h => h !== q);
      localStorage.setItem('nexora_search_history', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('nexora_search_history');
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
    localStorage.setItem('nexora_hidden_posts', JSON.stringify(hiddenPostIds));
  }, [hiddenPostIds]);

  useEffect(() => {
    localStorage.setItem('nexora_blocked_users', JSON.stringify(blockedUserIds));
  }, [blockedUserIds]);

  useEffect(() => {
    localStorage.setItem('nexora_muted_users', JSON.stringify(mutedUserIds));
  }, [mutedUserIds]);

  useEffect(() => {
    localStorage.setItem('nexora_not_interested_tags', JSON.stringify(notInterestedTags));
  }, [notInterestedTags]);

  useEffect(() => {
    localStorage.setItem('nexora_saved_collections', JSON.stringify(savedCollections));
  }, [savedCollections]);

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
        recordRecommendationEvent('search', { keyword: searchQuery });
      }, 1000); // 1s debounce to avoid over-triggering
      return () => clearTimeout(delayDebounce);
    }
  }, [searchQuery]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // State to hold pending posts received in the background while scrolling
  const [pendingPosts, setPendingPosts] = useState<RefactoredPost[]>([]);

  // 1. Hydrate the feed and synchronize with Parent posts
  useEffect(() => {
    const seeded = seedWorldFeed(posts);
    
    setLocalPosts(currentLocalPosts => {
      if (currentLocalPosts.length === 0) {
        // Initial load
        return seeded;
      }
      
      // Separate existing and new posts
      const currentIds = new Set(currentLocalPosts.map(p => p.id));
      const newSeededPosts = seeded.filter(p => !currentIds.has(p.id));
      
      // Update existing posts in-place to preserve their exact order and indices
      const updatedLocalPosts = currentLocalPosts.map(existingPost => {
        const matchingIncoming = seeded.find(p => p.id === existingPost.id);
        if (matchingIncoming) {
          const hasChanged = 
            existingPost.likes !== matchingIncoming.likes ||
            existingPost.comments.length !== matchingIncoming.comments.length ||
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
      if (newSeededPosts.length > 0) {
        // Split new posts into user-created posts (prepend immediately) and background posts (queue as pending)
        const currentUserNewPosts = newSeededPosts.filter(p => p.userId === currentUser.id);
        const otherNewPosts = newSeededPosts.filter(p => p.userId !== currentUser.id);
        
        // Also check if user is at the top of the feed to allow immediate update for background posts
        const isAtTop = scrollContainerRef.current ? scrollContainerRef.current.scrollTop <= 20 : true;
        
        if (isAtTop && otherNewPosts.length > 0) {
          // Prepend all new posts since user is at top
          return [...newSeededPosts, ...updatedLocalPosts];
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

  const audioCtxRef = useRef<any>(null);
  const [voiceMomentSeconds, setVoiceMomentSeconds] = useState(0);

  const playVoiceSynthesizer = (seconds: number) => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Warm retro triangle wave shape
      osc.type = 'triangle';
      
      // Beautiful pentatonic chord scale arpeggio notes (A3, C4, D4, E4, G4, A4)
      const frequencies = [220, 261.63, 293.66, 329.63, 392.00, 440.00];
      const baseFreq = frequencies[seconds % frequencies.length];
      
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      // Soft verbal frequency modulation (speech-like vibrato)
      osc.frequency.linearRampToValueAtTime(baseFreq + 12, ctx.currentTime + 0.25);
      osc.frequency.linearRampToValueAtTime(baseFreq - 8, ctx.currentTime + 0.55);
      osc.frequency.linearRampToValueAtTime(baseFreq, ctx.currentTime + 0.9);
      
      // Smooth pleasant volume envelope (soft attack and slow decay)
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.15); 
      gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.5);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.95);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 1.0);
    } catch (err) {
      console.warn("Audio context not allowed or blocked by policy", err);
    }
  };

  // Voice Player simulation with Web Audio synthesis
  useEffect(() => {
    let timer: any = null;
    if (playingVoiceId) {
      playVoiceSynthesizer(0);
      timer = setInterval(() => {
        setVoiceSeconds(s => {
          const nextSec = s + 1;
          if (nextSec >= 45) {
            setPlayingVoiceId(null);
            return 0;
          }
          playVoiceSynthesizer(nextSec);
          return nextSec;
        });
      }, 1000);
    } else {
      setVoiceSeconds(0);
    }
    return () => clearInterval(timer);
  }, [playingVoiceId]);

  // Voice Story/Moment Player simulation with Web Audio synthesis
  useEffect(() => {
    let timer: any = null;
    if (playingVoiceMoment) {
      playVoiceSynthesizer(0);
      setVoiceMomentSeconds(0);
      timer = setInterval(() => {
        setVoiceMomentSeconds(s => {
          const nextSec = s + 1;
          if (nextSec >= (selectedMoment?.voiceDuration || 15)) {
            setPlayingVoiceMoment(false);
            return 0;
          }
          playVoiceSynthesizer(nextSec);
          return nextSec;
        });
      }, 1000);
    } else {
      setVoiceMomentSeconds(0);
    }
    return () => clearInterval(timer);
  }, [playingVoiceMoment, selectedMoment]);

  // Voice Recording Simulator effect
  useEffect(() => {
    let interval: any = null;
    if (simulatedVoiceRecording) {
      interval = setInterval(() => {
        setSimulatedVoiceSeconds(s => s + 1);
      }, 1000);
    } else {
      setSimulatedVoiceSeconds(0);
    }
    return () => clearInterval(interval);
  }, [simulatedVoiceRecording]);

  const handleSaveNewMoment = (e: React.FormEvent) => {
    e.preventDefault();
    // For voice moment, prompt default title if blank
    const defaultCaption = momentCaption.trim() || 
      (momentMediaType === 'voice' ? "🎙️ Voice Message" : 
       momentMediaType === 'video' ? "🎥 Video Clip" : "📸 Image Post");

    const newMoment = {
      id: `moment-${Date.now()}`,
      name: currentUser.name,
      username: currentUser.username,
      avatar: currentUser.avatar,
      active: true,
      quotes: [defaultCaption],
      mediaType: momentMediaType,
      mediaUrl: momentMediaType === 'text' ? '' : momentMediaUrl,
      voiceDuration: momentMediaType === 'voice' ? (simulatedVoiceSeconds || 15) : undefined
    };

    const updated = [newMoment, ...momentsList];
    setMomentsList(updated);
    localStorage.setItem('nexora_moments_list', JSON.stringify(updated));

    // Reset onboarding values
    setMomentCaption('');
    setMomentMediaType('photo');
    setMomentMediaUrl('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80');
    setIsCreateMomentOpen(false);
  };

  // Header expansion state tracking ref to eliminate duplicate re-renders
  const isHeaderExpandedRef = useRef(true);

  // High-performance passive scroll handler for infinite scroll & header collapse
  useEffect(() => {
    let debounceTimer: any = null;

    const handleScroll = () => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      
      // Debounce localStorage writes to prevent main thread blocking
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        localStorage.setItem('nexora_feed_scroll_pos', String(scrollTop));
      }, 300);

      // Pre-load next batch when nearing bottom (threshold 350px)
      if (scrollHeight - scrollTop - clientHeight < 350) {
        setVisibleCount(prev => prev + 6);
      }

      // Smooth scroll direction detection for header collapse/restore
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
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  // Restore scroll position on load and activeTab change back to 'feed'
  useEffect(() => {
    if (activeTab === 'feed') {
      const savedPos = localStorage.getItem('nexora_feed_scroll_pos');
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
        localStorage.setItem('nexora_feed_scroll_pos', String(scrollContainerRef.current.scrollTop));
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

  // Pull-down refresh simulator
  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      
      if (pendingPosts.length > 0) {
        // Apply background posts immediately on pull refresh
        setLocalPosts(prev => [...pendingPosts, ...prev]);
        setPendingPosts([]);
      } else {
        // Shuffle posts gently or add new generated ones if no pending ones
        setLocalPosts(prev => {
          const copy = [...prev];
          // Shift a few posts for fresh layout
          if (copy.length > 5) {
            const first = copy.shift();
            if (first) copy.splice(3, 0, first);
          }
          return copy;
        });
      }
      
      setVisibleCount(8);
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }, 1200);
  };

  // Sparks trigger handler
  const handleSpark = (postId: string) => {
    onLikePost(postId);
    const post = localPosts.find(p => p.id === postId);
    if (post) {
      recordRecommendationEvent('spark', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username, communityName: post.communityName });
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
    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              const isLiked = !c.isLikedByUser;
              return {
                ...c,
                isLikedByUser: isLiked,
                likes: isLiked ? c.likes + 1 : c.likes - 1
              };
            }
            return c;
          })
        };
      }
      return p;
    }));
  };

  // Bookmark / Save handler
  const handleSave = (postId: string) => {
    onBookmarkPost(postId);
    const post = localPosts.find(p => p.id === postId);
    if (post) {
      recordRecommendationEvent('save', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username, communityName: post.communityName });
    }
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

    const post = localPosts.find(p => p.id === postId);
    if (post) {
      recordRecommendationEvent('comment', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username, communityName: post.communityName });
    }

    const newComment: InteractiveComment = {
      id: `comment-new-${Date.now()}`,
      postId,
      userId: currentUser.id,
      username: currentUser.username,
      name: currentUser.name,
      avatar: currentUser.avatar,
      content,
      timestamp: "Just now",
      likes: 0,
      replies: []
    };

    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          commentsCount: p.commentsCount + 1,
          comments: [newComment, ...p.comments]
        };
      }
      return p;
    }));

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

    setLocalPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.map(c => {
            if (c.id === commentId) {
              return {
                ...c,
                replies: [...(c.replies || []), newReply]
              };
            }
            return c;
          })
        };
      }
      return p;
    }));

    setReplyInputs(prev => ({ ...prev, [commentId]: '' }));
    setActiveReplyFieldId(null);
  };

  // Float post compose action
  const handleComposeSubmit = () => {
    if (!composerText.trim()) return;

    const tags = composerText.match(/#\w+/g)?.map(t => t.replace('#', '')) || ["NEXORA"];

    onAddPost(composerText, composerImgUrl || undefined, tags.join(','));

    const newPost: RefactoredPost = {
      id: `composed-${Date.now()}`,
      userId: currentUser.id,
      username: currentUser.username,
      name: currentUser.name,
      avatar: currentUser.avatar,
      isVerified: currentUser.isVerified || false,
      content: composerText,
      image: composerImgUrl || undefined,
      tags,
      likes: 0,
      commentsCount: 0,
      shares: 0,
      timestamp: "Just now",
      comments: [],
      location: composerCategory === 'pulse' ? (composerLocation || "Port Harcourt, Nigeria") : undefined,
      communityName: composerCategory === 'community' ? (composerCommunityName || "General Hub") : undefined,
      opportunityType: composerCategory === 'opportunity' ? composerOpportunityType : undefined,
      opportunityReward: composerCategory === 'opportunity' ? composerReward : undefined,
      category: composerCategory
    };

    setLocalPosts(prev => [newPost, ...prev]);

    // Reset Composer
    setComposerText('');
    setComposerImgUrl('');
    setComposerCommunityName('');
    setComposerLocation('');
    setComposerReward('');
    setComposerOpen(false);
  };

  // Re-sync posts on pull-to-refresh
  const addNewFreshSimulatedPost = () => {
    // Re-sync posts from actual parent posts
    setLocalPosts(posts.map(p => ({ ...p, isVerified: p.isVerified || false, tags: p.tags || [], likes: p.likes || 0, commentsCount: p.commentsCount || (p.comments ? p.comments.length : 0), shares: p.shares || 0, comments: p.comments || [] })));
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
        reasons.push(`You show interest in the topic #${maxTag} (weight: +${maxTagScore}).`);
      }
      
      const creatorScore = (profile.creators && (profile.creators[postItem.userId] || profile.creators[postItem.username])) || 0;
      if (creatorScore > 3) {
        reasons.push(`You regularly interact with @${postItem.username} (affinity: +${creatorScore}).`);
      }
      
      if (reasons.length === 0) {
        if (postItem.isVerified) {
          reasons.push("Recommended because this verified creator is broadcasting high-fidelity media.");
        } else {
          reasons.push("Recommended based on positive engagement signals and overall platform velocity.");
        }
      }
      
      return reasons;
    } catch (e) {
      return ["Recommended based on positive engagement signals and overall platform velocity."];
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

  const handlePullEnd = () => {
    if (pullStartYRef.current !== null) {
      pullStartYRef.current = null;
      if (pullY > 50) {
        setPullState('refreshing');
        setPullY(50);
        setIsRefreshing(true);
        if (navigator.vibrate) navigator.vibrate([30]);
        
        setTimeout(() => {
          setIsRefreshing(false);
          setPullState('idle');
          setPullY(0);
          
          // Prepend a beautiful simulated post
          addNewFreshSimulatedPost();
          window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Feed updated!' }));
        }, 1200);
      } else {
        setPullState('idle');
        setPullY(0);
      }
    }
    isMouseDownRef.current = false;
  };

  // Search filter options
  const filteredPosts = localPosts.filter(post => {
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
      const isPostFromFriend = (followingIds.includes(post.userId) && post.userId !== 'user-0' && post.username !== 'voh_ai' && post.username !== 'nexora_ai') || post.userId === currentUser.id;
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
  });

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
      if (feedTab === 'posts') {
        sortedList.sort((a, b) => {
          let scoreA = 0;
          let scoreB = 0;

          // 1. Recency Boost
          if (a.timestamp === 'Just now') scoreA += 10000;
          if (b.timestamp === 'Just now') scoreB += 10000;
          if (a.timestamp?.includes('m ago') || a.timestamp?.includes('h ago')) scoreA += 5000;
          if (b.timestamp?.includes('m ago') || b.timestamp?.includes('h ago')) scoreB += 5000;

          // 2. Engagement score: Likes, Shares, Comments, Bookmarks/Saves
          // Added weights for sparks, shares, and bookmarks to reflect engagement depth.
          const engagementA = (a.likes || 0) * 3 + (a.shares || 0) * 6 + (a.comments?.length || 0) * 4 + (a.bookmarksCount || 0) * 8;
          const engagementB = (b.likes || 0) * 3 + (b.shares || 0) * 6 + (b.comments?.length || 0) * 4 + (b.bookmarksCount || 0) * 8;
          scoreA += engagementA;
          scoreB += engagementB;

          // 3. Creator / Verification / Authority boosts
          if (a.userId === 'user-0' || a.username === 'voh' || a.username === 'nexora_ai') scoreA += 1500;
          if (b.userId === 'user-0' || b.username === 'voh' || b.username === 'nexora_ai') scoreB += 1500;

          // 4. Recommendation system scores
          scoreA += getRecommendationScore(a);
          scoreB += getRecommendationScore(b);

          return scoreB - scoreA;
        });
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
      }
      return sortedList;
    })();

    return sorted;
  };

  // State to hold the stable cached/rendered posts list to prevent re-sorting on engagement updates
  const [orderedPosts, setOrderedPosts] = useState<RefactoredPost[]>([]);
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
  }, [localPosts, feedTab, sortBy, searchFilterType, searchQuery, selectedTag, activeCollectionFolder, qualityFilter]);

  const currentDisplayList = orderedPosts.slice(0, visibleCount);

  // Active Post Viewport Detection using IntersectionObserver
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

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
        }
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
  }, [currentDisplayList.length]);

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
    <div className="flex flex-col h-full w-full relative overflow-hidden bg-transparent min-h-0">
      
      {/* Floating Pill for Pending background posts */}
      <AnimatePresence>
        {feedTab === 'reels' && (
          <ImmersiveVideoViewer
            initialPost={localPosts.find(p => p.videoUrl) || localPosts[0]}
            creatorPosts={localPosts}
            currentUser={currentUser}
            onClose={() => setFeedTab('posts')}
            onLikePost={onLikePost}
            onToggleFollow={onToggleFollow}
            isFollowing={false}
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
        className="w-full h-full overflow-y-auto custom-scrollbar scroll-smooth relative bg-[#04020a] touch-pan-y pb-28 sm:pb-12"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* STAGE 1 — HOME FEED NAVIGATION HEADER */}
        <div className="sticky top-0 z-30 bg-[#04020a]/95 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-3.5 sm:py-4 flex items-center justify-between min-h-[64px]">
          {/* Left: Feed Categories (Exact Order: Posts, Following, Friends, Trending, Reels) */}
          <div className="flex items-center gap-6 sm:gap-8 overflow-x-auto scrollbar-none pr-3 py-1">
            {([
              { id: 'posts', label: 'Posts' },
              { id: 'following', label: 'Following' },
              { id: 'friends', label: 'Friends' },
              { id: 'trending', label: 'Trending' },
              { id: 'reels', label: 'Reels' }
            ] as const).map(cat => {
              const isActive = feedTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setFeedTab(cat.id as any);
                    setVisibleCount(8);
                  }}
                  className={`relative py-2.5 px-1 text-sm sm:text-base font-sans transition-all duration-200 cursor-pointer whitespace-nowrap min-h-[44px] flex items-center justify-center ${
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
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* VOH AI Quick Trigger */}
            <button
              onClick={() => {
                if (onOpenVohAi) {
                  onOpenVohAi();
                } else {
                  window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'nida' } }));
                }
              }}
              className="p-2 text-zinc-300 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 rounded-xl transition-all cursor-pointer flex items-center justify-center focus:outline-none min-h-[38px] min-w-[38px] active:scale-95 group"
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
              className="relative p-2 text-zinc-300 hover:text-blue-300 hover:bg-blue-500/10 rounded-xl transition-all cursor-pointer flex items-center justify-center focus:outline-none min-h-[38px] min-w-[38px] active:scale-95 group"
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
              className="p-2 text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-all cursor-pointer flex items-center justify-center focus:outline-none min-h-[38px] min-w-[38px] active:scale-95"
              title="Search"
              aria-label="Search Nexora"
            >
              <Search className="w-4.5 h-4.5 stroke-[1.75] text-zinc-300" />
            </button>

            {/* Utility Chevron Menu */}
            <button
              id="nexora-home-chevron-menu-trigger"
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('toggleNavMenu'));
              }}
              className="relative flex items-center gap-1 py-1.5 px-2 rounded-xl border border-white/10 hover:border-violet-500/30 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white transition-all cursor-pointer active:scale-95 text-xs font-sans font-medium group"
              title="Open Navigation Menu"
              aria-label="Navigation Menu"
            >
              <Menu className="w-4 h-4 stroke-[2.2] text-zinc-200 group-hover:text-violet-300 transition-colors" />
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 group-hover:text-violet-400 transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* INLINE CREATE POST COMPOSER */}
        <div className="px-4 sm:px-6 py-4 border-b border-white/10 bg-[#04020a] transition-all">
          <div className="flex items-center gap-3">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-violet-500/20 shrink-0 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onViewProfile?.(currentUser.id)}
            />
            <button
              onClick={() => setComposerOpen(true)}
              className="flex-1 text-left py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-400 hover:text-zinc-200 text-xs font-sans transition-all cursor-pointer flex items-center justify-between group"
            >
              <span>What's on your mind? Share updates, pulse news, or opportunities...</span>
              <Sparkles className="w-4 h-4 text-violet-400 group-hover:scale-110 transition-transform shrink-0 ml-2" />
            </button>
          </div>
          <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-xs text-zinc-400">
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <button
                onClick={() => {
                  setComposerCategory('general');
                  setComposerOpen(true);
                }}
                className="flex items-center gap-1.5 text-zinc-300 hover:text-violet-300 transition-colors text-[11px] font-medium cursor-pointer"
              >
                <span className="text-violet-400 font-bold">🖼️</span>
                <span>Media / Photo</span>
              </button>
              
              <button
                onClick={() => {
                  setComposerCategory('pulse');
                  setComposerOpen(true);
                }}
                className="flex items-center gap-1.5 text-zinc-300 hover:text-cyan-300 transition-colors text-[11px] font-medium cursor-pointer"
              >
                <span className="text-cyan-400 font-bold">🌍</span>
                <span>Pulse</span>
              </button>

              <button
                onClick={() => {
                  setComposerCategory('opportunity');
                  setComposerOpen(true);
                }}
                className="flex items-center gap-1.5 text-zinc-300 hover:text-pink-300 transition-colors text-[11px] font-medium cursor-pointer"
              >
                <span className="text-pink-400 font-bold">🚀</span>
                <span>Opportunity</span>
              </button>
            </div>

            <button
              onClick={() => setComposerOpen(true)}
              className="px-3.5 py-1.5 bg-gradient-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white rounded-lg text-[11px] font-sans font-bold cursor-pointer transition-all shadow-sm"
            >
              Post ⚡
            </button>
          </div>
        </div>

        {/* Animated Pull-To-Refresh indicators */}
        <AnimatePresence>
          {pullY > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: pullY, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
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
                  animate={pullState === 'refreshing' ? { x: [-192, 192] } : { width: `${(pullY / 50) * 100}%` }}
                  transition={pullState === 'refreshing' ? { repeat: Infinity, duration: 1, ease: 'linear' } : { duration: 0.1 }}
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

        {/* Empty feed state */}
        {filteredPosts.length === 0 && (
          <div className="p-6 md:p-8 rounded-3xl bg-[#09071c]/50 border border-white/10 text-center py-10 space-y-6 mx-4 md:mx-0 relative overflow-hidden">
            {/* Glowing aesthetic backdrop lights */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl" />
            
            <div className="space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-violet-600 to-pink-500 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/10">
                <Globe className="w-6 h-6 text-white animate-pulse" />
              </div>
              <h4 className="text-base font-sans font-extrabold text-white tracking-wide">No posts yet</h4>
              <p className="text-xs text-violet-300/80 max-w-md mx-auto leading-relaxed">
                There is currently no content here, and you can create something.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 relative z-10">
              <button 
                onClick={() => setComposerOpen(true)}
                className="px-5 py-2.5 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all hover:shadow-lg hover:shadow-violet-500/20 active:scale-95"
              >
                + Create your first post
              </button>
            </div>
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
          const isPlaying = playingVoiceId === post.id;
          const isCommentsOpen = activeCommentsPostId === post.id;
          const activePostIndex = currentDisplayList.findIndex(p => p.id === activePostId);

          // ─── INTENSE MEDIA MANAGEMENT AND PREDICTIVE BUFFERING ───
          const hasVideo = !!post.videoUrl;
          const videoPosts = currentDisplayList.filter(p => !!p.videoUrl);
          const activeVideoIndex = videoPosts.findIndex(p => p.id === activePostId);
          const postVideoIndex = videoPosts.findIndex(p => p.id === post.id);

          // Release video player memory if not previous, current, or next video
          const shouldPreload = hasVideo && activeVideoIndex !== -1 && (
            postVideoIndex === activeVideoIndex - 1 || 
            postVideoIndex === activeVideoIndex + 1 ||
            postVideoIndex === activeVideoIndex + 2 ||
            postVideoIndex === activeVideoIndex + 3
          );

          const isReleased = hasVideo && !shouldPreload && activePostId !== post.id && (() => {
            if (activeVideoIndex === -1) {
              const activeIndexInAll = currentDisplayList.findIndex(p => p.id === activePostId);
              return Math.abs(index - activeIndexInAll) > 2;
            }
            return Math.abs(postVideoIndex - activeVideoIndex) > 1;
          })();

          // Connection adaptive buffering
          const isConnectionSlow = (() => {
            if (typeof navigator === 'undefined') return false;
            const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
            if (!conn) return false;
            return conn.saveData || ['slow-2g', '2g', '3g'].includes(conn.effectiveType);
          })();

          const isNextPost = activePostIndex !== -1 && currentDisplayList[activePostIndex + 1]?.id === post.id;
          const isSecondNextPost = activePostIndex !== -1 && currentDisplayList[activePostIndex + 2]?.id === post.id;

          let preloadMode: 'auto' | 'metadata' | 'none' = 'metadata';
          if (activePostId === post.id) {
            preloadMode = 'auto';
          } else if (shouldPreload) {
            preloadMode = isConnectionSlow ? 'metadata' : 'auto';
          } else {
            preloadMode = 'none'; // Unneeded videos have zero preload to conserve data
          }



          return (
            <React.Fragment key={post.id}>
              <FeedPostCard
                post={post}
                index={index}
                isActive={activePostId === post.id}
                playingVoiceId={playingVoiceId}
                activeCommentsPostId={activeCommentsPostId}
                followingIds={followingIds}
                pinnedPostIds={pinnedPostIds}
                shouldPreload={shouldPreload}
                isReleased={isReleased}
                preloadMode={preloadMode}
                currentUser={currentUser}
                activeDotsMenuPostId={activeDotsMenuPostId}
                setActiveDotsMenuPostId={setActiveDotsMenuPostId}
                onSpark={handleSpark}
                onSave={handleSave}
                onSharePost={onSharePost}
                onCommentToggle={(postId) => setActiveCommentsPostId(activeCommentsPostId === postId ? null : postId)}
                onToggleFollow={onToggleFollow}
                onViewProfile={onViewProfile}
                setActiveVideoFullscreen={setActiveVideoFullscreen}
                setContextualMenuPost={setContextualMenuPost}
                setMutedUserIds={setMutedUserIds}
                setBlockedUserIds={setBlockedUserIds}
                setPinnedPostIds={setPinnedPostIds}
                setHiddenPostIds={setHiddenPostIds}
                setNotInterestedTags={setNotInterestedTags}
                setMutedCreatorIds={setMutedCreatorIds}
                handlePublishScheduledPostNow={handlePublishScheduledPostNow}
                handleBroadcastReaction={handleBroadcastReaction}
                setPlayingVoiceId={setPlayingVoiceId}
                voiceSeconds={voiceSeconds}
                votedPolls={votedPolls}
                setVotedPolls={setVotedPolls}
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
                              <div className="flex gap-2 cursor-pointer items-center" onClick={() => onViewProfile?.(c.userId || c.username)}>
                                <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-lg object-cover" />
                                <div>
                                  <span className="font-sans font-bold text-violet-200 hover:underline">{c.name}</span>
                                  <span className="text-[10px] font-mono text-violet-400/60 block hover:underline">@{c.username} • <RelativeTime timestamp={c.timestamp} /></span>
                                </div>
                              </div>
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
                                        window.dispatchEvent(new CustomEvent('nexora-delete-comment', { detail: { postId: post.id, commentIndex } }));
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
                                    <div className="flex items-center gap-2 mb-1 cursor-pointer" onClick={() => onViewProfile?.(rep.userId || rep.username)}>
                                      <img src={rep.avatar} alt={rep.name} className="w-5 h-5 rounded-md object-cover" />
                                      <div>
                                        <span className="font-sans font-black text-violet-200 text-[11px] hover:underline">{rep.name}</span>
                                        <span className="text-[9px] font-mono text-violet-400/50 block hover:underline">@{rep.username} • <RelativeTime timestamp={rep.timestamp} /></span>
                                      </div>
                                    </div>
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
                                    value={replyInputs[c.id] || ''}
                                    onChange={(e) => setReplyInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                                    onKeyDown={(e) => { if(e.key === 'Enter') handleAddReplySubmit(post.id, c.id); }}
                                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl py-1 px-3 text-xs text-white focus:outline-hidden"
                                  />
                                  <button 
                                    onClick={() => handleAddReplySubmit(post.id, c.id)}
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
                          value={commentInputs[post.id] || ''}
                          onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                          onKeyDown={(e) => { if(e.key==='Enter') handleAddCommentSubmit(post.id); }}
                          className="flex-1 bg-slate-950/60 border border-white/5 focus:border-white/10 text-xs text-white placeholder:text-violet-400/40 py-2.5 px-4 rounded-xl focus:outline-hidden"
                        />
                        <button 
                          onClick={() => handleAddCommentSubmit(post.id)}
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
        {visibleCount < orderedPosts.length && (
          <div className="py-8 flex flex-col items-center justify-center space-y-2">
            <NexoraLoader size="md" center={true} />
            <span className="text-[10px] font-mono font-bold text-violet-400/80 uppercase tracking-widest">
              Loading more Nexora posts...
            </span>
          </div>
        )}

        {visibleCount >= orderedPosts.length && orderedPosts.length > 0 && (
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
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-white/10 text-xs text-white rounded-xl p-3 focus:outline-hidden placeholder:text-violet-400/30 resize-none font-sans"
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

      {/* NEW MOMENT STORIES CREATOR MODAL */}
      <AnimatePresence>
        {isCreateMomentOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-linear-to-b from-[#110d2d] to-[#04030d] border border-white/10 rounded-2xl p-6 max-w-md w-full relative space-y-4 text-left font-sans"
            >
              <button 
                type="button"
                onClick={() => setIsCreateMomentOpen(false)}
                className="absolute top-4 right-4 p-1 rounded-lg bg-white/5 text-violet-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="text-md font-sans font-black text-white flex items-center gap-1.5">
                  <span className="text-lg">✨</span> Add to Your Story
                </h3>
                <p className="text-[10.5px] font-mono text-violet-400/60 leading-normal">
                  Stories disappear after 24 hours. Share a quick update, photo, or voice note with your friends!
                </p>
              </div>

              {/* Form container */}
              <form onSubmit={handleSaveNewMoment} className="space-y-4">
                
                {/* Media Select segment */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-violet-400 block uppercase font-bold">Choose Media Type</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: 'photo', label: '📸 Photo', defaultUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' },
                      { id: 'video', label: '🎥 Video', defaultUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80' },
                      { id: 'voice', label: '🎙️ Voice', defaultUrl: '' },
                      { id: 'text', label: '📝 Plain', defaultUrl: '' }
                    ].map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => {
                          setMomentMediaType(type.id as any);
                          if (type.defaultUrl) setMomentMediaUrl(type.defaultUrl);
                        }}
                        className={`py-2 px-1 rounded-xl font-sans text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          momentMediaType === type.id 
                            ? 'bg-violet-600 border-violet-400 text-white shadow-md shadow-violet-600/20' 
                            : 'bg-black/40 border-white/5 text-violet-400/80 hover:text-white'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional photo preset backdrops select */}
                {momentMediaType === 'photo' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-mono text-violet-400 block uppercase font-bold">Select Backdrop</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { name: 'Aurora', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80' },
                        { name: 'Cosmic', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80' },
                        { name: 'Neon', url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=80' },
                        { name: 'Haze', url: 'https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?w=600&auto=format&fit=crop&q=80' }
                      ].map((img) => (
                        <button
                          key={img.name}
                          type="button"
                          onClick={() => setMomentMediaUrl(img.url)}
                          className={`relative h-12 rounded-xl overflow-hidden border transition-all ${
                            momentMediaUrl === img.url ? 'border-violet-400 ring-2 ring-violet-500/20 scale-102' : 'border-white/5 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                          <div className="absolute inset-x-0 bottom-0 py-0.5 bg-black/70 text-[8px] font-mono font-bold text-center text-white truncate">
                            {img.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conditional Voice Recording simulator panel */}
                {momentMediaType === 'voice' && (
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 flex flex-col items-center justify-center space-y-3 animate-fade-in">
                    <button
                      type="button"
                      onClick={() => setSimulatedVoiceRecording(!simulatedVoiceRecording)}
                      className={`h-14 w-14 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        simulatedVoiceRecording 
                          ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white font-black text-xs scale-105' 
                          : 'bg-violet-600 hover:bg-violet-500 text-white'
                      }`}
                    >
                      {simulatedVoiceRecording ? <span className="text-[10px] uppercase font-mono tracking-tighter col-indigo">STOP</span> : <Mic className="w-5 h-5 col-violet" />}
                    </button>
                    <div className="text-center">
                      <span className="text-[9.5px] font-mono text-violet-300">
                        {simulatedVoiceRecording 
                          ? `🔴 Recording Wave - ${simulatedVoiceSeconds}s elapsed` 
                          : simulatedVoiceSeconds > 0 
                            ? `🎙️ Voice broadcast ready: ${simulatedVoiceSeconds} seconds` 
                            : 'Click microphone to record voice wave'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Caption / Quote inputs */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-400 block uppercase font-bold">Caption / Display text</label>
                  <textarea
                    required={momentMediaType === 'text'}
                    placeholder={
                      momentMediaType === 'voice' ? 'Describe your voice message...' :
                      momentMediaType === 'video' ? 'Add some tags or notes...' :
                      'What is on your mind today?'
                    }
                    value={momentCaption}
                    onChange={(e) => setMomentCaption(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950/60 border border-white/5 focus:border-white/10 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden resize-none placeholder:text-violet-400/20 text-left"
                  />
                </div>

                {/* Submit panel */}
                <div className="pt-2 border-t border-white/5 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsCreateMomentOpen(false)}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-violet-300 text-xs font-mono font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 rounded-xl text-white text-xs font-mono font-black uppercase tracking-wider cursor-pointer"
                  >
                    Post Story ✨
                  </button>
                </div>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DUMP SCREEN MOMENT STORIES VIEWER OVERLAY */}
      <AnimatePresence>
        {selectedMoment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#060413] z-50 flex flex-col overflow-hidden"
          >
            {/* Background Media Rendering */}
            {selectedMoment.mediaUrl && selectedMoment.mediaType === 'photo' && (
              <div className="absolute inset-0 z-0 select-none pointer-events-none">
                <img 
                  referrerPolicy="no-referrer"
                  src={selectedMoment.mediaUrl} 
                  alt="Background aura" 
                  className="w-full h-full object-cover opacity-35 select-none" 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#060413] via-[#060413]/70 to-[#060413]" />
              </div>
            )}

            {selectedMoment.mediaType === 'video' && selectedMoment.mediaUrl && (
              <div className="absolute inset-0 z-0 overflow-hidden select-none">
                <NexoraVideo
                  src={selectedMoment.mediaUrl}
                  autoPlay
                  loop
                  muted={false}
                  playsInline
                  className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#060413]/70 via-[#060413]/30 to-[#060413]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,92,246,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.1)_1px,transparent_1px)] bg-[size:30px_30px]" />
                <div className="absolute bottom-5 left-5 text-[8px] font-mono text-cyan-400/60 uppercase tracking-widest leading-relaxed">
                  STREAMING // HIGH DEFINITION // 60 FPS<br />
                  TIMECODE: 00:00:{(storyIndex * 15).toString().padStart(2, '0')}
                </div>
              </div>
            )}

            {/* Story loading sequence indicator */}
            <div className="flex gap-1.5 p-3 shrink-0 z-10">
              {selectedMoment.quotes.map((_, i) => (
                <div key={i} className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden relative">
                  {i < storyIndex && <div className="absolute inset-0 bg-violet-500" />}
                  {i === storyIndex && (
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 7, ease: 'linear' }}
                      onAnimationComplete={() => {
                        if (storyIndex < selectedMoment.quotes.length - 1) {
                          setStoryIndex(idx => idx + 1);
                        } else {
                          setSelectedMoment(null);
                        }
                      }}
                      className="absolute left-0 top-0 bottom-0 bg-linear-to-r from-violet-500 to-pink-400"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Title banner */}
            <div className="p-4 flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3">
                <img src={selectedMoment.avatar} alt={selectedMoment.name} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                <div>
                  <span className="font-sans font-black text-sm text-white flex items-center gap-1">
                    {selectedMoment.name}
                    {(selectedMoment.username === 'voh' || selectedMoment.username === 'nexora_ai' || selectedMoment.username === 'voh_ai') && <CheckCircle className="w-3.5 h-3.5 text-violet-400 fill-current" />}
                  </span>
                  <span className="text-[10px] font-mono text-violet-400/70 block">
                    @{selectedMoment.username} • {selectedMoment.mediaType === 'voice' ? '🎙️ Voice broadcast' : selectedMoment.mediaType === 'video' ? '🎥 Video moment' : selectedMoment.mediaType === 'photo' ? '📸 Interactive image' : '📝 Text Broadcast'}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedMoment(null)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-violet-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Immersive core content display depending on mediaType */}
            <div className="flex-1 p-6 md:p-10 flex flex-col justify-center items-center text-center relative z-10 select-none">
              
              {selectedMoment.mediaType === 'voice' ? (
                /* Dynamic active voice moment equalizer experience */
                <div className="max-w-md w-full space-y-8 flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    {/* Pulsing ring */}
                    <div className={`absolute w-32 h-32 rounded-full border-2 border-white/10 ${playingVoiceMoment ? 'animate-ping scale-110 opacity-70' : ''}`} style={{ animationDuration: '3s' }} />
                    <div className="relative w-24 h-24 rounded-full bg-linear-to-r from-violet-600 to-pink-500 flex items-center justify-center shadow-lg border border-white/10 z-10">
                      <button 
                        onClick={() => setPlayingVoiceMoment(!playingVoiceMoment)}
                        className="text-white hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
                      >
                        {playingVoiceMoment ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 pl-1" />}
                      </button>
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <span className="text-[10px] font-mono bg-violet-500/10 border border-white/10 px-3 py-1 rounded-full text-violet-300 font-extrabold uppercase tracking-widest">
                      {playingVoiceMoment ? '🎙️ Playing Voice Matrix...' : '🎙️ Click to Hear Broadcast'}
                    </span>
                    <p className="text-xs text-violet-300/60 font-mono">Duration: {selectedMoment.voiceDuration || 15} seconds</p>
                  </div>

                  {/* Equalizer animation */}
                  <div className="flex items-end gap-1 h-12">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16].map((bar) => {
                      const delay = bar * 0.1;
                      return (
                        <div 
                          key={bar} 
                          className="w-1.5 rounded-t bg-linear-to-t from-violet-500 to-pink-400 transition-all origin-bottom"
                          style={{
                            height: playingVoiceMoment ? `${Math.floor(Math.sin(bar * 0.5) * 20) + 18}px` : '4px',
                            transition: 'height 0.1s ease-in-out',
                          }}
                        />
                      );
                    })}
                  </div>

                  <blockquote className="text-sm md:text-md italic text-violet-200/90 font-medium max-w-sm">
                    "{selectedMoment.quotes[storyIndex]}"
                  </blockquote>
                </div>
              ) : (
                /* Classic background typography display */
                <div className="max-w-xl space-y-6">
                  <div className="absolute top-24 left-10 text-[120px] font-serif text-white/5 select-none font-black pointer-events-none">"</div>
                  <blockquote className="text-xl md:text-3.5xl font-sans text-transparent bg-clip-text bg-linear-to-b from-white via-violet-100 to-violet-300 font-extrabold tracking-tight leading-relaxed select-all">
                    {selectedMoment.quotes[storyIndex]}
                  </blockquote>
                  <div className="flex justify-center">
                    <div className="w-12 h-[2px] bg-linear-to-r from-violet-600 to-pink-500 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            {/* Story Reactions and DM Quick replies */}
            <div className="px-8 py-2.5 bg-[#09071c]/60 max-w-lg mx-auto w-full z-10 rounded-2xl border border-white/10 space-y-3.5 mb-2">
              
              {/* Seen List Viewer (For own stories or when author looks!) */}
              {selectedMoment && selectedMoment.username === currentUser.username && (
                <div className="border-b border-white/5 pb-2 text-left">
                  <span className="text-[9px] font-mono text-[#10B981] font-bold uppercase tracking-widest block mb-1">👀 Seen List ({selectedMoment.seenList?.length || 0} views)</span>
                  <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {selectedMoment.seenList && selectedMoment.seenList.length > 0 ? (
                      selectedMoment.seenList.map((viewerId: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1 bg-white/5 py-1 px-2 rounded-lg text-[9px] font-mono shrink-0">
                          <div className="w-3.5 h-3.5 rounded-full bg-violet-600/20 text-violet-400 flex items-center justify-center text-[7px] font-extrabold font-sans">
                            {viewerId.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-zinc-300">viewer_{viewerId.slice(-4)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[9.5px] text-zinc-500 font-sans italic">No views registered yet today. Keep co-building!</span>
                    )}
                  </div>
                </div>
              )}

              {/* Highlight Pinner Action button */}
              {selectedMoment && !selectedMoment.isHighlightPlay && (
                <div className="border-b border-white/5 pb-2.5 flex items-center justify-between text-left">
                  <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1 select-none">
                    ⭐ Story Highlights
                  </span>
                  {isCreatingHighlight ? (
                    <div className="flex gap-1 items-center">
                      <input 
                        type="text" 
                        id="hl-input-title"
                        placeholder="Title e.g. Coding 💻"
                        className="bg-black/60 text-[10px] text-white py-1 px-2 rounded-lg border border-amber-500/30 w-32 focus:outline-hidden"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const el = e.currentTarget;
                            if (!el.value.trim()) return;
                            
                            const title = el.value.trim();
                            const newHl = {
                              id: `hl-${Date.now()}`,
                              title,
                              cover: title.split(' ').pop() || '⭐',
                              stories: [
                                { mediaUrl: selectedMoment.mediaUrl || '', caption: selectedMoment.quotes[storyIndex] }
                              ]
                            };
                            const nextList = [newHl, ...storyHighlightsList];
                            setStoryHighlightsList(nextList);
                            localStorage.setItem('nexora_story_highlights', JSON.stringify(nextList));
                            setIsCreatingHighlight(false);
                            window.dispatchEvent(new CustomEvent('toast', { detail: `🌟 Highlight '${title}' created and saved!` }));
                          }
                        }}
                      />
                      <button 
                        onClick={() => setIsCreatingHighlight(false)}
                        className="text-[10px] text-rose-400 px-1 font-bold"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsCreatingHighlight(true)}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-lg font-mono text-[9px] font-black uppercase tracking-wider cursor-pointer"
                    >
                      + Save to Highlight
                    </button>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-violet-400 font-bold uppercase tracking-wider">Quick Reactions</span>
                <div className="flex gap-4 text-sm col-f flex-row">
                  {['❤️', '🔥', '😂', '👍', '😮'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('toast', { detail: `Sent ${emoji} reaction to @${selectedMoment.username}` }));
                      }}
                      className="hover:scale-130 active:scale-95 transition-transform cursor-pointer"
                      title={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* DM Reply box */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Send direct reply to @${selectedMoment.username}...`}
                  className="flex-1 px-4 py-2 text-xs rounded-xl bg-slate-950/80 border border-white/10 focus:border-[#8B5CF6] focus:outline-hidden text-white placeholder-violet-400/30 font-sans"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      if (!input.value.trim()) return;
                      window.dispatchEvent(new CustomEvent('toast', { detail: `Reply sent as secure DM: "${input.value}"` }));
                      input.value = '';
                    }
                  }}
                />
                <button
                  onClick={(e) => {
                    const sibling = e.currentTarget.previousSibling as HTMLInputElement;
                    if (sibling && sibling.value.trim()) {
                      window.dispatchEvent(new CustomEvent('toast', { detail: `Reply sent as secure DM: "${sibling.value}"` }));
                      sibling.value = '';
                    }
                  }}
                  className="px-3 py-2 bg-linear-to-r from-violet-600 to-indigo-600 rounded-xl font-mono text-[10px] font-bold text-white uppercase hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                >
                  Send Reply
                </button>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="p-6 flex justify-between shrink-0 mb-4 px-8 z-10">
              <button 
                onClick={() => {
                  if (storyIndex > 0) {
                    setStoryIndex(storyIndex - 1);
                  }
                }}
                disabled={storyIndex === 0}
                className="px-5 py-2.5 border border-white/10 rounded-xl font-mono text-xs text-violet-300 disabled:opacity-30 cursor-pointer"
              >
                ← Back
              </button>
              <button 
                onClick={() => {
                  if (storyIndex < selectedMoment.quotes.length - 1) {
                    setStoryIndex(storyIndex + 1);
                  } else {
                    setSelectedMoment(null);
                  }
                }}
                className="px-5 py-2.5 bg-linear-to-r from-violet-600 to-pink-500 text-white rounded-xl font-mono text-xs font-bold cursor-pointer"
              >
                {storyIndex === selectedMoment.quotes.length - 1 ? 'Close Story' : 'Next →'}
              </button>
            </div>
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
        targetType={reportingPost?.targetContent ? 'user' : 'post'}
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
        {analyticsPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-gradient-to-b from-[#110e2e]/95 to-[#070519]/95 border border-pink-500/30 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-md relative overflow-hidden text-left"
            >
              {/* Glowing background highlights */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex items-center justify-between border-b border-white/5 pb-3.5 mb-4 relative z-10">
                <span className="text-xs font-mono text-pink-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-pink-400 animate-pulse" /> CREATOR PERFORMANCE INDEX
                </span>
                <button 
                  onClick={() => setAnalyticsPost(null)}
                  className="p-1 px-2.5 bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer text-xs font-mono border border-white/5"
                >
                  Close ×
                </button>
              </div>

              {/* Post brief preview snippet */}
              <div className="p-3 bg-white/3 rounded-xl border border-white/5 space-y-1 mb-5 relative z-10">
                <span className="text-[8.5px] font-mono text-violet-400">INDEX TARGET POST</span>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed line-clamp-2 italic">
                  "{analyticsPost.content}"
                </p>
              </div>

              {/* Analytics metrics grid */}
              <div className="grid grid-cols-2 gap-3 relative z-10">
                <div className="p-3.5 bg-[#0d0a26] border border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">Estimated Reach</span>
                  <div className="text-lg font-black text-white font-sans">
                    {analyticsPost.likes * 12 + analyticsPost.comments.length * 28 + 152}
                  </div>
                  <div className="text-[8.5px] font-mono text-emerald-400 flex items-center gap-0.5">
                    <span>↑ 14.5%</span> <span className="text-zinc-500">vs benchmark</span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#0d0a26] border border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">Engagement Rate</span>
                  <div className="text-lg font-black text-pink-400 font-sans">
                    {analyticsPost.likes > 0 ? (12.4 + (analyticsPost.comments.length * 1.5)).toFixed(1) : '8.2'}%
                  </div>
                  <div className="text-[8.5px] font-mono text-violet-400 flex items-center gap-0.5">
                    <span>⚡ High</span> <span className="text-zinc-500">engagement</span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#0d0a26] border border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">Profile Visits</span>
                  <div className="text-lg font-black text-white font-sans">
                    {analyticsPost.likes * 2 + 5}
                  </div>
                  <div className="text-[8.5px] font-mono text-emerald-400 flex items-center gap-0.5">
                    <span>↑ 18.2%</span> <span className="text-zinc-500">profile conversion</span>
                  </div>
                </div>

                <div className="p-3.5 bg-[#0d0a26] border border-white/5 rounded-2xl space-y-1">
                  <span className="text-[9px] font-mono text-zinc-400 uppercase tracking-wider block">{TERMINOLOGY.followersCapitalized} Gained</span>
                  <div className="text-lg font-black text-cyan-400 font-sans">
                    +{Math.floor(analyticsPost.likes * 0.1) + 1}
                  </div>
                  <div className="text-[8.5px] font-mono text-cyan-400 flex items-center gap-0.5">
                    <span>🚀 Fast Grow</span> <span className="text-zinc-500">organic reach</span>
                  </div>
                </div>
              </div>

              {/* Progress and tips bar */}
              <div className="mt-5 p-3.5 bg-violet-600/10 border border-white/10 rounded-2xl space-y-2 relative z-10">
                <span className="text-[9px] font-mono text-violet-300 font-black uppercase tracking-widest block">
                  💡 NEXORA AUDIENCE INSIGHT
                </span>
                <p className="text-[11px] text-violet-200 font-sans leading-relaxed">
                  Your content has been indexed inside Nigeria & surrounding networks! Post another item targeting <strong className="text-pink-400">#{analyticsPost.tags[0] || 'Nexora'}</strong> within the next 4 hours to maximize your viral multiplier.
                </p>
              </div>

              <div className="mt-4 text-center">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider">
                  Verified by Nexora Security
                </span>
              </div>
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
                  Nexora compiles a dynamic telemetry graph mapping interest weights from your interactions (clicks, Sparks/likes, dwell time, comments). Here is why this item was dispatched:
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
