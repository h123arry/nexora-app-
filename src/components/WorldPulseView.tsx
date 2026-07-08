import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Map, Flame, Check, Briefcase, Compass, Cpu, Music, Search, Plus, Users, Radio, Sparkles, Award, BookOpen, MapPin, TrendingUp, Brain, MessageSquare, Bell, X, Target, Clock, ArrowRight, User, Zap, Info, Calendar, Forward } from 'lucide-react';

export interface WorldPulseViewProps {
  theme: string;
}

interface PulseEvent {
  id: string;
  title: string;
  pulseScore: number;
  discussionsCount: number;
  communitiesCount: number;
  countriesCount?: number;
  isWorldwide?: boolean;
  category: 'trending' | 'sports' | 'business' | 'tech' | 'entertainment' | 'education' | 'local';
  desc: string;
  trendingScope: string;
  communities: string[];
  contributors: { name: string; avatar?: string; verified?: boolean }[];
  timeline: { time: string; event: string; status: 'start' | 'peak' | 'current' }[];
  predictionScore: number;
  city?: string;
}

export default function WorldPulseView({ theme }: WorldPulseViewProps) {
  const [pulseSearch, setPulseSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'map' | 'sports' | 'business' | 'tech' | 'entertainment' | 'education' | 'local'>('trending');
  
  // Map parameters
  const [zoomLevel, setZoomLevel] = useState<'world' | 'country' | 'state' | 'city'>('world');
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  // VOH AI interactive module
  const [vohSearch, setVohSearch] = useState('');
  const [vohReplies, setVohReplies] = useState<{ query: string; reply: string }[]>([]);
  const [isVohThinking, setIsVohThinking] = useState(false);

  // User interactive states
  const [followedAlerts, setFollowedAlerts] = useState<string[]>(['⚽ Football', '🧠 AI']);
  const [activeDiscussion, setActiveDiscussion] = useState<PulseEvent | null>(null);
  const [discussionComments, setDiscussionComments] = useState<{ user: string; text: string; rep: number }[]>([
    { user: 'alex_founder', text: 'This alters our layout roadmap completely!', rep: 124 },
    { user: 'david_analytics', text: 'Spoken statistics show 94% retention rate on this topic.', rep: 82 }
  ]);
  const [newCommentText, setNewCommentText] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Static high-fidelity Pulse Data
  const pulseEvents: PulseEvent[] = [
    {
      id: 'pe-sports-1',
      title: '⚽ Champions League Final Fanfare',
      pulseScore: 97,
      discussionsCount: 35000,
      communitiesCount: 120,
      countriesCount: 34,
      category: 'sports',
      desc: 'Real Madrid vs. Borussia Dortmund triggers historical fan pulse across Europe and Africa. Discussion channels are overflowing with live play tactical analyses and video waveforms prediction.',
      trendingScope: 'Trending in 34 Countries',
      communities: ['⚽ Football Nigeria', '⚽ Premier League Fans', '⚽ Champions League Hub'],
      contributors: [
        { name: 'VOICE OF HARRISON', verified: true },
        { name: 'Alex' },
        { name: 'Sarah' },
        { name: 'David' }
      ],
      timeline: [
        { time: '14 Hours Ago', event: 'Initial conversation topics start spiking online', status: 'start' },
        { time: '4 Hours Ago', event: 'Media uploads peak at 45,000 sparks per min', status: 'peak' },
        { time: 'Just Now', event: 'Football discussion groups currently active across 12 countries', status: 'current' }
      ],
      predictionScore: 98
    },
    {
      id: 'pe-tech-1',
      title: '🧠 New AI Breakthrough: Responsive Layouts',
      pulseScore: 91,
      discussionsCount: 14000,
      communitiesCount: 45,
      isWorldwide: true,
      category: 'tech',
      desc: 'Groundbreaking on-device responsive interface adapters demonstrated. Developers are co-building immediate React integration guides.',
      trendingScope: 'Trending Worldwide',
      communities: ['🧠 AI Builders', '🧠 Neural Forge', '🧠 Antigravity Devs'],
      contributors: [
        { name: 'VOICE OF HARRISON', verified: true },
        { name: 'Elena' },
        { name: 'Sophia' }
      ],
      timeline: [
        { time: '1 Day Ago', event: 'Research team uploads the blueprint file', status: 'start' },
        { time: '12 Hours Ago', event: 'Open-source code sandbox goes viral on hacker hubs', status: 'peak' },
        { time: '2 Mins Ago', event: 'Platform builders compile active interface wrappers', status: 'current' }
      ],
      predictionScore: 94
    },
    {
      id: 'pe-local-1',
      title: '📍 Aba Regional Co-Build Meetup',
      pulseScore: 88,
      discussionsCount: 9200,
      communitiesCount: 12,
      countriesCount: 1,
      category: 'local',
      desc: 'Local founders and football enthusiasts sync in Aba for regional hardware acceleration, startup ideation, and community-level unity leagues.',
      trendingScope: 'Trending in Nigeria, Aba Region',
      communities: ['🏟 Aba Inventors Group', '⚽ Football Aba Local', '💼 Eastern Tech Stars'],
      contributors: [
        { name: 'VOICE OF HARRISON', verified: true },
        { name: 'Alex' },
        { name: 'Marcus' }
      ],
      timeline: [
        { time: '2 Days Ago', event: 'Aba co-build venue coordinates declared', status: 'start' },
        { time: 'Yesterday', event: 'Sponsorship micro-funds match peak at +45% threshold', status: 'peak' },
        { time: 'Just Now', event: 'Active registrations and local discussions trending', status: 'current' }
      ],
      predictionScore: 90
    },
    {
      id: 'pe-business-1',
      title: '💼 African Startup Micro-Payments Wave',
      pulseScore: 93,
      discussionsCount: 22000,
      communitiesCount: 88,
      isWorldwide: false,
      countriesCount: 18,
      category: 'business',
      desc: 'A new network architecture is enabling real-time peer-to-peer micro-payments without traditional transaction fees. Spurring regional retail spikes.',
      trendingScope: 'Trending in 18 Countries',
      communities: ['💼 Founders Alliance', '💼 Fintech Pioneers', '🏟 Web3 Builders Hub'],
      contributors: [
        { name: 'David' },
        { name: 'Sarah' },
        { name: 'VOICE OF HARRISON', verified: true }
      ],
      timeline: [
        { time: '3 Days Ago', event: 'Regional micro-transfers protocol draft released', status: 'start' },
        { time: '8 Hours Ago', event: 'Interactive API integrations hit 15k testcases', status: 'peak' },
        { time: 'Just Now', event: 'Live transactions exceed 100k blocks across West Africa', status: 'current' }
      ],
      predictionScore: 95
    },
    {
      id: 'pe-ent-1',
      title: '🎵 Waveform Synthesis Revolution',
      pulseScore: 85,
      discussionsCount: 11000,
      communitiesCount: 32,
      isWorldwide: true,
      category: 'entertainment',
      desc: 'Artists use algorithmic micro-synths to trigger interactive performance loops on decentral audio feeds. Listeners participate real-time.',
      trendingScope: 'Trending Worldwide',
      communities: ['🎵 Audio Architects', '🎵 Generative Waveforms', '🎨 Modern Visualists'],
      contributors: [
        { name: 'Elena' },
        { name: 'Sophia' },
        { name: 'VOICE OF HARRISON', verified: true }
      ],
      timeline: [
        { time: '4 Days Ago', event: 'First web audio generator code published', status: 'start' },
        { time: '1 Day Ago', event: 'Viral loop tracks trending over active social channels', status: 'peak' },
        { time: 'Web Stream', event: 'Thousands tuning into live generative ambient rooms', status: 'current' }
      ],
      predictionScore: 87
    },
    {
      id: 'pe-edu-1',
      title: '📚 Decentralized Learning Protocol Launch',
      pulseScore: 89,
      discussionsCount: 16500,
      communitiesCount: 54,
      isWorldwide: true,
      category: 'education',
      desc: 'Coordinating student groups through secure, peer-verified learning milestones. Earn reputation indices upon curriculum test completion.',
      trendingScope: 'Trending Worldwide',
      communities: ['📚 Global Scholars', '📚 Open Tech Curriculum', '🧠 Premium AI Forge'],
      contributors: [
        { name: 'Sarah' },
        { name: 'David' },
        { name: 'VOICE OF HARRISON', verified: true }
      ],
      timeline: [
        { time: '1 Week Ago', event: 'Syllabus and categories draft written', status: 'start' },
        { time: '3 Days Ago', event: 'Verified learner enrollment reaches 10,000', status: 'peak' },
        { time: 'Just Now', event: 'Certificates issuing using secure reputation updates', status: 'current' }
      ],
      predictionScore: 92
    }
  ];

  // Locations for World Map
  const mapPins = [
    { id: 'pin-lagos', city: 'Lagos', x: 45, y: 64, pulse: 97, info: '⚽ Champions League Screening & Tech Hub Startup Launch', category: 'sports' },
    { id: 'pin-aba', city: 'Aba', x: 47, y: 66, pulse: 88, info: '📍 Aba Regional Co-Build Meetup Group', category: 'local' },
    { id: 'pin-london', city: 'London', x: 44, y: 28, pulse: 94, info: '⚽ Champions League tactical matrices and predictions', category: 'sports' },
    { id: 'pin-tokyo', city: 'Tokyo', x: 84, y: 44, pulse: 91, info: '🧠 Autonomous Neural network breakthroughs live discussion', category: 'tech' },
    { id: 'pin-sanfran', city: 'San Francisco', x: 18, y: 39, pulse: 95, info: '🧠 Open compiler optimization and generative architectures', category: 'tech' },
    { id: 'pin-berlin', city: 'Berlin', x: 49, y: 31, pulse: 85, info: '🎵 Electronic Synthesizer performance wave', category: 'entertainment' },
    { id: 'pin-johannesburg', city: 'Johannesburg', x: 52, y: 82, pulse: 93, info: '💼 Mobile micro-finance and offline banking protocols', category: 'business' }
  ];

  // Active category filter function
  const filteredEvents = useMemo(() => {
    let result = pulseEvents;
    
    // Search query matching (title, description, scope, and communities)
    if (pulseSearch.trim()) {
      const query = pulseSearch.toLowerCase();
      result = result.filter(evt => 
        evt.title.toLowerCase().includes(query) ||
        evt.desc.toLowerCase().includes(query) ||
        evt.trendingScope.toLowerCase().includes(query) ||
        evt.communities.some(c => c.toLowerCase().includes(query))
      );
    }

    // Category routing filter
    if (activeTab === 'trending') return result;
    if (activeTab === 'map') return result; // Special view
    if (activeTab === 'local') return result.filter(e => e.category === 'local');
    if (activeTab === 'sports') return result.filter(e => e.category === 'sports');
    if (activeTab === 'business') return result.filter(e => e.category === 'business');
    if (activeTab === 'tech') return result.filter(e => e.category === 'tech');
    if (activeTab === 'entertainment') return result.filter(e => e.category === 'entertainment');

    return result;
  }, [activeTab, pulseSearch]);

  // VOH AI response triggers (fully interactive)
  const handleAskVoh = async (query: string) => {
    if (!query.trim()) return;
    setVohSearch(query);
    setIsVohThinking(true);

    try {
      // Fetch from the real VOH AI endpoint
      const response = await fetch('/api/voh-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: [],
          context: {
            posts: JSON.parse(localStorage.getItem('nexora_posts') || '[]').slice(0, 5),
            circles: JSON.parse(localStorage.getItem('nexora_db_joined_circles') || '[]'),
            notifications: JSON.parse(localStorage.getItem('nexora_notifications') || '[]')
          }
        })
      });

      const data = await response.json();
      setVohReplies(prev => [{ query, reply: data.text }, ...prev]);
      triggerToast("VOH AI retrieved latest pulse trends!");
    } catch (err) {
      console.error("VOH AI Pulse request failed, using mock:", err);
      let replyText = '';
      const q = query.toLowerCase();

      if (q.includes('nigeria') || q.includes('aba') || q.includes('lagos')) {
        replyText = "🧠 VOH AI Scan: In Nigeria, the Aba Co-Build Meetup (88 Pulse) and Lagos Champions League Fan screening (97 Pulse Score) are currently fueling local community transactions. Startup founder networks are co-building open payment SDKs in Lagos Hubs.";
      } else if (q.includes('football') || q.includes('champions') || q.includes('sports')) {
        replyText = "🧠 VOH AI Scan: Champions League Final is spiking globally on-chain with 35,000 active discussions. Top discussing guilds include '⚽ Football Nigeria' and '⚽ Premier League Fans' with high participant reputation.";
      } else if (q.includes('summarize') || q.includes('pulse') || q.includes('today')) {
        replyText = "🧠 VOH AI Daily Sum: 1. Sports leads today (Champions League 97 PR); 2. Business micro-payments in Sub-Saharan Africa expand rapidly (+18 countries); 3. Tech pioneers launch on-device Neural Alignment guides worldwide.";
      } else if (q.includes('startup') || q.includes('founder') || q.includes('business')) {
        replyText = "🧠 VOH AI Scan: Startup founders are actively discussing real-time micro-payments without service fees. Curated communities like '💼 Founders Alliance' are holding interactive testing forums right now.";
      } else if (q.includes('ai') || q.includes('breakthrough') || q.includes('tech')) {
        replyText = "🧠 VOH AI Scan: Responsive user interface layers are hot worldwide. 45 communities are actively analyzing code blueprints.";
      } else {
        replyText = `🧠 VOH AI Scan for '${query}': Activity streams show positive social spark trends (+15% momentum). Relevant tags found in 'Technology' and 'Sports' with stable growth index. Ask me about football, AI, or today's pulse summary!`;
      }

      setVohReplies(prev => [{ query, reply: replyText }, ...prev]);
      triggerToast("VOH AI retrieved latest pulse trends!");
    } finally {
      setIsVohThinking(false);
    }
  };

  // World Pulse Alert toggler
  const handleToggleAlert = (topic: string) => {
    if (followedAlerts.includes(topic)) {
      setFollowedAlerts(prev => prev.filter(t => t !== topic));
      triggerToast(`Muted immediate alerts for ${topic}`);
    } else {
      setFollowedAlerts(prev => [...prev, topic]);
      triggerToast(`Alert enabled! You'll receive instant trending updates for ${topic}`);
    }
  };

  // Add Comment strictly inside a specific event discussion
  const handleAddComment = () => {
    if (!newCommentText.trim() || !activeDiscussion) return;
    setDiscussionComments(prev => [
      ...prev,
      { user: 'you_builder_voh', text: newCommentText, rep: 25 }
    ]);
    setNewCommentText('');
    triggerToast("Post shared to trend feed!");
  };

  return (
    <div id="nexora-world-pulse-root" className="space-y-6 text-left select-none relative pb-10">
      
      {/* Dynamic Toast Feedback Overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 left-1/4 right-1/4 md:left-auto md:right-10 bg-linear-to-r from-cyan-950/90 to-blue-900/90 border border-cyan-500/30 text-white font-sans text-xs px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md z-50 text-center"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="border-b border-violet-500/10 pb-4">
        <h2 className="text-xl font-black font-sans text-white flex items-center gap-2 tracking-tight">
          <span className="text-xl">🌍</span> World Pulse
        </h2>
        <p className="text-xs text-violet-300/60 mt-0.5">
          Discover what the world is discussing right now.
        </p>
      </div>

      {/* SEARCH BAR & QUICK TAGS */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-violet-400/40" />
          <input 
            type="text"
            placeholder="Search trends, places, events, communities..."
            value={pulseSearch}
            onChange={(e) => setPulseSearch(e.target.value)}
            className="w-full pl-12 pr-5 py-3 rounded-2xl bg-black/40 border border-violet-500/10 focus:outline-none focus:border-cyan-500/35 focus:bg-[#070514] transition-all font-sans text-xs text-white placeholder:text-violet-400/30"
          />
          {pulseSearch && (
            <button 
              onClick={() => setPulseSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Clicking Tag Examples */}
        <div className="flex flex-wrap items-center gap-1.5 px-0.5">
          <span className="text-[10px] font-mono text-violet-400/35 uppercase mr-1">Trending Tags:</span>
          {['Football', 'Nigeria', 'AI', 'Elections', 'Music', 'Startups'].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setPulseSearch(tag);
                triggerToast(`Searching for active trend: ${tag}`);
              }}
              className="px-2.5 py-1 rounded-xl bg-violet-500/5 hover:bg-violet-500/15 border border-violet-500/10 hover:border-violet-500/20 text-[10px] font-sans text-violet-300 transition-all cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* TOP FILTERS - CATEGORY TABS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none border-b border-violet-500/5 items-center">
        {[
          { id: 'trending', label: '🔥 Trending' },
          { id: 'map', label: '🗺 Map' },
          { id: 'sports', label: '⚽ Sports' },
          { id: 'business', label: '💼 Business' },
          { id: 'tech', label: '🧠 Technology' },
          { id: 'entertainment', label: '🎵 Entertainment' },
          { id: 'local', label: '📍 Local' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedPin(null);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-sans font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
                isActive 
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 font-extrabold' 
                  : 'bg-transparent border-transparent text-violet-400/60 hover:text-white hover:bg-violet-500/5'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* VOH AI INSIDE PULSE MODULE */}
      <div className="p-4 rounded-3xl bg-linear-to-tr from-[#09071c] to-[#04020a] border border-violet-500/15 space-y-3.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <Brain className="w-4 h-4 text-violet-400 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest font-black text-violet-300">VOH AI Pulse Agent</span>
              <p className="text-[10px] text-violet-300/40">Query community trends and upcoming topic analytics</p>
            </div>
          </div>
          <span className="text-[9px] font-mono bg-violet-500/10 text-violet-300 border border-violet-500/15 px-2 py-0.5 rounded-md uppercase font-black tracking-tight">Active Core</span>
        </div>

        {/* Dynamic input bar to Ask VOH */}
        <div className="flex items-center gap-2">
          <input 
            type="text"
            placeholder="Ask VOH AI: What is trending in Nigeria?..."
            value={vohSearch}
            onChange={(e) => setVohSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskVoh(vohSearch);
            }}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-violet-500/10 hover:border-violet-500/20 focus:outline-none focus:border-violet-500/35 text-xs text-white placeholder:text-violet-400/30 text-left font-sans"
          />
          <button
            onClick={() => handleAskVoh(vohSearch)}
            disabled={isVohThinking}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 disabled:opacity-50 text-xs font-sans font-bold text-white transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>Ask VOH</span>
          </button>
        </div>

        {/* Predefined clicking templates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
          <button 
            onClick={() => handleAskVoh("What's trending in Nigeria?")}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-violet-500/5 hover:border-violet-500/20 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="truncate">"What's trending in Nigeria?"</span>
          </button>
          
          <button 
            onClick={() => handleAskVoh("Summarize today's Pulse.")}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-violet-500/5 hover:border-violet-500/20 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="truncate">"Summarize today's Pulse."</span>
          </button>

          <button 
            onClick={() => handleAskVoh("Show football discussions.")}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-violet-500/5 hover:border-violet-500/20 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" />
            <span className="truncate">"Show football discussions."</span>
          </button>

          <button 
            onClick={() => handleAskVoh("What are startup founders discussing?")}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-violet-500/5 hover:border-violet-500/20 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" />
            <span className="truncate">"What are startup founders discussing?"</span>
          </button>
        </div>

        {/* Dynamic chat replies logs rendering */}
        <AnimatePresence>
          {isVohThinking && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 rounded-2xl bg-black/50 border border-violet-500/10 text-xs text-violet-400 font-mono flex items-center gap-2 animate-pulse"
            >
              <Brain className="w-4 h-4 text-violet-400 animate-spin" />
              <span>VOH AI is thinking...</span>
            </motion.div>
          )}
          {vohReplies.map((log, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-black/50 border border-violet-500/10 text-xs text-violet-100 font-sans leading-relaxed space-y-1 text-left relative"
            >
              <div className="text-[9px] font-mono text-cyan-400 font-bold">Query: "{log.query}"</div>
              <div>{log.reply}</div>
              <button 
                onClick={() => setVohReplies(prev => prev.filter((_, i) => i !== idx))}
                className="absolute top-2 right-2 text-violet-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* INTERACTIVE GEOGRAPHIC VECTOR MAP TAB */}
      <AnimatePresence mode="wait">
        {(activeTab === 'map') && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Interactive map Zoom levels header buttons */}
            <div className="flex items-center justify-between p-3 bg-black/40 border border-violet-500/10 rounded-2xl text-xs font-mono">
              <span className="text-violet-300 font-black uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400 animate-spin" style={{ animationDuration: '6s' }} />
                Interactive Global Map
              </span>
              <div className="flex items-center gap-1 bg-black/50 p-1 rounded-xl border border-violet-500/5">
                {(['world', 'country', 'state', 'city'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      setZoomLevel(level);
                      triggerToast(`Map adjusted focusing on ${level.toUpperCase()} parameters.`);
                    }}
                    className={`px-2 py-1 text-[10px] font-sans font-bold rounded-lg uppercase tracking-wide transition-all cursor-pointer ${
                      zoomLevel === level 
                        ? 'bg-violet-600 text-white font-black' 
                        : 'text-violet-400 hover:text-white'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Graphic Map Card Wrapper */}
            <div className="relative aspect-video rounded-3xl overflow-hidden bg-black/60 border border-violet-500/15 p-4 flex flex-col justify-between shadow-2xl">
              <div className="absolute inset-0 z-0 opacity-40 overflow-hidden">
                <motion.div 
                  animate={{ 
                    scale: zoomLevel === 'world' ? 1 : zoomLevel === 'country' ? 1.6 : zoomLevel === 'state' ? 2.4 : 3.5,
                    x: selectedPin ? -10 : 0,
                    y: selectedPin ? -10 : 0
                  }}
                  className="w-full h-full relative"
                  transition={{ type: 'spring', stiffness: 70 }}
                >
                  {/* Grid network */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(139,92,246,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.06)_1px,transparent_1px)] bg-[size:20px_20px]" />
                  
                  {/* Outer SVG contours mapping world vectors */}
                  <svg className="absolute inset-0 w-full h-full text-violet-500/10 stroke-current fill-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <path d="M 5,20 C 15,10 32,15 45,25 C 55,30 68,12 85,18 C 95,22 92,42 82,58 C 72,70 54,82 32,80 C 15,78 2,45 5,20 Z" strokeWidth="0.5" strokeDasharray="1 1" />
                    <path d="M 22,50 C 32,55 45,48 58,60 C 68,68 78,58 88,52" strokeWidth="0.3" />
                  </svg>

                  {/* Render Map pins */}
                  {mapPins.map((pin) => {
                    const isSelected = selectedPin === pin.id;
                    return (
                      <div
                        key={pin.id}
                        style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 group cursor-pointer"
                        onClick={() => setSelectedPin(pin.id)}
                      >
                        <span className="relative flex h-6 w-6 items-center justify-center">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-50 ${isSelected ? 'scale-150 bg-violet-400' : ''}`} />
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 border border-white ${isSelected ? 'bg-violet-400' : 'bg-cyan-400'}`} />
                        </span>
                        
                        <div className={`mt-1 text-[8px] font-mono tracking-tight border px-1.5 py-0.5 rounded-md shadow-lg transition-all ${
                          isSelected 
                            ? 'bg-violet-900 border-violet-400 font-extrabold text-white' 
                            : 'bg-black/80 border-cyan-500/20 text-cyan-300'
                        }`}>
                          📍 {pin.city} ({pin.pulse} PR)
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              </div>

              {/* Vector Map Overlay labels */}
              <div className="z-10 text-[9px] font-mono text-violet-400/30 flex justify-between uppercase tracking-widest w-full">
                <span>📍 ACTIVE TRENDS REGISTERED</span>
                <span>GLOBAL TREND MAP</span>
              </div>

              {/* Selected pin display bubble */}
              <div className="z-10 mt-auto">
                {selectedPin ? (
                  (() => {
                    const pin = mapPins.find(p => p.id === selectedPin);
                    if (!pin) return null;
                    return (
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3.5 bg-black/90 border border-violet-500/20 rounded-2xl max-w-sm text-left shadow-2xl relative"
                      >
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPin(null);
                          }}
                          className="absolute top-2.5 right-2.5 text-violet-400 hover:text-white transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[9px] font-mono font-black px-1.5 py-0.5 bg-violet-500/20 text-violet-300 border border-violet-500/10 uppercase rounded">
                            {pin.category} Event
                          </span>
                          <span className="text-[10px] text-cyan-400 font-mono font-bold">Pulse Score: {pin.pulse}</span>
                        </div>
                        <h4 className="text-xs font-bold text-white font-sans">{pin.city} Community Activity</h4>
                        <p className="text-[11px] font-sans text-violet-200/80 mt-1 leading-relaxed">{pin.info}</p>
                        
                        {/* Action trigger */}
                        <div className="mt-2.5 flex gap-2">
                          <button 
                            onClick={() => {
                              const match = pulseEvents.find(e => e.city?.toLowerCase() === pin.city.toLowerCase() || e.category === pin.category);
                              if (match) {
                                setActiveDiscussion(match);
                                triggerToast(`Connecting to conversation for ${pin.city}`);
                              } else {
                                triggerToast(`Live network stream connected successfully to ${pin.city} area`);
                              }
                            }}
                            className="text-[9.5px] font-sans font-extrabold text-[#7C3AED] hover:underline cursor-pointer flex items-center gap-1 uppercase"
                          >
                            <span>View Discussions</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })()
                ) : (
                  <div className="p-3.5 bg-slate-950/80 border border-violet-500/5 backdrop-blur-md rounded-2xl max-w-xs text-left">
                    <span className="text-[8px] font-mono text-cyan-300 font-extrabold tracking-widest uppercase block mb-1">
                      ● FEED ADVISORY
                    </span>
                    <p className="text-[11px] font-sans text-violet-200/50 leading-relaxed">
                      Click any pulse coordinate indicator pin on the map to filter and view specific community discussions.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TRENDING SECTION - PULSE CARDS LIST */}
      {activeTab !== 'map' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-mono font-black text-violet-300/60 uppercase tracking-widest">
              📈 ACTIVE TRENDS ({filteredEvents.length})
            </h3>
            <span className="text-[10px] font-mono text-violet-400/40">Sorted by Pulse Momentum</span>
          </div>

          <div className="space-y-4">
            {filteredEvents.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-violet-500/10 bg-black/20 space-y-3">
                <Globe className="w-8 h-8 text-violet-400/20 mx-auto" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">🌍 World Pulse is Quiet</h4>
                <p className="text-[11px] text-violet-300/40 max-w-xs mx-auto font-sans leading-relaxed">
                  Check back later to see what people are discussing, or clear your query criteria to view active trending topics.
                </p>
                {pulseSearch && (
                  <button 
                    onClick={() => setPulseSearch('')}
                    className="mt-1 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-[10px] font-mono font-black text-white cursor-pointer uppercase transition-all"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              filteredEvents.map((evt) => (
                <div 
                  key={evt.id} 
                  className="p-5 rounded-3xl bg-black/40 border border-violet-500/10 hover:border-violet-500/25 transition-all text-left space-y-4 relative overflow-hidden group hover:bg-[#070514]/70"
                >
                  {/* Pulse Score gauge design */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center flex-wrap gap-2">
                        <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/10 uppercase">
                          {evt.category} Event
                        </span>
                        <span className="text-[10.5px] font-mono text-cyan-400 font-bold flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                          {evt.trendingScope}
                        </span>
                      </div>
                      <h4 className="text-sm font-extrabold text-white leading-snug font-sans group-hover:text-cyan-300 transition-colors">
                        {evt.title}
                      </h4>
                    </div>

                    {/* Highly polished score metrics badge */}
                    <div className="text-right shrink-0">
                      <div className="px-3 py-1.5 rounded-2xl bg-linear-to-tr from-cyan-950/40 to-violet-950/40 border border-cyan-500/20 flex flex-col items-center">
                        <span className="text-xs font-mono font-black text-cyan-300 tracking-tighter">PULSE</span>
                        <span className="text-lg font-black text-white leading-none mt-0.5">{evt.pulseScore}</span>
                      </div>
                      <span className="text-[8.5px] font-mono text-violet-400/40 mt-1 block uppercase">
                        {evt.discussionsCount.toLocaleString()} Sparks
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-violet-100/70 leading-relaxed font-sans">
                    {evt.desc}
                  </p>

                  {/* Communities Involved Row */}
                  <div className="p-3 bg-linear-to-r from-violet-950/15 to-[#05030d] border border-violet-500/5 rounded-2xl space-y-1.5">
                    <span className="text-[9px] font-mono text-violet-400/50 uppercase tracking-widest font-black block">🏟 Communities Involved ({evt.communitiesCount}+)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {evt.communities.map((comm, idx) => (
                        <span 
                          key={idx}
                          className="px-2.5 py-1 rounded-xl bg-violet-500/5 text-[10px] font-sans text-violet-300 font-bold border border-violet-500/5"
                        >
                          {comm}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Contributors / Action bottom align */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-violet-500/5 mt-1 text-xs">
                    
                    {/* Notable contributors list */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-violet-300/40 font-mono">Trending Contributors:</span>
                      <div className="flex items-center -space-x-2">
                        {evt.contributors.map((contrib, cidx) => (
                          <div 
                            key={cidx} 
                            className="w-6 h-6 rounded-lg bg-violet-500/20 border border-[#0d0a21] text-white flex items-center justify-center font-bold text-[9px] font-sans shrink-0 uppercase relative"
                            title={contrib.name}
                          >
                            {contrib.name.slice(0, 2)}
                            {contrib.verified && (
                              <span className="absolute -top-1 -right-1 w-2 h-2 bg-purple-500 rounded-full border border-black" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Trigger Interaction modal */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setActiveDiscussion(evt);
                          triggerToast("Trending conversation loaded");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-[10.5px] font-sans font-bold text-white transition-all cursor-pointer flex items-center gap-1 uppercase"
                      >
                        <span>View Discussion</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* WORLD PULSE ALERTS CONFIG BOX */}
      <div className="p-4 rounded-3xl bg-black/40 border border-violet-500/10 space-y-3">
        <div className="flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono uppercase tracking-widest font-black text-cyan-300">Trend Notifications</span>
        </div>
        <p className="text-[11px] text-violet-100/60 leading-relaxed">
          Toggle topics to receive instant World Pulse notifications and updates as critical trending indices trigger.
        </p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {['⚽ Football', '🧠 AI', '💼 Business', '🎮 Gaming', '🎵 Music'].map((topic) => {
            const isFollowed = followedAlerts.includes(topic);
            return (
              <button
                key={topic}
                onClick={() => handleToggleAlert(topic)}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-sans font-bold transition-all cursor-pointer ${
                  isFollowed 
                    ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 font-extrabold' 
                    : 'bg-transparent border-violet-500/5 text-violet-400/40 hover:text-white'
                }`}
              >
                <span>{topic}</span>
                {isFollowed && <span className="ml-1.5 text-[9px] text-emerald-400 font-black">✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* POLISHED FUTURE CAPABILITIES EXTRA METRIC PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        
        {/* Trend Timeline explanation */}
        <div className="p-4 rounded-3xl bg-linear-to-tr from-[#080616] to-[#04030a] border border-violet-500/10 flex flex-col justify-between text-left space-y-3 leading-relaxed">
          <div className="space-y-1">
            <span className="text-xs font-mono font-black uppercase text-violet-400 tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              Trend Timeline Map
            </span>
            <p className="text-[10.5px] text-violet-100/60 font-sans">
              Visually trace chronological trending milestones from initial triggers up to maximum societal momentum spikes.
            </p>
          </div>
          <div className="text-[9.5px] font-mono text-cyan-400/40 border-t border-violet-500/5 pt-2 uppercase">
            ⚡ Chrono-Tracing Active
          </div>
        </div>

        {/* Trend Prediction explanation */}
        <div className="p-4 rounded-3xl bg-linear-to-tr from-[#080616] to-[#04030a] border border-violet-500/10 flex flex-col justify-between text-left space-y-3 leading-relaxed">
          <div className="space-y-1">
            <span className="text-xs font-mono font-black uppercase text-pink-400 tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
              AI Trend Predictive Index
            </span>
            <p className="text-[10.5px] text-violet-100/60 font-sans">
              VOH AI parses emerging regional data points to predict upcoming viral discussions days before aggregate social channels catch up.
            </p>
          </div>
          <div className="text-[9.5px] font-mono text-pink-400/40 border-t border-violet-500/5 pt-2 uppercase">
            ⚡ Predict Engine Loaded
          </div>
        </div>

      </div>

      {/* DETAILED ACTIVE STREAM DISCUSSION INTERACTIVE MODAL PANEL */}
      <AnimatePresence>
        {activeDiscussion && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="w-full max-w-2xl bg-[#09071c] border border-violet-500/25 rounded-3xl p-5 md:p-6 shadow-2xl relative max-h-[85vh] overflow-y-auto no-scrollbar space-y-5"
            >
              <button 
                onClick={() => setActiveDiscussion(null)}
                className="absolute top-4 right-4 text-violet-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title Header */}
              <div className="space-y-1 text-left border-b border-violet-500/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono font-black bg-cyan-500/15 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded uppercase">
                    Active Trend Loop
                  </span>
                  <span className="text-[10.5px] font-mono text-violet-400 font-bold">Pulse Score Level: {activeDiscussion.pulseScore}</span>
                </div>
                <h3 className="text-base font-black text-white font-sans">{activeDiscussion.title}</h3>
                <p className="text-[11px] text-violet-300/50">Tracking across {activeDiscussion.trendingScope}</p>
              </div>

              {/* Trend Timeline visualization widget */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono font-black text-violet-400/60 uppercase tracking-widest block text-left">⚡ Event Chrono Status</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {activeDiscussion.timeline.map((item, idx) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-2xl font-sans text-xs flex flex-col justify-between ${
                        item.status === 'current' 
                          ? 'bg-violet-950/30 border border-violet-500/25 text-white' 
                          : 'bg-black/40 border border-violet-500/5 text-violet-100/50'
                      }`}
                    >
                      <span className="text-[9px] font-mono text-cyan-400/50 uppercase block mb-1">{item.time}</span>
                      <p className="font-sans leading-relaxed text-[10.5px]">{item.event}</p>
                      <span className="text-[8px] font-mono mt-2 uppercase font-black tracking-widest text-violet-400 block border-t border-violet-500/5 pt-1">
                        ● {item.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top discussing communities */}
              <div className="p-3 bg-black/40 border border-violet-500/5 rounded-2xl text-left space-y-1.5">
                <span className="text-[10px] font-mono text-violet-400/50 uppercase tracking-widest block">🎯 Primary Communities Channeling This</span>
                <div className="flex flex-wrap gap-1.5">
                  {activeDiscussion.communities.map((c, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 rounded-xl bg-violet-500/10 border border-violet-500/15 text-xs text-white"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Predictive timeline meter gauge */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-violet-950/20 to-black/20 border border-pink-500/15 flex justify-between items-center text-xs">
                <div>
                  <span className="text-pink-300 font-mono text-[10px] uppercase font-black tracking-widest block">AI Growth Prediction Wave</span>
                  <p className="text-[10.5px] text-violet-100/60 mt-0.5 font-sans leading-relaxed">VOH AI model predicts a +14% momentum spike over next 12 hours</p>
                </div>
                <div className="text-center font-mono text-pink-400 font-extrabold pb-0.5">
                  <span className="text-lg font-black block leading-none">{activeDiscussion.predictionScore}%</span>
                  <span className="text-[8px] uppercase tracking-tighter block text-[9px] text-pink-400/50 mt-1">confidence index</span>
                </div>
              </div>

              {/* Comment discussion feed threads */}
              <div className="space-y-3 text-left">
                <span className="text-[10px] font-mono font-black text-violet-400/60 uppercase tracking-widest block">💬 Dialogue Stream</span>
                
                <div className="space-y-2 max-h-[160px] overflow-y-auto no-scrollbar">
                  {discussionComments.map((com, cidx) => (
                    <div key={cidx} className="p-3 bg-[#04020a]/80 border border-violet-500/5 rounded-2xl text-xs font-sans space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-white">@{com.user}</span>
                        <span className="text-[8.5px] font-mono text-violet-400/40">{com.rep} PR</span>
                      </div>
                      <p className="text-violet-100/70">{com.text}</p>
                    </div>
                  ))}
                </div>

                {/* Reply box */}
                <div className="flex gap-2 pt-1">
                  <input 
                    type="text"
                    placeholder="Type your comment to join discussion..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddComment();
                    }}
                    className="flex-1 px-3.5 py-2 rounded-xl bg-black/40 border border-violet-500/10 focus:outline-none focus:border-violet-500/35 text-xs text-white placeholder:text-violet-400/30 text-left font-sans"
                  />
                  <button
                    onClick={handleAddComment}
                    className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 font-bold text-xs text-white uppercase text-center transition-all cursor-pointer"
                  >
                    Spark
                  </button>
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2 border-t border-violet-500/5 flex justify-end">
                <button
                  onClick={() => setActiveDiscussion(null)}
                  className="px-4 py-2 rounded-xl border border-violet-500/10 bg-black/40 hover:bg-violet-500/10 text-xs font-mono font-black text-violet-300 uppercase transition-all"
                >
                  Close Discussion
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
