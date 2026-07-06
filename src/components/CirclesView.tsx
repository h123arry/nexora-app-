import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Sparkles, 
  Users, 
  Coins, 
  Wand2, 
  Check, 
  Plus,
  Flame,
  Globe,
  X,
  Send,
  Volume2,
  Lock,
  FileText,
  Calendar,
  Shield,
  Trophy,
  Megaphone,
  UserCheck,
  BarChart2,
  Download,
  Award
} from 'lucide-react';
import { Circle, User } from '../types';
import { INITIAL_CIRCLES, MOCK_CREATORS, INITIAL_USER } from '../data/database';
import { recordRecommendationEvent } from '../utils/recommendations';

interface CirclesViewProps {
  currentUser: User;
}

export default function CirclesView({ currentUser }: CirclesViewProps) {
  const [circles, setCircles] = useState<Circle[]>(INITIAL_CIRCLES);
  
  // Community Points State
  const [currencyBalances, setCurrencyBalances] = useState<{ [key: string]: number }>({
    'Football Points (FP)': 340,
    'Coding Points (CP)': 120,
    'Creative Tokens (CT)': 450
  });

  // AI Community Builder States
  const [promptInput, setPromptInput] = useState('');
  const [isBuilding, setIsBuilding] = useState(false);
  const [buildSteps, setBuildSteps] = useState<string[]>([]);
  const [currentBuildStep, setCurrentBuildStep] = useState(0);

  // Filter categories
  const [activeFilter, setActiveFilter] = useState<'all' | 'joined' | 'explore'>('all');

  // Community Portal Modal state
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [activePortalTab, setActivePortalTab] = useState<string>('feed');

  // Interactive state helpers for sub-tabs in Community Portal
  const [votedPollId, setVotedPollId] = useState<string | null>(null);
  const [pollVotes, setPollVotes] = useState({ opt1: 24, opt2: 12, opt3: 8 });
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; avatar: string; text: string; time: string }>>([
    { sender: 'David Sterling', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', text: 'Stoked to be part of this community space! Let\'s go!', time: '10 mins ago' },
    { sender: 'Chioma Adebayo', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', text: 'Matches schedule is up for review under the Events tab!', time: '6 mins ago' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isJoinedVoice, setIsJoinedVoice] = useState(false);
  const [rsvpedEvents, setRsvpedEvents] = useState<string[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);

  // Sound simulation state
  const [isMuted, setIsMuted] = useState(false);

  const handleJoinCircle = (circleId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // don't open modal when clicking join button
    }
    const target = circles.find(c => c.id === circleId);
    if (target && !target.isJoinedByMe) {
      recordRecommendationEvent('join_community', { communityName: target.name, tags: target.tags });
    }
    setCircles(prev => prev.map(c => {
      if (c.id === circleId) {
        const joined = !c.isJoinedByMe;
        return { 
          ...c, 
          isJoinedByMe: joined,
          membersCount: joined ? c.membersCount + 1 : c.membersCount - 1
        };
      }
      return c;
    }));
  };

  // Run AI Community Builder wizard
  const handleAICommunityBuild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptInput.trim()) return;

    setIsBuilding(true);
    setCurrentBuildStep(0);
    
    // Normal language, clean human descriptions
    const steps = [
      'Creating clean community database records...',
      'Synthesizing beautiful header banner templates...',
      'Drafting friendly community rules and onboarding guidelines...',
      'Optimizing recommended categories matching across global channels...',
      'Publishing the new digital community lounge online...'
    ];
    setBuildSteps(steps);

    let progress = 0;
    const interval = setInterval(() => {
      if (progress < steps.length - 1) {
        progress++;
        setCurrentBuildStep(progress);
      } else {
        clearInterval(interval);
        
        // Finalize Community Circle Creation
        const circleName = promptInput.charAt(0).toUpperCase() + promptInput.slice(1).replace(/create a |make a /g, '');
        const safeName = circleName.length > 30 ? circleName.slice(0, 30) : circleName;
        
        let banner = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
        if (promptInput.toLowerCase().includes('soccer') || promptInput.toLowerCase().includes('football') || promptInput.toLowerCase().includes('sport')) {
          banner = 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80';
        } else if (promptInput.toLowerCase().includes('code') || promptInput.toLowerCase().includes('rust') || promptInput.toLowerCase().includes('developer')) {
          banner = 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80';
        } else if (promptInput.toLowerCase().includes('photo') || promptInput.toLowerCase().includes('art') || promptInput.toLowerCase().includes('visual')) {
          banner = 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=800&auto=format&fit=crop&q=80';
        }

        const newCircle: Circle = {
          id: `circle-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          name: safeName.includes("Club") || safeName.includes("Lounge") || safeName.includes("Hub") ? safeName : `${safeName} Hub`,
          description: `An immersive community built autonomously via NEXORA AI companion targeting: "${promptInput}"`,
          bannerImage: banner,
          creatorId: currentUser.id,
          rules: [
            'Be respectful, professional, and helpful',
            'Track contributions on shared quests cleanly',
            'No spam or low-effort generic updates'
          ],
          membersCount: 1,
          tags: [promptInput.split(' ').slice(-1)[0].replace(/[^a-zA-Z]/g, '') || 'Creative', 'NEXORA'],
          isJoinedByMe: true
        };

        setCircles(prev => [newCircle, ...prev]);
        setIsBuilding(false);
        setPromptInput('');
      }
    }, 1000);
  };

  const handleGroupChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatMessages(prev => [
      ...prev,
      {
        sender: currentUser.name,
        avatar: currentUser.avatar,
        text: chatInput,
        time: 'Just now'
      }
    ]);
    setChatInput('');
  };

  const handleVote = (option: 'opt1' | 'opt2' | 'opt3') => {
    if (votedPollId) return;
    setVotedPollId(option);
    setPollVotes(prev => ({
      ...prev,
      [option]: prev[option] + 1
    }));
  };

  const filteredCircles = circles.filter(c => {
    if (activeFilter === 'joined') return c.isJoinedByMe;
    if (activeFilter === 'explore') return !c.isJoinedByMe;
    return true;
  });

  return (
    <div id="circles-thematic-layout" className="space-y-6">
      
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="w-5 h-5 text-pink-400" />
            <h2 className="text-xl font-black font-sans tracking-tight text-white">
              Thematic Communities
            </h2>
          </div>
          <p className="text-xs text-violet-300/60 font-sans">
            Beautiful interest groups and discussion spaces with your peers
          </p>
        </div>

        {/* Community currency balance ledger HUD */}
        <div className="flex items-center gap-2 bg-[#0d071a] border border-pink-500/25 p-2 rounded-xl">
          <Coins className="w-4 h-4 text-pink-400" />
          <div className="flex flex-wrap gap-3 text-[10px] font-mono">
            {Object.entries(currencyBalances).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1.5 border-r border-current/10 pr-3 last:border-none last:pr-0">
                <span className="text-current/50 shrink-0">{key.split(' ')[0]}:</span>
                <span className="font-extrabold text-pink-300">{value} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Community Builder Module */}
      <div className="bg-[#05030c] border border-violet-500/10 rounded-3xl p-5 relative overflow-hidden">
        {/* Background micro gradient glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
          <h3 className="text-xs font-black tracking-widest uppercase font-mono text-violet-400">
            AI Community Builder
          </h3>
        </div>

        <p className="text-xs text-violet-200/80 mb-4 leading-normal font-sans text-left">
          Input your community idea. The NEXORA AI engine will automatically define structure, curate rules, render themed banners, and auto-match relevant community groups.
        </p>

        <form onSubmit={handleAICommunityBuild} className="space-y-3 relative z-10">
          <div className="flex gap-2">
            <input
              type="text"
              required
              disabled={isBuilding}
              placeholder='e.g., "Create a football community in Port Harcourt" or "Quantum physics discussion lounge"'
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/5 border border-violet-500/10 focus:outline-hidden text-xs rounded-xl focus:border-violet-500/30 text-white font-sans text-left"
            />
            <button
              type="submit"
              disabled={isBuilding || !promptInput.trim()}
              className="px-5 py-2 font-mono font-black text-xs bg-[#8b5cf6] text-white rounded-xl hover:brightness-110 active:scale-97 disabled:opacity-50 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>{isBuilding ? 'BUILDING...' : 'AI BUILD'}</span>
            </button>
          </div>
        </form>

        {/* Builder simulation progress tracks */}
        <AnimatePresence>
          {isBuilding && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-4 pt-3 border-t border-violet-500/10 space-y-2 text-left"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-violet-400/60 mb-1">
                <span>NEXORA AI GENERATING COMMUNITY...</span>
                <span>{Math.round(((currentBuildStep + 1) / buildSteps.length) * 100)}%</span>
              </div>
              
              {/* Bar */}
              <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                <motion.div 
                  style={{ width: `${((currentBuildStep + 1) / buildSteps.length) * 100}%` }}
                  className="h-full bg-linear-to-r from-violet-500 via-pink-500 to-cyan-500" 
                />
              </div>

              <div className="space-y-1 font-mono text-[9px] text-violet-300/65 pl-1 mt-1">
                {buildSteps.map((step, stepId) => (
                  <div key={stepId} className="flex items-center gap-2">
                    {stepId <= currentBuildStep ? (
                      <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-3 h-3 rounded-full border border-violet-500/20 shrink-0 block" />
                    )}
                    <span className={stepId === currentBuildStep ? 'text-violet-400 font-bold' : ''}>
                      {step}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs list to filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 border-b border-white/5 w-full md:w-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
              activeFilter === 'all' 
                ? 'border-pink-500 text-pink-400' 
                : 'border-transparent text-violet-300/60 hover:text-white'
            }`}
          >
            All Communities
          </button>
          <button
            onClick={() => setActiveFilter('joined')}
            className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
              activeFilter === 'joined' 
                ? 'border-pink-500 text-pink-400' 
                : 'border-transparent text-violet-300/60 hover:text-white'
            }`}
          >
            My Communities
          </button>
          <button
            onClick={() => setActiveFilter('explore')}
            className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer ${
              activeFilter === 'explore' 
                ? 'border-pink-500 text-pink-400' 
                : 'border-transparent text-violet-300/60 hover:text-white'
            }`}
          >
            Explore
          </button>
        </div>

        <span className="hidden md:block text-[10px] font-mono text-violet-400/40 uppercase">
          {filteredCircles.length} COMMUNITIES AVAILABLE
        </span>
      </div>

      {/* Circles/Communities Grid */}
      <div id="circles-grid-wrapper" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCircles.map((circle) => {
          const creator = [INITIAL_USER, ...MOCK_CREATORS].find(mc => mc.id === circle.creatorId) || INITIAL_USER;

          return (
            <div 
              key={circle.id} 
              onClick={() => {
                if (circle.isJoinedByMe) {
                  setSelectedCircle(circle);
                  setActivePortalTab('feed');
                } else {
                  alert(`Join "${circle.name}" first to access this community's discussions and visual workspace modules.`);
                }
              }}
              className="bg-[#0b0918] border border-violet-500/10 rounded-3xl overflow-hidden hover:border-violet-500/25 transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div>
                {/* Banner illustration */}
                <div className="relative h-28 w-full bg-slate-900 border-b border-white/5 overflow-hidden">
                  <img 
                    src={circle.bannerImage} 
                    alt={circle.name} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-700 brightness-85" 
                  />
                  
                  {circle.isJoinedByMe && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono font-black border border-violet-500/30 bg-[#090515]/90 text-violet-400 rounded-md uppercase">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Member</span>
                    </div>
                  )}
                </div>

                {/* Body Content */}
                <div className="p-4 space-y-2 text-left">
                  <div className="flex flex-wrap gap-1.5">
                    {circle.tags.map((tg, tgIdx) => (
                      <span 
                        key={tgIdx} 
                        className="bg-white/5 border border-white/5 px-2 py-0.5 rounded-md text-[9px] font-mono text-violet-300"
                      >
                        #{tg}
                      </span>
                    ))}
                  </div>

                  <h3 className="text-sm font-black font-sans tracking-tight text-white leading-tight">
                    {circle.name}
                  </h3>
                  
                  <p className="text-xs text-white/70 font-sans leading-normal line-clamp-2">
                    {circle.description}
                  </p>
                </div>
              </div>

              <div className="p-4 pt-0 border-t border-white/5 mt-auto bg-white/[0.01] flex items-center justify-between">
                {/* Creator/Members count */}
                <div className="flex items-center gap-2 text-violet-400">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-mono">{circle.membersCount.toLocaleString()} Members</span>
                </div>

                {/* Toggle Button */}
                <button
                  onClick={(e) => handleJoinCircle(circle.id, e)}
                  className={`px-4 py-1.5 rounded-xl font-mono text-[10px] uppercase font-bold transition-all cursor-pointer ${
                    circle.isJoinedByMe
                      ? 'bg-transparent text-emerald-400 border border-emerald-500/25'
                      : 'bg-[#8b5cf6] text-white hover:brightness-110 shadow-md'
                  }`}
                >
                  {circle.isJoinedByMe ? 'MEMBER ✓' : 'JOIN'}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* FULL COMMUNITY PORTAL MODAL INTEGRATION WITH 12 TABS */}
      <AnimatePresence>
        {selectedCircle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in text-left">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-[#09071b] border border-violet-500/20 rounded-3xl overflow-hidden flex flex-col h-[90vh] shadow-[0_0_60px_rgba(139,92,246,0.3)]"
            >
              {/* Header block with cover banner */}
              <div className="relative h-24 sm:h-32 bg-slate-900 overflow-hidden shrink-0 flex items-end p-4 border-b border-violet-500/20">
                <img 
                  src={selectedCircle.bannerImage} 
                  alt={selectedCircle.name} 
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover brightness-50" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09071b] to-transparent" />
                <div className="relative z-10 flex items-center justify-between w-full">
                  <div>
                    <h2 className="text-base sm:text-2xl font-black font-sans text-white tracking-tight">
                      {selectedCircle.name}
                    </h2>
                    <p className="text-[10px] sm:text-xs text-violet-300/80 font-sans mt-0.5 max-w-md line-clamp-1">
                      {selectedCircle.description}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedCircle(null)}
                    className="p-1.5 sm:p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl border border-white/5 transition-colors cursor-pointer shrink-0"
                    title="Close Lounge"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>
              </div>

              {/* 12 Category Core Tabs Selector - Horizontally Scrollable list */}
              <div className="bg-black/40 border-b border-violet-500/10 overflow-x-auto scrollbar-none flex-shrink-0">
                <div className="flex gap-1.5 px-3 py-2.5 min-w-max">
                  {[
                    { id: 'feed', label: '📢 Feed', icon: FileText },
                    { id: 'members', label: '👥 Members', icon: Users },
                    { id: 'events', label: '📅 Events', icon: Calendar },
                    { id: 'files', label: '📁 Files', icon: FileText },
                    { id: 'polls', label: '📊 Polls', icon: BarChart2 },
                    { id: 'voice', label: '🎙 Voice Room', icon: Volume2 },
                    { id: 'chat', label: '💬 Chat', icon: Send },
                    { id: 'announcements', label: '🔔 Announcements', icon: Megaphone },
                    { id: 'mods', label: '🛡 Moderators', icon: Shield },
                    { id: 'rules', label: '📋 Rules', icon: FileText },
                    { id: 'leaderboard', label: '🏆 Leaderboard', icon: Trophy },
                    { id: 'challenges', label: '🎯 Challenges', icon: Award }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activePortalTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActivePortalTab(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-semibold font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                          isActive 
                            ? 'bg-[#8b5cf6] text-white shadow-lg' 
                            : 'text-violet-300/60 hover:text-white hover:bg-white/5 border border-transparent'
                        }`}
                      >
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Tab Content dynamic viewport */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 font-sans text-xs sm:text-sm text-white/90">
                
                {activePortalTab === 'feed' && (
                  <div className="space-y-3.5 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Community Discussion Stream</h3>
                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-violet-500/10 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                        <span className="text-[10px] font-mono text-emerald-400">STICKY PIN</span>
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed">
                        Welcome to our brand new community space on Nexora! Share your best moments, coordinate local meetups, and support members with sparks. Keep posts friendly.
                      </p>
                      <div className="text-[10px] text-violet-300/40 font-mono mt-1 pt-2 border-t border-white/5">
                        Posted by Voice of Harrison • 2 hours ago
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-violet-500/10 space-y-2">
                      <p className="text-xs sm:text-sm leading-relaxed">
                        Setting up the local tournament brackets for this weekend. Who is checking in?
                      </p>
                      <div className="text-[10px] text-violet-300/40 font-mono mt-1 pt-2 border-t border-white/5">
                        Posted by nexora_ai • Yesterday
                      </div>
                    </div>
                  </div>
                )}

                {activePortalTab === 'members' && (
                  <div className="space-y-3 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Active Community Members</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { name: 'VOICE OF HARRISON', username: 'voh', role: 'Founder Admin', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg' },
                        { name: 'Nexora Official ✓', username: 'nexora_official', role: 'Official Platform Account', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80' },
                        { name: 'VOH AI', username: 'voh_ai', role: 'AI Assistant', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80' }
                      ].map((mbr, i) => (
                        <div key={i} className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <img src={mbr.avatar} alt={mbr.name} className="w-8 h-8 rounded-xl object-cover" />
                            <div>
                              <p className="text-xs font-bold text-white">@{mbr.username}</p>
                              <p className="text-[10px] text-violet-300/60">{mbr.name}</p>
                            </div>
                          </div>
                          <span className="text-[8px] font-mono font-bold bg-violet-600/20 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded uppercase">
                            {mbr.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activePortalTab === 'events' && (
                  <div className="space-y-3 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Upcoming Group Events</h3>
                    {[
                      { id: 'evt1', title: 'Weekend Local Meetup & Sports Match', date: 'Sunday, June 21, 2026', time: '4:00 PM', loc: 'Port Harcourt Hub Center' },
                      { id: 'evt2', title: 'Open Q&A Core Development Hack', date: 'Wednesday, June 24, 2026', time: '8:00 PM', loc: 'Nexora Audio Voice Lounge' }
                    ].map((evt) => {
                      const isRsvped = rsvpedEvents.includes(evt.id);
                      return (
                        <div key={evt.id} className="p-4 rounded-2xl bg-white/[0.01] border border-violet-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-white">{evt.title}</h4>
                            <p className="text-[10.5px] text-violet-300/80">{evt.date} • {evt.time}</p>
                            <p className="text-[9.5px] text-violet-300/40 font-mono">📍 {evt.loc}</p>
                          </div>
                          <button
                            onClick={() => {
                              if (isRsvped) {
                                setRsvpedEvents(prev => prev.filter(id => id !== evt.id));
                              } else {
                                setRsvpedEvents(prev => [...prev, evt.id]);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-[9.5px] font-mono font-bold uppercase transition-all shrink-0 cursor-pointer ${
                              isRsvped 
                                ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-[#8b5cf6] hover:bg-violet-500 text-white'
                            }`}
                          >
                            {isRsvped ? 'Registered ✓' : 'Register'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activePortalTab === 'files' && (
                  <div className="space-y-3 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Shared Documents & Media</h3>
                    {[
                      { filename: 'Community Rules & Onboarding Guide.pdf', size: '1.4 MB', uploadedBy: 'voh' },
                      { filename: 'Strategic Map Brackets.png', size: '4.8 MB', uploadedBy: 'chioma_codes' }
                    ].map((fl, i) => (
                      <div key={i} className="p-3 bg-white/[0.01] border border-white/5 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-violet-400 shrink-0" />
                          <div>
                            <p className="text-xs font-extrabold text-white">{fl.filename}</p>
                            <p className="text-[9px] text-[#A78BFA]/50 font-mono">{fl.size} • Uploaded by @{fl.uploadedBy}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => alert(`Beginning download of "${fl.filename}"...`)}
                          className="p-1.5 bg-violet-600/20 hover:bg-[#8b5cf6] text-white border border-violet-500/20 rounded-lg transition-colors cursor-pointer"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activePortalTab === 'polls' && (
                  <div className="space-y-3.5 text-left max-w-md">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Community Interest Poll</h3>
                    <div className="p-4 rounded-2xl bg-[#03010b]/50 border border-violet-500/10 space-y-4">
                      <p className="text-xs sm:text-sm font-black text-violet-100">Which region should Host our next physical gathering?</p>
                      <div className="space-y-2">
                        {[
                          { id: 'opt1', label: 'Lagos Gateway Centre', votes: pollVotes.opt1 },
                          { id: 'opt2', label: 'Port Harcourt Zone B', votes: pollVotes.opt2 },
                          { id: 'opt3', label: 'Abuja Virtual Lounge', votes: pollVotes.opt3 }
                        ].map((opt) => {
                          const total = pollVotes.opt1 + pollVotes.opt2 + pollVotes.opt3;
                          const pct = Math.round((opt.votes / total) * 100);
                          const isMyVote = votedPollId === opt.id;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleVote(opt.id as any)}
                              className={`w-full p-3.5 rounded-xl border text-left relative overflow-hidden transition-all flex items-center justify-between text-xs font-sans cursor-pointer ${
                                isMyVote ? 'border-[#8b5cf6] bg-violet-950/20' : 'border-white/5 bg-white/[0.01]'
                              }`}
                            >
                              <div style={{ width: `${pct}%` }} className="absolute left-0 top-0 bottom-0 bg-violet-500/10" />
                              <span className="relative z-10 font-bold text-white">{opt.label}</span>
                              <span className="relative z-10 font-mono font-bold text-violet-300">{opt.votes} ({pct}%)</span>
                            </button>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-violet-300/40 font-mono text-center">
                        {votedPollId ? 'Thank you for contributing! Your input is locked.' : 'Choose an option to submit your ballot in the workspace.'}
                      </p>
                    </div>
                  </div>
                )}

                {activePortalTab === 'voice' && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between border-b border-[#A78BFA]/10 pb-2">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Spatial Audio Room</h3>
                      <button
                        onClick={() => setIsJoinedVoice(!isJoinedVoice)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase cursor-pointer ${
                          isJoinedVoice ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'
                        } text-white`}
                      >
                        {isJoinedVoice ? 'Leave Lounge' : 'Join Voice Channel'}
                      </button>
                    </div>

                    {isJoinedVoice ? (
                      <div className="p-5 rounded-2xl bg-violet-950/10 border border-violet-500/25 flex flex-col items-center justify-center space-y-4">
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5, 6].map((bar) => (
                            <div 
                              key={bar} 
                              className="w-1 bg-[#8b5cf6] rounded-full animate-pulse h-6" 
                              style={{ 
                                animationDelay: `${bar * 150}ms`,
                                animationDuration: `${600 + (bar * 200)}ms` 
                              }} 
                            />
                          ))}
                        </div>
                        <p className="text-xs text-white font-black">🎙 Connected Live in Orbit</p>
                        <div className="flex items-center gap-4 text-xs font-mono mt-1">
                          <button 
                            onClick={() => setIsMuted(!isMuted)} 
                            className={`px-3 py-1 rounded bg-black/40 ${isMuted ? 'text-rose-400' : 'text-emerald-400'}`}
                          >
                            {isMuted ? 'MUTED' : 'UNMUTED'}
                          </button>
                          <span>4 active listeners</span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center border border-dashed border-violet-500/10 rounded-2xl bg-white/[0.01]">
                        <Volume2 className="w-8 h-8 text-violet-400/30 mx-auto" />
                        <p className="text-xs text-violet-300 mt-2">Voice Lobby is currently dormant.</p>
                        <p className="text-[10px] text-violet-300/40">Click Join to coordinate sports match tactics or code deep dives.</p>
                      </div>
                    )}
                  </div>
                )}

                {activePortalTab === 'chat' && (
                  <div className="space-y-3 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] font-bold">Community Group Chat Chatroom</h3>
                    
                    <div className="bg-[#03010b]/80 border border-violet-500/10 rounded-2xl p-3 h-52 overflow-y-auto space-y-3 flex flex-col">
                      <div className="text-[9px] font-mono text-center text-violet-400/40 select-none pb-2">Inaugurating encrypted lounge session...</div>
                      {chatMessages.map((msg, i) => (
                        <div key={i} className="flex gap-2.5 items-start">
                          <img src={msg.avatar} alt={msg.sender} className="w-8 h-8 rounded-xl object-cover shrink-0" />
                          <div className="bg-white/5 border border-white/5 rounded-2xl p-2.5 max-w-md">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10.5px] font-black text-rose-300">{msg.sender}</span>
                              <span className="text-[8px] font-mono text-violet-400/40">{msg.time}</span>
                            </div>
                            <p className="text-xs text-white/90 leading-normal">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form onSubmit={handleGroupChatSubmit} className="flex gap-2">
                      <input 
                        type="text" 
                        required
                        placeholder="Say something to the lounge..." 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 px-3 py-2 border border-violet-500/10 bg-[#03010b]/50 text-white rounded-xl text-xs focus:outline-none focus:border-[#8b5cf6]"
                      />
                      <button 
                        type="submit"
                        className="p-2 bg-[#8b5cf6] hover:bg-violet-500 border border-violet-500/20 text-white rounded-xl transition-colors cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}

                {activePortalTab === 'announcements' && (
                  <div className="space-y-3.5 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Sticky Announcements</h3>
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs sm:text-sm text-amber-200 leading-relaxed font-sans space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <Megaphone className="w-4 h-4" />
                        <span>IMPORTANT BULLETIN</span>
                      </div>
                      <p>
                        All members of {selectedCircle.name} must agree to upstanding community respect. Disruptive behavior will result in a temporary block of community points usage on our marketplace list.
                      </p>
                      <cite className="block text-[10px] text-amber-400/60 font-mono not-italic pt-1 text-right">— Administrative Team</cite>
                    </div>
                  </div>
                )}

                {activePortalTab === 'mods' && (
                  <div className="space-y-3.5 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-[#A78BFA] font-bold">Community Moderators</h3>
                    <p className="text-xs text-violet-300/60 font-sans">These users have management capabilities to verify challenges compliance and delete irregular content:</p>
                    <div className="p-4 rounded-2xl bg-[#03010b]/50 border border-violet-500/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👑</span>
                          <div>
                            <p className="text-xs font-bold text-white">VOICE OF HARRISON (voh)</p>
                            <p className="text-[10px] text-violet-300/50">Founder & Chief Ombudsman</p>
                          </div>
                        </div>
                        <span className="text-[8.5px] font-mono bg-violet-600/30 text-white border border-violet-500/30 px-2 py-0.5 rounded uppercase font-black">Founder</span>
                      </div>
                    </div>
                  </div>
                )}

                {activePortalTab === 'rules' && (
                  <div className="space-y-3 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Official Conduct Guidelines</h3>
                    <div className="p-4 rounded-2xl bg-[#03010b]/50 border border-violet-500/10 space-y-2 font-mono text-[10px] uppercase text-violet-300 leading-relaxed">
                      <p>1. Be helpful and collaborative to other creators.</p>
                      <p>2. Keep topics relevant to the community's theme.</p>
                      <p>3. Do not spam links or external advertisements lists.</p>
                      <p>4. Keep language civil, constructive, and clean.</p>
                    </div>
                  </div>
                )}

                {activePortalTab === 'leaderboard' && (
                  <div className="space-y-3 text-left max-w-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Engagement Score Leaderboard</h3>
                      <Trophy className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="space-y-2">
                      {[
                        { name: 'voh', score: '98,000 pts', pos: '1' },
                        { name: 'nexora_ai', score: '85,000 pts', pos: '2' },
                        { name: 'voh_ai', score: '78,000 pts', pos: '3' }
                      ].map((ld, i) => (
                        <div key={i} className="p-3 rounded-xl bg-white/[0.01] border border-white/5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-[10px] bg-violet-500/20 text-violet-300 w-5 h-5 rounded-md flex items-center justify-center font-bold">{ld.pos}</span>
                            <span className="font-extrabold text-[#D1D5DB]">@{ld.name}</span>
                          </div>
                          <span className="font-mono font-extrabold text-pink-400">{ld.score}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activePortalTab === 'challenges' && (
                  <div className="space-y-4 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Active Community Quests</h3>
                    {[
                      { id: 'ch1', title: 'Post 3 high quality updates in 5 days', reward: '50 FP points', progress: '1/3 steps completed' }
                    ].map((ch) => {
                      const isDone = completedChallenges.includes(ch.id);
                      return (
                        <div key={ch.id} className="p-4 rounded-2xl bg-white/[0.01] border border-violet-500/10 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <h4 className="text-xs sm:text-sm font-bold text-white">{ch.title}</h4>
                              <p className="text-[10px] text-[#A78BFA] font-mono uppercase">🎁 REWARD: {ch.reward}</p>
                              <p className="text-[10px] text-violet-300/40 font-mono">Status: {ch.progress}</p>
                            </div>
                            <button
                              disabled={isDone}
                              onClick={() => {
                                setCompletedChallenges(prev => [...prev, ch.id]);
                                alert("Quest targets submitted for validation queue! Reward will clear soon.");
                              }}
                              className={`px-3 py-1.5 rounded-lg text-[9.5px] font-mono font-bold uppercase transition-all cursor-pointer ${
                                isDone 
                                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-violet-600 hover:bg-violet-500 text-white'
                              }`}
                            >
                              {isDone ? 'Claimed ✓' : 'Submit Quest'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
