import React, { useState } from 'react';
import { X, Copy, MessageSquare, Send, Check, ShieldAlert, EyeOff, HelpCircle, Users, Rocket, Link2, Download, RefreshCw, Bookmark, AlertCircle, Info, Forward } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (recipientId: string) => void;
  post?: {
    id: string;
    username: string;
    name: string;
    tags: string[];
    likes: number;
    userId?: string;
  };
  onReport?: () => void;
  onNotInterested?: () => void;
  onSave?: () => void;
}

export default function ShareSheet({ 
  isOpen, 
  onClose, 
  onShare, 
  post,
  onReport,
  onNotInterested,
  onSave
}: ShareSheetProps) {
  const [sentFriends, setSentFriends] = useState<string[]>([]);
  const [sentGroups, setSentGroups] = useState<string[]>([]);
  const [isReposted, setIsReposted] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  if (!isOpen) return null;

  // Curated lists with Frequently Contacted friends showing first!
  const friends = [
    { id: 'f1', name: 'Sarah', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=faces', frequent: true, active: true },
    { id: 'f2', name: 'Michael', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=faces', frequent: true, active: true },
    { id: 'f3', name: 'Alexander', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces', frequent: true, active: false },
    { id: 'f4', name: 'Emily', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=faces', frequent: false, active: true },
    { id: 'f5', name: 'David', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=faces', frequent: false, active: false },
  ];

  const groups = [
    { id: 'g1', name: 'Alpha Tech 💻', members: 12, icon: '🚀' },
    { id: 'g2', name: 'Creators Hub 🎨', members: 8, icon: '🌟' },
    { id: 'g3', name: 'Nexora Squad 🌌', members: 15, icon: '👾' },
  ];

  const socialChannels = [
    { id: 'whatsapp', name: 'WhatsApp', color: 'bg-green-600/20 text-green-400 border-green-500/20' },
    { id: 'instagram', name: 'Instagram', color: 'bg-pink-600/20 text-pink-400 border-pink-500/20' },
    { id: 'messenger', name: 'Messenger', color: 'bg-blue-600/20 text-blue-400 border-blue-500/20' },
    { id: 'telegram', name: 'Telegram', color: 'bg-sky-600/20 text-sky-400 border-sky-500/20' },
    { id: 'twitter', name: 'X / Twitter', color: 'bg-zinc-800 text-zinc-300 border-zinc-700/50' },
  ];

  const handleSendFriend = (friendId: string, name: string) => {
    if (sentFriends.includes(friendId)) return;
    setSentFriends([...sentFriends, friendId]);
    onShare(friendId);
  };

  const handleSendGroup = (groupId: string) => {
    if (sentGroups.includes(groupId)) return;
    setSentGroups([...sentGroups, groupId]);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🌌 Sent post to group channel!' }));
  };

  const handleRepost = () => {
    if (isReposted) return;
    setIsReposted(true);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🚀 Video reposted to your Feed profile!' }));
  };

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/post/${post?.id || 'feed'}`;
    navigator.clipboard.writeText(postUrl);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Link copied to clipboard!' }));
  };

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/60 backdrop-blur-xs select-none" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="w-full max-w-[480px] rounded-t-[32px] bg-[#0c0a21]/95 border-t border-violet-500/20 p-6 shadow-2xl overflow-y-auto max-h-[85vh] custom-scrollbar text-left" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        <div className="mb-6 flex items-center justify-between">
          <h3 className="font-sans font-bold text-base text-white tracking-tight flex items-center gap-2">
            <Forward className="w-4 h-4 text-violet-400" /> Share Experience
          </h3>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SECTION 1: Send to Friends (Frequently Contacted ordered first) */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-mono tracking-widest text-violet-400 font-bold uppercase">Send to Friends</span>
            <span className="text-[9px] font-mono text-zinc-500">Quick dispatch</span>
          </div>
          <div className="flex gap-4.5 overflow-x-auto pb-2 scrollbar-none">
            {friends.map((friend) => {
              const isSent = sentFriends.includes(friend.id);
              return (
                <div key={friend.id} className="flex flex-col items-center gap-1.5 shrink-0 relative">
                  <div className="relative">
                    <img 
                      src={friend.avatar} 
                      alt={friend.name} 
                      className={`h-14 w-14 rounded-full object-cover border-2 transition-all duration-300 ${
                        friend.frequent ? 'border-violet-500' : 'border-zinc-800'
                      }`} 
                    />
                    {friend.active && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#0c0a21]" />
                    )}
                    {friend.frequent && (
                      <span className="absolute -top-1 -right-1 bg-violet-600 text-white font-mono text-[7px] px-1 rounded-md scale-90 border border-violet-400 uppercase font-black">
                        Freq
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-sans font-medium text-zinc-300">{friend.name}</span>
                  <button
                    onClick={() => handleSendFriend(friend.id, friend.name)}
                    className={`px-2.5 py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition-all shadow-md ${
                      isSent 
                        ? 'bg-zinc-800 text-zinc-500 border border-zinc-700' 
                        : 'bg-violet-600 hover:bg-violet-500 text-white active:scale-95 cursor-pointer'
                    }`}
                  >
                    {isSent ? 'Sent ✓' : 'Send'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: Send to Groups */}
        <div className="mb-5">
          <h4 className="text-[10px] font-mono tracking-widest text-violet-400 font-bold uppercase mb-3 px-1">Send to Groups</h4>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
            {groups.map((group) => {
              const isSent = sentGroups.includes(group.id);
              return (
                <button
                  key={group.id}
                  onClick={() => handleSendGroup(group.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left shrink-0 max-w-[150px] ${
                    isSent 
                      ? 'bg-zinc-900 border-zinc-800 text-zinc-500' 
                      : 'bg-[#120e36] border-violet-500/10 hover:border-violet-500/30 text-white active:scale-95 cursor-pointer'
                  }`}
                >
                  <span className="text-base shrink-0">{group.icon}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-sans font-bold truncate text-zinc-200">{group.name}</p>
                    <p className="text-[8px] font-mono text-zinc-500">{group.members} active</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* SECTION 3: Sharing Channels */}
        <div className="mb-6">
          <h4 className="text-[10px] font-mono tracking-widest text-violet-400 font-bold uppercase mb-3 px-1">Share To Platform</h4>
          <div className="grid grid-cols-2 gap-2">
            {/* Repost button */}
            <button
              onClick={handleRepost}
              className={`col-span-2 flex items-center justify-center gap-2 p-3 rounded-xl font-mono text-[11px] font-bold uppercase tracking-wider transition-all border ${
                isReposted 
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-500' 
                  : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white border-violet-400/20 active:scale-98 cursor-pointer shadow-lg'
              }`}
            >
              <Rocket className="w-4 h-4" />
              {isReposted ? 'Reposted successfully ✓' : 'Repost to Nexora Feed'}
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-violet-950/40 border border-violet-500/10 text-white text-xs hover:bg-violet-950/60 transition-all active:scale-95 cursor-pointer"
            >
              <Link2 className="w-4 h-4 text-violet-400 shrink-0" />
              <span className="font-sans font-medium">Copy Link</span>
            </button>

            {/* Dynamic platforms */}
            {socialChannels.map((chan) => (
              <button
                key={chan.id}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Shared to ${chan.name}!` }));
                }}
                className={`flex items-center gap-2.5 p-3 rounded-xl text-white text-xs hover:bg-white/5 transition-all border ${chan.color} active:scale-95 cursor-pointer`}
              >
                <MessageSquare className="w-4 h-4 shrink-0" />
                <span className="font-sans font-medium">{chan.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 4: System Action List */}
        <div className="space-y-2 border-t border-white/5 pt-4">
          <div className="grid grid-cols-2 gap-2">
            {/* Save */}
            <button 
              onClick={() => { onSave?.(); onClose(); }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-zinc-300 text-xs text-left transition-colors cursor-pointer"
            >
              <Bookmark className="w-4 h-4 text-violet-400 shrink-0" />
              <span>Save to Board</span>
            </button>

            {/* Report */}
            <button 
              onClick={() => { onReport?.(); onClose(); }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-zinc-300 text-xs text-left transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
              <span>Report Video</span>
            </button>

            {/* Not Interested */}
            <button 
              onClick={() => { onNotInterested?.(); onClose(); }}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-zinc-300 text-xs text-left transition-colors cursor-pointer"
            >
              <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Not Interested</span>
            </button>

            {/* Why am I seeing this */}
            <button 
              onClick={() => setShowExplanation(true)}
              className="flex items-center gap-2.5 p-3 rounded-xl bg-white/2 hover:bg-white/5 border border-white/5 text-zinc-300 text-xs text-left transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Why am I seeing this?</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* WHY AM I SEEING THIS? - DIALOG OVERLAY */}
      <AnimatePresence>
        {showExplanation && (
          <div 
            className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            onClick={() => setShowExplanation(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-[#0a0720] border border-violet-500/30 rounded-3xl p-5 text-left shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowExplanation(false)}
                className="absolute top-4 right-4 p-1 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Info className="w-4 h-4" />
                </div>
                <h4 className="font-sans font-bold text-sm text-white">Recommendation Telemetry</h4>
              </div>

              <p className="text-xs text-zinc-300 font-sans leading-relaxed mb-4">
                Nexora's Neural Affinity Engine selects content that aligns with your real-time interactions, network proximity, and community metrics.
              </p>

              <div className="space-y-3 font-sans text-xs">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] font-mono text-cyan-400 font-bold uppercase mb-1">Engagement Affinity</p>
                  <p className="text-zinc-300">
                    You have spent {Math.floor(Math.random() * 4) + 2}x more time watching videos with tags: 
                    <span className="text-violet-400 font-bold ml-1">
                      {post?.tags && post.tags.length > 0 ? post.tags.slice(0, 3).join(', ') : '#creative, #discovery'}
                    </span>.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] font-mono text-violet-400 font-bold uppercase mb-1">Creator Popularity</p>
                  <p className="text-zinc-300">
                    This video has achieved a watch completion rating of <span className="text-green-400 font-bold">{(89 + Math.random() * 8).toFixed(1)}%</span> from viewers with similar profiles.
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <p className="text-[10px] font-mono text-fuchsia-400 font-bold uppercase mb-1">Reputation Score</p>
                  <p className="text-zinc-300">
                    Creator <span className="text-zinc-100 font-bold">@{post?.username || 'voh'}</span> has a verified community rank of <span className="text-fuchsia-400 font-bold">94%</span>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowExplanation(false)}
                className="w-full mt-4 py-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 text-white font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all cursor-pointer shadow-lg text-center"
              >
                Sync Confirmed
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
