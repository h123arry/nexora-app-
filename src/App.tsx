import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  HelpCircle, 
  X, 
  Radio, 
  Code, 
  Share2,
  Bell,
  Check,
  Send,
  Home,
  Globe,
  Plus,
  User as UserIcon,
  Search,
  MessageSquare
} from 'lucide-react';

import {
  Camera,
  Video as VideoIcon,
  Mic,
  BarChart2,
  FileText,
  Award,
  Users as UsersIcon,
  MapPin,
  Smile,
  ChevronRight,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  Eye,
  WifiOff,
  FolderOpen
} from 'lucide-react';

import { 
  User, 
  Post, 
  Chat, 
  Message, 
  Notification, 
  ThemeMood 
} from './types';

import { 
  getRichUser, 
  followUserDb, 
  unfollowUserDb, 
  createPostDb, 
  isFollowingDb,
  INITIAL_USER, 
  MOCK_CREATORS, 
  INITIAL_POSTS, 
  INITIAL_CHATS, 
  INITIAL_MESSAGES, 
  INITIAL_NOTIFICATIONS,
  ADDITIONAL_TEST_ACCOUNTS
} from './data/database';
import { TRANSLATIONS } from './utils/translations';
import { resolveMediaUrl } from './utils/indexedDbStorage';
import { recordRecommendationEvent } from './utils/recommendations';
import { globalVideoPlaybackManager } from './utils/VideoPlaybackManager';

import Sidebar from './components/Sidebar';
import RightSidebar from './components/RightSidebar';
import FeedView from './components/FeedView';
import ProfileView from './components/ProfileView';
import NotificationsView from './components/NotificationsView';
import WorldPulseView from './components/WorldPulseView';
import MatrixView from './components/MatrixView';
import AuthView from './components/AuthView';
import AdminDashboardView from './components/AdminDashboardView';
import MediaCreationEngine from './components/MediaCreationEngine';
import ExploreView from './components/ExploreView';
import InboxView from './components/InboxView';
import SystemHubControlPanel from './components/SystemHubControlPanel';
import NidaView from './components/NidaView';

