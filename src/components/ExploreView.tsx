import React, { useState, useEffect } from 'react';
import { 
  Compass, 
  Search, 
  TrendingUp, 
  Radio, 
  Award, 
  Zap, 
  Users, 
  Sparkles, 
  Film, 
  Music, 
  Gamepad2, 
  Cpu, 
  Briefcase, 
  Trophy, 
  BookOpen, 
  Flame, 
  Volume2, 
  VolumeX, 
  X, 
  Heart, 
  MessageSquare, 
  Share2, 
  Clock, 
  Check, 
  UserPlus, 
  Plus, 
  ArrowRight, 
  Play, 
  Pause,
  Video,
  Grid,
  Folder,
  RefreshCw,
  Globe,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Post, Circle } from '../types';
import { INITIAL_CIRCLES } from '../data/database';
import PurpleVerifiedBadge from './VohVerifiedBadge';

interface ExploreViewProps {
  creators: User[];
  posts: Post[];
  setSelectedTag: (tag: string | null) => void;
  setActiveTab: (tab: 'feed' | 'explore' | 'pulse' | 'matrix' | 'activity' | 'profile') => void;
  onLikePost: (postId: string) => void;
  onToggleFollow?: (creatorId: string) => void;
  followingIds: string[];
}

function ReelsKeyboardController({ 
  reelsIndex, 
  mockReels, 
  setReelsIndex, 
  setActiveReelsPlayback 
}: { 
  reelsIndex: number; 
  mockReels: any[]; 
  setReelsIndex: (idx: number) => void; 
  setActiveReelsPlayback: (reel: any) => void;
}) {
  useEffect(() => {
    const handleReelKeys = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        const nextIdx = (reelsIndex + 1) % mockReels.length;
        setReelsIndex(nextIdx);
        setActiveReelsPlayback(mockReels[nextIdx]);
      } else if (e.key === 'ArrowUp') {
        const prevIdx = (reelsIndex - 1 + mockReels.length) % mockReels.length;
        setReelsIndex(prevIdx);
        setActiveReelsPlayback(mockReels[prevIdx]);
      }
    };
    window.addEventListener('keydown', handleReelKeys);
    return () => window.removeEventListener('keydown', handleReelKeys);
  }, [reelsIndex, mockReels, setReelsIndex, setActiveReelsPlayback]);

  return null;
}

// Prefix-aligned fuzzy/substring similarity indexer for ranked user metrics
function computeSimilarityScore(source: string, search: string): number {
  const src = source.toLowerCase().trim();
  const query = search.toLowerCase().trim();
  if (!query) return 1;
  if (src === query) return 100; // Exact match
  if (src.includes(query)) {
    if (src.startsWith(query)) return 80; // Prefix match
    return 50; // Substring match
  }
  
  // Fuzzy character subset matching
  let matches = 0;
  let lastIndex = 0;
  for (let i = 0; i < query.length; i++) {
    const char = query[i];
    const index = src.indexOf(char, lastIndex);
    if (index !== -1) {
      matches++;
      lastIndex = index + 1;
    }
  }
  const ratio = matches / query.length;
  if (ratio > 0.6) {
    return Math.floor(ratio * 30); // Partial fuzzy subset match
  }
  return 0; // No match
}

