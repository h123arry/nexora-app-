import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Search, Trash2, Play, Volume2, Briefcase, Filter, ExternalLink, Sparkles, FolderPlus, ArrowUpRight } from 'lucide-react';
import { Post, User } from '../types';
import RelativeTimestamp from './RelativeTimestamp';
import PurpleVerifiedBadge from './VohVerifiedBadge';

interface SavedViewProps {
  currentUser: User;
  posts: Post[];
  userBookmarks: string[];
  onBookmarkPost: (postId: string) => void;
  onViewProfile?: (userId: string) => void;
  onSharePost?: (postId: string) => void;
}

export default function SavedView({
  currentUser,
  posts,
  userBookmarks = [],
  onBookmarkPost,
  onViewProfile
}: SavedViewProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'posts' | 'videos' | 'voice' | 'opportunities'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter bookmarked posts from parent list
  const bookmarkedPosts = posts.filter(p => userBookmarks.includes(p.id));
  const displayPosts = bookmarkedPosts;

  const filteredItems = displayPosts.filter(post => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesContent = post.content.toLowerCase().includes(q);
      const matchesName = post.name.toLowerCase().includes(q);
      const matchesTag = post.tags?.some(t => t.toLowerCase().includes(q));
      if (!matchesContent && !matchesName && !matchesTag) return false;
    }

    // Category filter
    if (activeCategory === 'videos') return !!post.videoUrl;
    if (activeCategory === 'voice') return !!post.voiceAudioUrl;
    if (activeCategory === 'opportunities') return (post as any).opportunityType || post.tags?.includes('Opportunity');
    if (activeCategory === 'posts') return !post.videoUrl && !post.voiceAudioUrl;
    return true;
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-violet-950/40 via-purple-950/20 to-black border border-violet-500/20 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-sans font-black tracking-tight text-white flex items-center gap-2">
              Saved Collection
              <span className="text-xs font-mono font-bold text-violet-400 bg-violet-950/60 border border-violet-500/30 px-2.5 py-0.5 rounded-full">
                {displayPosts.length} Items
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Your personal library of bookmarked posts, videos, voice clips, and opportunities
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search saved items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl bg-black/50 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'all', label: 'All Items', icon: Bookmark },
          { id: 'posts', label: 'Posts', icon: Sparkles },
          { id: 'videos', label: 'Videos', icon: Play },
          { id: 'voice', label: 'Voice Posts', icon: Volume2 },
          { id: 'opportunities', label: 'Opportunities', icon: Briefcase }
        ].map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-sans font-bold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-violet-600/30 border-violet-500 text-violet-300 shadow-md shadow-violet-500/10'
                  : 'bg-white/5 border-white/5 hover:border-white/15 text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* List of saved items */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/5 border border-white/5 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-violet-500/20 text-violet-400 flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No saved items found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Bookmark interesting posts, videos, or opportunities in your feed to access them anytime here.
            </p>
          </div>
        ) : (
          filteredItems.map(post => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-3xl bg-[#0a0718]/80 border border-white/10 hover:border-violet-500/30 transition-all shadow-lg text-left relative group"
            >
              {/* Post author header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => onViewProfile && onViewProfile(post.userId)}>
                  <img
                    src={post.avatar}
                    alt={post.name}
                    className="w-9 h-9 rounded-xl object-cover ring-2 ring-violet-500/30"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white hover:text-violet-300 transition-colors">{post.name}</span>
                      {post.isVerified && <PurpleVerifiedBadge className="w-3.5 h-3.5" type="founder" />}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500">@{post.username} &bull; <RelativeTimestamp timestamp={post.timestamp} /></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onBookmarkPost(post.id)}
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </div>
              </div>

              {/* Content body */}
              <p className="text-xs text-zinc-200 leading-relaxed font-sans mb-3">{post.content}</p>

              {/* Video preview if present */}
              {post.videoUrl && (
                <div className="mb-3 rounded-2xl overflow-hidden bg-black/60 border border-white/10 aspect-video relative group">
                  <video
                    src={post.videoUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Voice clip if present */}
              {post.voiceAudioUrl && (
                <div className="mb-3 p-3 rounded-2xl bg-violet-950/30 border border-violet-500/20 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-600 text-white">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-mono text-violet-300 font-bold block uppercase">Voice Pulse Audio</span>
                    <audio src={post.voiceAudioUrl} controls className="w-full h-8 mt-1" />
                  </div>
                </div>
              )}

              {/* Tags footer */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                  {post.tags.map(t => (
                    <span key={t} className="text-[10px] font-mono text-violet-400 bg-violet-950/40 border border-violet-500/20 px-2 py-0.5 rounded-lg">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
