import React, { useState, useMemo } from 'react';
import { Flame, TrendingUp, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Post } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';

interface RightSidebarProps {
  creators: User[];
  followingIds: string[];
  onToggleFollow: (creatorId: string) => void;
  trendingTags: { tag: string; count: number }[];
  selectedTag: string | null;
  setSelectedTag: (tag: string | null) => void;
  systemSpeed: string;
  onViewProfile?: (userId: string) => void;
  currentUserUsername?: string;
}

export default function RightSidebar({
  creators,
  followingIds,
  onToggleFollow,
  trendingTags,
  selectedTag,
  setSelectedTag,
  systemSpeed,
  onViewProfile,
  currentUserUsername
}: RightSidebarProps) {
  return (
    <div id="nexora-right-panel" className="flex flex-col h-full py-6 pl-4 border-l border-current/10 space-y-8 select-none">
      
      {/* Premium Spacious Brand Message */}
      <div className="p-5 rounded-2xl bg-violet-600/5 border border-violet-500/10 text-center relative overflow-hidden">
        <p className="text-[11px] font-sans font-medium text-purple-200/85 relative z-10 leading-relaxed">
          ⚡ Shape what’s happening by exploring high-affinity creators and trending conversations.
        </p>
      </div>

      {/* Trending Topics Module */}
      <div id="trending-topics-widget" className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Flame className="w-4 h-4 text-pink-500" />
          <h2 className="text-xs font-mono font-black tracking-widest uppercase text-current/75">
            Trending Sparks
          </h2>
        </div>

        <div className="p-3 bg-current/3 border border-current/5 rounded-2xl space-y-1">
          {selectedTag && (
            <button
              onClick={() => setSelectedTag(null)}
              className="w-full text-center py-1 text-xs font-mono text-violet-400 bg-violet-400/10 rounded-lg hover:bg-violet-400/20 transition-all mb-2 border border-violet-400/20"
            >
              Clear filter: #{selectedTag}
            </button>
          )}

          {trendingTags.length === 0 ? (
            <p className="text-[11px] font-sans text-current/50 p-2 text-center leading-relaxed">
              No trending sparks yet. Post with #hashtags to start a trend!
            </p>
          ) : (
            trendingTags.map(({ tag, count }) => {
              const isSelected = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(isSelected ? null : tag)}
                  className={`flex items-center justify-between w-full p-2.5 rounded-xl text-left transition-all ${
                    isSelected 
                      ? 'bg-violet-500/20 border border-violet-500/30 text-violet-400' 
                      : 'hover:bg-current/5 text-current/80 hover:text-current'
                  }`}
                >
                  <div className="overflow-hidden pr-3">
                    <p className="text-xs font-bold font-sans truncate">
                      #{tag}
                    </p>
                    <p className="text-[10px] font-sans text-current/50 leading-none mt-0.5">
                      {count} posts
                    </p>
                  </div>
                  <TrendingUp className="w-3.5 h-3.5 text-current/40 group-hover:text-current shrink-0" />
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Recommended Creators to Follow */}
      <div id="creators-to-follow-widget" className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Users className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-black tracking-widest uppercase text-current/75">
            Peer Discovery
          </h2>
        </div>

        <div className="p-3 bg-current/3 border border-current/5 rounded-2xl space-y-3">
          {creators.length === 0 ? (
            <p className="text-[11px] font-sans text-current/50 p-2 text-center leading-relaxed">
              No other creators registered yet.
            </p>
          ) : (
            creators.map((creator) => {
              if (!creator) return null;
              const isFollowing = followingIds.includes(creator.id);
            return (
              <div key={creator.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img 
                    src={creator.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} 
                    alt={creator.name} 
                    referrerPolicy="no-referrer"
                    onClick={() => onViewProfile?.(creator.id)}
                    className="w-9 h-9 rounded-lg object-cover cursor-pointer hover:opacity-85 transition-opacity" 
                  />
                  <div className="overflow-hidden">
                    <p 
                      onClick={() => onViewProfile?.(creator.id)}
                      className="text-xs font-bold leading-tight text-current hover:text-violet-400 cursor-pointer transition-colors truncate flex items-center gap-1"
                    >
                      <span>{creator.name}</span>
                      {(creator.username === 'voh' || creator.isVerified) && <PurpleVerifiedBadge className="w-3.5 h-3.5" />}
                    </p>
                    <p 
                      onClick={() => onViewProfile?.(creator.id)}
                      className="text-[10px] font-mono text-current/50 cursor-pointer hover:text-violet-400 transition-colors leading-tight truncate flex items-center gap-1"
                    >
                      <span>@{creator.username}</span>
                      {(creator.username === 'voh' || creator.isVerified) && <PurpleVerifiedBadge className="w-2.5 h-2.5" />}
                    </p>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onToggleFollow(creator.id)}
                  className={`text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-lg border transition-all duration-300 overflow-hidden relative ${
                    isFollowing
                      ? 'bg-current/10 border-current/20 text-current/60 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-400/30'
                      : 'bg-violet-600 border-transparent text-white hover:brightness-110 shadow-md shadow-violet-500/20'
                  }`}
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={isFollowing ? 'following' : 'follow'}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      transition={{ duration: 0.15 }}
                      className="block"
                    >
                      {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </div>
            );
          })
          )}
        </div>
      </div>

    </div>
  );
}
