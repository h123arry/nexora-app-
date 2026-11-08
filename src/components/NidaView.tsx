import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, BarChart2, Activity, CheckCircle, AlertTriangle, RefreshCw, Play, Sliders, Shield, Search, Zap, Award, Info, Users, Target, Check, X, ChevronRight, Cpu, Eye, Heart, MessageSquare, Bookmark, ThumbsDown, Trash2, ArrowUpRight, Ban, EyeOff, Forward } from 'lucide-react';
import { User, Post } from '../types';
import { getRecommendationProfile, saveRecommendationProfile } from '../utils/recommendations';

interface NidaViewProps {
  currentUser: User;
  posts: Post[];
}

export default function NidaView({ currentUser, posts }: NidaViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'interest-dna' | 'pillars' | 'playbook'>('interest-dna');
  
  // Personal Interest DNA State
  const [interestDNA, setInterestDNA] = useState<Record<string, number>>(() => {
    const profile = getRecommendationProfile();
    return {
      Football: profile.tags['football'] || 60,
      Comedy: profile.tags['comedy'] || 45,
      AI: profile.tags['ai'] || 80,
      Gaming: profile.tags['gaming'] || 50,
      Fashion: profile.tags['fashion'] || 30,
      Cars: profile.tags['cars'] || 25,
      Music: profile.tags['music'] || 75,
      Food: profile.tags['food'] || 40,
      Education: profile.tags['education'] || 65,
      Travel: profile.tags['travel'] || 55,
    };
  });

  // Custom Algorithm Weights state
  const [pillarWeights, setPillarWeights] = useState({
    interest: 35,
    quality: 35,
    verification: 15,
    freshness: 15,
  });

  // Save Interest DNA helper
  const handleUpdateInterest = (interest: string, value: number) => {
    const updated = { ...interestDNA, [interest]: value };
    setInterestDNA(updated);
    
    // Save back to recommendation profile tags
    const profile = getRecommendationProfile();
    profile.tags[interest.toLowerCase()] = value;
    saveRecommendationProfile(profile);
  };

  const resetInterestDNA = () => {
    const defaults = {
      Football: 60,
      Comedy: 45,
      AI: 80,
      Gaming: 50,
      Fashion: 30,
      Cars: 25,
      Music: 75,
      Food: 40,
      Education: 65,
      Travel: 55,
    };
    setInterestDNA(defaults);
    const profile = getRecommendationProfile();
    Object.entries(defaults).forEach(([k, v]) => {
      profile.tags[k.toLowerCase()] = v;
    });
    saveRecommendationProfile(profile);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🔄 Reset Interest DNA to Nexora standard defaults.' }));
  };

  // Rank only real posts supplied by the live application data layer.
  const rankedPosts = posts.map(post => {
    const topic = post.tags?.[0]?.replace(/^#/, '') || 'General';
    const interestScore = interestDNA[topic] ?? interestDNA[topic.toLowerCase()] ?? 30;
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
                NIDA Platform Core
              </span>
              <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono font-bold text-cyan-300">
                v3.2 Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black font-sans tracking-tight bg-clip-text text-transparent bg-linear-to-r from-violet-300 via-pink-300 to-cyan-300">
              NEXORA INTELLIGENT DISCOVERY ALGORITHM
            </h1>
            <p className="text-xs text-zinc-400 max-w-2xl font-sans">
              Nexora rejects legacy clout mechanisms. NIDA ensures content is rewarded for being engaging, authentic, and enjoyable. Every upload is given a fair initial sandbox audience of 50-200 users, matching creators based on organic content values, not fame.
            </p>
          </div>
          
          <div className="flex items-center gap-2 shrink-0 bg-white/3 border border-white/5 p-3 rounded-2xl">
            <Activity className="w-6 h-6 text-emerald-400 animate-pulse" />
            <div>
              <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Engine Status</p>
              <p className="text-xs font-mono font-black text-emerald-400 uppercase">Optimal Syncing</p>
            </div>
          </div>
        </div>

        {/* SUB NAVIGATION TABS */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-white/5 relative z-10">
          {[
                        { id: 'interest-dna', label: 'Evolving Interest DNA', icon: Sliders },
            { id: 'pillars', label: 'Feed Ranking', icon: Cpu },
            { id: 'playbook', label: '12-Stage Playbook', icon: Shield },
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
                    <Sliders className="w-4 h-4" /> Personalized Interest DNA Matrix
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Your interest DNA is an evolving profile tracked as you watch or interact. You can manually align your current matching tags below.
                  </p>
                </div>
                
                <button
                  onClick={resetInterestDNA}
                  className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-mono text-[10px] uppercase font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset Defaults
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
                      <span className="text-pink-400">{weight}% affinity</span>
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
                      <span>Restricted Discovery</span>
                      <span>Max Priority Matching</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Explanatory Info Card */}
            <div className="bg-cyan-950/20 border border-cyan-500/20 p-5 rounded-3xl flex items-start gap-4">
              <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-mono font-black text-cyan-300 uppercase tracking-wider">How NIDA Interest DNA works</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Every recommendation query matches posts tagged with corresponding categories. As you complete video watch loops (<strong>+12 weight</strong>), bookmark articles (<strong>+15 weight</strong>), or skip/swipe instantly (<strong>-15 weight</strong>), NIDA dynamically alters these vectors in real-time. This ensures high-affinity matching without lock-in biases.
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
                  <Cpu className="w-4 h-4 text-cyan-400" /> Pillar Weights Editor
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Adjust how currently loaded posts are ordered using their stored tags, engagement counters, author verification flag, and publication time. This is an inspection tool, not the production feed-ranking service.
                </p>
              </div>

              <div className="space-y-5">
                {[
                  { key: 'interest', label: '1. User Interest DNA Matching', desc: 'Prioritizes content matched perfectly with the user\'s interest profile vectors.', color: 'accent-violet-500' },
                  { key: 'quality', label: '2. Engagement Quality Score', desc: 'Prioritizes completion rates, comments, saves, and genuine shares over simple fake claps.', color: 'accent-pink-500' },
                  { key: 'verification', label: '3. Creator Verification', desc: 'Uses the actual verification flag on each post author. Verification is not a full trust or safety score.', color: 'accent-cyan-500' },
                  { key: 'freshness', label: '4. Content Freshness & Trends', desc: 'Boosts newly uploaded posts and viral rapid acceleration trends.', color: 'accent-yellow-500' },
                ].map(pillar => {
                  const val = (pillarWeights as any)[pillar.key];
                  return (
                    <div key={pillar.key} className="space-y-2 bg-[#120f32]/40 p-4 rounded-2xl border border-white/3">
                      <div className="flex justify-between items-center text-xs font-mono font-bold text-zinc-200">
                        <span>{pillar.label}</span>
                        <span className="text-cyan-400">{val}% Weight</span>
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
                  Currently Loaded Posts
                </span>
                <span className="text-[9px] font-mono text-zinc-500 uppercase">
                  Based on saved post records
                </span>
              </div>

              <div className="space-y-3">
                {rankedPosts.length === 0 ? <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-xs text-zinc-400">No real posts are currently loaded. Ranking will appear when posts are available.</div> : rankedPosts.map((post, idx) => (
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
                            {post.totalScore} Pts
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

        {/* TAB 4: 12-STAGE PLAYBOOK */}
        {activeSubTab === 'playbook' && (
          <motion.div
            key="playbook"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Detailed visual checklist of the 12 stages */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { stage: 1, title: 'Stage 1 — Initial Test Audience', tag: 'A/B Seed Sandbox', color: 'border-white/10 text-violet-400', desc: 'When you press submit, NIDA does not show it to millions instantly. Instead, it serves it strictly to 50–200 meticulously chosen users interested in that specific topic DNA to analyze baseline interaction parameters.' },
                { stage: 2, title: 'Stage 2 — Engagement Quality', tag: 'Micro-Signals Matrix', color: 'border-pink-500/20 text-pink-400', desc: 'NIDA ignores trivial double-tap bot likes. It calculates a genuine Quality Score based on: Watch completion rate, replays, shares, saves, deep threaded comments, profile clicks, and brand new followers.' },
                { stage: 3, title: 'Stage 3 — Satisfaction Score', tag: 'Organic Enjoyment', color: 'border-cyan-500/20 text-cyan-400', desc: 'Estimates true satisfaction. Positive signals (complete loops, saves, profile visits) boost ranking, while negative signals (instant swipe-aways, reports, selecting "Not Interested") trigger dampening to depress cheap clickbait.' },
                { stage: 4, title: 'Stage 4 — AI Content Parser', tag: 'Computer Vision & NLP', color: 'border-emerald-500/20 text-emerald-400', desc: 'Automated ingestion pipeline extracts topic taxonomy, metadata language, overall mood (vibe), detected faces, music, objects, activities, and originality metrics to construct a comprehensive target indexing blueprint.' },
                { stage: 5, title: 'Stage 5 — Creator Reputation', tag: 'Living Compliance Score', color: 'border-amber-500/20 text-amber-400', desc: 'Account age, rules compliance, spam strikes, content originality, and previous community behaviors generate a slight modifier weight. Reputation assists slightly, but never guarantees unfair clout domination.' },
                { stage: 6, title: 'Stage 6 — Trend Detection', tag: 'Rapid Velocity Tracker', color: 'border-indigo-500/20 text-indigo-400', desc: 'Monitors instantaneous momentum: rapid spikes in bookmark counts, shares, and watch time loops. If detected, NIDA unlocks immediate wider wave bandwidth to assist organic discovery.' },
                { stage: 7, title: 'Stage 7 — Long-Term Discovery', tag: 'Evergreen Ingestion', color: 'border-purple-500/20 text-purple-400', desc: 'Post discovery is designed with lasting value. Exceptional evergreen posts never "die" after 48 hours—they are resurfaced weeks or months later to matching users when relevant topics spike again.' },
                { stage: 8, title: 'Stage 8 — Interest Engine', tag: 'Evolving Fingerprints', color: 'border-rose-500/20 text-rose-400', desc: 'Every account builds an evolving Interest DNA based on organic watch times. Recommendations adapt seamlessly as hobbies and needs shift, avoiding algorithmic capture bias.' },
                { stage: 9, title: 'Stage 9 — Anti-Spam Protection', tag: 'Originality Guard', color: 'border-teal-500/20 text-teal-400', desc: 'Severe dampeners are applied instantly to reposted or stolen media, repeating upload hashes, engagement loop farming, fake giveaways, and deceptive titles.' },
                { stage: 10, title: 'Stage 10 — Fairness Engine', tag: 'Absolute Equal Chance', color: 'border-sky-500/20 text-sky-400', desc: 'Follower size is not a prerequisite for visibility. A fresh, newly created account with highly engaging, authentic content has the exact same chance to expand globally as any verified profile.' },
                { stage: 11, title: 'Stage 11 — Community Health', tag: 'Toxicity Shield', color: 'border-blue-500/20 text-blue-400', desc: 'Limits recommendation streams for content that repeatedly prompts community guidelines reports, harassment warnings, bulk comments, or coordinate manipulation.' },
                { stage: 12, title: 'Stage 12 — Multi-Stage Waves', tag: 'Concentric Distribution', color: 'border-fuchsia-500/20 text-fuchsia-400', desc: 'Distribution expands in wave patterns: Local ➔ Regional ➔ National ➔ Global. Only posts that repeatedly pass engagement quality checks in the current wave advance to the next concentric layer.' },
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
