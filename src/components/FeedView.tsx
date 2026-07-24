import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Zap, Repeat, MessageCircle, Bookmark, Cpu, Play, Pause, Volume2, Mic, Send, Briefcase, Users, Award, Star, Search, X, Plus, Filter, Trash, RefreshCw, Globe, MapPin, Sliders, VolumeX, CheckCircle, ChevronDown, ChevronUp, MoreHorizontal, EyeOff, FolderPlus, Folder, ShieldAlert, Edit2, UserPlus, ThumbsDown, BarChart2, Pin, BookOpen, Archive, Heart, Wifi, WifiOff, Info, Undo2, Sparkles, TrendingUp, Activity } from 'lucide-react';
import { User, Post, Comment, ThemeMood } from '../types';
import ReportModal from './ReportModal';
import NexoraVideoPlayer from './NexoraVideoPlayer';
import NexoraPremiumLogo from './NexoraPremiumLogo';
import NexoraBranding from './NexoraBranding';
import NexoraLoader from './NexoraLoader';
import VohSummaryButton from './VohSummaryButton';
import RelativeTime from './RelativeTime';
import NexoraVideo from './NexoraVideo';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import StoriesView from './StoriesView';
import { getRecommendationScore, recordRecommendationEvent } from '../utils/recommendations';
import { globalVideoPlaybackManager } from '../utils/VideoPlaybackManager';
import { TERMINOLOGY } from '../services/voh';

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

