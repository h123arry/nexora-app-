import React, { useState, useEffect, useMemo, useRef } from 'react';
import NexoraVideo from './NexoraVideo';
import { Compass, Search, TrendingUp, Radio, Award, Zap, Users, Sparkles, Film, Music, Gamepad2, Cpu, Briefcase, Trophy, BookOpen, Flame, Volume2, VolumeX, X, Heart, MessageSquare, Clock, Check, UserPlus, Plus, ArrowRight, Play, Pause, Video, Grid, Folder, RefreshCw, Globe, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Post, Circle } from '../types';
import { INITIAL_CIRCLES } from '../data/database';
import { TERMINOLOGY } from '../services/voh';
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
  const [searchFilterType, setSearchFilterType] = useState<'all' | 'users' | 'posts' | 'videos' | 'communities'>('all');
  const [showAllPulse, setShowAllPulse] = useState(false);

  // Simulated Live Streaming States
  const [activeWatchLive, setActiveWatchLive] = useState<any | null>(null);
  const [isGoingLiveOwn, setIsGoingLiveOwn] = useState(false);
  const [liveStreamStatus, setLiveStreamStatus] = useState<'idle' | 'streaming' | 'ended'>('idle');
  const [liveViewersCount, setLiveViewersCount] = useState(1284);
  const [liveComments, setLiveComments] = useState<Array<{ id: string; user: string; text: string; avatar: string }>>([]);
  const [liveHearts, setLiveHearts] = useState<Array<{ id: number; left: number; color: string; scale: number }>>([]);
  const [liveAccumulatedSparks, setLiveAccumulatedSparks] = useState(140);

  // Static Audio Loops Library Data
  const mockSounds = [
    { id: 's-1', title: 'Midnight Vapor Drift', artist: '@nexora_ai', uses: '14.2K' },
    { id: 's-2', title: 'Zero Latency Pulse', artist: '@voh', uses: '9.8K' }
  ];

  // Filtered lists for search and discovery
  const filteredPosts = useMemo(() => {
    if (!localSearch.trim()) return posts;
    const q = localSearch.toLowerCase();
    return posts.filter(p => p.content.toLowerCase().includes(q) || p.username.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)));
  }, [posts, localSearch]);

  const filteredCreators = useMemo(() => {
    if (!localSearch.trim()) return creators;
    const q = localSearch.toLowerCase();
    return creators.filter(c => c.name.toLowerCase().includes(q) || c.username.toLowerCase().includes(q));
  }, [creators, localSearch]);

  return (
    <div id="explore-view-master-panel" className="space-y-6 pb-12">
      
      {/* 🚀 1. TOP AREA PRIORITY: Search Bar Always Visible at Top */}
      <div className="sticky top-0 z-30 bg-[#070512]/95 backdrop-blur-md pb-4 pt-2 border-b border-white/5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
            <input
              type="text"
              placeholder="Search creators, topics, communities, posts..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#0d0924] border border-violet-500/20 focus:border-violet-500 focus:outline-hidden rounded-2xl text-xs text-white placeholder-zinc-500 transition-all font-sans shadow-inner"
            />
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'all', label: 'All' },
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
                  ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)] border border-violet-500/30'
                  : 'bg-white/5 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* When Searching, show filtered results */}
      {localSearch.trim().length > 0 || searchFilterType !== 'all' ? (
        <div className="space-y-6 text-left px-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono text-violet-400 uppercase tracking-widest font-extrabold">
              Search Results ({filteredCreators.length} users, {filteredPosts.length} posts)
            </h2>
            <button
              onClick={() => { setLocalSearch(''); setSearchFilterType('all'); }}
              className="text-[11px] font-mono text-pink-400 hover:text-pink-300 font-bold uppercase cursor-pointer"
            >
              Clear Search ✖
            </button>
          </div>

          {/* Creators Result */}
          {filteredCreators.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Users</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredCreators.map(user => (
                  <div key={user.id} className="p-4 rounded-2xl bg-[#0b081c] border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => onViewProfile?.(user.id)}>
                      <img src={user.avatar} className="w-11 h-11 rounded-xl object-cover ring-2 ring-violet-500/30" />
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1">
                          <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                          {user.isVerified && <PurpleVerifiedBadge />}
                        </div>
                        <span className="text-[10px] font-mono text-violet-400 truncate block">@{user.username}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleFollow?.(user.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
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

          {/* Posts Result */}
          {filteredPosts.length > 0 && (
            <div className="space-y-3">
              <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">Posts</span>
              <div className="space-y-3">
                {filteredPosts.map(post => (
                  <div key={post.id} className="p-4 rounded-2xl bg-[#0b081c] border border-white/10 space-y-2">
                    <div className="flex items-center gap-2.5">
                      <img src={post.avatar} className="w-8 h-8 rounded-lg object-cover" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{post.name}</h4>
                        <span className="text-[9px] font-mono text-zinc-400">@{post.username}</span>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-200 leading-relaxed">{post.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Default Discovery / Intelligence Layout */
        <div className="space-y-6 px-1">

          {/* 3. NEXORA PULSE (Combined Topics & Communities with Progressive Disclosure) */}
          <div className="bg-[#0b081c] border border-white/10 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-mono font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <Flame className="w-4 h-4 text-pink-500" /> Nexora Pulse
              </h3>
              <button 
                onClick={() => setShowAllPulse(!showAllPulse)} 
                className="text-[11px] font-mono font-bold text-violet-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showAllPulse ? 'Show less' : 'View more'} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">🔥 Topics</span>
                {['#BuildInPublic', 'AI Music', 'Sports', 'Quantum Computing'].slice(0, showAllPulse ? 4 : 3).map(topic => (
                  <button
                    key={topic}
                    onClick={() => setLocalSearch(topic.startsWith('#') ? topic.slice(1) : topic)}
                    className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-violet-600/15 border border-white/5 text-xs text-zinc-200 font-medium transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>{topic}</span>
                    <span className="text-[10px] font-mono text-violet-400">Trending</span>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">🌐 Communities</span>
                {['Lagos Tech Hub', 'Creator Guilds', 'Metaverse Architects'].slice(0, showAllPulse ? 3 : 2).map(comm => (
                  <button
                    key={comm}
                    onClick={() => { setLocalSearch(comm); setSearchFilterType('communities'); }}
                    className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-cyan-600/15 border border-white/5 text-xs text-zinc-200 font-medium transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span>{comm}</span>
                    <span className="text-[10px] font-mono text-cyan-400">Active</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4. SUGGESTED CREATORS (Compact Discovery Carousel) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-black text-violet-400 uppercase tracking-widest">Suggested for you</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {creators.map(user => (
                <div
                  key={user.id}
                  onClick={() => onViewProfile?.(user.id)}
                  className="w-[140px] shrink-0 p-3.5 bg-[#0b081c] border border-white/10 hover:border-violet-500/30 rounded-2xl flex flex-col items-center text-center gap-2.5 cursor-pointer transition-all group"
                >
                  <img src={user.avatar} className="w-12 h-12 rounded-xl object-cover ring-2 ring-violet-500/30 group-hover:scale-105 transition-all" />
                  <div className="w-full overflow-hidden">
                    <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                    <span className="text-[9px] font-mono text-zinc-400 truncate block">@{user.username}</span>
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

          {/* 5. COMMUNITIES (Compact Rows, max 3 items, then "See all communities") */}
          <div className="bg-[#0b081c] border border-white/10 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">Communities you may like</h3>
              <button onClick={() => setActiveTab('communities')} className="text-[11px] font-mono font-bold text-cyan-300 hover:text-white cursor-pointer transition-colors">
                See all communities →
              </button>
            </div>
            <div className="space-y-2">
              {INITIAL_CIRCLES.slice(0, 3).map(circle => (
                <div key={circle.id} className="p-3 bg-white/5 hover:bg-white/8 border border-white/5 rounded-2xl flex items-center justify-between gap-3 transition-all">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-500/20 flex items-center justify-center text-cyan-300 font-bold shrink-0">
                      🏟️
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-white truncate">{circle.name}</h4>
                      <p className="text-[10px] text-zinc-400 truncate">{circle.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[10px] font-mono text-zinc-400">{circle.membersCount || '14.8K'}</span>
                    <button
                      onClick={() => {
                        setActiveTab('communities');
                        window.dispatchEvent(new CustomEvent('toast', { detail: `Joined ${circle.name}! 🏟️` }));
                      }}
                      className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600 border border-cyan-500/30 text-cyan-300 hover:text-white text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                    >
                      Join
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 6. LIVE STREAMS (Reduced card height, creator, title, viewers, watch button) */}
          <div className="bg-[#0b081c] border border-white/10 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-black text-rose-400 uppercase tracking-widest flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-rose-500 animate-ping" /> Live Streams
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-white/5 border border-rose-500/20 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="relative shrink-0">
                    <img src="/src/assets/images/voh_logo_avatar_1781774114050.jpg" className="w-11 h-11 rounded-xl object-cover ring-2 ring-rose-500/40" />
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

          {/* 7. TRENDING SOUNDS (Compact horizontal cards) */}
          <div className="bg-[#0b081c] border border-white/10 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <Music className="w-4 h-4 text-amber-400" /> Trending Sounds
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {mockSounds.map(sound => (
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
