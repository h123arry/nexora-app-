import React, { useState, useMemo } from 'react';
import { Flame, TrendingUp, Users, Radio } from 'lucide-react';
import { User, Post } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import { generateTestUsers } from '../data/generatedUsers';

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
  const allGeneratedNodes = useMemo(() => generateTestUsers(), []);
  const [seedIndex, setSeedIndex] = useState(0);

  const sampleUsers = useMemo(() => {
    const list: User[] = [];
    for (let j = 0; j < 3; j++) {
      const idx = (seedIndex + j * 97) % allGeneratedNodes.length;
      list.push(allGeneratedNodes[idx]);
    }
    return list;
  }, [seedIndex, allGeneratedNodes]);

  const shuffleSamples = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSeedIndex(prev => (prev + 3) % allGeneratedNodes.length);
  };

  return (
    <div id="nexora-right-panel" className="flex flex-col h-full py-6 pl-4 border-l border-current/10 space-y-8 select-none">
      
      {/* Premium Spacious Brand Message */}
      <div className="p-5 rounded-2xl bg-violet-600/5 border border-violet-500/10 text-center relative overflow-hidden">
        <p className="text-[11px] font-sans font-medium text-purple-200/85 relative z-10 leading-relaxed">
          ⚡ Shape what’s happening by exploring high-affinity creators and trending conversations.
        </p>
      </div>

      {/* 1,000 Verified Test Accounts Directory Widget */}
      {currentUserUsername === 'voh' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Radio className="w-4 h-4 text-violet-400 animate-pulse" />
            <h2 className="text-xs font-mono font-black tracking-widest uppercase text-current/75">
              User Directory (1,000 Live)
            </h2>
          </div>

          <div className="p-4 bg-violet-500/5 border border-[#8B5CF6]/15 rounded-2xl space-y-3 text-left">
            <p className="text-[10.5px] font-sans text-purple-200/95 leading-relaxed">
              We have set up <strong>1,000 active test profiles</strong> that follow your founder page. You can check their pages, see their follower counts grow when you follow them, and test how everything works!
            </p>

            <p className="text-[9.5px] font-mono text-[#8B5CF6]/90 leading-relaxed pt-2.5 border-t border-[#8B5CF6]/10">
              🔎 <strong>Search Tip:</strong> Type names like <em>Sarah</em>, <em>Chioma</em>, <em>David</em>, <em>Yuki</em>, <em>Elena</em> or <em>Kofi</em> in the search box above to find them!
            </p>

            <div className="space-y-2 pt-2.5 border-t border-[#8B5CF6]/10">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono text-violet-400 uppercase font-black">Active Member Directory</span>
                <button 
                  onClick={shuffleSamples}
                  className="text-[9px] font-mono text-violet-300 hover:text-white hover:underline transition-all uppercase cursor-pointer"
                >
                  🔄 Mix Profiles
                </button>
              </div>

              <div className="space-y-1.5">
                {sampleUsers.map(u => (
                  <div 
                    key={u.id}
                    onClick={() => onViewProfile?.(u.id)}
                    className="p-1 px-2 py-1.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-[#8B5CF6]/30 hover:bg-[#8B5CF6]/5 transition-all text-xs flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-2 overflow-hidden max-w-[80%]">
                      <img src={u.avatar} alt={u.name} className="w-5 h-5 rounded-md object-cover" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-current truncate leading-none">{u.name}</p>
                        <p className="text-[8px] font-mono text-[#8B5CF6] truncate leading-none mt-1">@{u.username}</p>
                      </div>
                    </div>
                    <span className="text-[8px] font-mono text-cyan-400 group-hover:underline">VIEW &rarr;</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

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

          {trendingTags.map(({ tag, count }) => {
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
          })}
        </div>
      </div>

      {/* Recommended Creative Nodes to Follow */}
      <div id="creators-to-follow-widget" className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Users className="w-4 h-4 text-cyan-400" />
          <h2 className="text-xs font-mono font-black tracking-widest uppercase text-current/75">
            Peer Discovery
          </h2>
        </div>

        <div className="p-3 bg-current/3 border border-current/5 rounded-2xl space-y-3">
          {creators.map((creator) => {
            const isFollowing = followingIds.includes(creator.id);
            return (
              <div key={creator.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <img 
                    src={creator.avatar} 
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

                <button
                  onClick={() => onToggleFollow(creator.id)}
                  className={`text-[10px] font-mono font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                    isFollowing
                      ? 'bg-current/10 border-current/20 text-current/60 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-400/30'
                      : 'bg-violet-600 border-transparent text-white hover:brightness-110'
                  }`}
                >
                  {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
