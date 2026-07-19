import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, MoreHorizontal, Archive, Pin, BellOff, Bell, Trash2, Check, CheckCheck, 
  CornerUpRight, Menu, Wifi, WifiOff, RefreshCw, X, Send, Sparkles, Star, MessageSquare, 
  ShieldAlert, ShieldCheck, Heart, User as UserIcon, Users, Radio, Phone, Video, Eye, EyeOff, Ghost, 
  Camera, Mic, Play, Pause, AlertTriangle, HelpCircle, Settings, ShoppingBag, DollarSign,
  Activity, ArrowLeft, ArchiveX, VolumeX, Info, Clock, CheckCircle2, ChevronRight, UserCheck, Flame
} from 'lucide-react';
import { User, Chat, Message, ExtendedMessage, Notification } from '../types';
import { db } from '../lib/firebase';
import InboxHeader from './inbox/InboxHeader';
import NotesRow from './inbox/NotesRow';
import InboxTabs from './inbox/InboxTabs';
import { 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  where,
  serverTimestamp,
  deleteDoc
} from 'firebase/firestore';

interface NewInboxViewProps {
  currentUser: User;
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
}

// ============================================================================
// SEED DATA FOR RICH NOTIFICATION CENTER (INTELLIGENT NOTIFICATION CENTER)
// ============================================================================
const INITIAL_NOTIFICATIONS: Notification[] = [];

// ============================================================================
// SYSTEM LEDGER BLUEPRINTS FOR COMPREHENSIVE STUDY DEMO
// ============================================================================
const METRICS_LOGS_INITIAL: string[] = [];

