import React from 'react';
import { 
  Phone, Video, PhoneMissed, PhoneCall, PhoneForwarded, 
  Sparkles, Zap, Trash2, Shield, Calendar, Clock, RotateCcw,
  Volume2, Eye, User, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';

interface CallLogEntry {
  id: string;
  name: string;
  avatar: string;
  username?: string;
  type: 'voice' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  duration?: string;
  timestamp: string;
}

interface CallTestingConsoleProps {
  logs: CallLogEntry[];
  onTriggerSimulatedCall: (partner: string, type: 'voice' | 'video') => void;
  onClearLogs: () => void;
}

export default function CallTestingConsole({ 
  logs, 
  onTriggerSimulatedCall, 
  onClearLogs 
}: CallTestingConsoleProps) {
  
  return (
    <div className="flex flex-col h-full bg-[#03010b] text-white">
      {/* Simulation Sandbox Panel */}
      <div className="p-4 bg-gradient-to-b from-[#0e0926]/90 to-[#04010d] border-b border-violet-500/10 text-left select-none space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
            <h4 className="text-[10px] font-mono uppercase tracking-widest font-black text-amber-300">Nexora Calling Center</h4>
          </div>
          <div className="flex items-center gap-1 bg-violet-600/10 px-2 py-0.5 rounded-full border border-violet-500/20 text-[8px] font-mono text-violet-300">
            <Shield className="w-2.5 h-2.5" /> E2EE Active
          </div>
        </div>
        
        <p className="text-[10px] text-zinc-400 leading-relaxed font-sans">
          Simulate real-time voice and video calls within the Nexora sandbox. Test gestures, swipe responders, and group features.
        </p>

        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={() => onTriggerSimulatedCall('Sophia', 'voice')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-violet-600/10 hover:bg-violet-600/25 border border-violet-500/20 hover:border-violet-500/40 rounded-xl transition-all text-[9.5px] font-mono text-violet-300 font-extrabold uppercase cursor-pointer hover:shadow-[0_0_10px_rgba(139,92,246,0.15)]"
          >
            <Phone className="w-3.5 h-3.5 text-violet-400" />
            <span>Voice Call Sim</span>
          </button>
          
          <button
            onClick={() => onTriggerSimulatedCall('Luna', 'video')}
            className="flex items-center justify-center gap-2 py-2.5 px-3 bg-pink-600/10 hover:bg-pink-600/25 border border-pink-500/20 hover:border-pink-500/40 rounded-xl transition-all text-[9.5px] font-mono text-pink-300 font-extrabold uppercase cursor-pointer hover:shadow-[0_0_10px_rgba(236,72,153,0.15)]"
          >
            <Video className="w-3.5 h-3.5 text-pink-400" />
            <span>Video Call Sim</span>
          </button>
        </div>
      </div>

      {/* History Filter Header */}
      <div className="p-3 bg-black/40 flex items-center justify-between border-b border-white/5 shrink-0 select-none">
        <span className="text-[9px] font-mono uppercase tracking-widest text-zinc-400 font-black">Call Ledger History</span>
        {logs.length > 0 && (
          <button 
            onClick={onClearLogs}
            className="text-[8px] font-mono text-rose-400 hover:text-rose-300 uppercase font-black flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Clear History
          </button>
        )}
      </div>

      {/* Redesigned Calls Ledger Feed */}
      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {logs.map((log) => {
          const isMissed = log.direction === 'missed';
          const isIncoming = log.direction === 'incoming';
          const partnerUsername = log.username || `@${log.name.toLowerCase().replace(/\s+/g, '_')}_cyber`;

          return (
            <div 
              key={log.id} 
              className="p-4 flex items-center justify-between hover:bg-white/5 transition-all text-left group/call"
            >
              <div className="flex items-center gap-3.5">
                {/* Avatar with Voice/Video Call type indicator */}
                <div className="relative shrink-0">
                  <img 
                    src={log.avatar} 
                    alt={log.name} 
                    className="w-10 h-10 rounded-xl object-cover border border-white/10" 
                  />
                  <span className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#03010b] flex items-center justify-center ${
                    isMissed 
                      ? 'bg-rose-950 text-rose-400' 
                      : log.type === 'video' 
                        ? 'bg-pink-950 text-pink-400' 
                        : 'bg-violet-950 text-violet-400'
                  }`}>
                    {log.type === 'video' ? <Video className="w-2.5 h-2.5" /> : <Phone className="w-2.5 h-2.5" />}
                  </span>
                </div>

                {/* Identity & Status */}
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white leading-tight">{log.name}</span>
                    <span className="text-[8px] font-mono text-zinc-500">{partnerUsername}</span>
                  </div>
                  
                  {/* Ledger directions */}
                  <div className="text-[9px] font-mono uppercase flex items-center gap-1.5 mt-1">
                    {isMissed ? (
                      <span className="text-rose-500 font-black flex items-center gap-1">
                        <PhoneMissed className="w-3 h-3 text-rose-500" />
                        <span>Missed Call</span>
                      </span>
                    ) : isIncoming ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
                        <span>Received</span>
                      </span>
                    ) : (
                      <span className="text-violet-400 font-bold flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3 text-violet-400" />
                        <span>Outgoing</span>
                      </span>
                    )}

                    {log.duration && (
                      <span className="text-zinc-500 flex items-center gap-1 font-sans">
                        • <Clock className="w-2.5 h-2.5 text-zinc-600" /> {log.duration}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Timestamp & Redial Action */}
              <div className="text-right flex flex-col items-end gap-1.5">
                <span className="text-[8.5px] font-mono text-zinc-500">{log.timestamp}</span>
                <button
                  onClick={() => onTriggerSimulatedCall(log.name, log.type)}
                  className="px-2.5 py-1.5 bg-white/5 hover:bg-violet-600/20 text-zinc-400 hover:text-violet-200 border border-white/5 hover:border-violet-500/20 rounded-lg text-[8.5px] font-mono uppercase font-black cursor-pointer transition-all flex items-center gap-1 active:scale-95 group-hover/call:bg-violet-600/10"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Recall</span>
                </button>
              </div>
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-3 py-16 select-none h-60">
            <div className="w-12 h-12 rounded-full bg-violet-600/5 border border-violet-500/10 flex items-center justify-center text-violet-400/40">
              <Phone className="w-5 h-5 text-violet-500/30" />
            </div>
            <span className="text-[10px] font-mono text-zinc-400 uppercase font-black tracking-wider">No Recent Call Logs</span>
            <p className="text-[9.5px] text-zinc-500 leading-normal max-w-[220px] mx-auto font-sans">
              All incoming caller simulations and direct outbound calls will be tracked in this encrypted ledger.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
