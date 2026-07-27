import React, { useState, useEffect, useMemo } from 'react';
import { Search, Flame, Radio, Music, ArrowRight, Play, X, UserPlus, Check, Trash2, Clock, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Post } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';

interface ExploreViewProps {
  creators: User[];
  posts: Post[];
  setSelectedTag: (tag: string | null) => void;
  setActiveTab: (tab: any) => void;
  onLikePost: (postId: string) => void;
  onToggleFollow?: (creatorId: string) => void;
  followingIds: string[];
  onViewProfile?: (userIdOrUsername: string) => void;
}

export default function ExploreView({
  creators,
  posts,
  setSelectedTag,
  setActiveTab,
  onLikePost,
  onToggleFollow,
  followingIds,
  onViewProfile
}: ExploreViewProps) {
  const [localSearch, setLocalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFilterType, setSearchFilterType] = useState<'all' | 'users' | 'posts' | 'videos' | 'communities'>('all');
  const [showAllPulse, setShowAllPulse] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('nexora_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Debounce search input for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearch);
    }, 150);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Save search to recent searches when submitted or selected
  const addRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const trimmed = term.trim();
    setRecentSearches(prev => {
      const updated = [trimmed, ...prev.filter(item => item !== trimmed)].slice(0, 8);
      try {
        localStorage.setItem('nexora_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== term);
      try {
        localStorage.setItem('nexora_recent_searches', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('nexora_recent_searches');
    } catch {}
  };

  // Compute trending hashtags from real posts
  const trendingTags = useMemo(() => {
    const tagCounts: { [tag: string]: number } = {};
    posts.forEach(p => {
      (p.tags || []).forEach(t => {
        const clean = t.startsWith('#') ? t : `#${t}`;
        tagCounts[clean] = (tagCounts[clean] || 0) + 1;
      });
    });
    const sorted = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length === 0) {
      return [];
    }
    return sorted.slice(0, 6).map(([tag]) => tag);
  }, [posts]);

  // Filtered lists for search
  const filteredPosts = useMemo(() => {
    if (!debouncedSearch.trim()) return posts;
    const q = debouncedSearch.toLowerCase();
    return posts.filter(p => 
      p.content.toLowerCase().includes(q) || 
      p.username.toLowerCase().includes(q) || 
      p.name.toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }, [posts, debouncedSearch]);

  const filteredCreators = useMemo(() => {
    if (!debouncedSearch.trim()) return creators;
    const q = debouncedSearch.toLowerCase();
    return creators.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.username.toLowerCase().includes(q) ||
      (c.bio || '').toLowerCase().includes(q)
    );
  }, [creators, debouncedSearch]);

  const filteredVideos = useMemo(() => {
    if (!debouncedSearch.trim()) return posts.filter(p => p.videoUrl);
    const q = debouncedSearch.toLowerCase();
    return posts.filter(p => p.videoUrl && (p.content.toLowerCase().includes(q) || p.username.toLowerCase().includes(q) || (p.tags || []).some(t => t.toLowerCase().includes(q))));
  }, [posts, debouncedSearch]);

  const userCommunities = useMemo(() => {
    try {
      const saved = localStorage.getItem('nexora_custom_communities');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, []);

  const filteredCommunities = useMemo(() => {
    if (!debouncedSearch.trim()) return userCommunities;
    const q = debouncedSearch.toLowerCase();
    return userCommunities.filter((c: any) => (c.name || '').toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q));
  }, [debouncedSearch, userCommunities]);

  const hasActiveSearch = debouncedSearch.trim().length > 0;
  const totalResultsCount = filteredCreators.length + filteredPosts.length + filteredVideos.length;

  return (
    <div id="explore-view-master-panel" className="space-y-6 pb-12 max-w-4xl mx-auto px-4 sm:px-6">
      
      {/* Search Header & Input */}
      <div className="sticky top-0 z-30 bg-[#070512]/95 backdrop-blur-md pb-4 pt-3 border-b border-white/5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
            <input
              type="text"
              placeholder="Search users, posts, videos, hashtags..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && localSearch.trim()) {
                  addRecentSearch(localSearch.trim());
                }
              }}
              className="w-full pl-11 pr-10 py-3 bg-[#0d0924] border border-white/10 focus:border-violet-500 focus:outline-hidden rounded-2xl text-xs text-white placeholder-zinc-500 transition-all font-sans shadow-inner"
            />
            {localSearch && (
              <button 
                onClick={() => setLocalSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: 'All Results' },
            { id: 'users', label: 'Users' },
            { id: 'posts', label: 'Posts' },
            { id: 'videos', label: 'Videos' },
            { id: 'communities', label: 'Communities' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setSearchFilterType(f.id as any)}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all shrink-0 cursor-pointer ${
                searchFilterType === f.id
                  ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-white/10'
                  : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Searches (shown when search is empty) */}
      {!hasActiveSearch && recentSearches.length > 0 && (
        <div className="space-y-2.5 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono tracking-widest text-violet-400 font-bold uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Recent Searches
            </span>
            <button 
              onClick={clearAllRecentSearches}
              className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <button
                key={term}
                onClick={() => {
                  setLocalSearch(term);
                  addRecentSearch(term);
                }}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-300 transition-all cursor-pointer"
              >
                <span>{term}</span>
                <span 
                  onClick={(e) => removeRecentSearch(term, e)}
                  className="text-zinc-500 hover:text-pink-400 p-0.5"
                >
                  <X className="w-3 h-3" />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH RESULTS VIEW */}
      {hasActiveSearch ? (
        <div className="space-y-6 text-left">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-mono text-violet-400 uppercase tracking-widest font-extrabold">
              Found {totalResultsCount} results for "{debouncedSearch}"
            </h2>
            <button
              onClick={() => { setLocalSearch(''); setSearchFilterType('all'); }}
              className="text-[11px] font-mono text-pink-400 hover:text-pink-300 font-bold uppercase cursor-pointer"
            >
              Clear Search ✖
            </button>
          </div>

          {totalResultsCount === 0 ? (
            <div className="p-12 rounded-3xl bg-[#0b081c] border border-white/10 text-center space-y-3 my-8">
              <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-white/10 flex items-center justify-center mx-auto text-violet-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No users or posts found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans">
                We couldn't find anything matching "{debouncedSearch}". Try checking your spelling or searching for a different keyword or hashtag.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Users Section */}
              {(searchFilterType === 'all' || searchFilterType === 'users') && filteredCreators.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-mono text-violet-400 uppercase tracking-wider font-bold">Users ({filteredCreators.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredCreators.map(user => (
                      <div 
                        key={user.id} 
                        onClick={() => {
                          addRecentSearch(user.username);
                          onViewProfile?.(user.id);
                        }}
                        className="p-4 rounded-2xl bg-[#0b081c] border border-white/10 hover:border-white/10 flex items-center justify-between gap-3 cursor-pointer transition-all group shadow-sm"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-violet-500/30 group-hover:scale-105 transition-transform" />
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                              {user.isVerified && <PurpleVerifiedBadge />}
                            </div>
                            <span className="text-[10px] font-mono text-violet-400 truncate block">@{user.username}</span>
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">{user.bio || 'Nexora Creator'}</p>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFollow?.(user.id);
                          }}
                          className={`px-4 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 ${
                            followingIds.includes(user.id)
                              ? 'bg-white/10 text-zinc-300 hover:bg-white/20'
                              : 'bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                          }`}
                        >
                          {followingIds.includes(user.id) ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Section */}
              {(searchFilterType === 'all' || searchFilterType === 'posts') && filteredPosts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-mono text-violet-400 uppercase tracking-wider font-bold">Posts & Discussions ({filteredPosts.length})</h3>
                  <div className="space-y-3">
                    {filteredPosts.map(post => (
                      <div key={post.id} className="p-4 rounded-2xl bg-[#0b081c] border border-white/10 space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onViewProfile?.(post.userId || post.username)}>
                            <img src={post.avatar} alt={post.username} className="w-8 h-8 rounded-lg object-cover" />
                            <div>
                              <div className="flex items-center gap-1">
                                <h4 className="text-xs font-bold text-white">{post.name}</h4>
                                {post.isVerified && <PurpleVerifiedBadge />}
                              </div>
                              <span className="text-[9px] font-mono text-zinc-400">@{post.username}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-violet-400 bg-violet-600/10 px-2 py-0.5 rounded-full border border-white/10">Post</span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed font-sans">{post.content}</p>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {post.tags.map(t => (
                              <button 
                                key={t} 
                                onClick={() => {
                                  setSelectedTag(t);
                                  setActiveTab('feed');
                                }}
                                className="text-[10px] font-mono text-violet-300 bg-violet-950/40 border border-white/10 px-2 py-0.5 rounded-lg hover:bg-violet-900/40 transition-colors"
                              >
                                #{t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos Section */}
              {(searchFilterType === 'all' || searchFilterType === 'videos') && filteredVideos.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-mono text-violet-400 uppercase tracking-wider font-bold">Videos ({filteredVideos.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredVideos.map(video => (
                      <div key={video.id} className="p-3.5 rounded-2xl bg-[#0b081c] border border-white/10 space-y-2 flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="relative w-12 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                            {video.videoUrl ? (
                              <video src={video.videoUrl} className="w-full h-full object-cover" muted />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">🎥</div>
                            )}
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Play className="w-4 h-4 text-white fill-white drop-shadow" />
                            </div>
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-white truncate">{video.content || 'Untitled Video'}</h4>
                            <span className="text-[10px] font-mono text-violet-400 truncate block">@{video.username}</span>
                            <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">{video.likes || 42} sparks</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedTag(null);
                            setActiveTab('feed');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-mono font-bold uppercase transition-all shrink-0 cursor-pointer shadow-md"
                        >
                          Watch
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Communities Section */}
              {(searchFilterType === 'all' || searchFilterType === 'communities') && filteredCommunities.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">Communities ({filteredCommunities.length})</h3>
                  <div className="space-y-2">
                    {filteredCommunities.map(circle => (
                      <div key={circle.id} className="p-3.5 bg-[#0b081c] border border-cyan-500/20 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold shrink-0">
                            🏟️
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-white truncate">{circle.name}</h4>
                            <p className="text-[10px] text-zinc-400 truncate">{circle.description}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setActiveTab('communities');
                            window.dispatchEvent(new CustomEvent('toast', { detail: `Joined ${circle.name}! 🏟️` }));
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-300 hover:text-white text-[10px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0"
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      ) : (
        /* DEFAULT DISCOVERY LANDING */
        <div className="space-y-6">

          {/* Nexora Pulse: Trending Topics & Communities */}
          <div className="bg-[#0b081c] border border-white/10 rounded-3xl p-5 space-y-4 shadow-sm text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-mono font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <Flame className="w-4 h-4 text-pink-500" /> Nexora Pulse (Trending)
              </h3>
              <button 
                onClick={() => setShowAllPulse(!showAllPulse)} 
                className="text-[11px] font-mono font-bold text-violet-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showAllPulse ? 'Show less' : 'View more'} →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">🔥 Trending Hashtags</span>
                {trendingTags.slice(0, showAllPulse ? 6 : 4).map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      const clean = tag.startsWith('#') ? tag.slice(1) : tag;
                      setLocalSearch(clean);
                      addRecentSearch(tag);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-violet-600/15 border border-white/5 text-xs text-zinc-200 font-medium transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-mono text-violet-300">{tag}</span>
                    <span className="text-[10px] font-mono text-zinc-500">Trending</span>
                  </button>
                ))}
              </div>
              {userCommunities.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase block">🌐 Featured Communities</span>
                  {userCommunities.slice(0, showAllPulse ? 4 : 3).map((comm: any) => (
                    <button
                      key={comm.id}
                      onClick={() => {
                        setLocalSearch(comm.name);
                        setSearchFilterType('communities');
                      }}
                      className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-cyan-600/15 border border-white/5 text-xs text-zinc-200 font-medium transition-all flex items-center justify-between cursor-pointer"
                    >
                      <span className="truncate">{comm.name}</span>
                      <span className="text-[10px] font-mono text-cyan-400">{comm.membersCount || 1} members</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Suggested Accounts (Real Creators from DB) */}
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-mono font-black text-violet-400 uppercase tracking-widest">Suggested Creators</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {creators.map(user => (
                <div
                  key={user.id}
                  onClick={() => onViewProfile?.(user.id)}
                  className="w-[150px] shrink-0 p-4 bg-[#0b081c] border border-white/10 hover:border-white/10 rounded-2xl flex flex-col items-center text-center gap-2.5 cursor-pointer transition-all group shadow-sm"
                >
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-violet-500/30 group-hover:scale-105 transition-all" />
                  <div className="w-full overflow-hidden">
                    <div className="flex items-center justify-center gap-1">
                      <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                      {user.isVerified && <PurpleVerifiedBadge />}
                    </div>
                    <span className="text-[9px] font-mono text-violet-400 truncate block">@{user.username}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFollow?.(user.id);
                    }}
                    className={`w-full py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      followingIds.includes(user.id)
                        ? 'bg-white/10 text-zinc-300 hover:bg-white/20'
                        : 'bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                    }`}
                  >
                    {followingIds.includes(user.id) ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Active Live Streams */}
          <div className="bg-[#0b081c] border border-white/10 rounded-3xl p-5 space-y-3 text-left shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-ping" /> Live Streams
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-white/5 border border-rose-500/20 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative shrink-0">
                    <img src="/src/assets/images/voh_logo_avatar_1781774114050.jpg" alt="VOH" className="w-11 h-11 rounded-xl object-cover ring-2 ring-rose-500/40" />
                    <span className="absolute -bottom-1 -right-1 bg-rose-500 text-white text-[8px] font-mono px-1 rounded-full font-bold">LIVE</span>
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-white truncate">VOICE OF HARRISON</h4>
                    <p className="text-[10px] text-zinc-400 truncate">Quantum Networking & Zero Latency Systems</p>
                    <span className="text-[9px] font-mono text-rose-400 font-bold block mt-0.5">👁️ 1,284 watching</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('toast', { detail: 'Opening Live stream broadcast...' }));
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 shadow-lg shadow-rose-600/20"
                >
                  Watch
                </button>
              </div>
            </div>
          </div>

          {/* Trending Audio & Sounds */}
          <div className="bg-[#0b081c] border border-white/10 rounded-3xl p-5 space-y-3 text-left shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" /> Trending Sounds
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 's-1', title: 'Midnight Vapor Drift', artist: '@nexora_ai', uses: '14.2K' },
                { id: 's-2', title: 'Zero Latency Pulse', artist: '@voh', uses: '9.8K' }
              ].map(sound => (
                <div key={sound.id} className="p-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold shrink-0">
                      🎵
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-white truncate">{sound.title}</h4>
                      <p className="text-[10px] text-zinc-400 truncate">{sound.uses} videos →</p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('toast', { detail: `Playing sound: ${sound.title} 🎵` }))}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