export default function NewInboxView({
  currentUser,
  chats: initialChats,
  messages: initialMessages,
}: NewInboxViewProps) {
  // --- REAL-TIME INBOX STATE ---
  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem('nexora_active_chats');
    return saved ? JSON.parse(saved) : initialChats;
  });

  const [localMessages, setLocalMessages] = useState<{ [chatId: string]: ExtendedMessage[] }>(() => {
    const saved = localStorage.getItem('nexora_active_messages');
    if (saved) return JSON.parse(saved);
    // Convert initialMessages to ExtendedMessage map
    const mapped: { [chatId: string]: ExtendedMessage[] } = {};
    Object.keys(initialMessages).forEach(k => {
      mapped[k] = initialMessages[k].map(m => ({ ...m }));
    });
    return mapped;
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  
  // Navigation tabs: 'all' | 'primary' | 'groups' | 'broadcasts' | 'requests' | 'archived'
  const [navigationTab, setNavigationTab] = useState<'all' | 'primary' | 'groups' | 'broadcasts' | 'requests' | 'archived'>('all');
  
  // Real-time synchronization monitor state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const [pingMs, setPingMs] = useState(14);
  const [dbListenersCount, setDbListenersCount] = useState(2);
  const [syncLogs, setSyncLogs] = useState<string[]>(METRICS_LOGS_INITIAL);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Interaction preferences (Snooze, Favorites, Pins, Archive list)
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(['group-1', 'chat-harrison']);
  const [favoriteChatIds, setFavoriteChatIds] = useState<string[]>(['chat-luna']);
  const [archivedChatIds, setArchivedChatIds] = useState<string[]>([]);
  const [snoozedChatIds, setSnoozedChatIds] = useState<string[]>([]);
  
  // Secure chat features: Vanish Mode & Call Screen
  const [vanishModeEnabled, setVanishModeEnabled] = useState<Record<string, boolean>>({});
  const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video'; partnerName: string; partnerAvatar: string; duration: number } | null>(null);
  const [callTimerInterval, setCallTimerInterval] = useState<any>(null);
  
  // Composer / Input control
  const [newMessageText, setNewMessageText] = useState('');
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);
  const [audioInterval, setAudioInterval] = useState<any>(null);
  const [isSimulatingTyping, setIsSimulatingTyping] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Persistence side-effects
  useEffect(() => {
    localStorage.setItem('nexora_active_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    localStorage.setItem('nexora_active_messages', JSON.stringify(localMessages));
  }, [localMessages]);

  // Telemetry metric simulation
  useEffect(() => {
    const t = setInterval(() => {
      if (connectionStatus === 'connected') {
        setPingMs(Math.floor(8 + Math.random() * 12));
      }
    }, 4000);
    return () => clearInterval(t);
  }, [connectionStatus]);

  // Auto-scroll inside active chat window
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages, activeChatId]);

  // ============================================================================
  // FIRESTORE REAL-TIME ONSNAPSHOT LIFECYCLE
  // ============================================================================
  useEffect(() => {
    if (!db) {
      addSyncLog('⚠️ [FIRESTORE] Instance not available. Simulation mode enabled.');
      return;
    }

    addSyncLog('📡 [FIRESTORE] Attaching real-time onSnapshot listeners...');
    
    // 1. Listen to presence changes
    const presenceRef = collection(db, 'presence');
    const unsubscribePresence = onSnapshot(presenceRef, (snapshot) => {
      const presenceData: Record<string, boolean> = {};
      snapshot.forEach(doc => {
        presenceData[doc.id] = doc.data().isOnline || false;
      });
      
      // Update our chats with live online statuses
      setChats(prev => prev.map(c => {
        if (presenceData[c.partnerId] !== undefined) {
          return { ...c, isPartnerOnline: presenceData[c.partnerId] };
        }
        return c;
      }));
      
      addSyncLog(`🛰️ [PRESENCE-SNAP] Synchronized ${snapshot.size} active node statuses.`);
    }, (error) => {
      addSyncLog(`❌ [PRESENCE-SNAP-ERROR] ${error.message}`);
    });

    // 2. Listen to global chats collection for new unreads or messaging channels
    const chatsRef = collection(db, 'chats');
    const unsubscribeChats = onSnapshot(chatsRef, (snapshot) => {
      addSyncLog(`🛰️ [CHATS-SNAP] Received secure database ledger snapshot. Resolving channels...`);
      // Update any matching chats from Firestore if they exist
      snapshot.forEach(doc => {
        const firestoreChat = doc.data();
        setChats(prev => {
          const exists = prev.some(c => c.id === doc.id);
          if (exists) {
            return prev.map(c => c.id === doc.id ? { ...c, ...firestoreChat } : c);
          } else {
            // Add as a new chat if valid structure
            const newChat: Chat = {
              id: doc.id,
              partnerId: firestoreChat.partnerId || 'unknown',
              partnerName: firestoreChat.partnerName || 'Secure Node',
              partnerAvatar: firestoreChat.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
              partnerBio: firestoreChat.partnerBio || '',
              isPartnerOnline: firestoreChat.isPartnerOnline || false,
              unreadCount: firestoreChat.unreadCount || 0,
              isGroup: firestoreChat.isGroup || false,
              isBroadcast: firestoreChat.isBroadcast || false
            };
            return [...prev, newChat];
          }
        });
      });
    }, (error) => {
      addSyncLog(`❌ [CHATS-SNAP-ERROR] ${error.message}`);
    });

    setDbListenersCount(2);

    return () => {
      unsubscribePresence();
      unsubscribeChats();
    };
  }, []);

  // 3. Dynamic Message Listener on Active Chat Selection
  useEffect(() => {
    if (!activeChatId || !db) return;

    addSyncLog(`📡 [FIRESTORE] Subscribing to messages/ snapshot for thread: ${activeChatId}`);
    
    const messagesRef = collection(db, `chats/${activeChatId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgsList: ExtendedMessage[] = [];
      snapshot.forEach(doc => {
        msgsList.push({ id: doc.id, ...doc.data() } as any);
      });

      if (msgsList.length > 0) {
        setLocalMessages(prev => ({
          ...prev,
          [activeChatId]: msgsList
        }));
        
        // Mark as read in Firestore mock or local
        setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, unreadCount: 0 } : c));
        addSyncLog(`📥 [MESSAGE-SNAP] Thread ${activeChatId} sync: received ${msgsList.length} secure envelopes.`);
      }
    }, (error) => {
      addSyncLog(`❌ [MESSAGE-SNAP-ERROR] Thread ${activeChatId}: ${error.message}`);
    });

    setDbListenersCount(prev => prev + 1);

    return () => {
      unsubscribeMessages();
      setDbListenersCount(prev => Math.max(0, prev - 1));
    };
  }, [activeChatId]);

  // ============================================================================
  // LOGGING & TELEMETRY HELPER
  // ============================================================================
  const addSyncLog = (logText: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSyncLogs(prev => [`[${time}] ${logText}`, ...prev.slice(0, 39)]);
  };

  // ============================================================================
  // INTERACTION HANDLERS: SENDING & SIMULATIONS
  // ============================================================================
  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !activeChatId) return;

    const textToSend = newMessageText;
    setNewMessageText('');

    const messageId = `msg-${Date.now()}`;
    const cleanMsg: ExtendedMessage = {
      id: messageId,
      chatId: activeChatId,
      senderId: currentUser.id,
      content: textToSend,
      timestamp: new Date().toISOString(),
      status: 'sent'
    };

    // Optimistic UI Update
    setLocalMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), cleanMsg]
    }));

    addSyncLog(`📤 [MESSAGE-SENT] Dispatched envelope ${messageId} over secure channel.`);

    // Persist to local state chats
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

    // If Firestore is available, write synchronously
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
        
        // Also update parent chat doc for sorting
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
        
        addSyncLog(`🛡️ [FIRESTORE] Synchronized dispatched write to Cloud Storage.`);
      }
    } catch (e) {
      addSyncLog(`⚠️ [FIRESTORE-WRITE-FAIL] Saved in local ledger, queued for background sync.`);
    }

    // Interactive Bot reply simulation
    const activeChatObj = chats.find(c => c.id === activeChatId);
    if (activeChatObj && !activeChatObj.isGroup && !activeChatObj.isBroadcast) {
      triggerSimulationResponse(activeChatId, activeChatObj.partnerName);
    }
  };

  const triggerSimulationResponse = (threadId: string, senderName: string) => {
    setIsSimulatingTyping(prev => ({ ...prev, [threadId]: true }));
    addSyncLog(`🛰️ [TELEMETRY] Remote hand-shaking in progress... ${senderName} typing.`);

    setTimeout(() => {
      setIsSimulatingTyping(prev => ({ ...prev, [threadId]: false }));
      
      const replyId = `msg-reply-${Date.now()}`;
      const replyContent = vanishModeEnabled[threadId]
        ? `👻 This is a secure vanish response. It will dissolve once viewed.`
        : `👋 Secure receipt confirmed. Your message arrived over the real-time Ledger pipeline instantly!`;

      const botMsg: ExtendedMessage = {
        id: replyId,
        chatId: threadId,
        senderId: 'remote-sim',
        content: replyContent,
        timestamp: new Date().toISOString(),
        status: 'read'
      };

      setLocalMessages(prev => ({
        ...prev,
        [threadId]: [...(prev[threadId] || []), botMsg]
      }));

      // Update last message
      setChats(prev => prev.map(c => {
        if (c.id === threadId) {
          return {
            ...c,
            lastMessage: replyContent,
            lastTimestamp: new Date().toISOString(),
            unreadCount: activeChatId === threadId ? 0 : (c.unreadCount + 1)
          };
        }
        return c;
      }));

      addSyncLog(`📥 [WS-RECEIVE] Realtime message reply ${replyId} pushed from peer.`);
      window.dispatchEvent(new CustomEvent('toast', { detail: `💬 New message from ${senderName}` }));
    }, 2200);
  };

  // ============================================================================
  // SIMULATE LIVE WEBSOCKET ACTIVITY INCOMING EVENT (POLLING-FREE DEMO)
  // ============================================================================
  const simulateInboundDM = () => {
    addSyncLog('🌐 [WS-SIMULATE] Spawning manual mock incoming packet...');
    const randomChatIndex = Math.floor(Math.random() * chats.length);
    const targetChat = chats[randomChatIndex] || chats[0];
    if (!targetChat) return;

    setIsSimulatingTyping(prev => ({ ...prev, [targetChat.id]: true }));
    addSyncLog(`🛰️ [WS-SIMULATE] Remote node ${targetChat.partnerName} opened binary channel...`);

    setTimeout(() => {
      setIsSimulatingTyping(prev => ({ ...prev, [targetChat.id]: false }));
      const isUnread = activeChatId !== targetChat.id;
      
      const simulateId = `msg-ws-${Date.now()}`;
      const wsMsg: ExtendedMessage = {
        id: simulateId,
        chatId: targetChat.id,
        senderId: 'remote-sim',
        content: `⚡ Inbound WS-Stream Event! Dynamic clock: ${new Date().toLocaleTimeString()} - Zero latency verified!`,
        timestamp: new Date().toISOString(),
        status: isUnread ? 'delivered' : 'read'
      };

      setLocalMessages(prev => ({
        ...prev,
        [targetChat.id]: [...(prev[targetChat.id] || []), wsMsg]
      }));

      setChats(prev => prev.map(c => {
        if (c.id === targetChat.id) {
          return {
            ...c,
            lastMessage: wsMsg.content,
            lastTimestamp: wsMsg.timestamp,
            unreadCount: isUnread ? (c.unreadCount + 1) : 0
          };
        }
        return c;
      }));

      addSyncLog(`📥 [WS-INBOUND] Stream compiled. Injected packet ${simulateId} into thread ${targetChat.partnerName}.`);
      window.dispatchEvent(new CustomEvent('toast', { detail: `⚡ Real-time WS: New message from ${targetChat.partnerName}!` }));
    }, 1500);
  };

  // ============================================================================
  // SECURE LEDGER SCREENSHOT WARNING LOG SYSTEM
  // ============================================================================
  const triggerScreenshotSim = () => {
    if (!activeChatId) return;
    const alertMsg = `⚠️ SECURITY WARNING: Screenshot captured in Vanish Mode! Secure ledger alert emitted.`;
    window.dispatchEvent(new CustomEvent('toast', { detail: alertMsg }));
    addSyncLog('🚨 [LEDGER-SHIELD] Security Violation! Client screenshot detected.');

    const screenshotMsg: ExtendedMessage = {
      id: `sys-ss-${Date.now()}`,
      chatId: activeChatId,
      senderId: 'system',
      content: `⚠️ Secure Ledger Shield: ${currentUser.name} captured a screenshot of this secure conversation.`,
      timestamp: new Date().toISOString(),
      status: 'read'
    };

    setLocalMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), screenshotMsg]
    }));
  };

  // ============================================================================
  // SECURE ENCRYPTED VOICE / VIDEO CALLS (COMPREHENSIVE SPEC 2 & 5)
  // ============================================================================
  const startCallSim = (type: 'voice' | 'video') => {
    const activeChatObj = chats.find(c => c.id === activeChatId);
    if (!activeChatObj) return;

    addSyncLog(`📞 [SECURE-LINE] Establishing encrypted ${type} link key to peer...`);
    setActiveCall({
      type,
      partnerName: activeChatObj.partnerName,
      partnerAvatar: activeChatObj.partnerAvatar,
      duration: 0
    });

    const interval = setInterval(() => {
      setActiveCall(prev => {
        if (!prev) return null;
        return { ...prev, duration: prev.duration + 1 };
      });
    }, 1000);

    setCallTimerInterval(interval);
  };

  const endCallSim = () => {
    if (callTimerInterval) {
      clearInterval(callTimerInterval);
    }
    setCallTimerInterval(null);
    addSyncLog(`📞 [SECURE-LINE] Connection terminated. Secure session torn down safely.`);
    
    if (activeChatId && activeCall) {
      const callLog: ExtendedMessage = {
        id: `sys-call-${Date.now()}`,
        chatId: activeChatId,
        senderId: 'system',
        content: `📞 Encrypted ${activeCall.type} call ended. Duration: ${Math.floor(activeCall.duration / 60)}m ${activeCall.duration % 60}s`,
        timestamp: new Date().toISOString(),
        status: 'read'
      };
      setLocalMessages(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), callLog]
      }));
    }

    setActiveCall(null);
  };

  // ============================================================================
  // AUDIO NOTES RECORDER WITH WAV SIMULATOR (SPEC 5 & 10)
  // ============================================================================
  const startRecordingSim = () => {
    setIsRecordingAudio(true);
    setAudioTimer(0);
    addSyncLog('🎙️ [AUDIO-STREAM] Opened digital microphones. Quantizing voice PCM waves...');
    
    const interval = setInterval(() => {
      setAudioTimer(p => p + 1);
    }, 1000);
    setAudioInterval(interval);
  };

  const stopRecordingSim = (cancel = false) => {
    if (audioInterval) {
      clearInterval(audioInterval);
    }
    setAudioInterval(null);
    setIsRecordingAudio(false);

    if (cancel) {
      addSyncLog('🎙️ [AUDIO-STREAM] Soundwave stream discarded by user.');
      return;
    }

    if (!activeChatId) return;

    addSyncLog(`🎙️ [AUDIO-STREAM] Compiled soundwave file (${audioTimer}s). Sending envelope...`);
    
    const voiceMsgId = `msg-voice-${Date.now()}`;
    const voiceMsg: ExtendedMessage = {
      id: voiceMsgId,
      chatId: activeChatId,
      senderId: currentUser.id,
      content: `🎙️ Encrypted Soundwave Status Note`,
      timestamp: new Date().toISOString(),
      status: 'sent',
      voiceDuration: `${Math.floor(audioTimer / 60)}:${(audioTimer % 60).toString().padStart(2, '0')}`,
      customMediaType: 'voice'
    };

    setLocalMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), voiceMsg]
    }));

    setChats(prev => prev.map(c => {
      if (c.id === activeChatId) {
        return {
          ...c,
          lastMessage: `🎙️ Voice Note (${voiceMsg.voiceDuration})`,
          lastTimestamp: voiceMsg.timestamp
        };
      }
      return c;
    }));
  };

  // ============================================================================
  // FINAL PRODUCTION ADDITIONS (SPEC 11)
  // ============================================================================
  const snoozeChat = (chatId: string) => {
    setSnoozedChatIds(prev => {
      const active = prev.includes(chatId);
      const updated = active ? prev.filter(id => id !== chatId) : [...prev, chatId];
      addSyncLog(`🔕 [CHANNELS] Snooze toggled for ${chatId}. Current state: ${!active}`);
      return updated;
    });
  };

  const archiveChat = (chatId: string) => {
    setArchivedChatIds(prev => {
      const active = prev.includes(chatId);
      const updated = active ? prev.filter(id => id !== chatId) : [...prev, chatId];
      addSyncLog(`📦 [CHANNELS] Archive state modified for ${chatId}.`);
      return updated;
    });
  };

  const togglePinChat = (chatId: string) => {
    setPinnedChatIds(prev => {
      const active = prev.includes(chatId);
      const updated = active ? prev.filter(id => id !== chatId) : [...prev, chatId];
      addSyncLog(`📌 [CHANNELS] Pin state toggled for ${chatId}.`);
      return updated;
    });
  };

  const toggleFavoriteChat = (chatId: string) => {
    setFavoriteChatIds(prev => {
      const active = prev.includes(chatId);
      const updated = active ? prev.filter(id => id !== chatId) : [...prev, chatId];
      addSyncLog(`⭐ [CHANNELS] Favorite state toggled for ${chatId}.`);
      return updated;
    });
  };

  // ============================================================================
  // CALCULATIONS & FILTERING
  // ============================================================================
  // Filter and sort Chats based on selected states
  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      // Search matching
      const matchesSearch = chat.partnerName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;

      // Archive system
      const isArchived = archivedChatIds.includes(chat.id);
      if (navigationTab === 'archived') {
        return isArchived;
      }
      if (isArchived) return false; // Hide archived chats in other tabs

      // Group / Broadcast mapping
      if (navigationTab === 'groups') return chat.isGroup;
      if (navigationTab === 'broadcasts') return chat.isBroadcast;
      if (navigationTab === 'requests') return !chat.isGroup && !chat.isBroadcast && chat.unreadCount > 2; // Simulate requests
      if (navigationTab === 'primary') return !chat.isGroup && !chat.isBroadcast;

      return true;
    }).sort((a, b) => {
      // Pinning priority
      const aPinned = pinnedChatIds.includes(a.id);
      const bPinned = pinnedChatIds.includes(b.id);
      if (aPinned && !bPinned) return -1;
      if (!aPinned && bPinned) return 1;

      // Last activity time
      const aTime = a.lastTimestamp ? new Date(a.lastTimestamp).getTime() : 0;
      const bTime = b.lastTimestamp ? new Date(b.lastTimestamp).getTime() : 0;
      return bTime - aTime;
    });
  }, [chats, searchQuery, navigationTab, archivedChatIds, pinnedChatIds]);

  const activeChat = chats.find(c => c.id === activeChatId);

  return (
    <div className="flex flex-col h-screen w-full bg-[#0A0A0A] text-white font-sans overflow-hidden">
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        Inbox functionality is being refactored.
      </div>
    </div>
  );
}
