import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MessageSquare, Sparkles, Smile } from 'lucide-react';
import { ExtendedMessage, User } from '../types';

interface ReactionDetailsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  message: ExtendedMessage | null;
  currentUser: User;
  partnerName: string;
  partnerAvatar: string;
}

export default function ReactionDetailsSheet({
  isOpen,
  onClose,
  message,
  currentUser,
  partnerName,
  partnerAvatar
}: ReactionDetailsSheetProps) {
  if (!isOpen || !message || !message.reactions || message.reactions.length === 0) return null;

  // Calculate total count
  const totalReactionsCount = message.reactions.reduce((acc, curr) => acc + curr.userIds.length, 0);

  // Flat list of users who reacted
  const voters = message.reactions.flatMap(r => {
    return r.userIds.map(uid => {
      const isMe = uid === currentUser.id;
      return {
        id: uid,
        name: isMe ? 'You (Creator)' : partnerName,
        avatar: isMe ? currentUser.avatar : partnerAvatar,
        role: isMe ? 'Owner' : 'Participant',
        emoji: r.emoji
      };
    });
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
        />

        {/* Sheet panel */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="relative w-full max-w-md bg-[#09071c]/95 border-t border-violet-500/30 rounded-t-3xl shadow-2xl p-6 z-10 flex flex-col gap-4 max-h-[80vh] overflow-hidden select-none"
        >
          {/* Handle bar */}
          <div className="w-12 h-1 bg-violet-500/20 rounded-full mx-auto" />

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smile className="w-5 h-5 text-violet-400" />
              <h3 className="text-sm font-mono font-black text-violet-100 uppercase tracking-wide">
                Message Reactions ({totalReactionsCount})
              </h3>
            </div>
            <button 
              onClick={onClose} 
              className="p-1.5 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tab Summaries by Emoji */}
          <div className="flex gap-2 overflow-x-auto py-1 scrollbar-none border-b border-violet-500/10">
            <div className="px-3 py-1 bg-violet-600/30 border border-violet-500/50 rounded-full text-xs text-violet-200 flex items-center gap-1.5 whitespace-nowrap">
              <span>All</span>
              <span className="bg-violet-950/60 px-1.5 py-0.5 rounded-full text-[10px] font-bold">{totalReactionsCount}</span>
            </div>
            {message.reactions.map(r => (
              <div 
                key={r.emoji}
                className="px-3 py-1 bg-[#0e0a29] border border-white/5 hover:border-violet-500/20 rounded-full text-xs text-zinc-300 flex items-center gap-1.5 whitespace-nowrap transition-colors"
              >
                <span>{r.emoji}</span>
                <span className="text-[10px] opacity-70 font-mono">({r.userIds.length})</span>
              </div>
            ))}
          </div>

          {/* Users List */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 py-1">
            {voters.map((voter, index) => (
              <motion.div 
                key={`${voter.id}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-2.5 bg-[#0e0a29]/60 rounded-2xl border border-white/5 hover:border-violet-500/10 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={voter.avatar} 
                    alt={voter.name} 
                    className="w-9 h-9 rounded-xl object-cover border border-violet-500/20"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-violet-100">{voter.name}</span>
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">{voter.role}</span>
                  </div>
                </div>

                {/* Big Selected Emoji */}
                <motion.div 
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  className="text-2xl cursor-default p-1 select-none"
                >
                  {voter.emoji}
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Quote Preview */}
          <div className="bg-[#05030f]/60 p-3 rounded-2xl border border-violet-500/10 flex flex-col gap-1.5 text-[11px]">
            <span className="font-mono text-[8px] text-zinc-500 uppercase tracking-wide">Original Message</span>
            <p className="text-zinc-300 italic line-clamp-2">
              "{message.content.startsWith('🎙️') ? 'Voice Memo' : message.content}"
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
