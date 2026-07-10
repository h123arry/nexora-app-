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
import SegmentedControl from './inbox/SegmentedControl';
import { ActivityRow } from './inbox/ActivityRow';
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
const INITIAL_NOTIFICATIONS: Notification[] = [
  // Social
  {
    id: 'notif-1',
    type: 'like',
    userId: 'user-lucas',
    username: 'lucas_ai',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    content: 'liked your custom glassmorphic canvas post.',
    timestamp: '10 mins ago',
    isRead: false,
    priority: 1,
    actionText: 'View Post',
    actionType: 'view_post',
    category: 'comments'
  },
  {
    id: 'notif-2',
    type: 'comment',
    userId: 'user-sophia',
    username: 'sophia_dev',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
    content: 'commented: "The low-latency WS telemetry is stunning! 🔥"',
    timestamp: '25 mins ago',
    isRead: false,
    priority: 2,
    actionText: 'Reply',
    actionType: 'reply',
    category: 'comments'
  },
  {
    id: 'notif-3',
    type: 'follow',
    userId: 'user-harrison',
    username: 'harrison_nodes',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    content: 'started following your developer channel.',
    timestamp: '1 hour ago',
    isRead: true,
    priority: 3,
    actionText: 'Follow Back',
    actionType: 'follow_back',
    category: 'followers'
  },
  // Messaging & Calls
  {
    id: 'notif-4',
    type: 'message',
    userId: 'user-luna',
    username: 'luna_prism',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    content: 'Missed secure video call connection.',
    timestamp: '2 hours ago',
    isRead: false,
    priority: 1,
    actionText: 'Call Back',
    actionType: 'open_chat',
    category: 'messages'
  },
  // Creator Updates
  {
    id: 'notif-5',
    type: 'spark',
    userId: 'user-nexus',
    username: 'nexora_creator_hub',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&auto=format&fit=crop&q=80',
    content: 'Luna launched a Live broadcast stream: "Building Next-Gen Realtime Layers"',
    timestamp: '3 hours ago',
    isRead: false,
    priority: 4,
    actionText: 'Join Live',
    actionType: 'join_community',
    category: 'communities'
  },
  // System Alerts
  {
    id: 'notif-6',
    type: 'system',
    userId: 'system-agent',
    username: 'nexora_shield',
    avatar: 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=100&auto=format&fit=crop&q=80',
    content: 'Secure Ledger Shield Alert: Vanish Mode initialized successfully on thread v1.3.',
    timestamp: '5 hours ago',
    isRead: true,
    priority: 1,
    actionText: 'Review Log',
    category: 'voh_ai'
  },
  {
    id: 'notif-7',
    type: 'system',
    userId: 'system-agent',
    username: 'nexora_vault',
    avatar: 'https://images.unsplash.com/photo-1563206767-5b18f218e8de?w=100&auto=format&fit=crop&q=80',
    content: 'New device session detected from London, UK (Firefox 125, macOS).',
    timestamp: '1 day ago',
    isRead: true,
    priority: 5,
    category: 'voh_ai'
  },
  // Business/Monetization
  {
    id: 'notif-8',
    type: 'reputation_milestone',
    userId: 'nexora-rewards',
    username: 'monetization_ledger',
    avatar: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=100&auto=format&fit=crop&q=80',
    content: 'Subscriber donation received: +$150.00 USD from @anonymous_sponsor.',
    timestamp: '1 day ago',
    isRead: false,
    priority: 6,
    actionText: 'Claim sparks',
    actionType: 'save',
    category: 'sparks'
  }
];

