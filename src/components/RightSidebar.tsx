import React from 'react';
import { Flame, TrendingUp, Users, ArrowUpRight, Radio, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from '../types';
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
  onViewProfile
}: RightSidebarProps) {
  return (
    <aside id="nexora-right-panel" className="flex h-full flex-col gap-5 overflow-y-auto py-6 pl-4 pr-5 custom-scrollbar">
      <div className="nx-pulse-card relative overflow-hidden rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-500/18 via-[#111c3b] to-cyan-400/8 p-5 shadow-[0_18px_40px_rgba(1,4,13,0.24)]">
        <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative">
          <div className="mb-4 flex items-center justify-between"><span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-200"><Sparkles className="h-3.5 w-3.5" /> Nexora pulse</span><ArrowUpRight className="h-4 w-4 text-violet-200/70" /></div>
          <p className="max-w-[220px] text-sm font-semibold leading-relaxed text-white">The best conversations are waiting for your perspective.</p>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-300/75">Follow the people and ideas that make your world feel bigger.</p>
        </div>
      </div>

      <section className="space-y-3" aria-labelledby="trending-heading">
        <div className="flex items-center justify-between px-1"><div className="flex items-center gap-2"><Flame className="h-4 w-4 text-fuchsia-300" /><h2 id="trending-heading" className="text-sm font-bold text-white">Trending now</h2></div><button onClick={() => setSelectedTag(null)} className="text-[10px] font-semibold text-violet-300 hover:text-white">See all</button></div>
        <div className="nx-discovery-card rounded-3xl p-3">
          {selectedTag && <button onClick={() => setSelectedTag(null)} className="mb-2 w-full rounded-xl border border-violet-400/20 bg-violet-500/10 py-2 text-[10px] font-semibold text-violet-200">Clear #{selectedTag}</button>}
          {trendingTags.length === 0 ? <p className="p-3 text-center text-xs leading-relaxed text-slate-500">No trends yet. Start a conversation with a hashtag.</p> : trendingTags.map(({ tag, count }, index) => {
            const active = selectedTag === tag;
            return (
              <button key={tag} onClick={() => setSelectedTag(active ? null : tag)} className={`group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-all ${active ? 'bg-violet-500/15 ring-1 ring-violet-400/25' : 'hover:bg-white/[0.04]'}`}>
                <span className={`flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-bold ${index === 0 ? 'bg-fuchsia-500/20 text-fuchsia-200' : 'bg-white/[0.06] text-slate-400'}`}>{String(index + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-slate-100">#{tag}</span><span className="mt-0.5 block text-[10px] text-slate-500">{count.toLocaleString()} conversations</span></span>
                <TrendingUp className="h-3.5 w-3.5 text-slate-500 transition-colors group-hover:text-violet-300" />
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="people-heading">
        <div className="flex items-center justify-between px-1"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-sky-300" /><h2 id="people-heading" className="text-sm font-bold text-white">People to follow</h2></div><span className="text-[10px] text-slate-500">Curated for you</span></div>
        <div className="nx-discovery-card rounded-3xl p-3">
          {creators.length === 0 ? <p className="p-3 text-center text-xs text-slate-500">No new creators yet.</p> : creators.slice(0, 4).map(creator => {
            if (!creator) return null;
            const following = followingIds.includes(creator.id);
            return (
              <div key={creator.id} className="flex items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-white/[0.04]">
                <img src={creator.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} alt={creator.name} referrerPolicy="no-referrer" onClick={() => onViewProfile?.(creator.id)} className="h-10 w-10 shrink-0 cursor-pointer rounded-2xl object-cover ring-2 ring-violet-400/20" />
                <div className="min-w-0 flex-1"><p onClick={() => onViewProfile?.(creator.id)} className="flex cursor-pointer items-center gap-1 truncate text-xs font-bold text-white hover:text-violet-200"><span className="truncate">{creator.name}</span>{(creator.username === 'voh' || creator.isVerified) && <PurpleVerifiedBadge className="h-3.5 w-3.5 shrink-0" />}</p><p className="mt-0.5 truncate text-[10px] text-slate-500">@{creator.username}</p></div>
                <motion.button whileTap={{ scale: 0.92 }} onClick={() => onToggleFollow(creator.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-[9px] font-bold transition-all ${following ? 'border border-white/10 bg-white/[0.06] text-slate-400' : 'bg-violet-500 text-white shadow-[0_6px_16px_rgba(139,92,246,0.28)] hover:bg-violet-400'}`}><AnimatePresence mode="wait"><motion.span key={following ? 'following' : 'follow'} initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 3 }}>{following ? 'Following' : 'Follow'}</motion.span></AnimatePresence></motion.button>
              </div>
            );
          })}
          <button className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-2xl border border-white/10 py-2.5 text-[10px] font-semibold text-violet-200 transition-colors hover:bg-violet-500/10"><Radio className="h-3.5 w-3.5" /> Explore more creators</button>
        </div>
      </section>

      <div className="mt-auto px-1 pb-2 text-[10px] leading-relaxed text-slate-600">Nexora is a living network for meaningful connections. Be curious, be kind.</div>
    </aside>
  );
}
