import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Sparkles, 
  Users, 
  TrendingUp, 
  Calendar, 
  Plus, 
  ListRestart, 
  Flame, 
  Check, 
  Gift, 
  UsersRound, 
  Dribbble,
  Award
} from 'lucide-react';
import { SocialMission, User } from '../types';
import RelativeTimestamp from './RelativeTimestamp';
import { INITIAL_MISSIONS } from '../data/database';

interface SocialMissionsViewProps {
  currentUser: User;
  onAddLogAlert?: (type: string, message: string) => void;
}

export default function SocialMissionsView({ currentUser }: SocialMissionsViewProps) {
  const [missions, setMissions] = useState<SocialMission[]>(INITIAL_MISSIONS);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('mission-1');
  const [logAmount, setLogAmount] = useState<number>(10);
  const [logSuccessMessage, setLogSuccessMessage] = useState<string | null>(null);

  const selectedMission = missions.find(m => m.id === selectedMissionId) || missions[0];

  const handleJoinAlliance = (mId: string) => {
    setMissions(prev => prev.map(m => {
      if (m.id === mId) {
        const joined = m.joinedUserIds.includes(currentUser.id);
        const updatedIds = joined 
          ? m.joinedUserIds.filter(id => id !== currentUser.id)
          : [...m.joinedUserIds, currentUser.id];
        return {
          ...m,
          joinedUserIds: updatedIds,
          currentCount: joined ? Math.max(0, m.currentCount - 5) : m.currentCount + 5 // Joining adds default participation index
        };
      }
      return m;
    }));
  };

  const handleCommitContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (logAmount <= 0) return;

    setMissions(prev => prev.map(m => {
      if (m.id === selectedMissionId) {
        // Enforce maximum targets
        const newCount = Math.min(m.targetCount, m.currentCount + logAmount);
        const freshContribution = {
          userId: currentUser.id,
          username: currentUser.username,
          avatar: currentUser.avatar,
          amount: logAmount,
          timestamp: 'Just now'
        };
        return {
          ...m,
          currentCount: newCount,
          contributions: [freshContribution, ...m.contributions]
        };
      }
      return m;
    }));

    setLogSuccessMessage(`Successfully committed +${logAmount} ${selectedMission.unit} to the "${selectedMission.title}" Alliance ledger!`);
    setTimeout(() => {
      setLogSuccessMessage(null);
    }, 4000);
  };

  return (
    <div id="social-missions-layout" className="space-y-6">
      
      {/* Tab Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-current/10 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-yellow-400" />
            <h2 className="text-xl font-black font-sans tracking-tight text-current">
              Social Missions
            </h2>
          </div>
          <p className="text-xs text-current/60 font-mono">
            Collaborative community projects with verifiable contributions and progress ledgers
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#0e0c03] border border-yellow-500/20 p-2 rounded-xl text-[10px] font-mono select-none text-yellow-500">
          <Award className="w-4 h-4" />
          <span>MISSION CONTROL LEDGER ACTIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Grid: Missions List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between pl-1">
            <h3 className="text-[10px] font-mono uppercase text-current/50 font-bold tracking-wider">
              Active Campaigns
            </h3>
            <span className="text-[9px] font-mono text-current/30">Auto aligned</span>
          </div>

          <div className="space-y-3">
            {missions.map((m) => {
              const percentage = Math.round((m.currentCount / m.targetCount) * 100);
              const isSelected = m.id === selectedMissionId;
              const isJoined = m.joinedUserIds.includes(currentUser.id);

              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMissionId(m.id)}
                  className={`p-4 rounded-3xl border text-left cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-[#100c02] border-yellow-500/30 shadow-xs' 
                      : 'bg-current/3 border-transparent hover:bg-current/5Description text-current'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="bg-yellow-500/10 border border-yellow-500/25 px-2 py-0.5 rounded-md text-[8px] font-mono text-yellow-400 font-bold uppercase tracking-widest">
                      {m.category}
                    </span>
                    {isJoined && (
                      <span className="text-[9px] font-mono text-emerald-400 font-bold">ALIGNED ✓</span>
                    )}
                  </div>

                  <h4 className="text-sm font-black font-sans text-current leading-snug truncate">
                    {m.title}
                  </h4>

                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-[10.5px] font-mono">
                      <span className="text-current/50">Progress ({percentage}%)</span>
                      <span className="text-current/70 font-bold">{m.currentCount} / {m.targetCount} {m.unit}</span>
                    </div>

                    {/* Compact layout bar */}
                    <div className="w-full bg-current/5 h-1 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${percentage}%` }}
                        className="h-full bg-linear-to-r from-yellow-500 to-amber-500" 
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Grid: Selected Campaign Detail Ledger */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#0b0904] border border-yellow-500/15 rounded-3xl p-5 space-y-5">
            
            {/* Mission Detail Header */}
            <div className="flex items-start justify-between gap-4 border-b border-current/5 pb-4">
              <div>
                <p className="text-[9px] font-mono text-yellow-400 font-bold uppercase tracking-widest mb-1">
                  Active Community Objective
                </p>
                <h3 className="text-lg font-black font-sans leading-tight text-current">
                  {selectedMission.title}
                </h3>
              </div>
              
              <button
                onClick={() => handleJoinAlliance(selectedMission.id)}
                className={`px-4 py-2 rounded-xl text-xs font-mono uppercase font-bold transition-all ${
                  selectedMission.joinedUserIds.includes(currentUser.id)
                    ? 'bg-transparent border border-emerald-500/20 text-emerald-400'
                    : 'bg-linear-to-r from-yellow-600 to-amber-500 text-white hover:brightness-110 active:scale-97 hover:shadow-lg'
                }`}
              >
                {selectedMission.joinedUserIds.includes(currentUser.id) ? 'ALIGNED WITH LEADERBOARD ✓' : 'JOIN ALLIANCE'}
              </button>
            </div>

            {/* Objective description text card */}
            <div className="space-y-2">
              <p className="text-xs text-current/80 leading-relaxed">
                {selectedMission.description}
              </p>
              
              <div className="p-3 bg-current/3 border border-current/5 rounded-2xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <UsersRound className="w-4 h-4 text-yellow-400" />
                  <span className="font-mono font-bold text-current">{selectedMission.joinedUserIds.length} Aligned Peers</span>
                </div>
                <div className="text-[10px] font-mono text-current/40">
                  Target: {selectedMission.targetCount} {selectedMission.unit}
                </div>
              </div>
            </div>

            {/* Commit progress log input action form */}
            <div className="bg-[#050402] border border-yellow-500/20 rounded-2xl p-4 space-y-3.5">
              <h4 className="text-[10px] font-mono uppercase text-yellow-400 font-bold tracking-wider">
                Log Personal Contributions
              </h4>

              {selectedMission.joinedUserIds.includes(currentUser.id) ? (
                <form onSubmit={handleCommitContribution} className="space-y-4">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono text-current/60">
                      <span>Increment Log Value ({selectedMission.unit})</span>
                      <span className="font-bold text-yellow-400 font-mono">+{logAmount}</span>
                    </div>
                    
                    {/* Log Slider */}
                    <input 
                      type="range" 
                      min="1" 
                      max={Math.min(100, selectedMission.targetCount - selectedMission.currentCount)} 
                      value={logAmount}
                      onChange={(e) => setLogAmount(parseInt(e.target.value))}
                      className="w-full accent-yellow-500 h-1 bg-current/10 rounded-lg appearance-none"
                    />
                  </div>

                  <div className="flex gap-3 items-center justify-between">
                    <span className="text-[9px] font-mono text-current/40">This updates the ledger in real-time</span>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-mono font-black text-[#0c0a02] bg-yellow-400 hover:bg-yellow-300 rounded-xl transition-all active:scale-97"
                    >
                      COMMIT PROGRESS LOG
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-[11px] font-sans text-yellow-500/80 leading-normal font-medium bg-[#131107] p-3.5 rounded-xl border border-yellow-500/10">
                  Please click **JOIN ALLIANCE** above to align with the mission before submitting transaction parameters to the ledger.
                </p>
              )}

              {/* Alert Message */}
              <AnimatePresence>
                {logSuccessMessage && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="p-3 bg-emerald-900/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-sans text-xs flex items-center gap-2"
                  >
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{logSuccessMessage}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Campaign Ledger Leaderboard */}
            <div className="space-y-2.5">
              <h4 className="text-[10px] font-mono uppercase text-current/40 font-bold tracking-wider pl-1">
                Alliance Transaction Ledger
              </h4>

              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {selectedMission.contributions.map((ct, idx) => (
                  <div 
                    key={idx} 
                    className="p-2.5 rounded-xl bg-current/3 border border-current/5 text-xs flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <img 
                        src={ct.avatar} 
                        alt={ct.username} 
                        referrerPolicy="no-referrer"
                        className="w-6 h-6 rounded-lg object-cover ring-1 ring-yellow-500/20" 
                      />
                      <div className="overflow-hidden">
                        <span className="font-bold block truncate font-sans text-current">@{ct.username}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end text-right shrink-0">
                      <span className="text-yellow-400 font-mono font-extrabold">+{ct.amount} {selectedMission.unit}</span>
                      <span className="text-[8px] font-mono text-current/40"><RelativeTimestamp timestamp={ct.timestamp} /></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