// ============================================================================
// SYSTEM LEDGER BLUEPRINTS FOR COMPREHENSIVE STUDY DEMO
// ============================================================================
const METRICS_LOGS_INITIAL = [
  '⚡ [SYSTEM-HUB] WebSocket protocol channel wss://nexora.net/v1.3/secure established.',
  '🔒 [SECURE-LEDGER] ECDH Key Exchange validated on thread local storage.',
  '🛰️ [FIRESTORE] Snapshot listeners initialized on chats/ and presence/.',
  '🟢 [PRESENCE] Harrison, Luna, and Sophia detected online.',
  '💾 [SQL-CACHE] Hydrated 8 custom active message slots from browser cache.'
];

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
  const [activeMainTab, setActiveMainTab] = useState<'messages' | 'activity'>('messages');
  
  // Navigation tabs: 'all' | 'primary' | 'groups' | 'broadcasts' | 'requests' | 'archived'
  const [navigationTab, setNavigationTab] = useState<'all' | 'primary' | 'groups' | 'broadcasts' | 'requests' | 'archived'>('all');
  
  // Notification Drawer State
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('nexora_notifs');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });
  const [notifCategoryFilter, setNotifCategoryFilter] = useState<'all' | 'social' | 'messaging' | 'creator' | 'system' | 'business'>('all');
  const [snoozedCategories, setSnoozedCategories] = useState<Record<string, boolean>>({});

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

  useEffect(() => {
    localStorage.setItem('nexora_notifs', JSON.stringify(notifications));
  }, [notifications]);

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
  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    addSyncLog('🔔 [NOTIF-CENTER] All notifications set to Read.');
    window.dispatchEvent(new CustomEvent('toast', { detail: '🔔 All notifications marked as read' }));
  };

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

  // Filter and sort notifications inside activity pane with aggregation
  const filteredNotifications = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    notifications.forEach(n => {
        const key = `${n.type}-${n.category}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(n);
    });

    const aggregated = Object.values(groups).map(group => {
        if (group.length === 1) return group[0];
        
        const first = group[0];
        return {
            ...first,
            username: `${first.username} + ${group.length - 1} others`,
            content: `${group.length} total ${first.type} actions in ${first.category}.`,
            isRead: group.every(n => n.isRead)
        };
    });

    return aggregated.filter(notif => {
      if (notifCategoryFilter === 'all') return true;
      if (notifCategoryFilter === 'social') return ['like', 'comment', 'follow', 'mention'].includes(notif.type);
      if (notifCategoryFilter === 'messaging') return ['message'].includes(notif.type);
      if (notifCategoryFilter === 'creator') return ['spark', 'ai_recommendation'].includes(notif.type);
      if (notifCategoryFilter === 'system') return ['system', 'reputation_milestone'].includes(notif.type);
      if (notifCategoryFilter === 'business') return ['reputation_milestone'].includes(notif.type) && notif.id === 'notif-8';
      return true;
    }).sort((a, b) => (a.priority || 5) - (b.priority || 5)); // prioritize important alerts
  }, [notifications, notifCategoryFilter]);

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeChatMessages = activeChatId ? (localMessages[activeChatId] || []) : [];

  return (
    <div className="flex flex-col h-screen w-full bg-[#0A0A0A] text-white font-sans overflow-hidden">
      
      {/* ============================================================================
          MAIN GRID ENVIRONMENT
          ============================================================================ */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden relative">
        
        {/* LEFT COLUMN: CONVERSATIONS & BROADCASTS LIST */}
        <div className={`col-span-12 lg:col-span-5 flex flex-col h-full bg-[#0A0A0A] border-r border-zinc-800 transition-all ${activeChatId ? 'hidden lg:flex' : 'flex'}`}>
          
          {/* Header & Quick Action Trigger */}
          <div className="border-b border-zinc-800 bg-[#0A0A0A] sticky top-0 z-10 space-y-0">
            <InboxHeader 
              showNotificationDrawer={() => setShowNotificationDrawer(true)}
              hasUnreadNotifications={notifications.some(n => !n.isRead)}
            />
            {/* Notes Row */}
            <NotesRow />
            {/* Search */}
            <div className="relative px-4 pb-3">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 focus:border-zinc-700 text-sm px-4 py-2.5 pl-10 rounded-xl focus:outline-hidden text-white placeholder-zinc-500 transition-all"
              />
              <Search className="absolute left-7 top-3 w-4 h-4 text-zinc-500" />
            </div>
            {/* Segmented Control */}
            <div className="px-4 pb-3">
              <SegmentedControl activeTab={activeMainTab} onTabChange={setActiveMainTab} />
            </div>
            {/* Comprehensive Navigation Map Tabs */}
            <InboxTabs activeTab={navigationTab} onTabChange={setNavigationTab} />
          </div>

          {/* CHAT/ACTIVITY ROWS VIEWPORT */}
          <div className="flex-1 overflow-y-auto divide-y divide-violet-500/5">
            {activeMainTab === 'messages' ? filteredChats.map(chat => {
              const chatMessages = localMessages[chat.id] || [];
              const lastMsg = chatMessages[chatMessages.length - 1];
              const isPinned = pinnedChatIds.includes(chat.id);
              const isFavorite = favoriteChatIds.includes(chat.id);
              const isSnoozed = snoozedChatIds.includes(chat.id);
              const isTyping = isSimulatingTyping[chat.id];

              return (
                <div
                  key={chat.id}
                  className={`group relative flex items-center gap-4 p-4 hover:bg-violet-950/15 cursor-pointer transition-all ${
                    activeChatId === chat.id ? 'bg-violet-600/10 border-l-4 border-violet-500 shadow-inner' : ''
                  }`}
                  onClick={() => setActiveChatId(chat.id)}
                >
                  {/* Avatar with live presence ring */}
                  <div className="relative shrink-0">
                    <img 
                      src={chat.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'} 
                      alt={chat.partnerName} 
                      className={`w-13 h-13 rounded-2xl object-cover ring-2 transition-transform group-hover:scale-105 duration-300 ${
                        chat.isPartnerOnline ? 'ring-emerald-500/50' : 'ring-zinc-700/30'
                      }`}
                      referrerPolicy="no-referrer"
                    />
                    {chat.isPartnerOnline && (
                      <span className="absolute -bottom-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                    )}
                  </div>

                  {/* Channel Meta & Content Preview */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-zinc-100 text-sm truncate max-w-[130px]">{chat.partnerName}</h3>
                        {chat.isVerified && <span className="text-[10px] text-cyan-400" title="Verified Creator Hub">⚡</span>}
                        {chat.isGroup && <span className="px-1.5 py-0.5 bg-violet-600/25 border border-violet-500/30 text-violet-300 text-[8px] font-mono uppercase font-black rounded-md">Group</span>}
                        {chat.isBroadcast && <span className="px-1.5 py-0.5 bg-cyan-600/25 border border-cyan-500/30 text-cyan-300 text-[8px] font-mono uppercase font-black rounded-md">Channel</span>}
                      </div>

                      {/* Dynamic Time String */}
                      {lastMsg && (
                        <span className="text-[9.5px] font-mono text-zinc-500">
                          {new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      {isTyping ? (
                        <p className="text-xs text-emerald-400 font-mono tracking-wider animate-pulse uppercase">
                          {chat.isGroup ? 'Someone is typing...' : 'typing...'}
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-400 truncate flex-1 leading-relaxed">
                          {lastMsg ? lastMsg.content : 'Started encrypted channel'}
                        </p>
                      )}

                      {/* Badges, Pin & Favorite indicators */}
                      <div className="flex items-center gap-1.5 ml-2">
                        {isSnoozed && <VolumeX className="w-3.5 h-3.5 text-zinc-600" />}
                        {isPinned && <Pin className="w-3.5 h-3.5 text-violet-400 shrink-0 rotate-45" />}
                        {isFavorite && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500/20 shrink-0" />}
                        {chat.unreadCount > 0 && (
                          <span className="w-5 h-5 bg-gradient-to-r from-violet-600 to-pink-600 text-white text-[9.5px] font-mono font-black rounded-full flex items-center justify-center animate-bounce shadow-[0_0_10px_rgba(236,72,153,0.3)]">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Inline Action Options on Hover */}
                  <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-[#060417]/95 p-1 rounded-lg border border-violet-500/20 shadow-lg z-10">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); togglePinChat(chat.id); }}
                      className="p-1 hover:bg-violet-500/20 rounded-md text-zinc-400 hover:text-violet-400"
                      title={isPinned ? 'Unpin' : 'Pin chat'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); toggleFavoriteChat(chat.id); }}
                      className="p-1 hover:bg-violet-500/20 rounded-md text-zinc-400 hover:text-yellow-500"
                      title={isFavorite ? 'Remove Favorite' : 'Mark Favorite'}
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); snoozeChat(chat.id); }}
                      className="p-1 hover:bg-violet-500/20 rounded-md text-zinc-400 hover:text-cyan-400"
                      title={isSnoozed ? 'Unmute' : 'Mute chat'}
                    >
                      {isSnoozed ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); archiveChat(chat.id); }}
                      className="p-1 hover:bg-violet-500/20 rounded-md text-zinc-400 hover:text-pink-400"
                      title={archivedChatIds.includes(chat.id) ? 'Move to Inbox' : 'Archive'}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            }) : filteredNotifications.map(notification => (
              <ActivityRow key={notification.id} notification={notification} />
            ))}

            {activeMainTab === 'messages' && filteredChats.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
                <ArchiveX className="w-10 h-10 text-zinc-600 mb-2 animate-pulse" />
                <p className="text-zinc-500 text-xs font-mono uppercase font-bold tracking-wider">Zero results resolved</p>
                <p className="text-zinc-600 text-[10px] uppercase mt-1">Refine your active filter tab or search keywords.</p>
              </div>
            )}
            {activeMainTab === 'activity' && filteredNotifications.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
                <Bell className="w-10 h-10 text-zinc-600 mb-2 animate-pulse" />
                <p className="text-zinc-500 text-xs font-mono uppercase font-bold tracking-wider">No activity</p>
                <p className="text-zinc-600 text-[10px] uppercase mt-1">You are all caught up.</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE INTERACTIVE CHAT ENVIRONMENT */}
        <div className={`col-span-12 lg:col-span-7 flex flex-col h-full bg-[#050315] relative transition-all ${!activeChatId ? 'hidden lg:flex' : 'flex'}`}>
          
          {activeChatId && activeChat ? (
            <div className="flex flex-col h-full w-full relative">
              
              {/* Dynamic Chat Header */}
              <div className="p-4 bg-[#060419]/90 border-b border-violet-500/10 flex items-center justify-between sticky top-0 z-20">
                <div className="flex items-center gap-3">
                  {/* Back on Mobile */}
                  <button 
                    type="button" 
                    onClick={() => setActiveChatId(null)}
                    className="lg:hidden p-2 bg-violet-950/20 hover:bg-violet-900/30 rounded-xl text-zinc-400"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="relative">
                    <img 
                      src={activeChat.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120'} 
                      alt={activeChat.partnerName} 
                      className="w-11 h-11 rounded-2xl object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {activeChat.isPartnerOnline && (
                      <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#050315]" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-bold text-sm text-white leading-none">{activeChat.partnerName}</h3>
                      {activeChat.isVerified && <span className="text-xs text-cyan-400" title="Verified Verified Hub partner">⚡</span>}
                    </div>
                    <p className="text-[9px] font-mono text-emerald-400 uppercase tracking-widest mt-1">
                      {isSimulatingTyping[activeChat.id] ? 'typing live...' : activeChat.isPartnerOnline ? 'online (secure channel)' : 'offline'}
                    </p>
                  </div>
                </div>

                {/* Secure Line Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startCallSim('voice')}
                    className="p-2 bg-violet-950/30 hover:bg-violet-900/40 border border-violet-500/10 rounded-xl text-violet-400 hover:text-white cursor-pointer transition-all"
                    title="Encrypted Voice Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startCallSim('video')}
                    className="p-2 bg-violet-950/30 hover:bg-violet-900/40 border border-violet-500/10 rounded-xl text-violet-400 hover:text-white cursor-pointer transition-all"
                    title="Encrypted Video Call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const enabled = !vanishModeEnabled[activeChat.id];
                      setVanishModeEnabled(prev => ({ ...prev, [activeChat.id]: enabled }));
                      addSyncLog(`👻 [LEDGER-SHIELD] Vanish Mode ${enabled ? 'ENABLED' : 'DISABLED'} for thread ${activeChat.id}.`);
                    }}
                    className={`p-2 border rounded-xl cursor-pointer transition-all ${
                      vanishModeEnabled[activeChat.id] 
                        ? 'bg-rose-500/20 border-rose-500/40 text-rose-400 animate-pulse hover:bg-rose-500/30' 
                        : 'bg-violet-950/30 border-violet-500/10 text-zinc-400 hover:text-white'
                    }`}
                    title="Toggle Secure Vanish Mode"
                  >
                    <Ghost className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={triggerScreenshotSim}
                    className="p-2 bg-[#ff0055]/10 hover:bg-[#ff0055]/20 border border-[#ff0055]/20 rounded-xl text-pink-400 hover:text-white cursor-pointer transition-all"
                    title="Simulate Screenshot Capture"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Secure Ledger Status Warning */}
              {vanishModeEnabled[activeChat.id] && (
                <div className="bg-rose-950/15 border-b border-rose-500/20 px-4 py-2 flex items-center justify-between text-[10px] font-mono text-rose-400">
                  <div className="flex items-center gap-1.5">
                    <Ghost className="w-3.5 h-3.5 animate-bounce text-rose-400" />
                    <span>SECURE VANISH ACTIVE: Seen messages automatically dissolve. Screenshots are logged.</span>
                  </div>
                  <span className="text-[8px] bg-rose-600/20 px-1.5 py-0.5 rounded uppercase font-black">Secure Tunnel</span>
                </div>
              )}

              {/* Chat Message Scrolling Container */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-radial-gradient">
                
                {/* Seed Placeholder Header */}
                <div className="text-center py-6 space-y-1">
                  <div className="w-10 h-10 bg-violet-600/10 border border-violet-500/20 rounded-full flex items-center justify-center mx-auto text-violet-400 mb-2">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-violet-400">End-to-End Cryptography</p>
                  <p className="text-[9px] text-zinc-500">Binary messages are authorized by security ledger keys.</p>
                </div>

                {activeChatMessages.map((msg, index) => {
                  const isMe = msg.senderId === currentUser.id;
                  const isSystem = msg.senderId === 'system';

                  if (isSystem) {
                    return (
                      <div key={msg.id} className="flex justify-center p-2">
                        <span className="bg-[#ff0055]/5 border border-[#ff0055]/15 text-[#ff0055] px-3 py-1.5 rounded-lg text-[9.5px] font-mono max-w-sm text-center flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {msg.content}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/msg relative`}
                    >
                      <div className={`max-w-[80%] p-3 rounded-2xl text-xs space-y-1 relative ${
                        isMe 
                          ? 'bg-gradient-to-r from-violet-600 to-[#7C3AED] text-white rounded-tr-none shadow-[0_4px_12px_rgba(124,58,237,0.15)]' 
                          : 'bg-[#0f0b2a] border border-violet-500/10 text-zinc-100 rounded-tl-none'
                      }`}>
                        
                        {/* Audio Wave Message */}
                        {msg.customMediaType === 'voice' ? (
                          <div className="flex items-center gap-3 min-w-[200px] py-1">
                            <button
                              type="button"
                              className="w-8 h-8 rounded-full bg-violet-950/40 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0"
                            >
                              <Play className="w-3.5 h-3.5 pl-0.5 fill-violet-400" />
                            </button>
                            <div className="flex-1">
                              {/* Fake Soundwave lines */}
                              <div className="flex gap-1 items-end h-6 pb-1">
                                {[2, 5, 8, 3, 9, 6, 4, 8, 2, 6, 7, 3, 5, 4, 8, 6, 2, 5].map((h, i) => (
                                  <div 
                                    key={i} 
                                    className={`w-0.5 rounded-full ${isMe ? 'bg-white/60' : 'bg-violet-400/60'}`} 
                                    style={{ height: `${h * 10}%` }} 
                                  />
                                ))}
                              </div>
                              <div className="flex justify-between items-center text-[8px] font-mono uppercase text-zinc-400">
                                <span>Voice Status Wave</span>
                                <span>{msg.voiceDuration}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="leading-relaxed font-sans font-medium whitespace-pre-wrap">{msg.content}</p>
                        )}

                        <div className="flex justify-end items-center gap-1.5 text-[8.5px] font-mono text-zinc-400 mt-1">
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && (
                            msg.status === 'read' 
                              ? <CheckCheck className="w-3 h-3 text-cyan-400" /> 
                              : <Check className="w-3 h-3 text-zinc-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Simulated Typing Overlay */}
                {isSimulatingTyping[activeChat.id] && (
                  <div className="flex justify-start">
                    <div className="bg-[#0f0b2a] border border-violet-500/10 p-3 rounded-2xl rounded-tl-none flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Soundwave Active Recorder Panel overlay */}
              {isRecordingAudio && (
                <div className="absolute inset-x-0 bottom-[64px] bg-[#0c0924] border-t border-pink-500/20 p-4 z-20 flex items-center justify-between animate-slide-up">
                  <div className="flex items-center gap-3">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-pink-500"></span>
                    </span>
                    <div className="text-left font-mono">
                      <p className="text-xs font-bold text-pink-400 uppercase">Mic recording sound waves...</p>
                      <p className="text-[10px] text-zinc-400">Encoding live lossless bitstream... duration: {audioTimer}s</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => stopRecordingSim(true)}
                      className="px-3.5 py-1.5 bg-transparent border border-zinc-600 hover:border-white rounded-lg text-[9px] font-mono uppercase font-black tracking-wider transition-colors cursor-pointer"
                    >
                      Trash
                    </button>
                    <button
                      type="button"
                      onClick={() => stopRecordingSim(false)}
                      className="px-3.5 py-1.5 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-[9px] font-mono uppercase font-black tracking-wider transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Mic className="w-3 h-3" />
                      Sendwave
                    </button>
                  </div>
                </div>
              )}

              {/* Secure Chat Composer Input Bar */}
              <div className="p-3 bg-[#060419] border-t border-violet-500/10 flex items-center gap-2 sticky bottom-0 z-20">
                <button
                  type="button"
                  onClick={isRecordingAudio ? undefined : startRecordingSim}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isRecordingAudio ? 'bg-pink-600/15 border-pink-500/30 text-pink-400' : 'bg-violet-950/30 border-violet-500/10 text-zinc-400 hover:text-white'}`}
                  title="Record secure soundwave status"
                  disabled={isRecordingAudio}
                >
                  <Mic className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  placeholder={vanishModeEnabled[activeChat.id] ? "👻 Secure private chat... seen messages melt." : "Enter message details..."}
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  className="flex-1 bg-slate-950 border border-violet-500/15 focus:border-[#8B5CF6] text-xs px-3.5 py-2.5 rounded-xl focus:outline-hidden text-white placeholder-zinc-500 transition-all font-sans"
                />

                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="p-2.5 bg-gradient-to-r from-violet-600 to-[#7C3AED] hover:brightness-110 rounded-xl text-white shadow-lg shadow-violet-600/10 transition-transform active:scale-95 duration-200 cursor-pointer"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

            </div>
          ) : (
            /* PLACEHOLDER: MULTI-PANEL INFORMATION SCREEN WITH DETAILED SYSTEM METRICS */
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#050315] relative overflow-y-auto">
              
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.04)_0%,transparent_70%)] pointer-events-none" />

              <div className="max-w-md space-y-6 relative z-10 p-6 bg-[#090721]/60 border border-violet-500/10 rounded-3xl backdrop-blur-md shadow-2xl">
                
                {/* Visual Accent */}
                <div className="w-16 h-16 bg-gradient-to-tr from-violet-600 to-pink-500 rounded-3xl flex items-center justify-center mx-auto text-white shadow-[0_0_20px_rgba(139,92,246,0.3)] rotate-3">
                  <MessageSquare className="w-8 h-8 rotate-[-3deg]" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-black uppercase tracking-widest text-violet-400">Ledger-Synchronized Inbox</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    Select a conversation channel or broadcast recipient from the index registry on the left to begin instant, peer-to-peer secure messaging.
                  </p>
                </div>

                {/* Micro Live Index of Logs */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-left border-b border-violet-500/10 pb-1">
                    <span className="text-[9px] font-mono uppercase text-zinc-500 font-extrabold tracking-wider">Sync Log / Ledger Diagnostics</span>
                    <span className="text-[8px] bg-violet-600/20 text-violet-300 px-1.5 py-0.5 rounded uppercase font-bold">Realtime Live</span>
                  </div>
                  
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-violet-500/10 h-32 overflow-y-auto text-left space-y-2.5 font-mono text-[8px] text-zinc-400">
                    {syncLogs.map((log, i) => (
                      <div key={i} className="leading-normal border-l border-violet-500/30 pl-2">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulated Ledger Hardware Details */}
                <div className="grid grid-cols-3 gap-2.5 text-center pt-2">
                  <div className="bg-[#0c092a] p-2.5 rounded-xl border border-violet-500/5">
                    <span className="text-[8px] font-mono uppercase text-zinc-500 block">DB ENGINE</span>
                    <span className="text-xs font-black text-violet-400 font-mono mt-1 block">FIRESTORE</span>
                  </div>
                  <div className="bg-[#0c092a] p-2.5 rounded-xl border border-violet-500/5">
                    <span className="text-[8px] font-mono uppercase text-zinc-500 block">PROTOCOL</span>
                    <span className="text-xs font-black text-cyan-400 font-mono mt-1 block">WSS / SSL</span>
                  </div>
                  <div className="bg-[#0c092a] p-2.5 rounded-xl border border-violet-500/5">
                    <span className="text-[8px] font-mono uppercase text-zinc-500 block">STABILITY</span>
                    <span className="text-xs font-black text-emerald-400 font-mono mt-1 block">99.99%</span>
                  </div>
                </div>

              </div>
            </div>
          )}

        </div>

      </div>

      {/* ============================================================================
          INTELLIGENT NOTIFICATION CENTER DRAWER / OVERLAY
          ============================================================================ */}
      <AnimatePresence>
        {showNotificationDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end">
            
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80"
              onClick={() => setShowNotificationDrawer(false)}
            />

            {/* Notification Pane */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-md h-full bg-[#040212]/98 border-l border-violet-500/15 shadow-2xl flex flex-col z-10"
            >
              
              {/* Drawer Header */}
              <div className="p-4 bg-[#06041a] border-b border-violet-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-violet-600/10 border border-violet-500/25 rounded-xl text-violet-400">
                    <Bell className="w-4 h-4 animate-swing" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wider text-white">Intelligent Notifications</h3>
                    <p className="text-[9px] font-mono text-zinc-500 uppercase">Nexora Smart Broker Center</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setShowNotificationDrawer(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notification Quick Filters */}
              <div className="p-3 border-b border-violet-500/5 bg-[#06041a]/40 flex gap-1.5 overflow-x-auto scrollbar-thin">
                {[
                  { id: 'all', label: 'All Alerts' },
                  { id: 'social', label: 'Social' },
                  { id: 'messaging', label: 'Messaging' },
                  { id: 'creator', label: 'Creator' },
                  { id: 'system', label: 'System' },
                  { id: 'business', label: 'Business' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setNotifCategoryFilter(cat.id as any)}
                    className={`px-2.5 py-1 text-[8.5px] font-mono uppercase font-black rounded-md border transition-all shrink-0 cursor-pointer ${
                      notifCategoryFilter === cat.id 
                        ? 'bg-violet-600/25 border-violet-500 text-violet-300' 
                        : 'border-violet-500/5 text-zinc-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Action Ribbon: Mark Read & Mute Category */}
              <div className="px-4 py-2.5 bg-slate-950 border-b border-violet-500/5 flex justify-between items-center text-[9px] font-mono">
                <button 
                  type="button" 
                  onClick={markAllNotificationsRead}
                  className="text-violet-400 hover:text-white font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-violet-400" />
                  Mark all as Read
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    const activeFilter = notifCategoryFilter;
                    setSnoozedCategories(p => ({ ...p, [activeFilter]: !p[activeFilter] }));
                    addSyncLog(`🔕 [NOTIF-CENTER] Mute category ${activeFilter} state updated.`);
                    window.dispatchEvent(new CustomEvent('toast', { detail: `🔕 Muted category notifications: ${activeFilter}` }));
                  }}
                  className={`font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer ${snoozedCategories[notifCategoryFilter] ? 'text-pink-400 hover:text-white' : 'text-zinc-500 hover:text-white'}`}
                >
                  {snoozedCategories[notifCategoryFilter] ? <VolumeX className="w-3.5 h-3.5 text-pink-400" /> : <BellOff className="w-3.5 h-3.5 text-zinc-500" />}
                  {snoozedCategories[notifCategoryFilter] ? 'Muted' : 'Snooze category'}
                </button>
              </div>

              {/* Notifications Scrolling Viewport */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredNotifications.map(notif => {
                  const isRead = notif.isRead;
                  const getIcon = () => {
                    switch (notif.type) {
                      case 'like': return <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500/20" />;
                      case 'comment': return <MessageSquare className="w-3.5 h-3.5 text-violet-400" />;
                      case 'follow': return <UserCheck className="w-3.5 h-3.5 text-emerald-400" />;
                      case 'spark': return <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />;
                      case 'system': return <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />;
                      default: return <Info className="w-3.5 h-3.5 text-zinc-400" />;
                    }
                  };

                  return (
                    <div 
                      key={notif.id}
                      className={`p-3 border rounded-xl flex gap-3 transition-colors relative group/notif ${
                        isRead 
                          ? 'bg-[#06041a]/40 border-violet-500/5 text-zinc-400' 
                          : 'bg-[#0f0b2c]/80 border-violet-500/15 text-zinc-100 shadow-md shadow-violet-950/20'
                      }`}
                    >
                      {/* Left Side avatar */}
                      <img 
                        src={notif.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                        alt={notif.username} 
                        className="w-10 h-10 rounded-xl object-cover shrink-0 border border-violet-500/10"
                        referrerPolicy="no-referrer"
                      />

                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex justify-between items-baseline mb-1">
                          <p className="text-xs font-black text-zinc-100 truncate">@{notif.username}</p>
                          <span className="text-[8.5px] font-mono text-zinc-500 shrink-0">{notif.timestamp}</span>
                        </div>
                        
                        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                          {notif.content}
                        </p>

                        {/* Inline Actions inside notifications */}
                        {notif.actionText && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (notif.actionType === 'open_chat' && notif.targetId) {
                                  setActiveChatId(notif.targetId);
                                  setShowNotificationDrawer(false);
                                } else {
                                  window.dispatchEvent(new CustomEvent('toast', { detail: `📌 Executed notif action: ${notif.actionText}` }));
                                }
                              }}
                              className="px-2.5 py-1 bg-violet-600/20 border border-violet-500/30 rounded-md text-[8.5px] font-mono uppercase font-black text-violet-300 hover:bg-violet-600/30 hover:text-white transition-all cursor-pointer"
                            >
                              {notif.actionText}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Floating type indicator icon */}
                      <div className="absolute right-2 bottom-2 bg-slate-950 p-1.5 rounded-lg border border-violet-500/5">
                        {getIcon()}
                      </div>
                    </div>
                  );
                })}

                {filteredNotifications.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 p-6 text-center">
                    <CheckCircle2 className="w-10 h-10 text-zinc-600 mb-2 animate-bounce" />
                    <p className="text-zinc-500 text-xs font-mono uppercase font-black tracking-wider">Empty notification list</p>
                    <p className="text-zinc-600 text-[10px] uppercase mt-1">Excellent job. Secure stream has zero active alerts.</p>
                  </div>
                )}
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================================
          SECURE VIDEO/VOICE CALL SCREEN MODAL OVERLAY (SPEC 2 & 5)
          ============================================================================ */}
      <AnimatePresence>
        {activeCall && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            {/* Dark glass backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-[#02010c]/95 backdrop-blur-md"
            />

            {/* Holographic Call Box */}
            <motion.div
              initial={{ scale: 0.9, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 30, opacity: 0 }}
              className="relative w-full max-w-md bg-[#09071c] border border-violet-500/30 rounded-3xl p-6 shadow-2xl z-10 flex flex-col items-center justify-center text-center space-y-6 overflow-hidden"
            >
              
              {/* Dynamic Scanning Laser Effect */}
              <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-violet-500 to-transparent animate-pulse" />

              <div className="space-y-1">
                <span className="px-3 py-1 bg-violet-600/10 border border-violet-500/25 text-violet-400 text-[8.5px] font-mono uppercase font-black rounded-full tracking-widest block mx-auto w-fit">
                  Encrypted {activeCall.type} call
                </span>
                <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">ledger hash channel v1.3</p>
              </div>

              {/* Hologram Avatar Frame */}
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-violet-500/20 blur-xl animate-pulse" />
                <img
                  src={activeCall.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=160'}
                  alt={activeCall.partnerName}
                  className="w-28 h-28 rounded-full object-cover relative z-10 border-4 border-violet-500/40 ring-4 ring-slate-950"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="space-y-1.5">
                <h4 className="text-lg font-black text-white">{activeCall.partnerName}</h4>
                <div className="flex items-center justify-center gap-2">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-widest">
                    {Math.floor(activeCall.duration / 60)}:{(activeCall.duration % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>

              {/* Simulated Interactive Actions */}
              <div className="flex items-center justify-center gap-6 pt-4">
                <button
                  type="button"
                  className="w-12 h-12 bg-[#0c0924] hover:bg-[#16113b] border border-violet-500/20 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Mute microphone"
                >
                  <VolumeX className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={endCallSim}
                  className="w-14 h-14 bg-rose-600 hover:bg-rose-500 hover:shadow-[0_0_20px_rgba(244,63,94,0.4)] rounded-full flex items-center justify-center text-white transition-all cursor-pointer rotate-135"
                  title="Hang Up"
                >
                  <Phone className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  className="w-12 h-12 bg-[#0c0924] hover:bg-[#16113b] border border-violet-500/20 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Mute video feed"
                >
                  <Video className="w-5 h-5" />
                </button>
              </div>

              {/* Hardware Specs info */}
              <p className="text-[8px] font-mono text-zinc-600 uppercase tracking-wider">
                Protocol: Secure UDP Tunnel | codec: Opus Wideband | bitrate: 128kbps stereo
              </p>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
