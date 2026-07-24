import React, { useState, useEffect } from 'react';
import { 
  X, Copy, MessageSquare, Send, Check, Bookmark, 
  Rocket, Link2, Share2, Globe, Mail, Smartphone, ExternalLink, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Chat, User } from '../types';

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
    content?: string;
    videoUrl?: string;
  };
  currentUser?: User;
  onSave?: () => void;
}

export default function ShareSheet({ 
  isOpen, 
  onClose, 
  onShare, 
  post,
  currentUser,
  onSave
}: ShareSheetProps) {
  const [sentRecipients, setSentRecipients] = useState<string[]>([]);
  const [isReposted, setIsReposted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [realChats, setRealChats] = useState<Chat[]>([]);

  // Load real chats from localStorage for recent contacts
  useEffect(() => {
    if (!isOpen) return;
    try {
      const uid = currentUser?.id || 'default';
      const saved = localStorage.getItem(`nexora_chats_${uid}`);
      if (saved) {
        const parsed: Chat[] = JSON.parse(saved);
        setRealChats(parsed);
      } else {
        setRealChats([]);
      }
    } catch (e) {
      setRealChats([]);
    }
  }, [isOpen, currentUser?.id]);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/post/${post?.id || 'feed'}`;

  const handleSendToChat = (chatId: string, partnerName: string) => {
    if (sentRecipients.includes(chatId)) return;
    setSentRecipients(prev => [...prev, chatId]);
    onShare(chatId);
    window.dispatchEvent(new CustomEvent('toast', { detail: `🚀 Sent to ${partnerName}!` }));
  };

  const handleRepost = () => {
    if (isReposted) return;
    setIsReposted(true);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🚀 Reposted successfully to your profile feed!' }));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Link copied.' }));
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveToggle = () => {
    const next = !isSaved;
    setIsSaved(next);
    onSave?.();
    window.dispatchEvent(new CustomEvent('toast', { detail: next ? '🔖 Saved to your bookmarks.' : '🔖 Removed from bookmarks.' }));
  };

  const socialDestinations = [
    { 
      id: 'whatsapp', 
      name: 'WhatsApp', 
      color: 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-600/30',
      action: () => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this post on Nexora: ${shareUrl}`)}`, '_blank');
      }
    },
    { 
      id: 'instagram', 
      name: 'Instagram', 
      color: 'bg-pink-600/20 text-pink-400 border-pink-500/30 hover:bg-pink-600/30',
      action: () => {
        handleCopyLink();
        window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Link copied! Ready to paste in Instagram Stories.' }));
      }
    },
    { 
      id: 'telegram', 
      name: 'Telegram', 
      color: 'bg-sky-600/20 text-sky-400 border-sky-500/30 hover:bg-sky-600/30',
      action: () => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this post on Nexora`)}`, '_blank');
      }
    },
    { 
      id: 'twitter', 
      name: 'X / Twitter', 
      color: 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700',
      action: () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this amazing post on Nexora!`)}`, '_blank');
      }
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      color: 'bg-blue-600/20 text-blue-400 border-blue-500/30 hover:bg-blue-600/30',
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
      }
    },
    { 
      id: 'messenger', 
      name: 'Messenger', 
      color: 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30 hover:bg-indigo-600/30',
      action: () => {
        handleCopyLink();
        window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Link copied for Messenger sharing!' }));
      }
    },
    { 
      id: 'snapchat', 
      name: 'Snapchat', 
      color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30',
      action: () => {
        handleCopyLink();
        window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Link copied for Snapchat!' }));
      }
    },
    { 
      id: 'discord', 
      name: 'Discord', 
      color: 'bg-indigo-500/25 text-indigo-300 border-indigo-500/30 hover:bg-indigo-500/40',
      action: () => {
        handleCopyLink();
        window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Link copied for Discord!' }));
      }
    },
    { 
      id: 'linkedin', 
      name: 'LinkedIn', 
      color: 'bg-blue-700/20 text-blue-300 border-blue-600/30 hover:bg-blue-700/30',
      action: () => {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
      }
    },
    { 
      id: 'email', 
      name: 'Email', 
      color: 'bg-violet-600/20 text-violet-300 border-violet-500/30 hover:bg-violet-600/30',
      action: () => {
        window.open(`mailto:?subject=${encodeURIComponent('Check out this post on Nexora')}&body=${encodeURIComponent(`I thought you might enjoy this: ${shareUrl}`)}`, '_blank');
      }
    },
    { 
      id: 'sms', 
      name: 'Messages', 
      color: 'bg-emerald-700/20 text-emerald-300 border-emerald-600/30 hover:bg-emerald-700/30',
      action: () => {
        window.open(`sms:?body=${encodeURIComponent(`Check out this post on Nexora: ${shareUrl}`)}`, '_blank');
      }
    },
    { 
      id: 'system', 
      name: 'System Share', 
      color: 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800',
      action: async () => {
        if (navigator.share) {
          try {
            await navigator.share({
              title: post?.name ? `${post.name}'s Post on Nexora` : 'Nexora Post',
              text: post?.content || 'Check out this post on Nexora!',
              url: shareUrl,
            });
          } catch (err) {
            // Cancelled or unsupported
          }
        } else {
          handleCopyLink();
        }
      }
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/70 backdrop-blur-xs select-none" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 240 }}
        className="w-full max-w-[500px] rounded-t-[32px] bg-[#0c0a21]/98 border-t border-violet-500/30 p-6 shadow-2xl overflow-y-auto max-h-[85vh] custom-scrollbar text-left" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-sm text-white tracking-tight">Share Nexora Post</h3>
              <p className="text-[10px] text-zinc-400 font-mono">Spread the discovery</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SECTION 1: Frequently Contacted / Recent Conversations */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-[10px] font-mono tracking-widest text-violet-400 font-bold uppercase">Recent Conversations</span>
            <span className="text-[9px] font-mono text-zinc-500">{realChats.length} active</span>
          </div>

          {realChats.length === 0 ? (
            <div className="p-4 rounded-2xl bg-white/2 border border-white/5 text-center">
              <p className="text-xs text-zinc-400 font-sans">No recent conversations yet.</p>
              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">Start chatting from your Inbox to share directly here.</p>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {realChats.map((chat) => {
                const isSent = sentRecipients.includes(chat.id);
                return (
                  <div key={chat.id} className="flex flex-col items-center gap-1.5 shrink-0 relative w-16">
                    <div className="relative cursor-pointer" onClick={() => handleSendToChat(chat.id, chat.partnerName || 'User')}>
                      <img 
                        src={chat.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                        alt={chat.partnerName || 'User'} 
                        className="h-14 w-14 rounded-2xl object-cover border-2 border-violet-500/40 shadow-md hover:border-violet-400 transition-all" 
                      />
                      {chat.isPartnerOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0c0a21]" />
                      )}
                    </div>
                    <span className="text-[10px] font-sans font-medium text-zinc-300 truncate w-full text-center">
                      {chat.partnerName || 'User'}
                    </span>
                    <button
                      onClick={() => handleSendToChat(chat.id, chat.partnerName || 'User')}
                      className={`w-full py-1 rounded-lg text-[9px] font-mono font-bold uppercase transition-all shadow-sm ${
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
          )}
        </div>

        {/* SECTION 2: Sharing Destinations (Recognizable Apps) */}
        <div className="mb-6">
          <h4 className="text-[10px] font-mono tracking-widest text-violet-400 font-bold uppercase mb-3 px-1">Share To External App</h4>
          <div className="grid grid-cols-4 gap-2.5">
            {socialDestinations.map((chan) => (
              <button
                key={chan.id}
                onClick={chan.action}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl text-xs transition-all border ${chan.color} active:scale-95 cursor-pointer shadow-sm group`}
              >
                <div className="w-9 h-9 rounded-xl bg-black/30 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <span className="font-sans font-bold text-[10px] truncate max-w-full">{chan.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 3: Nexora Quick Actions */}
        <div className="space-y-2 border-t border-white/10 pt-4">
          <h4 className="text-[10px] font-mono tracking-widest text-violet-400 font-bold uppercase mb-2 px-1">Nexora Quick Actions</h4>
          <div className="grid grid-cols-3 gap-2">
            {/* Repost */}
            <button
              onClick={handleRepost}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs transition-all active:scale-95 cursor-pointer ${
                isReposted 
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-500' 
                  : 'bg-violet-950/40 border-violet-500/20 hover:border-violet-500/40 text-white shadow-md'
              }`}
            >
              <Rocket className="w-4 h-4 text-violet-400 mb-1.5" />
              <span className="font-sans font-bold text-[10px]">{isReposted ? 'Reposted' : 'Repost'}</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-white text-xs transition-all active:scale-95 cursor-pointer shadow-md"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400 mb-1.5" /> : <Link2 className="w-4 h-4 text-cyan-400 mb-1.5" />}
              <span className="font-sans font-bold text-[10px]">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            {/* Save to Board */}
            <button
              onClick={handleSaveToggle}
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-white text-xs transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <Bookmark className={`w-4 h-4 mb-1.5 ${isSaved ? 'text-yellow-400 fill-yellow-400' : 'text-amber-400'}`} />
              <span className="font-sans font-bold text-[10px]">{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
