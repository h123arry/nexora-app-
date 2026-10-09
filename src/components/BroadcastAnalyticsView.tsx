import React, { useEffect, useState } from 'react';
import { 
  BarChart2, X, RefreshCw, Send, CheckCircle2, AlertCircle, Clock, 
  Smile, MessageSquare, ExternalLink, Download, Share2, Sparkles, Zap
} from 'lucide-react';
import { motion } from 'motion/react';
import VohIcon from './VohIcon';
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
  
  // Only display analytics fields persisted on the broadcast record.
  const [liveStats, setLiveStats] = useState<any>(null);

  useEffect(() => {
    if (broadcast) {
      setLiveStats(broadcast.broadcastDeliveryStats || {});
    }
  }, [broadcast, isOpen]);

  const handleRefresh = () => {
    // This component has no analytics subscription yet; refresh from its current persisted record only.
    setLiveStats(broadcast?.broadcastDeliveryStats || {});
  };

  if (!isOpen || !broadcast || !liveStats) return null;

  const formatMetric = (value: unknown) => typeof value === 'number' ? value.toLocaleString() : typeof value === 'string' ? value : 'Not tracked';
  const total = (liveStats.delivered || 0) + (liveStats.failed || 0) + (liveStats.pending || 0);
  const deliveryRate = total > 0 && typeof liveStats.delivered === 'number' ? Math.round((liveStats.delivered / total) * 100) : null;
  const readRate = liveStats.delivered > 0 && typeof liveStats.read === 'number' ? Math.round((liveStats.read / liveStats.delivered) * 100) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-xl bg-[#09071a]/95 border border-white/10 rounded-3xl overflow-hidden shadow-md flex flex-col h-[520px]"
      >
        {/* Neon light beams */}
        <div className="absolute top-0 inset-x-0 h-40 bg-radial-at-t from-emerald-500/15 via-transparent to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between relative z-10 bg-[#060412]/80 backdrop-blur-sm">
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
                  { label: 'Read / Viewed', value: liveStats.read, icon: Smile, color: 'text-violet-400', bg: 'bg-violet-500/5 border-white/10' },
                  { label: 'Pending', value: liveStats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/15' },
                  { label: 'Failed', value: liveStats.failed, icon: AlertCircle, color: 'text-pink-400', bg: 'bg-pink-500/5 border-pink-500/15' }
                ].map((stat, idx) => (
                  <div key={idx} className={`p-2.5 rounded-2xl border text-left flex flex-col gap-1 ${stat.bg}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] font-mono uppercase text-zinc-500">{stat.label}</span>
                      <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                    </div>
                      <span className="text-sm font-sans font-black text-white">{formatMetric(stat.value)}</span>
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
                    <span className="text-emerald-400 font-bold">{deliveryRate === null ? 'Not tracked' : `${deliveryRate}%`}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${deliveryRate ?? 0}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-emerald-500" 
                    />
                  </div>
                </div>

                {/* Read rate bar */}
                <div className="space-y-1 text-left">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span className="text-zinc-400">INBOX READ RATIO</span>
                    <span className="text-violet-400 font-bold">{readRate === null ? 'Not tracked' : `${readRate}%`}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${readRate ?? 0}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-violet-500" 
                    />
                  </div>
                </div>
              </div>

              {/* Optimization report */}
              <div className="p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-2.5 text-left">
                <VohIcon size={18} animated variant="cyan" />
                <div className="leading-tight">
                  <p className="text-[10px] font-sans font-bold text-emerald-300">Persisted broadcast metrics</p>
                  <p className="text-[9px] text-zinc-400 mt-0.5">Only values recorded on this broadcast are shown. Untracked metrics are labeled as such.</p>
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
                      <strong className="text-sm font-sans font-extrabold text-white block mt-0.5">{formatMetric(stat.value)}</strong>
                      <p className="text-[8px] text-zinc-500 mt-1">{stat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

                {/* No time-series source currently exists; do not draw a decorative chart. */}
                <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
                  <h4 className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 font-bold">Engagement over time</h4>
                  <p className="text-xs text-zinc-500">Time-series engagement data is not available for this broadcast.</p>
              </div>
            </div>
          )}

          {activeTab === 'retention' && (
            <div className="space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Average Read Time</span>
                  <div className="flex items-baseline gap-1">
                    <strong className="text-lg font-sans font-extrabold text-white">{formatMetric(liveStats.avgReadTime)}</strong>
                  </div>
                  <p className="text-[8px] text-zinc-500 leading-normal pt-1">The typical duration a recipient views the broadcast update in their active client viewport.</p>
                </div>

                <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Total Click-Throughs</span>
                  <div className="flex items-baseline gap-1">
                    <strong className="text-lg font-sans font-extrabold text-white">{formatMetric(liveStats.linkClicks)}</strong>
                  </div>
                  <p className="text-[8px] text-zinc-500 leading-normal pt-1">Aggregated clicks for hyperlink nodes embedded in broadcast contents.</p>
                </div>

                <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Media Downloads</span>
                  <div className="flex items-baseline gap-1">
                    <strong className="text-lg font-sans font-extrabold text-white">{formatMetric(liveStats.mediaDownloads)}</strong>
                  </div>
                  <p className="text-[8px] text-zinc-500 leading-normal pt-1">Times image, audio or document assets were downloaded by recipient caches.</p>
                </div>

                <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
                  <span className="text-[8px] font-mono text-zinc-500 uppercase block">Poll Node Participation</span>
                  <div className="flex items-baseline gap-1">
                    <strong className="text-lg font-sans font-extrabold text-white">{formatMetric(liveStats.pollParticipation)}</strong>
                  </div>
                  <p className="text-[8px] text-zinc-500 leading-normal pt-1">Aggregated votes submitted on interactive poll units in real-time.</p>
                </div>
              </div>

              <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs text-zinc-500">
                Delivery, engagement and infrastructure metrics are shown only when recorded. Unavailable values are not estimated.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between relative z-10 bg-[#060412]/80 backdrop-blur-sm shrink-0">
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
