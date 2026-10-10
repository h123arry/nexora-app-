import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Map, Search, Bell, X, Brain, ArrowRight } from 'lucide-react';
import VohIcon from './VohIcon';

export interface WorldPulseViewProps {
  theme: string;
}

export default function WorldPulseView({ theme }: WorldPulseViewProps) {
  const [pulseSearch, setPulseSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'map' | 'sports' | 'business' | 'tech' | 'entertainment' | 'education' | 'local'>('trending');
  
  // VOH AI interactive module
  const [vohSearch, setVohSearch] = useState('');
  const [vohReplies, setVohReplies] = useState<{ query: string; reply: string }[]>([]);
  const [isVohThinking, setIsVohThinking] = useState(false);

  // User interactive states
  const [followedAlerts, setFollowedAlerts] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

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

      if (!response.ok) throw new Error('VOH AI request failed');
      const data = await response.json();
      const responseText = data.isDemo
        ? 'VOH AI demo mode is active. It cannot verify current Nexora activity.'
        : data.text;
      setVohReplies(prev => [{ query, reply: responseText || 'No response was returned.' }, ...prev]);
    } catch (err) {
      console.error("VOH AI Pulse request failed:", err);
      setVohReplies(prev => [{ query, reply: 'VOH AI could not reach the service. Check your connection and try again.' }, ...prev]);
    } finally {
      setIsVohThinking(false);
    }
  };

  // World Pulse Alert toggler
  const handleToggleAlert = (topic: string) => {
    if (followedAlerts.includes(topic)) {
      setFollowedAlerts(prev => prev.filter(t => t !== topic));
      triggerToast(`Removed ${topic} from this session's topic preferences. No alerts are delivered yet.`);
    } else {
      setFollowedAlerts(prev => [...prev, topic]);
      triggerToast(`Selected ${topic} for this session. Alert delivery is not connected yet.`);
    }
  };



  return (
    <div id="nexora-world-pulse-root" className="nx-surface space-y-6 rounded-2xl p-4 sm:p-5 text-left select-none relative pb-10">
      
      {/* Dynamic Toast Feedback Overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 left-1/4 right-1/4 md:left-auto md:right-10 bg-linear-to-r from-cyan-950/90 to-blue-900/90 border border-cyan-500/30 text-white font-sans text-xs px-4 py-3 rounded-2xl shadow-md backdrop-blur-md z-50 text-center"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-xl font-black font-sans text-white flex items-center gap-2 tracking-tight">
          <span className="text-xl">🌍</span> World Pulse
        </h2>
        <p className="text-xs text-violet-300/60 mt-0.5">
          Live activity aggregation is not connected yet. No sample events or metrics are shown.
        </p>
      </div>

      {/* SEARCH BAR & QUICK TAGS */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-violet-400/40" />
          <input 
            type="text"
            placeholder="Search World Pulse topics..."
            value={pulseSearch}
            onChange={(e) => setPulseSearch(e.target.value)}
            className="nx-field min-h-12 w-full pl-12 pr-5 py-3 font-sans text-xs focus:border-cyan-500/50 focus:bg-[#070514]"
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
          <span className="text-[10px] font-mono text-violet-400/60 uppercase mr-1">Explore topics:</span>
          {['Football', 'Nigeria', 'AI', 'Elections', 'Music', 'Startups'].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setPulseSearch(tag);
              }}
              className="px-2.5 py-1 rounded-xl bg-violet-500/5 hover:bg-violet-500/15 border border-white/10 hover:border-white/10 text-[10px] font-sans text-violet-300 transition-all cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* TOP FILTERS - CATEGORY TABS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none border-b border-white/10 items-center">
        {[
          { id: 'trending', label: 'Activity' },
          { id: 'map', label: 'Map' },
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
              }}
              className={`min-h-11 flex items-center gap-1.5 px-3.5 py-2 text-xs font-sans font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
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
      <div className="p-4 rounded-3xl bg-linear-to-tr from-[#09071c] to-[#04020a] border border-white/10 space-y-3.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-violet-500/10 border border-white/10">
              <VohIcon size={18} animated glow variant="brand" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest font-black text-violet-300">VOH AI assistant</span>
              <p className="text-[10px] text-violet-300/40">VOH does not receive live World Pulse activity data.</p>
            </div>
          </div>
          <span className="text-[9px] font-mono bg-violet-500/10 text-violet-300 border border-white/10 px-2 py-0.5 rounded-md uppercase font-black tracking-tight">AI service</span>
        </div>

        {/* Dynamic input bar to Ask VOH */}
        <div className="flex items-center gap-2">
          <input 
            type="text"
            placeholder="Ask VOH AI about a topic (not live activity)..."
            value={vohSearch}
            onChange={(e) => setVohSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskVoh(vohSearch);
            }}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-white/10 focus:outline-none focus:border-white/10 text-xs text-white placeholder:text-violet-400/30 text-left font-sans"
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
            onClick={() => handleAskVoh('What makes a strong community?')}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-white/10 hover:border-white/10 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="truncate">"What makes a strong community?"</span>
          </button>
          
          <button 
            onClick={() => handleAskVoh('Help me write an engaging post.')}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-white/10 hover:border-white/10 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="truncate">"Help me write an engaging post."</span>
          </button>

          <button 
            onClick={() => handleAskVoh('Suggest questions for a sports discussion.')}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-white/10 hover:border-white/10 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" />
            <span className="truncate">"Suggest questions for a sports discussion."</span>
          </button>

          <button 
            onClick={() => handleAskVoh('How can a new creator find an audience?')}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-white/10 hover:border-white/10 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" />
            <span className="truncate">"How can a new creator find an audience?"</span>
          </button>
        </div>

        {/* Dynamic chat replies logs rendering */}
        <AnimatePresence>
          {isVohThinking && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs text-violet-400 font-mono flex items-center gap-2 animate-pulse"
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
              className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs text-violet-100 font-sans leading-relaxed space-y-1 text-left relative"
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

      {/* Map view: no sample locations are shown without trusted live aggregation. */}
      {activeTab === 'map' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="nx-surface rounded-3xl p-8 text-center">
          <Map className="mx-auto h-8 w-8 text-violet-300/50" />
          <h3 className="mt-3 text-sm font-semibold text-white">Location activity is not available yet</h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-400">Live, privacy-respecting location aggregation is not connected. No sample pins or activity are shown.</p>
        </motion.div>
      )}

      {activeTab !== 'map' && (
        <section className="nx-surface space-y-3 rounded-3xl p-8 text-center">
          <Globe className="mx-auto h-8 w-8 text-violet-400/40" />
          <h3 className="text-sm font-semibold text-white">No live activity to show yet</h3>
          <p className="mx-auto max-w-md text-xs leading-relaxed text-zinc-400">World Pulse will show real activity when a trusted aggregation service is connected. No sample events, rankings, or pulse scores are displayed.</p>
          {pulseSearch && (
            <button type="button" onClick={() => setPulseSearch('')} className="min-h-11 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white hover:bg-violet-500">Clear search</button>
          )}
        </section>
      )}

      {/* WORLD PULSE ALERTS CONFIG BOX */}
      <div className="p-4 rounded-3xl bg-black/40 border border-white/10 space-y-3">
        <div className="flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono uppercase tracking-widest font-black text-cyan-300">Topic preferences</span>
        </div>
        <p className="text-[11px] text-violet-100/60 leading-relaxed">
          Topic selections are kept for this screen session only. Alert delivery is not connected yet.
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
                    : 'bg-transparent border-white/10 text-violet-400/40 hover:text-white'
                }`}
              >
                <span>{topic}</span>
                {isFollowed && <span className="ml-1.5 text-[9px] text-emerald-400 font-black">✓</span>}
              </button>
            );
          })}
        </div>
      </div>


    </div>
  );
}
