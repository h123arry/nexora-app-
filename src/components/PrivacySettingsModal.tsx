import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { setAnalyticsObservationConsent } from '../services/analyticsService';
import { SettingsService } from '../services/firebase/settingsService';
import { 
  X, Shield, ShieldCheck, Eye, EyeOff, Check, AlertCircle, HardDrive, Sparkles, 
  Search, ChevronRight, ChevronDown, User, ShieldAlert, Monitor, Info, Trash2, 
  Key, HelpCircle, LogOut, ArrowRight, CheckCircle, RefreshCw, Radio, Settings, 
  Lock, Unlock, Phone, Video, AlertTriangle, Moon, Ghost, Ban, List, ShieldBan, 
  Maximize2, EyeIcon, UserCheck, Smartphone, MoreHorizontal, Download, Play, 
  CornerUpLeft, CheckSquare, Clock
} from 'lucide-react';

interface PrivacySettingsModalProps {
  isOpen: boolean;
  userId?: string;
  profilePreview?: { name?: string; username?: string; avatar?: string; bio?: string; location?: string; coverImage?: string };
  onClose: () => void;
  privacy?: {
    visibility: 'everyone' | 'contacts' | 'nobody';
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
    mediaQuality: 'hd' | 'saver';
  };
  blockedUsers?: Array<{ id: string; name: string; username: string; avatar: string; reason?: string }>;
  onUnblockUser?: (id: string) => void;
  onBulkUnblock?: () => void;
  onSavePrivacy?: (next: {
    visibility: 'everyone' | 'contacts' | 'nobody';
    lastSeen: 'everyone' | 'contacts' | 'nobody';
    readReceipts: boolean;
    mediaQuality: 'hd' | 'saver';
  }) => void;
}

// Sub-interfaces for complete control
type VisibilityAudience = 'everyone' | 'followers' | 'following' | 'mutual_friends' | 'contacts' | 'close_friends' | 'nobody' | 'custom';

function readPrivacyList(key: string, demoIds: string[] = []): any[] {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    const demoIdSet = new Set(demoIds);
    return parsed.filter(item => !item || typeof item !== 'object'
      || typeof (item as { id?: unknown }).id !== 'string'
      || !demoIdSet.has((item as { id: string }).id));
  } catch {
    return [];
  }
}

