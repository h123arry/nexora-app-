import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, Check, CheckCheck, Send, MessageSquare, 
  ArrowLeft, ShieldCheck, User as UserIcon, X, Sparkles,
  Paperclip, Image as ImageIcon, Video, Mic, Smile, MoreVertical,
  Phone, Archive, Pin, Trash2, Globe, Quote, Eye, EyeOff, Volume2, Pause, Play, Download
} from 'lucide-react';
import { User, Chat, Message, ExtendedMessage } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  deleteDoc 
} from 'firebase/firestore';
import MessageBubble from './MessageBubble';
import AttachmentMenu from './AttachmentMenu';
import VoiceRecorder from './VoiceRecorder';
import EmojiPicker from './EmojiPicker';
import MediaGallery from './MediaGallery';
import CallScreen from './CallScreen';

interface NewInboxViewProps {
  currentUser: User;
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  creators?: User[];
}

export default function NewInboxView({
  currentUser,
  chats: initialChats,
  messages: initialMessages,
  creators = []
}: NewInboxViewProps) {
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem(`nexora_chats_${currentUser.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return initialChats || [];
  });

  const [localMessages, setLocalMessages] = useState<{ [chatId: string]: ExtendedMessage[] }>(() => {
    const saved = localStorage.getItem(`nexora_messages_${currentUser.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const mapped: { [chatId: string]: ExtendedMessage[] } = {};
    if (initialMessages) {
      Object.keys(initialMessages).forEach(k => {
        mapped[k] = (initialMessages[k] || []).map(m => ({ ...m }));
      });
    }
    return mapped;
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inboxTab, setInboxTab] = useState<'chats' | 'requests' | 'archived'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Interactive chat features
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video'; partnerName: string; partnerAvatar: string } | null>(null);
  
  // Message context / reply / edit
  const [activeContextMessageId, setActiveContextMessageId] = useState<string | null>(null);
  const [replyQuoteText, setReplyQuoteText] = useState<string | null>(null);
  const [replyMessageId, setReplyMessageId] = useState<string | null>(null);

  // Pinned & Archived & Muted & Requests state
  const [pinnedChats, setPinnedChats] = useState<string[]>([]);
  const [archivedChats, setArchivedChats] = useState<string[]>([]);
  const [messageRequests, setMessageRequests] = useState<Chat[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Persistence
  useEffect(() => {
    localStorage.setItem(`nexora_chats_${currentUser.id}`, JSON.stringify(chats));
  }, [chats, currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`nexora_messages_${currentUser.id}`, JSON.stringify(localMessages));
  }, [localMessages, currentUser.id]);

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages, activeChatId]);

  // Firestore real-time listener
  useEffect(() => {
    if (!activeChatId || !db) return;

    const messagesRef = collection(db, `chats/${activeChatId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgsList: ExtendedMessage[] = [];
      snapshot.forEach(doc => {
        msgsList.push({ id: doc.id, ...doc.data() } as any);
      });

      if (msgsList.length > 0) {
        setLocalMessages(prev => ({
          ...prev,
          [activeChatId]: msgsList
        }));
        setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, unreadCount: 0 } : c));
      }
    }, (error) => {
      console.warn('[Inbox] Message snapshot error:', error);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeMessages = activeChatId ? (localMessages[activeChatId] || []) : [];

  // Filtered chats
  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      const isArchived = archivedChats.includes(chat.id);
      if (inboxTab === 'archived' && !isArchived) return false;
      if (inboxTab === 'chats' && isArchived) return false;
      if (inboxTab === 'requests') return messageRequests.some(r => r.id === chat.id);

      const q = searchQuery.toLowerCase();
      return (
        chat.partnerName?.toLowerCase().includes(q) ||
        chat.username?.toLowerCase().includes(q) ||
        chat.lastMessage?.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      const aPinned = pinnedChats.includes(a.id) ? 1 : 0;
      const bPinned = pinnedChats.includes(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      const aTime = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
      const bTime = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [chats, searchQuery, inboxTab, archivedChats, pinnedChats, messageRequests]);

  const availableUsers = useMemo(() => {
    const q = userSearchQuery.toLowerCase();
    return creators.filter(u => {
      if (u.id === currentUser.id) return false;
      return (
        u.name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q)
      );
    });
  }, [creators, currentUser.id, userSearchQuery]);

  // Send message
  const handleSendMessage = async (customContent?: string, mediaData?: { type: string; url: string; name?: string }) => {
    const contentToSend = customContent || newMessageText.trim();
    if (!contentToSend && !mediaData) return;
    if (!activeChatId) return;

    if (!customContent) {
      setNewMessageText('');
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const nowIso = new Date().toISOString();

    const newMsg: ExtendedMessage = {
      id: messageId,
      chatId: activeChatId,
      senderId: currentUser.id,
      content: contentToSend || (mediaData ? `[${mediaData.type.toUpperCase()}]` : ''),
      timestamp: nowIso,
      status: 'sent',
      replyToQuote: replyQuoteText || undefined,
      customMediaType: mediaData?.type,
      videoUrl: mediaData?.type === 'video' || mediaData?.type === 'image' ? mediaData.url : undefined,
      fileName: mediaData?.name
    };

    setReplyQuoteText(null);
    setReplyMessageId(null);

    // Instant local update
    setLocalMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));

    const previewText = mediaData ? `Sent a ${mediaData.type}` : contentToSend;
    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          lastMessage: previewText,
          lastTimestamp: nowIso
        };
      }
      return c;
    }));

    // Firestore sync
    try {
      if (db) {
        const msgDocRef = doc(db, `chats/${activeChatId}/messages`, messageId);
        await setDoc(msgDocRef, { ...newMsg });

        const chatDocRef = doc(db, 'chats', activeChatId);
        await updateDoc(chatDocRef, {
          lastMessage: previewText,
          lastTimestamp: nowIso
        }).catch(async () => {
          await setDoc(chatDocRef, {
            id: activeChatId,
            lastMessage: previewText,
            lastTimestamp: nowIso
          }, { merge: true });
        });
      }
    } catch (e) {
      console.warn('[Inbox] Firestore send error:', e);
    }
  };

  const handleStartChatWithUser = (user: User) => {
    let existingChat = chats.find(c => c.partnerId === user.id);
    if (existingChat) {
      setActiveChatId(existingChat.id);
      setShowNewMessageModal(false);
      return;
    }

    const newChatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newChat: Chat = {
      id: newChatId,
      partnerId: user.id,
      partnerName: user.name,
      partnerAvatar: user.avatar,
      partnerBio: user.bio || 'Secure Node connection.',
      isPartnerOnline: true,
      unreadCount: 0,
      lastMessage: 'Started secure conversation',
      lastTimestamp: new Date().toISOString(),
      username: user.username,
      isGroup: false,
      isBroadcast: false
    };

    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    setShowNewMessageModal(false);

    if (db) {
      setDoc(doc(db, 'chats', newChatId), {
        id: newChatId,
        participants: [currentUser.id, user.id],
        partnerId: user.id,
        partnerName: user.name,
        partnerAvatar: user.avatar,
        lastMessage: 'Started secure conversation',
        lastTimestamp: new Date().toISOString(),
        unreadCount: 0
      }).catch(err => console.warn('[Inbox] Firestore create chat error:', err));
    }
  };

  const handleReactMessage = (msgId: string, emoji: string) => {
    if (!activeChatId) return;
    setLocalMessages(prev => {
      const msgs = prev[activeChatId] || [];
      return {
        ...prev,
        [activeChatId]: msgs.map(m => {
          if (m.id === msgId) {
            const reactions = m.reactions || [];
            const existing = reactions.find(r => r.emoji === emoji);
            let updatedReactions = [...reactions];
            if (existing) {
              if (existing.userIds.includes(currentUser.id)) {
                existing.userIds = existing.userIds.filter(id => id !== currentUser.id);
              } else {
                existing.userIds.push(currentUser.id);
              }
            } else {
              updatedReactions.push({ emoji, userIds: [currentUser.id] });
            }
            return { ...m, reactions: updatedReactions.filter(r => r.userIds.length > 0) };
          }
          return m;
        })
      };
    });
  };

  const handleDeleteMessage = (msgId: string) => {
    if (!activeChatId) return;
    setLocalMessages(prev => ({
      ...prev,
      [activeChatId]: (prev[activeChatId] || []).filter(m => m.id !== msgId)
    }));
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-[var(--nx-canvas)] text-white font-sans overflow-hidden relative">
      
      {/* LEFT COLUMN: Conversation List */}
      <div className={`w-full md:w-96 border-r border-white/10 flex flex-col h-full bg-[var(--nx-surface)] ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/60 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            <h1 className="text-base font-black tracking-tight text-white font-sans">Inbox</h1>
          </div>
          <button
            onClick={() => setShowNewMessageModal(true)}
            className="nx-icon-button inline-flex bg-violet-600 text-white hover:bg-violet-500"
            title="New Message"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs & Search */}
        <div className="p-3 border-b border-white/5 space-y-3 bg-black/30">
          <div className="flex bg-zinc-900/90 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setInboxTab('chats')}
              className={`min-h-11 flex-1 rounded-lg font-bold transition-all ${inboxTab === 'chats' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              Chats
            </button>
            <button
              onClick={() => setInboxTab('requests')}
              className={`min-h-11 flex-1 rounded-lg font-bold transition-all ${inboxTab === 'requests' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              Requests
            </button>
            <button
              onClick={() => setInboxTab('archived')}
              className={`min-h-11 flex-1 rounded-lg font-bold transition-all ${inboxTab === 'archived' ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}
            >
              Archived
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="nx-field w-full pl-9 pr-4 py-2 text-xs font-sans"
            />
          </div>
        </div>

        {/* Conversation List / Empty State */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-none">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-white/10 flex items-center justify-center text-violet-400 mb-4 shadow-md">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Your inbox is empty</h3>
              <p className="text-xs text-zinc-400 max-w-xs mb-6 font-sans">
                No active conversations yet. Start messaging creators or contacts instantly.
              </p>
              <button
                onClick={() => setShowNewMessageModal(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Message
              </button>
            </div>
          ) : (
            filteredChats.map(chat => {
              const isSelected = activeChatId === chat.id;
              const timeDisplay = chat.lastTimestamp 
                ? new Date(chat.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const isPinned = pinnedChats.includes(chat.id);

              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`flex items-center gap-3 p-3.5 cursor-pointer transition-all relative group ${
                    isSelected ? 'bg-violet-950/50 border-l-4 border-violet-500' : 'hover:bg-white/5'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={chat.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={chat.partnerName}
                      className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                    {chat.isPartnerOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-black shadow-sm" />
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold text-white truncate font-sans">
                          {chat.partnerName}
                        </span>
                        {chat.isVerified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        )}
                        {isPinned && (
                          <Pin className="w-3 h-3 text-yellow-400 shrink-0 rotate-45" />
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                        {timeDisplay}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-400 truncate font-sans">
                        {chat.lastMessage || 'Start a conversation'}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="ml-2 px-1.5 py-0.5 bg-violet-600 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center shadow-md shrink-0">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Chat Screen */}
      <div className={`flex-1 flex flex-col h-full bg-[#080614] ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/70 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveChatId(null)}
                  className="md:hidden p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-300 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>

                <div className="relative shrink-0">
                  <img
                    src={activeChat.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                    alt={activeChat.partnerName}
                    className="w-10 h-10 rounded-xl object-cover border border-white/10 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  {activeChat.isPartnerOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-xs font-bold text-white font-sans">{activeChat.partnerName}</h2>
                    {activeChat.isVerified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400 font-mono">
                    {partnerTyping ? (
                      <span className="text-violet-400 animate-pulse font-bold">typing...</span>
                    ) : activeChat.isPartnerOnline ? (
                      'Active now'
                    ) : (
                      'Offline'
                    )}
                  </p>
                </div>
              </div>

              {/* Call & Media Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveCall({ type: 'voice', partnerName: activeChat.partnerName, partnerAvatar: activeChat.partnerAvatar })}
                  className="p-2.5 bg-white/5 hover:bg-violet-600/30 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowMediaGallery(true)}
                  className="p-2.5 bg-white/5 hover:bg-violet-600/30 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Media & Files"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/15 via-black to-black">
              {activeMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-white/10 flex items-center justify-center text-violet-400 mb-3 shadow-sm">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1 font-sans">Secure conversation started</h4>
                  <p className="text-[11px] text-zinc-500 max-w-xs font-sans">
                    Send a message, photo, video, or voice note to begin chatting securely with {activeChat.partnerName}.
                  </p>
                </div>
              ) : (
                activeMessages.map((msg, index) => {
                  const isMe = msg.senderId === currentUser.id;
                  const prevMsg = activeMessages[index - 1];
                  const isGrouped = prevMsg && prevMsg.senderId === msg.senderId;

                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isMe={isMe}
                      isGrouped={Boolean(isGrouped)}
                      isLastInGroup={true}
                      partnerName={activeChat.partnerName}
                      partnerAvatar={activeChat.partnerAvatar}
                      onReply={(m) => {
                        setReplyQuoteText(m.content);
                        setReplyMessageId(m.id);
                      }}
                      onReact={handleReactMessage}
                      onDelete={handleDeleteMessage}
                      onEdit={() => {}}
                      onPin={() => {}}
                      onTranslate={() => {}}
                      searchQuery=""
                      onToggleContextMenu={() => {}}
                      activeContextMessageId={activeContextMessageId}
                      onTogglePlayVoice={() => {}}
                      onLongPress={() => {}}
                      playingVoiceId={null}
                      voiceProgress={0}
                      voicePlaybackSpeed={1}
                      currentUserId={currentUser.id}
                      isPinned={false}
                    />
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Preview Bar */}
            {replyQuoteText && (
              <div className="px-4 py-2 bg-violet-950/40 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Quote className="w-4 h-4 text-violet-400 shrink-0" />
                  <span className="text-xs text-zinc-300 truncate font-sans">
                    Replying to: {replyQuoteText}
                  </span>
                </div>
                <button
                  onClick={() => { setReplyQuoteText(null); setReplyMessageId(null); }}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Chat Input Footer */}
            <div className="p-3 border-t border-white/10 bg-black/80 backdrop-blur-md relative">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAttachmentMenu(true)}
                  className="p-2.5 bg-white/5 hover:bg-violet-600/30 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Attach"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                  className="p-2.5 bg-white/5 hover:bg-violet-600/30 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a secure message..."
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-all font-sans"
                />

                <button
                  onClick={() => setShowVoiceRecorder(true)}
                  className="p-2.5 bg-white/5 hover:bg-violet-600/30 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!newMessageText.trim()}
                  className="p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:hover:bg-violet-600 text-white rounded-xl shadow-lg transition-all flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border border-white/10 flex items-center justify-center text-violet-400 mb-4 shadow-md">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 font-sans">Select a conversation</h3>
            <p className="text-xs text-zinc-500 max-w-sm font-sans">
              Choose a conversation from the left inbox or start a new message to begin secure messaging.
            </p>
          </div>
        )}
      </div>

      {/* NEW MESSAGE MODAL */}
      <AnimatePresence>
        {showNewMessageModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md bg-[#0d0a1f] border border-white/10 rounded-2xl shadow-md overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-sans">New Message</h3>
                <button
                  onClick={() => setShowNewMessageModal(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search people..."
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 font-sans"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-white/5 p-2">
                {availableUsers.length === 0 ? (
                  <div className="py-8 text-center text-xs text-zinc-500">
                    No users found.
                  </div>
                ) : (
                  availableUsers.map(user => (
                    <div
                      key={user.id}
                      onClick={() => handleStartChatWithUser(user)}
                      className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all"
                    >
                      <img
                        src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                        alt={user.name}
                        className="w-10 h-10 rounded-xl object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate font-sans">{user.name}</span>
                          {user.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />}
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono truncate">@{user.username}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ATTACHMENT MENU */}
      <AttachmentMenu
        isOpen={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onSelect={(id) => {
          if (id === 'gallery' || id === 'camera') {
            handleSendMessage('', { type: 'image', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800', name: 'attachment.jpg' });
          } else if (id === 'audio') {
            handleSendMessage('', { type: 'voice', url: '', name: 'voice_note.mp3' });
          } else {
            handleSendMessage(`[Attached Document]`);
          }
        }}
      />

      {/* VOICE RECORDER */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onSendMessage={(audioBlob, duration) => {
            const audioUrl = URL.createObjectURL(audioBlob);
            handleSendMessage('', { type: 'voice', url: audioUrl, name: `Voice Note (${duration}s)` });
            setShowVoiceRecorder(false);
          }}
          onCancel={() => setShowVoiceRecorder(false)}
        />
      )}

      {/* EMOJI PICKER */}
      {showEmojiPicker && (
        <EmojiPicker
          isOpen={showEmojiPicker}
          onClose={() => setShowEmojiPicker(false)}
          onSelect={(emoji) => {
            setNewMessageText(prev => prev + emoji);
            setShowEmojiPicker(false);
          }}
        />
      )}

      {/* MEDIA GALLERY */}
      {showMediaGallery && activeChat && (
        <MediaGallery
          isOpen={showMediaGallery}
          onClose={() => setShowMediaGallery(false)}
          chatPartnerName={activeChat.partnerName}
        />
      )}

      {/* CALL SCREEN */}
      {activeCall && (
        <CallScreen
          isOpen={Boolean(activeCall)}
          type={activeCall.type}
          direction="outgoing"
          partnerName={activeCall.partnerName}
          partnerAvatar={activeCall.partnerAvatar}
          currentUser={currentUser}
          onClose={() => setActiveCall(null)}
        />
      )}

    </div>
  );
}