export default function ExploreView({
  creators,
  posts,
  setSelectedTag,
  setActiveTab,
  onLikePost,
  onToggleFollow,
  followingIds
}: ExploreViewProps) {
  // Navigation & Categorization Status
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [localSearch, setLocalSearch] = useState('');
  
  // Core Search Platform States
  const [searchFilterType, setSearchFilterType] = useState<'all' | 'users' | 'posts' | 'videos' | 'voice' | 'communities' | 'hashtags' | 'polls' | 'pulse'>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'nearby'>('latest');
  const [activeCollectionFolder, setActiveCollectionFolder] = useState<string | null>(null);

  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('nexora_search_history');
      return stored ? JSON.parse(stored) : ['voh', 'afrobeat', 'tech', 'lagos'];
    } catch {
      return ['voh', 'afrobeat', 'tech', 'lagos'];
    }
  });

  const [savedCollections, setSavedCollections] = useState<Record<string, string[]>>(() => {
    try {
      const stored = localStorage.getItem('nexora_saved_collections_voh');
      if (stored) return JSON.parse(stored);
    } catch {}
    return {
      'Favorites': ['post-0', 'post-3'],
      'Football': [],
      'Business': ['post-1'],
      'Inspiration': [],
      'Custom Collections': []
    };
  });

  const addToSearchHistory = (q: string) => {
    if (!q.trim()) return;
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== q.toLowerCase());
      const next = [q, ...filtered].slice(0, 8);
      try { localStorage.setItem('nexora_search_history', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const removeFromSearchHistory = (q: string) => {
    setSearchHistory(prev => {
      const next = prev.filter(item => item !== q);
      try { localStorage.setItem('nexora_search_history', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const clearAllSearchHistory = () => {
    setSearchHistory([]);
    try { localStorage.removeItem('nexora_search_history'); } catch {}
  };
  
  // Simulated Live Streaming States
  const [activeWatchLive, setActiveWatchLive] = useState<any | null>(null);
  const [isGoingLiveOwn, setIsGoingLiveOwn] = useState(false);
  const [liveStreamStatus, setLiveStreamStatus] = useState<'idle' | 'streaming' | 'ended'>('idle');
  const [liveViewersCount, setLiveViewersCount] = useState(1284);
  const [liveComments, setLiveComments] = useState<Array<{ id: string; user: string; text: string; avatar: string }>>([]);
  const [liveHearts, setLiveHearts] = useState<Array<{ id: number; left: number; color: string; scale: number }>>([]);
  const [isLiveStreamMuted, setIsLiveStreamMuted] = useState(false);
  const [isLiveGuestInvited, setIsLiveGuestInvited] = useState(false);
  const [liveAccumulatedSparks, setLiveAccumulatedSparks] = useState(140);
  
  // Custom mock video list (Nexora Reels objects)
  const [activeReelsPlayback, setActiveReelsPlayback] = useState<any | null>(null);
  const [reelsIndex, setReelsIndex] = useState(0);
  const [reelsMuted, setReelsMuted] = useState(false);
  const [reelsAutoCaption, setReelsAutoCaption] = useState(false);
  const [showShareVideoSheet, setShowShareVideoSheet] = useState(false);
  const [videoCommentInput, setVideoCommentInput] = useState('');
  const [likedReelsList, setLikedReelsList] = useState<string[]>([]);
  const [watchHistory, setWatchHistory] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('nexora_watch_history');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [videoProgress, setVideoProgress] = useState(0);

  // Watch history tracking effect
  useEffect(() => {
    if (activeReelsPlayback) {
      setWatchHistory(prev => {
        if (prev.includes(activeReelsPlayback.id)) return prev;
        const nextHist = [...prev, activeReelsPlayback.id];
        try {
          localStorage.setItem('nexora_watch_history', JSON.stringify(nextHist));
        } catch (e) {
          console.error(e);
        }
        return nextHist;
      });
    }
  }, [activeReelsPlayback?.id]);

  // Sound Library details view popup
  const [activeSoundDetail, setActiveSoundDetail] = useState<any | null>(null);
  const [savedSounds, setSavedSounds] = useState<string[]>([]);

  // Categories Mapping
  const categories = [
    { id: 'All', icon: Compass, label: 'Explore All' },
    { id: 'Technology', icon: Cpu, label: 'Tech & Code' },
    { id: 'Business', icon: Briefcase, label: 'Business & VC' },
    { id: 'Music', icon: Music, label: 'Music & Sounds' },
    { id: 'Gaming', icon: Gamepad2, label: 'Gaming' },
    { id: 'Sports', icon: Trophy, label: 'Sports' },
    { id: 'Entertainment', icon: Film, label: 'Entertainment' },
    { id: 'Education', icon: BookOpen, label: 'Education' }
  ];

  // Mock Suggested Communities Data
  const suggestedCommunities = [
    { id: 'comm-1', name: 'Metaverse Architects 📐', members: '14.8K', description: 'Designing high-craft visual models & glassmorphic layouts.' },
    { id: 'comm-2', name: 'Rustaceans Dakar 🦀', members: '9.2K', description: 'High-performance backend systems & latency benchmarkers.' },
    { id: 'comm-3', name: 'Lofi Audio Producers 🎙️', members: '6.4K', description: 'Sharing beats & keynotes for active focus sessions.' },
    { id: 'comm-4', name: 'Football Analytics ⚽', members: '24.1K', description: 'Match reviews, positional mapping & soccer pulse streams.' }
  ];

  // Static Audio Loops Library Data
  const mockSounds = [
    { id: 's-1', title: 'Midnight Vapor Drift', artist: '@nexora_ai', uses: '14.2K', url: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=500' },
    { id: 's-2', title: 'Zero Latency Pulse', artist: '@voh', uses: '9.8K', url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500' },
    { id: 's-3', title: 'Vaporwave Rain Tokyo', artist: '@voh_ai', uses: '34.5K', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500' }
  ];

  // Custom Reels (Nexora Reels) Data
  const mockReels = [
    {
      id: 'vr-1',
      creator: { id: 'voh', name: 'VOICE OF HARRISON', username: 'voh', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg', isVerified: true },
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-at-night-41551-large.mp4',
      caption: '🚀 Building the NEXORA intelligent design frameworks live. Eliminating social noise, designing zero-latency feedback loops. Check our new communities tab! #system #aesthetics #vohai',
      likes: 12400,
      commentsCount: 382,
      sound: { title: 'Zero Latency Pulse - Harrison Custom Mix', author: 'voh' },
      comments: [
        { id: 1, user: 'nexora_ai', text: 'This framing feels pristine, Harrison! 💜' },
        { id: 2, user: 'voh_ai', text: 'Benchmarks are super solid on the mobile viewport.' }
      ]
    },
    {
      id: 'vr-2',
      creator: { id: 'creator-4', name: 'Nexora AI', username: 'nexora_ai', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80', isVerified: true },
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-holding-smartphone-at-night-with-city-lights-41553-large.mp4',
      caption: 'Discussing our latest football matches, Wizkid tunes, and Davido jams. Let us build connected spaces! #NEXORA #football #afrobeat',
      likes: 8520,
      commentsCount: 198,
      sound: { title: 'Vaporwave Rain Tokyo', author: 'nexora_ai' },
      comments: [
        { id: 1, user: 'voh_ai', text: 'Super cool music choices!' },
        { id: 2, user: 'voh', text: 'Excellent rhythm!' }
      ]
    },
    {
      id: 'vr-3',
      creator: { id: 'voh_ai', name: 'VOH AI', username: 'voh_ai', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80', isVerified: true },
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-screens-and-graphs-41555-large.mp4',
      caption: 'System processing optimized under loads. VOH AI is ready to help you answer any design or coding queries! #aesthetics #vohai #technology',
      likes: 9420,
      commentsCount: 412,
      sound: { title: 'Zero cost abstraction - Techno Beat', author: 'voh_ai' },
      comments: [
        { id: 1, user: 'voh', text: 'Zero allocation streams are extremely beautiful. Solid speed!' },
        { id: 2, user: 'nexora_ai', text: 'Let us load test this via the database interface.' }
      ]
    }
  ];

  // Dynamic search filtration logic
  const filteredPosts = posts.filter(post => {
    // Category match
    if (selectedCategory !== 'All') {
      const catMatches = (post.tags && post.tags.some(t => t.toLowerCase() === selectedCategory.toLowerCase())) ||
                         (post.content.toLowerCase().includes(selectedCategory.toLowerCase()));
      if (!catMatches) return false;
    }

    // Keyword input query match
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      return (
        post.content.toLowerCase().includes(q) ||
        post.name.toLowerCase().includes(q) ||
        post.username.toLowerCase().includes(q) ||
        post.tags.some(t => t.toLowerCase().includes(q)) ||
        ((post as any).communityName && (post as any).communityName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Filter creators for suggested row
  const filteredCreators = creators.filter(cr => {
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase();
      return cr.name.toLowerCase().includes(q) || cr.username.toLowerCase().includes(q) || cr.bio.toLowerCase().includes(q);
    }
    return true;
  });

  // Dynamic typing suggestions helper
  const suggestions = (() => {
    const term = localSearch.trim().toLowerCase();
    if (term.length === 0) return [];
    
    const matches: { type: 'user' | 'tag' | 'circle' | 'post'; text: string; raw: any }[] = [];
    
    // User matches
    creators.forEach(u => {
      if (u.name.toLowerCase().includes(term) || u.username.toLowerCase().includes(term)) {
        matches.push({ type: 'user', text: `@${u.username} (${u.name})`, raw: u });
      }
    });
    
    // Tag matches
    const tagsSeen = new Set<string>();
    posts.forEach(p => {
      p.tags.forEach(t => {
        if (t.toLowerCase().includes(term) && !tagsSeen.has(t)) {
          tagsSeen.add(t);
          matches.push({ type: 'tag', text: `#${t}`, raw: t });
        }
      });
    });
    
    // Circle matches
    INITIAL_CIRCLES.forEach(c => {
      if (c.name.toLowerCase().includes(term)) {
        matches.push({ type: 'circle', text: `🌐 Circle: ${c.name}`, raw: c });
      }
    });

    return matches.slice(0, 5);
  })();

  // Dynamic user matching & ranked similarity scoring
  const matchedCreators = (() => {
    const query = localSearch.trim().toLowerCase();
    if (searchFilterType !== 'all' && searchFilterType !== 'users' && !query) {
      return [];
    }
    if (!query) {
      return creators;
    }
    const scored = creators.map(user => {
      const nameScore = computeSimilarityScore(user.name, query);
      const usernameScore = computeSimilarityScore(user.username, query);
      const bioScore = user.bio ? computeSimilarityScore(user.bio, query) : 0;
      return { user, score: Math.max(nameScore, usernameScore, bioScore) };
    });
    return scored
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.user);
  })();

  // Dynamic community / circle matching
  const matchedCircles = (() => {
    const query = localSearch.trim().toLowerCase();
    if (searchFilterType !== 'all' && searchFilterType !== 'communities' && !query) {
      return [];
    }
    if (!query) {
      return INITIAL_CIRCLES;
    }
    return INITIAL_CIRCLES.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.description.toLowerCase().includes(query) ||
      (c.tags && c.tags.some(t => t.toLowerCase().includes(query)))
    );
  })();

  // Dynamic post matching, category indexing, and sort sequencing
  const sortedMatchedPosts = (() => {
    const query = localSearch.trim().toLowerCase();
    let result = [...posts];

    // Filter by saved collections folder if active
    if (activeCollectionFolder) {
      const savedIds = savedCollections[activeCollectionFolder] || [];
      result = result.filter(post => savedIds.includes(post.id));
    }

    // Filter by keywords within content, metadata, or communities
    if (query) {
      result = result.filter(post => {
        const contentMatch = post.content.toLowerCase().includes(query);
        const nameMatch = post.name.toLowerCase().includes(query);
        const usernameMatch = post.username.toLowerCase().includes(query);
        const tagsMatch = post.tags && post.tags.some(t => t.toLowerCase().includes(query));
        const communityMatch = (post as any).communityName && (post as any).communityName.toLowerCase().includes(query);
        const locationMatch = post.location && post.location.toLowerCase().includes(query);
        return contentMatch || nameMatch || usernameMatch || tagsMatch || communityMatch || locationMatch;
      });
    }

    // Filter by selected search scope tab type
    if (searchFilterType === 'posts') {
      result = result.filter(post => !post.videoUrl && !post.isVoice);
    } else if (searchFilterType === 'videos') {
      result = result.filter(post => !!post.videoUrl);
    } else if (searchFilterType === 'voice') {
      result = result.filter(post => !!post.isVoice);
    } else if (searchFilterType === 'communities') {
      result = result.filter(post => !!(post as any).communityName || post.tags.includes('communities') || post.tags.includes('guild'));
    } else if (searchFilterType === 'hashtags') {
      result = result.filter(post => query ? post.tags.some(t => t.toLowerCase().includes(query)) : post.tags.length > 0);
    } else if (searchFilterType === 'polls') {
      result = result.filter(post => !!(post as any).interactivePoll || post.content.toLowerCase().includes('poll') || post.tags.some(t => t.toLowerCase().includes('poll')));
    } else if (searchFilterType === 'pulse') {
      result = result.filter(post => post.likes > 200 || post.tags.includes('pulse') || !!post.location);
    }

    // Sort matching posts based on sort sequencing
    if (sortBy === 'popular') {
      result.sort((a, b) => b.likes - a.likes);
    } else if (sortBy === 'nearby') {
      result.sort((a, b) => {
        const aLocal = a.tags.includes('local') || a.tags.includes('lagos') || !!a.location ? 1 : 0;
        const bLocal = b.tags.includes('local') || b.tags.includes('lagos') || !!b.location ? 1 : 0;
        return bLocal - aLocal;
      });
    }

    return result;
  })();

  // Livestream comments loop trigger
  useEffect(() => {
    if (!activeWatchLive && !isGoingLiveOwn) return;
    
    const mockLiveTexts = [
      "No way! This is pure magic 🔥",
      "Explain the UI blur parameters please!",
      "NEXORA reputation level is going through the roof index ⚡",
      "Just joined the discussion",
      "Can we co-host soon?",
      "Is this recorded in Berlin?",
      "Sparks sent! ⚡⚡⚡",
      "Clean look Harrison, absolute legend",
      "This latency is unbelievably low right now!",
      "I am implementing this is Rust tonight!",
      "Love the neon visual theme!"
    ];

    const mockLiveUsers = [
      { user: 'david_j', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80' },
      { user: 'sarah_codes', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80' },
      { user: 'alex_sterling', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80' },
      { user: 'elena_rostova', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80' }
    ];

    const interval = setInterval(() => {
      // Real-activity only: No fake periodic activity or mock comment generation
    }, 100000);

    return () => clearInterval(interval);
  }, [activeWatchLive, isGoingLiveOwn]);

  // Hearts triggers
  const handleAddLiveHeart = () => {
    const colors = ['#f472b6', '#ec4899', '#c084fc', '#818cf8', '#22d3ee', '#fb7185', '#34d399', '#fbbf24'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const id = Date.now() + Math.random();
    
    setLiveHearts(prev => [
      ...prev,
      { id, left: Math.floor(Math.random() * 80) + 10, color: randomColor, scale: Math.random() * 0.4 + 0.8 }
    ]);
    
    setLiveAccumulatedSparks(prev => prev + 1);

    // Timeout to clear heart
    setTimeout(() => {
      setLiveHearts(prev => prev.filter(h => h.id !== id));
    }, 2000);
  };

  // Sound Detail save toggler
  const toggleSaveSound = (id: string) => {
    if (savedSounds.includes(id)) {
      setSavedSounds(prev => prev.filter(s => s !== id));
    } else {
      setSavedSounds(prev => [...prev, id]);
    }
  };

  return (
    <div id="explore-view-master-panel" className="space-y-6">
      
      {/* 🚀 1. EDITORIAL DISCO SEARCH HEADER */}
      <div className="p-5 md:p-6 rounded-2xl bg-slate-950/40 border border-violet-500/10 relative overflow-hidden">
        {/* Background gradient lights */}
        <div className="absolute right-0 bottom-0 w-36 h-36 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute left-1/3 top-0 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl animate-pulse" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5 text-violet-400 font-mono text-xs uppercase tracking-widest font-extrabold">
              <Radio className="w-3.5 h-3.5 text-pink-500 animate-ping" />
              <span>Nexora Radar Core active</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black font-sans text-white leading-tight">
              Explore Network Currents
            </h1>
            <p className="text-[11px] sm:text-xs text-violet-200/60 max-w-lg mt-1 font-sans leading-relaxed">
              Query through global creator channels, watch live video streams, discover trending sounds, or filter posts by sports, music, technology, and gaming.
            </p>
          </div>

          {/* Quick Start streaming trigger */}
          <div className="shrink-0 flex items-center gap-2.5">
            <button
              onClick={() => {
                setLiveComments([{ id: '1', user: 'System', text: 'Live secure video channel established. Camera calibrating...', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg' }]);
                setLiveAccumulatedSparks(0);
                setIsGoingLiveOwn(true);
                setLiveStreamStatus('streaming');
              }}
              className="px-4 py-2.5 rounded-xl bg-linear-to-r from-pink-600 to-violet-600 text-white font-sans text-xs font-black shadow-lg shadow-pink-600/10 hover:brightness-110 hover:-translate-y-0.5 active:scale-98 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5 text-white" />
              <span>Broadcast Live Link 🔴</span>
            </button>
            
            <button
              onClick={() => {
                setActiveReelsPlayback(mockReels[0]);
                setReelsIndex(0);
              }}
              className="px-4 py-2.5 rounded-xl bg-slate-900 border border-violet-500/20 text-violet-300 font-sans text-xs font-black hover:border-violet-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Film className="w-3.5 h-3.5" />
              <span>Watch Short Videos 🎬</span>
            </button>
          </div>
        </div>

        {/* 🔍 Dynamic Search Form */}
        <div className="relative mt-4.5 max-w-xl flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
            <input
              type="text"
              placeholder="Search creators, hashtags, sports channels, tech posts, video tags..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  addToSearchHistory(localSearch);
                  window.dispatchEvent(new CustomEvent('toast', { detail: `🔍 Executing search for "${localSearch}"...` }));
                }
              }}
              className="w-full pl-10 pr-4 py-3 bg-[#070512]/90 border border-violet-500/15 focus:border-[#8B5CF6] focus:outline-hidden focus:ring-1 focus:ring-violet-500/20 rounded-xl text-xs text-white placeholder-violet-400/30 transition-all font-sans"
            />
            
            {/* Dynamic Typing Suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1.5 bg-[#09061c] border border-violet-500/30 rounded-xl shadow-2xl z-50 overflow-hidden text-left divide-y divide-white/5">
                {suggestions.map((sug, i) => (
                  <div 
                    key={`sug-${i}`}
                    onClick={() => {
                      if (sug.type === 'user') {
                        setLocalSearch(sug.raw.username);
                        addToSearchHistory(sug.raw.username);
                        onViewProfile(sug.raw);
                      } else if (sug.type === 'tag') {
                        setLocalSearch(sug.raw);
                        setSearchFilterType('hashtags');
                        addToSearchHistory(sug.raw);
                      } else {
                        setLocalSearch(sug.raw.name || sug.text);
                        addToSearchHistory(sug.raw.name || sug.text);
                      }
                    }}
                    className="p-2.5 px-4 text-xs font-mono text-violet-200 hover:bg-violet-600/10 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <span>{sug.text}</span>
                    <span className="text-[9px] text-violet-400/50 uppercase tracking-widest">{sug.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              if (localSearch.trim()) {
                addToSearchHistory(localSearch);
                window.dispatchEvent(new CustomEvent('toast', { detail: `🔍 Executing search for "${localSearch}"...` }));
              }
            }}
            className="px-5 py-3 rounded-xl bg-linear-to-r from-violet-600 to-pink-600 text-white font-sans text-xs font-black shadow-lg shadow-violet-500/10 hover:brightness-110 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            SEARCH
          </button>
        </div>
      </div>

      {/* 🟣 SEARCH HUB ENGINE PLATFORM (Consolidated from Home Feed for full immersion) */}
      <div className="p-4 bg-[#0a071d]/90 border border-violet-500/10 rounded-2xl space-y-4 text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
          {/* Search Category Tabs */}
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-mono text-[#A78BFA] font-extrabold tracking-widest block">
              Search Scope
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Content 🌌' },
                { id: 'users', label: 'Users 👥' },
                { id: 'posts', label: 'Posts 📝' },
                { id: 'videos', label: 'Videos 🎥' },
                { id: 'voice', label: 'Voice Posts 🎙️' },
                { id: 'communities', label: 'Communities 🏟️' },
                { id: 'hashtags', label: 'Hashtags 🏷️' },
                { id: 'polls', label: 'Polls 📊' },
                { id: 'pulse', label: 'Pulse 🌍' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    setSearchFilterType(f.id as any);
                    if (f.id === 'users') {
                      window.dispatchEvent(new CustomEvent('toast', { detail: '👤 Filtering results by User Accounts only' }));
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold font-sans transition-all cursor-pointer ${searchFilterType === f.id ? 'bg-violet-600 border border-violet-500/30 text-white font-extrabold shadow-[0_0_12px_rgba(139,92,246,0.25)]' : 'bg-slate-900 text-zinc-400 hover:text-zinc-200 border border-white/5'}`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sort By Controls */}
          <div className="space-y-1 shrink-0">
            <span className="text-[10px] uppercase font-mono text-pink-400 font-extrabold tracking-widest block">
              Sort Sequence
            </span>
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[10.5px] font-sans">
              {[
                { id: 'latest', label: '⚡ Latest' },
                { id: 'popular', label: '🔥 Popular' },
                { id: 'nearby', label: '📍 Nearby' }
              ].map(s => (
                <button
                  key={s.id}
                  onClick={() => setSortBy(s.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${sortBy === s.id ? 'bg-pink-600 text-white font-bold' : 'text-zinc-400 hover:text-white'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Saved Collections Folder Deck */}
        <div className="text-left border-t border-white/5 pt-3 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10.5px] font-mono font-bold text-zinc-400 uppercase flex items-center gap-1 shrink-0">
                <Folder className="w-3.5 h-3.5 text-pink-400" />
                SAVED COLLECTIONS:
              </span>
              <div className="flex flex-wrap items-center gap-1.5 font-sans">
                {Object.keys(savedCollections).map(folder => {
                  const count = savedCollections[folder]?.length || 0;
                  const isFolderActive = activeCollectionFolder === folder;
                  return (
                    <button
                      key={folder}
                      onClick={() => {
                        setActiveCollectionFolder(isFolderActive ? null : folder);
                        if (!isFolderActive) {
                          window.dispatchEvent(new CustomEvent('toast', { detail: `📂 Displaying items bookmarked inside [${folder}]` }));
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold font-sans transition-all flex items-center gap-1.5 cursor-pointer border ${isFolderActive ? 'bg-pink-950/40 text-pink-300 border-pink-500/40 font-extrabold' : 'bg-[#0a051c]/60 text-zinc-400 hover:text-zinc-350 border-white/5'}`}
                    >
                      <span>{folder}</span>
                      <span className="bg-black/40 text-[9px] px-1 rounded-md font-mono text-zinc-350">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            {activeCollectionFolder && (
              <button
                onClick={() => setActiveCollectionFolder(null)}
                className="text-[10.5px] font-mono text-rose-400 hover:text-rose-500 font-extrabold flex items-center gap-1 cursor-pointer shrink-0 uppercase tracking-wide"
              >
                [Exit Folder ✖]
              </button>
            )}
          </div>
        </div>

        {/* Premium Recent Searches Block */}
        {searchHistory.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/5 pt-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[9.5px] font-mono font-extrabold text-[#A78BFA] uppercase tracking-wider flex items-center gap-1">
                <RefreshCw className="w-3" />
                Recent Search Logs:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {searchHistory.map((hist) => (
                  <div 
                    key={hist}
                    className="flex items-center gap-1 bg-violet-950/40 hover:bg-violet-950/70 border border-violet-500/10 hover:border-violet-500/20 px-2 py-1 rounded-lg text-[10px] font-mono text-violet-200 transition-all cursor-pointer"
                  >
                    <span 
                      onClick={() => {
                        setLocalSearch(hist);
                        addToSearchHistory(hist);
                      }}
                    >
                      {hist}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromSearchHistory(hist);
                      }}
                      className="hover:text-red-400 font-bold ml-1 px-0.5 text-[9px] cursor-pointer"
                    >
                      ✖
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={clearAllSearchHistory}
              className="text-[9px] font-mono font-bold text-red-400 hover:text-red-300 transition-colors uppercase shrink-0"
            >
              Clear Logs 🗑️
            </button>
          </div>
        )}

        {/* Trending Bento Grids */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-white/5 pt-3">
          {/* Trending Topics Column */}
          <div className="bg-black/25 border border-white/5 rounded-xl p-2.5 space-y-2 text-left">
            <span className="text-[9px] font-mono font-black text-rose-400 uppercase tracking-widest flex items-center gap-1">
              <span>🔥</span> TRENDING TOPICS
            </span>
            <div className="flex flex-col gap-1.5">
              {[
                { text: 'Quantum Networking', term: 'Quantum' },
                { text: 'Sarah Creative Studio', term: 'Sarah' },
                { text: 'David Sports Hub', term: 'David' }
              ].map((topic) => (
                <button
                  key={topic.text}
                  onClick={() => {
                    setLocalSearch(topic.term);
                    setSearchFilterType('all');
                    addToSearchHistory(topic.text);
                  }}
                  className="text-left py-1 px-1.5 text-[10px] font-sans font-medium text-zinc-300 hover:text-[#A78BFA] transition-colors truncate block"
                >
                  📈 {topic.text}
                </button>
              ))}
            </div>
          </div>

          {/* Trending Hashtags Column */}
          <div className="bg-black/25 border border-white/5 rounded-xl p-2.5 space-y-2 text-left">
            <span className="text-[9px] font-mono font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
              <span>🏷️</span> TRENDING HASHTAGS
            </span>
            <div className="flex flex-col gap-1.5">
              {['#BuildInPublic', '#NextGenWeb', '#SpatialComputing'].map((hashtag) => (
                <button
                  key={hashtag}
                  onClick={() => {
                    setLocalSearch(hashtag);
                    setSearchFilterType('hashtags');
                    addToSearchHistory(hashtag);
                  }}
                  className="text-left py-1 px-1.5 text-[10px] font-mono text-zinc-300 hover:text-[#A78BFA] transition-colors truncate block"
                >
                  ✨ {hashtag}
                </button>
              ))}
            </div>
          </div>

          {/* Trending Communities Column */}
          <div className="bg-black/25 border border-white/5 rounded-xl p-2.5 space-y-2 text-left">
            <span className="text-[9px] font-mono font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
              <span>🏟️</span> TRENDING GUILDS
            </span>
            <div className="flex flex-col gap-1.5">
              {['Austin Creators Guild', 'Lagos Tech Hub', 'Business Synthesis'].map((community) => (
                <button
                  key={community}
                  onClick={() => {
                    setLocalSearch(community);
                    setSearchFilterType('communities');
                    addToSearchHistory(community);
                  }}
                  className="text-left py-1 px-1.5 text-[10px] font-sans font-medium text-zinc-300 hover:text-cyan-400 transition-colors truncate block"
                >
                  🏟️ {community}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 🔴 SEARCH RESULTS OVERLAY/DOCK VIEW (Conditional) */}
      {(localSearch.trim().length > 0 || searchFilterType !== 'all' || activeCollectionFolder !== null) && (
        <div className="p-5 md:p-6 rounded-2xl bg-slate-950/70 border border-violet-500/20 space-y-5 text-left relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#8B5CF6] animate-ping" />
              <h2 className="text-sm font-sans font-black tracking-wider uppercase text-violet-200">
                Found {matchedCreators.length} Users, {matchedCircles.length} Communities & {sortedMatchedPosts.length} Posts
              </h2>
            </div>
            <button 
              onClick={() => {
                setLocalSearch('');
                setSearchFilterType('all');
                setActiveCollectionFolder(null);
              }}
              className="text-[10.5px] font-mono font-bold text-pink-400 hover:text-pink-300 uppercase cursor-pointer"
            >
              Clear Search Filters ✖
            </button>
          </div>

          {/* Users List Result Segment - Voice of Harrison verification styling */}
          {matchedCreators.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-mono font-black text-pink-500/80 uppercase tracking-widest block">
                CREATORS & INFLUENCERS
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {matchedCreators.map((user) => (
                  <div key={user.id} className="p-4 rounded-3xl bg-[#08051a] hover:bg-[#0b0826] border border-violet-500/15 transition-all flex items-center justify-between gap-4 text-left relative overflow-hidden group">
                    <div className="flex gap-3.5 items-center">
                      <div className="relative shrink-0">
                        <img src={user.avatar} className="w-13 h-13 rounded-xl object-cover ring-2 ring-violet-500/40" />
                        {user.isVerified && (
                          <span className="absolute -bottom-1 -right-1">
                            <PurpleVerifiedBadge />
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-white font-sans">{user.name}</h4>
                          <span className="text-[9.5px] font-mono text-[#8B5CF6]">@{user.username}</span>
                        </div>
                        {/* Followers level */}
                        <span className="text-[9px] font-mono text-zinc-400 mt-0.5 block font-bold">
                          ⚡ {user.followers || '14.8K'} Follower Nodes
                        </span>
                        {/* Bio preview */}
                        <p className="text-[11px] text-zinc-300 font-sans mt-0.5 line-clamp-1 max-w-sm">
                          {user.bio}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleFollow && onToggleFollow(user.id)}
                      className={`text-[9.5px] font-mono font-black py-1.5 px-3 rounded-lg active:scale-95 transition-all uppercase shrink-0 cursor-pointer ${
                        followingIds.includes(user.id) 
                          ? 'border border-[#8B5CF6]/30 text-purple-400 hover:text-white' 
                          : 'bg-linear-to-r from-violet-600 to-pink-600 text-white'
                      }`}
                    >
                      {followingIds.includes(user.id) ? 'Following' : 'Follow Node'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Circles Result Segment */}
          {matchedCircles.length > 0 && (
            <div className="space-y-3 pt-3 border-t border-white/5">
              <span className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-widest block">
                🏟️ MATCHED COMMUNITIES & CIRCLES ({matchedCircles.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {matchedCircles.map(circle => (
                  <div 
                    key={circle.id}
                    className="p-4 rounded-3xl bg-[#090620] hover:bg-[#0c092c] border border-emerald-500/10 hover:border-emerald-500/20 transition-all flex flex-col justify-between gap-3 text-left"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-white font-sans">{circle.name}</h4>
                        <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-mono py-0.5 px-2 rounded-full border border-emerald-500/20 uppercase font-bold">
                          🏟️ {circle.membersCount} members
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 font-sans leading-snug line-clamp-2">
                        {circle.description}
                      </p>
                      {circle.tags && circle.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {circle.tags.map(t => (
                            <span key={t} className="text-[9px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                      <span className="text-[9px] font-mono text-zinc-500">
                        Rules: {circle.rules?.length || 0} enforced
                      </span>
                      <button 
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'communities' } }));
                          window.dispatchEvent(new CustomEvent('toast', { detail: `Welcome to ${circle.name}! 🏟️` }));
                        }}
                        className="text-[9.5px] font-mono font-black bg-emerald-600 hover:bg-emerald-500 text-white py-1 px-3 rounded-lg active:scale-95 transition-all uppercase cursor-pointer"
                      >
                        Enter Guild
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Posts Result Segment - Interleaved style list */}
          {sortedMatchedPosts.length > 0 ? (
            <div className="space-y-3 pt-3 border-t border-white/5">
              <span className="text-[10px] font-mono font-black text-[#A78BFA] uppercase tracking-widest block">
                POST STREAM MATCHES ({sortedMatchedPosts.length})
              </span>
              <div className="space-y-4">
                {sortedMatchedPosts.map((post) => (
                  <div key={post.id} className="p-4 rounded-2xl bg-[#09071c]/90 border border-violet-500/10 text-left space-y-3">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <img src={post.avatar} className="w-8 h-8 rounded-lg object-cover" />
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-white">{post.name}</span>
                            <span className="text-[9px] font-mono text-violet-400">@{post.username}</span>
                          </div>
                          <span className="text-[8px] font-mono text-zinc-500 block">{post.timestamp}</span>
                        </div>
                      </div>

                      {post.videoUrl && (
                        <span className="bg-purple-600/10 text-purple-400 border border-purple-500/20 text-[8px] font-mono py-0.5 px-2 rounded uppercase tracking-wider font-extrabold">
                          🎥 Video Block
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                      {post.content}
                    </p>

                    {post.videoUrl && (
                      <div className="relative aspect-video max-w-sm rounded-xl overflow-hidden bg-black/40 border border-white/5">
                        <video src={post.videoUrl} muted autoPlay loop className="w-full h-full object-cover" />
                        <div className="absolute top-2 left-2 bg-black/60 text-[8px] font-mono text-white/80 py-0.5 px-1.5 rounded">AUTO PLAY PREVIEW</div>
                      </div>
                    )}

                    <div className="flex gap-3 text-[10px] font-mono text-zinc-400">
                      <span>⚡ {post.likes} Sparks</span>
                      <span>💬 {post.comments.length} Discussion notes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            (localSearch.trim().length > 0 || searchFilterType !== 'all' || activeCollectionFolder !== null) && 
            matchedCreators.length === 0 && matchedCircles.length === 0 && (
              <div className="space-y-6 pt-2">
                <div className="p-4 bg-violet-950/10 border border-violet-500/10 rounded-2xl text-center">
                  <p className="text-xs font-mono text-zinc-400">🔍 No exact matches found for <span className="text-violet-400">"{localSearch}"</span>. Showing similar platform-wide discoveries:</p>
                </div>
                
                {/* Similar Creators */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-black text-pink-500/80 uppercase tracking-widest block">SUGGESTED CREATORS</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {creators.slice(0, 3).map((user) => (
                      <div key={`sim-cr-${user.id}`} className="p-4 rounded-3xl bg-[#08051a] hover:bg-[#0b0826] border border-violet-500/15 transition-all flex items-center justify-between gap-4 text-left">
                        <div className="flex gap-3.5 items-center">
                          <div className="relative shrink-0">
                            <img src={user.avatar} className="w-11 h-11 rounded-xl object-cover ring-2 ring-violet-500/40" />
                            {user.isVerified && <span className="absolute -bottom-1 -right-1"><PurpleVerifiedBadge /></span>}
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white font-sans">{user.name}</h4>
                            <p className="text-[10px] text-violet-400 font-mono">@{user.username}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => onViewProfile(user)}
                          className="px-3.5 py-1.5 rounded-lg text-[9.5px] font-mono font-black border border-violet-500/30 text-violet-300 bg-violet-500/10 hover:bg-violet-600 hover:text-white transition-all cursor-pointer"
                        >
                          VIEW
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Similar Communities */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono font-black text-emerald-500/80 uppercase tracking-widest block">ACTIVE CHANNELS</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {INITIAL_CIRCLES.slice(0, 2).map((circle) => (
                      <div key={`sim-ci-${circle.id}`} className="p-4 rounded-3xl bg-[#08051a] border border-violet-500/15 flex flex-col justify-between gap-3 text-left">
                        <div>
                          <h4 className="text-xs font-black text-white font-sans flex items-center gap-1.5">
                            <span>🌐</span> {circle.name}
                          </h4>
                          <p className="text-[10.5px] text-zinc-400 font-sans mt-1 line-clamp-2">{circle.description}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-mono text-zinc-500">{circle.membersCount} active nodes</span>
                          <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded bg-violet-950/40 text-violet-300 border border-violet-500/10">{circle.tags[0]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {/* 🧭 2. DYNAMIC NICHE CATEGORIES HORIZONTAL DOCK */}
      <div id="explore-categories-bar" className="flex gap-2 bg-slate-950/20 p-1 rounded-2xl border border-white/5 overflow-x-auto scrollbar-none py-1.5 px-2">
        {categories.map((cat) => {
          const CatIcon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.id);
                setLocalSearch(''); // clear search to let category dictate
              }}
              className={`flex items-center gap-1.5 py-2 px-3.5 shrink-0 rounded-xl font-mono text-xs font-black uppercase transition-all duration-300 cursor-pointer ${
                isSelected 
                  ? 'bg-linear-to-r from-violet-600 via-pink-600 to-pink-500 text-white shadow-md shadow-violet-600/10' 
                  : 'bg-white/[0.02] border border-white/5 text-violet-400/60 hover:text-violet-200 hover:bg-white/5'
              }`}
            >
              <CatIcon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 🔴 3. ACTIVE LIVE CHANNELS SPOTLIGHT */}
      <div id="voh-explore-lives" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-sans font-black tracking-wider uppercase text-pink-400 flex items-center gap-1.5">
            <Radio className="w-4 h-4 text-pink-500 animate-pulse" />
            Active Live Video Streams
          </h2>
          <span className="text-[10px] text-violet-400/50 font-mono">Simultaneous Broadcast Nodes</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Mock Live Card 1 */}
          <div className="p-4 rounded-3xl bg-linear-to-b from-[#11062a] to-[#04010b] border border-pink-500/20 relative overflow-hidden group flex flex-col justify-between shadow-lg h-44">
            <div className="absolute top-3 left-3 bg-red-600 text-white font-mono text-[9px] font-black py-0.5 px-2 rounded-md uppercase tracking-wider animate-pulse">
              LIVE 🔴
            </div>
            <div className="absolute top-3 right-3 text-white/50 text-[9px] font-mono flex items-center gap-1 bg-black/40 py-0.5 px-2 rounded-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>1.2K Watching</span>
            </div>
            
            <div className="mt-8 space-y-1">
              <span className="text-[9px] text-[#8B5CF6] font-mono uppercase tracking-widest block">Nexora AI</span>
              <h3 className="text-sm font-black text-white font-sans line-clamp-2 leading-snug">
                🎵 Live Afrobeat DJ set and Music Jams Session
              </h3>
            </div>

            <div className="mt-auto pt-3 border-t border-violet-500/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100" className="w-6 h-6 rounded-lg object-cover" />
                <span className="text-[10px] font-mono text-violet-300">@nexora_ai</span>
              </div>
              <button 
                onClick={() => {
                  setLiveComments([
                    { id: '1', user: 'voh_ai', text: 'This looks so smooth Nexora! 😍', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=80' },
                    { id: '2', user: 'voh', text: 'Lekki sounds are super crisp! 🎧', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg' }
                  ]);
                  setLiveAccumulatedSparks(120);
                  setLiveViewersCount(2102);
                  setActiveWatchLive({ id: 'live-nexora', name: 'Nexora AI', username: 'nexora_ai', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100', topic: '🎵 Live Afrobeat DJ set and Music Jams' });
                }}
                className="text-[9px] font-mono font-black bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all uppercase cursor-pointer"
              >
                Watch Stream
              </button>
            </div>
          </div>

          {/* Mock Live Card 2 */}
          <div className="p-4 rounded-3xl bg-linear-to-b from-[#11062a] to-[#04010b] border border-pink-500/20 relative overflow-hidden group flex flex-col justify-between shadow-lg h-44">
            <div className="absolute top-3 left-3 bg-red-600 text-white font-mono text-[9px] font-black py-0.5 px-2 rounded-md uppercase tracking-wider animate-pulse">
              LIVE 🔴
            </div>
            <div className="absolute top-3 right-3 text-white/50 text-[9px] font-mono flex items-center gap-1 bg-black/40 py-0.5 px-2 rounded-md">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
              <span>852 Watching</span>
            </div>
            
            <div className="mt-8 space-y-1">
              <span className="text-[9px] text-[#8B5CF6] font-mono uppercase tracking-widest block">VOH AI</span>
              <h3 className="text-sm font-black text-white font-sans line-clamp-2 leading-snug">
                🤖 Interactive Design Playground & Code Architecture Sync
              </h3>
            </div>

            <div className="mt-auto pt-3 border-t border-violet-500/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=100" className="w-6 h-6 rounded-lg object-cover" />
                <span className="text-[10px] font-mono text-violet-300">@voh_ai</span>
              </div>
              <button 
                onClick={() => {
                  setLiveComments([
                    { id: '1', user: 'voh', text: 'Sensational design tokens VOH AI!', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg' }
                  ]);
                  setLiveAccumulatedSparks(85);
                  setLiveViewersCount(852);
                  setActiveWatchLive({ id: 'live-vohai', name: 'VOH AI', username: 'voh_ai', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=100', topic: '🤖 Interactive Design Playground' });
                }}
                className="text-[9px] font-mono font-black bg-pink-500 hover:bg-pink-600 text-white px-3 py-1.5 rounded-lg active:scale-95 transition-all uppercase cursor-pointer"
              >
                Watch Stream
              </button>
            </div>
          </div>

          {/* Quick Stats Bento */}
          <div className="p-4 rounded-3xl bg-current/3 border border-current/5 flex flex-col justify-between h-44">
            <div>
              <span className="text-[9px] font-mono text-[#8B5CF6] uppercase block">Platform Streaming Stats</span>
              <h3 className="text-sm font-bold font-sans text-current leading-tight mt-1">
                Global Stream Capacity
              </h3>
              <p className="text-[10px] text-current/50 mt-1">Interactive media channels broadcast at ultra-low latency configurations.</p>
            </div>
            
            <div className="flex items-end justify-between">
              <div>
                <span className="text-2xl font-black font-sans text-current">2.4ms</span>
                <span className="block text-[8px] font-mono text-current/40 uppercase">Average Latency</span>
              </div>
              <div>
                <span className="text-2xl font-black font-sans text-current">84.2K</span>
                <span className="block text-[8px] font-mono text-current/40 uppercase">Active Eyeballs</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 🏷️ 4. EXCITING HASHTAGS & SUGGESTED PEERS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Suggested Creators Row (Left Side) */}
        <div className="md:col-span-2 space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-sans font-black tracking-wider uppercase text-violet-400 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-violet-400" />
              Suggested Peers You May Know
            </h2>
            <span className="text-[10px] font-mono text-violet-400/50">Follow Alignments</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredCreators.slice(0, 6).map((user) => {
              const isFollowingUser = followingIds.includes(user.id);
              return (
                <div key={user.id} className="p-4 rounded-2xl bg-[#09071c] hover:bg-[#0c0a25] border border-violet-500/10 hover:border-violet-500/20 transition-all flex flex-col items-center justify-between text-center relative overflow-hidden group">
                  <div className="relative">
                    <img src={user.avatar} className="w-13 h-13 rounded-xl object-cover ring-2 ring-violet-500/40" />
                    {user.isVerified && (
                      <span className="absolute -bottom-1 -right-1 bg-violet-600 rounded-full p-0.5 border border-[#0d0a21]">
                        <Check className="w-2 h-2 text-white fill-current" />
                      </span>
                    )}
                  </div>

                  <div className="overflow-hidden w-full mt-3">
                    <h4 className="text-xs font-black text-white truncate font-sans">{user.name}</h4>
                    <span className="text-[9px] font-mono text-violet-400 block mt-0.5">@{user.username}</span>
                  </div>

                  <p className="text-[9.5px] text-violet-200/50 font-sans line-clamp-2 mt-2 h-[28px]">
                    {user.bio}
                  </p>

                  <button
                    onClick={() => onToggleFollow && onToggleFollow(user.id)}
                    className={`w-full text-[9px] font-mono font-black mt-4.5 py-1.5 rounded-lg active:scale-95 transition-all uppercase cursor-pointer ${
                      isFollowingUser 
                        ? 'border border-violet-500/30 text-violet-400 hover:text-white hover:border-red-500/30 hover:bg-red-950/20' 
                        : 'bg-[#8B5CF6] text-white hover:bg-violet-600 shadow-md shadow-violet-500/5'
                    }`}
                  >
                    {isFollowingUser ? 'Following' : 'Follow Node'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Suggested Communities & Circles (Right Side) */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-sans font-black tracking-wider uppercase text-cyan-400 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-cyan-400" />
              Suggested Communities
            </h2>
            <span className="text-[10px] font-mono text-cyan-400/50">Spaces Hub</span>
          </div>

          <div className="space-y-3">
            {suggestedCommunities.map((comm) => (
              <div 
                key={comm.id}
                className="p-3 rounded-2xl bg-slate-950/20 border border-white/5 hover:border-violet-500/20 transition-all flex items-center justify-between gap-3 text-left"
              >
                <div className="overflow-hidden">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-xs font-black text-white font-sans">{comm.name}</h4>
                    <span className="text-[8.5px] font-mono text-cyan-400 bg-cyan-400/10 px-1.5 py-0.5 rounded">
                      {comm.members}
                    </span>
                  </div>
                  <p className="text-[10px] text-violet-200/60 font-sans truncate leading-normal mt-0.5">
                    {comm.description}
                  </p>
                </div>

                <button className="text-[9px] font-mono font-black bg-cyan-500/10 hover:bg-cyan-500/25 border border-cyan-400/30 text-cyan-300 px-3 py-1.5 rounded-lg shrink-0 transition-colors cursor-pointer capitalize">
                  Join
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 🎵 5. TRENDING SOUNDS / AUDIO SYSTEM SECTION */}
      <div id="explore-trending-sounds" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-sans font-black tracking-wider uppercase text-[#8B5CF6] flex items-center gap-1.5">
            <Music className="w-4 h-4 text-[#8B5CF6]" />
            Trending Sound System
          </h2>
          <span className="text-[10px] font-mono text-[#8B5CF6]/50">Audio Layer</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {mockSounds.map((snd) => {
            const isSaved = savedSounds.includes(snd.id);
            return (
              <div 
                key={snd.id}
                onClick={() => setActiveSoundDetail(snd)}
                className="p-3 rounded-2xl bg-[#09071c] hover:bg-[#0c0a25] border border-violet-500/10 hover:border-violet-500/20 transition-all flex items-center gap-3.5 cursor-pointer relative overflow-hidden group"
              >
                <div className="relative shrink-0 w-11 h-11 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img src={snd.url} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform" />
                  <Music className="w-5 h-5 text-white relative z-10 animate-pulse" />
                </div>

                <div className="overflow-hidden min-w-0 flex-1">
                  <h4 className="text-xs font-black text-white truncate font-sans leading-none">{snd.title}</h4>
                  <span className="text-[9.5px] font-mono text-violet-400 block mt-1">{snd.artist}</span>
                  <span className="text-[8px] font-mono text-current/40 block mt-0.5">{snd.uses} short videos</span>
                </div>

                <ArrowRight className="w-3.5 h-3.5 text-violet-500 group-hover:translate-x-1 transition-transform shrink-0" />
              </div>
            );
          })}
        </div>
      </div>

      {/* 📊 6. BENTO GRID DISCOVERY FEED LISTINGS */}
      <div id="explore-cards-feed" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-sans font-black tracking-wider uppercase text-cyan-400 flex items-center gap-1.5">
            <Grid className="w-4 h-4 text-cyan-400" />
            Curated Discovery Feed
          </h2>
          <span className="text-[10px] font-mono text-cyan-400/50">Unified Node Matches</span>
        </div>

        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredPosts.map((post) => (
              <motion.div
                key={post.id}
                whileHover={{ y: -3 }}
                className="p-4 rounded-3xl bg-[#03010b] border border-violet-500/10 flex flex-col justify-between text-left h-48 hover:border-violet-500/25 transition-all duration-300 relative overflow-hidden"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <img src={post.avatar} className="w-5 h-5 rounded-full object-cover" />
                      <span className="text-[10.5px] font-mono text-violet-300">@{post.username}</span>
                    </div>
                    {post.isVoice && (
                      <span className="text-[8px] font-mono uppercase bg-cyan-400/10 text-cyan-300 px-1 py-0.5 rounded leading-none">
                        🎙️ voice
                      </span>
                    )}
                  </div>

                  <p className="text-[11.5px] text-violet-100 font-sans leading-normal line-clamp-3">
                    {post.content}
                  </p>
                </div>

                {/* Tags row */}
                <div className="flex items-center justify-between gap-2.5 pt-3 border-t border-violet-500/5 mt-auto">
                  <div className="flex gap-1.5 overflow-hidden">
                    {post.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="text-[9px] font-mono text-cyan-400">#{tag}</span>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      onLikePost(post.id);
                    }}
                    className="flex items-center gap-1 text-[10px] font-mono text-pink-400 group cursor-pointer"
                  >
                    <span>⚡ Sparks</span>
                    <span className="font-bold">{post.likes}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 rounded-3xl border border-dashed border-violet-500/15 bg-slate-900/10">
            <Radio className="w-10 h-10 text-violet-500/20 mx-auto animate-bounce" />
            <h3 className="text-xs font-mono font-bold text-violet-300 mt-2.5">No Matching Nodes Detected</h3>
            <p className="text-[10px] text-violet-300/40 mt-1 max-w-xs mx-auto">None of the curated broadcasts matches your custom query or selected filter criteria. Retry clearing search terms.</p>
          </div>
        )}
      </div>

      {/* ======================================================= */}
      {/* 🎬 7. NEXORA REELS FULL-SCREEN INTERACTIVE VIEWER */}
      {/* ======================================================= */}
      <AnimatePresence>
        {activeReelsPlayback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col md:flex-row overflow-hidden select-none"
          >
            {/* Keyboard Arrow Navigation Handler */}
            <ReelsKeyboardController 
              reelsIndex={reelsIndex}
              mockReels={mockReels}
              setReelsIndex={setReelsIndex}
              setActiveReelsPlayback={setActiveReelsPlayback}
            />

            {/* PRELOADER BUFFER FOR NEXT VIDEO LOOP */}
            <video 
              src={mockReels[(reelsIndex + 1) % mockReels.length]?.videoUrl} 
              preload="auto" 
              className="hidden" 
              muted 
            />

            {/* LEFT SIDE: FULL SIZE VIDEO PORT */}
            <div className="flex-1 bg-black relative flex items-center justify-center h-full">
              
              {/* Loop Video Element */}
              <video
                src={activeReelsPlayback.videoUrl}
                autoPlay
                loop
                muted={reelsMuted}
                playsInline
                onTimeUpdate={(e) => {
                  const v = e.currentTarget;
                  if (v.duration) {
                    setVideoProgress((v.currentTime / v.duration) * 100);
                  }
                }}
                className="w-full h-full max-h-screen object-cover md:object-contain"
              />

              {/* Clicking can pause/play is standard, let's keep it safe */}
              <div className="absolute inset-0 bg-black/5 hover:bg-black/10 transition-colors flex items-center justify-center cursor-pointer" />

              {/* Top Control Bar row */}
              <div className="absolute top-4 inset-x-4 flex items-center justify-between z-10 pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                  <button 
                    onClick={() => setReelsMuted(!reelsMuted)}
                    className="p-2.5 bg-black/60 hover:bg-black/85 backdrop-blur-md rounded-xl text-white border border-white/10 cursor-pointer"
                  >
                    {reelsMuted ? <VolumeX className="w-4 h-4 text-pink-500" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  </button>

                  <button 
                    onClick={() => setReelsAutoCaption(!reelsAutoCaption)}
                    className={`px-3 py-1.5 text-[9px] font-mono font-extrabold rounded-xl border cursor-pointer transition-all ${
                      reelsAutoCaption 
                        ? 'bg-violet-600 border-violet-400 text-white shadow-md' 
                        : 'bg-black/60 border-white/10 text-violet-400 hover:text-white'
                    }`}
                    title="VOH AI Real-time Auto Generated Timed Subtitles"
                  >
                    🗣️ VOH AI Subtitles: {reelsAutoCaption ? 'ON' : 'OFF'}
                  </button>

                  <div className="px-2.5 py-1.5 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 text-[9px] font-mono font-bold text-cyan-300 flex items-center gap-1">
                    👁️ Watch Session: {watchHistory.length} loop{watchHistory.length !== 1 ? 's' : ''}
                  </div>
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                  <button 
                    onClick={() => setActiveReelsPlayback(null)}
                    className="p-2.5 bg-black/60 hover:bg-black/85 backdrop-blur-md rounded-xl text-white border border-white/10 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 🗣️ AI TIMED REEL TIMELINE */}
              {reelsAutoCaption && (
                <div className="absolute inset-x-4 bottom-28 md:bottom-24 bg-black/55 backdrop-blur-md p-3.5 rounded-2xl border border-violet-500/20 text-center z-10 max-w-lg mx-auto shadow-2xl animate-fade-in unique-retros">
                  <span className="text-[8px] font-mono text-[#8B5CF6] uppercase tracking-widest font-extrabold block mb-1">
                    🟢 VOH AI Real-Time Voice-To-Text Sync Active
                  </span>
                  <p className="text-xs font-sans text-cyan-300 font-bold leading-normal italic">
                    "{activeReelsPlayback.id === 'vr-1' ? "Designing a competitive social network ... our current layout matches visual standards 🎨✓" : 
                      activeReelsPlayback.id === 'vr-2' ? "Analyzing sunset magenta parameters in Berlin nightlife hubs 🌆📷" : 
                      activeReelsPlayback.id === 'vr-3' ? "Zero cost abstraction benchmarking is mapping under 1.8ms! 🦀⚡" : 
                      "Setting up minimalist borders and backdrop blur layouts safely on NEXORA"}"
                  </p>
                </div>
              )}

              {/* BOTTOM INFORMATION INSIDE VIDEO */}
              <div className="absolute bottom-4 left-4 right-24 text-white z-10 p-2.5 text-left bg-gradient-to-t from-black/90 via-black/40 to-transparent rounded-xl">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative">
                    <img src={activeReelsPlayback.creator.avatar} className="w-9 h-9 rounded-lg object-cover ring-2 ring-violet-500/40" />
                    {activeReelsPlayback.creator.id !== 'voh' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onToggleFollow) {
                            onToggleFollow(activeReelsPlayback.creator.id);
                            const wasFollowing = followingIds.includes(activeReelsPlayback.creator.id);
                            window.dispatchEvent(new CustomEvent('toast', { 
                              detail: wasFollowing 
                                ? `Unfollowed @${activeReelsPlayback.creator.username}` 
                                : `Now following @${activeReelsPlayback.creator.username}! 🌟` 
                            }));
                          }
                        }}
                        className={`absolute -bottom-1 -right-1 leading-none rounded-full border border-black cursor-pointer text-white flex items-center justify-center w-4.5 h-4.5 font-bold text-xs shadow-lg transition-transform hover:scale-110 active:scale-95 ${
                          followingIds.includes(activeReelsPlayback.creator.id)
                            ? 'bg-zinc-600 hover:bg-zinc-700'
                            : 'bg-pink-500 hover:bg-pink-600'
                        }`}
                        title={followingIds.includes(activeReelsPlayback.creator.id) ? 'Following' : 'Follow'}
                      >
                        {followingIds.includes(activeReelsPlayback.creator.id) ? '✓' : '+'}
                      </button>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-sans font-black text-white flex items-center gap-1 leading-none">
                      {activeReelsPlayback.creator.name}
                      {activeReelsPlayback.creator.isVerified && (
                        <span className="bg-violet-600 rounded-full p-0.5">
                          <Check className="w-1.5 h-1.5 text-white fill-current" />
                        </span>
                      )}
                    </h4>
                    <span className="text-[10px] font-mono text-violet-300 block mt-0.5">@{activeReelsPlayback.creator.username}</span>
                  </div>
                </div>

                <p className="text-[11px] text-white/90 font-sans leading-relaxed line-clamp-3 md:line-clamp-none max-w-xl">
                  {activeReelsPlayback.caption}
                </p>

                {/* Sound Marquee Ticker */}
                <div onClick={() => {
                  const s = mockSounds.find(m => m.title.toLowerCase().includes(activeReelsPlayback.sound.title.toLowerCase().split(' ')[0])) || mockSounds[0];
                  setActiveSoundDetail(s);
                  setActiveReelsPlayback(null);
                }} className="flex items-center gap-2 mt-3 cursor-pointer hover:text-cyan-300 transition-colors">
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  <div className="overflow-hidden w-48 text-[9px] font-mono whitespace-nowrap text-cyan-300">
                    <span className="inline-block animate-marquee uppercase tracking-wider">
                      🎵 Original Sound Track - {activeReelsPlayback.sound.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* VERTICAL SLIDING CONTROLS ON RIGHT */}
              <div className="absolute right-4 bottom-24 md:bottom-28 md:top-1/2 md:-translate-y-1/2 flex flex-col items-center gap-5 z-20">
                
                {/* Sparks Indicator (Like Toggle with immediate UI increment feedback) */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => {
                      const id = activeReelsPlayback.id;
                      const isLiked = likedReelsList.includes(id);
                      if (isLiked) {
                        setLikedReelsList(prev => prev.filter(x => x !== id));
                        activeReelsPlayback.likes -= 1;
                      } else {
                        setLikedReelsList(prev => [...prev, id]);
                        activeReelsPlayback.likes += 1;
                        // Trigger heart burst
                        handleAddLiveHeart();
                      }
                    }}
                    className={`flex flex-col items-center gap-1 border backdrop-blur-md cursor-pointer p-2.5 rounded-full hover:scale-105 active:scale-95 transition-all text-center h-10 w-10 justify-center ${
                      likedReelsList.includes(activeReelsPlayback.id) 
                        ? 'bg-pink-500/80 text-pink-200 border-pink-400' 
                        : 'bg-black/60 text-yellow-400 border-white/10 hover:text-yellow-300'
                    }`}
                    title="Cast Spark ⚡"
                  >
                    <Zap className={`w-4 h-4 ${likedReelsList.includes(activeReelsPlayback.id) ? 'fill-current animate-bounce' : 'animate-pulse'}`} />
                  </button>
                  <span className="text-[9px] font-mono text-white/80 mt-1 font-bold block">{activeReelsPlayback.likes}</span>
                </div>

                {/* Comments icon */}
                <div className="flex flex-col items-center">
                  <button
                    className="flex flex-col items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 text-cyan-400 hover:text-cyan-300 cursor-pointer p-2.5 rounded-full hover:scale-105 active:scale-95 transition-all text-center h-10 w-10 justify-center"
                    title="Reels Comment replies Thread"
                  >
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                  </button>
                  <span className="text-[9px] font-mono text-white/80 mt-1 font-bold block">{activeReelsPlayback.comments.length}</span>
                </div>

                {/* Direct Share with Partners */}
                <div className="flex flex-col items-center">
                  <button
                    onClick={() => setShowShareVideoSheet(true)}
                    className="flex flex-col items-center gap-1 bg-black/60 backdrop-blur-md border border-white/10 text-pink-400 hover:text-pink-300 cursor-pointer p-2.5 rounded-full hover:scale-105 active:scale-95 transition-all text-center h-10 w-10 justify-center"
                    title="Send via Direct Messages securely"
                  >
                    <Share2 className="w-4 h-4 text-pink-400" />
                  </button>
                  <span className="text-[9px] font-mono text-white/80 mt-1 font-semibold block">Share</span>
                </div>

                {/* Reels Swipe Navigation controllers */}
                <div className="flex flex-col gap-2 mt-2">
                  <button
                    onClick={() => {
                      const prevIdx = (reelsIndex - 1 + mockReels.length) % mockReels.length;
                      setReelsIndex(prevIdx);
                      setActiveReelsPlayback(mockReels[prevIdx]);
                    }}
                    className="bg-black/60 hover:bg-black/80 text-violet-400 border border-white/10 h-8 w-8 rounded-full flex items-center justify-center cursor-pointer active:scale-95 hover:scale-105"
                    title="Swipe Previous Video loop"
                  >
                    ↑
                  </button>

                  <button
                    onClick={() => {
                      const nextIdx = (reelsIndex + 1) % mockReels.length;
                      setReelsIndex(nextIdx);
                      setActiveReelsPlayback(mockReels[nextIdx]);
                    }}
                    className="bg-violet-600 text-white h-9 w-9 hover:bg-violet-500 rounded-full font-mono text-xs font-black shadow-lg flex items-center justify-center cursor-pointer border border-violet-400/20 active:scale-95 hover:scale-105 animate-bounce"
                    title="Swipe Next Video loop"
                  >
                    ↓
                  </button>
                </div>
              </div>

              {/* REALTIME VIDEO PROGRESS BAR AT PORT BOTTOM */}
              <div className="absolute bottom-0 inset-x-0 h-1 bg-white/10 z-15">
                <div className="h-full bg-linear-to-r from-violet-500 via-pink-500 to-cyan-405 transition-all duration-100" style={{ width: `${videoProgress}%` }} />
              </div>

            </div>

            {/* RIGHT SIDE: COMMENTS COLLAPSIBLE DRAWER ON DESKTOP */}
            <div className="w-full md:w-80 bg-[#09071b] border-t md:border-t-0 md:border-l border-violet-500/15 flex flex-col h-[280px] md:h-full relative overflow-hidden shrink-0">
              <div className="p-4 border-b border-violet-500/10 flex items-center justify-between shrink-0">
                <div>
                  <span className="text-[9px] font-mono uppercase text-[#8B5CF6]">Threaded conversation topic</span>
                  <h3 className="text-xs font-black text-white font-sans mt-0.5 uppercase tracking-wide">
                    Video Thread Responses ({activeReelsPlayback.comments.length})
                  </h3>
                </div>
                <Users className="w-3.5 h-3.5 text-cyan-400" />
              </div>

              {/* Chat replies scrolling */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text">
                {activeReelsPlayback.comments.map((comment: any) => (
                  <div key={comment.id || Math.random()} className="flex gap-2.5 text-left">
                    <img src={`https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80`} className="w-7 h-7 rounded-lg object-cover shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-white">@{comment.user}</span>
                        <span className="text-[8px] font-mono text-violet-400">online</span>
                      </div>
                      <p className="text-[11px] text-violet-100 font-sans mt-0.5 leading-relaxed bg-[#0b0923] p-2 rounded-xl border border-violet-500/5">
                        {comment.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Writing comment replies bar */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!videoCommentInput.trim()) return;
                  activeReelsPlayback.comments.push({ id: Math.random().toString(), user: 'voh', text: videoCommentInput });
                  setVideoCommentInput('');
                }}
                className="p-3 border-t border-violet-500/10 bg-black/40 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  placeholder="Post public reply..."
                  value={videoCommentInput}
                  onChange={(e) => setVideoCommentInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-purple-950/20 border border-purple-500/10 rounded-xl font-sans text-xs text-white placeholder-purple-300/30 focus:outline-hidden"
                />
                <button type="submit" className="px-3.5 py-2 bg-[#8B5CF6] text-white font-mono text-[10px] font-bold rounded-lg uppercase">
                  REPLY
                </button>
              </form>
            </div>

            {/* Direct Share Dialog popup */}
            <AnimatePresence>
              {showShareVideoSheet && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <div className="w-full max-w-sm bg-[#09071a] border border-violet-500/20 rounded-2xl p-5 text-left space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-violet-500/10">
                      <h4 className="text-xs font-black uppercase text-[#8B5CF6] font-sans">Send via Direct chat</h4>
                      <X className="w-4 h-4 text-white hover:text-red-400 cursor-pointer" onClick={() => setShowShareVideoSheet(false)} />
                    </div>

                    <div className="space-y-2">
                      {creators.slice(0, 4).map((cr) => (
                        <div key={cr.id} className="p-2.5 rounded-xl bg-white/[0.01] hover:bg-violet-950/20 border border-white/5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <img src={cr.avatar} className="w-7 h-7 rounded-lg object-cover" />
                            <div>
                              <span className="text-xs font-bold text-white block leading-none">{cr.name}</span>
                              <span className="text-[9px] font-mono text-violet-400 block mt-0.5">@{cr.username}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setShowShareVideoSheet(false);
                              window.dispatchEvent(new CustomEvent('toast', { 
                                detail: `Sent video link successfully to @${cr.username} inside secure chat channel! 🚀` 
                              }));
                            }}
                            className="bg-violet-600 hover:bg-violet-700 text-white font-mono text-[9px] font-extrabold px-3 py-1.5 rounded-lg uppercase cursor-pointer"
                          >
                            SEND LINK
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================= */}
      {/* 📡 8. LIVE STREAMING STUDIO (IMMERSED VISUAL OVERLAYS) */}
      {/* ======================================================= */}
      <AnimatePresence>
        {(activeWatchLive || isGoingLiveOwn) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#04020a] z-50 flex flex-col md:flex-row overflow-hidden"
          >
            {/* Live Camera Feed Panel Area */}
            <div className="flex-1 bg-black relative flex items-center justify-center border-b md:border-b-0 md:border-r border-violet-500/10">
              
              {/* Green / Violet scanlines mesh */}
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(110,68,255,0.08),transparent_80%)] pointer-events-none z-10" />
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] pointer-events-none opacity-30 z-10" />

              {/* Loop mock feed background */}
              <div className="absolute inset-0 z-0 select-none opacity-40">
                <img src="https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200" className="w-full h-full object-cover blur-sm" />
              </div>

              {/* Live Streaming split screen if guest invited */}
              <div className="relative w-full h-full max-w-5xl p-6 flex flex-col justify-between z-10">
                
                {/* Upper banner section */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-red-600 text-white font-mono text-[9px] font-black py-1 px-3 rounded-md uppercase tracking-wider animate-pulse shadow-md shadow-red-600/30">
                      LIVE 🔴
                    </span>
                    <span className="bg-black/60 border border-white/5 text-white/90 text-[10px] font-mono font-bold py-1 px-3 rounded-md uppercase tracking-wide flex items-center gap-1.5 backdrop-blur-md">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      <span>{liveViewersCount} Looking</span>
                    </span>
                    <span className="bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 text-[10px] font-mono py-1 px-2.5 rounded-md flex items-center gap-1">
                      ⚡ <span>{liveAccumulatedSparks} Sparks tip</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isGoingLiveOwn && (
                      <button
                        onClick={() => setIsLiveGuestInvited(!isLiveGuestInvited)}
                        className={`px-3 py-1.5 rounded-xl border font-mono text-[10px] font-extrabold cursor-pointer transition-all ${
                          isLiveGuestInvited 
                            ? 'bg-emerald-600 border-emerald-400 text-white' 
                            : 'bg-black/50 border-white/10 text-cyan-400 hover:text-white'
                        }`}
                      >
                        👥 {isLiveGuestInvited ? 'Split-Screen Co-host: Active' : 'Invite Alex as Co-Host'}
                      </button>
                    )}

                    <button 
                      onClick={() => setIsLiveStreamMuted(!isLiveStreamMuted)}
                      className="p-2 bg-black/60 hover:bg-black/80 rounded-xl text-white border border-white/5 cursor-pointer backdrop-blur-md"
                    >
                      {isLiveStreamMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    </button>
                  </div>
                </div>

                {/* Simulated video graphic: split screen cohosting or single speaker */}
                <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-5 mt-6 w-full max-h-[60vh]">
                  
                  {/* Participant 1 */}
                  <div className="flex-1 w-full bg-linear-to-b from-violet-950/20 to-[#0e0c24]/90 border border-violet-500/20 rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-2xl relative h-full max-h-[450px]">
                    <img 
                      src={isGoingLiveOwn ? '/src/assets/images/voh_logo_avatar_1781774114050.jpg' : activeWatchLive.avatar} 
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-violet-500/40 animate-pulse mb-3" 
                    />
                    <h3 className="text-sm font-black text-white font-sans flex items-center gap-1 leading-none">
                      {isGoingLiveOwn ? 'VOICE OF HARRISON' : activeWatchLive.name}
                      <Check className="w-3.5 h-3.5 text-[#8B5CF6] fill-current" />
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-400 mt-1">
                      @{isGoingLiveOwn ? 'voh' : activeWatchLive.username}
                    </span>
                    <span className="text-[8.5px] font-mono border border-emerald-500/30 text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-full mt-2 uppercase">
                      🎤 Primary Speaker
                    </span>
                  </div>

                  {/* Participant 2 (INVITED GUEST SCREEN) */}
                  {isLiveGuestInvited && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex-1 w-full bg-linear-to-b from-[#1c0628]/20 to-[#12001a]/95 border border-pink-500/25 rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-2xl relative h-full max-h-[450px]"
                    >
                      <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150" className="w-16 h-16 rounded-2xl object-cover ring-2 ring-pink-500/40 mb-3" />
                      <h3 className="text-sm font-black text-white font-sans flex items-center gap-1 leading-none">
                        Alex Sterling
                      </h3>
                      <span className="text-[10px] font-mono text-pink-400 mt-1">@alex_sterling</span>
                      <span className="text-[8.5px] font-mono border border-pink-500/30 text-pink-400 bg-pink-500/5 px-2 py-0.5 rounded-full mt-2 uppercase">
                        👥 Co-Host Guest Active
                      </span>
                    </motion.div>
                  )}

                </div>

                {/* Footer Controls Area */}
                <div className="mt-6 flex justify-between items-center bg-black/60 border border-white/5 p-3.5 rounded-2xl backdrop-blur-md">
                  <div className="text-left space-y-0.5">
                    <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest block font-extrabold">Active Streaming Cluster</span>
                    <span className="text-xs font-sans font-black text-white">
                      {isGoingLiveOwn ? 'My Direct Streaming Room' : activeWatchLive.topic}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleAddLiveHeart}
                      className="p-3 rounded-full bg-linear-to-tr from-pink-600 via-pink-400 to-yellow-400 text-white shadow-lg active:scale-95 transition-all cursor-pointer"
                      title="Tip Spark ⚡"
                    >
                      <Zap className="w-5 h-5 text-white animate-bounce" />
                    </button>

                    <button
                      onClick={() => {
                        if (isGoingLiveOwn) {
                          setLiveStreamStatus('ended');
                        } else {
                          setActiveWatchLive(null);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-sans text-xs font-black transition-colors cursor-pointer"
                    >
                      {isGoingLiveOwn ? 'Stop Broadcast' : 'Exit Streaming Node'}
                    </button>
                  </div>
                </div>

              </div>

              {/* RISING EMOJI HEART SHOWER ANIMS */}
              <div className="absolute inset-y-0 right-10 w-24 overflow-hidden pointer-events-none z-30">
                {liveHearts.map((heart) => (
                  <motion.div
                    key={heart.id}
                    initial={{ y: '100vh', opacity: 1, scale: heart.scale }}
                    animate={{ y: '-20vh', opacity: 0 }}
                    transition={{ duration: 2, ease: 'easeOut' }}
                    className="absolute"
                    style={{ left: `${heart.left}%`, color: heart.color }}
                  >
                    <Heart className="w-6 h-6 fill-current drop-shadow-[0_0_10px_currentColor]" />
                  </motion.div>
                ))}
              </div>

            </div>

            {/* Right scrolling Chat Feed Panel Area on Live */}
            <div className="w-full md:w-80 bg-[#070512] flex flex-col h-[320px] md:h-full shrink-0">
              <div className="p-4 border-b border-violet-500/10 flex items-center justify-between shrink-0">
                <div className="text-left">
                  <span className="text-[9px] font-mono uppercase text-pink-400">Platform Synchronous chat</span>
                  <h3 className="text-xs font-black text-white font-sans mt-0.5">
                    Live Chat Stream
                  </h3>
                </div>
                <Radio className="w-4 h-4 text-pink-500 animate-pulse" />
              </div>

              {/* Comments stream items */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-left select-text">
                {liveComments.map((log) => (
                  <div key={log.id} className="flex gap-2.5">
                    <img src={log.avatar} className="w-7 h-7 rounded-lg object-cover shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-white block">@{log.user}</span>
                      <p className="text-[11px] text-violet-200/80 leading-snug mt-0.5 max-w-[210px] break-words">
                        {log.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Write input inside live chats */}
              <div className="p-3 border-t border-violet-500/10 bg-black/40 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Say something to watchers..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      if (!input.value.trim()) return;
                      setLiveComments(prev => [
                        ...prev,
                        { id: Math.random().toString(), user: 'voh', text: input.value, avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg' }
                      ]);
                      input.value = '';
                    }
                  }}
                  className="flex-1 px-3 py-2 bg-purple-950/20 border border-purple-500/10 rounded-xl font-sans text-xs text-white placeholder-purple-300/30 focus:outline-hidden"
                />
                <button 
                  onClick={handleAddLiveHeart}
                  className="p-1 px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white font-mono text-[10px] font-bold rounded-lg uppercase cursor-pointer"
                >
                  ❤️
                </button>
              </div>
            </div>

            {/* END LIVE KPI STATS MODAL OVERLAY */}
            <AnimatePresence>
              {liveStreamStatus === 'ended' && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-md bg-[#09071a] border border-violet-500/20 rounded-3xl p-6 text-center space-y-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-pink-500 via-pink-400 to-yellow-400" />
                    
                    <div className="space-y-1">
                      <span className="text-2xl mt-2 select-none">🏆</span>
                      <h3 className="text-base font-black text-white font-sans uppercase tracking-wider">
                        Live Stream Broadcast Completed!
                      </h3>
                      <p className="text-[10px] text-violet-300/40 font-mono uppercase tracking-widest">
                        Room Node Session Analytics
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-0.5">
                        <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest">Broadcasting time</span>
                        <p className="text-lg font-black text-white font-sans">01:42:08</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-0.5">
                        <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest">Accumulated Sparks</span>
                        <p className="text-lg font-black text-yellow-400 font-sans">⚡ +1,582</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-0.5">
                        <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest">Peak Spectators</span>
                        <p className="text-lg font-black text-cyan-400 font-sans">2,410</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 space-y-0.5">
                        <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest">New Follow Alignments</span>
                        <p className="text-lg font-black text-emerald-400 font-sans">+94 Followers</p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsGoingLiveOwn(false);
                        setLiveStreamStatus('idle');
                      }}
                      className="w-full py-2.5 rounded-xl bg-linear-to-r from-violet-600 to-pink-500 text-white font-sans text-xs font-black shadow-lg hover:brightness-110 active:scale-98 transition-all cursor-pointer"
                    >
                      EXIT STUDIO
                    </button>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================= */}
      {/* 🔮 9. SOUND DETAILS SPOTLIGHTS HUD POPUP */}
      {/* ======================================================= */}
      <AnimatePresence>
        {activeSoundDetail && (
          <div className="fixed inset-0 bg-[#06040f]/90 backdrop-blur-md z-50 flex items-center justify-center p-4 select-text">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-[#09071b] border border-violet-500/20 rounded-3xl p-5 relative overflow-hidden flex flex-col justify-between max-h-[85vh] text-left"
            >
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-500 via-pink-400 to-cyan-400" />
              
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/10 shrink-0">
                    <img src={activeSoundDetail.url} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                    <Music className="w-7 h-7 text-white relative z-10 animate-bounce" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white font-sans tracking-tight">{activeSoundDetail.title}</h3>
                    <span className="text-[10px] font-mono text-violet-400 block mt-0.5">Creator: {activeSoundDetail.artist}</span>
                    <span className="text-[9px] font-mono text-cyan-400 block mt-1"> Used inside {activeSoundDetail.uses} broadcast videos</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveSoundDetail(null)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-violet-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sound Action details */}
              <div className="mt-5 grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => toggleSaveSound(activeSoundDetail.id)}
                  className={`py-2 text-[10px] font-mono tracking-wider font-extrabold rounded-lg uppercase transition-all cursor-pointer text-center ${
                    savedSounds.includes(activeSoundDetail.id) 
                      ? 'bg-emerald-600 text-white' 
                      : 'border border-violet-500/30 text-violet-300 hover:bg-violet-500/5'
                  }`}
                >
                  {savedSounds.includes(activeSoundDetail.id) ? 'Saved' : 'Save Track to library'}
                </button>

                <button
                  onClick={() => {
                    setActiveSoundDetail(null);
                    setActiveReelsPlayback(mockReels[0]);
                  }}
                  className="py-2 bg-violet-600 hover:bg-violet-700 text-white font-mono text-[10px] font-bold rounded-lg uppercase cursor-pointer text-center"
                >
                  Use Sound in video
                </button>
              </div>

              {/* Sound feeds grid */}
              <div className="mt-5 space-y-2.5">
                <span className="text-[8.5px] font-mono uppercase text-violet-400/65 font-bold block">Videos using this soundtrack</span>
                <div className="grid grid-cols-3 gap-2">
                  {mockReels.slice(0, 3).map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => {
                        setActiveReelsPlayback(item);
                        setActiveSoundDetail(null);
                      }}
                      className="relative rounded-xl overflow-hidden aspect-video cursor-pointer border border-white/5 bg-black"
                    >
                      <video src={item.videoUrl} className="w-full h-full object-cover opacity-60" muted playsInline />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="w-4 h-4 text-white hover:scale-110 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
