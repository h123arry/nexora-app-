import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, CheckCircle, X, Volume2, VolumeX, SkipForward, Play, Pause, Sparkles, 
  Trash2, Camera, Video, Mic, Check, AlertCircle, Info, Flame,
  Eye, Settings, Share2, MoreVertical, Calendar, Users, Lock, Unlock, Globe,
  Smile, Send, Filter, Sticker, Search, BarChart2, MessageSquare, AlertTriangle, PlayCircle
} from 'lucide-react';
import { User } from '../types';

// Let's declare our rich story item structure
interface StoryItem {
  id: string;
  mediaType: 'photo' | 'video' | 'voice' | 'text' | 'poll' | 'countdown';
  mediaUrl?: string;
  caption: string;
  createdAt: number;
  privacy: 'everyone' | 'followers' | 'close_friends' | 'only_me';
  isCloseFriend?: boolean;
  link?: { text: string; url: string };
  poll?: { question: string; options: { text: string; votes: number }[] };
  countdown?: { title: string; targetDate: string };
  stickers?: { type: 'location' | 'mention' | 'emoji'; content: string; x: number; y: number }[];
  filter?: 'none' | 'vintage' | 'cyberpunk' | 'sunset' | 'cinematic' | 'grayscale';
  bgGradient?: string;
}

interface CreatorStories {
  id: string;
  name: string;
  username: string;
  avatar: string;
  isVerified?: boolean;
  isLive?: boolean;
  stories: StoryItem[];
}

// Relatable high-fidelity default stories
const DEFAULT_CREATORS: CreatorStories[] = [
  {
    id: 'creator-voh',
    name: 'Harrison ✓',
    username: 'voh',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    stories: [
      {
        id: 'v-story-1',
        mediaType: 'photo',
        mediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
        caption: 'Back in the recording studio. Prepping some absolute fire audio telemetry for Nexora! 🎙️🔥',
        createdAt: Date.now() - 3600000 * 2, // 2h ago
        privacy: 'everyone',
        stickers: [{ type: 'location', content: 'Lagos, Nigeria 🇳🇬', x: 10, y: 15 }]
      },
      {
        id: 'v-story-2',
        mediaType: 'voice',
        caption: '🎙️ Harrison Voice Update: A personal audio memo to all creators.',
        createdAt: Date.now() - 3600000 * 1.5,
        privacy: 'everyone',
        bgGradient: 'linear-to-tr from-[#110d2d] via-[#4c1d95] to-[#db2777]'
      },
      {
        id: 'v-story-3',
        mediaType: 'poll',
        caption: 'Afrobeats dominates the global streaming grid. Let\'s settle this once and for all!',
        createdAt: Date.now() - 3600000 * 1,
        privacy: 'everyone',
        bgGradient: 'linear-to-tr from-violet-950 via-slate-900 to-indigo-950',
        poll: {
          question: 'Who reigns supreme in Afrobeats today? 🎵',
          options: [
            { text: 'Davido 👑', votes: 1250 },
            { text: 'Wizkid 🦅', votes: 1420 },
            { text: 'Burna Boy 🦍', votes: 980 },
            { text: 'Rema 💫', votes: 620 }
          ]
        }
      }
    ]
  },
  {
    id: 'creator-nexora',
    name: 'Nexora Official',
    username: 'nexora_official',
    avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    isLive: true,
    stories: [
      {
        id: 'n-story-1',
        mediaType: 'photo',
        mediaUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80',
        caption: 'The absolute visual majesty of the dynamic grid overlay. Tap for details! ⚽📈',
        createdAt: Date.now() - 3600000 * 4,
        privacy: 'everyone',
        filter: 'cinematic',
        link: { text: 'Join Live Match Chat', url: 'https://nexora.social/football' }
      },
      {
        id: 'n-story-2',
        mediaType: 'countdown',
        caption: 'Brace yourselves. The launch of our high-velocity server infrastructure is imminent!',
        createdAt: Date.now() - 3600000 * 3,
        privacy: 'everyone',
        bgGradient: 'linear-to-tr from-[#02010a] via-[#12002b] to-[#1d003b]',
        countdown: {
          title: 'Nexora Immersive Core 4.0 Launch 🚀',
          targetDate: new Date(Date.now() + 3600000 * 24 * 3).toISOString() // 3 days from now
        }
      }
    ]
  },
  {
    id: 'creator-vohai',
    name: 'VOH AI',
    username: 'voh_ai',
    avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80',
    isVerified: true,
    stories: [
      {
        id: 'ai-story-1',
        mediaType: 'photo',
        mediaUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
        caption: 'Ronaldo headers yesterday were completely unreal! Science has no explanation. 🐐🇵🇹',
        createdAt: Date.now() - 3600000 * 1,
        privacy: 'close_friends',
        isCloseFriend: true,
        filter: 'cyberpunk',
        stickers: [{ type: 'mention', content: '@cr7', x: 50, y: 40 }]
      },
      {
        id: 'ai-story-2',
        mediaType: 'text',
        caption: 'Aesthetic synthetic intelligence. Operating on a quantum neural backbone. Hello Nexora circles!',
        createdAt: Date.now() - 30 * 60000, // 30 mins ago
        privacy: 'close_friends',
        isCloseFriend: true,
        bgGradient: 'linear-to-tr from-[#1e1b4b] via-[#311042] to-[#111827]'
      }
    ]
  }
];

// Aesthetic backgrounds for the Story Editor
const EDITOR_BG_GRADIENTS = [
  'linear-to-tr from-[#110d2d] via-[#4c1d95] to-[#db2777]',
  'linear-to-tr from-violet-950 via-slate-900 to-indigo-950',
  'linear-to-tr from-[#02010a] via-[#12002b] to-[#1d003b]',
  'linear-to-tr from-[#1e1b4b] via-[#311042] to-[#111827]',
  'linear-to-tr from-emerald-950 via-slate-900 to-teal-950',
  'linear-to-tr from-rose-950 via-stone-900 to-orange-950'
];

