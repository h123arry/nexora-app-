import React, { useState, useRef, useEffect } from 'react';
import { Send, Ghost, Search, Check, CheckCheck, Smile, Radio, Bot, ShieldAlert, Volume2, VolumeX, Paperclip, MoreVertical, Clock, EyeOff, Pin, Trash2, Mic, Video, AlertCircle, FileText, CornerUpLeft, X, Users, Archive, Phone, Image as ImageIcon, Camera, Play, Pause, Download, Lock, Unlock, Globe, RefreshCw, UserCheck, SmilePlus, Info, Calendar, Wifi, WifiOff, Trash, Plus, ChevronRight, UserPlus, Settings, AlertTriangle, ChevronDown, ExternalLink, MessageSquare, Sparkles, BarChart2, Shield, CheckCircle, Heart, Star, Forward, ArrowLeft, HardDrive } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Chat, Message, ExtendedMessage } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import { updateTypingState, subscribeToTypingState, updateOnlinePresence, subscribeToOnlinePresence, updateMessageReadReceipt } from '../services/dataService';
import CallScreen from './CallScreen';
import MediaGallery from './MediaGallery';
import GroupDashboard from './GroupDashboard';
import RelativeTime from './RelativeTime';
import ChatHeader from './ChatHeader';
import MessageBubble from './MessageBubble';

// Custom sub-components
import NewGroupModal from './NewGroupModal';
import PrivacySettingsModal from './PrivacySettingsModal';
import StorageDataCenterModal from './StorageDataCenterModal';
import CallTestingConsole from './CallTestingConsole';
import AttachmentGrid from './AttachmentGrid';
import AttachmentMenu from './AttachmentMenu';
import VoiceRecorder from './VoiceRecorder';
import ReactionBar from './ReactionBar';
import EmojiPicker from './EmojiPicker';
import ReactionDetailsSheet from './ReactionDetailsSheet';
import NewBroadcastModal from './NewBroadcastModal';
import BroadcastAnalyticsView from './BroadcastAnalyticsView';
import BroadcastInfoScreen from './BroadcastInfoScreen';

interface MessagesViewProps {
  currentUser: User;
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  onSendMessage: (chatId: string, content: string) => void;
  onReceiveBotMessage: (chatId: string, content: string, senderId: string) => void;
  onViewProfile: (userId: string) => void;
}

