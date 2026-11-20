import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Plus, Users, Check, CheckCheck, Send, MessageSquare, 
  ArrowLeft, ShieldCheck, User as UserIcon, X, Sparkles,
  Paperclip, Image as ImageIcon, Video, Mic, Smile, MoreVertical,
  Phone, Archive, Pin, Trash2, Globe, Quote, Eye, EyeOff, Volume2, Pause, Play, Download
} from 'lucide-react';
import { User, Chat, ExtendedMessage } from '../types';
import { db } from '../lib/firebase';
import { setInboxChatPreference, watchInboxPreferences } from '../services/firebase/inboxPreferencesService';
import { watchInboxChats } from '../services/firebase/chatDirectoryService';
import { createGroupChat } from '../services/firebase/groupChatService';
import { auth } from '../services/firebase/config';
import CreateGroupChatModal from './CreateGroupChatModal';
import { getTranslations } from '../utils/translations';
import { uploadPrivateChatMediaFile, resolvePrivateChatMedia } from '../services/firebase/storageService';
import { aggregateMessageReactions, isSupportedOutgoingMediaType, serializeOutgoingMessage, toggleMessageReaction } from '../utils/messageSerialization';
import { normalizeChatAttachmentContentType, voiceRecordingExtension } from '../utils/chatMediaPolicy';
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy,
  limit,
  startAfter,
  getDocs,
  getDoc,
  type QueryDocumentSnapshot,
  type DocumentData,
  deleteDoc,
  runTransaction,
} from 'firebase/firestore';
import {
  subscribeToTypingState,
  updateMessageReadReceipt,
  updateTypingState,
} from '../services/dataService';
import MessageBubble from './MessageBubble';
import AttachmentMenu from './AttachmentMenu';
import VoiceRecorder from './VoiceRecorder';
import EmojiPicker from './EmojiPicker';
import MediaGallery from './MediaGallery';
import CallScreen from './CallScreen';
import CirclesView from './CirclesView';

interface NewInboxViewProps {
  currentUser: User;
  creators?: User[];
  locale?: string;
}

function readChatIdList(userId: string, key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem('nexora_' + key + '_' + userId) || '[]');
    return Array.isArray(parsed) ? [...new Set(parsed.filter((id): id is string => typeof id === 'string' && id.length > 0))].slice(0, 500) : [];
  } catch { return []; }
}

function chatInitials(name?: string): string {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map(part => part[0]).join('').toUpperCase() : '?';
}

