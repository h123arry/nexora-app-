import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Shield, 
  Plus, 
  ChevronRight, 
  Trash, 
  Link as LinkIcon, 
  BarChart2, 
  VolumeX, 
  Volume2, 
  Pin,
  CheckCircle,
  Copy,
  PlusCircle,
  Send,
  Sparkles
} from 'lucide-react';

interface Member {
  id: string;
  name: string;
  role: 'Admin' | 'Moderator' | 'Member';
  avatar: string;
}

interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  votedOptionId?: string;
}

interface GroupDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  groupName: string;
  groupAvatar: string;
  groupDescription: string;
}

const INITIAL_MEMBERS: Member[] = [
  { id: 'm1', name: 'Harrison (You)', role: 'Admin', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80' },
  { id: 'm2', name: 'Sophia', role: 'Moderator', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80' },
  { id: 'm3', name: 'Marcus', role: 'Member', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80' },
  { id: 'm4', name: 'Liam Sterling', role: 'Member', avatar: 'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?w=80' }
];

const INITIAL_POLLS: Poll[] = [
  {
    id: 'p1',
    question: 'Should we introduce glassmorphism backdrop blur as the default theme?',
    options: [
      { id: 'o1', text: 'Yes, absolutely, looks premium! ✨', votes: 12 },
      { id: 'o2', text: 'No, let us keep simple stealth-dark 🖤', votes: 4 },
      { id: 'o3', text: 'Dynamic auto toggles based on sensor data 🛰️', votes: 9 }
    ]
  }
];

export default function GroupDashboard({
  isOpen,
  onClose,
  groupName,
  groupAvatar,
  groupDescription
}: GroupDashboardProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'polls' | 'settings'>('info');
  const [members, setMembers] = useState<Member[]>(INITIAL_MEMBERS);
  const [polls, setPolls] = useState<Poll[]>(INITIAL_POLLS);
  const [copiedLink, setCopiedLink] = useState(false);
  const [newAnnounceText, setNewAnnounceText] = useState('');
  const [announcements, setAnnouncements] = useState<string[]>([
    "📢 System latency is officially under 1.8ms under peak tests!",
    "⚠️ Upcoming server-side DB hot-reload simulation on 4th July."
  ]);

  // Poll state creation
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOpt1, setNewPollOpt1] = useState('');
  const [newPollOpt2, setNewPollOpt2] = useState('');

  if (!isOpen) return null;

  const handleCopyInviteLink = () => {
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    window.dispatchEvent(new CustomEvent('toast', { detail: "📎 Secure Invite Link copied directly!" }));
  };

  const handleCastVote = (pollId: string, optionId: string) => {
    setPolls(prev => prev.map(p => {
      if (p.id !== pollId) return p;
      if (p.votedOptionId) return p; // Already voted in simulation

      return {
        ...p,
        votedOptionId: optionId,
        options: p.options.map(opt => opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt)
      };
    }));
    window.dispatchEvent(new CustomEvent('toast', { detail: "🗳️ Vote registered on encrypted ledger!" }));
  };

  const handleCreatePoll = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPollQuestion.trim() || !newPollOpt1.trim() || !newPollOpt2.trim()) return;

    const newPoll: Poll = {
      id: 'p-' + Date.now(),
      question: newPollQuestion,
      options: [
        { id: 'no1', text: newPollOpt1, votes: 0 },
        { id: 'no2', text: newPollOpt2, votes: 0 }
      ]
    };

    setPolls(prev => [...prev, newPoll]);
    setNewPollQuestion('');
    setNewPollOpt1('');
    setNewPollOpt2('');
    window.dispatchEvent(new CustomEvent('toast', { detail: "📊 Encrypted Group Poll published!" }));
  };

  const handlePublishAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnnounceText.trim()) return;
    setAnnouncements(prev => [newAnnounceText, ...prev]);
    setNewAnnounceText('');
    window.dispatchEvent(new CustomEvent('toast', { detail: "📢 Announcement broadcasted to members!" }));
  };

  return (
    <div className="absolute inset-0 z-40 bg-[#06040f]/95 backdrop-blur-2xl flex flex-col h-full border-l border-violet-500/10 text-white">
      
      {/* Top Header */}
      <div className="p-4 border-b border-violet-500/10 flex items-center justify-between bg-[#09071c]/80">
        <div className="flex items-center gap-3">
          <img 
            src={groupAvatar} 
            alt={groupName} 
            className="w-9 h-9 rounded-xl object-cover border border-violet-500/15" 
            referrerPolicy="no-referrer"
          />
          <div className="text-left">
            <h3 className="text-sm font-sans font-black text-white">{groupName}</h3>
            <span className="text-[9px] font-mono text-violet-300/60 uppercase">Group Admin Dashboard</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 hover:bg-white/5 border border-white/15 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 border-b border-violet-500/5 bg-[#05030d] p-1.5 gap-1 shrink-0">
        {[
          { id: 'info', label: 'Info' },
          { id: 'members', label: 'Peers' },
          { id: 'polls', label: 'Polls' },
          { id: 'settings', label: 'Config' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-1.5 rounded-xl text-[10px] font-mono uppercase tracking-wider font-extrabold transition-all cursor-pointer text-center ${
              activeTab === tab.id 
                ? 'bg-violet-600 text-white shadow-md' 
                : 'text-violet-400/50 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Body View scroll wrapper */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-left">
        
        {/* TAB 1: OVERVIEW & ANNOUNCEMENTS */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest font-bold">Group Profile Description</span>
              <p className="text-xs text-violet-200/80 bg-black/40 p-3 rounded-2xl border border-white/5 leading-relaxed font-sans">
                {groupDescription}
              </p>
            </div>

            {/* Quick Share Link */}
            <div className="bg-gradient-to-r from-violet-950/20 to-pink-950/15 p-3 rounded-2xl border border-violet-500/10 space-y-2">
              <span className="text-[9px] font-mono text-violet-300 uppercase tracking-widest font-black block">🔑 Encrypted Invite Link</span>
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-white/5">
                <span className="text-[10px] font-mono text-zinc-500 truncate flex-1 select-all">
                  https://nexora.live/invite/ch-group-global-synthesizer-9199
                </span>
                <button 
                  onClick={handleCopyInviteLink}
                  className="p-1.5 bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  {copiedLink ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Announcements Segment */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest font-bold">📢 Channel Announcements</span>
                <span className="text-[8px] font-mono text-zinc-500">Only Admins</span>
              </div>

              {/* Compose Announcement */}
              <form onSubmit={handlePublishAnnouncement} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Post new channel announcement..."
                  value={newAnnounceText}
                  onChange={(e) => setNewAnnounceText(e.target.value)}
                  className="flex-1 bg-slate-950 border border-violet-500/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-violet-500/40"
                />
                <button 
                  type="submit"
                  className="p-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>

              {/* List */}
              <div className="space-y-2">
                {announcements.map((ann, i) => (
                  <div key={i} className="p-3 bg-violet-950/10 border border-violet-500/10 rounded-2xl text-xs text-violet-200">
                    {ann}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEMBERS */}
        {activeTab === 'members' && (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest font-bold">Peers & Roles ({members.length})</span>
              <button 
                onClick={() => alert('Simulating adding a new contact to group')}
                className="text-[9.5px] font-mono text-violet-400 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" /> Add Member
              </button>
            </div>

            <div className="divide-y divide-violet-500/5 bg-[#09071c]/50 border border-violet-500/5 rounded-2xl overflow-hidden">
              {members.map(member => {
                const isMe = member.id === 'm1';
                const isMuted = (member as any).isMuted;
                
                return (
                  <div key={member.id} className="p-3 flex items-center justify-between hover:bg-violet-500/5 transition-all">
                    <div className="flex items-center gap-2.5">
                      <img src={member.avatar} alt={member.name} className="w-8 h-8 rounded-lg object-cover" />
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-white leading-none">{member.name}</p>
                          {isMuted && <span className="text-[7px] bg-red-500/20 text-red-400 font-mono px-1 rounded uppercase tracking-wider">Muted</span>}
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500 mt-0.5 block">@{member.name.toLowerCase().replace(/[^a-z0-9]/g, '')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-mono font-extrabold uppercase ${
                        member.role === 'Admin' 
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/20' 
                          : member.role === 'Moderator' 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/20' 
                            : 'bg-zinc-800 text-zinc-400 border border-white/5'
                      }`}>
                        {member.role}
                      </span>

                      {!isMe && (
                        <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                          {/* Mute action */}
                          <button
                            onClick={() => {
                              setMembers(prev => prev.map(m => m.id === member.id ? { ...m, isMuted: !isMuted } as any : m));
                              window.dispatchEvent(new CustomEvent('toast', { detail: `${isMuted ? '🔊 Unmuted' : '🔇 Muted'} ${member.name} in group!` }));
                            }}
                            className={`p-1 rounded-md text-[10px] transition-colors cursor-pointer ${
                              isMuted ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/5 text-zinc-400 hover:text-white'
                            }`}
                            title={isMuted ? "Unmute member" : "Mute member"}
                          >
                            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>

                          {/* Promote/Demote action */}
                          <button
                            onClick={() => {
                              const nextRole = member.role === 'Member' ? 'Moderator' : 'Member';
                              setMembers(prev => prev.map(m => m.id === member.id ? { ...m, role: nextRole as any } : m));
                              window.dispatchEvent(new CustomEvent('toast', { detail: `👑 ${member.name} designated as ${nextRole}!` }));
                            }}
                            className="p-1 hover:bg-white/5 rounded-md text-zinc-400 hover:text-violet-300 cursor-pointer text-[10px]"
                            title={member.role === 'Member' ? "Promote to Moderator" : "Demote to Member"}
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>

                          {/* Kick action */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to eject ${member.name} from this conversation?`)) {
                                setMembers(prev => prev.filter(m => m.id !== member.id));
                                window.dispatchEvent(new CustomEvent('toast', { detail: `🚪 Ejected ${member.name} from group ledger.` }));
                              }
                            }}
                            className="p-1 hover:bg-red-500/10 rounded-md text-zinc-400 hover:text-red-400 cursor-pointer"
                            title="Kick member"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: ENCRYPTED POLLS */}
        {activeTab === 'polls' && (
          <div className="space-y-4">
            <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest font-bold block">📊 Interactive Polls</span>

            {/* Create Poll */}
            <form onSubmit={handleCreatePoll} className="p-3.5 bg-black/40 border border-violet-500/10 rounded-2xl space-y-3">
              <span className="text-[8.5px] font-mono text-violet-300 uppercase tracking-widest block font-black">Publish New Poll</span>
              
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="Question (e.g. Next production release date?)"
                  value={newPollQuestion}
                  onChange={(e) => setNewPollQuestion(e.target.value)}
                  className="w-full bg-slate-950 border border-violet-500/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-hidden"
                />
                <input
                  type="text"
                  placeholder="Option A"
                  value={newPollOpt1}
                  onChange={(e) => setNewPollOpt1(e.target.value)}
                  className="w-full bg-slate-950 border border-violet-500/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-hidden"
                />
                <input
                  type="text"
                  placeholder="Option B"
                  value={newPollOpt2}
                  onChange={(e) => setNewPollOpt2(e.target.value)}
                  className="w-full bg-slate-950 border border-violet-500/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-violet-600 to-pink-500 hover:brightness-110 active:scale-98 text-white rounded-xl font-mono text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Launch Encrypted Poll
              </button>
            </form>

            {/* List Polls */}
            <div className="space-y-3">
              {polls.map(poll => {
                const totalVotes = poll.options.reduce((acc, o) => acc + o.votes, 0);
                
                return (
                  <div key={poll.id} className="p-4 bg-[#09071c] border border-violet-500/10 rounded-2xl space-y-3">
                    <div>
                      <span className="text-[8px] font-mono text-violet-400 bg-violet-400/10 px-1.5 py-0.5 rounded-sm uppercase tracking-wider">Poll Session</span>
                      <h4 className="text-xs font-sans font-bold text-white mt-1.5 leading-snug">{poll.question}</h4>
                    </div>

                    <div className="space-y-2">
                      {poll.options.map(opt => {
                        const percent = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                        const hasVoted = poll.votedOptionId !== undefined;
                        const isMyVote = poll.votedOptionId === opt.id;

                        return (
                          <button
                            key={opt.id}
                            disabled={hasVoted}
                            onClick={() => handleCastVote(poll.id, opt.id)}
                            className={`w-full relative text-left p-2.5 rounded-xl border transition-all text-xs overflow-hidden flex items-center justify-between cursor-pointer ${
                              isMyVote 
                                ? 'border-violet-500 text-white font-extrabold bg-violet-950/20' 
                                : 'border-white/5 text-violet-200 bg-slate-950/45 hover:border-violet-500/10'
                            }`}
                          >
                            {/* Poll Vote progression indicator bar */}
                            {hasVoted && (
                              <div 
                                className="absolute left-0 top-0 bottom-0 bg-violet-500/10 transition-all duration-500" 
                                style={{ width: `${percent}%` }}
                              />
                            )}

                            <span className="relative z-10 block pr-8 truncate">{opt.text}</span>
                            <span className="relative z-10 font-mono text-[10px] text-zinc-500 shrink-0">
                              {hasVoted ? `${percent}% (${opt.votes})` : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="text-[9px] font-mono text-zinc-500 text-right">
                      Total: {totalVotes} secure votes
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: GROUP CONFIG */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest font-bold block">⚙️ Channel Configuration</span>

            <div className="space-y-3 bg-[#09071c]/50 border border-violet-500/5 p-4 rounded-2xl">
              {[
                { title: 'Restrict Posting', desc: 'Only Admins & Moderators can write', defaultChecked: false },
                { title: 'Auto-Reject Requests', desc: 'Spam filters active', defaultChecked: true },
                { title: 'High Frequency Refresh', desc: 'Sync at sub-50ms channels', defaultChecked: true }
              ].map((setting, i) => (
                <div key={i} className="flex items-center justify-between pb-3 border-b border-white/5 last:border-b-0 last:pb-0">
                  <div className="text-left pr-4">
                    <p className="text-xs font-bold text-white leading-tight">{setting.title}</p>
                    <span className="text-[10px] font-sans text-zinc-500">{setting.desc}</span>
                  </div>
                  <input 
                    type="checkbox" 
                    defaultChecked={setting.defaultChecked}
                    className="w-4 h-4 rounded accent-violet-600 focus:ring-0 cursor-pointer" 
                  />
                </div>
              ))}
            </div>

            <button 
              onClick={() => alert('Simulating group destruction.')}
              className="w-full py-2.5 bg-red-950/20 hover:bg-red-950/40 border border-red-500/30 text-red-400 rounded-xl font-mono text-[9px] uppercase font-black transition-all cursor-pointer"
            >
              Destroy / Disband secure Group
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