export default function PrivacySettingsModal({ 
  isOpen,
  userId,
  profilePreview,
  onClose, 
  privacy, 
  blockedUsers: syncedBlockedUsers,
  onUnblockUser,
  onBulkUnblock,
  onSavePrivacy 
}: PrivacySettingsModalProps) {
  // --- STATE PERSISTENCE & INITIALIZATION ---
  const [activeTab, setActiveTab] = useState<'presence' | 'profile' | 'messaging' | 'calls' | 'groups' | 'discover' | 'blocked' | 'hidden_chats' | 'safety'>('presence');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom List State for custom audiences
  const [customPeople, setCustomPeople] = useState<string[]>([]);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [privacySaveError, setPrivacySaveError] = useState('');
  const [isAddingCustomPerson, setIsAddingCustomPerson] = useState(false);
  const [newCustomPersonName, setNewCustomPersonName] = useState('');

  // 1. Presence & Activity
  const [presence, setPresence] = useState(() => {
    const saved = localStorage.getItem('nx_privacy_presence');
    return saved ? JSON.parse(saved) : {
      lastSeen: 'followers' as VisibilityAudience,
      onlineStatus: 'followers' as VisibilityAudience,
      typingIndicator: 'everyone' as VisibilityAudience,
      recordingIndicator: 'everyone' as VisibilityAudience,
      currentlyActive: 'followers' as VisibilityAudience,
      recentlyActive: 'following' as VisibilityAudience,
      readMessages: 'everyone' as VisibilityAudience,
      voiceActivity: 'followers' as VisibilityAudience
    };
  });

  // 2. Profile Visibility
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('nx_privacy_profile');
    return saved ? JSON.parse(saved) : {
      profilePhoto: 'everyone' as VisibilityAudience,
      coverPhoto: 'followers' as VisibilityAudience,
      displayName: 'everyone' as VisibilityAudience,
      username: 'everyone' as VisibilityAudience,
      bio: 'followers' as VisibilityAudience,
      pronouns: 'everyone' as VisibilityAudience,
      website: 'following' as VisibilityAudience,
      verifiedBadge: 'everyone' as VisibilityAudience,
      location: 'nobody' as VisibilityAudience,
      birthday: 'nobody' as VisibilityAudience,
      joinedDate: 'everyone' as VisibilityAudience,
      followerCount: 'followers' as VisibilityAudience,
      followingCount: 'followers' as VisibilityAudience,
      posts: 'everyone' as VisibilityAudience,
      likes: 'followers' as VisibilityAudience,
      bookmarks: 'nobody' as VisibilityAudience,
      collections: 'nobody' as VisibilityAudience,
      achievements: 'followers' as VisibilityAudience
    };
  });

  // Live Preview PERSPECTIVE Simulator
  const [previewRole, setPreviewRole] = useState<'self' | 'friend' | 'follower' | 'stranger' | 'blocked' | 'close_friend'>('friend');

  // 3. Messaging
  const [messaging, setMessaging] = useState(() => {
    const saved = localStorage.getItem('nx_privacy_messaging');
    return saved ? JSON.parse(saved) : {
      messageYou: 'everyone' as VisibilityAudience,
      replyToStories: 'followers' as VisibilityAudience,
      mentionYou: 'everyone' as VisibilityAudience,
      quoteMessages: 'everyone' as VisibilityAudience,
      forwardMessages: 'followers' as VisibilityAudience,
      inviteYou: 'followers' as VisibilityAudience,
      reactMessages: 'everyone' as VisibilityAudience,
      sendVoiceNotes: 'everyone' as VisibilityAudience,
      sendMedia: 'everyone' as VisibilityAudience
    };
  });

  // 4. Read Receipts
  const [receipts, setReceipts] = useState(() => {
    const saved = localStorage.getItem('nx_privacy_receipts');
    return saved ? JSON.parse(saved) : {
      messageRead: true,
      storyViews: true,
      voicePlays: true,
      mediaViews: true,
      linkOpens: true,
      pollParticipation: true
    };
  });

  // 5. Calls
  const [calls, setCalls] = useState(() => {
    const saved = localStorage.getItem('nx_privacy_calls');
    return saved ? JSON.parse(saved) : {
      voiceCall: 'everyone' as VisibilityAudience,
      videoCall: 'followers' as VisibilityAudience,
      groupCallInvite: 'followers' as VisibilityAudience,
      screenShare: 'followers' as VisibilityAudience,
      voiceRoomInvite: 'followers' as VisibilityAudience,
      businessCall: 'everyone' as VisibilityAudience,
      unknownCallers: 'silence' as 'normal' | 'silence' | 'requests' | 'block'
    };
  });

  // 6. Group & Community
  const [groups, setGroups] = useState(() => {
    const saved = localStorage.getItem('nx_privacy_groups');
    return saved ? JSON.parse(saved) : {
      addToGroups: 'followers' as VisibilityAudience,
      addToCommunities: 'followers' as VisibilityAudience,
      inviteYou: 'followers' as VisibilityAudience,
      mentionEveryone: 'followers' as VisibilityAudience,
      tagYou: 'everyone' as VisibilityAudience,
      assignAdmin: 'nobody' as VisibilityAudience,
      communityApproval: true
    };
  });

  // 7. Broadcast Privacy
  const [broadcasts, setBroadcasts] = useState(() => {
    const saved = localStorage.getItem('nx_privacy_broadcasts');
    return saved ? JSON.parse(saved) : {
      sendBroadcasts: 'followers' as VisibilityAudience,
      inviteToBroadcasts: 'followers' as VisibilityAudience,
      receiveCreator: 'everyone' as VisibilityAudience,
      receivePromotional: 'nobody' as VisibilityAudience,
      autoSubscribe: false,
      allowBusiness: true
    };
  });

  // 8. Discoverability
  const [discoverability, setDiscoverability] = useState(() => {
    const saved = localStorage.getItem('nx_privacy_discoverability');
    return saved ? JSON.parse(saved) : {
      searchResults: true,
      friendSuggestions: true,
      nearbyDiscovery: false,
      qrSharing: true,
      usernameLookup: true,
      phoneNumberLookup: false,
      trendingUsers: true,
      recommendations: true,
      importContacts: false,
      hiddenAccountMode: false // MASTER GHOST MODE
    };
  });

  // 9. Blocked Users Ledger
  const [blockedUsers, setBlockedUsers] = useState<any[]>(() => readPrivacyList('nx_privacy_blocked', ['b-1', 'b-2', 'b-3']));
  useEffect(() => {
    if (syncedBlockedUsers) setBlockedUsers(syncedBlockedUsers);
  }, [syncedBlockedUsers]);
  const [blockedSearchQuery, setBlockedSearchQuery] = useState('');
  const [selectedBlockedId, setSelectedBlockedId] = useState<string | null>(null);

  // 10. Restricted Accounts
  const [restrictedUsers, setRestrictedUsers] = useState<any[]>([]);

  // 11. Hidden Chats PIN Configuration
  const [hiddenChats, setHiddenChats] = useState(() => {
    const defaults = {
      protectionType: 'None' as 'PIN' | 'Password' | 'Pattern' | 'None',
      pinCode: '',
      autoHideTime: '5mins' as 'immediate' | '1min' | '5mins' | '15mins' | 'never',
      hiddenChatIds: [] as string[],
    };
    try {
      const saved = localStorage.getItem('nx_privacy_hidden_chats');
      if (!saved) return defaults;
      const parsed = JSON.parse(saved);
      if (!parsed || typeof parsed !== 'object') return defaults;
      const hiddenChatIds = Array.isArray(parsed.hiddenChatIds)
        ? parsed.hiddenChatIds.filter((id: unknown) => typeof id === 'string' && id !== 'chat-hidden-1')
        : [];
      const containedDemoChat = Array.isArray(parsed.hiddenChatIds) && parsed.hiddenChatIds.includes('chat-hidden-1');
      return {
        ...defaults,
        ...parsed,
        hiddenChatIds,
        ...(containedDemoChat && parsed.pinCode === '1337'
          ? { pinCode: '', protectionType: 'None' as const }
          : {}),
      };
    } catch {
      return defaults;
    }
  });
  const [enteredPIN, setEnteredPIN] = useState('');
  const [pinChangeState, setPinChangeState] = useState<'idle' | 'verify' | 'new' | 'confirm'>('idle');
  const [tempPIN, setTempPIN] = useState('');

  // 12. Safety Center (Mutes, Reports, Device Log)
  const [mutedUsers, setMutedUsers] = useState<any[]>([]);
  const [reportedLogs, setReportedLogs] = useState<any[]>([]);
  const [loginHistory, setLoginHistory] = useState<any[]>([]);
  const [suspiciousActivity, setSuspiciousActivity] = useState<any[]>([]);
  const [analyticsObservations, setAnalyticsObservations] = useState(() => localStorage.getItem('nexora_analytics_observations_enabled') === 'true');

  // Load account-backed profile visibility preferences whenever this modal opens.
  useEffect(() => {
    if (!isOpen || !userId) return;
    let active = true;
    SettingsService.getSettings(userId).then(settings => {
      if (!active) return;
      setProfile(previous => ({ ...previous, ...settings.privacy.profileVisibility }));
      if (!syncedBlockedUsers) {
        setBlockedUsers(settings.messaging.blockedUserIds.map(id => ({
          id,
          name: `Account ${id.slice(0, 10)}`,
          username: id,
          avatar: '',
          reason: 'Blocked in account settings',
        })));
      }
    }).catch(() => {
      if (active) setPrivacySaveError('Could not load account privacy and safety preferences. Changes may not be current.');
    });
    return () => { active = false; };
  }, [isOpen, userId, syncedBlockedUsers]);

  // Sync legacy local-only controls. Profile visibility is cloud-backed when signed in.
  useEffect(() => {
    localStorage.setItem('nx_privacy_presence', JSON.stringify(presence));
  }, [presence]);

  useEffect(() => {
    if (!userId) localStorage.setItem('nx_privacy_profile', JSON.stringify(profile));
  }, [profile, userId]);

  useEffect(() => {
    localStorage.setItem('nx_privacy_messaging', JSON.stringify(messaging));
  }, [messaging]);

  useEffect(() => {
    localStorage.setItem('nx_privacy_receipts', JSON.stringify(receipts));
  }, [receipts]);

  useEffect(() => {
    localStorage.setItem('nx_privacy_calls', JSON.stringify(calls));
  }, [calls]);

  useEffect(() => {
    localStorage.setItem('nx_privacy_groups', JSON.stringify(groups));
  }, [groups]);

  useEffect(() => {
    localStorage.setItem('nx_privacy_broadcasts', JSON.stringify(broadcasts));
  }, [broadcasts]);

  useEffect(() => {
    localStorage.setItem('nx_privacy_discoverability', JSON.stringify(discoverability));
  }, [discoverability]);

  useEffect(() => {
    if (!userId && !onUnblockUser) localStorage.setItem('nx_privacy_blocked', JSON.stringify(blockedUsers));
  }, [blockedUsers, onUnblockUser, userId]);

  useEffect(() => {
    localStorage.setItem('nx_privacy_hidden_chats', JSON.stringify(hiddenChats));
  }, [hiddenChats]);

  // Reciprocity Rule Determiner
  const getReciprocityText = (settingName: string, value: VisibilityAudience) => {
    if (value === 'nobody') {
      return `🔒 Reciprocity Rule Enabled: Since you hide your ${settingName}, you won't be able to view ${settingName} metadata from other Nexora ledger nodes.`;
    }
    if (value === 'custom') {
      return `👥 Custom list protocol active. Only ${customPeople.length} approved people can query your ${settingName}.`;
    }
    return `✨ Transparent Mode: Other nodes can query your ${settingName} according to their visibility list.`;
  };

  const getVisibilityBadgeColor = (val: VisibilityAudience) => {
    switch (val) {
      case 'everyone': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'followers': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'following': return 'bg-violet-500/10 text-violet-400 border-white/10';
      case 'nobody': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'custom': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';
    }
  };

  const handleApplyChanges = async () => {
    if (savingPrivacy) return;
    setSavingPrivacy(true);
    setPrivacySaveError('');
    try {
      setAnalyticsObservationConsent(analyticsObservations);
      if (userId) {
        await SettingsService.updatePrivacy(userId, { profileVisibility: profile });
      } else {
        localStorage.setItem('nx_privacy_profile', JSON.stringify(profile));
      }
      if (onSavePrivacy) {
        onSavePrivacy({
          visibility: profile.profilePhoto === 'everyone' ? 'everyone' : (profile.profilePhoto === 'nobody' ? 'nobody' : 'contacts'),
          lastSeen: presence.lastSeen === 'everyone' ? 'everyone' : (presence.lastSeen === 'nobody' ? 'nobody' : 'contacts'),
          readReceipts: receipts.messageRead,
          mediaQuality: 'saver'
        });
      }
      window.dispatchEvent(new CustomEvent('toast', {
        detail: userId ? 'Profile visibility preferences saved to your NEXORA account.' : 'Privacy preferences saved on this device.'
      }));
      onClose();
    } catch {
      setPrivacySaveError('Your profile visibility preferences could not be saved. Please retry.');
    } finally {
      setSavingPrivacy(false);
    }
  };

  // Profile Preview Simulator Logic
  const canViewParameter = (param: keyof typeof profile, audience: VisibilityAudience) => {
    if (discoverability.hiddenAccountMode && previewRole !== 'self') {
      // In ghost mode, only close friends or mutuals might see if explicitly allowed, but stranger/follower see nothing!
      if (previewRole === 'close_friend' && audience === 'close_friends') return true;
      return false;
    }

    if (audience === 'everyone') return true;
    if (audience === 'nobody') return false;
    
    switch (previewRole) {
      case 'self':
        return true;
      case 'close_friend':
        return audience === 'close_friends' || audience === 'followers' || audience === 'following' || audience === 'mutual_friends' || audience === 'contacts';
      case 'friend':
        return audience === 'followers' || audience === 'following' || audience === 'mutual_friends' || audience === 'contacts';
      case 'follower':
        return audience === 'followers';
      case 'stranger':
        return false;
      case 'blocked':
        return false;
      default:
        return false;
    }
  };

  // Blocked Users filter
  const filteredBlockedList = useMemo(() => {
    return blockedUsers.filter(u => 
      u.name.toLowerCase().includes(blockedSearchQuery.toLowerCase()) || 
      u.username.toLowerCase().includes(blockedSearchQuery.toLowerCase())
    );
  }, [blockedUsers, blockedSearchQuery]);

  // Bulk unblock
  const handleBulkUnblock = async () => {
    if (onBulkUnblock) {
      onBulkUnblock();
      return;
    }
    if (!userId) {
      setBlockedUsers([]);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Cleared this device-only blocked list.' }));
      return;
    }
    try {
      await Promise.all([
        SettingsService.updateMessagingPreferences(userId, { blockedUserIds: [] }),
        SettingsService.updateFeed(userId, { blockedCreatorIds: [] }),
      ]);
      setBlockedUsers([]);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'All blocked accounts were removed from your saved safety preferences.' }));
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'The blocked list could not be cleared. Please retry.' }));
    }
  };

  const handleUnblockUser = async (id: string) => {
    if (onUnblockUser) {
      onUnblockUser(id);
      return;
    }
    if (!userId) {
      setBlockedUsers(prev => prev.filter(u => u.id !== id));
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Removed from this device-only blocked list.' }));
      return;
    }
    try {
      const settings = await SettingsService.getSettings(userId);
      await Promise.all([
        SettingsService.updateMessagingPreferences(userId, { blockedUserIds: settings.messaging.blockedUserIds.filter(value => value !== id) }),
        SettingsService.updateFeed(userId, { blockedCreatorIds: settings.feed.blockedCreatorIds.filter(value => value !== id) }),
      ]);
      setBlockedUsers(prev => prev.filter(u => u.id !== id));
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Account unblocked in your saved safety preferences.' }));
    } catch {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'This account could not be unblocked. Please retry.' }));
    }
  };

  // Toggle Custom Person list
  const handleAddCustomPerson = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCustomPersonName.trim()) {
      setCustomPeople(prev => [...prev, newCustomPersonName.trim()]);
      setNewCustomPersonName('');
      setIsAddingCustomPerson(false);
      window.dispatchEvent(new CustomEvent('toast', { detail: `👤 Added ${newCustomPersonName} to Custom Audience List!` }));
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 20 }}
          className="w-full max-w-6xl h-[88vh] bg-[#070514] border border-white/10 rounded-3xl text-white shadow-md relative flex flex-col overflow-hidden"
        >
          {/* Main GHOST GLOW Header bar if active */}
          {discoverability.hiddenAccountMode && (
            <div className="bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-indigo-500/20 px-6 py-2 border-b border-emerald-500/20 flex items-center justify-between text-xs text-emerald-400 font-mono">
              <span className="flex items-center gap-2">
                <Ghost className="w-4 h-4 animate-pulse text-emerald-400" />
                <span>💎 CONCEALMENT PROTOCOL ACTIVE (GHOST MODE) — Your node signature has vanished from all indexes.</span>
              </span>
              <button 
                onClick={() => setDiscoverability(prev => ({ ...prev, hiddenAccountMode: false }))}
                className="hover:underline hover:text-white cursor-pointer"
              >
                Deactivate Settings
              </button>
            </div>
          )}

          {/* Core Applet Titlebar */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-600/10 border border-white/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-violet-400" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-black font-sans uppercase tracking-wider text-white">Nexora Privacy Center</h3>
                <p className="text-[10px] font-mono text-zinc-400 leading-tight mt-0.5">Decentralized Trust Ledger & Security Dashboard</p>
              </div>
            </div>

            {/* Quick Global Search */}
            <div className="hidden md:flex items-center gap-2 max-w-xs flex-1 px-3 py-1.5 bg-slate-950/80 border border-white/5 rounded-xl">
              <Search className="w-3.5 h-3.5 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search privacy options..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder-zinc-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-white text-[10px]">Clear</button>
              )}
            </div>

            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/5 border border-white/10 rounded-xl text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Outer Grid Body */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            
            {/* Left Sidebar Category Tabs */}
            <div className="w-full md:w-64 border-r border-white/5 bg-black/20 overflow-y-auto p-3 space-y-1">
              {[
                { id: 'presence', label: 'Presence & Activity', icon: Eye, count: Object.keys(presence).length },
                { id: 'profile', label: 'Profile Visibility', icon: User, badge: 'Account saved' },
                { id: 'messaging', label: 'Messaging Settings', icon: Radio, count: Object.keys(messaging).length },
                { id: 'calls', label: 'Call Controls & Silence', icon: Phone, count: Object.keys(calls).length },
                { id: 'groups', label: 'Group Ledger Rights', icon: Lock, count: Object.keys(groups).length },
                { id: 'discover', label: 'Discoverability Grid', icon: Ghost, badge: discoverability.hiddenAccountMode ? 'Ghost' : '' },
                { id: 'blocked', label: 'Blocked & Restricted', icon: ShieldBan, count: blockedUsers.length + restrictedUsers.length },
                { id: 'hidden_chats', label: 'Hidden PIN Chats', icon: Key, badge: 'Locked' },
                { id: 'safety', label: 'Safety Registry Center', icon: ShieldAlert, badge: 'Alerts' }
              ].map(cat => {
                const Icon = cat.icon;
                const isSelected = activeTab === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveTab(cat.id as any)}
                    className={`w-full p-2.5 rounded-xl flex items-center justify-between text-left transition-all text-xs cursor-pointer ${
                      isSelected 
                        ? 'bg-violet-600/15 border border-white/10 text-violet-200 font-bold' 
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-violet-400' : 'text-zinc-500'}`} />
                      <span className="truncate">{cat.label}</span>
                    </span>
                    {cat.count !== undefined && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-zinc-900 border border-white/5 text-zinc-500">{cat.count}</span>
                    )}
                    {cat.badge && (
                      <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${
                        cat.badge === 'Ghost' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 animate-pulse' : 'bg-violet-600/20 text-violet-300'
                      }`}>{cat.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Right Pane Area */}
            <div className="flex-1 flex flex-col bg-[#05030d] overflow-y-auto p-6 relative">
              
              {/* Presence Tab */}
              {activeTab === 'presence' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Eye className="w-4 h-4 text-violet-400" /> Presence & Social Activity Status
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Configure your real-time socket visibility and activity telemetry across the decentralized chat network.</p>
                  </div>

                  {/* Presence Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'lastSeen', label: 'Last Seen Timestamp', desc: 'When you were last active on the ledger.' },
                      { key: 'onlineStatus', label: 'Real-time Online Indicator', desc: 'Real-time active status pulse indicator.' },
                      { key: 'typingIndicator', label: 'Active Typing Telemetry', desc: 'Show other users when you are drafting a message.' },
                      { key: 'recordingIndicator', label: 'Recording Voice Telemetry', desc: 'Show when you are recording audio bytes.' },
                      { key: 'currentlyActive', label: 'Active Status List', desc: 'Appear in the currently active friends strip.' },
                      { key: 'recentlyActive', label: 'Recently Active Flag', desc: 'Allows the system to flag your node as recently online.' },
                      { key: 'readMessages', label: 'Reading Messages State', desc: 'Allows users to see if you are actively browsing.' },
                      { key: 'voiceActivity', label: 'Voice Room State', desc: 'Shows your status within decentralized audio bridges.' }
                    ].map(item => {
                      const val = presence[item.key as keyof typeof presence] as VisibilityAudience;
                      return (
                        <div key={item.key} className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-200">{item.label}</span>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${getVisibilityBadgeColor(val)}`}>
                                {val}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
                          </div>

                          <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                            {(['everyone', 'followers', 'nobody', 'custom'] as const).map(aud => (
                              <button
                                key={aud}
                                onClick={() => setPresence((prev: any) => ({ ...prev, [item.key]: aud }))}
                                className={`px-2 py-1 rounded-lg text-[9px] font-mono capitalize transition-all cursor-pointer ${
                                  val === aud 
                                    ? 'bg-violet-600/35 text-white font-bold border border-white/10' 
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                              >
                                {aud === 'nobody' ? 'Nobody' : aud}
                              </button>
                            ))}
                          </div>

                          {/* Reciprocity rule */}
                          <p className="text-[9px] font-mono text-zinc-600 leading-none">
                            {getReciprocityText(item.label, val)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Profile visibility settings and audience preview */}
              {activeTab === 'profile' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <User className="w-4 h-4 text-violet-400" /> Profile visibility preferences
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Choose who should be able to see each profile field. These preferences are saved to your account; each profile and discovery surface must also enforce them.</p>
                  </div>

                  {/* Dual Column: Settings (Left) vs Real-Time Simulator (Right) */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left settings */}
                    <div className="lg:col-span-7 space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                      {[
                        { key: 'profilePhoto', label: 'Profile Picture / NFT Avatar' },
                        { key: 'coverPhoto', label: 'Profile Background / Banner' },
                        { key: 'displayName', label: 'Legal Display Name' },
                        { key: 'username', label: 'Username (@handle)' },
                        { key: 'bio', label: 'Biography Profile Metadata' },
                        { key: 'pronouns', label: 'Pronouns Indicator' },
                        { key: 'website', label: 'External Connected Website' },
                        { key: 'verifiedBadge', label: 'Verified badge' },
                        { key: 'location', label: 'Location' },
                        { key: 'birthday', label: 'Birthdate / Solar Coordinates' },
                        { key: 'joinedDate', label: 'Joined date' },
                        { key: 'followerCount', label: 'Followers List & Counter' },
                        { key: 'posts', label: 'Posts' },
                        { key: 'likes', label: 'Likes' }
                      ].map(item => {
                        const val = profile[item.key as keyof typeof profile] as VisibilityAudience;
                        return (
                          <div key={item.key} className="p-3 bg-slate-950/70 border border-white/5 rounded-xl flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-zinc-300 block truncate">{item.label}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              <select 
                                value={val} 
                                onChange={(e) => setProfile((prev: any) => ({ ...prev, [item.key]: e.target.value }))}
                                className="bg-[#0c0a21] border border-white/10 rounded-lg text-[10px] font-mono px-2 py-1 text-zinc-300 outline-none"
                              >
                                <option value="everyone">Everyone</option>
                                <option value="followers">Followers</option>
                                <option value="close_friends">Close Friends</option>
                                <option value="nobody">Nobody / Private</option>
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Right Live Preview Cards */}
                    <div className="lg:col-span-5 bg-black/40 border border-white/5 rounded-2xl p-4 space-y-4 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-black uppercase text-violet-400 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" /> Audience preview
                        </span>
                        
                        <div className="flex items-center gap-1 bg-zinc-950 p-1 border border-white/5 rounded-xl">
                          {(['friend', 'stranger', 'blocked', 'close_friend'] as const).map(role => (
                            <button
                              key={role}
                              onClick={() => setPreviewRole(role)}
                              className={`px-2 py-0.5 rounded text-[8px] font-mono capitalize cursor-pointer ${
                                previewRole === role 
                                  ? 'bg-violet-600 text-white font-bold' 
                                  : 'text-zinc-500'
                              }`}
                            >
                              {role === 'close_friend' ? 'Close Friend' : role}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Display simulator result */}
                      <div className="space-y-4">
                        {/* Mock Cover Banner */}
                        <div className="h-20 bg-slate-800 rounded-xl relative overflow-hidden">
                          {canViewParameter('coverPhoto', profile.coverPhoto) ? (
                            <img 
                              src={profilePreview?.coverImage || undefined} 
                              alt="Cover" 
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-900/90 flex items-center justify-center text-[10px] font-mono text-zinc-600 gap-1">
                              <Lock className="w-3 h-3" /> Cover Hidden
                            </div>
                          )}

                          {/* Avatar overlay */}
                          <div className="absolute -bottom-4 left-4 w-12 h-12 rounded-xl bg-violet-600 p-0.5 border-2 border-black">
                            {canViewParameter('profilePhoto', profile.profilePhoto) ? (
                              <img 
                                src={profilePreview?.avatar || undefined} 
                                alt="Avatar" 
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <div className="w-full h-full bg-slate-950 flex items-center justify-center rounded-lg text-zinc-600">
                                <Lock className="w-4 h-4" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Text fields simulated */}
                        <div className="pt-2 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black">
                              {canViewParameter('displayName', profile.displayName) ? (profilePreview?.name || 'Your name') : '••••••••'}
                            </span>
                            {canViewParameter('verifiedBadge', profile.verifiedBadge) && (
                              <span className="w-3.5 h-3.5 bg-violet-600 text-[8px] font-black rounded-full flex items-center justify-center text-white" title="Verified Ledger Node">✓</span>
                            )}
                          </div>

                          <div className="text-[10px] font-mono text-zinc-500">
                            {canViewParameter('username', profile.username) ? (profilePreview?.username ? `@${profilePreview.username}` : '@your-username') : '@hidden_handle'}
                          </div>

                          <div className="text-[10px] bg-slate-950 p-2 border border-white/5 rounded-xl text-zinc-400">
                            <span className="text-[8px] font-mono uppercase text-zinc-600 block mb-0.5">Biography</span>
                            {canViewParameter('bio', profile.bio) ? (profilePreview?.bio || 'No bio added yet.') : '🔒 Restricted by protocol'}
                          </div>

                          {/* Grid with other attributes */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-slate-950 p-1.5 border border-white/5 rounded-lg">
                              <span className="text-[7px] font-mono uppercase text-zinc-600 block">Location</span>
                              <span className="text-[9px] text-zinc-400">
                                {canViewParameter('location', profile.location) ? (profilePreview?.location || 'No location added') : '🔒 Restricted'}
                              </span>
                            </div>
                            <div className="bg-slate-950 p-1.5 border border-white/5 rounded-lg">
                              <span className="text-[7px] font-mono uppercase text-zinc-600 block">Followers</span>
                              <span className="text-[9px] text-zinc-400">
                                {canViewParameter('followerCount', profile.followerCount) ? '📈 14,230 accounts' : '🔒 Restricted'}
                              </span>
                            </div>
                          </div>

                          {/* Blocked Mode Indicator */}
                          {previewRole === 'blocked' && (
                            <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-center text-[10px] text-rose-400 font-mono flex items-center justify-center gap-1">
                              <Ban className="w-3.5 h-3.5" /> Blocked users have 0 query privileges.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Messaging & Receipts Tab */}
              {activeTab === 'messaging' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-violet-400" /> Messaging Routing & Interaction Receipts
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Enforce messaging filters and select who has permission to write data chunks or generate notifications on your device.</p>
                  </div>

                  {/* Messaging Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'messageYou', label: 'Who Can Message You', desc: 'Who can open direct ledger chats with you.' },
                      { key: 'replyToStories', label: 'Reply to Stories & Moments', desc: 'Allows replies and emoji waves on published statuses.' },
                      { key: 'mentionYou', label: 'Mention Handle (@handle)', desc: 'Who can mention your node handle in public spaces.' },
                      { key: 'quoteMessages', label: 'Quote Messages', desc: 'Who is allowed to quote your messaging fragments.' },
                      { key: 'forwardMessages', label: 'Forward Your Messages', desc: 'Allows forwarding of your text segments to outer circles.' },
                      { key: 'inviteYou', label: 'Invite to Direct Circles', desc: 'Who can add you to collaborative audio boards.' }
                    ].map(item => {
                      const val = messaging[item.key as keyof typeof messaging] as VisibilityAudience;
                      return (
                        <div key={item.key} className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-200">{item.label}</span>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${getVisibilityBadgeColor(val)}`}>
                                {val}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
                          </div>

                          <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                            {(['everyone', 'followers', 'following', 'nobody'] as const).map(aud => (
                              <button
                                key={aud}
                                onClick={() => setMessaging((prev: any) => ({ ...prev, [item.key]: aud }))}
                                className={`px-2 py-1 rounded-lg text-[9px] font-mono capitalize transition-all cursor-pointer ${
                                  val === aud 
                                    ? 'bg-violet-600/35 text-white font-bold border border-white/10' 
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                              >
                                {aud}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Read Receipts */}
                  <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-4">
                    <span className="text-xs font-black text-violet-400 block font-mono uppercase">Interactive Interaction Receipts</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'messageRead', label: 'Message Read Receipts (Blue ticks)', desc: 'Peers will see blue ticks when you read their text blocks.' },
                        { key: 'storyViews', label: 'Story View Logs', desc: 'Your avatar appears on creators story view logs.' },
                        { key: 'voicePlays', label: 'Voice Note Play indicators', desc: 'Shows green microphone playhead to the sender.' },
                        { key: 'mediaViews', label: 'Media Views (Photos/Videos)', desc: 'Allows senders to verify when media has been opened.' },
                        { key: 'linkOpens', label: 'Link Interaction Flag', desc: 'Sends interaction ticks on clicked markdown links.' },
                        { key: 'pollParticipation', label: 'Poll Choice Visibility', desc: 'Shows your handle alongside selected poll items.' }
                      ].map(item => {
                        const val = receipts[item.key as keyof typeof receipts];
                        return (
                          <div key={item.key} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl">
                            <div className="max-w-[80%]">
                              <span className="text-xs font-bold text-zinc-300 block">{item.label}</span>
                              <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{item.desc}</p>
                            </div>
                            <button
                              onClick={() => setReceipts((prev: any) => ({ ...prev, [item.key]: !val }))}
                              className={`w-9 h-5 rounded-full transition-all flex items-center p-0.5 cursor-pointer ${
                                val ? 'bg-violet-600 justify-end' : 'bg-zinc-800 justify-start'
                              }`}
                            >
                              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Call Privacy Tab */}
              {activeTab === 'calls' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Phone className="w-4 h-4 text-violet-400" /> Decentralized Voice & Video Call Settings
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Configure filters on direct routing requests and shield your node from unsolicited peer-to-peer stream invitations.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'voiceCall', label: 'Who Can Voice Call', desc: 'Allows opening standard audio channels.' },
                      { key: 'videoCall', label: 'Who Can Video Call', desc: 'Enables establishing high-fidelity video feeds.' },
                      { key: 'groupCallInvite', label: 'Group Call Invitations', desc: 'Who can automatically include your node signature on calls.' },
                      { key: 'screenShare', label: 'Screen Share Authorization', desc: 'Who is authorized to request screen share streams.' }
                    ].map(item => {
                      const val = calls[item.key as keyof typeof calls] as VisibilityAudience;
                      return (
                        <div key={item.key} className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-zinc-200">{item.label}</span>
                              <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${getVisibilityBadgeColor(val)}`}>
                                {val}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-500 mt-1 leading-relaxed">{item.desc}</p>
                          </div>

                          <div className="flex flex-wrap gap-1 bg-black/40 p-1 rounded-xl border border-white/5">
                            {(['everyone', 'followers', 'following', 'nobody'] as const).map(aud => (
                              <button
                                key={aud}
                                onClick={() => setCalls((prev: any) => ({ ...prev, [item.key]: aud }))}
                                className={`px-2 py-1 rounded-lg text-[9px] font-mono capitalize transition-all cursor-pointer ${
                                  val === aud 
                                    ? 'bg-violet-600/35 text-white font-bold border border-white/10' 
                                    : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                              >
                                {aud}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Unknown Callers Shield */}
                  <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-3">
                    <div>
                      <span className="text-xs font-bold text-zinc-200 block">Unknown Caller Filtering</span>
                      <p className="text-[10px] text-zinc-500 leading-normal mt-1">Select the action your device performs when a non-follower node sends a routing/connection request.</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {[
                        { id: 'normal', label: 'Ring Normally', desc: 'Trigger alert' },
                        { id: 'silence', label: 'Silent Ring', desc: 'No sound alert' },
                        { id: 'requests', label: 'Go to Requests', desc: 'Approve manual' },
                        { id: 'block', label: 'Auto Block', desc: 'Reject instant' }
                      ].map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setCalls((prev: any) => ({ ...prev, unknownCallers: opt.id }))}
                          className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                            calls.unknownCallers === opt.id 
                              ? 'bg-violet-600/10 border-white/10 text-white' 
                              : 'bg-black/30 border-transparent text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          <span className="text-[10.5px] font-black block">{opt.label}</span>
                          <span className="text-[8.5px] font-mono text-zinc-500 mt-1 block leading-none">{opt.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Group & Broadcast Tab */}
              {activeTab === 'groups' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Lock className="w-4 h-4 text-violet-400" /> Decentralized Group Ledgers & Creator Broadcasts
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Administer authorization permissions for collective channels and dictate which broadcasts are broadcasted onto your active routing stream.</p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-4">
                    <span className="text-xs font-black text-violet-400 font-mono uppercase block">Group & Community Rules</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'addToGroups', label: 'Add to Collective Chats', desc: 'Who can directly index your node signature within group chats.' },
                        { key: 'addToCommunities', label: 'Add to Nexora Communities', desc: 'Who can directly join your user identity into large networks.' },
                        { key: 'mentionEveryone', label: 'Mention Everyone Rights', desc: 'Allow members to trigger @everyone alerts for you.' }
                      ].map(item => {
                        const val = groups[item.key as keyof typeof groups] as VisibilityAudience;
                        return (
                          <div key={item.key} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-zinc-200 block truncate">{item.label}</span>
                              <span className="text-[9.5px] text-zinc-500 block leading-tight mt-0.5">{item.desc}</span>
                            </div>
                            <select 
                              value={val} 
                              onChange={(e) => setGroups((prev: any) => ({ ...prev, [item.key]: e.target.value }))}
                              className="bg-[#0c0a21] border border-white/10 rounded-lg text-[10px] font-mono px-2 py-1 text-zinc-300 outline-none"
                            >
                              <option value="everyone">Everyone</option>
                              <option value="followers">Followers</option>
                              <option value="nobody">Nobody / Private</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Broadcast Privacy */}
                  <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-4">
                    <span className="text-xs font-black text-emerald-400 font-mono uppercase block">Broadcast Subscription Control</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'receiveCreator', label: 'Receive Creator Broadcasts', desc: 'Receive high-fidelity updates from followed influencers.' },
                        { key: 'receivePromotional', label: 'Receive Promotional Bulletins', desc: 'Allow verified channels to send advertising broadcasts.' }
                      ].map(item => {
                        const val = broadcasts[item.key as keyof typeof broadcasts] as VisibilityAudience;
                        return (
                          <div key={item.key} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-xs font-bold text-zinc-200 block truncate">{item.label}</span>
                              <span className="text-[9.5px] text-zinc-500 block leading-tight mt-0.5">{item.desc}</span>
                            </div>
                            <select 
                              value={val} 
                              onChange={(e) => setBroadcasts((prev: any) => ({ ...prev, [item.key]: e.target.value }))}
                              className="bg-[#0c0a21] border border-white/10 rounded-lg text-[10px] font-mono px-2 py-1 text-zinc-300 outline-none"
                            >
                              <option value="everyone">Everyone</option>
                              <option value="followers">Followers</option>
                              <option value="nobody">Nobody / Private</option>
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Discoverability Tab */}
              {activeTab === 'discover' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Ghost className="w-4 h-4 text-violet-400" /> Node Discoverability & Hidden Account Mode
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Dictate how the search engines and discovery protocols of Nexora locate your account signature.</p>
                  </div>

                  {/* MASTER GHOST MODE CARD */}
                  <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-slate-950/90 to-teal-950/40 border border-emerald-500/25 rounded-3xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Ghost className="w-24 h-24 text-emerald-400" />
                    </div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="max-w-xl text-left">
                        <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-[9px] font-mono uppercase tracking-wider text-emerald-400 rounded-md font-black">Concealment Mode</span>
                        <h5 className="text-sm font-bold text-white mt-1.5 flex items-center gap-2">
                          Master Ghost Mode (Complete Disappearance)
                        </h5>
                        <p className="text-[10.5px] text-zinc-400 mt-1 leading-relaxed">
                          When enabled, your profile entirely vanishes from search indices, suggestion reels, nearby logs, and follower counts. You become a total ghost node, while still maintaining full active chat capability with previously approved connections.
                        </p>
                      </div>

                      <button
                        onClick={() => setDiscoverability(prev => ({ ...prev, hiddenAccountMode: !prev.hiddenAccountMode }))}
                        className={`px-5 py-2.5 rounded-xl font-mono text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all ${
                          discoverability.hiddenAccountMode 
                            ? 'bg-emerald-500 text-black border-transparent shadow-lg shadow-emerald-950' 
                            : 'bg-[#080516] text-zinc-400 border-white/10 hover:border-emerald-500/30 hover:text-white'
                        }`}
                      >
                        {discoverability.hiddenAccountMode ? '🔒 Ghost Active' : '🔓 Initiate Ghost'}
                      </button>
                    </div>
                  </div>

                  {/* Search index items */}
                  <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-4">
                    <span className="text-xs font-black text-violet-400 font-mono uppercase block">Active Discovery Indexes</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { key: 'searchResults', label: 'Include in Search Results', desc: 'Allows your node handle to render in the global index searches.' },
                        { key: 'friendSuggestions', label: 'Suggest to Mutual Connections', desc: 'Suggests your handle to friends of your friends.' },
                        { key: 'nearbyDiscovery', label: 'Nearby Beacon Discovery', desc: 'Radiates a local signal for mesh searching.' },
                        { key: 'usernameLookup', label: 'Search by Direct Handle', desc: 'Permits exact handle querying in index lookups.' },
                        { key: 'phoneNumberLookup', label: 'Query by Contact Registry', desc: 'Enables resolving your node via synchronized address books.' },
                        { key: 'trendingUsers', label: 'Trending / Popular Account list', desc: 'Permits listing inside popular creators listings.' }
                      ].map(item => {
                        const val = discoverability[item.key as keyof typeof discoverability];
                        const isDisabled = discoverability.hiddenAccountMode;
                        return (
                          <div key={item.key} className={`flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl transition-all ${
                            isDisabled ? 'opacity-40' : ''
                          }`}>
                            <div className="max-w-[80%]">
                              <span className="text-xs font-bold text-zinc-300 block">{item.label}</span>
                              <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{item.desc}</p>
                            </div>
                            <button
                              disabled={isDisabled}
                              onClick={() => setDiscoverability((prev: any) => ({ ...prev, [item.key]: !val }))}
                              className={`w-9 h-5 rounded-full transition-all flex items-center p-0.5 ${
                                isDisabled ? 'cursor-not-allowed bg-zinc-900 justify-start' : 'cursor-pointer'
                              } ${
                                !isDisabled && val ? 'bg-violet-600 justify-end' : 'bg-zinc-800 justify-start'
                              }`}
                            >
                              <span className="w-4 h-4 bg-white rounded-full shadow-md" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Blocked Accounts Tab */}
              {activeTab === 'blocked' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldBan className="w-4 h-4 text-rose-400" /> Decentralized Connection Blacklists
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1 font-mono uppercase tracking-tight">Saved block settings are applied to messaging and feed preferences. Other surfaces still require end-to-end enforcement verification.</p>
                  </div>

                  {/* Filters Header */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-3 bg-slate-950/70 border border-white/5 rounded-2xl">
                    <div className="flex items-center gap-2 w-full md:max-w-xs px-3 py-1.5 bg-black border border-white/5 rounded-xl">
                      <Search className="w-3.5 h-3.5 text-zinc-500" />
                      <input 
                        type="text" 
                        placeholder="Search blacklisted handles..." 
                        value={blockedSearchQuery}
                        onChange={(e) => setBlockedSearchQuery(e.target.value)}
                        className="w-full bg-transparent text-xs text-zinc-200 outline-none placeholder-zinc-600"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleBulkUnblock}
                        className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 rounded-xl text-[10px] font-mono uppercase font-bold cursor-pointer transition-all"
                      >
                        ⚠️ Bulk Reset Blacklist
                      </button>
                    </div>
                  </div>

                  {/* List Grid */}
                  {filteredBlockedList.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredBlockedList.map(user => (
                        <div key={user.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-2xl flex items-center justify-between gap-3 relative overflow-hidden group">
                          {/* Absolute glowing border effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                          <div className="flex items-center gap-3 min-w-0 relative">
                            {user.avatar ? <img src={user.avatar} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10" /> : <div className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center"><User className="w-4 h-4 text-zinc-400" /></div>}
                            <div className="min-w-0 text-left">
                              <span className="text-xs font-black block text-zinc-100 truncate">{user.name}</span>
                              <span className="text-[9.5px] font-mono text-rose-400 block mt-0.5">Account ID: {user.username.slice(0, 10)}</span>
                              <span className="text-[8.5px] font-mono text-zinc-600 block mt-1 truncate max-w-[140px]">{user.reason}</span>
                            </div>
                          </div>

                          <div className="relative">
                            <button
                              onClick={() => handleUnblockUser(user.id)}
                              className="px-2.5 py-1.5 bg-zinc-900 border border-white/10 hover:bg-violet-600/25 hover:border-white/10 text-[10px] text-zinc-300 font-mono rounded-lg transition-all cursor-pointer"
                            >
                              Unblock
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 bg-slate-950/20 border border-dashed border-white/5 rounded-2xl text-center">
                      <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto opacity-30 mb-2" />
                      <p className="text-xs text-zinc-400 font-bold">Ledger Clear: 0 connection restrictions active.</p>
                    </div>
                  )}

                  {/* Soft Restriction Section */}
                  <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-4">
                    <div>
                      <span className="text-xs font-black text-amber-400 block font-mono uppercase">Restricted Accounts (Soft Privacy Block)</span>
                      <p className="text-[10px] text-zinc-500 mt-1 leading-normal">
                        Restricted accounts can write message requests to your device, but they receive no alerts of delivery, typing indicators, read ticks, or presence telemetry. Excellent for avoiding connection friction without hard blocks.
                      </p>
                    </div>

                    <div className="space-y-2">
                      {restrictedUsers.length > 0 ? restrictedUsers.map(res => (
                        <div key={res.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <img src={res.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            <div className="text-left">
                              <span className="text-xs font-bold text-zinc-200 block">{res.name}</span>
                              <span className="text-[9px] font-mono text-zinc-500">{res.username}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => setRestrictedUsers([])}
                            className="text-[10px] text-zinc-500 hover:text-white"
                          >
                            Lift Restriction
                          </button>
                        </div>
                      )) : (
                        <p className="rounded-xl border border-dashed border-white/10 bg-black/20 p-3 text-[10px] leading-relaxed text-zinc-400">
                          Restrict is not currently connected to account-level enforcement. Use Block User for the block controls saved to your account.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden Chats Tab */}
              {activeTab === 'hidden_chats' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-violet-400" /> Hidden Chats Security Configuration
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Conceal private direct chats behind custom authorization gates. Access is strictly blocked without valid input keys.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Security credentials form */}
                    <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-4">
                      <span className="text-xs font-black text-violet-400 font-mono uppercase block">Authentication Gate Selection</span>
                      
                      <div className="space-y-2">
                        {[
                          { id: 'PIN', label: 'Numeric PIN', desc: '4-digit secure code' },
                          { id: 'Password', label: 'Alphanumeric Key', desc: 'Secure high-entropy word' },
                          { id: 'Pattern', label: 'Swipe Pattern Grid', desc: 'Swipe matrix ledger' },
                          { id: 'FaceUnlock', label: 'Biometric Face ID', desc: 'Local facial contour scan' }
                        ].map(type => (
                          <button
                            key={type.id}
                            onClick={() => setHiddenChats((prev: any) => ({ ...prev, protectionType: type.id }))}
                            className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                              hiddenChats.protectionType === type.id 
                                ? 'bg-violet-600/10 border-white/10 text-white' 
                                : 'bg-black/30 border-transparent text-zinc-500 hover:text-zinc-300'
                            }`}
                          >
                            <div>
                              <span className="text-xs font-bold block">{type.label}</span>
                              <span className="text-[9px] font-mono text-zinc-500 leading-none">{type.desc}</span>
                            </div>
                            {hiddenChats.protectionType === type.id && <Check className="w-4 h-4 text-violet-400" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Hidden chat access settings */}
                    <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl flex flex-col justify-between">
                      <div className="space-y-2">
                        <span className="text-xs font-black text-indigo-400 font-mono uppercase block">Active Gate Authorization Key</span>
                        <p className="text-[10px] text-zinc-500 leading-normal">
                          Set the required code to authorize viewing hidden chat tabs in Nexora.
                        </p>
                      </div>

                      <div className="my-4 bg-black/40 border border-white/5 rounded-xl p-3 text-center">
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-1">Current Gate PIN</span>
                        <span className="text-lg font-mono font-black tracking-widest text-violet-300">••••</span>
                      </div>

                      <div className="flex gap-2">
                        <input 
                          type="password" 
                          maxLength={4}
                          placeholder="New 4-digit PIN"
                          value={tempPIN}
                          onChange={(e) => setTempPIN(e.target.value.replace(/\D/g, ''))}
                          className="flex-1 bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-center outline-none text-white focus:border-violet-500"
                        />
                        <button
                          onClick={() => {
                            if (tempPIN.length === 4) {
                              setHiddenChats((prev: any) => ({ ...prev, pinCode: tempPIN }));
                              setTempPIN('');
                              window.dispatchEvent(new CustomEvent('toast', { detail: "🔑 Hidden Chat lock PIN has been successfully re-routed!" }));
                            } else {
                              window.dispatchEvent(new CustomEvent('toast', { detail: "⚠️ PIN must be exactly 4 digits long." }));
                            }
                          }}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-mono uppercase font-black cursor-pointer"
                        >
                          Update
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Safety Registry Center Tab */}
              {activeTab === 'safety' && (
                <div className="space-y-6 text-left">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-violet-400" /> Decentralized Safety Center & Device Sessions
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-1">Audit active sessions, investigate alerts, and review routing records on the decentralized ledger network.</p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-violet-500/15 rounded-2xl flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-black text-violet-300 font-mono uppercase block">Product analytics observations</span>
                      <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">Allow minimized feed and feature observations to help Nexora measure quality. No message text, passwords, precise location, raw search text, or secret tokens are sent. Observations are optional and never block normal actions.</p>
                    </div>
                    <button type="button" role="switch" aria-checked={analyticsObservations} onClick={() => setAnalyticsObservations(value => !value)} className={`shrink-0 w-12 h-7 rounded-full p-1 transition-colors ${analyticsObservations ? 'bg-violet-600' : 'bg-zinc-800'}`}>
                      <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${analyticsObservations ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Active Connected Devices */}
                    <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-3">
                      <span className="text-xs font-black text-violet-400 font-mono uppercase block">Authorized Connected Sessions</span>
                      <div className="space-y-2">
                        {loginHistory.map(session => (
                          <div key={session.id} className="p-3 bg-black/40 border border-white/5 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Monitor className="w-4 h-4 text-zinc-500" />
                              <div className="text-left">
                                <span className="text-xs font-bold text-zinc-200 block">{session.device}</span>
                                <span className="text-[9.5px] text-zinc-500 font-mono">Location: {session.location} • IP: {session.ip} • Date: {session.date}</span>
                              </div>
                            </div>
                            <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-white/10">{session.status}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Suspicious Alerts */}
                    <div className="p-4 bg-slate-950/70 border border-white/5 rounded-2xl space-y-3">
                      <span className="text-xs font-black text-rose-400 font-mono uppercase block">Suspicious Activity Ledger</span>
                      <div className="space-y-2">
                        {suspiciousActivity.map(alert => (
                          <div key={alert.id} className="p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl flex items-center gap-3">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <div className="text-left">
                              <span className="text-xs font-bold text-rose-200 block">{alert.type}</span>
                              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">{alert.message} ({alert.time})</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>

          </div>

          {/* Footer Controls */}
          <div className="p-5 border-t border-white/5 flex items-center justify-between bg-black/40">
            <span className="text-[10px] font-mono text-zinc-500 hidden md:inline">Nexora Security Hash: E2EE-AES-256-SHA-3</span>
            
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/5 rounded-xl text-xs font-mono uppercase tracking-wider text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                Cancel Settings
              </button>
              <button
                onClick={() => void handleApplyChanges()}
                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 via-indigo-600 to-pink-500 hover:brightness-110 active:scale-98 rounded-xl text-xs font-mono uppercase tracking-widest font-black text-white shadow-lg shadow-violet-950/40 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>{savingPrivacy ? 'Saving…' : 'Apply Settings'}</span>
              </button>
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