export default function MessagesView({
  currentUser,
  chats: initialChats,
  messages: initialMessages,
  onSendMessage,
  onReceiveBotMessage,
  onViewProfile
}: MessagesViewProps) {
  
  // Navigation & Tabs
  const [activeTab, setActiveTab] = useState<'chats' | 'requests' | 'broadcasts' | 'calls' | 'archived'>('chats');
  const listContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({
    chats: 0,
    requests: 0,
    broadcasts: 0,
    calls: 0,
    archived: 0
  });

  const handleTabChange = (tabId: any) => {
    if (listContainerRef.current) {
      scrollPositionsRef.current[activeTab] = listContainerRef.current.scrollTop;
    }
    setActiveTab(tabId);
    setTimeout(() => {
      if (listContainerRef.current) {
        listContainerRef.current.scrollTop = scrollPositionsRef.current[tabId] || 0;
      }
    }, 25);
  };

  const [chatsList, setChatsList] = useState<Chat[]>(() => {
    // Collect existing chats and enrich with group and broadcasts if missing
    let base = [...initialChats];
    if (!base.some(c => c.id === 'group-main')) {
      base.push({
        id: 'group-main',
        partnerId: 'group-id',
        partnerName: 'NEXORA Global Core 🌐',
        partnerAvatar: 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=150',
        partnerBio: 'Encrypted group for global developer and designer collaboration.',
        isPartnerOnline: true,
        lastMessage: 'Sophia: Real-time latency optimized!',
        lastTimestamp: '10:42 AM',
        unreadCount: 0
      });
    }

    if (!base.some(c => c.id === 'broadcast-alpha')) {
      base.push({
        id: 'broadcast-alpha',
        partnerId: 'broadcast-channel-alpha',
        partnerName: 'Nexora Core Announcements ⚡',
        partnerAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
        partnerBio: 'The official high-fidelity communication ledger of the Nexora developer team. Real-time updates, logs, and spec releases.',
        isPartnerOnline: true,
        unreadCount: 0,
        isBroadcast: true,
        groupCategory: 'Announcements',
        groupTheme: '#8B5CF6',
        groupBanner: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
        broadcastMode: 'announcement',
        broadcastRecipients: ['user-1', 'user-2', 'user-3', 'user-4'],
        welcomeMessage: 'Welcome to the official Nexora Core Announcements channel!',
        broadcastDeliveryStats: {
          delivered: 1250,
          read: 1198,
          failed: 2,
          pending: 5,
          reactionCount: {'🔥': 312, '❤️': 148, '👏': 96},
          repliesCount: 12,
          averageReadTime: '1.4s',
          linkClicks: 148,
          pollParticipation: 489,
          mediaDownloads: 230
        },
        lastMessage: 'Ledger delivery metrics have reached a stunning 99.8% stability rate.',
        lastTimestamp: '10:15 AM'
      });
    }

    if (!base.some(c => c.id === 'broadcast-vip')) {
      base.push({
        id: 'broadcast-vip',
        partnerId: 'broadcast-channel-vip',
        partnerName: 'Harrison VOH VIP Feed 🎙️',
        partnerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        partnerBio: 'Exclusive early-access updates, lifestyle broadcasts, and design feedback from @voiceofharrison.',
        isPartnerOnline: true,
        unreadCount: 0,
        isBroadcast: true,
        groupCategory: 'VIP',
        groupTheme: '#EC4899',
        groupBanner: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800',
        broadcastMode: 'creator',
        broadcastRecipients: ['user-2', 'user-3', 'user-5'],
        welcomeMessage: "Harrison's private studio transmission line initialized.",
        broadcastDeliveryStats: {
          delivered: 8520,
          read: 8140,
          failed: 12,
          pending: 45,
          reactionCount: {'❤️': 1240, '🔥': 980},
          repliesCount: 84,
          averageReadTime: '2.8s',
          linkClicks: 1210,
          pollParticipation: 3842,
          mediaDownloads: 1980
        },
        lastMessage: 'Are we ready for the major Broadcast release?',
        lastTimestamp: '11:20 AM'
      });
    }

    return base;
  });

  const availableUsers = React.useMemo(() => {
    // Extract unique user objects from chatsList that are not groups or broadcasts
    const users: any[] = [];
    chatsList.forEach(chat => {
      if (!chat.isGroup && chat.id !== 'group-main' && !chat.isBroadcast && chat.id.startsWith('chat-')) {
        users.push({
          id: chat.partnerId || chat.id,
          username: chat.username || `@${chat.partnerName.toLowerCase().replace(/\s+/g, '_')}`,
          name: chat.partnerName,
          avatar: chat.partnerAvatar,
          bio: chat.partnerBio || 'Active Nexora Connection Ledger node.',
          isVerified: chat.isVerified || false,
          followers: 120,
          following: 80,
          reputationPoints: 2400
        });
      }
    });

    // Add standard defaults if empty
    if (users.length === 0) {
      users.push(
        { id: 'user-1', name: 'Sophia Sterling', username: '@sophia_sterling', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', bio: 'AI Researcher & Digital Ethicist.', isVerified: true, followers: 1500, following: 800, reputationPoints: 9800 },
        { id: 'user-2', name: 'Lucas Cyber', username: '@lucas_cyber', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', bio: 'Decentralized systems architect.', isVerified: true, followers: 920, following: 400, reputationPoints: 5400 },
        { id: 'user-3', name: 'Luna Stellar', username: '@luna_stellar', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', bio: 'Immersive interface designer.', isVerified: true, followers: 2300, following: 1100, reputationPoints: 12000 }
      );
    }
    return users;
  }, [chatsList]);

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
    if (!next['broadcast-alpha']) {
      next['broadcast-alpha'] = [
        { id: 'msg-alpha-1', chatId: 'broadcast-alpha', senderId: currentUser.id, content: "Welcome to the Nexora Core announcements space! Secure private ledger nodes are now live.", timestamp: "Yesterday", status: "read" },
        { id: 'msg-alpha-2', chatId: 'broadcast-alpha', senderId: currentUser.id, content: "Ledger delivery metrics have reached a stunning 99.8% stability rate. Speed remains unmatched.", timestamp: "10:15 AM", status: "read" }
      ];
    }
    if (!next['broadcast-vip']) {
      next['broadcast-vip'] = [
        { id: 'msg-vip-1', chatId: 'broadcast-vip', senderId: currentUser.id, content: "Transmitting live from the Nexora Sound Studio! Tuning the premium custom equalizers.", timestamp: "Yesterday", status: "read" },
        { id: 'msg-vip-2', chatId: 'broadcast-vip', senderId: currentUser.id, content: "Are we ready for the major Broadcast release? It includes a custom Fan-Out Engine! 🎙️", timestamp: "11:20 AM", status: "read" }
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
  const [activeCall, setActiveCall] = useState<{ 
    type: 'voice' | 'video'; 
    direction: 'incoming' | 'outgoing';
    partnerName: string; 
    partnerAvatar: string;
    partnerUsername?: string;
  } | null>(null);
  const [showRequestAlert, setShowRequestAlert] = useState(false);
  const [acceptedRequestIds, setAcceptedRequestIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`nexora_accepted_requests_${currentUser.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(`nexora_accepted_requests_${currentUser.id}`, JSON.stringify(acceptedRequestIds));
  }, [acceptedRequestIds, currentUser.id]);

  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [showGroupDashboard, setShowGroupDashboard] = useState(false);
  const [showAttachmentSheet, setShowAttachmentSheet] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

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

  // Broadcast states
  const [isCreatingBroadcastOpen, setIsCreatingBroadcastOpen] = useState(false);
  const [isBroadcastAnalyticsOpen, setIsBroadcastAnalyticsOpen] = useState(false);
  const [isBroadcastInfoOpen, setIsBroadcastInfoOpen] = useState(false);
  const [isLocalSearchOpen, setIsLocalSearchOpen] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState('');

  // New Phase 18 State Definitions
  const [isCreatingGroupOpen, setIsCreatingGroupOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isStorageCenterOpen, setIsStorageCenterOpen] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    visibility: 'everyone' as 'everyone' | 'contacts' | 'nobody',
    lastSeen: 'everyone' as 'everyone' | 'contacts' | 'nobody',
    readReceipts: true,
    mediaQuality: 'saver' as 'hd' | 'saver'
  });
  const [showCallTestingConsole, setShowCallTestingConsole] = useState(false);
  const [callLogs, setCallLogs] = useState<any[]>([
    { id: 'cl-1', name: 'Sophia', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100', type: 'video', direction: 'missed', timestamp: 'Yesterday, 10:45 AM' },
    { id: 'cl-2', name: 'Harrison', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100', type: 'voice', direction: 'incoming', duration: '5m 24s', timestamp: '2 days ago' },
    { id: 'cl-3', name: 'Luna', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100', type: 'video', direction: 'outgoing', timestamp: '3 days ago' },
    { id: 'cl-4', name: 'Marcus', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', type: 'video', direction: 'incoming', duration: '12m 40s', timestamp: 'Last week' }
  ]);
  const [starredMessages, setStarredMessages] = useState<string[]>([]);
  const [partnerPresenceAction, setPartnerPresenceAction] = useState<'typing' | 'recording' | 'uploading' | null>(null);
  const [isComposerAttachmentOpen, setIsComposerAttachmentOpen] = useState(false);
  const [mediaUploadProgress, setMediaUploadProgress] = useState({ active: false, name: '', progress: 0, speed: '' });
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
  const [messageToForward, setMessageToForward] = useState<ExtendedMessage | null>(null);

  const [isSyncingLedger, setIsSyncingLedger] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Instagram Notes States
  interface InstagramNote {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    text: string;
    createdAt: string; // ISO String
    type: 'text' | 'audio' | 'video';
    audioDuration?: number;
    videoEmoji?: string;
    privacy: 'followers' | 'close_friends';
  }

  const [notes, setNotes] = useState<InstagramNote[]>(() => {
    const saved = localStorage.getItem(`nexora_notes_v3_${currentUser.id}`);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'n1',
        userId: 'chat-1', // Sophia
        userName: 'Sophia',
        userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
        text: 'Refactoring Nexora nodes... 🧠💻',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
        type: 'text',
        privacy: 'followers'
      },
      {
        id: 'n2',
        userId: 'chat-2', // Lucas
        userName: 'Lucas',
        userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        text: '🎤 Latency soundscape optimization check',
        createdAt: new Date(Date.now() - 7200000).toISOString(),
        type: 'audio',
        audioDuration: 8,
        privacy: 'followers'
      },
      {
        id: 'n3',
        userId: 'chat-3', // Luna
        userName: 'Luna',
        userAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
        text: 'Crafting glassmorphism overlays 🎨🔮',
        createdAt: new Date(Date.now() - 14400000).toISOString(),
        type: 'text',
        privacy: 'close_friends'
      },
      {
        id: 'n4',
        userId: 'chat-4', // Harrison
        userName: 'Harrison',
        userAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
        text: '📹 Studio vlog live test',
        createdAt: new Date(Date.now() - 18000000).toISOString(),
        type: 'video',
        videoEmoji: '🎬🎥',
        privacy: 'followers'
      }
    ];
  });

  const [activeNoteComposer, setActiveNoteComposer] = useState(false);
  const [activeNoteViewer, setActiveNoteViewer] = useState<InstagramNote | null>(null);
  
  // Note creation forms
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteType, setNewNoteType] = useState<'text' | 'audio' | 'video'>('text');
  const [newNotePrivacy, setNewNotePrivacy] = useState<'followers' | 'close_friends'>('followers');
  const [newNoteVideoEmoji, setNewNoteVideoEmoji] = useState('💬');
  const [newNoteAudioRecordTime, setNewNoteAudioRecordTime] = useState(0);
  const [isRecordingNoteAudio, setIsRecordingNoteAudio] = useState(false);
  
  // Note viewing states
  const [noteReplyText, setNoteReplyText] = useState('');
  const [isNoteAudioPlaying, setIsNoteAudioPlaying] = useState(false);
  const [noteAudioPlaybackProgress, setNoteAudioPlaybackProgress] = useState(0);

  // Primary vs General categorization
  const [chatsSubTab, setChatsSubTab] = useState<'primary' | 'general'>('primary');
  const [generalChatIds, setGeneralChatIds] = useState<string[]>(['chat-2', 'chat-4']); // chat-2 is Lucas, chat-4 is Harrison

  const toggleChatCategory = (chatId: string) => {
    setGeneralChatIds(prev => 
      prev.includes(chatId) ? prev.filter(id => id !== chatId) : [...prev, chatId]
    );
    window.dispatchEvent(new CustomEvent('toast', { detail: '🔄 Chat category updated' }));
  };

  const handleShareNote = () => {
    if (newNoteText.trim() === '' && newNoteType === 'text') return;
    
    let textContent = newNoteText;
    let audioDur = undefined;
    let vidEmoji = undefined;

    if (newNoteType === 'audio') {
      textContent = '🎙️ Shared an Audio Note';
      audioDur = 6;
    } else if (newNoteType === 'video') {
      textContent = `📹 Video Note status: ${newNoteVideoEmoji}`;
      vidEmoji = newNoteVideoEmoji;
    }

    const myNewNote: InstagramNote = {
      id: `note-me-${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
      text: textContent,
      createdAt: new Date().toISOString(),
      type: newNoteType,
      audioDuration: audioDur,
      videoEmoji: vidEmoji,
      privacy: newNotePrivacy
    };

    setNotes(prev => {
      const next = prev.filter(n => n.userId !== currentUser.id);
      const updated = [myNewNote, ...next];
      localStorage.setItem(`nexora_notes_v3_${currentUser.id}`, JSON.stringify(updated));
      return updated;
    });

    setNewNoteText('');
    setNewNoteType('text');
    setActiveNoteComposer(false);
    window.dispatchEvent(new CustomEvent('toast', { detail: '📝 Shared your status note with friends!' }));
  };

  const handleDeleteMyNote = () => {
    setNotes(prev => {
      const updated = prev.filter(n => n.userId !== currentUser.id);
      localStorage.setItem(`nexora_notes_v3_${currentUser.id}`, JSON.stringify(updated));
      return updated;
    });
    setActiveNoteViewer(null);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🧹 Your note has been deleted.' }));
  };

  const handleSendNoteReply = () => {
    if (!activeNoteViewer || noteReplyText.trim() === '') return;
    
    const targetChatId = activeNoteViewer.userId;
    const msgContent = noteReplyText;
    
    onSendMessage(targetChatId, msgContent);
    
    setActiveChatId(targetChatId);
    setNoteReplyText('');
    setActiveNoteViewer(null);
    window.dispatchEvent(new CustomEvent('toast', { detail: `💬 Replied to ${activeNoteViewer.userName}'s note as a DM!` }));
  };

  const handleToggleVanishMode = () => {
    setDisappearingMode(prev => !prev);
    const detail = !disappearingMode 
      ? '👻 Secure Vanish Mode enabled. Messages seen are instantly erased!' 
      : '🚪 Exited Vanish Mode. Regular messaging restored.';
    window.dispatchEvent(new CustomEvent('toast', { detail }));
  };

  const handleSimulateScreenshot = () => {
    if (!activeChatId || !activeChat) return;
    const alertMsg = `⚠️ SECURITY WARNING: Screenshot captured in Vanish Mode! Secure ledger alert emitted.`;
    window.dispatchEvent(new CustomEvent('toast', { detail: alertMsg }));
    
    const screenshotMsg: ExtendedMessage = {
      id: `sys-ss-${Date.now()}`,
      chatId: activeChatId,
      senderId: 'system',
      content: `⚠️ ${currentUser.name} took a screenshot of this conversation.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read'
    };
    
    setLocalMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), screenshotMsg]
    }));
  };

  const handleCreateGroup = (newGroup: Partial<Chat>) => {
    const fullGroup: Chat = {
      id: newGroup.id || `group-${Date.now()}`,
      partnerId: newGroup.partnerId || `group-node`,
      partnerName: newGroup.partnerName || 'Unnamed Group',
      partnerAvatar: newGroup.partnerAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      partnerBio: newGroup.partnerBio || 'Secure private community.',
      isPartnerOnline: true,
      unreadCount: 0,
      lastMessage: newGroup.lastMessage || 'Node Initialized.',
      lastTimestamp: 'Just now',
      ...newGroup
    };

    setChatsList(prev => [fullGroup, ...prev]);
    setActiveChatId(fullGroup.id);
    
    const welcomeMsg: ExtendedMessage = {
      id: 'welcome-' + Date.now(),
      chatId: fullGroup.id,
      senderId: 'system',
      content: fullGroup.welcomeMessage || `Welcome to "${fullGroup.partnerName}" core conversation node!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read'
    };

    setLocalMessages(prev => ({
      ...prev,
      [fullGroup.id]: [welcomeMsg]
    }));

    window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Node "${fullGroup.partnerName}" instantiated on decentralized ledger!` }));
  };

  const handleCreateBroadcast = (newBroadcast: Partial<Chat>) => {
    const broadcastId = newBroadcast.id || `broadcast-${Date.now()}`;
    const fullBroadcast: Chat = {
      id: broadcastId,
      partnerId: newBroadcast.partnerId || `broadcast-channel-${Date.now()}`,
      partnerName: newBroadcast.partnerName || 'Unnamed Broadcast',
      partnerAvatar: newBroadcast.partnerAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      partnerBio: newBroadcast.partnerBio || 'Private communication channel.',
      isPartnerOnline: true,
      unreadCount: 0,
      isBroadcast: true,
      groupCategory: newBroadcast.groupCategory || 'General',
      groupTheme: newBroadcast.groupTheme || '#8B5CF6',
      groupBanner: newBroadcast.groupBanner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      broadcastMode: newBroadcast.broadcastMode || 'standard',
      broadcastRecipients: newBroadcast.broadcastRecipients || [],
      welcomeMessage: newBroadcast.welcomeMessage || "Broadcast channel initialized.",
      broadcastDeliveryStats: newBroadcast.broadcastDeliveryStats || {
        delivered: (newBroadcast.broadcastRecipients || []).length,
        read: 0,
        failed: 0,
        pending: (newBroadcast.broadcastRecipients || []).length,
        reactionCount: {},
        repliesCount: 0,
        averageReadTime: '0s',
        linkClicks: 0,
        pollParticipation: 0,
        mediaDownloads: 0
      },
      lastMessage: newBroadcast.welcomeMessage || 'Broadcast List initialized.',
      lastTimestamp: 'Just now'
    };

    setChatsList(prev => [fullBroadcast, ...prev]);
    setActiveChatId(broadcastId);

    const systemMsg: ExtendedMessage = {
      id: 'welcome-' + Date.now(),
      chatId: broadcastId,
      senderId: 'system',
      content: newBroadcast.welcomeMessage || `Welcome to your new Broadcast List "${fullBroadcast.partnerName}". Messages sent here will fan-out privately to all recipients!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'read'
    };

    setLocalMessages(prev => ({
      ...prev,
      [broadcastId]: [systemMsg]
    }));

    window.dispatchEvent(new CustomEvent('toast', { detail: `⚡ Broadcast List "${fullBroadcast.partnerName}" created with ${(newBroadcast.broadcastRecipients || []).length} secure recipients!` }));
  };

  // Voice Note Playback Engine States
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [voicePlaybackSpeed, setVoicePlaybackSpeed] = useState<1 | 1.25 | 1.5 | 2>(1);

  const handleTogglePlayVoice = (msgId: string) => {
    setPlayingVoiceId(prev => prev === msgId ? null : msgId);
  };

  const handleSendVoiceMessage = (audioBlob: Blob, duration: number) => {
    // Implement sending logic here
    console.log('Sending voice message', audioBlob, duration);
  };

  const handleCancelVoiceRecording = () => {
    setVoiceRecordState('idle');
  };

  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [reactionBarPosition, setReactionBarPosition] = useState<{ x: number, y: number } | null>(null);
  const [showReactionDetailsMessageId, setShowReactionDetailsMessageId] = useState<string | null>(null);

  const handleReact = (msgId: string, emoji: string) => {
    if (!activeChatId) return;
    setLocalMessages(prev => {
      const stream = prev[activeChatId] || [];
      const next = stream.map(m => {
        if (m.id !== msgId) return m;

        const currentReactions = m.reactions ? [...m.reactions] : [];
        const existingIdx = currentReactions.findIndex(r => r.emoji === emoji);

        if (existingIdx > -1) {
          const rx = { ...currentReactions[existingIdx] };
          if (rx.userIds.includes(currentUser.id)) {
            // Remove user reaction (toggle off)
            rx.userIds = rx.userIds.filter(id => id !== currentUser.id);
          } else {
            // Add user reaction
            rx.userIds = [...rx.userIds, currentUser.id];
          }

          if (rx.userIds.length === 0) {
            currentReactions.splice(existingIdx, 1);
          } else {
            currentReactions[existingIdx] = rx;
          }
        } else {
          // Add brand new reaction
          currentReactions.push({ emoji, userIds: [currentUser.id] });
        }

        return { ...m, reactions: currentReactions };
      });
      return { ...prev, [activeChatId]: next };
    });
    setActiveReactionMessageId(null);
    if (navigator.vibrate) navigator.vibrate(20);
  };

  const handleLongPress = (msgId: string, e: React.MouseEvent) => {
    setActiveReactionMessageId(msgId);
    
    // Smart positioning relative to top boundary and viewport width
    const isNearTop = e.clientY < 140;
    const yPos = isNearTop ? e.clientY + 25 : e.clientY - 65;
    const xPos = Math.min(window.innerWidth - 330, Math.max(16, e.clientX - 120));
    
    setReactionBarPosition({ x: xPos, y: yPos });
    if (navigator.vibrate) navigator.vibrate(40);
  };

  // Active Playback ticker effect
  useEffect(() => {
    if (!playingVoiceId) {
      setVoiceProgress(0);
      return;
    }
    const interval = setInterval(() => {
      setVoiceProgress(p => {
        if (p >= 100) {
          setPlayingVoiceId(null);
          clearInterval(interval);
          return 0;
        }
        return p + (4 * voicePlaybackSpeed);
      });
    }, 100);
    return () => clearInterval(interval);
  }, [playingVoiceId, voicePlaybackSpeed]);

  // Persistence Engine - local state recovery on startup
  useEffect(() => {
    const recoveryChats = localStorage.getItem(`nexora_chats_v3_${currentUser.id}`);
    const recoveryMsgs = localStorage.getItem(`nexora_msgs_v3_${currentUser.id}`);
    const recoveryStarred = localStorage.getItem(`nexora_starred_v3_${currentUser.id}`);
    const recoveryCallLogs = localStorage.getItem(`nexora_calls_v3_${currentUser.id}`);
    const recoveryPrivacy = localStorage.getItem(`nexora_privacy_v3_${currentUser.id}`);

    if (recoveryChats) setChatsList(JSON.parse(recoveryChats));
    if (recoveryMsgs) setLocalMessages(JSON.parse(recoveryMsgs));
    if (recoveryStarred) setStarredMessages(JSON.parse(recoveryStarred));
    if (recoveryCallLogs) setCallLogs(JSON.parse(recoveryCallLogs));
    if (recoveryPrivacy) setPrivacySettings(JSON.parse(recoveryPrivacy));
  }, []);

  // Save state on any modifications
  useEffect(() => {
    localStorage.setItem(`nexora_chats_v3_${currentUser.id}`, JSON.stringify(chatsList));
    localStorage.setItem(`nexora_msgs_v3_${currentUser.id}`, JSON.stringify(localMessages));
    localStorage.setItem(`nexora_starred_v3_${currentUser.id}`, JSON.stringify(starredMessages));
    localStorage.setItem(`nexora_calls_v3_${currentUser.id}`, JSON.stringify(callLogs));
    localStorage.setItem(`nexora_privacy_v3_${currentUser.id}`, JSON.stringify(privacySettings));
  }, [chatsList, localMessages, starredMessages, callLogs, privacySettings]);

  // 1. Online presence sync
  useEffect(() => {
    updateOnlinePresence(currentUser.id, true);
    
    const unsubPresence = subscribeToOnlinePresence((presenceMap) => {
      setChatsList(prev => 
        prev.map(c => {
          const isOnline = presenceMap[c.partnerId] !== undefined ? presenceMap[c.partnerId] : c.isPartnerOnline;
          return {
            ...c,
            isPartnerOnline: isOnline
          };
        })
      );
    });

    const handleBeforeUnload = () => {
      updateOnlinePresence(currentUser.id, false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      updateOnlinePresence(currentUser.id, false);
      unsubPresence();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [currentUser.id]);

  // 2. Active chat typing & recording indicators sync
  useEffect(() => {
    if (!activeChatId) return;

    const unsubTyping = subscribeToTypingState(activeChatId, (states) => {
      // Find any typing state that is active from a user other than the currentUser
      const activePartnerState = Object.entries(states).find(([uid, state]) => uid !== currentUser.id && state !== null);
      if (activePartnerState) {
        setPartnerPresenceAction(activePartnerState[1]);
      } else {
        setPartnerPresenceAction(null);
      }
    });

    return () => {
      unsubTyping();
    };
  }, [activeChatId, currentUser.id]);

  // 3. Local typing trigger
  useEffect(() => {
    if (!activeChatId || !typedMessage.trim()) {
      if (activeChatId) {
        updateTypingState(activeChatId, currentUser.id, null);
      }
      return;
    }

    updateTypingState(activeChatId, currentUser.id, 'typing');

    const delayDebounceFn = setTimeout(() => {
      updateTypingState(activeChatId, currentUser.id, null);
    }, 2000);

    return () => {
      clearTimeout(delayDebounceFn);
    };
  }, [typedMessage, activeChatId, currentUser.id]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChat = chatsList.find(c => c.id === activeChatId);
  const activeChatMessages = React.useMemo(() => {
    if (!activeChatId) return [];
    let msgs = localMessages[activeChatId] || [];
    if (localSearchQuery.trim()) {
      const q = localSearchQuery.toLowerCase();
      msgs = msgs.filter(m => 
        m.content.toLowerCase().includes(q) ||
        (m.fileName && m.fileName.toLowerCase().includes(q))
      );
    }
    return msgs;
  }, [activeChatId, localMessages, localSearchQuery]);

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
      setIsSyncingLedger(true);
      setSyncProgress(0);
      window.dispatchEvent(new CustomEvent('toast', { detail: "📶 Network online! Reconnecting and syncing decentral-ledger..." }));

      const interval = setInterval(() => {
        setSyncProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            
            // Reconcile messages in all chats
            setLocalMessages(prev => {
              const updated = { ...prev };
              Object.keys(updated).forEach(chatId => {
                updated[chatId] = updated[chatId].map(m => {
                  if (m.isOfflineUnsent) {
                    return { ...m, isOfflineUnsent: false, status: 'delivered' as const };
                  }
                  return m;
                });
              });
              return updated;
            });

            // Empty queues
            const count = offlineQueue.length;
            setOfflineQueue([]);
            setIsSyncingLedger(false);
            window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Ledger synced! ${count} message(s) broadcasted successfully.` }));
            return 100;
          }
          return p + 10;
        });
      }, 150);

      return () => clearInterval(interval);
    }
  }, [isOffline, offlineQueue]);

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

    if (activeChat?.isBroadcast) {
      // 1. Broadcast the message locally to the broadcast list channel history so the broadcaster sees it in their dashboard.
      setLocalMessages(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), newMsg]
      }));

      // Update broadcast list stats & last message info
      setChatsList(prev => prev.map(c => c.id === activeChatId ? {
        ...c,
        lastMessage: typedMessage,
        lastTimestamp: newMsg.timestamp,
        broadcastDeliveryStats: c.broadcastDeliveryStats ? {
          ...c.broadcastDeliveryStats,
          delivered: (c.broadcastDeliveryStats.delivered || 0) + (c.broadcastRecipients?.length || 1),
          reactionCount: {
            ...c.broadcastDeliveryStats.reactionCount,
            '🔥': (c.broadcastDeliveryStats.reactionCount?.['🔥'] || 0) + Math.floor(Math.random() * 2)
          }
        } : undefined
      } : c));

      // 2. Intelligent Fan-out: Deliver to each individual recipient as a private message!
      const recipientIds = activeChat.broadcastRecipients || [];
      const recipientToChatId: Record<string, string> = {
        'user-1': 'chat-1',
        'user-2': 'chat-2',
        'user-3': 'chat-3',
        'user-4': 'chat-4',
        'user-5': 'chat-5'
      };

      recipientIds.forEach(recipientUserId => {
        const privateChatId = recipientToChatId[recipientUserId] || recipientUserId;
        
        // Construct personal message for the recipient
        const personalMsg: ExtendedMessage = {
          ...newMsg,
          id: `msg-fanout-${recipientUserId}-${Date.now()}`,
          chatId: privateChatId,
          senderId: currentUser.id
        };

        // Deliver to private conversation list
        setLocalMessages(prev => ({
          ...prev,
          [privateChatId]: [...(prev[privateChatId] || []), personalMsg]
        }));

        // Update the recipient's chat item inside chatsList (e.g. update lastMessage)
        setChatsList(prev => prev.map(c => c.id === privateChatId ? {
          ...c,
          lastMessage: typedMessage,
          lastTimestamp: newMsg.timestamp
        } : c));
      });

      // Show high-fidelity toast notifying successful intelligent fan-out delivery
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: `⚡ Intelligent Fan-out executed: broadcast delivered to ${recipientIds.length} recipient ledgers privately!` 
      }));

      setTypedMessage('');
      setReplyQuoteText(null);
      return;
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

  const simulateAutomaticBotReply = (userQuery: string, customAction?: 'typing' | 'recording' | 'uploading') => {
    const action = customAction || 'typing';
    setPartnerPresenceAction(action);

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
        setPartnerPresenceAction(null);
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
      setPartnerPresenceAction(null);
    }, 2000);
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

    setVoiceRecordState('idle');
    setVoiceTimer(0);
    setVoiceWaveform([]);

    if (isOffline) {
      setOfflineQueue(prev => [...prev, newMsg]);
      setLocalMessages(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), newMsg]
      }));
    } else {
      // Simulate HD Audio Compression & Secure Server Upload
      setMediaUploadProgress({ active: true, name: `🎙️ Voice Note (HD Secure, ${durStr})`, progress: 0, speed: '1.4 MB/s' });
      
      let p = 0;
      const interval = setInterval(() => {
        p += 25;
        setMediaUploadProgress(prev => ({ ...prev, progress: p }));
        
        if (p >= 100) {
          clearInterval(interval);
          setMediaUploadProgress({ active: false, name: '', progress: 0, speed: '' });
          
          setLocalMessages(prev => ({
            ...prev,
            [activeChatId]: [...(prev[activeChatId] || []), newMsg]
          }));
          
          simulateAutomaticBotReply("secure voice memo note", "recording");
        }
      }, 250);
    }
  };

  // Upgraded Rich Media Exchange Engine
  const handleSendRichMedia = (type: string, data: any) => {
    setIsComposerAttachmentOpen(false);
    
    let contentSummary = "";
    switch (type) {
      case 'sticker': contentSummary = `👾 Sticker: ${data.name}`; break;
      case 'gif': contentSummary = `🎬 GIF: Animation`; break;
      case 'contact': contentSummary = `📇 Contact: ${data.name} (${data.role})`; break;
      case 'post': contentSummary = `📺 Shared Post: "${data.title}"`; break;
      case 'location': contentSummary = `🗺️ Share Location: Coordinate Marker`; break;
      default: contentSummary = `📁 Shared asset`;
    }

    const newMsg: ExtendedMessage & { customMediaType?: string; customMediaData?: any } = {
      id: 'media-' + Date.now(),
      chatId: activeChatId,
      senderId: currentUser.id,
      content: contentSummary,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: isOffline ? 'sent' : 'delivered',
      isOfflineUnsent: isOffline || undefined,
      customMediaType: type,
      customMediaData: data
    };

    if (isOffline) {
      setOfflineQueue(prev => [...prev, newMsg]);
      setLocalMessages(prev => ({
        ...prev,
        [activeChatId]: [...(prev[activeChatId] || []), newMsg]
      }));
    } else {
      // Simulate Content Delivery Network Optimization
      const compressionRatio = privacySettings.mediaQuality === 'hd' ? 'Lossless HD' : 'Optimized Data Saver';
      setMediaUploadProgress({ active: true, name: `📤 Sharing ${type.toUpperCase()} (${compressionRatio})`, progress: 0, speed: '2.8 MB/s' });
      
      let p = 0;
      const interval = setInterval(() => {
        p += 20;
        setMediaUploadProgress(prev => ({ ...prev, progress: p }));
        
        if (p >= 100) {
          clearInterval(interval);
          setMediaUploadProgress({ active: false, name: '', progress: 0, speed: '' });
          
          setLocalMessages(prev => ({
            ...prev,
            [activeChatId]: [...(prev[activeChatId] || []), newMsg]
          }));
          
          simulateAutomaticBotReply(`rich media attachment ${type}`, "uploading");
        }
      }, 200);
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
    if (activeTab === 'chats') {
      const isArchived = archivedChats.includes(chat.id);
      const isBroadcast = chat.isBroadcast;
      const isUnderReadLimit = chat.unreadCount <= 3;
      if (isArchived || isBroadcast || !isUnderReadLimit) return false;
      
      const isGeneral = generalChatIds.includes(chat.id);
      if (chatsSubTab === 'primary') return !isGeneral;
      if (chatsSubTab === 'general') return isGeneral;
    }
    if (activeTab === 'requests') return chat.unreadCount > 3 && !archivedChats.includes(chat.id) && !chat.isBroadcast;
    if (activeTab === 'broadcasts') return chat.isBroadcast === true && !archivedChats.includes(chat.id);
    if (activeTab === 'archived') return archivedChats.includes(chat.id);
    if (activeTab === 'calls') return false; // Handled separately with CallTestingConsole in UI

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
      const nextMsg = i < searchFilterMatches.length - 1 ? searchFilterMatches[i + 1] : null;

      // Group consecutive messages sent within 2 minutes from the same sender
      const isGrouped = prevMsg && prevMsg.senderId === msg.senderId;
      const isLastInGroup = !nextMsg || nextMsg.senderId !== msg.senderId;

      results.push(
        <div key={`wrapper-${msg.id}`} className="space-y-1">
          <MessageBubble
            key={msg.id}
            message={msg}
            isMe={msg.senderId === currentUser.id}
            isGrouped={!!isGrouped}
            isLastInGroup={isLastInGroup}
            partnerName={activeChat?.partnerName}
            partnerAvatar={activeChat?.partnerAvatar}
            isPinned={pinnedMessageInChat?.id === msg.id}
            onReply={(m) => {
              setReplyQuoteText(m.content);
              setTypedMessage('');
            }}
            onReact={handleReact}
            onDelete={handleDeleteMessage}
            onEdit={(m) => {
              setEditingMessageId(m.id);
              setTypedMessage(m.content);
            }}
            onPin={(m) => setPinnedMessageInChat(m)}
            onTranslate={handleTranslateMessage}
            searchQuery={searchQuery}
            onToggleContextMenu={(id) => setActiveContextMessageId(id)}
            activeContextMessageId={activeContextMessageId}
            onTogglePlayVoice={handleTogglePlayVoice}
            onLongPress={handleLongPress}
            playingVoiceId={playingVoiceId}
            voiceProgress={playingVoiceId === msg.id ? voiceProgress : 0}
            voicePlaybackSpeed={voicePlaybackSpeed}
            onChangeSpeed={() => {
              setVoicePlaybackSpeed(prev => {
                if (prev === 1) return 1.25;
                if (prev === 1.25) return 1.5;
                if (prev === 1.5) return 2;
                return 1;
              });
            }}
            onSeekVoice={(msgId, progress) => {
              setVoiceProgress(progress);
            }}
            currentUserId={currentUser.id}
            onShowReactionDetails={(msgId) => setShowReactionDetailsMessageId(msgId)}
          />
          {activeChat?.isBroadcast && msg.senderId === currentUser.id && (
            <div className="flex flex-wrap justify-end gap-1.5 pr-2 mt-1 select-none">
              <button 
                onClick={() => setIsBroadcastAnalyticsOpen(true)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 text-[8px] font-mono text-emerald-400 font-extrabold uppercase transition-all cursor-pointer"
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Delivered: {(activeChat.broadcastDeliveryStats?.delivered || activeChat.broadcastRecipients?.length || 1).toLocaleString()} • Read: {(activeChat.broadcastDeliveryStats?.read || Math.round((activeChat.broadcastRecipients?.length || 1) * 0.9)).toLocaleString()}
              </button>
              
              {/* Recipient Reactions simulator */}
              {['🔥', '❤️', '👍', '👏', '😂'].map(emoji => {
                const initialCount = activeChat.broadcastDeliveryStats?.reactionCount?.[emoji] || (emoji === '🔥' ? 48 : emoji === '❤️' ? 32 : emoji === '👍' ? 12 : 0);
                if (initialCount === 0 && activeChat.broadcastMode === 'standard') return null;
                
                return (
                  <button
                    key={emoji}
                    onClick={() => {
                      // Click to simulate adding reactions in real-time
                      const currentStats = activeChat.broadcastDeliveryStats || {};
                      const rx = currentStats.reactionCount || {};
                      const updatedRx = {
                        ...rx,
                        [emoji]: (rx[emoji] || initialCount) + 1
                      };
                      // Update chatsList state
                      setChatsList(prev => prev.map(c => c.id === activeChat.id ? {
                        ...c,
                        broadcastDeliveryStats: {
                          ...currentStats,
                          reactionCount: updatedRx
                        }
                      } : c));
                      window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Simulated recipient reaction ${emoji} added on ledger!` }));
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 border border-white/5 text-[9px] hover:bg-white/10 text-zinc-300 transition-all cursor-pointer"
                  >
                    <span>{emoji}</span>
                    <span className="text-[8px] font-mono text-zinc-400">{initialCount}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    results.push(
      activeReactionMessageId && reactionBarPosition && (
        <div key="reaction-bar" style={{ position: 'fixed', top: reactionBarPosition.y, left: reactionBarPosition.x }} className="z-50">
          <ReactionBar 
            onSelect={(emoji) => handleReact(activeReactionMessageId, emoji)} 
            onClose={() => setActiveReactionMessageId(null)} 
          />
        </div>
      )
    );

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
        
        {/* Messages List Header */}
        <div className="p-3 bg-[#03010c] border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <img 
                src={currentUser.avatar} 
                alt="My Profile avatar" 
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-violet-500/30" 
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="text-left leading-none">
              <p className="text-[10px] font-sans font-bold text-white">{currentUser.name}</p>
              <span className="text-[8px] font-mono text-zinc-500 uppercase">Online</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Create Broadcast trigger */}
            <button
              onClick={() => setIsCreatingBroadcastOpen(true)}
              className="p-1 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-emerald-400 cursor-pointer transition-colors"
              title="Create Broadcast List"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
            </button>
            {/* Privacy Controls trigger */}
            <button
              onClick={() => setIsPrivacyOpen(true)}
              className="p-1 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-violet-400 cursor-pointer transition-colors"
              title="Secure Privacy Settings"
            >
              <Shield className="w-3.5 h-3.5" />
            </button>
            {/* Storage Controls trigger */}
            <button
              onClick={() => setIsStorageCenterOpen(true)}
              className="p-1 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-pink-400 cursor-pointer transition-colors"
              title="Decentralized Storage & Data Management"
            >
              <HardDrive className="w-3.5 h-3.5 text-pink-400" />
            </button>
            {/* Create Group trigger */}
            <button
              onClick={() => setIsCreatingGroupOpen(true)}
              className="p-1 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-violet-400 cursor-pointer transition-colors"
              title="Initialize Secure Group Ledger"
            >
              <Users className="w-3.5 h-3.5" />
            </button>
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

        {/* Instagram Notes Carousel */}
        {activeTab === 'chats' && !searchQuery && (
          <div className="px-3 py-2 border-b border-violet-500/5 bg-[#03010c]/20 flex flex-col gap-1 shrink-0 select-none">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[9px] font-mono tracking-wider text-violet-400 font-extrabold uppercase">Instagram Notes</span>
              <span className="text-[7.5px] font-mono text-zinc-500 uppercase tracking-wider">24h Lifecycle</span>
            </div>
            
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
              {/* Current User Note Slot */}
              {(() => {
                const myNote = notes.find(n => n.userId === currentUser.id);
                return (
                  <div className="flex flex-col items-center shrink-0 relative group cursor-pointer w-14">
                    <div 
                      onClick={() => {
                        if (myNote) {
                          setActiveNoteViewer(myNote);
                        } else {
                          setActiveNoteComposer(true);
                        }
                      }}
                      className="relative w-12 h-12 rounded-full flex items-center justify-center border-2 border-violet-600/30 hover:border-violet-500 transition-all duration-300"
                    >
                      <img 
                        src={currentUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100'} 
                        alt="Your avatar" 
                        className="w-10 h-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      {myNote ? (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 border border-violet-400 text-white text-[8px] px-1.5 py-0.5 rounded-lg max-w-[56px] truncate shadow-lg font-bold leading-tight z-10">
                          {myNote.type === 'audio' ? '🎙️ Audio' : myNote.type === 'video' ? myNote.videoEmoji : myNote.text}
                        </div>
                      ) : (
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-violet-600 border border-[#080516] flex items-center justify-center text-white font-bold text-[10px]">
                          +
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1 truncate max-w-full font-medium text-center">Your Note</span>
                  </div>
                );
              })()}

              {/* Friends Notes Slots */}
              {notes.filter(n => n.userId !== currentUser.id).map(note => {
                return (
                  <div 
                    key={note.id} 
                    onClick={() => setActiveNoteViewer(note)}
                    className="flex flex-col items-center shrink-0 relative group cursor-pointer w-14"
                  >
                    {/* Floating Speech Bubble */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-violet-500/30 hover:border-violet-400/60 text-violet-100 text-[8px] px-2 py-0.5 rounded-full max-w-[64px] truncate shadow-lg font-sans font-bold leading-tight transition-all duration-300 z-10 group-hover:scale-105">
                      {note.type === 'audio' ? '🎙️ Audio' : note.type === 'video' ? note.videoEmoji : note.text}
                    </div>

                    <div className="relative w-12 h-12 rounded-full flex items-center justify-center border-2 border-pink-500/20 hover:border-pink-500 transition-all duration-300">
                      <img 
                        src={note.userAvatar} 
                        alt={note.userName} 
                        className="w-10 h-10 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#080516]" title="Active Now" />
                    </div>
                    <span className="text-[9px] text-zinc-400 mt-1 truncate max-w-full font-medium text-center">{note.userName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Primary vs General Tab Selector for Chats */}
        {activeTab === 'chats' && !searchQuery && (
          <div className="px-3 py-1 flex gap-1 bg-[#050311]/40 border-b border-violet-500/5 shrink-0 justify-start select-none">
            {[
              { id: 'primary', label: 'Primary' },
              { id: 'general', label: 'General' }
            ].map(sub => (
              <button
                key={sub.id}
                onClick={() => setChatsSubTab(sub.id as any)}
                className={`px-3 py-1 text-[8px] font-mono uppercase font-black tracking-widest rounded-md border transition-all cursor-pointer ${
                  chatsSubTab === sub.id 
                    ? 'bg-violet-600/20 text-violet-400 border-violet-500/30 shadow-inner' 
                    : 'bg-transparent text-zinc-500 border-transparent hover:text-zinc-300'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>
        )}

        {/* Scrolling pill category selector */}
        <div className="px-3 py-2 flex gap-1 overflow-x-auto no-scrollbar shrink-0 border-b border-violet-500/5 bg-[#03010c]/10">
          {[
            { id: 'chats', label: 'Chats' },
            { id: 'requests', label: 'Requests' },
            { id: 'broadcasts', label: 'Broadcasts' },
            { id: 'calls', label: 'Calls' },
            { id: 'archived', label: 'Archived' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[8.5px] font-mono uppercase tracking-wider font-black shrink-0 transition-all cursor-pointer ${
                activeTab === tab.id 
                  ? 'bg-violet-600 text-white shadow-sm ring-1 ring-violet-400/20' 
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Contacts Card stream */}
        <div ref={listContainerRef} className="flex-1 overflow-y-auto divide-y divide-violet-500/5">
          {activeTab === 'calls' ? (
            <CallTestingConsole 
              logs={callLogs} 
              onClearLogs={() => {
                setCallLogs([]);
                window.dispatchEvent(new CustomEvent('toast', { detail: "🧹 Call logs registry purged." }));
              }} 
              onTriggerSimulatedCall={(partner, type) => {
                const avatarUrl = partner === 'Sophia' 
                  ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100' 
                  : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100';
                setActiveCall({ 
                  type, 
                  direction: 'incoming',
                  partnerName: partner, 
                  partnerAvatar: avatarUrl,
                  partnerUsername: partner === 'Sophia' ? '@sophia_cyber' : '@luna_stellar'
                });
              }}
            />
          ) : (
            filteredChats.map(chat => {
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
                    setIsLocalSearchOpen(false);
                    setLocalSearchQuery('');
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
                      {chat.isBroadcast ? (
                        <span className="absolute bottom-[-1px] right-[-1px] p-0.5 bg-emerald-500 text-slate-950 rounded-full border border-[#09071c]">
                          <Radio className="w-2 h-2" />
                        </span>
                      ) : chat.isPartnerOnline ? (
                        <span className="absolute bottom-[-1px] right-[-1px] w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#09071c]" />
                      ) : (
                        <span className="absolute bottom-[-1px] right-[-1px] w-2.5 h-2.5 bg-zinc-600 rounded-full border-2 border-[#09071c]" />
                      )}
                    </div>

                    <div className="overflow-hidden flex-1 text-left leading-none">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <p className="text-xs font-sans font-black text-white truncate max-w-[130px]">
                            {chat.partnerName}
                          </p>
                          {chat.isBroadcast ? (
                            <span className="text-[7px] font-mono px-1 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold shrink-0 uppercase">
                              {chat.broadcastMode || 'LIST'}
                            </span>
                          ) : chat.id === 'group-main' || chat.isGroup || chat.id.startsWith('group-') ? (
                            <Users className="w-3 h-3 text-violet-400 shrink-0" />
                          ) : (
                            <PurpleVerifiedBadge type="figure" className="w-3 h-3" />
                          )}
                        </div>
                        <span className="text-[8px] font-mono text-zinc-500 shrink-0">{chat.lastTimestamp}</span>
                      </div>

                      <p className="text-[10px] font-sans text-violet-300/40 truncate leading-tight mt-1">
                        {chat.lastMessage}
                      </p>
                    </div>
                  </div>

                  {/* Quick actions indicator */}
                  <div className="flex items-center gap-1.5 pl-1 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleChatCategory(chat.id);
                      }}
                      className="opacity-0 group-hover/item:opacity-100 p-1 hover:bg-violet-500/20 rounded-md text-zinc-400 hover:text-violet-400 transition-all cursor-pointer"
                      title={generalChatIds.includes(chat.id) ? "Move to Primary Tab" : "Move to General Tab"}
                    >
                      <RefreshCw className="w-2.5 h-2.5 text-violet-400" />
                    </button>
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
            })
          )}

          {activeTab !== 'calls' && filteredChats.length === 0 && (
            <div className="p-8 text-center flex flex-col items-center justify-center gap-3 select-none h-48 py-20">
              <div className="w-12 h-12 rounded-full bg-violet-600/5 border border-violet-500/15 flex items-center justify-center mx-auto text-violet-400/40">
                <MessageSquare className="w-5 h-5 text-violet-500/30" />
              </div>
              <p className="text-[11px] font-black uppercase tracking-wider text-white">No nodes in this register</p>
              <p className="text-[10px] text-zinc-500 leading-normal max-w-[200px]">
                Create a new chat or broadcast channel, and watch your secure ledger populate.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* RIGHT COLUMN: CHAT WINDOW PANEL */}
      {/* ======================================================== */}
      <div className="md:col-span-2 flex flex-col h-full bg-[#05030d] relative overflow-hidden">
        {activeChat ? (
          <>
            {activeChat.isBroadcast ? (
              <div className="flex items-center justify-between p-3.5 border-b border-violet-500/10 bg-[#080516] shrink-0 sticky top-0 z-10 h-16 select-none">
                <div className="flex items-center gap-3 overflow-hidden">
                  <button onClick={() => setActiveChatId('')} className="p-1 text-zinc-400 hover:text-white rounded-full cursor-pointer">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div 
                    className="cursor-pointer relative shrink-0"
                    onClick={() => setIsBroadcastInfoOpen(true)}
                  >
                    <img 
                      src={activeChat.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'} 
                      alt={activeChat.partnerName} 
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/20" 
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute bottom-[-1px] right-[-1px] p-0.5 bg-emerald-500 text-slate-950 rounded-full border border-[#080516]">
                      <Radio className="w-2.5 h-2.5" />
                    </span>
                  </div>
                  <div className="text-left overflow-hidden cursor-pointer" onClick={() => setIsBroadcastInfoOpen(true)}>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-white truncate">{activeChat.partnerName}</h3>
                      <span className="text-[7.5px] font-mono px-1 rounded-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-extrabold uppercase">
                        {activeChat.broadcastMode || 'LIST'}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-emerald-400/80 truncate">
                      {activeChat.broadcastRecipients?.length || 0} Recipients • Secure Fan-out Ledger
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {isLocalSearchOpen ? (
                    <div className="flex items-center bg-slate-950 border border-violet-500/20 rounded-xl px-2.5 py-1 w-44 md:w-56 transition-all duration-300">
                      <Search className="w-3.5 h-3.5 text-violet-400/40 mr-1.5 shrink-0" />
                      <input 
                        type="text"
                        placeholder="Search broadcast ledger..."
                        value={localSearchQuery}
                        onChange={(e) => setLocalSearchQuery(e.target.value)}
                        className="bg-transparent focus:outline-hidden text-[10px] text-white placeholder-violet-400/20 w-full"
                        autoFocus
                      />
                      <button 
                        onClick={() => {
                          setIsLocalSearchOpen(false);
                          setLocalSearchQuery('');
                        }}
                        className="p-0.5 text-zinc-500 hover:text-white cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsLocalSearchOpen(true)}
                      className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-colors cursor-pointer"
                      title="Search Broadcast Ledger Logs"
                    >
                      <Search className="w-4 h-4 text-emerald-400" />
                    </button>
                  )}

                  <button 
                    onClick={() => setIsBroadcastAnalyticsOpen(true)}
                    className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-colors cursor-pointer"
                    title="Real-time Analytics Dashboard"
                  >
                    <BarChart2 className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button 
                    onClick={() => setIsBroadcastInfoOpen(true)}
                    className="p-2 text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-colors cursor-pointer"
                    title="Broadcast Ledger Settings"
                  >
                    <Settings className="w-4 h-4 text-emerald-400" />
                  </button>
                </div>
              </div>
            ) : (
              <ChatHeader
                chat={activeChat}
                status={partnerPresenceAction === 'typing' ? 'Typing...' : partnerPresenceAction === 'recording' ? 'Recording voice...' : partnerPresenceAction === 'uploading' ? 'Uploading...' : activeChat.isPartnerOnline ? 'Online' : 'Offline'}
                onBack={() => setActiveChatId('')}
                onCall={(type) => {
                  const isMessageRequest = activeChat.unreadCount > 3 && !acceptedRequestIds.includes(activeChat.id);
                  if (isMessageRequest) {
                    setShowRequestAlert(true);
                    return;
                  }
                  setActiveCall({ 
                    type, 
                    direction: 'outgoing',
                    partnerName: activeChat.partnerName, 
                    partnerAvatar: activeChat.partnerAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80' 
                  });
                }}
                onViewProfile={() => {
                  if (activeChat.isGroup || activeChat.id === 'group-main' || activeChat.id.startsWith('group-')) {
                    setShowGroupDashboard(true);
                  } else {
                    onViewProfile(activeChat.partnerId);
                  }
                }}
                isVanishMode={disappearingMode}
                onToggleVanishMode={handleToggleVanishMode}
                onSimulateScreenshot={handleSimulateScreenshot}
              />
            )}

            {/* Pinned Messages Banner */}
            {pinnedMessageInChat && (
              <div className="bg-[#1b0a2c] p-2 px-4 border-b border-violet-500/15 flex items-center justify-between text-left select-none relative shrink-0">
                <div 
                  className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                  onClick={() => {
                    const bubble = document.getElementById(`bubble-${pinnedMessageInChat.id}`);
                    bubble?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    window.dispatchEvent(new CustomEvent('toast', { detail: "📍 Scrolled to pinned message" }));
                  }}
                >
                  <Pin className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                  <p className="text-[10px] font-sans text-violet-200 truncate pr-4">
                    Pinned Message: <span className="italic">"{pinnedMessageInChat.content}"</span>
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
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar transition-all duration-300 relative ${
              disappearingMode 
                ? 'bg-[#0f0316] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pink-950/15 via-[#0e0416] to-black' 
                : 'bg-transparent'
            }`}>
              {disappearingMode && (
                <div className="flex flex-col items-center justify-center p-6 mb-4 text-center bg-pink-950/10 border border-pink-500/20 rounded-2xl max-w-sm mx-auto shadow-lg select-none relative overflow-hidden group">
                  {/* Decorative faint grid lines */}
                  <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#e879f9_1px,transparent_1px),linear-gradient(to_bottom,#e879f9_1px,transparent_1px)] bg-[size:12px_12px]" />
                  <div className="w-10 h-10 rounded-full bg-pink-500/20 flex items-center justify-center mb-2.5 border border-pink-500/30 text-pink-400 group-hover:scale-110 transition-transform">
                    <Ghost className="w-5 h-5 animate-bounce" />
                  </div>
                  <h4 className="text-xs font-sans font-black text-pink-400 uppercase tracking-widest leading-none">Vanish Mode Active</h4>
                  <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">
                    Seen messages vanish forever when you exit. Screenshots trigger instant security logs.
                  </p>
                  <button 
                    onClick={handleToggleVanishMode}
                    className="mt-3 px-2.5 py-1 bg-pink-600/30 hover:bg-pink-500/30 border border-pink-500/40 text-pink-400 font-mono text-[8px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                  >
                    Turn Off Vanish Mode
                  </button>
                </div>
              )}

              {renderMessageList()}

              {partnerPresenceAction && activeChat && (
                <div className="flex items-start gap-2.5 max-w-[70%] text-left mt-2 animate-pulse">
                  <img 
                    src={activeChat.partnerAvatar} 
                    alt={activeChat.partnerName} 
                    className="w-7 h-7 rounded-lg object-cover ring-1 ring-violet-500/10" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="rounded-2xl p-2.5 bg-[#09071c]/80 border border-violet-500/10 text-white/90">
                    <div className="flex items-center gap-1.5 text-[9.5px] font-mono text-violet-400">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500"></span>
                      </span>
                      {partnerPresenceAction === 'typing' && 'Typing...'}
                      {partnerPresenceAction === 'recording' && 'Recording audio note...'}
                      {partnerPresenceAction === 'uploading' && 'Uploading media...'}
                    </div>
                  </div>
                </div>
              )}

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

            {/* Dialogue Input Row Composer or Message Request Consent Block */}
            {activeChat.unreadCount > 3 && !acceptedRequestIds.includes(activeChat.id) ? (
              <div className="p-5 border-t border-violet-500/15 bg-gradient-to-b from-[#110a2a]/95 to-[#060410] shrink-0 flex flex-col items-center text-center gap-3.5 select-none animate-fade-in">
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/25 px-3 py-1 rounded-full">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[9px] font-mono tracking-wider text-amber-300 font-extrabold uppercase">Unverified trust ledger request</span>
                </div>
                <div className="space-y-1">
                  <h4 className="text-[11.5px] font-bold text-white font-sans">Trust decision required for secure channel</h4>
                  <p className="text-[10px] text-zinc-400 max-w-[420px] leading-relaxed font-sans">
                    This contact has initiated a secure message request. To start exchanging coordinates, make secure audio calls, or view advanced telemetry, please accept this request.
                  </p>
                </div>
                <div className="flex gap-2.5 w-full max-w-sm mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChatId('');
                      window.dispatchEvent(new CustomEvent('toast', { detail: "✉️ Message request ignored." }));
                    }}
                    className="flex-1 py-2.5 bg-white/5 hover:bg-red-500/10 hover:text-red-300 border border-white/5 rounded-xl text-[9.5px] font-mono uppercase font-black text-zinc-400 transition-all cursor-pointer"
                  >
                    Ignore
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAcceptedRequestIds(prev => [...prev, activeChat.id]);
                      window.dispatchEvent(new CustomEvent('toast', { detail: "🔒 Trust established. Conversational stream active." }));
                    }}
                    className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 via-pink-600 to-pink-500 hover:brightness-110 rounded-xl text-[9.5px] font-mono uppercase font-black text-white transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(139,92,246,0.25)]"
                  >
                    Accept Connection
                  </button>
                </div>
              </div>
            ) : (
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

                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2.5 bg-violet-600/5 hover:bg-violet-600/20 border border-violet-500/10 hover:border-violet-500/20 rounded-xl text-violet-300 cursor-pointer"
                    title="Emoji"
                  >
                    <Smile className="w-4 h-4" />
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
                  {voiceRecordState === 'idle' ? (
                    <button
                      type="button"
                      onClick={() => setVoiceRecordState('recording')}
                      className="p-2.5 bg-violet-600/5 hover:bg-violet-600/20 border border-violet-500/10 rounded-xl text-violet-300 hover:text-white cursor-pointer"
                      title="Start Voice Memo"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  ) : (
                    <VoiceRecorder onSendMessage={handleSendVoiceMessage} onCancel={handleCancelVoiceRecording} />
                  )}

                  <button
                    type="submit"
                    disabled={!typedMessage.trim() && !editingMessageId}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-pink-500 hover:brightness-110 active:scale-98 text-white transition-all flex items-center justify-center disabled:opacity-35 cursor-pointer shrink-0 animate-fade-in"
                  >
                    <Send className="w-4 h-4" />
                  </button>

                  <AttachmentMenu
                    isOpen={showAttachmentSheet}
                    onClose={() => setShowAttachmentSheet(false)}
                    onSelect={(id) => {
                      console.log('Selected attachment:', id);
                      // Handle attachment selection logic
                    }}
                  />

                  <EmojiPicker
                    isOpen={showEmojiPicker}
                    onClose={() => setShowEmojiPicker(false)}
                    onSelect={(emoji) => setTypedMessage(prev => prev + emoji)}
                  />

                </form>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#05030d]">
            <div className="w-16 h-16 rounded-full bg-violet-600/5 border border-violet-500/15 flex items-center justify-center mx-auto text-violet-400/40 mb-4">
              <MessageSquare className="w-8 h-8 text-violet-500/30" />
            </div>
            <p className="font-sans font-black text-white text-base">No messages yet</p>
            <p className="font-sans text-xs text-zinc-500 mt-2 max-w-xs text-center leading-relaxed">
              When someone sends you a message, your conversations will appear here. All conversations on Nexora are fully secure.
            </p>
            <button className="mt-6 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-sans font-bold uppercase tracking-wider transition-all cursor-pointer">
              Start a Conversation
            </button>
          </div>
        )}

        {/* New Group Creation Modal */}
        <NewGroupModal
          isOpen={isCreatingGroupOpen}
          onClose={() => setIsCreatingGroupOpen(false)}
          onCreateGroup={handleCreateGroup}
        />

        {/* New Broadcast Creation Modal */}
        <NewBroadcastModal
          isOpen={isCreatingBroadcastOpen}
          onClose={() => setIsCreatingBroadcastOpen(false)}
          onCreateBroadcast={handleCreateBroadcast}
          availableUsers={availableUsers}
        />

        {/* Broadcast Analytics Dashboard View */}
        <BroadcastAnalyticsView
          isOpen={isBroadcastAnalyticsOpen}
          onClose={() => setIsBroadcastAnalyticsOpen(false)}
          broadcast={activeChat}
        />

        {/* Broadcast Info details & management screen */}
        <BroadcastInfoScreen
          isOpen={isBroadcastInfoOpen}
          onClose={() => setIsBroadcastInfoOpen(false)}
          broadcast={activeChat}
          onDeleteBroadcast={(id) => {
            setChatsList(prev => prev.filter(c => c.id !== id));
            setActiveChatId(null);
            setIsBroadcastInfoOpen(false);
            window.dispatchEvent(new CustomEvent('toast', { detail: "🗑️ Broadcast List successfully deleted." }));
          }}
          onUpdateBroadcast={(id, fields) => {
            setChatsList(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
          }}
          onOpenAnalytics={() => {
            setIsBroadcastInfoOpen(false);
            setIsBroadcastAnalyticsOpen(true);
          }}
          availableUsers={availableUsers}
        />

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
          activeChat={activeChat}
          onUpdateGroup={(updatedFields) => {
            if (!activeChat) return;
            setChatsList(prev => prev.map(c => c.id === activeChat.id ? { ...c, ...updatedFields } : c));
          }}
        />

        {/* Privacy Settings Modal */}
        <PrivacySettingsModal
          isOpen={isPrivacyOpen}
          onClose={() => setIsPrivacyOpen(false)}
          privacy={privacySettings}
          onSavePrivacy={(next) => setPrivacySettings(next)}
        />

        {/* Premium Storage & Data Center Modal */}
        <StorageDataCenterModal
          isOpen={isStorageCenterOpen}
          onClose={() => setIsStorageCenterOpen(false)}
        />

      </div>

      {/* Simulated Call Screen Modal overlays */}
      <CallScreen 
        isOpen={activeCall !== null} 
        type={activeCall?.type || 'voice'} 
        direction={activeCall?.direction || 'outgoing'}
        partnerName={activeCall?.partnerName || ''} 
        partnerAvatar={activeCall?.partnerAvatar || ''} 
        partnerUsername={activeCall?.partnerUsername}
        currentUser={currentUser}
        onSendMessage={(content) => {
          if (!activeChatId) return;
          const newMsg: ExtendedMessage = {
            id: 'msg-' + Date.now(),
            chatId: activeChatId,
            senderId: currentUser.id,
            content: content,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: isOffline ? 'sent' : 'delivered'
          };
          setLocalMessages(prev => ({
            ...prev,
            [activeChatId]: [...(prev[activeChatId] || []), newMsg]
          }));
        }}
        onClose={(completedDuration, endState) => {
          if (activeCall) {
            let logDirection: 'incoming' | 'outgoing' | 'missed' = activeCall.direction;
            if (activeCall.direction === 'incoming') {
              if (endState === 'declined' || endState === 'missed') {
                logDirection = 'missed';
              } else {
                logDirection = 'incoming';
              }
            } else {
              if (endState === 'declined' || endState === 'missed') {
                logDirection = 'outgoing';
              }
            }

            const newLog = {
              id: 'cl-' + Date.now(),
              name: activeCall.partnerName,
              avatar: activeCall.partnerAvatar,
              username: activeCall.partnerUsername,
              type: activeCall.type,
              direction: logDirection,
              duration: completedDuration !== '00:00' ? completedDuration : undefined,
              timestamp: 'Just now'
            };
            setCallLogs(prev => [newLog, ...prev]);

            if (activeChatId) {
              const callText = activeCall.type === 'video' ? 'video call' : 'voice call';
              let systemText = '';
              if (logDirection === 'missed') {
                systemText = `📞 Missed ${callText}`;
              } else if (logDirection === 'incoming') {
                systemText = `📞 Incoming ${callText} ended (${completedDuration})`;
              } else {
                systemText = `📞 Outgoing ${callText} ended (${completedDuration})`;
              }

              const systemMsg: ExtendedMessage = {
                id: 'sys-call-' + Date.now(),
                chatId: activeChatId,
                senderId: 'system',
                content: systemText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                status: 'read'
              };

              setLocalMessages(prev => {
                const chatMsgs = prev[activeChatId] || [];
                return {
                  ...prev,
                  [activeChatId]: [...chatMsgs, systemMsg]
                };
              });
            }
          }
          setActiveCall(null);
        }} 
      />

      {/* Premium Reaction Details Bottom Sheet */}
      <ReactionDetailsSheet
        isOpen={showReactionDetailsMessageId !== null}
        onClose={() => setShowReactionDetailsMessageId(null)}
        message={
          showReactionDetailsMessageId && activeChatId
            ? (localMessages[activeChatId] || []).find(m => m.id === showReactionDetailsMessageId) || null
            : null
        }
        currentUser={currentUser}
        partnerName={activeChat?.partnerName || 'Peer'}
        partnerAvatar={activeChat?.partnerAvatar || ''}
      />

      {/* Message Request Trust Ledger Action Warning Dialog Overlay */}
      <AnimatePresence>
        {showRequestAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRequestAlert(false)}
              className="absolute inset-0 bg-slate-950/85"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#0a071d] border-2 border-amber-500/30 rounded-2xl p-6 z-10 flex flex-col items-center text-center gap-4 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-mono font-black text-amber-400 uppercase tracking-widest">Trust Action Required</h3>
                <p className="text-[11.5px] text-zinc-300 leading-relaxed font-sans">
                  This conversation is still a pending Message Request. You must accept the connection request below before establishing voice or video channels.
                </p>
              </div>
              <div className="flex gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setShowRequestAlert(false)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-[10px] font-mono uppercase font-black text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeChat) {
                      setAcceptedRequestIds(prev => [...prev, activeChat.id]);
                      window.dispatchEvent(new CustomEvent('toast', { detail: "🔒 Trust ledger updated. Connection secure." }));
                    }
                    setShowRequestAlert(false);
                  }}
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-pink-600 hover:brightness-110 rounded-xl text-[10px] font-mono uppercase font-black text-white transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(139,92,246,0.25)]"
                >
                  Accept & Trust
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instagram Notes Composer Modal */}
      <AnimatePresence>
        {activeNoteComposer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveNoteComposer(false)}
              className="absolute inset-0 bg-slate-950/80"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#09071d] border border-violet-500/20 rounded-2xl p-5 z-10 flex flex-col gap-4 shadow-2xl overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 p-3">
                <button 
                  onClick={() => setActiveNoteComposer(false)}
                  className="p-1.5 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-600/20 flex items-center justify-center text-violet-400 shrink-0">
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-xs font-mono font-black text-violet-400 uppercase tracking-widest">Share a Note</h3>
                  <p className="text-[9px] text-zinc-500 uppercase">Visible for 24 hours</p>
                </div>
              </div>

              {/* Note Content Input */}
              <div className="space-y-3">
                {newNoteType === 'text' && (
                  <div className="relative">
                    <textarea
                      maxLength={60}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="What's on your mind? (60 char limit)"
                      className="w-full h-24 p-3 bg-slate-950 border border-violet-500/15 focus:border-[#8B5CF6] rounded-xl text-xs text-white focus:outline-none placeholder-zinc-600 font-sans resize-none"
                    />
                    <div className="absolute bottom-2 right-2 text-[8px] font-mono text-zinc-500 uppercase">
                      {60 - newNoteText.length} left
                    </div>
                  </div>
                )}

                {newNoteType === 'audio' && (
                  <div className="bg-slate-950 border border-violet-500/15 rounded-xl p-4 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                      <Mic className={`w-5 h-5 ${isRecordingNoteAudio ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider">Audio Note Status Creator</p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">Share your voice waves</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRecordingNoteAudio(prev => !prev);
                        window.dispatchEvent(new CustomEvent('toast', { detail: isRecordingNoteAudio ? "🎙️ Audio Note recorded." : "🎤 Recording audio note status..." }));
                      }}
                      className={`px-3 py-1 text-[8px] font-mono font-black uppercase tracking-wider rounded-lg border ${
                        isRecordingNoteAudio 
                          ? 'bg-pink-600/30 text-pink-400 border-pink-500/40 animate-pulse' 
                          : 'bg-violet-600/20 text-violet-400 border-violet-500/30'
                      }`}
                    >
                      {isRecordingNoteAudio ? 'Recording... Tap to stop' : 'Start Soundwave Stream'}
                    </button>
                  </div>
                )}

                {newNoteType === 'video' && (
                  <div className="bg-slate-950 border border-violet-500/15 rounded-xl p-4 flex flex-col items-center justify-center gap-3 text-center">
                    <div className="text-4xl filter drop-shadow-[0_0_8px_rgba(139,92,246,0.3)] animate-bounce select-none">
                      {newNoteVideoEmoji}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-white uppercase tracking-wider">Video Loop Status</p>
                      <p className="text-[9px] text-zinc-500 mt-0.5">Choose an emoji overlay for your bubble</p>
                    </div>
                    <div className="flex gap-2 justify-center">
                      {['🎬', '🧠', '🔮', '🎧', '⚡', '☕'].map(em => (
                        <button
                          key={em}
                          type="button"
                          onClick={() => setNewNoteVideoEmoji(em)}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-violet-500/20 border transition-all ${
                            newNoteVideoEmoji === em ? 'bg-violet-600/20 border-violet-500' : 'bg-transparent border-violet-500/10'
                          }`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Type Selector */}
                <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-violet-500/5">
                  {[
                    { id: 'text', label: '💭 Thought' },
                    { id: 'audio', label: '🎙️ Audio' },
                    { id: 'video', label: '📹 Video' }
                  ].map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setNewNoteType(t.id as any)}
                      className={`flex-1 py-1 rounded-md text-[8px] font-mono uppercase font-black transition-all ${
                        newNoteType === t.id 
                          ? 'bg-violet-600/20 text-violet-400 shadow-inner' 
                          : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Audience Selection */}
                <div className="flex items-center justify-between text-left px-1 mt-2">
                  <span className="text-[9px] font-mono uppercase text-zinc-500 font-extrabold">Who can see this:</span>
                  <div className="flex gap-1.5">
                    {[
                      { id: 'followers', label: 'Followers back', color: 'border-violet-500/20 text-violet-400' },
                      { id: 'close_friends', label: 'Close friends 🟢', color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/5' }
                    ].map(aud => (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => setNewNotePrivacy(aud.id as any)}
                        className={`px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border transition-all ${
                          newNotePrivacy === aud.id 
                            ? aud.color + ' ring-2 ring-violet-500/5' 
                            : 'border-transparent text-zinc-600'
                        }`}
                      >
                        {aud.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <button
                type="button"
                onClick={handleShareNote}
                className="w-full py-2.5 bg-gradient-to-r from-violet-600 to-pink-600 hover:brightness-110 rounded-xl text-[10px] font-mono uppercase font-black text-white transition-all cursor-pointer hover:shadow-[0_0_15px_rgba(139,92,246,0.25)]"
              >
                Share Status Note
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Instagram Note Viewer Modal */}
      <AnimatePresence>
        {activeNoteViewer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveNoteViewer(null)}
              className="absolute inset-0 bg-slate-950/80"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="relative w-full max-w-sm bg-[#09071d] border border-violet-500/20 rounded-2xl p-5 z-10 flex flex-col gap-4 shadow-2xl overflow-hidden text-left"
            >
              <div className="absolute top-0 right-0 p-3">
                <button 
                  onClick={() => setActiveNoteViewer(null)}
                  className="p-1.5 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Creator Card */}
              <div className="flex items-center gap-3">
                <img 
                  src={activeNoteViewer.userAvatar} 
                  alt={activeNoteViewer.userName} 
                  className="w-10 h-10 rounded-xl object-cover ring-2 ring-violet-500/20"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left">
                  <h3 className="text-xs font-bold text-white leading-none">{activeNoteViewer.userName}</h3>
                  <p className="text-[8px] font-mono text-zinc-500 uppercase mt-1 leading-none">
                    {activeNoteViewer.privacy === 'close_friends' ? '🟢 Close Friends' : '👥 Followers you follow back'}
                  </p>
                </div>
              </div>

              {/* Content Bubble */}
              <div className="bg-slate-950 p-4 border border-violet-500/10 rounded-2xl text-left relative overflow-hidden">
                {activeNoteViewer.type === 'audio' ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsNoteAudioPlaying(prev => !prev);
                          if (!isNoteAudioPlaying) {
                            setNoteAudioPlaybackProgress(0);
                            const t = setInterval(() => {
                              setNoteAudioPlaybackProgress(p => {
                                if (p >= 100) {
                                  clearInterval(t);
                                  setIsNoteAudioPlaying(false);
                                  return 0;
                                }
                                return p + 10;
                              });
                            }, 300);
                          }
                        }}
                        className="w-7 h-7 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 hover:bg-violet-600/30 transition-all cursor-pointer"
                      >
                        {isNoteAudioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 pl-0.5" />}
                      </button>
                      <div className="flex-1">
                        <div className="h-1 bg-violet-950 rounded-full overflow-hidden">
                          <div className="h-full bg-violet-500 transition-all duration-300" style={{ width: `${noteAudioPlaybackProgress}%` }} />
                        </div>
                        <span className="text-[7.5px] font-mono text-zinc-500 uppercase mt-1 block">Audio Status Wave</span>
                      </div>
                    </div>
                  </div>
                ) : activeNoteViewer.type === 'video' ? (
                  <div className="flex items-center gap-3">
                    <div className="text-3xl filter drop-shadow-[0_0_5px_rgba(139,92,246,0.3)] select-none">
                      {activeNoteViewer.videoEmoji}
                    </div>
                    <p className="text-xs text-white leading-relaxed font-sans">{activeNoteViewer.text}</p>
                  </div>
                ) : (
                  <p className="text-xs text-white leading-relaxed font-sans font-medium">"{activeNoteViewer.text}"</p>
                )}
              </div>

              {/* Interactive Reply Field */}
              {activeNoteViewer.userId !== currentUser.id ? (
                <div className="space-y-2.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={noteReplyText}
                      onChange={(e) => setNoteReplyText(e.target.value)}
                      placeholder={`Send a DM reply to ${activeNoteViewer.userName}...`}
                      className="w-full pl-3 pr-10 py-2 rounded-xl bg-slate-950 border border-violet-500/10 focus:border-[#8B5CF6] focus:outline-hidden text-xs text-white placeholder-zinc-600 font-sans"
                    />
                    <button
                      type="button"
                      onClick={handleSendNoteReply}
                      className="absolute right-2 top-1.5 p-1 text-violet-400 hover:text-white"
                      title="Send DM reply"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleDeleteMyNote}
                  className="w-full py-2 bg-red-600/15 hover:bg-red-600/25 border border-red-500/30 text-red-400 font-mono text-[9px] font-black uppercase tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Delete My Note
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
