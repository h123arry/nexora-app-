import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Search, 
  Check, 
  CheckCheck, 
  Smile, 
  Radio, 
  Bot, 
  ShieldAlert, 
  Volume2, 
  VolumeX, 
  Paperclip, 
  MoreVertical, 
  Clock, 
  EyeOff, 
  Pin, 
  Trash2, 
  Mic, 
  Video, 
  AlertCircle,
  FileText,
  CornerUpLeft,
  X,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Chat, Message } from '../types';
import RelativeTimestamp from './RelativeTimestamp';

interface MessagesViewProps {
  currentUser: User;
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  onSendMessage: (chatId: string, content: string) => void;
  onReceiveBotMessage: (chatId: string, content: string, senderId: string) => void;
}

// Custom defined interfaces for rich messaging enhancements
interface MessageEnrichment {
  voiceDuration?: string;
  isVoicePlaying?: boolean;
  videoUrl?: string;
  fileName?: string;
  fileSize?: string;
  replyToQuote?: string; // Content of message we are replying to
  reactions?: string[];   // Active Emojis
}

export default function MessagesView({
  currentUser,
  chats: initialChats,
  messages: initialMessages,
  onSendMessage,
  onReceiveBotMessage
}: MessagesViewProps) {
  
  // Local state extensions for robust feature list
  const [activeTab, setActiveTab2] = useState<'chats' | 'groups' | 'requests'>('chats');
  const [chatsList, setChatsList] = useState<Chat[]>(() => initialChats);
  const [localMessages, setLocalMessages] = useState<{ [chatId: string]: (Message & MessageEnrichment)[] }>(() => initialMessages);
  const [activeChatId, setActiveChatId] = useState<string>(initialChats[0]?.id || '');
  const [typedMessage, setTypedMessage] = useState('');
  const [isBotTyping, setIsBotTyping] = useState(false);
  const [searchContactText, setSearchContactText] = useState('');
  
  // Advanced State Features
  const [pinnedChats, setPinnedChats] = useState<string[]>(['chat-1']); 
  const [blockedChats, setBlockedChats] = useState<string[]>([]);
  const [mutedChats, setMutedChats] = useState<string[]>([]); // muted notifications
  const [disappearingMode, setDisappearingMode] = useState<boolean>(false);
  const [activeReplyQuote, setActiveReplyQuote] = useState<string | null>(null);
  const [showOptionsPopover, setShowOptionsPopover] = useState<boolean>(false);
  const [activeHoveringMessage, setActiveHoveringMessage] = useState<string | null>(null);

  // Creator protection and custom search states
  const [chatAccessGates, setChatAccessGates] = useState<Record<string, 'open' | 'followers' | 'subscribers'>>(() => {
    const saved = localStorage.getItem('nexora_chat_access_gates');
    return saved ? JSON.parse(saved) : {};
  });
  const [autoReplyModes, setAutoReplyModes] = useState<Record<string, 'none' | 'busy' | 'ai'>>(() => {
    const saved = localStorage.getItem('nexora_auto_reply_modes');
    return saved ? JSON.parse(saved) : {};
  });
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  useEffect(() => {
    const handleSelectChat = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.chatId) {
        setActiveChatId(customEvent.detail.chatId);
      }
    };
    window.addEventListener('selectChat', handleSelectChat);
    return () => window.removeEventListener('selectChat', handleSelectChat);
  }, []);

  const updateAccessGate = (chatId: string, value: 'open' | 'followers' | 'subscribers') => {
    const next = { ...chatAccessGates, [chatId]: value };
    setChatAccessGates(next);
    localStorage.setItem('nexora_chat_access_gates', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('toast', { detail: `🛡️ Chat access gated to: ${value.toUpperCase()}` }));
  };

  const updateAutoReplyMode = (chatId: string, value: 'none' | 'busy' | 'ai') => {
    const next = { ...autoReplyModes, [chatId]: value };
    setAutoReplyModes(next);
    localStorage.setItem('nexora_auto_reply_modes', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('toast', { detail: `🤖 Auto-reply mode set to: ${value.toUpperCase()}` }));
  };

  // Attachment Picker dialog states
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [simulatedRecordingVoice, setSimulatedRecordingVoice] = useState(false);
  const [simulatedVoiceTimeline, setSimulatedVoiceTimeline] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chatsList.find(c => c.id === activeChatId);
  const activeChatMessages = activeChatId ? (localMessages[activeChatId] || []) : [];

  // Scroll bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages, isBotTyping, simulatedRecordingVoice]);

  // Handle disappearing messages deletion tickers
  useEffect(() => {
    if (!disappearingMode || activeChatMessages.length === 0) return;
    
    const lastMsg = activeChatMessages[activeChatMessages.length - 1];
    if (lastMsg.senderId === currentUser.id) {
      // Set a timeout to clear the last message in 10s
      const timer = setTimeout(() => {
        setLocalMessages(prev => {
          const current = prev[activeChatId] || [];
          return {
            ...prev,
            [activeChatId]: current.filter(m => m.id !== lastMsg.id)
          };
        });
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeChatMessages, disappearingMode, activeChatId]);

  // Voice recording timeline ticks
  useEffect(() => {
    if (!simulatedRecordingVoice) return;
    const t = setInterval(() => {
      setSimulatedVoiceTimeline(p => p + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [simulatedRecordingVoice]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedMessage.trim() || !activeChatId) return;

    if (blockedChats.includes(activeChatId)) {
      alert("This connection is currently locked. Unblock this user in the chat settings menu.");
      return;
    }

    const payloadText = typedMessage;
    deliverExtendedMessage(payloadText);
    setTypedMessage('');
    setActiveReplyQuote(null); // clear quote
    simulateBotResponse(activeChatId, payloadText);
  };

  const deliverExtendedMessage = (text: string, enrichments: MessageEnrichment = {}) => {
    const newMessageId = 'msg-' + Date.now();
    const newMsg: Message & MessageEnrichment = {
      id: newMessageId,
      chatId: activeChatId,
      senderId: currentUser.id,
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'sent',
      replyToQuote: activeReplyQuote || undefined,
      ...enrichments
    };

    setLocalMessages(prev => {
      const chatMsgs = prev[activeChatId] || [];
      return {
        ...prev,
        [activeChatId]: [...chatMsgs, newMsg]
      };
    });

    onSendMessage(activeChatId, text);
  };

  // 🎙️ SIMULATE SENDING VOICE ATTACHMENT
  const handleSendSimulatedVoice = () => {
    setSimulatedRecordingVoice(false);
    setSimulatedVoiceTimeline(0);
    deliverExtendedMessage("🎙️ Sent a voice memo (0:12)", {
      voiceDuration: "0:12",
      isVoicePlaying: false
    });
    simulateBotResponse(activeChatId, "voice note");
  };

  // 📹 SIMULATE SENDING ROUNDED VIDEO CLIP
  const handleSendSimulatedVideo = () => {
    deliverExtendedMessage("📹 Sent a real-time round video", {
      videoUrl: "https://assets.mixkit.co/videos/preview/mixkit-holding-smartphone-at-night-with-city-lights-41553-large.mp4"
    });
    simulateBotResponse(activeChatId, "video note");
  };

  // 📎 SIMULATE GENERAL FILE ATTACHING
  const handleSendSimulatedFile = (fileName: string, fileSize: string) => {
    setShowAttachmentDropdown(false);
    deliverExtendedMessage(`📎 Document Shared: ${fileName}`, {
      fileName,
      fileSize
    });
    simulateBotResponse(activeChatId, "shared file request");
  };

  // VOICE PLAYBACK TOGGLER
  const toggleVoicePlayback = (msgId: string) => {
    setLocalMessages(prev => {
      const currentStream = prev[activeChatId] || [];
      const updatedStream = currentStream.map(msg => {
        if (msg.id === msgId) {
          return { ...msg, isVoicePlaying: !msg.isVoicePlaying };
        }
        return msg;
      });
      return { ...prev, [activeChatId]: updatedStream };
    });
  };

  // EMOJI REACTION CAPSULE TOGGLER
  const toggleMessageEmojiReaction = (msgId: string, emoji: string) => {
    setLocalMessages(prev => {
      const currentStream = prev[activeChatId] || [];
      const updatedStream = currentStream.map(msg => {
        if (msg.id === msgId) {
          const currentReactions = msg.reactions || [];
          const exists = currentReactions.includes(emoji);
          const newReactions = exists 
            ? currentReactions.filter(r => r !== emoji) 
            : [...currentReactions, emoji];
          return { ...msg, reactions: newReactions };
        }
        return msg;
      });
      return { ...prev, [activeChatId]: updatedStream };
    });
  };

  const simulateBotResponse = (chatId: string, userText: string) => {
    const targetChat = chatsList.find(c => c.id === chatId);
    if (!targetChat) return;

    if (blockedChats.includes(chatId)) return;

    // Check Creator Protection Auto-Reply Mode
    const autoReplyMode = autoReplyModes[chatId] || 'none';
    if (autoReplyMode === 'busy') {
      setIsBotTyping(true);
      setTimeout(() => {
        setIsBotTyping(false);
        const botMsgId = 'auto-' + Date.now();
        const newBotMsg: Message & MessageEnrichment = {
          id: botMsgId,
          chatId,
          senderId: targetChat.partnerId,
          content: "🤖 AUTOMATED AUTO-REPLY: Creator is currently busy in production! Your text is safely queued. ⏳",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        };
        setLocalMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), newBotMsg]
        }));
      }, 700);
      return;
    } else if (autoReplyMode === 'ai') {
      setIsBotTyping(true);
      setTimeout(() => {
        setIsBotTyping(false);
        const botMsgId = 'auto-' + Date.now();
        const newBotMsg: Message & MessageEnrichment = {
          id: botMsgId,
          chatId,
          senderId: targetChat.partnerId,
          content: `✨ NEXORA AI COMPANION AUTO-REPLY:\n"This is an intelligent autonomous session. The creator is AFK, but I am here to help. You asked: '${userText}'. We are fine-tuning our next-generation web modules to load under 1.8ms! Feel free to leave a brief proposal."`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        };
        setLocalMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), newBotMsg]
        }));
      }, 750);
      return;
    }

    const partnerId = targetChat.partnerId;
    let reply = '';
    const query = userText.toLowerCase();

    // Group chat multi-member reaction loop inside "groups" tab
    if (activeTab === 'groups') {
      setIsBotTyping(true);
      setTimeout(() => {
        setIsBotTyping(false);
        const responses = [
          { name: "Sophia", text: `I am reviewing this design parameter right now, team. Adding backdrop-blur gives it a clean finish.`, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80" },
          { name: "Marcus", text: `Rust concurrency benchmarks are holding stable under 1.8ms under 10K test calls. Ready to load-test!`, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80" }
        ];

        responses.forEach((resp, idx) => {
          setTimeout(() => {
            const botMsgId = 'bot-' + Date.now() + idx;
            const newBotMsg: Message & MessageEnrichment = {
              id: botMsgId,
              chatId: activeChatId,
              senderId: `resp-${idx}`,
              content: `[${resp.name}] ${resp.text}`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              status: 'read'
            };
            setLocalMessages(prev => ({
              ...prev,
              [activeChatId]: [...(prev[activeChatId] || []), newBotMsg]
            }));
          }, idx * 1400 + 400);
        });
      }, 1000);
      return;
    }

    // Default 1-on-1 contextual bots
    if (partnerId === 'creator-4') {
      if (query.includes('hello') || query.includes('hey') || query.includes('hi')) {
        reply = `Greetings! How is everything looking inside the Nexora community? Ask me to assist with "ideas" or platform "philosophy"! 🧠.`;
      } else if (query.includes('ideas') || query.includes('post')) {
        reply = `Here is a clean post concept: "Standardizing layout variables to make our feed look incredibly sharp. Designing spaces for real conversations! #BuildInPublic #WebDesign" Let's share it!`;
      } else if (query.includes('stats') || query.includes('uptime') || query.includes('speed')) {
        reply = `Our application feed loads fast and smooth! Active sessions and engagement are climbing steadily this week.`;
      } else {
        reply = `Message received safely! Let us catch up on upcoming updates shortly. Talk to VOH AI anytime.`;
      }
    } else if (partnerId === 'voh_ai') {
      if (query.includes('hello') || query.includes('hey') || query.includes('hi')) {
        reply = `Greetings! I am VOH AI, your cognitive assistant. Let me know if you need football stats, match analytics, or responsive layout scripts!`;
      } else if (query.includes('script') || query.includes('code')) {
        reply = `Here is a responsive container snippet: "<div className='w-full max-w-7xl mx-auto px-4 md:px-8'>...</div>" Use this to ensure desktop-first precision!`;
      } else {
        reply = `Processing request... VOH AI Node is fully functional and ready to assist VOICE OF HARRISON and the community!`;
      }
    } else {
      reply = `Thanks for the message! Catch you inside the World Pulse map soon.`;
    }

    setIsBotTyping(true);
    setTimeout(() => {
      setIsBotTyping(false);
      const botMsgId = 'bot-msg-' + Date.now();
      const newBotMsg: Message & MessageEnrichment = {
        id: botMsgId,
        chatId: activeChatId,
        senderId: partnerId,
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      };

      setLocalMessages(prev => {
        const stream = prev[activeChatId] || [];
        return {
          ...prev,
          [activeChatId]: [...stream, newBotMsg]
        };
      });

      onReceiveBotMessage(chatId, reply, partnerId);
    }, 1400);
  };

  // Multi tab filtering (PINNED sorted on absolute top, followed by searches)
  const sortedChats = [...chatsList].sort((a, b) => {
    const aPinned = pinnedChats.includes(a.id) ? 1 : 0;
    const bPinned = pinnedChats.includes(b.id) ? 1 : 0;
    return bPinned - aPinned;
  });

  const filteredChats = sortedChats.filter(chat => {
    const isSearchMatch = chat.partnerName.toLowerCase().includes(searchContactText.toLowerCase());
    
    if (activeTab === 'requests') {
      // Mock inbound request inbox elements
      return isSearchMatch && chat.unreadCount > 2;
    }
    if (activeTab === 'groups') {
      return isSearchMatch && (chat.id === 'group-main' || chat.partnerName.toLowerCase().includes('guild') || chat.partnerName.toLowerCase().includes('core'));
    }
    // standard chats tab
    return isSearchMatch && (chat.id !== 'group-main');
  });

  // Approved request action
  const handleApproveRequest = (chatId: string) => {
    setChatsList(prev => prev.map(c => c.id === chatId ? { ...c, unreadCount: 0 } : c));
    setActiveTab2('chats');
    setActiveChatId(chatId);
  };

  // Channel blocking / muting controls
  const toggleBlockStatus = (chatId: string) => {
    if (blockedChats.includes(chatId)) {
      setBlockedChats(prev => prev.filter(c => c !== chatId));
    } else {
      setBlockedChats(prev => [...prev, chatId]);
    }
    setShowOptionsPopover(false);
  };

  const toggleMuteStatus = (chatId: string) => {
    if (mutedChats.includes(chatId)) {
      setMutedChats(prev => prev.filter(c => c !== chatId));
    } else {
      setMutedChats(prev => [...prev, chatId]);
    }
    setShowOptionsPopover(false);
  };

  const handleTogglePinChat = (chatId: string) => {
    if (pinnedChats.includes(chatId)) {
      setPinnedChats(prev => prev.filter(c => c !== chatId));
    } else {
      setPinnedChats(prev => [...prev, chatId]);
    }
  };

  return (
    <div id="messages-panel-root" className="grid grid-cols-1 md:grid-cols-3 rounded-3xl border border-violet-500/10 bg-[#06040f] overflow-hidden h-[560px] relative shadow-2xl select-none">
      
      {/* ======================================================== */}
      {/* LEFT COLUMN: ACTIVE CONTACTS CONTACTBAR / TABS */}
      {/* ======================================================== */}
      <div className="border-r border-violet-500/10 flex flex-col h-full bg-[#09071c]/45">
        
        {/* Contacts Tab selector */}
        <div className="grid grid-cols-3 gap-1 p-2 bg-[#050410] border-b border-violet-500/5">
          <button
            onClick={() => setActiveTab2('chats')}
            className={`py-2 text-[9px] font-mono tracking-wider font-extrabold rounded-xl uppercase transition-all cursor-pointer text-center ${
              activeTab === 'chats' ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-violet-400/50 hover:text-white'
            }`}
          >
            Chats
          </button>
          
          <button
            onClick={() => {
              // Seed a primary Group Chat if missing
              const exists = chatsList.some(c => c.id === 'group-main');
              if (!exists) {
                const groupChat: Chat = {
                  id: 'group-main',
                  partnerId: 'group-id',
                  partnerName: 'NEXORA Global Creators 🌐',
                  partnerAvatar: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150',
                  partnerBio: 'Multi-member global developer & product synthesis channel.',
                  isPartnerOnline: true,
                  lastMessage: 'Nexora AI: Let\'s coordinate our layout specs!',
                  lastTimestamp: 'Now',
                  unreadCount: 0
                };
                setChatsList(prev => [...prev, groupChat]);
                // Seed some messages
                setLocalMessages(prev => ({
                  ...prev,
                  ['group-main']: [
                    { id: 'gm-1', senderId: 'creator-4', content: "[Nexora AI] Greetings! Excited to connect everyone in this group.", timestamp: "10 mins ago", status: "read" },
                    { id: 'gm-2', senderId: 'voh_ai', content: "[VOH AI] Connected and reporting system parameters. Ready to assist co-building.", timestamp: "8 mins ago", status: "read" }
                  ]
                }));
              }
              setActiveTab2('groups');
              setActiveChatId('group-main');
            }}
            className={`py-2 text-[9px] font-mono tracking-wider font-extrabold rounded-xl uppercase transition-all cursor-pointer text-center flex items-center justify-center gap-1 ${
              activeTab === 'groups' ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-violet-400/50 hover:text-white'
            }`}
          >
            <Users className="w-2.5 h-2.5" />
            <span>Groups</span>
          </button>

          <button
            onClick={() => {
              // Seed a secure request from random creator if missing
              const exists = chatsList.some(c => c.id === 'request-liam');
              if (!exists) {
                const reqChat: Chat = {
                  id: 'request-liam',
                  partnerId: 'liam-sterling',
                  partnerName: 'Liam Sterling',
                  partnerAvatar: 'https://images.unsplash.com/photo-1542206395-9feb3edaa68d?w=150',
                  partnerBio: 'Vanguard builder researching cryptographic security networks at SF cluster.',
                  isPartnerOnline: false,
                  lastMessage: 'Attempting to establish peer connection...',
                  lastTimestamp: '2 hours ago',
                  unreadCount: 3 // > 2 will pass filtered requests
                };
                setChatsList(prev => [...prev, reqChat]);
                setLocalMessages(prev => ({
                  ...prev,
                  ['request-liam']: [
                    { id: 'req-1', senderId: 'liam-sterling', content: "Hello! I am attempting to query reputation benchmarks. Send approval keys.", timestamp: "2 hours ago", status: "sent" }
                  ]
                }));
              }
              setActiveTab2('requests');
            }}
            className={`py-2 text-[9px] font-mono tracking-wider font-extrabold rounded-xl uppercase transition-all cursor-pointer text-center relative ${
              activeTab === 'requests' ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-violet-400/50 hover:text-white'
            }`}
          >
            Requests
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-pink-500 rounded-full animate-ping" />
          </button>
        </div>

        {/* Search header box */}
        <div className="p-3 border-b border-violet-500/5 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-400/50" />
            <input
              type="text"
              placeholder="Query aligns by name..."
              value={searchContactText}
              onChange={(e) => setSearchContactText(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-violet-500/10 focus:border-[#8B5CF6] focus:outline-hidden text-xs text-white placeholder-violet-400/20 font-sans"
            />
          </div>
        </div>

        {/* Contacts column list */}
        <div className="flex-1 overflow-y-auto divide-y divide-violet-500/5">
          {filteredChats.map((chat) => {
            const isSelected = chat.id === activeChatId;
            const isPinned = pinnedChats.includes(chat.id);
            const isMuted = mutedChats.includes(chat.id);
            return (
              <div
                key={chat.id}
                className={`w-full text-left p-3 flex items-center justify-between transition-colors relative group/item ${
                  isSelected 
                    ? 'bg-violet-600/10 border-l-2 border-violet-500' 
                    : 'hover:bg-violet-500/5'
                }`}
              >
                <button
                  onClick={() => {
                    setActiveChatId(chat.id);
                    chat.unreadCount = 0; // clear unreads
                  }}
                  className="flex items-center gap-2.5 flex-1 min-w-0"
                >
                  <div className="relative shrink-0">
                    <img 
                      src={chat.partnerAvatar} 
                      alt={chat.partnerName} 
                      className="w-9 h-9 rounded-xl object-cover border border-violet-500/10" 
                      referrerPolicy="no-referrer"
                    />
                    {chat.isPartnerOnline ? (
                      <span className="absolute bottom-[-1px] right-[-1px] w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#09071c]" />
                    ) : (
                      <span className="absolute bottom-[-1px] right-[-1px] w-2.5 h-2.5 bg-zinc-600 rounded-full border-2 border-[#09071c]" />
                    )}
                  </div>

                  <div className="overflow-hidden flex-1 select-none">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-xs font-sans font-black text-white hover:text-violet-300 truncate">
                        {chat.partnerName}
                      </p>
                      {isPinned && <Pin className="w-2.5 h-2.5 text-violet-400 shrink-0" />}
                    </div>
                    <p className="text-[10.5px] font-sans text-violet-100/50 truncate leading-tight">
                      {chat.lastMessage}
                    </p>
                  </div>
                </button>

                {/* Pin Action shortcut on hover contact */}
                <div className="opacity-0 group-hover/item:opacity-100 flex items-center gap-1.5 shrink-0 pl-1 transition-opacity">
                  <button 
                    onClick={() => handleTogglePinChat(chat.id)}
                    className="p-1 text-violet-400 hover:text-white shrink-0 cursor-pointer"
                    title={isPinned ? 'Unpin contact' : 'Pin contact directly'}
                  >
                    <Pin className={`w-3 h-3 ${isPinned ? 'fill-current text-[#8B5CF6]' : ''}`} />
                  </button>
                </div>

                {chat.unreadCount > 0 && activeTab !== 'requests' && (
                  <span className="h-4 min-w-4 px-1 flex items-center justify-center text-[9px] font-bold font-mono bg-pink-500 text-white rounded-full shrink-0">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            );
          })}

          {filteredChats.length === 0 && (
            <div className="p-8 text-center text-violet-400/40 font-mono text-[10px]">
              No matching connections found.
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: MAIN CONVERSATION / ACTIVE DISPLAY PANEL */}
      {/* ======================================================== */}
      <div className="md:col-span-2 flex flex-col h-full bg-[#05030d] relative">
        {activeChat ? (
          <>
            {/* Connection Dialogue Panel Header */}
            <div className="p-3.5 border-b border-violet-500/10 flex items-center justify-between bg-[#080516]">
              {/* Profile Bio */}
              <div className="flex items-center gap-3">
                <img 
                  src={activeChat.partnerAvatar} 
                  alt={activeChat.partnerName} 
                  className="w-9 h-9 rounded-xl object-cover ring-2 ring-violet-500/10" 
                  referrerPolicy="no-referrer"
                />
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-sans font-black text-white truncate">
                      {activeChat.partnerName}
                    </h3>
                    <span className={`h-1.5 w-1.5 rounded-full ${activeChat.isPartnerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
                  </div>
                  <p className="text-[10px] font-sans text-violet-200/50 leading-tight truncate max-w-[200px] sm:max-w-[280px]">
                    {activeChat.partnerBio}
                  </p>
                </div>
              </div>

              {/* Action indicators (Block, Mute, Disappearing mode) */}
              <div className="flex items-center gap-1.5 relative">
                
                {/* Disappearing Messages active indicator toggler */}
                <button
                  onClick={() => setDisappearingMode(!disappearingMode)}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    disappearingMode 
                      ? 'bg-amber-500/15 border-amber-400/30 text-amber-300' 
                      : 'bg-[#0a071d] border-violet-500/10 text-violet-400 hover:text-white'
                  }`}
                  title="Toggle 10s Disappearing Vanish Clock Mode"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>

                {/* More options ellipsis */}
                <button
                  onClick={() => setShowOptionsPopover(!showOptionsPopover)}
                  className="p-1.5 bg-[#0a071d] hover:bg-[#110c2e] border border-violet-500/10 rounded-lg text-violet-400 hover:text-white cursor-pointer"
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown Options menu overlay */}
                <AnimatePresence>
                  {showOptionsPopover && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute right-0 top-10 w-64 bg-[#09071c] border border-violet-500/30 rounded-2xl p-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-35 space-y-4"
                    >
                      {/* Connection Block/Mute */}
                      <div className="space-y-1.5">
                        <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-wider block">Connection Controls</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => toggleBlockStatus(activeChatId)}
                            className="p-2 bg-red-950/15 hover:bg-red-950/30 border border-red-500/20 rounded-xl text-[9px] font-mono uppercase font-extrabold text-red-400 flex flex-col items-center justify-center gap-1 cursor-pointer"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>{blockedChats.includes(activeChatId) ? '🔓 Unblock' : '🔒 Block'}</span>
                          </button>

                          <button
                            onClick={() => toggleMuteStatus(activeChatId)}
                            className="p-2 bg-violet-950/20 hover:bg-violet-950/40 border border-violet-500/20 rounded-xl text-[9px] font-mono uppercase font-extrabold text-violet-300 flex flex-col items-center justify-center gap-1 cursor-pointer"
                          >
                            <Radio className="w-3.5 h-3.5" />
                            <span>{mutedChats.includes(activeChatId) ? '🔊 Unmute' : '🔇 Mute'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Creator Protection: Chat Access Gates */}
                      <div className="space-y-1 text-left">
                        <span className="text-[8.5px] font-mono text-[#A78BFA] uppercase tracking-wider block">
                          🛡️ CHAT ACCESS GATE
                        </span>
                        <div className="flex flex-col gap-1 bg-black/40 p-1.5 rounded-xl border border-white/5">
                          {[
                            { value: 'open', label: 'Open Channel 🌐' },
                            { value: 'followers', label: 'Followers Only 👥' },
                            { value: 'subscribers', label: 'Subscribers Only 🌟' }
                          ].map(opt => {
                            const isSel = (chatAccessGates[activeChatId] || 'open') === opt.value;
                            return (
                              <button
                                key={opt.value}
                                onClick={() => updateAccessGate(activeChatId, opt.value as any)}
                                className={`w-full text-left p-1.5 rounded-lg text-[9px] font-mono transition-all uppercase cursor-pointer ${isSel ? 'bg-violet-600 text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                              >
                                {isSel ? '✓ ' : ''}{opt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Creator Protection: Auto Replies */}
                      <div className="space-y-1 text-left">
                        <span className="text-[8.5px] font-mono text-pink-400 uppercase tracking-wider block">
                          🤖 AUTOMATED RESPONSE
                        </span>
                        <div className="flex flex-col gap-1 bg-black/40 p-1.5 rounded-xl border border-white/5">
                          {[
                            { value: 'none', label: 'Disabled ✖' },
                            { value: 'busy', label: 'Busy Mode ⏳' },
                            { value: 'ai', label: 'AI Companion Assistant 🧠' }
                          ].map(replyOpt => {
                            const isSel = (autoReplyModes[activeChatId] || 'none') === replyOpt.value;
                            return (
                              <button
                                key={replyOpt.value}
                                onClick={() => updateAutoReplyMode(activeChatId, replyOpt.value as any)}
                                className={`w-full text-left p-1.5 rounded-lg text-[9px] font-mono transition-all uppercase cursor-pointer ${isSel ? 'bg-pink-600 text-white font-bold' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}
                              >
                                {isSel ? '✓ ' : ''}{replyOpt.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* IN-CHAT TEXT LOG SEARCH FILTER */}
            <div className="bg-[#04020a] border-b border-violet-500/5 px-4 py-2 flex items-center justify-between gap-3 text-left">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-3 h-3 text-violet-400/50" />
                <input
                  type="text"
                  placeholder="Filter chat messages history live..."
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  className="w-full bg-black/40 border border-white/5 hover:border-violet-500/20 focus:border-violet-500/40 rounded-xl py-1.5 pl-8 pr-7 text-[10px] text-white focus:outline-hidden placeholder:text-violet-400/20 font-sans"
                />
                {chatSearchQuery && (
                  <button
                    onClick={() => setChatSearchQuery('')}
                    className="absolute right-3 top-2.5 text-violet-400/60 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              {chatSearchQuery && (
                <span className="text-[9px] font-mono text-[#A78BFA] bg-[#A78BFA]/10 px-2 py-1 rounded-md shrink-0 uppercase font-black">
                  MATCH INDEX LIVE
                </span>
              )}
            </div>

            {/* REQUEST APPROVAL CAPTURE BANNER */}
            {activeTab === 'requests' && activeChat.unreadCount > 0 && (
              <div className="bg-[#11051f] p-3 border-b border-violet-500/15 flex items-center justify-between z-10 text-left">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-pink-400 animate-pulse shrink-0" />
                  <div>
                    <span className="text-[9px] font-mono text-pink-400 block font-bold leading-none">Security Validation REQUIRED</span>
                    <p className="text-[10.5px] text-violet-200/70 font-sans mt-0.5">Approval is necessary to start messaging with this conversation partner.</p>
                  </div>
                </div>
                <button
                  onClick={() => handleApproveRequest(activeChatId)}
                  className="px-4 py-2 bg-[#8B5CF6] hover:bg-violet-600 text-white font-mono text-[9px] font-black rounded-lg uppercase"
                >
                  Approve secure Channel
                </button>
              </div>
            )}

            {/* BLOCK ACTIVE NOTICE OVERLAY */}
            {blockedChats.includes(activeChatId) && (
              <div className="bg-red-950/20 p-2.5 border-b border-red-500/15 text-left text-[11px] font-sans text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 animate-pulse" />
                <span>Direct messaging is blocked. Sending messages is disabled. Unblock in options.</span>
              </div>
            )}

            {/* MESSAGES PORTION SCROLL VIEW */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-left scroll-smooth">
              {activeChatMessages
                .filter(msg => !chatSearchQuery || msg.content.toLowerCase().includes(chatSearchQuery.toLowerCase()))
                .map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  const isHovered = activeHoveringMessage === msg.id;
                
                return (
                  <div 
                    key={msg.id} 
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'} relative group/msg overflow-visible`}
                    onMouseEnter={() => setActiveHoveringMessage(msg.id)}
                    onMouseLeave={() => setActiveHoveringMessage(null)}
                  >
                    <div className="flex flex-col max-w-[75%] relative">
                      
                      {/* Thread Quoted reference nested inside bubble */}
                      {msg.replyToQuote && (
                        <div className="bg-slate-950/80 border border-violet-500/15 rounded-t-xl p-2 text-[10px] font-sans text-violet-300 italic truncate max-w-full leading-none truncate opacity-85 select-none text-left border-b-0 relative ml-2">
                        💬 Quoted: "{msg.replyToQuote}"
                        </div>
                      )}

                      {/* Actual dialogue package card bubble */}
                      <div className={`rounded-2xl px-4 py-2.5 text-xs inline-block relative ${
                        isMe 
                          ? 'bg-linear-to-r from-violet-600 via-indigo-600 to-[#8B5CF6] text-white rounded-tr-none' 
                          : 'bg-violet-500/5 text-violet-100 rounded-tl-none border border-violet-500/10'
                      } ${msg.replyToQuote ? 'rounded-t-none' : ''}`}>
                        
                        {/* Render voice indicator */}
                        {msg.voiceDuration ? (
                          <div className="flex items-center gap-3 py-1">
                            <button 
                              onClick={() => toggleVoicePlayback(msg.id)}
                              className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
                            >
                              {msg.isVoicePlaying ? '⏸️' : '▶️'}
                            </button>
                            <div className="flex gap-1 items-end h-5 w-32 shrink-0">
                              {[
                                { h: 'h-2', d: '0ms' },
                                { h: 'h-4', d: '150ms' },
                                { h: 'h-3', d: '300ms' },
                                { h: 'h-5', d: '450ms' },
                                { h: 'h-2.5', d: '100ms' },
                                { h: 'h-4.5', d: '250ms' },
                                { h: 'h-3', d: '350ms' },
                                { h: 'h-5', d: '200ms' },
                                { h: 'h-2', d: '400ms' }
                              ].map((bar, idx) => (
                                <span 
                                  key={idx} 
                                  className={`w-1 bg-white/95 rounded-full transition-all duration-300 ${bar.h} ${msg.isVoicePlaying ? 'animate-[pulse_1s_infinite]' : 'opacity-60'}`}
                                  style={{ 
                                    animationDelay: msg.isVoicePlaying ? bar.d : '0ms'
                                  }} 
                                />
                              ))}
                            </div>
                            <span className="text-[10px] font-mono opacity-80 shrink-0">{msg.voiceDuration}</span>
                          </div>
                        ) : msg.videoUrl ? (
                          <div className="rounded-xl overflow-hidden aspect-square w-32 border border-white/10 bg-black relative mb-1.5 select-none">
                            <video src={msg.videoUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                            <span className="absolute bottom-1 right-1 text-[8px] font-mono uppercase bg-black/55 text-white px-1.5 py-0.5 rounded">
                              Real-Time Loop
                            </span>
                          </div>
                        ) : msg.fileName ? (
                          <div className="flex items-center gap-2.5 py-1.5 border border-white/5 rounded-xl bg-black/40 px-3 truncate mb-1">
                            <FileText className="w-6 h-6 text-cyan-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-white text-[11px] font-bold block truncate leading-none">{msg.fileName}</span>
                              <span className="text-[8.5px] font-mono text-violet-400/70 block mt-0.5">{msg.fileSize} doc</span>
                            </div>
                          </div>
                        ) : (
                          <p className="break-words select-text">{msg.content}</p>
                        )}

                        {/* timestamp indicator */}
                        <div className="flex items-center justify-end gap-1.5 mt-1 text-[9px] opacity-75 font-mono select-none">
                          <span className="opacity-60">{msg.timestamp}</span>
                          {isMe && (
                            <div className="flex items-center shrink-0">
                              {msg.status === 'sent' && <Check className="w-3 h-3 text-white/40" />}
                              {(msg.status === 'delivered' || msg.status === 'read') && (
                                <CheckCheck className={`w-3 h-3 ${msg.status === 'read' ? 'text-cyan-300' : 'text-white/50'}`} />
                              )}
                            </div>
                          )}
                        </div>

                      </div>

                      {/* HOVER EMOJI REACTION MINI BAR & REPLY TRIGGER BOX */}
                      {isHovered && !blockedChats.includes(activeChatId) && (
                        <div className={`absolute bottom-[-18px] ${isMe ? 'left-[-40px]' : 'right-[-40px]'} flex items-center gap-1.5 bg-[#09071b] border border-violet-500/25 py-1 px-2.5 rounded-full z-15 shadow-2xl animate-fade-in text-[10px]`}>
                          {['❤️', '🔥', '👏', '😂', '💡', '❓'].map((emo) => (
                            <button 
                              key={emo}
                              onClick={() => toggleMessageEmojiReaction(msg.id, emo)} 
                              className="hover:scale-135 transition-transform cursor-pointer select-none"
                            >
                              {emo}
                            </button>
                          ))}
                          <button 
                            onClick={() => setActiveReplyQuote(msg.content)} 
                            className="text-violet-400 hover:text-white p-0.5 shrink-0 ml-1 cursor-pointer transition-colors"
                            title="Reply / Quote message"
                          >
                            <CornerUpLeft className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {/* Display rendered reactions capsule below bubble */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={`flex gap-1.5 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {msg.reactions.map((react, i) => (
                            <span key={i} className="text-[10px] bg-violet-950/30 border border-violet-500/15 py-0.5 px-2 rounded-full cursor-pointer leading-none">
                              {react}
                            </span>
                          ))}
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}

              {/* BOT TYPING SIMULATION indicator */}
              {isBotTyping && (
                <div className="flex justify-start">
                  <div className="bg-violet-500/5 text-violet-100 rounded-2xl rounded-tl-none px-4 py-3 border border-violet-500/10 text-xs max-w-[75%]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-[10px] font-mono text-violet-400/50 ml-1">Typing...</span>
                    </div>
                  </div>
                </div>
              )}

              {/* MIC RECORDER SIMULATED INTERACTIVE PANEL */}
              {simulatedRecordingVoice && (
                <div className="flex justify-end animate-pulse">
                  <div className="bg-linear-to-r from-pink-600 to-violet-600 rounded-2xl rounded-tr-none px-4 py-3.5 text-white text-xs max-w-[70%] text-left space-y-2">
                    <div className="flex items-center gap-2">
                      <Mic className="w-4 h-4 text-white animate-bounce" />
                      <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-white leading-none">Mic Stream Active</span>
                    </div>
                    <div className="flex items-end gap-1 px-1 py-1 h-6">
                      <span className="w-1 bg-white h-2 rounded animate-pulse" />
                      <span className="w-1 bg-white h-4 rounded animate-pulse" style={{ animationDelay: '100ms' }} />
                      <span className="w-1 bg-white h-5 rounded animate-pulse" style={{ animationDelay: '200ms' }} />
                      <span className="w-1 bg-white h-3 rounded animate-pulse" style={{ animationDelay: '300ms' }} />
                      <span className="w-1 bg-white h-2 rounded animate-pulse" style={{ animationDelay: '400ms' }} />
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/15">
                      <span className="text-[10px] font-mono font-bold leading-none">Recording: 0:{simulatedVoiceTimeline.toString().padStart(2, '0')}</span>
                      <div className="flex gap-2">
                        <button onClick={() => setSimulatedRecordingVoice(false)} className="text-[9px] font-bold text-white/60 hover:text-white">CANCEL</button>
                        <button onClick={handleSendSimulatedVoice} className="text-[9px] font-black text-rose-200">SEND REC</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* FLOATING SELECTED QUOTE ROW IN COMPOSER */}
            {activeReplyQuote && (
              <div className="bg-[#1b0a2c] p-2.5 px-4 border-t border-violet-500/10 flex items-center justify-between text-left select-none relative">
                <div className="flex items-center gap-2 min-w-0">
                  <CornerUpLeft className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <p className="text-[11px] font-sans text-violet-200 truncate pr-4">
                    Quoting specific message: <span className="italic">"{activeReplyQuote}"</span>
                  </p>
                </div>
                <button
                  onClick={() => setActiveReplyQuote(null)}
                  className="p-1 hover:bg-white/10 rounded-full text-violet-400 hover:text-white shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* DISSAPEARING MODE BANNER INDICATOR */}
            {disappearingMode && (
              <div className="bg-amber-600/10 p-2 border-t border-amber-500/10 text-[9.5px] font-mono tracking-wider text-amber-300 text-center select-none uppercase font-extrabold flex items-center justify-center gap-1 animate-pulse">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Disappearing Vanish clock active: Sent messages auto-erase after 10 seconds.</span>
              </div>
            )}

            {/* QUICK REPLY SCHEDULING PILLS */}
            {!blockedChats.includes(activeChatId) && (
              <div className="px-4 py-2 border-t border-violet-500/5 bg-[#070514]/90 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-left scroll-smooth">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase tracking-widest shrink-0 mr-1 flex items-center gap-1">
                  ⚡ Quick:
                </span>
                {[
                  "Drafting template proposal...",
                  "Replying shortly! 🚀",
                  "Currently testing build at 1.8ms ⚡",
                  "Let's sync soon! 📅",
                  "Sounds excellent, send details. 📝"
                ].map((tpl) => (
                  <button
                    key={tpl}
                    type="button"
                    onClick={() => setTypedMessage(tpl)}
                    className="px-2.5 py-1 bg-violet-950/30 hover:bg-violet-950 text-violet-300 hover:text-white border border-violet-500/10 rounded-lg text-[9.5px] font-mono tracking-normal shrink-0 transition-all cursor-pointer select-none"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            )}

            {/* COMPOSER ROW CONTROLS */}
            <div className="p-3 border-t border-violet-500/10 bg-[#09071c]">
              <form 
                onSubmit={handleSendMessage} 
                className="flex items-center gap-2 relative"
              >
                {/* File attachment pin button */}
                <button
                  type="button"
                  onClick={() => setShowAttachmentDropdown(!showAttachmentDropdown)}
                  className="p-2.5 bg-violet-600/5 hover:bg-violet-600/20 border border-violet-500/10 hover:border-violet-500/20 rounded-xl text-violet-300 cursor-pointer"
                  title="Attach rich files, audio loops, concept boards"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder={
                    blockedChats.includes(activeChatId) 
                      ? "Node locked. Unblock to composer..." 
                      : activeChat.partnerId === 'creator-4' 
                        ? "Ask VOH AI for ideas, code seeds, metrics..." 
                        : "Message coordinate..."
                  }
                  disabled={blockedChats.includes(activeChatId)}
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-violet-500/10 focus:border-[#8B5CF6] focus:outline-hidden text-white placeholder-violet-400/20 font-sans disabled:opacity-30"
                />

                {/* Simulated vocal recorder capture button trigger */}
                {!blockedChats.includes(activeChatId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatedRecordingVoice(true);
                      setSimulatedVoiceTimeline(0);
                    }}
                    className="p-2.5 bg-violet-600/5 hover:bg-violet-600/20 border border-violet-500/10 rounded-xl text-violet-300 hover:text-white cursor-pointer"
                    title="Simulate Voice Clip"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}

                {!blockedChats.includes(activeChatId) && (
                  <button
                    type="button"
                    onClick={handleSendSimulatedVideo}
                    className="p-2.5 bg-violet-600/5 hover:bg-violet-600/20 border border-violet-500/10 rounded-xl text-violet-300 hover:text-white cursor-pointer"
                    title="Simulate Real-time Video Circle loop"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!typedMessage.trim() || blockedChats.includes(activeChatId)}
                  className="p-2.5 rounded-xl bg-linear-to-r from-violet-600 via-pink-600 to-pink-500 hover:brightness-110 active:scale-98 text-white transition-all flex items-center justify-center disabled:opacity-35 cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>

                {/* ATTACHMENT QUICK PICKER POPUP */}
                <AnimatePresence>
                  {showAttachmentDropdown && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute left-0 bottom-14 w-48 bg-[#09071c] border border-violet-500/20 rounded-xl p-2.5 shadow-2xl z-20 text-left space-y-1"
                    >
                      <button
                        type="button"
                        onClick={() => handleSendSimulatedFile("benchmark_speed.json", "2.1 KB")}
                        className="w-full text-left p-1.5 hover:bg-violet-950/25 rounded-lg text-[9.5px] font-mono uppercase font-black text-violet-300 flex items-center gap-2 cursor-pointer"
                      >
                        📂 Send Speed JSON
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendSimulatedFile("ux_sketch_glassmorphic.png", "124 KB")}
                        className="w-full text-left p-1.5 hover:bg-violet-950/25 rounded-lg text-[9.5px] font-mono uppercase font-black text-violet-300 flex items-center gap-2 cursor-pointer"
                      >
                        🎨 Share Wireframe Card
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendSimulatedFile("packet_streamer.rs", "12.8 KB")}
                        className="w-full text-left p-1.5 hover:bg-violet-950/25 rounded-lg text-[9.5px] font-mono uppercase font-black text-violet-300 flex items-center gap-2 cursor-pointer"
                      >
                        🦀 Send Rust Channel Code
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-current bg-[#05030d]">
            <ShieldAlert className="w-12 h-12 text-violet-500/30 mb-3 animate-bounce" />
            <p className="font-sans font-medium text-violet-300 text-sm">No Secure Dialogue Alignment Selected</p>
            <p className="font-mono text-[10px] text-violet-300/40 mt-1 max-w-xs text-center leading-normal">
              Activate an authorized coordinator in Secure Channels list or accept incoming requests inbox peer queries.
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
