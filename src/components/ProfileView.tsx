import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Link as LinkIcon, Calendar, Edit3, Check, Heart, MessageSquare, Award, Zap, Sparkles, Play, Pause, Volume2, Users, Compass, FileText, UserPlus, MessageCircle, Download, Terminal, Pin, Flame, UserCheck, Search, X, ArrowLeft, Settings, Shield, Lock, Eye, Bell, BellOff, Ban, Flag, Sliders, Globe, Trash2, HelpCircle, Info, Activity, Video, Film, Camera, Image as ImageIcon, Mic, Menu, BarChart2, FolderClosed, QrCode, AlertTriangle, LogOut, ChevronRight, TrendingUp, TrendingDown, Coins, Music, Plus, Tv, EyeOff, UserX, VolumeX, CheckCircle2, LockKeyhole, Briefcase, Layers, Crown, Laptop, Smartphone, Key, RefreshCw, ChevronDown, LayoutGrid, Bookmark, Repeat2, HardDrive, Share2, MoreVertical, MoreHorizontal, Radio, ShieldCheck } from 'lucide-react';
import VohIcon from './VohIcon';
import ShareSheet from './ShareSheet';
import { motion, AnimatePresence } from 'motion/react';
import { User, Post } from '../types';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import NexoraBranding from './NexoraBranding';
import { validateUsername } from '../utils/username';
import RelativeTimestamp from './RelativeTimestamp';
import NexoraVideoPlayer from './NexoraVideoPlayer';
import NexoraLoader from './NexoraLoader';
import NexoraVideo from './NexoraVideo';
import CreatorDashboardView from './CreatorDashboardView';
import ImmersiveVideoViewer from './ImmersiveVideoViewer';
import StorageDataCenterModal from './StorageDataCenterModal';
import { 
  getFollowersCount, 
  getFollowingCount, 
  getReputationPoints, 
  getSparksReceived, 
  getContributionsCount, 
  getRichUser,
  getDefaultAvatar
} from '../data/database';

interface MediaGridProps {
  gridPosts: Post[];
  pinnedPostIds: string[];
  onSelectPost: (post: Post) => void;
}

