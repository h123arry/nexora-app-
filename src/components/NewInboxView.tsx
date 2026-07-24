import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, Check, CheckCheck, Send, MessageSquare, 
  ArrowLeft, ShieldCheck, User as UserIcon, X, Sparkles
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
  orderBy 
} from 'firebase/firestore';

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
    if (saved) return JSON.parse(saved);
    return initialChats || [];
  });

  const [localMessages, setLocalMessages] = useState<{ [chatId: string]: ExtendedMessage[] }>(() => {
    const saved = localStorage.getItem(`nexora_messages_${currentUser.id}`);
    if (saved) return JSON.parse(saved);
    const mapped: { [chatId: string]: ExtendedMessage[] } = {};
    if (initialMessages) {
      Object.keys(initialMessages).forEach(k => {
        mapped[k] = (initialMessages[k] || []).map(m => ({ ...m }));
      });
    }
    return mapped;
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem(`nexora_chats_${currentUser.id}`, JSON.stringify(chats));
  }, [chats, currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`nexora_messages_${currentUser.id}`, JSON.stringify(localMessages));
  }, [localMessages, currentUser.id]);

  // Auto scroll to bottom of active chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages, activeChatId]);

  // Firestore real-time listener for messages in active chat
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
        
        // Mark chat unread count 0 locally
        setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, unreadCount: 0 } : c));
      }
    }, (error) => {
      console.warn('[Inbox] Message snapshot error:', error);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  // Filtered chats based on search query
  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      const q = searchQuery.toLowerCase();
      return (
        chat.partnerName?.toLowerCase().includes(q) ||
        chat.username?.toLowerCase().includes(q) ||
        chat.lastMessage?.toLowerCase().includes(q)
      );
    }).sort((a, b) => {
      const aTime = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
      const bTime = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [chats, searchQuery]);

  // Filtered available users for New Message modal
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

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeMessages = activeChatId ? (localMessages[activeChatId] || []) : [];

  // Send Message Handler
  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !activeChatId) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');

    const messageId = `msg-${Date.now()}`;
    const newMsg: ExtendedMessage = {
      id: messageId,
      chatId: activeChatId,
      senderId: currentUser.id,
      content: textToSend,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    // Update local state instantly
    setLocalMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));

    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          lastMessage: textToSend,
          lastTimestamp: new Date().toISOString()
        };
      }
      return c;
    }));

    // Firestore sync if available
    try {
      if (db) {
        const msgDocRef = doc(db, `chats/${activeChatId}/messages`, messageId);
        await setDoc(msgDocRef, {
          chatId: activeChatId,
          senderId: currentUser.id,
          content: textToSend,
          timestamp: new Date().toISOString(),
          status: 'sent'
        });

        const chatDocRef = doc(db, 'chats', activeChatId);
        await updateDoc(chatDocRef, {
          lastMessage: textToSend,
          lastTimestamp: new Date().toISOString()
        }).catch(async () => {
          await setDoc(chatDocRef, {
            id: activeChatId,
            lastMessage: textToSend,
            lastTimestamp: new Date().toISOString()
          }, { merge: true });
        });
      }
    } catch (e) {
      console.warn('[Inbox] Firestore message sync error:', e);
    }
  };

  // Start or open chat with user
  const handleStartChatWithUser = (user: User) => {
    // Check if chat already exists with this user
    let existingChat = chats.find(c => c.partnerId === user.id);
    
    if (existingChat) {
      setActiveChatId(existingChat.id);
      setShowNewMessageModal(false);
      return;
    }

    // Create new chat
    const newChatId = `chat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const newChat: Chat = {
      id: newChatId,
      partnerId: user.id,
      partnerName: user.name,
      partnerAvatar: user.avatar,
      partnerBio: user.bio || '',
      isPartnerOnline: Boolean((user as any).isOnline),
      unreadCount: 0,
      lastMessage: 'Started conversation',
      lastTimestamp: new Date().toISOString(),
      username: user.username,
      isGroup: false,
      isBroadcast: false
    };

    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
    setShowNewMessageModal(false);

    // Save to Firestore if available
    if (db) {
      setDoc(doc(db, 'chats', newChatId), {
        id: newChatId,
        participants: [currentUser.id, user.id],
        partnerId: user.id,
        partnerName: user.name,
        partnerAvatar: user.avatar,
        lastMessage: 'Started conversation',
        lastTimestamp: new Date().toISOString(),
        unreadCount: 0
      }).catch(err => console.warn('[Inbox] Firestore create chat error:', err));
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full bg-[#0A0A0A] text-white font-sans overflow-hidden relative">
      
      {/* LEFT / MAIN COLUMN: Conversation List */}
      <div className={`w-full md:w-96 border-r border-zinc-800/80 flex flex-col h-full bg-[#0d0b1a]/40 ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            <h1 className="text-base font-black tracking-tight text-white font-sans">Inbox</h1>
          </div>
          <button
            onClick={() => setShowNewMessageModal(true)}
            className="p-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl shadow-lg transition-all flex items-center justify-center cursor-pointer"
            title="New Message"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-white/5 bg-black/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-zinc-900/80 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-all font-sans"
            />
          </div>
        </div>

        {/* Conversation List / Empty State */}
        <div className="flex-1 overflow-y-auto divide-y divide-white/5 scrollbar-none">
          {filteredChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 shadow-md">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">Your inbox is empty</h3>
              <p className="text-xs text-zinc-400 max-w-xs mb-6 font-sans">
                Your conversations will appear here. Start chatting with people you connect with.
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

              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`flex items-center gap-3 p-3.5 cursor-pointer transition-all ${
                    isSelected ? 'bg-violet-950/40 border-l-4 border-violet-500' : 'hover:bg-white/5'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <img
                      src={chat.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'}
                      alt={chat.partnerName}
                      className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-md"
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

      {/* RIGHT / ACTIVE CHAT COLUMN */}
      <div className={`flex-1 flex flex-col h-full bg-[#080614] ${!activeChatId ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/60 backdrop-blur-md z-10">
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
                    {activeChat.isPartnerOnline ? 'Active now' : 'Offline'}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/10 via-black to-black">
              {activeMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-3 shadow-sm">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1 font-sans">Secure conversation started</h4>
                  <p className="text-[11px] text-zinc-500 max-w-xs font-sans">
                    Send a message to begin chatting securely with {activeChat.partnerName}.
                  </p>
                </div>
              ) : (
                activeMessages.map(msg => {
                  const isMe = msg.senderId === currentUser.id;
                  const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-fade-in`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs font-sans leading-relaxed shadow-md ${
                          isMe 
                            ? 'bg-violet-600 text-white rounded-br-xs' 
                            : 'bg-zinc-900 border border-white/10 text-zinc-100 rounded-bl-xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-[9px] text-zinc-500 font-mono px-1">
                        <span>{time}</span>
                        {isMe && (
                          <span>
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3 h-3 text-violet-400 inline" />
                            ) : (
                              <Check className="w-3 h-3 text-zinc-500 inline" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Footer */}
            <div className="p-3 border-t border-white/10 bg-black/60 backdrop-blur-md">
              <div className="flex items-center gap-2">
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
                  placeholder="Type a message..."
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-all font-sans"
                />
                <button
                  onClick={handleSendMessage}
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
            <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-4 shadow-xl">
              <MessageSquare className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1 font-sans">Select a conversation</h3>
            <p className="text-xs text-zinc-500 max-w-sm font-sans">
              Choose a conversation from the left or start a new message to begin messaging.
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
              className="w-full max-w-md bg-[#0d0a1f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-sm font-bold text-white font-sans">New Message</h3>
                <button
                  onClick={() => setShowNewMessageModal(false)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-lg transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Search Input */}
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

              {/* Users List */}
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

    </div>
  );
}