const SEARCHABLE_SYSTEM_USERS = [
  { id: 'voh', name: 'VOICE OF HARRISON', username: 'voh', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg', isVerified: true, followers: 15300000, bio: 'Founder & System Architect. Building social systems with absolute visual rhythm.' },
  { id: 'official', name: 'Official', username: 'official', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80', isVerified: true, followers: 6400000, bio: 'Official platform account 🌟 Keeping you posted with community updates, feature releases, and everyday stories.' },
  { id: 'ai_assistant', name: 'AI Assistant', username: 'ai_assistant', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80', isVerified: true, followers: 8700000, bio: 'The Intelligent AI assistant. Syncing daily trends, movie reviews, and helper scripts.' }
];

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
  activeTab = 'feed'
}: FeedViewProps) {
  // Database states
  const [localPosts, setLocalPosts] = useState<RefactoredPost[]>([]);
  const [feedTab, setFeedTab] = useState<'for_you' | 'following' | 'friends' | 'trending' | 'local'>(() => {
    const saved = localStorage.getItem('nexora_feed_tab');
    if (saved === 'communities' || saved === 'polls' || saved === 'contributions' || saved === 'broadcast' || saved === 'pulse') return 'for_you';
    return (saved as any) || 'for_you';
  });

  // Scroll positions memory for each category tab
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const prevTabRef = useRef<string>('for_you');

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

  // Infinite Scroll intersection callback simulator
  useEffect(() => {
    let debounceTimer: any = null;

    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
      
      // Debounce localStorage writes to prevent main thread blocking and UI stutter
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        localStorage.setItem('nexora_feed_scroll_pos', String(scrollTop));
      }, 200);

      if (scrollHeight - scrollTop - clientHeight < 120) {
        // threshold reached! Automatically load more
        setVisibleCount(prev => Math.min(prev + 6, localPosts.length));
      }
    };
    
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [localPosts, visibleCount]);

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

  // Prepend a beautiful simulated post on pull-to-refresh
  const addNewFreshSimulatedPost = () => {
    const topics = ['tech', 'afrobeats', 'creative', 'football', 'web3', 'design'];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const contentTemplates = [
      `🚀 Matrix compilation level 9 reached! Seamless H.265 video rendering now fully operational in Nexora's streaming engine. Check out the beautiful custom shaders! #${randomTopic} #matrix #voh`,
      `⚽ What a spectacular performance in today's match! Fully analyzing player telemetry data and heatmaps. Unbelievable energy from the fans tonight! #${randomTopic} #football #match`,
      `🎨 Aesthetic minimalism is the ultimate sophistication. Designing this network to support absolute layout rhythm, negative space, and custom color accents. #${randomTopic} #craft #design`,
      `🎙️ Broadcast channels are live! Streaming premium audio and video traces directly to all active subscribers. The future of decentralized social is here. #${randomTopic} #voice #streaming`,
    ];
    const imageTemplates = [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=600&auto=format&fit=crop&q=80'
    ];
    
    const newPost: RefactoredPost = {
      id: `simulated-${Date.now()}`,
      userId: 'user-0',
      username: 'voh',
      name: 'VOICE OF HARRISON',
      avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg',
      isVerified: true,
      content: contentTemplates[Math.floor(Math.random() * contentTemplates.length)],
      image: Math.random() > 0.4 ? imageTemplates[Math.floor(Math.random() * imageTemplates.length)] : undefined,
      tags: [randomTopic, 'nexora'],
      likes: Math.floor(Math.random() * 45) + 12,
      commentsCount: Math.floor(Math.random() * 8),
      shares: Math.floor(Math.random() * 5),
      timestamp: 'Just now',
      comments: [],
    };
    
    setLocalPosts(prev => [newPost, ...prev]);
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
          window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Telemetry sync successful. Feed updated!' }));
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
    } else if (feedTab === 'local') {
      const inSearchRegion = post.location?.toLowerCase().includes("nigeria") || post.location?.toLowerCase().includes("harcourt") || post.location?.toLowerCase().includes("lagos") || post.location;
      if (!post.location && !inSearchRegion) return false;
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

    // Empty Feed Protection: If the For You feed is empty but there are posts on the platform,
    // fallback to public posts that are not blocked or hidden, ensuring the feed is never blank.
    if (feedTab === 'for_you' && list.length === 0 && localPosts.length > 0) {
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

    // Apply For You Engagement boost only if not strictly sorted or in specialized feeds
    const sorted = (() => {
      let sortedList = [...list];
      if (feedTab === 'for_you') {
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

      if (feedTab === 'for_you') {
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

  // "One Swipe = One Video" precise navigation interceptor to prevent multi-video jumps
  const isInterceptScrollingRef = useRef(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let touchStartY = 0;
    let touchStartX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      // Do not block scrolling inside comments container, modal or other overlays
      if (
        (e.target as HTMLElement).closest('.comments-container') || 
        (e.target as HTMLElement).closest('.modal-content') || 
        activeCommentsPostId
      ) {
        return;
      }
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (
        (e.target as HTMLElement).closest('.comments-container') || 
        (e.target as HTMLElement).closest('.modal-content') || 
        activeCommentsPostId
      ) {
        return;
      }

      if (isInterceptScrollingRef.current) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      const deltaY = e.touches[0].clientY - touchStartY;
      const deltaX = e.touches[0].clientX - touchStartX;

      // Vertical swipe detection (greater than horizontal swipe and exceeds threshold of 40px)
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 40) {
        const direction = deltaY < 0 ? 1 : -1; // 1 = swipe up (next post), -1 = swipe down (prev post)
        const currentIndex = currentDisplayList.findIndex(p => p.id === activePostId);
        
        if (currentIndex !== -1) {
          const nextIndex = currentIndex + direction;
          if (nextIndex >= 0 && nextIndex < currentDisplayList.length) {
            const nextPost = currentDisplayList[nextIndex];
            const nextElement = document.getElementById(`post-${nextPost.id}`);
            if (nextElement) {
              if (e.cancelable) e.preventDefault();
              isInterceptScrollingRef.current = true;
              setActivePostId(nextPost.id);
              
              // Smooth precise scrolling using browser APIs
              nextElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              
              setTimeout(() => {
                isInterceptScrollingRef.current = false;
              }, 500); // Enforce a 500ms cool-down period to lock aggressive scrolls
            }
          }
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (
        (e.target as HTMLElement).closest('.comments-container') || 
        (e.target as HTMLElement).closest('.modal-content') || 
        activeCommentsPostId
      ) {
        return;
      }

      if (isInterceptScrollingRef.current) {
        if (e.cancelable) e.preventDefault();
        return;
      }

      // Check if scroll delta is significant to trigger page jump
      if (Math.abs(e.deltaY) > 15) {
        const direction = e.deltaY > 0 ? 1 : -1;
        const currentIndex = currentDisplayList.findIndex(p => p.id === activePostId);
        
        if (currentIndex !== -1) {
          const nextIndex = currentIndex + direction;
          if (nextIndex >= 0 && nextIndex < currentDisplayList.length) {
            const nextPost = currentDisplayList[nextIndex];
            const nextElement = document.getElementById(`post-${nextPost.id}`);
            if (nextElement) {
              if (e.cancelable) e.preventDefault();
              isInterceptScrollingRef.current = true;
              setActivePostId(nextPost.id);
              
              nextElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
              
              setTimeout(() => {
                isInterceptScrollingRef.current = false;
              }, 500);
            }
          }
        }
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('wheel', handleWheel);
    };
  }, [currentDisplayList, activePostId, activeCommentsPostId]);

  // Active Post Viewport Detection using vertical-center proximity
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const containerRect = container.getBoundingClientRect();
      const containerCenter = containerRect.top + containerRect.height / 2;

      const items = container.querySelectorAll('[data-post-id]');
      let closestPostId: string | null = null;
      let minDistance = Infinity;

      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenter = rect.top + rect.height / 2;
        const distance = Math.abs(itemCenter - containerCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestPostId = item.getAttribute('data-post-id');
        }
      });

      if (closestPostId && closestPostId !== activePostId) {
        setActivePostId(closestPostId);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    // Initial evaluation
    handleScroll();
    const timer = setTimeout(handleScroll, 150);

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      clearTimeout(timer);
    };
  }, [currentDisplayList, activePostId]);

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
      case 'neon-cyber': return 'bg-[#050409]/80 border-b border-violet-500/15 text-purple-100';
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
        className="w-full h-full overflow-y-auto scrollbar-none scroll-smooth overscroll-contain snap-y snap-mandatory relative bg-black touch-pan-y"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {/* HERO HEADER: NEXORA & Tagline (Scrolls away naturally) */}
        <div className="px-6 pt-6 pb-5 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <NexoraBranding size="md" showSubtitle={true} />
          <button 
            onClick={() => {
              window.dispatchEvent(new CustomEvent('toast', { detail: '📬 Opening your Direct Messages inbox...' }));
              window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'matrix', subTab: 'messages' } }));
            }}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-violet-300 hover:text-white transition-all border border-white/10 cursor-pointer flex items-center gap-2 text-xs font-mono shadow-md"
            title="Messages"
          >
            <MessageCircle className="w-4 h-4 text-violet-400" />
            <span className="hidden sm:inline font-bold">Inbox</span>
          </button>
        </div>

        {/* STICKY FEED TABS BAR (Pins to top when scrolled past hero header) */}
        <div className="sticky top-0 z-30 bg-[#06040f]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-4 md:gap-6 overflow-x-auto scrollbar-none max-w-full">
            {(['for_you', 'following', 'friends', 'trending', 'local'] as const).map(tab => {
              const isActive = feedTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => {
                    setFeedTab(tab);
                    setVisibleCount(8);
                  }}
                  className={`relative text-center pb-1.5 px-1 font-sans text-xs font-extrabold uppercase tracking-wider transition-all duration-250 cursor-pointer whitespace-nowrap ${
                    isActive ? 'text-white text-shadow-sm scale-105' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeFeedTab"
                      className="absolute bottom-0 left-0 right-0 h-[3px] bg-linear-to-r from-violet-500 via-pink-500 to-violet-500 rounded-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10">
                    {tab === 'for_you' && 'For You'}
                    {tab === 'following' && 'Following'}
                    {tab === 'friends' && 'Friends'}
                    {tab === 'trending' && 'Trending'}
                    {tab === 'local' && 'Local'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Animated Pull-To-Refresh indicators */}
        <AnimatePresence>
          {pullY > 0 && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: pullY, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="w-full overflow-hidden flex flex-col items-center justify-center bg-violet-950/20 border-b border-violet-500/10 shrink-0 select-none"
            >
              <div className="flex items-center gap-2 text-violet-300 font-mono text-[10px] uppercase tracking-widest font-extrabold py-2">
                <div className="w-5 h-5 rounded-full bg-linear-to-tr from-violet-600 to-pink-500 flex items-center justify-center animate-spin">
                  <Star className="w-3 h-3 text-white" />
                </div>
                <span>
                  {pullState === 'refreshing' 
                    ? 'Synergizing Feed Matrix...' 
                    : pullY > 50 
                      ? 'Release to Sync Telemetry' 
                      : 'Pull to Recalibrate'}
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
          <div className="shrink-0 flex items-center justify-between bg-violet-600/10 border border-violet-500/25 px-3 py-1.5 rounded-xl mx-4 md:mx-0">
            <span className="text-xs font-mono text-violet-300">Filtering tags containing: <strong className="text-white">#{selectedTag}</strong></span>
            <button onClick={() => setSelectedTag(null)} className="text-violet-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Empty feed state */}
        {filteredPosts.length === 0 && (
          <div className="p-6 md:p-8 rounded-3xl bg-[#09071c]/50 border border-violet-500/10 text-center py-10 space-y-6 mx-4 md:mx-0 relative overflow-hidden">
            {/* Glowing aesthetic backdrop lights */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/10 rounded-full blur-2xl" />
            
            <div className="space-y-3 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-violet-600 to-pink-500 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/10">
                <Globe className="w-6 h-6 text-white animate-pulse" />
              </div>
              <h4 className="text-sm font-sans font-bold text-violet-100 uppercase tracking-wider">No Posts Yet</h4>
              <p className="text-xs text-violet-300/70 max-w-md mx-auto leading-relaxed">
                You haven't shared anything yet. Create your first post and start connecting with the world.
              </p>
            </div>

            {/* Suggested system users to follow */}
            <div className="bg-[#0b0a24]/60 border border-violet-500/10 rounded-2xl p-4 text-left space-y-3 relative z-10">
              <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">⭐ Recommended Creators</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {suggestedUsers.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-2.5 bg-black/30 border border-white/5 rounded-xl">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-lg object-cover border border-violet-500/20 shrink-0" />
                      <div className="min-w-0 leading-tight">
                        <p className="text-xs font-bold text-white truncate">{u.name}</p>
                        <p className="text-[9.5px] font-mono text-violet-400/80 truncate">@{u.username}</p>
                      </div>
                    </div>
                    <motion.button 
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onToggleFollow?.(u.id)}
                      className={`p-1 px-2.5 rounded-lg text-[9px] font-mono uppercase font-extrabold cursor-pointer transition-all duration-300 shrink-0 ${
                        followingIds.includes(u.id) 
                          ? 'bg-violet-950 text-violet-300 border border-violet-500/20' 
                          : 'bg-linear-to-r from-violet-600 to-pink-500 text-white shadow-md shadow-violet-500/20 hover:shadow-violet-500/40'
                      }`}
                    >
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={followingIds.includes(u.id) ? 'followed' : 'follow'}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          transition={{ duration: 0.15 }}
                          className="block"
                        >
                          {followingIds.includes(u.id) ? 'Followed' : '+ Follow'}
                        </motion.span>
                      </AnimatePresence>
                    </motion.button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2.5 relative z-10">
              <button 
                onClick={() => setComposerOpen(true)}
                className="px-4 py-2.5 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white rounded-xl text-xs font-mono font-bold cursor-pointer transition-all hover:shadow-lg hover:shadow-violet-500/20"
              >
                + Create Post
              </button>
              <button 
                onClick={() => {
                  setPullY(50);
                  setPullState('refreshing');
                  setIsRefreshing(true);
                  setTimeout(() => {
                    addNewFreshSimulatedPost();
                    setIsRefreshing(false);
                    setPullState('idle');
                    setPullY(0);
                    window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Feed recalibrated and filled with fresh telemetry!' }));
                  }, 1200);
                }}
                className="px-4 py-2.5 bg-[#0c0823] hover:bg-violet-950 text-violet-300 border border-violet-500/20 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
              >
                Recalibrate Feed 🔄
              </button>
              <button 
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'explore' } }));
                  window.dispatchEvent(new CustomEvent('toast', { detail: '🌐 Redirecting to Explorer panel...' }));
                }}
                className="px-4 py-2.5 bg-[#0c0823] hover:bg-violet-950 text-violet-300 border border-violet-500/20 rounded-xl text-xs font-mono font-bold cursor-pointer transition-all"
              >
                Explore Discover 🌐
              </button>
            </div>
          </div>
        )}

        {/* Profile Searchability Section */}
        {(() => {
          const isSearchingUsers = searchFilterType === 'users';
          const query = searchQuery.trim().toLowerCase();
          const matchingUsers = query
            ? SEARCHABLE_SYSTEM_USERS.filter(u => 
                u.name.toLowerCase().includes(query) || 
                u.username.toLowerCase().includes(query) ||
                u.bio.toLowerCase().includes(query)
              )
            : (isSearchingUsers ? SEARCHABLE_SYSTEM_USERS : []);

          if (isSearchingUsers && matchingUsers.length === 0) {
            return (
              <div className="p-8 rounded-3xl bg-[#09071c]/50 border border-violet-500/10 text-center py-12 space-y-4">
                <span className="text-3xl select-none">👥</span>
                <h4 className="text-sm font-sans font-bold text-violet-100">No members matched your search query.</h4>
                <p className="text-xs text-violet-300/70 max-w-md mx-auto leading-relaxed">
                  You're just getting started. Follow people and grow your network. Try searching for "voh", "sarah" or "alex" to follow top creators.
                </p>
              </div>
            );
          }

          if (matchingUsers.length > 0 && (isSearchingUsers || query)) {
            return (
              <div className="space-y-3.5 pt-2 pb-3.5 text-left">
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#8B5CF6] font-extrabold flex items-center gap-1.5 px-1">
                  👥 Verified Nexora Accounts ({matchingUsers.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {matchingUsers.map(u => (
                    <div 
                      key={u.id}
                      className="p-4 rounded-3xl bg-[#0e0a2b]/95 border border-violet-500/20 hover:border-violet-500/40 shadow-xl flex flex-col justify-between transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex gap-3">
                        <img 
                          src={u.avatar} 
                          alt={u.name}
                          className="w-12 h-12 rounded-full object-cover border border-violet-500/15 cursor-pointer shrink-0"
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
                          👥 <strong>{u.followers.toLocaleString()}</strong> followers
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

        {/* SKELETON FEED CARDS ON REFRESH */}
        {isRefreshing && (
          <div className="space-y-4 text-left">
            <div className="flex justify-center pt-2 pb-4">
              <NexoraLoader size="md" center={true} />
            </div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="p-5 rounded-3xl bg-[#0b091e]/60 border border-violet-500/10 space-y-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-full bg-violet-950/40 shrink-0" />
                  <div className="space-y-2 flex-1 pt-1">
                    <div className="h-3 w-1/3 bg-violet-900/30 rounded-lg" />
                    <div className="h-2.5 w-1/4 bg-violet-900/25 rounded-md" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-full bg-violet-900/25 rounded-md" />
                  <div className="h-3 w-5/6 bg-violet-900/25 rounded-md" />
                  <div className="h-3 w-2/3 bg-violet-900/20 rounded-md" />
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <div className="h-3.5 w-10 bg-violet-900/35 rounded-md" />
                  <div className="h-3.5 w-12 bg-violet-900/35 rounded-md" />
                  <div className="h-3.5 w-8 bg-violet-900/35 rounded-md" />
                </div>
              </div>
            ))}
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

          if (post.videoUrl) {
            return (
              <React.Fragment key={post.id}>
                {/* 🟣 IMMERSIVE VIDEO CARD */}
                <motion.div
                  id={`post-${post.id}`}
                  data-post-id={post.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setContextualMenuPost(post);
                  }}
                  onTouchStart={() => {
                    longPressTimerRef.current[post.id] = setTimeout(() => {
                      setContextualMenuPost(post);
                      if (navigator.vibrate) navigator.vibrate(40);
                    }, 600);
                  }}
                  onTouchEnd={() => {
                    if (longPressTimerRef.current[post.id]) {
                      clearTimeout(longPressTimerRef.current[post.id]);
                      delete longPressTimerRef.current[post.id];
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.preventDefault();
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    
                    // Add heart animation
                    const heartId = `${Date.now()}-${Math.random()}`;
                    setFloatingHearts(prev => [...prev, { id: heartId, x, y }]);
                    setTimeout(() => {
                      setFloatingHearts(prev => prev.filter(h => h.id !== heartId));
                    }, 1000);
                    
                    // Trigger Spark like
                    if (!post.isLikedByUser) {
                      handleSpark(post.id);
                    } else if (navigator.vibrate) {
                      navigator.vibrate(20);
                    }
                  }}
                  className="snap-start snap-always w-full h-full bg-black overflow-hidden text-left relative flex flex-col justify-between shrink-0"
                >
                  {/* Floating hearts overlay */}
                  {floatingHearts.map(heart => (
                    <motion.div
                      key={heart.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: [0, 1.5, 1.2, 1], opacity: [0, 1, 1, 0], y: -90, rotate: (Math.random() - 0.5) * 30 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      style={{ left: heart.x, top: heart.y }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 text-pink-500 text-5xl filter drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                    >
                      ❤️
                    </motion.div>
                  ))}

                  {/* Outer edge-to-edge Video Container */}
                  <div className="relative w-full h-full overflow-hidden bg-black flex-1 min-h-0">
                    <NexoraVideoPlayer
                      post={post}
                      videoUrl={post.videoUrl}
                      onOpenFullscreen={() => setActiveVideoFullscreen(post)}
                      onSpark={() => handleSpark(post.id)}
                      isActive={activePostId === post.id}
                      preloadMode={preloadMode}
                      isReleased={isReleased}
                      shouldPreload={shouldPreload}
                      isFollowing={followingIds.includes(post.userId || '')}
                      onToggleFollow={() => onToggleFollow?.(post.userId || '')}
                      onCommentToggle={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)}
                      isCommentsOpen={activeCommentsPostId === post.id}
                      onNotInterested={() => {
                        setMutedUserIds(prev => [...prev, post.userId || '']);
                        window.dispatchEvent(new CustomEvent('toast', { detail: '👎 Not interested. Creator muted.' }));
                      }}
                      onViewProfile={(userId) => onViewProfile?.(userId)}
                    />
                  </div>

                  {/* Floating Comments Bottom Sheet Overlay */}
                  <AnimatePresence>
                    {isCommentsOpen && (
                      <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 220 }}
                        className="comments-container absolute bottom-0 inset-x-0 h-[65%] rounded-t-[32px] bg-zinc-950/95 backdrop-blur-xl border-t border-violet-500/20 z-40 flex flex-col p-5 shadow-2xl overflow-hidden"
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
                        <div 
                          className="space-y-3.5 flex-1 overflow-y-auto pr-1 mb-4 custom-scrollbar touch-pan-y"
                          style={{ WebkitOverflowScrolling: 'touch' }}
                        >
                          {post.comments.length === 0 && (
                            <p className="text-[11px] font-mono text-violet-300/40 italic py-2 text-center">
                              No comments yet. Start the conversation!
                            </p>
                          )}
                          {post.comments.map((c, commentIndex) => (
                            <div key={c.id} className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2.5">
                              <div className="flex items-start justify-between gap-2 text-xs">
                                <div className="flex gap-2">
                                  <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-lg object-cover" />
                                  <div>
                                    <span className="font-sans font-bold text-violet-200">{c.name}</span>
                                    <span className="text-[10px] font-mono text-violet-400/60 block">@{c.username} • <RelativeTime timestamp={c.timestamp} /></span>
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
                                <div className="pl-9 space-y-2.5 pt-1.5 border-l border-violet-500/10 ml-3.5">
                                  {c.replies.map(rep => (
                                    <div key={rep.id} className="text-xs bg-white/2 p-2 rounded-xl border border-white/3">
                                      <div className="flex items-center gap-2 mb-1">
                                        <img src={rep.avatar} alt={rep.name} className="w-5 h-5 rounded-md object-cover" />
                                        <div>
                                          <span className="font-sans font-black text-violet-200 text-[11px]">{rep.name}</span>
                                          <span className="text-[9px] font-mono text-violet-400/50 block">@{rep.username} • <RelativeTime timestamp={rep.timestamp} /></span>
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
                                      className="flex-1 bg-slate-900 border border-violet-500/15 rounded-xl py-1 px-3 text-xs text-white focus:outline-hidden"
                                    />
                                    <button 
                                      onClick={() => handleAddReplySubmit(post.id, c.id)}
                                      className="bg-violet-600 hover:bg-violet-500 p-1.5 rounded-xl text-white cursor-pointer"
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
                                    className="text-xs font-mono text-violet-400 hover:text-white flex items-center gap-1 mt-1 cursor-pointer"
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
                            className="flex-1 bg-slate-950/60 border border-white/5 focus:border-violet-500/20 text-xs text-white placeholder:text-violet-400/40 py-2.5 px-4 rounded-xl focus:outline-hidden"
                          />
                          <button 
                            onClick={() => handleAddCommentSubmit(post.id)}
                            className="p-3 bg-violet-600 hover:bg-violet-550 rounded-xl text-white transition-colors cursor-pointer"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={post.id}>
              <motion.div
                id={`post-${post.id}`}
                data-post-id={post.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextualMenuPost(post);
                }}
                onTouchStart={() => {
                  longPressTimerRef.current[post.id] = setTimeout(() => {
                    setContextualMenuPost(post);
                    if (navigator.vibrate) navigator.vibrate(40);
                  }, 600);
                }}
                onTouchEnd={() => {
                  if (longPressTimerRef.current[post.id]) {
                    clearTimeout(longPressTimerRef.current[post.id]);
                    delete longPressTimerRef.current[post.id];
                  }
                }}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const y = e.clientY - rect.top;
                  
                  // Add heart animation
                  const heartId = `${Date.now()}-${Math.random()}`;
                  setFloatingHearts(prev => [...prev, { id: heartId, x, y }]);
                  setTimeout(() => {
                    setFloatingHearts(prev => prev.filter(h => h.id !== heartId));
                  }, 1000);
                  
                  // Trigger Spark like
                  if (!post.isLikedByUser) {
                    handleSpark(post.id);
                  } else if (navigator.vibrate) {
                    navigator.vibrate(20);
                  }
                }}
                className={`snap-start snap-always w-full h-full relative overflow-hidden group text-left flex flex-col justify-between shrink-0 bg-linear-to-b ${
                  post.isBroadcastPost 
                    ? 'from-[#171008] via-[#0b0704] to-black' 
                    : post.userId === 'user-0' 
                      ? 'from-[#0d0926] via-[#050414] to-black' 
                      : 'from-[#0b091e] via-[#04030d] to-black'
                }`}
              >
                {/* Floating hearts overlay */}
                {floatingHearts.map(heart => (
                  <motion.div
                    key={heart.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.5, 1.2, 1], opacity: [0, 1, 1, 0], y: -90, rotate: (Math.random() - 0.5) * 30 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ left: heart.x, top: heart.y }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50 text-pink-500 text-5xl filter drop-shadow-[0_0_15px_rgba(244,63,94,0.6)]"
                  >
                    ❤️
                  </motion.div>
                ))}

                {/* Scrollable Container with Top Padding for Navigation */}
                <div 
                  className="w-full h-full overflow-y-auto custom-scrollbar px-2 md:px-4 pt-28 md:pt-24 pb-12 flex flex-col justify-between gap-6 touch-pan-y"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  <div>
                    {/* Future scheduled posts warning banner (Only visible to the creator) */}
                {post.scheduledTime && new Date(post.scheduledTime).getTime() > Date.now() && (
                  <div className="mb-4 p-3 bg-violet-600/15 border border-violet-500/30 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-violet-300">
                    <span className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                      </span>
                      <span>📅 SCHEDULED QUEUE: {new Date(post.scheduledTime).toLocaleString()}</span>
                    </span>
                    <button 
                      onClick={() => handlePublishScheduledPostNow(post.id)}
                      className="bg-violet-600 hover:bg-violet-500 text-white font-extrabold text-[9px] px-3 py-1 rounded-xl uppercase tracking-wider cursor-pointer"
                    >
                      Publish Now 🚀
                    </button>
                  </div>
                )}
                {/* Dynamic Smart Recommendation Explanation */}
                <div className="mb-3 text-[9px] font-mono font-bold tracking-wider text-violet-400/60 uppercase flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0"></span>
                  {(() => {
                    if (post.userId === 'user-0') return '⭐ Highlight: Recommended by Founder';
                    if (post.username === 'voh_ai') return '🧠 Intelligence: Recommended by VOH AI';
                    if (post.username === 'nexora_official') return '🌌 System: Nexora Official Update';
                    if (post.isBroadcastPost) return '📣 Broadcast channel propagation';
                    if (followingIds.includes(post.userId)) return '👥 Followed Creator';
                    if (post.tags && post.tags.length > 0) {
                      return `🔥 Recommended because you read ${post.tags[0]}`;
                    }
                    return '✨ High Engagement Feed Distribution';
                  })()}
                </div>
                {/* 1. Card Header Row */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex gap-3">
                    <img 
                      src={post.avatar} 
                      alt={post.name} 
                      className="w-10 h-10 rounded-xl object-cover border border-violet-500/20 cursor-pointer" 
                      onClick={() => onViewProfile?.(post.userId)}
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span 
                          onClick={() => onViewProfile?.(post.userId)}
                          className="font-sans font-extrabold text-sm text-white hover:text-violet-400 transition-colors cursor-pointer"
                        >
                          {post.name}
                        </span>
                        {/* Stripped generated users verification. ONLY founder 'user-0' and approved bots get it */}
                        {(post.username === 'voh' || post.userId === 'user-0' || post.username === 'voh_ai' || post.username === 'nexora_ai') && (
                          <CheckCircle className="w-3.5 h-3.5 text-violet-400 fill-current" />
                        )}
                        {post.isBroadcastPost && (
                          <span className="text-[8px] font-mono font-black uppercase text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 tracking-wider">
                            <span>📣</span> BROADCASTS CHN
                          </span>
                        )}
                        {post.content.length > 100 && <VohSummaryButton content={post.content} />}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10.5px] font-mono text-violet-400/80 leading-tight">
                        <span>@{post.username}</span>
                        <span>•</span>
                        <span><RelativeTime timestamp={post.timestamp} /></span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-[10px] text-pink-400 bg-pink-500/5 px-1 py-0.5 rounded border border-pink-500/10">
                          <BookOpen className="w-2.5 h-2.5 shrink-0" />
                          {(() => {
                            const words = post.content.trim().split(/\s+/).length;
                            const min = Math.max(1, Math.ceil(words / 200));
                            return `${min} min read`;
                          })()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badges column */}
                  <div className="flex flex-col items-end gap-1.5 text-[9.5px] font-mono shrink-0">
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {pinnedPostIds.includes(post.id) && (
                        <span className="text-[8.5px] font-black uppercase text-pink-400 bg-pink-500/10 border border-pink-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 tracking-wider animate-pulse">
                          <Pin className="w-2.5 h-2.5 text-pink-400 fill-current shrink-0" /> PINNED
                        </span>
                      )}
                      {(post.userId === 'user-0' || post.username === 'voh') && (
                        <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md tracking-wider flex items-center gap-0.5">
                          FOUNDER 👑
                        </span>
                      )}
                      {post.username === 'voh_ai' && (
                        <span className="text-[8px] font-black uppercase text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-md tracking-wider flex items-center gap-0.5">
                          VOH AI 🧠
                        </span>
                      )}
                      {post.username === 'nexora_ai' && (
                        <span className="text-[8px] font-black uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-md tracking-wider flex items-center gap-0.5">
                          NEXORA AI 🌌
                        </span>
                      )}
                      {/* Three-dots menu button */}
                      <div className="relative">

                        <AnimatePresence>
                          {activeDotsMenuPostId === post.id && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: -5 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -5 }}
                              className="absolute right-0 mt-1 w-48 bg-[#0c091f] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden font-sans py-1"
                            >
                              {/* NIDA Diagnostics option */}
                              <button
                                onClick={() => {
                                  setNidaDiagnosticPost(post);
                                  setActiveDotsMenuPostId(null);
                                }}
                                className="w-full text-left px-3 py-2.5 bg-linear-to-r from-violet-950/40 via-cyan-950/20 to-pink-950/15 text-cyan-300 font-extrabold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                              >
                                <Sparkles className="w-3.5 h-3.5 shrink-0 text-cyan-400 animate-pulse" />
                                NIDA Diagnostics 🧬
                              </button>

                              {/* Creator Analytics (If own post) */}
                              {post.userId === currentUser.id && (
                                <button
                                  onClick={() => {
                                    setAnalyticsPost(post);
                                    setActiveDotsMenuPostId(null);
                                  }}
                                  className="w-full text-left px-3 py-2.5 bg-linear-to-r from-violet-600/20 to-pink-500/20 text-violet-200 font-extrabold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5 animate-pulse"
                                >
                                  <BarChart2 className="w-3.5 h-3.5 shrink-0 text-pink-400" />
                                  View Analytics 📊
                                </button>
                              )}

                              {/* Pin/Unpin (If own post) */}
                              {post.userId === currentUser.id && (
                                <button
                                  onClick={() => {
                                    const isPinned = pinnedPostIds.includes(post.id);
                                    setPinnedPostIds(prev => {
                                      const next = isPinned ? prev.filter(id => id !== post.id) : [...prev, post.id];
                                      localStorage.setItem('nexora_pinned_posts', JSON.stringify(next));
                                      return next;
                                    });
                                    setActiveDotsMenuPostId(null);
                                    window.dispatchEvent(new CustomEvent('toast', { detail: isPinned ? '📌 Post unpinned!' : '📌 Post pinned successfully!' }));
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                                >
                                  <Pin className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                                  {pinnedPostIds.includes(post.id) ? 'Unpin Post' : 'Pin Post'}
                                </button>
                              )}

                              {/* Edit Caption (If own post) */}
                              {post.userId === currentUser.id && (
                                <button
                                  onClick={() => {
                                    const newCaption = prompt('Edit caption:', post.content);
                                    if (newCaption !== null && newCaption.trim() !== '') {
                                      window.dispatchEvent(new CustomEvent('nexora-edit-caption', { detail: { postId: post.id, newCaption } }));
                                    }
                                    setActiveDotsMenuPostId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                                >
                                  <Edit2 className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                  Edit Caption
                                </button>
                              )}

                              {/* Toggle Comments (If own post) */}
                              {post.userId === currentUser.id && (
                                <button
                                  onClick={() => {
                                    const disabled = !post.commentsDisabled;
                                    window.dispatchEvent(new CustomEvent('nexora-toggle-comments', { detail: { postId: post.id, disabled } }));
                                    setActiveDotsMenuPostId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                                  {post.commentsDisabled ? 'Enable Comments' : 'Disable Comments'}
                                </button>
                              )}

                              {/* Archive / Restore Post (If own post) */}
                              {post.userId === currentUser.id && (
                                <button
                                  onClick={() => {
                                    const archiveState = !post.isArchived;
                                    window.dispatchEvent(new CustomEvent('nexora-archive-post', { detail: { postId: post.id, archiveState } }));
                                    setActiveDotsMenuPostId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                                >
                                  <Archive className="w-3.5 h-3.5 shrink-0 text-fuchsia-400" />
                                  {post.isArchived ? 'Restore Post' : 'Archive Post'}
                                </button>
                              )}

                              {/* Delete Post (If own post) */}
                              {post.userId === currentUser.id && (
                                <button
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                                      window.dispatchEvent(new CustomEvent('nexora-delete-post', { detail: { postId: post.id } }));
                                    }
                                    setActiveDotsMenuPostId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                                >
                                  <Trash className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                  Delete Post
                                </button>
                              )}

                              {/* Follow/Unfollow Creator (If not own post) */}
                              {post.userId !== currentUser.id && (
                                <button
                                  onClick={() => {
                                    onToggleFollow?.(post.userId);
                                    setActiveDotsMenuPostId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                                >
                                  <UserPlus className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                                  {followingIds.includes(post.userId) ? 'Unfollow Creator' : 'Follow Creator'}
                                </button>
                              )}

                              {/* Mute Creator (If not own post) */}
                              {post.userId !== currentUser.id && (
                                <button
                                  onClick={() => {
                                    setMutedCreatorIds(prev => {
                                      const next = [...prev, post.userId];
                                      localStorage.setItem('nexora_muted_creators', JSON.stringify(next));
                                      return next;
                                    });
                                    setActiveDotsMenuPostId(null);
                                    window.dispatchEvent(new CustomEvent('toast', { detail: `🔇 Muted @${post.username}. You will not see their posts.` }));
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-300 flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                                >
                                  <VolumeX className="w-3.5 h-3.5 shrink-0 text-red-400" />
                                  Mute Creator
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  setReportingPost(post);
                                  setActiveDotsMenuPostId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                Report Post
                              </button>
                              
                              <button
                                onClick={() => {
                                  const nameToReport = {
                                    id: post.userId,
                                    username: post.username,
                                    targetContent: `Profile of @${post.username}`,
                                    content: `Profile of @${post.username}`
                                  };
                                  setReportingPost(nameToReport);
                                  setActiveDotsMenuPostId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-300 flex items-center gap-2 text-xs transition-colors cursor-pointer"
                              >
                                <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                Report User
                              </button>

                              <button
                                onClick={() => {
                                  setHiddenPostIds(prev => [...prev, post.id]);
                                  setActiveDotsMenuPostId(null);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: '🙈 Post hidden from active feed.' }));
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-zinc-300 flex items-center gap-2 text-xs transition-colors cursor-pointer"
                              >
                                <EyeOff className="w-3.5 h-3.5 shrink-0" />
                                Hide Post
                              </button>

                              <button
                                onClick={() => {
                                  setNotInterestedTags(prev => [...prev, ...post.tags]);
                                  setActiveDotsMenuPostId(null);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: '👎 Preference saved. We will show fewer posts like this.' }));
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-[#A78BFA] flex items-center gap-2 text-xs transition-colors cursor-pointer"
                              >
                                <Sliders className="w-3.5 h-3.5 shrink-0" />
                                Not Interested
                              </button>

                              <button
                                onClick={() => {
                                  setMutedUserIds(prev => [...prev, post.userId]);
                                  setActiveDotsMenuPostId(null);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: `🔊 Muted @${post.username}. Their posts are hidden.` }));
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-amber-500/10 text-amber-400 flex items-center gap-2 text-xs transition-colors cursor-pointer border-t border-white/5"
                              >
                                <VolumeX className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                                Mute User
                              </button>

                              <button
                                onClick={() => {
                                  setBlockedUserIds(prev => [...prev, post.userId]);
                                  setActiveDotsMenuPostId(null);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: `🚫 Blocked @${post.username}.` }));
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-red-950/20 text-rose-500 font-extrabold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                              >
                                <X className="w-3.5 h-3.5 shrink-0 text-red-500" />
                                Block User
                              </button>

                              <button
                                onClick={() => {
                                  const text = `${window.location.origin}/post/${post.id}`;
                                  navigator.clipboard.writeText(text);
                                  setActiveDotsMenuPostId(null);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Link copied to clipboard!' }));
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-emerald-400 flex items-center gap-2 text-xs transition-colors cursor-pointer"
                              >
                                <span className="text-emerald-400 font-bold text-xs">➥</span>
                                Copy Link
                              </button>

                              <button
                                onClick={() => {
                                  const text = `${window.location.origin}/post/${post.id}`;
                                  navigator.clipboard.writeText(text);
                                  setActiveDotsMenuPostId(null);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: '📤 Link copied! Ready to share.' }));
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-sky-400 flex items-center gap-2 text-xs transition-colors cursor-pointer"
                              >
                                <span className="text-sky-400 font-bold text-xs">➥</span>
                                Share
                              </button>

                              <button
                                onClick={() => {
                                  setShowSaveToCollectionModalId(post.id);
                                  setActiveDotsMenuPostId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-white/5 text-pink-400 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-t border-white/5"
                              >
                                <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                                Save to Folder
                              </button>

                              {post.userId === currentUser.id && (
                                <button
                                  onClick={() => {
                                    setEditingPostId(post.id);
                                    setEditingPostContent(post.content);
                                    setActiveDotsMenuPostId(null);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-violet-500/15 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-t border-white/5"
                                >
                                  <Edit2 className="w-3.5 h-3.5 shrink-0" />
                                  Edit Post Content
                                </button>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                    </div>

                    {post.communityName && (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wide">
                        🏟 {post.communityName}
                      </span>
                    )}
                    {post.location && (
                      <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse">
                        <Globe className="w-2.5 h-2.5 text-cyan-300" />
                        <span>🌍 Pulse Report</span>
                      </span>
                    )}
                    {post.opportunityType && (
                      <span className="bg-pink-500/15 text-pink-400 border border-pink-500/20 px-2 py-0.5 rounded-md font-black uppercase tracking-wide">
                        🚀 {post.opportunityType}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Content Row */}
                <div className="space-y-3 mb-4 text-left">
                  {editingPostId === post.id ? (
                    <div className="space-y-2 bg-slate-950/60 p-3 rounded-2xl border border-violet-500/25">
                      <textarea
                        value={editingPostContent}
                        onChange={(e) => setEditingPostContent(e.target.value)}
                        className="w-full bg-zinc-900 text-xs text-white p-2.5 rounded-xl border border-zinc-800 focus:outline-none font-sans min-h-[80px]"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setEditingPostId(null);
                            setEditingPostContent('');
                          }}
                          className="px-3 py-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 font-bold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEditPost(post.id)}
                          className="px-3 py-1.5 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white font-bold text-[10px] uppercase tracking-wider rounded-lg cursor-pointer"
                        >
                          Save Changes 💾
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {(() => {
                        const isExpanded = expandedPostIds.includes(post.id);
                        const shouldTruncate = post.content.length > 280;
                        const displayContent = (shouldTruncate && !isExpanded) 
                          ? `${post.content.slice(0, 280)}...` 
                          : post.content;
                        
                        return (
                          <>
                            <p className="text-sm text-slate-100 font-sans leading-relaxed whitespace-pre-wrap select-all">
                              {displayContent}
                            </p>
                            {shouldTruncate && !isExpanded && (
                              <button
                                onClick={() => setExpandedPostIds(prev => [...prev, post.id])}
                                className="text-violet-400 hover:text-violet-300 font-bold text-xs mt-2 block cursor-pointer transition-all hover:underline"
                              >
                                Continue Reading...
                              </button>
                            )}
                          </>
                        );
                      })()}
                      {/* Edit History status display */}
                      {post.editHistory && post.editHistory.length > 0 && (
                        <button
                          onClick={() => setViewHistoryPost(post)}
                          className="mt-1.5 text-[9px] font-mono text-violet-400 hover:text-violet-300 flex items-center gap-1 cursor-pointer bg-violet-950/20 px-2 py-0.5 rounded-md border border-violet-500/10"
                        >
                          ✏️ Edited ({post.editHistory.length}x) • View Change Log
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. Media Renders (Photo, Video, Voice, Poll, Opportunity Specs) */}
                
                {/* Photo attachment or Multi-image Carousel */}
                {post.images && post.images.length > 1 ? (
                  <PostCarousel images={post.images} filters={post.imageFilters} />
                ) : post.image && !post.opportunityType ? (
                  <div className="overflow-hidden rounded-none md:rounded-2xl border-y md:border border-white/5 mb-4 max-h-[500px] -mx-4 md:mx-0">
                    <img 
                      src={post.image} 
                      alt="Attachment" 
                      className="w-full h-full object-cover pr-0 pointer-events-none hover:scale-101 transition-transform"
                      referrerPolicy="no-referrer"
                      style={{ filter: post.imageFilter || 'none' }}
                    />
                  </div>
                ) : null}

                {/* Advanced Video Experience */}
                {post.videoUrl && (
                  <div className="mb-4 -mx-4 md:mx-0">
                    <NexoraVideoPlayer
                      post={post}
                      videoUrl={post.videoUrl}
                      onOpenFullscreen={() => setActiveVideoFullscreen(post)}
                      onSpark={() => handleSpark(post.id)}
                      isActive={activePostId === post.id}
                      preloadMode={preloadMode}
                      isReleased={isReleased}
                      shouldPreload={shouldPreload}
                      isFollowing={followingIds.includes(post.userId || '')}
                      onToggleFollow={() => onToggleFollow?.(post.userId || '')}
                      onCommentToggle={() => setActiveCommentsPostId(activeCommentsPostId === post.id ? null : post.id)}
                      isCommentsOpen={activeCommentsPostId === post.id}
                      onNotInterested={() => {
                        setMutedUserIds(prev => [...prev, post.userId || '']);
                        window.dispatchEvent(new CustomEvent('toast', { detail: '👎 Not interested. Creator muted.' }));
                      }}
                      onViewProfile={(userId) => onViewProfile?.(userId)}
                    />
                  </div>
                )}

                {/* Spatial Voice Broadcast Player */}
                {post.isVoice && (
                  <div className="mb-4 p-4 rounded-2xl bg-[#070518] border border-violet-500/25 flex items-center gap-3">
                    <button
                      onClick={() => {
                        if (isPlaying) {
                          setPlayingVoiceId(null);
                        } else {
                          setPlayingVoiceId(post.id);
                        }
                      }}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer ${
                        isPlaying ? 'bg-linear-to-r from-violet-600 to-pink-500 text-white' : 'bg-violet-500/20 text-violet-300'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-violet-300 ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center text-[10px] font-mono mb-1.5">
                        <span className="text-pink-400 font-extrabold flex items-center gap-1">
                          <Volume2 className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                          VOICE POST
                        </span>
                        <span className="text-violet-400">
                          {isPlaying ? `0:${voiceSeconds.toString().padStart(2, '0')}` : '0:00'} / {post.voiceDuration || "0:45"}
                        </span>
                      </div>
                      
                      {/* Animated wave spectrumbars */}
                      <div className="flex items-end gap-[2px] h-5.5">
                        {[...Array(20)].map((_, idx) => (
                          <div 
                            key={idx}
                            className={`w-[2.5px] rounded-full transition-all duration-300 ${
                              isPlaying ? 'bg-gradient-to-t from-violet-500 via-pink-400 to-cyan-300' : 'bg-violet-500/20'
                            }`}
                            style={{
                              height: isPlaying ? `${Math.floor(20 + Math.sin(idx * 1.5 + voiceSeconds) * 60 + Math.random() * 20)}%` : '15%'
                            }}
                          />
                        ))}
                      </div>

                      {post.voiceTranscript && (
                        <div className="mt-3 bg-violet-950/30 p-2.5 rounded-xl border border-violet-500/10">
                          <span className="text-[8.5px] font-mono text-violet-400 block uppercase font-bold tracking-widest mb-0.5">Captions Preview</span>
                          <p className="text-xs font-sans text-violet-300 italic">"{post.voiceTranscript}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Interactive Poll Component */}
                {post.interactivePoll && (
                  <div className="mb-4 p-4 rounded-2xl bg-slate-950/60 border border-violet-500/15 space-y-3">
                    <p className="text-xs font-sans text-violet-100 font-bold">{post.interactivePoll.question}</p>
                    <div className="space-y-2">
                      {post.interactivePoll.options.map(opt => {
                        const userVote = votedPolls[post.id];
                        const totalVotes = post.interactivePoll!.options.reduce((acc, o) => acc + o.votes + (userVote === o.id ? 1 : 0), 0);
                        const currentVotes = opt.votes + (userVote === opt.id ? 1 : 0);
                        const percentage = totalVotes > 0 ? Math.round((currentVotes / totalVotes) * 100) : 0;

                        return (
                          <button
                            key={opt.id}
                            disabled={!!userVote}
                            onClick={() => setVotedPolls(prev => ({ ...prev, [post.id]: opt.id }))}
                            className={`w-full text-left p-2.5 rounded-xl border relative overflow-hidden transition-all text-xs font-sans cursor-pointer ${
                              userVote === opt.id 
                                ? 'border-violet-500 bg-violet-600/10 font-bold text-white' 
                                : 'border-white/5 bg-white/3 hover:border-violet-500/25 text-violet-200'
                            }`}
                          >
                            {userVote && (
                              <div 
                                className="absolute left-0 top-0 bottom-0 bg-violet-500/10 transition-all duration-700" 
                                style={{ width: `${percentage}%` }}
                              />
                            )}
                            <div className="relative flex justify-between items-center z-10">
                              <span>{opt.text}</span>
                              {userVote && <span className="font-mono text-[10px] text-violet-400 font-bold">{percentage}% ({currentVotes})</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* VOH AI insight bubble */}
                    {votedPolls[post.id] && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-3 rounded-xl bg-violet-950/40 border border-violet-500/20 text-[10.5px] leading-relaxed text-violet-200/90 font-sans"
                      >
                        <p className="font-mono text-[9px] uppercase text-pink-400 font-black tracking-wider flex items-center gap-1 mb-1">
                          🧠 VOH AI Interactive Insight
                        </p>
                        "Your vote has been counted successfully! Supporting community-driven discussions and participating in polls helps make Nexora a better, more interactive environment. Your reputation is updated (+10)."
                      </motion.div>
                    )}
                  </div>
                )}

                {/* Structured Opportunity Specs */}
                {post.opportunityType && (
                  <div className="mb-4 p-4 rounded-2xl bg-linear-to-tr from-[#130d2a] to-[#040310] border border-pink-500/20 space-y-3.5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-mono text-violet-400 block uppercase">Reward Dividend</span>
                        <span className="text-xs font-mono font-bold text-white mt-0.5 block">{post.opportunityReward || "Equity Structure"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] font-mono text-violet-400 block uppercase">Interest Alignment DNA</span>
                        <span className="text-xs font-sans text-rose-300 font-bold mt-0.5 block">✨ Symmetrical High Match</span>
                      </div>
                    </div>

                    {post.opportunitySkills && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {post.opportunitySkills.map(s => (
                          <span key={s} className="bg-violet-500/10 border border-violet-500/20 text-[9px] font-mono px-2 py-0.5 rounded-md text-violet-300">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <button 
                      onClick={() => alert(`Sent connection request to ${post.name} via VOH AI!`)}
                      className="w-full py-2 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white font-mono font-black text-xs uppercase rounded-xl transition-all tracking-wider shadow-lg shadow-violet-600/20 cursor-pointer"
                    >
                      Connect via VOH AI 🤝
                    </button>
                  </div>
                )}

                {/* Hashtag List */}
                {post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {post.tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                        className={`text-[10px] font-mono px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                          selectedTag === tag 
                            ? 'bg-violet-600 text-white' 
                            : 'bg-[#15112e] text-violet-400 hover:bg-violet-500/10'
                        }`}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                )}

                {/* 4. Action Row */}
                {post.isBroadcastPost ? (
                  /* EXCLUSIVE BROADCAST INTERACTIVE emoji reactions BAR (Locked Comments) */
                  <div className="flex flex-col gap-3 border-t border-white/5 pt-3.5 mb-1 text-left w-full">
                    <span className="text-[9.5px] font-mono text-amber-400 font-bold tracking-widest uppercase flex items-center gap-1">
                      <span>🔒</span> COMMENTS LOCKED • REACTIONS ALLOWED
                    </span>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {[
                        { emoji: '🔥', label: 'Inspirational' },
                        { emoji: '🙌', label: 'Praise VOH' },
                        { emoji: '⚡', label: 'High Power' },
                        { emoji: '🏆', label: 'Milestone' }
                      ].map((reactOption) => {
                        const count = post.broadcastReactions ? (post.broadcastReactions[reactOption.emoji] || 0) : 0;
                        return (
                          <button
                            key={reactOption.emoji}
                            onClick={() => handleBroadcastReaction(post.id, reactOption.emoji)}
                            className="p-1 px-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 rounded-xl flex items-center gap-2 text-xs font-mono font-bold text-amber-200 transition-all active:scale-95 cursor-pointer"
                            title={reactOption.label}
                          >
                            <span>{reactOption.emoji}</span>
                            <span className="text-[11px] font-mono text-amber-300/80">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3 text-violet-300/70 text-xs text-left">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Sparks action instead of likes */}
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => handleSpark(post.id)}
                        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 cursor-pointer border text-[11px] overflow-hidden ${
                          post.isLikedByUser 
                            ? 'bg-pink-500/15 border-pink-500/40 text-pink-400 shadow-[0_0_15px_rgba(244,63,94,0.2)] font-bold' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-violet-300/90'
                        }`}
                      >
                        <AnimatePresence>
                          {post.isLikedByUser && (
                            <motion.div 
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0] }}
                              transition={{ duration: 0.5 }}
                              className="absolute inset-0 bg-pink-400/20 rounded-full"
                            />
                          )}
                        </AnimatePresence>
                        <motion.div
                          animate={post.isLikedByUser ? { scale: [1, 1.4, 1], rotate: [0, 15, -10, 0] } : {}}
                          transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                        >
                          <Zap className={`w-3.5 h-3.5 transition-colors duration-300 ${
                            post.isLikedByUser ? 'fill-pink-500 text-pink-400 drop-shadow-[0_0_8px_#f43f5e]' : 'text-pink-400/80'
                          }`} />
                        </motion.div>
                        <span className="font-mono relative z-10">{post.likes}</span>
                      </motion.button>

                      {/* Comments expand button */}
                      <motion.button
                        whileTap={{ scale: 0.92, y: 0.5 }}
                        whileHover={{ scale: 1.04 }}
                        onClick={() => setActiveCommentsPostId(isCommentsOpen ? null : post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer border text-[11px] ${
                          isCommentsOpen 
                            ? 'bg-violet-500/20 border-violet-500/30 text-violet-300 font-bold' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-violet-300/90'
                        }`}
                      >
                        <span className="text-violet-400 font-bold text-sm">💬</span>
                        <span>{post.comments.length}</span>
                      </motion.button>

                      {/* Repost button */}
                      <motion.button
                        whileTap={{ scale: 0.92, y: 0.5 }}
                        whileHover={{ scale: 1.04 }}
                        onClick={() => {
                          setLocalPosts(prev => prev.map(p => {
                            if (p.id === post.id) return { ...p, shares: p.shares + 1 };
                            return p;
                          }));
                          if (onSharePost) {
                            onSharePost(post.id);
                          }
                          window.dispatchEvent(new CustomEvent('toast', { detail: "🔁 Post reposted! (+5 Reputation Points)" }));
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-200 cursor-pointer text-[11px] text-violet-300/90"
                      >
                        <span className="text-emerald-400 font-bold text-sm">➥</span>
                        <span>{post.shares}</span>
                      </motion.button>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Save/Bookmark button */}
                      <motion.button
                        whileTap={{ scale: 0.92, y: 0.5 }}
                        whileHover={{ scale: 1.04 }}
                        onClick={() => handleSave(post.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer border text-[11px] ${
                          post.isBookmarkedByUser 
                            ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400 font-bold shadow-[0_0_12px_rgba(34,211,238,0.15)]' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 text-violet-300/90'
                        }`}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${post.isBookmarkedByUser ? 'fill-cyan-400 text-cyan-400' : 'text-cyan-400/80'}`} />
                        <span>{post.saves || 0}</span>
                        <span className="hidden sm:inline">Save</span>
                      </motion.button>

                      {/* Clipboard Share button */}
                      <motion.button
                        whileTap={{ scale: 0.92, y: 0.5 }}
                        whileHover={{ scale: 1.04 }}
                        onClick={() => {
                          try {
                            navigator.clipboard.writeText(`https://nexora.ai/post/${post.id}`);
                            window.dispatchEvent(new CustomEvent('toast', { detail: "📋 Post link copied to clipboard!" }));
                            setLocalPosts(prev => prev.map(p => {
                              if (p.id === post.id) return { ...p, shares: (p.shares || 0) + 1 };
                              return p;
                            }));
                          } catch(e){}
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-200 cursor-pointer text-[11px] text-violet-300/90"
                      >
                        <span className="text-pink-400 font-bold text-sm">➥</span>
                        <span>{post.shares || 0}</span>
                        <span className="hidden sm:inline">Share</span>
                      </motion.button>
                    </div>
                  </div>
                )}
                  </div>
                </div>

                {/* 5. THREADED COMMENTS DRAWER ACCORDION (Floating bottom sheet drawer style) */}
                <AnimatePresence>
                  {isCommentsOpen && (
                    <motion.div
                      initial={{ y: "100%", opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: "100%", opacity: 0 }}
                      transition={{ type: "spring", damping: 25, stiffness: 220 }}
                      className="comments-container absolute bottom-0 inset-x-0 h-[65%] rounded-t-[32px] bg-zinc-950/95 backdrop-blur-xl border-t border-violet-500/20 z-40 flex flex-col p-5 shadow-2xl overflow-hidden"
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
                              <div className="flex gap-2">
                                <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-lg object-cover" />
                                <div>
                                  <span className="font-sans font-bold text-violet-200">{c.name}</span>
                                  <span className="text-[10px] font-mono text-violet-400/60 block">@{c.username} • <RelativeTime timestamp={c.timestamp} /></span>
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
                              <div className="pl-9 space-y-2.5 pt-1.5 border-l border-violet-500/10 ml-3.5">
                                {c.replies.map(rep => (
                                  <div key={rep.id} className="text-xs bg-white/2 p-2 rounded-xl border border-white/3">
                                    <div className="flex items-center gap-2 mb-1">
                                      <img src={rep.avatar} alt={rep.name} className="w-5 h-5 rounded-md object-cover" />
                                      <div>
                                        <span className="font-sans font-black text-violet-200 text-[11px]">{rep.name}</span>
                                        <span className="text-[9px] font-mono text-violet-400/50 block">@{rep.username} • <RelativeTime timestamp={rep.timestamp} /></span>
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
                                    className="flex-1 bg-slate-900 border border-violet-500/15 rounded-xl py-1 px-3 text-xs text-white focus:outline-hidden"
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
                          className="flex-1 bg-slate-950/60 border border-white/5 focus:border-violet-500/20 text-xs text-white placeholder:text-violet-400/40 py-2.5 px-4 rounded-xl focus:outline-hidden"
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

              </motion.div>
            </React.Fragment>
          );
        })}

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
              className="bg-[#0b0821] border border-violet-500/25 p-5 md:p-6 rounded-3xl w-full max-w-lg space-y-4 shadow-2xl"
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
                  placeholder={`Cast your diagnostic updates... Type #tags as reference loops...`}
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl p-3 focus:outline-hidden placeholder:text-violet-400/30 resize-none font-sans"
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
                  className="w-full bg-slate-950/50 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
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
                    className="w-full bg-slate-950/50 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
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
                    className="w-full bg-slate-950/50 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
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
                      className="w-full bg-slate-950/50 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden"
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
              className="bg-linear-to-b from-[#110d2d] to-[#04030d] border border-violet-500/20 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4 text-left font-sans"
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
                  <div className="p-3.5 rounded-2xl bg-black/40 border border-violet-500/10 flex flex-col items-center justify-center space-y-3 animate-fade-in">
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
                    className="w-full bg-slate-950/60 border border-white/5 focus:border-violet-500/20 text-xs text-white rounded-xl py-2 px-3 focus:outline-hidden resize-none placeholder:text-violet-400/20 text-left"
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
                <img src={selectedMoment.avatar} alt={selectedMoment.name} className="w-10 h-10 rounded-xl object-cover border border-violet-500/20" />
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
                    <div className={`absolute w-32 h-32 rounded-full border-2 border-violet-500/30 ${playingVoiceMoment ? 'animate-ping scale-110 opacity-70' : ''}`} style={{ animationDuration: '3s' }} />
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
                    <span className="text-[10px] font-mono bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-full text-violet-300 font-extrabold uppercase tracking-widest">
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
            <div className="px-8 py-2.5 bg-[#09071c]/60 max-w-lg mx-auto w-full z-10 rounded-2xl border border-violet-500/10 space-y-3.5 mb-2">
              
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
                  className="flex-1 px-4 py-2 text-xs rounded-xl bg-slate-950/80 border border-violet-500/15 focus:border-[#8B5CF6] focus:outline-hidden text-white placeholder-violet-400/30 font-sans"
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
            <div className="w-full md:w-80 bg-[#09071a] border-t md:border-t-0 md:border-l border-violet-500/15 p-5 flex flex-col justify-between shrink-0">
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
                    className="flex-1 flex flex-col items-center p-3 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-violet-500/25 text-violet-300 cursor-pointer"
                  >
                    <MessageCircle className="w-5 h-5 mb-1" />
                    <span className="text-xs font-mono font-bold">{activeVideoFullscreen.comments.length} Reply</span>
                  </button>
                </div>

                <div className="p-3.5 bg-violet-950/20 rounded-2xl border border-violet-500/10 space-y-1">
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
              className="w-full max-w-2xl bg-[#0a071c]/98 border border-violet-500/30 rounded-[28px] overflow-hidden p-6 md:p-8 text-left relative shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
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
                <div className="bg-[#120f32]/40 border border-violet-500/10 p-4.5 rounded-2xl space-y-3">
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
              className="bg-[#0b091f] border border-violet-500/30 rounded-3xl p-5 md:p-6 w-full max-w-lg shadow-2xl relative overflow-hidden text-left"
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
                  <div key={idx} className="p-3 bg-violet-950/15 rounded-2xl border border-violet-500/10 space-y-1.5">
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
              className="bg-gradient-to-b from-[#110e2e]/95 to-[#070519]/95 border border-pink-500/30 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl relative overflow-hidden text-left"
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
              <div className="mt-5 p-3.5 bg-violet-600/10 border border-violet-500/20 rounded-2xl space-y-2 relative z-10">
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
              className="w-full max-w-lg bg-[#0e0c25] border-t border-violet-500/20 rounded-t-[32px] p-6 text-left relative space-y-4 pb-8"
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
              className="bg-[#0b081c] border border-violet-500/30 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl relative text-left"
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
              className="bg-[#0e0c25] border border-violet-500/40 px-4 py-3 rounded-2xl shadow-2xl flex items-center justify-between gap-4 text-xs font-sans text-white pointer-events-auto max-w-sm w-full"
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
