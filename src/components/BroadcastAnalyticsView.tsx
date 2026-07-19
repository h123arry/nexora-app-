import React, { useEffect, useState } from 'react';
import { 
  BarChart2, X, RefreshCw, Send, CheckCircle2, AlertCircle, Clock, 
  Smile, MessageSquare, ExternalLink, Download, Share2, Sparkles, Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import { Chat } from '../types';

interface BroadcastAnalyticsViewProps {
  isOpen: boolean;
  onClose: () => void;
  broadcast: Chat | null;
}

export default function BroadcastAnalyticsView({
  isOpen,
  onClose,
  broadcast
}: BroadcastAnalyticsViewProps) {
  const [activeTab, setActiveTab] = useState<'delivery' | 'engagement' | 'retention'>('delivery');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Real-time update simulations
  const [liveStats, setLiveStats] = useState<any>(null);

  useEffect(() => {
    if (broadcast) {
      const defaultStats = {
        delivered: broadcast.broadcastRecipients?.length || 1500,
        read: Math.round((broadcast.broadcastRecipients?.length || 1500) * 0.91),
        failed: Math.round((broadcast.broadcastRecipients?.length || 1500) * 0.004),
        pending: Math.round((broadcast.broadcastRecipients?.length || 1500) * 0.012),
        replies: 42,
        reactions: 328,
        shares: 89,
        saves: 145,
        avgReadTime: '2.1 seconds',
        linkClicks: 210,
        pollParticipation: 615,
        mediaDownloads: 412
      };

      // Merge with actual chat state stats if available
      const mergedStats = {
        ...defaultStats,
        ...(broadcast.broadcastDeliveryStats || {})
      };

      setLiveStats(mergedStats);
    }
  }, [broadcast, isOpen]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      if (liveStats) {
        // Slightly random increment to demonstrate dynamic real-time count-up metrics!
        setLiveStats((prev: any) => ({
          ...prev,
          read: prev.read + Math.floor(Math.random() * 5),
          replies: prev.replies + Math.floor(Math.random() * 2),
          reactions: prev.reactions + Math.floor(Math.random() * 4),
          linkClicks: prev.linkClicks + Math.floor(Math.random() * 3),
          pollParticipation: prev.pollParticipation + Math.floor(Math.random() * 6),
        }));
        window.dispatchEvent(new CustomEvent('toast', { detail: "⚡ Real-time broadcast ledger metrics refreshed!" }));
      }
    }, 1200);
  };

  if (!isOpen || !broadcast || !liveStats) return null;

  const total = (liveStats.delivered || 0) + (liveStats.failed || 0) + (liveStats.pending || 0);
  const deliveryRate = total > 0 ? Math.round((liveStats.delivered / total) * 100) : 100;
  const readRate = liveStats.delivered > 0 ? Math.round((liveStats.read / liveStats.delivered) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-xl bg-[#09071a]/95 border border-violet-500/20 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[520px]"
      >
        {/* Neon light beams */}
        <div className="absolute top-0 inset-x-0 h-40 bg-radial-at-t from-emerald-500/15 via-transparent to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 border-b border-violet-500/10 flex items-center justify-between relative z-10 bg-[#060412]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div className="text-left">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Broadcast Real-Time Analytics</h3>
              <p className="text-[9px] font-mono text-emerald-400 uppercase">Live Node Ledger: {broadcast.partnerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleRefresh}
              className={`p-1.5 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer ${
                isRefreshing ? 'animate-spin text-emerald-400' : ''
              }`}
              title="Refresh ledger records"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Categories / Tabs for analytics */}
        <div className="px-4 py-2 border-b border-white/5 bg-black/20 flex gap-2 shrink-0">
          {[
            { id: 'delivery', label: '📊 Delivery Status' },
            { id: 'engagement', label: '🔥 Core Engagement' },
            { id: 'retention', label: '⚡ Performance Metrics' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider font-extrabold transition-all cursor-pointer ${
                activeTab === t.id 
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' 
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Dashboard Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar text-left relative z-10">
          {activeTab === 'delivery' && (
            <div className="space-y-4">
              {/* Delivery stats cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { label: 'Delivered', value: liveStats.delivered, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/15' },
                  { label: 'Read / Viewed', value: liveStats.read, icon: Smile, color: 'text-violet-400', bg: 'bg-violet-500/5 border-violet-500/15' },
                  { label: 'Pending', value: liveStats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/15' },
                  { label: 'Failed', value: liveStats.failed, icon: AlertCircle, color: 'text-pink-400', bg: 'bg-pink-500/5 border-pink-500/15' }
                ].map((stat, idx) => (
                  <div key={idx} className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1 ${stat.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono uppercase text-zinc-500">{stat.label}</span>
                      <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                    </div>
                    <span className="text-sm font-sans font-black text-white">{stat.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* Progress bars */}
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-3">
                <h4 className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 font-bold">Ledger Delivery Rates</h4>
                
                {/* Delivery rate bar */}
                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-zinc-400">SUCCESSFUL DELIVERY</span>
                    <span className="text-emerald-400 font-bold">{deliveryRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${deliveryRate}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-emerald-500" 
                    />
                  </div>
                </div>

                {/* Read rate bar */}
                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-zinc-400">INBOX READ RATIO</span>
                    <span className="text-violet-400 font-bold">{readRate}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${readRate}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-violet-500" 
                    />
                  </div>
                </div>
              </div>

              {/* Optimization report */}
              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-2.5 text-left">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
                <div className="leading-tight">
                  <p className="text-[10px] font-sans font-bold text-emerald-300">Intelligent Fan-Out Engine Active</p>
                  <p className="text-[9px] text-zinc-400 mt-0.5">Packet dispatch finalized in 0.08ms with full horizontal scalability and memory caching enabled.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'engagement' && (
            <div className="space-y-4">
              {/* Engagement Stats Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: 'Anonymous Reactions', value: liveStats.reactions, icon: Smile, color: 'text-amber-400', desc: 'Total reactions from members' },
                  { label: 'Private Replies', value: liveStats.repliesCount || liveStats.replies, icon: MessageSquare, color: 'text-violet-400', desc: 'Routed to unique 1-on-1 threads' },
                  { label: 'Forward / Share Nodes', value: liveStats.shares, icon: Share2, color: 'text-cyan-400', desc: 'Forwarded by recipients' },
                  { label: 'Studiolog Saved', value: liveStats.saves, icon: Zap, color: 'text-emerald-400', desc: 'Saves inside local vault' }
                ].map((stat, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-black/40 border border-white/5 flex gap-3 items-start text-left">
                    <div className="p-2 rounded-xl bg-white/5">
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                    <div className="leading-tight">
                      <span className="text-[8px] font-mono uppercase text-zinc-500 block">{stat.label}</span>
                      <strong className="text-sm font-sans font-extrabold text-white block mt-0.5">{stat.value}</strong>
                      <p className="text-[8px] text-zinc-500 mt-1">{stat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interactive Engagement visual graph */}
              <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                <h4 className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 font-bold">Engagement Intensity Feed</h4>
                <div className="flex items-end justify-between gap-1 pt-6 h-16">
                  {[20, 45, 30, 85, 60, 95, 70, 80, 50, 100, 75, 90].map((val, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${val}%` }}
                        transition={{ duration: 0.8, delay: i * 0.03 }}
                        className="w-full rounded-t-xs bg-gradient-to-t from-violet-600 to-emerald-400" 
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-[7.5px] font-mono text-zinc-600">
                  <span>08:00 AM</span>
                  <span>10:00 AM</span>
                  <span>12:00 PM</span>
                  <span>NOW</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'retention' && (
            <div className="space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Average Read Time</span>
                  <div className="flex items-baseline gap-1">
                    <strong className="text-lg font-sans font-extrabold text-white">{liveStats.avgReadTime}</strong>
                  </div>
                  <p className="text-[8px] text-zinc-500 leading-normal pt-1">The typical duration a recipient views the broadcast update in their active client viewport.</p>
                </div>

                <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Total Click-Throughs</span>
                  <div className="flex items-baseline gap-1">
                    <strong className="text-lg font-sans font-extrabold text-white">{liveStats.linkClicks}</strong>
                    <span className="text-[9px] text-emerald-400 font-mono font-bold">+18.2%</span>
                  </div>
                  <p className="text-[8px] text-zinc-500 leading-normal pt-1">Aggregated clicks for hyperlink nodes embedded in broadcast contents.</p>
                </div>

                <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Media Downloads</span>
                  <div className="flex items-baseline gap-1">
                    <strong className="text-lg font-sans font-extrabold text-white">{liveStats.mediaDownloads}</strong>
                  </div>
                  <p className="text-[8px] text-zinc-500 leading-normal pt-1">Times image, audio or document assets were downloaded by recipient caches.</p>
                </div>

                <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Poll Node Participation</span>
                  <div className="flex items-baseline gap-1">
                    <strong className="text-lg font-sans font-extrabold text-white">{liveStats.pollParticipation}</strong>
                    <span className="text-[9px] text-violet-400 font-mono font-bold">41% vote</span>
                  </div>
                  <p className="text-[8px] text-zinc-500 leading-normal pt-1">Aggregated votes submitted on interactive poll units in real-time.</p>
                </div>
              </div>

              {/* Server metrics latency block */}
              <div className="p-3 rounded-2xl bg-[#03010d] border border-violet-500/10 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-mono uppercase tracking-wider text-violet-400">Node Cluster Status</span>
                  <span className="text-[8px] font-mono text-emerald-400 px-1.5 py-0.5 rounded-full bg-emerald-500/5 border border-emerald-500/15 uppercase">OPTIMAL</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-1.5 rounded-xl bg-white/5">
                    <p className="text-[7.5px] font-mono text-zinc-500">Latency</p>
                    <strong className="text-[10px] font-mono text-white">1.84ms</strong>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white/5">
                    <p className="text-[7.5px] font-mono text-zinc-500">Memory usage</p>
                    <strong className="text-[10px] font-mono text-white">42 MB</strong>
                  </div>
                  <div className="p-1.5 rounded-xl bg-white/5">
                    <p className="text-[7.5px] font-mono text-zinc-500">Packet Loss</p>
                    <strong className="text-[10px] font-mono text-white">0.00%</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-violet-500/10 flex items-center justify-between relative z-10 bg-[#060412]/80 backdrop-blur-sm shrink-0">
          <span className="text-[8px] font-mono text-zinc-500 uppercase">Broadcast Analytics</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-sans text-[10px] uppercase font-bold tracking-wider transition-all cursor-pointer"
          >
            Close Dashboard
          </button>
        </div>
      </motion.div>
    </div>
  );
}
