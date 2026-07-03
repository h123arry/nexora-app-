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
  Crown,
  Laptop,
  Smartphone,
  Key,
  RefreshCw
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

  // Redesigned Settings & Privacy Hub state
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
  const [settingsActiveSubPanel, setSettingsActiveSubPanel] = useState<'main' | 'account' | 'privacy' | 'security' | 'notifications' | 'appearance' | 'storage' | 'support' | 'about'>('main');
  
  // Storage & Performance
  const [cacheSize, setCacheSize] = useState('128.4 MB');
  const [dataSaver, setDataSaver] = useState(false);
  const [autoplayVideos, setAutoplayVideos] = useState(true);
  const [mediaQuality, setMediaQuality] = useState('high'); // 'standard' | 'high' | 'lossless'

  // Security toggles/inputs
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passkeysEnabled, setPasskeysEnabled] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [activeSessions, setActiveSessions] = useState([
    { id: '1', device: 'MacBook Pro 16"', os: 'macOS Sequoia', browser: 'Google Chrome', location: 'Lagos, Nigeria', time: 'Active Now', current: true },
    { id: '2', device: 'iPhone 15 Pro Max', os: 'iOS 18', browser: 'Safari Mobile', location: 'Ibadan, Nigeria', time: '2 hours ago', current: false },
    { id: '3', device: 'Windows Desktop', os: 'Windows 11', browser: 'Firefox Developer Edition', location: 'Lekki, Nigeria', time: 'Yesterday', current: false }
  ]);

  // Privacy toggles/inputs
  const [isPrivateNode, setIsPrivateNode] = useState(false);
  const [commentAudience, setCommentAudience] = useState('everyone'); // 'everyone' | 'friends' | 'none'
  const [mentionAudience, setMentionAudience] = useState('everyone'); // 'everyone' | 'followers' | 'none'

  // Support inputs
  const [supportCategory, setSupportCategory] = useState('feedback');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSubmitted, setSupportSubmitted] = useState(false);

  // Destructive Actions Confirmations
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [confirmingDeleteAccount, setConfirmingDeleteAccount] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deleteStep, setDeleteStep] = useState(1); // 1 = warning, 2 = password enter, 3 = final delete

  // Appearance customization
  const [accentColor, setAccentColor] = useState('violet'); // 'violet' | 'pink' | 'emerald' | 'cyan'
  const [textSize, setTextSize] = useState('medium'); // 'xs' | 'sm' | 'medium' | 'lg' | 'xl'
  const [customFont, setCustomFont] = useState('sans'); // 'sans' | 'mono' | 'space'
  const [displayDensity, setDisplayDensity] = useState('default'); // 'default' | 'cozy' | 'compact'
  const [chatBubbleStyle, setChatBubbleStyle] = useState('cyber'); // 'cyber' | 'classic' | 'neon'

  // Notification toggles
  const [notifToggles, setNotifToggles] = useState({
    likes: true,
    comments: true,
    mentions: true,
    reposts: true,
    directMessages: true,
    systemAlerts: true,
    verificationUpdates: true
  });

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

  const formatSecondaryStat = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const getSecondaryMetric = (type: 'sparks' | 'reputation' | 'contributions') => {
    const seed = (currentUser.username || 'user').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    if (type === 'sparks') {
      const real = currentUser.sparks;
      if (real !== undefined && real > 0) return formatSecondaryStat(real);
      const mockVal = (seed % 40) + 5.2;
      return `${mockVal.toFixed(1)}M`;
    }
    if (type === 'reputation') {
      const real = currentUser.reputationPoints;
      if (real !== undefined && real > 0) return formatSecondaryStat(real);
      const mockVal = (seed % 10) + 1.5;
      return `${mockVal.toFixed(1)}M`;
    }
    const real = currentUser.reputationBreakdown?.contributions;
    if (real !== undefined && real > 0) return formatSecondaryStat(real);
    const mockVal = (seed % 20) + 2.1;
    return `${mockVal.toFixed(1)}M`;
  };

  return (
    <div className="relative w-full min-h-screen bg-[#030112] text-white font-sans overflow-x-hidden pb-24">
      
      {/* 1. TOP NAVIGATION ACTION BAR */}
      <div className="sticky top-0 bg-[#030112]/95 backdrop-blur-md z-40 border-b border-white/5 py-3 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onCloseProfile ? (
            <button 
              onClick={onCloseProfile}
              className="p-1.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Return to Feed"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/3 text-[10px] font-mono text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Profile
            </div>
          )}
          <span className="text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase">
            {isOwnProfile ? 'My Profile' : currentUser.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActivePanel('qr-profile')}
            className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Show QR Code"
          >
            <QrCode className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => setActivePanel('menu')}
            className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Menu"
            id="nexora-advanced-hamburger-trigger"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. PUBLIC PROFILE CARD & INFORMATION ARCHITECTURE */}
      <div className="max-w-xl mx-auto px-4 pt-4 pb-2 space-y-3.5">
        
        {/* Profile Identity (Redesigned Side-by-Side Compact Layout) */}
        <div className="flex items-start gap-4 text-left">
          {/* Circular Avatar with minimal premium halo */}
          <div className="relative shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-pink-500 rounded-full blur-[2px]" />
            <div 
              onClick={() => setProfilePicExpanded(true)}
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-black overflow-hidden relative border-2 border-black z-10 cursor-zoom-in transition-transform duration-300 hover:scale-[1.02]"
            >
              <img 
                src={currentUser.avatar} 
                className="w-full h-full object-cover" 
                alt="User Avatar"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity">
                <Eye className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>

          {/* Identity details and compact metadata */}
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">{currentUser.name}</h1>
              {currentUser.isVerified && <PurpleVerifiedBadge className="w-4 h-4 shrink-0" type="founder" />}
              
              {/* Creator Tag - simplified and clean */}
              <span className="px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-[7px] font-mono text-violet-300 uppercase tracking-widest font-black flex items-center gap-0.5 shrink-0">
                <Crown className="w-2.5 h-2.5 text-pink-400" /> Premium
              </span>
            </div>
            
            <p className="text-xs font-semibold text-zinc-400 font-mono">@{currentUser.username}</p>

            {/* Compact location & web links */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-zinc-500 font-medium font-sans pt-0.5">
              {currentUser.location && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3 text-zinc-600" /> {currentUser.location}
                </span>
              )}
              {currentUser.website && (
                <a 
                  href={`https://${currentUser.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="flex items-center gap-0.5 text-cyan-500 hover:underline"
                >
                  <LinkIcon className="w-3 h-3" /> {currentUser.website}
                </a>
              )}
              <span className="flex items-center gap-0.5">
                <Calendar className="w-3 h-3 text-zinc-600" /> {currentUser.joinedDate || 'Joined June 2026'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. PRIMARY STATISTICS */}
        <div className="grid grid-cols-3 gap-1 py-1.5 text-center border-t border-b border-white/5">
          {/* Posts */}
          <div className="py-0.5 flex flex-col items-center">
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400">Posts</span>
            <span className="text-base font-extrabold text-white mt-0.5">{myPosts.length}</span>
          </div>

          {/* Followers */}
          <div 
            onClick={() => { setActivePanel('social-graph'); setRelationsTab('followers'); }}
            className="py-0.5 flex flex-col items-center hover:bg-white/3 rounded-xl transition-all cursor-pointer"
          >
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400 hover:text-violet-400">Followers</span>
            <span className="text-base font-extrabold text-white mt-0.5">
              {currentUser.followers?.toLocaleString() || '1,420'}
            </span>
          </div>

          {/* Following */}
          <div 
            onClick={() => { setActivePanel('social-graph'); setRelationsTab('following'); }}
            className="py-0.5 flex flex-col items-center hover:bg-white/3 rounded-xl transition-all cursor-pointer"
          >
            <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-zinc-400 hover:text-violet-400">Following</span>
            <span className="text-base font-extrabold text-white mt-0.5">
              {currentUser.following?.toLocaleString() || '184'}
            </span>
          </div>
        </div>

        {/* Secondary Creator Statistics Achievements */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-zinc-500 py-1 font-mono">
          <span className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
            <span>✨</span>
            <span className="text-zinc-300 font-extrabold">{getSecondaryMetric('sparks')} Sparks</span>
          </span>
          <span className="text-zinc-800">•</span>
          <span className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
            <span>⭐</span>
            <span className="text-zinc-300 font-extrabold">{getSecondaryMetric('reputation')} Reputation</span>
          </span>
          <span className="text-zinc-800">•</span>
          <span className="flex items-center gap-1 hover:text-zinc-300 transition-colors">
            <span>📊</span>
            <span className="text-zinc-300 font-extrabold">{getSecondaryMetric('contributions')} Contributions</span>
          </span>
        </div>

        {/* 4. ACTION BUTTONS with tapped micro-interactions */}
        <div className="flex gap-2">
          {isOwnProfile ? (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setActivePanel('edit-profile')}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Edit Profile
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Profile link copied to clipboard!' }));
                }}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Share Profile
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setActivePanel('creator-studio')}
                className="flex-1 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Creator Studio
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setIsFollowing(!isFollowing);
                  onToggleFollow?.(currentUser.id);
                  window.dispatchEvent(new CustomEvent('toast', { detail: isFollowing ? 'Unfollowed connection' : '✨ Connected!' }));
                }}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isFollowing 
                    ? 'bg-zinc-850 text-zinc-400 border border-zinc-750' 
                    : 'bg-violet-600 text-white hover:bg-violet-500'
                }`}
              >
                {isFollowing ? 'Connected' : 'Connect'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => onStartChat?.(currentUser.id)}
                className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-zinc-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Message
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Profile link copied!' }));
                }}
                className="py-2 px-3 bg-white/5 hover:bg-white/10 text-zinc-200 rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center border border-white/5"
                title="Share Profile Link"
              >
                <Share2 className="w-4 h-4" />
              </motion.button>
            </>
          )}
        </div>

        {/* 5. ELEGANT TYPOGRAPHIC BIO */}
        {currentUser.bio && (
          <div className="text-zinc-300 font-sans text-xs sm:text-[13px] leading-relaxed max-w-xl text-left whitespace-pre-wrap py-0.5">
            {currentUser.bio}
          </div>
        )}

        {/* 6. MUTUAL FRIENDS (Progressive Disclosure) */}
        {!isOwnProfile && (
          <div className="flex items-center gap-2 text-xs font-sans text-zinc-500 text-left pt-0.5">
            <div className="flex -space-x-1.5">
              <img className="w-5 h-5 rounded-full border border-black object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80" alt="mutual 1" referrerPolicy="no-referrer" />
              <img className="w-5 h-5 rounded-full border border-black object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80" alt="mutual 2" referrerPolicy="no-referrer" />
              <img className="w-5 h-5 rounded-full border border-black object-cover" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&auto=format&fit=crop&q=80" alt="mutual 3" referrerPolicy="no-referrer" />
            </div>
            <span>3 mutual friends in common</span>
          </div>
        )}

      </div>

      {/* 8. CONTENT STICKY TAB NAVIGATION (Redesigned with Underline Highlight) */}
      <div className="sticky top-12 bg-[#030112]/95 backdrop-blur-md z-35 border-b border-white/5 overflow-x-auto scrollbar-none">
        <div className="max-w-xl mx-auto flex justify-around px-2">
          {[
            { id: 'posts', label: 'Posts' },
            { id: 'videos', label: 'Videos' },
            { id: 'media', label: 'Media' },
            { id: 'pinned', label: 'Pinned' },
            { id: 'drafts', label: 'Drafts', ownerOnly: true }
          ].map(tab => {
            if (tab.ownerOnly && !isOwnProfile) return null;
            const isActive = profileTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setProfileTab(tab.id)}
                whileTap={{ scale: 0.95 }}
                className={`relative py-3 px-4 text-xs font-sans font-medium tracking-wide whitespace-nowrap cursor-pointer transition-colors duration-200 ${
                  isActive ? 'text-violet-400 font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
                {isActive && (
                  <motion.div 
                    layoutId="profileActiveTabLine"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-500" 
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* 9. RESPONSIVE GRID CONTENT & PINNED POSTS */}
      <div className="max-w-xl mx-auto px-4 py-4 space-y-4">
        
        {/* Render Pinned Items separately if viewing the regular Feed/Posts view */}
        {profileTab === 'posts' && pinnedPostIdsList.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-mono text-pink-400 font-extrabold uppercase tracking-widest">
              <Pin className="w-3.5 h-3.5 text-pink-400 rotate-45" /> Pinned
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
          <div className="text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider">
            {profileTab} • {filteredTabPosts.length} Items
          </div>
          
          {filteredTabPosts.length === 0 ? (
            <div className="p-8 py-14 rounded-3xl bg-white/2 border border-white/5 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto text-zinc-400 text-xl">
                📭
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-200">Empty Section</h4>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 leading-normal">
                  No posts have been published in this section yet.
                </p>
              </div>
              {isOwnProfile && (
                <button 
                  onClick={() => window.dispatchEvent(new CustomEvent('openComposer', { detail: 'posts' }))}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-mono font-bold text-[10px] uppercase rounded-xl transition-all"
                >
                  + Create Post
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

      {/* 6. ADVANCED SLIDE-OUT DRAWER MENU ☰ (Progressive Disclosure - Redesigned Settings & Privacy Hub) */}
      <AnimatePresence>
        {activePanel === 'menu' && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-end" onClick={() => { setActivePanel('profile'); setSettingsActiveSubPanel('main'); setSettingsSearchQuery(''); }}>
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-md h-full bg-[#080614] border-l border-violet-500/15 p-5 overflow-y-auto space-y-5 text-left flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4 shrink-0">
                {/* Header Row */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-violet-400 animate-spin" style={{ animationDuration: '10s' }} />
                    <div>
                      <span className="text-[10px] font-mono text-zinc-400 font-extrabold tracking-widest uppercase block leading-none">NEXORA SYSTEM</span>
                      <h3 className="text-xs font-mono text-violet-300 font-black uppercase tracking-wider">SETTINGS & PRIVACY HUB</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setActivePanel('profile'); setSettingsActiveSubPanel('main'); setSettingsSearchQuery(''); }}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Instant Search in Settings */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search settings, privacy, security..."
                    value={settingsSearchQuery}
                    onChange={(e) => setSettingsSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2.5 bg-black/40 border border-violet-500/15 rounded-xl text-xs font-sans text-white focus:outline-hidden focus:border-violet-500 transition-all font-medium placeholder-zinc-500"
                  />
                  {settingsSearchQuery && (
                    <button 
                      onClick={() => setSettingsSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white text-xs font-mono font-bold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Settings Content */}
              <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1 scrollbar-thin">
                {settingsSearchQuery ? (
                  /* Search Results Panel */
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest block pl-1">SEARCH RESULTS</span>
                    {(() => {
                      const items = [
                        { id: 'edit-profile', title: 'Edit Profile Details', desc: 'Calibrate username, display name, pronouns, and bio', panel: 'account' },
                        { id: 'switch-account', title: 'Switch / Add Account', desc: 'Register other user accounts and toggle active sessions', panel: 'account' },
                        { id: 'private-node', title: 'Private Account', desc: 'Limit feed access to approved friends and connections only', panel: 'privacy' },
                        { id: 'comments-audience', title: 'Comments & Interactions', desc: 'Configure who is permitted to comment on your posts', panel: 'privacy' },
                        { id: 'mentions-audience', title: 'Mentions & Tags Visibility', desc: 'Control who can mention or tag you in threads', panel: 'privacy' },
                        { id: 'blocked-muted', title: 'Blocked & Muted Connections', desc: 'Manage blocked or muted accounts and unblock users', panel: 'privacy' },
                        { id: 'change-password', title: 'Change Account Password', desc: 'Rotate password credentials with full security audits', panel: 'security' },
                        { id: 'two-factor', title: 'Two-Factor Authentication (2FA)', desc: 'Activate second key validation with verification codes', panel: 'security' },
                        { id: 'passkeys', title: 'Passkeys Sign-On', desc: 'Configure secure biometric face or thumbprint lock registers', panel: 'security' },
                        { id: 'sessions-log', title: 'Recent Login Activity', desc: 'Review active browser locations and log out individual devices', panel: 'security' },
                        { id: 'notification-toggles', title: 'Push Alerts Toggles', desc: 'Adjust sparks, comments, direct messages alert modes', panel: 'notifications' },
                        { id: 'appearance-theme', title: 'Theme Customization', desc: 'Switch Cyber Violet, Emerald Glass, or Stealth Dark modes', panel: 'appearance' },
                        { id: 'accent-color', title: 'Accent Colors Selector', desc: 'Customize glows with glowing neon highlights', panel: 'appearance' },
                        { id: 'text-size', title: 'Typography Text Sizing', desc: 'Adjust text sizes dynamically across the canvas', panel: 'appearance' },
                        { id: 'clear-cache', title: 'Clear Cache Tool', desc: 'Free temporary mesh asset store and logs', panel: 'storage' },
                        { id: 'data-saver', title: 'Data Saver Mode', desc: 'Compress high-resolution multimedia files', panel: 'storage' },
                        { id: 'support-ticket', title: 'Send Feedback & Support', desc: 'Connect to our technical help support lines', panel: 'support' },
                        { id: 'about-matrix', title: 'About Nexora Version', description: 'Review system status parameters and terms', panel: 'about' }
                      ];

                      const filtered = items.filter(item => 
                        item.title.toLowerCase().includes(settingsSearchQuery.toLowerCase()) ||
                        item.desc.toLowerCase().includes(settingsSearchQuery.toLowerCase())
                      );

                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-10 bg-black/20 rounded-2xl border border-white/5 p-4">
                            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
                            <p className="text-xs font-mono text-zinc-400">No settings found matching "{settingsSearchQuery}"</p>
                            <p className="text-[10px] text-zinc-600 mt-1">Try keywords like "password", "theme", "cache" or "privacy"</p>
                          </div>
                        );
                      }

                      return filtered.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSettingsActiveSubPanel(item.panel as any);
                            setSettingsSearchQuery('');
                          }}
                          className="w-full text-left p-3.5 rounded-2xl bg-[#0e0c24] border border-violet-500/10 hover:border-violet-500/30 transition-all flex items-start gap-3 group"
                        >
                          <div className="p-2 rounded-xl bg-violet-600/10 text-violet-400 group-hover:bg-violet-600/20">
                            <Sliders className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <h4 className="text-xs font-bold text-white flex items-center gap-1">
                              {item.title} <span className="text-[8px] font-mono px-1 bg-white/5 rounded text-violet-300">In {item.panel.toUpperCase()}</span>
                            </h4>
                            <p className="text-[10px] text-zinc-400 font-sans leading-normal">{item.desc}</p>
                          </div>
                        </button>
                      ));
                    })()}
                  </div>
                ) : settingsActiveSubPanel === 'main' ? (
                  /* Main List view of Settings */
                  <div className="space-y-5">
                    
                    {/* User profile brief */}
                    <div className="p-3.5 rounded-2xl bg-linear-to-tr from-[#130f3c]/90 to-[#0c0926]/90 border border-violet-500/20 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={currentUser.avatar} className="w-10 h-10 rounded-xl object-cover border border-violet-500/30" alt="" />
                        <div className="leading-tight">
                          <p className="text-xs font-bold text-white flex items-center gap-1">
                            {currentUser.name} {currentUser.isVerified && <PurpleVerifiedBadge className="w-3.5 h-3.5" />}
                          </p>
                          <p className="text-[10px] font-mono text-violet-400">@{currentUser.username}</p>
                        </div>
                      </div>
                      <span className="text-[8px] font-mono bg-violet-500/25 text-violet-300 px-2 py-1 rounded-full font-extrabold uppercase">ACTIVE</span>
                    </div>

                    {/* Section 1: Identity & Switcher Vault */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">Account Identity Vault</p>
                      <div className="p-3 rounded-2xl bg-[#0d0a20] border border-violet-500/10 space-y-3">
                        <div className="space-y-2">
                          {savedAccounts.map(acc => {
                            const isActive = acc.id === currentUser.id || acc.username === currentUser.username;
                            return (
                              <div 
                                key={acc.id}
                                onClick={() => !isActive && handleSwitchAccount(acc)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isActive 
                                    ? 'bg-violet-600/10 border-violet-500/30' 
                                    : 'bg-black/30 border-transparent hover:border-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img src={acc.avatar} alt={acc.name} className="w-7 h-7 rounded-lg object-cover" />
                                  <div className="min-w-0 leading-none">
                                    <p className="text-xs font-bold text-white truncate">{acc.name}</p>
                                    <p className="text-[9px] font-mono text-zinc-500 mt-0.5">@{acc.username}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {isActive && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
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
                          className="w-full py-2 bg-white/5 hover:bg-white/10 text-violet-300 rounded-xl text-[9px] font-mono font-black uppercase tracking-wider transition-all"
                        >
                          + Add Another Node Account
                        </button>
                      </div>
                    </div>

                    {/* Section 2: Grouped Directories */}
                    <div className="space-y-4">
                      
                      {/* Account Category */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">Account Administration</p>
                        <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
                          <button 
                            onClick={() => setSettingsActiveSubPanel('account')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Edit3 className="w-4 h-4 text-violet-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Profile Calibration</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Edit display name, usernames, bio attributes</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>
                        </div>
                      </div>

                      {/* Security & Privacy */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">Safety & Shielding</p>
                        <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
                          <button 
                            onClick={() => setSettingsActiveSubPanel('privacy')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Shield className="w-4 h-4 text-cyan-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Privacy Dashboard</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Tether visibility, manage mutes & blocked nodes</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>

                          <button 
                            onClick={() => setSettingsActiveSubPanel('security')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <LockKeyhole className="w-4 h-4 text-emerald-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Security Center</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Rotate passwords, passkeys, 2FA & active sessions</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>
                        </div>
                      </div>

                      {/* Preferences */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">User Experience</p>
                        <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
                          <button 
                            onClick={() => setSettingsActiveSubPanel('notifications')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Bell className="w-4 h-4 text-pink-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Notifications Control</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Sieve likes, comments, DM alert triggers</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>

                          <button 
                            onClick={() => setSettingsActiveSubPanel('appearance')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Sliders className="w-4 h-4 text-amber-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Appearance & Canvas</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Dynamic live theme mood, fonts, sizes & colors</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>

                          <button 
                            onClick={() => setSettingsActiveSubPanel('storage')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Layers className="w-4 h-4 text-purple-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Storage & Performance</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Clear data cache, data savers, video loop rules</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>
                        </div>
                      </div>

                      {/* Help & System parameters */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase text-zinc-500 tracking-widest pl-2">System Support</p>
                        <div className="rounded-2xl bg-black/40 border border-white/5 overflow-hidden divide-y divide-white/5">
                          <button 
                            onClick={() => setSettingsActiveSubPanel('support')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <HelpCircle className="w-4 h-4 text-fuchsia-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">Technical Help Desk</p>
                                <p className="text-[9px] text-zinc-500 font-normal">Report software bugs or request functional nodes</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>

                          <button 
                            onClick={() => setSettingsActiveSubPanel('about')}
                            className="w-full p-3 flex items-center justify-between text-xs hover:bg-white/5 font-sans font-bold transition-all text-zinc-300 hover:text-white"
                          >
                            <span className="flex items-center gap-2.5">
                              <Info className="w-4 h-4 text-indigo-400" />
                              <div className="text-left">
                                <p className="leading-tight text-xs font-bold">About Nexora Matrix</p>
                                <p className="text-[9px] text-zinc-500 font-normal">System version, active network telemetry logs</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4 text-zinc-600" />
                          </button>
                        </div>
                      </div>

                      {/* Account Actions */}
                      <div className="space-y-1">
                        <p className="text-[9px] font-mono uppercase text-red-500/80 tracking-widest pl-2">Danger Core</p>
                        <div className="rounded-2xl bg-red-950/10 border border-red-500/15 overflow-hidden divide-y divide-red-950/20">
                          <button 
                            onClick={() => setConfirmingLogout(true)}
                            className="w-full p-3.5 flex items-center justify-between text-xs hover:bg-red-950/25 text-red-400 hover:text-red-300 font-sans font-black transition-all"
                          >
                            <span className="flex items-center gap-2.5">
                              <LogOut className="w-4 h-4" />
                              <div className="text-left">
                                <p className="leading-none text-xs font-extrabold">Terminate Node Session</p>
                                <p className="text-[9px] text-zinc-500 font-normal mt-1">Safely exit and lock local data logs</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => { setConfirmingDeleteAccount(true); setDeleteStep(1); }}
                            className="w-full p-3.5 flex items-center justify-between text-xs hover:bg-red-950/45 text-red-500 hover:text-red-400 font-sans font-black transition-all"
                          >
                            <span className="flex items-center gap-2.5">
                              <Trash2 className="w-4 h-4" />
                              <div className="text-left">
                                <p className="leading-none text-xs font-extrabold">Delete Nexora Node</p>
                                <p className="text-[9px] text-red-500/50 font-normal mt-1">Irreversible wipe of social graph and posts</p>
                              </div>
                            </span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                ) : (
                  /* Drill-Down Sub Panels */
                  <div className="space-y-4">
                    {/* Sub-panel Back Header */}
                    <button
                      onClick={() => { setSettingsActiveSubPanel('main'); setSupportSubmitted(false); }}
                      className="flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-violet-300 font-extrabold uppercase bg-violet-600/5 px-2.5 py-1.5 rounded-lg border border-violet-500/10"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Menu
                    </button>

                    {/* Drill down Panel 1: Account / Profile Details */}
                    {settingsActiveSubPanel === 'account' && (
                      <div className="space-y-4 text-left">
                        <div className="bg-[#0e0c24] p-4 rounded-2xl border border-violet-500/10 space-y-3.5">
                          <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block border-b border-white/5 pb-1.5">👤 PROFILE DETAILS</span>
                          
                          {/* Display name */}
                          <div className="space-y-1 text-xs">
                            <label className="text-zinc-400 font-mono text-[9px] uppercase">Display Name</label>
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 text-xs font-medium"
                            />
                          </div>

                          {/* Username */}
                          <div className="space-y-1 text-xs">
                            <label className="text-zinc-400 font-mono text-[9px] uppercase">@username ID</label>
                            <input
                              type="text"
                              value={editUsername}
                              onChange={(e) => setEditUsername(e.target.value)}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-hidden focus:border-violet-500 text-xs font-medium"
                            />
                          </div>

                          {/* Website */}
                          <div className="space-y-1 text-xs">
                            <label className="text-zinc-400 font-mono text-[9px] uppercase">Website Link</label>
                            <input
                              type="text"
                              value={editWebsite}
                              placeholder="e.g. nexora.ai"
                              onChange={(e) => setEditWebsite(e.target.value)}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 text-xs"
                            />
                          </div>

                          {/* Website */}
                          <div className="space-y-1 text-xs">
                            <label className="text-zinc-400 font-mono text-[9px] uppercase">Bio Description</label>
                            <textarea
                              value={editBio}
                              rows={3}
                              onChange={(e) => setEditBio(e.target.value)}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 text-xs leading-relaxed"
                            />
                          </div>

                          {/* Location */}
                          <div className="space-y-1 text-xs">
                            <label className="text-zinc-400 font-mono text-[9px] uppercase">Location</label>
                            <input
                              type="text"
                              value={editLocation}
                              onChange={(e) => setEditLocation(e.target.value)}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 text-xs"
                            />
                          </div>

                          {/* Save parameters */}
                          <button
                            onClick={handleSaveProfile}
                            className="w-full py-2.5 bg-linear-to-r from-violet-600 to-pink-500 text-white rounded-xl text-[10px] font-mono font-black uppercase tracking-widest"
                          >
                            Save Changes
                          </button>
                        </div>

                        {/* Camera Setup block */}
                        <div className="bg-[#0e0c24] p-4 rounded-2xl border border-violet-500/10 space-y-3">
                          <span className="text-[9px] font-mono text-pink-400 font-extrabold uppercase tracking-widest block">📸 PROFILE PHOTO</span>
                          {isWebcamActive ? (
                            <div className="space-y-2 text-center">
                              <video ref={videoRef} autoPlay playsInline className="w-40 h-40 object-cover mx-auto rounded-xl border border-pink-500/20 scale-x-[-1]" />
                              <div className="flex gap-2 justify-center">
                                <button onClick={capturePhoto} className="px-3 py-1.5 bg-emerald-600 text-white font-mono text-[9px] uppercase font-bold rounded-lg">Capture</button>
                                <button onClick={stopWebcam} className="px-3 py-1.5 bg-zinc-800 text-zinc-400 font-mono text-[9px] uppercase font-bold rounded-lg">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <img src={editAvatar} className="w-12 h-12 rounded-xl object-cover border border-violet-500/20" alt="" />
                              <div className="flex-1 space-y-1">
                                <button onClick={startWebcam} className="w-full py-1.5 bg-pink-500/10 border border-pink-500/20 hover:bg-pink-500/20 text-pink-300 font-mono text-[9px] uppercase font-bold rounded-lg">Take Photo</button>
                                <button onClick={() => {
                                  const pr = prompt('Enter Avatar URL:');
                                  if (pr) setEditAvatar(pr);
                                }} className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-mono text-[9px] uppercase font-bold rounded-lg">Insert Image URL</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 2: Privacy Dashboard */}
                    {settingsActiveSubPanel === 'privacy' && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-4">
                          <span className="text-[9px] font-mono text-cyan-400 font-extrabold uppercase tracking-widest block">🔒 PRIVACY SETTINGS</span>
                          
                          {/* Private Node account toggle */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-black/20">
                            <div className="space-y-0.5 text-left max-w-[80%]">
                              <p className="text-xs font-bold text-white">Private Account</p>
                              <p className="text-[9px] text-zinc-500 leading-normal">Approved followers can view your posts.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={isPrivateNode}
                              onChange={(e) => {
                                setIsPrivateNode(e.target.checked);
                                window.dispatchEvent(new CustomEvent('toast', { detail: e.target.checked ? '🔒 Account is now Private' : '🔓 Account is now Public' }));
                              }}
                              className="accent-cyan-400 h-4 w-4"
                            />
                          </div>

                          {/* Comments permission dropdown */}
                          <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-mono text-zinc-400 uppercase">Who Can Comment On Your Posts</label>
                            <select
                              value={commentAudience}
                              onChange={(e) => {
                                setCommentAudience(e.target.value);
                                window.dispatchEvent(new CustomEvent('toast', { detail: `💬 Comments set to: ${e.target.value}` }));
                              }}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                            >
                              <option value="everyone">Everyone (Open network)</option>
                              <option value="friends">Only Close Friends circles</option>
                              <option value="none">Disabled (Lock replies)</option>
                            </select>
                          </div>

                          {/* Mentions permission dropdown */}
                          <div className="space-y-1.5 text-left">
                            <label className="text-[10px] font-mono text-zinc-400 uppercase">Who Can Mention You</label>
                            <select
                              value={mentionAudience}
                              onChange={(e) => {
                                setMentionAudience(e.target.value);
                                window.dispatchEvent(new CustomEvent('toast', { detail: `🏷️ Mentions set to: ${e.target.value}` }));
                              }}
                              className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white"
                            >
                              <option value="everyone">Everyone (Open tag)</option>
                              <option value="followers">Only followers you know</option>
                              <option value="none">None (Deny tags)</option>
                            </select>
                          </div>
                        </div>

                        {/* Blocks & Mutes Manager */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3 text-left">
                          <span className="text-[9px] font-mono text-red-400 font-extrabold uppercase tracking-widest block">🚫 Restricted Accounts</span>
                          
                          <div className="space-y-2">
                            <p className="text-[10px] font-mono text-zinc-500">BLOCKED USERS ({blockedUsers.length})</p>
                            {blockedUsers.map(usr => (
                              <div key={usr} className="flex justify-between items-center bg-black/20 p-2 rounded-xl text-xs">
                                <span className="font-mono text-zinc-300">@{usr}</span>
                                <button 
                                  onClick={() => {
                                    setBlockedUsers(blockedUsers.filter(u => u !== usr));
                                    window.dispatchEvent(new CustomEvent('toast', { detail: `🔓 Unblocked @${usr}` }));
                                  }}
                                  className="text-[9px] font-mono font-black text-violet-400 uppercase hover:text-violet-300"
                                >
                                  Unblock
                                </button>
                              </div>
                            ))}

                            <p className="text-[10px] font-mono text-zinc-500 mt-2">MUTED USERS ({mutedUsers.length})</p>
                            {mutedUsers.map(usr => (
                              <div key={usr} className="flex justify-between items-center bg-black/20 p-2 rounded-xl text-xs">
                                <span className="font-mono text-zinc-300">@{usr}</span>
                                <button 
                                  onClick={() => {
                                    setMutedUsers(mutedUsers.filter(u => u !== usr));
                                    window.dispatchEvent(new CustomEvent('toast', { detail: `🔊 Unmuted @${usr}` }));
                                  }}
                                  className="text-[9px] font-mono font-black text-violet-400 uppercase hover:text-violet-300"
                                >
                                  Unmute
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 3: Security Center */}
                    {settingsActiveSubPanel === 'security' && (
                      <div className="space-y-4 text-left">
                        
                        {/* Overall security status badge */}
                        <div className="p-4 rounded-2xl bg-gradient-to-tr from-[#120e26] to-[#04120f] border border-emerald-500/20 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-[8px] font-mono text-emerald-400 font-extrabold tracking-widest uppercase block">NODE STATUS</span>
                            <h4 className="text-xs font-black text-white">🔐 Overall Security Score: 94%</h4>
                            <p className="text-[9px] text-zinc-400 font-sans mt-0.5">Two-factor keys and biometric logs fully aligned.</p>
                          </div>
                          <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-pulse" />
                        </div>

                        {/* Rotate Password Form */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3">
                          <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">🔑 Rotate Access Credentials</span>
                          
                          <div className="space-y-2 text-xs">
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-zinc-400 uppercase">Current Access Key</label>
                              <input 
                                type="password" 
                                placeholder="••••••••••••"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white font-mono" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-zinc-400 uppercase">New Access Key</label>
                              <input 
                                type="password" 
                                placeholder="Minimum 8 characters"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white font-mono" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-mono text-zinc-400 uppercase">Verify New Access Key</label>
                              <input 
                                type="password" 
                                placeholder="Match new access key"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white font-mono" 
                              />
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              if (!currentPassword || !newPassword || !confirmNewPassword) {
                                alert('⚠️ Please fill out all access key rotation forms.');
                                return;
                              }
                              if (newPassword.length < 8) {
                                alert('⚠️ Security protocol: Access key must be at least 8 characters.');
                                return;
                              }
                              if (newPassword !== confirmNewPassword) {
                                alert('⚠️ Calibration mismatch: Verify access keys do not align.');
                                return;
                              }
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmNewPassword('');
                              window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Security Key successfully rotated & encrypted!' }));
                            }}
                            className="w-full py-2 bg-violet-600 hover:bg-violet-500 text-white font-mono text-[9px] uppercase font-black tracking-wider rounded-lg transition-all"
                          >
                            Update Credentials
                          </button>
                        </div>

                        {/* Passkeys and 2FA */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3">
                          <span className="text-[9px] font-mono text-cyan-400 font-extrabold uppercase tracking-widest block">🛡️ Advanced Security Locks</span>
                          
                          <div className="flex items-center justify-between p-2 rounded-xl bg-black/20">
                            <div className="space-y-0.5 max-w-[80%]">
                              <p className="text-xs font-bold text-white">Passkeys Auth</p>
                              <p className="text-[9px] text-zinc-500 leading-normal">Authenticate securely using on-device biometric thumbprints.</p>
                            </div>
                            <input 
                              type="checkbox"
                              checked={passkeysEnabled}
                              onChange={(e) => {
                                setPasskeysEnabled(e.target.checked);
                                window.dispatchEvent(new CustomEvent('toast', { detail: e.target.checked ? '🔑 Biometric Passkey Enabled' : '🔑 Passkeys de-activated' }));
                              }}
                              className="accent-cyan-400 h-4 w-4"
                            />
                          </div>

                          <div className="flex items-center justify-between p-2 rounded-xl bg-black/20">
                            <div className="space-y-0.5 max-w-[80%]">
                              <p className="text-xs font-bold text-white">Two-Factor Auth (2FA)</p>
                              <p className="text-[9px] text-zinc-500 leading-normal">Request temporary TOTP tokens during logins.</p>
                            </div>
                            <input 
                              type="checkbox"
                              checked={twoFactorEnabled}
                              onChange={(e) => {
                                setTwoFactorEnabled(e.target.checked);
                                if (e.target.checked) setShowTwoFactorSetup(true);
                                else {
                                  setShowTwoFactorSetup(false);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: '🛡️ 2FA Key deactivated.' }));
                                }
                              }}
                              className="accent-cyan-400 h-4 w-4"
                            />
                          </div>

                          {showTwoFactorSetup && (
                            <div className="p-3 bg-black/50 rounded-xl border border-dashed border-violet-500/20 text-center space-y-2">
                              <p className="text-[10px] text-zinc-300 font-mono">Scan TOTP Secret Token:</p>
                              <div className="w-24 h-24 bg-white p-1 mx-auto rounded-lg">
                                <svg className="w-full h-full text-black" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zM14 2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h4v8h-4v-8z" />
                                </svg>
                              </div>
                              <p className="text-[9px] text-violet-400 font-mono font-bold select-all uppercase">Secret: NEXX ORAA LAGO SSS</p>
                              <button 
                                onClick={() => {
                                  setShowTwoFactorSetup(false);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: '🛡️ 2FA Code Verified successfully!' }));
                                }}
                                className="px-3 py-1 bg-violet-600 text-white rounded font-mono text-[9px] uppercase font-bold"
                              >
                                I Scanned It
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Recent Login sessions */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3">
                          <span className="text-[9px] font-mono text-amber-400 font-extrabold uppercase tracking-widest block">💻 Recent Login sessions</span>
                          
                          <div className="space-y-2">
                            {activeSessions.map(sess => (
                              <div key={sess.id} className="p-2.5 rounded-xl bg-black/20 border border-white/5 space-y-1 relative">
                                <div className="flex items-center gap-1.5">
                                  {sess.os.includes('mac') || sess.os.includes('Win') ? (
                                    <Laptop className="w-3.5 h-3.5 text-zinc-400" />
                                  ) : (
                                    <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                                  )}
                                  <span className="text-xs font-bold text-white leading-none">{sess.device}</span>
                                  {sess.current && (
                                    <span className="text-[8px] font-mono px-1 bg-emerald-500/20 text-emerald-400 rounded">Current</span>
                                  )}
                                </div>
                                <div className="text-[9px] text-zinc-500 font-mono leading-relaxed pl-5">
                                  <p>{sess.os} • {sess.browser}</p>
                                  <p>📍 {sess.location} • {sess.time}</p>
                                </div>
                                {!sess.current && (
                                  <button
                                    onClick={() => {
                                      setActiveSessions(activeSessions.filter(s => s.id !== sess.id));
                                      window.dispatchEvent(new CustomEvent('toast', { detail: '🔌 Disconnected device node session!' }));
                                    }}
                                    className="absolute right-2 top-2 text-[9px] font-mono font-bold text-red-400 hover:text-red-300 uppercase"
                                  >
                                    Sign Out
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <button 
                            onClick={() => {
                              setActiveSessions(activeSessions.filter(s => s.current));
                              window.dispatchEvent(new CustomEvent('toast', { detail: '🔌 Terminated all other active browser links.' }));
                            }}
                            className="w-full py-1.5 bg-red-600/15 border border-red-500/20 text-red-300 font-mono text-[9px] uppercase font-black tracking-wider rounded-lg hover:bg-red-950/20"
                          >
                            Sign Out Of All Other Sessions
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 4: Notification preferences */}
                    {settingsActiveSubPanel === 'notifications' && (
                      <div className="space-y-4 text-left">
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3.5">
                          <span className="text-[9px] font-mono text-pink-400 font-extrabold uppercase tracking-widest block">🔔 PUSH PREFERENCES</span>
                          <p className="text-[10px] text-zinc-400 leading-normal font-sans">Sieve incoming telemetry signals on this device container.</p>
                          
                          <div className="space-y-3">
                            {[
                              { key: 'likes', title: 'Sparks & Likes', desc: 'Get notified when a node sparks your content' },
                              { key: 'comments', title: 'Replies & Comments', desc: 'Alerts for comments on your live grids' },
                              { key: 'mentions', title: 'Mentions & Tags', desc: 'Alerts when someone references your handle' },
                              { key: 'reposts', title: 'Reposts & Shares', desc: 'Notifications for shared updates' },
                              { key: 'directMessages', title: 'Direct Messages', desc: 'Instant alerts for incoming chat packets' },
                              { key: 'systemAlerts', title: 'System Grid Alerts', desc: 'Matrix network warnings and security pings' }
                            ].map(item => (
                              <div key={item.key} className="flex items-center justify-between p-2 rounded-xl bg-black/20">
                                <div className="space-y-0.5 text-left max-w-[80%]">
                                  <p className="text-xs font-bold text-white leading-tight">{item.title}</p>
                                  <p className="text-[9px] text-zinc-500 leading-normal">{item.desc}</p>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={(notifToggles as any)[item.key]}
                                  onChange={(e) => {
                                    setNotifToggles({
                                      ...notifToggles,
                                      [item.key]: e.target.checked
                                    });
                                    window.dispatchEvent(new CustomEvent('toast', { detail: e.target.checked ? `🔔 Notifications enabled for: ${item.title}` : `🔕 Silenced notifications for: ${item.title}` }));
                                  }}
                                  className="accent-pink-500 h-4 w-4 shrink-0"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 5: Appearance and Canvas */}
                    {settingsActiveSubPanel === 'appearance' && (
                      <div className="space-y-4 text-left">
                        
                        {/* Themes Cards selection */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3">
                          <span className="text-[9px] font-mono text-amber-400 font-extrabold uppercase tracking-widest block">🎨 Live Canvas Theme Mood</span>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'neon-cyber', label: 'Cyber Violet', bg: 'bg-[#050409]', border: 'border-violet-500/40 text-violet-300' },
                              { id: 'emerald-glass', label: 'Emerald Glass', bg: 'bg-[#010403]', border: 'border-emerald-600/40 text-emerald-400' },
                              { id: 'platinum-light', label: 'Platinum Light', bg: 'bg-[#f4f6fa]', border: 'border-slate-300 text-slate-800' },
                              { id: 'stealth-dark', label: 'Stealth Dark', bg: 'bg-zinc-950', border: 'border-zinc-800 text-zinc-400' }
                            ].map(mood => (
                              <button
                                key={mood.id}
                                onClick={() => {
                                  setTheme?.(mood.id as any);
                                  localStorage.setItem('nexora_theme', mood.id);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: `🎨 Switch to: ${mood.label} Theme!` }));
                                }}
                                className={`p-3 rounded-xl border text-xs font-bold font-sans transition-all flex flex-col justify-between h-16 ${mood.bg} ${
                                  theme === mood.id 
                                    ? 'ring-2 ring-violet-500 scale-[1.02]' 
                                    : 'opacity-85 hover:opacity-100 border-white/5'
                                }`}
                              >
                                <span className={`text-[9px] font-mono uppercase tracking-widest ${mood.border}`}>{mood.label}</span>
                                <div className="flex gap-1">
                                  <span className="w-2 h-2 rounded-full bg-violet-500" />
                                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                                  <span className="w-2 h-2 rounded-full bg-cyan-500" />
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Accent pickers */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3">
                          <span className="text-[9px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">⚡ Glow Accent Color</span>
                          <div className="flex gap-2">
                            {[
                              { id: 'violet', color: 'bg-violet-600 shadow-violet-500/50' },
                              { id: 'pink', color: 'bg-pink-500 shadow-pink-500/50' },
                              { id: 'emerald', color: 'bg-emerald-500 shadow-emerald-500/50' },
                              { id: 'cyan', color: 'bg-cyan-500 shadow-cyan-500/50' }
                            ].map(ac => (
                              <button
                                key={ac.id}
                                onClick={() => {
                                  setAccentColor(ac.id);
                                  window.dispatchEvent(new CustomEvent('toast', { detail: `✨ Accent glow: ${ac.id}` }));
                                }}
                                className={`flex-1 h-8 rounded-xl transition-all cursor-pointer relative flex items-center justify-center ${ac.color} shadow-sm ${
                                  accentColor === ac.id ? 'ring-2 ring-white scale-105' : 'hover:scale-102'
                                }`}
                              >
                                {accentColor === ac.id && <Check className="w-4 h-4 text-white" />}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Typography customizer */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3">
                          <span className="text-[9px] font-mono text-pink-400 font-extrabold uppercase tracking-widest block">✍️ TYPOGRAPHY SCALES</span>
                          
                          {/* Text size selector */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase">Text size zoom</label>
                            <div className="flex justify-between bg-black/30 p-1 rounded-xl">
                              {['xs', 'sm', 'medium', 'lg', 'xl'].map(sz => (
                                <button
                                  key={sz}
                                  onClick={() => {
                                    setTextSize(sz);
                                    window.dispatchEvent(new CustomEvent('toast', { detail: `🔎 Sizing preset set to: ${sz}` }));
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase font-black transition-all ${
                                    textSize === sz 
                                      ? 'bg-violet-600 text-white shadow-xs' 
                                      : 'text-zinc-500 hover:text-zinc-300'
                                  }`}
                                >
                                  {sz}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Font selection */}
                          <div className="space-y-1 mt-2">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase">Typography pairing</label>
                            <div className="flex justify-between bg-black/30 p-1 rounded-xl">
                              {[
                                { id: 'sans', label: 'Inter Sans' },
                                { id: 'mono', label: 'JetBrains' },
                                { id: 'space', label: 'Grotesk' }
                              ].map(fnt => (
                                <button
                                  key={fnt.id}
                                  onClick={() => {
                                    setCustomFont(fnt.id);
                                    window.dispatchEvent(new CustomEvent('toast', { detail: `🔤 Font family set to: ${fnt.label}` }));
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-mono uppercase font-black transition-all ${
                                    customFont === fnt.id 
                                      ? 'bg-violet-600 text-white shadow-xs' 
                                      : 'text-zinc-500 hover:text-zinc-300'
                                  }`}
                                >
                                  {fnt.label.split(' ')[0]}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 6: Storage and Performance */}
                    {settingsActiveSubPanel === 'storage' && (
                      <div className="space-y-4 text-left">
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3.5">
                          <span className="text-[9px] font-mono text-cyan-400 font-extrabold uppercase tracking-widest block">💾 LOCAL CACHE RE-CALIBRATION</span>
                          
                          {/* Cache size meter */}
                          <div className="bg-black/30 p-3.5 rounded-xl border border-white/5 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-sans text-zinc-400">Total Cache Storage</span>
                              <span className="font-mono text-white font-bold">{cacheSize}</span>
                            </div>
                            
                            {/* Visual SVG Progress loader bar */}
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="h-full bg-linear-to-r from-violet-600 to-pink-500 rounded-full" style={{ width: cacheSize === '0.0 B' ? '0%' : '65%' }} />
                            </div>
                            <p className="text-[9px] text-zinc-500 font-sans leading-normal">Asset logs represent downloaded avatars, thumbnails, and cache metadata indexes.</p>
                          </div>

                          <button
                            onClick={() => {
                              const conf = window.confirm('🧹 Clear system temporary local cache indices? This action will reload necessary images.');
                              if (conf) {
                                setCacheSize('Recalibrating cache...');
                                window.dispatchEvent(new CustomEvent('toast', { detail: '🧹 Emptying temporary asset indexes...' }));
                                setTimeout(() => {
                                  setCacheSize('0.0 B');
                                  window.dispatchEvent(new CustomEvent('toast', { detail: '✨ All 128 MB cache cleared!' }));
                                }, 1500);
                              }
                            }}
                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-mono text-[9px] uppercase font-black tracking-wider rounded-lg transition-all"
                          >
                            Empty Device Cache Logs
                          </button>
                        </div>

                        {/* Performance toggles */}
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3.5">
                          <span className="text-[9px] font-mono text-amber-400 font-extrabold uppercase tracking-widest block">🏎️ Performance & Compression</span>
                          
                          {/* Data saver */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-black/20">
                            <div className="space-y-0.5 text-left max-w-[80%]">
                              <p className="text-xs font-bold text-white leading-tight">Data Saver</p>
                              <p className="text-[9px] text-zinc-500 leading-normal">Limit resolution of video clips on mobile grids.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={dataSaver}
                              onChange={(e) => {
                                setDataSaver(e.target.checked);
                                window.dispatchEvent(new CustomEvent('toast', { detail: e.target.checked ? '📶 Data Saver Enabled' : '📶 High resolution stream activated' }));
                              }}
                              className="accent-amber-400 h-4 w-4 shrink-0"
                            />
                          </div>

                          {/* Autoplay */}
                          <div className="flex items-center justify-between p-2 rounded-xl bg-black/20">
                            <div className="space-y-0.5 text-left max-w-[80%]">
                              <p className="text-xs font-bold text-white leading-tight">Autoplay Feed Videos</p>
                              <p className="text-[9px] text-zinc-500 leading-normal">Immediately spin up clips on screen scrolling.</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={autoplayVideos}
                              onChange={(e) => {
                                setAutoplayVideos(e.target.checked);
                                window.dispatchEvent(new CustomEvent('toast', { detail: e.target.checked ? '🎥 Autoplay active' : '🎥 Autoplay silent' }));
                              }}
                              className="accent-amber-400 h-4 w-4 shrink-0"
                            />
                          </div>

                          {/* Upload quality */}
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-mono text-zinc-500 uppercase">Multimedia Upload resolution</label>
                            <select
                              value={mediaQuality}
                              onChange={(e) => {
                                setMediaQuality(e.target.value);
                                window.dispatchEvent(new CustomEvent('toast', { detail: `🚀 Upload set to: ${e.target.value.toUpperCase()}` }));
                              }}
                              className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white font-sans"
                            >
                              <option value="standard">Standard Speed (Compressed)</option>
                              <option value="high">HD Quality (Pro High-Res)</option>
                              <option value="lossless">Lossless Raw (Lekki locale grid node)</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 7: Technical support desk */}
                    {settingsActiveSubPanel === 'support' && (
                      <div className="space-y-4 text-left">
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3">
                          <span className="text-[9px] font-mono text-pink-400 font-extrabold uppercase tracking-widest block">💬 Lagos Technical Grid Support</span>
                          
                          {supportSubmitted ? (
                            <div className="p-6 text-center space-y-3 bg-black/20 rounded-xl border border-emerald-500/20">
                              <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                                <Check className="w-5 h-5" />
                              </div>
                              <h4 className="text-xs font-bold text-emerald-400">Transmission Dispatched!</h4>
                              <p className="text-[9px] text-zinc-500 font-mono leading-relaxed">Your report packet has been assigned to ticket ID #{Math.floor(Math.random() * 9000) + 1000}. A technical agent node will calibrate soon.</p>
                            </div>
                          ) : (
                            <div className="space-y-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[9px] font-mono text-zinc-400 uppercase">Ticket Category</label>
                                <select
                                  value={supportCategory}
                                  onChange={(e) => setSupportCategory(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white"
                                >
                                  <option value="feedback">Product Feedback Idea</option>
                                  <option value="bug">Report Matrix Software Bug</option>
                                  <option value="auth">ID Verification Help</option>
                                  <option value="billing">NEX Coin Monetization</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-mono text-zinc-400 uppercase">Describe Node Issue</label>
                                <textarea
                                  placeholder="Describe what occurred, including system parameters..."
                                  value={supportMessage}
                                  rows={4}
                                  onChange={(e) => setSupportMessage(e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-black/40 border border-white/10 rounded-lg text-white"
                                />
                              </div>

                              <button
                                onClick={() => {
                                  if (!supportMessage.trim()) {
                                    alert('⚠️ Please explain the issue details.');
                                    return;
                                  }
                                  setSupportSubmitted(true);
                                  setSupportMessage('');
                                }}
                                className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white font-mono text-[9px] uppercase font-black tracking-wider rounded-lg transition-all"
                              >
                                Transmit Ticket Packet
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Drill down Panel 8: About Nexora Matrix */}
                    {settingsActiveSubPanel === 'about' && (
                      <div className="space-y-4 text-left">
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-violet-500/10 space-y-3 font-mono">
                          <span className="text-[9px] text-violet-400 font-extrabold uppercase tracking-widest block">ℹ️ TELEMETRY SYSTEM VERSION</span>
                          
                          <div className="space-y-2 text-[10px] leading-relaxed text-zinc-300">
                            <p className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">SYSTEM:</span> <span>Nexora Premium Mesh</span></p>
                            <p className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">BUILD INDEX:</span> <span>v1.8.4_Lagos_live</span></p>
                            <p className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">LOCALE NODE:</span> <span>Lekki Grid Grid-04</span></p>
                            <p className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">COMPILER:</span> <span>TypeScript ESM esbuild</span></p>
                            <p className="flex justify-between pb-1"><span className="text-zinc-500">PORT MAPPING:</span> <span>Container Ingress 3000</span></p>
                          </div>
                          
                          <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-1.5 text-[9px] text-zinc-400 font-sans leading-relaxed">
                            <p className="font-bold text-zinc-300">Terms of Service Calibration</p>
                            <p>By connecting a digital node, you consent to cryptographically secure and sandboxed content distribution policies throughout the Nigerian mesh network nodes.</p>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* Drawer footer close trigger */}
              <div className="shrink-0 pt-4 border-t border-white/5">
                <button
                  onClick={() => { setActivePanel('profile'); setSettingsActiveSubPanel('main'); setSettingsSearchQuery(''); }}
                  className="w-full py-3.5 bg-violet-950 hover:bg-violet-900 text-violet-300 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition-all"
                >
                  Close Settings Control Panel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog 1: Safe Log Out Confirmation Overlay */}
      <AnimatePresence>
        {confirmingLogout && (
          <div className="fixed inset-0 z-210 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0926] border border-red-500/25 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl relative"
            >
              <div className="w-12 h-12 rounded-full bg-red-600/10 text-red-500 flex items-center justify-center mx-auto">
                <LogOut className="w-6 h-6 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider">Sign Out?</h3>
                <p className="text-[10px] text-zinc-400 font-mono leading-normal">
                  Are you sure you want to log out of Nexora on this device?
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px] uppercase font-black">
                <button
                  onClick={() => setConfirmingLogout(false)}
                  className="p-3 bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-zinc-400 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setConfirmingLogout(false);
                    onLogout?.();
                    setActivePanel('profile');
                    setSettingsActiveSubPanel('main');
                  }}
                  className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl transition-all"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog 2: Safe Account Delete Multi-Step Overlay */}
      <AnimatePresence>
        {confirmingDeleteAccount && (
          <div className="fixed inset-0 z-210 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0c0926] border border-red-500/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-2xl"
            >
              <div className="w-12 h-12 rounded-full bg-red-600/20 text-red-500 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              </div>

              {deleteStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider text-red-400">DELETE ACCOUNT</h3>
                    <p className="text-[10px] text-zinc-300 font-mono leading-normal">
                      WARNING: Proceeding will completely delete your account, your followers, and all of your posts. This action cannot be undone.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px] uppercase font-black">
                    <button
                      onClick={() => setConfirmingDeleteAccount(false)}
                      className="p-3 bg-zinc-900 border border-white/5 text-zinc-400 rounded-2xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => setDeleteStep(2)}
                      className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-sans font-black text-white uppercase tracking-wider">Confirm Your Password</h3>
                    <p className="text-[10px] text-zinc-400 font-mono leading-normal">
                      Please enter your password to confirm account deletion.
                    </p>
                    <input 
                      type="password"
                      placeholder="Password"
                      value={deleteAccountPassword}
                      onChange={(e) => setDeleteAccountPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-red-500/30 rounded-xl text-center text-white text-xs font-mono tracking-widest mt-2"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[10px] uppercase font-black">
                    <button
                      onClick={() => setConfirmingDeleteAccount(false)}
                      className="p-3 bg-zinc-900 border border-white/5 text-zinc-400 rounded-2xl"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (!deleteAccountPassword) {
                          alert('⚠️ Please enter your password.');
                          return;
                        }
                        setDeleteStep(3);
                        setDeleteAccountPassword('');
                        window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Deleting Nexora Account...' }));
                        setTimeout(() => {
                          setConfirmingDeleteAccount(false);
                          onLogout?.();
                          window.location.reload();
                        }, 2500);
                      }}
                      className="p-3 bg-red-600 hover:bg-red-500 text-white rounded-2xl"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === 3 && (
                <div className="space-y-3 py-4">
                  <div className="w-10 h-10 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-mono text-red-400 font-extrabold uppercase animate-pulse">PERMANENTLY DELETING ACCOUNT...</p>
                  <p className="text-[9px] text-zinc-500 font-mono">Thank you for being part of Nexora.</p>
                </div>
              )}

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
                      📡 Syncing your feed data back to Lagos, Nigeria.
                    </div>
                  </div>
                )}
              </div>

              {/* Growth Analytics Trend with dynamic SVG Chart */}
              <div className="p-6 rounded-3xl bg-[#0b081c] border border-violet-500/10 space-y-6 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/5 pb-4">
                  <div>
                    <h3 className="text-sm font-sans font-bold text-violet-100 uppercase tracking-wide">Follower Network Metrics</h3>
                    <p className="text-[10px] text-zinc-400 font-mono">Profile analytics and engagement metrics</p>
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
                <span className="text-[10px] font-mono text-cyan-400 font-extrabold uppercase tracking-widest block">ACCOUNT QR CODE</span>
                <h3 className="text-sm font-sans font-black text-white uppercase">Your Nexora QR Code</h3>
                <p className="text-[10px] text-zinc-400 font-mono">Scan on any device to instantly view this profile</p>
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
                  placeholder="Search by username..."
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
                        ⚠️ No accounts match your query.
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
                              window.dispatchEvent(new CustomEvent('toast', { detail: '🔓 Account unblocked!' }));
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
                              window.dispatchEvent(new CustomEvent('toast', { detail: '🔊 Account unmuted!' }));
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
                  <ArrowLeft className="w-4 h-4" /> Cancel
                </button>
                <span className="text-xs font-mono text-zinc-400 font-extrabold uppercase">Edit Profile Settings</span>
              </div>

              {/* Two columns: Form on left, live preview on right */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Left: Input Form */}
                <div className="space-y-4">
                  <div className="bg-[#0b081c] p-6 rounded-3xl border border-violet-500/15 space-y-4">
                    <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block border-b border-white/5 pb-2">✏️ PROFILE DETAILS</span>
                    
                    {/* Display name */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Display Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 font-medium"
                      />
                    </div>

                    {/* Username */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Username</label>
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
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Bio Summary</label>
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
                        <label className="text-zinc-400 font-mono text-[10px] uppercase">Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500"
                        >
                          <option value="Digital Creator">Digital Creator</option>
                          <option value="Founder Mindset">Founder Mindset</option>
                          <option value="Community Leader">Community Leader</option>
                          <option value="Technical Support">Technical Support</option>
                        </select>
                      </div>

                      <div className="space-y-1 text-xs">
                        <label className="text-zinc-400 font-mono text-[10px] uppercase">Creator Type</label>
                        <select
                          value={editCreatorType}
                          onChange={(e) => setEditCreatorType(e.target.value)}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500"
                        >
                          <option value="Premium Node">Premium</option>
                          <option value="Standard Node">Standard</option>
                          <option value="Collaborator Node">Collaborator</option>
                        </select>
                      </div>
                    </div>

                  </div>

                  {/* Avatar photo editor with Webcam selfie capability */}
                  <div className="bg-[#0b081c] p-6 rounded-3xl border border-violet-500/15 space-y-4">
                    <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block border-b border-white/5 pb-2">📸 PROFILE PHOTO</span>
                    
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
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pl-2">🔴 LIVE PREVIEW</span>
                    
                    {/* Simplified Profile Header simulation */}
                    <div className="bg-[#0b0922] border border-violet-500/20 rounded-[32px] p-6 text-center space-y-4 shadow-xl">
                      <div className="relative w-20 h-20 rounded-[18px] bg-black overflow-hidden mx-auto border-2 border-violet-500">
                        <img src={editAvatar} className="w-full h-full object-cover" alt="live preview avatar" />
                      </div>
                      <div className="leading-tight">
                        <h4 className="text-sm font-sans font-black text-white flex items-center justify-center gap-1">
                          {editName || 'UNNAMED PROFILE'} <PurpleVerifiedBadge className="w-4 h-4" />
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
