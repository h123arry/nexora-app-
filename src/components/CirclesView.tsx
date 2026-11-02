import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, Users, Coins, Wand2, Check, Plus, Flame, Globe, X, Send, Volume2, Lock, FileText, Calendar, Shield, Trophy, Megaphone, UserCheck, BarChart2, Download, Award } from 'lucide-react';
import { Circle, User } from '../types';
import { recordRecommendationEvent } from '../utils/recommendations';
import { CommunityService } from '../services/firebase/communityService';
import CircleEventsPanel from './CircleEventsPanel';
import CircleMembersPanel from './CircleMembersPanel';
import CircleAnnouncementsPanel from './CircleAnnouncementsPanel';
import CircleGovernancePanel from './CircleGovernancePanel';

interface CirclesViewProps {
  currentUser: User;
}

export default function CirclesView({ currentUser }: CirclesViewProps) {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [isLoadingCircles, setIsLoadingCircles] = useState(true);
  const [circlesError, setCirclesError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingCircles(true);
    CommunityService.listPublicCommunities(currentUser.id)
      .then(items => {
        if (!cancelled) {
          setCircles(items);
          setCirclesError(null);
        }
      })
      .catch(error => {
        console.error('Circle discovery load failed:', error);
        if (!cancelled) setCirclesError('Circles could not be loaded. Check your connection and try again.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingCircles(false);
      });
    return () => { cancelled = true; };
  }, [currentUser.id]);
  
  // Community points are not money, are not redeemable, and have no financial value.
  const [currencyBalances, setCurrencyBalances] = useState<{ [key: string]: number }>({});

  // Circle Builder States
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
  const [circlePolls, setCirclePolls] = useState<Array<{ id: string; question: string; options: Array<{ id: string; text: string; votes: number }>; createdBy: string; status: string; myVote: string | null; createdAt: string }>>([]);
  const [pollError, setPollError] = useState<string | null>(null);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionInputs, setPollOptionInputs] = useState(['', '']);
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [votingPollId, setVotingPollId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; avatar: string; text: string; time: string }>>([]);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  useEffect(() => {
    if (!selectedCircle || !selectedCircle.isJoinedByMe) {
      setChatMessages([]);
      setChatError('Join this Circle to view its messages.');
      return;
    }
    setChatError(null);
    return CommunityService.watchMessages(
      selectedCircle.id,
      currentUser.id,
      messages => setChatMessages(messages.map(message => ({
        sender: message.senderId === currentUser.id ? currentUser.name : 'Circle member',
        avatar: message.senderId === currentUser.id ? currentUser.avatar : '/logo.svg',
        text: message.content,
        time: message.time,
      }))),
      error => setChatError(error.message || 'Circle messages could not be loaded.'),
    );
  }, [selectedCircle?.id, selectedCircle?.isJoinedByMe, currentUser.id, currentUser.name, currentUser.avatar]);
  useEffect(() => {
    if (!selectedCircle || !selectedCircle.isJoinedByMe) {
      setCirclePolls([]);
      setPollError('Join this Circle to view and vote in polls.');
      return;
    }
    setPollError(null);
    return CommunityService.watchPolls(
      selectedCircle.id,
      currentUser.id,
      setCirclePolls,
      error => setPollError(error.message || 'Circle polls could not be loaded.'),
    );
  }, [selectedCircle?.id, selectedCircle?.isJoinedByMe, currentUser.id]);
  const [chatInput, setChatInput] = useState('');
  const [isJoinedVoice, setIsJoinedVoice] = useState(false);

  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);

  // Sound simulation state
  const [isMuted, setIsMuted] = useState(false);

  const handleJoinCircle = async (circleId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const target = circles.find(circle => circle.id === circleId);
    if (!target) return;
    try {
      if (target.isJoinedByMe) {
        await CommunityService.leaveCommunity(currentUser.id, circleId);
      } else {
        await CommunityService.joinCommunity(currentUser.id, circleId);
        recordRecommendationEvent('join_community', { communityName: target.name, tags: target.tags });
      }
      setCircles(prev => prev.map(circle => circle.id === circleId
        ? { ...circle, isJoinedByMe: !target.isJoinedByMe }
        : circle));
    } catch (error) {
      console.error('Circle membership update failed:', error);
      window.dispatchEvent(new CustomEvent('toast', {
        detail: error instanceof Error ? error.message : 'Your Circle membership could not be updated. Please retry.',
      }));
    }
  };

  // Circle creation is persisted to Firestore. The name and description are user-provided;
  // no AI generation is claimed until a real generation service is connected.
  const handleAICommunityBuild = async (e: React.FormEvent) => {
    e.preventDefault();
    const idea = promptInput.trim();
    if (!idea || isBuilding) return;
    setIsBuilding(true);
    setCirclesError(null);
    const circleName = idea.replace(/^(create|make) (a |an )?/i, '').trim().slice(0, 60);
    const banner = /soccer|football|sport/i.test(idea)
      ? 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=80'
      : /code|developer|program/i.test(idea)
        ? 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80';
    try {
      const created = await CommunityService.createPublicCommunity({
        ownerId: currentUser.id,
        name: circleName,
        description: 'A public Circle for people interested in ' + circleName + '.',
        bannerImage: banner,
        rules: ['Be respectful and constructive', 'Do not spam or harass members', 'Respect the Circle rules and moderators'],
        tags: [idea.split(' ').slice(-1)[0].replace(/[^a-zA-Z0-9]/g, '').slice(0, 40) || 'Community', 'NEXORA'],
      });
      setCircles(prev => [created, ...prev]);
      setPromptInput('');
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Your Circle has been created.' }));
    } catch (error) {
      console.error('Circle creation failed:', error);
      window.dispatchEvent(new CustomEvent('toast', { detail: error instanceof Error ? error.message : 'Your Circle could not be created. Please retry.' }));
    } finally {
      setIsBuilding(false);
    }
  };
  const handleGroupChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircle || !selectedCircle.isJoinedByMe || !chatInput.trim() || isSendingMessage) return;
    setIsSendingMessage(true);
    try {
      await CommunityService.sendMessage(selectedCircle.id, currentUser.id, chatInput);
      setChatInput('');
      setChatError(null);
    } catch (error) {
      console.error('Circle message send failed:', error);
      setChatError(error instanceof Error ? error.message : 'Your message could not be sent. Please retry.');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircle || !selectedCircle.isJoinedByMe || isCreatingPoll) return;
    const options = pollOptionInputs.map(option => option.trim()).filter(Boolean);
    setIsCreatingPoll(true);
    setPollError(null);
    try {
      await CommunityService.createPoll(selectedCircle.id, pollQuestion, options);
      setPollQuestion('');
      setPollOptionInputs(['', '']);
    } catch (error) {
      setPollError(error instanceof Error ? error.message : 'The poll could not be created. Please retry.');
    } finally {
      setIsCreatingPoll(false);
    }
  };

  const handleVote = async (pollId: string, optionId: string) => {
    if (!selectedCircle || !selectedCircle.isJoinedByMe || votingPollId) return;
    setVotingPollId(pollId);
    setPollError(null);
    try {
      await CommunityService.votePoll(selectedCircle.id, pollId, optionId);
    } catch (error) {
      setPollError(error instanceof Error ? error.message : 'Your vote could not be saved. Please retry.');
    } finally {
      setVotingPollId(null);
    }
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
            <Users className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-black font-sans tracking-tight text-white">
              Circles
            </h2>
          </div>
          <p className="text-xs text-violet-300/60 font-sans">
            Your audiences • Curated networks, close connections & shared interest groups
          </p>
        </div>

        {/* Community points HUD; deliberately separate from billing and fiat money. */}
        <div className="flex items-center gap-2 bg-[#0d071a] border border-pink-500/25 p-2 rounded-xl">
          <Coins className="w-4 h-4 text-pink-400" />
          <div className="flex flex-wrap gap-3 text-[10px] font-mono">
            {Object.entries(currencyBalances).length === 0 ? <span className="text-zinc-500">Community points • not money</span> : Object.entries(currencyBalances).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1.5 border-r border-current/10 pr-3 last:border-none last:pr-0">
                <span className="text-current/50 shrink-0">{key.split(' ')[0]}:</span>
                <span className="font-extrabold text-pink-300">{value} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Community Builder Module */}
      <div className="bg-[#05030c] border border-white/10 rounded-3xl p-5 relative overflow-hidden">
        {/* Background micro gradient glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
          <h3 className="text-xs font-black tracking-widest uppercase font-mono text-violet-400">
            AI Community Builder
          </h3>
        </div>

        <p className="text-xs text-violet-200/80 mb-4 leading-normal font-sans text-left">
          Input your community idea. Create a public Circle with saved rules and topic tags. AI-assisted setup will be connected when its generation service is ready.
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
              className="flex-1 px-4 py-2 bg-white/5 border border-white/10 focus:outline-hidden text-xs rounded-xl focus:border-white/10 text-white font-sans text-left"
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
              className="mt-4 pt-3 border-t border-white/10 space-y-2 text-left"
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-violet-400/60 mb-1">
                <span>SAVING YOUR CIRCLE...</span>
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
                      <span className="w-3 h-3 rounded-full border border-white/10 shrink-0 block" />
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
      {filteredCircles.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#0b0918] border border-white/10 text-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-white/10 flex items-center justify-center mx-auto text-violet-400">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-sans font-extrabold text-white">No Communities Found</h4>
          <p className="text-xs text-violet-300/70 max-w-md mx-auto leading-relaxed">
            Use the AI Community Builder above to instantly launch your custom community space on Nexora.
          </p>
        </div>
      ) : (
        <div id="circles-grid-wrapper" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCircles.map((circle) => {
            const creator = circle.creatorId === currentUser.id 
              ? currentUser 
              : { id: circle.creatorId, name: (circle as any).creatorName || 'Nexora Member', username: (circle as any).creatorUsername || 'creator', avatar: (circle as any).avatar || (circle as any).avatarImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150' };

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
              className="bg-[#0b0918] border border-white/10 rounded-3xl overflow-hidden hover:border-white/10 transition-all group flex flex-col justify-between cursor-pointer"
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
                    <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 text-[9px] font-mono font-black border border-white/10 bg-[#090515]/90 text-violet-400 rounded-md uppercase">
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
                  <span className="text-[10px] font-mono">Member count unavailable</span>
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
      )}

      {/* FULL COMMUNITY PORTAL MODAL INTEGRATION WITH 12 TABS */}
      <AnimatePresence>
        {selectedCircle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in text-left">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-[#09071b] border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[90vh] shadow-[0_0_60px_rgba(139,92,246,0.3)]"
            >
              {/* Header block with cover banner */}
              <div className="relative h-24 sm:h-32 bg-slate-900 overflow-hidden shrink-0 flex items-end p-4 border-b border-white/10">
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
              <div className="bg-black/40 border-b border-white/10 overflow-x-auto scrollbar-none flex-shrink-0">
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
                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/10 space-y-2">
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

                    <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/10 space-y-2">
                      <p className="text-xs sm:text-sm leading-relaxed">
                        Setting up the local tournament brackets for this weekend. Who is checking in?
                      </p>
                      <div className="text-[10px] text-violet-300/40 font-mono mt-1 pt-2 border-t border-white/5">
                        Posted by nexora_ai • Yesterday
                      </div>
                    </div>
                  </div>
                )}

                {activePortalTab === 'members' && <CircleMembersPanel communityId={selectedCircle.id} />}

                {activePortalTab === 'events' && <CircleEventsPanel communityId={selectedCircle.id} currentUserId={currentUser.id} />}

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
                          className="p-1.5 bg-violet-600/20 hover:bg-[#8b5cf6] text-white border border-white/10 rounded-lg transition-colors cursor-pointer"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activePortalTab === 'polls' && (
                  <div className="space-y-4 text-left max-w-2xl">
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Circle polls</h3>
                      <p className="mt-1 text-[11px] text-violet-200/50">Votes are saved securely. Each member gets one vote per poll.</p>
                    </div>
                    {pollError && <p role="status" className="rounded-xl border border-rose-400/20 bg-rose-950/20 p-3 text-xs text-rose-200">{pollError}</p>}
                    <form onSubmit={handleCreatePoll} className="rounded-2xl border border-white/10 bg-[#03010b]/50 p-4 space-y-3">
                      <label className="block text-xs font-bold text-white" htmlFor="circle-poll-question">Create a poll</label>
                      <input id="circle-poll-question" value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} maxLength={240} required placeholder="Ask your Circle a question" className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none focus:border-violet-500" />
                      {pollOptionInputs.map((option, index) => (
                        <input key={index} value={option} onChange={e => setPollOptionInputs(prev => prev.map((item, i) => i === index ? e.target.value : item))} maxLength={80} required={index < 2} placeholder={`Option ${index + 1}`} className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white outline-none focus:border-violet-500" />
                      ))}
                      <div className="flex flex-wrap gap-2">
                        {pollOptionInputs.length < 5 && <button type="button" onClick={() => setPollOptionInputs(prev => [...prev, ''])} className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-violet-200">Add option</button>}
                        {pollOptionInputs.length > 2 && <button type="button" onClick={() => setPollOptionInputs(prev => prev.slice(0, -1))} className="rounded-lg border border-white/10 px-3 py-2 text-[11px] text-violet-200">Remove last option</button>}
                        <button type="submit" disabled={isCreatingPoll || !pollQuestion.trim() || pollOptionInputs.slice(0, 2).some(option => !option.trim())} className="ml-auto rounded-lg bg-violet-600 px-4 py-2 text-[11px] font-bold text-white disabled:opacity-50">{isCreatingPoll ? 'Saving...' : 'Publish poll'}</button>
                      </div>
                    </form>
                    {circlePolls.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-violet-200/50">No polls yet. Start the first conversation.</div>
                    ) : circlePolls.map(poll => {
                      const total = poll.options.reduce((sum, option) => sum + option.votes, 0);
                      return (
                        <section key={poll.id} className="rounded-2xl border border-white/10 bg-[#03010b]/50 p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-bold text-white">{poll.question}</h4>
                            <span className="shrink-0 rounded-full border border-violet-400/20 px-2 py-1 text-[9px] uppercase text-violet-200/70">{poll.status}</span>
                          </div>
                          <div className="space-y-2">
                            {poll.options.map(option => {
                              const pct = total > 0 ? Math.round(option.votes / total * 100) : 0;
                              const selected = poll.myVote === option.id;
                              return (
                                <button key={option.id} type="button" disabled={Boolean(poll.myVote) || poll.status !== 'open' || votingPollId === poll.id} onClick={() => handleVote(poll.id, option.id)} className={`relative flex w-full items-center justify-between overflow-hidden rounded-xl border p-3 text-left text-xs ${selected ? 'border-violet-400 bg-violet-950/30' : 'border-white/10 bg-white/[0.02]'} disabled:cursor-default`}>
                                  <span style={{ width: `${pct}%` }} className="absolute inset-y-0 left-0 bg-violet-500/10" />
                                  <span className="relative z-10 font-semibold text-white">{option.text}</span>
                                  <span className="relative z-10 font-mono text-violet-200">{option.votes} · {pct}%</span>
                                </button>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-violet-200/45">{poll.myVote ? 'Your vote is recorded.' : poll.status === 'open' ? 'Select one option. Your vote cannot be changed.' : 'Voting is closed.'} {total} vote{total === 1 ? '' : 's'} · {poll.createdAt}</p>
                        </section>
                      );
                    })}
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
                      <div className="p-5 rounded-2xl bg-violet-950/10 border border-white/10 flex flex-col items-center justify-center space-y-4">
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
                      <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
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
                    
                    <div className="bg-[#03010b]/80 border border-white/10 rounded-2xl p-3 h-52 overflow-y-auto space-y-3 flex flex-col">
                      <div className="text-[9px] font-mono text-center text-violet-400/40 select-none pb-2">Messages are visible to Circle members. They are not end-to-end encrypted.</div>
                      {chatError && <p className="text-[10px] text-rose-300">{chatError}</p>}{chatMessages.length === 0 && !chatError && <p className="text-xs text-violet-300/60 text-center py-6">No messages yet. Start the conversation.</p>}{chatMessages.map((msg, i) => (
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
                        maxLength={2000}
                        disabled={!selectedCircle?.isJoinedByMe || isSendingMessage}
                        placeholder="Say something to the lounge..." 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        className="flex-1 px-3 py-2 border border-white/10 bg-[#03010b]/50 text-white rounded-xl text-xs focus:outline-none focus:border-[#8b5cf6]"
                      />
                      <button 
                        type="submit"
                        disabled={!selectedCircle?.isJoinedByMe || isSendingMessage || !chatInput.trim()}
                        className="p-2 bg-[#8b5cf6] hover:bg-violet-500 border border-white/10 text-white rounded-xl transition-colors cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                )}

                {activePortalTab === 'announcements' && (
                  selectedCircle.isJoinedByMe
                    ? <CircleAnnouncementsPanel
                      communityId={selectedCircle.id}
                      currentUserId={currentUser.id}
                      canManage={selectedCircle.ownerId === currentUser.id || Boolean(selectedCircle.admins?.includes(currentUser.id) || selectedCircle.moderators?.includes(currentUser.id))}
                    />
                    : <p className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-violet-200/50">Join this Circle to read its announcements.</p>
                )}

                {activePortalTab === 'mods' && (
                  <CircleGovernancePanel
                    communityId={selectedCircle.id}
                    currentUserId={currentUser.id}
                    isOwner={selectedCircle.ownerId === currentUser.id}
                  />
                )}

                {activePortalTab === 'rules' && (
                  <div className="space-y-3 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Official Conduct Guidelines</h3>
                    <div className="p-4 rounded-2xl bg-[#03010b]/50 border border-white/10 space-y-2 font-mono text-[10px] uppercase text-violet-300 leading-relaxed">
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
                        <div key={ch.id} className="p-4 rounded-2xl bg-white/[0.01] border border-white/10 space-y-3">
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