export default function NewInboxView({
  currentUser,
  creators = [],
  locale = 'en'
}: NewInboxViewProps) {
  const copy = getTranslations(locale);
  const isServerBackedInbox = auth.currentUser?.uid === currentUser.id;
  const [chats, setChats] = useState<Chat[]>(() => {
    if (!isServerBackedInbox) return [];
    const saved = localStorage.getItem(`nexora_chats_${currentUser.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  });

  const [localMessages, setLocalMessages] = useState<{ [chatId: string]: ExtendedMessage[] }>(() => {
    if (!isServerBackedInbox) return {};
    const saved = localStorage.getItem(`nexora_messages_${currentUser.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {};
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [inboxTab, setInboxTab] = useState<'chats' | 'groups' | 'circles' | 'requests' | 'archived'>('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const creatorsRef = useRef(creators);
  useEffect(() => { creatorsRef.current = creators; }, [creators]);

  // Interactive chat features
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const sendingMessageRef = useRef(false);
  const attachmentUploadRef = useRef(false);
  const [attachmentProgress, setAttachmentProgress] = useState(0);
  const [pendingAttachmentRetry, setPendingAttachmentRetry] = useState<{ chatId: string; files: File[]; forcedType?: 'image' | 'video' | 'audio' | 'document'; error: string } | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const [activeCall, setActiveCall] = useState<{ type: 'voice' | 'video'; partnerName: string; partnerAvatar: string } | null>(null);
  
  // Message context / reply / edit
  const [activeContextMessageId, setActiveContextMessageId] = useState<string | null>(null);
  const [replyQuoteText, setReplyQuoteText] = useState<string | null>(null);
  const [replyMessageId, setReplyMessageId] = useState<string | null>(null);

  // Pinned & Archived & Muted & Requests state
  const [pinnedChats, setPinnedChats] = useState<string[]>(() => readChatIdList(currentUser.id, 'pinned_chats'));
  const [archivedChats, setArchivedChats] = useState<string[]>(() => readChatIdList(currentUser.id, 'archived_chats'));
  const [messageRequests, setMessageRequests] = useState<Chat[]>([]);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const messageCursorsRef = useRef<Record<string, QueryDocumentSnapshot<DocumentData> | null>>({});
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingStateRef = useRef<'typing' | null>(null);
  const chatPreferenceOwnerRef = useRef(currentUser.id);

  // Persistence
  useEffect(() => {
    localStorage.setItem(`nexora_chats_${currentUser.id}`, JSON.stringify(chats));
  }, [chats, currentUser.id]);

  useEffect(() => {
    localStorage.setItem(`nexora_messages_${currentUser.id}`, JSON.stringify(localMessages));
  }, [localMessages, currentUser.id]);

  useEffect(() => {
    chatPreferenceOwnerRef.current = currentUser.id;
    const legacyPinned = readChatIdList(currentUser.id, 'pinned_chats');
    const legacyArchived = readChatIdList(currentUser.id, 'archived_chats');
    setPinnedChats(legacyPinned);
    setArchivedChats(legacyArchived);
    let firstSnapshot = true;
    return watchInboxPreferences(currentUser.id, preferences => {
      if (chatPreferenceOwnerRef.current !== currentUser.id) return;
      // Migrate existing device-only preferences once, and only when this account
      // has no server preferences yet. Never overwrite a newer cross-device state.
      if (firstSnapshot) {
        firstSnapshot = false;
        if (preferences.length === 0 && (legacyPinned.length > 0 || legacyArchived.length > 0)) {
          const migration = new Map<string, { pinned?: boolean; archived?: boolean }>();
          legacyPinned.forEach(chatId => migration.set(chatId, { ...migration.get(chatId), pinned: true }));
          legacyArchived.forEach(chatId => migration.set(chatId, { ...migration.get(chatId), archived: true }));
          void Promise.allSettled([...migration].map(([chatId, patch]) =>
            setInboxChatPreference(currentUser.id, chatId, patch)
          ));
        }
      }
      setPinnedChats(preferences.filter(item => item.pinned).map(item => item.chatId).slice(0, 500));
      setArchivedChats(preferences.filter(item => item.archived).map(item => item.chatId).slice(0, 500));
    }, error => console.warn('[NEXORA inbox] Chat settings could not be loaded:', error));
  }, [currentUser.id]);

  // Auto scroll
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [localMessages, activeChatId]);

  // The conversation list is account-scoped server data, not a device-local cache.
  // This keeps new conversations and updated previews in sync across signed-in devices.
  useEffect(() => {
    if (!isServerBackedInbox) return;
    return watchInboxChats(currentUser.id, creatorsRef.current, serverChats => {
      setChats(serverChats);
    }, error => {
      console.warn('[NEXORA inbox] Your chat list could not be loaded:', error.message);
    });
  }, [currentUser.id, isServerBackedInbox]);

  // Firestore real-time listener
  useEffect(() => {
    if (!activeChatId || !db) return;

    const messagesRef = collection(db, `chats/${activeChatId}/messages`);
    messageCursorsRef.current[activeChatId] = null;
    setHasOlderMessages(prev => ({ ...prev, [activeChatId]: false }));
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgsList: ExtendedMessage[] = [];
      const seen = new Set<string>();
      [...snapshot.docs].reverse().forEach(doc => {
        if (seen.has(doc.id)) return;
        seen.add(doc.id);
        const data = doc.data();
        msgsList.push({
          id: doc.id,
          ...data,
          reactions: aggregateMessageReactions(data.reactionUsers, data.reactions),
        } as any);
      });

      messageCursorsRef.current[activeChatId] = snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]
        : null;
      setHasOlderMessages(prev => ({ ...prev, [activeChatId]: snapshot.docs.length === 50 }));
      setLocalMessages(prev => {
        const existing = prev[activeChatId] || [];
        const byId = new Map(existing.map(message => [message.id, message]));
        msgsList.forEach(message => byId.set(message.id, message));
        return {
          ...prev,
          [activeChatId]: Array.from(byId.values()).sort((a, b) => (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )),
        };
      });
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, unreadCount: 0 } : c));
      void Promise.all(msgsList
        .filter(message => message.senderId !== currentUser.id && (activeChat?.isGroup
          ? message.recipientReceipts?.[currentUser.id]?.status !== 'read'
          : message.status !== 'read'))
        .map(message => updateMessageReadReceipt(activeChatId, message.id, 'read', Boolean(activeChat?.isGroup))))
        .catch(() => console.warn('[Inbox] Could not update the read status.'));
    }, () => {
      console.warn('[Inbox] Could not load this message.');
    });

    return () => unsubscribe();
  }, [activeChatId, currentUser.id]);

  // Subscribe to the active partner's ephemeral typing state.
  useEffect(() => {
    if (!activeChatId) {
      setPartnerTyping(false);
      return;
    }
    const unsubscribe = subscribeToTypingState(activeChatId, states => {
      setPartnerTyping(Object.entries(states).some(([userId, state]) => userId !== currentUser.id && Boolean(state)));
    });
    return () => {
      unsubscribe?.();
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      void updateTypingState(activeChatId, currentUser.id, null);
      typingStateRef.current = null;
      setPartnerTyping(false);
    };
  }, [activeChatId, currentUser.id]);

  const activeChat = chats.find(c => c.id === activeChatId);
  const activeMessages = activeChatId ? (localMessages[activeChatId] || []) : [];

  // Filtered chats
  const filteredChats = useMemo(() => {
    return chats.filter(chat => {
      const isArchived = archivedChats.includes(chat.id);
      if (inboxTab === 'archived' && !isArchived) return false;
      if ((inboxTab === 'chats' || inboxTab === 'groups') && isArchived) return false;
      if (inboxTab === 'chats' && chat.isGroup) return false;
      if (inboxTab === 'groups' && !chat.isGroup) return false;
      if (inboxTab === 'requests') return messageRequests.some(r => r.id === chat.id);
      if (inboxTab === 'circles') return false;

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

  const tabCounts = useMemo(() => ({
    chats: chats.filter(chat => !chat.isGroup && !archivedChats.includes(chat.id)).length,
    groups: chats.filter(chat => Boolean(chat.isGroup) && !archivedChats.includes(chat.id)).length,
    requests: messageRequests.length,
    archived: chats.filter(chat => archivedChats.includes(chat.id)).length,
  }), [chats, archivedChats, messageRequests]);

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

  const loadOlderMessages = async () => {
    if (!activeChatId || !db || isLoadingOlderMessages || !hasOlderMessages[activeChatId]) return;
    const cursor = messageCursorsRef.current[activeChatId];
    if (!cursor) return;
    const scrollContainer = messagesScrollRef.current;
    const previousScrollHeight = scrollContainer?.scrollHeight || 0;
    setIsLoadingOlderMessages(true);
    try {
      const messagesRef = collection(db, `chats/${activeChatId}/messages`);
      const olderQuery = query(messagesRef, orderBy('timestamp', 'desc'), startAfter(cursor), limit(50));
      const snapshot = await getDocs(olderQuery);
      const olderMessages = [...snapshot.docs].reverse().map(messageDoc => {
        const data = messageDoc.data();
        return {
          id: messageDoc.id,
          ...data,
          reactions: aggregateMessageReactions(data.reactionUsers, data.reactions),
        } as ExtendedMessage;
      });
      messageCursorsRef.current[activeChatId] = snapshot.docs.length > 0
        ? snapshot.docs[snapshot.docs.length - 1]
        : cursor;
      setHasOlderMessages(prev => ({ ...prev, [activeChatId]: snapshot.docs.length === 50 }));
      setLocalMessages(prev => {
        const current = prev[activeChatId] || [];
        const byId = new Map(current.map(message => [message.id, message]));
        olderMessages.forEach(message => byId.set(message.id, message));
        return {
          ...prev,
          [activeChatId]: Array.from(byId.values()).sort((a, b) => (
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )),
        };
      });
      requestAnimationFrame(() => {
        if (scrollContainer) {
          scrollContainer.scrollTop += scrollContainer.scrollHeight - previousScrollHeight;
        }
      });
    } catch {
      console.warn('[Inbox] Could not load older messages.');
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  const handleMessageInputChange = (value: string) => {
    setNewMessageText(value);
    if (!activeChatId) return;
    const nextTypingState = value.trim() ? 'typing' : null;
    if (nextTypingState !== typingStateRef.current) {
      typingStateRef.current = nextTypingState;
      void updateTypingState(activeChatId, currentUser.id, nextTypingState);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (value.trim()) {
      typingTimeoutRef.current = setTimeout(() => {
        typingStateRef.current = null;
        void updateTypingState(activeChatId, currentUser.id, null);
      }, 1200);
    }
  };

  // Send message
  const handleSendMessage = async (customContent?: string, mediaData?: { type: string; url: string; name?: string; duration?: number; contentType?: string; size?: number }) => {
    const contentToSend = customContent !== undefined ? customContent : newMessageText.trim();
    if (!contentToSend && !mediaData) return false;
    if (!activeChatId || sendingMessageRef.current) return false;
    if (mediaData && !isSupportedOutgoingMediaType(mediaData.type)) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'This attachment type is not supported in direct messages.' }));
      return false;
    }

    sendingMessageRef.current = true;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingStateRef.current = null;
    void updateTypingState(activeChatId, currentUser.id, null);

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const nowIso = new Date().toISOString();

    const newMsg: ExtendedMessage = {
      id: messageId,
      chatId: activeChatId,
      senderId: currentUser.id,
      content: contentToSend || (mediaData ? `[${mediaData.type.toUpperCase()}]` : ''),
      timestamp: nowIso,
      status: 'sending',
      replyToQuote: replyQuoteText || undefined,
      customMediaType: mediaData?.type,
      mediaStoragePath: mediaData?.url || undefined,
      mediaType: mediaData?.type === 'voice' ? 'audio' : (mediaData?.type as 'image' | 'video' | 'audio' | 'document' | undefined),
      mediaContentType: mediaData?.contentType,
      fileSize: typeof mediaData?.size === 'number' ? String(mediaData.size) : undefined,
      voiceAudioUrl: mediaData?.type === 'voice' ? mediaData.url : undefined,
      voiceDuration: mediaData?.type === 'voice' && typeof mediaData.duration === 'number' ? `${mediaData.duration}s` : undefined,
      fileName: mediaData?.name
    };

    setReplyQuoteText(null);
    setReplyMessageId(null);

    // Instant local update
    setLocalMessages(prev => ({
      ...prev,
      [activeChatId]: [...(prev[activeChatId] || []), newMsg]
    }));

    const previewText = mediaData ? (mediaData.type === 'voice' ? 'Voice message' : `Sent ${mediaData.type === 'image' ? 'a photo' : mediaData.type === 'video' ? 'a video' : mediaData.type === 'audio' ? 'an audio file' : 'a document'}`) : contentToSend;
    const previousChat = chats.find(chat => chat.id === activeChatId);
    const previousLastMessage = previousChat?.lastMessage || '';
    const previousLastTimestamp = previousChat?.lastTimestamp || '';
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

    // Firestore sync. Optional UI fields are intentionally omitted rather than
    // serialized as `undefined`, which Firestore rejects by default.
    let messagePersisted = false;
    try {
      if (!db) throw new Error('Messaging is temporarily unavailable.');
      const msgDocRef = doc(db, `chats/${activeChatId}/messages`, messageId);
      await setDoc(msgDocRef, serializeOutgoingMessage(newMsg));
      messagePersisted = true;
      setLocalMessages(prev => ({
        ...prev,
        [activeChatId]: (prev[activeChatId] || []).map(message => message.id === messageId
          ? { ...message, status: 'sent', isOfflineUnsent: false }
          : message),
      }));
      if (customContent === undefined) setNewMessageText('');

      // A stale conversation preview must not turn a message that Firestore
      // already accepted into a reported send failure or invite a duplicate retry.
      try {
        await updateDoc(doc(db, 'chats', activeChatId), { lastMessage: previewText, lastTimestamp: nowIso });
      } catch {
        console.warn('[Inbox] Message was sent, but the chat preview could not update yet.');
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Message sent. Your chat will update in a moment.' }));
      }
      return true;
    } catch {
      console.warn('[Inbox] Firestore send error; details redacted.');
      if (!messagePersisted) {
        setLocalMessages(prev => ({
          ...prev,
          [activeChatId]: (prev[activeChatId] || []).map(message => message.id === messageId
            ? { ...message, status: 'failed', isOfflineUnsent: true }
            : message),
        }));
        setChats(prev => prev.map(chat => chat.id === activeChatId && chat.lastTimestamp === nowIso
          ? { ...chat, lastMessage: previousLastMessage, lastTimestamp: previousLastTimestamp }
          : chat));
        if (customContent === undefined && contentToSend) setNewMessageText(value => value || contentToSend);
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Message could not be sent. Your draft is saved. Please try again.' }));
      }
      return false;
    } finally {
      sendingMessageRef.current = false;
    }
  };

  const sendAttachmentFiles = async (fileList: FileList | File[] | null, forcedType?: 'image' | 'video' | 'audio' | 'document') => {
    if (!fileList?.length || !activeChatId || attachmentUploadRef.current) return;
    attachmentUploadRef.current = true;
    const files = Array.from(fileList);
    let currentIndex = 0;
    let uploadInProgress = false;
    setPendingAttachmentRetry(null);
    setIsUploadingAttachment(true);
    try {
      for (let index = 0; index < files.length; index += 1) {
        currentIndex = index;
        const file = files[index];
        const contentType = normalizeChatAttachmentContentType(file.name, file.type);
        const detectedType = forcedType || (contentType.startsWith('image/') ? 'image'
          : contentType.startsWith('video/') ? 'video'
          : contentType.startsWith('audio/') ? 'audio' : 'document');
        setAttachmentProgress(0);
        const normalizedFile = file.type !== contentType
          ? new File([file], file.name, { type: contentType, lastModified: file.lastModified })
          : file;
        uploadInProgress = true;
        const uploaded = await uploadPrivateChatMediaFile({
          file: normalizedFile, userId: currentUser.id, chatId: activeChatId, fileName: file.name,
          onProgress: setAttachmentProgress,
        });
        uploadInProgress = false;
        const sent = await handleSendMessage('', {
          type: detectedType, url: uploaded.storagePath, name: file.name,
          contentType: uploaded.contentType, size: uploaded.size,
        });
        currentIndex = index + 1;
        if (!sent) throw new Error('The attachment uploaded, but its message could not be saved. Use Retry on that message.');
      }
      setPendingAttachmentRetry(null);
      window.dispatchEvent(new CustomEvent('toast', { detail: files.length > 1 ? 'Attachments sent.' : 'Attachment sent.' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Attachment could not be sent. Please retry.';
      const remainingFiles = files.slice(uploadInProgress ? currentIndex : currentIndex);
      if (uploadInProgress && remainingFiles.length) {
        setPendingAttachmentRetry({ chatId: activeChatId, files: remainingFiles, forcedType, error: message });
      } else if (remainingFiles.length > 0) {
        setPendingAttachmentRetry({ chatId: activeChatId, files: remainingFiles, forcedType, error: message });
      }
      window.dispatchEvent(new CustomEvent('toast', { detail: message }));
    } finally {
      attachmentUploadRef.current = false;
      setIsUploadingAttachment(false);
      setAttachmentProgress(0);
    }
  };

  const handleRetryMessage = async (message: ExtendedMessage) => {
    const chatId = message.chatId || activeChatId;
    if (!chatId || !db) return;
    setLocalMessages(previous => ({ ...previous, [chatId]: (previous[chatId] || []).map(item => item.id === message.id ? { ...item, status: 'sending', isOfflineUnsent: false } : item) }));
    try {
      const messageRef = doc(db, `chats/${chatId}/messages`, message.id);
      const existing = await getDoc(messageRef);
      if (!existing.exists()) await setDoc(messageRef, serializeOutgoingMessage(message));
      setLocalMessages(previous => ({ ...previous, [chatId]: (previous[chatId] || []).map(item => item.id === message.id ? { ...item, status: 'sent', isOfflineUnsent: false } : item) }));
      const preview = message.customMediaType === 'voice' ? 'Voice message'
        : message.mediaType === 'image' ? 'Sent a photo'
        : message.mediaType === 'video' ? 'Sent a video'
        : message.mediaType === 'audio' ? 'Sent an audio file'
        : message.mediaType === 'document' ? 'Sent a document' : message.content;
      await updateDoc(doc(db, 'chats', chatId), { lastMessage: preview, lastTimestamp: message.timestamp });
    } catch {
      setLocalMessages(previous => ({ ...previous, [chatId]: (previous[chatId] || []).map(item => item.id === message.id ? { ...item, status: 'failed', isOfflineUnsent: true } : item) }));
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Message still could not be sent. Check your connection and retry.' }));
    }
  };

  const handleStartChatWithUser = async (user: User) => {
    const existingChat = chats.find(chat => chat.partnerId === user.id);
    if (existingChat) {
      setActiveChatId(existingChat.id);
      setShowNewMessageModal(false);
      return;
    }
    if (!db) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Messaging is temporarily unavailable. Please retry.' }));
      return;
    }

    // A stable direct-chat ID prevents both participants from creating separate
    // conversations when they start a chat at nearly the same time.
    const participants = [currentUser.id, user.id].sort();
    const newChatId = `dm-${participants.join('-')}`;
    const nowIso = new Date().toISOString();
    const chatRef = doc(db, 'chats', newChatId);
    try {
      await setDoc(chatRef, {
        id: newChatId,
        participants,
        partnerId: user.id,
        partnerName: user.name,
        partnerAvatar: user.avatar,
        lastMessage: '',
        lastTimestamp: nowIso,
        unreadCount: 0,
        isGroup: false,
      });
    } catch {
      // Another participant may have created the deterministic chat first.
      // Open it only if the server confirms both expected members are present.
      try {
        const existing = await getDoc(chatRef);
        const members = existing.data()?.participants;
        if (!existing.exists() || !Array.isArray(members)
          || !members.includes(currentUser.id) || !members.includes(user.id)) {
          throw new Error('Conversation could not be created.');
        }
      } catch {
        window.dispatchEvent(new CustomEvent('toast', { detail: 'Could not start this conversation. Check your connection or the recipient’s message privacy settings.' }));
        return;
      }
    }

    const newChat: Chat = {
      id: newChatId,
      partnerId: user.id,
      partnerName: user.name,
      partnerAvatar: user.avatar,
      partnerBio: user.bio || '',
      isPartnerOnline: false,
      unreadCount: 0,
      lastMessage: '',
      lastTimestamp: nowIso,
      username: user.username,
      isGroup: false,
    };
    setChats(previous => previous.some(chat => chat.id === newChatId) ? previous : [newChat, ...previous]);
    // Start the message listener only after the participant-bound chat document
    // exists; otherwise Firestore can terminate the initial listener with permission denied.
    setActiveChatId(newChatId);
    setShowNewMessageModal(false);
  };

  const handleReactMessage = async (msgId: string, emoji: string) => {
    if (!activeChatId || !emoji) return;
    const chatId = activeChatId;
    if (!db) {
      setLocalMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map(message => message.id === msgId
          ? {
            ...message,
            reactions: aggregateMessageReactions(
              toggleMessageReaction(undefined, message.reactions, currentUser.id, emoji),
              undefined,
            ),
          }
          : message),
      }));
      return;
    }
    try {
      const messageRef = doc(db, `chats/${chatId}/messages/${msgId}`);
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(messageRef);
        if (!snapshot.exists()) throw new Error('Message no longer exists.');
        const data = snapshot.data();
        const nextReactionUsers = toggleMessageReaction(
          data.reactionUsers,
          data.reactions,
          currentUser.id,
          emoji,
        );
        transaction.update(messageRef, { reactionUsers: nextReactionUsers });
      });
    } catch {
      console.warn('[Inbox] Message reaction sync failed; details redacted.');
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Your reaction could not be saved. Please try again.' }));
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeChatId) return;
    const chatId = activeChatId;
    try {
      if (db) await deleteDoc(doc(db, `chats/${chatId}/messages`, msgId));
      setLocalMessages(prev => ({
        ...prev,
        [chatId]: (prev[chatId] || []).filter(m => m.id !== msgId)
      }));
    } catch {
      console.warn('[Inbox] Could not delete message from Firestore; details redacted.');
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Message was not deleted. Please retry.' }));
    }
  };

  return (
    <div className="nx-page-shell nx-inbox-shell flex flex-col md:flex-row h-full w-full text-white font-sans overflow-hidden relative">
      
      {/* LEFT COLUMN: Conversation List */}
      <div className={`nx-inbox-sidebar w-full md:w-96 border-r border-[var(--nx-edge)] flex flex-col h-full bg-[var(--nx-surface)] ${activeChatId ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Header */}
        <div className="nx-page-header p-4 border-b flex items-center justify-between backdrop-blur-md">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-violet-400" />
            <h1 className="text-base font-black tracking-tight text-white font-sans">{copy.inboxTitle}</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateGroupModal(true)}
              disabled={!isServerBackedInbox}
              className="nx-icon-button inline-flex disabled:opacity-40"
              title={isServerBackedInbox ? copy.inboxCreateGroup : copy.navSignInToPersonalize}
              aria-label={copy.inboxCreateGroup}
            >
              <Users className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowNewMessageModal(true)}
              disabled={!isServerBackedInbox}
              className="nx-icon-button inline-flex bg-violet-600 text-white hover:bg-violet-500"
              title={copy.inboxNewMessage}
              aria-label={copy.inboxNewMessage}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs & Search */}
        <div className="p-3 border-b border-white/5 space-y-3 bg-black/30">
          <div className="nx-segmented flex gap-1 overflow-x-auto text-xs scrollbar-none" role="tablist" aria-label="Messaging sections">
            {([
              { id: 'chats', label: copy.inboxChats, count: tabCounts.chats },
              { id: 'groups', label: 'Groups', count: tabCounts.groups },
              { id: 'circles', label: 'Circles' },
              { id: 'requests', label: copy.inboxRequests, count: tabCounts.requests },
              { id: 'archived', label: copy.inboxArchived, count: tabCounts.archived },
            ] as const).map(tab => (
              <button key={tab.id} type="button" role="tab" onClick={() => {
                setInboxTab(tab.id);
                setActiveChatId(null);
              }} aria-selected={inboxTab === tab.id}
                className={`min-h-10 shrink-0 rounded-lg px-3 font-semibold transition-all ${inboxTab === tab.id ? 'bg-violet-600 text-white shadow-md' : 'text-zinc-400 hover:text-white'}`}>
                {tab.label}{'count' in tab && <span className="ml-1 opacity-75">{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={copy.inboxSearchPlaceholder}
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
              <h3 className="text-sm font-bold text-white mb-1">{!isServerBackedInbox ? 'Sign in to view your conversations' : searchQuery ? copy.inboxNoMatchingConversations : inboxTab === 'requests' ? copy.inboxNoMessageRequests : inboxTab === 'archived' ? copy.inboxNoArchivedConversations : copy.inboxNoConversations}</h3>
              <p className="text-xs text-zinc-400 max-w-xs mb-6 font-sans">
                {!isServerBackedInbox ? 'Your inbox shows real account conversations only. Sample conversations are not displayed.' : searchQuery ? copy.inboxTryDifferent : inboxTab === 'requests' ? copy.inboxNewRequestsHint : inboxTab === 'archived' ? copy.inboxArchivedHint : copy.inboxStartConversationHint}
              </p>
              {isServerBackedInbox && !searchQuery && inboxTab === 'chats' && <button
                onClick={() => setShowNewMessageModal(true)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {copy.inboxStartNewMessage}
              </button>}
            </div>
          ) : (
            filteredChats.map(chat => {
              const isSelected = activeChatId === chat.id;
              const timeDisplay = chat.lastTimestamp 
                ? new Date(chat.lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';
              const isPinned = pinnedChats.includes(chat.id);

              return (
                <button
                  type="button"
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  aria-pressed={isSelected}
                  aria-label={`Open conversation with ${chat.partnerName}${chat.unreadCount > 0 ? `, ${chat.unreadCount} unread messages` : ''}`}
                  className={`flex w-full items-center gap-3 p-3.5 text-left focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-violet-300 transition-all relative group ${
                    isSelected ? 'bg-violet-500/12 border-l-4 border-violet-400' : 'hover:bg-violet-500/[0.06]'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-violet-500/15 text-sm font-bold text-violet-200 shadow-md">
                    {chatInitials(chat.partnerName)}
                    {chat.partnerAvatar && <img src={chat.partnerAvatar} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true; }} className="absolute inset-0 h-full w-full rounded-2xl object-cover" />}
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
                </button>
              );
            })
          )}
        </div>
      </div>

      {inboxTab === 'circles' && <section className="min-w-0 flex-1 h-full overflow-y-auto bg-[var(--nx-canvas)] p-3 sm:p-5" aria-label="Circles"><CirclesView currentUser={currentUser} /></section>}

      {/* RIGHT COLUMN: Active Chat Screen */}
      <div className={`nx-inbox-chat flex-1 flex flex-col h-full bg-[var(--nx-canvas)] ${inboxTab === 'circles' ? 'hidden' : !activeChatId ? 'hidden md:flex' : 'flex'}`}>
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0D0A20]/90 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveChatId(null)}
                  className="md:hidden p-2 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-300 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="sr-only">{copy.inboxBack}</span>
                </button>

                <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-violet-500/15 text-xs font-bold text-violet-200 shadow-md">
                  {chatInitials(activeChat.partnerName)}
                  {activeChat.partnerAvatar && <img src={activeChat.partnerAvatar} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true; }} className="absolute inset-0 h-full w-full rounded-xl object-cover" />}
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
                      <span className="text-violet-400 animate-pulse font-bold">{copy.inboxTyping}</span>
                    ) : activeChat.isPartnerOnline ? (
                      copy.inboxActiveNow
                    ) : (
                      copy.inboxOffline
                    )}
                  </p>
                </div>
              </div>

              {/* Conversation organisation controls; saved per account on this device. */}
              <div className="flex items-center gap-1.5">
                <button type="button" aria-pressed={pinnedChats.includes(activeChat.id)} onClick={() => { const pinned = !pinnedChats.includes(activeChat.id); setPinnedChats(previous => pinned ? [activeChat.id, ...previous].slice(0, 500) : previous.filter(id => id !== activeChat.id)); void setInboxChatPreference(currentUser.id, activeChat.id, { pinned }).catch(error => console.warn('[NEXORA inbox] Could not sync pin:', error)); }} className="p-2 rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:text-violet-200" title={pinnedChats.includes(activeChat.id) ? 'Unpin conversation' : 'Pin conversation'}><Pin className="w-4 h-4" /></button>
                <button type="button" aria-pressed={archivedChats.includes(activeChat.id)} onClick={() => { const isArchived = archivedChats.includes(activeChat.id); setArchivedChats(previous => isArchived ? previous.filter(id => id !== activeChat.id) : [...previous, activeChat.id].slice(-500)); void setInboxChatPreference(currentUser.id, activeChat.id, { archived: !isArchived }).catch(error => console.warn('[NEXORA inbox] Could not sync archive:', error)); if (!isArchived) setActiveChatId(null); }} className="p-2 rounded-xl border border-white/10 bg-white/5 text-zinc-300 hover:text-violet-200" title={archivedChats.includes(activeChat.id) ? 'Restore conversation' : 'Archive conversation'}><Archive className="w-4 h-4" /></button>
              </div>
              {/* Call & Media Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={`Start a voice call with ${activeChat.partnerName}`}
                  onClick={() => setActiveCall({ type: 'voice', partnerName: activeChat.partnerName, partnerAvatar: activeChat.partnerAvatar })}
                  className="p-2.5 bg-white/5 hover:bg-violet-600/30 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label={`View media and files shared with ${activeChat.partnerName}`}
                  onClick={() => setShowMediaGallery(true)}
                  className="p-2.5 bg-white/5 hover:bg-violet-600/30 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Media & Files"
                >
                  <ImageIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div
              ref={messagesScrollRef}
              onScroll={(event) => {
                if (event.currentTarget.scrollTop < 120) void loadOlderMessages();
              }}
              className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/15 via-black to-black"
            >
              {isLoadingOlderMessages && (
                <div className="py-2 text-center text-[10px] font-mono text-violet-300/70">Loading older messages…</div>
              )}
              {activeMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <div className="w-12 h-12 rounded-2xl bg-violet-500/10 border border-white/10 flex items-center justify-center text-violet-400 mb-3 shadow-sm">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-white mb-1 font-sans">Secure conversation started</h4>
                  <p className="text-[11px] text-zinc-500 max-w-xs font-sans">
                    Send a message, photo, video, document or voice note to {activeChat.partnerName}.
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
                      onRetry={handleRetryMessage}
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
                      onResolveVoiceMedia={resolvePrivateChatMedia}
                      onLongPress={() => {}}
                      playingVoiceId={null}
                      voiceProgress={0}
                      voicePlaybackSpeed={1}
                      currentUserId={currentUser.id}
                      isPinned={false}
                      groupReadCount={activeChat?.isGroup ? Object.values(msg.recipientReceipts || {}).filter(receipt => receipt.status === 'read').length : 0}
                      groupRecipientCount={activeChat?.isGroup ? Math.max(0, (activeChat.membersCount || 0) - 1) : 0}
                    />
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {pendingAttachmentRetry?.chatId === activeChatId && (
              <div className="mx-3 mb-2 flex items-center gap-3 rounded-xl border border-rose-400/20 bg-rose-500/[0.06] px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-white">Couldn't send {pendingAttachmentRetry.files.length === 1 ? pendingAttachmentRetry.files[0].name : `${pendingAttachmentRetry.files.length} attachments`}</p>
                  <p className="truncate text-[10px] text-zinc-400">{pendingAttachmentRetry.error}</p>
                </div>
                <button type="button" onClick={() => { const retry = pendingAttachmentRetry; setPendingAttachmentRetry(null); void sendAttachmentFiles(retry.files, retry.forcedType); }} className="rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-semibold text-white">Retry</button>
                <button type="button" onClick={() => setPendingAttachmentRetry(null)} className="rounded-lg p-2 text-zinc-400 hover:text-white" aria-label="Dismiss attachment retry"><X className="h-4 w-4" /></button>
              </div>
            )}

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
                {isUploadingAttachment && <span role="status" className="max-w-16 text-[9px] text-violet-200">{attachmentProgress}%</span>}
                <button
                  type="button"
                  aria-label="Open attachment options"
                  onClick={() => setShowAttachmentMenu(true)}
                  className="p-2.5 bg-white/5 hover:bg-violet-600/30 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Attach"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  aria-label={showEmojiPicker ? "Close emoji picker" : "Open emoji picker"}
                  aria-expanded={showEmojiPicker}
                  onClick={() => setShowEmojiPicker(prev => !prev)}
                  className="p-2.5 bg-white/5 hover:bg-violet-600/30 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Emoji"
                >
                  <Smile className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => handleMessageInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  aria-label="Message"
                  placeholder="Type a message..."
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-all font-sans"
                />

                <button
                  type="button"
                  aria-label="Record a voice note"
                  onClick={() => setShowVoiceRecorder(true)}
                  className="p-2.5 bg-white/5 hover:bg-violet-600/30 text-zinc-300 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Voice Note"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  aria-label="Send message"
                  onClick={() => handleSendMessage()}
                  disabled={!newMessageText.trim() || isUploadingAttachment}
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
                <h3 className="text-sm font-bold text-white font-sans">{copy.inboxNewMessage}</h3>
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
                    <button
                      type="button"
                      key={user.id}
                      onClick={() => handleStartChatWithUser(user)}
                      aria-label={`Start a conversation with ${user.name}`}
                      className="w-full text-left flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-[-2px]"
                    >
                      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-violet-500/15 text-xs font-bold text-violet-200">
                        {chatInitials(user.name)}
                        {user.avatar && <img src={user.avatar} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true; }} className="absolute inset-0 h-full w-full rounded-xl object-cover" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate font-sans">{user.name}</span>
                          {user.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-violet-400" />}
                        </div>
                        <p className="text-[10px] text-zinc-500 font-mono truncate">@{user.username}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CreateGroupChatModal
        isOpen={showCreateGroupModal && isServerBackedInbox}
        locale={locale}
        currentUserId={currentUser.id}
        creators={creators}
        onClose={() => setShowCreateGroupModal(false)}
        onCreate={async (name, description, participantIds) => {
          const created = await createGroupChat(name, description, participantIds);
          setShowCreateGroupModal(false);
          setInboxTab('chats');
          setActiveChatId(created.chatId);
          window.dispatchEvent(new CustomEvent('toast', { detail: copy.inboxGroupCreatedNotice }));
        }}
      />

      <input ref={galleryInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={event => { void sendAttachmentFiles(event.target.files); event.currentTarget.value = ''; }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={event => { void sendAttachmentFiles(event.target.files, 'image'); event.currentTarget.value = ''; }} />
      <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={event => { void sendAttachmentFiles(event.target.files, 'video'); event.currentTarget.value = ''; }} />
      <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.rtf,.md,.json,.xml,.zip,.7z,.rar,.tar,.gz,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.text,application/vnd.oasis.opendocument.spreadsheet,application/vnd.oasis.opendocument.presentation,text/plain,text/csv,application/rtf,application/json,application/xml,application/zip" className="hidden" onChange={event => { void sendAttachmentFiles(event.target.files, 'document'); event.currentTarget.value = ''; }} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={event => { void sendAttachmentFiles(event.target.files, 'audio'); event.currentTarget.value = ''; }} />

      {/* ATTACHMENT MENU */}
      <AttachmentMenu
        isOpen={showAttachmentMenu}
        onClose={() => setShowAttachmentMenu(false)}
        onSelect={(id) => {
          if (id === 'camera') cameraInputRef.current?.click();
          else if (id === 'gallery') galleryInputRef.current?.click();
          else if (id === 'video') videoInputRef.current?.click();
          else if (id === 'document') documentInputRef.current?.click();
          else if (id === 'audio') audioInputRef.current?.click();
          else window.dispatchEvent(new CustomEvent('toast', { detail: `${id} is not available in this chat yet.` }));
        }}
      />

      {/* VOICE RECORDER */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onSendMessage={async (audioBlob, duration) => {
            if (!activeChatId) throw new Error('Open a conversation before sending a voice note.');
            const contentType = normalizeChatAttachmentContentType(`voice.${voiceRecordingExtension(audioBlob.type)}`, audioBlob.type);
            const uploadBlob = audioBlob.type.split(';')[0].trim().toLowerCase() === contentType
              ? audioBlob
              : new Blob([audioBlob], { type: contentType });
            const uploaded = await uploadPrivateChatMediaFile({
              file: uploadBlob,
              userId: currentUser.id,
              chatId: activeChatId,
              fileName: `voice-note-${Date.now()}.${voiceRecordingExtension(contentType)}`,
            });
            const sent = await handleSendMessage('', {
              type: 'voice', url: uploaded.storagePath,
              name: `Voice Note (${duration}s)`, duration, contentType: uploaded.contentType, size: uploaded.size
            });
            if (!sent) throw new Error('Your voice note uploaded, but the message could not be saved. Please retry.');
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
          chatId={activeChat.id}
          chatPartnerName={activeChat.partnerName}
          currentUserId={currentUser.id}
          messages={activeMessages}
          hasMoreHistory={Boolean(activeChatId && hasOlderMessages[activeChatId])}
          isLoadingOlder={isLoadingOlderMessages}
          onLoadOlder={() => void loadOlderMessages()}
        />
      )}

      {/* CALL SCREEN */}
      {activeCall && (
        <CallScreen
          isOpen={Boolean(activeCall)}
          type={activeCall.type}
          partnerName={activeCall.partnerName}
          onClose={() => setActiveCall(null)}
        />
      )}

    </div>
  );
}
