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
  Users,
  Archive,
  Phone,
  Image as ImageIcon,
  Camera,
  Play,
  Pause,
  Download,
  Lock,
  Unlock,
  Globe,
  RefreshCw,
  UserCheck,
  SmilePlus,
  Info,
  Calendar,
  Wifi,
  WifiOff,
  Trash,
  Plus,
  ChevronRight,
  UserPlus,
  Settings,
  AlertTriangle,
  ChevronDown,
  ExternalLink,
  MessageSquare,
  Sparkles,
  BarChart2,
  Shield,
  CheckCircle,
  Heart,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Chat, Message } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import CallScreen from './CallScreen';
import MediaGallery from './MediaGallery';
import GroupDashboard from './GroupDashboard';

interface MessagesViewProps {
  currentUser: User;
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  onSendMessage: (chatId: string, content: string) => void;
  onReceiveBotMessage: (chatId: string, content: string, senderId: string) => void;
}

interface ExtendedMessage extends Message {
  voiceDuration?: string;
  isVoicePlaying?: boolean;
  videoUrl?: string;
  fileName?: string;
  fileSize?: string;
  replyToQuote?: string;
  reactions?: string[];
  isEdited?: boolean;
  translation?: string;
  isTranslating?: boolean;
  isOfflineUnsent?: boolean;
}

