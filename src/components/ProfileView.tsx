import React, { useState, useEffect, useRef } from 'react';
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
  Image as ImageIcon,
  Mic,
  Menu,
  BarChart2,
  FolderClosed,
  QrCode,
  AlertTriangle,
  LogOut,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Coins,
  Music,
  Plus,
  Tv,
  EyeOff,
  UserX,
  VolumeX,
  CheckCircle2,
  LockKeyhole,
  Briefcase,
  Layers,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Post } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import RelativeTimestamp from './RelativeTimestamp';
import NexoraVideoPlayer from './NexoraVideoPlayer';
import NexoraVideo from './NexoraVideo';
import { 
  MOCK_CREATORS, 
  ADDITIONAL_TEST_ACCOUNTS, 
  getFollowersCount, 
  getFollowingCount, 
  getReputationPoints, 
  getSparksReceived, 
  getContributionsCount, 
  getSeededFollowers,
  getRichUser 
} from '../data/database';

interface MediaGridProps {
  gridPosts: Post[];
  pinnedPostIds: string[];
  onSelectPost: (post: Post) => void;
}

const MediaGrid = ({ gridPosts, pinnedPostIds, onSelectPost }: MediaGridProps) => {
  if (gridPosts.length === 0) {
    return (
      <div className="text-center py-16 border border-dashed border-violet-500/10 rounded-3xl bg-[#09071c]/40 font-mono text-xs text-violet-400/80 w-full col-span-3 md:col-span-4">
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
            className="aspect-square rounded-xl sm:rounded-2xl overflow-hidden relative border border-violet-500/10 hover:border-[#8B5CF6]/50 group cursor-pointer bg-[#050314]/90 flex flex-col justify-between transition-all hover:scale-[1.02]"
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
                <div className="w-full h-full bg-slate-950 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet-950/40 via-[#0a0521]/90 to-[#2c0b3d]/30" />
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-pink-500/5 to-transparent animate-pulse" />
                  <NexoraVideo 
                    src={post.videoUrl ? `${post.videoUrl}#t=0.5` : ''} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity relative z-10" 
                    preload="metadata" 
                    muted 
                    playsInline
                  />
                  <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full z-20">
                    <Film className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
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
                <span className="p-1.5 bg-[#8B5CF6]/95 backdrop-blur-md rounded-full text-white shadow-sm" title="Pinned Post">
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
  // Navigation State
  const [activePanel, setActivePanel] = useState<'profile' | 'edit-profile' | 'menu' | 'creator-studio' | 'qr-profile' | 'social-graph' | 'collections'>('profile');
  const [profileTab, setProfileTab] = useState<string>('posts');
  const [selectedGridPost, setSelectedGridPost] = useState<Post | null>(null);
  const [detailCommentText, setDetailCommentText] = useState<string>('');

  // Local storage account switcher
  const [savedAccounts, setSavedAccounts] = useState<any[]>(() => {
    const saved = localStorage.getItem('nexora_saved_accounts');
    return saved ? JSON.parse(saved) : [
      { id: 'user-0', username: 'voh', name: 'VOICE OF HARRISON', avatar: '/src/assets/images/voh_logo_avatar_1781774114050.jpg' }
    ];
  });
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccUsername, setNewAccUsername] = useState('');
  const [newAccName, setNewAccName] = useState('');

  // Reputation breakdown view
  const [showReputationModal, setShowReputationModal] = useState(false);

  // QR Customizer State
  const [qrColorPalette, setQrColorPalette] = useState<'neon-cyber' | 'solar-flare' | 'holographic'>('neon-cyber');
  const [qrScanningActive, setQrScanningActive] = useState(false);
  const [qrScanSuccessText, setQrScanSuccessText] = useState('');

  // Relationship states (Muted / Blocked lists)
  const [relationsTab, setRelationsTab] = useState<'followers' | 'following' | 'close-friends' | 'blocked' | 'muted'>('followers');
  const [searchRelationQuery, setSearchRelationQuery] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<string[]>(['toxic_spammer', 'scambot_v8']);
  const [mutedUsers, setMutedUsers] = useState<string[]>(['overposter_reels', 'ad_beacon_hq']);
  const [closeFriends, setCloseFriends] = useState<string[]>([]);

  // Edit fields live states
  const [editName, setEditName] = useState(currentUser.name);
  const [editUsername, setEditUsername] = useState(currentUser.username);
  const [editBio, setEditBio] = useState(currentUser.bio);
  const [editLocation, setEditLocation] = useState(currentUser.location || '');
  const [editWebsite, setEditWebsite] = useState(currentUser.website || '');
  const [editPronouns, setEditPronouns] = useState('');
  const [editCategory, setEditCategory] = useState('Digital Creator');
  const [editCreatorType, setEditCreatorType] = useState('Premium Node');
  const [editAvatar, setEditAvatar] = useState(currentUser.avatar);
  const [editCover, setEditCover] = useState(currentUser.coverImage);
  const [editSocialTwitter, setEditSocialTwitter] = useState('');
  const [editSocialInsta, setEditSocialInsta] = useState('');

  // Webcam capture states
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Dynamic status presets
  const [statusText, setStatusText] = useState(() => localStorage.getItem(`nexora_status_text_${currentUser.id}`) || 'Calibrating...');
  const [statusEmoji, setStatusEmoji] = useState(() => localStorage.getItem(`nexora_status_emoji_${currentUser.id}`) || '🌌');

  // Music Widget States
  const [pinnedSong, setPinnedSong] = useState(() => localStorage.getItem(`nexora_pinned_song_${currentUser.id}`) || 'Afro-Cosmology');
  const [pinnedArtist, setPinnedArtist] = useState(() => localStorage.getItem(`nexora_pinned_artist_${currentUser.id}`) || 'Davido & VOH');
  const [isSongPlaying, setIsSongPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioOscRef = useRef<OscillatorNode | null>(null);

  // Social Stats follow action toggle
  const [isFollowing, setIsFollowing] = useState(isFollowingField);
  const [profilePicExpanded, setProfilePicExpanded] = useState(false);

  // Analytics tab options
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

  // Live streaming simulation console states
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [liveDuration, setLiveDuration] = useState(0);
  const [liveViewerCount, setLiveViewerCount] = useState(0);
  const [liveChat, setLiveChat] = useState<any[]>([]);
  const [liveMessageInput, setLiveMessageInput] = useState('');

  // Sync edits when user switches
  useEffect(() => {
    setEditName(currentUser.name);
    setEditUsername(currentUser.username);
    setEditBio(currentUser.bio);
    setEditLocation(currentUser.location || '');
    setEditWebsite(currentUser.website || '');
    setEditAvatar(currentUser.avatar);
    setEditCover(currentUser.coverImage);
  }, [currentUser]);

  // Live Stream Clock Effect
  useEffect(() => {
    let interval: any;
    if (isLiveStreaming) {
      interval = setInterval(() => {
        setLiveDuration(p => p + 1);
        // Fluctuate viewer counts
        setLiveViewerCount(Math.floor(Math.random() * 20) + 120);
      }, 1000);
    } else {
      setLiveDuration(0);
      setLiveViewerCount(0);
    }
    return () => clearInterval(interval);
  }, [isLiveStreaming]);

  // Audio Showpiece Player (Synthesizer hum on play)
  const toggleMusicAudio = () => {
    if (isSongPlaying) {
      if (audioOscRef.current) {
        try {
          audioOscRef.current.stop();
        } catch(e){}
        audioOscRef.current = null;
      }
      setIsSongPlaying(false);
      window.dispatchEvent(new CustomEvent('toast', { detail: '🎵 Music playback paused.' }));
    } else {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        
        // Setup simple harmonic ambient oscillator
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(261.63, ctx.currentTime); // C4 note
        
        // Multi-frequency sound effect
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, ctx.currentTime);

        gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
        
        osc.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start();
        audioOscRef.current = osc;
        setIsSongPlaying(true);
        window.dispatchEvent(new CustomEvent('toast', { detail: `🎵 Now streaming custom profile vibe: ${pinnedSong}!` }));
      } catch (err) {
        console.error("Synthesizer failed", err);
      }
    }
  };

  // Close audio on component unmount
  useEffect(() => {
    return () => {
      if (audioOscRef.current) {
        try { audioOscRef.current.stop(); } catch(e){}
      }
    };
  }, []);

  // Web camera activation
  const startWebcam = async () => {
    setIsWebcamActive(true);
    setWebcamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setWebcamError('Unable to lock camera stream. Please grant hardware privileges.');
    }
  };

  const stopWebcam = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    mediaStreamRef.current = null;
    setIsWebcamActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setEditAvatar(dataUrl);
        stopWebcam();
        window.dispatchEvent(new CustomEvent('toast', { detail: '📸 Identity selfie captured successfully!' }));
      }
    }
  };

  // Validate and submit profile updates (Locks rules)
  const handleSaveProfile = () => {
    // 7-day display name lock
    if (editName !== currentUser.name) {
      const lastChange = currentUser.lastDisplayNameChangeTime;
      if (lastChange) {
        const diff = Date.now() - new Date(lastChange).getTime();
        const days = diff / (1000 * 30 * 60 * 24); // mock days or 7 days limit
        if (days < 7) {
          window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Display Name change is locked for 7 days.' }));
          alert('⚠️ Change locked: Display name can only be edited once every 7 days.');
          return;
        }
      }
    }

    // 30-day username lock
    if (editUsername !== currentUser.username) {
      const lastChange = currentUser.lastUsernameChangeTime;
      if (lastChange) {
        const diff = Date.now() - new Date(lastChange).getTime();
        const days = diff / (1000 * 30 * 60 * 24);
        if (days < 30) {
          window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Username change is locked for 30 days.' }));
          alert('⚠️ Change locked: @username can only be edited once every 30 days.');
          return;
        }
      }
    }

    // Save
    onUpdateProfile({
      name: editName,
      username: editUsername,
      bio: editBio,
      location: editLocation,
      website: editWebsite,
      avatar: editAvatar,
      coverImage: editCover,
      lastDisplayNameChangeTime: editName !== currentUser.name ? new Date().toISOString() : currentUser.lastDisplayNameChangeTime,
      lastUsernameChangeTime: editUsername !== currentUser.username ? new Date().toISOString() : currentUser.lastUsernameChangeTime,
    });

    localStorage.setItem(`nexora_status_text_${currentUser.id}`, statusText);
    localStorage.setItem(`nexora_status_emoji_${currentUser.id}`, statusEmoji);
    localStorage.setItem(`nexora_pinned_song_${currentUser.id}`, pinnedSong);

    setActivePanel('profile');
    window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Digital profile successfully re-calibrated!' }));
  };

  // QR Color theme options
  const getQrGradients = () => {
    switch (qrColorPalette) {
      case 'solar-flare':
        return 'from-pink-500 via-amber-400 to-rose-600';
      case 'holographic':
        return 'from-cyan-400 via-teal-300 to-emerald-500';
      case 'neon-cyber':
      default:
        return 'from-violet-600 via-purple-500 to-fuchsia-600';
    }
  };

  // QR Simulator scan action
  const simulateScan = () => {
    setQrScanningActive(true);
    setQrScanSuccessText('');
    setTimeout(() => {
      setQrScanningActive(false);
      setQrScanSuccessText(`Success! Decoded Node identity: @${currentUser.username}. Mutual network link synched.`);
      window.dispatchEvent(new CustomEvent('toast', { detail: '📲 QR Decoded! Profile sync complete.' }));
    }, 1800);
  };

  // Switch accounts action
  const handleSwitchAccount = (acc: any) => {
    window.dispatchEvent(new CustomEvent('toast', { detail: `🔄 Switching node to @${acc.username}...` }));
    localStorage.setItem('nexora_active_user_id', acc.id);
    window.location.reload(); // Refresh to boot with new session index
  };

  const handleAddNewAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccUsername) return;
    const cleanUsername = newAccUsername.trim().toLowerCase().replace('@', '');
    const id = `user-switch-${Date.now()}`;
    const newAcc = {
      id,
      username: cleanUsername,
      name: newAccName || `@${cleanUsername}`,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'
    };
    const updated = [...savedAccounts, newAcc];
    setSavedAccounts(updated);
    localStorage.setItem('nexora_saved_accounts', JSON.stringify(updated));
    setShowAddAccountModal(false);
    setNewAccUsername('');
    setNewAccName('');
    window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Added @${cleanUsername} to device vault.` }));
  };

  const removeSavedAccount = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(acc => acc.id !== id);
    setSavedAccounts(updated);
    localStorage.setItem('nexora_saved_accounts', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Removed account from device storage.' }));
  };

  // Pinned items filtering
  const pinnedPostIdsList = currentUser.pinnedPosts || [];
  const myPosts = posts.filter(p => p.username === currentUser.username);
  
  // Tab filtered items
  const getTabContent = () => {
    switch (profileTab) {
      case 'videos':
        return myPosts.filter(p => p.videoUrl);
      case 'media':
        return myPosts.filter(p => p.image || p.videoUrl);
      case 'pinned':
        return myPosts.filter(p => pinnedPostIdsList.includes(p.id));
      case 'drafts':
        return myPosts.filter(p => p.isDraft);
      case 'private':
        return myPosts.filter(p => p.audience === 'onlyme');
      case 'posts':
      default:
        return myPosts;
    }
  };

  const filteredTabPosts = getTabContent();

  return (
    <div className="relative w-full min-h-screen bg-[#030112] text-white font-sans overflow-x-hidden pb-24">
      
      {/* 1. DYNAMIC PROFILE HEADER COVER BACKGROUND */}
      <div className="relative w-full h-44 sm:h-56 bg-slate-950 overflow-hidden">
        {currentUser.coverImage ? (
          <img 
            src={currentUser.coverImage} 
            className="w-full h-full object-cover opacity-60 blur-[1px] transition-all hover:scale-105 duration-700" 
            alt="Profile Cover Banner"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-tr from-violet-950 via-[#0a0521] to-[#2c0b3d]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#030112] via-[#030112]/20 to-transparent" />
        
        {/* Navigation & Controls header */}
        <div className="absolute top-4 inset-x-4 flex justify-between items-center z-10">
          {onCloseProfile ? (
            <button 
              onClick={onCloseProfile}
              className="p-2.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 hover:scale-105 transition-all cursor-pointer"
              title="Return to Feed"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 backdrop-blur-md border border-violet-500/20 text-[10px] font-mono text-violet-300 tracking-wider">
              <Compass className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
              MY SOCIAL NODE
            </div>
          )}

          {/* Hamburger Menu & Quick Tools (Progressive Disclosure ceiling) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePanel('qr-profile')}
              className="p-2.5 rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 text-violet-300 hover:text-white hover:bg-violet-600/20 transition-all cursor-pointer"
              title="Show QR Code Identifier"
            >
              <QrCode className="w-5 h-5" />
            </button>
            <button
              onClick={() => setActivePanel('menu')}
              className="p-2.5 rounded-2xl bg-linear-to-r from-violet-600 to-fuchsia-600 hover:brightness-110 shadow-lg shadow-violet-500/10 text-white transition-all cursor-pointer flex items-center gap-1"
              title="Open Advanced Hub"
              id="nexora-advanced-hamburger-trigger"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. PUBLIC PROFILE CARD & INFORMATION ARCHITECTURE */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 space-y-6">
        
        {/* Main Header card container */}
        <div className="bg-[#0b0922]/90 backdrop-blur-xl border border-violet-500/15 rounded-[32px] p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl">
          
          {/* Aesthetic grid lights in backdrop */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-pink-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Profile Identity Layout */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            
            {/* Left: Avatar with frames & Name plate */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
              <div className="relative group shrink-0">
                {/* Simulated dynamic premium halo frame */}
                <div className="absolute -inset-1.5 bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-pink-500 rounded-[28px] blur-xs animate-spin" style={{ animationDuration: '9s' }} />
                
                <div 
                  onClick={() => setProfilePicExpanded(true)}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-[24px] bg-black overflow-hidden relative border-2 border-black z-10 cursor-zoom-in transition-transform duration-300 group-hover:scale-[1.02]"
                >
                  <img 
                    src={currentUser.avatar} 
                    className="w-full h-full object-cover" 
                    alt="User Avatar picture"
                    referrerPolicy="no-referrer"
                  />
                  {/* Hover visual expand pill */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                </div>

                {/* Status Indicator bubble */}
                <span className="absolute bottom-0 right-0 z-20 bg-black border border-white/10 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 shadow-md">
                  <span>{statusEmoji}</span>
                  <span className="font-mono text-[9px] text-zinc-400 font-bold">{statusText}</span>
                </span>
              </div>

              <div className="space-y-1.5 leading-tight">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">{currentUser.name}</h1>
                  {currentUser.isVerified && <PurpleVerifiedBadge className="w-5 h-5" type="founder" />}
                  
                  {/* Creator specific tags */}
                  <span className="px-2 py-0.5 rounded-full bg-linear-to-r from-violet-600/20 to-pink-500/20 border border-violet-500/30 text-[8px] font-mono text-purple-300 uppercase tracking-widest font-black flex items-center gap-1">
                    <Crown className="w-2.5 h-2.5 text-pink-400" /> Premium Creator
                  </span>
                </div>
                
                <p className="text-xs sm:text-sm font-mono text-violet-400">@{currentUser.username}</p>

                {/* Metadata list */}
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-y-1.5 gap-x-3 text-xs text-zinc-400 font-sans mt-2">
                  {currentUser.location && (
                    <span className="flex items-center gap-1 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-pink-500" /> {currentUser.location}
                    </span>
                  )}
                  {currentUser.website && (
                    <a 
                      href={`https://${currentUser.website}`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                    >
                      <LinkIcon className="w-3.5 h-3.5" /> {currentUser.website}
                    </a>
                  )}
                  <span className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-violet-400" /> {currentUser.joinedDate || 'Joined June 2026'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons Section */}
            <div className="flex flex-row md:flex-col items-center justify-center md:items-end gap-2 shrink-0 max-w-full overflow-x-auto">
              {isOwnProfile ? (
                <>
                  <button
                    onClick={() => setActivePanel('edit-profile')}
                    className="flex-1 md:w-full px-5 py-3 bg-[#110e30] border border-violet-500/20 hover:border-violet-500/40 text-violet-300 rounded-2xl text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-violet-950/20 transition-all cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                  <button
                    onClick={() => setActivePanel('creator-studio')}
                    className="flex-1 md:w-full px-5 py-3 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white rounded-2xl text-xs font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-violet-500/10 cursor-pointer"
                  >
                    <BarChart2 className="w-4 h-4 text-white" /> Creator Studio
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setIsFollowing(!isFollowing);
                      onToggleFollow?.(currentUser.id);
                      window.dispatchEvent(new CustomEvent('toast', { detail: isFollowing ? 'Unfollowed Node connection' : '✨ Node connection established!' }));
                    }}
                    className={`px-6 py-3 rounded-2xl text-xs font-mono font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 ${
                      isFollowing 
                        ? 'bg-zinc-900 border border-zinc-700 text-zinc-400' 
                        : 'bg-linear-to-r from-violet-600 to-pink-500 text-white shadow'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-4 h-4 text-emerald-400" /> Connected
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 text-white animate-pulse" /> Connect Node
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => onStartChat?.(currentUser.id)}
                    className="px-4 py-3 bg-[#110e30] hover:bg-violet-950/40 border border-violet-500/25 text-violet-300 rounded-2xl text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all"
                  >
                    <MessageSquare className="w-4 h-4 text-cyan-400" /> Direct Msg
                  </button>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Network node link copied to clipboard!' }));
                    }}
                    className="p-3 bg-[#110e30] border border-violet-500/25 hover:bg-violet-950/40 text-violet-300 rounded-2xl cursor-pointer transition-all"
                    title="Share Profile Link"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Social Bio summary */}
          {currentUser.bio && (
            <div className="p-4 rounded-2xl bg-black/40 border border-violet-500/5 text-left text-xs sm:text-sm leading-relaxed text-zinc-300 italic whitespace-pre-wrap font-sans">
              "{currentUser.bio}"
            </div>
          )}

          {/* 3. RELATIONSHIP COUNTERS & METRICS */}
          <div className="grid grid-cols-3 gap-3 border-t border-violet-500/10 pt-5 text-center">
            
            {/* FOLLOWING */}
            <div 
              onClick={() => { setActivePanel('social-graph'); setRelationsTab('following'); }}
              className="p-3 rounded-2xl bg-black/20 hover:bg-violet-500/5 border border-transparent hover:border-violet-500/10 transition-all cursor-pointer group"
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 group-hover:text-violet-300">Following</p>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1 font-sans">
                {currentUser.following?.toLocaleString() || '184'}
              </h3>
            </div>

            {/* FOLLOWERS */}
            <div 
              onClick={() => { setActivePanel('social-graph'); setRelationsTab('followers'); }}
              className="p-3 rounded-2xl bg-black/20 hover:bg-violet-500/5 border border-transparent hover:border-violet-500/10 transition-all cursor-pointer group"
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 group-hover:text-violet-300">Followers</p>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1 font-sans">
                {currentUser.followers?.toLocaleString() || '1,420'}
              </h3>
            </div>

            {/* REPUTATION OR SPARKS */}
            <div 
              onClick={() => setShowReputationModal(true)}
              className="p-3 rounded-2xl bg-black/20 hover:bg-pink-500/5 border border-transparent hover:border-pink-500/10 transition-all cursor-pointer group"
              title="Click to view full reputation score breakdown"
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 group-hover:text-pink-300 flex items-center justify-center gap-1">
                Reputation <Info className="w-3 h-3 text-pink-400" />
              </p>
              <h3 className="text-lg sm:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-violet-400 mt-1 font-sans">
                {currentUser.reputationPoints?.toLocaleString() || '12.4K'}
              </h3>
            </div>

          </div>

          {/* Mutual Friends Banner (Optional - Progressive disclosure) */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#09051d]/60 border border-violet-500/10 text-xs font-sans text-zinc-400">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <img className="w-6 h-6 rounded-full border border-black" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80" alt="mutual 1" />
                <img className="w-6 h-6 rounded-full border border-black" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80" alt="mutual 2" />
                <img className="w-6 h-6 rounded-full border border-black" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&auto=format&fit=crop&q=80" alt="mutual 3" />
              </div>
              <span>Shared connections in this locale grid node</span>
            </div>
            <span className="text-[10px] font-mono text-violet-400 uppercase font-black tracking-widest">3 Mutuals</span>
          </div>

          {/* Innovative Pinned Music Showpiece */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-violet-950/40 to-pink-950/20 border border-violet-500/10">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400 animate-pulse">
                <Music className="w-5 h-5" />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-mono text-pink-400 font-extrabold uppercase tracking-widest leading-none">SHOWPIECE SONG VIBE</p>
                <p className="text-xs font-bold text-white mt-1 leading-tight">{pinnedSong}</p>
                <p className="text-[10px] text-zinc-400 font-mono">by {pinnedArtist}</p>
              </div>
            </div>
            <button
              onClick={toggleMusicAudio}
              className={`p-2.5 px-4 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition-all shrink-0 ${
                isSongPlaying 
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/20' 
                  : 'bg-[#150f38] border border-pink-500/20 text-pink-300 hover:bg-pink-950/10'
              }`}
            >
              {isSongPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-white" /> Pause Synth
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-pink-300" /> Play Vibe
                </>
              )}
            </button>
          </div>

        </div>

        {/* 4. CONTENT STICKY TAB NAVIGATION */}
        <div className="sticky top-0 bg-[#030112]/95 backdrop-blur-md z-30 py-2 border-b border-white/5">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none py-1 max-w-full">
            {[
              { id: 'posts', label: 'Posts' },
              { id: 'videos', label: 'Videos' },
              { id: 'media', label: 'Media' },
              { id: 'pinned', label: 'Pinned' },
              { id: 'drafts', label: 'Drafts', ownerOnly: true },
              { id: 'private', label: 'Private', ownerOnly: true }
            ].map(tab => {
              if (tab.ownerOnly && !isOwnProfile) return null;
              const isActive = profileTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setProfileTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-mono uppercase font-extrabold tracking-wider whitespace-nowrap cursor-pointer transition-all ${
                    isActive 
                      ? 'bg-violet-600 text-white shadow-md shadow-violet-500/10' 
                      : 'bg-white/3 text-zinc-400 hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. RESPONSIVE GRID CONTENT & PINNED POSTS */}
        <div className="space-y-4">
          
          {/* Render Pinned Items separately if viewing the regular Feed/Posts view */}
          {profileTab === 'posts' && pinnedPostIdsList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-mono text-pink-400 font-extrabold uppercase tracking-widest">
                <Pin className="w-3.5 h-3.5 text-pink-400 rotate-45" /> Pinned Showcases
              </div>
              <MediaGrid 
                gridPosts={myPosts.filter(p => pinnedPostIdsList.includes(p.id))} 
                pinnedPostIds={pinnedPostIdsList} 
                onSelectPost={(post) => setSelectedGridPost(post)} 
              />
            </div>
          )}

          {/* Standard Grid view of posts */}
          <div className="space-y-3 text-left">
            <div className="text-xs font-mono text-zinc-500 font-bold uppercase tracking-wider">
              {profileTab} Stream ({filteredTabPosts.length})
            </div>
            
            {filteredTabPosts.length === 0 ? (
              <div className="p-8 py-14 rounded-3xl bg-[#09071c]/50 border border-violet-500/10 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/10 flex items-center justify-center mx-auto text-violet-400 text-xl">
                  📭
                </div>
                <div>
                  <h4 className="text-sm font-bold text-violet-100">Empty Network Segment</h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 leading-normal">
                    This section has no compiled nodes or post logs. Broadcast your daily stories or snapshots.
                  </p>
                </div>
                {isOwnProfile && (
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('openComposer', { detail: 'posts' }))}
                    className="px-4 py-2 bg-linear-to-r from-violet-600 to-pink-500 text-white font-mono font-bold text-[10px] uppercase rounded-xl"
                  >
                    + Create First Post
                  </button>
                )}
              </div>
            ) : (
              <MediaGrid 
                gridPosts={filteredTabPosts} 
                pinnedPostIds={pinnedPostIdsList} 
                onSelectPost={(post) => setSelectedGridPost(post)} 
              />
            )}
          </div>

        </div>

      </div>

      {/* 6. ADVANCED SLIDE-OUT DRAWER MENU ☰ (Progressive Disclosure) */}
      <AnimatePresence>
        {activePanel === 'menu' && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end" onClick={() => setActivePanel('profile')}>
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-md h-full bg-[#080614] border-l border-violet-500/15 p-6 overflow-y-auto space-y-6 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-violet-400" />
                  <span className="text-xs font-mono text-zinc-400 font-extrabold tracking-widest uppercase">NEXORA CONTROL CENTER</span>
                </div>
                <button 
                  onClick={() => setActivePanel('profile')}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Saved accounts switching module */}
              <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3">
                <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">👤 Vault Account Switcher</span>
                <div className="space-y-2">
                  {savedAccounts.map(acc => {
                    const isActive = acc.id === currentUser.id || acc.username === currentUser.username;
                    return (
                      <div 
                        key={acc.id}
                        onClick={() => !isActive && handleSwitchAccount(acc)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-violet-600/10 border-violet-500/40' 
                            : 'bg-black/40 border-transparent hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img src={acc.avatar} alt={acc.name} className="w-8 h-8 rounded-lg object-cover" />
                          <div className="min-w-0 leading-tight">
                            <p className="text-xs font-bold text-white truncate">{acc.name}</p>
                            <p className="text-[10px] font-mono text-zinc-500">@{acc.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {isActive && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                          {savedAccounts.length > 1 && !isActive && (
                            <button 
                              onClick={(e) => removeSavedAccount(acc.id, e)}
                              className="p-1 text-zinc-500 hover:text-red-400"
                              title="Remove credential log"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setShowAddAccountModal(true)}
                  className="w-full py-2 bg-white/5 hover:bg-white/10 text-violet-300 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition-all"
                >
                  + Switch / Add Node Account
                </button>
              </div>

              {/* Grouped control directories */}
              <div className="space-y-4">
                
                {/* 1. Account Settings */}
                <div className="space-y-1">
                  <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">Account & Identity</p>
                  <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden">
                    <button 
                      onClick={() => { setActivePanel('edit-profile'); }}
                      className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold"
                    >
                      <span className="flex items-center gap-2 text-zinc-300">
                        <Settings className="w-4 h-4 text-violet-400" /> Account Settings
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </button>
                    <button 
                      onClick={() => { setActivePanel('social-graph'); setRelationsTab('close-friends'); }}
                      className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold border-t border-white/5"
                    >
                      <span className="flex items-center gap-2 text-zinc-300">
                        <Users className="w-4 h-4 text-pink-400" /> Close Friends Circles
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </button>
                    <button 
                      onClick={() => { setActivePanel('social-graph'); setRelationsTab('blocked'); }}
                      className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold border-t border-white/5"
                    >
                      <span className="flex items-center gap-2 text-zinc-300">
                        <Shield className="w-4 h-4 text-red-400" /> Blocked & Muted Nodes
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </button>
                  </div>
                </div>

                {/* 2. Creator Studio links */}
                <div className="space-y-1">
                  <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">Creator Tools</p>
                  <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden">
                    <button 
                      onClick={() => { setActivePanel('creator-studio'); }}
                      className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold"
                    >
                      <span className="flex items-center gap-2 text-zinc-300">
                        <BarChart2 className="w-4 h-4 text-emerald-400" /> Creator Analytics
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </button>
                    <button 
                      onClick={() => { setActivePanel('creator-studio'); }}
                      className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold border-t border-white/5"
                    >
                      <span className="flex items-center gap-2 text-zinc-300">
                        <Coins className="w-4 h-4 text-amber-400" /> Creator Monetization (NEX)
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </button>
                  </div>
                </div>

                {/* 3. Help & About */}
                <div className="space-y-1">
                  <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">Support & Feedback</p>
                  <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden">
                    <button 
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('toast', { detail: 'ℹ️ Nexora v1.8.4 - Cloud Native Node Live' }));
                      }}
                      className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold"
                    >
                      <span className="flex items-center gap-2 text-zinc-300">
                        <Info className="w-4 h-4 text-cyan-400" /> About Nexora Matrix
                      </span>
                      <ChevronRight className="w-4 h-4 text-zinc-600" />
                    </button>
                    <button 
                      onClick={() => {
                        onLogout?.();
                        setActivePanel('profile');
                      }}
                      className="w-full p-3 flex items-center justify-between text-xs hover:bg-red-950/20 text-red-400 hover:text-red-300 font-sans font-black border-t border-white/5"
                    >
                      <span className="flex items-center gap-2">
                        <LogOut className="w-4 h-4" /> Terminate Node Session (Log Out)
                      </span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>

              <button
                onClick={() => setActivePanel('profile')}
                className="w-full py-3.5 bg-violet-950 hover:bg-violet-900 text-violet-300 rounded-xl text-xs font-mono font-black uppercase tracking-wider transition-all"
              >
                Close Control Menu
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. DYNAMIC CREATOR STUDIO & DETAILED ANALYTICS VIEW */}
      <AnimatePresence>
        {activePanel === 'creator-studio' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
              
              {/* Back header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <button
                  onClick={() => setActivePanel('profile')}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white uppercase font-black cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Profile
                </button>
                <div className="flex items-center gap-1 text-xs font-mono text-emerald-400 font-black">
                  <Activity className="w-4 h-4 text-emerald-400 animate-pulse" /> LIVE TELEMETRY ENGINE
                </div>
              </div>

              {/* Revenue & Balance Banner */}
              <div className="p-6 rounded-3xl bg-linear-to-r from-violet-900 to-pink-900 border border-violet-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-left space-y-1">
                  <p className="text-[9px] font-mono text-pink-300 font-extrabold uppercase tracking-widest leading-none">NEX WALLET BALANCE</p>
                  <h2 className="text-3xl font-black text-white">
                    {(currentUser.nexBalance || 24500).toLocaleString()} <span className="text-sm font-mono font-medium text-pink-300">NEX</span>
                  </h2>
                  <p className="text-[10px] text-zinc-300 font-sans">Estimated Monetized Earnings: ₦{( (currentUser.nexBalance || 24500) * 1.5 ).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('toast', { detail: '💸 Disbursing earnings to local bank...' }))}
                    className="px-4 py-2.5 bg-white text-black font-mono font-bold text-xs uppercase rounded-xl transition-all cursor-pointer hover:bg-zinc-200"
                  >
                    Withdraw
                  </button>
                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('toast', { detail: '🤝 Opened Brand Collaboration matching platform.' }))}
                    className="px-4 py-2.5 bg-black/40 border border-white/10 text-white font-mono font-bold text-xs uppercase rounded-xl transition-all hover:bg-black/60"
                  >
                    Collab Center
                  </button>
                </div>
              </div>

              {/* Creator Live Simulation Suite */}
              <div className="p-5 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-sans font-bold text-violet-100 flex items-center gap-1.5 uppercase">
                      <Tv className="w-4 h-4 text-pink-500" /> Nexora Broadcast Simulation
                    </h3>
                    <p className="text-[10px] text-zinc-400 font-mono">Test stream rendering performance & viewer triggers</p>
                  </div>
                  <button
                    onClick={() => setIsLiveStreaming(!isLiveStreaming)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-mono font-black uppercase tracking-widest transition-all cursor-pointer ${
                      isLiveStreaming 
                        ? 'bg-red-600 text-white animate-pulse' 
                        : 'bg-violet-600 text-white'
                    }`}
                  >
                    {isLiveStreaming ? 'Stop Broadcast 🔴' : 'Go Live Simulation'}
                  </button>
                </div>

                {isLiveStreaming && (
                  <div className="p-4 rounded-2xl bg-black/50 border border-red-500/20 space-y-3 font-mono">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-[#12080a] p-2 rounded-xl border border-red-500/10">
                        <p className="text-[9px] text-zinc-500">PEAK VIEWERS</p>
                        <p className="text-sm font-bold text-red-400">{liveViewerCount}</p>
                      </div>
                      <div className="bg-[#080c12] p-2 rounded-xl border border-violet-500/10">
                        <p className="text-[9px] text-zinc-500">ELAPSED TIME</p>
                        <p className="text-sm font-bold text-violet-300">
                          {Math.floor(liveDuration / 60)}m {liveDuration % 60}s
                        </p>
                      </div>
                      <div className="bg-[#08120a] p-2 rounded-xl border border-emerald-500/10">
                        <p className="text-[9px] text-zinc-500">LIVE COINS</p>
                        <p className="text-sm font-bold text-emerald-400">{(liveDuration * 4).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-400 italic">
                      📡 Syncing broadcast feed data back to Lagos, Nigeria locale grid node.
                    </div>
                  </div>
                )}
              </div>

              {/* Growth Analytics Trend with dynamic SVG Chart */}
              <div className="p-6 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-6 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-sans font-bold text-violet-100 uppercase tracking-wide">Follower Network Metrics</h3>
                    <p className="text-[10px] text-zinc-400 font-mono">Dynamic node telemetry & engagement comparison</p>
                  </div>
                  <div className="flex gap-1">
                    {['7d', '30d', '90d'].map(tf => (
                      <button
                        key={tf}
                        onClick={() => setAnalyticsTimeframe(tf as any)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-mono uppercase font-extrabold cursor-pointer transition-all ${
                          analyticsTimeframe === tf 
                            ? 'bg-violet-600 text-white' 
                            : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                        }`}
                      >
                        {tf === '7d' ? '7 Days' : tf === '30d' ? '30 Days' : '90 Days'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/5 leading-tight">
                    <span className="text-[9px] font-mono text-zinc-500 block">REACH INDEX</span>
                    <span className="text-lg font-black text-white mt-1 block">{(currentUser.followers * 2.4).toLocaleString()}</span>
                    <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5 mt-1">
                      <TrendingUp className="w-3 h-3" /> +14.2%
                    </span>
                  </div>
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/5 leading-tight">
                    <span className="text-[9px] font-mono text-zinc-500 block">ENGAGEMENT RATE</span>
                    <span className="text-lg font-black text-white mt-1 block">82.4%</span>
                    <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5 mt-1">
                      <TrendingUp className="w-3 h-3" /> +5.6%
                    </span>
                  </div>
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/5 leading-tight">
                    <span className="text-[9px] font-mono text-zinc-500 block">WATCH TIME (HRS)</span>
                    <span className="text-lg font-black text-white mt-1 block">18,240</span>
                    <span className="text-[9px] font-mono text-pink-400 flex items-center gap-0.5 mt-1">
                      <TrendingUp className="w-3 h-3" /> +24.8%
                    </span>
                  </div>
                  <div className="bg-black/30 p-4 rounded-2xl border border-white/5 leading-tight">
                    <span className="text-[9px] font-mono text-zinc-500 block">PROFILE VISITS</span>
                    <span className="text-lg font-black text-white mt-1 block">{(currentUser.followers * 0.42).toLocaleString()}</span>
                    <span className="text-[9px] font-mono text-emerald-400 flex items-center gap-0.5 mt-1">
                      <TrendingUp className="w-3 h-3" /> +9.3%
                    </span>
                  </div>
                </div>

                {/* SVG Line Chart for trends */}
                <div className="space-y-2">
                  <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">📈 TELEMETRY TRAFFIC (GRAPH)</span>
                  <div className="h-44 bg-black/40 border border-white/5 rounded-2xl p-4 relative overflow-hidden flex items-end">
                    
                    {/* SVG Line */}
                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      <line x1="0" y1="37" x2="400" y2="37" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="75" x2="400" y2="75" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      <line x1="0" y1="112" x2="400" y2="112" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
                      
                      {/* Area */}
                      <path 
                        d="M0 130 Q 50 80, 100 110 T 200 40 T 300 90 T 400 20 L 400 150 L 0 150 Z" 
                        fill="url(#chartGrad)" 
                      />
                      {/* Path Line */}
                      <path 
                        d="M0 130 Q 50 80, 100 110 T 200 40 T 300 90 T 400 20" 
                        fill="none" 
                        stroke="#8B5CF6" 
                        strokeWidth="3.5" 
                        strokeLinecap="round"
                      />
                    </svg>

                    {/* Chart axes details */}
                    <div className="absolute inset-x-4 bottom-2 flex justify-between text-[8px] font-mono text-zinc-500 uppercase">
                      <span>MON</span>
                      <span>TUE</span>
                      <span>WED</span>
                      <span>THU</span>
                      <span>FRI</span>
                      <span>SAT</span>
                      <span>SUN</span>
                    </div>
                  </div>
                </div>

                {/* Demographics Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-black/20 border border-white/5 p-4 rounded-2xl">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-3">🌍 Top Countries</span>
                    <div className="space-y-2 text-xs">
                      {[
                        { flag: '🇳🇬', name: 'Nigeria', percent: '62%' },
                        { flag: '🇬🇧', name: 'United Kingdom', percent: '14%' },
                        { flag: '🇺🇸', name: 'United States', percent: '11%' },
                        { flag: '🇿🇦', name: 'South Africa', percent: '7%' }
                      ].map(country => (
                        <div key={country.name} className="flex items-center justify-between">
                          <span className="text-zinc-300 flex items-center gap-1.5">
                            <span className="text-sm">{country.flag}</span> {country.name}
                          </span>
                          <span className="font-mono text-violet-400 font-bold">{country.percent}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-black/20 border border-white/5 p-4 rounded-2xl">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase block mb-3">🕒 Peak Activity Hours</span>
                    <div className="space-y-2 text-xs">
                      {[
                        { time: '18:00 - 21:00', label: 'Prime Time Rush', percent: '44%' },
                        { time: '12:00 - 14:00', label: 'Lunch Break Sync', percent: '28%' },
                        { time: '21:00 - 00:00', label: 'Night Owls Gossip', percent: '18%' },
                        { time: '08:00 - 11:00', label: 'Morning Calibrating', percent: '10%' }
                      ].map(hour => (
                        <div key={hour.time} className="flex items-center justify-between">
                          <div className="leading-tight">
                            <p className="text-zinc-300 font-bold">{hour.time}</p>
                            <p className="text-[10px] text-zinc-500 font-mono">{hour.label}</p>
                          </div>
                          <span className="font-mono text-pink-400 font-bold">{hour.percent}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              <button
                onClick={() => setActivePanel('profile')}
                className="w-full py-3.5 bg-violet-950 hover:bg-violet-900 text-violet-300 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all"
              >
                Close Creator Dashboard
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. QR PROFILE CUSTOMIZER & MOCK SCANNER VIEW */}
      <AnimatePresence>
        {activePanel === 'qr-profile' && (
          <div className="fixed inset-0 z-50 bg-[#04020f]/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0926] border border-violet-500/25 rounded-[36px] p-6 max-w-sm w-full text-center space-y-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setActivePanel('profile')}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-1 text-left">
                <span className="text-[10px] font-mono text-cyan-400 font-extrabold uppercase tracking-widest block">IDENTIFICATION MATRIX</span>
                <h3 className="text-sm font-sans font-black text-white uppercase">Your Nexora QR Profile Code</h3>
                <p className="text-[10px] text-zinc-400 font-mono">Scan on any device to instantly connect node feeds</p>
              </div>

              {/* Generates a custom gradient themed QR code component */}
              <div className="relative p-6 rounded-3xl bg-black border border-white/5 flex flex-col items-center justify-center space-y-4">
                
                {/* QR Canvas frame */}
                <div className={`p-4 bg-gradient-to-tr ${getQrGradients()} rounded-2xl relative group overflow-hidden`}>
                  <div className="absolute inset-0.5 bg-black rounded-xl z-0" />
                  
                  {/* Generated SVG QR Code representation */}
                  <svg className="w-44 h-44 relative z-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm1 1h2v2H5V5zm9-3h8v8h-8V2zm2 2v4h4V4h-4zm1 1h2v2h-2V5zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm1 1h2v2H5v-2zm14-3h3v3h-3v-3zm-2 2h2v2h-2v-2zm2 2h3v3h-3v-3zm-4-4h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm-2-4h2v2h-2v-2zm0 4h2v2h-2v-2zm2-2h2v2h-2v-2z" />
                    <rect x="9.5" y="9.5" width="5" height="5" rx="1.5" className="text-violet-500 fill-current" />
                  </svg>
                </div>

                <div className="leading-tight">
                  <p className="text-xs font-bold text-white flex items-center justify-center gap-1">
                    {currentUser.name} {currentUser.isVerified && <PurpleVerifiedBadge className="w-4 h-4" />}
                  </p>
                  <p className="text-[10px] text-violet-400 font-mono">@{currentUser.username}</p>
                </div>
              </div>

              {/* Customize palette colors */}
              <div className="space-y-2 text-left">
                <label className="text-[9px] font-mono text-zinc-400 uppercase tracking-widest block">Palette Themes</label>
                <div className="flex gap-2">
                  {[
                    { id: 'neon-cyber', label: 'Cyber Violet', color: 'bg-violet-600' },
                    { id: 'solar-flare', label: 'Solar Pink', color: 'bg-pink-500' },
                    { id: 'holographic', label: 'Holo Green', color: 'bg-cyan-500' }
                  ].map(pal => (
                    <button
                      key={pal.id}
                      onClick={() => setQrColorPalette(pal.id as any)}
                      className={`flex-1 p-2 rounded-xl text-[9px] font-mono uppercase font-black flex items-center justify-center gap-1 border transition-all cursor-pointer ${
                        qrColorPalette === pal.id 
                          ? 'bg-white/10 border-violet-500 text-white' 
                          : 'bg-black/40 border-transparent text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full ${pal.color}`} />
                      {pal.label.split(' ')[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action commands */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={simulateScan}
                  className="p-3 bg-linear-to-r from-violet-600 to-pink-500 text-white rounded-2xl text-[10px] font-mono font-black uppercase tracking-wider cursor-pointer"
                >
                  Simulate Scanner Scan
                </button>
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('toast', { detail: '💾 QR Code file exported to disk.' }));
                  }}
                  className="p-3 bg-[#130f3a] border border-violet-500/25 text-violet-300 rounded-2xl text-[10px] font-mono font-black uppercase tracking-wider cursor-pointer hover:bg-violet-950/20"
                >
                  Download QR png
                </button>
              </div>

              {qrScanningActive && (
                <div className="p-3 rounded-xl bg-violet-600/10 border border-violet-500/20 text-xs font-mono text-violet-300 animate-pulse">
                  📷 Initializing device camera framework on port 3000...
                </div>
              )}

              {qrScanSuccessText && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-sans text-emerald-300">
                  {qrScanSuccessText}
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. SOCIAL GRAPH & RELATIONSHIP MANAGER VIEW */}
      <AnimatePresence>
        {activePanel === 'social-graph' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <button
                  onClick={() => setActivePanel('profile')}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white uppercase font-black cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Profile
                </button>
                <span className="text-xs font-mono text-zinc-400 font-extrabold uppercase">Social Network Graph</span>
              </div>

              {/* Graph subtabs */}
              <div className="flex gap-1 overflow-x-auto scrollbar-none bg-black/40 p-1 rounded-2xl border border-white/5">
                {[
                  { id: 'followers', label: 'Followers' },
                  { id: 'following', label: 'Following' },
                  { id: 'close-friends', label: 'Close Friends' },
                  { id: 'blocked', label: 'Blocked' },
                  { id: 'muted', label: 'Muted' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRelationsTab(tab.id as any)}
                    className={`flex-1 px-3 py-2 rounded-xl text-[10px] font-mono uppercase font-black tracking-wider whitespace-nowrap cursor-pointer transition-all ${
                      relationsTab === tab.id 
                        ? 'bg-violet-600 text-white' 
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Filter search bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter network nodes by username..."
                  value={searchRelationQuery}
                  onChange={(e) => setSearchRelationQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-[#0d0926]/60 border border-violet-500/15 rounded-2xl text-xs font-sans text-white focus:outline-hidden focus:border-violet-500 focus:bg-black/60 font-medium"
                />
              </div>

              {/* Relation list render */}
              <div className="space-y-2 text-left">
                {(() => {
                  let list: any[] = [];
                  if (relationsTab === 'followers') {
                    list = getSeededFollowers(currentUser.id);
                  } else if (relationsTab === 'following') {
                    list = MOCK_CREATORS;
                  } else if (relationsTab === 'close-friends') {
                    list = getSeededFollowers(currentUser.id).filter(f => closeFriends.includes(f.id));
                  } else if (relationsTab === 'blocked') {
                    list = blockedUsers.map(u => ({ id: u, username: u, name: u.toUpperCase(), avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80' }));
                  } else if (relationsTab === 'muted') {
                    list = mutedUsers.map(u => ({ id: u, username: u, name: u.toUpperCase(), avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80' }));
                  }

                  const filtered = list.filter(item => 
                    item.username.toLowerCase().includes(searchRelationQuery.toLowerCase()) ||
                    item.name.toLowerCase().includes(searchRelationQuery.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-zinc-500 font-mono text-xs">
                        ⚠️ No node logs match filter query.
                      </div>
                    );
                  }

                  return filtered.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0b081c] border border-white/3">
                      <div className="flex items-center gap-3">
                        <img src={item.avatar} alt={item.name} className="w-9 h-9 rounded-xl object-cover" />
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-1">
                            {item.name} {item.isVerified && <PurpleVerifiedBadge className="w-3.5 h-3.5" />}
                          </p>
                          <p className="text-[10px] text-zinc-500 font-mono">@{item.username}</p>
                        </div>
                      </div>

                      {/* Right actions context */}
                      <div className="flex items-center gap-1.5">
                        {relationsTab === 'following' && (
                          <label className="flex items-center gap-1 text-[10px] font-mono text-pink-400 bg-pink-500/5 px-2 py-1 rounded-lg border border-pink-500/10 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={closeFriends.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCloseFriends([...closeFriends, item.id]);
                                } else {
                                  setCloseFriends(closeFriends.filter(id => id !== item.id));
                                }
                              }}
                              className="accent-pink-500"
                            />
                            <span>Close Friend</span>
                          </label>
                        )}

                        {relationsTab === 'blocked' && (
                          <button
                            onClick={() => {
                              setBlockedUsers(blockedUsers.filter(u => u !== item.id));
                              window.dispatchEvent(new CustomEvent('toast', { detail: '🔓 Node unblocked!' }));
                            }}
                            className="p-1 px-2.5 bg-violet-600 text-white rounded-lg text-[9px] font-mono uppercase font-black cursor-pointer"
                          >
                            Unblock
                          </button>
                        )}

                        {relationsTab === 'muted' && (
                          <button
                            onClick={() => {
                              setMutedUsers(mutedUsers.filter(u => u !== item.id));
                              window.dispatchEvent(new CustomEvent('toast', { detail: '🔊 Node unmuted!' }));
                            }}
                            className="p-1 px-2.5 bg-violet-600 text-white rounded-lg text-[9px] font-mono uppercase font-black cursor-pointer"
                          >
                            Unmute
                          </button>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <button
                onClick={() => setActivePanel('profile')}
                className="w-full py-3.5 bg-violet-950 hover:bg-violet-900 text-violet-300 rounded-2xl text-xs font-mono font-black uppercase tracking-wider transition-all"
              >
                Close Relationships
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. EDIT PROFILE MODAL SCREEN (With live preview) */}
      <AnimatePresence>
        {activePanel === 'edit-profile' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 text-left">
              
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <button
                  onClick={() => { stopWebcam(); setActivePanel('profile'); }}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white uppercase font-black cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Cancel Re-Calibration
                </button>
                <span className="text-xs font-mono text-zinc-400 font-extrabold uppercase">Calibrate Node Parameters</span>
              </div>

              {/* Two columns: Form on left, live preview on right */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left: Input Form */}
                <div className="space-y-4">
                  <div className="bg-[#0b081c] p-6 rounded-3xl border border-violet-500/15 space-y-4">
                    <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block border-b border-white/5 pb-2">✏️ PROFILE ATTRIBUTES</span>
                    
                    {/* Display name */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Display Name (7-Day Lock)</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 font-medium"
                      />
                    </div>

                    {/* Username */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">@username ID (30-Day Lock)</label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-hidden focus:border-violet-500 font-medium"
                      />
                    </div>

                    {/* Pronouns */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Pronouns</label>
                      <input
                        type="text"
                        value={editPronouns}
                        onChange={(e) => setEditPronouns(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 font-medium"
                        placeholder="e.g. they/them"
                      />
                    </div>

                    {/* Bio */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Bio Summary Description</label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 font-medium leading-relaxed"
                      />
                    </div>

                    {/* Website */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Website Link</label>
                      <input
                        type="text"
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 font-medium"
                      />
                    </div>

                    {/* Location */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Physical Location</label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 font-medium"
                      />
                    </div>

                    {/* Custom Category selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 text-xs">
                        <label className="text-zinc-400 font-mono text-[10px] uppercase">Network Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500"
                        >
                          <option value="Digital Creator">Digital Creator</option>
                          <option value="Founder Mindset">Founder Mindset</option>
                          <option value="Community Leader">Community Leader</option>
                          <option value="Technical Agent">Technical Agent</option>
                        </select>
                      </div>

                      <div className="space-y-1 text-xs">
                        <label className="text-zinc-400 font-mono text-[10px] uppercase">Creator Type</label>
                        <select
                          value={editCreatorType}
                          onChange={(e) => setEditCreatorType(e.target.value)}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500"
                        >
                          <option value="Premium Node">Premium Node</option>
                          <option value="Standard Node">Standard Node</option>
                          <option value="Collaborator Node">Collaborator Node</option>
                        </select>
                      </div>
                    </div>

                  </div>

                  {/* Avatar photo editor with Webcam selfie capability */}
                  <div className="bg-[#0b081c] p-6 rounded-3xl border border-violet-500/15 space-y-4">
                    <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block border-b border-white/5 pb-2">📸 AVATAR SOURCE</span>
                    
                    {isWebcamActive ? (
                      <div className="space-y-3">
                        <div className="relative aspect-square rounded-2xl bg-black overflow-hidden max-w-xs mx-auto border border-violet-500/20">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                          <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full animate-pulse text-red-500">
                            🔴 Live
                          </div>
                        </div>
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={capturePhoto}
                            className="px-4 py-2 bg-emerald-600 text-white font-mono text-[10px] uppercase font-black rounded-lg cursor-pointer"
                          >
                            Capture Frame
                          </button>
                          <button
                            onClick={stopWebcam}
                            className="px-4 py-2 bg-zinc-800 text-zinc-400 font-mono text-[10px] uppercase font-black rounded-lg cursor-pointer"
                          >
                            Disable Camera
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <img src={editAvatar} className="w-16 h-16 rounded-xl object-cover border border-violet-500/30" alt="avatar editor" />
                        <div className="flex gap-2">
                          <button
                            onClick={startWebcam}
                            className="px-3.5 py-2 bg-linear-to-r from-violet-600 to-pink-500 text-white font-mono text-[10px] uppercase font-black rounded-lg cursor-pointer flex items-center gap-1"
                          >
                            <Camera className="w-3.5 h-3.5" /> Capture selfie webcam
                          </button>
                          <button
                            onClick={() => {
                              const promptVal = prompt('Enter image URL link address:');
                              if (promptVal) setEditAvatar(promptVal);
                            }}
                            className="px-3.5 py-2 bg-[#120f38] border border-violet-500/20 text-violet-300 font-mono text-[10px] uppercase font-black rounded-lg cursor-pointer hover:bg-violet-950/20"
                          >
                            Input Image URL link
                          </button>
                        </div>
                      </div>
                    )}
                    {webcamError && <p className="text-[10px] font-mono text-red-400 mt-2">{webcamError}</p>}
                  </div>
                </div>

                {/* Right: Real-time live preview */}
                <div className="space-y-4">
                  <div className="sticky top-6 space-y-4">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pl-2">🔴 REAL-TIME MATRIX PREVIEW</span>
                    
                    {/* Simplified Profile Header simulation */}
                    <div className="bg-[#0b0922] border border-violet-500/20 rounded-[32px] p-6 text-center space-y-4 shadow-xl">
                      <div className="relative w-20 h-20 rounded-[18px] bg-black overflow-hidden mx-auto border-2 border-violet-500">
                        <img src={editAvatar} className="w-full h-full object-cover" alt="live preview avatar" />
                      </div>
                      <div className="leading-tight">
                        <h4 className="text-sm font-sans font-black text-white flex items-center justify-center gap-1">
                          {editName || 'UNNAMED NODE'} <PurpleVerifiedBadge className="w-4 h-4" />
                        </h4>
                        <p className="text-[10px] font-mono text-violet-400">@{editUsername || 'username'}</p>
                      </div>
                      <p className="text-xs text-zinc-300 italic bg-black/30 p-3 rounded-xl border border-white/5 whitespace-pre-wrap leading-relaxed max-w-xs mx-auto">
                        "{editBio || 'Write something creative about yourself...'}"
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-x-3 text-[10px] font-mono text-zinc-400">
                        {editLocation && <span>📍 {editLocation}</span>}
                        {editWebsite && <span className="text-cyan-400">🔗 {editWebsite}</span>}
                        {editPronouns && <span>👥 {editPronouns}</span>}
                      </div>
                    </div>

                    <button
                      onClick={handleSaveProfile}
                      className="w-full py-4 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white rounded-2xl text-xs font-mono font-black uppercase tracking-widest transition-all shadow-lg shadow-violet-500/15 cursor-pointer"
                    >
                      Save & Commit Re-Calibration
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. REPUTATION POINTS D3 BREAKDOWN MODAL OVERLAY */}
      <AnimatePresence>
        {showReputationModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowReputationModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0926] border border-violet-500/35 rounded-3xl p-6 max-w-md w-full text-left space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-mono text-pink-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-pink-400 animate-pulse" /> REPUTATION TELEMETRY ARCHIVE
                </span>
                <button 
                  onClick={() => setShowReputationModal(false)}
                  className="p-1 px-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white text-xs font-mono"
                >
                  Close ×
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                  Reputation represents the summation of validated helper comments, verified technical skills, completed social missions, and positive sparks on Nexora.
                </p>

                {/* Progress bar metrics for progressive disclosure */}
                <div className="space-y-3">
                  {[
                    { label: 'Contributions Metric', val: currentUser.reputationBreakdown?.contributions || 1400, color: 'bg-violet-500' },
                    { label: 'Helpfulness Index', val: currentUser.reputationBreakdown?.helpfulness || 82000, color: 'bg-pink-500' },
                    { label: 'Social Missions Completed', val: currentUser.reputationBreakdown?.missionsCompleted || 12, color: 'bg-cyan-500' },
                    { label: 'Verified Technical Skills', val: currentUser.reputationBreakdown?.skillsVerified || 4, color: 'bg-emerald-500' }
                  ].map(metric => (
                    <div key={metric.label} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-mono text-zinc-400 uppercase">
                        <span>{metric.label}</span>
                        <span className="font-bold text-white">{metric.val.toLocaleString()} pts</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full ${metric.color}`} style={{ width: '65%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowReputationModal(false)}
                className="w-full py-2.5 bg-violet-950 hover:bg-violet-900 text-violet-300 font-mono font-bold text-xs uppercase rounded-xl"
              >
                Dismiss Diagnostics
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. FULL SCREEN EXPANDED PHOTO OVERLAY */}
      <AnimatePresence>
        {profilePicExpanded && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setProfilePicExpanded(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-md w-full aspect-square rounded-[36px] overflow-hidden border border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={currentUser.avatar} className="w-full h-full object-cover" alt="Expanded user profile avatar" referrerPolicy="no-referrer" />
              <button 
                onClick={() => setProfilePicExpanded(false)}
                className="absolute top-4 right-4 p-2 rounded-2xl bg-black/50 hover:bg-black/80 border border-white/10 text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 13. ADD SWITCH ACCOUNT VAULT MODAL */}
      <AnimatePresence>
        {showAddAccountModal && (
          <div className="fixed inset-0 z-200 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowAddAccountModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0926] border border-violet-500/35 rounded-3xl p-6 max-w-sm w-full text-left space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-xs font-mono text-violet-300 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-violet-400" /> REGISTER VAULT CREDENTIALS
                </span>
                <button 
                  onClick={() => setShowAddAccountModal(false)}
                  className="p-1 px-2 rounded-lg bg-white/5 text-zinc-400 hover:text-white text-xs font-mono"
                >
                  Close ×
                </button>
              </div>

              <form onSubmit={handleAddNewAccount} className="space-y-4">
                <div className="space-y-1 text-xs">
                  <label className="text-zinc-400 font-mono text-[9px] uppercase">New Username ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. nexora_fan"
                    value={newAccUsername}
                    onChange={(e) => setNewAccUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-hidden focus:border-violet-500"
                  />
                </div>

                <div className="space-y-1 text-xs">
                  <label className="text-zinc-400 font-mono text-[9px] uppercase">Display Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Nexora Fan"
                    value={newAccName}
                    onChange={(e) => setNewAccName(e.target.value)}
                    className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-linear-to-r from-violet-600 to-pink-500 text-white font-mono font-black text-xs uppercase rounded-xl"
                >
                  Store Credential in Switch Vault
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 14. GRID SELECTION DETAIL DRAWER (Clicking a thumbnail post opens it) */}
      <AnimatePresence>
        {selectedGridPost && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedGridPost(null)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b0922] border border-violet-500/25 rounded-3xl p-5 max-w-lg w-full text-left relative space-y-4 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedGridPost(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 border-b border-white/5 pb-3">
                <img src={selectedGridPost.avatar} className="w-8 h-8 rounded-lg object-cover" alt="Selected post avatar" />
                <div>
                  <h4 className="text-xs font-sans font-black text-white">{selectedGridPost.name}</h4>
                  <p className="text-[10px] font-mono text-zinc-500">@{selectedGridPost.username} • {selectedGridPost.timestamp}</p>
                </div>
              </div>

              {selectedGridPost.image && (
                <div className="rounded-2xl overflow-hidden aspect-video bg-black max-h-56 relative border border-white/5">
                  <img src={selectedGridPost.image} className="w-full h-full object-cover" alt="selected post content image" />
                </div>
              )}

              <p className="text-xs sm:text-sm font-sans text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {selectedGridPost.content}
              </p>

              {/* Likes & commenting interaction row */}
              <div className="flex justify-between items-center text-xs font-mono text-zinc-400 border-t border-white/5 pt-3">
                <button
                  onClick={() => {
                    onLikePost(selectedGridPost.id);
                    window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Spark/Like toggle successfully synchronised!' }));
                  }}
                  className="flex items-center gap-1.5 hover:text-pink-400 cursor-pointer"
                >
                  <Heart className={`w-4 h-4 ${selectedGridPost.isLikedByUser ? 'fill-pink-500 text-pink-500' : ''}`} />
                  <span>{selectedGridPost.likes} Sparks</span>
                </button>
                <span>{selectedGridPost.comments?.length || 0} Comments</span>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
