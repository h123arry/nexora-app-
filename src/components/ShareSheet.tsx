import React, { useState, useEffect } from 'react';
import { 
  X, Copy, MessageSquare, Send, Check, Bookmark, 
  Rocket, Link2, Share2, Globe, Mail, Smartphone, ExternalLink, Sparkles, ShieldCheck 
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
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isReposted, setIsReposted] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [realChats, setRealChats] = useState<Chat[]>([]);

  // Load real chats from localStorage for friend list
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = () => {
      onClose();
    };
    window.addEventListener('nexora-escape', handleEscape);

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

    return () => {
      window.removeEventListener('nexora-escape', handleEscape);
    };
  }, [isOpen, currentUser?.id, onClose]);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/post/${post?.id || 'feed'}`;

  const handleToggleSelectRecipient = (chatId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
  };

  const handleSendToSelected = () => {
    if (selectedRecipients.length === 0) return;
    selectedRecipients.forEach(chatId => {
      if (!sentRecipients.includes(chatId)) {
        onShare(chatId);
      }
    });
    setSentRecipients(prev => [...prev, ...selectedRecipients.filter(id => !prev.includes(id))]);
    setSelectedRecipients([]);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🚀 Post shared successfully via Nexora Direct!' }));
    setTimeout(() => {
      onClose();
    }, 800);
  };

  const handleRepost = () => {
    if (isReposted) return;
    setIsReposted(true);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🚀 Reposted successfully to your profile feed!' }));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Link copied to clipboard.' }));
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
      bg: 'bg-[#25D366]/15 hover:bg-[#25D366]/25 border-[#25D366]/30 text-[#25D366]',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
        </svg>
      ),
      action: () => {
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(`Check out this post on Nexora: ${shareUrl}`)}`, '_blank');
      }
    },
    { 
      id: 'instagram', 
      name: 'Instagram', 
      bg: 'bg-gradient-to-tr from-[#f9ce34]/20 via-[#ee2a7b]/20 to-[#6228d7]/20 hover:from-[#f9ce34]/30 hover:via-[#ee2a7b]/30 hover:to-[#6228d7]/30 border-pink-500/30 text-pink-400',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </svg>
      ),
      action: () => {
        handleCopyLink();
        window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Link copied! Ready to paste in Instagram.' }));
      }
    },
    { 
      id: 'tiktok', 
      name: 'TikTok', 
      bg: 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.21-2.35.72-4.73 2.45-6.32 1.75-1.6 4.17-2.36 6.55-2.01v4.12c-1.11-.23-2.3.05-3.13.82-.84.77-1.25 1.96-1.05 3.09.2 1.13 1.1 2.05 2.24 2.25 1.14.2 2.34-.17 3.09-1.04.53-.62.82-1.42.85-2.23.04-3.55 0-7.1 0-10.65z"/>
        </svg>
      ),
      action: () => {
        handleCopyLink();
        window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Link copied for TikTok sharing!' }));
      }
    },
    { 
      id: 'twitter', 
      name: 'X', 
      bg: 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white',
      icon: (
        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      action: () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this amazing post on Nexora!`)}`, '_blank');
      }
    },
    { 
      id: 'facebook', 
      name: 'Facebook', 
      bg: 'bg-[#1877F2]/15 hover:bg-[#1877F2]/25 border-[#1877F2]/30 text-[#1877F2]',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
      }
    },
    { 
      id: 'telegram', 
      name: 'Telegram', 
      bg: 'bg-[#229ED9]/15 hover:bg-[#229ED9]/25 border-[#229ED9]/30 text-[#229ED9]',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.14-.261.26-.536.26l.21-3.05 5.56-5.022c.242-.213-.054-.334-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.535-.195 1.006.132.832.935z"/>
        </svg>
      ),
      action: () => {
        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Check out this post on Nexora`)}`, '_blank');
      }
    },
    { 
      id: 'discord', 
      name: 'Discord', 
      bg: 'bg-[#5865F2]/15 hover:bg-[#5865F2]/25 border-[#5865F2]/30 text-[#5865F2]',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
      ),
      action: () => {
        handleCopyLink();
        window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Link copied for Discord!' }));
      }
    },
    { 
      id: 'snapchat', 
      name: 'Snapchat', 
      bg: 'bg-[#FFFC00]/15 hover:bg-[#FFFC00]/25 border-[#FFFC00]/30 text-[#FFFC00]',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 4.145 2.115 7.797 5.337 9.946-.225-.75-.383-1.638-.456-2.313-.06-.563-.122-1.334.122-1.745.228-.388.75-.595 1.32-.782 1.05-.342 1.765-.89 2.05-1.583.176-.43.136-.93-.11-1.455-.664-1.41-1.037-3.21-1.037-5.02 0-3.245 1.637-5.518 4.79-5.518 3.153 0 4.79 2.273 4.79 5.518 0 1.81-.373 3.61-1.038 5.02-.246.525-.286 1.025-.11 1.455.285.693 1 1.241 2.05 1.583.57.187 1.092.394 1.32.782.244.411.182 1.182.122 1.745-.073.675-.231 1.563-.456 2.313 3.222-2.149 5.337-5.801 5.337-9.946C24.004 5.367 18.638 0 12.017 0z"/>
        </svg>
      ),
      action: () => {
        handleCopyLink();
        window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Link copied for Snapchat!' }));
      }
    },
    { 
      id: 'email', 
      name: 'Gmail', 
      bg: 'bg-[#EA4335]/15 hover:bg-[#EA4335]/25 border-[#EA4335]/30 text-[#EA4335]',
      icon: <Mail className="w-5 h-5" />,
      action: () => {
        window.open(`mailto:?subject=${encodeURIComponent('Check out this post on Nexora')}&body=${encodeURIComponent(`I thought you might enjoy this: ${shareUrl}`)}`, '_blank');
      }
    },
    { 
      id: 'sms', 
      name: 'SMS', 
      bg: 'bg-emerald-600/15 hover:bg-emerald-600/25 border-emerald-500/30 text-emerald-400',
      icon: <Smartphone className="w-5 h-5" />,
      action: () => {
        window.open(`sms:?body=${encodeURIComponent(`Check out this post on Nexora: ${shareUrl}`)}`, '_blank');
      }
    },
    { 
      id: 'copy', 
      name: 'Copy Link', 
      bg: 'bg-violet-600/15 hover:bg-violet-600/25 border-white/10 text-violet-400',
      icon: <Link2 className="w-5 h-5" />,
      action: handleCopyLink
    },
    { 
      id: 'system', 
      name: 'More...', 
      bg: 'bg-zinc-800/80 hover:bg-zinc-700 border-zinc-700 text-zinc-200',
      icon: <Share2 className="w-5 h-5" />,
      action: async () => {
        if (navigator.share) {
          try {
            await navigator.share({
              title: post?.name ? `${post.name}'s Post on Nexora` : 'Nexora Post',
              text: post?.content || 'Check out this post on Nexora!',
              url: shareUrl,
            });
          } catch (err) {}
        } else {
          handleCopyLink();
        }
      }
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/75 backdrop-blur-sm select-none" 
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="w-full max-w-[520px] rounded-t-[36px] bg-[#0d0b1f]/98 border-t border-white/10 p-6 shadow-md overflow-y-auto max-h-[88vh] text-left" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-4" />

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600/20 border border-white/10 flex items-center justify-center text-violet-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-base text-white tracking-tight">Share Post</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Send directly or to external apps</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-6">
          <span className="text-[11px] font-mono tracking-wider text-violet-400 font-bold uppercase mb-3 px-1 block">Share with Friends</span>
          {realChats.length > 0 ? (
            <div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
                {realChats.map((chat) => {
                  const isSelected = selectedRecipients.includes(chat.id);
                  const isSent = sentRecipients.includes(chat.id);

                  return (
                    <div 
                      key={chat.id} 
                      onClick={() => !isSent && handleToggleSelectRecipient(chat.id)}
                      className="flex flex-col items-center gap-1.5 shrink-0 w-16 cursor-pointer group"
                    >
                      <div className="relative">
                        <img 
                          src={chat.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                          alt={chat.partnerName || 'User'} 
                          className={`h-14 w-14 rounded-full object-cover border-2 transition-all ${
                            isSelected ? 'border-violet-500 scale-105' : 'border-transparent'
                          }`} 
                          referrerPolicy="no-referrer"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-violet-600/40 rounded-full flex items-center justify-center backdrop-blur-[1px]">
                            <Check className="w-6 h-6 text-white stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <span className="text-[10px] font-sans font-medium text-zinc-300 truncate w-full text-center">
                        {chat.partnerName || 'User'}
                      </span>
                    </div>
                  );
                })}
              </div>
              {selectedRecipients.length > 0 && (
                <button
                  onClick={handleSendToSelected}
                  className="w-full mt-3 py-3.5 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 hover:opacity-95 text-white font-bold rounded-full shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Send to {selectedRecipients.length} friends
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
              <p className="text-xs text-zinc-400 font-sans">No active direct chats yet. Connect with creators across Nexora to share instantly!</p>
            </div>
          )}
        </div>

        {/* EXTERNAL SHARING APPS GRID */}
        <div className="mb-6">
          <h4 className="text-[11px] font-mono tracking-wider text-violet-400 font-bold uppercase mb-3 px-1">Share To External App</h4>
          <div className="grid grid-cols-4 gap-4">
            {socialDestinations.map((chan) => (
              <button
                key={chan.id}
                onClick={chan.action}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm border ${chan.bg}`}>
                  {chan.icon}
                </div>
                <span className="font-sans font-medium text-[10px] text-zinc-300 truncate w-full text-center">{chan.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* NEXORA QUICK ACTIONS */}
        <div className="border-t border-white/10 pt-4">
          <h4 className="text-[11px] font-mono tracking-wider text-violet-400 font-bold uppercase mb-2 px-1">Nexora Quick Actions</h4>
          <div className="grid grid-cols-3 gap-2.5">
            {/* Repost */}
            <button
              onClick={handleRepost}
              className={`flex flex-col items-center justify-center p-3.5 rounded-full border text-xs transition-all active:scale-95 cursor-pointer backdrop-blur-md ${
                isReposted 
                  ? 'bg-zinc-900 border-zinc-800 text-zinc-500' 
                  : 'bg-white/10 hover:bg-white/15 border-white/15 text-white shadow-md'
              }`}
            >
              <Rocket className="w-4 h-4 text-violet-400 mb-1" />
              <span className="font-sans font-bold text-xs">{isReposted ? 'Reposted' : 'Repost'}</span>
            </button>

            {/* Copy Link */}
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center justify-center p-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs transition-all active:scale-95 cursor-pointer shadow-md backdrop-blur-md"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400 mb-1" /> : <Link2 className="w-4 h-4 text-cyan-400 mb-1" />}
              <span className="font-sans font-bold text-xs">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>

            {/* Save to Board */}
            <button
              onClick={handleSaveToggle}
              className="flex flex-col items-center justify-center p-3.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs transition-all active:scale-95 cursor-pointer shadow-md backdrop-blur-md"
            >
              <Bookmark className={`w-4 h-4 mb-1 ${isSaved ? 'text-yellow-400 fill-yellow-400' : 'text-amber-400'}`} />
              <span className="font-sans font-bold text-xs">{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