export default function MessagesView({
  currentUser,
  chats: initialChats,
  messages: initialMessages,
  onSendMessage,
  onReceiveBotMessage
}: MessagesViewProps) {
  
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'requests' | 'archived' | 'ai'>('all');
  const [chatsList, setChatsList] = useState<Chat[]>(() => {
    // Ensure group exists
    const groupChatExists = initialChats.some(c => c.id === 'group-main');
    if (!groupChatExists) {
      return [
        ...initialChats,
        {
          id: 'group-main',
          partnerId: 'group-id',
          partnerName: 'NEXORA Global Core 🌐',
          partnerAvatar: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150',
          partnerBio: 'Encrypted group for global developer and designer collaboration.',
          isPartnerOnline: true,
          lastMessage: 'Sophia: Real-time latency optimized!',
          lastTimestamp: '10:42 AM',
          unreadCount: 0
        }
      ];
    }
    return initialChats;
  });

  const [localMessages, setLocalMessages] = useState<{ [chatId: string]: ExtendedMessage[] }>(() => {
    const next: { [chatId: string]: ExtendedMessage[] } = {};
    Object.keys(initialMessages).forEach(id => {
      next[id] = initialMessages[id].map(m => ({ ...m }));
    });
    // Add default group chat messages if missing
    if (!next['group-main']) {
      next['group-main'] = [
        { id: 'gm-1', chatId: 'group-main', senderId: 'creator-4', content: "Welcome to the premium Nexora Global Core. We are currently tracking system performance.", timestamp: "10:35 AM", status: "read" },
        { id: 'gm-2', chatId: 'group-main', senderId: 'voh_ai', content: "VOH AI node initialized at peak memory speed. Let's coordinate.", timestamp: "10:39 AM", status: "read" },
        { id: 'gm-3', chatId: 'group-main', senderId: 'creator-2', content: "Optimizing the main timeline interface. Backdrops are looking gorgeous.", timestamp: "10:41 AM", status: "read" }
      ];
    }
    return next;
  });

  const [activeChatId, setActiveChatId] = useState<string>(chatsList[0]?.id || 'chat-1');
  const [typedMessage, setTypedMessage] = useState('');
  
  // Searching & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'messages' | 'media' | 'links' | 'files'>('all');
  const [recentSearches, setRecentSearches] = useState<string[]>(['performance', 'latency', 'glassmorphism']);

  // Privacy & Online settings
  const [myPresence, setMyPresence] = useState<'online' | 'away' | 'busy' | 'invisible'>('online');
  const [showPresenceDropdown, setShowPresenceDropdown] = useState(false);

  // Offline Simulation Mode
  const [isOffline, setIsOffline] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<ExtendedMessage[]>([]);

  // Call & Drawer Panel States
  const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video'; partnerName: string; partnerAvatar: string } | null>(null);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showGroupDashboard, setShowGroupDashboard] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);

  // Chat custom configurations
  const [pinnedChats, setPinnedChats] = useState<string[]>(['chat-1']); 
  const [mutedChats, setMutedChats] = useState<string[]>([]);
  const [blockedChats, setBlockedChats] = useState<string[]>([]);
  const [archivedChats, setArchivedChats] = useState<string[]>([]);
  const [disappearingMode, setDisappearingMode] = useState(false);
  const [pinnedMessageInChat, setPinnedMessageInChat] = useState<ExtendedMessage | null>(null);

  // Advanced contextual bubble interaction menu
  const [activeContextMessageId, setActiveContextMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [replyQuoteText, setReplyQuoteText] = useState<string | null>(null);

  // Voice Note states
  const [voiceRecordState, setVoiceRecordState] = useState<'idle' | 'recording' | 'paused' | 'playback'>('idle');
  const [voiceTimer, setVoiceTimer] = useState(0);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [voiceWaveform, setVoiceWaveform] = useState<number[]>([]);
  const voiceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Accessibility modes
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large'>('normal');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChat = chatsList.find(c => c.id === activeChatId);
  const activeChatMessages = activeChatId ? (localMessages[activeChatId] || []) : [];

  // Scroll to bottom helper
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatMessages, voiceRecordState]);

  // Voice recording timer tick
  useEffect(() => {
    if (voiceRecordState === 'recording') {
      voiceTimerRef.current = setInterval(() => {
        setVoiceTimer(p => p + 1);
        // Generate random wave bar heights for live interactive feed animation
        setVoiceWaveform(prev => [...prev.slice(-30), Math.floor(Math.random() * 24) + 6]);
      }, 100);
    } else {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    }
    return () => {
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
    };
  }, [voiceRecordState]);

  // Playback timer ticker
  useEffect(() => {
    if (voiceRecordState === 'playback' && playbackSeconds > 0) {
      playbackTimerRef.current = setTimeout(() => {
        setPlaybackSeconds(p => Math.max(0, p - 1));
      }, 1000);
    } else if (playbackSeconds === 0 && voiceRecordState === 'playback') {
      // finish playback simulation
    }
    return () => {
      if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
    };
  }, [voiceRecordState, playbackSeconds]);

  // Offline connection synchronization logic
  useEffect(() => {
    if (!isOffline && offlineQueue.length > 0) {
      window.dispatchEvent(new CustomEvent('toast', { detail: "📶 Network connection re-established! Synchronizing ledger..." }));
      
      const timer = setTimeout(() => {
        setLocalMessages(prev => {
          const updated = { ...prev };
          const stream = updated[activeChatId] || [];
          const synchronized = stream.map(m => {
            if (m.isOfflineUnsent) {
              return { ...m, isOfflineUnsent: false, status: 'delivered' as const };
            }
            return m;
          });
          updated[activeChatId] = synchronized;
          return updated;
        });
        setOfflineQueue([]);
        window.dispatchEvent(new CustomEvent('toast', { detail: "✨ All queued messages synchronized successfully!" }));
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isOffline, offlineQueue, activeChatId]);

  // Handle disappearing messages
  useEffect(() => {
    if (!disappearingMode || activeChatMessages.length === 0) return;
    const lastMsg = activeChatMessages[activeChatMessages.length - 1];
    if (lastMsg.senderId === currentUser.id) {
      const timer = setTimeout(() => {
        setLocalMessages(prev => {
          const stream = prev[activeChatId] || [];
          return {
            ...prev,
            [activeChatId]: stream.filter(m => m.id !== lastMsg.id)
          };
        });
        window.dispatchEvent(new CustomEvent('toast', { detail: "🧹 Message auto-erased (10s disappearing vanish mode)" }));
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [activeChatMessages, disappearingMode, activeChatId]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!typedMessage.trim() || !activeChatId) return;

    if (blockedChats.includes(activeChatId)) {
      alert("This user connection is blocked. Unblock them in parameters to communicate.");
      return;
    }

    if (editingMessageId) {
      // Process editing action
      setLocalMessages(prev => {
        const stream = prev[activeChatId] || [];
        const next = stream.map(m => m.id === editingMessageId ? { ...m, content: typedMessage, isEdited: true } : m);
        return { ...prev, [activeChatId]: next };
      });
      setEditingMessageId(null);
      setTypedMessage('');
      window.dispatchEvent(new CustomEvent('toast', { detail: "✏️ Message updated successfully" }));
      return;
    }

    const newMsg: ExtendedMessage = {
      id: 'msg-' + Date.now(),
      chatId: activeChatId,
      senderId: currentUser.id,
      content: typedMessage,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: isOffline ? 'sent' : 'delivered',
      replyToQuote: replyQuoteText || undefined,
      isOfflineUnsent: isOffline || undefined
    };

    if (isOffline) {
      setOfflineQueue(prev => [...prev, newMsg]);
    }

    setLocalMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));

    setTypedMessage('');
    setReplyQuoteText(null);

    // Simulate response if online
    if (!isOffline) {
      simulateAutomaticBotReply(typedMessage);
    }
  };

  const simulateAutomaticBotReply = (userQuery: string) => {
    if (activeChatId === 'group-main') {
      setTimeout(() => {
        const botMsg: ExtendedMessage = {
          id: 'bot-' + Date.now(),
          chatId: activeChatId,
          senderId: 'voh_ai',
          content: `🤖 [Core Response] Analysis on "${userQuery}" completed. Latency metrics remain under 1.8ms. Design variables verified!`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'read'
        };
        setLocalMessages(prev => ({
          ...prev,
          [activeChatId]: [...(prev[activeChatId] || []), botMsg]
        }));
      }, 1500);
      return;
    }

    setTimeout(() => {
      const responses = [
        "That sounds highly efficient! Let's incorporate glassmorphism elements.",
        "Verified! My stream is active. Should we schedule a audio-call session?",
        "Indeed. Keep the interface clean and distraction-free.",
        "Roger that. Let us push the build variables to the production environment."
      ];
      const randomReply = responses[Math.floor(Math.random() * responses.length)];
      const partnerReply: ExtendedMessage = {
        id: 'reply-' + Date.now(),
        chatId: activeChatId,
        senderId: activeChat?.partnerId || 'creator-4',
        content: randomReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status: 'read'
      };

      setLocalMessages(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), partnerReply]
      }));
    }, 1200);
  };

  // Voice recording simulation methods
  const handleStartVoiceRecording = () => {
    setVoiceRecordState('recording');
    setVoiceTimer(0);
    setVoiceWaveform([8, 12, 16, 20, 14, 10, 6, 12, 18, 22]);
  };

  const handlePauseVoiceRecording = () => {
    setVoiceRecordState('paused');
  };

  const handleResumeVoiceRecording = () => {
    setVoiceRecordState('recording');
  };

  const handleCancelVoiceRecording = () => {
    setVoiceRecordState('idle');
    setVoiceTimer(0);
    setVoiceWaveform([]);
  };

  const handleStopAndReviewVoiceRecording = () => {
    setVoiceRecordState('playback');
    setPlaybackSeconds(Math.ceil(voiceTimer / 10));
  };

  const handleSendVoiceRecording = () => {
    const finalDur = Math.ceil(voiceTimer / 10);
    const secsStr = finalDur % 60;
    const minsStr = Math.floor(finalDur / 60);
    const durStr = `${minsStr}:${secsStr.toString().padStart(2, '0')}`;

    const newMsg: ExtendedMessage = {
      id: 'voice-' + Date.now(),
      chatId: activeChatId,
      senderId: currentUser.id,
      content: `🎙️ Voice Note (${durStr})`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: isOffline ? 'sent' : 'delivered',
      voiceDuration: durStr,
      isVoicePlaying: false,
      isOfflineUnsent: isOffline || undefined
    };

    if (isOffline) {
      setOfflineQueue(prev => [...prev, newMsg]);
    }

    setLocalMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));

    setVoiceRecordState('idle');
    setVoiceTimer(0);
    setVoiceWaveform([]);

    if (!isOffline) {
      simulateAutomaticBotReply("voice message note");
    }
  };

  // Attachment triggers
  const handleSendFileAttachment = (name: string, size: string) => {
    setShowAttachmentSheet(false);
    const newMsg: ExtendedMessage = {
      id: 'file-' + Date.now(),
      chatId: activeChatId,
      senderId: currentUser.id,
      content: `📎 Shared: ${name}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: isOffline ? 'sent' : 'delivered',
      fileName: name,
      fileSize: size,
      isOfflineUnsent: isOffline || undefined
    };

    if (isOffline) {
      setOfflineQueue(prev => [...prev, newMsg]);
    }

    setLocalMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));
  };

  // Interaction handlers
  const handleToggleMute = (chatId: string) => {
    setMutedChats(prev => prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]);
  };

  const handleTogglePin = (chatId: string) => {
    setPinnedChats(prev => prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]);
  };

  const handleToggleArchive = (chatId: string) => {
    setArchivedChats(prev => prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]);
  };

  const handleToggleBlock = (chatId: string) => {
    setBlockedChats(prev => prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]);
  };

  // Bubble context actions
  const handleReactToMessage = (msgId: string, emoji: string) => {
    setLocalMessages(prev => {
      const stream = prev[activeChatId] || [];
      const updated = stream.map(m => {
        if (m.id === msgId) {
          const reacts = m.reactions || [];
          const nextReacts = reacts.includes(emoji) ? reacts.filter(e => e !== emoji) : [...reacts, emoji];
          return { ...m, reactions: nextReacts };
        }
        return m;
      });
      return { ...prev, [activeChatId]: updated };
    });
    setActiveContextMessageId(null);
  };

  const handleTranslateMessage = (msgId: string) => {
    // Simulate translating via simulated API
    setLocalMessages(prev => {
      const stream = prev[activeChatId] || [];
      return {
        ...prev,
        [activeChatId]: stream.map(m => m.id === msgId ? { ...m, isTranslating: true } : m)
      };
    });

    setTimeout(() => {
      setLocalMessages(prev => {
        const stream = prev[activeChatId] || [];
        return {
          ...prev,
          [activeChatId]: stream.map(m => {
            if (m.id === msgId) {
              const translations: { [key: string]: string } = {
                "Welcome to the premium Nexora Global Core. We are currently tracking system performance.": "Bienvenido al núcleo global premium de Nexora. Actualmente estamos rastreando el rendimiento del sistema. 🇪🇸",
                "Optimizing the main timeline interface. Backdrops are looking gorgeous.": "Optimisation de l'interface principale de la chronologie. Les décors sont magnifiques. 🇫🇷",
                "That sounds highly efficient! Let's incorporate glassmorphism elements.": "¡Eso suena muy eficiente! Incorporaremos elementos de glassmorphic. 🇪🇸"
              };
              const trans = translations[m.content] || "This represents a secured AI translation into Spanish language... 🇪🇸";
              return { ...m, isTranslating: false, translation: trans };
            }
            return m;
          })
        };
      });
    }, 800);
    setActiveContextMessageId(null);
  };

  const handleDeleteMessage = (msgId: string, forEveryone: boolean) => {
    if (window.confirm(forEveryone ? "Delete this message for everyone?" : "Delete this message for me?")) {
      setLocalMessages(prev => {
        const stream = prev[activeChatId] || [];
        if (forEveryone) {
          return {
            ...prev,
            [activeChatId]: stream.filter(m => m.id !== msgId)
          };
        } else {
          return {
            ...prev,
            [activeChatId]: stream.map(m => m.id === msgId ? { ...m, content: "🚫 Message deleted for me." } : m)
          };
        }
      });
      setActiveContextMessageId(null);
      window.dispatchEvent(new CustomEvent('toast', { detail: "🗑️ Message deleted successfully." }));
    }
  };

  // Searching logic & matching text highlights
  const highlightMatch = (text: string, query: string) => {
    if (!query) return <span>{text}</span>;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() 
            ? <mark key={i} className="bg-amber-400 text-slate-950 font-semibold px-0.5 rounded">{part}</mark> 
            : part
        )}
      </span>
    );
  };

  // Sort and filter active lists
  const sortedChats = [...chatsList].sort((a, b) => {
    const aPinned = pinnedChats.includes(a.id) ? 1 : 0;
    const bPinned = pinnedChats.includes(b.id) ? 1 : 0;
    return bPinned - aPinned;
  });

  const filteredChats = sortedChats.filter(chat => {
    // Search match
    const matchesQuery = chat.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chat.lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesQuery) return false;

    // Tab filter
    if (activeTab === 'groups') return chat.id === 'group-main';
    if (activeTab === 'requests') return chat.unreadCount > 3; // Simulate request indicator
    if (activeTab === 'archived') return archivedChats.includes(chat.id);
    if (activeTab === 'ai') return chat.partnerId === 'voh_ai';

    // Standard list
    return !archivedChats.includes(chat.id);
  });

  // Calculate message grouping consecutively
  const renderMessageList = () => {
    const results: React.ReactNode[] = [];
    const searchFilterMatches = activeChatMessages.filter(msg => {
      if (searchFilter === 'all') return true;
      if (searchFilter === 'media' && (msg.voiceDuration || msg.videoUrl)) return true;
      if (searchFilter === 'files' && msg.fileName) return true;
      if (searchFilter === 'links' && msg.content.includes('http')) return true;
      return true;
    });

    for (let i = 0; i < searchFilterMatches.length; i++) {
      const msg = searchFilterMatches[i];
      const prevMsg = i > 0 ? searchFilterMatches[i - 1] : null;

      // Group consecutive messages sent within 2 minutes from the same sender
      const isMe = msg.senderId === currentUser.id;
      const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;
      const isGrouped = isSameSender; // Keep it simple and fluid for grouped bubbles

      const isPinned = pinnedMessageInChat?.id === msg.id;

      results.push(
        <div 
          key={msg.id} 
          className={`flex ${isMe ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-0.5' : 'mt-3.5'} relative group/bubble`}
        >
          <div className={`flex items-start gap-2.5 max-w-[70%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
            
            {/* Show avatar only on leading grouped message */}
            {!isMe && !isGrouped ? (
              <img 
                src={activeChat?.partnerAvatar} 
                alt="Partner avatar" 
                className="w-7 h-7 rounded-lg object-cover shrink-0 border border-violet-500/10" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-7 shrink-0" />
            )}

            <div className="flex flex-col">
              {/* Show display name on leading message */}
              {!isMe && !isGrouped && (
                <span className="text-[9px] font-mono text-violet-400 font-extrabold mb-0.5 flex items-center gap-1">
                  <span>{activeChat?.partnerName}</span>
                  {activeChat?.partnerId === 'voh_ai' && <PurpleVerifiedBadge type="founder" className="w-3 h-3" />}
                </span>
              )}

              {/* Quote reply header */}
              {msg.replyToQuote && (
                <div className="bg-black/40 border border-violet-500/10 text-[10px] text-violet-300 italic p-1 px-2.5 rounded-t-xl border-b-0 max-w-full truncate leading-none">
                  💬 Quote: "{msg.replyToQuote}"
                </div>
              )}

              {/* Message Bubble Canvas */}
              <div 
                className={`relative rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                  isMe 
                    ? 'bg-gradient-to-r from-violet-600 via-[#8B5CF6] to-pink-500 text-white rounded-tr-none' 
                    : 'bg-[#0e0a29]/95 text-violet-100 border border-violet-500/10 rounded-tl-none'
                } ${msg.replyToQuote ? 'rounded-t-none' : ''}`}
                id={`bubble-${msg.id}`}
              >
                {/* Voice Note Visual */}
                {msg.voiceDuration ? (
                  <div className="flex items-center gap-2.5 py-1 select-none">
                    <button 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('toast', { detail: "▶️ Playing secure audio memo..." }));
                      }}
                      className="w-6 h-6 rounded-full bg-white/20 hover:bg-white/35 text-white flex items-center justify-center transition-all cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current text-white" />
                    </button>
                    <div className="flex gap-0.5 items-end h-4 w-24 shrink-0">
                      {[6, 12, 18, 10, 4, 14, 20, 8, 10].map((h, idx) => (
                        <span key={idx} className="w-1 bg-white/70 rounded-full" style={{ height: `${h}px` }} />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono opacity-80 shrink-0">{msg.voiceDuration}</span>
                  </div>
                ) : msg.fileName ? (
                  <div className="flex items-center gap-2.5 py-1 text-left bg-black/30 border border-white/5 rounded-xl px-2.5 max-w-xs">
                    <FileText className="w-5 h-5 text-cyan-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-white text-[11px] font-bold block truncate leading-none">{msg.fileName}</span>
                      <span className="text-[9px] font-mono text-violet-400/70 block mt-0.5">{msg.fileSize} • doc</span>
                    </div>
                  </div>
                ) : (
                  <p className="break-words select-text font-sans">
                    {highlightMatch(msg.content, searchQuery)}
                  </p>
                )}

                {/* Translation display overlay */}
                {msg.isTranslating && (
                  <div className="mt-2 pt-1 border-t border-white/10 flex items-center gap-1 text-[10px] text-zinc-400">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>AI Translating...</span>
                  </div>
                )}
                {msg.translation && (
                  <div className="mt-2 pt-1.5 border-t border-white/10 text-[10px] text-amber-300 italic font-serif flex items-center gap-1.5">
                    <Globe className="w-3 h-3 text-amber-400 shrink-0" />
                    <span>{msg.translation}</span>
                  </div>
                )}

                {/* Bottom detail row */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[8.5px] opacity-75 font-mono select-none">
                  <span className="opacity-60">{msg.timestamp}</span>
                  {msg.isEdited && <span className="text-[8px] uppercase tracking-wider text-violet-400">Edited</span>}
                  {isMe && (
                    <div className="flex items-center">
                      {msg.isOfflineUnsent ? (
                        <WifiOff className="w-3 h-3 text-orange-400" title="Offline Queue" />
                      ) : msg.status === 'sent' ? (
                        <Check className="w-3 h-3 text-white/40" />
                      ) : (
                        <CheckCheck className={`w-3 h-3 ${msg.status === 'read' ? 'text-cyan-300' : 'text-white/50'}`} />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Rendered reactions below bubble */}
              {msg.reactions && msg.reactions.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {msg.reactions.map((emoji, i) => (
                    <span 
                      key={i} 
                      onClick={() => handleReactToMessage(msg.id, emoji)}
                      className="px-1.5 py-0.5 rounded-full bg-violet-950/40 border border-violet-500/20 text-[9px] cursor-pointer"
                    >
                      {emoji}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bubble Hover Action Options trigger */}
            <div className="opacity-0 group-hover/bubble:opacity-100 flex items-center gap-1 transition-opacity self-center">
              <button 
                onClick={() => setReplyQuoteText(msg.content)}
                className="p-1 hover:bg-violet-500/10 text-violet-400 hover:text-white rounded-lg cursor-pointer"
                title="Swipe Reply / Quote"
              >
                <CornerUpLeft className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setActiveContextMessageId(activeContextMessageId === msg.id ? null : msg.id)}
                className="p-1 hover:bg-violet-500/10 text-violet-400 hover:text-white rounded-lg cursor-pointer"
              >
                <SmilePlus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Floating context menu per message bubble */}
            {activeContextMessageId === msg.id && (
              <div className={`absolute bottom-[-10px] ${isMe ? 'right-0' : 'left-0'} z-30 bg-[#09071c] border border-violet-500/20 rounded-2xl p-2 shadow-2xl space-y-2 w-52 text-left`}>
                <div className="grid grid-cols-6 gap-1 border-b border-white/5 pb-1.5">
                  {['❤️', '🔥', '👏', '😂', '💡', '❓'].map(emoji => (
                    <button 
                      key={emoji}
                      onClick={() => handleReactToMessage(msg.id, emoji)}
                      className="text-center hover:scale-125 transition-transform"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col text-[10px] uppercase font-mono tracking-wider font-extrabold text-violet-300">
                  <button 
                    onClick={() => {
                      setReplyQuoteText(msg.content);
                      setActiveContextMessageId(null);
                    }} 
                    className="p-1.5 hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <CornerUpLeft className="w-3 h-3" /> Reply Thread
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                      setActiveContextMessageId(null);
                      window.dispatchEvent(new CustomEvent('toast', { detail: "📋 Message text copied to clipboard!" }));
                    }} 
                    className="p-1.5 hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-3 h-3" /> Copy Text
                  </button>
                  <button 
                    onClick={() => handleTranslateMessage(msg.id)} 
                    className="p-1.5 hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Globe className="w-3 h-3" /> AI Translate
                  </button>
                  {isMe && (
                    <button 
                      onClick={() => {
                        setEditingMessageId(msg.id);
                        setTypedMessage(msg.content);
                        setActiveContextMessageId(null);
                      }} 
                      className="p-1.5 hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Settings className="w-3 h-3" /> Edit Message
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setPinnedMessageInChat(msg);
                      setActiveContextMessageId(null);
                      window.dispatchEvent(new CustomEvent('toast', { detail: "📌 Message pinned to dialogue banner!" }));
                    }} 
                    className="p-1.5 hover:bg-white/5 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Pin className="w-3 h-3" /> Pin Dialogue
                  </button>
                  <button 
                    onClick={() => handleDeleteMessage(msg.id, isMe)} 
                    className="p-1.5 hover:bg-red-500/10 text-red-400 rounded-lg flex items-center gap-2 cursor-pointer"
                  >
                    <Trash className="w-3 h-3" /> Delete Message
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      );
    }

    if (results.length === 0) {
      return (
        <div className="p-12 text-center text-violet-400/20 font-mono text-xs">
          No filtered messages in this channel ledger.
        </div>
      );
    }

    return results;
  };

  return (
    <div id="messages-panel-root" className="grid grid-cols-1 md:grid-cols-3 rounded-3xl border border-violet-500/10 bg-[#06040f] overflow-hidden h-[640px] relative shadow-2xl select-none">
      
      {/* ======================================================== */}
      {/* LEFT COLUMN: ACTIVE CHATS & SEARCH */}
      {/* ======================================================== */}
      <div className="border-r border-violet-500/10 flex flex-col h-full bg-[#09071c]/45">
        
        {/* Modern Segmented Navigation Header */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-[#050410] border-b border-violet-500/5 shrink-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'groups', label: 'Groups' },
            { id: 'requests', label: 'Inbox' },
            { id: 'archived', label: 'Archive' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 text-[8px] font-mono tracking-wider font-extrabold rounded-lg uppercase transition-all cursor-pointer text-center relative ${
                activeTab === tab.id ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-violet-400/50 hover:text-white'
              }`}
            >
              {tab.label}
              {tab.id === 'requests' && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Current Presence Profile Switcher */}
        <div className="p-2.5 bg-[#03010c] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <img 
                src={currentUser.avatar} 
                alt="My Profile avatar" 
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-violet-500/30" 
                referrerPolicy="no-referrer"
              />
              <span className={`absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                myPresence === 'online' ? 'bg-emerald-500' : myPresence === 'away' ? 'bg-amber-500' : myPresence === 'busy' ? 'bg-rose-500' : 'bg-zinc-600'
              }`} />
            </div>
            <div className="text-left leading-none">
              <p className="text-[10px] font-sans font-bold text-white">{currentUser.name}</p>
              <span className="text-[8px] font-mono text-zinc-500 uppercase">{myPresence}</span>
            </div>
          </div>

          <div className="relative">
            <button 
              onClick={() => setShowPresenceDropdown(!showPresenceDropdown)}
              className="p-1 hover:bg-white/5 rounded-lg text-zinc-500 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {showPresenceDropdown && (
              <div className="absolute right-0 top-6 z-30 bg-[#09071c] border border-violet-500/20 rounded-xl p-1.5 space-y-1 w-32 shadow-2xl text-left">
                {[
                  { id: 'online', label: 'Online 🟢' },
                  { id: 'away', label: 'Away 🟡' },
                  { id: 'busy', label: 'Busy 🔴' },
                  { id: 'invisible', label: 'Invisible 👤' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMyPresence(item.id as any);
                      setShowPresenceDropdown(false);
                      window.dispatchEvent(new CustomEvent('toast', { detail: `Presence status updated: ${item.label}` }));
                    }}
                    className="w-full text-left p-1.5 hover:bg-white/5 rounded-lg text-[10px] font-mono uppercase tracking-wider text-violet-200"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Connection Search box */}
        <div className="p-3 border-b border-violet-500/5 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-violet-400/50" />
            <input
              type="text"
              placeholder="Search chat database..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-violet-500/10 focus:border-[#8B5CF6] focus:outline-hidden text-xs text-white placeholder-violet-400/20 font-sans"
            />
          </div>

          {searchQuery && (
            <div className="flex gap-1 overflow-x-auto no-scrollbar py-0.5">
              {[
                { id: 'all', label: 'All Matches' },
                { id: 'media', label: 'Media shared' },
                { id: 'files', label: 'Documents' },
                { id: 'links', label: 'Hyperlinks' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSearchFilter(f.id as any)}
                  className={`px-2 py-1 rounded-lg text-[8px] font-mono uppercase shrink-0 ${
                    searchFilter === f.id ? 'bg-violet-600 text-white' : 'bg-black/30 text-zinc-500 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Contacts Card stream */}
        <div className="flex-1 overflow-y-auto divide-y divide-violet-500/5">
          {filteredChats.map(chat => {
            const isSelected = chat.id === activeChatId;
            const isPinned = pinnedChats.includes(chat.id);
            const isMuted = mutedChats.includes(chat.id);

            return (
              <div
                key={chat.id}
                className={`w-full p-3 flex items-center justify-between transition-colors relative group/item cursor-pointer ${
                  isSelected ? 'bg-violet-600/10 border-l-2 border-[#8B5CF6]' : 'hover:bg-violet-500/5'
                }`}
                onClick={() => {
                  setActiveChatId(chat.id);
                  chat.unreadCount = 0;
                }}
              >
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
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

                  <div className="overflow-hidden flex-1 text-left leading-none">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1">
                        <p className="text-xs font-sans font-black text-white truncate max-w-[100px]">
                          {chat.partnerName}
                        </p>
                        {chat.id === 'group-main' ? <Users className="w-3 h-3 text-violet-400 shrink-0" /> : <PurpleVerifiedBadge type="figure" className="w-3 h-3" />}
                      </div>
                      <span className="text-[8px] font-mono text-zinc-500 shrink-0">{chat.lastTimestamp}</span>
                    </div>

                    <p className="text-[10px] font-sans text-violet-300/40 truncate leading-tight mt-1">
                      {chat.lastMessage}
                    </p>
                  </div>
                </div>

                {/* Quick actions indicator */}
                <div className="flex items-center gap-1 pl-1 shrink-0">
                  {isPinned && <Pin className="w-2.5 h-2.5 text-violet-400 shrink-0" />}
                  {isMuted && <VolumeX className="w-2.5 h-2.5 text-zinc-500 shrink-0" />}
                  {chat.unreadCount > 0 && (
                    <span className="h-4 min-w-4 px-1 flex items-center justify-center text-[8px] font-bold font-mono bg-pink-500 text-white rounded-full shrink-0">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredChats.length === 0 && (
            <div className="p-8 text-center text-violet-400/20 font-mono text-[10px]">
              No secure alignments matching query.
            </div>
          )}
        </div>

        {/* Offline Simulation toggle footer bar */}
        <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between text-xs font-mono shrink-0">
          <span className="text-zinc-500 uppercase tracking-widest text-[9px] font-extrabold">Simulate Offline</span>
          <button 
            onClick={() => setIsOffline(!isOffline)}
            className={`px-3 py-1 rounded-xl transition-all cursor-pointer ${
              isOffline 
                ? 'bg-rose-500 text-white font-extrabold border border-rose-400/30 shadow-md animate-pulse' 
                : 'bg-zinc-800 text-zinc-400 border border-white/5'
            }`}
          >
            {isOffline ? 'OFFLINE ACTIVE 🔴' : 'ONLINE STABLE 🟢'}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: CHAT WINDOW PANEL */}
      {/* ======================================================== */}
      <div className="md:col-span-2 flex flex-col h-full bg-[#05030d] relative overflow-hidden">
        {activeChat ? (
          <>
            {/* Header top row */}
            <div className="p-3.5 border-b border-violet-500/10 flex items-center justify-between bg-[#080516] shrink-0">
              <div className="flex items-center gap-3">
                <div 
                  className="cursor-pointer"
                  onClick={() => activeChat.id === 'group-main' ? setShowGroupDashboard(true) : setShowMediaGallery(true)}
                  title="Click to view shared assets & config"
                >
                  <img 
                    src={activeChat.partnerAvatar} 
                    alt={activeChat.partnerName} 
                    className="w-9 h-9 rounded-xl object-cover ring-2 ring-violet-500/10" 
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5 leading-none">
                    <h3 className="text-xs font-sans font-black text-white hover:text-violet-300 cursor-pointer" onClick={() => activeChat.id === 'group-main' ? setShowGroupDashboard(true) : setShowMediaGallery(true)}>
                      {activeChat.partnerName}
                    </h3>
                    <span className={`h-1.5 w-1.5 rounded-full ${activeChat.isPartnerOnline ? 'bg-emerald-500' : 'bg-zinc-600'}`} />
                  </div>
                  <p className="text-[9.5px] font-sans text-violet-200/50 truncate max-w-[180px] sm:max-w-[280px] mt-1">
                    {activeChat.partnerBio}
                  </p>
                </div>
              </div>

              {/* Call and settings actions */}
              <div className="flex items-center gap-1.5 relative">
                
                {/* Voice Call */}
                <button
                  onClick={() => setActiveCall({ type: 'voice', partnerName: activeChat.partnerName, partnerAvatar: activeChat.partnerAvatar })}
                  className="p-1.5 bg-[#0a071d] hover:bg-[#110c2e] border border-violet-500/10 hover:border-violet-500/20 rounded-lg text-violet-400 hover:text-white transition-colors cursor-pointer"
                  title="Secure Voice Call"
                >
                  <Phone className="w-3.5 h-3.5" />
                </button>

                {/* Video Call */}
                <button
                  onClick={() => setActiveCall({ type: 'video', partnerName: activeChat.partnerName, partnerAvatar: activeChat.partnerAvatar })}
                  className="p-1.5 bg-[#0a071d] hover:bg-[#110c2e] border border-violet-500/10 hover:border-violet-500/20 rounded-lg text-violet-400 hover:text-white transition-colors cursor-pointer"
                  title="Secure Video Call"
                >
                  <Video className="w-3.5 h-3.5" />
                </button>

                {/* Disappearing Mode */}
                <button
                  onClick={() => {
                    setDisappearingMode(!disappearingMode);
                    window.dispatchEvent(new CustomEvent('toast', { detail: `Vanish mode set to: ${!disappearingMode ? '10 SECONDS' : 'DISABLED'}` }));
                  }}
                  className={`p-1.5 border rounded-lg transition-all cursor-pointer ${
                    disappearingMode 
                      ? 'bg-amber-500/15 border-amber-400/30 text-amber-300 animate-pulse' 
                      : 'bg-[#0a071d] border-violet-500/10 text-violet-400 hover:text-white'
                  }`}
                  title="10s Disappearing Vanish Clock"
                >
                  <Clock className="w-3.5 h-3.5" />
                </button>

                {/* Info Panel Toggle */}
                <button
                  onClick={() => activeChat.id === 'group-main' ? setShowGroupDashboard(true) : setShowMediaGallery(true)}
                  className="p-1.5 bg-[#0a071d] hover:bg-[#110c2e] border border-violet-500/10 rounded-lg text-violet-400 hover:text-white transition-colors cursor-pointer"
                  title="Shared Media Ledger Database"
                >
                  <Info className="w-3.5 h-3.5" />
                </button>

              </div>
            </div>

            {/* Pinned Messages Banner */}
            {pinnedMessageInChat && (
              <div className="bg-[#1b0a2c] p-2 px-4 border-b border-violet-500/15 flex items-center justify-between text-left select-none relative shrink-0">
                <div 
                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                  onClick={() => {
                    const bubble = document.getElementById(`bubble-${pinnedMessageInChat.id}`);
                    bubble?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    window.dispatchEvent(new CustomEvent('toast', { detail: "📍 Scrolled to pinned conversation landmark" }));
                  }}
                >
                  <Pin className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <p className="text-[10px] font-sans text-violet-200 truncate pr-4">
                    Pinned Dialogue: <span className="italic">"{pinnedMessageInChat.content}"</span>
                  </p>
                </div>
                <button
                  onClick={() => setPinnedMessageInChat(null)}
                  className="p-1 hover:bg-white/10 rounded-full text-violet-400 hover:text-white shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Main messages scrolling canvas */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {renderMessageList()}
              <div ref={messagesEndRef} />
            </div>

            {/* Vanish mode info bar */}
            {disappearingMode && (
              <div className="bg-amber-600/10 p-2 text-[9px] font-mono tracking-wider text-amber-300 text-center select-none uppercase font-extrabold flex items-center justify-center gap-1 shrink-0">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>Vanish Mode active: Messages sent auto-erase after 10 seconds.</span>
              </div>
            )}

            {/* Thread quote row */}
            {replyQuoteText && (
              <div className="bg-[#1b0a2c] p-2.5 px-4 border-t border-violet-500/10 flex items-center justify-between text-left select-none relative shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <CornerUpLeft className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <p className="text-[11px] font-sans text-violet-200 truncate pr-4">
                    Quoting specific message: <span className="italic">"{replyQuoteText}"</span>
                  </p>
                </div>
                <button
                  onClick={() => setReplyQuoteText(null)}
                  className="p-1 hover:bg-white/10 rounded-full text-violet-400 hover:text-white shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Voice record composer block */}
            {voiceRecordState !== 'idle' && (
              <div className="p-3 bg-gradient-to-r from-pink-950/20 to-violet-950/25 border-t border-violet-500/15 flex items-center justify-between gap-3 shrink-0 text-left">
                <div className="flex items-center gap-3">
                  <Mic className="w-4 h-4 text-pink-400 animate-pulse shrink-0" />
                  <span className="text-[10px] font-mono font-black uppercase text-pink-400">Secure Recording Stream</span>
                </div>

                {voiceRecordState === 'recording' && (
                  <div className="flex items-center gap-3">
                    {/* Animated visual waveform */}
                    <div className="flex gap-0.5 items-end h-5 w-28 overflow-hidden">
                      {voiceWaveform.map((h, i) => (
                        <span key={i} className="w-1 bg-pink-400 rounded-full" style={{ height: `${h}px` }} />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono font-bold text-white">
                      0:{(Math.ceil(voiceTimer / 10)).toString().padStart(2, '0')}
                    </span>
                    <button 
                      onClick={handlePauseVoiceRecording}
                      className="px-2.5 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-[9px] font-mono font-black text-violet-300"
                    >
                      PAUSE
                    </button>
                    <button 
                      onClick={handleStopAndReviewVoiceRecording}
                      className="px-2.5 py-1 bg-pink-500 hover:bg-pink-400 text-white rounded-lg text-[9px] font-mono font-black"
                    >
                      STOP REVIEW
                    </button>
                  </div>
                )}

                {voiceRecordState === 'paused' && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase font-extrabold animate-pulse">Recording Paused</span>
                    <button onClick={handleResumeVoiceRecording} className="px-2.5 py-1 bg-violet-600 rounded-lg text-[9px] font-mono font-black text-white">RESUME</button>
                  </div>
                )}

                {voiceRecordState === 'playback' && (
                  <div className="flex items-center gap-3">
                    <span className="text-[9.5px] font-mono text-amber-300 uppercase font-black">Ready to send draft ({playbackSeconds}s left)</span>
                    <button onClick={handleSendVoiceRecording} className="px-3 py-1 bg-emerald-600 text-white font-mono text-[9px] font-black rounded-lg">SEND</button>
                  </div>
                )}

                <button 
                  onClick={handleCancelVoiceRecording}
                  className="p-1 hover:bg-red-500/10 text-red-400 hover:text-white rounded-lg"
                  title="Discard Recording"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Dialogue Input Row Composer */}
            <div className="p-3 border-t border-violet-500/10 bg-[#09071c] shrink-0">
              <form 
                onSubmit={handleSendMessage} 
                className="flex items-center gap-2 relative"
              >
                {/* File Attachment shortcut */}
                <button
                  type="button"
                  onClick={() => setShowAttachmentSheet(!showAttachmentSheet)}
                  className="p-2.5 bg-violet-600/5 hover:bg-violet-600/20 border border-violet-500/10 hover:border-violet-500/20 rounded-xl text-violet-300 cursor-pointer"
                  title="Send Documents & Wireframes"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder={
                    editingMessageId 
                      ? "Edit your sent message..." 
                      : activeChat.id === 'group-main' 
                        ? "Broadcast a message to group peers..." 
                        : "Write secure coordinate..."
                  }
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  className="flex-1 px-4 py-2.5 text-xs rounded-xl bg-slate-950 border border-violet-500/10 focus:border-[#8B5CF6] focus:outline-hidden text-white placeholder-violet-400/20 font-sans"
                />

                {/* Voice recording start button */}
                {voiceRecordState === 'idle' && (
                  <button
                    type="button"
                    onClick={handleStartVoiceRecording}
                    className="p-2.5 bg-violet-600/5 hover:bg-violet-600/20 border border-violet-500/10 rounded-xl text-violet-300 hover:text-white cursor-pointer"
                    title="Simulate Voice Memo"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!typedMessage.trim() && !editingMessageId}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-pink-500 hover:brightness-110 active:scale-98 text-white transition-all flex items-center justify-center disabled:opacity-35 cursor-pointer shrink-0 animate-fade-in"
                >
                  <Send className="w-4 h-4" />
                </button>

                {/* Attachment Bottom Sheet / Panel */}
                <AnimatePresence>
                  {showAttachmentSheet && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className="absolute left-0 bottom-14 w-48 bg-[#09071c] border border-violet-500/20 rounded-xl p-2.5 shadow-2xl z-20 text-left space-y-1"
                    >
                      <button
                        type="button"
                        onClick={() => handleSendFileAttachment("benchmark_speed.json", "2.1 KB")}
                        className="w-full text-left p-1.5 hover:bg-violet-950/25 rounded-lg text-[9.5px] font-mono uppercase font-black text-violet-300 flex items-center gap-2 cursor-pointer"
                      >
                        📂 Send Speed JSON
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendFileAttachment("ux_sketch_glassmorphic.png", "124 KB")}
                        className="w-full text-left p-1.5 hover:bg-violet-950/25 rounded-lg text-[9.5px] font-mono uppercase font-black text-violet-300 flex items-center gap-2 cursor-pointer"
                      >
                        🎨 Share Wireframe Card
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSendFileAttachment("packet_streamer.rs", "12.8 KB")}
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
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#05030d]">
            <ShieldAlert className="w-12 h-12 text-violet-500/30 mb-3 animate-bounce" />
            <p className="font-sans font-medium text-violet-300 text-sm">No Secure Dialogue Selected</p>
            <p className="font-mono text-[10px] text-violet-300/40 mt-1 max-w-xs text-center leading-normal">
              Activate an authorized coordinator in Secure Channels list or accept incoming requests inbox peer queries.
            </p>
          </div>
        )}

        {/* Media Database Slide-in Panel */}
        <MediaGallery 
          isOpen={showMediaGallery} 
          onClose={() => setShowMediaGallery(false)} 
          chatPartnerName={activeChat?.partnerName || ''} 
        />

        {/* Group Configuration Dashboard */}
        <GroupDashboard 
          isOpen={showGroupDashboard} 
          onClose={() => setShowGroupDashboard(false)} 
          groupName={activeChat?.partnerName || ''} 
          groupAvatar={activeChat?.partnerAvatar || ''} 
          groupDescription={activeChat?.partnerBio || ''} 
        />

      </div>

      {/* Simulated Call Screen Modal overlays */}
      <CallScreen 
        isOpen={activeCall !== null} 
        type={activeCall?.type || 'voice'} 
        partnerName={activeCall?.partnerName || ''} 
        partnerAvatar={activeCall?.partnerAvatar || ''} 
        onClose={() => setActiveCall(null)} 
      />

    </div>
  );
}
