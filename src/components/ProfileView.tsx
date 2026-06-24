import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Link as LinkIcon, 
  Calendar, 
  Edit3, 
  Check, 
  Heart,
  MessageSquare,
  Award,
  Zap,
  Sparkles,
  Play,
  Pause,
  Volume2,
  Users,
  Compass,
  FileText,
  Share2,
  UserPlus,
  MessageCircle,
  Download,
  Terminal,
  Pin,
  Flame,
  UserCheck,
  Search,
  X,
  ArrowLeft,
  Settings,
  Shield,
  Lock,
  Eye,
  Bell,
  Sliders,
  Globe,
  Trash2,
  HelpCircle,
  Info,
  Activity,
  Video,
  Film,
  Camera,
  Image,
  Mic
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Post } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import RelativeTimestamp from './RelativeTimestamp';
import { MOCK_CREATORS, ADDITIONAL_TEST_ACCOUNTS } from '../data/database';
import CreatorDashboardView from './CreatorDashboardView';

interface MediaGridProps {
  gridPosts: Post[];
  pinnedPostIds: string[];
  onSelectPost: (post: Post) => void;
}

const MediaGrid = ({ gridPosts, pinnedPostIds, onSelectPost }: MediaGridProps) => {
  if (gridPosts.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-violet-500/10 rounded-3xl bg-[#09071c]/40 font-mono text-xs text-violet-400/80 w-full">
        <div className="text-3xl mb-2">📸</div>
        <p className="font-bold">No gallery items here yet</p>
        <p className="text-[10px] text-zinc-500 mt-1">Ready for custom clips, snapshots or audio broadcasts!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-3 w-full">
      {gridPosts.map(post => {
        const isVoice = post.isVoice || post.content.includes('🎙') || post.voiceDuration;
        const isVideo = !!post.videoUrl;
        const isPinned = pinnedPostIds.includes(post.id);
        
        return (
          <motion.div
            layout
            key={post.id}
            onClick={() => onSelectPost(post)}
            className="aspect-square rounded-xl sm:rounded-2xl overflow-hidden relative border border-violet-500/10 hover:border-[#8B5CF6]/50 group cursor-pointer bg-[#050314]/90 flex flex-col justify-between transition-all hover:scale-[1.01]"
          >
            {/* Thumbnail Container */}
            <div className="absolute inset-0 w-full h-full z-0">
              {post.image ? (
                <img 
                  src={post.image} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                  alt={post.content}
                  referrerPolicy="no-referrer"
                />
              ) : isVideo ? (
                <div className="w-full h-full bg-black relative">
                  <video 
                    src={post.videoUrl} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" 
                    preload="metadata" 
                    muted 
                    playsInline
                  />
                  <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full z-10">
                    <Film className="w-3.5 h-3.5 text-pink-400" />
                  </div>
                </div>
              ) : isVoice ? (
                <div className="w-full h-full bg-gradient-to-tr from-pink-950/75 via-[#1d1242] to-[#040212] flex flex-col justify-between p-3">
                  <div className="flex justify-between items-center">
                    <Mic className="w-4 h-4 text-pink-400 group-hover:scale-110 transition-transform" />
                    <span className="text-[8px] font-mono text-purple-300 font-extrabold uppercase bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/15">Voice</span>
                  </div>
                  
                  {/* Visual Waves */}
                  <div className="space-y-1 my-auto">
                    <div className="flex gap-0.5 items-end justify-center h-8 opacity-60 group-hover:opacity-85 transition-opacity">
                      <span className="w-0.5 bg-pink-400 h-4 animate-bounce" />
                      <span className="w-0.5 bg-purple-500 h-6 animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <span className="w-0.5 bg-pink-400 h-2 animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <span className="w-0.5 bg-purple-500 h-7 animate-bounce" style={{ animationDelay: '0.15s' }} />
                      <span className="w-0.5 bg-pink-400 h-5 animate-bounce" style={{ animationDelay: '0.05s' }} />
                    </div>
                  </div>
                  
                  <p className="text-[10px] text-left text-zinc-300 italic truncate font-sans max-w-full">
                    "{post.voiceTranscript || post.content}"
                  </p>
                </div>
              ) : (
                // Gradient visual cards for Text posts
                (() => {
                  const grads = [
                    'from-violet-950 via-[#100730] to-zinc-950',
                    'from-blue-950 via-[#0a0a38] to-[#1a0833]',
                    'from-emerald-950 via-teal-950 to-zinc-950',
                    'from-fuchsia-950 via-slate-950 to-rose-950/70',
                  ];
                  const num = post.id.charCodeAt(post.id.length - 1) || 0;
                  const grad = grads[num % grads.length];
                  return (
                    <div className={`w-full h-full bg-gradient-to-br ${grad} p-4 flex flex-col justify-between`}>
                      <div className="flex justify-between items-center">
                        <span className="text-[8px] font-mono text-violet-400/80 font-bold uppercase tracking-wider">Thought</span>
                        <span className="text-xs text-violet-400/60 font-serif">“</span>
                      </div>
                      <p className="text-[10px] md:text-xs font-sans font-medium line-clamp-3 italic text-zinc-300 leading-normal text-center my-auto">
                        {post.content}
                      </p>
                      <div className="text-right">
                        <span className="text-[8px] font-mono text-violet-400/50">Nexora Node</span>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Badges */}
            <div className="absolute top-2 left-2 z-10 flex gap-1 items-center">
              {isPinned && (
                <span className="p-1.5 bg-[#8B5CF6]/90 backdrop-blur-md rounded-full text-white shadow-sm" title="Pinned Post">
                  <Pin className="w-3 h-3 rotate-45 text-white" />
                </span>
              )}
            </div>

            {/* Hover Stats Blur Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 backdrop-blur-xs transition-all flex items-center justify-center gap-4 z-2">
              <div className="flex items-center gap-1.5 text-white font-sans font-black text-xs md:text-sm">
                <Zap className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{post.likes || 0}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white font-sans font-black text-xs md:text-sm">
                <MessageSquare className="w-4 h-4 text-violet-300" />
                <span>{post.comments?.length || 0}</span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

interface ProfileViewProps {
  currentUser: User;
  posts: Post[];
  onUpdateProfile: (updatedData: Partial<User>) => void;
  onLikePost: (postId: string) => void;
  onAddComment?: (postId: string, text: string) => void;
  isOwnProfile?: boolean;
  onCloseProfile?: () => void;
  onToggleFollow?: (creatorId: string) => void;
  isFollowingField?: boolean;
  onStartChat?: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
  theme?: string;
  setTheme?: (t: any) => void;
  onLogout?: () => void;
  onTriggerPWAInstall?: () => void;
  showPWAInstallPrompt?: boolean;
}

export default function ProfileView({
  currentUser,
  posts,
  onUpdateProfile,
  onLikePost,
  onAddComment,
  isOwnProfile = true,
  onCloseProfile,
  onToggleFollow,
  isFollowingField = false,
  onStartChat,
  onViewProfile,
  theme,
  setTheme,
  onLogout,
  onTriggerPWAInstall,
  showPWAInstallPrompt
}: ProfileViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'posts' | 'videos' | 'reels' | 'media' | 'voice' | 'saved' | 'communities' | 'tagged' | 'analytics'>('posts');
  const [isCreatorDashboardOpen, setIsCreatorDashboardOpen] = useState(false);
  const [activeDashboardTab, setActiveDashboardTab] = useState<'overview' | 'content' | 'earnings' | 'insights'>('overview');
  const [selectedGridPost, setSelectedGridPost] = useState<Post | null>(null);
  const [detailCommentText, setDetailCommentText] = useState<string>('');

  // Account settings center states
  const [activeSettingsSection, setActiveSettingsSection] = useState<'account' | 'privacy' | 'messaging' | 'safety' | 'notifications' | 'theme'>('account');
  const [editUsername, setEditUsername] = useState(currentUser.username);
  const [editEmail, setEditEmail] = useState(currentUser.email || `${currentUser.username}@nexora.ai`);
  const [editPhone, setEditPhone] = useState(currentUser.phone || '+234 80 123 4567');
  const [editPassword, setEditPassword] = useState('••••••••••••');
  
  // Privacy states
  const [isPrivateAccount, setIsPrivateAccount] = useState<boolean>(() => {
    return localStorage.getItem('nexora_privacy_private_account') === 'true';
  });
  const [showProfileViews, setShowProfileViews] = useState<boolean>(() => {
    return localStorage.getItem('nexora_privacy_profile_views') !== 'false';
  });
  const [showVisitorInsights, setShowVisitorInsights] = useState<boolean>(() => {
    return localStorage.getItem('nexora_privacy_visitor_insights') !== 'false';
  });
  const [allowMentions, setAllowMentions] = useState<'everyone' | 'followers' | 'nobody'>(() => {
    return (localStorage.getItem('nexora_privacy_allow_mentions') as any) || 'everyone';
  });
  const [allowTags, setAllowTags] = useState<'everyone' | 'followers' | 'nobody'>(() => {
    return (localStorage.getItem('nexora_privacy_allow_tags') as any) || 'everyone';
  });
  const [allowDownloads, setAllowDownloads] = useState<boolean>(() => {
    return localStorage.getItem('nexora_privacy_allow_downloads') !== 'false';
  });

  // Messaging states
  const [whoCanMessageMe, setWhoCanMessageMe] = useState<'everyone' | 'followers' | 'following' | 'nobody'>(() => {
    return (localStorage.getItem('nexora_privacy_messaging_scope') as any) || 'everyone';
  });

  // Safety states
  const [blockedAccountsList, setBlockedAccountsList] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_privacy_blocked_usernames');
    return saved ? JSON.parse(saved) : ['spammer_bot_99', 'toxic_agent_4'];
  });
  const [newBlockedUsername, setNewBlockedUsername] = useState('');
  
  const [mutedAccountsList, setMutedAccountsList] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_privacy_muted_usernames');
    return saved ? JSON.parse(saved) : ['loud_noise_creator', 'ads_broadcast_hq'];
  });
  const [newMutedUsername, setNewMutedUsername] = useState('');

  const [hiddenWordsList, setHiddenWordsList] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_privacy_hidden_words');
    return saved ? JSON.parse(saved) : ['spam', 'buy crypto', 'free tokens', 'winner'];
  });
  const [newHiddenWord, setNewHiddenWord] = useState('');

  const [restrictedAccountsList, setRestrictedAccountsList] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_privacy_restricted_usernames');
    return saved ? JSON.parse(saved) : ['creepy_profile_22'];
  });
  const [newRestrictedUsername, setNewRestrictedUsername] = useState('');

  // Notifications states
  const [notifyLikes, setNotifyLikes] = useState<boolean>(() => localStorage.getItem('nexora_notify_likes') !== 'false');
  const [notifyComments, setNotifyComments] = useState<boolean>(() => localStorage.getItem('nexora_notify_comments') !== 'false');
  const [notifyFollowers, setNotifyFollowers] = useState<boolean>(() => localStorage.getItem('nexora_notify_followers') !== 'false');
  const [notifyMessages, setNotifyMessages] = useState<boolean>(() => localStorage.getItem('nexora_notify_messages') !== 'false');
  const [notifyMentions, setNotifyMentions] = useState<boolean>(() => localStorage.getItem('nexora_notify_mentions') !== 'false');
  const [notifyCommunityUpdates, setNotifyCommunityUpdates] = useState<boolean>(() => localStorage.getItem('nexora_notify_community') !== 'false');
  const [notifyLive, setNotifyLive] = useState<boolean>(() => localStorage.getItem('nexora_notify_live') !== 'false');

  // Interactive Live Streaming States
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [liveViewerCount, setLiveViewerCount] = useState(0);
  const [liveGifts, setLiveGifts] = useState(0);
  const [liveChatMessages, setLiveChatMessages] = useState<any[]>([]);
  const [liveNewMessage, setLiveNewMessage] = useState('');
  const [liveDuration, setLiveDuration] = useState(0);
  const [showEndStats, setShowEndStats] = useState(false);
  const [livePeakViewers, setLivePeakViewers] = useState(0);
  const [liveModerators, setLiveModerators] = useState<string[]>(['alex_sterling', 'sarah_codes']);
  const [modToAssign, setModToAssign] = useState('');


  // Follower actions state
  const [isFollowing, setIsFollowing] = useState(isFollowingField);
  const [isConnected, setIsConnected] = useState(false);
  const [showShareAlert, setShowShareAlert] = useState(false);
  const [currentPlayingVoice, setCurrentPlayingVoice] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Local state for editing form
  const [editName, setEditName] = useState(currentUser.name);
  const [editBio, setEditBio] = useState(currentUser.bio);
  const [editLocation, setEditLocation] = useState(currentUser.location);
  const [editWebsite, setEditWebsite] = useState(currentUser.website);
  const [editCover, setEditCover] = useState(currentUser.coverImage);
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);

  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Live stream background simulation effect
  useEffect(() => {
    let timer: any;
    let chatInterval: any;
    let viewerInterval: any;

    if (isLiveStreaming) {
      setLiveDuration(0);
      setLiveViewerCount(Math.floor(Math.random() * 20) + 20);
      setLiveGifts(0);
      setLiveNewMessage('');
      setShowEndStats(false);
      setLivePeakViewers(35);
      
      const seedChat = [
        { sender: 'alex_sterling', message: 'Lets go live! 🔴 Welcome everyone!', isSystem: true },
        { sender: 'sarah_codes', message: 'Yay! Excited for the stream today 🥳', isSystem: false },
        { sender: 'voh_ai', message: 'Live stream connection established on port 3000.', isSystem: false }
      ];
      setLiveChatMessages(seedChat);

      // Duration counter
      timer = setInterval(() => {
        setLiveDuration(prev => prev + 1);
      }, 1000);

      // Viewer count fluctuation: Real activity only (1 viewer - the user themselves)
      setLiveViewerCount(1);
      setLivePeakViewers(1);

      // No fake chat comments or gifts: keep stream interactive for host only
      setLiveGifts(0);
    }

    return () => {
      clearInterval(timer);
      clearInterval(chatInterval);
      clearInterval(viewerInterval);
    };
  }, [isLiveStreaming]);

  // Custom status system states
  const [statusText, setStatusText] = useState<string>(() => {
    return localStorage.getItem(`nexora_status_text_${currentUser.id}`) || currentUser.statusText || 'Online';
  });
  const [statusEmoji, setStatusEmoji] = useState<string>(() => {
    return localStorage.getItem(`nexora_status_emoji_${currentUser.id}`) || currentUser.statusEmoji || '🟢';
  });

  // Pinned showpiece song states
  const [pinnedSong, setPinnedSong] = useState<string>(() => {
    return localStorage.getItem(`nexora_pinned_song_${currentUser.id}`) || currentUser.pinnedMusicSong || 'Unavailable';
  });
  const [pinnedArtist, setPinnedArtist] = useState<string>(() => {
    return localStorage.getItem(`nexora_pinned_artist_${currentUser.id}`) || currentUser.pinnedMusicArtist || 'Davido';
  });
  const [isSongPlaying, setIsSongPlaying] = useState(false);
  const audioCtxRef = React.useRef<AudioContext | null>(null);

  // Edit form synchronization states
  const [editStatusText, setEditStatusText] = useState(statusText);
  const [editStatusEmoji, setEditStatusEmoji] = useState(statusEmoji);
  const [editSong, setEditSong] = useState(pinnedSong);
  const [editArtist, setEditArtist] = useState(pinnedArtist);

  // Pinned post IDs (holds up to 3)
  const [pinnedPostIds, setPinnedPostIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(`nexora_pinned_posts_${currentUser.id}`);
    return saved ? JSON.parse(saved) : [];
  });

  // Nexora Presence and Privacy Upgrades
  const [showActiveStatus, setShowActiveStatus] = useState<boolean>(() => {
    const saved = localStorage.getItem('nexora_privacy_active_status');
    return saved !== 'false';
  });
  const [shareInVisitorLists, setShareInVisitorLists] = useState<boolean>(() => {
    const saved = localStorage.getItem('nexora_privacy_share_visitor');
    return saved !== 'false';
  });
  const [profileViewFilter, setProfileViewFilter] = useState<'today' | 'week' | 'month'>('week');
  
  // Moment / Story Active Overlays inside ProfileView
  const [selectedMoment, setSelectedMoment] = useState<any | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);

  // Pending verification requests for the VOH review admin desk
  const [verificationRequests, setVerificationRequests] = useState<any[]>([]);

  const getActiveUserStory = () => {
    const saved = localStorage.getItem('nexora_moments_list');
    let moments = [];
    if (saved) {
      try { moments = JSON.parse(saved); } catch (e) {}
    }
    // Fall back to seed moments if list is empty
    if (!moments || moments.length === 0) {
      moments = [
        { id: 'm-0', name: 'VOICE OF HARRISION', username: 'voh', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg', active: true, quotes: ["Building the future of social networks with clean designs.", "Great seeing our community grow so rapidly!", "Continuous listening and iterating with you guys."] },
        { id: 'm-1', name: 'Alex Sterling', username: 'alex_sterling', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', active: true, quotes: ["What a beautiful evening in Port Harcourt today! 🌅", "Just finished writing a clean tutorial for absolute beginners.", "Always keep learning and showing up daily."] },
        { id: 'm-2', name: 'Sarah Vance', username: 'sarah_codes', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', active: true, quotes: ["Designing clean UI components with lots of breathing room.", "Taking a coffee break before diving back into CSS! ☕️", "Simple things are often the most elegant ones."] }
      ];
    }
    const userStory = moments.find((m: any) => m.username && m.username.toLowerCase() === currentUser.username.toLowerCase());
    
    // Check if the story has expired (older than 24 hours). Fallback stories remain active.
    if (userStory) {
      if (userStory.timestamp) {
        const ageMs = Date.now() - new Date(userStory.timestamp).getTime();
        const isActive = ageMs < 24 * 60 * 60 * 1000;
        return isActive ? userStory : null;
      }
      return userStory;
    }
    return null;
  };

  const activeUserStory = getActiveUserStory();

  React.useEffect(() => {
    if (currentUser.username === 'voh') {
      const reqs = JSON.parse(localStorage.getItem('nexora_verification_requests') || '[]');
      setVerificationRequests(reqs);
    }
  }, [currentUser.username]);

  const handleDismissVerificationRequest = (userId: string) => {
    const updated = verificationRequests.filter((r: any) => r.userId !== userId);
    localStorage.setItem('nexora_verification_requests', JSON.stringify(updated));
    setVerificationRequests(updated);
    alert("Verification request reviewed and archived. Consistent with policies, only VOICE OF HARRISON is authorized to display the exclusive purple verification tick.");
  };

  // Toggle pin mechanics (limits to max 3)
  const togglePinPost = (postId: string) => {
    setPinnedPostIds(prev => {
      let updated;
      if (prev.includes(postId)) {
        updated = prev.filter(id => id !== postId);
      } else {
        if (prev.length >= 3) {
          window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ You can pin a maximum of 3 posts!' }));
          return prev;
        }
        updated = [...prev, postId];
      }
      localStorage.setItem(`nexora_pinned_posts_${currentUser.id}`, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('toast', { 
        detail: updated.includes(postId) ? '📌 Post pinned to profile!' : '📌 Post unpinned!' 
      }));
      return updated;
    });
  };

  // Play synthesized audio chords preview using Web Audio API
  const playSynthesizedPreview = () => {
    if (isSongPlaying) {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      setIsSongPlaying(false);
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Audio API not supported on this device!' }));
        return;
      }
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      setIsSongPlaying(true);

      const playPluck = (freq: number, startTime: number, delay = 0) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime + delay);

        gain.gain.setValueAtTime(0.12, startTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + delay + 0.85);

        osc.start(startTime + delay);
        osc.stop(startTime + delay + 1.0);
      };

      const now = ctx.currentTime;
      // Synthesize elegant afro-futurist chord plucks
      playPluck(329.63, now, 0); // E4
      playPluck(392.00, now, 0.15); // G4
      playPluck(493.88, now, 0.3); // B4
      playPluck(587.33, now, 0.45); // D5

      setTimeout(() => {
        setIsSongPlaying(false);
        if (audioCtxRef.current) {
          audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
      }, 2000);

    } catch (e) {
      console.error(e);
      setIsSongPlaying(false);
    }
  };

  React.useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 300, height: 300, facingMode: 'user' } 
      });
      setIsWebcamActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err: any) {
      console.error(err);
      setCameraError('Unable to access camera.');
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Camera access denied or unavailable.' }));
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsWebcamActive(false);
  };

  const captureCameraPhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 320;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setEditAvatar(dataUrl);
          stopCamera();
          window.dispatchEvent(new CustomEvent('toast', { detail: '📸 Quick photo snapped and applied!' }));
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setEditAvatar(reader.result);
          window.dispatchEvent(new CustomEvent('toast', { detail: '📁 Photo uploaded as new avatar!' }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [skillsEndorsements, setSkillsEndorsements] = useState<{ [skill: string]: number }>({
    'Founder Mindset': 420,
    'Product Architecture': 382,
    'Community Engineering': 512,
    'AI Orchestration': 614,
    'Creative Coding': 295
  });
  const [newSkillInput, setNewSkillInput] = useState('');

  // Python Exporter Script Content
  const pythonExporterCode = `#!/usr/bin/env python3
import os
import zipfile
import sys

def package_project():
    print("==================================================================")
    print("      🌌 NEXORA CO-BUILDER PLATFORM - SECURE EXPORTER 🌌")
    print("==================================================================")
    print("Preparing secure workspace compression...")
    
    zip_name = "nexora_project.zip"
    
    excluded_dirs = {
        'node_modules', 'dist', '.git', '.github', '.next', 
        '.cache', 'temp', '__pycache__', '.upm'
    }
    excluded_files = {
        zip_name, '.DS_Store', 'package-lock.json', '.env'
    }

    included_count = 0
    total_lines = 0

    try:
        with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk('.'):
                dirs[:] = [d for d in dirs if d not in excluded_dirs]
                for file in files:
                    if file in excluded_files:
                        continue
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, '.')
                    try:
                        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                            lines = len(f.readlines())
                            total_lines += lines
                    except:
                        lines = 0
                    zipf.write(file_path, rel_path)
                    print(f"📦 Paired & Packaged: {rel_path} ({lines} lines)")
                    included_count += 1
        print("==================================================================")
        print("🎉 COMPILATION SUCCESSFUL!")
        print(f"📁 Export Archive:  {os.path.abspath(zip_name)}")
        print(f"🌐 Packaged Nodes: {included_count} modules")
        print(f"📊 Volume Metrics: {total_lines} total lines of code packed")
        print("==================================================================")
        print("To extract your workspace locally:")
        print("  1. Copy 'nexora_project.zip' to your destination directory.")
        print("  2. Unzip using standard tools or terminal command:")
        print(f"     unzip {zip_name}")
        print("==================================================================")
    except Exception as e:
        print(f"❌ Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    package_project()`;

  // JavaScript/Node Exporter Script Content
  const jsExporterCode = `#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("==================================================================");
console.log("      🌌 NEXORA CO-BUILDER PLATFORM - JS NODE EXPORTER 🌌");
console.log("==================================================================");

const backupDir = 'nexora_backup_source';
const excludedDirs = new Set([
  'node_modules', 'dist', '.git', '.github', '.next', 
  '.cache', 'temp', '__pycache__', '.upm', backupDir
]);
const excludedFiles = new Set([
  'nexora_project.zip', '.DS_Store', 'package-lock.json', '.env'
]);

let fileCount = 0;
let totalLines = 0;

function walkSync(dir, callback) {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (!excludedDirs.has(file)) {
        walkSync(filePath, callback);
      }
    } else {
      if (!excludedFiles.has(file)) {
        callback(filePath, stat);
      }
    }
  });
}

try {
  if (fs.existsSync(backupDir)) {
    fs.rmSync(backupDir, { recursive: true, force: true });
  }
  fs.mkdirSync(backupDir);

  walkSync('.', (filePath) => {
    const relPath = path.relative('.', filePath);
    const destPath = path.join(backupDir, relPath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(filePath, destPath);
    let lines = 0;
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      lines = content.split('\\n').length;
      totalLines += lines;
    } catch (e) {}
    console.log(\`📦 Paired & Backuped: \${relPath} (\${lines} lines)\`);
    fileCount++;
  });

  console.log("==================================================================");
  try {
    const zipName = "nexora_project_js.zip";
    if (fs.existsSync(zipName)) {
      fs.unlinkSync(zipName);
    }
    if (process.platform === 'win32') {
      console.log("On Windows - You can right-click nexora_backup_source -> Compress to ZIP file");
    } else {
      execSync(\`zip -r \${zipName} \${backupDir} > /dev/null\`);
      console.log(\`⚡ Native Unix Zip Compiled: ./\${zipName}\`);
    }
  } catch (err) {}
  console.log("==================================================================");
  console.log("🎉 COMPILATION SUCCESSFUL!");
  console.log(\`🌐 Packaged Nodes: \${fileCount} files\`);
  console.log(\`📊 Volume Metrics: \${totalLines} total lines of code packed\`);
  console.log("==================================================================");
} catch (e) {
  console.error(e);
}
`;

  const downloadScriptFile = (filename: string, content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // User connections modal state
  const [isConnectionsModalOpen, setIsConnectionsModalOpen] = useState(false);
  const [connectionsModalTab, setConnectionsModalTab] = useState<'followers' | 'following'>('followers');
  const [connectionSearchQuery, setConnectionSearchQuery] = useState('');

  // Sync editing fields when currentUser changes
  React.useEffect(() => {
    setEditName(currentUser.name);
    setEditBio(currentUser.bio);
    setEditLocation(currentUser.location || '');
    setEditWebsite(currentUser.website || '');
    setEditCover(currentUser.coverImage || '');
    setEditAvatar(currentUser.avatar || '');
    setIsFollowing(isFollowingField);
    setIsEditing(false); // Close edit form on profile transition
  }, [currentUser, isFollowingField]);

  // Connections list source
  const getConnectionsList = () => {
    const allUsersMap = new Map<string, User>();
    
    // Add VOH founder to pool
    allUsersMap.set('user-0', {
      id: 'user-0',
      username: 'voh',
      name: 'VOICE OF HARRISON',
      avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg',
      bio: '🌍 Founder of NEXORA — The World\'s Living Social Network\n🧠 Creator of VOH AI\n📍 Nigeria',
      location: 'Nigeria',
      website: 'nexora.ai/voh',
      followers: 1200000,
      following: 10,
      isVerified: true,
      coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
      joinedDate: 'Joined June 2026',
      reputationPoints: 98700,
      reputationBreakdown: { contributions: 15300, helpfulness: 51200, missionsCompleted: 127, skillsVerified: 32073 },
      interestDNA: {},
      skills: ['Founder']
    });

    // Populate creators & all additional test accounts (including our 1,000 programmatically generated users!)
    MOCK_CREATORS.forEach(c => {
      allUsersMap.set(c.id, c);
    });
    ADDITIONAL_TEST_ACCOUNTS.forEach(a => {
      allUsersMap.set(a.id, a);
    });

    // Merge custom registered accounts from local storage
    try {
      const stored = localStorage.getItem('nexora_registered_accounts');
      if (stored) {
        JSON.parse(stored).forEach((acc: any) => {
          if (acc.user) {
            allUsersMap.set(acc.user.id, acc.user);
          }
        });
      }
    } catch(e) {}

    // Load active follow relationships
    let follows: { followerId: string; followingId: string }[] = [];
    try {
      const rawFollows = localStorage.getItem('nexora_db_follows');
      if (rawFollows) {
        follows = JSON.parse(rawFollows);
      }
    } catch(e) {}

    const list = Array.from(allUsersMap.values());

    if (connectionsModalTab === 'following') {
      const followingIds = follows
        .filter(f => f.followerId === currentUser.id)
        .map(f => f.followingId);

      const followingUsers: User[] = [];
      followingIds.forEach(id => {
        const u = allUsersMap.get(id);
        if (u && id !== currentUser.id) {
          followingUsers.push(u);
        }
      });

      return followingUsers;
    } else {
      const followerIds = follows
        .filter(f => f.followingId === currentUser.id)
        .map(f => f.followerId);

      const followerUsers: User[] = [];
      followerIds.forEach(id => {
        const u = allUsersMap.get(id);
        if (u && id !== currentUser.id) {
          followerUsers.push(u);
        }
      });

      return followerUsers;
    }
  };

  const filteredConnections = getConnectionsList().filter(user => {
    const q = connectionSearchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      user.name.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      user.bio.toLowerCase().includes(q) ||
      (user.location && user.location.toLowerCase().includes(q))
    );
  });

  // Active posts computation: Case-insensitive match on both ID and username
  const myPosts = posts.filter(post => {
    if (!post) return false;
    const postUserId = String(post.userId || '').toLowerCase();
    const currentUserId = String(currentUser.id || '').toLowerCase();
    const postUsername = String(post.username || '').toLowerCase();
    const currentUsername = String(currentUser.username || '').toLowerCase();
    
    return postUserId === currentUserId || 
           (currentUsername && postUsername === currentUsername);
  });
  
  // Tab computed contents
  const mediaPosts = myPosts.filter(post => post.image || (post.images && post.images.length > 0));
  const savedPosts = posts.filter(post => post.isBookmarkedByUser);
  const videoPosts = myPosts.filter(post => post.videoUrl);
  const reelsPosts = myPosts.filter(post => post.videoUrl || post.tags?.includes('reels') || post.tags?.includes('reel') || post.content.toLowerCase().includes('#reel'));
  const voicePosts = myPosts.filter(post => post.isVoice || post.content.includes('🎙') || post.voiceDuration || post.voiceAudioUrl || post.voiceTranscript);

  // Custom mock data for Voice transmission recordings
  const voiceTransmissions = [
    {
      id: 'voice-1',
      title: 'Decentralized Social Web Manifesto',
      description: 'Discussing why social media should focus on real-world connections, human capital balance, and zero cold-starts.',
      duration: '5 mins 12 secs',
      published: 'Uploaded 2 days ago'
    },
    {
      id: 'voice-2',
      title: 'Designing the VOH AI Intelligent Proxy',
      description: 'Introducing a high-utility algorithmic teammate to help index conversations, summarize objectives, and inspire collaborators.',
      duration: '8 mins 45 secs',
      published: 'Uploaded 1 week ago'
    },
    {
      id: 'voice-3',
      title: 'Living Reputation vs. Static Metrics',
      description: 'Explaining our algorithmic shift to helpful broadcasts, active social missions, and verified knowledge endorsements.',
      duration: '12 mins 30 secs',
      published: 'Uploaded 3 weeks ago'
    }
  ];

  // Custom mock data for internal Circles
  const circlesData = [
    { id: 'c-1', name: 'The Football Studio', des: 'The official home of local tournaments & tactical discussions.', members: '1,420 members', status: 'Founder Owned', tag: 'Football' },
    { id: 'c-2', name: 'AI Synthesizers', des: 'Co-programming deep intelligent overlays, voice-thought generators, and spatial code.', members: '3,950 members', status: 'Primary Creator', tag: 'AI' },
    { id: 'c-3', name: 'Nexora Core Architects', des: 'Engineering real-time connection protocols and zero-lag streaming sockets.', members: '12,400 members', status: 'Primary Owner', tag: 'System Engineering' }
  ];

  // Custom mock data for Communities
  const communitiesData = [
    { id: 'com-1', name: 'Nigeria Tech Founders Hub', location: 'Lagos & Abuja, NG', members: '8,410 members', description: 'Co-creating world-class consumer and enterprise systems.' },
    { id: 'com-2', name: 'Berlin Neon Photographers', location: 'Berlin, DE', members: '2,210 members', description: 'Exploring high-contrast retro aesthetics, neon signage, and glass structures.' },
    { id: 'com-3', name: 'EPL Football Analytics', location: 'London, UK / Global', members: '5,120 members', description: 'Tactical analysis, Expected Goals simulations, and historical leagues database.' }
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    stopCamera();

    // Save status and music details
    localStorage.setItem(`nexora_status_emoji_${currentUser.id}`, editStatusEmoji);
    localStorage.setItem(`nexora_status_text_${currentUser.id}`, editStatusText);
    localStorage.setItem(`nexora_pinned_song_${currentUser.id}`, editSong);
    localStorage.setItem(`nexora_pinned_artist_${currentUser.id}`, editArtist);

    setStatusEmoji(editStatusEmoji);
    setStatusText(editStatusText);
    setPinnedSong(editSong);
    setPinnedArtist(editArtist);

    onUpdateProfile({
      name: editName,
      bio: editBio,
      location: editLocation,
      website: editWebsite,
      coverImage: editCover,
      avatar: editAvatar
    });
    setIsEditing(false);
    window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Profile information successfully synchronized!' }));
  };

  const handleEndorseSkill = (skill: string) => {
    setSkillsEndorsements(prev => ({
      ...prev,
      [skill]: (prev[skill] || 0) + 1
    }));
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillInput.trim()) return;
    const cleanSkill = newSkillInput.trim();
    if (!skillsEndorsements[cleanSkill]) {
      setSkillsEndorsements(prev => ({
        ...prev,
        [cleanSkill]: 1
      }));
    }
    setNewSkillInput('');
  };

  const toggleVoicePlay = (id: string) => {
    if (currentPlayingVoice === id) {
      setCurrentPlayingVoice(null);
    } else {
      setCurrentPlayingVoice(id);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  };

  if (isCreatorDashboardOpen) {
    return (
      <div id="voh-profile-container-root" className="space-y-6">
        <CreatorDashboardView
          currentUser={currentUser}
          posts={posts}
          onClose={() => setIsCreatorDashboardOpen(false)}
          onUpdateProfile={onUpdateProfile}
          activeTabOverride={activeDashboardTab}
        />
      </div>
    );
  }

  return (
    <div id="voh-profile-container-root" className="space-y-6">
      
      {!isOwnProfile && onCloseProfile && !isSettingsOpen && (
        <button 
          onClick={onCloseProfile}
          className="flex items-center gap-2 px-4 py-2 text-xs font-mono font-black border border-violet-500/20 bg-[#0d0a21]/80 hover:bg-violet-950/40 text-violet-300 rounded-xl transition-all cursor-pointer mb-2 w-max"
        >
          ← BACK TO MY NODE
        </button>
      )}

      <AnimatePresence mode="wait">
        {isSettingsOpen ? (
          <motion.div
            key="voh-settings-page"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="p-6 rounded-3xl bg-[#080614] border border-violet-500/20 space-y-6"
          >
            {/* Settings Header */}
            <div className="flex items-center justify-between border-b border-violet-500/10 pb-4">
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-white font-extrabold uppercase transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Profile
              </button>
              <span className="text-xs font-mono font-black text-violet-400/80 bg-violet-500/10 px-3 py-1 rounded-full uppercase">
                ⚙️ SECURE SETTINGS
              </span>
            </div>

            {/* Content Categories of Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Category Selector Side Menu */}
              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-mono uppercase tracking-widest text-violet-400/50 block mb-2 px-2">
                  Settings Directory
                </span>
                <div className="p-2.5 rounded-3xl bg-black/40 border border-violet-500/5 space-y-1">
                  {[
                    { id: 'account', label: 'My Account', icon: Settings, color: 'text-violet-400' },
                    { id: 'privacy', label: 'Privacy Center', icon: Shield, color: 'text-cyan-400' },
                    { id: 'messaging', label: 'Messaging Rules', icon: MessageCircle, color: 'text-emerald-400' },
                    { id: 'safety', label: 'Safety & Safeguards', icon: Lock, color: 'text-amber-400' },
                    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-pink-400' },
                    { id: 'theme', label: 'Themes & Appearance', icon: Sliders, color: 'text-purple-400' }
                  ].map(sec => (
                    <button
                      key={sec.id}
                      onClick={() => setActiveSettingsSection(sec.id as any)}
                      type="button"
                      className={`w-full p-3 rounded-xl text-xs font-sans font-bold flex items-center justify-between transition-all cursor-pointer ${
                        activeSettingsSection === sec.id 
                          ? 'bg-violet-600/10 text-white border border-violet-500/20' 
                          : 'bg-transparent text-current/70 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <sec.icon className={`w-4 h-4 ${sec.color}`} />
                        <span>{sec.label}</span>
                      </div>
                      <span className="text-[10px] text-zinc-600">→</span>
                    </button>
                  ))}
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5">
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block mb-1">
                    🟢 Platform Node Active
                  </span>
                  <p className="text-[10px] text-zinc-400 font-sans leading-normal">
                    This settings console is fully offline-secured. Modifying attributes synchronizes with your local browser storage instantly.
                  </p>
                </div>
              </div>

              {/* Main Settings Subsections */}
              <div className="md:col-span-2 space-y-6">
                
                {/* 1. Account Management Tab */}
                {activeSettingsSection === 'account' && (
                  <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-4 text-left animate-fadeIn">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4 text-violet-400" /> Account Management
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
                      <div>
                        <label className="text-[9px] font-mono uppercase text-zinc-400 block mb-1">Display Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-hidden focus:border-violet-500"
                        />
                      </div>
                      
                      <div>
                        <label className="text-[9px] font-mono uppercase text-zinc-400 block mb-1">HQ Location</label>
                        <input
                          type="text"
                          value={editLocation}
                          onChange={(e) => setEditLocation(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-hidden focus:border-violet-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 block mb-1">Bio Description</label>
                        <textarea
                          value={editBio}
                          onChange={(e) => setEditBio(e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-hidden focus:border-violet-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 block mb-1">Website Link</label>
                        <input
                          type="text"
                          value={editWebsite}
                          onChange={(e) => setEditWebsite(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-hidden focus:border-violet-500"
                          placeholder="e.g. nexora.ai/voh"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 block mb-1">Change Account @username</label>
                        <input
                          type="text"
                          value={editUsername}
                          onChange={(e) => setEditUsername(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono focus:outline-hidden focus:border-violet-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 block mb-1">Change Email Address</label>
                        <input
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-hidden focus:border-violet-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 block mb-1">Change Secured Phone Contact</label>
                        <input
                          type="text"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono focus:outline-hidden focus:border-violet-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 block mb-1">Change Platform Password</label>
                        <input
                          type="password"
                          value={editPassword}
                          onChange={(e) => setEditPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-white font-mono focus:outline-hidden focus:border-violet-500"
                          placeholder="••••••••••••"
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-violet-500/10 space-y-4">
                      {/* Creator mode toggler */}
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] font-sans font-bold text-white block">🟣 Creator Dashboard Access</span>
                          <span className="text-[9px] text-[#A78BFA] font-sans block">Activates financial wallets, tip jars, content heatmaps & advanced insights</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={!!currentUser.creatorModeEnabled}
                            onChange={(e) => {
                              onUpdateProfile({ creatorModeEnabled: e.target.checked });
                              window.dispatchEvent(new CustomEvent('toast', { detail: `Creator Dashboard ${e.target.checked ? 'Enabled 🚀' : 'Disabled'}` }));
                            }}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      {/* Verification request block */}
                      <div className="flex items-center justify-between pt-3 border-t border-white/5">
                        <div>
                          <span className="text-[11px] font-sans font-bold text-white block">🟣 Official Blue Verification Badge</span>
                          <span className="text-[9px] text-zinc-400 block">Apply for professional node identity status checks</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const reqs = JSON.parse(localStorage.getItem('nexora_verification_requests') || '[]');
                            if (!reqs.some((r: any) => r.userId === currentUser.id)) {
                              reqs.push({
                                userId: currentUser.id,
                                username: editUsername,
                                name: editName,
                                timestamp: new Date().toISOString()
                              });
                              localStorage.setItem('nexora_verification_requests', JSON.stringify(reqs));
                            }
                            alert("Verification requested! Application lodged for administrator check.");
                            window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Badge request filed!' }));
                          }}
                          className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-mono font-bold rounded-lg uppercase transition-colors cursor-pointer"
                        >
                          Request Badge
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Privacy Center Tab */}
                {activeSettingsSection === 'privacy' && (
                  <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-4 text-left animate-fadeIn">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-cyan-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-cyan-400" /> Privacy & Visibility
                    </h4>

                    <div className="space-y-3 font-sans text-xs">
                      {/* Private/Public Toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Private Account Mode</span>
                          <span className="text-[9px] text-zinc-400 block">Only approved followers can view your clips and voice logs</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isPrivateAccount}
                          onChange={(e) => {
                            setIsPrivateAccount(e.target.checked);
                            localStorage.setItem('nexora_privacy_private_account', String(e.target.checked));
                            window.dispatchEvent(new CustomEvent('toast', { detail: `Account set to ${e.target.checked ? 'PRIVATE 🔒' : 'PUBLIC 🌐'}` }));
                          }}
                          className="w-4 h-4 rounded-sm accent-cyan-500 cursor-pointer"
                        />
                      </div>

                      {/* Active Status toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Pulse Activity Status</span>
                          <span className="text-[9px] text-zinc-400 block">Show a green activity pulse when you are browsing the app</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={showActiveStatus}
                          onChange={(e) => {
                            setShowActiveStatus(e.target.checked);
                            localStorage.setItem('nexora_privacy_active_status', String(e.target.checked));
                            window.dispatchEvent(new CustomEvent('toast', { detail: `Activity pulse indicator: ${e.target.checked ? 'ON' : 'OFF'}` }));
                          }}
                          className="w-4 h-4 rounded-sm accent-cyan-500 cursor-pointer"
                        />
                      </div>

                      {/* Profile view history toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Profile Views Logging</span>
                          <span className="text-[9px] text-zinc-400 block">Keep track of which accounts visit your space</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={showProfileViews}
                          onChange={(e) => {
                            setShowProfileViews(e.target.checked);
                            localStorage.setItem('nexora_privacy_profile_views', String(e.target.checked));
                          }}
                          className="w-4 h-4 rounded-sm accent-cyan-500 cursor-pointer"
                        />
                      </div>

                      {/* Visitor insights toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Visitor Insights Panel</span>
                          <span className="text-[9px] text-zinc-400 block">Allow other nodes to see aggregated statistical insights of your visitations</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={showVisitorInsights}
                          onChange={(e) => {
                            setShowVisitorInsights(e.target.checked);
                            localStorage.setItem('nexora_privacy_visitor_insights', String(e.target.checked));
                          }}
                          className="w-4 h-4 rounded-sm accent-cyan-500 cursor-pointer"
                        />
                      </div>

                      {/* Allow Mentions Radios */}
                      <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 space-y-2">
                        <span className="font-bold text-white block text-[11px]">Admissible Mentions Scope</span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['everyone', 'followers', 'nobody'] as const).map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setAllowMentions(option);
                                localStorage.setItem('nexora_privacy_allow_mentions', option);
                              }}
                              className={`p-2 rounded-xl text-[10px] font-mono border font-black uppercase transition-all cursor-pointer ${
                                allowMentions === option ? 'border-cyan-400 text-cyan-400 bg-cyan-950/25' : 'border-white/5 text-zinc-400 hover:bg-black/20'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Allow Tags Radios */}
                      <div className="p-3.5 rounded-xl bg-black/20 border border-white/5 space-y-2">
                        <span className="font-bold text-white block text-[11px]">Admissible Tags Scope</span>
                        <div className="grid grid-cols-3 gap-2">
                          {(['everyone', 'followers', 'nobody'] as const).map(option => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => {
                                setAllowTags(option);
                                localStorage.setItem('nexora_privacy_allow_tags', option);
                              }}
                              className={`p-2 rounded-xl text-[10px] font-mono border font-black uppercase transition-all cursor-pointer ${
                                allowTags === option ? 'border-cyan-400 text-cyan-400 bg-cyan-950/25' : 'border-white/5 text-zinc-400 hover:bg-black/20'
                              }`}
                            >
                              {option}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Download toggle */}
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Allow Downloads of My Videos</span>
                          <span className="text-[9px] text-zinc-400 block font-sans">Let visitors back up and download your static clips or voice posts</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={allowDownloads}
                          onChange={(e) => {
                            setAllowDownloads(e.target.checked);
                            localStorage.setItem('nexora_privacy_allow_downloads', String(e.target.checked));
                          }}
                          className="w-4 h-4 rounded-sm accent-cyan-500 cursor-pointer" 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Messaging Rules Tab */}
                {activeSettingsSection === 'messaging' && (
                  <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-4 text-left animate-fadeIn">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-emerald-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                      <MessageCircle className="w-4 h-4 text-emerald-400" /> Secure Direct Messages
                    </h4>

                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3 font-sans">
                      <div>
                        <span className="font-bold text-white block text-xs">Who can start private chats with me?</span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5 leading-normal">
                          Only selected relationships are permitted to open real-time client socket feeds.
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {(['everyone', 'followers', 'following', 'nobody'] as const).map(scope => (
                          <button
                            key={scope}
                            type="button"
                            onClick={() => {
                              setWhoCanMessageMe(scope);
                              localStorage.setItem('nexora_privacy_messaging_scope', scope);
                            }}
                            className={`p-3 rounded-xl border text-[10px] font-mono font-black uppercase transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              whoCanMessageMe === scope
                                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                                : 'border-white/5 text-zinc-400 hover:bg-black/20'
                            }`}
                          >
                            <span className="block text-sm">{scope === 'everyone' ? '🌐' : scope === 'followers' ? '👥' : scope === 'following' ? '🤝' : '🔒'}</span>
                            <span>{scope}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-emerald-950/10 border border-emerald-500/10 text-[10px] text-emerald-400 leading-normal">
                      <strong>Reputation Badge Bypass:</strong> Accredited moderator authorities (👑, 🛸, 🟣) bypass DM blocks to deliver urgent service support notes.
                    </div>
                  </div>
                )}

                {/* 4. Safety & Safeguards Tab */}
                {activeSettingsSection === 'safety' && (
                  <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-4 text-left animate-fadeIn">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" /> Safety & Content Filters
                    </h4>

                    {/* Blocked Accounts Block */}
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                      <div className="flex justify-between items-center font-sans">
                        <span className="font-bold text-white block text-[11px]">Blocked Accounts Directory</span>
                        <span className="font-mono text-[9px] text-zinc-500">{blockedAccountsList.length} blocked</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type username to block..."
                          value={newBlockedUsername}
                          onChange={(e) => setNewBlockedUsername(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newBlockedUsername.trim()) return;
                            const clean = newBlockedUsername.replace('@', '').trim().toLowerCase();
                            if (!blockedAccountsList.includes(clean)) {
                              const updated = [...blockedAccountsList, clean];
                              setBlockedAccountsList(updated);
                              localStorage.setItem('nexora_privacy_blocked_usernames', JSON.stringify(updated));
                            }
                            setNewBlockedUsername('');
                          }}
                          className="px-3 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-mono font-bold rounded-lg uppercase cursor-pointer"
                        >
                          Block
                        </button>
                      </div>

                      {blockedAccountsList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {blockedAccountsList.map(uname => (
                            <div key={uname} className="flex items-center gap-1.5 bg-black/30 border border-white/10 px-2.5 py-1 rounded-md text-[10px] font-mono text-zinc-300">
                              <span>@{uname}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = blockedAccountsList.filter(u => u !== uname);
                                  setBlockedAccountsList(updated);
                                  localStorage.setItem('nexora_privacy_blocked_usernames', JSON.stringify(updated));
                                }}
                                className="text-amber-500 hover:text-red-400 font-extrabold cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Muted Accounts Block */}
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                      <div className="flex justify-between items-center font-sans">
                        <span className="font-bold text-white block text-[11px]">Muted Accounts</span>
                        <span className="font-mono text-[9px] text-zinc-500">{mutedAccountsList.length} muted</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type username to mute..."
                          value={newMutedUsername}
                          onChange={(e) => setNewMutedUsername(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newMutedUsername.trim()) return;
                            const clean = newMutedUsername.replace('@', '').trim().toLowerCase();
                            if (!mutedAccountsList.includes(clean)) {
                              const updated = [...mutedAccountsList, clean];
                              setMutedAccountsList(updated);
                              localStorage.setItem('nexora_privacy_muted_usernames', JSON.stringify(updated));
                            }
                            setNewMutedUsername('');
                          }}
                          className="px-3 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-mono font-bold rounded-lg uppercase cursor-pointer"
                        >
                          Mute
                        </button>
                      </div>

                      {mutedAccountsList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {mutedAccountsList.map(uname => (
                            <div key={uname} className="flex items-center gap-1.5 bg-black/30 border border-white/10 px-2.5 py-1 rounded-md text-[10px] font-mono text-zinc-300">
                              <span>@{uname}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = mutedAccountsList.filter(u => u !== uname);
                                  setMutedAccountsList(updated);
                                  localStorage.setItem('nexora_privacy_muted_usernames', JSON.stringify(updated));
                                }}
                                className="text-amber-500 hover:text-red-400 font-extrabold cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Word suppression engine block */}
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                      <div>
                        <span className="font-bold text-white block text-[11px]">Hidden Word suppression filter</span>
                        <span className="text-[9px] text-zinc-400 block">Comments or chat messages including these exact terms are immediately filtered.</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Add hidden keyword trigger word (e.g. lottery)..."
                          value={newHiddenWord}
                          onChange={(e) => setNewHiddenWord(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newHiddenWord.trim()) return;
                            const clean = newHiddenWord.trim().toLowerCase();
                            if (!hiddenWordsList.includes(clean)) {
                              const updated = [...hiddenWordsList, clean];
                              setHiddenWordsList(updated);
                              localStorage.setItem('nexora_privacy_hidden_words', JSON.stringify(updated));
                            }
                            setNewHiddenWord('');
                          }}
                          className="px-3 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-mono font-bold rounded-lg uppercase cursor-pointer"
                        >
                          Add Word
                        </button>
                      </div>

                      {hiddenWordsList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {hiddenWordsList.map(word => (
                            <div key={word} className="flex items-center gap-1.5 bg-black/30 border border-white/10 px-2.5 py-1 rounded-md text-[10px] font-mono text-zinc-300">
                              <span>"{word}"</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = hiddenWordsList.filter(w => w !== word);
                                  setHiddenWordsList(updated);
                                  localStorage.setItem('nexora_privacy_hidden_words', JSON.stringify(updated));
                                }}
                                className="text-amber-500 hover:text-red-400 font-extrabold cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Restricted Accounts Block */}
                    <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
                      <div>
                        <span className="font-bold text-white block text-[11px]">Restricted Accounts</span>
                        <span className="text-[9px] text-zinc-400 block">Comments from restricted accounts are only visible to themselves.</span>
                      </div>
                      
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Type username to restrict..."
                          value={newRestrictedUsername}
                          onChange={(e) => setNewRestrictedUsername(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-black/40 border border-white/10 text-white focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newRestrictedUsername.trim()) return;
                            const clean = newRestrictedUsername.replace('@', '').trim().toLowerCase();
                            if (!restrictedAccountsList.includes(clean)) {
                              const updated = [...restrictedAccountsList, clean];
                              setRestrictedAccountsList(updated);
                              localStorage.setItem('nexora_privacy_restricted_usernames', JSON.stringify(updated));
                            }
                            setNewRestrictedUsername('');
                          }}
                          className="px-3 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-mono font-bold rounded-lg uppercase cursor-pointer"
                        >
                          Restrict
                        </button>
                      </div>

                      {restrictedAccountsList.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {restrictedAccountsList.map(uname => (
                            <div key={uname} className="flex items-center gap-1.5 bg-black/30 border border-white/10 px-2.5 py-1 rounded-md text-[10px] font-mono text-zinc-300">
                              <span>@{uname}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = restrictedAccountsList.filter(u => u !== uname);
                                  setRestrictedAccountsList(updated);
                                  localStorage.setItem('nexora_privacy_restricted_usernames', JSON.stringify(updated));
                                }}
                                className="text-amber-500 hover:text-red-400 font-extrabold cursor-pointer"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. Notifications Panel */}
                {activeSettingsSection === 'notifications' && (
                  <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-4 text-left animate-fadeIn font-sans">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-pink-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-pink-400 animate-swing" /> Push Notification Rules
                    </h4>

                    <div className="space-y-3 text-xs">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Likes & Sparks Alerts</span>
                          <span className="text-[9px] text-[#C084FC] block">Alert when a visitor sparks your text or static clips</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyLikes}
                          onChange={(e) => {
                            setNotifyLikes(e.target.checked);
                            localStorage.setItem('nexora_notify_likes', String(e.target.checked));
                          }}
                          className="w-4 h-4 rounded-sm accent-pink-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Media Comments Alerts</span>
                          <span className="text-[9px] text-[#C084FC] block">Alert when followers leave voice or textual discussions</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyComments}
                          onChange={(e) => {
                            setNotifyComments(e.target.checked);
                            localStorage.setItem('nexora_notify_comments', String(e.target.checked));
                          }}
                          className="w-4 h-4 rounded-sm accent-pink-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Follower Connections alerts</span>
                          <span className="text-[9px] text-[#C084FC] block">Receive highlights when others request contact synchronization</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyFollowers}
                          onChange={(e) => {
                            setNotifyFollowers(e.target.checked);
                            localStorage.setItem('nexora_notify_followers', String(e.target.checked));
                          }}
                          className="w-4 h-4 rounded-sm accent-pink-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Socket Direct Messaging alerts</span>
                          <span className="text-[9px] text-[#C084FC] block">Alert on incoming secure private inquiries</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyMessages}
                          onChange={(e) => {
                            setNotifyMessages(e.target.checked);
                            localStorage.setItem('nexora_notify_messages', String(e.target.checked));
                          }}
                          className="w-4 h-4 rounded-sm accent-pink-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Mentions & Bio Tags alerts</span>
                          <span className="text-[9px] text-[#C084FC] block">Alert when tagged in descriptions or community posts</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyMentions}
                          onChange={(e) => {
                            setNotifyMentions(e.target.checked);
                            localStorage.setItem('nexora_notify_mentions', String(e.target.checked));
                          }}
                          className="w-4 h-4 rounded-sm accent-pink-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Community Updates newsletters</span>
                          <span className="text-[9px] text-[#C084FC] block">Weekly community board newsletters and broadcasts</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyCommunityUpdates}
                          onChange={(e) => {
                            setNotifyCommunityUpdates(e.target.checked);
                            localStorage.setItem('nexora_notify_community', String(e.target.checked));
                          }}
                          className="w-4 h-4 rounded-sm accent-pink-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                        <div>
                          <span className="font-bold text-white block text-[11px]">Live Broadcast alarms</span>
                          <span className="text-[9px] text-[#C084FC] block">Instant alerts when nodes your profile follows click "Go Live"</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={notifyLive}
                          onChange={(e) => {
                            setNotifyLive(e.target.checked);
                            localStorage.setItem('nexora_notify_live', String(e.target.checked));
                          }}
                          className="w-4 h-4 rounded-sm accent-pink-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. Themes & Colors Tab */}
                {activeSettingsSection === 'theme' && setTheme && theme && (
                  <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-4 text-left animate-fadeIn">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-purple-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-purple-400" /> Platform Skins
                    </h4>
                    
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'neon-cyber', label: 'Cyber Void', color: 'bg-violet-600', text: 'Neon Violet' },
                        { id: 'stealth-dark', label: 'Stealth Slate', color: 'bg-zinc-700', text: 'Classic Off-Black' },
                        { id: 'emerald-glass', label: 'Matrix Emerald', color: 'bg-emerald-600', text: 'Classy Green' },
                        { id: 'platinum-light', label: 'Ivory Platinum', color: 'bg-slate-200 border border-slate-400', text: 'Bright Clinical' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id as any)}
                          className={`p-3 rounded-xl border text-left transition-all hover:scale-102 flex flex-col justify-between h-20 cursor-pointer ${
                            theme === t.id
                              ? 'bg-white/10 border-[#8B5CF6] shadow-sm ring-1 ring-[#8B5CF6]/50'
                              : 'bg-black/40 border-white/5 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex justify-between items-center w-full font-sans">
                            <span className="text-[10px] font-bold text-white">{t.label}</span>
                            <div className={`w-3 h-3 rounded-full ${t.color}`} />
                          </div>
                          <span className="text-[8px] font-mono text-[#8B5CF6] font-bold uppercase">{t.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 9. Communities roles */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" /> Communities Roles Guide
                  </h4>
                  <p className="text-[10.5px] text-current/60 leading-snug">
                    You hold <strong>Founder Admin rights</strong> in 3 core community spaces, and verified membership in 15 active local groups.
                  </p>
                </div>

                {/* VOH ONLY NOTIFICATION CENTER FOR BADGE REQUESTS */}
                {currentUser.username === 'voh' && (
                  <div className="p-5 rounded-2xl bg-black/40 border border-violet-500/20 space-y-3 mt-4 text-left">
                    <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                      <Award className="w-4 h-4 text-violet-400" /> Pending Verification Notifications
                    </h4>
                    <span className="text-[9px] font-mono text-violet-400 block uppercase">
                      Admin review channel
                    </span>
                    <div className="space-y-2 mt-2">
                      {verificationRequests.length === 0 ? (
                        <p className="text-[10.5px] text-current/50 italic font-sans py-2">
                          No pending verification requests in the queue.
                        </p>
                      ) : (
                        verificationRequests.map((req: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-violet-950/25 border border-violet-500/15">
                            <div className="min-w-0 pr-2">
                              <p className="text-[11px] font-black text-white truncate">@{req.username}</p>
                              <p className="text-[9px] text-violet-300/60 truncate">{req.name}</p>
                            </div>
                            <button
                              onClick={() => handleDismissVerificationRequest(req.userId)}
                              className="px-2.5 py-1 bg-violet-600/30 hover:bg-violet-600/60 text-white rounded-md text-[9px] font-mono uppercase transition-colors cursor-pointer"
                            >
                              Review & Archive
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* 10. Support Form */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/10 space-y-3">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-violet-300 border-b border-violet-500/10 pb-2 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-400" /> Nexora Support Desk
                  </h4>
                  <div className="space-y-2">
                    <textarea 
                      placeholder="How can we help you today with your Nexora experience?..." 
                      className="w-full p-2.5 bg-violet-950/20 border border-violet-500/10 rounded-xl text-xs text-white"
                      rows={2}
                    />
                    <button 
                      onClick={() => alert("Your message has been sent to our customer support team!")}
                      className="px-3.5 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-mono font-bold rounded-lg uppercase cursor-pointer"
                    >
                      Send Support Ticket
                    </button>
                  </div>
                </div>

                {/* 11. DEVELOPER WORKSPACE EXPORTER CONSOLE COMPONENT - VISIBLE ONLY TO FOUNDER VOICE OF HARRISON */}
                {isOwnProfile && currentUser.username === 'voh' && (
                  <div className="p-5 rounded-2xl bg-linear-to-b from-[#150f38] to-[#05030f] border border-violet-500/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-violet-500/10 pb-3">
                      <h4 className="text-xs font-mono uppercase tracking-wider text-transparent bg-clip-text bg-linear-to-r from-violet-400 via-pink-400 to-cyan-400 font-extrabold flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-violet-400 animate-pulse" /> Code Exporter Console
                      </h4>
                      <span className="text-[8px] font-mono bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded border border-violet-500/30 uppercase tracking-widest font-black">
                        V2.1 // OFFLINE BYPASS
                      </span>
                    </div>

                    <p className="text-[10.5px] font-sans text-violet-200/80 leading-relaxed text-left">
                      Save all workspace files and customized parameters to your <strong>local drive/local storage</strong> instantly. We have pre-compiled standalone package-recovery modules in both <strong>Python</strong> and <strong>Node.js (JavaScript)</strong>.
                    </p>

                    {/* Direct script downloads */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {/* Python module download */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-violet-500/10 flex flex-col justify-between hover:border-violet-500/30 transition-all group">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-violet-300">🐍 Python Downloader</span>
                            <span className="text-[8px] font-mono text-violet-400/40 uppercase">download_project.py</span>
                          </div>
                          <p className="text-[9.5px] text-current/60 font-sans leading-normal">
                            A clean python routine that walks directory trees and bundles all assets in a standard compressed ZIP archive.
                          </p>
                        </div>
                        <div className="pt-3 flex flex-col gap-2">
                          <div className="p-1 px-2.5 rounded bg-black/60 border border-white/5 font-mono text-[9px] text-cyan-400/80 truncate">
                            $ python download_project.py
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              downloadScriptFile('download_project.py', pythonExporterCode);
                            }}
                            className="w-full py-1.5 bg-violet-600/20 hover:bg-violet-600 border border-violet-500/30 text-white font-mono text-[10px] font-bold rounded-lg uppercase flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Save Python Script
                          </button>
                        </div>
                      </div>

                      {/* Node JS module download */}
                      <div className="p-3.5 rounded-xl bg-black/40 border border-violet-500/10 flex flex-col justify-between hover:border-violet-500/30 transition-all group">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono font-bold text-violet-300">⚡ JS Node Exporter</span>
                            <span className="text-[8px] font-mono text-violet-400/40 uppercase">download_project.js</span>
                          </div>
                          <p className="text-[9.5px] text-current/60 font-sans leading-normal">
                            A direct Node.js utility runner that creates a backup directory and compiles files on Unix/macOS or Windows instantly.
                          </p>
                        </div>
                        <div className="pt-3 flex flex-col gap-2">
                          <div className="p-1 px-2.5 rounded bg-black/60 border border-white/5 font-mono text-[9px] text-cyan-400/80 truncate">
                            $ node download_project.js
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              downloadScriptFile('download_project.js', jsExporterCode);
                            }}
                            className="w-full py-1.5 bg-violet-600/20 hover:bg-violet-600 border border-violet-500/30 text-white font-mono text-[10px] font-bold rounded-lg uppercase flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" /> Save Node JS Script
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Interactive ZIP instructions guide */}
                    <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/20 space-y-1.5 text-left">
                      <span className="text-[10.5px] font-mono font-black text-cyan-400 flex items-center gap-1">
                        ✨ Official Workspace Recovery Guide
                      </span>
                      <p className="text-[9.8px] text-violet-300/80 font-sans leading-relaxed">
                        To download <strong>everything co-created here</strong> (including full React sources, configs, linter schemes, and package dependencies) in one fully packaged file directly to your hard drive:
                      </p>
                      <ol className="text-[9.2px] text-current/60 font-mono list-decimal pl-4.5 space-y-1 leading-normal">
                        <li>Locate the <strong>Google AI Studio Interface</strong>.</li>
                        <li>In the top right-hand corner of the workspace, click on the **⚙️ settings/three-dot overlay menu**.</li>
                        <li>Select <strong>Download ZIP</strong> or click <strong>Export to GitHub</strong> to archive all repository parameters instantly!</li>
                      </ol>
                    </div>
                  </div>
                )}

                {/* 12. About Nexora info */}
                <div className="p-5 rounded-2xl bg-[#0d0926]/40 border border-violet-500/15 space-y-2 text-center sm:text-left">
                  <span className="text-[10px] font-mono text-violet-400 font-extrabold flex items-center justify-center sm:justify-start gap-1">
                    <Info className="w-3.5 h-3.5" /> ABOUT NEXORA NETWORK
                  </span>
                  <p className="text-[10px] text-current/50 font-sans leading-relaxed">
                    NEXORA Living Node social system • Version 2.1.0-STABLE.<br />
                    All nodes synchronized on safe cryptographic parameters.<br />
                    Copyright © 2026 Nexora Foundation. All rights reserved.
                  </p>
                </div>

                {/* Sign out and Save button */}
                <div className="pt-4 border-t border-violet-500/10 flex flex-wrap gap-2 justify-between items-center">
                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-[10px] font-mono font-bold rounded-lg uppercase cursor-pointer"
                    >
                      🚪 Sign Out of Nexora
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onUpdateProfile({
                        name: editName,
                        bio: editBio,
                        location: editLocation,
                        website: editWebsite,
                        coverImage: editCover,
                        avatar: editAvatar
                      });
                      setIsSettingsOpen(false);
                    }}
                    className="px-5 py-2.5 text-[10px] font-mono font-bold rounded-xl bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white uppercase tracking-wider cursor-pointer"
                  >
                    Save & Return
                  </button>
                </div>

              </div>

            </div>

          </motion.div>
        ) : (
          <motion.div
            key="voh-profile-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Minimalist Profile Layout - Cover banner completely removed */}

      {/* Editing Form Section */}
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.form
            key="voh-edit-form"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onSubmit={handleSaveProfile}
            className="p-6 rounded-3xl bg-[#090715] border border-violet-500/30 space-y-4 shadow-xl"
            id="voh-edit-profile-form"
          >
            <h4 className="text-xs font-mono font-black uppercase text-violet-400">
              Update Founder Node Parameters
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase text-[#A78BFA]/75">Display Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-xl bg-violet-950/40 border border-violet-500/20 focus:outline-none focus:border-violet-500/50 text-white transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase text-[#A78BFA]/75">Twitter/Website Link</label>
                <input
                  type="text"
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-violet-950/40 border border-violet-500/20 focus:outline-none focus:border-violet-500/50 text-white transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono uppercase text-[#A78BFA]/75">HQ Node (Location)</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-violet-950/40 border border-violet-500/20 focus:outline-none focus:border-violet-500/50 text-white transition-colors"
                />
              </div>

              <div className="md:col-span-2 space-y-2 p-4 bg-violet-950/20 rounded-2xl border border-violet-500/10 text-left">
                <span className="text-[10px] font-mono uppercase text-[#A78BFA] font-bold block">
                  👤 Profile Picture Node Configuration
                </span>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start pt-1">
                  {/* Miniature Portrait Node Preview */}
                  <div className="relative group shrink-0">
                    <img 
                      src={editAvatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=180&auto=format&fit=crop&q=80"} 
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-violet-500/30 bg-slate-950" 
                    />
                    <span className="absolute -bottom-1 -right-1 bg-violet-600 border border-violet-400 text-white text-[8px] font-mono px-1 rounded scale-90 leading-none py-0.5">
                      Preview
                    </span>
                  </div>

                  {/* Shutter Camera / File selector Actions */}
                  <div className="flex-1 w-full space-y-2.5">
                    {isWebcamActive ? (
                      <div className="space-y-2">
                        <div className="relative rounded-xl overflow-hidden bg-black border border-violet-500/30 max-w-xs mx-auto sm:mx-0">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            className="w-full h-32 object-cover" 
                          />
                          <div className="absolute top-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[8px] font-mono text-fuchsia-400 animate-pulse border border-fuchsia-400/20">
                            SHUTTER ACTIVE
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={captureCameraPhoto}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-mono rounded-lg transition-colors cursor-pointer font-bold uppercase leading-none"
                          >
                            📷 Capture Frame
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-rose-400 text-[10px] font-mono rounded-lg border border-rose-500/10 transition-colors cursor-pointer uppercase leading-none"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-[10px] text-violet-300 font-sans">
                          Take a direct snapshot from your webcam or select a custom image file:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={startCamera}
                            className="px-3.5 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 text-[10px] font-mono rounded-lg transition-all cursor-pointer flex items-center gap-1.5 uppercase font-bold"
                          >
                            📸 Snap Quick Shot
                          </button>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-3.5 py-2 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/20 text-cyan-300 text-[10px] font-mono rounded-lg transition-all cursor-pointer flex items-center gap-1.5 uppercase font-bold"
                          >
                            📁 Choose Photo File
                          </button>
                          
                          {/* Hidden actual file input element */}
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleGalleryUpload} 
                            accept="image/*" 
                            className="hidden" 
                          />
                        </div>
                      </div>
                    )}

                    {/* Keep general raw avatar URL field accessible in case user prefers CDN or static asset urls */}
                    <div className="space-y-1 text-left pt-1">
                      <label className="text-[8.5px] font-mono uppercase text-violet-400/70">Or specify static image index address (URL)</label>
                      <input
                        type="url"
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        className="w-full px-3 py-1.5 text-[10.5px] rounded-lg bg-zinc-950/60 border border-violet-500/20 focus:outline-none focus:border-violet-500/50 text-white font-mono"
                        placeholder="https://example.com/matrix_avatar.jpg"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[9px] font-mono uppercase text-[#A78BFA]/75">Biographical Summary</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-violet-950/40 border border-violet-500/20 focus:outline-none focus:border-violet-500/50 text-white transition-colors"
                />
              </div>
            </div>

            {/* Personality Settings */}
            <div className="pt-4 border-t border-violet-500/10 space-y-4 text-left">
              <h5 className="text-xs font-bold font-sans text-white uppercase tracking-wider">
                🟣 Personality Systems (Status & Music)
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase text-violet-400">Set Custom Activity Status</label>
                  <div className="flex gap-2">
                    <select
                      value={editStatusEmoji}
                      onChange={(e) => setEditStatusEmoji(e.target.value)}
                      className="bg-zinc-950/80 border border-violet-500/20 text-white rounded-xl p-2 text-xs focus:outline-none"
                    >
                      <option value="🟢">🟢 Online</option>
                      <option value="🎮">🎮 Gaming</option>
                      <option value="💻">💻 Working</option>
                      <option value="📚">📚 Studying</option>
                      <option value="☕">☕ Break</option>
                      <option value="⚽">⚽ Football</option>
                      <option value="🔥">🔥 Cooking</option>
                    </select>
                    <input
                      type="text"
                      value={editStatusText}
                      onChange={(e) => setEditStatusText(e.target.value)}
                      placeholder="Custom status text (e.g. Studying, Gaming, working)"
                      className="flex-1 bg-[#150e3a]/50 border border-violet-500/25 rounded-xl p-2 px-3 text-xs text-white placeholder-violet-400/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase text-violet-400">Pin Showpiece Song (Show on Profile)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editSong}
                      onChange={(e) => setEditSong(e.target.value)}
                      placeholder="Song Title (e.g. Blinding Lights)"
                      className="w-1/2 bg-[#150e3a]/50 border border-violet-500/25 rounded-xl p-2 px-3 text-xs text-white placeholder-violet-400/50"
                    />
                    <input
                      type="text"
                      value={editArtist}
                      onChange={(e) => setEditArtist(e.target.value)}
                      placeholder="Artist (e.g. The Weeknd)"
                      className="w-1/2 bg-[#150e3a]/50 border border-violet-500/25 rounded-xl p-2 px-3 text-xs text-white placeholder-violet-400/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Appearance Settings Section within Profile Settings */}
            {setTheme && theme && (
              <div className="pt-4 border-t border-violet-500/10 space-y-3 text-left">
                <h5 className="text-xs font-bold font-sans text-white uppercase tracking-wider">
                  🎨 Appearance (Interface Theme)
                </h5>
                <p className="text-[10px] text-current/60 font-sans">
                  Select a premium aesthetic interface config for your NEXORA experience:
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: 'neon-cyber', label: 'Cyber Void', color: 'bg-violet-600', text: 'Neon Violet' },
                    { id: 'stealth-dark', label: 'Stealth Slate', color: 'bg-zinc-700', text: 'Classic Off-Black' },
                    { id: 'emerald-glass', label: 'Matrix Emerald', color: 'bg-emerald-600', text: 'Classy Green' },
                    { id: 'platinum-light', label: 'Ivory Platinum', color: 'bg-slate-200 border border-slate-400', text: 'Bright Clinical' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id as any)}
                      className={`p-3 rounded-xl border text-left transition-all hover:scale-102 flex flex-col justify-between h-20 cursor-pointer ${
                        theme === t.id
                          ? 'bg-white/10 border-[#8B5CF6] shadow-sm ring-1 ring-[#8B5CF6]/50'
                          : 'bg-black/40 border-white/5 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="text-[10px] font-bold text-white font-sans">{t.label}</span>
                        <div className={`w-3 h-3 rounded-full ${t.color}`} />
                      </div>
                      <span className="text-[8px] font-mono text-[#8B5CF6]">{t.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Standalone PWA Client Installation Banner */}
            {onTriggerPWAInstall && showPWAInstallPrompt && (
              <div className="pt-4 border-t border-violet-500/10 space-y-3 text-left">
                <h5 className="text-xs font-bold font-sans text-[#A78BFA] uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  Standalone Secure client
                </h5>
                <p className="text-[10px] text-zinc-400 font-sans leading-relaxed">
                  Fast-load Nexora with edge-to-edge viewing, zero latency, and launch directly from your device home screen.
                </p>
                <button
                  type="button"
                  onClick={onTriggerPWAInstall}
                  className="px-4 py-2 bg-linear-to-r from-violet-600 via-pink-600 to-pink-500 hover:brightness-110 text-white text-[11px] font-sans font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-[0_0_12px_rgba(139,92,246,0.25)] flex items-center gap-1.5"
                >
                  📥 Install Standalone Client App
                </button>
              </div>
            )}

            {/* Account Settings Section with Logout button */}
            {onLogout && (
              <div className="pt-4 border-t border-violet-500/10 space-y-3 text-left">
                <h5 className="text-xs font-bold font-sans text-white uppercase tracking-wider">
                  ⚙️ Account Management
                </h5>
                <p className="text-[10px] text-current/60 font-sans">
                  Safely sign out or terminate your current session on this device:
                </p>
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 hover:border-rose-500/50 text-rose-400 text-xs font-mono font-bold rounded-lg transition-all uppercase tracking-wider cursor-pointer"
                >
                  🚪 Log Out of Nexora
                </button>
              </div>
            )}

            <div className="pt-4 border-t border-violet-500/10 flex justify-end gap-2">
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-mono font-bold rounded-xl bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white shadow-lg shadow-violet-500/25 transition-all text-center uppercase tracking-wider cursor-pointer"
              >
                Save Settings
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.div
            key="voh-display-info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-2 text-left space-y-5"
          >
            {/* 1. Profile Picture with presence indicator */}
            <div className="flex items-center gap-5 relative pl-1">
              <div 
                className={`relative shrink-0 ${activeUserStory ? 'cursor-pointer hover:scale-105 transition-all' : ''}`}
                onClick={() => {
                  if (activeUserStory) {
                    setSelectedMoment(activeUserStory);
                    setStoryIndex(0);
                  }
                }}
              >
                <img 
                  src={currentUser.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=180&auto=format&fit=crop&q=80"} 
                  alt={currentUser.name} 
                  referrerPolicy="no-referrer"
                  className={`w-24 h-24 rounded-full object-cover shadow-xl bg-slate-900 border-2 ${
                    activeUserStory 
                      ? 'ring-4 ring-purple-600 ring-offset-2 animate-pulse border-purple-500/20' 
                      : 'border-violet-550/60'
                  }`}
                />
                
                {/* Tiny purple dot: replace boldness of "Active Now" with an online presence dot */}
                <span className="absolute bottom-1 right-1 w-3.5 h-3.5 bg-violet-500 border-2 border-[#090514] rounded-full shadow-md shadow-violet-500/30" title="Online Node active" />

                {activeUserStory && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1 py-0.2 bg-purple-600 border border-purple-400 text-[8px] font-mono font-black text-white rounded-md uppercase tracking-wider select-none">
                    STORY
                  </span>
                )}
              </div>

              {/* Badges / Creator status */}
              <div className="space-y-1.5 text-left">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-lg bg-violet-950/40 text-violet-300 border border-violet-500/10 flex items-center gap-1">
                    <span>{statusEmoji || '👤'}</span>
                    <span className="font-extrabold tracking-wider">{statusText || 'Synchronized'}</span>
                  </span>
                  
                  {/* Trusted Expert Badges */}
                  {(currentUser.username === 'voh' || currentUser.username === 'voh_ai') && (
                    <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-305 border border-amber-500/20 flex items-center gap-0.5" title="Earned through football contributions">
                      <span>⚽</span> Expert
                    </span>
                  )}
                  {(currentUser.username === 'nexora_ai' || currentUser.username === 'voh_ai') && (
                    <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-303 border border-blue-500/20 flex items-center gap-0.5" title="Verified system programmer">
                      <span>💻</span> Developer
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-zinc-500">
                  {currentUser.username === 'voh' ? '⚡ System Founder Core' : '👤 Synced Member'}
                </p>
              </div>
            </div>

            {/* 2 & 3. Display Name + Purple Badge & Username */}
            <div className="space-y-1 text-left pl-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black font-sans text-white tracking-tight uppercase leading-none">
                  {currentUser.name}
                </h2>
                {(currentUser.username === 'voh' || currentUser.isVerified) && <PurpleVerifiedBadge className="w-5 h-5 shrink-0" />}
              </div>
              <p className="text-sm text-violet-400 font-mono">@{currentUser.username}</p>
            </div>

            {/* 4. Edit Profile Button / Follow Button (owner only / visitor) */}
            <div className="flex flex-wrap items-center gap-2 pl-1">
              {isOwnProfile ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-mono font-bold bg-violet-600/15 hover:bg-violet-600/25 text-violet-200 hover:text-white rounded-xl border border-violet-500/30 backdrop-blur-md transition-all shadow-lg cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-violet-400" />
                    <span>Edit Profile</span>
                  </button>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 rounded-xl border border-violet-500/20 bg-[#0d0a21]/90 text-violet-400 hover:text-white cursor-pointer transition-all"
                    title="Open Settings Console (⚙️)"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      if (onToggleFollow) {
                        onToggleFollow(currentUser.id);
                      }
                      setIsFollowing(!isFollowing);
                    }}
                    className={`flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-xs font-mono font-black transition-all cursor-pointer ${
                      isFollowing 
                        ? 'bg-violet-950/65 text-violet-300 border border-violet-500/30 hover:bg-violet-900/40' 
                        : 'bg-violet-600 text-white hover:bg-violet-550 active:scale-95'
                    }`}
                  >
                    {isFollowing ? <UserCheck className="w-4 h-4 text-violet-400" /> : <UserPlus className="w-4 h-4" />}
                    <span>{isFollowing ? 'FOLLOWED' : 'FOLLOW'}</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onStartChat) {
                        onStartChat(currentUser.id);
                      } else {
                        alert(`Opening chat with @${currentUser.username}...`);
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-black border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/15 text-violet-200 transition-all active:scale-95 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-violet-400" />
                    <span>MESSAGE</span>
                  </button>
                </>
              )}

              <div className="relative">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://nexora.ai/${currentUser.username}`);
                    setShowShareAlert(true);
                    setTimeout(() => setShowShareAlert(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-mono font-black border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/15 text-violet-200 transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-violet-400" />
                  <span>SHARE</span>
                </button>
                {showShareAlert && (
                  <span className="absolute bottom-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-violet-600 text-white font-mono text-[9px] rounded-lg tracking-wider whitespace-nowrap animate-bounce shadow-lg z-50">
                    COPIED!
                  </span>
                )}
              </div>
            </div>

            {/* Personality Status Section */}
            <div className="pl-1 flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-xl bg-violet-950/50 text-violet-200 border border-violet-500/20 flex items-center gap-1.5 shadow-sm">
                <span className="animate-pulse">{statusEmoji}</span>
                <span className="font-extrabold tracking-wider">{statusText}</span>
              </span>

              {/* Trusted Expert Badges */}
              {(currentUser.username === 'voh' || currentUser.username === 'voh_ai') && (
                <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1.5" title="Earned through football contributions">
                  <span>⚽</span> Football Expert
                </span>
              )}
              {(currentUser.username === 'nexora_ai' || currentUser.username === 'voh_ai') && (
                <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-xl bg-blue-500/10 text-blue-300 border border-blue-500/20 flex items-center gap-1.5" title="Verified system programmer">
                  <span>💻</span> Technical Developer
                </span>
              )}

            </div>

            {/* Compact Bio Paragraph & Location info */}
            <div className="pl-1 space-y-2 text-xs">
              {currentUser.bio && (
                <p className="text-violet-100 font-sans leading-relaxed whitespace-pre-wrap max-w-2xl bg-[#09061c]/40 p-3 rounded-2xl border border-violet-500/5">
                  {currentUser.bio}
                </p>
              )}

              {/* Pin Showpiece Song Preview */}
              {(pinnedSong || pinnedArtist) && (
                <div className="flex items-center justify-between gap-3 bg-linear-to-r from-violet-950/40 via-purple-950/10 to-pink-950/20 border border-violet-500/15 p-2 px-3 rounded-2xl max-w-md shadow-md">
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20">
                      {isSongPlaying ? (
                        <div className="flex gap-0.5 items-end h-3">
                          <span className="w-1 bg-violet-400 h-2 animate-bounce" style={{ animationDelay: '0.1s' }} />
                          <span className="w-1 bg-pink-400 h-3 animate-bounce" style={{ animationDelay: '0.3s' }} />
                          <span className="w-1 bg-violet-400 h-1.5 animate-bounce" style={{ animationDelay: '0s' }} />
                        </div>
                      ) : (
                        <Volume2 className="w-4 h-4 text-violet-400" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] font-mono text-violet-400 uppercase tracking-widest leading-none">PINNED TRACK</p>
                      <h5 className="text-[11px] font-sans font-bold text-white leading-tight mt-0.5">{pinnedSong}</h5>
                      <p className="text-[9.5px] font-sans text-violet-300/60 leading-none">{pinnedArtist}</p>
                    </div>
                  </div>
                  <button
                    onClick={playSynthesizedPreview}
                    className="p-1 px-3.5 rounded-xl text-[10px] font-mono font-bold bg-[#8B5CF6]/15 hover:bg-[#8B5CF6]/30 border border-[#8B5CF6]/25 text-[#D8B4FE] transition-all hover:scale-103 cursor-pointer"
                  >
                    {isSongPlaying ? 'PAUSE PREVIEW' : 'TAP TO PREVIEW'}
                  </button>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-y-1.5 gap-x-4 text-[11px] font-mono text-violet-300">
                {currentUser.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-violet-400" />
                    <span>{currentUser.location}</span>
                  </div>
                )}
                {currentUser.website && currentUser.website.trim() !== '' && (
                  <div className="flex items-center gap-1">
                    <LinkIcon className="w-3.5 h-3.5 text-violet-400" />
                    <a 
                      href={`https://${currentUser.website}`} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="hover:text-violet-300 underline decoration-violet-500/40 transition-colors"
                    >
                      {currentUser.website}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-violet-400" />
                  <span>Joined {currentUser.joinedDate}</span>
                </div>
              </div>

              {/* Profile Creator Upgrades: Profile Views & Visitor Insights (Owner-Only) */}
              {isOwnProfile && (
                <div className="p-4 rounded-2xl bg-[#0d0926]/40 border border-violet-500/15 space-y-4 max-w-2xl mt-3 text-left">
                  <div className="flex items-center justify-between border-b border-violet-500/10 pb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-violet-200 font-extrabold flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-violet-400" />
                      <span>Creator Live Insights (Owner Only)</span>
                    </span>
                    <span className="text-[8px] font-mono text-violet-400 bg-violet-950/50 border border-violet-500/20 px-2 py-0.5 rounded uppercase">
                      🔒 Private to you
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Left: View Count and Filters */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider">Profile Views</span>
                        <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/5">
                          {(['today', 'week', 'month'] as const).map((filter) => (
                            <button
                              key={filter}
                              onClick={() => setProfileViewFilter(filter)}
                              className={`px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                                profileViewFilter === filter
                                  ? 'bg-purple-600 text-white font-bold'
                                  : 'text-zinc-500 hover:text-zinc-300'
                              }`}
                            >
                              {filter}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-black/20 rounded-xl border border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="text-xl">👁️</span>
                          <div>
                            <span className="text-sm font-sans font-black text-white block">
                              {profileViewFilter === 'today' ? '38' : profileViewFilter === 'week' ? '247' : '894'}{' '}
                              views
                            </span>
                            <span className="text-[9px] text-zinc-500 font-mono block">
                              {profileViewFilter === 'today'
                                ? 'Real human activities today'
                                : profileViewFilter === 'week'
                                ? 'Profile views this week'
                                : 'Cumulative monthly coverage'}
                            </span>
                          </div>
                        </div>
                        <span className="text-emerald-400 text-[10px] font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          +15%
                        </span>
                      </div>
                    </div>

                    {/* Right: Visitor Insights with toggle information */}
                    <div className="space-y-2.5">
                      <span className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider block">Recent Visitors</span>

                      <div className="space-y-1.5">
                        {[
                          { name: 'Alex', username: 'alex_sterling', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80', time: '12m ago' },
                          { name: 'Sarah', username: 'sarah_codes', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', time: '2h ago' },
                          { name: 'David', username: 'david_j', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', time: '1d ago' }
                        ].map((visitor, i) => (
                          <div key={i} className="flex items-center justify-between p-1.5 bg-black/10 rounded-lg border border-white/5 text-[10.5px]">
                            <div className="flex items-center gap-2">
                              <img src={visitor.avatar} className="w-5 h-5 rounded-md object-cover" />
                              <span className="font-sans font-bold text-zinc-100">{visitor.name}</span>
                              <span className="text-[9px] text-zinc-500 font-mono">@{visitor.username}</span>
                            </div>
                            <span className="text-[9px] text-violet-400 font-mono">{visitor.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Creator Highlights */}
              {(() => {
                // Programmatic Creator Highlights or beautiful fallbacks
                const sortedByLikes = [...myPosts].sort((a, b) => (b.likes || 0) - (a.likes || 0));
                const sortedByComments = [...myPosts].sort((a, b) => (b.comments?.length || 0) - (a.comments?.length || 0));
                
                const topP = sortedByLikes[0] || null;
                const trendP = sortedByComments.length > 1 && sortedByComments[0]?.id === topP?.id 
                  ? sortedByComments[1] 
                  : (sortedByComments[0] || null);
                
                const fallbackTopText = "The journey into decentralised social networking with Nexora. Real connections, absolute design fidelity.";
                const fallbackTrendText = "Voice node recordings are live! Tap to listen to my newest webm broadcast. 🎙️⚡";

                return (
                  <div className="space-y-2.5 max-w-2xl mt-4 text-left">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-violet-300 font-extrabold flex items-center gap-1.5">
                      <span>🏆</span> Creator Highlights
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Top Post Highlights Card */}
                      <div 
                        onClick={() => {
                          if (topP) {
                            setSelectedGridPost(topP);
                          } else {
                            window.dispatchEvent(new CustomEvent('toast', { detail: "🏆 Featured top post: standard system welcome anchor!" }));
                          }
                        }}
                        className="p-3 bg-[#0d0926]/40 border border-violet-500/15 hover:border-violet-400/30 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-1 px-2 bg-purple-600 text-white font-mono text-[8px] font-black rounded-bl-lg uppercase tracking-wider select-none">
                          TOP POST
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-mono text-purple-400 block tracking-wider font-bold">🏆 HIGH ENGAGEMENT NODE</span>
                          <p className="text-[11px] text-zinc-100 font-sans leading-relaxed line-clamp-2">
                            {topP ? topP.content : fallbackTopText}
                          </p>
                          <div className="flex items-center gap-1 text-[9.5px] font-mono text-zinc-500 mt-2">
                            <span>❤️ {topP ? topP.likes : 142} likes</span>
                            <span>•</span>
                            <span>💬 {topP ? topP.comments?.length : 24} responses</span>
                          </div>
                        </div>
                      </div>

                      {/* Trending Post Highlights Card */}
                      <div 
                        onClick={() => {
                          if (trendP) {
                            setSelectedGridPost(trendP);
                          } else if (topP) {
                            setSelectedGridPost(topP);
                          } else {
                            window.dispatchEvent(new CustomEvent('toast', { detail: "🔥 Trending node: real-time voice synthesis broadcast!" }));
                          }
                        }}
                        className="p-3 bg-[#0d0926]/40 border border-pink-500/15 hover:border-pink-400/30 rounded-xl cursor-pointer transition-all hover:-translate-y-0.5 group relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-1 px-2 bg-pink-500 text-white font-mono text-[8px] font-black rounded-bl-lg uppercase tracking-wider select-none">
                          TRENDING
                        </div>
                        <div className="space-y-1 text-left">
                          <span className="text-[9px] font-mono text-pink-400 block tracking-wider font-bold">🔥 SPECTRUM VELOCITY BOOST</span>
                          <p className="text-[11px] text-zinc-100 font-sans leading-relaxed line-clamp-2">
                            {trendP ? trendP.content : fallbackTrendText}
                          </p>
                          <div className="flex items-center gap-1 text-[9.5px] font-mono text-zinc-500 mt-2">
                            <span>💬 {trendP ? trendP.comments?.length : 38} comments</span>
                            <span>•</span>
                            <span>🔥 Vitality index: Ultra</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* REAL ACHIEVEMENT BADGES SHELF */}
            <div className="p-4 rounded-2xl bg-linear-to-b from-[#100c2a]/80 to-[#070514]/90 border border-violet-500/15 text-left mt-2 shadow-inner">
              <span className="text-[9.5px] font-mono uppercase tracking-widest text-violet-400 font-bold flex items-center gap-1.5 mb-2.5">
                <Award className="w-3.5 h-3.5 text-violet-400" />
                <span>Credentials & Credentials (Achievements)</span>
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { title: "First Post", desc: "Shared thoughts with the Nexora world.", emoji: "🏆" },
                  { title: "100 Followers", desc: "A true community starting to grow.", emoji: "🏆" },
                  { title: "Builder Guild", desc: "Co-programmed a collaborative hub.", emoji: "🏆" },
                  { title: "Viral Message", desc: "Resonated with over hundreds of fans.", emoji: "🏆" },
                  { title: "Top Contributor", desc: "Granted maximum reputation bonus.", emoji: "🏆" }
                ].map((ach, idx) => (
                  <div key={idx} className="p-2 bg-[#130f35]/50 rounded-xl border border-violet-500/5 hover:border-violet-500/20 transition-all flex flex-col justify-between h-20 group relative overflow-hidden">
                    <div className="absolute top-1 right-1 text-xs opacity-80">{ach.emoji}</div>
                    <div className="mt-3">
                      <h4 className="text-[10px] font-sans font-extrabold text-white leading-tight group-hover:text-violet-300 transition-colors">{ach.title}</h4>
                      <p className="text-[8px] font-sans text-zinc-400 leading-none mt-1">{ach.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Creator Tools Section - Only shown on user's own profile */}
            {isOwnProfile && (
              <div className="p-4 rounded-2xl bg-[#0e0a25]/60 border border-violet-500/15 text-left mt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-extrabold flex items-center gap-1.5">
                    <span>👉</span> Creator Tools
                  </h3>
                  <h4 className="text-sm font-sans font-black text-white">Creator Dashboard</h4>
                  <p className="text-[11px] text-zinc-400 font-sans">
                    View analytics, earnings and audience growth.
                  </p>
                </div>
                
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!currentUser.creatorModeEnabled) {
                        onUpdateProfile({ creatorModeEnabled: true });
                      }
                      setActiveDashboardTab('overview');
                      setIsCreatorDashboardOpen(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2.5 text-[11px] font-mono font-black rounded-xl uppercase transition-all flex items-center gap-1.5 border border-transparent cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-inherit" />
                    <span>Open Dashboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* Advanced Developer / Network parameters (collapsed by default) */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] font-mono text-violet-500 hover:text-violet-300 transition-colors flex items-center gap-1 cursor-pointer pl-1"
              >
                {showAdvanced ? '▼ Hide premium account insights' : '▶ Show premium account insights'}
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden space-y-4 pt-3"
                  >
                    {/* Primary Statistics Grid - Combined Metrics */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-violet-950/20 border border-violet-500/10 rounded-2xl">
                        <p className="text-[9px] font-mono text-violet-400 uppercase tracking-wider font-extrabold text-left">Reputation Points</p>
                        <p className="text-lg font-mono font-black text-white mt-1 text-left">{formatNumber(currentUser.reputationPoints)}</p>
                      </div>

                      <div className="p-3 bg-violet-950/20 border border-violet-500/10 rounded-2xl">
                        <p className="text-[9px] font-mono text-violet-400 uppercase tracking-wider font-extrabold text-left font-semibold">Contributions</p>
                        <p className="text-lg font-mono font-black text-cyan-400 mt-1 text-left">{formatNumber(currentUser.reputationBreakdown?.contributions || 0)}</p>
                      </div>

                      <div className="p-3 bg-violet-950/20 border border-violet-500/10 rounded-2xl">
                        <p className="text-[9px] font-mono text-violet-400 uppercase tracking-wider text-left">Sync Status</p>
                        <p className="text-sm font-mono font-bold text-emerald-400 mt-1 text-left">🟢 synced</p>
                      </div>

                      <div className="p-3 bg-violet-950/20 border border-violet-500/10 rounded-2xl">
                        <p className="text-[9px] font-mono text-violet-400 uppercase tracking-wider text-left">Reputation Rank</p>
                        <p className="text-sm font-mono font-bold text-pink-400 mt-1 text-left">Elite Level</p>
                      </div>
                    </div>

                    {/* VOH AI Profile Summary Block */}
                    <div className="p-4 rounded-2xl bg-[#0a071d] border border-violet-500/20 shadow-md relative overflow-hidden text-left">
                      <h3 className="text-[10px] font-mono uppercase text-[#A78BFA] font-black tracking-widest flex items-center gap-1.5 mb-2">
                        <span>🧠</span>
                        <span>AI Profile Insight</span>
                      </h3>
                      <p className="text-xs text-violet-100/90 leading-relaxed font-sans italic">
                        {currentUser.username === 'voh' 
                          ? '"VOICE OF HARRISON is the founder of NEXORA and creator of VOH AI. A technology entrepreneur and community builder focused on creating innovative platforms that help people connect, collaborate, learn, and grow."'
                          : `"${currentUser.name} is an active member of the NEXORA community. They have established a dynamic reputation rating of ${currentUser.reputationPoints} points with strong community contributions."`}
                      </p>
                    </div>

                    {/* Pinned Founder Message */}
                    {currentUser.username === 'voh' && (
                      <div className="p-4 rounded-2xl bg-[#0d0926]/40 border border-violet-500/30 shadow-md relative pl-11 text-left">
                        <div className="absolute left-4 top-4.5">
                          <Pin className="w-4 h-4 text-violet-400 rotate-45" />
                        </div>
                        <h4 className="text-[10px] font-mono uppercase text-violet-400 font-bold tracking-widest mb-1.5">
                          📌 Pinned Founder Message
                        </h4>
                        <blockquote className="text-xs text-white leading-relaxed font-sans border-l-2 border-violet-500/50 pl-3 italic space-y-2">
                          <p>Welcome to NEXORA.</p>
                          <p>Social media should be more than content and scrolling. It should help people discover opportunities, build communities, learn from one another, and create real impact.</p>
                          <cite className="block text-[10px] text-violet-300 font-mono not-italic mt-2">
                            — VOICE OF HARRISON <PurpleVerifiedBadge className="w-3.5 h-3.5" />
                          </cite>
                        </blockquote>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 📌 Pinned posts section (Max 3) rendered horizontally */}
      {(() => {
        const pinnedPosts = myPosts.filter(p => pinnedPostIds.includes(p.id)).slice(0, 3);
        if (pinnedPosts.length === 0) return null;
        return (
          <div className="mt-4 mb-2 bg-[#0c0a25]/60 hover:bg-[#0c0a25]/80 p-4 rounded-3xl border border-violet-500/20 text-left transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono tracking-widest text-[#8B5CF6] font-bold uppercase flex items-center gap-1.5">
                <Pin className="w-3.5 h-3.5 fill-violet-400 rotate-45 text-violet-400" />
                <span>Pinned Content ({pinnedPosts.length}/3)</span>
              </span>
              <span className="text-[9px] font-mono text-zinc-500">Spotlight</span>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-none snap-x">
              {pinnedPosts.map(post => {
                const isVoice = post.isVoice || post.content.includes('🎙') || post.voiceDuration;
                const isVideo = !!post.videoUrl;
                
                return (
                  <div 
                    key={post.id}
                    onClick={() => setSelectedGridPost(post)}
                    className="w-40 sm:w-48 shrink-0 rounded-2xl overflow-hidden relative border border-violet-500/25 snap-start shadow-md hover:border-violet-500/60 hover:scale-[1.02] transition-all cursor-pointer aspect-video bg-zinc-950 flex flex-col justify-between"
                  >
                    {/* Media Thumbnail */}
                    {post.image ? (
                      <img src={post.image} className="absolute inset-0 w-full h-full object-cover" />
                    ) : isVideo ? (
                      <div className="absolute inset-0 w-full h-full bg-black">
                        <video src={post.videoUrl} className="w-full h-full object-cover opacity-80" preload="metadata" muted />
                        <div className="absolute top-2 right-2 p-1 bg-black/60 rounded-full z-10">
                          <Film className="w-3 h-3 text-white" />
                        </div>
                      </div>
                    ) : isVoice ? (
                      <div className="absolute inset-0 bg-gradient-to-tr from-violet-950 via-purple-900 to-[#120835] flex flex-col justify-between p-2">
                        <div className="flex justify-between items-center w-full">
                          <Mic className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                          <span className="text-[8px] font-mono text-pink-400/85">VOICE TRANS</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex gap-0.5 items-end justify-center h-4 my-1 opacity-70">
                            <span className="w-0.5 bg-pink-400 h-2 animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <span className="w-0.5 bg-violet-400 h-3 animate-bounce" style={{ animationDelay: '0.3s' }} />
                            <span className="w-0.5 bg-pink-400 h-4 animate-bounce" style={{ animationDelay: '0s' }} />
                            <span className="w-0.5 bg-violet-400 h-2 animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                          <p className="text-[9px] text-center text-white/90 font-sans line-clamp-1 italic">
                            {post.voiceTranscript || post.content}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-[#1c0d4a] to-[#040212] flex items-center justify-center p-3 text-center">
                        <p className="text-[9.5px] font-sans font-medium italic text-white/90 line-clamp-3 leading-relaxed">
                          "{post.content}"
                        </p>
                      </div>
                    )}
                    
                    {/* Top Pinned Badge */}
                    <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#8B5CF6]/90 backdrop-blur-xs text-[8px] font-mono font-bold text-white uppercase rounded flex items-center gap-1 z-10 shadow-sm">
                      <Pin className="w-2 h-2 rotate-45" />
                      PINNED
                    </div>
                    
                    {/* Dark gradient fade for text if image exists */}
                    {(post.image || isVideo) && (
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-1 bg-opacity-40" />
                    )}
                    
                    {/* Info bar at the bottom */}
                    <div className="p-2 z-2 relative flex items-center justify-between w-full mt-auto bg-black/30 backdrop-blur-xs">
                      <span className="text-[9px] font-sans font-bold text-white truncate max-w-[70%]">
                        {post.name || post.username}
                      </span>
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-violet-300">
                        <span className="flex items-center gap-0.5">⚡ {post.likes || 0}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Profile Tabs List with exactly 5 categories - horizontally smooth scrolling */}
      <div id="voh-profile-tabs-selector" className="border-b border-violet-500/10 pt-4 overflow-x-auto scrollbar-none">
        <div className="flex gap-2 text-center text-[10px] sm:text-xs font-mono font-bold px-2 pb-1.5 min-w-max">
          {[
            { id: 'posts', label: 'Posts', icon: <FileText className="w-3.5 h-3.5" />, color: 'text-violet-400' },
            { id: 'videos', label: 'Videos', icon: <Video className="w-3.5 h-3.5" />, color: 'text-pink-500' },
            { id: 'reels', label: 'Reels', icon: <Film className="w-3.5 h-3.5" />, color: 'text-rose-500' },
            { id: 'media', label: 'Photos', icon: <Camera className="w-3.5 h-3.5" />, color: 'text-amber-500' },
            { id: 'voice', label: 'Voice', icon: <Mic className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
            { id: 'saved', label: 'Saved', icon: <Lock className="w-3.5 h-3.5" />, color: 'text-violet-400' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setProfileTab(tab.id as any)}
              className={`pb-2 px-3 relative flex items-center gap-1.5 cursor-pointer uppercase tracking-wider transition-colors ${
                profileTab === tab.id ? `${tab.color} font-extrabold` : 'text-violet-300/60 hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {profileTab === tab.id && (
                <motion.div layoutId="vohProfileTabLine" className={`absolute bottom-0 inset-x-0 h-0.5 bg-violet-500`} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Render Content */}
      <div id="voh-tab-content-render" className="space-y-4 pt-2">
        
        {/* Contributions tab */}
        {profileTab === 'posts' && (
          <MediaGrid gridPosts={myPosts} pinnedPostIds={pinnedPostIds} onSelectPost={setSelectedGridPost} />
        )}

        {profileTab === 'videos' && (
          <MediaGrid gridPosts={videoPosts} pinnedPostIds={pinnedPostIds} onSelectPost={setSelectedGridPost} />
        )}

        {profileTab === 'reels' && (
          <MediaGrid gridPosts={reelsPosts} pinnedPostIds={pinnedPostIds} onSelectPost={setSelectedGridPost} />
        )}

        {profileTab === 'disabled_posts_old' && (() => {
          const sortedMyPosts = [...myPosts].sort((a, b) => {
            const isAPinned = pinnedPostIds.includes(a.id);
            const isBPinned = pinnedPostIds.includes(b.id);
            if (isAPinned && !isBPinned) return -1;
            if (!isAPinned && isBPinned) return 1;
            return 0;
          });
          return (
            <div className="grid grid-cols-1 gap-4">
              {sortedMyPosts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-violet-500/20 bg-[#070513]/50">
                  <p className="text-xs font-mono text-violet-400/50">
                    No posts found in this profile.
                  </p>
                </div>
              ) : (
                sortedMyPosts.map(post => {
                  const isPinned = pinnedPostIds.includes(post.id);
                  return (
                    <div 
                      key={post.id} 
                      className={`p-5 rounded-3xl bg-[#0b091c]/80 border transition-all flex flex-col justify-between ${
                        isPinned 
                          ? 'border-violet-500/45 shadow-lg shadow-violet-500/5 bg-[#120a2e]/90 ring-1 ring-violet-500/20' 
                          : 'border-violet-500/10 hover:border-violet-500/25'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-sans font-bold text-white">{post.name}</span>
                            {(post.username === 'voh' || post.username === 'nexora_ai') && <PurpleVerifiedBadge className="w-3.5 h-3.5" />}
                            <span className="text-[10px] font-mono text-violet-400">@{post.username}</span>
                            
                            {isPinned && (
                              <span className="flex items-center gap-0.5 bg-violet-600 text-white font-mono text-[8.5px] px-1.5 py-0.5 rounded-md tracking-wider">
                                <Pin className="w-2.5 h-2.5 fill-current transform rotate-45" />
                                <span>PINNED</span>
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-violet-400">
                              <RelativeTimestamp timestamp={post.timestamp} />
                            </span>
                            {/* Toggle Pinned Status Button */}
                            {isOwnProfile && (
                              <button
                                onClick={() => togglePinPost(post.id)}
                                className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                  isPinned 
                                    ? 'bg-violet-600/20 text-violet-300 hover:bg-violet-600/30' 
                                    : 'hover:bg-violet-500/10 text-violet-400/40 hover:text-violet-200'
                                }`}
                                title={isPinned ? "Unpin post" : "Pin post to profile"}
                              >
                                <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current transform rotate-45 text-violet-400' : ''}`} />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-violet-100 font-sans leading-relaxed mb-3">
                          {post.content}
                        </p>

                        {post.image && (
                          <img 
                            src={post.image} 
                            alt="Thumbnail attachment" 
                            referrerPolicy="no-referrer"
                            className="w-full max-h-[220px] object-cover rounded-xl border border-violet-500/10 mb-3" 
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-4 pt-3 border-t border-violet-500/5 text-[10px] text-violet-300">
                        <button 
                          onClick={() => onLikePost(post.id)}
                          className="flex items-center gap-1 hover:text-rose-400 transition-colors"
                        >
                          <Heart className="w-3.5 h-3.5 text-rose-500/60" />
                          <span>{post.likes}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-violet-500/60" />
                          <span>{post.comments?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          );
        })()}

        {/* Media Tab */}
        {profileTab === 'media' && (
          <MediaGrid gridPosts={mediaPosts} pinnedPostIds={pinnedPostIds} onSelectPost={setSelectedGridPost} />
        )}
        {profileTab === 'disabled_media_old' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mediaPosts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border border-dashed border-violet-500/20 bg-[#070513]/50 col-span-2">
                <p className="text-xs font-mono text-violet-400/50">
                  No media posts found in this profile.
                </p>
              </div>
            ) : (
              mediaPosts.map(post => (
                <div 
                  key={post.id} 
                  className="p-4 rounded-3xl bg-[#090718] border border-violet-500/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="overflow-hidden rounded-xl border border-violet-500/10 mb-3 relative aspect-video bg-black/40">
                      <img 
                        src={post.image} 
                        alt="Media upload" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    </div>
                    <p className="text-xs text-violet-100 font-sans leading-relaxed line-clamp-2 mb-2">
                      {post.content}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-violet-500/5 text-[9px] font-mono text-violet-300">
                    <span><RelativeTimestamp timestamp={post.timestamp} /></span>
                    <span className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" /> {post.likes} likes
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Voice Tab */}
        {profileTab === 'voice' && (
          <div className="space-y-4">
            {voicePosts.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-[9.5px] font-mono uppercase tracking-widest text-[#8B5CF6] font-extrabold block text-left">
                  🎙️ Voice gallery snaps
                </span>
                <MediaGrid gridPosts={voicePosts} pinnedPostIds={pinnedPostIds} onSelectPost={setSelectedGridPost} />
              </div>
            )}

            <div className="p-4 rounded-2xl bg-[#090718] border border-violet-500/20">
              <div className="flex items-center gap-2 mb-2 text-violet-300">
                <Volume2 className="w-4 h-4 text-violet-400 animate-bounce" />
                <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold">Voice Posts</span>
              </div>
              <p className="text-xs text-violet-100/75 font-sans leading-relaxed">
                Listen to voice posts shared on this profile.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {voiceTransmissions.map(voice => {
                const isPlaying = currentPlayingVoice === voice.id;
                return (
                  <div 
                    key={voice.id} 
                    className={`p-4 rounded-2xl border transition-all duration-300 ${
                      isPlaying 
                        ? 'bg-violet-950/40 border-violet-500/50 shadow-lg shadow-violet-500/10' 
                        : 'bg-[#0b091c]/70 border-violet-500/10 hover:border-violet-500/25'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => toggleVoicePlay(voice.id)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 ${
                          isPlaying ? 'bg-linear-to-r from-violet-600 to-pink-500 text-white' : 'bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-1" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-white truncate font-sans">{voice.title}</h4>
                          <span className="text-[9px] font-mono text-violet-400 whitespace-nowrap">{voice.duration}</span>
                        </div>
                        <p className="text-[11px] text-violet-200/80 mt-1 lines-clamp-2 leading-relaxed">
                          {voice.description}
                        </p>
                        
                        {/* Animated waveform visual feedback */}
                        {isPlaying && (
                          <div className="flex items-center gap-0.5 h-6 mt-3">
                            {[...Array(24)].map((_, i) => (
                              <div 
                                key={i} 
                                className="w-[3px] bg-linear-to-t from-violet-500 to-pink-400 rounded-full"
                                style={{
                                  height: `${15 + Math.sin(i * 0.8) * 45 + Math.random() * 30}%`,
                                  animation: 'pulse 1s ease-in-out infinite',
                                  animationDelay: `${i * 0.05}s`
                                }}
                              />
                            ))}
                          </div>
                        )}

                        <div className="text-[9px] font-mono text-violet-400 mt-2">
                          {voice.published}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Saved posts content tab - upgraded with Collection folders */}
        {profileTab === 'saved' && (
          <div className="space-y-4">
            <MediaGrid gridPosts={savedPosts} pinnedPostIds={pinnedPostIds} onSelectPost={setSelectedGridPost} />
          </div>
        )}
        {profileTab === 'disabled_saved_old' && (
          <div className="space-y-6 text-left">
            {!isOwnProfile ? (
              <div className="p-12 text-center rounded-3xl border border-violet-500/15 bg-black/40 backdrop-blur-md max-w-sm mx-auto space-y-3 shadow-xl my-4">
                <div className="w-11 h-11 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
                  <Lock className="w-4.5 h-4.5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-sans font-black text-white">Private Repository Node</h4>
                  <p className="text-[10.5px] text-violet-300/50 leading-relaxed font-sans">
                    Saved content collection is secured and private to @{currentUser.username}.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-[#8B5CF6] tracking-wider font-extrabold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-pink-500" />
                    Private Saved Library Collections
                  </span>
                  <span className="text-[9px] font-mono text-violet-400/50">Organized folders</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {/* Folder 1 */}
                  <div className="p-4 rounded-3xl bg-linear-to-b from-[#110931] to-[#04010b] border border-violet-500/15 hover:border-violet-500/30 transition-all cursor-pointer group flex flex-col justify-between h-40 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-purple-600/10 rounded-full blur-xl group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-2xl select-none leading-none">🌌</span>
                      <h4 className="text-xs font-black text-white font-sans mt-2.5 leading-tight">Aesthetics & Atmosphere</h4>
                      <p className="text-[9.5px] text-violet-300/40 font-sans mt-1">Sleek twilight & retro interfaces</p>
                    </div>
                    <span className="text-[9px] font-mono text-violet-400/60 font-bold block mt-3">14 Items saved</span>
                  </div>

                  {/* Folder 2 */}
                  <div className="p-4 rounded-3xl bg-linear-to-b from-[#110931] to-[#04010b] border border-violet-500/15 hover:border-violet-500/30 transition-all cursor-pointer group flex flex-col justify-between h-40 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-cyan-600/10 rounded-full blur-xl group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-2xl select-none leading-none">💻</span>
                      <h4 className="text-xs font-black text-white font-sans mt-2.5 leading-tight">Tech & Performance</h4>
                      <p className="text-[9.5px] text-violet-300/40 font-sans mt-1">Rust logic & socket benchmark formulas</p>
                    </div>
                    <span className="text-[9px] font-mono text-violet-400/60 font-bold block mt-3">8 Items saved</span>
                  </div>

                  {/* Folder 3 */}
                  <div className="p-4 rounded-3xl bg-linear-to-b from-[#110931] to-[#04010b] border border-violet-500/15 hover:border-violet-500/30 transition-all cursor-pointer group flex flex-col justify-between h-40 relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-24 h-24 bg-pink-600/10 rounded-full blur-xl group-hover:scale-110 transition-transform" />
                    <div>
                      <span className="text-2xl select-none leading-none">🎙️</span>
                      <h4 className="text-xs font-black text-white font-sans mt-2.5 leading-tight">Vaporwave Broadcasts</h4>
                      <p className="text-[9.5px] text-violet-300/40 font-sans mt-1">Keynotes and spatial soundscapes</p>
                    </div>
                    <span className="text-[9px] font-mono text-violet-400/60 font-bold block mt-3">4 Items saved</span>
                  </div>
                </div>

                {/* Flat saved stream feed as fallback */}
                <div className="pt-4 border-t border-violet-500/5 space-y-4">
                  <span className="text-[9.5px] font-mono font-bold text-violet-400/50 uppercase">Recent Bookmarks</span>
                  {savedPosts.map(post => (
                    <div 
                      key={post.id} 
                      className="p-5 rounded-3xl bg-[#0b091c]/80 border border-violet-500/10 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-sans font-bold text-white">{post.name}</span>
                            <PurpleVerifiedBadge className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-mono text-violet-400 font-normal">@{post.username}</span>
                          </div>
                          <span className="text-[9px] font-mono text-violet-400"><RelativeTimestamp timestamp={post.timestamp} /></span>
                        </div>
                        
                        <p className="text-xs text-violet-100 font-sans leading-relaxed mb-3">
                          {post.content}
                        </p>

                        {post.image && (
                          <img 
                            src={post.image} 
                            alt="Thumbnail attachment" 
                            className="w-full max-h-[220px] object-cover rounded-xl border border-violet-500/10 mb-3" 
                            referrerPolicy="no-referrer"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-4 pt-3 border-t border-violet-500/5 text-[10px] text-violet-300">
                        <button 
                          onClick={() => onLikePost(post.id)}
                          className="flex items-center gap-1 hover:text-rose-400 transition-colors"
                        >
                          <Heart className="w-3.5 h-3.5 text-rose-500/60" />
                          <span>{post.likes}</span>
                        </button>
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-violet-500/60" />
                          <span>{post.comments.length}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 🎥 NEW: Videos Tab representation */}
        {profileTab === 'reels' && (
          <div className="space-y-4 text-left font-sans">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-[#8B5CF6] tracking-wider font-extrabold flex items-center gap-1">
                🎥 Profile Videos
              </span>
              <span className="text-[9px] font-mono text-violet-400/50">Video post feed</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              
              {/* Loop card 1 */}
              <div className="rounded-3xl border border-violet-500/10 bg-slate-950/20 shadow-lg aspect-[9/16] relative overflow-hidden group">
                <video src="https://assets.mixkit.co/videos/preview/mixkit-cyberpunk-neon-city-street-at-night-41551-large.mp4" className="absolute inset-0 w-full h-full object-cover opacity-80" muted loop playsInline />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3.5 flex flex-col justify-between">
                  <span className="text-[8px] font-mono bg-[#8B5CF6] text-white py-0.5 px-2 rounded-md self-start font-black uppercase">Active Video</span>
                  <div>
                    <p className="text-[10px] text-white font-sans line-clamp-2 leading-snug">Finally wrapped up our new mobile app design! Love the spacing and color system. #uidesign</p>
                    <span className="text-[9px] font-mono text-yellow-400 block mt-1.5 font-bold">⚡ 12.4K Sparks</span>
                  </div>
                </div>
              </div>

              {/* Loop card 2 */}
              <div className="rounded-3xl border border-violet-500/10 bg-slate-950/10 shadow-lg aspect-[9/16] relative overflow-hidden group">
                <video src="https://assets.mixkit.co/videos/preview/mixkit-holding-smartphone-at-night-with-city-lights-41553-large.mp4" className="absolute inset-0 w-full h-full object-cover opacity-80" muted loop playsInline />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 p-3.5 flex flex-col justify-between">
                  <span className="text-[8px] font-mono bg-cyan-600 text-white py-0.5 px-2 rounded-md self-start font-black">1.2K views</span>
                  <div>
                    <p className="text-[10px] text-white font-sans line-clamp-2 leading-snug">Spent all evening testing the new UI animations. Everything feels super butter smooth! #webdev</p>
                    <span className="text-[9px] font-mono text-yellow-400 block mt-1.5 font-semibold">⚡ 8.5K Sparks</span>
                  </div>
                </div>
              </div>

              {/* Placeholder bento */}
              <div className="rounded-3xl border border-dashed border-violet-500/15 bg-slate-950/20 aspect-[9/16] p-4 flex flex-col justify-between text-center">
                <div className="my-auto space-y-1.5">
                  <span className="text-xl select-none block">📹</span>
                  <span className="text-[9.5px] font-mono font-bold text-violet-400/60 uppercase block">Record New Video</span>
                  <p className="text-[8.5px] text-violet-400/30 leading-normal">Record a short video update for your followers.</p>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 🏷️ NEW: Tagged Posts Tab content */}
        {profileTab === 'tagged' && (
          <div className="space-y-4 text-left">
            <span className="text-[10px] font-mono uppercase text-[#8B5CF6] tracking-wider font-extrabold block">
              🏷️ Tagged Posts ({isOwnProfile ? '2' : '0'})
            </span>

            {isOwnProfile ? (
              <div className="grid grid-cols-1 gap-4.5 font-sans">
                {/* Tagged post 1 */}
                <div className="p-4 rounded-3xl bg-[#0c0a25]/65 border border-violet-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80" className="w-6.5 h-6.5 rounded-lg object-cover" />
                      <div>
                        <span className="text-[11px] font-sans font-black text-white block leading-none">Nexora AI</span>
                        <span className="text-[9px] font-mono text-violet-400">@nexora_ai</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-violet-400">1 day ago</span>
                  </div>
                  <p className="text-xs text-violet-100 font-sans leading-relaxed">
                    Collaborating with <span className="text-[#8B5CF6] font-bold">@{currentUser.username}</span> on glassmorphic backglow gradients. The reduction in border width yields premium visual rhythm! check out the design hub.
                  </p>
                </div>

                {/* Tagged post 2 */}
                <div className="p-4 rounded-3xl bg-[#0c0a25]/65 border border-violet-500/10">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=150&auto=format&fit=crop&q=80" className="w-6.5 h-6.5 rounded-lg object-cover" />
                      <div>
                        <span className="text-[11px] font-sans font-black text-white block leading-none">VOH AI</span>
                        <span className="text-[9px] font-mono text-violet-400">@voh_ai</span>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-violet-400">4 days ago</span>
                  </div>
                  <p className="text-xs text-violet-100 font-sans leading-relaxed">
                    Superb package validation pass with <span className="text-[#8B5CF6] font-bold">@{currentUser.username}</span>! Compiling synchronous data filters achieved under ultra-fast speeds! Absolute beast.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 rounded-2xl border border-dashed border-violet-500/10 text-violet-400/40 font-mono text-[10px]">
                No tagged peer anchors found in this profile.
              </div>
            )}
          </div>
        )}

        {/* 📊 NEW: Creator Analytics Insights tab */}
        {profileTab === 'analytics' && (
          <div className="space-y-5 text-left select-none">
            <div className="flex justify-between items-center bg-[#130d24]/50 p-4 rounded-2xl border border-violet-500/15">
              <div className="space-y-0.5">
                <span className="text-[9px] font-mono uppercase tracking-widest text-yellow-400 font-black">Internal metrics dashboards</span>
                <h3 className="text-xs font-sans font-black text-white uppercase tracking-wider">
                  Intellectual Creator Insights Index 📊
                </h3>
              </div>
              <Activity className="w-4.5 h-4.5 text-yellow-400 animate-pulse" />
            </div>

            {/* Metric KPI grids */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
              
              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Net Post views</span>
                <p className="text-base font-sans font-black text-white mt-1 leading-none">142.84K</p>
                <span className="text-[8.5px] font-mono text-emerald-400 mt-1 block">📈 +12.4% this week</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Loop Video plays</span>
                <p className="text-base font-sans font-black text-white mt-1 leading-none">89.41K</p>
                <span className="text-[8.5px] font-mono text-emerald-400 mt-1 block">📈 +24.1% this week</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Engagements Rate</span>
                <p className="text-base font-sans font-black text-[#8B5CF6] mt-1 leading-none">7.85%</p>
                <span className="text-[8.5px] font-mono text-[#8B5CF6]/65 mt-1 block">⭐ Exceptional index</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Total Spark tips</span>
                <p className="text-base font-sans font-black text-yellow-400 mt-1 leading-none">12.41K</p>
                <span className="text-[8.5px] font-mono text-yellow-500 mt-1 block">⚡ active sparks</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Profile Visits</span>
                <p className="text-base font-sans font-black text-cyan-400 mt-1 leading-none">420</p>
                <span className="text-[8.5px] font-mono text-cyan-500 mt-1 block">👤 +24 today</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0a071d] border border-violet-500/10 text-left">
                <span className="text-[8.5px] font-mono text-violet-400 uppercase font-black">Audience growth</span>
                <p className="text-base font-sans font-black text-pink-400 mt-1 leading-none">+194</p>
                <span className="text-[8.5px] font-mono text-purple-400 mt-1 block">👥 Net Follow gains</span>
              </div>

            </div>

            {/* GROWTH METRIC VISUAL CUSTOM CHART */}
            <div className="p-4 rounded-2xl bg-[#0a071d] border border-violet-500/10 mt-2 space-y-3.5">
              <div className="flex justify-between items-center sm:items-start flex-col sm:flex-row gap-1 border-b border-violet-500/5 pb-2">
                <div>
                  <span className="text-[9px] font-mono text-violet-400 uppercase font-bold block">Audience Metric Growth</span>
                  <h4 className="text-xs font-sans font-black text-white mt-0.5">Follower Increase Over the Last 6 Days</h4>
                </div>
                <span className="text-[9px] font-mono text-yellow-400 uppercase font-black bg-yellow-400/10 px-2 py-0.5 rounded leading-none">
                  Stable scaling
                </span>
              </div>

              <div className="flex items-end justify-between gap-2.5 pt-2.5 h-36">
                
                {/* Bar 1 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-violet-600/30 border border-violet-500/15 group-hover:bg-violet-600/60 transition-colors h-8 flex items-center justify-center text-[9px] font-bold text-white">
                    +12
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400/60 block">Day 1</span>
                </div>

                {/* Bar 2 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-violet-600/35 border border-violet-500/20 group-hover:bg-violet-600/65 transition-colors h-14 flex items-center justify-center text-[9px] font-bold text-white">
                    +18
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400/60 block">Day 2</span>
                </div>

                {/* Bar 3 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-violet-600/40 border border-violet-500/25 group-hover:bg-violet-600/70 transition-colors h-20 flex items-center justify-center text-[9px] font-bold text-white">
                    +24
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400/60 block">Day 3</span>
                </div>

                {/* Bar 4 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-[#8B5CF6]/55 border border-[#8B5CF6]/40 group-hover:bg-[#8B5CF6]/80 transition-colors h-24 flex items-center justify-center text-[9px] font-bold text-white">
                    +30
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400/60 block">Day 4</span>
                </div>

                {/* Bar 5 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-pink-600/60 border border-pink-500/40 group-hover:bg-pink-600/80 transition-colors h-28 flex items-center justify-center text-[9px] font-bold text-white">
                    +42
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400/6 block">Day 5</span>
                </div>

                {/* Bar 6 */}
                <div className="flex-1 flex flex-col items-center gap-2 group cursor-pointer">
                  <div className="w-full relative rounded-t-lg bg-linear-to-t from-pink-500 to-yellow-400 border border-yellow-500/50 h-32 flex items-center justify-center text-[9px] font-mono font-black text-white">
                    +64
                  </div>
                  <span className="text-[8.5px] font-mono text-violet-400 block font-bold">Today</span>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Communities Tab */}
        {profileTab === 'communities' && (
          <div className="grid grid-cols-1 gap-3.5">
            {communitiesData.map(com => (
              <div 
                key={com.id} 
                className="p-4 rounded-2xl bg-[#09071c] border border-violet-500/10 hover:border-violet-500/25 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white font-sans">{com.name}</h4>
                    <span className="text-[9px] font-mono text-cyan-400">📍 {com.location}</span>
                  </div>
                  <p className="text-[11px] text-violet-200/70">{com.description}</p>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-violet-500/5">
                  <span className="text-[10px] font-mono text-violet-400 font-bold">{com.members}</span>
                  <button className="text-[9px] font-mono font-black border border-violet-500/30 hover:border-violet-500/50 bg-violet-500/5 text-violet-300 px-2.5 py-1.5 rounded-lg transition-colors uppercase">
                    Launch Room
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}


      </div>

    </motion.div>
  )}
</AnimatePresence>

      {/* Dynamic Connections Modal (Alliances & Followers list) */}
      <AnimatePresence>
        {isConnectionsModalOpen && (
          <div className="fixed inset-0 bg-[#06040f]/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#09071b] border border-violet-500/20 rounded-3xl p-5 overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(139,92,246,0.4)]"
            >
              {/* Top Accent line */}
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-violet-500 via-pink-500 to-cyan-400" />

              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-violet-500/10">
                <div>
                  <span className="text-[9px] font-mono font-bold tracking-widest text-[#8B5CF6] uppercase">
                    Network Connections
                  </span>
                  <h3 className="text-base font-black text-white tracking-tight flex items-center gap-1.5 font-sans mt-0.5 animate-fade-in">
                    {connectionsModalTab === 'followers' ? '👥 Followers List' : '⚡ Connected Friends'}
                    <span className="text-xs text-[#8B5CF6]/85 font-mono font-normal">
                      ({connectionsModalTab === 'followers' ? formatNumber(currentUser.followers) : formatNumber(currentUser.following)} Users)
                    </span>
                  </h3>
                </div>
                <button
                  onClick={() => setIsConnectionsModalOpen(false)}
                  className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-violet-300 hover:text-white hover:border-[#8B5CF6]/30 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="grid grid-cols-2 gap-1.5 mt-3.5 bg-[#050410] p-1 rounded-xl border border-violet-500/5">
                <button
                  onClick={() => {
                    setConnectionsModalTab('followers');
                    setConnectionSearchQuery('');
                  }}
                  className={`py-2 text-[10px] font-mono tracking-wider font-extrabold rounded-lg uppercase transition-all cursor-pointer ${connectionsModalTab === 'followers' ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-violet-300/50 hover:text-violet-200'}`}
                >
                  Followers ({formatNumber(currentUser.followers)})
                </button>
                <button
                  onClick={() => {
                    setConnectionsModalTab('following');
                    setConnectionSearchQuery('');
                  }}
                  className={`py-2 text-[10px] font-mono tracking-wider font-extrabold rounded-lg uppercase transition-all cursor-pointer ${connectionsModalTab === 'following' ? 'bg-[#8B5CF6] text-white shadow-md' : 'text-violet-300/50 hover:text-violet-200'}`}
                >
                  Following ({formatNumber(currentUser.following)})
                </button>
              </div>

              {/* Connection Search Bar */}
              <div className="relative mt-3 group">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-violet-500 group-hover:text-violet-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Search connections list by name or username..."
                  value={connectionSearchQuery}
                  onChange={(e) => setConnectionSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-purple-950/20 border border-purple-500/10 hover:border-purple-500/25 focus:border-[#8B5CF6] rounded-xl font-mono text-white text-xs placeholder-purple-300/30 focus:outline-hidden focus:ring-1 focus:ring-[#8B5CF6]/15 transition-all"
                />
                {connectionSearchQuery && (
                  <button
                    onClick={() => setConnectionSearchQuery('')}
                    className="absolute right-3 top-2.5 text-[9px] font-mono font-bold text-violet-400 hover:text-white cursor-pointer"
                  >
                    CLEAR
                  </button>
                )}
              </div>

              {/* Connections list dynamic scroll container */}
              <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-2 max-h-[48vh] custom-scrollbar scroll-smooth">
                {filteredConnections.length > 0 ? (
                  filteredConnections.map((user, idx) => (
                    <div
                      key={user.id || idx}
                      className="p-3 rounded-2xl bg-white/[0.01] hover:bg-violet-950/25 border border-white/5 hover:border-violet-500/25 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative overflow-hidden group"
                    >
                      {/* Left Block info */}
                      <div className="flex items-start gap-2.5 min-w-0">
                        <img
                          src={user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'}
                          alt={user.name}
                          className="w-9 h-9 rounded-full object-cover border border-violet-500/10 ring-2 ring-violet-500/5 group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-black text-white leading-tight truncate">{user.name}</span>
                            {user.isVerified && <PurpleVerifiedBadge />}
                          </div>
                          <span className="text-[10px] text-violet-400 font-mono">@{user.username}</span>
                          <p className="text-[10.5px] text-violet-200/60 leading-tight mt-1 truncate max-w-[240px] sm:max-w-[280px]">
                            {user.bio}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {user.location && (
                              <span className="text-[9px] font-mono text-violet-300/40 flex items-center gap-0.5">
                                📍 {user.location}
                              </span>
                            )}
                            <span className="text-[9px] font-mono text-purple-400/50">
                              ⭐ {formatNumber(user.reputationPoints)} rep
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Action panel */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setIsConnectionsModalOpen(false);
                            if (onViewProfile) onViewProfile(user.id);
                          }}
                          className="px-3 py-1.5 text-[10px] font-mono font-black text-white bg-violet-600 hover:bg-violet-700 rounded-lg active:scale-95 transition-all cursor-pointer"
                        >
                          PROFILE
                        </button>
                        {onStartChat && (
                          <button
                            onClick={() => {
                              setIsConnectionsModalOpen(false);
                              onStartChat(user.id);
                            }}
                            className="p-1.5 rounded-lg border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/20 hover:border-violet-500/40 text-violet-300 transition-all cursor-pointer"
                            title="Open Message Bridge"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 px-4 border border-dashed border-violet-500/10 rounded-2xl bg-white/[0.01]">
                    <span className="text-2xl select-none">👥</span>
                    {connectionSearchQuery ? (
                      <>
                        <p className="text-xs font-mono font-bold text-violet-300 mt-2">No connections match your search query.</p>
                        <p className="text-[10px] text-violet-300/40 mt-1">Refine parameters or check your spelling.</p>
                      </>
                    ) : connectionsModalTab === 'followers' ? (
                      <>
                        <p className="text-xs font-sans font-bold text-violet-300 mt-2">You're just getting started.</p>
                        <p className="text-[10px] text-violet-300/60 mt-1 leading-relaxed max-w-xs mx-auto">Follow other creators, share high-value insights, and build your social authority to grow your network.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-sans font-bold text-violet-300 mt-2">No connections yet.</p>
                        <p className="text-[10px] text-violet-300/60 mt-1 leading-relaxed max-w-xs mx-auto">Start connecting by following active creators or explorers in the community.</p>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom footer credit indicator */}
              <div className="border-t border-violet-500/10 pt-3 mt-4 text-center">
                <p className="text-[9px] font-mono text-violet-300/30">
                  SECURE CRYPTOGRAPHIC SOCIAL CONNECTIONS FOR NEXORA EXPERIMENTAL PROTOCOLS
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Story Slideshow Overlay Deck */}
      <AnimatePresence>
        {selectedMoment && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#010006]/95 backdrop-blur-xl p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#060413] border border-violet-500/20 rounded-3xl p-6 relative flex flex-col justify-between min-h-[460px] shadow-[0_0_60px_rgba(139,92,246,0.3)]"
            >
              {/* Top Bar: Progress trackers and meta */}
              <div className="space-y-4">
                {/* Tick index bars */}
                <div className="flex gap-1.5 w-full">
                  {selectedMoment.quotes.map((_: any, idx: number) => (
                    <div key={idx} className="flex-1 h-1 bg-zinc-800 rounded-full relative overflow-hidden">
                      {idx < storyIndex && (
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-pink-500" />
                      )}
                      {idx === storyIndex && (
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 5, ease: 'linear' }}
                          onAnimationComplete={() => {
                            if (storyIndex < selectedMoment.quotes.length - 1) {
                              setStoryIndex(idx => idx + 1);
                            } else {
                              setSelectedMoment(null);
                              setStoryIndex(0);
                            }
                          }}
                          className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-violet-500 to-pink-500"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* Meta bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={selectedMoment.avatar} className="w-9 h-9 rounded-xl object-cover ring-2 ring-violet-500/30" />
                    <div className="text-left">
                      <h4 className="text-xs font-sans font-black text-white">{selectedMoment.name}</h4>
                      <span className="text-[9px] font-mono text-purple-400">@{selectedMoment.username} • Story Moment</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedMoment(null);
                      setStoryIndex(0);
                    }}
                    className="p-1.5 px-3 bg-white/5 hover:bg-white/10 rounded-lg text-violet-400 hover:text-white transition-all text-[10px] font-mono cursor-pointer"
                  >
                    CLOSE [ESC]
                  </button>
                </div>
              </div>

              {/* Quote Content text centered beautifully with elegant display typography */}
              <div className="my-8 py-8 px-4 text-center select-text">
                <p className="text-lg sm:text-xl font-sans font-black text-white leading-normal tracking-tight bg-gradient-to-r from-white via-violet-100 to-pink-100 bg-clip-text text-transparent">
                  "{selectedMoment.quotes[storyIndex]}"
                </p>
              </div>

              {/* Actions footer */}
              <div className="flex items-center justify-between border-t border-violet-500/10 pt-4">
                <button
                  onClick={() => {
                    if (storyIndex > 0) {
                      setStoryIndex(storyIndex - 1);
                    }
                  }}
                  disabled={storyIndex === 0}
                  className="px-3.5 py-1.5 text-[10px] font-mono font-bold bg-zinc-900 border border-zinc-800 disabled:opacity-20 text-zinc-400 hover:text-white rounded-lg transition-all"
                >
                  ← PREV
                </button>
                <span className="text-[9.5px] font-mono text-zinc-500">
                  Slide {storyIndex + 1} of {selectedMoment.quotes.length}
                </span>
                <button
                  onClick={() => {
                    if (storyIndex < selectedMoment.quotes.length - 1) {
                      setStoryIndex(storyIndex + 1);
                    } else {
                      setSelectedMoment(null);
                      setStoryIndex(0);
                    }
                  }}
                  className="px-4 py-1.5 text-[10px] font-mono font-bold bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all"
                >
                  {storyIndex === selectedMoment.quotes.length - 1 ? 'FINISH' : 'NEXT →'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Immersive Post Detail Modal (Instagram/TikTok style layout) */}
      <AnimatePresence>
        {selectedGridPost && (() => {
          const activePost = posts.find((p: any) => p.id === selectedGridPost.id) || selectedGridPost;
          const isVoice = activePost.isVoice || activePost.content.includes('🎙') || activePost.voiceDuration;
          const isVideo = !!activePost.videoUrl;
          const isPinned = pinnedPostIds.includes(activePost.id);
          const isPostLiked = activePost.isLikedByUser;

          return (
            <div className="fixed inset-0 bg-[#04020a]/95 backdrop-blur-lg z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in font-sans">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 30 }}
                className="relative w-full max-w-4xl bg-[#09071c] border border-violet-500/25 rounded-3xl overflow-hidden flex flex-col md:flex-row h-[90vh] md:h-[75vh] shadow-[0_0_60px_rgba(139,92,246,0.35)]"
              >
                {/* Visual Media Side (Left/Top) */}
                <div className="w-full md:w-3/5 bg-black/90 flex items-center justify-center relative border-b md:border-b-0 md:border-r border-violet-500/10 h-1/2 md:h-full">
                  {activePost.image ? (
                    <img 
                      src={activePost.image} 
                      className="w-full h-full object-contain" 
                      alt={activePost.content}
                      referrerPolicy="no-referrer"
                    />
                  ) : isVideo ? (
                    <video 
                      src={activePost.videoUrl} 
                      className="w-full h-full object-contain" 
                      controls 
                      autoPlay 
                      loop 
                      preload="auto"
                    />
                  ) : isVoice ? (
                    <div className="w-full h-full bg-gradient-to-br from-[#120a2e] to-[#04010b] flex flex-col items-center justify-center p-6 space-y-6">
                      <div className="w-16 h-16 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
                        <Mic className="w-8 h-8" />
                      </div>
                      
                      {/* Live Waveform motion */}
                      <div className="flex gap-1.5 items-end justify-center h-16 max-w-xs">
                        <span className="w-1 bg-[#8B5CF6] h-12 rounded-full animate-bounce" style={{ animationDuration: '0.9s' }} />
                        <span className="w-1 bg-pink-500 h-16 rounded-full animate-bounce" style={{ animationDelay: '0.1s', animationDuration: '1.2s' }} />
                        <span className="w-1 bg-cyan-400 h-8 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '0.8s' }} />
                        <span className="w-1 bg-[#8B5CF6] h-14 rounded-full animate-bounce" style={{ animationDelay: '0.15s', animationDuration: '1.1s' }} />
                        <span className="w-1 bg-pink-500 h-10 rounded-full animate-bounce" style={{ animationDelay: '0.05s', animationDuration: '0.95s' }} />
                      </div>

                      <div className="text-center">
                        <span className="text-[10px] font-mono text-pink-400 uppercase font-black px-2 py-0.5 bg-pink-500/10 rounded border border-pink-500/15">Acoustic Audio</span>
                        <span className="text-xs text-zinc-400 font-mono block mt-2">Duration: {activePost.voiceDuration || '0:15'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-violet-950 via-[#100730] to-zinc-950 p-8 flex flex-col justify-between">
                      <span className="text-4xl text-violet-400/20 font-serif">“</span>
                      <p className="text-sm md:text-base font-sans font-medium italic text-zinc-200 leading-relaxed text-center max-w-md mx-auto">
                        {activePost.content}
                      </p>
                      <span className="text-4xl text-violet-400/20 font-serif text-right font-extrabold">”</span>
                    </div>
                  )}

                  {/* Back glow overlay */}
                  <div className="absolute inset-0 bg-transparent pointer-events-none border border-violet-500/5" />
                </div>

                {/* Details & Comments Side (Right/Bottom) */}
                <div className="w-full md:w-2/5 flex flex-col justify-between h-1/2 md:h-full bg-[#06040f]">
                  {/* Modal Header */}
                  <div className="p-4 border-b border-violet-500/10 flex items-center justify-between bg-[#080614]">
                    <div className="flex items-center gap-2.5 text-left">
                      <img 
                        src={currentUser.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80"} 
                        className="w-9 h-9 rounded-full object-cover border border-violet-500/20" 
                        alt={currentUser.name} 
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-bold text-white font-sans block leading-none">{currentUser.name}</span>
                          {(currentUser.username === 'voh' || currentUser.username === 'nexora_ai') && (
                            <PurpleVerifiedBadge className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className="text-[10px] font-mono text-violet-400 font-bold">@{currentUser.username}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isOwnProfile && (
                        <button
                          onClick={() => togglePinPost(activePost.id)}
                          className={`p-2 rounded-xl transition-all cursor-pointer ${
                            isPinned 
                              ? 'bg-[#8B5CF6]/20 text-violet-300 ring-1 ring-violet-500/30' 
                              : 'hover:bg-violet-500/10 text-violet-400'
                          }`}
                          title={isPinned ? "Unpin post" : "Pin post (Max 3)"}
                        >
                          <Pin className={`w-3.5 h-3.5 ${isPinned ? 'rotate-45 fill-current text-[#8B5CF6]' : ''}`} />
                        </button>
                      )}
                      
                      <button
                        onClick={() => setSelectedGridPost(null)}
                        className="p-2 hover:bg-violet-500/10 text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                        title="Close details"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Center Content / Comments Container */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-left">
                    {/* Caption block */}
                    <div className="pb-3 border-b border-violet-500/5">
                      <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                        {activePost.content}
                      </p>
                      {isVoice && activePost.voiceTranscript && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-violet-600/5 border border-violet-500/15">
                          <span className="text-[8px] font-mono text-purple-400 uppercase font-black block">Voice transcript</span>
                          <span className="text-[11px] text-zinc-300 italic font-sans mt-0.5 block leading-normal">
                            "{activePost.voiceTranscript}"
                          </span>
                        </div>
                      )}
                      <span className="text-[9px] font-mono text-violet-400 mt-2 block opacity-60">
                        Synthesized on Nexora Node
                      </span>
                    </div>

                    {/* Comments list */}
                    <div className="space-y-3">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-violet-400 font-black block">
                        Discussion Forum ({activePost.comments?.length || 0})
                      </span>

                      {(!activePost.comments || activePost.comments.length === 0) ? (
                        <div className="text-center py-10">
                          <p className="text-[11px] text-zinc-500 font-mono">No feedback logs transmitted yet.</p>
                          <p className="text-[9px] text-zinc-600 mt-1">Be the first to leave a response spark!</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {activePost.comments.map((comment: any, cidx: number) => (
                            <div key={comment.id || cidx} className="p-2.5 rounded-2xl bg-zinc-950/40 border border-violet-500/5 text-left">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[10.5px] font-bold text-white block">
                                  {comment.name || comment.username}
                                </span>
                                <span className="text-[8.5px] font-mono text-zinc-500">
                                  {comment.timestamp || 'Just now'}
                                </span>
                              </div>
                              <p className="text-[11.5px] text-zinc-300 font-sans leading-relaxed">
                                {comment.content || comment.comment || comment.text}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Input / Engagement Block (Sticky Bottom) */}
                  <div className="p-4 bg-[#080614] border-t border-violet-500/10 space-y-3">
                    {/* Like and Stats Actions row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => onLikePost(activePost.id)}
                          className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-transform active:scale-95 duration-100 ${
                            isPostLiked ? 'text-red-400' : 'text-zinc-400 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-4.5 h-4.5 ${isPostLiked ? 'fill-current text-rose-500' : ''}`} />
                          <span>{activePost.likes || 0} Sparks</span>
                        </button>

                        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                          <MessageSquare className="w-4.5 h-4.5 text-violet-400" />
                          <span>{activePost.comments?.length || 0} Comments</span>
                        </div>
                      </div>

                      <span className="text-[9px] font-mono text-violet-400/40">
                        node: #{activePost.id.substring(0, 8)}
                      </span>
                    </div>

                    {/* New Comment input form */}
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={detailCommentText}
                        onChange={(e) => setDetailCommentText(e.target.value)}
                        placeholder="Type response log..."
                        className="flex-1 bg-zinc-950/80 border border-violet-500/15 focus:border-[#8B5CF6]/60 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-hidden font-sans transition-all"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && detailCommentText.trim()) {
                            onAddComment(activePost.id, detailCommentText.trim());
                            setDetailCommentText('');
                          }
                        }}
                      />
                      <button
                        disabled={!detailCommentText.trim()}
                        onClick={() => {
                          if (selectedGridPost) {
                            onAddComment(activePost.id, detailCommentText.trim());
                            setDetailCommentText('');
                          }
                        }}
                        className="bg-violet-600 hover:bg-[#8B5CF6] disabled:opacity-40 disabled:hover:bg-violet-600 text-white font-sans font-black text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <span>Transmit</span>
                      </button>
                    </div>
                  </div>

                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
