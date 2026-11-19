import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, BarChart2, Activity, CheckCircle, AlertTriangle, RefreshCw, Play, Sliders, Shield, Search, Zap, Award, Info, Users, Target, Check, X, ChevronRight, Cpu, Eye, Heart, MessageSquare, Bookmark, ThumbsDown, Trash2, ArrowUpRight, Ban, EyeOff, Forward } from 'lucide-react';
import { User, Post } from '../types';
import { getRecommendationProfile, saveRecommendationProfile, resetRecommendationProfile } from '../utils/recommendations';

interface NidaViewProps {
  currentUser: User;
  posts: Post[];
}

export default function NidaView({ currentUser, posts }: NidaViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'interest-dna' | 'pillars' | 'playbook'>('interest-dna');
  
  // Personal Your interests State
  const [interestDNA, setInterestDNA] = useState<Record<string, number>>(() => {
    const profile = getRecommendationProfile();
    return {
      Football: profile.tags['football'] ?? 0,
      Comedy: profile.tags['comedy'] ?? 0,
      AI: profile.tags['ai'] ?? 0,
      Gaming: profile.tags['gaming'] ?? 0,
      Fashion: profile.tags['fashion'] ?? 0,
      Cars: profile.tags['cars'] ?? 0,
      Music: profile.tags['music'] ?? 0,
      Food: profile.tags['food'] ?? 0,
      Education: profile.tags['education'] ?? 0,
      Travel: profile.tags['travel'] ?? 0,
    };
  });

  // Custom Algorithm Weights state
  const [pillarWeights, setPillarWeights] = useState({
    interest: 35,
    quality: 35,
    verification: 15,
    freshness: 15,
  });

  // Save Your interests helper
  const handleUpdateInterest = (interest: string, value: number) => {
    const updated = { ...interestDNA, [interest]: value };
    setInterestDNA(updated);
    
    // Save back to recommendation profile tags
    const profile = getRecommendationProfile();
    profile.tags[interest.toLowerCase()] = value;
    saveRecommendationProfile(profile);
  };

  const resetInterestDNA = () => {
    resetRecommendationProfile();
    setInterestDNA({
      Football: 0, Comedy: 0, AI: 0, Gaming: 0, Fashion: 0,
      Cars: 0, Music: 0, Food: 0, Education: 0, Travel: 0,
    });
    window.dispatchEvent(new CustomEvent('toast', { detail: 'Interest preferences cleared. NEXORA will learn from your future interactions.' }));
  };

  // Rank only real posts supplied by the live application data layer.
  const rankedPosts = posts.map(post => {
    const topic = post.tags?.[0]?.replace(/^#/, '') || 'General';
    const interestKey = topic.length ? topic.charAt(0).toUpperCase() + topic.slice(1).toLowerCase() : topic;
    const interestScore = interestDNA[topic] ?? interestDNA[interestKey] ?? 0;
    const engagementCount = (post.likes || 0) + (post.commentsCount || 0) * 2 + (post.shares || 0) * 3;
    const qualityScore = Math.min(100, Math.round(engagementCount / 5));
    const verificationScore = post.isVerified ? 100 : 50;
    const publishedAt = Date.parse(post.timestamp);
    const ageSeconds = Number.isFinite(publishedAt) ? Math.max(0, (Date.now() - publishedAt) / 1000) : Number.POSITIVE_INFINITY;
    const freshnessScore = Number.isFinite(ageSeconds) ? Math.max(0, Math.min(100, Math.round(100 - ageSeconds / 600))) : 0;
    const totalWeight = pillarWeights.interest + pillarWeights.quality + pillarWeights.verification + pillarWeights.freshness;
    const weightedScore =
      interestScore * pillarWeights.interest +
      qualityScore * pillarWeights.quality +
      verificationScore * pillarWeights.verification +
      freshnessScore * pillarWeights.freshness;
    const totalScore = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;
    return { ...post, topic, interestScore, qualityScore, verificationScore, freshnessScore, totalScore };
  }).sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div id="nida-discovery-view" className="space-y-6 text-zinc-100 pb-12">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-violet-950/40 via-[#0c0a2a]/60 to-cyan-950/40 border border-white/10 p-6 md:p-8 space-y-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-violet-500/15 border border-white/10 text-xs font-mono font-extrabold text-violet-300 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                Your feed
              </span>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono font-bold text-cyan-300">
                Your settings
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-sans tracking-tight bg-clip-text text-transparent bg-linear-to-r from-violet-300 via-pink-300 to-cyan-300">
              How your feed works
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl font-sans">
              Change your interests and see why some posts appear in this preview. This does not change your main feed.
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 bg-white/3 border border-white/5 p-3 rounded-2xl">
            <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">What this preview uses</p>
              <p className="text-xs font-mono font-black text-emerald-400 uppercase">Posts and your saved interests</p>
            </div>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 relative z-10">
          {[
                        { id: 'interest-dna', label: 'Evolving Your interests', icon: Sliders },
            { id: 'pillars', label: 'Feed Ranking', icon: Cpu },
            { id: 'playbook', label: 'Roadmap', icon: Shield },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveSubTab(tab.id as any);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-linear-to-r from-violet-600 to-pink-500 border-transparent text-white shadow-md shadow-violet-600/25'
                    : 'bg-zinc-900/60 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 2: EVOLVING INTEREST DNA */}
        {activeSubTab === 'interest-dna' && (
          <motion.div
            key="interest-dna"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-[#0b081e] border border-white/10 p-6 rounded-3xl space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
                <div className="space-y-1">
                  <h2 className="text-sm font-mono font-black text-pink-400 uppercase tracking-widest flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Your interests
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Your interests change as you watch and interact with posts. You can also choose the topics you want to see more often.
                  </p>
                </div>
                
                <button
                  onClick={resetInterestDNA}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-mono text-[10px] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset interests
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-8">
                {Object.entries(interestDNA).map(([interest, weight]) => (
                  <div key={interest} className="space-y-2 bg-[#120f32]/40 p-4 rounded-2xl border border-white/3">
                    <div className="flex justify-between items-center text-xs font-mono font-bold text-zinc-200">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-400" />
                        {interest}
                      </span>
                      <span className="text-pink-400">{weight}% interest</span>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weight}
                      onChange={(e) => handleUpdateInterest(interest, parseInt(e.target.value))}
                      className="w-full accent-violet-500 bg-zinc-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                    />

                    <div className="flex justify-between text-[9px] text-zinc-500 uppercase font-mono">
                      <span>Show less</span>
                      <span>Show more</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanatory Info Card */}
            <div className="bg-cyan-950/20 border border-cyan-500/20 p-5 rounded-3xl flex items-start gap-4">
              <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-black text-cyan-300 uppercase tracking-wider">How your feed works</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Your feed learns from what you watch and save. Watching videos, saving posts and skipping posts help NEXORA understand what you enjoy. You can change your interests whenever you like.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: FOUR PILLARS SANDBOX */}
        {activeSubTab === 'pillars' && (
          <motion.div
            key="pillars"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Weight sliders panel */}
            <div className="lg:col-span-5 space-y-6 bg-[#0b081e] border border-white/10 p-5 md:p-6 rounded-3xl">
              <div>
                <h2 className="text-sm font-mono font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" /> Feed preferences
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  These options show how posts in this preview are sorted. They don't change your main feed.
                </p>
              </div>

              <div className="space-y-5">
                {[
                  { key: 'interest', label: '1. Your interests', desc: 'Prioritizes content matched perfectly with the user\'s interest profile vectors.', color: 'accent-violet-500' },
                  { key: 'quality', label: '2. Post engagement', desc: 'Looks at views, comments, saves and shares.', color: 'accent-pink-500' },
                  { key: 'verification', label: '3. Verified accounts', desc: 'Shows whether the person who posted has a verified account.', color: 'accent-cyan-500' },
                  { key: 'freshness', label: '4. New and popular posts', desc: 'Includes new posts and posts people are enjoying.', color: 'accent-yellow-500' },
                ].map(pillar => {
                  const val = (pillarWeights as any)[pillar.key];
                  return (
                    <div key={pillar.key} className="space-y-2 bg-[#120f32]/40 p-4 rounded-2xl border border-white/3">
                      <div className="flex justify-between items-center text-xs font-mono font-bold text-zinc-200">
                        <span>{pillar.label}</span>
                        <span className="text-cyan-400">{val}% importance</span>
                      </div>
                      
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={val}
                        onChange={(e) => {
                          const newVal = parseInt(e.target.value);
                          const updated = { ...pillarWeights, [pillar.key]: newVal };
                          
                          // Normalize weights loosely or maintain direct state
                          setPillarWeights(updated);
                        }}
                        className={`w-full ${pillar.color} bg-zinc-800 rounded-lg appearance-none h-1.5 cursor-pointer`}
                      />
                      <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">{pillar.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Current real-post ranking */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#030113] border border-cyan-500/15 p-4 rounded-3xl flex justify-between items-center">
                <span className="text-xs font-mono font-black text-cyan-300 uppercase tracking-widest">
                  Posts in this preview
                </span>
                <span className="text-[9px] font-mono text-zinc-500 uppercase">
                  Based on posts already shared
                </span>
              </div>

              <div className="space-y-3">
                {rankedPosts.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-400">There are no posts in this preview yet. Posts will appear here when they're available.</div> : rankedPosts.map((post, idx) => (
                  <div 
                    key={post.id}
                    className="bg-zinc-950/40 border border-white/5 hover:border-white/10 p-4 rounded-2xl flex items-start gap-4 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-white/10 text-xs font-mono font-bold text-violet-400 flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-sans font-extrabold text-white leading-snug">{post.content}</h4>
                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            @{post.username} • Topic: <span className="text-pink-400 font-bold">{post.topic}</span> • Verified: {post.isVerified ? 'Yes' : 'No'}
                          </p>
                        </div>
                        
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-black text-cyan-300 bg-[#120f32] border border-cyan-500/20 px-2 py-1 rounded-xl block">
                            {post.totalScore} score
                          </span>
                        </div>
                      </div>

                      {/* Display breakdown of the four weights */}
                      <div className="grid grid-cols-4 gap-1.5 text-[9px] font-mono text-zinc-500 uppercase text-center pt-1 border-t border-white/3">
                        <div>
                          <span className="block text-zinc-400 font-bold">{post.interestScore}%</span>
                          <span>Interest</span>
                        </div>
                        <div>
                          <span className="block text-zinc-400 font-bold">{post.qualityScore}%</span>
                          <span>Quality</span>
                        </div>
                        <div>
                          <span className="block text-zinc-400 font-bold">{post.verificationScore}%</span>
                          <span>Verified</span>
                        </div>
                        <div>
                          <span className="block text-zinc-400 font-bold">{post.freshnessScore}%</span>
                          <span>Freshness</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Planned NIDA roadmap; these are design goals, not deployed feature claims. */}
        {activeSubTab === 'playbook' && (
          <motion.div
            key="playbook"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* How post suggestions may improve */}
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4 text-xs leading-5 text-amber-100/80">
              This is a plan for future improvements. Some features may not be available yet. Your current feed and interest settings are the parts that work today.
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { stage: 1, title: 'Stage 1 — Try posts with a small group', tag: 'Small group test', color: 'border-white/10 text-violet-400', desc: 'When you share a post, it may first be shown to a small group of people who enjoy that topic. Their response helps decide who else may like it.' },
                { stage: 2, title: 'Stage 2 — Post activity', tag: 'Post activity', color: 'border-pink-500/20 text-pink-400', desc: 'Your post's results can include how long people watch, replays, shares, saves, comments, profile visits and new followers.' },
                { stage: 3, title: 'Stage 3 — What people enjoy', tag: 'What people enjoy', color: 'border-cyan-500/20 text-cyan-400', desc: 'Posts people watch, save or share may be shown to more people. Posts people quickly skip or report may be shown less.' },
                { stage: 4, title: 'Stage 4 — Understanding posts', tag: 'Image and text checks', color: 'border-emerald-500/20 text-emerald-400', desc: 'NEXORA looks at the topic, text, music and other details in a post to help show it to people who may enjoy it.' },
                { stage: 5, title: 'Stage 5 — Account standing', tag: 'Account standing', color: 'border-amber-500/20 text-amber-400', desc: 'Account age, following the rules and sharing original posts can help build trust. A large following does not guarantee that every post will be popular.' },
                { stage: 6, title: 'Stage 6 — Finding popular posts', tag: 'Popular posts', color: 'border-indigo-500/20 text-indigo-400', desc: 'Looks for posts that are quickly getting more saves, shares and views, so more people can discover them.' },
                { stage: 7, title: 'Stage 7 — Posts worth finding later', tag: 'Posts people may enjoy later', color: 'border-purple-500/20 text-purple-400', desc: 'Good posts may appear again weeks or months later when people are looking for similar topics.' },
                { stage: 8, title: 'Stage 8 — Your changing interests', tag: 'Changing interests', color: 'border-rose-500/20 text-rose-400', desc: 'Your feed can change as your interests change. You can also update your interests yourself.' },
                { stage: 9, title: 'Stage 9 — Keeping spam away', tag: 'Original content checks', color: 'border-teal-500/20 text-teal-400', desc: 'NEXORA works to limit stolen posts, spam, fake giveaways and misleading titles.' },
                { stage: 10, title: 'Stage 10 — A fair chance for everyone', tag: 'A fair chance for everyone', color: 'border-sky-500/20 text-sky-400', desc: 'You don't need lots of followers to be discovered. A new account can reach people when its posts are interesting and original.' },
                { stage: 11, title: 'Stage 11 — A safer community', tag: 'Keeping the community safe', color: 'border-blue-500/20 text-blue-400', desc: 'Posts linked to repeated harassment, spam or rule-breaking reports may be shown to fewer people.' },
                { stage: 12, title: 'Stage 12 — Reaching more people', tag: 'How posts reach people', color: 'border-fuchsia-500/20 text-fuchsia-400', desc: 'Posts may reach people nearby first, then a wider audience when people respond well.' },
              ].map(playbook => (
                <div 
                  key={playbook.stage}
                  className="bg-[#0b081e] border border-white/5 hover:border-white/10 p-5 rounded-3xl space-y-2 transition-all"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                      Stage {playbook.stage}
                    </span>
                    <span className={`text-[9px] font-mono font-bold bg-white/3 border border-white/5 px-2 py-0.5 rounded-full ${playbook.color}`}>
                      {playbook.tag}
                    </span>
                  </div>
                  <h3 className="text-xs font-mono font-black text-white uppercase tracking-wider">
                    {playbook.title}
                  </h3>
                  <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                    {playbook.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
