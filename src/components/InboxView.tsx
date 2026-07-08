import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Bell, Sparkles, Trash2, CheckCheck, Handshake, Check, X, ChevronRight, Briefcase, UserPlus, Info, ExternalLink } from 'lucide-react';
import { User, Chat, Message, Notification } from '../types';
import MessagesView from './MessagesView';
import NotificationsView from './NotificationsView';

interface InboxViewProps {
  currentUser: User;
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  onSendMessage: (chatId: string, content: string) => void;
  onReceiveBotMessage: (chatId: string, content: string, senderId: string) => void;
  notifications: Notification[];
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onViewProfile?: (userId: string) => void;
}

interface CollabRequest {
  id: string;
  brand: string;
  logo: string;
  offer: string;
  payout: string;
  requirements: string;
  status: 'pending' | 'accepted' | 'declined';
  category: string;
}

export default function InboxView({
  currentUser,
  chats,
  messages,
  onSendMessage,
  onReceiveBotMessage,
  notifications,
  onMarkAllAsRead,
  onClearNotifications,
  onViewProfile
}: InboxViewProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'notifications' | 'requests'>('messages');

  // Hardcoded premium interactable collaboration requests tailored for Nexora creators
  const [collabRequests, setCollabRequests] = useState<CollabRequest[]>([
    {
      id: 'collab-1',
      brand: 'Lumina VR Glasses',
      logo: 'https://images.unsplash.com/photo-1593508512255-86ab42a8e620?w=100&auto=format&fit=crop&q=80',
      offer: 'Hardware Review & Unboxing Sponsorship',
      payout: '$1,200 USD + Lumina XR Headset',
      requirements: 'Create a 30s high-fidelity video showcasing headtracking features on your Nexora feed.',
      status: 'pending',
      category: 'Brand Deal'
    },
    {
      id: 'collab-2',
      brand: 'Cyberpunk Outfitters',
      logo: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=100&auto=format&fit=crop&q=80',
      offer: 'Nexora Core Collection Co-branding Campaign',
      payout: '$3,500 USD + 15% Royalties',
      requirements: 'Incorporate 3 wearable items in your next media upload and tag with #CyberOutfitters.',
      status: 'pending',
      category: 'Partnership'
    },
    {
      id: 'collab-3',
      brand: 'Aether Energy Drink',
      logo: 'https://images.unsplash.com/photo-1622543953490-0b70039546f9?w=100&auto=format&fit=crop&q=80',
      offer: 'Exclusive Digital Creator Partnership',
      payout: '$800 USD Monthly Retainer',
      requirements: 'Add Aether widget overlay link to your profile banner for 30 days.',
      status: 'pending',
      category: 'Sponsorship'
    }
  ]);

  const handleAcceptCollab = (id: string, brandName: string) => {
    setCollabRequests(prev => 
      prev.map(c => c.id === id ? { ...c, status: 'accepted' } : c)
    );
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: `🤝 Accepted partnership with ${brandName}! Our campaign manager will DM you.` 
    }));
  };

  const handleDeclineCollab = (id: string, brandName: string) => {
    setCollabRequests(prev => 
      prev.map(c => c.id === id ? { ...c, status: 'declined' } : c)
    );
    window.dispatchEvent(new CustomEvent('toast', { 
      detail: `❌ Partnership offer from ${brandName} has been archived.` 
    }));
  };

  // Filter out any connection requests (follow events) or communities invites from regular notifications list
  const standardNotifications = notifications.filter(n => n.type !== 'follow' && n.type !== 'community');
  const connectionNotifications = notifications.filter(n => n.type === 'follow' || n.type === 'community');

  return (
    <div id="nexora-inbox-wrapper" className="flex flex-col h-full w-full bg-[#030112]">
      {/* 1. Inbox Header & Top-Level Tab Switcher */}
      <div className="flex flex-col border-b border-white/5 pb-1 mb-2 pt-4 px-4 shrink-0 bg-[#030112]/50 backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2 font-sans">
            Inbox 
            <span className="text-[10px] font-mono tracking-widest text-violet-400 border border-violet-500/20 px-2 py-0.5 rounded-full uppercase bg-violet-500/5">
              Creator Hub
            </span>
          </h2>
        </div>

        {/* Simplified Navigation Tab Bar */}
        <div className="flex gap-1.5 p-1 bg-white/5 border border-white/5 rounded-2xl max-w-md">
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'messages' 
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Messages</span>
            {chats.length > 0 && (
              <span className="text-[9px] font-mono bg-white/20 text-white font-black px-1.5 py-0.5 rounded-full">
                {chats.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'notifications' 
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Alerts</span>
            {standardNotifications.filter(n => !n.isRead).length > 0 && (
              <span className="text-[9px] font-mono bg-pink-500 text-white font-black px-1.5 py-0.5 rounded-full animate-pulse">
                {standardNotifications.filter(n => !n.isRead).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'requests' 
                ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg' 
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Handshake className="w-3.5 h-3.5" />
            <span>Requests</span>
            {collabRequests.filter(c => c.status === 'pending').length > 0 && (
              <span className="text-[9px] font-mono bg-cyan-500 text-white font-black px-1.5 py-0.5 rounded-full">
                {collabRequests.filter(c => c.status === 'pending').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Main Inbox Workspace Content Pane */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-6">
        <AnimatePresence mode="wait">
          {activeTab === 'messages' && (
            <motion.div
              key="messages-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              <MessagesView
                currentUser={currentUser}
                chats={chats}
                messages={messages}
                onSendMessage={onSendMessage}
                onReceiveBotMessage={onReceiveBotMessage}
              />
            </motion.div>
          )}

          {activeTab === 'notifications' && (
            <motion.div
              key="notifications-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              <NotificationsView
                notifications={standardNotifications}
                currentUser={currentUser}
                onMarkAllAsRead={onMarkAllAsRead}
                onClearNotifications={onClearNotifications}
                onViewProfile={onViewProfile}
              />
            </motion.div>
          )}

          {activeTab === 'requests' && (
            <motion.div
              key="requests-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 text-left"
            >
              {/* Creator Partner Pitch header banner */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-violet-950/40 via-cyan-950/20 to-pink-950/15 border border-white/5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1 z-10 max-w-md">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-extrabold">Brand Monetisation Active</span>
                  </div>
                  <h3 className="text-sm font-sans font-extrabold text-white">Nexora Creator Partnerships</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Based on your content velocity, these premium brands have requested direct media co-ops and sponsored content deals. Accept to start earning.
                  </p>
                </div>
                <div className="flex items-center gap-2 z-10 shrink-0">
                  <div className="px-3 py-1.5 bg-black/40 border border-white/5 rounded-xl flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-[10px] font-mono text-zinc-300">Creator Rank: <strong className="text-white">Gold Elite</strong></span>
                  </div>
                </div>
              </div>

              {/* Collab Requests List */}
              <div className="space-y-3">
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold px-1">
                  Brand Collaboration Pitches ({collabRequests.filter(c => c.status === 'pending').length})
                </h4>

                {collabRequests.length === 0 && (
                  <div className="p-8 text-center rounded-2xl border border-white/5 bg-zinc-950/30">
                    <p className="text-xs font-mono text-zinc-500">No active collaboration proposals currently.</p>
                  </div>
                )}

                {collabRequests.map(collab => (
                  <motion.div
                    key={collab.id}
                    layout
                    className="p-4 rounded-2xl bg-[#0c0a21]/60 border border-white/5 hover:border-white/10 transition-all flex flex-col sm:flex-row items-start gap-4 relative overflow-hidden"
                  >
                    {/* Brand Logo / Unsplash cover */}
                    <img 
                      src={collab.logo} 
                      alt={collab.brand} 
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 shadow-lg shrink-0" 
                      referrerPolicy="no-referrer"
                    />

                    {/* Pitch details */}
                    <div className="flex-1 min-w-0 space-y-1.5 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-sans font-black text-white text-sm">{collab.brand}</span>
                        <span className="text-[9px] font-mono tracking-wider uppercase bg-violet-500/10 text-violet-300 border border-violet-500/20 px-1.5 py-0.5 rounded-md font-bold">
                          {collab.category}
                        </span>
                        <span className="text-[10px] font-mono text-cyan-400 font-black">
                          💰 Offer: {collab.payout}
                        </span>
                      </div>

                      <h5 className="text-xs font-sans font-bold text-zinc-200">{collab.offer}</h5>
                      <p className="text-xs text-zinc-400 leading-relaxed font-sans">{collab.requirements}</p>

                      {/* Acceptance badge/states */}
                      {collab.status !== 'pending' && (
                        <div className="pt-1">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                            collab.status === 'accepted' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}>
                            {collab.status === 'accepted' ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {collab.status === 'accepted' ? 'Partnership Established' : 'Pitch Declined'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    {collab.status === 'pending' && (
                      <div className="flex sm:flex-col gap-1.5 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                        <button
                          onClick={() => handleAcceptCollab(collab.id, collab.brand)}
                          className="flex-1 sm:flex-initial py-2 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Accept</span>
                        </button>
                        <button
                          onClick={() => handleDeclineCollab(collab.id, collab.brand)}
                          className="flex-1 sm:flex-initial py-2 px-3.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer border border-white/5"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Connection invites & requests */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-zinc-500 font-bold px-1">
                  Connection & Circle Invites ({connectionNotifications.length})
                </h4>

                {connectionNotifications.length === 0 && (
                  <div className="p-8 text-center rounded-2xl border border-white/5 bg-zinc-950/30">
                    <p className="text-xs font-mono text-zinc-500">No active community invites or connection requests currently.</p>
                  </div>
                )}

                {connectionNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className="p-3.5 rounded-xl bg-[#0a071c]/40 border border-white/5 flex items-center gap-3"
                  >
                    <img 
                      src={notification.avatar} 
                      alt={notification.username} 
                      className="w-8 h-8 rounded-lg object-cover border border-white/5 shrink-0"
                    />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-xs text-white">
                        <strong className="font-sans font-extrabold text-violet-300">@{notification.username}</strong> {notification.content}
                      </p>
                      <span className="text-[9px] font-mono text-zinc-500">{notification.timestamp}</span>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Connected with @${notification.username}!` }));
                        }}
                        className="p-1 bg-violet-600/20 text-violet-400 hover:text-white rounded-md border border-violet-500/10 cursor-pointer"
                        title="Accept connection"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