export default function App() {
  // 1. Core State Orchestrator
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('nexora_user');
    const user = saved ? JSON.parse(saved) : INITIAL_USER;
    
    // Reset all temporary development balances to 0 for V1.1
    user.nexBalance = 0;
    user.thisWeekEarnedNex = 0;
    
    return user;
  });

  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem('nexora_logged_in');
    return saved === 'true';
  });

  // List of saved/remembered accounts on this device for multi-account switching
  const [savedAccounts, setSavedAccounts] = useState<User[]>(() => {
    try {
      const stored = localStorage.getItem('nexora_saved_accounts');
      const loaded = stored ? JSON.parse(stored) : [];
      return loaded;
    } catch (e) {
      return [];
    }
  });

  const [isLogoutConfirming, setIsLogoutConfirming] = useState(false);

  // Sync current user into savedAccounts array if logged in
  useEffect(() => {
    if (isLoggedIn && currentUser && currentUser.id) {
      setSavedAccounts(prev => {
        const exists = prev.some(acc => acc.id === currentUser.id);
        if (exists) {
          return prev.map(acc => acc.id === currentUser.id ? currentUser : acc);
        }
        return [...prev, currentUser];
      });
    }
  }, [currentUser, isLoggedIn]);

  useEffect(() => {
    const handleSwitchIdentity = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetUser = customEvent.detail;
      if (targetUser) {
        setCurrentUser(targetUser);
        localStorage.setItem('nexora_user', JSON.stringify(targetUser));
        window.dispatchEvent(new CustomEvent('toast', { detail: `🔄 Switched active identity to @${targetUser.username}` }));
      }
    };
    window.addEventListener('nexora-switch-identity', handleSwitchIdentity);
    return () => window.removeEventListener('nexora-switch-identity', handleSwitchIdentity);
  }, []);

  // Sync savedAccounts to localStorage
  useEffect(() => {
    localStorage.setItem('nexora_saved_accounts', JSON.stringify(savedAccounts));
  }, [savedAccounts]);

  const [posts, setPosts] = useState<Post[]>(() => {
    const saved = localStorage.getItem('nexora_posts');
    const loadedPosts = saved ? JSON.parse(saved) : INITIAL_POSTS;
    return loadedPosts;
  });

  const [resolvedPosts, setResolvedPosts] = useState<Post[]>([]);

  // User-scoped sparks and bookmarks states
  const [userBookmarks, setUserBookmarks] = useState<string[]>(() => {
    const savedUser = localStorage.getItem('nexora_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.id) {
          const saved = localStorage.getItem(`nexora_bookmarks_${u.id}`);
          return saved ? JSON.parse(saved) : [];
        }
      } catch (e) {}
    }
    return [];
  });

  const [userSparks, setUserSparks] = useState<string[]>(() => {
    const savedUser = localStorage.getItem('nexora_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.id) {
          const saved = localStorage.getItem(`nexora_sparks_${u.id}`);
          return saved ? JSON.parse(saved) : [];
        }
      } catch (e) {}
    }
    return [];
  });

  useEffect(() => {
    let active = true;
    const resolveAll = async () => {
      const updated = await Promise.all(posts.map(async (post) => {
        let modified = false;
        let vUrl = post.videoUrl;
        let aUrl = post.voiceAudioUrl;

        if (vUrl && vUrl.startsWith('db-media://')) {
          vUrl = await resolveMediaUrl(vUrl);
          modified = true;
        }
        if (aUrl && aUrl.startsWith('db-media://')) {
          aUrl = await resolveMediaUrl(aUrl);
          modified = true;
        }

        const isLikedByUser = userSparks.includes(post.id);
        const isBookmarkedByUser = userBookmarks.includes(post.id);

        if (modified || post.isLikedByUser !== isLikedByUser || post.isBookmarkedByUser !== isBookmarkedByUser) {
          return { 
            ...post, 
            videoUrl: vUrl, 
            voiceAudioUrl: aUrl,
            isLikedByUser,
            isBookmarkedByUser
          };
        }
        return post;
      }));
      if (active) {
        setResolvedPosts(updated);
      }
    };
    resolveAll();
    return () => { active = false; };
  }, [posts, userSparks, userBookmarks]);

  const [chats, setChats] = useState<Chat[]>(() => {
    const savedUser = localStorage.getItem('nexora_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.id) {
          const saved = localStorage.getItem(`nexora_chats_${u.id}`);
          return saved ? JSON.parse(saved) : INITIAL_CHATS;
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem('nexora_chats');
    return saved ? JSON.parse(saved) : INITIAL_CHATS;
  });

  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>(() => {
    const savedUser = localStorage.getItem('nexora_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.id) {
          const saved = localStorage.getItem(`nexora_messages_${u.id}`);
          return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem('nexora_messages');
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    let saved = null;
    const savedUser = localStorage.getItem('nexora_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.id) {
          saved = localStorage.getItem(`nexora_notifications_${u.id}`);
        }
      } catch (e) {}
    }
    if (!saved) {
      saved = localStorage.getItem('nexora_notifications');
    }
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const seen = new Set<string>();
          return parsed.filter((n: any) => {
            if (!n || !n.id) return false;
            if (seen.has(n.id)) return false;
            seen.add(n.id);
            return true;
          });
        }
      } catch (e) {
        console.error("Failed to parse notifications:", e);
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [followingIds, setFollowingIds] = useState<string[]>(() => {
    const savedUser = localStorage.getItem('nexora_user');
    if (savedUser) {
      try {
        const u = JSON.parse(savedUser);
        if (u && u.id) {
          const savedFollowing = localStorage.getItem(`nexora_following_ids_${u.id}`);
          if (savedFollowing) {
            return JSON.parse(savedFollowing);
          } else {
            const follows = JSON.parse(localStorage.getItem('nexora_db_follows') || '[]');
            return follows.filter((f: any) => f.followerId === u.id).map((f: any) => f.followingId);
          }
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem('nexora_following_ids');
    return saved ? JSON.parse(saved) : ['creator-4', 'voh_ai'];
  });

  const [activeTab, setActiveTab] = useState<'feed' | 'explore' | 'inbox' | 'pulse' | 'matrix' | 'activity' | 'profile' | 'admin' | 'nida'>('feed');

  // Pause any playing videos immediately when switching main tabs
  useEffect(() => {
    globalVideoPlaybackManager.pauseAll();
  }, [activeTab]);

  const [viewedUser, setViewedUser] = useState<User | null>(null);
  const [matrixSubTabRedirect, setMatrixSubTabRedirect] = useState<'ai' | 'studio' | 'circles' | 'missions' | 'messages'>('ai');
  const [theme, setTheme] = useState<ThemeMood>(() => {
    const saved = localStorage.getItem('nexora_theme');
    return (saved as ThemeMood) || 'neon-cyber';
  });

  const [toasts, setToasts] = useState<{ id: string; message: string }[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // Dialog overlays
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [isCreateMenuOpen, setIsCreateMenuOpen] = useState(false);
  const [creationInitialMode, setCreationInitialMode] = useState<'text' | 'photo' | 'video' | 'reel' | 'voice' | 'poll' | 'pulse' | 'community' | null>(null);
  const [creationInitialTab, setCreationInitialTab] = useState<'feed' | 'story' | 'drafts' | undefined>(undefined);
  const [systemSpeed, setSystemSpeed] = useState('1.8ms');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isSyncPending, setIsSyncPending] = useState(false);

  // Global System Hub states
  const [isSystemHubOpen, setIsSystemHubOpen] = useState(false);
  const [textScale, setTextScale] = useState<number>(() => {
    const saved = localStorage.getItem('nexora_text_scale');
    return saved ? parseFloat(saved) : 1.0;
  });
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('nexora_high_contrast') === 'true';
  });
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    return localStorage.getItem('nexora_reduced_motion') === 'true';
  });
  const [colorblindLabels, setColorblindLabels] = useState<boolean>(() => {
    return localStorage.getItem('nexora_colorblind_labels') === 'true';
  });
  const [screenReaderVoice, setScreenReaderVoice] = useState<boolean>(() => {
    return localStorage.getItem('nexora_screen_reader_voice') === 'true';
  });
  const [layoutDirection, setLayoutDirection] = useState<'ltr' | 'rtl'>(() => {
    return (localStorage.getItem('nexora_layout_direction') as 'ltr' | 'rtl') || 'ltr';
  });
  const [lazyLoadImages, setLazyLoadImages] = useState<boolean>(() => {
    return localStorage.getItem('nexora_lazy_load_images') !== 'false';
  });

  // Sync System Hub options to local storage and browser document settings
  useEffect(() => {
    localStorage.setItem('nexora_text_scale', String(textScale));
    document.documentElement.style.fontSize = `${textScale * 100}%`;
  }, [textScale]);

  useEffect(() => {
    localStorage.setItem('nexora_high_contrast', String(isHighContrast));
  }, [isHighContrast]);

  useEffect(() => {
    localStorage.setItem('nexora_reduced_motion', String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem('nexora_colorblind_labels', String(colorblindLabels));
  }, [colorblindLabels]);

  useEffect(() => {
    localStorage.setItem('nexora_screen_reader_voice', String(screenReaderVoice));
  }, [screenReaderVoice]);

  useEffect(() => {
    localStorage.setItem('nexora_layout_direction', layoutDirection);
    document.documentElement.dir = layoutDirection;
  }, [layoutDirection]);

  useEffect(() => {
    localStorage.setItem('nexora_lazy_load_images', String(lazyLoadImages));
  }, [lazyLoadImages]);

  useEffect(() => {
    const handleOpenSystemHub = () => setIsSystemHubOpen(true);
    window.addEventListener('open-system-hub', handleOpenSystemHub);
    return () => window.removeEventListener('open-system-hub', handleOpenSystemHub);
  }, []);

  // Global VOH AI Command Center overlay state variables
  const [isAiCommandCenterOpen, setIsAiCommandCenterOpen] = useState(false);
  const [quickAiQuery, setQuickAiQuery] = useState('');

  // PWA Installation state variables
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPWAInstallPrompt, setShowPWAInstallPrompt] = useState(false);
  const [pwaInstallStatus, setPwaInstallStatus] = useState<'idle' | 'installing' | 'installed' | 'not-supported'>('idle');

  // Modal input state
  const [modalContent, setModalContent] = useState('');
  const [modalImage, setModalImage] = useState('');
  const [modalTags, setModalTags] = useState('');
  const [createdPostLink, setCreatedPostLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [verificationModalDetail, setVerificationModalDetail] = useState<{ type: string; tooltip: string } | null>(null);

  useEffect(() => {
    const handleShowModal = (e: any) => {
      if (e.detail) {
        setVerificationModalDetail(e.detail);
      }
    };
    window.addEventListener('show-voh-verification-modal', handleShowModal);
    return () => window.removeEventListener('show-voh-verification-modal', handleShowModal);
  }, []);

  // Advanced Category Post options states
  const [activePostType, setActivePostType] = useState<'text' | 'photo' | 'video' | 'voice' | 'poll' | 'article' | 'mission' | 'community' | 'pulse' | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<'public' | 'circle' | 'community' | 'followers' | 'onlyme'>('public');
  const [addToWorldPulse, setAddToWorldPulse] = useState(true);
  const [loadingAi, setLoadingAi] = useState(false);
  const [voiceRecordingState, setVoiceRecordingState] = useState<'idle' | 'recording' | 'finished'>('idle');
  const [voiceAudioLength, setVoiceAudioLength] = useState(0);
  const [voiceTranscription, setVoiceTranscription] = useState('');
  const [videoMuted, setVideoMuted] = useState(false);
  const [videoTimer, setVideoTimer] = useState(15);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollQuestion, setPollQuestion] = useState('');
  const [missionTarget, setMissionTarget] = useState('');
  const [pulseRegion, setPulseRegion] = useState('');

  // 2. Local Storage Persistence Synchronization sync
  useEffect(() => {
    localStorage.setItem('nexora_user', JSON.stringify(currentUser));
    
    // Also sync updates back to the registered accounts registry so profile updates survive logout/login
    const accountsStr = localStorage.getItem('nexora_registered_accounts');
    if (accountsStr) {
      try {
        const accounts = JSON.parse(accountsStr);
        const updated = accounts.map((acc: any) => {
          if (acc.user.id === currentUser.id || acc.user.username === currentUser.username) {
            return { ...acc, user: currentUser };
          }
          return acc;
        });
        localStorage.setItem('nexora_registered_accounts', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to sync user to registered accounts registry:', e);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('nexora_logged_in', String(isLoggedIn));
  }, [isLoggedIn]);

  useEffect(() => {
    localStorage.setItem('nexora_posts', JSON.stringify(posts));
  }, [posts]);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      localStorage.setItem(`nexora_chats_${currentUser.id}`, JSON.stringify(chats));
    }
    localStorage.setItem('nexora_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      localStorage.setItem(`nexora_messages_${currentUser.id}`, JSON.stringify(messages));
    }
    localStorage.setItem('nexora_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      localStorage.setItem(`nexora_notifications_${currentUser.id}`, JSON.stringify(notifications));
    }
    localStorage.setItem('nexora_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      localStorage.setItem(`nexora_following_ids_${currentUser.id}`, JSON.stringify(followingIds));
    }
    localStorage.setItem('nexora_following_ids', JSON.stringify(followingIds));
  }, [followingIds]);

  // Load user-scoped states whenever currentUser changes
  useEffect(() => {
    if (currentUser && currentUser.id) {
      const uid = currentUser.id;

      const savedBms = localStorage.getItem(`nexora_bookmarks_${uid}`);
      setUserBookmarks(savedBms ? JSON.parse(savedBms) : []);

      const savedSpks = localStorage.getItem(`nexora_sparks_${uid}`);
      setUserSparks(savedSpks ? JSON.parse(savedSpks) : []);

      const savedChats = localStorage.getItem(`nexora_chats_${uid}`);
      setChats(savedChats ? JSON.parse(savedChats) : INITIAL_CHATS);

      const savedMsgs = localStorage.getItem(`nexora_messages_${uid}`);
      setMessages(savedMsgs ? JSON.parse(savedMsgs) : INITIAL_MESSAGES);

      const savedNotifs = localStorage.getItem(`nexora_notifications_${uid}`);
      setNotifications(savedNotifs ? JSON.parse(savedNotifs) : INITIAL_NOTIFICATIONS);

      const savedFollowing = localStorage.getItem(`nexora_following_ids_${uid}`);
      if (savedFollowing) {
        setFollowingIds(JSON.parse(savedFollowing));
      } else {
        const follows = JSON.parse(localStorage.getItem('nexora_db_follows') || '[]');
        const userFollowing = follows.filter((f: any) => f.followerId === uid).map((f: any) => f.followingId);
        setFollowingIds(userFollowing);
      }
    }
  }, [currentUser.id]);

  // Sync userBookmarks and userSparks changes
  useEffect(() => {
    if (currentUser && currentUser.id) {
      localStorage.setItem(`nexora_bookmarks_${currentUser.id}`, JSON.stringify(userBookmarks));
    }
  }, [userBookmarks]);

  useEffect(() => {
    if (currentUser && currentUser.id) {
      localStorage.setItem(`nexora_sparks_${currentUser.id}`, JSON.stringify(userSparks));
    }
  }, [userSparks]);

  useEffect(() => {
    localStorage.setItem('nexora_theme', theme);
  }, [theme]);

  // 3. Dynamic Node Latency Jitter simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const ping = (1.5 + Math.random() * 0.8).toFixed(2);
      setSystemSpeed(`${ping}ms`);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // 3.8 Simulated Real-Time Platform Social Activity Sync (VOH and other users interacting live)
  useEffect(() => {
    const activityInterval = setInterval(() => {
      // 1. Randomly increment sparks (likes) on existing posts to simulate active network traffic
      setPosts(prev => {
        if (!prev || prev.length === 0) return prev;
        const indexToUpdate = Math.floor(Math.random() * prev.length);
        const updated = [...prev];
        const p = updated[indexToUpdate];
        if (p && p.username !== currentUser.username) {
          updated[indexToUpdate] = {
            ...p,
            likes: p.likes + Math.floor(Math.random() * 2) + 1
          };
        }
        return updated;
      });

      // 2. Randomly trigger a smart contextual notification
      const notificationTemplates = [
        {
          text: "120 new people viewed your profile today. Check Creator Studio!",
          title: "Trending Momentum",
          type: "system"
        },
        {
          text: "Voice of Harrison mentioned you: 'Exploring afrobeats rhythms with V2!'",
          title: "Mention Alert",
          type: "mention"
        },
        {
          text: "Your recent post is trending in Port Harcourt local feed! ⚡",
          title: "Local Pulse",
          type: "system"
        },
        {
          text: "Harrison left a comment on your video post.",
          title: "New Comment",
          type: "comment"
        }
      ];

      if (Math.random() > 0.6) {
        const template = notificationTemplates[Math.floor(Math.random() * notificationTemplates.length)];
        const newNotif = {
          id: `notif-${Date.now()}`,
          userId: 'user-0',
          username: 'voh',
          name: 'Harrison',
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          title: template.title,
          content: template.text,
          timestamp: 'Just now',
          isRead: false,
          type: template.type
        };

        setNotifications(prev => [newNotif as any, ...prev]);

        // Dispatch beautiful alert toast
        window.dispatchEvent(
          new CustomEvent('toast', { 
            detail: `🔔 ${template.title}: ${template.text}` 
          })
        );
      }
    }, 18000); // 18 seconds sync frequency

    return () => clearInterval(activityInterval);
  }, [currentUser]);

  // 3.5. Web Offline & Pending Sync State handlers
  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      window.dispatchEvent(new CustomEvent('toast', { detail: '📶 Dynamic sync restored! Back online.' }));
      
      setIsSyncPending(prev => {
        if (prev) {
          setTimeout(() => {
            setIsSyncPending(false);
            window.dispatchEvent(new CustomEvent('toast', { detail: '✨ All pending data packets successfully updated!' }));
          }, 2000);
          return true;
        }
        return false;
      });
    };

    const handleOffline = () => {
      setIsOffline(true);
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ You are currently offline. New posts will be queued.' }));
    };

    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      const message = customEvent.detail;
      if (!message) return;
      
      const id = `${Date.now()}-${Math.random()}`;
      setToasts(prev => [...prev, { id, message }]);
      
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 3500);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('toast', handleToast);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('toast', handleToast);
    };
  }, []);

  // Creator Tools global event listeners (Pin, Delete, Edit Caption, Toggle Comments, Delete Comment)
  useEffect(() => {
    const handleDeletePost = (e: Event) => {
      const { postId } = (e as CustomEvent).detail || {};
      if (!postId) return;
      setPosts(prev => {
        const next = prev.filter(p => p.id !== postId);
        localStorage.setItem('nexora_posts', JSON.stringify(next));
        return next;
      });
      window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Post deleted successfully.' }));
    };

    const handleEditCaption = (e: Event) => {
      const { postId, newCaption } = (e as CustomEvent).detail || {};
      if (!postId) return;
      setPosts(prev => {
        const next = prev.map(p => p.id === postId ? { ...p, content: newCaption } : p);
        localStorage.setItem('nexora_posts', JSON.stringify(next));
        return next;
      });
      window.dispatchEvent(new CustomEvent('toast', { detail: '📝 Post caption updated.' }));
    };

    const handleToggleComments = (e: Event) => {
      const { postId, disabled } = (e as CustomEvent).detail || {};
      if (!postId) return;
      setPosts(prev => {
        const next = prev.map(p => p.id === postId ? { ...p, commentsDisabled: disabled } : p);
        localStorage.setItem('nexora_posts', JSON.stringify(next));
        return next;
      });
      window.dispatchEvent(new CustomEvent('toast', { detail: disabled ? '🔒 Comments disabled for this post.' : '🔓 Comments enabled for this post.' }));
    };

    const handleDeleteComment = (e: Event) => {
      const { postId, commentIndex } = (e as CustomEvent).detail || {};
      if (!postId || commentIndex === undefined) return;
      setPosts(prev => {
        const next = prev.map(p => {
          if (p.id !== postId) return p;
          const comments = [...(p.comments || [])];
          comments.splice(commentIndex, 1);
          return {
            ...p,
            comments,
            commentsCount: Math.max(0, (p.commentsCount || 0) - 1)
          };
        });
        localStorage.setItem('nexora_posts', JSON.stringify(next));
        return next;
      });
      window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Comment deleted by creator.' }));
    };

    window.addEventListener('nexora-delete-post', handleDeletePost);
    window.addEventListener('nexora-edit-caption', handleEditCaption);
    window.addEventListener('nexora-toggle-comments', handleToggleComments);
    window.addEventListener('nexora-delete-comment', handleDeleteComment);

    return () => {
      window.removeEventListener('nexora-delete-post', handleDeletePost);
      window.removeEventListener('nexora-edit-caption', handleEditCaption);
      window.removeEventListener('nexora-toggle-comments', handleToggleComments);
      window.removeEventListener('nexora-delete-comment', handleDeleteComment);
    };
  }, []);

  // 4.5. PWA Installation Event Listeners & Controllers
  useEffect(() => {
    // Increment session count
    const sessionCountStr = localStorage.getItem('nexora_session_count') || '0';
    const nextSessionCount = parseInt(sessionCountStr, 10) + 1;
    localStorage.setItem('nexora_session_count', nextSessionCount.toString());

    // If dismissed, increment sessions since dismissal
    const dismissedAt = localStorage.getItem('nexora_pwa_dismissed_at');
    if (dismissedAt) {
      const currentSessionsSince = parseInt(localStorage.getItem('nexora_pwa_sessions_since_dismissed') || '0', 10);
      localStorage.setItem('nexora_pwa_sessions_since_dismissed', (currentSessionsSince + 1).toString());
    }

    // Check if app is launched in standalone mode
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setPwaInstallStatus('installed');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Auto-trigger prompt check
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      if (standalone) return;

      const justSignedUp = localStorage.getItem('nexora_just_signed_up') === 'true';
      if (justSignedUp) {
        localStorage.removeItem('nexora_just_signed_up');
        setShowPWAInstallPrompt(true);
        return;
      }

      const dismissed = localStorage.getItem('nexora_pwa_dismissed_at');
      const sessionsSinceDismissed = parseInt(localStorage.getItem('nexora_pwa_sessions_since_dismissed') || '0', 10);

      if (dismissed) {
        const daysDiff = (Date.now() - parseInt(dismissed, 10)) / (1000 * 60 * 60 * 24);
        if (sessionsSinceDismissed >= 3 && daysDiff >= 1) {
          setShowPWAInstallPrompt(true);
        }
      } else {
        // No dismissal recorded yet, show prompt
        setShowPWAInstallPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setPwaInstallStatus('installed');
      setDeferredPrompt(null);
      setShowPWAInstallPrompt(false);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Nexora App successfully installed on your device!' }));
    };

    const handleChangeTab = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.tab) {
        setActiveTab(customEvent.detail.tab);
        if (customEvent.detail.subTab) {
          setMatrixSubTabRedirect(customEvent.detail.subTab);
        }
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('changeTab', handleChangeTab);

    // If a new user just signed up and we missed beforeinstallprompt (or browser doesn't support),
    // still display the setup guidance prompt so they can learn how to install!
    const justSignedUp = localStorage.getItem('nexora_just_signed_up') === 'true';
    if (justSignedUp && !isStandalone) {
      localStorage.removeItem('nexora_just_signed_up');
      setShowPWAInstallPrompt(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('changeTab', handleChangeTab);
    };
  }, []);

  const handleMaybeLaterPWA = () => {
    localStorage.setItem('nexora_pwa_dismissed_at', Date.now().toString());
    localStorage.setItem('nexora_pwa_sessions_since_dismissed', '0');
    setShowPWAInstallPrompt(false);
    window.dispatchEvent(new CustomEvent('toast', { detail: '👍 Preference saved. We\'ll remind you later!' }));
  };

  const handleTriggerPWAInstall = async () => {
    if (!deferredPrompt) {
      // If we don't have the prompt event, we open the guide and show instructions
      console.warn('⚡ No prompt captured. Displaying manual install helper instructions.');
      return;
    }
    
    setPwaInstallStatus('installing');
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setPwaInstallStatus('installed');
        setDeferredPrompt(null);
        setShowPWAInstallPrompt(false);
      } else {
        setPwaInstallStatus('idle');
      }
    } catch (err) {
      console.error('Failed to prompt installation:', err);
      setPwaInstallStatus('idle');
    }
  };

  // 5. Shared Post Interact Controllers
  const handleLikePost = (postId: string) => {
    const isCurrentlyLiked = userSparks.includes(postId);
    const updatedSparks = isCurrentlyLiked
      ? userSparks.filter(id => id !== postId)
      : [...userSparks, postId];
    
    setUserSparks(updatedSparks);

    setPosts(prevPosts => 
      prevPosts.map(post => {
        if (post.id === postId) {
          const updatedLikes = isCurrentlyLiked ? post.likes - 1 : post.likes + 1;
          
          // If liking, push interaction alert
          if (!isCurrentlyLiked && post.userId !== currentUser.id) {
            const newNotif: Notification = {
              id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
              type: 'like',
              userId: currentUser.id,
              username: currentUser.username,
              avatar: currentUser.avatar,
              targetId: post.id,
              content: `liked your post: "${post.content.slice(0, 30)}..."`,
              timestamp: 'Just now',
              isRead: false
            };
            setNotifications(prev => [newNotif, ...prev]);
          }

          return { 
            ...post, 
            likes: updatedLikes
          };
        }
        return post;
      })
    );
  };

  const handleBookmarkPost = (postId: string) => {
    const isCurrentlyBookmarked = userBookmarks.includes(postId);
    const updatedBookmarks = isCurrentlyBookmarked
      ? userBookmarks.filter(id => id !== postId)
      : [...userBookmarks, postId];
    
    setUserBookmarks(updatedBookmarks);
    
    // Also dispatch update collections event
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('update-collections'));
    }, 100);
  };

  const handleAddPost = (
    content: string, 
    imageUrl?: string, 
    tagsString?: string,
    images?: string[],
    videoUrl?: string,
    voiceTranscript?: string,
    voiceAudioUrl?: string,
    audience?: 'public' | 'circle' | 'community' | 'followers' | 'onlyme',
    isVoice?: boolean,
    voiceDuration?: number,
    interactivePoll?: any,
    opportunityType?: string,
    pulseRegion?: string,
    imageFilter?: string,
    imageFilters?: string[],
    scheduledTime?: string,
    isBroadcastPost?: boolean
  ): string => {
    // Parse tags safely
    const parsedTags = tagsString
      ? tagsString.split(',').map(t => t.trim().replace('#', '')).filter(t => t.length > 0)
      : [];

    const postId = `post-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
    const newPost: Post = {
      id: postId,
      userId: currentUser.id,
      username: currentUser.username,
      name: currentUser.name,
      avatar: currentUser.avatar,
      isVerified: currentUser.isVerified || false,
      content,
      image: imageUrl,
      imageFilter,
      images,
      imageFilters,
      videoUrl,
      voiceTranscript,
      voiceAudioUrl,
      audience,
      tags: parsedTags,
      likes: 0,
      commentsCount: 0,
      shares: 0,
      views: 0,
      saves: 0,
      timestamp: 'Just now',
      isLikedByUser: false,
      isBookmarkedByUser: false,
      comments: [],
      isVoice,
      voiceDuration,
      interactivePoll,
      opportunityType,
      scheduledTime,
      isBroadcastPost,
      broadcastReactions: isBroadcastPost ? { '🔥': 0, '🙌': 0, '⚡': 0, '🏆': 0 } : undefined
    };

    setPosts(prev => [newPost, ...prev]);
    // Log post in database to grant reputation and increment contribution records
    createPostDb(currentUser.id);

    // Simulate real, action-driven triggers from official seeded platform accounts
    setTimeout(() => {
      setPosts(prevPosts =>
        prevPosts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              likes: p.likes + 1
            };
          }
          return p;
        })
      );
      
      const likeNotif: Notification = {
        id: `notif-${Date.now()}-like`,
        type: 'like',
        userId: 'voh_ai',
        username: 'voh_ai',
        avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80',
        targetId: postId,
        content: `liked your post: "${content.slice(0, 30)}..."`,
        timestamp: 'Just now',
        isRead: false
      };
      setNotifications(prev => [likeNotif, ...prev]);
    }, 4000);

    setTimeout(() => {
      const commentId = `comment-${Date.now()}-reply`;
      const botComment = {
        id: commentId,
        postId: postId,
        userId: 'nexora_ai',
        username: 'nexora_ai',
        name: 'NEXORA AI',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        content: `Outstanding share! The metadata integration on this is fantastic. Let us boost this node in the feed index! 🚀`,
        timestamp: 'Just now',
        likes: 0
      };

      setPosts(prevPosts =>
        prevPosts.map(p => {
          if (p.id === postId) {
            return {
              ...p,
              commentsCount: p.commentsCount + 1,
              comments: [...p.comments, botComment]
            };
          }
          return p;
        })
      );

      const commentNotif: Notification = {
        id: `notif-${Date.now()}-comment`,
        type: 'comment',
        userId: 'nexora_ai',
        username: 'nexora_ai',
        avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
        targetId: postId,
        content: `commented on your post: "Outstanding share! The metadata integration on this..."`,
        timestamp: 'Just now',
        isRead: false
      };
      setNotifications(prev => [commentNotif, ...prev]);
    }, 8000);
    
    if (isOffline) {
      setIsSyncPending(true);
      window.dispatchEvent(new CustomEvent('toast', { detail: '📝 Offline Mode: Post saved locally and queued for updates!' }));
    }
    
    return postId;
  };

  const handleRemovePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleAddComment = (postId: string, commentContent: string) => {
    const newComment = {
      id: `comment-${Date.now()}`,
      postId,
      userId: currentUser.id,
      username: currentUser.username,
      name: currentUser.name,
      avatar: currentUser.avatar,
      content: commentContent,
      timestamp: 'Just now',
      likes: 0
    };

    setPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          // Trigger notification to host of post (if not yourself)
          if (p.userId !== currentUser.id) {
            const newNotif: Notification = {
              id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
              type: 'comment',
              userId: currentUser.id,
              username: currentUser.username,
              avatar: currentUser.avatar,
              targetId: p.id,
              content: `commented on your post: "${commentContent.slice(0, 30)}..."`,
              timestamp: 'Just now',
              isRead: false
            };
            setNotifications(prev => [newNotif, ...prev]);
          }

          return {
            ...p,
            commentsCount: p.commentsCount + 1,
            comments: [...p.comments, newComment]
          };
        }
        return p;
      })
    );
  };

  const handleSharePost = (postId: string) => {
    setPosts(prevPosts =>
      prevPosts.map(p => {
        if (p.id === postId) {
          return { ...p, shares: (p.shares || 0) + 1 };
        }
        return p;
      })
    );
  };

  // 6. Messaging pipelines
  const handleSendMessage = (chatId: string, content: string) => {
    const msgId = `msg-${Date.now()}`;
    const newMsg: Message = {
      id: msgId,
      chatId,
      senderId: currentUser.id,
      content,
      timestamp: 'Just now',
      status: 'sent'
    };

    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg]
    }));

    setChats(prevChats =>
      prevChats.map(c => {
        if (c.id === chatId) {
          return {
            ...c,
            lastMessage: content,
            lastTimestamp: 'Just now'
          };
        }
        return c;
      })
    );

    // Simulate transition to 'delivered' (double check)
    setTimeout(() => {
      setMessages(prev => {
        const list = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: list.map(m => m.id === msgId ? { ...m, status: 'delivered' } : m)
        };
      });
    }, 600);

    // Simulate transition to 'read' (cyan double check) when the receiver consumes the message
    setTimeout(() => {
      setMessages(prev => {
        const list = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: list.map(m => m.id === msgId ? { ...m, status: 'read' } : m)
        };
      });
    }, 1500);
  };

  const handleReceiveBotMessage = (chatId: string, content: string, senderId: string) => {
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      chatId,
      senderId,
      content,
      timestamp: 'Just now',
      status: 'read'
    };

    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), newMsg]
    }));

    const senderUser = MOCK_CREATORS.find(c => c.id === senderId) || { name: 'VOH AI', username: 'voh_ai', avatar: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80' };
    const newNotif: Notification = {
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
      type: 'message',
      userId: senderId,
      username: senderUser.username,
      avatar: senderUser.avatar,
      targetId: chatId,
      content: `sent you a direct message: "${content.slice(0, 30)}..."`,
      timestamp: 'Just now',
      isRead: false
    };
    setNotifications(prev => [newNotif, ...prev]);

    // Update global chats array stats
    setChats(prevChats =>
      prevChats.map(c => {
        if (c.id === chatId) {
          const isStillCurrentActive = activeTab === 'messages' && chatId === c.id;
          return {
            ...c,
            lastMessage: content,
            lastTimestamp: 'Just now',
            unreadCount: isStillCurrentActive ? 0 : c.unreadCount + 1
          };
        }
        return c;
      })
    );
  };

  // 7. Discovery Align Switch
  const handleToggleFollow = (creatorId: string) => {
    const isCurrentlyFollowing = followingIds.includes(creatorId);
    let updatedFollowing: string[];

    if (isCurrentlyFollowing) {
      unfollowUserDb(currentUser.id, creatorId);
      updatedFollowing = followingIds.filter(id => id !== creatorId);
    } else {
      followUserDb(currentUser.id, creatorId);
      updatedFollowing = [...followingIds, creatorId];
      
      // record recommendation follow event
      const targetCreator = MOCK_CREATORS.find(c => c.id === creatorId);
      if (targetCreator) {
        recordRecommendationEvent('follow', { creatorId, creatorUsername: targetCreator.username });
        
        const newNotif: Notification = {
          id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
          type: 'follow',
          userId: targetCreator.id,
          username: targetCreator.username,
          avatar: targetCreator.avatar,
          content: `joined your close friends circle with your studio channel.`,
          timestamp: 'Just now',
          isRead: false
        };
        setNotifications(prev => [newNotif, ...prev]);
      }
    }

    setFollowingIds(updatedFollowing);
  };

  const handleViewProfile = (userIdOrUsername: string) => {
    if (!userIdOrUsername) return;
    // Check if itself
    const cleanIdOrUser = userIdOrUsername.replace('@', '').toLowerCase().trim();
    
    // Record profile visit for recommendations
    recordRecommendationEvent('visit_profile', { creatorId: cleanIdOrUser, creatorUsername: cleanIdOrUser });

    if (userIdOrUsername === currentUser.id || currentUser.username.toLowerCase() === cleanIdOrUser) {
      setViewedUser(null);
      setActiveTab('profile');
      return;
    }

    // Try finding in Creators
    const creator = MOCK_CREATORS.find(c => c.id === userIdOrUsername || c.username.toLowerCase() === cleanIdOrUser);
    if (creator) {
      setViewedUser(creator);
      setActiveTab('profile');
      return;
    }

    // Try finding in Additional Test Accounts
    const testAccount = ADDITIONAL_TEST_ACCOUNTS.find(a => a.id === userIdOrUsername || a.username.toLowerCase() === cleanIdOrUser);
    if (testAccount) {
      setViewedUser(testAccount);
      setActiveTab('profile');
      return;
    }

    // Try finding in registered database accounts
    try {
      const stored = localStorage.getItem('nexora_registered_accounts');
      if (stored) {
        const accounts = JSON.parse(stored);
        const match = accounts.find((a: any) => 
          a.user.id === userIdOrUsername || 
          a.user.username.toLowerCase() === cleanIdOrUser || 
          a.email.toLowerCase() === cleanIdOrUser
        );
        if (match) {
          setViewedUser(match.user);
          setActiveTab('profile');
          return;
        }
      }
    } catch(e) {}

    // Dynamic builder if not pre-configured
    const matchingPost = posts.find(p => p.userId === userIdOrUsername || p.username.toLowerCase() === cleanIdOrUser);
    if (matchingPost) {
      const builtUser: User = {
        id: matchingPost.userId,
        username: matchingPost.username,
        name: matchingPost.name,
        avatar: matchingPost.avatar,
        bio: `Prominent broadcaster specializing in secure data flows. Follow @${matchingPost.username} to find active discussions.`,
        location: 'Earth Orbit',
        website: `nexora.ai/${matchingPost.username}`,
        followers: 130,
        following: 58,
        isVerified: matchingPost.isVerified || false,
        coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
        joinedDate: 'Joined June 2026',
        reputationPoints: 1200,
        reputationBreakdown: { contributions: 300, helpfulness: 250, missionsCompleted: 2, skillsVerified: 650 },
        interestDNA: { 'AI': 80, 'Technology': 70, 'Creative Coding': 60 },
        skills: ['Broadcasting']
      };
      setViewedUser(builtUser);
    } else {
      // Fallback: build standard template
      setViewedUser({
        id: userIdOrUsername,
        username: cleanIdOrUser,
        name: cleanIdOrUser.charAt(0).toUpperCase() + cleanIdOrUser.slice(1),
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
        bio: `Connected explorer mapping data parameters across the NEXORA network.`,
        location: 'Space Station Arc',
        website: '',
        followers: 4,
        following: 1,
        isVerified: false,
        coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
        joinedDate: 'Joined June 2026',
        reputationPoints: 50,
        reputationBreakdown: { contributions: 10, helpfulness: 10, missionsCompleted: 0, skillsVerified: 30 },
        interestDNA: { 'Technology': 100 },
        skills: ['Explorer']
      });
    }
    setActiveTab('profile');
  };

  const handleStartChat = (userId: string) => {
    if (!userId) return;
    // Find partner detail
    let partner = MOCK_CREATORS.find(c => c.id === userId);
    if (!partner) {
      try {
        const accounts = JSON.parse(localStorage.getItem('nexora_registered_accounts') || '[]');
        const match = accounts.find((a: any) => a.user.id === userId);
        if (match) partner = match.user;
      } catch (e) {}
    }
    if (!partner) {
      // Find from post authors
      const postWithUser = posts.find(p => p.userId === userId);
      if (postWithUser) {
        partner = {
          id: postWithUser.userId,
          username: postWithUser.username,
          name: postWithUser.name,
          avatar: postWithUser.avatar,
          bio: 'Broadcaster Node',
          location: 'Earth Orbit',
          website: '',
          followers: 12,
          following: 8,
          isVerified: false,
          coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
          joinedDate: 'Joined June 2026',
          reputationPoints: 100,
          reputationBreakdown: { contributions: 10, helpfulness: 20, missionsCompleted: 0, skillsVerified: 70 },
          interestDNA: { 'Explorer': 100 },
          skills: []
        };
      }
    }

    if (!partner) return;

    const existingChat = chats.find(c => c.partnerId === userId);
    let cid = existingChat?.id;

    if (!existingChat) {
      cid = `chat-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
      const newChat: Chat = {
        id: cid,
        partnerId: partner.id,
        partnerName: partner.name,
        partnerAvatar: partner.avatar,
        partnerBio: partner.bio,
        isPartnerOnline: true,
        unreadCount: 0,
        lastMessage: "Secure voice connection established.",
        lastTimestamp: "Just now"
      };
      setChats(prev => [newChat, ...prev]);
      setMessages(prev => ({
        ...prev,
        [cid!]: [
          {
            id: `msg-welcome-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            chatId: cid!,
            senderId: partner!.id,
            content: `Hello! Welcome to my secure channel. Let's exchange thoughts in orbit.`,
            timestamp: "Just now",
            status: "read"
          }
        ]
      }));
    }

    // Redirect to matrix under messages sub tab!
    setMatrixSubTabRedirect('messages');
    setActiveTab('matrix');
  };

  // 8. Studio profile settings update
  const handleUpdateProfile = (updatedData: Partial<User>) => {
    setCurrentUser(prev => {
      const updatedUser = {
        ...prev,
        ...updatedData
      };

      // Propagate updates in real-time to posts and comments authored by the user
      setPosts(prevPosts => {
        return prevPosts.map(post => {
          let newPost = { ...post };

          if (post.userId === prev.id) {
            if (updatedData.name !== undefined) newPost.name = updatedData.name;
            if (updatedData.username !== undefined) newPost.username = updatedData.username;
            if (updatedData.avatar !== undefined) newPost.avatar = updatedData.avatar;
          }

          if (post.comments && post.comments.length > 0) {
            newPost.comments = post.comments.map(comment => {
              if (comment.userId === prev.id) {
                const nextComment = { ...comment };
                if (updatedData.name !== undefined) nextComment.name = updatedData.name;
                if (updatedData.username !== undefined) nextComment.username = updatedData.username;
                if (updatedData.avatar !== undefined) nextComment.avatar = updatedData.avatar;
                return nextComment;
              }
              return comment;
            });
          }

          return newPost;
        });
      });

      return updatedUser;
    });
  };

  // 9. Notifications actions
  const handleMarkAllNotificationsAsRead = () => {
    setNotifications(prevNotifs => 
      prevNotifs.map(n => ({ ...n, isRead: true }))
    );
  };

  const handleClearNotifications = () => {
    setNotifications([]);
  };

  // 10. Floating modal deployer submit
  const handleDeployPost = (withShare: boolean) => {
    if (!modalContent.trim()) return;

    const newPostId = handleAddPost(modalContent, modalImage || undefined, modalTags);
    const mockLink = `${window.location.origin}/post/${newPostId}`;
    setCreatedPostLink(mockLink);
    setIsCopied(false);

    if (withShare) {
      try {
        navigator.clipboard.writeText(mockLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link: ", err);
      }
    }
  };

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleDeployPost(false);
  };

  const handleCloseCreateModal = () => {
    setIsCreatePostModalOpen(false);
    setCreatedPostLink(null);
    setIsCopied(false);
    setModalContent('');
    setModalImage('');
    setModalTags('');

    // Reset advanced sub-screen states
    setActivePostType(null);
    setSelectedAudience('public');
    setAddToWorldPulse(true);
    setLoadingAi(false);
    setVoiceRecordingState('idle');
    setVoiceAudioLength(0);
    setVoiceTranscription('');
    setVideoMuted(false);
    setVideoTimer(15);
    setPollOptions(['', '']);
    setPollQuestion('');
    setMissionTarget('');
    setPulseRegion('');
  };

  // 11. Determine specific theme CSS configurations dynamically
  const getThemeWrapperClass = (mood: ThemeMood) => {
    if (isHighContrast) {
      return 'bg-black text-white min-h-screen';
    }
    switch (mood) {
      case 'neon-cyber':
        return 'bg-[#050409] text-purple-100 min-h-screen';
      case 'emerald-glass':
        return 'bg-[#010403] text-emerald-100 min-h-screen';
      case 'platinum-light':
        return 'bg-[#f4f6fa] text-slate-900 min-h-screen';
      case 'stealth-dark':
      default:
        return 'bg-zinc-950 text-zinc-100 min-h-screen';
    }
  };

  const getCardClass = (mood: ThemeMood) => {
    if (isHighContrast) {
      return 'bg-black border-2 border-white shadow-none text-white';
    }
    switch (mood) {
      case 'neon-cyber':
        return 'bg-[#0c0a15]/90 border border-violet-500/20 shadow-md shadow-violet-500/5';
      case 'emerald-glass':
        return 'bg-[#040e09]/90 border border-emerald-950 shadow-md shadow-emerald-500/5';
      case 'platinum-light':
        return 'bg-white border border-slate-200 shadow-xs shadow-slate-100';
      case 'stealth-dark':
      default:
        return 'bg-zinc-900 border border-zinc-800 shadow-md';
    }
  };

  const unreadMessagesCount = chats.reduce((acc, c) => acc + c.unreadCount, 0);
  const unreadNotificationsCount = notifications.filter(n => !n.isRead).length;

  // Render Core layout
  if (!isLoggedIn) {
    return (
      <AuthView 
        onLoginSuccess={(loggedUser) => {
          setCurrentUser(loggedUser);
          setIsLoggedIn(true);
        }} 
      />
    );
  }

  return (
    <div id="nexora-master-wrapper" className={`${getThemeWrapperClass(theme)} transition-colors duration-500`}>
      <div className={activeTab === 'feed' ? "w-full h-screen md:h-[100dvh] relative overflow-hidden" : "max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-6 pb-24 lg:pb-6"}>
        
        {/* Main application Grid */}
        <div id="nexora-main-grid" className={activeTab === 'feed' ? "grid grid-cols-1 lg:grid-cols-4 h-full w-full relative overflow-hidden" : "grid grid-cols-1 lg:grid-cols-4 gap-6 items-start"}>
          
          {/* Col 1: Left Navigation sidebar */}
          <div className={activeTab === 'feed' ? "hidden lg:block lg:col-span-1 h-full border-r border-white/5 bg-black/20 p-4 overflow-y-auto" : "hidden lg:block lg:col-span-1 lg:sticky lg:top-6"}>
            <Sidebar 
              currentUser={getRichUser(currentUser)}
              activeTab={activeTab}
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setViewedUser(null);
                // Clear state filters when swapping main layouts
                setSelectedTag(null);
                setSearchQuery('');
              }}
              unreadMessagesCount={unreadMessagesCount}
              unreadNotificationsCount={unreadNotificationsCount}
              theme={theme}
              setTheme={setTheme}
              onOpenCreatePost={() => {
                setCreatedPostLink(null);
                setIsCopied(false);
                setCreationInitialMode(null);
                setCreationInitialTab(undefined);
                setIsCreateMenuOpen(true);
              }}
              onLogout={() => setIsLogoutConfirming(true)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          </div>

          {/* Col 2 & 3: Main Immersive View Area */}
          <div className={activeTab === 'feed' ? "col-span-1 lg:col-span-2 h-full w-full relative min-h-0" : "lg:col-span-2 min-h-0"}>
            <div className={activeTab === 'feed' ? "block h-full w-full" : "hidden h-0 overflow-hidden pointer-events-none"}>
              <FeedView
                currentUser={getRichUser(currentUser)}
                posts={resolvedPosts}
                followingIds={followingIds}
                onLikePost={handleLikePost}
                onBookmarkPost={handleBookmarkPost}
                onAddComment={handleAddComment}
                onAddPost={handleAddPost}
                selectedTag={selectedTag}
                setSelectedTag={setSelectedTag}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                onViewProfile={handleViewProfile}
                onToggleFollow={handleToggleFollow}
                theme={theme}
                onSharePost={handleSharePost}
              />
            </div>
            
            {activeTab !== 'feed' && (
              <div className={`${getCardClass(theme)} rounded-3xl p-5 md:p-6 min-h-[620px]`}>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.08, ease: "easeOut" }}
                  >

                  {activeTab === 'explore' && (
                    <ExploreView
                      creators={MOCK_CREATORS}
                      posts={resolvedPosts}
                      setSelectedTag={setSelectedTag}
                      setActiveTab={(t) => setActiveTab(t as any)}
                      onLikePost={handleLikePost}
                      onToggleFollow={handleToggleFollow}
                      followingIds={followingIds}
                    />
                  )}

                  {activeTab === 'pulse' && (
                    <WorldPulseView theme={theme} />
                  )}

                  {activeTab === 'matrix' && (
                    <MatrixView
                      currentUser={getRichUser(currentUser)}
                      posts={resolvedPosts}
                      onAddPost={handleAddPost}
                      chats={chats}
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      onReceiveBotMessage={handleReceiveBotMessage}
                      initialSubTab={matrixSubTabRedirect}
                    />
                  )}

                  {activeTab === 'profile' && (
                    <ProfileView
                      currentUser={getRichUser(viewedUser || currentUser)}
                      posts={resolvedPosts}
                      onUpdateProfile={handleUpdateProfile}
                      onLikePost={handleLikePost}
                      onAddComment={handleAddComment}
                      isOwnProfile={!viewedUser}
                      onCloseProfile={viewedUser ? () => setViewedUser(null) : undefined}
                      onToggleFollow={handleToggleFollow}
                      isFollowingField={viewedUser ? followingIds.includes(viewedUser.id) : false}
                      onStartChat={handleStartChat}
                      onViewProfile={handleViewProfile}
                      theme={theme}
                      setTheme={setTheme}
                      onLogout={() => setIsLogoutConfirming(true)}
                      onTriggerPWAInstall={handleTriggerPWAInstall}
                      showPWAInstallPrompt={showPWAInstallPrompt}
                    />
                  )}

                  {activeTab === 'nida' && (
                    <NidaView currentUser={getRichUser(currentUser)} />
                  )}

                  {(activeTab === 'inbox' || activeTab === 'activity') && (
                    <InboxView
                      currentUser={getRichUser(currentUser)}
                      chats={chats}
                      messages={messages}
                      onSendMessage={handleSendMessage}
                      onReceiveBotMessage={handleReceiveBotMessage}
                      notifications={notifications}
                      onMarkAllAsRead={handleMarkAllNotificationsAsRead}
                      onClearNotifications={handleClearNotifications}
                      onViewProfile={handleViewProfile}
                    />
                  )}

                  {activeTab === 'admin' && (
                    <AdminDashboardView
                      currentUser={getRichUser(currentUser)}
                      posts={resolvedPosts}
                      onRemovePost={handleRemovePost}
                      lang={TRANSLATIONS[currentUser.preferredLanguage as any] || TRANSLATIONS.en}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            )}
          </div>

          {/* Col 4: Right Discovery sidebar */}
          <div className={activeTab === 'feed' ? "hidden lg:block lg:col-span-1 h-full border-l border-white/5 bg-black/20 p-4 overflow-y-auto" : "hidden lg:block lg:col-span-1 lg:sticky lg:top-6"}>
            <RightSidebar
              creators={MOCK_CREATORS}
              followingIds={followingIds}
              onToggleFollow={handleToggleFollow}
              onViewProfile={handleViewProfile}
              trendingTags={[
                { tag: 'SpaceGlass', count: 42 },
                { tag: 'Rust', count: 58 },
                { tag: 'NeonAesthetics', count: 104 },
                { tag: 'DesignTokens', count: 31 },
                { tag: 'BuildInPublic', count: 47 }
              ]}
              selectedTag={selectedTag}
              setSelectedTag={setSelectedTag}
              systemSpeed={systemSpeed}
              currentUserUsername={currentUser.username}
            />
          </div>

        </div>
      </div>

      {/* Create Post Global Overlay Modal Dialog */}
      <AnimatePresence>
        {isCreatePostModalOpen && (
          <MediaCreationEngine
            currentUser={currentUser}
            onClose={handleCloseCreateModal}
            onAddPost={handleAddPost}
            theme={theme}
            isOffline={isOffline}
            initialMode={creationInitialMode}
            initialTab={creationInitialTab}
            onToggleOffline={() => {
              setIsOffline(prev => {
                const next = !prev;
                if (next) {
                  window.dispatchEvent(new CustomEvent('toast', { detail: '🔌 Simulating OFFLINE mode. Actions will be queued.' }));
                } else {
                  window.dispatchEvent(new CustomEvent('toast', { detail: '📶 Simulating ONLINE mode. Updating pending posts...' }));
                  setIsSyncPending(prevPending => {
                    if (prevPending) {
                      setTimeout(() => {
                        setIsSyncPending(false);
                        window.dispatchEvent(new CustomEvent('toast', { detail: '✨ All pending data packets successfully updated!' }));
                      }, 2005);
                      return true;
                    }
                    return false;
                  });
                }
                return next;
              });
            }}
          />
        )}
      </AnimatePresence>

      {/* Legacy Create Modal - Deactivated */}
      <AnimatePresence>
        {false && isCreatePostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleCloseCreateModal}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs" 
            />

            {/* Modal Card content */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className={`relative max-w-xl w-full rounded-3xl p-6 ${getCardClass(theme)} overflow-hidden z-10 max-h-[90vh] flex flex-col`}
            >
              {/* Header section of modal */}
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-current/5 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-violet-600/10 text-violet-400">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-sm font-sans font-black tracking-widest uppercase">
                    {activePostType === null 
                      ? 'Create Contribution' 
                      : activePostType === 'text' ? '📝 Text Post'
                      : activePostType === 'photo' ? '📸 Photo Post'
                      : activePostType === 'video' ? '🎥 Video Workspace'
                      : activePostType === 'voice' ? '🎙 Voice Composer'
                      : activePostType === 'poll' ? '📊 Interactive Poll'
                      : activePostType === 'article' ? '📄 Long-form Article'
                      : activePostType === 'mission' ? '🎯 Community Mission'
                      : activePostType === 'community' ? '🏟 Community Channel'
                      : '🌍 Pulse Report'
                    }
                  </h3>
                </div>
                <button 
                  onClick={handleCloseCreateModal}
                  className="p-1.5 rounded-lg hover:bg-current/5 text-current/60 hover:text-current cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Modal Content body */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-left scrollbar-thin">
                {createdPostLink ? (
                  // Success Link State
                  <div className="space-y-5 py-4 text-center">
                    <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <Check className="w-6 h-6 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-sm font-sans font-black tracking-widest uppercase text-emerald-400">
                        Post Successfully Shared!
                      </h4>
                      <p className="text-xs text-current/60 mt-1 font-sans">
                        Your update is online and propagates across the Nexora mesh network.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-current/5 border border-current/10 flex flex-col gap-2 text-left">
                      <span className="text-[9px] font-mono uppercase text-current/40 tracking-wider">Shareable post address link</span>
                      <div className="flex items-center gap-2 bg-black/40 rounded-xl p-2.5 border border-current/5">
                        <input 
                          type="text" 
                          readOnly 
                          value={createdPostLink} 
                          className="flex-1 bg-transparent border-0 outline-hidden font-mono text-[11px] text-violet-300 w-full"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            try {
                              navigator.clipboard.writeText(createdPostLink);
                              setIsCopied(true);
                              setTimeout(() => setIsCopied(false), 2000);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-400 text-xs font-mono font-bold transition-all shrink-0 cursor-pointer"
                        >
                          {isCopied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              COPIED
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3.5 h-3.5 text-current" />
                              COPY LINK
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={handleCloseCreateModal}
                        className="px-6 py-2.5 text-xs font-mono font-bold rounded-xl bg-linear-to-r from-violet-600 to-pink-500 text-white hover:brightness-110 active:scale-98 transition-all cursor-pointer uppercase tracking-wider"
                      >
                        Complete Session
                      </button>
                    </div>
                  </div>
                ) : activePostType === null ? (
                  // MENU SELECTION SCREEN (1st View)
                  <div className="space-y-3 py-1">
                    <p className="text-xs text-current/60 font-sans mb-4">
                      Select one of NEXORA's unique formats to share your contribution with the grid:
                    </p>
                    
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                      {[
                        { id: 'text', icon: FileText, color: 'text-violet-400 bg-violet-400/10', title: '📝 Text Post', desc: 'Share thoughts, updates, questions, ideas.' },
                        { id: 'photo', icon: Camera, color: 'text-pink-400 bg-pink-400/10', title: '📸 Photo Post', desc: 'Upload or attach premium aesthetic photography.' },
                        { id: 'video', icon: VideoIcon, color: 'text-cyan-400 bg-cyan-400/10', title: '🎥 Video Workspace', desc: 'Sleek video editor options. Play, trim, mute and post.' },
                        { id: 'voice', icon: Mic, color: 'text-violet-400 bg-violet-400/10', title: '🎙 Voice Post', desc: 'Record your voice directly. Nexora\'s signature feature with automatic transcript.' },
                        { id: 'poll', icon: BarChart2, color: 'text-emerald-400 bg-emerald-400/10', title: '📊 Community Poll', desc: 'Ask a question with interactive voters tracking.' },
                        { id: 'article', icon: FileText, color: 'text-amber-400 bg-amber-400/10', title: '📄 Long-form Article', desc: 'Publish clean, format-rich editorial blogs.' },
                        { id: 'mission', icon: Award, color: 'text-rose-400 bg-rose-400/10', title: '🎯 Community Mission', desc: 'Initiate challenges, goal targets, and community missions.' },
                        { id: 'community', icon: UsersIcon, color: 'text-violet-400 bg-violet-400/10', title: '🏟 Community Channel', desc: 'Post and align directly inside active communities.' },
                        { id: 'pulse', icon: MapPin, color: 'text-cyan-400 bg-cyan-400/10', title: '🌍 Pulse Report', desc: 'Signal regional incidents or local happenings. Feeds World Pulse.' }
                      ].map((item) => {
                        const IconComponent = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              setActivePostType(item.id as any);
                              // Seed some starter content if matching
                              if (item.id === 'voice') {
                                setVoiceTranscription('');
                              }
                            }}
                            className="w-full p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#8B5CF6]/30 transition-all text-left flex items-center justify-between gap-3 cursor-pointer group"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className={`w-9 h-9 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                                <IconComponent className="w-4.5 h-4.5" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-extrabold text-white font-sans flex items-center gap-1.5 leading-none">
                                  {item.title}
                                  {['voice', 'mission', 'community', 'pulse'].includes(item.id) && (
                                    <span className="text-[7.5px] font-mono uppercase bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/20 px-1 py-0.5 rounded-sm tracking-widest font-black shrink-0">
                                      NEXORA SPEC
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[10px] text-current/60 leading-normal font-sans mt-1 group-hover:text-current/90 transition-colors">
                                  {item.desc}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-current/30 group-hover:text-[#8B5CF6] group-hover:translate-x-1 transition-all shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // SUB-SCREEN DETAIL FORMS (2nd View)
                  <div className="space-y-4">
                    
                    {/* Upper back action */}
                    <button 
                      onClick={() => setActivePostType(null)}
                      className="text-[10.5px] font-mono hover:text-[#8B5CF6] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      &larr; Choose another type
                    </button>

                    {/* Profile preview block */}
                    <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <img 
                          src={currentUser.avatar} 
                          alt="avatar" 
                          referrerPolicy="no-referrer"
                          className="w-8.5 h-8.5 rounded-xl object-cover border border-white/10 shrink-0" 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-white font-sans leading-none">{currentUser.name}</span>
                            <span className="text-[9px] text-[#8B5CF6] animate-pulse">🟣✓</span>
                          </div>
                          <span className="text-[10px] font-mono text-violet-400 font-bold block mt-0.5">@{currentUser.username}</span>
                        </div>
                      </div>
                      
                      {/* Audience Selector right inline */}
                      <div className="space-y-0.5 shrink-0 text-right">
                        <label className="text-[8px] font-mono text-current/40 uppercase block">Audience Selector</label>
                        <select 
                          value={selectedAudience}
                          onChange={(e) => setSelectedAudience(e.target.value as any)}
                          className="bg-black/40 border border-white/10 rounded-lg text-[10px] font-sans px-2 py-1 text-violet-300 focus:outline-hidden cursor-pointer"
                        >
                          <option value="public">🌍 Public</option>
                          <option value="circle">🔵 Close Friends</option>
                          <option value="community">🏟 Community</option>
                          <option value="followers">👥 Followers</option>
                          <option value="onlyme">🔒 Only Me</option>
                        </select>
                      </div>
                    </div>

                    {/* VOH VOICE RECORDING SECTION OR NORMAL TEXT COMPOSER */}
                    {activePostType === 'voice' ? (
                      /* VOICE POST CHANNEL COMPONENT */
                      <div className="p-5 rounded-2xl bg-[#09071c] border border-violet-500/20 space-y-4 text-center">
                        <div className="space-y-1">
                          <h4 className="text-xs font-mono font-black text-rose-400 uppercase tracking-widest flex items-center justify-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              {voiceRecordingState === 'recording' && (
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                              )}
                              <span className={`relative inline-flex rounded-full h-2 w-2 ${voiceRecordingState === 'recording' ? 'bg-rose-500' : 'bg-current/30'}`} />
                            </span>
                            {voiceRecordingState === 'idle' ? 'STANDBY DIRECT RECORD' : voiceRecordingState === 'recording' ? 'BROADCASTING VOICE STREAM' : 'VOH AI DIGESTION ENGINE'}
                          </h4>
                          <span className="text-[24px] font-mono font-bold text-white block mt-2">
                            0:{voiceAudioLength.toString().padStart(2, '0')}
                            <span className="text-xs text-current/40"> / 0:18</span>
                          </span>
                        </div>

                        {/* Animated waveform container */}
                        <div className="flex items-center justify-center gap-[3px] h-10 w-full px-5 overflow-hidden">
                          {[...Array(32)].map((_, i) => {
                            const isRec = voiceRecordingState === 'recording';
                            const height = isRec 
                              ? Math.sin(i * 0.9 + voiceAudioLength) * 85 + Math.random() * 15
                              : 10 + Math.sin(i) * 20;
                            return (
                              <div 
                                key={i}
                                className={`w-[2.5px] rounded-full transition-all duration-300 ${isRec ? 'bg-linear-to-t from-violet-500 via-pink-400 to-cyan-400' : 'bg-white/10'}`}
                                style={{ height: `${Math.max(15, Math.abs(height))}%` }}
                              />
                            );
                          })}
                        </div>

                        {/* Controls row */}
                        <div className="flex justify-center items-center gap-4">
                          {voiceRecordingState === 'recording' ? (
                            <>
                              <button 
                                type="button"
                                onClick={() => setVoiceRecordingState('finished')}
                                className="w-12 h-12 rounded-full border border-violet-500/30 bg-violet-600/20 text-white flex items-center justify-center cursor-pointer hover:bg-violet-600/30 active:scale-95 transition-all text-xs font-black font-mono"
                              >
                                STOP
                              </button>
                            </>
                          ) : voiceRecordingState === 'finished' ? (
                            <>
                              <button 
                                type="button"
                                onClick={() => {
                                  setVoiceRecordingState('idle');
                                  setVoiceAudioLength(0);
                                  setVoiceTranscription('');
                                }}
                                className="px-3.5 py-2 text-[10px] font-mono text-rose-400 hover:bg-rose-400/5 bg-transparent border border-rose-500/15 rounded-xl cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 inline mr-1" /> RESET
                              </button>
                              <div className="w-14 h-14 rounded-full bg-linear-to-r from-violet-600 to-pink-500 flex items-center justify-center text-white cursor-pointer active:scale-95 transition-all">
                                <Play className="w-4 h-4 ml-0.5" />
                              </div>
                              <button 
                                type="button"
                                onClick={() => {
                                  setVoiceRecordingState('recording');
                                  setVoiceAudioLength(0);
                                  setVoiceTranscription('');
                                  const timer = setInterval(() => {
                                    setVoiceAudioLength(prev => {
                                      if (prev >= 18) {
                                        clearInterval(timer);
                                        setVoiceRecordingState('finished');
                                        return 18;
                                      }
                                      return prev + 1;
                                    });
                                  }, 1000);
                                }}
                                className="px-3.5 py-2 text-[10px] font-mono text-cyan-400 hover:bg-cyan-400/5 bg-transparent border border-cyan-500/15 rounded-xl cursor-pointer"
                              >
                                <RefreshCw className="w-3.5 h-3.5 inline mr-1" /> RE-WRITE
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setVoiceRecordingState('recording');
                                setVoiceAudioLength(0);
                                setVoiceTranscription('');
                                
                                // Simulated 18 seconds record timer sequence
                                const recordingInterval = setInterval(() => {
                                  setVoiceAudioLength(prev => {
                                    if (prev >= 17) {
                                      clearInterval(recordingInterval);
                                      // Trigger end of voice recording and transcribe
                                      setVoiceRecordingState('finished');
                                      setLoadingAi(true);
                                      setTimeout(() => {
                                        setVoiceTranscription('Bypassing standard traditional noisy broadcasts, I am live-transcribing organic code aesthetics on the Nexora timeline. This voice broadcast represents the high-craft systems thinking.');
                                        setLoadingAi(false);
                                      }, 1500);
                                      return 18;
                                    }
                                    return prev + 1;
                                  });
                                }, 1000);
                              }}
                              className="w-16 h-16 rounded-full bg-linear-to-r from-rose-500 to-pink-600 shadow-lg shadow-rose-500/30 flex items-center justify-center text-white cursor-pointer hover:scale-105 active:scale-95 transition-all"
                            >
                              <Mic className="w-6 h-6 animate-pulse" />
                            </button>
                          )}
                        </div>

                        {/* Automatic VOH AI transcribing readout card */}
                        {(voiceRecordingState === 'finished' || loadingAi) && (
                          <div className="p-4 rounded-xl bg-black/40 border border-[#8B5CF6]/20 text-left space-y-2">
                            <span className="text-[8px] font-mono text-[#8B5CF6] font-black tracking-widest uppercase block animate-pulse">
                              🧠 VOH AI VOICE EXTRACTION PIPELINE
                            </span>
                            {loadingAi ? (
                              <p className="text-[10px] text-current/50 italic font-mono animate-pulse">
                                VOH AI is thinking...
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <div className="space-y-0.5">
                                  <span className="text-[7.5px] font-mono uppercase bg-violet-600/20 text-violet-300 px-1 py-0.5 rounded-sm">AUTO-TRANSCRIPT</span>
                                  <p className="text-[11px] font-sans text-white/90 italic leading-relaxed mt-1">
                                    "{voiceTranscription}"
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-[9.5px]">
                                  <div>
                                    <span className="text-[7px] font-mono text-[#8B5CF6]">SPANISH TRANSLATION</span>
                                    <p className="font-sans text-current/80 mt-0.5">"Transmitiendo en vivo estética de código orgánico sin latencia..."</p>
                                  </div>
                                  <div>
                                    <span className="text-[7px] font-mono text-cyan-400">KEYWORDS SUMMARY</span>
                                    <p className="font-sans text-current/80 mt-0.5">High-craft layout engineering; Bypassing traditional news noise.</p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : activePostType === 'video' ? (
                      /* NEXORA STUDIO VIDEO WORKSPACE */
                      <div className="space-y-4">
                        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black/60 border border-white/10 flex flex-col justify-between p-4 group">
                          {/* Inner watermarks styling */}
                          <div className="absolute inset-0 z-0 flex items-center justify-center opacity-70">
                            <div className="flex flex-col items-center text-center space-y-2">
                              <VideoIcon className="w-12 h-12 text-[#8B5CF6]/30 animate-pulse" />
                              <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">NEXORA VIDEO RENDER ACTIVE</span>
                            </div>
                          </div>

                          <div className="z-10 flex justify-between items-center text-[9px] font-mono text-white/40 uppercase">
                            <span>Muted: {videoMuted ? 'YES' : 'NO'}</span>
                            <span>Resolution: 1080P PRO</span>
                          </div>

                          {/* Footer options */}
                          <div className="z-10 bg-slate-950/80 border border-white/5 p-3 rounded-xl mt-auto max-w-xs space-y-1">
                            <span className="text-[8px] font-mono text-cyan-300 font-bold block uppercase">PREV TRIM SELECTION</span>
                            <p className="text-[10px] text-white font-sans truncate">
                              {modalContent || 'Aesthetic Nexora Video Stream Clip'}
                            </p>
                          </div>
                        </div>

                        {/* Video Editor Slider Controls */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                          <div className="space-y-1.5 text-left">
                            <label className="text-[9.5px] font-mono text-current/50 uppercase block">✂️ TRIM LENGTH</label>
                            <div className="flex gap-2">
                              {[15, 30, 60].map((t) => (
                                <button
                                  key={t}
                                  type="button"
                                  onClick={() => setVideoTimer(t)}
                                  className={`flex-1 px-3 py-1.5 text-xs font-mono rounded-lg border transition-all cursor-pointer ${
                                    videoTimer === t 
                                      ? 'bg-violet-600/20 border-violet-500 text-violet-300 font-bold' 
                                      : 'bg-transparent border-white/10 hover:border-white/20'
                                  }`}
                                >
                                  {t}s
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-1.5 text-left">
                            <label className="text-[9.5px] font-mono text-current/50 uppercase block">🔉 AUDIO TRACK</label>
                            <button
                              type="button"
                              onClick={() => setVideoMuted(!videoMuted)}
                              className={`w-full py-1.5 text-xs font-sans rounded-lg border transition-all cursor-pointer ${
                                videoMuted 
                                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              }`}
                            >
                              {videoMuted ? '🔇 Audio Stream Muted' : '🔊 Studio Audio Active'}
                            </button>
                          </div>
                        </div>

                        {/* Video Caption area */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-current/50">Video Caption</label>
                          <input 
                            type="text"
                            placeholder="What is happening in this clip?"
                            value={modalContent}
                            onChange={(e) => setModalContent(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs rounded-xl bg-current/5 border border-current/5 focus:outline-hidden text-current font-sans"
                          />
                        </div>
                      </div>
                    ) : (
                      /* CUSTOM TEXT-BASED WORKSPACES (Text, Photo, Poll, Article, Mission, Community, Pulse) */
                      <div className="space-y-3.5">
                        
                        {/* Title text area for Article / Mission / Poll */}
                        {(activePostType === 'article' || activePostType === 'mission') && (
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono uppercase text-[#8B5CF6] font-bold">
                              {activePostType === 'article' ? '📄 Title' : '🎯 Challenge / Goal Target'}
                            </label>
                            <input 
                              type="text"
                              value={pulseRegion}
                              onChange={(e) => setPulseRegion(e.target.value)}
                              placeholder={activePostType === 'article' ? 'Diving deep into low-latency memory serialization' : 'Perform 100 organic UI layout reviews'}
                              className="w-full px-4 py-2.5 text-xs font-sans font-extrabold rounded-xl bg-current/5 border border-current/10 focus:outline-hidden text-white"
                            />
                          </div>
                        )}

                        {/* Normal textarea for typing */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-mono uppercase text-current/50">
                            {activePostType === 'poll' ? '📊 Poll Question' : "What's happening?"}
                          </label>
                          <textarea
                            required
                            rows={activePostType === 'article' ? 6 : 4}
                            maxLength={800}
                            placeholder="What's happening?"
                            value={activePostType === 'poll' ? pollQuestion : modalContent}
                            onChange={(e) => {
                              if (activePostType === 'poll') {
                                setPollQuestion(e.target.value);
                              } else {
                                setModalContent(e.target.value);
                              }
                            }}
                            className="w-full px-4 py-3 text-xs rounded-xl bg-current/5 border border-white/5 focus:border-[#8B5CF6]/30 focus:outline-hidden text-current font-sans leading-relaxed"
                          />
                        </div>

                        {/* Interactive Poll choice inputs if setting up a poll */}
                        {activePostType === 'poll' && (
                          <div className="p-3.5 rounded-2xl bg-[#09071c] border border-violet-500/15 space-y-2.5">
                            <span className="text-[9px] font-mono text-[#8B5CF6] font-black uppercase tracking-wider block">
                              📊 ADD POLL RESPONSES
                            </span>
                            {pollOptions.map((opt, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-current/40 w-4">{optIndex + 1}</span>
                                <input 
                                  type="text"
                                  value={opt}
                                  onChange={(e) => {
                                    const nextOpts = [...pollOptions];
                                    nextOpts[optIndex] = e.target.value;
                                    setPollOptions(nextOpts);
                                  }}
                                  placeholder={`Response option ${optIndex + 1}`}
                                  className="flex-1 px-3 py-2 text-xs font-sans rounded-xl bg-black/40 border border-white/10 text-white focus:outline-hidden focus:border-[#8B5CF6]/30 font-bold"
                                />
                                {pollOptions.length > 2 && (
                                  <button 
                                    type="button" 
                                    onClick={() => setPollOptions(prev => prev.filter((_, idx) => idx !== optIndex))}
                                    className="p-1 text-rose-400 hover:text-rose-500 transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            ))}
                            {pollOptions.length < 5 && (
                              <button
                                type="button"
                                onClick={() => setPollOptions(prev => [...prev, ''])}
                                className="text-[10px] font-mono text-[#8B5CF6] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                + Add another choice
                              </button>
                            )}
                          </div>
                        )}

                        {/* Aesthetic photo presets selection grid if photo category is active */}
                        {activePostType === 'photo' && (
                          <div className="space-y-2 p-3 bg-white/[0.01] border border-white/5 rounded-2xl">
                            <div className="flex justify-between items-center text-[10px] font-mono">
                              <span className="text-current/50">📷 ATTACH AESTHETIC VISUAL GRID:</span>
                              {modalImage && (
                                <button
                                  type="button"
                                  onClick={() => setModalImage('')}
                                  className="text-[9px] font-mono text-rose-400 hover:underline cursor-pointer"
                                >
                                  Clear selection [x]
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {[
                                { name: 'Tech/Abstract', url: 'https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=400&q=80' },
                                { name: 'Glow/Design', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80' },
                                { name: 'City/Neon', url: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80' },
                                { name: 'Space/Stars', url: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&q=80' }
                              ].map((img, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => setModalImage(img.url)}
                                  className={`relative h-12 rounded-lg overflow-hidden border transition-all cursor-pointer hover:opacity-100 ${
                                    modalImage === img.url 
                                      ? 'border-[#8B5CF6] ring-2 ring-[#8B5CF6]/50 opacity-100' 
                                      : 'border-white/10 opacity-60'
                                  }`}
                                >
                                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Extra City Tag option for Pulse Report type */}
                        {activePostType === 'pulse' && (
                          <div className="space-y-1 text-left">
                            <label className="text-[10px] font-mono uppercase text-cyan-400">📍 CITY / REGION PATH</label>
                            <input 
                              type="text" 
                              required
                              placeholder="e.g. Port Harcourt, Copenhagen, Lagos, Tokyo"
                              value={pulseRegion}
                              onChange={(e) => setPulseRegion(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-sans text-white focus:outline-hidden focus:border-[#8B5CF6]/30 font-bold"
                            />
                          </div>
                        )}

                        {/* Extra target Community selector for Community Post type */}
                        {activePostType === 'community' && (
                          <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-mono text-violet-400 uppercase">🏟 TARGET NETWORK CHANNEL</label>
                            <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                              {[
                                '⚽ Football Tacticians Group',
                                '🧠 Premium AI Forge',
                                '🎨 Symmetrical Designers'
                              ].map((item) => (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => setPulseRegion(item)}
                                  className={`p-2 rounded-xl border text-left font-sans transition-all cursor-pointer ${
                                    pulseRegion === item 
                                      ? 'bg-violet-600/10 border-violet-500 text-violet-300 font-bold' 
                                      : 'bg-black/40 border-white/5 hover:bg-white/5 text-current/70'
                                  }`}
                                >
                                  {item}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Topics Section */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-mono uppercase text-current/50">🏷 Topics Tags</label>
                          <input
                            type="text"
                            placeholder="e.g. Football, Technology, Business"
                            value={modalTags}
                            onChange={(e) => setModalTags(e.target.value)}
                            className="w-full px-4 py-2.5 text-xs rounded-xl bg-current/5 border border-white/5 focus:outline-hidden text-current font-sans"
                          />
                          
                          {/* Recommended rapid-tap tags */}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {['#Football', '#Technology', '#Business', '#Gaming'].map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  // Clean tag
                                  const rawTag = tag.replace('#', '');
                                  if (!modalTags.includes(rawTag)) {
                                    setModalTags(prev => prev ? `${prev}, ${rawTag}` : rawTag);
                                  }
                                }}
                                className="text-[9.5px] font-mono bg-current/5 hover:bg-current/10 text-violet-400 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Premium NEXORA Custom toggles configuration */}
                        <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center justify-between gap-3">
                          <div className="text-left space-y-0.5">
                            <h5 className="text-[11px] font-bold text-white font-sans flex items-center gap-1.5 leading-none">
                              ☑ Add To World Pulse
                              <span className="text-[7px] font-mono bg-cyan-500/15 text-cyan-300 px-1 py-0.5 rounded-sm uppercase tracking-wider font-extrabold">LIVE</span>
                            </h5>
                            <p className="text-[10px] text-current/50 font-sans leading-relaxed">
                              If content discusses events, local news or sports, it feeds directly on the World Pulse map indices.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAddToWorldPulse(!addToWorldPulse)}
                            className={`w-10 h-6 rounded-full shrink-0 p-0.5 transition-colors cursor-pointer relative ${
                              addToWorldPulse ? 'bg-[#8B5CF6]' : 'bg-zinc-800'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white transition-all shadow-md ${
                              addToWorldPulse ? 'translate-x-4' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        {/* Simulated VOH AI intelligence enhancement loader / button */}
                        <div className="pt-1.5 flex justify-between items-center bg-violet-600/5 border border-[#8B5CF6]/15 rounded-2xl px-3.5 py-2">
                          <span className="text-[10px] font-mono text-violet-300 font-extrabold uppercase">🚀 Intelligent VOH AI Enhancer</span>
                          <button
                            type="button"
                            onClick={async () => {
                              setLoadingAi(true);
                              try {
                                if (activePostType === 'poll') {
                                  const textToImprove = pollQuestion.trim() || "What technology is best?";
                                  const res = await fetch('/api/voh-ai/chat', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                      message: `Create an extremely engaging tech/community poll based on this topic: "${textToImprove}". Provide the poll question and exactly 3 options. Respond in simple JSON format like: {"question": "...", "options": ["...", "...", "..."], "tags": "..."}`,
                                    })
                                  });
                                  const data = await res.json();
                                  try {
                                    const parsed = JSON.parse(data.text);
                                    if (parsed.question && Array.isArray(parsed.options)) {
                                      setPollQuestion(parsed.question);
                                      setPollOptions(parsed.options);
                                      setModalTags(parsed.tags || 'Technology, SystemsDesign');
                                    }
                                  } catch (pe) {
                                    setPollQuestion('Which system engine topology serves decentralized community spaces best?');
                                    setPollOptions(['Rust Raw Socket SIMD Serialization', 'Go High-Concurrency Channels', 'Zig Arena-allocated Buffers']);
                                    setModalTags('Technology, Rust, SystemsDesign');
                                  }
                                } else {
                                  const textToImprove = modalContent.trim() || 'Co-building a new design framework today';
                                  const res = await fetch('/api/voh-ai/improve-post', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ content: textToImprove })
                                  });
                                  const data = await res.json();
                                  setModalContent(data.text);
                                  setModalTags('SpaceGlass, SystemsDesign, Innovation');
                                }
                              } catch (err) {
                                console.error('Improve post AI error:', err);
                              } finally {
                                setLoadingAi(false);
                              }
                            }}
                            className="bg-[#8B5CF6] text-white px-3 py-1.5 rounded-xl text-[10px] font-sans font-bold hover:brightness-110 cursor-pointer flex items-center gap-1 shadow-sm uppercase tracking-wide"
                          >
                            {loadingAi ? 'IMPROVING...' : '✨ Improve Post'}
                          </button>
                        </div>

                        {/* LIVE PREVIEW BOX - Highly polished render of post */}
                        {(modalContent.trim() || pollQuestion.trim()) && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-mono text-current/30 uppercase block">POST PREVIEW:</span>
                            <div className="p-4 rounded-2xl bg-black/60 border border-white/5 text-left space-y-3">
                              <div className="flex items-center gap-2.5">
                                <img src={currentUser.avatar} alt="avatar" className="w-8 h-8 rounded-xl object-cover" />
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold font-sans text-white leading-none">{currentUser.name}</span>
                                    <span className="text-[9px] text-[#8B5CF6]">🟣✓</span>
                                  </div>
                                  <span className="text-[9px] font-mono text-violet-400 mt-0.5 block">@{currentUser.username} • Just now</span>
                                </div>
                              </div>
                              <p className="text-xs text-white/95 font-sans leading-relaxed">
                                {activePostType === 'poll' ? `📊 ${pollQuestion}` : modalContent}
                              </p>
                              {activePostType === 'poll' && (
                                <div className="space-y-1.5 pl-3">
                                  {pollOptions.filter(o => o.trim()).map((o, idx) => (
                                    <div key={idx} className="p-2 rounded-xl bg-violet-950/20 border border-violet-500/10 text-[11px] font-sans text-violet-200">
                                      {o}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {modalImage && (
                                <div className="overflow-hidden rounded-xl border border-white/5 h-24 bg-slate-900">
                                  <img src={modalImage} className="w-full h-full object-cover" alt="preview" />
                                </div>
                              )}
                              {modalTags && (
                                <div className="flex flex-wrap gap-1">
                                  {modalTags.split(',').map((t, idx) => (
                                    <span key={idx} className="text-[9px] font-mono text-[#8B5CF6]">#{t.trim().replace('#', '')}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Submit Footers */}
                    <div className="flex items-center justify-between border-t border-white/5 pt-3">
                      <span className="text-[9.5px] font-mono text-current/40">
                        Format: Premium Nexora Mesh Spec
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActivePostType(null)}
                          className="px-4 py-2 text-xs font-mono font-bold text-current/60 hover:bg-current/5 rounded-xl border border-transparent cursor-pointer transition-all"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          disabled={
                            activePostType === 'voice' 
                              ? (voiceRecordingState !== 'finished' || !voiceTranscription)
                              : activePostType === 'poll' ? (!pollQuestion.trim() || !pollOptions[0].trim()) : !modalContent.trim()
                          }
                          onClick={() => {
                            // Extract content dynamically
                            let finalContent = modalContent;
                            if (activePostType === 'voice') {
                              finalContent = `🎙 Voice Post: "${voiceTranscription || 'Vocal discussion broad overview'}"`;
                            } else if (activePostType === 'article') {
                              finalContent = `📄 [Long-form Article] ${modalContent}`;
                            } else if (activePostType === 'pulse') {
                              finalContent = `🌍 [Pulse Report: ${pulseRegion || 'Local Area'}] ${modalContent}`;
                            } else if (activePostType === 'community') {
                              finalContent = `🏟 [Posted in community: ${pulseRegion || 'General Group'}] ${modalContent}`;
                            } else if (activePostType === 'poll') {
                              finalContent = `📊 Poll Question: ${pollQuestion}`;
                            }

                            // Share flow trigger
                            const newPostId = handleAddPost(finalContent, modalImage || undefined, modalTags);
                            
                            // Attach special entities
                            if (activePostType === 'poll') {
                              setPosts(prev => prev.map(p => {
                                if (p.id === newPostId) {
                                  return {
                                    ...p,
                                    interactivePoll: {
                                      question: pollQuestion,
                                      options: pollOptions.filter(o => o.trim()).map((o, idx) => ({
                                        id: `opt-${Date.now()}-${idx}`,
                                        text: o,
                                        votes: Math.floor(Math.random() * 20)+1
                                      }))
                                    }
                                  };
                                }
                                return p;
                              }));
                            }

                            const mockLink = `${window.location.origin}/post/${newPostId}`;
                            setCreatedPostLink(mockLink);
                            setIsCopied(false);
                            
                            try {
                              navigator.clipboard.writeText(mockLink);
                              setIsCopied(true);
                              setTimeout(() => setIsCopied(false), 2000);
                            } catch(e){}
                          }}
                          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-mono font-bold rounded-xl bg-violet-600/15 hover:bg-violet-600/25 text-violet-300 disabled:opacity-40 transition-all border border-violet-500/15 cursor-pointer uppercase"
                        >
                          <Share2 className="w-3.5 h-3.5 hover:scale-110" />
                          Share & Copy
                        </button>

                        <button
                          type="button"
                          disabled={
                            activePostType === 'voice' 
                              ? (voiceRecordingState !== 'finished' || !voiceTranscription)
                              : activePostType === 'poll' ? (!pollQuestion.trim() || !pollOptions[0].trim()) : !modalContent.trim()
                          }
                          onClick={() => {
                            // Unified submit action
                            let finalContent = modalContent;
                            if (activePostType === 'voice') {
                              finalContent = `🎙 Voice Post: "${voiceTranscription || 'Vocal discussion broad overview'}"`;
                            } else if (activePostType === 'article') {
                              finalContent = `📄 [Long-form Article] ${modalContent}`;
                            } else if (activePostType === 'pulse') {
                              finalContent = `🌍 [Pulse Report: ${pulseRegion || 'Local Area'}] ${modalContent}`;
                            } else if (activePostType === 'community') {
                              finalContent = `🏟 [Posted in community: ${pulseRegion || 'General Group'}] ${modalContent}`;
                            } else if (activePostType === 'poll') {
                              finalContent = `📊 Poll Question: ${pollQuestion}`;
                            }

                            const newPostId = handleAddPost(finalContent, modalImage || undefined, modalTags);
                            
                            // Attach special entities
                            if (activePostType === 'poll') {
                              setPosts(prev => prev.map(p => {
                                if (p.id === newPostId) {
                                  return {
                                    ...p,
                                    interactivePoll: {
                                      question: pollQuestion,
                                      options: pollOptions.filter(o => o.trim()).map((o, idx) => ({
                                        id: `opt-${Date.now()}-${idx}`,
                                        text: o,
                                        votes: Math.floor(Math.random() * 20)+1
                                      }))
                                    }
                                  };
                                }
                                return p;
                              }));
                            }
                            
                            handleCloseCreateModal();
                          }}
                          className="px-5 py-2.5 text-xs font-mono font-bold rounded-xl bg-linear-to-r from-violet-600 to-pink-500 text-white hover:brightness-110 active:scale-98 disabled:opacity-50 transition-all cursor-pointer uppercase tracking-wider"
                        >
                          Post
                        </button>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 📥 PWA CUSTOM INSTALLATION POPUP & OVERLAY */}
      <AnimatePresence>
        {showPWAInstallPrompt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleMaybeLaterPWA}
              className="absolute inset-0 bg-slate-950/70"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 10 }}
              className="relative w-full max-w-sm rounded-[32px] bg-linear-to-b from-[#110931] to-[#04010b] border border-violet-500/25 p-6 text-center shadow-2xl overflow-hidden z-10"
            >
              {/* Decorative background radial glows */}
              <div className="absolute right-0 top-0 w-32 h-32 bg-violet-600/15 rounded-full blur-2xl animate-pulse" />
              <div className="absolute left-0 bottom-0 w-32 h-32 bg-cyan-600/15 rounded-full blur-2xl" />

              <button
                onClick={handleMaybeLaterPWA}
                className="absolute top-4 right-4 p-2 text-violet-400/60 hover:text-white rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer z-20"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="relative z-10 space-y-4 animate-fade-in">
                
                {/* Luminous Pulsing Logo Preview Container */}
                <div className="relative w-20 h-20 mx-auto rounded-3xl overflow-hidden border border-violet-500/40 group shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_35px_rgba(139,92,246,0.6)] transition-all">
                  <img
                    src="/logo.png"
                    alt="Nexora PWA Logo"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      // Custom high contrast vector fallback
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg viewBox='0 0 240 240' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='240' height='240' rx='54' fill='%230a071d'/%3E%3Cpath d='M80 60 L160 180 M160 60 L80 180' stroke='%238B5CF6' strokeWidth='24' strokeLinecap='round'/%3E%3C/svg%3E";
                    }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-violet-600/20 to-transparent mix-blend-overlay" />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-[9px] text-[#8B5CF6] font-mono tracking-widest uppercase font-extrabold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>Fast Web Version Ready</span>
                  </div>
                  <h3 className="text-base font-black font-sans text-white uppercase tracking-wider leading-tight">
                    Install Nexora
                  </h3>
                  <p className="text-[10.5px] text-violet-300/65 font-sans leading-relaxed max-w-xs mx-auto">
                    Install Nexora for a faster, full-screen experience with quicker loading and easier access.
                  </p>
                </div>

                {/* CTA Dynamic Options */}
                <div className="space-y-2.5 pt-2">
                  {deferredPrompt ? (
                    <button
                      onClick={handleTriggerPWAInstall}
                      className="w-full py-3 rounded-2xl bg-linear-to-r from-violet-600 via-pink-600 to-pink-500 text-white font-sans text-xs font-black uppercase tracking-wider shadow-md hover:brightness-110 active:scale-97 hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4 animate-bounce" />
                      <span>Confirm Installation 🚀</span>
                    </button>
                  ) : (
                    <div className="space-y-2 text-left">
                      {/* Manual setup directions */}
                      <div className="p-3 bg-black/45 rounded-2xl border border-violet-500/10 space-y-2 text-[10px] font-sans text-violet-300/80 leading-relaxed">
                        <div className="flex items-center gap-1 text-[9px] font-mono text-cyan-400 uppercase font-black tracking-wider">
                          <span>📲 How to install on your phone:</span>
                        </div>
                        <p className="border-b border-violet-500/5 pb-1.5">
                          🍎 <strong>iPhone (Safari):</strong> Tap the <strong>Share</strong> button at the bottom of Safari, scroll down, and tap <strong>Add to Home Screen</strong>.
                        </p>
                        <p className="border-b border-violet-500/5 pb-1.5">
                          🤖 <strong>Android (Chrome):</strong> Tap the three dots <strong>⋮</strong> at the top right, then tap <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                        </p>
                        <p>
                          💻 <strong>Computer:</strong> Click the install icon in the web address bar at the top right.
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('toast', { detail: 'Nexora is ready to be installed! Follow the helper guide above.' }));
                        }}
                        className="w-full py-2.5 rounded-xl bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-300 font-sans text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center"
                      >
                        Activate Features ✓
                      </button>
                    </div>
                  )}

                  <button
                    onClick={handleMaybeLaterPWA}
                    className="text-[9px] font-mono text-violet-400/40 hover:text-white uppercase block mx-auto underline transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sleek unified bottom navigation bar (primary app navigation for all sizes) */}
      <div 
        id="nexora-unified-bottom-nav"
        className="fixed bottom-0 md:bottom-6 inset-x-0 md:left-1/2 md:-translate-x-1/2 md:max-w-xl bg-[#06040f]/95 border-t md:border border-violet-500/15 md:rounded-2xl backdrop-blur-md z-40 py-2 px-6 flex justify-between items-center text-current/60 shadow-[0_-5px_25px_rgba(139,92,246,0.2)] md:shadow-[0_10px_35px_rgba(0,0,0,0.9)] pb-safe"
      >
        <button 
          onClick={() => {
            setActiveTab('feed');
            setViewedUser(null);
          }}
          className={`flex flex-col items-center gap-1 py-1 px-3 border border-transparent rounded-xl transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:bg-violet-950/30 hover:border-violet-500/30 hover:shadow-[0_0_15px_rgba(139,92,246,0.2)] ${activeTab === 'feed' ? 'text-violet-400 scale-105 font-bold bg-violet-950/20 border-violet-500/10' : 'hover:text-current'}`}
          id="mobile-nav-home"
        >
          <Home className="w-5 h-5" />
          <span className="text-[8px] font-mono tracking-wider uppercase animate-fade-in">Home</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('explore');
            setViewedUser(null);
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 border border-transparent rounded-xl transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:bg-cyan-950/20 hover:border-cyan-500/30 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] ${activeTab === 'explore' ? 'text-cyan-400 scale-105 font-bold bg-cyan-950/15 border-cyan-500/10' : 'hover:text-current'}`}
          id="mobile-nav-search"
        >
          <Search className="w-5 h-5" />
          <span className="text-[8px] font-mono tracking-wider uppercase animate-fade-in">Search</span>
        </button>
        
        {/* Unified Plus/Create Button in Center with expanded high performance glow */}
        <motion.button 
          onClick={() => {
            setCreatedPostLink(null);
            setIsCopied(false);
            setCreationInitialMode(null);
            setCreationInitialTab(undefined);
            setIsCreateMenuOpen(true);
          }}
          className="relative -top-4 flex items-center justify-center w-11 h-11 rounded-full text-white outline-hidden bg-linear-to-tr from-violet-600 via-pink-500 to-cyan-400 cursor-pointer border border-white/20 hover:border-white/50 z-10"
          id="nav-create-post-center"
          title="Create Broadcast"
          animate={{
            boxShadow: [
              "0 0 12px rgba(139, 92, 246, 0.4)",
              "0 0 24px rgba(139, 92, 246, 0.8)",
              "0 0 12px rgba(139, 92, 246, 0.4)"
            ],
            scale: [1, 1.02, 1],
          }}
          transition={{
            boxShadow: {
              repeat: Infinity,
              duration: 2.2,
              ease: "easeInOut"
            },
            scale: {
              repeat: Infinity,
              duration: 2.2,
              ease: "easeInOut"
            }
          }}
          whileHover={{
            scale: 1.15,
            y: -3,
            boxShadow: "0 0 32px rgba(139, 92, 246, 0.95), 0 0 16px rgba(236, 72, 153, 0.7)",
            transition: {
              duration: 0.25,
              ease: "easeOut"
            }
          }}
          whileTap={{ 
            scale: 0.84,
            rotate: -3,
            transition: {
              type: "spring",
              stiffness: 500,
              damping: 15
            }
          }}
        >
          {/* Subtle radiating pulse rings inside the button acting as a glowing halo */}
          <motion.div
            className="absolute inset-0 rounded-full bg-violet-500/35 pointer-events-none -z-10"
            animate={{
              scale: [1, 1.5],
              opacity: [0.6, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.2,
              ease: "easeOut",
            }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-cyan-500/25 pointer-events-none -z-10"
            animate={{
              scale: [1, 1.3],
              opacity: [0.55, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.2,
              delay: 0.7,
              ease: "easeOut",
            }}
          />
          <Plus className="w-5.5 h-5.5 text-white relative z-10" />

          {/* Status Indicator Badge */}
          {(isOffline || isSyncPending) && (
            <span 
              className={`absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-[#06040f] z-20 shadow-md ${
                isSyncPending ? 'bg-purple-500' : (isOffline ? 'bg-amber-500' : 'bg-purple-500')
              }`}
              title={isOffline ? (isSyncPending ? "Offline - Pending Updates" : "Offline Mode Active") : "Updating Offline Logs..."}
            >
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isSyncPending ? 'bg-purple-400 animate-pulse' : (isOffline ? 'bg-amber-400 animate-pulse' : 'bg-[#c084fc] animate-ping')
              }`} />
              {isSyncPending ? (
                <RefreshCw className="w-2.5 h-2.5 text-white shrink-0 relative z-10 animate-sync-pulse" />
              ) : isOffline ? (
                <WifiOff className="w-2.5 h-2.5 text-zinc-950 shrink-0 relative z-10" />
              ) : (
                <RefreshCw className="w-2.5 h-2.5 text-white shrink-0 relative z-10 animate-spin" />
              )}
            </span>
          )}
        </motion.button>
 
        <button 
          onClick={() => {
            setActiveTab('inbox');
            setViewedUser(null);
          }}
          className={`flex flex-col items-center gap-1 relative py-1 px-2.5 border border-transparent rounded-xl transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:bg-violet-950/30 hover:border-violet-500/30 hover:shadow-[0_0_15px_rgba(139,92,246,0.2)] ${(activeTab === 'inbox' || activeTab === 'activity') ? 'text-violet-400 scale-105 font-bold bg-violet-950/20 border-violet-500/10' : 'hover:text-current'}`}
          id="mobile-nav-inbox"
        >
          <MessageSquare className="w-5 h-5" />
          {(unreadNotificationsCount + chats.reduce((acc, c) => acc + c.unreadCount, 0)) > 0 && (
            <span className="absolute top-1 right-2.5 w-1.5 h-1.5 rounded-full bg-pink-500 animate-pulse" />
          )}
          <span className="text-[8px] font-mono tracking-wider uppercase animate-fade-in">Inbox</span>
        </button>
        <button 
          onClick={() => {
            setActiveTab('profile');
            setViewedUser(null);
          }}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 border border-transparent rounded-xl transition-all duration-300 cursor-pointer hover:-translate-y-0.5 hover:bg-violet-950/30 hover:border-violet-500/30 hover:shadow-[0_0_15px_rgba(139,92,246,0.2)] ${activeTab === 'profile' ? 'text-violet-400 scale-105 font-bold bg-violet-950/20 border-violet-500/10' : 'hover:text-current'}`}
          id="mobile-nav-profile"
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[8px] font-mono tracking-wider uppercase animate-fade-in">Profile</span>
        </button>
      </div>

      {/* 🟣 VOH AI VERIFICATION EXPLANATION MODAL */}
      <AnimatePresence>
        {verificationModalDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[1000] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-[#0a071c] border border-violet-500/20 p-6 rounded-3xl space-y-4 shadow-2xl relative text-left"
            >
              <div className="flex items-center justify-between border-b border-violet-500/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center border border-violet-500/30">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider">
                      VOH AI VERIFICATION INDEX
                    </h3>
                    <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest block mt-0.5">
                      {verificationModalDetail.tooltip}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setVerificationModalDetail(null)}
                  className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs leading-relaxed font-sans text-zinc-300">
                <p>
                  This account has been thoroughly audited and authenticated by the **Voice of Harrison (VOH AI)** core reputation indexer.
                </p>
                
                <div className="p-3 bg-violet-950/20 border border-violet-500/10 rounded-xl space-y-1.5">
                  <span className="text-[9.5px] font-mono text-pink-400 uppercase font-black tracking-widest block">
                    Verification Criteria
                  </span>
                  <ul className="space-y-1 text-[11px] list-disc list-inside">
                    <li>Biometric voiceprint verification & cryptographic signature match</li>
                    <li>Sustained contribution and community reputation threshold (Points &gt; 1,000)</li>
                    <li>Zero-tolerance policy adherence matching Harrison's AI directives</li>
                  </ul>
                </div>

                <p className="text-[11.5px] text-zinc-400 italic">
                  Verification on NEXORA guarantees absolute content origin integrity. Deepfakes, synthesized voice fraud, and duplicate identities are automatically flagged and blocked.
                </p>
              </div>

              <div className="border-t border-white/5 pt-3 flex justify-end">
                <button
                  onClick={() => setVerificationModalDetail(null)}
                  className="px-4 py-2 rounded-xl bg-linear-to-r from-violet-600 to-pink-600 hover:brightness-110 text-white font-sans text-xs font-black transition-all cursor-pointer shadow-md"
                >
                  ACKNOWLEDGE AUDIT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🟣 PREMIUM LOGOUT CONFIRMATION MODAL */}
      <AnimatePresence>
        {isLogoutConfirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[1010] flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="w-full max-w-sm bg-[#0e0b24] border border-violet-500/20 p-6 rounded-3xl space-y-5 shadow-2xl relative text-center"
            >
              {/* User Avatar Circle */}
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-2xl object-cover ring-4 ring-violet-500/30"
                  />
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-[#0e0b24]" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-black text-white">{currentUser.name}</h4>
                  <p className="text-xs font-mono text-zinc-500">@{currentUser.username}</p>
                </div>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-lg font-sans font-black text-white">Sign out of Nexora?</h3>
                <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                  You'll stop receiving real-time updates until you sign in again. Your account and data will remain safe.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2">
                <button
                  onClick={() => {
                    // Secure sign out
                    setIsLogoutConfirming(false);
                    // Clear session state
                    setIsLoggedIn(false);
                    localStorage.setItem('nexora_logged_in', 'false');
                    window.dispatchEvent(new CustomEvent('toast', { detail: '🚪 Signed out successfully' }));
                  }}
                  className="w-full py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-sans text-xs font-black transition-all cursor-pointer shadow-lg shadow-rose-600/20 active:scale-[0.98]"
                >
                  SIGN OUT
                </button>
                <button
                  onClick={() => setIsLogoutConfirming(false)}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-sans text-xs font-bold transition-all cursor-pointer border border-white/10 active:scale-[0.98]"
                >
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ☰ BEAUTIFUL CREATION CHANNELS BOTTOM SHEET */}
      <AnimatePresence>
        {isCreateMenuOpen && (
          <div className="fixed inset-0 z-[100] overflow-hidden flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateMenuOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-sm"
            />

            {/* Bottom Sheet Panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg bg-[#070514] border-t border-violet-500/20 rounded-t-[2.5rem] p-6 pb-12 max-h-[85vh] overflow-y-auto shadow-2xl space-y-6 z-10 scrollbar-none text-left"
            >
              {/* Header with pull tab */}
              <div className="flex flex-col items-center">
                <div className="w-12 h-1.5 rounded-full bg-zinc-800 mb-4 cursor-pointer" onClick={() => setIsCreateMenuOpen(false)} />
                <div className="flex items-center justify-between w-full border-b border-white/5 pb-3">
                  <div>
                    <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-violet-400" />
                      Create Node Broadcast
                    </h3>
                    <span className="text-[9px] font-mono text-purple-400 uppercase tracking-widest block mt-0.5">
                      Choose what you want to construct in the matrix
                    </span>
                  </div>
                  <button
                    onClick={() => setIsCreateMenuOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white cursor-pointer transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Grid of options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                
                {/* 1. Write Post */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateMenuOpen(false);
                    setCreationInitialMode('text');
                    setCreationInitialTab(undefined);
                    setIsCreatePostModalOpen(true);
                  }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-black/40 hover:bg-violet-950/20 border border-white/5 hover:border-violet-500/30 transition-all cursor-pointer text-left group"
                >
                  <div className="p-2.5 rounded-xl bg-violet-600/10 text-violet-400 group-hover:scale-110 group-hover:bg-violet-600/20 transition-all shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-sans font-black text-zinc-100 uppercase tracking-wide">Write Post / Thread</span>
                    <span className="block text-[10px] text-zinc-400 font-sans mt-0.5 leading-relaxed">
                      Share thoughts, formatted text, dynamic polls, and voice.
                    </span>
                  </div>
                </button>

                {/* 2. Upload Media */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateMenuOpen(false);
                    setCreationInitialMode('photo');
                    setCreationInitialTab(undefined);
                    setIsCreatePostModalOpen(true);
                  }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-black/40 hover:bg-emerald-950/20 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer text-left group"
                >
                  <div className="p-2.5 rounded-xl bg-emerald-600/10 text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-600/20 transition-all shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-sans font-black text-zinc-100 uppercase tracking-wide">Upload Media</span>
                    <span className="block text-[10px] text-zinc-400 font-sans mt-0.5 leading-relaxed">
                      Publish premium image carousels with beautiful custom shaders.
                    </span>
                  </div>
                </button>

                {/* 3. Record Reel */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateMenuOpen(false);
                    setCreationInitialMode('reel');
                    setCreationInitialTab(undefined);
                    setIsCreatePostModalOpen(true);
                  }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-black/40 hover:bg-cyan-950/20 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer text-left group"
                >
                  <div className="p-2.5 rounded-xl bg-cyan-600/10 text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-600/20 transition-all shrink-0">
                    <VideoIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-sans font-black text-zinc-100 uppercase tracking-wide">Cinematic Reel</span>
                    <span className="block text-[10px] text-zinc-400 font-sans mt-0.5 leading-relaxed">
                      Capture short, vertical high-fidelity cinematic video logs.
                    </span>
                  </div>
                </button>

                {/* 4. Go Live */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateMenuOpen(false);
                    setCreationInitialMode('video');
                    setCreationInitialTab(undefined);
                    setIsCreatePostModalOpen(true);
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('toast', { detail: '🔴 Connected to VOH live-streaming relay. Stream is ready!' }));
                    }, 500);
                  }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-black/40 hover:bg-rose-950/20 border border-white/5 hover:border-rose-500/30 transition-all cursor-pointer text-left group"
                >
                  <div className="p-2.5 rounded-xl bg-rose-600/10 text-rose-400 group-hover:scale-110 group-hover:bg-rose-600/20 transition-all shrink-0 relative">
                    <Radio className="w-5 h-5 animate-pulse" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  </div>
                  <div>
                    <span className="block text-xs font-sans font-black text-zinc-100 uppercase tracking-wide flex items-center gap-1.5">
                      Go Live
                      <span className="px-1 py-0.2 text-[7px] font-mono bg-rose-600 text-white font-extrabold rounded-sm uppercase tracking-widest">LIVE</span>
                    </span>
                    <span className="block text-[10px] text-zinc-400 font-sans mt-0.5 leading-relaxed">
                      Broadcast raw voice & video streams directly to subscribers.
                    </span>
                  </div>
                </button>

                {/* 5. Create Story */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateMenuOpen(false);
                    setCreationInitialMode(null);
                    setCreationInitialTab('story');
                    setIsCreatePostModalOpen(true);
                  }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-black/40 hover:bg-pink-950/20 border border-white/5 hover:border-pink-500/30 transition-all cursor-pointer text-left group"
                >
                  <div className="p-2.5 rounded-xl bg-pink-600/10 text-pink-400 group-hover:scale-110 group-hover:bg-pink-600/20 transition-all shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-sans font-black text-zinc-100 uppercase tracking-wide">Temporary Story</span>
                    <span className="block text-[10px] text-zinc-400 font-sans mt-0.5 leading-relaxed">
                      Post an ephemeral visual, audio, or text trace lasting 24 hours.
                    </span>
                  </div>
                </button>

                {/* 6. Drafts */}
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateMenuOpen(false);
                    setCreationInitialMode(null);
                    setCreationInitialTab('drafts');
                    setIsCreatePostModalOpen(true);
                  }}
                  className="flex items-start gap-3 p-4 rounded-2xl bg-black/40 hover:bg-amber-950/20 border border-white/5 hover:border-amber-500/30 transition-all cursor-pointer text-left group"
                >
                  <div className="p-2.5 rounded-xl bg-amber-600/10 text-amber-400 group-hover:scale-110 group-hover:bg-amber-600/20 transition-all shrink-0">
                    <FolderOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-sans font-black text-zinc-100 uppercase tracking-wide">Saved Drafts</span>
                    <span className="block text-[10px] text-zinc-400 font-sans mt-0.5 leading-relaxed">
                      Access, edit, or publish your unpublished, offline drafts.
                    </span>
                  </div>
                </button>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ⚡ NEXORA AI GLOBAL FLOATING ACTION BUBBLE */}
      {activeTab !== 'matrix' && (
        <button
          onClick={() => setIsAiCommandCenterOpen(true)}
          className="fixed top-24 right-4 md:top-auto md:bottom-10 md:right-10 z-45 p-4 rounded-full bg-gradient-to-tr from-violet-600 to-pink-500 hover:scale-105 active:scale-95 text-white transition-all shadow-xl shadow-violet-600/30 group cursor-pointer border border-violet-400/20"
          title="Open Nexora AI Command Center"
        >
          <Sparkles className="w-5 h-5 animate-pulse text-white group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* ⚡ NEXORA AI GLOBAL COMMAND CENTER MODAL */}
      <AnimatePresence>
        {isAiCommandCenterOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAiCommandCenterOpen(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* glass container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="relative w-full max-w-lg bg-[#070514] border border-violet-500/20 rounded-3xl p-6 shadow-2xl z-10 text-left overflow-hidden"
            >
              {/* Decorative neon blur */}
              <div className="absolute top-[-20%] left-[-10%] w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-[-20%] right-[-10%] w-64 h-64 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />

              {/* Header */}
              <div className="flex justify-between items-start border-b border-white/5 pb-3.5 mb-4 relative z-10">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-violet-600/10 border border-violet-500/20 rounded-xl text-violet-400">
                    <Sparkles className="w-4.5 h-4.5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold text-violet-400 tracking-wider uppercase">NEXORA AI HUB</h3>
                    <h2 className="text-base font-black font-sans text-white uppercase tracking-tight">VOH Command Center</h2>
                  </div>
                </div>
                <button
                  onClick={() => setIsAiCommandCenterOpen(false)}
                  className="p-1 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white cursor-pointer transition-colors"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              <p className="text-zinc-300 font-sans leading-relaxed mb-4 relative z-10 text-[11px]">
                Access VOH AI, Nexora's core intelligence, from anywhere. Submit a query below to immediately trigger on-chain summaries, feed optimization, or direct assistant dialogues.
              </p>

              {/* Suggested Direct Triggers */}
              <div className="space-y-2 mb-4 relative z-10">
                <span className="text-[9px] font-mono text-violet-400 uppercase tracking-widest block">Quick AI Commands</span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiCommandCenterOpen(false);
                      setActiveTab('matrix');
                      setMatrixSubTabRedirect('ai');
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('voh-ai-trigger-prompt', {
                          detail: { prompt: "Summarize my active feed.", contextType: "feed" }
                        }));
                      }, 300);
                    }}
                    className="p-2.5 rounded-xl bg-white/3 border border-white/5 hover:border-violet-500/30 text-left hover:bg-violet-950/20 transition-all group cursor-pointer"
                  >
                    <span className="block text-[10.5px] font-black text-white group-hover:text-violet-300 font-sans">#SummarizeFeed</span>
                    <span className="block text-[9px] text-zinc-400 font-sans mt-0.5">Parse active timeline posts</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsAiCommandCenterOpen(false);
                      setActiveTab('matrix');
                      setMatrixSubTabRedirect('ai');
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('voh-ai-trigger-prompt', {
                          detail: { prompt: "How do I maximize my NEX token tips and reputation points?", contextType: "profile" }
                        }));
                      }, 300);
                    }}
                    className="p-2.5 rounded-xl bg-white/3 border border-white/5 hover:border-cyan-500/30 text-left hover:bg-cyan-950/20 transition-all group cursor-pointer"
                  >
                    <span className="block text-[10.5px] font-black text-white group-hover:text-cyan-300 font-sans">#OptimizeEarnings</span>
                    <span className="block text-[9px] text-zinc-400 font-sans mt-0.5">Learn about reach weightings</span>
                  </button>
                </div>
              </div>

              {/* Core Command Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!quickAiQuery.trim()) return;
                  const inputQuery = quickAiQuery;
                  setQuickAiQuery('');
                  setIsAiCommandCenterOpen(false);
                  
                  // Redirect to AI matrix view
                  setActiveTab('matrix');
                  setMatrixSubTabRedirect('ai');
                  
                  // Dispatch custom event to trigger prompt in VohAiView
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('voh-ai-trigger-prompt', {
                      detail: { prompt: inputQuery, contextType: "feed" }
                    }));
                  }, 300);
                }}
                className="space-y-3 relative z-10"
              >
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono tracking-wider text-zinc-400 uppercase block">What is your request?</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Find startup opportunities in Nigeria..."
                      value={quickAiQuery}
                      onChange={(e) => setQuickAiQuery(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/5 text-xs text-white focus:outline-none focus:border-violet-500/40"
                    />
                    <button
                      type="submit"
                      disabled={!quickAiQuery.trim()}
                      className="px-4 bg-gradient-to-tr from-violet-600 to-pink-500 text-white font-sans text-xs font-black rounded-xl hover:brightness-110 shadow-md flex items-center justify-center shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[9px] font-mono text-zinc-500">Linked to VOH Core v3.5</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAiCommandCenterOpen(false);
                      setActiveTab('matrix');
                      setMatrixSubTabRedirect('ai');
                    }}
                    className="text-[10px] text-violet-400 hover:underline font-bold font-sans cursor-pointer"
                  >
                    Go to Full Dedicated Space →
                  </button>
                </div>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 🔮 NEXORA SYSTEM HUB - GLOBAL UX, ACCESSIBILITY, AND PERFORMANCE CONTROL DECK */}
      <AnimatePresence>
        {isSystemHubOpen && (
          <SystemHubControlPanel
            isOpen={isSystemHubOpen}
            onClose={() => setIsSystemHubOpen(false)}
            theme={theme}
            setTheme={setTheme}
            textScale={textScale}
            setTextScale={setTextScale}
            isHighContrast={isHighContrast}
            setIsHighContrast={setIsHighContrast}
            reducedMotion={reducedMotion}
            setReducedMotion={setReducedMotion}
            colorblindLabels={colorblindLabels}
            setColorblindLabels={setColorblindLabels}
            screenReaderVoice={screenReaderVoice}
            setScreenReaderVoice={setScreenReaderVoice}
            preferredLanguage={currentUser.preferredLanguage || 'en'}
            setPreferredLanguage={(lang) => {
              setCurrentUser(prev => ({ ...prev, preferredLanguage: lang }));
            }}
            layoutDirection={layoutDirection}
            setLayoutDirection={setLayoutDirection}
            isOffline={isOffline}
            setIsOffline={setIsOffline}
            lazyLoadImages={lazyLoadImages}
            setLazyLoadImages={setLazyLoadImages}
          />
        )}
      </AnimatePresence>

      {/* 🥞 LIGHTWEIGHT TOAST NOTIFICATIONS */}
      <div id="nexora-global-toast-container" className="fixed top-16 right-6 left-6 md:left-auto md:right-8 md:w-80 z-50 flex flex-col gap-2 pointer-events-none" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95, transition: { duration: 0.2 } }}
              className="p-3.5 rounded-2xl bg-zinc-950/95 border border-violet-500/20 backdrop-blur-xl shadow-2xl flex items-center gap-2.5 pointer-events-auto text-left"
            >
              <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
              <p className="text-xs font-sans font-medium text-white leading-relaxed">{toast.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
