import React from 'react';
import { Phone, Video, PhoneMissed, PhoneCall, PhoneForwarded, Sparkles, Zap, Trash2 } from 'lucide-react';

interface CallLogEntry {
  id: string;
  name: string;
  avatar: string;
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

export default function CallTestingConsole({ logs, onTriggerSimulatedCall, onClearLogs }: CallTestingConsoleProps) {
  return (
    <div className="flex flex-col h-full bg-[#03010b]">
      {/* Simulation Dashboard */}
      <div className="p-4 bg-gradient-to-br from-[#0e0926] to-[#04010d] border-b border-violet-500/10 text-left select-none space-y-3 shrink-0">
        <div className="flex items-center gap-1.5">
          <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
          <h4 className="text-[10px] font-mono uppercase tracking-widest font-black text-amber-300">Sandbox Call Simulation Lab</h4>
        </div>
        <p className="text-[9.5px] text-zinc-400 leading-relaxed font-sans">
          Test future voice/video streaming pipelines on Nexora. Click a controller below to simulate live incoming callers in the sandbox.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onTriggerSimulatedCall('Sophia', 'voice')}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 hover:border-violet-500/40 rounded-xl transition-all text-[9.5px] font-mono text-violet-300 font-extrabold uppercase cursor-pointer"
          >
            <Phone className="w-3 h-3 text-violet-400" />
            <span>Voice Sim</span>
          </button>
          <button
            onClick={() => onTriggerSimulatedCall('Luna', 'video')}
            className="flex items-center justify-center gap-1.5 py-2 px-2.5 bg-pink-600/10 hover:bg-pink-600/20 border border-pink-500/20 hover:border-pink-500/40 rounded-xl transition-all text-[9.5px] font-mono text-pink-300 font-extrabold uppercase cursor-pointer"
          >
            <Video className="w-3 h-3 text-pink-400" />
            <span>Video Sim</span>
          </button>
        </div>
      </div>

      {/* History List */}
      <div className="p-3 bg-black/40 flex items-center justify-between border-b border-white/5 shrink-0 select-none">
        <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-500 font-black">Secure Calling Ledger</span>
        {logs.length > 0 && (
          <button 
            onClick={onClearLogs}
            className="text-[8px] font-mono text-red-400 hover:text-red-300 uppercase font-black flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> Clear History
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-white/5 custom-scrollbar">
        {logs.map((log) => {
          const isMissed = log.direction === 'missed';
          const isIncoming = log.direction === 'incoming';
          
          return (
            <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-white/5 transition-colors text-left">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img src={log.avatar} alt={log.name} className="w-8 h-8 rounded-lg object-cover border border-white/10" />
                  <span className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-[#03010b] flex items-center justify-center ${
                    isMissed ? 'bg-red-950 text-red-400' : 'bg-zinc-900 text-zinc-400'
                  }`}>
                    {log.type === 'voice' ? <Phone className="w-2 h-2" /> : <Video className="w-2 h-2" />}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-extrabold block text-white leading-none mb-1">{log.name}</span>
                  <span className="text-[8px] font-mono text-zinc-500 uppercase flex items-center gap-1">
                    {isMissed ? (
                      <span className="text-red-400 flex items-center gap-0.5"><PhoneMissed className="w-2.5 h-2.5" /> Missed Call</span>
                    ) : isIncoming ? (
                      <span className="text-emerald-400 flex items-center gap-0.5"><PhoneCall className="w-2.5 h-2.5" /> Received</span>
                    ) : (
                      <span className="text-violet-400 flex items-center gap-0.5"><PhoneForwarded className="w-2.5 h-2.5" /> Outgoing</span>
                    )}
                    {log.duration && `• ${log.duration}`}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[8.5px] font-mono text-zinc-600 block mb-1">{log.timestamp}</span>
                <button
                  onClick={() => onTriggerSimulatedCall(log.name, log.type)}
                  className="px-2 py-1 bg-white/5 hover:bg-violet-600/20 text-zinc-400 hover:text-violet-200 border border-white/5 hover:border-violet-500/20 rounded-md text-[8px] font-mono uppercase font-black cursor-pointer transition-all"
                >
                  Recall
                </button>
              </div>
            </div>
          );
        })}

        {logs.length === 0 && (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2 h-48 py-16 select-none">
            <Phone className="w-6 h-6 text-zinc-600" />
            <span className="text-[10px] font-mono text-zinc-500 uppercase font-black">No recent calls</span>
            <p className="text-[9px] text-zinc-600 leading-normal max-w-[180px]">
              Outgoing call drafts and sandbox simulations will appear in this secure registry.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