const MediaGrid = React.memo(({ gridPosts, pinnedPostIds, onSelectPost }: MediaGridProps) => {
  if (gridPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6 w-full col-span-3">
        <div className="w-20 h-20 bg-linear-to-br from-violet-600/20 to-pink-500/20 rounded-full flex items-center justify-center mb-6 border border-white/5">
          <Camera className="w-8 h-8 text-violet-400" />
        </div>
        <p className="text-sm font-black text-white mb-1">No posts yet.</p>
        <p className="text-[11px] text-zinc-500 font-sans max-w-[200px] leading-relaxed">
          When you share your first post, it will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-[1px] w-full bg-black">
      {gridPosts.map(post => {
        const isVoice = post.isVoice || post.content.includes('🎙') || post.voiceDuration;
        const isVideo = !!post.videoUrl;
        const isPinned = pinnedPostIds.includes(post.id);
        
        return (
          <motion.div
            layout
            key={post.id}
            onClick={() => onSelectPost(post)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="group aspect-[2/3] overflow-hidden relative cursor-pointer bg-[#050314]/90 rounded-none flex flex-col justify-between"
          >
            {/* Thumbnail Container */}
            <div className="absolute inset-0 w-full h-full z-0">
              {post.image ? (
                <img 
                  src={post.image} 
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" 
                  alt={post.content}
                  referrerPolicy="no-referrer"
                />
              ) : isVideo ? (
                <div className="w-full h-full bg-slate-950 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-tr from-violet-950/40 via-[#0a0521]/90 to-[#2c0b3d]/30" />
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-pink-500/5 to-transparent animate-pulse" />
                  <NexoraVideo 
                    src={post.videoUrl ? `${post.videoUrl}#t=0.001` : ''} 
                    className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity relative z-10" 
                    preload="metadata" 
                    muted 
                    playsInline
                  />
                  <div className="absolute top-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-full z-20">
                    <Film className="w-3.5 h-3.5 text-pink-400 animate-pulse" />
                  </div>
                  {/* Consistent Bottom overlays for video count and duration */}
                  <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-white text-[9px] font-mono font-bold z-20 flex items-center gap-1">
                    <Play className="w-2 h-2 fill-white text-white" />
                    {(() => {
                      const views = post.views !== undefined ? post.views : 0;
                      const formatted = views >= 1000000 
                        ? (views / 1000000).toFixed(1).replace(/\.0$/, '') + 'M' 
                        : views >= 1000 
                          ? (views / 1000).toFixed(1).replace(/\.0$/, '') + 'K' 
                          : views.toString();
                      return `${formatted}`;
                    })()}
                  </div>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-md rounded text-white text-[9px] font-mono font-bold z-20">
                    {post.videoDuration || (() => {
                      const num = post.id.charCodeAt(post.id.length - 1) || 12;
                      const secs = (num % 45) + 10;
                      return `0:${secs < 10 ? '0' + secs : secs}`;
                    })()}
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
                        <span className="text-[8px] font-mono text-violet-400/50">Nexora App</span>
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
});

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
  onOpenVohAi?: () => void;
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
  showPWAInstallPrompt,
  onOpenVohAi
}: ProfileViewProps) {
  // Navigation State
  const [activePanel, setActivePanel] = useState<'profile' | 'edit-profile' | 'menu' | 'creator-studio' | 'qr-profile' | 'social-graph' | 'collections' | 'subscriptions' | 'linked-accounts' | 'other-profile-menu'>('profile');
  const [profileTab, setProfileTab] = useState<string>('media');
  const [userBookmarks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`nexora_bookmarks_${currentUser.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [userSparks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`nexora_sparks_${currentUser.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [allContentFilter, setAllContentFilter] = useState<'all' | 'videos' | 'photos' | 'posts' | 'pinned'>('all');
  const [showAllContentDropdown, setShowAllContentDropdown] = useState(false);
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const [selectedGridPost, setSelectedGridPost] = useState<Post | null>(null);
  const [detailCommentText, setDetailCommentText] = useState<string>('');
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const profileTabsList = ['media', 'voice', 'reposts', 'sparks', 'bookmarks', 'archive'];

  const handleContentTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleContentTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartPos.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartPos.current.y;
    touchStartPos.current = null;

    // Only switch if deltaX is significant and clearly horizontal (at least 60px and 1.8x deltaY)
    if (Math.abs(deltaX) > 60 && Math.abs(deltaX) > Math.abs(deltaY) * 1.8) {
      const currentIndex = profileTabsList.indexOf(profileTab);
      if (deltaX < 0 && currentIndex < profileTabsList.length - 1) {
        // Swiped left -> next tab
        setProfileTab(profileTabsList[currentIndex + 1]);
      } else if (deltaX > 0 && currentIndex > 0) {
        // Swiped right -> prev tab
        setProfileTab(profileTabsList[currentIndex - 1]);
      }
    }
  };

  useEffect(() => {
    setIsLoadingProfile(true);
    const timer = setTimeout(() => {
      setIsLoadingProfile(false);
    }, 450);
    return () => clearTimeout(timer);
  }, [currentUser.id]);

  useEffect(() => {
    const handleCustomTabChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.subTab) {
        const sub = customEvent.detail.subTab;
        if (sub === 'saved') {
          setActivePanel('collections');
        } else if (sub === 'wallet') {
          setActivePanel('creator-studio');
        } else if (sub === 'settings') {
          setActivePanel('menu');
        }
      }
    };

    window.addEventListener('changeTab', handleCustomTabChange);
    return () => window.removeEventListener('changeTab', handleCustomTabChange);
  }, []);

  // Redesigned Settings & Privacy Hub state
  const [settingsSearchQuery, setSettingsSearchQuery] = useState('');
  const [settingsActiveSubPanel, setSettingsActiveSubPanel] = useState<'main' | 'account' | 'privacy' | 'security' | 'notifications' | 'appearance' | 'storage' | 'support' | 'about'>('main');
  
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(() => {
    return localStorage.getItem(`nexora_notify_${currentUser.id}`) === 'true';
  });

  useEffect(() => {
    setIsNotificationsEnabled(localStorage.getItem(`nexora_notify_${currentUser.id}`) === 'true');
  }, [currentUser.id]);
  
  // Storage & Performance
  const [cacheSize, setCacheSize] = useState('128.4 MB');
  const [dataSaver, setDataSaver] = useState(false);
  const [autoplayVideos, setAutoplayVideos] = useState(true);
  const [mediaQuality, setMediaQuality] = useState('high'); // 'standard' | 'high' | 'lossless'
  const [isStorageCenterOpen, setIsStorageCenterOpen] = useState(false);

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
  const [showShareModal, setShowShareModal] = useState(false);

  // Realistic Saving UX states
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);

  // Relationship states (Muted / Blocked lists)
  const [relationsTab, setRelationsTab] = useState<'followers' | 'following' | 'close-friends' | 'blocked' | 'muted'>('followers');
  const [searchRelationQuery, setSearchRelationQuery] = useState('');
  
  // Stateful Subscriptions

  const [subscriptionsTab, setSubscriptionsTab] = useState<'active' | 'plans' | 'exclusive'>('active');
  const [activeSubscriptions, setActiveSubscriptions] = useState([
    { name: 'Dr. Jane Smith', username: 'drjane', plan: 'Gold Supporter', price: '$4.99/mo', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60' },
    { name: 'Tech Insider', username: 'techinsider', plan: 'Premium Access', price: '$9.99/mo', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=60' }
  ]);
  const [mySubscriptionPlans, setMySubscriptionPlans] = useState([
    { tier: 'Bronze Supporter', price: '$1.99', perks: 'Premium profile badge, early post access' },
    { tier: 'Silver Supporter', price: '$4.99', perks: 'Bronze perks, exclusive chat, priority Q&A' },
    { tier: 'Gold Supporter', price: '$9.99', perks: 'Silver perks, monthly live stream, custom emotes' }
  ]);
  const [exclusiveContentList, setExclusiveContentList] = useState([
    { id: 'ex-1', title: 'Nexora AI Alpha Testing Guide', creator: 'voh', type: 'Article', date: 'Jul 5, 2026', locked: true },
    { id: 'ex-2', title: 'Behind the Scenes of Nexora Studio v1.2', creator: 'voh', type: 'Video', date: 'Jun 28, 2026', locked: true },
    { id: 'ex-3', title: 'Acoustic Broadcast Session (Lossless)', creator: 'drjane', type: 'Audio', date: 'Jun 15, 2026', locked: true }
  ]);
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

  // Profile dropdown menu state
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Exquisite Interactive Avatar modal editor state
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [avatarSourceType, setAvatarSourceType] = useState<'select' | 'webcam' | 'gallery_edit'>('select');
  const [galleryImage, setGalleryImage] = useState<string | null>(null);
  const [avatarZoom, setAvatarZoom] = useState(1.0);
  const [avatarRotation, setAvatarRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleGalleryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setGalleryImage(reader.result as string);
        setAvatarSourceType('gallery_edit');
        setAvatarZoom(1.0);
        setAvatarRotation(0);
      };
      reader.readAsDataURL(file);
    }
  };

  const capturePhotoToGallery = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, 400, 400);
        const dataUrl = canvas.toDataURL('image/jpeg');
        stopWebcam();
        setGalleryImage(dataUrl);
        setAvatarSourceType('gallery_edit');
        setAvatarZoom(1.0);
        setAvatarRotation(0);
        window.dispatchEvent(new CustomEvent('toast', { detail: '📸 Frame captured! Now crop and zoom your photo.' }));
      }
    }
  };

  const handleSaveCroppedAvatar = () => {
    if (!galleryImage) return;

    const img = new Image();
    img.src = galleryImage;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = 300;
      canvas.width = size;
      canvas.height = size;

      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.rotate((avatarRotation * Math.PI) / 180);
      ctx.scale(avatarZoom, avatarZoom);

      const drawSize = size;
      const aspect = img.width / img.height;
      let dw, dh;
      if (aspect > 1) {
        dw = drawSize * aspect;
        dh = drawSize;
      } else {
        dw = drawSize;
        dh = drawSize / aspect;
      }
      ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();

      const finalDataUrl = canvas.toDataURL('image/jpeg');
      setEditAvatar(finalDataUrl);
      setIsAvatarModalOpen(false);
      setGalleryImage(null);
      setAvatarZoom(1.0);
      setAvatarRotation(0);
      window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Profile photo cropped & saved!' }));
    };
  };

  // Dynamic status presets
  const [statusText, setStatusText] = useState(() => localStorage.getItem(`nexora_status_text_${currentUser.id}`) || 'Exploring...');
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
  }, [currentUser.id]);

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
    if (isSavingProfile || showSavedFeedback) return;

    // 7-day display name lock
    if (editName !== currentUser.name) {
      const lastChange = currentUser.lastDisplayNameChangeTime;
      if (lastChange) {
        const diff = Date.now() - new Date(lastChange).getTime();
        const days = diff / (1000 * 60 * 60 * 24); // days limit
        if (days < 7) {
          window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Display Name change is locked for 7 days.' }));
          alert('⚠️ Change locked: Display name can only be edited once every 7 days.');
          return;
        }
      }
    }

    // 30-day username lock
    if (editUsername !== currentUser.username) {
      const usernameError = validateUsername(editUsername, currentUser.id);
      if (usernameError) {
        window.dispatchEvent(new CustomEvent('toast', { detail: `⚠️ ${usernameError}` }));
        alert(`⚠️ ${usernameError}`);
        return;
      }

      const lastChange = currentUser.lastUsernameChangeTime;
      if (lastChange) {
        const diff = Date.now() - new Date(lastChange).getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        if (days < 30) {
          window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Username change is locked for 30 days.' }));
          alert('⚠️ Change locked: @username can only be edited once every 30 days.');
          return;
        }
      }
    }

    // Start saving animation & lock controls
    setIsSavingProfile(true);

    setTimeout(() => {
      // Complete save
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

      setIsSavingProfile(false);
      setShowSavedFeedback(true);

      window.dispatchEvent(new CustomEvent('toast', { detail: '✓ Profile updated successfully' }));

      // Wait 1.5s for the success message feedback, then transition back smoothly
      setTimeout(() => {
        setShowSavedFeedback(false);
        setActivePanel('profile');
      }, 1500);

    }, 1200);
  };

  const handleCancelEditProfile = () => {
    stopWebcam();
    setEditName(currentUser.name);
    setEditUsername(currentUser.username);
    setEditBio(currentUser.bio);
    setEditLocation(currentUser.location || '');
    setEditWebsite(currentUser.website || '');
    setEditAvatar(currentUser.avatar);
    setEditCover(currentUser.coverImage);
    setActivePanel('profile');
    window.dispatchEvent(new CustomEvent('toast', { detail: '❌ Re-calibration cancelled. No changes saved.' }));
  };

  // Switch accounts action
  const handleSwitchAccount = (acc: any) => {
    window.dispatchEvent(new CustomEvent('toast', { detail: `🔄 Switching account to @${acc.username}...` }));
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
      avatar: getDefaultAvatar(newAccName || cleanUsername)
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
  const myPosts = posts.filter(p => p.username === currentUser.username || p.userId === currentUser.id);
  const [, setMetricsUpdateTick] = useState(0);
  
  useEffect(() => {
    const handleDeletePost = (e: Event) => {
      const { postId } = (e as CustomEvent).detail || {};
      if (postId && selectedGridPost?.id === postId) {
        setSelectedGridPost(null);
      }
    };

    const handleMetricsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.userId === currentUser.id) {
        setMetricsUpdateTick(t => t + 1);
      }
    };

    window.addEventListener('nexora-delete-post', handleDeletePost);
    window.addEventListener('nexora-user-metrics-updated', handleMetricsUpdated);
    return () => {
      window.removeEventListener('nexora-delete-post', handleDeletePost);
      window.removeEventListener('nexora-user-metrics-updated', handleMetricsUpdated);
    };
  }, [selectedGridPost, currentUser.id]);

  // Tab filtered items (Media, Voice, Reposts, Sparks, Bookmarks, Archive)
  const getTabContent = () => {
    const allActive = posts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const userMyPosts = allActive.filter(p => p.username === currentUser.username || p.userId === currentUser.id);

    switch (profileTab) {
      case 'media':
        return userMyPosts.filter(p => !p.isArchived && (!!p.image || !!p.videoUrl));
      case 'voice':
        return userMyPosts.filter(p => !p.isArchived && (p.isVoice || p.voiceDuration || (p as any).audioUrl || p.content.includes('🎙')));
      case 'reposts':
        return allActive.filter(p => !p.isArchived && ((p as any).isRepost && ((p as any).repostedBy === currentUser.username || (p as any).repostedBy === currentUser.id || p.userId === currentUser.id)));
      case 'sparks':
        return allActive.filter(p => !p.isArchived && (userSparks.includes(p.id) || (p as any).isSparkedByMe));
      case 'bookmarks':
        return allActive.filter(p => !p.isArchived && userBookmarks.includes(p.id));
      case 'archive':
        return userMyPosts.filter(p => p.isArchived);
      default:
        return userMyPosts.filter(p => !p.isArchived && (!!p.image || !!p.videoUrl));
    }
  };

  const filteredTabPosts = getTabContent();

  const formatSecondaryStat = (num: number) => {
    if (num === undefined || num === null || isNaN(num)) return '0';
    if (num >= 1000000) {
      const val = num / 1000000;
      const rounded = Math.floor(val * 10) / 10;
      return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + 'M';
    }
    if (num >= 1000) {
      const val = num / 1000;
      const rounded = Math.floor(val * 10) / 10;
      return (rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)) + 'K';
    }
    return num.toString();
  };

  const getPostsCount = () => {
    return myPosts.filter(p => !p.isArchived).length;
  };

  const getSecondaryMetric = (type: 'sparks' | 'reputation' | 'contributions') => {
    if (type === 'sparks') {
      return formatSecondaryStat(currentUser.sparks || 0);
    }
    if (type === 'reputation') {
      return formatSecondaryStat(currentUser.reputationPoints || 0);
    }
    return formatSecondaryStat(currentUser.contributions ?? currentUser.reputationBreakdown?.contributions ?? 0);
  };

  return (
    <div className="relative w-full min-h-screen bg-[#030112] text-white font-sans overflow-x-hidden pb-24">
      
      {/* 1. TOP NAVIGATION ACTION BAR */}
      <div className="sticky top-0 bg-[#030112]/95 backdrop-blur-md z-40 py-1.5 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3 relative">
          {onCloseProfile && (
            <button 
              onClick={onCloseProfile}
              className="p-1.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Return to Feed"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <div className="relative">
            {isOwnProfile ? (
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl hover:bg-white/5 text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase transition-all cursor-pointer select-none border border-white/10 bg-white/3"
              >
                <span>My Profile</span>
                <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-300 ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <span className="text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase">
                {currentUser.name}
              </span>
            )}

            <AnimatePresence>
              {isProfileMenuOpen && isOwnProfile && (
                <>
                  {/* Backdrop to dismiss */}
                  <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setIsProfileMenuOpen(false)} />
                  
                  {/* Dropdown Card */}
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="absolute left-0 mt-2 w-56 rounded-2xl bg-[#0c0926] border border-white/10 shadow-md p-2 z-50 overflow-hidden space-y-0.5"
                  >
                    {[
                      { label: 'Profile Settings', action: () => { setActivePanel('edit-profile'); setIsProfileMenuOpen(false); }, icon: Edit3, iconColor: 'text-violet-400' },
                      { label: 'Analytics', action: () => { setActivePanel('menu'); setSettingsActiveSubPanel('storage'); setIsProfileMenuOpen(false); window.dispatchEvent(new CustomEvent('toast', { detail: '📊 Loading Profile Analytics...' })); }, icon: BarChart2, iconColor: 'text-pink-400' },
                      { label: 'Achievements', action: () => { setIsProfileMenuOpen(false); window.dispatchEvent(new CustomEvent('toast', { detail: '🏆 You earned: "Founders Genesis" achievement!' })); }, icon: Award, iconColor: 'text-amber-400' },
                      { label: 'Saved Posts', action: () => { window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'saved' } })); setIsProfileMenuOpen(false); }, icon: Bookmark, iconColor: 'text-yellow-400' },
                      { label: 'Account Status', action: () => { setIsProfileMenuOpen(false); window.dispatchEvent(new CustomEvent('toast', { detail: '🟢 Secure Account Status: Optimal.' })); }, icon: Shield, iconColor: 'text-emerald-400' },
                      { label: 'Creator Studio', action: () => { window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: 'creator' } })); setIsProfileMenuOpen(false); }, icon: BarChart2, iconColor: 'text-indigo-400' },
                      { label: 'Privacy', action: () => { setActivePanel('menu'); setSettingsActiveSubPanel('privacy'); setIsProfileMenuOpen(false); }, icon: Lock, iconColor: 'text-teal-400' },
                      { label: 'Share Profile', action: () => { setShowShareModal(true); setIsProfileMenuOpen(false); }, icon: QrCode, iconColor: 'text-indigo-400' },
                      { label: 'Export Profile', action: () => { 
                          setIsProfileMenuOpen(false);
                          const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentUser, null, 2));
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute("href", dataStr);
                          downloadAnchor.setAttribute("download", `nexora_profile_${currentUser.username}.json`);
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();
                          window.dispatchEvent(new CustomEvent('toast', { detail: '💾 Profile credentials exported successfully!' }));
                        }, icon: Download, iconColor: 'text-sky-400' },
                      { label: 'View Public Profile', action: () => { 
                          setIsProfileMenuOpen(false);
                          window.dispatchEvent(new CustomEvent('toast', { detail: '🌐 Switched to public guest mode preview.' }));
                        }, icon: Eye, iconColor: 'text-purple-400' },
                    ].map(item => {
                      const IconComponent = item.icon;
                      return (
                        <button
                          key={item.label}
                          onClick={item.action}
                          className="w-full text-left px-3.5 py-2 hover:bg-white/5 rounded-xl transition-all flex items-center gap-2.5 text-xs font-sans text-zinc-300 hover:text-white cursor-pointer"
                        >
                          <IconComponent className={`w-4 h-4 ${item.iconColor}`} />
                          <span className="font-semibold">{item.label}</span>
                        </button>
                      );
                    })}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOwnProfile ? (
            <>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowShareModal(true)}
                className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Share Profile"
              >
                <QrCode className="w-4.5 h-4.5" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setActivePanel('menu')}
                className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Menu"
                id="nexora-advanced-hamburger-trigger"
              >
                <Menu className="w-5 h-5" />
              </motion.button>
            </>
          ) : (
            <>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowShareModal(true)}
                className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="Share Profile"
              >
                <Share2 className="w-4.5 h-4.5" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  const nextState = !isNotificationsEnabled;
                  setIsNotificationsEnabled(nextState);
                  localStorage.setItem(`nexora_notify_${currentUser.id}`, String(nextState));
                  window.dispatchEvent(new CustomEvent('toast', { detail: nextState ? `🔔 Notifications enabled for @${currentUser.username}` : `🔕 Notifications disabled for @${currentUser.username}` }));
                }}
                className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title={isNotificationsEnabled ? "Mute Notifications" : "Enable Notifications"}
              >
                {isNotificationsEnabled ? <Bell className="w-4.5 h-4.5 text-violet-400" /> : <BellOff className="w-4.5 h-4.5 text-zinc-400" />}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setActivePanel('other-profile-menu')}
                className="p-2 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="More Options"
              >
                <MoreVertical className="w-4.5 h-4.5" />
              </motion.button>
            </>
          )}
        </div>
      </div>

      {/* 2. PROFILE HEADER (COMPRESSED) */}
      <div className="w-full max-w-4xl mx-auto px-2.5 sm:px-4 md:px-6 pt-0 sm:pt-0.5 pb-0.5 text-left">
        
          {/* Profile Completion Prompts */}
          {isOwnProfile && (!currentUser.name || currentUser.name === 'New User' || !currentUser.username || !currentUser.bio || !currentUser.avatar || currentUser.avatar.includes('photo-1535713875002-d1d0cf377fde')) && (
            <div className="mb-4 p-4 bg-violet-950/40 border border-white/10 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-violet-300 uppercase tracking-wider">✨ Profile Setup & Completion</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {[
                    currentUser.name && currentUser.name !== 'New User',
                    currentUser.username,
                    currentUser.bio,
                    currentUser.avatar && !currentUser.avatar.includes('photo-1535713875002-d1d0cf377fde')
                  ].filter(Boolean).length}/4 completed
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {(!currentUser.avatar || currentUser.avatar.includes('photo-1535713875002-d1d0cf377fde')) && (
                  <button
                    onClick={() => setActivePanel('edit-profile')}
                    className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span className="text-xs text-zinc-200 font-medium">Add your profile photo</span>
                    <span className="text-violet-400 font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                  </button>
                )}
                {(!currentUser.name || currentUser.name === 'New User') && (
                  <button
                    onClick={() => setActivePanel('edit-profile')}
                    className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span className="text-xs text-zinc-200 font-medium">Set your display name</span>
                    <span className="text-violet-400 font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                  </button>
                )}
                {!currentUser.username && (
                  <button
                    onClick={() => setActivePanel('edit-profile')}
                    className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span className="text-xs text-zinc-200 font-medium">Choose your username</span>
                    <span className="text-violet-400 font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                  </button>
                )}
                {!currentUser.bio && (
                  <button
                    onClick={() => setActivePanel('edit-profile')}
                    className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <span className="text-xs text-zinc-200 font-medium">Write your bio</span>
                    <span className="text-violet-400 font-mono text-xs group-hover:translate-x-0.5 transition-transform">→</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Profile Identity Header (Stage 2 Redesign) */}
          <div className="flex flex-col space-y-2 text-left mb-1">
            {/* Identity & Action Bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {currentUser.hasStory && (
                    <div className="absolute -inset-1 bg-gradient-to-tr from-violet-600 via-fuchsia-500 to-pink-500 rounded-full blur-[2px] opacity-80" />
                  )}
                  <div 
                    onClick={() => setProfilePicExpanded(true)}
                    className="w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-black overflow-hidden relative border-2 border-white/10 z-10 cursor-zoom-in transition-transform duration-300 hover:scale-[1.03] shadow-md"
                  >
                    <img 
                      src={currentUser.avatar} 
                      className="w-full h-full object-cover" 
                      alt="User Avatar"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h1 className={`text-xl sm:text-2xl font-black leading-tight tracking-tight ${!currentUser.name ? 'text-violet-400/70 italic text-base' : 'text-white'}`}>
                      {currentUser.name || (isOwnProfile ? 'Set your display name' : 'Member')}
                    </h1>
                    {currentUser.isVerified && <PurpleVerifiedBadge className="w-4 h-4 shrink-0" type="founder" />}
                  </div>
                  <p className={`text-xs sm:text-sm font-bold font-mono tracking-wider mt-0.5 ${!currentUser.username ? 'text-violet-400/60 italic' : 'text-violet-400/90'}`}>
                    @{currentUser.username || (isOwnProfile ? 'add-username' : 'member')}
                  </p>
                </div>
              </div>

              {/* Profile Actions */}
              <div className="shrink-0 flex items-center gap-2">
                {isOwnProfile ? (
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={() => setActivePanel('edit-profile')} 
                      className="p-2.5 bg-white/5 hover:bg-white/10 active:scale-95 rounded-xl text-zinc-300 hover:text-white transition-all border border-white/10 cursor-pointer shadow-sm"
                      title="Edit Profile"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setShowShareModal(true)} 
                      className="p-2.5 bg-white/5 hover:bg-white/10 active:scale-95 rounded-xl text-zinc-300 hover:text-white transition-all border border-white/10 cursor-pointer shadow-sm"
                      title="Share Profile"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setActivePanel('menu')} 
                      className="p-2.5 bg-white/5 hover:bg-white/10 active:scale-95 rounded-xl text-zinc-300 hover:text-white transition-all border border-white/10 cursor-pointer shadow-sm"
                      title="More Options"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button 
                      onClick={() => { setIsFollowing(!isFollowing); onToggleFollow?.(currentUser.id); }} 
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer h-9 flex items-center justify-center ${
                        isFollowing ? 'bg-zinc-900 text-zinc-300 border border-white/10' : 'bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.3)]'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button 
                      onClick={() => onStartChat?.(currentUser.id)} 
                      className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-zinc-200 transition-all cursor-pointer h-9 flex items-center justify-center"
                    >
                      Message
                    </button>
                    <button 
                      onClick={() => setShowShareModal(true)} 
                      className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-zinc-300 hover:text-white transition-all border border-white/10 cursor-pointer h-9 w-9 flex items-center justify-center"
                      title="Share Profile"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Nexora 6 Statistics Grid */}
            <div className="grid grid-cols-3 gap-y-2 gap-x-1 text-center mt-3">
              {[
                { label: 'Followers', value: formatSecondaryStat(currentUser.followers || 0) },
                { label: 'Following', value: formatSecondaryStat(currentUser.following || 0) },
                { label: 'Posts', value: formatSecondaryStat(getPostsCount()) },
                { label: 'Sparks', value: getSecondaryMetric('sparks') },
                { label: 'Reputation', value: getSecondaryMetric('reputation') },
                { label: 'Contributions', value: getSecondaryMetric('contributions') },
              ].map(stat => (
                <div key={stat.label} className="flex flex-col py-1">
                  <span className="text-sm font-black text-white leading-tight">{stat.value}</span>
                  <span className="text-[10px] font-medium text-zinc-500">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Collapsible Bio */}
            <div className="text-zinc-300 text-xs leading-relaxed pt-2">
              <motion.div 
                animate={{ height: isBioExpanded ? "auto" : "2.6rem" }} 
                className="overflow-hidden relative"
                transition={{ duration: 0.25, ease: "easeInOut" }}
              >
                <p className={`whitespace-pre-wrap ${!currentUser.bio ? 'text-zinc-500 italic' : 'text-zinc-300'}`}>
                  {currentUser.bio || (isOwnProfile ? 'Add a bio to complete your profile' : 'No bio provided.')}
                </p>
              </motion.div>
              {currentUser.bio && (currentUser.bio.length > 70 || currentUser.bio.split('\n').length > 2) && (
                <button 
                  onClick={() => setIsBioExpanded(!isBioExpanded)} 
                  className="text-violet-400 font-bold mt-0.5 text-[10px] hover:text-violet-300 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <span>{isBioExpanded ? 'Show less' : 'Show more'}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${isBioExpanded ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>

            {/* Mutual Connections (Visitors) */}
            {!isOwnProfile && (
              <div className="flex items-center gap-2 text-xs font-sans text-zinc-500 pt-1">
                <div className="flex -space-x-1.5">
                  <img className="w-5 h-5 rounded-full border border-black object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80" alt="mutual 1" referrerPolicy="no-referrer" />
                  <img className="w-5 h-5 rounded-full border border-black object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80" alt="mutual 2" referrerPolicy="no-referrer" />
                  <img className="w-5 h-5 rounded-full border border-black object-cover" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=50&auto=format&fit=crop&q=80" alt="mutual 3" referrerPolicy="no-referrer" />
                </div>
                <span>3 mutual connections in common</span>
              </div>
            )}

          {/* Nexora 6 Statistics Grid */}
          {/* REMOVED - MOVED ABOVE BIO */}
          </div>

          {/* 3. ICON-ONLY NAVIGATION BAR */}
          <div className="sticky top-0 bg-[#030112]/95 backdrop-blur-md z-35 border-b border-white/5 mt-1 px-0 w-full">
            <div className="w-full max-w-4xl mx-auto flex items-center justify-around py-0">
              {[
                { id: 'media', icon: Camera },
                { id: 'voice', icon: Mic },
                { id: 'reposts', icon: Repeat2 },
                { id: 'sparks', icon: Zap },
                { id: 'bookmarks', icon: Bookmark },
                { id: 'archive', icon: HardDrive }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = profileTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setProfileTab(tab.id)}
                    className={`flex-1 flex justify-center items-center py-3.5 transition-all cursor-pointer relative ${
                      isActive 
                        ? 'text-white' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {isActive && (
                      <div className="absolute bottom-0 w-full h-[2px] bg-violet-500 rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Profile Tab Content Area */}
          <div 
            onTouchStart={handleContentTouchStart}
            onTouchEnd={handleContentTouchEnd}
            className="w-full pt-4 space-y-4 bg-black min-h-[350px] touch-pan-y"
          >
            {filteredTabPosts.length === 0 ? (
              <div className="p-8 py-16 rounded-2xl bg-white/[0.01] border border-white/5 text-center space-y-3 max-w-md mx-auto my-6">
                <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-white/10 flex items-center justify-center mx-auto text-violet-400">
                  {profileTab === 'media' && <Camera className="w-6 h-6" />}
                  {profileTab === 'voice' && <Mic className="w-6 h-6" />}
                  {profileTab === 'reposts' && <Repeat2 className="w-6 h-6" />}
                  {profileTab === 'sparks' && <Zap className="w-6 h-6" />}
                  {profileTab === 'bookmarks' && <Bookmark className="w-6 h-6" />}
                  {profileTab === 'archive' && <HardDrive className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-200 capitalize">No {profileTab} found</h4>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    {profileTab === 'media' && 'Published visual media and videos will appear here.'}
                    {profileTab === 'voice' && 'Recorded voice pulses and audio broadcasts will appear here.'}
                    {profileTab === 'reposts' && 'Content reposted by this creator will appear here.'}
                    {profileTab === 'sparks' && 'Content sparked by this creator will appear here.'}
                    {profileTab === 'bookmarks' && 'Saved bookmarks and favorite posts will appear here.'}
                    {profileTab === 'archive' && 'Archived studio posts and past assets will appear here.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-4xl mx-auto px-2">
                <MediaGrid 
                  gridPosts={filteredTabPosts.sort((a, b) => (pinnedPostIdsList.includes(b.id) ? 1 : -1) - (pinnedPostIdsList.includes(a.id) ? 1 : 0))} 
                  pinnedPostIds={pinnedPostIdsList} 
                  onSelectPost={(post) => setSelectedGridPost(post)} 
                />
              </div>
            )}
          </div>
        
        {/* 6. ADVANCED SLIDE-OUT DRAWER MENU ☰ (Progressive Disclosure - Redesigned Settings & Privacy Hub) */}
      <AnimatePresence>
        {activePanel === 'other-profile-menu' && !isOwnProfile && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-end" onClick={() => setActivePanel('profile')}>
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-sm h-full bg-[#080614] border-l border-white/10 p-5 overflow-y-auto space-y-5 text-left flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4 shrink-0">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-xs font-mono text-zinc-300 font-black uppercase tracking-wider">Profile Options</h3>
                  <button 
                    onClick={() => setActivePanel('profile')}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-all"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>
                
                <div className="space-y-2">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`nexora.ai/${currentUser.username}`);
                      window.dispatchEvent(new CustomEvent('toast', { detail: 'Profile link copied to clipboard' }));
                      setActivePanel('profile');
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] transition-all flex items-center gap-3"
                  >
                    <span className="text-zinc-400 font-bold">➥</span>
                    <div className="space-y-0.5">
                      <span className="block text-sm font-semibold text-white">Copy Profile Link</span>
                      <span className="block text-xs text-zinc-500 font-mono">Copy profile URL to clipboard</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('toast', { detail: `@${currentUser.username} has been blocked.` }));
                      setActivePanel('profile');
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 transition-all flex items-center gap-3"
                  >
                    <Ban className="w-5 h-5 text-red-400" />
                    <div className="space-y-0.5">
                      <span className="block text-sm font-semibold text-red-400">Block User</span>
                      <span className="block text-xs text-red-400/60 font-mono">Restrict all interactions</span>
                    </div>
                  </button>

                  <button 
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('toast', { detail: `Report submitted for review.` }));
                      setActivePanel('profile');
                    }}
                    className="w-full text-left p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 transition-all flex items-center gap-3"
                  >
                    <Flag className="w-5 h-5 text-red-400" />
                    <div className="space-y-0.5">
                      <span className="block text-sm font-semibold text-red-400">Report User</span>
                      <span className="block text-xs text-red-400/60 font-mono">Flag inappropriate behavior</span>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {activePanel === 'menu' && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-end" onClick={() => { setActivePanel('profile'); setSettingsActiveSubPanel('main'); setSettingsSearchQuery(''); }}>
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full max-w-md h-full bg-[#080614] border-l border-white/10 p-5 overflow-y-auto space-y-5 text-left flex flex-col justify-between"
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
                    className="w-full pl-9 pr-8 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-sans text-white focus:outline-hidden focus:border-violet-500 transition-all font-medium placeholder-zinc-500"
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
                        { id: 'about-matrix', title: 'About Nexora', description: 'Review system status and terms', panel: 'about' }
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
                          className="w-full text-left p-3.5 rounded-2xl bg-[#0e0c24] border border-white/10 hover:border-white/10 transition-all flex items-start gap-3 group"
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
                    <div className="p-3.5 rounded-2xl bg-linear-to-tr from-[#130f3c]/90 to-[#0c0926]/90 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img src={currentUser.avatar} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="" />
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
                      <div className="p-3 rounded-2xl bg-[#0d0a20] border border-white/10 space-y-3">
                        <div className="space-y-2">
                          {savedAccounts.map(acc => {
                            const isActive = acc.id === currentUser.id || acc.username === currentUser.username;
                            return (
                              <div 
                                key={acc.id}
                                onClick={() => !isActive && handleSwitchAccount(acc)}
                                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isActive 
                                    ? 'bg-violet-600/10 border-white/10' 
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
                          + Add Another Account
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
                                <p className="leading-tight text-xs font-bold">About Nexora</p>
                                <p className="text-[9px] text-zinc-500 font-normal">App version and system information</p>
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
                                <p className="leading-none text-xs font-extrabold">Log Out of Account</p>
                                <p className="text-[9px] text-zinc-500 font-normal mt-1">Safely exit and clear active session</p>
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
                                <p className="leading-none text-xs font-extrabold">Delete Nexora Account</p>
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
                      className="flex items-center gap-1.5 text-xs font-mono text-violet-400 hover:text-violet-300 font-extrabold uppercase bg-violet-600/5 px-2.5 py-1.5 rounded-lg border border-white/10"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Menu
                    </button>

                    {/* Drill down Panel 1: Account / Profile Details */}
                    {settingsActiveSubPanel === 'account' && (
                      <div className="space-y-4 text-left">
                        <div className="bg-[#0e0c24] p-4 rounded-2xl border border-white/10 space-y-3.5">
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
                        <div className="bg-[#0e0c24] p-4 rounded-2xl border border-white/10 space-y-3">
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
                              <img src={editAvatar} className="w-12 h-12 rounded-xl object-cover border border-white/10" alt="" />
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
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-4">
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
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3 text-left">
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
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
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
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
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
                            <div className="p-3 bg-black/50 rounded-xl border border-dashed border-white/10 text-center space-y-2">
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
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
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
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3.5">
                          <span className="text-[9px] font-mono text-pink-400 font-extrabold uppercase tracking-widest block">🔔 PUSH PREFERENCES</span>
                          <p className="text-[10px] text-zinc-400 leading-normal font-sans">Manage how you receive notifications on this device.</p>
                          
                          <div className="space-y-3">
                            {[
                              { key: 'likes', title: 'Likes', desc: 'Get notified when someone likes your content' },
                              { key: 'comments', title: 'Comments', desc: 'Alerts for comments on your posts' },
                              { key: 'mentions', title: 'Mentions & Tags', desc: 'Alerts when someone mentions you' },
                              { key: 'reposts', title: 'Reposts', desc: 'Notifications when someone shares your posts' },
                              { key: 'directMessages', title: 'Direct Messages', desc: 'Alerts for new messages' },
                              { key: 'systemAlerts', title: 'System Alerts', desc: 'Important app updates and security alerts' }
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
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
                          <span className="text-[9px] font-mono text-amber-400 font-extrabold uppercase tracking-widest block">🎨 Live Canvas Theme Mood</span>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { id: 'neon-cyber', label: 'Cyber Violet', bg: 'bg-[#050409]', border: 'border-white/10 text-violet-300' },
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
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
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
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
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
                        {/* Premium Storage and Data Center Launcher */}
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#12082b] to-[#04010a] border border-white/10 space-y-3 relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-2xl group-hover:bg-violet-600/20 transition-all duration-500" />
                          <div className="flex items-center gap-2.5">
                            <VohIcon size={18} animated glow variant="brand" />
                            <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block">NEXORA PLATFORM UTILITY</span>
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-xs font-black font-sans uppercase text-white tracking-wider">Advanced Storage & Data Center</h4>
                            <p className="text-[10px] text-zinc-400 leading-relaxed">Access visual storage rings, duplicate media analyzers, custom bandwidth managers, encrypted backups and restore managers.</p>
                          </div>
                          <button
                            onClick={() => setIsStorageCenterOpen(true)}
                            className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-mono text-[10px] uppercase font-black tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-600/10 cursor-pointer"
                          >
                            <HardDrive className="w-4 h-4" /> Launch Interactive Storage Center
                          </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3.5">
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
                                setCacheSize('Clearing cache...');
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
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3.5">
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
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3">
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
                                  <option value="bug">Report a Bug</option>
                                  <option value="auth">ID Verification Help</option>
                                  <option value="billing">NEX Coin Monetization</option>
                                </select>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-mono text-zinc-400 uppercase">Describe Your Issue</label>
                                <textarea
                                  placeholder="Describe what occurred, including details of your issue..."
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

                    {/* Drill down Panel 8: About Nexora */}
                    {settingsActiveSubPanel === 'about' && (
                      <div className="space-y-4 text-left">
                        <div className="p-4 rounded-2xl bg-[#0e0c24] border border-white/10 space-y-3 font-mono">
                          <NexoraBranding size="sm" showSubtitle={true} className="mb-2" />
                          <div className="space-y-2 text-[10px] leading-relaxed text-zinc-300">
                            <p className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">APP:</span> <span>Nexora</span></p>
                            <p className="flex justify-between border-b border-white/5 pb-1"><span className="text-zinc-500">PLATFORM:</span> <span>Live Production</span></p>
                            <p className="flex justify-between pb-1"><span className="text-zinc-500">REGION:</span> <span>Global</span></p>
                          </div>
                          
                          <div className="p-3 bg-black/30 rounded-xl border border-white/5 space-y-1.5 text-[9px] text-zinc-400 font-sans leading-relaxed">
                            <p className="font-bold text-zinc-300">Terms of Service</p>
                            <p>By connecting to Nexora, you agree to our secure content distribution guidelines and community standards designed to protect creators and members worldwide.</p>
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
              className="bg-[#0c0926] border border-red-500/25 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-md relative"
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
              className="bg-[#0c0926] border border-red-500/40 rounded-3xl p-6 max-w-sm w-full text-center space-y-5 shadow-md"
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


      {/* 7. DYNAMIC Nexora Studio & DETAILED ANALYTICS VIEW */}
      <AnimatePresence>
        {activePanel === 'creator-studio' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-4xl mx-auto px-4 py-6">
              <CreatorDashboardView
                currentUser={currentUser}
                posts={posts}
                onClose={() => setActivePanel('profile')}
                onUpdateProfile={onUpdateProfile}
              />
            </div>
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
                  className="w-full pl-9 pr-4 py-3 bg-[#0d0926]/60 border border-white/10 rounded-2xl text-xs font-sans text-white focus:outline-hidden focus:border-violet-500 focus:bg-black/60 font-medium"
                />
              </div>

              {/* Relation list render */}
              <div className="space-y-2 text-left">
                {(() => {
                  let list: any[] = [];
                  let allFollows: { followerId: string; followingId: string }[] = [];
                  try {
                    allFollows = JSON.parse(localStorage.getItem('nexora_db_follows') || localStorage.getItem('nexora_db_follows_v1') || '[]');
                  } catch {}

                  let allRegisteredUsers: User[] = [];
                  try {
                    const rawUsers = localStorage.getItem('nexora_users_db');
                    if (rawUsers) allRegisteredUsers = JSON.parse(rawUsers);
                  } catch {}

                  if (relationsTab === 'followers') {
                    const followerIds = allFollows.filter(f => f.followingId === currentUser.id).map(f => f.followerId);
                    list = allRegisteredUsers.filter(u => followerIds.includes(u.id));
                  } else if (relationsTab === 'following') {
                    const followingIds = allFollows.filter(f => f.followerId === currentUser.id).map(f => f.followingId);
                    list = allRegisteredUsers.filter(u => followingIds.includes(u.id));
                  } else if (relationsTab === 'close-friends') {
                    list = allRegisteredUsers.filter(u => closeFriends.includes(u.id));
                  } else if (relationsTab === 'blocked') {
                    list = blockedUsers.map(u => ({ id: u, username: u, name: u.toUpperCase(), avatar: getDefaultAvatar(u) }));
                  } else if (relationsTab === 'muted') {
                    list = mutedUsers.map(u => ({ id: u, username: u, name: u.toUpperCase(), avatar: getDefaultAvatar(u) }));
                  }

                  const filtered = list.filter(item => 
                    (item.username || '').toLowerCase().includes(searchRelationQuery.toLowerCase()) ||
                    (item.name || '').toLowerCase().includes(searchRelationQuery.toLowerCase())
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-zinc-500 font-mono text-xs">
                        ⚠️ No accounts match your query.
                      </div>
                    );
                  }

                  return filtered.map(item => (
                    <div 
                      key={item.id} 
                      onClick={() => onViewProfile && onViewProfile(item.id)}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0b081c] border border-white/3 cursor-pointer hover:bg-violet-950/20 transition-all"
                    >
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

            {/* 11. SUBSCRIPTIONS MANAGEMENT PAGE */}
      <AnimatePresence>
        {activePanel === 'subscriptions' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <button
                  onClick={() => setActivePanel('profile')}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white uppercase font-black cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Profile
                </button>
                <span className="text-xs font-mono text-zinc-400 font-extrabold uppercase">Subscriptions</span>
              </div>
              
              <div className="space-y-6">
                {/* Header Info */}
                <div className="p-6 bg-linear-to-tr from-violet-900/20 to-[#04020f] border border-white/10 rounded-3xl">
                  <h2 className="text-xl font-black text-white mb-2">Creator Subscriptions</h2>
                  <p className="text-sm text-zinc-400">Support your favorite creators, unlock exclusive content, and get premium badges.</p>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/5">
                  {[
                    { id: 'active', label: 'Active Subscriptions' },
                    { id: 'plans', label: 'Manage My Plans' },
                    { id: 'exclusive', label: 'Exclusive Content' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setSubscriptionsTab(tab.id as any)}
                      className={`pb-3 text-xs font-bold transition-all cursor-pointer ${
                        subscriptionsTab === tab.id
                          ? 'text-violet-400 border-b-2 border-violet-500'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Subscriptions List (Active) */}
                {subscriptionsTab === 'active' && (
                  <div className="space-y-4">
                    {activeSubscriptions.length === 0 ? (
                      <div className="py-12 text-center border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
                        <p className="text-sm text-zinc-400 font-bold">No active subscriptions</p>
                        <p className="text-xs text-zinc-600 mt-1">Subscribe to a creator to support them.</p>
                      </div>
                    ) : (
                      activeSubscriptions.map(sub => (
                        <div key={sub.username} className="flex items-center justify-between p-4 bg-[#0a0818] border border-white/5 rounded-2xl">
                          <div className="flex items-center gap-3">
                            <img src={sub.avatar} alt={sub.name} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                            <div>
                              <p className="text-sm font-bold text-white">{sub.name}</p>
                              <p className="text-[10px] font-mono text-zinc-500">@{sub.username}</p>
                              <div className="mt-1 flex items-center gap-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded-md">{sub.plan}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-white mb-2">{sub.price}</p>
                            <button 
                              onClick={() => {
                                setActiveSubscriptions(prev => prev.filter(p => p.username !== sub.username));
                                window.dispatchEvent(new CustomEvent('toast', { detail: `❌ Unsubscribed from @${sub.username}` }));
                              }}
                              className="text-[10px] font-bold text-red-400 hover:text-white hover:bg-red-500/20 transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Manage My Plans Tab */}
                {subscriptionsTab === 'plans' && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Configure the premium subscription tiers offered to your own subscribers. Update perks and prices to incentivize support.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {mySubscriptionPlans.map((plan, index) => (
                        <div key={index} className="p-4 bg-[#0a0818] border border-white/5 rounded-2xl flex flex-col justify-between space-y-4">
                          <div>
                            <span className="text-[9px] font-bold uppercase tracking-wider text-violet-400 bg-violet-400/10 px-2.5 py-1 rounded-md block w-fit mb-2">
                              {plan.tier}
                            </span>
                            <p className="text-2xl font-black text-white">{plan.price}<span className="text-xs text-zinc-500 font-normal">/mo</span></p>
                            <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed font-sans">{plan.perks}</p>
                          </div>
                          <button
                            onClick={() => {
                              const newPrice = prompt(`Enter new monthly price for ${plan.tier}:`, plan.price);
                              if (newPrice) {
                                setMySubscriptionPlans(prev => prev.map((p, i) => i === index ? { ...p, price: newPrice } : p));
                                window.dispatchEvent(new CustomEvent('toast', { detail: `✅ Updated price of ${plan.tier} to ${newPrice}/mo` }));
                              }
                            }}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer"
                          >
                            Edit Pricing
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exclusive Content Tab */}
                {subscriptionsTab === 'exclusive' && (
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Exclusive posts and files available only to active supporters. High-tier items remain locked until the subscription is active.
                    </p>
                    <div className="space-y-3">
                      {exclusiveContentList.map(content => (
                        <div key={content.id} className="p-4 bg-[#0a0818] border border-white/5 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-950/40 border border-white/10 flex items-center justify-center text-violet-300">
                              {content.type === 'Video' ? <Film className="w-5 h-5" /> : content.type === 'Audio' ? <Mic className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                {content.title}
                                <span className="text-[9px] font-mono text-zinc-500">({content.type})</span>
                              </p>
                              <p className="text-[10px] text-zinc-500 font-mono mt-0.5">by @{content.creator} • {content.date}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent('toast', { detail: `🔒 Unlock higher subscription tier to view this exclusive ${content.type.toLowerCase()}!` }));
                            }}
                            className="px-4 py-2 bg-violet-950 text-violet-400 border border-white/10 hover:bg-violet-900/40 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Lock className="w-3.5 h-3.5" /> Unlock
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* 12. LINKED ACCOUNTS MANAGEMENT PAGE */}
      <AnimatePresence>
        {activePanel === 'linked-accounts' && (
          <div className="fixed inset-0 z-50 bg-[#04020f] overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 text-left relative min-h-screen">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <button
                  onClick={() => setActivePanel('profile')}
                  className="flex items-center gap-1 text-xs font-mono text-zinc-400 hover:text-white uppercase font-black cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Profile
                </button>
                <span className="text-xs font-mono text-zinc-400 font-extrabold uppercase">Linked Accounts</span>
              </div>
              


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
                  <div className="bg-[#0b081c] p-6 rounded-3xl border border-white/10 space-y-4">
                    <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block border-b border-white/5 pb-2">✏️ PROFILE DETAILS</span>
                    
                    {/* Display name */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Display Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={isSavingProfile || showSavedFeedback}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Username */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Username</label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        disabled={isSavingProfile || showSavedFeedback}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white font-mono focus:outline-hidden focus:border-violet-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Pronouns */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Pronouns</label>
                      <input
                        type="text"
                        value={editPronouns}
                        onChange={(e) => setEditPronouns(e.target.value)}
                        disabled={isSavingProfile || showSavedFeedback}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        placeholder="e.g. they/them"
                      />
                    </div>

                    {/* Bio */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Bio Summary</label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        disabled={isSavingProfile || showSavedFeedback}
                        rows={3}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 font-medium leading-relaxed disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Website */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Website Link</label>
                      <input
                        type="text"
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                        disabled={isSavingProfile || showSavedFeedback}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Location */}
                    <div className="space-y-1 text-xs">
                      <label className="text-zinc-400 font-mono text-[10px] uppercase">Physical Location</label>
                      <input
                        type="text"
                        value={editLocation}
                        onChange={(e) => setEditLocation(e.target.value)}
                        disabled={isSavingProfile || showSavedFeedback}
                        className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* Custom Category selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1 text-xs">
                        <label className="text-zinc-400 font-mono text-[10px] uppercase">Category</label>
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          disabled={isSavingProfile || showSavedFeedback}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 disabled:opacity-50"
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
                          disabled={isSavingProfile || showSavedFeedback}
                          className="w-full px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-white focus:outline-hidden focus:border-violet-500 disabled:opacity-50"
                        >
                          <option value="Premium Node">Premium</option>
                          <option value="Standard Node">Standard</option>
                          <option value="Collaborator Node">Collaborator</option>
                        </select>
                      </div>
                    </div>

                  </div>

                  {/* Avatar photo editor trigger */}
                  <div className="bg-[#0b081c] p-6 rounded-3xl border border-white/10 space-y-4">
                    <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase tracking-widest block border-b border-white/5 pb-2">📸 PROFILE PHOTO</span>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="relative group cursor-pointer shrink-0" onClick={() => { if (!isSavingProfile && !showSavedFeedback) { setAvatarSourceType('select'); setIsAvatarModalOpen(true); } }}>
                        <img src={editAvatar} className="w-16 h-16 rounded-xl object-cover border border-white/10 group-hover:brightness-75 transition-all" alt="avatar editor" />
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded-xl">
                          <Camera className="w-4 h-4 text-white" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 text-left">
                        <button
                          disabled={isSavingProfile || showSavedFeedback}
                          onClick={() => { setAvatarSourceType('select'); setIsAvatarModalOpen(true); }}
                          className="px-4 py-2 bg-linear-to-r from-violet-600 to-pink-500 text-white font-mono text-[10px] uppercase font-black rounded-lg cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Edit3 className="w-3.5 h-3.5" /> Configure Avatar
                        </button>
                        <p className="text-[9px] font-mono text-zinc-500">Supports Camera capture, Device gallery, Rotation, and Zoom controls</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Real-time live preview */}
                <div className="space-y-4">
                  <div className="sticky top-6 space-y-4">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest pl-2">🔴 LIVE PREVIEW</span>
                    
                    {/* Simplified Profile Header simulation */}
                    <div className="bg-[#0b0922] border border-white/10 rounded-2xl p-6 text-center space-y-4">
                      <div className="relative w-20 h-20 rounded-full bg-black overflow-hidden mx-auto border-2 border-white/10">
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

                    <div className="flex gap-3">
                      <button
                        disabled={isSavingProfile || showSavedFeedback}
                        onClick={handleCancelEditProfile}
                        className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 border border-white/5 text-zinc-300 rounded-2xl text-xs font-mono font-black uppercase tracking-widest transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                      <button
                        disabled={isSavingProfile || showSavedFeedback}
                        onClick={handleSaveProfile}
                        className={`flex-1 py-3.5 rounded-2xl text-xs font-mono font-black uppercase tracking-widest transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2 ${
                          showSavedFeedback 
                            ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white shadow-violet-500/15 disabled:opacity-50 disabled:cursor-not-allowed'
                        }`}
                      >
                        {isSavingProfile && (
                          <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        )}
                        {showSavedFeedback ? (
                          <span className="flex items-center gap-1">✓ Profile updated successfully</span>
                        ) : isSavingProfile ? (
                          'Saving...'
                        ) : (
                          'Save Changes'
                        )}
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}
      </AnimatePresence>

      {/* EXQUISITE INTERACTIVE PROFILE PICTURE EDITOR MODAL */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-[#0b0821] border border-white/10 rounded-2xl max-w-sm w-full overflow-hidden p-6 space-y-5 text-left"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-mono text-pink-400 font-extrabold uppercase tracking-widest">
                  Avatar Configuration
                </span>
                <button
                  onClick={() => {
                    stopWebcam();
                    setIsAvatarModalOpen(false);
                    setGalleryImage(null);
                  }}
                  className="p-1 text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
                >
                  Close ×
                </button>
              </div>

              {avatarSourceType === 'select' && (
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => {
                      setAvatarSourceType('webcam');
                      startWebcam();
                    }}
                    className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" /> Take Photo
                  </button>

                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                    }}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" /> Choose From Gallery
                  </button>

                  <button
                    onClick={() => {
                      setEditAvatar(getDefaultAvatar(editName || editUsername));
                      setIsAvatarModalOpen(false);
                      window.dispatchEvent(new CustomEvent('toast', { detail: '🗑️ Profile photo removed.' }));
                    }}
                    className="w-full py-3 bg-red-950/40 hover:bg-red-900/50 border border-red-900/25 text-red-400 font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Remove Photo
                  </button>

                  <button
                    onClick={() => {
                      setIsAvatarModalOpen(false);
                    }}
                    className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {avatarSourceType === 'webcam' && (
                <div className="space-y-4">
                  {isWebcamActive ? (
                    <div className="relative aspect-square rounded-2xl bg-black overflow-hidden border border-white/10 max-w-xs mx-auto">
                      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 rounded-full animate-pulse text-red-500 text-[10px] font-mono">
                        🔴 LIVE
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-zinc-500 text-xs font-mono">
                      Initializing camera...
                    </div>
                  )}

                  {webcamError && <p className="text-[10px] font-mono text-red-400 text-center">{webcamError}</p>}

                  <div className="flex gap-2">
                    <button
                      onClick={capturePhotoToGallery}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                    >
                      Capture
                    </button>
                    <button
                      onClick={() => {
                        stopWebcam();
                        setAvatarSourceType('select');
                      }}
                      className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-mono text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {avatarSourceType === 'gallery_edit' && galleryImage && (
                <div className="space-y-4">
                  {/* Circular Preview Container */}
                  <div className="relative w-44 h-44 mx-auto rounded-full overflow-hidden border-2 border-violet-500 bg-black/40 flex items-center justify-center">
                    <div className="absolute inset-0 border border-white/5 rounded-full pointer-events-none z-10" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="w-full h-[1px] bg-white/10" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                      <div className="h-full w-[1px] bg-white/10" />
                    </div>
                    
                    <img
                      src={galleryImage}
                      alt="Crop target"
                      className="max-w-none origin-center transition-all duration-75"
                      style={{
                        transform: `scale(${avatarZoom}) rotate(${avatarRotation}deg)`,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                  </div>

                  {/* Zoom Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono text-zinc-400 uppercase">
                      <span>Zoom / Scale</span>
                      <span>{avatarZoom.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={avatarZoom}
                      onChange={(e) => setAvatarZoom(parseFloat(e.target.value))}
                      className="w-full accent-violet-500 bg-zinc-800 rounded-lg appearance-none h-1.5 cursor-pointer"
                    />
                  </div>

                  {/* Rotate Control */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">Rotation Angle</span>
                    <button
                      onClick={() => setAvatarRotation(prev => (prev + 90) % 360)}
                      className="px-3 py-1.5 bg-white/5 border border-white/10 text-white font-mono text-[9px] uppercase font-bold rounded-lg hover:bg-white/10 cursor-pointer flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3 text-pink-400 animate-spin" /> Rotate 90°
                    </button>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button
                      onClick={() => {
                        setGalleryImage(null);
                        setAvatarSourceType('select');
                      }}
                      className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-mono text-[10px] font-bold uppercase rounded-lg transition-all cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSaveCroppedAvatar}
                      className="flex-1 py-2.5 bg-linear-to-r from-violet-600 to-pink-500 hover:brightness-110 text-white font-mono text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer"
                    >
                      Save Photo
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* HIDDEN FILE INPUT FOR GALLERY SELECT */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleGalleryFileSelect}
        className="hidden"
      />

      {/* 11. REPUTATION & CONTRIBUTIONS ALGORITHM MATRIX MODAL */}
      <AnimatePresence>
        {showReputationModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setShowReputationModal(false)}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0b081e] border border-white/10 rounded-2xl p-6 max-w-lg w-full text-left space-y-5 overflow-y-auto max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-white/10 flex items-center justify-center text-violet-400">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-sans font-extrabold text-white">Nexora Algorithm Matrix</h3>
                    <p className="text-[10px] font-mono text-zinc-400">Multi-Signal Trust & Value Engine</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowReputationModal(false)}
                  className="p-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-mono transition-all cursor-pointer"
                >
                  Close ×
                </button>
              </div>

              {/* Core Definitions Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-violet-950/30 border border-white/10 space-y-1">
                  <span className="text-[10px] font-mono text-violet-400 font-extrabold uppercase block">Reputation</span>
                  <p className="text-xs font-sans text-zinc-200 font-medium">"The trust and impact you have built on Nexora."</p>
                  <span className="text-[11px] font-black text-white block pt-1">{formatSecondaryStat(currentUser.reputationPoints || 0)} PR</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-pink-950/30 border border-pink-500/20 space-y-1">
                  <span className="text-[10px] font-mono text-pink-400 font-extrabold uppercase block">Contributions</span>
                  <p className="text-xs font-sans text-zinc-200 font-medium">"The value you have added to the Nexora community."</p>
                  <span className="text-[11px] font-black text-white block pt-1">{formatSecondaryStat(currentUser.reputationBreakdown?.contributions || 0)} Value</span>
                </div>
              </div>

              {/* Algorithm Invariants & Protection Status */}
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Invariant: Rep ≤ Contrib
                  </span>
                  <span className="text-cyan-400 font-bold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5" /> Anti-Farming Shield Active
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Contributions grow organically with platform value, while Reputation requires verified trust signals, distinct community engagement, and sustained quality.
                </p>
              </div>

              {/* 6 Internal Contribution Pillar Breakdown */}
              <div className="space-y-3">
                <h4 className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider font-extrabold flex items-center justify-between">
                  <span>Internal Contribution Dimensions</span>
                  <span className="text-violet-400 text-[10px]">6 Signals Evaluated</span>
                </h4>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { key: 'contentCreation', name: 'Content Creation', icon: '🎨', val: currentUser.reputationBreakdown?.categories?.contentCreation ?? 18, desc: 'Original posts, rich media & video depth', color: 'bg-violet-500' },
                    { key: 'communityEngagement', name: 'Community Engagement', icon: '💬', val: currentUser.reputationBreakdown?.categories?.communityEngagement ?? 24, desc: 'Thoughtful comments & creator sparks', color: 'bg-pink-500' },
                    { key: 'helpfulResponses', name: 'Helpful Responses', icon: '💡', val: currentUser.reputationBreakdown?.categories?.helpfulResponses ?? 15, desc: 'Direct replies & community endorsements', color: 'bg-cyan-500' },
                    { key: 'discoveryImpact', name: 'Discovery Impact', icon: '🚀', val: currentUser.reputationBreakdown?.categories?.discoveryImpact ?? 32, desc: 'Unique user sparks & viral shares', color: 'bg-emerald-500' },
                    { key: 'trustBuilding', name: 'Trust Building', icon: '🔒', val: currentUser.reputationBreakdown?.categories?.trustBuilding ?? 45, desc: 'Profile completeness & account longevity', color: 'bg-amber-500' },
                    { key: 'platformParticipation', name: 'Platform Participation', icon: '🌐', val: currentUser.reputationBreakdown?.categories?.platformParticipation ?? 20, desc: 'Missions completed & circle leadership', color: 'bg-indigo-500' },
                  ].map(pillar => {
                    const maxVal = Math.max(50, (currentUser.reputationBreakdown?.contributions || 100) * 0.4);
                    const pct = Math.min(100, Math.round((pillar.val / maxVal) * 100));

                    return (
                      <div key={pillar.key} className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                            <span>{pillar.icon}</span> {pillar.name}
                          </span>
                          <span className="font-mono text-white font-extrabold">{pillar.val} pts</span>
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight">{pillar.desc}</p>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className={`h-full ${pillar.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quality & Anti-Gaming Diagnostics */}
              <div className="p-4 rounded-2xl bg-violet-950/20 border border-white/10 space-y-2 text-center">
                <span className="text-[10px] font-mono text-violet-300 uppercase block font-extrabold">Algorithm Quality Multipliers</span>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-xs font-mono font-bold text-emerald-400 block">
                      {Math.round((currentUser.reputationBreakdown?.trustMultiplier || 0.85) * 100)}%
                    </span>
                    <span className="text-[9px] text-zinc-400 block mt-0.5">Trust Multiplier</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-xs font-mono font-bold text-cyan-400 block">
                      {Math.round((currentUser.reputationBreakdown?.antiGamingStatus?.uniqueEngagerRatio || 0.92) * 100)}%
                    </span>
                    <span className="text-[9px] text-zinc-400 block mt-0.5">Unique Engagers</span>
                  </div>
                  <div className="bg-white/5 p-2 rounded-xl">
                    <span className="text-xs font-mono font-bold text-pink-400 block">Active</span>
                    <span className="text-[9px] text-zinc-400 block mt-0.5">Anti-Spam Shield</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowReputationModal(false)}
                className="w-full py-3 bg-violet-600 hover:bg-violet-500 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-2xl cursor-pointer transition-all shadow-lg shadow-violet-600/20"
              >
                Close Algorithm Matrix
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
              className="bg-[#0c0926] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-left space-y-4"
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
          <ImmersiveVideoViewer
            initialPost={selectedGridPost}
            creatorPosts={myPosts}
            currentUser={currentUser}
            onClose={() => setSelectedGridPost(null)}
            onLikePost={(postId) => {
              onLikePost(postId);
              window.dispatchEvent(new CustomEvent('toast', { detail: '✨ Spark synchronised!' }));
            }}
            onToggleFollow={onToggleFollow}
            isFollowing={isFollowing}
            onAddComment={onAddComment}
          />
        )}
      </AnimatePresence>

      {/* 📥 NEXORA SOCIAL SHARE SHEET MODAL */}
      <ShareSheet
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={(recipientId) => {
          window.dispatchEvent(new CustomEvent('toast', { detail: '🚀 Profile shared successfully!' }));
        }}
        post={{
          id: currentUser.id,
          username: currentUser.username,
          name: currentUser.name,
          tags: [],
          likes: currentUser.followers || 0,
        }}
      />
      <StorageDataCenterModal isOpen={isStorageCenterOpen} onClose={() => setIsStorageCenterOpen(false)} />
      </div>
    </div>
  );
}
