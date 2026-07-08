import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, BarChart2, Activity, CheckCircle, AlertTriangle, RefreshCw, Play, Sliders, Shield, Search, Zap, Award, Info, Users, Target, Check, X, ChevronRight, Cpu, Eye, Heart, MessageSquare, Bookmark, ThumbsDown, Trash2, ArrowUpRight, Ban, EyeOff, Forward } from 'lucide-react';
import { User, Post } from '../types';
import { getRecommendationProfile, saveRecommendationProfile } from '../utils/recommendations';

interface NidaViewProps {
  currentUser: User;
}

interface SimStageResult {
  title: string;
  status: 'passed' | 'warning' | 'failed' | 'pending';
  score: number;
  message: string;
  metricLabel?: string;
  metricValue?: string;
}

export default function NidaView({ currentUser }: NidaViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'simulator' | 'interest-dna' | 'pillars' | 'playbook'>('simulator');
  
  // Simulated Post parameters
  const [postTitle, setPostTitle] = useState('My first masterpiece!');
  const [postContent, setPostContent] = useState('Excited to share this new track with the world! The beat is purely insane. 🌌 Let me know what you think!');
  const [postTopic, setPostTopic] = useState('Music');
  const [creatorProfile, setCreatorProfile] = useState<'new' | 'compliant' | 'spammer'>('compliant');
  const [hasClickbait, setHasClickbait] = useState(false);
  const [hasEngagementBait, setHasEngagementBait] = useState(false);
  const [isStolen, setIsStolen] = useState(false);
  const [hasHarassment, setHasHarassment] = useState(false);

  // Simulation Running State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStep, setSimulationStep] = useState(0);
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [simResults, setSimResults] = useState<Record<number, SimStageResult>>({});
  const [simReach, setSimReach] = useState(0);
  const [simScore, setSimScore] = useState(0);
  const [simWave, setSimWave] = useState<'None' | 'Local' | 'Regional' | 'National' | 'Global'>('None');

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
    trust: 15,
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

  // Run NIDA Simulation
  const runNidaSimulation = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimulationStep(1);
    setSimLogs(['Initializing NIDA Core Sandbox Engine...']);
    setSimResults({});
    setSimReach(0);
    setSimScore(0);
    setSimWave('None');

    const logs: string[] = [];
    const results: Record<number, SimStageResult> = {};

    const addLog = (msg: string) => {
      logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
      setSimLogs([...logs]);
    };

    // Stage 1: Initial Test Audience
    setTimeout(() => {
      addLog('🚀 STAGE 1: Seed-injecting post to an initial audience of 120 carefully selected users...');
      let audienceMatch = 85;
      if (postContent.length < 10) audienceMatch = 40;
      
      results[1] = {
        title: 'Initial Test Audience',
        status: 'passed',
        score: audienceMatch,
        message: `Successfully recommended to 120 seed users based on their Interest DNA in '${postTopic}'.`,
        metricLabel: 'Seed Audience Size',
        metricValue: '120 selected users'
      };
      setSimResults({ ...results });
      setSimulationStep(2);
      setSimReach(120);
    }, 1200);

    // Stage 2 & 3: Engagement Quality & Satisfaction Score
    setTimeout(() => {
      addLog('📊 STAGE 2 & 3: Monitoring user interaction parameters for Quality and Satisfaction...');
      
      let watchRate = 78; // base values
      let replays = 12;
      let saves = 8;
      let skips = 5;
      let reportChance = false;

      // Apply penalties/bonuses
      if (hasClickbait) {
        addLog('⚠️ CLICKBAIT WARNING DETECTED: Watch completion rate decreased; swipe-away rate spiked!');
        watchRate -= 35;
        skips += 40;
      }
      if (hasEngagementBait) {
        addLog('⚠️ ENGAGEMENT BAIT DETECTED: Reduced quality reputation weighting.');
        watchRate -= 15;
      }
      if (isStolen) {
        addLog('🚨 PLAGIARISM DETECTED: Content similarity matches other published fingerprints.');
        watchRate -= 40;
        skips += 50;
      }
      if (hasHarassment) {
        addLog('🚨 CRITICAL SAFETY TRIGGER: User reports and hiding logs are spiking!');
        reportChance = true;
        watchRate -= 60;
        skips += 80;
      }

      const qualityScore = Math.max(0, Math.min(100, Math.round((watchRate * 0.5) + (replays * 2) + (saves * 3) - (skips * 0.8))));
      
      let satisfaction = 'Optimal';
      let stat = 'passed';
      if (qualityScore < 35) {
        satisfaction = 'Critically Low';
        stat = 'failed';
      } else if (qualityScore < 60) {
        satisfaction = 'Moderate';
        stat = 'warning';
      }

      addLog(`Satisfaction Analysis: ${satisfaction} (${qualityScore} NIDA Q-Score)`);

      results[2] = {
        title: 'Engagement Quality Index',
        status: stat as any,
        score: qualityScore,
        message: `Calculated Watch Completion Rate: ${watchRate}%. Skip/Swipe Rate: ${skips}%. Saves/Replays: ${saves + replays}.`,
        metricLabel: 'Quality Score',
        metricValue: `${qualityScore}/100`
      };

      results[3] = {
        title: 'Satisfaction Score',
        status: stat as any,
        score: qualityScore,
        message: `Clickbait dampener coefficient applied. Genuine interactions index is ${qualityScore > 50 ? 'Strong' : 'Weak'}.`,
        metricLabel: 'Retention Factor',
        metricValue: `${Math.max(10, watchRate - 5)}%`
      };

      setSimResults({ ...results });
      setSimulationStep(4);
    }, 2800);

    // Stage 4: AI Content Understanding
    setTimeout(() => {
      addLog('🧠 STAGE 4: Automated Multimodal AI Parser executing...');
      addLog(`AI detected topic: [${postTopic}], Language: English, Mood: Passionate, Trends Match: High.`);
      
      results[4] = {
        title: 'AI Content Parsing',
        status: 'passed',
        score: 95,
        message: `Parser mapped tags: ${postTopic}, Creative Expression, ${postTopic === 'AI' ? 'Next-Gen Tech' : 'Modern Culture'}. Originality checked.`,
        metricLabel: 'AI Mismatch Risk',
        metricValue: '0.04% (Minimal)'
      };

      setSimResults({ ...results });
      setSimulationStep(5);
    }, 4000);

    // Stage 5: Creator Reputation
    setTimeout(() => {
      addLog('🛡️ STAGE 5: Applying Creator Trust & Compliance Coefficient...');
      
      let repScore = 80;
      let repMsg = 'Solid historical compliance. Slight distribution accelerator applied.';
      if (creatorProfile === 'new') {
        repScore = 100; // Stage 10 Fairness: brand new creators get full chance
        repMsg = 'NIDA Fairness Engine enabled: Brand new creator with zero penalties given full distribution weight!';
      } else if (creatorProfile === 'spammer') {
        repScore = 20;
        repMsg = 'High historical violations. Severe recommendation dampeners in effect.';
      }

      results[5] = {
        title: 'Creator Reputation Modifier',
        status: creatorProfile === 'spammer' ? 'failed' : 'passed',
        score: repScore,
        message: repMsg,
        metricLabel: 'Trust Score Weight',
        metricValue: `${repScore}%`
      };

      setSimResults({ ...results });
      setSimulationStep(6);
    }, 5200);

    // Stage 6 & 7: Trend Detection & Evergreen Resurfacing
    setTimeout(() => {
      addLog('📈 STAGE 6 & 7: Analyzing rapid spike metrics & long-term discovery potential...');
      
      const isTrending = (creatorProfile !== 'spammer') && !isStolen && !hasHarassment && (postContent.includes('🌌') || postTopic === 'AI' || postTopic === 'Music');
      
      if (isTrending) {
        addLog('🔥 TREND SPIKE DETECTED! Exponential share rate triggering automatic Stage 6 recommendation booster!');
      }

      results[6] = {
        title: 'Trend Spike Detection',
        status: isTrending ? 'passed' : 'warning',
        score: isTrending ? 95 : 45,
        message: isTrending ? 'Sudden spike in saves & replays detected. Distribution multiplier applied.' : 'Moderate steady engagement, no active trend triggers.',
        metricLabel: 'Velocity Coeff',
        metricValue: isTrending ? '2.4x Spike' : '1.0x Normal'
      };

      results[7] = {
        title: 'Long-Term Evergreen Index',
        status: 'passed',
        score: isStolen ? 30 : 85,
        message: isStolen ? 'Content flagged as plagiarized. Unlikely to resurface.' : 'Valuable topic and metadata ensures this will resurface dynamically weeks from now.',
        metricLabel: 'Evergreen Potential',
        metricValue: isStolen ? 'Very Low' : 'High'
      };

      setSimResults({ ...results });
      setSimulationStep(8);
    }, 6600);

    // Stage 8 & 9 & 11: Interest Matching, Anti-Spam & Community Health
    setTimeout(() => {
      addLog('🛡️ STAGE 8, 9 & 11: Quality & Safety compliance checkpoints...');
      
      let spamStatus: 'passed' | 'failed' | 'warning' = 'passed';
      let spamMsg = 'All spam models verified clear. Title is descriptive and organic.';
      if (isStolen || hasClickbait || hasEngagementBait) {
        spamStatus = 'failed';
        spamMsg = 'Automated spam filter detected clickbait or duplicate content fingerprint.';
      }

      let healthStatus: 'passed' | 'failed' | 'warning' = 'passed';
      let healthMsg = 'Safe community metrics. Compliant post.';
      if (hasHarassment) {
        healthStatus = 'failed';
        healthMsg = 'Post contains critical community guidelines triggers. Recommended distribution restricted.';
      }

      results[8] = {
        title: 'Interest Engine Alignment',
        status: 'passed',
        score: interestDNA[postTopic] || 50,
        message: `Successfully aligned with target audiences interested in '${postTopic}'. Match Coefficient is ${interestDNA[postTopic] || 50}%.`,
        metricLabel: 'Target Affinity',
        metricValue: `${interestDNA[postTopic] || 50}%`
      };

      results[9] = {
        title: 'Anti-Spam Shield',
        status: spamStatus,
        score: spamStatus === 'passed' ? 100 : 15,
        message: spamMsg,
        metricLabel: 'Spam Penalty',
        metricValue: spamStatus === 'failed' ? '-80% Distribution' : 'None'
      };

      results[11] = {
        title: 'Community Health Filter',
        status: healthStatus,
        score: healthStatus === 'passed' ? 100 : 0,
        message: healthMsg,
        metricLabel: 'Safety Score',
        metricValue: healthStatus === 'failed' ? 'Restricted' : 'Safe'
      };

      setSimResults({ ...results });
      setSimulationStep(10);
    }, 8000);

    // Stage 10 & 12: Fairness Engine & Multi-Stage Distribution final calculations
    setTimeout(() => {
      addLog('🌊 STAGE 10 & 12: Final Waves Calculation...');
      
      let finalWave: 'None' | 'Local' | 'Regional' | 'National' | 'Global' = 'Local';
      let reach = 120;
      
      // Calculate overall score
      let scoreVal = 70;
      if (creatorProfile === 'new') scoreVal += 15; // Fairness boost
      if (hasClickbait) scoreVal -= 25;
      if (hasEngagementBait) scoreVal -= 15;
      if (isStolen) scoreVal -= 30;
      if (hasHarassment) scoreVal -= 55;

      scoreVal = Math.max(5, Math.min(100, scoreVal));

      if (scoreVal >= 80) {
        finalWave = 'Global';
        reach = Math.round(1500000 + Math.random() * 500000);
      } else if (scoreVal >= 65) {
        finalWave = 'National';
        reach = Math.round(350000 + Math.random() * 100000);
      } else if (scoreVal >= 45) {
        finalWave = 'Regional';
        reach = Math.round(45000 + Math.random() * 15000);
      } else {
        finalWave = 'Local';
        reach = Math.round(120 + Math.random() * 300);
      }

      if (hasHarassment) {
        finalWave = 'None';
        reach = 0;
      }

      addLog(`Fairness Multipliers integrated successfully.`);
      addLog(`Post reached: [${finalWave}] wave with total estimated reach of ${reach.toLocaleString()} impressions.`);

      results[10] = {
        title: 'Fairness Engine',
        status: creatorProfile === 'new' ? 'passed' : 'passed',
        score: creatorProfile === 'new' ? 100 : 70,
        message: creatorProfile === 'new' 
          ? 'Fairness system recognized brand new profile and unlocked global seed bandwidth bypassing legacy follower counts.'
          : 'Normal fairness seed applied. Post judged strictly on content quality rather than pure fame metrics.',
        metricLabel: 'Fairness Boost',
        metricValue: creatorProfile === 'new' ? 'Unlocked Max' : 'Standard'
      };

      results[12] = {
        title: 'Multi-Stage Wave Distribution',
        status: finalWave === 'None' ? 'failed' : 'passed',
        score: scoreVal,
        message: `Post expanded smoothly. Reached Wave: ${finalWave}. Peak concurrent impressions achieved.`,
        metricLabel: 'Max Wave Achieved',
        metricValue: finalWave
      };

      setSimResults({ ...results });
      setSimReach(reach);
      setSimScore(scoreVal);
      setSimWave(finalWave);
      setIsSimulating(false);
      setSimulationStep(13); // finished!
      addLog('🎉 NIDA recommendation flow simulation complete.');
    }, 9500);
  };

  // Pillars weighted posts demo
  const samplePosts: { id: number; title: string; creator: string; rep: 'New' | 'High' | 'Suspicious'; topic: string; likes: number; shares: number; secondsOld: number }[] = [
    { id: 1, title: 'Uncovering the mysteries of deep neural networks 🧠', creator: 'TechGenius', rep: 'New', topic: 'AI', likes: 120, shares: 80, secondsOld: 300 },
    { id: 2, title: 'Wizkid new concert video in Lagos is pure fire!!! 🌟🎵', creator: 'AfroBeatsFan', rep: 'High', topic: 'Music', likes: 8500, shares: 3400, secondsOld: 1200 },
    { id: 3, title: 'CLICK HERE TO WIN FREE $10,000 CASH RIGHT NOW!!! 🎁', creator: 'SpamLord', rep: 'Suspicious', topic: 'Comedy', likes: 2, shares: 0, secondsOld: 50 },
    { id: 4, title: 'My home-cooked Jollof Rice platter 🍛 Best recipe!', creator: 'ChefAbiola', rep: 'New', topic: 'Food', likes: 45, shares: 12, secondsOld: 14400 },
    { id: 5, title: 'Premier League Matchday live commentary Chelsea vs Arsenal ⚽', creator: 'SportsHub', rep: 'High', topic: 'Football', likes: 1200, shares: 450, secondsOld: 3600 },
  ];

  const getRankedPosts = () => {
    return samplePosts.map(post => {
      // 1. Interest Score: post topic score in User's Interest DNA
      const interestScore = interestDNA[post.topic] || 30;

      // 2. Quality Score: likes, shares, content validity
      let qFactor = (post.likes * 0.1) + (post.shares * 0.5);
      if (post.title.includes('WIN FREE')) qFactor = 1; // spam penalty
      const qualityScore = Math.min(100, Math.max(10, qFactor));

      // 3. Trust Score: Creator compliance
      let trustScore = 80;
      if (post.rep === 'New') trustScore = 100; // Fairness boost
      if (post.rep === 'Suspicious') trustScore = 5;

      // 4. Freshness Score: Recency
      const freshnessScore = Math.max(10, Math.min(100, Math.round(100 - (post.secondsOld / 600))));

      // Weighted sum of Pillars
      const totalScore = Math.round(
        (interestScore * pillarWeights.interest / 100) +
        (qualityScore * pillarWeights.quality / 100) +
        (trustScore * pillarWeights.trust / 100) +
        (freshnessScore * pillarWeights.freshness / 100)
      );

      return {
        ...post,
        interestScore,
        qualityScore,
        trustScore,
        freshnessScore,
        totalScore,
      };
    }).sort((a, b) => b.totalScore - a.totalScore);
  };

  const rankedPosts = getRankedPosts();

  return (
    <div id="nida-discovery-view" className="space-y-6 text-zinc-100 pb-12">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-violet-950/40 via-[#0c0a2a]/60 to-cyan-950/40 border border-violet-500/20 p-6 md:p-8 space-y-4">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-xs font-mono font-extrabold text-violet-300 uppercase tracking-widest flex items-center gap-1.5">
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
            { id: 'simulator', label: 'Interactive Sandbox', icon: Play },
            { id: 'interest-dna', label: 'Evolving Interest DNA', icon: Sliders },
            { id: 'pillars', label: 'Four Pillars Sandbox', icon: Cpu },
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
        {/* TAB 1: INTERACTIVE SANDBOX */}
        {activeSubTab === 'simulator' && (
          <motion.div
            key="simulator"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Input Parameters column */}
            <div className="lg:col-span-5 space-y-5 bg-[#0b081e] border border-violet-500/15 p-5 md:p-6 rounded-3xl">
              <h2 className="text-sm font-mono font-black text-violet-400 uppercase tracking-wider border-b border-white/5 pb-2 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-pink-400" />
                Configure Post Blueprint
              </h2>
              
              <div className="space-y-4">
                {/* Topic selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">AI Taxonomy Topic</label>
                  <select
                    value={postTopic}
                    onChange={(e) => setPostTopic(e.target.value)}
                    className="w-full bg-[#120f32] border border-violet-500/20 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-zinc-200 outline-none focus:border-violet-500"
                  >
                    {['Football', 'Comedy', 'AI', 'Gaming', 'Fashion', 'Cars', 'Music', 'Food', 'Education', 'Travel'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* Creator Reputation Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Creator Reputation profile</label>
                  <select
                    value={creatorProfile}
                    onChange={(e) => setCreatorProfile(e.target.value as any)}
                    className="w-full bg-[#120f32] border border-violet-500/20 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-zinc-200 outline-none focus:border-violet-500"
                  >
                    <option value="new">Brand New Creator (0 Followers, Pure Content chance)</option>
                    <option value="compliant">Compliant Creator (Consistent history, rule-abiding)</option>
                    <option value="spammer">Spammer/Violator (Previous community strikes, plagiarist)</option>
                  </select>
                </div>

                {/* Post description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">Draft Content</label>
                  <textarea
                    rows={3}
                    value={postContent}
                    onChange={(e) => setPostContent(e.target.value)}
                    className="w-full bg-[#120f32] border border-violet-500/20 rounded-xl p-3 text-xs text-zinc-200 outline-none focus:border-violet-500 font-sans"
                    placeholder="What would you like to publish to the test sandbox?"
                  />
                </div>

                {/* Quality & compliance modifiers */}
                <div className="space-y-3 pt-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Quality & Compliance Checks</span>
                  
                  <div className="space-y-2">
                    <label className="flex items-center gap-2.5 bg-white/2 hover:bg-white/4 p-2.5 rounded-xl border border-white/5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasClickbait}
                        onChange={(e) => setHasClickbait(e.target.checked)}
                        className="accent-violet-500 rounded cursor-pointer"
                      />
                      <div>
                        <span className="block text-xs font-bold text-zinc-300">Misleading clickbait headline</span>
                        <span className="block text-[9px] text-zinc-500 font-mono">Stage 3 Dampener: Swipe-aways reduce satisfaction</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 bg-white/2 hover:bg-white/4 p-2.5 rounded-xl border border-white/5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasEngagementBait}
                        onChange={(e) => setHasEngagementBait(e.target.checked)}
                        className="accent-violet-500 rounded cursor-pointer"
                      />
                      <div>
                        <span className="block text-xs font-bold text-zinc-300">Artificial Engagement Bait</span>
                        <span className="block text-[9px] text-zinc-500 font-mono">Stage 9 Reducer: Limits organic distribution</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 bg-white/2 hover:bg-white/4 p-2.5 rounded-xl border border-white/5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isStolen}
                        onChange={(e) => setIsStolen(e.target.checked)}
                        className="accent-violet-500 rounded cursor-pointer"
                      />
                      <div>
                        <span className="block text-xs font-bold text-zinc-300">Stolen / Repeated Content</span>
                        <span className="block text-[9px] text-zinc-500 font-mono">Stage 9 Shield: Triggers immediate copyright dampeners</span>
                      </div>
                    </label>

                    <label className="flex items-center gap-2.5 bg-white/2 hover:bg-white/4 p-2.5 rounded-xl border border-white/5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={hasHarassment}
                        onChange={(e) => setHasHarassment(e.target.checked)}
                        className="accent-violet-500 rounded cursor-pointer"
                      />
                      <div>
                        <span className="block text-xs font-bold text-zinc-300">Harassment / Violative Words</span>
                        <span className="block text-[9px] text-red-400 font-mono">Stage 11: Restricts distribution and triggers moderation flag</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Simulation Action button */}
                <button
                  onClick={runNidaSimulation}
                  disabled={isSimulating}
                  className="w-full py-3.5 bg-linear-to-r from-violet-600 via-pink-600 to-cyan-500 disabled:brightness-50 text-white font-mono text-xs font-black uppercase tracking-widest rounded-xl hover:brightness-110 shadow-lg shadow-violet-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSimulating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                      <span>Processing Wave {simulationStep}...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white text-white" />
                      <span>Inject Post to NIDA Sandbox</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sandbox Simulation monitor logs / visual timeline */}
            <div className="lg:col-span-7 space-y-5">
              {/* Simulation Status & Score Banner */}
              <div className="bg-[#030113] border border-cyan-500/15 p-5 rounded-3xl grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1 border-r border-white/5 py-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider">Estimated Reach</span>
                  <p className="text-xl font-black font-mono text-cyan-400">
                    {simReach === 0 ? '--' : simReach.toLocaleString()}
                  </p>
                </div>
                
                <div className="space-y-1 border-r border-white/5 py-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider">Quality Score</span>
                  <p className={`text-xl font-black font-mono ${simScore >= 75 ? 'text-emerald-400' : simScore >= 45 ? 'text-yellow-400' : simScore > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                    {simScore === 0 ? '--' : `${simScore}/100`}
                  </p>
                </div>

                <div className="space-y-1 py-1">
                  <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider">Distribution Wave</span>
                  <p className="text-xl font-black font-mono text-pink-400">
                    {simWave === 'None' ? '--' : simWave}
                  </p>
                </div>
              </div>

              {/* Step Flowchart of the 12 Stages */}
              <div className="bg-zinc-950/40 border border-white/5 p-5 rounded-3xl space-y-4">
                <h3 className="text-xs font-mono font-black text-zinc-400 uppercase tracking-widest block border-b border-white/5 pb-2">
                  🛡️ Active Stage Verification Timeline (12 Stages)
                </h3>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {[
                    { st: 1, title: 'Stage 1: Initial Test Audience', desc: 'Checks response from 50–200 selected match users.' },
                    { st: 2, title: 'Stage 2: Engagement Quality', desc: 'Calculates pure watch completion rates, replays, and shares.' },
                    { st: 3, title: 'Stage 3: Satisfaction Score', desc: 'Judges clickbait vs genuine utility via user actions.' },
                    { st: 4, title: 'Stage 4: AI Content Understanding', desc: 'Detects topics, language, mood, and original trends.' },
                    { st: 5, title: 'Stage 5: Creator Reputation', desc: 'Ensures compliant history works as a small distribution modifier.' },
                    { st: 6, title: 'Stage 6: Trend Detection', desc: 'Locks onto spikes in watch time to scale waves exponentially.' },
                    { st: 7, title: 'Stage 7: Long-Term Discovery', desc: 'Enables evergreen content to trigger weeks or months later.' },
                    { st: 8, title: 'Stage 8: Interest DNA Engine', desc: 'Aligns post fingerprints with evolving user interest matrix.' },
                    { st: 9, title: 'Stage 9: Anti-Spam Protection', desc: 'Represses stolen media, repetitive loops, and fake links.' },
                    { st: 10, title: 'Stage 10: Fairness Engine', desc: 'Empowers brand-new creators to bypass elite follower gates.' },
                    { st: 11, title: 'Stage 11: Community Health Filter', desc: 'Checks feedback and restricts violative harassment.' },
                    { st: 12, title: 'Stage 12: Multi-Stage Waves', desc: 'Transitions post: Local ➔ Regional ➔ National ➔ Global.' },
                  ].map(stage => {
                    const result = simResults[stage.st] || simResults[stage.st === 2 ? 2 : stage.st === 3 ? 3 : stage.st === 6 ? 6 : stage.st === 7 ? 7 : stage.st === 8 ? 8 : stage.st === 9 ? 9 : stage.st === 11 ? 11 : stage.st];
                    const isProcessing = simulationStep === stage.st;
                    const isPassed = result && result.status === 'passed';
                    const isWarning = result && result.status === 'warning';
                    const isFailed = result && result.status === 'failed';

                    return (
                      <div 
                        key={stage.st}
                        className={`flex items-start gap-3 p-3 rounded-2xl transition-all border ${
                          isProcessing 
                            ? 'bg-violet-950/25 border-violet-500 animate-pulse'
                            : isPassed
                            ? 'bg-emerald-950/10 border-emerald-500/20'
                            : isWarning
                            ? 'bg-yellow-950/15 border-yellow-500/25'
                            : isFailed
                            ? 'bg-red-950/20 border-red-500/30'
                            : 'bg-white/1 border-white/5 opacity-50'
                        }`}
                      >
                        <div className="mt-0.5">
                          {isProcessing ? (
                            <RefreshCw className="w-4 h-4 text-violet-400 animate-spin" />
                          ) : isPassed ? (
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          ) : isWarning ? (
                            <AlertTriangle className="w-4 h-4 text-yellow-400" />
                          ) : isFailed ? (
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center text-[8px] font-mono text-zinc-500">
                              {stage.st}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start gap-2">
                            <h4 className="text-xs font-mono font-bold text-zinc-200 truncate">{stage.title}</h4>
                            {result && result.metricValue && (
                              <span className="text-[9px] font-mono font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-full text-zinc-400 uppercase tracking-wide">
                                {result.metricValue}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-400 font-sans mt-0.5 leading-relaxed">
                            {result ? result.message : stage.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Simulation Logs Output Terminal */}
              <div className="bg-[#03010b] border border-white/5 rounded-3xl p-4 font-mono text-[10px] text-zinc-400 space-y-2">
                <span className="text-[9px] font-mono text-zinc-500 uppercase block tracking-wider border-b border-white/5 pb-1 flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> Live Telemetry Output Terminal
                </span>
                <div className="space-y-1 max-h-[120px] overflow-y-auto pr-1">
                  {simLogs.length === 0 ? (
                    <p className="text-zinc-600">Pending simulator initiation trigger...</p>
                  ) : (
                    simLogs.map((log, index) => (
                      <p key={index} className={log.includes('WARNING') ? 'text-yellow-400' : log.includes('DETECTIONS') || log.includes('RESTRICTED') || log.includes('Plagiarism') ? 'text-red-400 font-black' : 'text-zinc-400'}>
                        {log}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: EVOLVING INTEREST DNA */}
        {activeSubTab === 'interest-dna' && (
          <motion.div
            key="interest-dna"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="bg-[#0b081e] border border-violet-500/15 p-6 rounded-3xl space-y-6">
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
            <div className="lg:col-span-5 space-y-6 bg-[#0b081e] border border-violet-500/15 p-5 md:p-6 rounded-3xl">
              <div>
                <h2 className="text-sm font-mono font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-cyan-400" /> Pillar Weights Editor
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Adjust the relative weight of the 4 Pillars of Nexora Secret Sauce and see how it alters feed recommendations in real-time.
                </p>
              </div>

              <div className="space-y-5">
                {[
                  { key: 'interest', label: '1. User Interest DNA Matching', desc: 'Prioritizes content matched perfectly with the user\'s interest profile vectors.', color: 'accent-violet-500' },
                  { key: 'quality', label: '2. Engagement Quality Score', desc: 'Prioritizes completion rates, comments, saves, and genuine shares over simple fake claps.', color: 'accent-pink-500' },
                  { key: 'trust', label: '3. Creator Trust Reputation', desc: 'Applies historical rule-compliance metrics, safety filters, and consistency parameters.', color: 'accent-cyan-500' },
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

            {/* Results Demonstration Feed */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-[#030113] border border-cyan-500/15 p-4 rounded-3xl flex justify-between items-center">
                <span className="text-xs font-mono font-black text-cyan-300 uppercase tracking-widest">
                  Live Ranked Feed (Weighted Sandbox)
                </span>
                <span className="text-[9px] font-mono text-zinc-500 uppercase">
                  Re-ordered on adjustments
                </span>
              </div>

              <div className="space-y-3">
                {rankedPosts.map((post, idx) => (
                  <div 
                    key={post.id}
                    className="bg-zinc-950/40 border border-white/5 hover:border-violet-500/20 p-4 rounded-2xl flex items-start gap-4 transition-all"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs font-mono font-bold text-violet-400 flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-sans font-extrabold text-white leading-snug">{post.title}</h4>
                          <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            @{post.creator} • Topic: <span className="text-pink-400 font-bold">{post.topic}</span> • Creator Rep: {post.rep}
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
                          <span className="block text-zinc-400 font-bold">{post.trustScore}%</span>
                          <span>Trust</span>
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
                { stage: 1, title: 'Stage 1 — Initial Test Audience', tag: 'A/B Seed Sandbox', color: 'border-violet-500/20 text-violet-400', desc: 'When you press submit, NIDA does not show it to millions instantly. Instead, it serves it strictly to 50–200 meticulously chosen users interested in that specific topic DNA to analyze baseline interaction parameters.' },
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
                  className="bg-[#0b081e] border border-white/5 hover:border-violet-500/10 p-5 rounded-3xl space-y-2 transition-all"
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