// Curated stock photos for stories upload
const STOCK_PHOTOS = [
  { label: '🎙️ Studio Workspace', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80' },
  { label: '⚽ Football Turf', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=600&auto=format&fit=crop&q=80' },
  { label: '🎸 Live Concert Stage', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80' },
  { label: '🌆 Late Night City', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=600&auto=format&fit=crop&q=80' },
  { label: '🏔️ Cyber Sunset', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=600&auto=format&fit=crop&q=80' },
  { label: '🎨 Abstract Design', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&auto=format&fit=crop&q=80' }
];

// Curated stock video loops for story upload
const STOCK_VIDEOS = [
  { label: '🌌 Deep Space Matrix', url: 'https://assets.mixkit.co/videos/preview/mixkit-stars-in-space-background-1611-large.mp4' },
  { label: '🌊 Synthwave Grid Loop', url: 'https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-city-street-with-neon-lights-40130-large.mp4' }
];

interface StoriesViewProps {
  currentUser: User;
}

export default function StoriesView({ currentUser }: StoriesViewProps) {
  // Creators stories database persisted in localStorage
  const [creators, setCreators] = useState<CreatorStories[]>(() => {
    const saved = localStorage.getItem('nexora_stories_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return DEFAULT_CREATORS;
  });

  // Viewed/seen mapping: creatorUsername -> set of story item ids
  const [seenMap, setSeenMap] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('nexora_stories_seen_v4');
    return saved ? JSON.parse(saved) : {};
  });

  // Analytics for stories (simulated view details)
  const [analytics, setAnalytics] = useState<Record<string, { views: number; forwards: number; profileVisits: number; viewersList: any[] }>>(() => {
    const saved = localStorage.getItem('nexora_stories_analytics_v4');
    if (saved) return JSON.parse(saved);

    // Initial rich mock analytics for pre-populated stories
    return {
      'v-story-1': {
        views: 1245,
        forwards: 12,
        profileVisits: 64,
        viewersList: [
          { id: 'view-1', name: 'Nexora Official ✓', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150', time: '10m ago', reaction: '🔥', reply: 'Lagos studio looking sharp!' },
          { id: 'view-2', name: 'VOH AI ✓', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150', time: '35m ago', reaction: '⚡', reply: 'Neural logs updated.' },
          { id: 'view-3', name: 'Zainab Ahmed 🇳🇬', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', time: '1h ago', reaction: '❤️', reply: 'Can\'t wait for this broadcast!' },
          { id: 'view-4', name: 'Chinedu Okeke', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', time: '2h ago', reaction: '👏' }
        ]
      },
      'v-story-2': {
        views: 948,
        forwards: 5,
        profileVisits: 18,
        viewersList: [
          { id: 'view-1', name: 'Zainab Ahmed 🇳🇬', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', time: '5m ago', reaction: '🔥' },
          { id: 'view-2', name: 'Chinedu Okeke', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', time: '15m ago', reaction: '❤️', reply: 'Awesome voice memo!' }
        ]
      },
      'v-story-3': {
        views: 2410,
        forwards: 42,
        profileVisits: 112,
        viewersList: [
          { id: 'view-1', name: 'Nexora Official ✓', avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150', time: '2m ago', reaction: '👑' },
          { id: 'view-2', name: 'VOH AI ✓', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150', time: '12m ago', reaction: '💫' }
        ]
      },
      'ai-story-1': {
        views: 739,
        forwards: 18,
        profileVisits: 45,
        viewersList: [
          { id: 'view-1', name: 'Harrison ✓', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', time: '3m ago', reaction: '🐐', reply: 'Siuuuu!' }
        ]
      }
    };
  });

  // Syncing DB
  useEffect(() => {
    localStorage.setItem('nexora_stories_v4', JSON.stringify(creators));
  }, [creators]);

  useEffect(() => {
    localStorage.setItem('nexora_stories_seen_v4', JSON.stringify(seenMap));
  }, [seenMap]);

  useEffect(() => {
    localStorage.setItem('nexora_stories_analytics_v4', JSON.stringify(analytics));
  }, [analytics]);

  // General App/Component state
  const [selectedCreator, setSelectedCreator] = useState<CreatorStories | null>(null);
  const [activeCreatorIndex, setActiveCreatorIndex] = useState<number>(0);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  
  // Immersive story progress controls
  const [progress, setProgress] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [storyReply, setStoryReply] = useState<string>('');
  
  // Dynamic reactions & flying emojis state
  const [flyingEmojis, setFlyingEmojis] = useState<{ id: number; emoji: string; x: number; y: number }[]>([]);
  const flyingIdRef = useRef<number>(0);

  // Swipe up stats/viewers dashboard
  const [showAnalyticsDrawer, setShowAnalyticsDrawer] = useState<boolean>(false);
  const [analyticsSearchQuery, setAnalyticsSearchQuery] = useState<string>('');
  const [analyticsSortOrder, setAnalyticsSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Story creation suite states
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [composerType, setComposerType] = useState<'photo' | 'video' | 'text' | 'voice' | 'poll' | 'countdown'>('photo');
  const [composerCaption, setComposerCaption] = useState<string>('');
  const [composerUrl, setComposerUrl] = useState<string>(STOCK_PHOTOS[0].url);
  const [composerGradient, setComposerGradient] = useState<string>(EDITOR_BG_GRADIENTS[0]);
  const [composerFilter, setComposerFilter] = useState<'none' | 'vintage' | 'cyberpunk' | 'sunset' | 'cinematic' | 'grayscale'>('none');
  const [composerPrivacy, setComposerPrivacy] = useState<'everyone' | 'followers' | 'close_friends' | 'only_me'>('everyone');

  // Interactive stickers creator states
  const [stickersList, setStickersList] = useState<{ type: 'location' | 'mention' | 'emoji'; content: string; x: number; y: number }[]>([]);
  const [newStickerType, setNewStickerType] = useState<'location' | 'mention' | 'emoji'>('location');
  const [newStickerContent, setNewStickerContent] = useState<string>('');

  // Interactive polls & countdowns creator states
  const [pollQuestion, setPollQuestion] = useState<string>('');
  const [pollOptions, setPollOptions] = useState<string[]>(['Option 1', 'Option 2']);
  const [countdownTitle, setCountdownTitle] = useState<string>('');
  const [countdownTarget, setCountdownTarget] = useState<string>('');

  // Audio simulation state for voice recorder in editor
  const [isRecordingVoice, setIsRecordingVoice] = useState<boolean>(false);
  const [voiceSeconds, setVoiceSeconds] = useState<number>(0);
  const voiceTimerRef = useRef<any>(null);

  // Audio voice reply simulation in Viewer
  const [isRecordingVoiceReply, setIsRecordingVoiceReply] = useState<boolean>(false);
  const [voiceReplySeconds, setVoiceReplySeconds] = useState<number>(0);
  const voiceReplyTimerRef = useRef<any>(null);

  // Current viewed story reference helper
  const currentStoryItem = selectedCreator?.stories[activeStoryIndex];

  // Global listener for opening story from custom messages view events
  useEffect(() => {
    const handleViewStoryExternal = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { storyId, creatorUsername } = customEvent.detail;
      const cIdx = creators.findIndex(c => c.username === creatorUsername);
      if (cIdx !== -1) {
        const creator = creators[cIdx];
        const sIdx = creator.stories.findIndex(s => s.id === storyId);
        setActiveCreatorIndex(cIdx);
        setActiveStoryIndex(sIdx !== -1 ? sIdx : 0);
        setSelectedCreator(creator);
        setProgress(0);
        setIsPaused(false);
      } else {
        window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Story expired or unretrievable.' }));
      }
    };
    window.addEventListener('viewStory', handleViewStoryExternal);
    return () => window.removeEventListener('viewStory', handleViewStoryExternal);
  }, [creators]);

  // Main immersive timer engine
  useEffect(() => {
    if (!selectedCreator || isPaused || showAnalyticsDrawer) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStorySegment();
          return 0;
        }
        return prev + 1.25; // 100% in 4 seconds
      });
    }, 50);

    return () => clearInterval(timer);
  }, [selectedCreator, activeStoryIndex, activeCreatorIndex, isPaused, showAnalyticsDrawer]);

  // Set story as viewed in seenMap
  useEffect(() => {
    if (selectedCreator && currentStoryItem) {
      const creatorUsername = selectedCreator.username;
      const storyId = currentStoryItem.id;
      
      setSeenMap((prev) => {
        const viewedList = prev[creatorUsername] || [];
        if (!viewedList.includes(storyId)) {
          const updated = { ...prev, [creatorUsername]: [...viewedList, storyId] };
          
          // Increment simulated analytics view count for others
          if (selectedCreator.id !== 'currentUser') {
            setAnalytics(prevAnalytics => {
              const prevItemStats = prevAnalytics[storyId] || { views: 42, forwards: 2, profileVisits: 5, viewersList: [] };
              const userAlreadyInList = prevItemStats.viewersList.some(v => v.name === currentUser.name);
              
              let updatedViewers = [...prevItemStats.viewersList];
              if (!userAlreadyInList) {
                updatedViewers.unshift({
                  id: `viewer-${Date.now()}`,
                  name: currentUser.name,
                  avatar: currentUser.avatar,
                  time: 'Just now'
                });
              }

              return {
                ...prevAnalytics,
                [storyId]: {
                  ...prevItemStats,
                  views: prevItemStats.views + 1,
                  viewersList: updatedViewers
                }
              };
            });
          }
          return updated;
        }
        return prev;
      });
    }
  }, [selectedCreator, activeStoryIndex]);

  // Handle next story navigation
  const handleNextStorySegment = () => {
    if (!selectedCreator) return;

    if (activeStoryIndex < selectedCreator.stories.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
      setProgress(0);
    } else {
      // Move to next creator if available
      if (activeCreatorIndex < creators.length - 1) {
        const nextIdx = activeCreatorIndex + 1;
        setActiveCreatorIndex(nextIdx);
        setActiveStoryIndex(0);
        setSelectedCreator(creators[nextIdx]);
        setProgress(0);
      } else {
        // Close viewer
        handleCloseViewer();
      }
    }
  };

  // Handle previous story navigation
  const handlePrevStorySegment = () => {
    if (!selectedCreator) return;

    if (activeStoryIndex > 0) {
      setActiveStoryIndex((prev) => prev - 1);
      setProgress(0);
    } else {
      // Move to previous creator if available
      if (activeCreatorIndex > 0) {
        const prevIdx = activeCreatorIndex - 1;
        setActiveCreatorIndex(prevIdx);
        const prevCreator = creators[prevIdx];
        setActiveStoryIndex(prevCreator.stories.length - 1);
        setSelectedCreator(prevCreator);
        setProgress(0);
      } else {
        // Reset current progress to 0 since it is the first segment of first creator
        setProgress(0);
      }
    }
  };

  const handleCloseViewer = () => {
    setSelectedCreator(null);
    setProgress(0);
    setIsPaused(false);
    setShowAnalyticsDrawer(false);
    // Stop recording reply if running
    if (isRecordingVoiceReply) {
      stopVoiceReplyRecording(false);
    }
  };

  // Add micro-reactions flying animation and send quote reply inside Messaging
  const handleTriggerReaction = (emoji: string) => {
    if (!selectedCreator || !currentStoryItem) return;

    // 1. Send floating reaction bursts on screen
    const rectXRange = [20, 40, 60, 80];
    for (let i = 0; i < 6; i++) {
      const id = ++flyingIdRef.current;
      const x = rectXRange[i % rectXRange.length] + (Math.random() * 10 - 5);
      const y = 80 - i * 8;
      
      setFlyingEmojis((prev) => [...prev, { id, emoji, x, y }]);
      
      // Cleanup after animation completes
      setTimeout(() => {
        setFlyingEmojis((prev) => prev.filter((item) => item.id !== id));
      }, 1500);
    }

    // 2. Deliver reaction notification inside Direct Messages
    deliverStoryInteractions(emoji);
  };

  // Voice reply simulation recorders
  const startVoiceReplyRecording = () => {
    setIsRecordingVoiceReply(true);
    setVoiceReplySeconds(0);
    setIsPaused(true); // pause story
    voiceReplyTimerRef.current = setInterval(() => {
      setVoiceReplySeconds(prev => prev + 1);
    }, 1000);
  };

  const stopVoiceReplyRecording = (send = true) => {
    clearInterval(voiceReplyTimerRef.current);
    setIsRecordingVoiceReply(false);
    setIsPaused(false); // resume story
    
    if (send && selectedCreator && currentStoryItem) {
      deliverStoryInteractions(`🎙️ HD Audio Reply (${voiceReplySeconds}s)`);
      window.dispatchEvent(new CustomEvent('toast', { detail: '🎙️ Voice note reply delivered!' }));
    }
    setVoiceReplySeconds(0);
  };

  // Inject real quoted story reply/reaction messages into Direct Messages
  const deliverStoryInteractions = (content: string) => {
    if (!selectedCreator || !currentStoryItem) return;

    const creatorId = selectedCreator.id;
    const creatorUsername = selectedCreator.username;

    // Create a robust Direct message object
    const newMsg: any = {
      id: `msg-story-reply-${Date.now()}`,
      chatId: creatorId === 'currentUser' ? 'self' : `chat-${creatorId}`,
      senderId: currentUser.id,
      content: content,
      timestamp: new Date().toISOString(),
      status: 'sent',
      replyToQuote: `Story: "${currentStoryItem.caption || 'Media Update'}"`,
      customMediaType: 'story_reply',
      customMediaData: {
        storyId: currentStoryItem.id,
        mediaUrl: currentStoryItem.mediaUrl || '',
        mediaType: currentStoryItem.mediaType,
        caption: currentStoryItem.caption,
        creatorUsername: creatorUsername,
        timestamp: currentStoryItem.createdAt
      }
    };

    // Load active chats and messages
    const recoveryChatsStr = localStorage.getItem(`nexora_chats_v3_${currentUser.id}`);
    const recoveryMsgsStr = localStorage.getItem(`nexora_msgs_v3_${currentUser.id}`);

    let chatsList = recoveryChatsStr ? JSON.parse(recoveryChatsStr) : [];
    let messagesMap = recoveryMsgsStr ? JSON.parse(recoveryMsgsStr) : {};

    const targetChatId = creatorId === 'currentUser' ? 'self' : `chat-${creatorId}`;
    
    // Check if chat exists, if not, construct it
    let chatIndex = chatsList.findIndex((c: any) => c.id === targetChatId);
    if (chatIndex === -1) {
      chatsList.unshift({
        id: targetChatId,
        name: selectedCreator.name,
        username: selectedCreator.username,
        avatar: selectedCreator.avatar,
        unverified: false,
        unreadCount: 0,
        lastMessage: content,
        lastMessageTime: new Date().toISOString()
      });
    } else {
      chatsList[chatIndex].lastMessage = content;
      chatsList[chatIndex].lastMessageTime = new Date().toISOString();
      // Move to top
      const targetChat = chatsList.splice(chatIndex, 1)[0];
      chatsList.unshift(targetChat);
    }

    // Append message to history list
    const currentChatMsgs = messagesMap[targetChatId] || [];
    messagesMap[targetChatId] = [...currentChatMsgs, newMsg];

    // Persist to local storage
    localStorage.setItem(`nexora_chats_v3_${currentUser.id}`, JSON.stringify(chatsList));
    localStorage.setItem(`nexora_msgs_v3_${currentUser.id}`, JSON.stringify(messagesMap));

    // Display a beautiful visual toast
    window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Replied to @${creatorUsername} successfully!` }));
  };

  const handleSendTextReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyReply.trim()) return;
    deliverStoryInteractions(storyReply.trim());
    setStoryReply('');
  };

  // Story vote helper for polls
  const handleVotePoll = (optionIdx: number) => {
    if (!selectedCreator || !currentStoryItem || !currentStoryItem.poll) return;

    const storyId = currentStoryItem.id;
    setCreators(prev => {
      return prev.map(c => {
        if (c.username === selectedCreator.username) {
          return {
            ...c,
            stories: c.stories.map(s => {
              if (s.id === storyId && s.poll) {
                const updatedOptions = s.poll.options.map((opt, oIdx) => {
                  if (oIdx === optionIdx) {
                    return { ...opt, votes: opt.votes + 1 };
                  }
                  return opt;
                });
                return { ...s, poll: { ...s.poll, options: updatedOptions } };
              }
              return s;
            })
          };
        }
        return c;
      });
    });

    window.dispatchEvent(new CustomEvent('toast', { detail: '🗳️ Your vote has been logged!' }));
    // Also trigger emoji celebration
    handleTriggerReaction('✨');
  };

  // Voice recording logic inside Composer Editor
  const startEditorVoiceRecording = () => {
    setIsRecordingVoice(true);
    setVoiceSeconds(0);
    voiceTimerRef.current = setInterval(() => {
      setVoiceSeconds(prev => prev + 1);
    }, 1000);
  };

  const stopEditorVoiceRecording = () => {
    clearInterval(voiceTimerRef.current);
    setIsRecordingVoice(false);
    setComposerCaption(`🎙️ Broadcast Voice Note (${voiceSeconds}s)`);
    window.dispatchEvent(new CustomEvent('toast', { detail: '🎙️ Voice note recorded. Ready to publish!' }));
  };

  // Sticker editor helpers
  const handleAddSticker = () => {
    if (!newStickerContent.trim()) return;
    const x = Math.floor(Math.random() * 50) + 15; // random x margin percent
    const y = Math.floor(Math.random() * 40) + 30; // random y margin percent
    setStickersList(prev => [...prev, {
      type: newStickerType,
      content: newStickerType === 'mention' && !newStickerContent.startsWith('@') ? `@${newStickerContent}` : newStickerContent,
      x,
      y
    }]);
    setNewStickerContent('');
  };

  const handlePublishStory = (e: React.FormEvent) => {
    e.preventDefault();
    const defaultCaption = composerCaption.trim() || 
      (composerType === 'voice' ? "🎙️ Broadcast Voice Update" : 
       composerType === 'video' ? "🎥 Immersive loop!" : "📸 Vibe check!");

    // Construct the final rich story item
    const newStory: StoryItem = {
      id: `story-${Date.now()}`,
      mediaType: composerType,
      caption: defaultCaption,
      createdAt: Date.now(),
      privacy: composerPrivacy,
      isCloseFriend: composerPrivacy === 'close_friends',
      filter: composerFilter,
      stickers: stickersList.length > 0 ? stickersList : undefined
    };

    if (composerType === 'photo' || composerType === 'video') {
      newStory.mediaUrl = composerUrl;
    } else {
      newStory.bgGradient = composerGradient;
    }

    if (composerType === 'poll' && pollQuestion.trim()) {
      newStory.poll = {
        question: pollQuestion.trim(),
        options: pollOptions.filter(o => o.trim()).map(o => ({ text: o, votes: 0 }))
      };
    }

    if (composerType === 'countdown' && countdownTitle.trim()) {
      newStory.countdown = {
        title: countdownTitle.trim(),
        targetDate: countdownTarget ? new Date(countdownTarget).toISOString() : new Date(Date.now() + 3600000 * 24).toISOString()
      };
    }

    // Append to current user's profile stories
    setCreators(prev => {
      const currentUserIndex = prev.findIndex(c => c.id === 'currentUser');
      const updated = [...prev];

      if (currentUserIndex !== -1) {
        // Pre-existing currentUser profile
        updated[currentUserIndex] = {
          ...updated[currentUserIndex],
          stories: [newStory, ...updated[currentUserIndex].stories]
        };
      } else {
        // Construct new currentUser profile at the top
        const userProfile: CreatorStories = {
          id: 'currentUser',
          name: `${currentUser.name} (You)`,
          username: currentUser.username,
          avatar: currentUser.avatar,
          stories: [newStory]
        };
        updated.unshift(userProfile);
      }
      return updated;
    });

    // Initialize mock empty analytics for creator's newly published story
    setAnalytics(prev => ({
      ...prev,
      [newStory.id]: { views: 0, forwards: 0, profileVisits: 0, viewersList: [] }
    }));

    // Reset editor states
    setComposerCaption('');
    setStickersList([]);
    setComposerType('photo');
    setComposerUrl(STOCK_PHOTOS[0].url);
    setComposerFilter('none');
    setComposerPrivacy('everyone');
    setIsCreateOpen(false);

    window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Story published to Nexora circles!' }));
  };

  // Segmented Ring rendering logic
  const SegmentedRing = ({ creator }: { creator: CreatorStories }) => {
    const storiesCount = creator.stories.length;
    if (storiesCount === 0) return null;

    const viewedList = seenMap[creator.username] || [];
    const viewedCount = creator.stories.filter(s => viewedList.includes(s.id)).length;
    const isCloseFriend = creator.stories.some(s => s.privacy === 'close_friends');
    const isLive = creator.isLive;

    const radius = 28;
    const strokeWidth = 3;
    const size = radius * 2 + strokeWidth * 2;
    const circumference = 2 * Math.PI * radius;

    // Single story element: continuous circle
    if (storiesCount === 1) {
      const color = isLive 
        ? '#ef4444' 
        : isCloseFriend 
          ? '#10b981' 
          : viewedCount === 1 
            ? '#4b5563' 
            : '#a78bfa'; // primary violet
      
      return (
        <svg width={size} height={size} className="absolute inset-0 select-none pointer-events-none -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            className="fill-none stroke-current"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={0}
            style={{ stroke: color }}
          />
        </svg>
      );
    }

    // Segmented ring calculation
    const gapAngle = 6; // degrees gap between segments
    const strokeAngle = (360 / storiesCount) - gapAngle;

    return (
      <svg width={size} height={size} className="absolute inset-0 select-none pointer-events-none -rotate-90">
        {creator.stories.map((story, idx) => {
          const isSegmentSeen = viewedList.includes(story.id);
          const color = isLive 
            ? '#ef4444' 
            : isCloseFriend 
              ? '#10b981' 
              : isSegmentSeen 
                ? '#4b5563' 
                : '#ec4899'; // pink gradient aspect

          const strokeDash = (strokeAngle / 360) * circumference;
          const gapDash = circumference - strokeDash;
          const rotation = idx * (360 / storiesCount);

          return (
            <circle
              key={story.id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              className="fill-none stroke-current transition-all duration-300"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeDash} ${gapDash}`}
              strokeDashoffset={0}
              transform={`rotate(${rotation} ${size / 2} ${size / 2})`}
              style={{ stroke: color }}
            />
          );
        })}
      </svg>
    );
  };

  // Get active analytics record for viewer stats
  const activeStoryStats = currentStoryItem ? analytics[currentStoryItem.id] || { views: 0, forwards: 0, profileVisits: 0, viewersList: [] } : { views: 0, forwards: 0, profileVisits: 0, viewersList: [] };

  // Filter & sort viewers list inside drawer
  const getFilteredViewers = () => {
    let list = [...activeStoryStats.viewersList];
    if (analyticsSearchQuery.trim()) {
      const q = analyticsSearchQuery.toLowerCase();
      list = list.filter(v => v.name.toLowerCase().includes(q) || (v.reply && v.reply.toLowerCase().includes(q)));
    }
    if (analyticsSortOrder === 'oldest') {
      list.reverse();
    }
    return list;
  };

  // Helpers for horizontal drag/swipe between users in viewer
  const handleNextCreator = () => {
    if (activeCreatorIndex < creators.length - 1) {
      const nextIdx = activeCreatorIndex + 1;
      setActiveCreatorIndex(nextIdx);
      setActiveStoryIndex(0);
      setSelectedCreator(creators[nextIdx]);
      setProgress(0);
    } else {
      handleCloseViewer();
    }
  };

  const handlePrevCreator = () => {
    if (activeCreatorIndex > 0) {
      const prevIdx = activeCreatorIndex - 1;
      setActiveCreatorIndex(prevIdx);
      const prevCreator = creators[prevIdx];
      setActiveStoryIndex(prevCreator.stories.length - 1);
      setSelectedCreator(prevCreator);
      setProgress(0);
    }
  };

  // Filter css styling
  const getFilterStyle = (filterName?: string) => {
    switch (filterName) {
      case 'vintage': return 'sepia contrast-125';
      case 'cyberpunk': return 'hue-rotate-60 saturate-200 brightness-105';
      case 'sunset': return 'saturate-150 brightness-95 hue-rotate-15 contrast-105';
      case 'cinematic': return 'contrast-115 brightness-90 saturate-75 shadow-inner';
      case 'grayscale': return 'grayscale contrast-120';
      default: return '';
    }
  };

  return (
    <div className="w-full relative py-2 select-none border-b border-violet-500/5 bg-[#03000f]/40 backdrop-blur-md rounded-2xl p-4">
      
      {/* 1. HORIZONTAL STORY LIST TRAY */}
      <div className="flex items-center gap-4 overflow-x-auto scrollbar-none py-1">
        
        {/* ADD STORY BUTTON */}
        <div className="flex flex-col items-center shrink-0">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="w-16 h-16 rounded-full bg-violet-600/15 hover:bg-violet-600/25 border-2 border-dashed border-violet-500/40 hover:border-violet-400 transition-all flex items-center justify-center relative cursor-pointer group active:scale-95"
            title="Publish New Story"
          >
            <Plus className="w-6 h-6 text-violet-300 group-hover:text-white transition-colors" />
            <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-violet-600 to-pink-500 rounded-full p-1 border-2 border-black">
              <Sparkles className="w-2.5 h-2.5 text-white animate-pulse" />
            </div>
          </button>
          <span className="text-[10px] font-mono text-violet-400/80 font-bold mt-2 uppercase tracking-wide">Add Story</span>
        </div>

        {/* ACTIVE CREATORS CAROUSEL */}
        {creators.map((creator, cIdx) => {
          const isCurrentUser = creator.id === 'currentUser';
          const storiesCount = creator.stories.length;
          const viewedList = seenMap[creator.username] || [];
          const allViewed = creator.stories.every(s => viewedList.includes(s.id));
          const hasCloseFriend = creator.stories.some(s => s.privacy === 'close_friends');

          return (
            <div key={creator.id} className="flex flex-col items-center shrink-0">
              <button
                onClick={() => {
                  setActiveCreatorIndex(cIdx);
                  setActiveStoryIndex(0);
                  setSelectedCreator(creator);
                  setProgress(0);
                  setIsPaused(false);
                }}
                className="w-16 h-16 rounded-full flex items-center justify-center relative active:scale-95 transition-transform cursor-pointer"
              >
                {/* Mathematical dynamically segmented indicator ring wrapper */}
                <SegmentedRing creator={creator} />

                {/* Profile picture inside */}
                <img
                  src={creator.avatar}
                  alt={creator.name}
                  className="w-[48px] h-[48px] rounded-full object-cover border border-black z-10"
                  referrerPolicy="no-referrer"
                />

                {/* Badges indicators overlay */}
                {creator.isLive && (
                  <div className="absolute -top-1 bg-red-600 border border-black rounded-md px-1 py-[1.5px] z-20 text-[7.5px] font-mono font-black text-white uppercase animate-bounce">
                    LIVE
                  </div>
                )}

                {hasCloseFriend && (
                  <div className="absolute -bottom-1 bg-emerald-500 border border-black rounded-full p-[3px] z-20 shadow-md">
                    <Users className="w-2 h-2 text-white" />
                  </div>
                )}
              </button>

              <span className="text-[10px] font-sans font-bold text-violet-100/90 mt-2 flex items-center gap-0.5 max-w-[70px] truncate leading-none">
                {isCurrentUser ? 'Your Story' : creator.name.split(' ')[0]}
                {creator.isVerified && <CheckCircle className="w-2.5 h-2.5 text-pink-400 shrink-0 fill-current" />}
              </span>
            </div>
          );
        })}
      </div>

      {/* 2. IMMERSIVE STORIES VIEWER PORTAL */}
      <AnimatePresence>
        {selectedCreator && currentStoryItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/98 z-50 flex items-center justify-center backdrop-blur-2xl p-0 md:p-4 select-none"
          >
            {/* Absolute background close shield */}
            <div className="absolute inset-0 z-0" onClick={handleCloseViewer} />

            {/* MAIN VIEWER CONTAINER */}
            <motion.div
              initial={{ scale: 0.95, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 50 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              className="relative w-full h-full md:h-[92dvh] max-w-lg mx-auto bg-neutral-950 md:rounded-3xl overflow-hidden shadow-[0_0_80px_rgba(139,92,246,0.35)] flex flex-col justify-between border border-white/5 z-10"
              
              // Horizontal Drag between creators
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.x < -120) {
                  handleNextCreator();
                } else if (offset.x > 120) {
                  handlePrevCreator();
                }
              }}
            >
              
              {/* EDGE-TO-EDGE IMMERSIVE MEDIA FRAME */}
              <div 
                className="absolute inset-0 w-full h-full z-0 flex items-center justify-center"
                onMouseDown={() => setIsPaused(true)}
                onMouseUp={() => setIsPaused(false)}
                onTouchStart={() => setIsPaused(true)}
                onTouchEnd={() => setIsPaused(false)}
              >
                {/* Photo Stories */}
                {currentStoryItem.mediaType === 'photo' && (
                  <img
                    src={currentStoryItem.mediaUrl}
                    alt="Story media"
                    className={`w-full h-full object-cover transition-all duration-300 ${getFilterStyle(currentStoryItem.filter)}`}
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* Video Stories */}
                {currentStoryItem.mediaType === 'video' && (
                  <video
                    src={currentStoryItem.mediaUrl}
                    autoPlay
                    loop
                    muted={isMuted}
                    playsInline
                    className={`w-full h-full object-cover ${getFilterStyle(currentStoryItem.filter)}`}
                  />
                )}

                {/* Voice / Text / Poll / Countdown Gradient Canvas */}
                {['voice', 'text', 'poll', 'countdown'].includes(currentStoryItem.mediaType) && (
                  <div className={`w-full h-full bg-gradient-to-tr ${currentStoryItem.bgGradient || 'from-violet-950 via-slate-900 to-indigo-950'} flex flex-col justify-center items-center px-8 text-center relative overflow-hidden`}>
                    
                    {/* Glowing background matrix sparks */}
                    <div className="absolute top-1/4 left-1/4 w-36 h-36 bg-pink-500/10 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-36 h-36 bg-violet-600/10 rounded-full blur-3xl" />

                    {/* Standard centralized Caption text */}
                    {currentStoryItem.mediaType === 'text' && (
                      <p className="font-sans font-black text-xl md:text-2xl text-white tracking-wide leading-relaxed drop-shadow-lg max-w-sm select-text">
                        "{currentStoryItem.caption}"
                      </p>
                    )}

                    {/* Voice audio simulation wave rendering */}
                    {currentStoryItem.mediaType === 'voice' && (
                      <div className="space-y-6 w-full max-w-xs relative z-10">
                        <div className="w-20 h-20 rounded-full bg-violet-600/20 border border-violet-500/30 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/20">
                          <Mic className="w-10 h-10 text-pink-400 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-mono text-pink-400 uppercase tracking-widest font-extrabold">Streaming HD Voice Story</p>
                          <p className="text-sm font-sans font-bold text-white leading-relaxed">
                            "{currentStoryItem.caption}"
                          </p>
                        </div>
                        {/* Interactive soundwave playback simulator */}
                        <div className="h-10 flex items-center justify-center gap-[4px] px-4 bg-black/30 border border-white/5 rounded-2xl py-1 select-none">
                          {Array.from({ length: 28 }).map((_, waveIdx) => {
                            const waveHeight = isPaused ? 4 : Math.abs(Math.sin(waveIdx * 0.3 + progress * 0.15)) * 26 + 3;
                            return (
                              <div
                                key={waveIdx}
                                style={{ height: `${waveHeight}px` }}
                                className="w-[3px] rounded-full bg-gradient-to-t from-violet-500 to-pink-500 transition-all duration-75"
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Interactive Poll Story rendering */}
                    {currentStoryItem.mediaType === 'poll' && currentStoryItem.poll && (
                      <div className="space-y-6 w-full max-w-xs relative z-10 text-left bg-black/40 border border-white/5 rounded-3xl p-5 backdrop-blur-md">
                        <span className="text-[9px] font-mono font-black uppercase text-pink-400 tracking-widest bg-pink-500/10 px-2.5 py-1 rounded-md">Interactive Poll 🗳️</span>
                        <h4 className="text-md font-sans font-black text-white leading-tight mt-2">
                          {currentStoryItem.poll.question}
                        </h4>
                        <div className="space-y-2.5 mt-3">
                          {currentStoryItem.poll.options.map((opt, oIdx) => {
                            const totalVotes = currentStoryItem.poll?.options.reduce((sum, o) => sum + o.votes, 0) || 1;
                            const votePercent = Math.round((opt.votes / totalVotes) * 100);
                            return (
                              <button
                                key={oIdx}
                                onClick={() => handleVotePoll(oIdx)}
                                className="w-full text-left p-3.5 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/30 text-xs font-sans font-bold relative overflow-hidden group transition-all"
                              >
                                {/* Animated progress percentage backdrop */}
                                <div 
                                  style={{ width: `${votePercent}%` }}
                                  className="absolute inset-y-0 left-0 bg-violet-600/20 transition-all duration-500"
                                />
                                <div className="relative z-10 flex justify-between items-center text-white">
                                  <span>{opt.text}</span>
                                  <span className="text-[10px] font-mono text-violet-300 group-hover:text-white transition-colors">{votePercent}% ({opt.votes})</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Interactive Countdown story rendering */}
                    {currentStoryItem.mediaType === 'countdown' && currentStoryItem.countdown && (
                      <div className="space-y-5 w-full max-w-xs relative z-10 bg-black/40 border border-white/5 rounded-3xl p-5 backdrop-blur-md text-center">
                        <span className="text-[9px] font-mono font-black uppercase text-violet-400 tracking-widest bg-violet-500/10 px-2.5 py-1 rounded-md">Live Countdown ⏳</span>
                        <h4 className="text-md font-sans font-black text-white leading-tight mt-2">
                          {currentStoryItem.countdown.title}
                        </h4>
                        
                        {/* Digital clocks simulation */}
                        <div className="grid grid-cols-4 gap-2 text-center mt-3">
                          {[
                            { val: '02', unit: 'Days' },
                            { val: '14', unit: 'Hrs' },
                            { val: '38', unit: 'Mins' },
                            { val: String(59 - Math.floor((progress/100)*60)).padStart(2, '0'), unit: 'Secs', highlight: true }
                          ].map((c, cIdx) => (
                            <div key={cIdx} className="p-2.5 bg-black/60 rounded-xl border border-white/5">
                              <span className={`text-md font-mono font-black block leading-none ${c.highlight ? 'text-pink-400 animate-pulse' : 'text-white'}`}>
                                {c.val}
                              </span>
                              <span className="text-[8px] font-mono uppercase text-zinc-500 block mt-1">{c.unit}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* STICKERS LAYER */}
              {currentStoryItem.stickers && (
                <div className="absolute inset-0 pointer-events-none z-10">
                  {currentStoryItem.stickers.map((sticker, sIdx) => {
                    const isMention = sticker.type === 'mention';
                    return (
                      <div
                        key={sIdx}
                        style={{ top: `${sticker.y}%`, left: `${sticker.x}%` }}
                        className={`absolute px-3 py-1.5 rounded-xl text-xs font-bold border shadow-lg backdrop-blur-md select-none transform -rotate-3 ${
                          isMention 
                            ? 'bg-pink-500/20 border-pink-500/40 text-pink-300' 
                            : 'bg-black/60 border-white/10 text-white'
                        }`}
                      >
                        {sticker.content}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TOUCH NAVIGATION OVERLAYS (Invisible tap zones left/right) */}
              <div className="absolute inset-0 w-full h-full z-10 pointer-events-none flex">
                <div 
                  className="w-[30%] h-full pointer-events-auto cursor-w-resize" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrevStorySegment();
                  }}
                />
                <div className="w-[40%] h-full pointer-events-auto" />
                <div 
                  className="w-[30%] h-full pointer-events-auto cursor-e-resize" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextStorySegment();
                  }}
                />
              </div>

              {/* OVERLAY UI ELEMENTS (Fades out completely on Long-Press pause) */}
              <div className={`absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/80 to-transparent z-20 space-y-3 transition-all duration-300 ${isPaused ? 'opacity-0 -translate-y-4' : 'opacity-100 translate-y-0'}`}>
                
                {/* A. SEGMENTED PROGRESS BARS */}
                <div className="flex gap-1.5 px-1">
                  {selectedCreator.stories.map((story, idx) => {
                    let fillPercent = 0;
                    if (idx < activeStoryIndex) fillPercent = 100;
                    else if (idx === activeStoryIndex) fillPercent = progress;

                    return (
                      <div key={story.id} className="h-[3px] flex-1 bg-white/20 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${fillPercent}%` }}
                          className="h-full bg-linear-to-r from-violet-400 via-pink-400 to-pink-500"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* B. STORY VIEWER HEADER */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={selectedCreator.avatar} 
                      alt={selectedCreator.name} 
                      className="w-9 h-9 rounded-full object-cover border border-violet-500/30"
                      referrerPolicy="no-referrer"
                    />
                    <div className="leading-tight text-left">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-sans font-black text-white">{selectedCreator.name}</span>
                        {selectedCreator.isVerified && <CheckCircle className="w-3 h-3 text-pink-400 fill-current" />}
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-zinc-400">
                        <span>@{selectedCreator.username}</span>
                        <span>•</span>
                        <span>Active Now</span>
                        {currentStoryItem.privacy === 'close_friends' && (
                          <span className="text-[8px] font-mono text-emerald-400 font-extrabold uppercase bg-emerald-500/10 px-1.5 py-[0.5px] rounded">Close Friends</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Audio Toggle control for video/voice */}
                    {['video', 'voice'].includes(currentStoryItem.mediaType) && (
                      <button 
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-zinc-300 hover:text-white cursor-pointer"
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-white" />}
                      </button>
                    )}

                    <button 
                      onClick={handleCloseViewer}
                      className="p-1.5 rounded-lg bg-black/40 hover:bg-black/60 text-zinc-300 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>

              {/* DESCRIPTION OVERLAY (At bottom of media, just above footer) */}
              <div className={`absolute bottom-[80px] inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-20 text-left space-y-2.5 transition-all duration-300 ${isPaused ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                
                {/* Story quote/caption text underneath photo/videos */}
                {['photo', 'video'].includes(currentStoryItem.mediaType) && currentStoryItem.caption && (
                  <p className="text-[12.5px] text-white font-sans font-bold leading-normal drop-shadow-md select-text">
                    {currentStoryItem.caption}
                  </p>
                )}

                {/* External Attachments Link */}
                {currentStoryItem.link && (
                  <a 
                    href={currentStoryItem.link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/35 hover:bg-violet-600/50 border border-violet-500/30 text-[10.5px] text-violet-200 hover:text-white font-bold tracking-wider select-none uppercase transition-all"
                  >
                    <span>🔗 {currentStoryItem.link.text}</span>
                  </a>
                )}
              </div>

              {/* FLYING MICRO-REACTIONS RENDER CONTAINER */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
                <AnimatePresence>
                  {flyingEmojis.map((e) => (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 350, scale: 0.5, x: `${e.x}%` }}
                      animate={{ opacity: [0, 1, 1, 0], y: [-20, -180, -280, -360], scale: [0.6, 1.3, 1, 0.7] }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 1.4, ease: "easeOut" }}
                      className="absolute text-3xl select-none"
                    >
                      {e.emoji}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* C. STORY VIEWER FOOTER / INTERACTION HUB */}
              <div className={`p-3 bg-black z-20 flex flex-col gap-2 transition-all duration-300 ${isPaused ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                
                {/* QUICK EMOTICONS REACTION ROW */}
                <div className="flex justify-between items-center px-1">
                  {['❤️', '🔥', '😂', '😍', '👏', '😮', '😭', '👍'].map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleTriggerReaction(emoji)}
                      className="text-xl hover:scale-130 active:scale-90 transition-transform cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* REPLY INPUT AREA */}
                {selectedCreator.id === 'currentUser' ? (
                  // Viewer Stats/Views Trigger for Creator's own Story
                  <div className="flex items-center justify-between bg-zinc-900 border border-white/5 rounded-2xl p-2.5 px-4 mt-1 cursor-pointer hover:bg-zinc-800/80 transition-colors"
                    onClick={() => {
                      setIsPaused(true);
                      setShowAnalyticsDrawer(true);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-violet-400" />
                      <span className="text-xs font-sans font-black text-white">{activeStoryStats.views} Views</span>
                      <span className="text-[10px] text-zinc-500 font-mono">({activeStoryStats.viewersList.length} unique viewers)</span>
                    </div>
                    <span className="text-[9px] font-mono text-pink-400 uppercase tracking-wider font-extrabold flex items-center gap-1">
                      <span>Viewers Analytics</span>
                      <SkipForward className="w-3 h-3 rotate-90" />
                    </span>
                  </div>
                ) : (
                  // Form input reply for other users
                  <form onSubmit={handleSendTextReply} className="flex gap-2 items-center mt-1">
                    
                    {/* Voice Reply recorder icon */}
                    {isRecordingVoiceReply ? (
                      <div className="flex-1 flex justify-between items-center p-2 px-3 bg-red-950/40 border border-red-500/20 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                          <span className="text-xs font-mono text-red-400 font-black">Recording: 0:{String(voiceReplySeconds).padStart(2, '0')}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => stopVoiceReplyRecording(false)}
                            className="p-1 px-2.5 text-[10px] font-mono font-bold uppercase rounded-lg bg-zinc-800 text-zinc-300 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => stopVoiceReplyRecording(true)}
                            className="p-1 px-2.5 text-[10px] font-mono font-bold uppercase rounded-lg bg-red-600 text-white flex items-center gap-1 animate-pulse"
                          >
                            <Send className="w-3 h-3" />
                            <span>Send</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder={`Reply to @${selectedCreator.username}...`}
                          value={storyReply}
                          onChange={(e) => setStoryReply(e.target.value)}
                          className="flex-1 bg-zinc-900 border border-white/5 rounded-2xl p-2.5 px-4 text-xs text-white focus:outline-none focus:border-violet-500/50"
                        />
                        
                        {storyReply.trim() ? (
                          <button 
                            type="submit"
                            className="p-2.5 rounded-xl bg-violet-600 text-white cursor-pointer hover:bg-violet-500 transition-colors"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={startVoiceReplyRecording}
                            className="p-2.5 rounded-xl bg-zinc-900 border border-white/5 text-zinc-300 hover:text-white cursor-pointer active:scale-90 transition-transform"
                            title="Record Audio Reply"
                          >
                            <Mic className="w-4 h-4 text-violet-400" />
                          </button>
                        )}
                      </>
                    )}

                  </form>
                )}

              </div>

              {/* 3. STORY CREATOR ANALYTICS SHEET SLIDE UP */}
              <AnimatePresence>
                {showAnalyticsDrawer && (
                  <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", stiffness: 300, damping: 28 }}
                    className="absolute inset-x-0 bottom-0 top-[120px] bg-[#0c0a21]/95 border-t border-white/10 rounded-t-3xl z-40 flex flex-col text-left overflow-hidden shadow-2xl backdrop-blur-xl"
                  >
                    {/* Header bar */}
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                      <div>
                        <h4 className="text-md font-sans font-black text-white flex items-center gap-1.5">
                          <BarChart2 className="w-4.5 h-4.5 text-pink-400" />
                          <span>Story Analytics</span>
                        </h4>
                        <p className="text-[10px] font-mono text-zinc-400">High-fidelity metrics for your published segment</p>
                      </div>
                      <button 
                        onClick={() => {
                          setShowAnalyticsDrawer(false);
                          setIsPaused(false);
                        }}
                        className="p-1 bg-white/5 text-zinc-400 hover:text-white rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Content scroll area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-none">
                      
                      {/* KPI Numbers Grid */}
                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="p-3 bg-black/35 rounded-2xl border border-white/5 text-center">
                          <span className="text-xs font-mono text-violet-400 block uppercase font-bold tracking-widest">Views</span>
                          <span className="text-lg font-mono font-black text-white mt-1 block">{activeStoryStats.views}</span>
                        </div>
                        <div className="p-3 bg-black/35 rounded-2xl border border-white/5 text-center">
                          <span className="text-xs font-mono text-pink-400 block uppercase font-bold tracking-widest">Forwards</span>
                          <span className="text-lg font-mono font-black text-white mt-1 block">{activeStoryStats.forwards}</span>
                        </div>
                        <div className="p-3 bg-black/35 rounded-2xl border border-white/5 text-center">
                          <span className="text-xs font-mono text-emerald-400 block uppercase font-bold tracking-widest">Profile</span>
                          <span className="text-lg font-mono font-black text-white mt-1 block">{activeStoryStats.profileVisits}</span>
                        </div>
                      </div>

                      {/* Advanced telemetry stats */}
                      <div className="space-y-2.5">
                        <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-wider block">Engagement Retention</span>
                        <div className="p-3 bg-black/35 rounded-2xl border border-white/5 space-y-3 text-xs leading-normal">
                          {[
                            { label: 'Completion Rate 📈', val: '86.4%' },
                            { label: 'Average Watch Time ⏳', val: '3.6 seconds' },
                            { label: 'Swipe Away / Dropoff 📉', val: '4.2%' }
                          ].map((stat, sIdx) => (
                            <div key={sIdx} className="flex justify-between items-center">
                              <span className="text-zinc-400 font-sans">{stat.label}</span>
                              <span className="font-mono font-bold text-white">{stat.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Viewers detailed history list */}
                      <div className="space-y-3.5">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-wider block">Viewer List ({getFilteredViewers().length})</span>
                          
                          <select 
                            value={analyticsSortOrder}
                            onChange={(e) => setAnalyticsSortOrder(e.target.value as any)}
                            className="bg-black/40 border border-white/5 text-[10px] text-zinc-300 rounded p-1"
                          >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                          </select>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search viewers, reactions, replies..."
                            value={analyticsSearchQuery}
                            onChange={(e) => setAnalyticsSearchQuery(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 text-xs text-white p-2.5 pl-8 rounded-xl focus:outline-none focus:border-violet-500/50"
                          />
                          <Search className="w-3.5 h-3.5 text-zinc-500 absolute top-3.5 left-2.5" />
                        </div>

                        {/* Viewers Rows */}
                        <div className="space-y-2.5">
                          {getFilteredViewers().length > 0 ? (
                            getFilteredViewers().map((viewer) => (
                              <div key={viewer.id} className="p-3 bg-black/35 rounded-2xl border border-white/5 flex items-start gap-3">
                                <img 
                                  src={viewer.avatar} 
                                  alt={viewer.name} 
                                  className="w-8 h-8 rounded-full object-cover shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-sans font-extrabold text-white">{viewer.name}</span>
                                    <span className="text-[9px] font-mono text-zinc-500">{viewer.time}</span>
                                  </div>
                                  
                                  {/* Viewer reacted block */}
                                  {viewer.reaction && (
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <span className="text-xs bg-white/5 p-1 rounded-md">{viewer.reaction}</span>
                                      <span className="text-[9.5px] font-mono text-pink-400 font-bold uppercase tracking-wider">Reacted</span>
                                    </div>
                                  )}

                                  {/* Viewer reply block */}
                                  {viewer.reply && (
                                    <div className="mt-2 p-2 rounded-xl bg-violet-950/20 border border-violet-500/10 flex items-start gap-1.5">
                                      <MessageSquare className="w-3 h-3 text-violet-400 shrink-0 mt-0.5" />
                                      <p className="text-[10.5px] text-violet-200 leading-normal italic">"{viewer.reply}"</p>
                                    </div>
                                  )}

                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-6 border border-dashed border-white/5 rounded-2xl">
                              <AlertCircle className="w-6 h-6 text-zinc-600 mx-auto mb-2" />
                              <p className="text-xs text-zinc-500">No matching viewers found</p>
                            </div>
                          )}
                        </div>

                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. STORY CREATION / UPLOAD MODAL OVERLAY */}
      <AnimatePresence>
        {isCreateOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4 backdrop-blur-md"
          >
            <div className="absolute inset-0 z-0" onClick={() => setIsCreateOpen(false)} />

            {/* CREATIVE STUDIO PANEL */}
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="relative bg-[#0c0a21] border border-violet-500/20 rounded-3xl p-5 max-w-lg w-full shadow-2xl space-y-4 text-left font-sans max-h-[92vh] overflow-y-auto scrollbar-none z-10"
            >
              {/* Close Button */}
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 text-violet-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="space-y-1">
                <h3 className="text-md font-sans font-black text-white flex items-center gap-1.5">
                  <span className="text-lg">✨</span> Nexora Stories Creator Studio
                </h3>
                <p className="text-[10.5px] font-mono text-violet-400/60 leading-normal">
                  Publish rich immersive status blocks that self-destruct after 24 hours.
                </p>
              </div>

              <form onSubmit={handlePublishStory} className="space-y-4">
                
                {/* A. STORY FORMAT SELECTION TABS */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-mono text-violet-400 block uppercase font-bold">Story Type</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'photo', label: '📸 Photo Story' },
                      { id: 'video', label: '🎥 Loop Video' },
                      { id: 'text', label: '📝 Plain Text' },
                      { id: 'voice', label: '🎙️ Voice Memo' },
                      { id: 'poll', label: '🗳️ Poll Board' },
                      { id: 'countdown', label: '⏳ Countdowns' }
                    ].map((fmt) => (
                      <button
                        key={fmt.id}
                        type="button"
                        onClick={() => {
                          setComposerType(fmt.id as any);
                        }}
                        className={`py-2 px-1.5 rounded-xl font-sans text-[10px] font-bold text-center border transition-all cursor-pointer ${
                          composerType === fmt.id 
                            ? 'bg-violet-600 border-violet-500 text-white' 
                            : 'bg-black/35 border-white/5 text-zinc-400 hover:text-white'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* B. DYNAMIC VALUE EDITORS */}
                
                {/* PHOTO STOCK SELECTION OR LINK */}
                {composerType === 'photo' && (
                  <div className="space-y-2.5">
                    <label className="text-[9.5px] font-mono text-violet-400 block uppercase font-bold">Select Story Photo</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {STOCK_PHOTOS.map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => setComposerUrl(p.url)}
                          className={`rounded-xl overflow-hidden border-2 relative h-14 cursor-pointer transition-all ${
                            composerUrl === p.url ? 'border-pink-500 scale-95' : 'border-transparent opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                          <span className="absolute bottom-1 left-1 right-1 text-[8px] text-center font-bold text-white bg-black/60 p-[1px] rounded">
                            {p.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* VIDEO STOCK LOOP SELECTION */}
                {composerType === 'video' && (
                  <div className="space-y-2.5">
                    <label className="text-[9.5px] font-mono text-violet-400 block uppercase font-bold">Select Video Loops</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {STOCK_VIDEOS.map((v) => (
                        <button
                          key={v.label}
                          type="button"
                          onClick={() => setComposerUrl(v.url)}
                          className={`p-3 rounded-xl bg-black/30 border text-[10px] font-bold text-left text-white flex items-center gap-2 ${
                            composerUrl === v.url ? 'border-pink-500' : 'border-white/5 hover:border-white/10'
                          }`}
                        >
                          <PlayCircle className="w-4 h-4 text-pink-400" />
                          <span className="truncate">{v.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* TEXT GRADIENT PICKER */}
                {['text', 'voice', 'poll', 'countdown'].includes(composerType) && (
                  <div className="space-y-2">
                    <label className="text-[9.5px] font-mono text-violet-400 block uppercase font-bold">Background Gradient</label>
                    <div className="flex gap-2">
                      {EDITOR_BG_GRADIENTS.map((grad) => (
                        <button
                          key={grad}
                          type="button"
                          onClick={() => setComposerGradient(grad)}
                          className={`w-7 h-7 rounded-full bg-gradient-to-tr ${grad} border transition-all ${
                            composerGradient === grad ? 'scale-125 border-white ring-2 ring-violet-500/50' : 'border-transparent'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* VOICE STORY RECORDER REC PANEL */}
                {composerType === 'voice' && (
                  <div className="p-4 bg-black/40 border border-white/5 rounded-2xl text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-red-600/10 border border-red-500/25 flex items-center justify-center mx-auto shadow-md">
                      <Mic className={`w-6 h-6 ${isRecordingVoice ? 'text-red-500 animate-pulse' : 'text-zinc-400'}`} />
                    </div>

                    {isRecordingVoice ? (
                      <div className="space-y-2">
                        <span className="text-xs font-mono text-red-400 font-bold">Live Micro Recording: 0:{String(voiceSeconds).padStart(2, '0')}</span>
                        <div className="h-4 flex items-center justify-center gap-1">
                          {Array.from({ length: 12 }).map((_, i) => (
                            <div 
                              key={i} 
                              style={{ height: `${Math.random() * 12 + 2}px` }}
                              className="w-[2px] bg-red-500 rounded-full" 
                            />
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={stopEditorVoiceRecording}
                          className="px-4 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest mt-1"
                        >
                          Stop and Save
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] text-zinc-400">Press record to start capturing high-definition audio</p>
                        <button
                          type="button"
                          onClick={startEditorVoiceRecording}
                          className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-mono font-bold uppercase tracking-widest mt-1"
                        >
                          Record Microphone
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* POLL BOARD CREATOR */}
                {composerType === 'poll' && (
                  <div className="space-y-2.5 p-3.5 bg-black/35 rounded-2xl border border-white/5">
                    <label className="text-[9.5px] font-mono text-violet-400 block uppercase font-bold">Construct Poll Question</label>
                    <input
                      type="text"
                      placeholder="e.g. Messi vs Ronaldo 👑?"
                      value={pollQuestion}
                      onChange={(e) => setPollQuestion(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500/40"
                    />
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {pollOptions.map((opt, oIdx) => (
                        <input
                          key={oIdx}
                          type="text"
                          placeholder={`Option ${oIdx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const updated = [...pollOptions];
                            updated[oIdx] = e.target.value;
                            setPollOptions(updated);
                          }}
                          className="bg-black/40 border border-white/5 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-violet-500/40"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* COUNTDOWN BOARD CREATOR */}
                {composerType === 'countdown' && (
                  <div className="space-y-2.5 p-3.5 bg-black/35 rounded-2xl border border-white/5">
                    <label className="text-[9.5px] font-mono text-violet-400 block uppercase font-bold">Construct Countdowns</label>
                    <input
                      type="text"
                      placeholder="e.g. Nexora V4.0 Launch Event 🚀"
                      value={countdownTitle}
                      onChange={(e) => setCountdownTitle(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-violet-500/40 mb-2"
                    />
                    <input
                      type="datetime-local"
                      value={countdownTarget}
                      onChange={(e) => setCountdownTarget(e.target.value)}
                      className="w-full bg-black/40 border border-white/5 rounded-xl p-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                )}

                {/* STORY CAPTION FIELD */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-mono text-violet-400 block uppercase font-bold">Story Caption</label>
                  <textarea
                    placeholder="Type what's on your mind..."
                    value={composerCaption}
                    onChange={(e) => setComposerCaption(e.target.value)}
                    rows={2}
                    className="w-full bg-black/35 border border-white/5 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-violet-500/50 resize-none"
                  />
                </div>

                {/* C. VISUAL FILTERS AND DRAGGABLE STICKERS COOPERATOR */}
                {['photo', 'video'].includes(composerType) && (
                  <div className="space-y-3 p-3 bg-black/30 border border-white/5 rounded-2xl">
                    <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-wider block">Visual Customizer</span>
                    
                    {/* Filters Row */}
                    <div className="space-y-1">
                      <span className="text-[8.5px] font-mono text-zinc-400">Select Lens Preset</span>
                      <div className="flex flex-wrap gap-1.5">
                        {['none', 'vintage', 'cyberpunk', 'sunset', 'cinematic', 'grayscale'].map((filt) => (
                          <button
                            key={filt}
                            type="button"
                            onClick={() => setComposerFilter(filt as any)}
                            className={`py-1 px-2 text-[8.5px] font-mono font-black uppercase rounded-lg border cursor-pointer transition-colors ${
                              composerFilter === filt 
                                ? 'bg-pink-600/30 border-pink-500/50 text-white font-bold' 
                                : 'bg-black/30 border-white/5 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {filt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Stickers Row */}
                    <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                      <span className="text-[8.5px] font-mono text-zinc-400">Affix Interactive Sticker Badge</span>
                      <div className="flex gap-2">
                        <select
                          value={newStickerType}
                          onChange={(e) => setNewStickerType(e.target.value as any)}
                          className="bg-black/50 border border-white/5 rounded-lg text-[9px] text-zinc-300 p-1"
                        >
                          <option value="location">📍 Location</option>
                          <option value="mention">👤 Mention</option>
                          <option value="emoji">✨ Sticker Emoji</option>
                        </select>
                        <input
                          type="text"
                          placeholder="Sticker label content..."
                          value={newStickerContent}
                          onChange={(e) => setNewStickerContent(e.target.value)}
                          className="flex-1 bg-black/50 border border-white/5 rounded-lg p-1 text-[9px] text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddSticker}
                          className="px-2.5 bg-violet-600 hover:bg-violet-500 text-white font-mono text-[9px] font-bold rounded-lg uppercase"
                        >
                          + Add
                        </button>
                      </div>

                      {/* Render preview of added stickers */}
                      {stickersList.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {stickersList.map((stk, sIdx) => (
                            <div key={sIdx} className="text-[8px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-zinc-300 flex items-center gap-1 select-none">
                              <span>{stk.content}</span>
                              <button 
                                type="button" 
                                onClick={() => setStickersList(prev => prev.filter((_, i) => i !== sIdx))}
                                className="text-red-400 font-bold hover:text-white font-mono"
                              >
                                x
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* D. PRIVACY SELECTION */}
                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-mono text-violet-400 block uppercase font-bold">Privacy Circle</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'everyone', label: '🌍 Everyone', desc: 'All Nexora users can view' },
                      { id: 'close_friends', label: '🟢 Close Friends', desc: 'Emerald green ring invited circle' }
                    ].map((prv) => (
                      <button
                        key={prv.id}
                        type="button"
                        onClick={() => setComposerPrivacy(prv.id as any)}
                        className={`p-2 rounded-xl text-left border transition-all cursor-pointer ${
                          composerPrivacy === prv.id 
                            ? 'bg-violet-600/15 border-violet-500/50' 
                            : 'bg-black/35 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <span className="text-[10px] font-bold text-white block">{prv.label}</span>
                        <span className="text-[8px] text-zinc-400 block leading-tight mt-0.5">{prv.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* E. SUBMIT BUTTON */}
                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-600 to-pink-500 hover:opacity-90 text-xs font-sans font-black text-white uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg active:scale-98 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 animate-spin-slow" />
                  <span>Publish Story Now</span>
                </button>

              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
