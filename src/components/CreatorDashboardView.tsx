import React, { useState } from 'react';
import { 
  ArrowLeft, 
  Sliders, 
  TrendingUp, 
  Award, 
  Users, 
  FileText, 
  Award as Crown, 
  Share2, 
  Heart, 
  MessageSquare, 
  Bookmark, 
  Eye, 
  ArrowUpRight,
  TrendingDown,
  Sparkles,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { User, Post } from '../types';

interface CreatorDashboardViewProps {
  currentUser: User;
  posts: Post[];
  onClose: () => void;
  onUpdateProfile: (updatedData: Partial<User>) => void;
  activeTabOverride?: 'overview' | 'content' | 'earnings' | 'insights';
}

export default function CreatorDashboardView({
  currentUser,
  posts,
  onClose,
  onUpdateProfile,
  activeTabOverride = 'overview'
}: CreatorDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'earnings' | 'insights'>(activeTabOverride);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // Determine if this is a newly registered user with zero analytics
  const isNewUser = currentUser.reputationPoints === 0 && currentUser.followers === 0 && (currentUser.nexBalance === undefined || currentUser.nexBalance === 0);

  // Filter posts to only those published by the current user
  const myPosts = posts.filter(p => p.username === currentUser.username);

  // Aggregate statistics dynamically
  const totalSparks = isNewUser ? 0 : myPosts.reduce((acc, p) => acc + (p.likes || 0), 0) + (currentUser.username === 'voh' ? 45000 : 0);
  const totalComments = isNewUser ? 0 : myPosts.reduce((acc, p) => acc + (p.commentsCount || 0), 0) + (currentUser.username === 'voh' ? 12300 : 0);
  const totalShares = isNewUser ? 0 : myPosts.reduce((acc, p) => acc + (p.shares || 0), 0) + (currentUser.username === 'voh' ? 3200 : 0);
  
  // Custom estimated stats for high-fidelity existing seed creators, strictly 0 for new users
  const totalViews = isNewUser ? 0 : myPosts.length * 820 + (currentUser.username === 'voh' ? 245000 : 0);
  const totalSaves = isNewUser ? 0 : Math.floor(totalSparks * 0.15) + (currentUser.username === 'voh' ? 1850 : 0);
  const profileVisits = isNewUser ? 0 : Math.floor(totalViews * 0.22) + (currentUser.username === 'voh' ? 62000 : 0);
  const followersGained7d = isNewUser ? 0 : (currentUser.username === 'voh' ? 1420 : 0);
  const followersGained30d = isNewUser ? 0 : (currentUser.username === 'voh' ? 6890 : 0);
  
  const engagementRate = totalViews > 0 
    ? (((totalSparks + totalComments + totalShares + totalSaves) / totalViews) * 100).toFixed(1) + '%' 
    : '0%';

  // NEX Currency stats
  const nexBalance = currentUser.nexBalance ?? (currentUser.username === 'voh' ? 24500 : 0);
  const pendingNex = isNewUser ? 0 : (currentUser.username === 'voh' ? 1850 : 0);
  const earningsThisWeek = isNewUser ? 0 : (currentUser.username === 'voh' ? 620 : 0);
  const earningsThisMonth = isNewUser ? 0 : (currentUser.username === 'voh' ? 2840 : 0);

  // Helper to format numbers dynamically
  const formatVal = (val: number) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toString();
  };

  // NEX Reward estimation formula for a single post
  const getPostRewards = (post: Post) => {
    if (isNewUser) {
      return { views: 0, sparks: 0, comments: 0, shares: 0, saves: 0, rate: '0%', viewsReward: 0, engReward: 0, shareBonus: 0, commBonus: 0, total: 0 };
    }
    
    // Base estimated views on interactions
    const pViews = (post.likes * 12) + (post.commentsCount * 20) + (post.shares * 30) + 150;
    const pSaves = Math.floor(post.likes * 0.18);
    const interactions = post.likes + post.commentsCount + post.shares + pSaves;
    const pRate = pViews > 0 ? ((interactions / pViews) * 100).toFixed(1) + '%' : '0%';

    // Earnings breakdown (NEX rewards formula)
    const viewsReward = Math.floor(pViews * 0.05);
    const engReward = Math.floor(post.likes * 0.4 + post.commentsCount * 1.5 + pSaves * 1.2);
    const shareBonus = Math.floor(post.shares * 2.5);
    const commBonus = post.audience === 'community' ? 40 : 10;
    const totalReward = viewsReward + engReward + shareBonus + commBonus;

    return {
      views: pViews,
      sparks: post.likes,
      comments: post.commentsCount,
      shares: post.shares,
      saves: pSaves,
      rate: pRate,
      viewsReward,
      engReward,
      shareBonus,
      commBonus,
      total: totalReward
    };
  };

  return (
    <div id="voh-creator-dashboard-screen" className="bg-[#05030f] min-h-[#85vh] text-zinc-100 rounded-3xl border border-violet-500/15 overflow-hidden flex flex-col mt-4">
      
      {/* Top Header Section */}
      <div className="p-4 sm:p-6 bg-[#0c0822]/60 border-b border-violet-500/15 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-violet-950/40 rounded-xl transition-all border border-violet-500/10 text-violet-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-violet-400" />
              <h1 className="text-sm font-mono font-black uppercase tracking-wider text-white">Creator Dashboard</h1>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">
              Monitor your posts performance, growth trends, and earnings insights.
            </p>
          </div>
        </div>

        {/* Short info row on earnings multiplier */}
        <div className="flex items-center gap-2.5 bg-violet-950/25 border border-violet-500/15 px-3.5 py-1.5 rounded-2xl max-w-max self-start sm:self-center">
          <Crown className="w-4 h-4 text-yellow-400" />
          <div className="text-left">
            <span className="text-[9px] font-mono text-zinc-400 block leading-tight font-black uppercase">Earnings Potential</span>
            <span className="text-xs font-mono font-extrabold text-violet-300">
              {currentUser.reputationPoints > 100000 ? '2.5x Base (Elite Tier)' : currentUser.reputationPoints > 1000 ? '1.5x Base (Rising Tier)' : '1.0x Base (Standard)'}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Tabs Selector Navigation */}
      <div className="border-b border-violet-500/10 bg-black/20 px-4 py-1 flex overflow-x-auto scrollbar-none">
        <div className="flex gap-2 w-full">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'content', label: 'Content', icon: FileText },
            { id: 'earnings', label: 'Earnings', icon: Award },
            { id: 'insights', label: 'Insights', icon: Lightbulb }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedPostId(null);
              }}
              className={`py-3 px-3 sm:px-6 relative flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-widest text-[10px] font-mono font-extrabold transition-all border-b-2 ${
                activeTab === tab.id 
                  ? 'border-violet-500 text-white font-extrabold bg-violet-950/10' 
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-violet-400' : 'text-zinc-500'}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Area Content */}
      <div className="p-4 sm:p-6 flex-1 select-none">
        
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-violet-500/5 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-widest text-violet-300 font-extrabold">Engagement Overview</h2>
              <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md uppercase">7/30 days window</span>
            </div>

            {/* Overview Stats Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Total Views', value: formatVal(totalViews), desc: 'Video, audio & post impressions' },
                { label: 'Total Sparks', value: formatVal(totalSparks), desc: 'Sparks and likes received' },
                { label: 'Total Comments', value: formatVal(totalComments), desc: 'User contributions on posts' },
                { label: 'Total Shares', value: formatVal(totalShares), desc: 'Broadcast shares forward' },
                { label: 'Total Saves', value: formatVal(totalSaves), desc: 'Bookmarked to vaults' },
                { label: 'Profile Visits', value: formatVal(profileVisits), desc: 'Unique profile clicks' },
                { label: 'Engagement Rate', value: engagementRate, desc: 'Average interactions score' },
                { label: 'NEX Balance', value: `🟣 ${formatVal(nexBalance)}`, desc: 'Monetized platform tokens' }
              ].map((card, i) => (
                <div key={i} className="p-4 rounded-2xl bg-[#0b081e]/60 border border-violet-500/10 text-left hover:border-violet-500/20 transition-all flex flex-col justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-zinc-400/80 uppercase tracking-wider font-extrabold block">
                      {card.label}
                    </span>
                    <p className="text-lg sm:text-2xl font-mono font-black text-white mt-1.5 uppercase">
                      {card.value}
                    </p>
                  </div>
                  <p className="text-[9px] font-sans text-zinc-500 mt-2 leading-tight">
                    {card.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Growth Over Time Stats Block */}
            <div className="p-4 rounded-2xl bg-zinc-950/40 border border-violet-500/10 text-left">
              <h3 className="text-[10px] font-mono uppercase text-violet-300 font-bold tracking-widest mb-3">
                📈 Core Performance Growth
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">Followers Gained (7 Days)</span>
                    <span className="text-xl font-mono block font-black text-emerald-400 mt-1">
                      +{formatVal(followersGained7d)}
                    </span>
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase">Followers Gained (30 Days)</span>
                    <span className="text-xl font-mono block font-black text-emerald-400 mt-1">
                      +{formatVal(followersGained30d)}
                    </span>
                  </div>
                  <TrendingUp className="w-5 h-5 text-emerald-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTENT & POSTS ANALYTICS */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {!selectedPostId ? (
              <>
                <div className="flex items-center justify-between border-b border-violet-500/5 pb-3 text-left">
                  <div>
                    <h2 className="text-xs font-mono uppercase tracking-widest text-violet-300 font-extrabold">Author Posts list</h2>
                    <p className="text-[10px] text-zinc-400 mt-0.5">Select any post to inspect detail impressions and metrics.</p>
                  </div>
                  <span className="text-[10px] font-mono text-white bg-violet-600/10 border border-violet-500/15 px-3 py-1 rounded-full uppercase font-bold">
                    {myPosts.length} Posts
                  </span>
                </div>

                {myPosts.length === 0 ? (
                  <div className="py-12 text-center rounded-2xl bg-[#0b081e]/30 border border-dashed border-violet-500/10 space-y-3">
                    <p className="text-xs text-zinc-400">No posts written yet. Write a post to start monitoring content analytics!</p>
                  </div>
                ) : (
                  <div className="space-y-2 text-left">
                    {myPosts.map((post) => {
                      const rewards = getPostRewards(post);
                      return (
                        <div 
                          key={post.id}
                          onClick={() => setSelectedPostId(post.id)}
                          className="p-4 rounded-xl bg-[#090616] hover:bg-[#0f0a28] border border-violet-500/10 hover:border-violet-500/20 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1.5 max-w-xl">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded uppercase font-bold">
                                {post.audience || 'public'}
                              </span>
                              <span className="text-[9px] font-mono text-zinc-500">
                                {post.timestamp}
                              </span>
                            </div>
                            <p className="text-xs text-zinc-100 font-sans line-clamp-2 leading-relaxed">
                              {post.content}
                            </p>
                          </div>

                          {/* Horizontal mini stats preview */}
                          <div className="flex gap-4 sm:gap-6 mt-2 md:mt-0 text-[10px] font-mono text-zinc-400">
                            <div>
                              <span className="text-zinc-500 block uppercase text-[8px]">Views</span>
                              <span className="text-white font-extrabold text-[11px]">{formatVal(rewards.views)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block uppercase text-[8px]">Sparks</span>
                              <span className="text-amber-400 font-extrabold text-[11px]">{formatVal(rewards.sparks)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block uppercase text-[8px]">Shares</span>
                              <span className="text-white font-extrabold text-[11px]">{formatVal(rewards.shares)}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 block uppercase text-[8px]">Eng. Rate</span>
                              <span className="text-violet-400 font-extrabold text-[11px]">{rewards.rate}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 bg-violet-950/30 px-2 py-1 rounded text-violet-300">
                              <span className="text-[9px] block uppercase text-[8px]">Earnings</span>
                              <span className="font-extrabold text-[11px]">🟣 {rewards.total}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              /* DETAILED ANALYTICS OVERLAY VIEW FOR THE TAP POST */
              <div className="space-y-6 text-left">
                {(() => {
                  const currentPost = myPosts.find(p => p.id === selectedPostId);
                  if (!currentPost) return <p>Post not found.</p>;
                  const rewards = getPostRewards(currentPost);

                  return (
                    <>
                      <div className="flex items-center justify-between border-b border-violet-500/10 pb-3">
                        <button
                          onClick={() => setSelectedPostId(null)}
                          className="flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-white uppercase transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          Back to Posts List
                        </button>
                        <span className="text-[9px] font-mono text-zinc-400">Post Detailed Analytics</span>
                      </div>

                      {/* Detailed Post Card */}
                      <div className="p-4 rounded-2xl bg-[#090616] border border-violet-500/15 space-y-4">
                        <div className="flex items-center gap-2">
                          <img 
                            src={currentUser.avatar} 
                            alt="avatar" 
                            className="w-8 h-8 rounded-full border border-violet-500/15" 
                          />
                          <div>
                            <span className="text-xs font-bold block">{currentUser.name}</span>
                            <span className="text-[9px] text-zinc-400 font-mono block">@{currentUser.username} • {currentPost.timestamp}</span>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-100 leading-relaxed font-sans mt-2">
                          {currentPost.content}
                        </p>
                      </div>

                      {/* Detailed Analytics Indicators */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        {[
                          { label: 'Post Views', value: formatVal(rewards.views), sub: 'Overall impressions', icon: Eye, color: 'text-zinc-100' },
                          { label: 'Post Sparks', value: formatVal(rewards.sparks), sub: 'Reactions received', icon: Heart, color: 'text-pink-400' },
                          { label: 'Post Comments', value: formatVal(rewards.comments), sub: 'User discussions', icon: MessageSquare, color: 'text-cyan-400' },
                          { label: 'Post Shares', value: formatVal(rewards.shares), sub: 'Forward broadcasts', icon: Share2, color: 'text-violet-400' },
                          { label: 'Post Saves', value: formatVal(rewards.saves), sub: 'Private bookmarks', icon: Bookmark, color: 'text-amber-400' }
                        ].map((stat, i) => (
                          <div key={i} className="p-3 bg-[#0d0926]/40 border border-violet-500/10 rounded-xl">
                            <stat.icon className={`w-4 h-4 ${stat.color} mb-1`} />
                            <span className="text-[9px] text-zinc-500 block font-mono uppercase">{stat.label}</span>
                            <span className="text-lg font-mono font-black text-white mt-1 block">{stat.value}</span>
                            <span className="text-[8px] text-zinc-600 block mt-0.5 leading-none">{stat.sub}</span>
                          </div>
                        ))}
                      </div>

                      {/* Performance Insights block */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-zinc-950/40 rounded-2xl border border-violet-500/10">
                          <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-2 font-bold">Engagement statistics</h4>
                          <div className="space-y-2 Text-xs font-sans">
                            <div className="flex justify-between items-center text-zinc-400 border-b border-white/5 pb-1 text-[11px]">
                              <span>Engagement Ratio:</span>
                              <span className="font-mono text-white font-extrabold">{rewards.rate}</span>
                            </div>
                            <div className="flex justify-between items-center text-zinc-400 border-b border-white/5 pb-1 text-[11px]">
                              <span>Audience Targeting:</span>
                              <span className="font-mono text-white uppercase font-extrabold">{currentPost.audience || 'public'}</span>
                            </div>
                            <div className="flex justify-between items-center text-zinc-400 text-[11px]">
                              <span>Total Rewards Earned:</span>
                              <span className="font-mono text-violet-400 font-extrabold">🟣 {rewards.total} NEX Tokens</span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 bg-zinc-950/40 rounded-2xl border border-violet-500/10">
                          <h4 className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider mb-2 font-bold">NEX Reward Breakdown</h4>
                          <div className="space-y-2 text-[11px]">
                            <div className="flex justify-between text-zinc-400">
                              <span>Views rewards:</span>
                              <span className="font-mono text-white">🟣 {rewards.viewsReward} NEX</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>Interactions:</span>
                              <span className="font-mono text-white">🟣 {rewards.engReward} NEX</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>Share forward bonus:</span>
                              <span className="font-mono text-white">🟣 {rewards.shareBonus} NEX</span>
                            </div>
                            <div className="flex justify-between text-zinc-400">
                              <span>Target bonus:</span>
                              <span className="font-mono text-white">🟣 {rewards.commBonus} NEX</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: EARNINGS & WALLET (NEX SYSTEM) */}
        {activeTab === 'earnings' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-violet-500/5 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-widest text-violet-300 font-extrabold">Payments & Wallets</h2>
              <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md uppercase">100% Platform Safe</span>
            </div>

            {/* Wallet Dashboard block */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/50 via-slate-900/60 to-violet-950/40 border border-violet-500/20 text-left space-y-6">
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-[9px] font-mono text-purple-300 uppercase tracking-widest block font-extrabold">NEX WALLET BALANCE</span>
                  <div className="flex items-baseline gap-2 mt-1.5">
                    <span className="text-3xl sm:text-4xl font-mono font-black text-white">
                      🟣 {formatVal(nexBalance)}
                    </span>
                    <span className="text-xs font-mono text-purple-300/65 uppercase">NEX</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-tight">
                    NEX is Nexora's platform currency awarded dynamically to active authors based on community engagements.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => alert("Withdrawals are locked during the current preview period. Token transfers will activate in the next release.")}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-mono font-extrabold rounded-xl uppercase transition-colors cursor-pointer"
                  >
                    Withdraw Tokens
                  </button>
                  <button
                    onClick={() => alert("Rewards rules are fully governed by Nexora's user engagement. Ensure high consistency of posting and constructive comments.")}
                    className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-[10px] font-mono font-extrabold rounded-xl uppercase transition-colors cursor-pointer border border-zinc-800"
                  >
                    Earning Rules
                  </button>
                </div>
              </div>

              {/* Earnings Breakdown stats list */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-violet-500/10">
                <div>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Total Earned Tokens</span>
                  <span className="text-base font-mono text-white block mt-0.5">🟣 {formatVal(nexBalance + pendingNex)}</span>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Pending Transfer</span>
                  <span className="text-base font-mono text-pink-400 block mt-0.5">🟣 {formatVal(pendingNex)}</span>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Earned This Week</span>
                  <span className="text-base font-mono text-emerald-400 block mt-0.5">🟣 {formatVal(earningsThisWeek)}</span>
                </div>
                <div>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Earned This Month</span>
                  <span className="text-base font-mono text-cyan-400 block mt-0.5">🟣 {formatVal(earningsThisMonth)}</span>
                </div>
              </div>

              {/* Warning note explicitly requested */}
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-amber-500/10 text-[10px] text-amber-300/80 font-sans leading-relaxed flex items-start gap-2">
                <Crown className="w-4 h-4 text-amber-500 flex-shrink-0 animate-pulse mt-0.5" />
                <span>
                  <strong>Internal platform ledger:</strong> This balance represents simulated engagement rewards accrued in the current beta testing window. External cash-outs and cryptocurrency bridge modules are currently restricted.
                </span>
              </div>
            </div>

            {/* Individual Post Earnings Breakdown */}
            <div className="space-y-3 text-left">
              <h3 className="text-[10px] font-mono uppercase text-violet-300 font-bold tracking-widest pl-1">
                🪙 Earning Breakdown per post
              </h3>
              {myPosts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-[#0b081e]/40 border border-violet-500/10 text-xs text-zinc-500">
                  No post data available. Create your first post to begin earning NEX tokens!
                </div>
              ) : (
                <div className="space-y-2">
                  {myPosts.map((post) => {
                    const rewards = getPostRewards(post);
                    return (
                      <div key={post.id} className="p-4 bg-[#090616] border border-violet-500/5 rounded-xl flex items-center justify-between">
                        <div className="max-w-[70%]">
                          <p className="text-xs text-zinc-100 font-sans truncate">{post.content}</p>
                          <div className="flex gap-3 text-[9px] font-mono text-zinc-500 mt-1">
                            <span>Views Reward: 🟣 {rewards.viewsReward}</span>
                            <span>Engagement: 🟣 {rewards.engReward}</span>
                            <span>Bonus: 🟣 {rewards.shareBonus}</span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[11px] font-mono text-violet-400 font-extrabold block">🟣 {rewards.total} NEX</span>
                          <span className="text-[8px] text-zinc-600 font-mono block">accumulated</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: INSIGHTS & AI TRENDS */}
        {activeTab === 'insights' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-violet-500/5 pb-3">
              <h2 className="text-xs font-mono uppercase tracking-widest text-violet-300 font-extrabold">Performance Insights</h2>
              <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md uppercase">VOH AI Engine</span>
            </div>

            {isNewUser ? (
              /* No statistics insight card for zero content */
              <div className="p-6 text-center rounded-2xl bg-zinc-900/30 border border-dashed border-violet-500/10 text-xs text-zinc-400">
                You do not have enough published content yet to extract intelligent insights. Post your updates and engage with your communities to unlock performance recommendations.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                
                {/* Insights Suggestions List */}
                <div className="p-5 rounded-2xl bg-[#090616] border border-violet-500/15 space-y-4">
                  <h3 className="text-[10px] font-mono uppercase text-violet-300 font-extrabold tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Intelligent Suggestions</span>
                  </h3>

                  <div className="space-y-3">
                    {[
                      { text: 'Your video clips perform significantly better than image posts (+45% visibility index). Place priority on recording real-time clips.' },
                      { text: 'Posts published with detailed captions and community listings receive up to 3x higher direct spark momentum.' },
                      { text: 'Your primary audience spikes active engagement from 2:00 PM to 6:00 PM local time. Post in this window to optimize coverage.' },
                      { text: 'High reputation level triggers an active multiplier boost: you receive up to 2.5x more NEX views rewards.' }
                    ].map((sug, i) => (
                      <div key={i} className="p-3 bg-[#0d0926]/50 rounded-xl border border-violet-500/5 flex gap-2.5 items-start text-xs font-sans text-zinc-300 leading-normal">
                        <span className="text-violet-400 text-sm">💡</span>
                        <p>{sug.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Growth Trends stats visualizations */}
                <div className="p-5 rounded-2xl bg-[#090616] border border-violet-500/15 space-y-4">
                  <h3 className="text-[10px] font-mono uppercase text-violet-300 font-extrabold tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-violet-400" />
                    <span>Creative Trends Analyzer</span>
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    {[
                      { label: 'Growth Trend', value: '+12.4% this week', positive: true, icon: TrendingUp },
                      { label: 'Engagement Trend', value: '+4.8% on standard posts', positive: true, icon: TrendingUp },
                      { label: 'Direct Shares Ratio', value: '+18.5% community broadcasts', positive: true, icon: TrendingUp },
                      { label: 'Bounce Rate', value: '-2.1% lower exit count', positive: true, icon: TrendingDown }
                    ].map((trend, i) => (
                      <div key={i} className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between font-sans">
                        <div>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase block">{trend.label}</span>
                          <span className="text-xs font-bold text-white mt-0.5 block">{trend.value}</span>
                        </div>
                        <trend.icon className={`w-4 h-4 ${trend.positive ? 'text-emerald-500' : 'text-rose-400'}`} />
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
