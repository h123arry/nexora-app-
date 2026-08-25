import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, Users, Coins, Wand2, Check, Plus, Flame, Globe, X, Send, Volume2, Lock, FileText, Calendar, Shield, Trophy, Megaphone, UserCheck, BarChart2, Download, Award, Search, PlusCircle, Eye, Settings, Heart, MessageSquare, Bookmark, ThumbsUp, Trash2, AlertTriangle, UserPlus, ChevronRight, Phone, Link as LinkIcon, CheckCircle, HelpCircle, Info, Layers, ArrowRight, Forward } from 'lucide-react';
import { Circle, User, Page, Post, Comment } from '../types';
import { recordRecommendationEvent } from '../utils/recommendations';
import { createCommunity, createPage, subscribeToCommunities, subscribeToPages } from '../services/dataService';
import { joinCircleDb, leaveCircleDb } from '../data/database';
import { ActivityService } from '../services/activityService';

interface CommunitiesHubViewProps {
  currentUser: User;
  onSwitchIdentity: (identity: { id: string; name: string; username: string; avatar: string; isPage: boolean; originalUser?: User }) => void;
  posts: Post[];
  onAddPost: (content: string, imageUrl?: string, tagsString?: string, communityName?: string) => void;
  onLikePost: (postId: string) => void;
  onAddComment: (postId: string, commentContent: string) => void;
  theme: 'neon-cyber' | 'stealth-dark' | 'platinum-light' | 'emerald-glass';
  onViewProfile: (userIdOrUsername: string) => void;
}

export default function CommunitiesHubView({
  currentUser,
  onSwitchIdentity,
  posts,
  onAddPost,
  onLikePost,
  onAddComment,
  theme,
  onViewProfile
}: CommunitiesHubViewProps) {
  // 1. Storage Keys
  const PAGES_STORAGE_KEY = 'nexora_custom_pages';
  const COMMUNITIES_STORAGE_KEY = 'nexora_custom_communities';
  const PERSONAL_USER_KEY = 'nexora_personal_account_backup';

  // 2. Active Tab States
  const [activeTab, setActiveTab] = useState<'communities' | 'pages' | 'my-pages' | 'analytics'>('communities');
  const [activeFilter, setActiveFilter] = useState<'all' | 'joined' | 'explore'>('all');

  // 3. Search and Discovery states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<string>('all');

  // 4. Custom communities and pages state
  const [communities, setCommunities] = useState<Circle[]>(() => {
    const saved = localStorage.getItem(COMMUNITIES_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [pages, setPages] = useState<Page[]>(() => {
    const saved = localStorage.getItem(PAGES_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    // Seed default pages
    return [
      {
        id: 'page-1',
        name: 'The Tech Collective',
        username: 'tech_collective',
        avatar: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80',
        coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&auto=format&fit=crop&q=80',
        category: 'Organization',
        description: 'Democratizing knowledge on modern engineering practices, secure microkernels, and decentralized feed routing databases.',
        website: 'techcollective.nexora.ai',
        contactInfo: 'ops@techcollective.nexora.ai',
        isVerified: true,
        followersCount: 12540,
        postsCount: 48,
        videosCount: 12,
        sparksReceived: 890,
        joinedDate: 'Joined June 2026',
        ownerId: 'user-0',
        followers: ['user-0']
      },
      {
        id: 'page-2',
        name: 'Afrobeat Records',
        username: 'afrobeat_records',
        avatar: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=150&auto=format&fit=crop&q=80',
        coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1000&auto=format&fit=crop&q=80',
        category: 'Music Artist',
        description: 'Connecting global listeners to the authentic heartbeat of African sounds, Davido fan sync integrations, and live artist audio rooms.',
        website: 'afrobeats.nexora.ai',
        contactInfo: 'booking@afrobeats.ai',
        isVerified: true,
        followersCount: 45890,
        postsCount: 156,
        videosCount: 45,
        sparksReceived: 4210,
        joinedDate: 'Joined June 2026',
        ownerId: 'creator-4',
        followers: ['user-0']
      }
    ];
  });

  // 5. Active Selected Community Portal State
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [activePortalTab, setActivePortalTab] = useState<string>('feed');

  // 6. Selected Page Profile View State
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);

  // 7. Modals / Creation Panel toggles
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);
  const [showCreatePageModal, setShowCreatePageModal] = useState(false);

  // 8. Form State: Community Create
  const [newCommName, setNewCommName] = useState('');
  const [newCommDesc, setNewCommDesc] = useState('');
  const [newCommBanner, setNewCommBanner] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800');
  const [newCommAvatar, setNewCommAvatar] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150');
  const [newCommTags, setNewCommTags] = useState('');
  const [newCommType, setNewCommType] = useState<'public' | 'private' | 'invite-only'>('public');
  const [newCommRules, setNewCommRules] = useState('1. Be respectful and collaborative.\n2. Keep discussions on-topic.\n3. Avoid spamming and low-effort posts.');

  // 9. Form State: Page Create
  const [newPageName, setNewPageName] = useState('');
  const [newPageUsername, setNewPageUsername] = useState('');
  const [newPageCategory, setNewPageCategory] = useState<Page['category']>('Creator');
  const [newPageDesc, setNewPageDesc] = useState('');
  const [newPageWebsite, setNewPageWebsite] = useState('');
  const [newPageContact, setNewPageContact] = useState('');
  const [newPageAvatar, setNewPageAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150');
  const [newPageCover, setNewPageCover] = useState('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000');

  // 10. Community Discussion Feed Composer Input
  const [communityPostInput, setCommunityPostInput] = useState('');
  const [communityPostImage, setCommunityPostImage] = useState('');

  // 11. Community Moderation State Variables
  const [banInput, setBanInput] = useState('');
  const [reportReasonInput, setReportReasonInput] = useState('');
  const [reportedPostId, setReportedPostId] = useState<string | null>(null);

  // Real-time synchronization for Communities and Pages
  useEffect(() => {
    const unsubComm = subscribeToCommunities((dbComms) => {
      if (dbComms && dbComms.length > 0) {
        setCommunities(dbComms);
      }
    });
    const unsubPages = subscribeToPages((dbPages) => {
      if (dbPages && dbPages.length > 0) {
        setPages(dbPages);
      }
    });
    return () => {
      unsubComm();
      unsubPages();
    };
  }, []);

  // 12. Backup Personal User for Identity Switching
  useEffect(() => {
    // If the user is currently a page, we don't overwrite the personal backup
    const isPage = (currentUser as any).isPageIdentity;
    if (!isPage) {
      localStorage.setItem(PERSONAL_USER_KEY, JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // Persist Page lists & Communities
  useEffect(() => {
    localStorage.setItem(PAGES_STORAGE_KEY, JSON.stringify(pages));
  }, [pages]);

  useEffect(() => {
    localStorage.setItem(COMMUNITIES_STORAGE_KEY, JSON.stringify(communities));
  }, [communities]);

  // 13. Dynamic Recommendations helpers
  const getFeaturedCommunities = () => {
    return communities.slice(0, 2);
  };

  const getNewCommunities = () => {
    return communities.filter(c => c.id.startsWith('comm-')).slice(0, 2);
  };

  const getRecommendedCommunities = () => {
    // Recommend based on user interests
    return communities.filter(c => {
      const interests = Object.keys(currentUser.interestDNA || {});
      return c.tags.some(t => interests.includes(t)) && !c.isJoinedByMe;
    });
  };

  // 14. Identity Switch Trigger
  const handleIdentityChange = (pageId: string | null) => {
    if (!pageId) {
      // Switch back to personal account
      const backup = localStorage.getItem(PERSONAL_USER_KEY);
      if (backup) {
        const personal = JSON.parse(backup);
        onSwitchIdentity({
          id: personal.id,
          name: personal.name,
          username: personal.username,
          avatar: personal.avatar,
          isPage: false,
          originalUser: personal
        });
        window.dispatchEvent(new CustomEvent('toast', { detail: `👤 Switched back to Personal Account: @${personal.username}` }));
      }
      return;
    }

    const pg = pages.find(p => p.id === pageId);
    if (pg) {
      // Create user template representing the Page
      onSwitchIdentity({
        id: pg.id,
        name: pg.name,
        username: pg.username,
        avatar: pg.avatar,
        isPage: true
      });
      window.dispatchEvent(new CustomEvent('toast', { detail: `🏢 Switched identity to Page: @${pg.username}` }));
    }
  };

  // 15. Create Community Action
  const handleCreateCommunity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommName.trim()) return;

    const newComm: Circle = {
      id: `comm-${Date.now()}`,
      name: newCommName,
      description: newCommDesc,
      bannerImage: newCommBanner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      avatarImage: newCommAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      creatorId: currentUser.id,
      rules: newCommRules.split('\n').filter(r => r.trim() !== ''),
      membersCount: 1,
      onlineCount: 1,
      tags: newCommTags.split(',').map(t => t.trim()).filter(t => t !== ''),
      isJoinedByMe: true,
      moderators: [currentUser.username],
      admins: [currentUser.username],
      ownerId: currentUser.id,
      type: newCommType,
      bannedUsers: [],
      mutedUsers: [],
      pendingMembers: [],
      pinnedPosts: [],
      reports: [],
      activityLog: [`Community space created by @${currentUser.username}`],
      events: [],
      mediaLibrary: []
    };

    setCommunities(prev => [newComm, ...prev]);
    createCommunity(newComm.name, newComm.description, newComm.ownerId);
    setShowCreateCommunityModal(false);
    // reset form
    setNewCommName('');
    setNewCommDesc('');
    setNewCommTags('');
    setNewCommRules('1. Be respectful and collaborative.\n2. Keep discussions on-topic.\n3. Avoid spamming and low-effort posts.');
    
    window.dispatchEvent(new CustomEvent('toast', { detail: `🎉 Community "${newCommName}" created successfully!` }));
  };

  // 16. Create Page Action
  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim() || !newPageUsername.trim()) return;

    const newPg: Page = {
      id: `page-${Date.now()}`,
      name: newPageName,
      username: newPageUsername.toLowerCase().trim().replace(/[^a-z0-9_]/g, ''),
      avatar: newPageAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      coverImage: newPageCover || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000',
      category: newPageCategory,
      description: newPageDesc,
      website: newPageWebsite,
      contactInfo: newPageContact,
      isVerified: false,
      followersCount: 0,
      postsCount: 0,
      videosCount: 0,
      sparksReceived: 0,
      joinedDate: `Joined ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      ownerId: currentUser.id,
      followers: []
    };

    setPages(prev => [newPg, ...prev]);
    createPage(newPg.ownerId, newPg.name, newPg.username, newPg.category);
    setShowCreatePageModal(false);
    // reset form
    setNewPageName('');
    setNewPageUsername('');
    setNewPageDesc('');
    setNewPageWebsite('');
    setNewPageContact('');

    window.dispatchEvent(new CustomEvent('toast', { detail: `🏢 Page "${newPageName}" created successfully!` }));
  };

  // 17. Follow Page toggle
  const handleToggleFollowPage = (pageId: string) => {
    setPages(prev => prev.map(p => {
      if (p.id === pageId) {
        const isFollowing = p.followers.includes(currentUser.id);
        const updatedFollowers = isFollowing 
          ? p.followers.filter(id => id !== currentUser.id)
          : [...p.followers, currentUser.id];
        return {
          ...p,
          followers: updatedFollowers,
          followersCount: updatedFollowers.length
        };
      }
      return p;
    }));
  };

  // 18. Community Post Submit (Dynamic global synchronization)
  const handleCommunityPostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityPostInput.trim() || !selectedCircle) return;

    // Use parent onAddPost to publish. Community is specified as a parameter!
    onAddPost(
      communityPostInput,
      communityPostImage || undefined,
      selectedCircle.tags.join(','),
      selectedCircle.name
    );

    setCommunityPostInput('');
    setCommunityPostImage('');
    window.dispatchEvent(new CustomEvent('toast', { detail: `📢 Update published to ${selectedCircle.name} Feed` }));
  };

  // 19. Join/Leave Community
  const handleJoinCircleToggle = (circleId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    setCommunities(prev => prev.map(c => {
      if (c.id === circleId) {
        const joined = !c.isJoinedByMe;
        if (joined) {
          recordRecommendationEvent('join_community', { communityName: c.name, tags: c.tags });
          joinCircleDb(currentUser.id, circleId);
        } else {
          leaveCircleDb(currentUser.id, circleId);
        }
        return {
          ...c,
          isJoinedByMe: joined,
          membersCount: joined ? c.membersCount + 1 : c.membersCount - 1,
          activityLog: [
            ...(c.activityLog || []),
            `@${currentUser.username} ${joined ? 'joined' : 'left'} the community space.`
          ]
        };
      }
      return c;
    }));
  };

  // 20. Voting helper
  const [votedPollOption, setVotedPollOption] = useState<{ [key: string]: string }>({});
  const handleVoteCommunityPoll = (circleId: string, optionId: string) => {
    setVotedPollOption(prev => ({ ...prev, [circleId]: optionId }));
    ActivityService.recordActivityEvent(currentUser.id, 'poll_vote', `poll_${circleId}_${optionId}`);
    window.dispatchEvent(new CustomEvent('toast', { detail: `🗳️ Vote registered! Activity recorded.` }));
  };

  // 21. RSVP Community Event
  const [rsvps, setRsvps] = useState<{ [key: string]: boolean }>({});
  const handleRsvpEvent = (circleId: string, eventId: string) => {
    const key = `${circleId}-${eventId}`;
    const active = !rsvps[key];
    setRsvps(prev => ({ ...prev, [key]: active }));
    window.dispatchEvent(new CustomEvent('toast', { detail: active ? `📅 RSVP Registered! Added to community calendar.` : `📅 RSVP cancelled.` }));
  };

  // 22. Voice Room Toggle
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // 23. Moderation Actions
  const handlePinPost = (circleId: string, postId: string) => {
    setCommunities(prev => prev.map(c => {
      if (c.id === circleId) {
        const isPinned = c.pinnedPosts?.includes(postId);
        const updatedPins = isPinned 
          ? c.pinnedPosts?.filter(id => id !== postId) || []
          : [...(c.pinnedPosts || []), postId];
        return {
          ...c,
          pinnedPosts: updatedPins,
          activityLog: [
            ...(c.activityLog || []),
            `Moderator @${currentUser.username} ${isPinned ? 'unpinned' : 'pinned'} post: "${postId}"`
          ]
        };
      }
      return c;
    }));
    window.dispatchEvent(new CustomEvent('toast', { detail: `📌 Pin setting updated.` }));
  };

  const handleBanUser = (circleId: string, username: string) => {
    if (!username.trim()) return;
    setCommunities(prev => prev.map(c => {
      if (c.id === circleId) {
        return {
          ...c,
          bannedUsers: [...(c.bannedUsers || []), username.trim()],
          activityLog: [
            ...(c.activityLog || []),
            `Moderator @${currentUser.username} banned user @${username}`
          ]
        };
      }
      return c;
    }));
    setBanInput('');
    window.dispatchEvent(new CustomEvent('toast', { detail: `🚫 User @${username} banned from community.` }));
  };

  const handleMuteUser = (circleId: string, username: string) => {
    if (!username.trim()) return;
    setCommunities(prev => prev.map(c => {
      if (c.id === circleId) {
        return {
          ...c,
          mutedUsers: [...(c.mutedUsers || []), username.trim()],
          activityLog: [
            ...(c.activityLog || []),
            `Moderator @${currentUser.username} muted user @${username}`
          ]
        };
      }
      return c;
    }));
    window.dispatchEvent(new CustomEvent('toast', { detail: `🔇 User @${username} muted.` }));
  };

  const handleReportPost = (circleId: string, postId: string, postContent: string) => {
    if (!reportReasonInput.trim()) return;
    const reportItem = {
      id: `rep-${Date.now()}`,
      targetType: 'post',
      targetId: postId,
      targetContent: postContent,
      reason: reportReasonInput,
      status: 'pending' as const
    };
    setCommunities(prev => prev.map(c => {
      if (c.id === circleId) {
        return {
          ...c,
          reports: [...(c.reports || []), reportItem],
          activityLog: [
            ...(c.activityLog || []),
            `Post reported for: "${reportReasonInput}"`
          ]
        };
      }
      return c;
    }));
    setReportedPostId(null);
    setReportReasonInput('');
    window.dispatchEvent(new CustomEvent('toast', { detail: `⚠️ Content reported to community moderators.` }));
  };

  const handleResolveReport = (circleId: string, reportId: string, action: 'keep' | 'delete') => {
    setCommunities(prev => prev.map(c => {
      if (c.id === circleId) {
        const updatedReports = c.reports?.map(r => r.id === reportId ? { ...r, status: 'resolved' as const } : r) || [];
        return {
          ...c,
          reports: updatedReports,
          activityLog: [
            ...(c.activityLog || []),
            `Moderator @${currentUser.username} resolved report ${reportId} with action: "${action}"`
          ]
        };
      }
      return c;
    }));
    window.dispatchEvent(new CustomEvent('toast', { detail: `🛡️ Report processed. Content ${action === 'delete' ? 'removed' : 'approved'}.` }));
  };

  // 24. Filter & Search Computations
  const filteredCommunities = communities.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        c.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        c.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchSearch) return false;
    
    if (activeFilter === 'joined') return c.isJoinedByMe;
    if (activeFilter === 'explore') return !c.isJoinedByMe;
    return true;
  });

  const filteredPages = pages.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.username.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        p.description.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;

    if (searchCategory !== 'all' && p.category !== searchCategory) return false;
    return true;
  });

  // 25. Check if active user is a Page
  const isActingAsPage = (currentUser as any).isPageIdentity;

  return (
    <div className="space-y-6 pb-28 sm:pb-12">
      {/* 🔴 Section Title & Premium Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-current/10 pb-5 text-left">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 px-1.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Compass className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-black font-sans tracking-tight text-white uppercase">
              Communities & Pages
            </h2>
          </div>
          <p className="text-xs text-current/60 font-sans">
            Public spaces • Connect around shared interests, join open discussions, and explore global communities.
          </p>
        </div>

        {/* 🏢 Account switcher HUD on the Hub Header */}
        <div className="flex items-center gap-3 bg-black/40 border border-white/10 p-2 rounded-2xl">
          <div className="flex items-center gap-2">
            <img src={currentUser.avatar} alt={currentUser.name} className="w-8 h-8 rounded-xl object-cover ring-1 ring-violet-500" />
            <div className="text-left font-sans shrink-0">
              <span className="block text-[10px] font-bold text-violet-300 leading-tight">Active Identity</span>
              <span className="block text-[9px] text-current/50 font-mono">@{currentUser.username} {isActingAsPage && '🏢'}</span>
            </div>
          </div>
          <select 
            onChange={(e) => handleIdentityChange(e.target.value || null)}
            value={isActingAsPage ? currentUser.id : ''}
            className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-mono text-violet-300 focus:outline-none"
          >
            <option value="">Personal: @{localStorage.getItem(PERSONAL_USER_KEY) ? JSON.parse(localStorage.getItem(PERSONAL_USER_KEY)!).username : currentUser.username}</option>
            {pages.filter(p => p.ownerId === (localStorage.getItem(PERSONAL_USER_KEY) ? JSON.parse(localStorage.getItem(PERSONAL_USER_KEY)!).id : currentUser.id)).map(p => (
              <option key={p.id} value={p.id}>Page: @{p.username}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Primary Sub-Navigation Hub Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/5">
        <div className="flex items-center gap-1">
          {[
            { id: 'communities', label: '🏟️ Communities', desc: 'Social Spaces' },
            { id: 'pages', label: '🏢 Find Pages', desc: 'Creator & Brands' },
            { id: 'my-pages', label: '🔧 My Managed Pages', desc: 'Entity Setup' },
            { id: 'analytics', label: '📊 Page Insights', desc: 'Performance Engine' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setSelectedPage(null);
              }}
              className={`px-4 py-2 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                activeTab === tab.id 
                  ? 'border-pink-500 text-pink-400' 
                  : 'border-transparent text-violet-300/60 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className="text-[8px] font-normal tracking-tight text-current/30 uppercase">{tab.desc}</span>
            </button>
          ))}
        </div>

        {activeTab === 'communities' && (
          <button
            onClick={() => setShowCreateCommunityModal(true)}
            className="mb-2 px-3 py-1.5 font-mono text-[10px] uppercase font-black bg-pink-600 text-white hover:bg-pink-500 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-pink-600/10"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Community</span>
          </button>
        )}

        {activeTab === 'my-pages' && (
          <button
            onClick={() => setShowCreatePageModal(true)}
            className="mb-2 px-3 py-1.5 font-mono text-[10px] uppercase font-black bg-violet-600 text-white hover:bg-violet-500 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-md shadow-violet-600/10"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Page</span>
          </button>
        )}
      </div>

      {/* 🔮 Search Bar & Discovery Filter Deck */}
      <div className="bg-black/30 border border-white/5 rounded-2xl p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400/50" />
          <input
            type="text"
            placeholder={activeTab === 'communities' ? "Search for communities, members, hashtags..." : "Search Creators, Brands, Businesses..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-900/60 border border-white/5 focus:outline-none focus:border-white/10 rounded-xl text-xs text-white text-left font-sans"
          />
        </div>

        {activeTab === 'communities' && (
          <div className="flex gap-1">
            {['all', 'joined', 'explore'].map((flt) => (
              <button
                key={flt}
                onClick={() => setActiveFilter(flt as any)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                  activeFilter === flt 
                    ? 'bg-violet-600/25 border border-white/10 text-violet-300' 
                    : 'bg-[#18181b]/50 border border-transparent text-current/65 hover:text-white'
                }`}
              >
                {flt === 'all' ? 'All spaces' : flt === 'joined' ? 'My spaces' : 'Explore new'}
              </button>
            ))}
          </div>
        )}

        {activeTab === 'pages' && (
          <select
            value={searchCategory}
            onChange={(e) => setSearchCategory(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-xl px-3 py-1.5 text-[11px] font-mono text-violet-300 focus:outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {['Creator', 'Business', 'Brand', 'Organization', 'School', 'Sports Club', 'Entertainment', 'Music Artist', 'Public Figure', 'Community', 'News & Media', 'Non-Profit'].map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}
      </div>

      {/* MAIN VIEW CONTROLLER VIEWS */}
      <AnimatePresence mode="wait">
        {/* ========================================================== */}
        {/* TAB 1: COMMUNITIES ecosystem */}
        {/* ========================================================== */}
        {activeTab === 'communities' && (
          <motion.div
            key="comm-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Dynamic Community Discovery section */}
            {searchQuery === '' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                {/* 1. Recommended spaces */}
                <div className="p-4 rounded-3xl bg-[#090515] border border-white/10 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/5 rounded-full blur-xl" />
                  <h3 className="text-xs font-black font-mono tracking-widest text-pink-400 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Featured Spaces
                  </h3>
                  <div className="space-y-2">
                    {getFeaturedCommunities().map((c) => (
                      <div key={c.id} onClick={() => setSelectedCircle(c)} className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/5 rounded-2xl flex items-center justify-between cursor-pointer transition-all">
                        <div className="flex items-center gap-2">
                          <img src={c.avatarImage || c.bannerImage} className="w-9 h-9 rounded-xl object-cover ring-1 ring-violet-500/30" />
                          <div>
                            <p className="text-xs font-bold text-white">{c.name}</p>
                            <p className="text-[9px] font-mono text-violet-400/60">{c.membersCount} Members • {c.onlineCount || 10} Online</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-violet-400/40" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Fast growing & New spaces */}
                <div className="p-4 rounded-3xl bg-[#090515] border border-white/10 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl" />
                  <h3 className="text-xs font-black font-mono tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5" /> Trending Spaces
                  </h3>
                  <div className="space-y-2">
                    {getNewCommunities().length > 0 ? (
                      getNewCommunities().map((c) => (
                        <div key={c.id} onClick={() => setSelectedCircle(c)} className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/5 rounded-2xl flex items-center justify-between cursor-pointer transition-all">
                          <div className="flex items-center gap-2">
                            <img src={c.avatarImage || c.bannerImage} className="w-9 h-9 rounded-xl object-cover ring-1 ring-cyan-500/30" />
                            <div>
                              <p className="text-xs font-bold text-white">{c.name}</p>
                              <p className="text-[9px] font-mono text-cyan-400/60">New • #{c.tags[0]}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-cyan-400/40" />
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-current/45 italic py-4">No custom spaces created yet. Build one autonomously!</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Communities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCommunities.map((circle) => {
                const isModerator = circle.moderators?.includes(currentUser.username) || circle.ownerId === currentUser.id;
                
                return (
                  <div 
                    key={circle.id} 
                    onClick={() => {
                      if (circle.isJoinedByMe || circle.type === 'public') {
                        // Join automatically if public and clicking to browse
                        if (!circle.isJoinedByMe) {
                          handleJoinCircleToggle(circle.id);
                        }
                        setSelectedCircle(circle);
                        setActivePortalTab('feed');
                      } else {
                        alert(`This is an invite-only / private community. Click "Join" to submit an onboarding request.`);
                      }
                    }}
                    className="bg-black/45 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-all duration-300 group flex flex-col justify-between cursor-pointer relative"
                  >
                    {/* Cover image banner */}
                    <div className="relative h-24 w-full bg-slate-900 border-b border-white/5 overflow-hidden">
                      <img 
                        src={circle.bannerImage} 
                        alt={circle.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 brightness-75" 
                      />
                      
                      {/* Banner Badge */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                        {circle.isJoinedByMe && (
                          <span className="flex items-center gap-0.5 px-2 py-0.5 text-[8px] font-mono font-black border border-emerald-500/30 bg-emerald-950/80 text-emerald-400 rounded uppercase">
                            <Check className="w-2.5 h-2.5" />
                            <span>Member</span>
                          </span>
                        )}
                        {circle.type === 'private' && (
                          <span className="flex items-center gap-0.5 px-2 py-0.5 text-[8px] font-mono font-black border border-amber-500/30 bg-amber-950/80 text-amber-400 rounded uppercase">
                            <Lock className="w-2.5 h-2.5" />
                            <span>Private</span>
                          </span>
                        )}
                      </div>

                      {/* Small avatar circle */}
                      <div className="absolute bottom-2 left-3 w-10 h-10 rounded-xl overflow-hidden border border-white/20 bg-zinc-900">
                        <img src={circle.avatarImage || circle.bannerImage} className="w-full h-full object-cover" />
                      </div>
                    </div>

                    {/* Meta info and descriptions */}
                    <div className="p-4 space-y-2 text-left pt-3">
                      <div className="flex flex-wrap gap-1">
                        {circle.tags.map((tg, idx) => (
                          <span key={idx} className="bg-white/5 px-1.5 py-0.5 rounded text-[8px] font-mono text-violet-400">
                            #{tg}
                          </span>
                        ))}
                      </div>

                      <h3 className="text-xs sm:text-sm font-black font-sans tracking-tight text-white line-clamp-1">
                        {circle.name}
                      </h3>
                      <p className="text-[11px] text-current/60 font-sans leading-relaxed line-clamp-2">
                        {circle.description}
                      </p>
                    </div>

                    {/* Bottom deck counts and button */}
                    <div className="p-3 bg-zinc-900/40 border-t border-white/5 flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-current/50">
                        <Users className="w-3 h-3 text-violet-400" />
                        <span>{circle.membersCount} members</span>
                        {circle.onlineCount && (
                          <span className="text-emerald-400">• {circle.onlineCount} online</span>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleJoinCircleToggle(circle.id, e)}
                        className={`px-3 py-1 rounded-xl font-mono text-[9px] font-black uppercase transition-all ${
                          circle.isJoinedByMe 
                            ? 'bg-transparent text-emerald-400 border border-emerald-500/30' 
                            : 'bg-violet-600 text-white hover:brightness-110'
                        }`}
                      >
                        {circle.isJoinedByMe ? 'JOINED' : 'JOIN'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ========================================================== */}
        {/* TAB 2: FIND PAGES Ecosystem */}
        {/* ========================================================== */}
        {activeTab === 'pages' && (
          <motion.div
            key="pages-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Pages Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPages.map((pg) => {
                const isFollowing = pg.followers.includes(currentUser.id);
                const isOwner = pg.ownerId === currentUser.id;

                return (
                  <div 
                    key={pg.id}
                    onClick={() => setSelectedPage(pg)}
                    className="bg-black/40 border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    {/* Header Cover */}
                    <div className="relative h-24 bg-slate-800">
                      <img src={pg.coverImage} className="w-full h-full object-cover brightness-75" />
                      
                      {pg.isVerified && (
                        <div className="absolute top-2 right-2 bg-purple-900/80 border border-purple-500/40 text-purple-300 text-[8px] font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase">
                          <CheckCircle className="w-2.5 h-2.5" /> Verified
                        </div>
                      )}

                      {/* Floating Profile Avatar */}
                      <div className="absolute -bottom-4 left-4 w-12 h-12 rounded-xl overflow-hidden border border-zinc-900 bg-zinc-900">
                        <img src={pg.avatar} className="w-full h-full object-cover" />
                      </div>
                    </div>

                    {/* Details content */}
                    <div className="p-4 pt-6 space-y-2 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-mono uppercase bg-violet-600/20 text-violet-300 border border-white/10 px-1.5 py-0.5 rounded">
                          {pg.category}
                        </span>
                        {isOwner && <span className="text-[8px] font-mono uppercase bg-pink-600/20 text-pink-300 border border-pink-500/20 px-1.5 py-0.5 rounded">Owner</span>}
                      </div>

                      <h3 className="text-xs sm:text-sm font-black text-white line-clamp-1">{pg.name}</h3>
                      <p className="text-[10px] text-violet-300/60 font-mono">@{pg.username}</p>
                      <p className="text-[11px] text-current/60 font-sans line-clamp-2 leading-relaxed">{pg.description}</p>
                    </div>

                    {/* Footer Stats and Button */}
                    <div className="p-3 bg-zinc-900/40 border-t border-white/5 flex items-center justify-between mt-auto">
                      <div className="text-[9px] font-mono text-current/50 space-y-0.5">
                        <p>{pg.followersCount} Followers</p>
                        <p>{pg.postsCount} Publications</p>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFollowPage(pg.id);
                          }}
                          className={`px-3 py-1 rounded-xl font-mono text-[9px] font-black uppercase transition-all ${
                            isFollowing 
                              ? 'bg-zinc-800 text-white border border-white/10' 
                              : 'bg-pink-600 text-white hover:brightness-110'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* ========================================================== */}
        {/* TAB 3: MY MANAGED PAGES */}
        {/* ========================================================== */}
        {activeTab === 'my-pages' && (
          <motion.div
            key="my-pages-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 text-left"
          >
            <div className="bg-[#090515] border border-white/10 p-5 rounded-3xl space-y-4">
              <h3 className="text-sm font-black font-mono tracking-widest text-violet-400 uppercase flex items-center gap-1.5">
                <Settings className="w-4 h-4" /> Your Managed Entity Hub
              </h3>
              <p className="text-xs text-current/60 leading-relaxed font-sans">
                Establish professional pages to represent business entities, schools, entertainment portfolios, or sports rosters. Seamless switching allows you to build, publish, and interact natively as your organization.
              </p>

              <div className="space-y-3">
                {pages.filter(p => p.ownerId === (localStorage.getItem(PERSONAL_USER_KEY) ? JSON.parse(localStorage.getItem(PERSONAL_USER_KEY)!).id : currentUser.id)).map((p) => (
                  <div key={p.id} className="p-4 bg-black/40 border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-black/60">
                    <div className="flex items-center gap-3">
                      <img src={p.avatar} className="w-12 h-12 rounded-xl object-cover ring-1 ring-violet-500/20" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-white">{p.name}</h4>
                          <span className="text-[8px] font-mono uppercase bg-violet-600/20 text-violet-300 border border-white/10 px-1 py-0.5 rounded">{p.category}</span>
                        </div>
                        <p className="text-[10px] font-mono text-current/40">@{p.username} • {p.followersCount} followers</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPage(p)}
                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-mono uppercase font-bold transition-all cursor-pointer"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => handleIdentityChange(p.id)}
                        className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-mono uppercase font-black tracking-wider transition-all cursor-pointer"
                      >
                        ACT AS PAGE
                      </button>
                    </div>
                  </div>
                ))}

                {pages.filter(p => p.ownerId === (localStorage.getItem(PERSONAL_USER_KEY) ? JSON.parse(localStorage.getItem(PERSONAL_USER_KEY)!).id : currentUser.id)).length === 0 && (
                  <div className="text-center py-8 border border-dashed border-white/5 rounded-2xl">
                    <Info className="w-8 h-8 text-violet-400/30 mx-auto" />
                    <p className="text-xs text-violet-300/70 mt-2">No managed pages detected.</p>
                    <p className="text-[10px] text-violet-300/40 mt-0.5">Initialize a brand new business entity or creator page using the action button above.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* ========================================================== */}
        {/* TAB 4: PAGE ANALYTICS */}
        {/* ========================================================== */}
        {activeTab === 'analytics' && (
          <motion.div
            key="analytics-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6 text-left"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Platform Reach', value: '142,590', delta: '+12.4% this week', color: 'text-violet-400' },
                { label: 'Video Views', value: '28,950', delta: '+8.2% this month', color: 'text-cyan-400' },
                { label: 'Engagement Rate', value: '4.8%', delta: '+0.5% shift', color: 'text-pink-400' },
                { label: 'Sparks Acquired', value: '5,100 NEX', delta: '+150 sparks today', color: 'text-emerald-400' }
              ].map((st, i) => (
                <div key={i} className="p-4 bg-[#090515] border border-white/5 rounded-3xl space-y-1">
                  <span className="text-[10px] font-mono text-current/50 uppercase block">{st.label}</span>
                  <p className={`text-xl font-black ${st.color}`}>{st.value}</p>
                  <span className="text-[9px] text-emerald-400 font-mono font-bold block">{st.delta}</span>
                </div>
              ))}
            </div>

            <div className="bg-[#090515] border border-white/5 p-5 rounded-3xl space-y-4">
              <h3 className="text-xs font-black font-mono tracking-widest text-violet-400 uppercase flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4" /> Audience Growth & Trends
              </h3>
              
              {/* Fake visual bar chart representing activity metrics */}
              <div className="h-44 flex items-end gap-2 border-b border-white/5 pb-2">
                {[45, 65, 55, 85, 75, 95, 120, 110, 130, 145, 125, 160].map((val, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${(val / 160) * 100}%` }}
                      transition={{ delay: idx * 0.05, duration: 0.6 }}
                      className="w-full bg-linear-to-t from-violet-600 via-pink-600 to-cyan-500 rounded-md shadow-lg hover:brightness-110 cursor-pointer"
                      title={`Month ${idx + 1}: ${val} users`}
                    />
                    <span className="text-[8px] font-mono text-current/30">{idx + 1}M</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono text-violet-400 uppercase font-black">Top Performing Posts</h4>
                  <div className="space-y-1.5">
                    {[
                      { text: 'Unlocking secure network microkernels on Web3 feed registries...', engagement: '1.2k likes • 45 comments' },
                      { text: 'A look into Port Harcourt custom soccer match leagues...', engagement: '890 likes • 21 comments' }
                    ].map((pst, i) => (
                      <div key={i} className="p-2.5 bg-black/40 border border-white/5 rounded-xl text-[11px] space-y-1">
                        <p className="text-white font-medium line-clamp-1">{pst.text}</p>
                        <p className="text-[9px] text-[#A78BFA]/50 font-mono">{pst.engagement}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-mono text-pink-400 uppercase font-black">Audience Demographics</h4>
                  <div className="space-y-2 text-xs font-sans">
                    {[
                      { city: 'Lagos, Nigeria', pct: '45%' },
                      { city: 'Port Harcourt, Nigeria', pct: '25%' },
                      { city: 'Abuja, Nigeria', pct: '15%' },
                      { city: 'London, United Kingdom', pct: '8%' }
                    ].map((dem, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="text-white">{dem.city}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-white/5 h-1.5 rounded-full overflow-hidden">
                            <div style={{ width: dem.pct }} className="bg-pink-500 h-full" />
                          </div>
                          <span className="font-mono text-pink-300 font-bold">{dem.pct}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* FULL-SCREEN COMMUNITY PORTAL MODAL */}
      {/* ========================================================== */}
      <AnimatePresence>
        {selectedCircle && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md text-left">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-4xl bg-[#09071b] border border-white/10 rounded-3xl overflow-hidden flex flex-col h-[90vh] shadow-[0_0_60px_rgba(139,92,246,0.3)]"
            >
              {/* Cover Header */}
              <div className="relative h-28 sm:h-36 bg-slate-900 overflow-hidden shrink-0 flex items-end p-4 border-b border-white/10">
                <img 
                  src={selectedCircle.bannerImage} 
                  alt={selectedCircle.name} 
                  className="absolute inset-0 w-full h-full object-cover brightness-50" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09071b] to-transparent" />
                
                <div className="relative z-10 flex items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-3">
                    <img src={selectedCircle.avatarImage || selectedCircle.bannerImage} className="w-12 h-12 rounded-xl object-cover ring-2 ring-violet-500" />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h2 className="text-base sm:text-xl font-black text-white tracking-tight leading-none">
                          {selectedCircle.name}
                        </h2>
                        {selectedCircle.type === 'private' && (
                          <span className="text-[8px] font-mono bg-amber-500/20 border border-amber-500/30 text-amber-300 px-1 py-0.5 rounded">PRIVATE</span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs text-violet-300/80 mt-1 max-w-md line-clamp-1 leading-normal font-sans">
                        {selectedCircle.description}
                      </p>
                    </div>
                  </div>

                  <button 
                    onClick={() => setSelectedCircle(null)}
                    className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-xl border border-white/5 transition-all cursor-pointer shrink-0"
                  >
                    <X className="w-4 h-4 sm:w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Scrollable Sub-category tabs */}
              <div className="bg-black/40 border-b border-white/10 overflow-x-auto scrollbar-none flex-shrink-0">
                <div className="flex gap-1 px-3 py-2">
                  {[
                    { id: 'feed', label: '📢 Discussion Feed' },
                    { id: 'media', label: '📁 Media Library' },
                    { id: 'events', label: '📅 Event Cal' },
                    { id: 'roles', label: '🛡️ Roles & Members' },
                    { id: 'moderation', label: '🔧 Moderation Deck' },
                    { id: 'insights', label: '📈 Community Insights' }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActivePortalTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                        activePortalTab === tab.id 
                          ? 'bg-[#8b5cf6] text-white shadow-lg' 
                          : 'text-violet-300/60 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Portal Workspace Viewport */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 text-white">
                {/* 1. PORTAL FEED */}
                {activePortalTab === 'feed' && (
                  <div className="space-y-4 text-left">
                    {/* Add Feed Composer inside Community */}
                    <form onSubmit={handleCommunityPostSubmit} className="p-4 bg-black/50 border border-white/10 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2">
                        <img src={currentUser.avatar} className="w-8 h-8 rounded-xl object-cover ring-1 ring-violet-500" />
                        <span className="text-[10px] font-mono text-violet-400 font-bold">Acting as @{currentUser.username}</span>
                      </div>
                      <textarea
                        required
                        placeholder={`Share something with ${selectedCircle.name}...`}
                        value={communityPostInput}
                        onChange={(e) => setCommunityPostInput(e.target.value)}
                        rows={3}
                        className="w-full bg-zinc-900 border border-white/5 rounded-xl p-3 text-xs focus:outline-none focus:border-white/10 text-white text-left font-sans"
                      />
                      <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
                        <input
                          type="text"
                          placeholder="Include cover image link (optional)"
                          value={communityPostImage}
                          onChange={(e) => setCommunityPostImage(e.target.value)}
                          className="px-3 py-1.5 bg-zinc-900 border border-white/5 rounded-lg text-[10px] focus:outline-none text-left"
                        />
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-[10px] font-mono font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>PUBLISH POST</span>
                        </button>
                      </div>
                    </form>

                    {/* Announcements Sticky section */}
                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-xs sm:text-sm text-amber-200 leading-relaxed font-sans space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                        <Megaphone className="w-4 h-4" />
                        <span>COMMUNITY BULLETIN</span>
                      </div>
                      <p>All members are invited to participate in the upcoming local tech roundtable scheduler. Read details in the calendar deck.</p>
                    </div>

                    {/* Dynamic Synchronized Feed */}
                    <div className="space-y-4">
                      {posts.filter(p => p.communityName === selectedCircle.name).map((post) => {
                        const isPinned = selectedCircle.pinnedPosts?.includes(post.id);
                        return (
                          <div key={post.id} className="p-4 bg-zinc-900/60 border border-white/5 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                              <div 
                                className="flex items-center gap-2 cursor-pointer hover:opacity-85 transition-opacity"
                                onClick={() => (post.userId || post.username) && window.dispatchEvent(new CustomEvent('nexora-view-profile', { detail: { userIdOrUsername: post.userId || post.username } }))}
                              >
                                <img src={post.avatar} className="w-8 h-8 rounded-xl object-cover" />
                                <div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-white hover:underline">{post.name}</span>
                                    {post.isVerified && <CheckCircle className="w-3 h-3 text-purple-400" />}
                                  </div>
                                  <p className="text-[9px] text-current/40 font-mono hover:underline">@{post.username} • {new Date(post.timestamp).toLocaleTimeString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                {isPinned && (
                                  <span className="text-[8px] font-mono bg-pink-500/20 text-pink-300 border border-pink-500/20 px-1.5 py-0.5 rounded">PINNED</span>
                                )}
                                <button 
                                  onClick={() => handlePinPost(selectedCircle.id, post.id)}
                                  className="text-[9px] font-mono text-violet-400 hover:text-white"
                                >
                                  Pin
                                </button>
                                <button 
                                  onClick={() => setReportedPostId(post.id)}
                                  className="text-[9px] font-mono text-rose-400 hover:text-white"
                                >
                                  Report
                                </button>
                              </div>
                            </div>

                            <p className="text-xs sm:text-sm leading-relaxed">{post.content}</p>
                            
                            {post.image && (
                              <img src={post.image} className="w-full max-h-60 object-cover rounded-xl border border-white/5" />
                            )}

                            {/* Feed comments & likes synchronization */}
                            <div className="flex items-center gap-4 text-[11px] font-mono text-current/50 pt-2 border-t border-white/5">
                              <button onClick={() => onLikePost(post.id)} className="flex items-center gap-1 hover:text-pink-400">
                                <Heart className={`w-3.5 h-3.5 ${post.isLikedByUser ? 'fill-pink-500 text-pink-500' : ''}`} />
                                <span>{post.likes}</span>
                              </button>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>{post.comments?.length || 0}</span>
                              </span>
                            </div>

                            {/* Inside post comments */}
                            <div className="space-y-1.5 pl-3 border-l border-white/5">
                              {post.comments?.map((comment) => (
                                <div key={comment.id} className="text-[10px] text-current/80">
                                  <span 
                                    className="font-bold text-violet-300 hover:underline cursor-pointer"
                                    onClick={() => (comment.userId || comment.username) && window.dispatchEvent(new CustomEvent('nexora-view-profile', { detail: { userIdOrUsername: comment.userId || comment.username } }))}
                                  >
                                    @{comment.username}: 
                                  </span>
                                  <span>{comment.content}</span>
                                </div>
                              ))}
                              
                              <div className="flex gap-1.5 pt-1.5">
                                <input
                                  type="text"
                                  placeholder="Add comments..."
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                                      onAddComment(post.id, (e.target as HTMLInputElement).value);
                                      (e.target as HTMLInputElement).value = '';
                                    }
                                  }}
                                  className="flex-1 bg-[#18181b]/50 border border-white/5 rounded-lg px-2 py-1 text-[10px] focus:outline-none"
                                />
                              </div>
                            </div>

                            {/* Report post form inline helper */}
                            {reportedPostId === post.id && (
                              <div className="p-3 bg-zinc-950 rounded-xl space-y-2 border border-rose-500/20">
                                <span className="block text-[10px] font-mono text-rose-400 uppercase font-bold">Report Content Form</span>
                                <input
                                  type="text"
                                  placeholder="Enter reporting reason (e.g. Spam, Harassment...)"
                                  value={reportReasonInput}
                                  onChange={(e) => setReportReasonInput(e.target.value)}
                                  className="w-full bg-zinc-900 border border-white/5 p-2 rounded text-[10px] focus:outline-none"
                                />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => setReportedPostId(null)} className="text-[9px] font-mono text-current/50">Cancel</button>
                                  <button onClick={() => handleReportPost(selectedCircle.id, post.id, post.content)} className="px-3 py-1 bg-rose-600 text-white rounded text-[9px] font-mono">SUBMIT REPORT</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {posts.filter(p => p.communityName === selectedCircle.name).length === 0 && (
                        <p className="text-center py-8 text-[11px] text-current/40 italic">Nothing published yet. Be the first to share an update!</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. SHARED MEDIA LIBRARY */}
                {activePortalTab === 'media' && (
                  <div className="space-y-4 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Media Vault & Shared Resources</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {selectedCircle.mediaLibrary?.map((fl, i) => (
                        <div key={i} className="p-3 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-violet-400 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-white truncate max-w-[180px]">{fl.name}</p>
                              <p className="text-[9px] text-violet-300/40 font-mono">{fl.size} • Uploaded by @{fl.uploadedBy}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => alert(`Beginning secure download of "${fl.name}"...`)}
                            className="p-1.5 bg-violet-600/20 hover:bg-[#8b5cf6] text-white border border-white/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. COMMUNITY EVENTS FOUNDATION */}
                {activePortalTab === 'events' && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Scheduled Gatherings Calendar</h3>
                      <span className="text-[8px] font-mono bg-violet-600/20 border border-white/10 px-1.5 py-0.5 rounded text-violet-300 uppercase">EVENTS ACTIVE</span>
                    </div>

                    <div className="space-y-3">
                      {selectedCircle.events?.map((evt) => {
                        const hasRsvped = rsvps[`${selectedCircle.id}-${evt.id}`];
                        return (
                          <div key={evt.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-1">
                              <h4 className="text-xs sm:text-sm font-bold text-white">{evt.title}</h4>
                              <p className="text-[10.5px] text-violet-300/80">{evt.date} • {evt.time}</p>
                              <p className="text-[9.5px] text-violet-300/40 font-mono">📍 {evt.location}</p>
                            </div>
                            <button
                              onClick={() => handleRsvpEvent(selectedCircle.id, evt.id)}
                              className={`px-3 py-1.5 rounded-lg text-[9.5px] font-mono font-bold uppercase transition-all shrink-0 cursor-pointer ${
                                hasRsvped 
                                  ? 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/30' 
                                  : 'bg-violet-600 hover:bg-violet-500 text-white'
                              }`}
                            >
                              {hasRsvped ? 'Registered ✓' : 'Register RSVP'}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Dormant components warning indicators / foundations */}
                    <div className="p-4 border border-dashed border-white/5 rounded-2xl bg-zinc-950/40 text-center space-y-1">
                      <Volume2 className="w-6 h-6 text-violet-400/20 mx-auto" />
                      <p className="text-[10px] font-mono text-violet-400 uppercase font-bold">Virtual Audio Spaces & Livestreaming Framework</p>
                      <p className="text-[9px] text-current/30 leading-normal max-w-sm mx-auto">Foundational bindings for decentralized spatial audio systems and peer-to-peer screenshare relays. Currently dormant until V1.3 launch.</p>
                    </div>
                  </div>
                )}

                {/* 4. ROLES AND PERMISSIONS */}
                {activePortalTab === 'roles' && (
                  <div className="space-y-4 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Community Member Hierarchies</h3>
                    
                    <div className="space-y-2">
                      {[
                        { username: 'voh', role: 'Owner', badge: 'bg-red-500/20 text-red-300 border-red-500/20' },
                        { username: 'nexora_official', role: 'Administrator', badge: 'bg-violet-500/20 text-violet-300 border-white/10' },
                        { username: currentUser.username, role: selectedCircle.ownerId === currentUser.id ? 'Owner' : 'Member', badge: 'bg-zinc-800 text-zinc-300' }
                      ].map((mbr, i) => (
                        <div key={i} className="p-3 bg-black/40 border border-white/5 rounded-2xl flex items-center justify-between">
                          <span className="text-xs font-bold text-white">@{mbr.username}</span>
                          <span className={`text-[8px] font-mono font-bold border px-1.5 py-0.5 rounded uppercase ${mbr.badge}`}>
                            {mbr.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. MODERATION DECK */}
                {activePortalTab === 'moderation' && (
                  <div className="space-y-4 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Community Shield Moderation Console</h3>
                    
                    {/* Ban and mute forms */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-3">
                        <span className="block text-[10px] font-mono text-rose-400 uppercase font-black">Restrict / Ban user</span>
                        <div className="flex gap-1.5">
                          <input
                            type="text"
                            placeholder="username"
                            value={banInput}
                            onChange={(e) => setBanInput(e.target.value)}
                            className="flex-1 bg-zinc-900 border border-white/5 p-1.5 text-xs rounded focus:outline-none focus:border-rose-500/40"
                          />
                          <button 
                            onClick={() => handleBanUser(selectedCircle.id, banInput)}
                            className="px-3 bg-rose-600 text-white rounded text-[10px] font-mono font-bold"
                          >
                            BAN
                          </button>
                        </div>
                      </div>

                      <div className="p-4 bg-black/40 border border-white/5 rounded-2xl space-y-3">
                        <span className="block text-[10px] font-mono text-yellow-400 uppercase font-black">Audit Activity Log</span>
                        <div className="h-20 overflow-y-auto space-y-1 pl-1 border-l border-white/5 text-[9px] font-mono text-current/50 uppercase">
                          {selectedCircle.activityLog?.map((lg, idx) => (
                            <p key={idx}>• {lg}</p>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Pending Reports Audit Queue */}
                    <div className="space-y-2">
                      <span className="block text-[10px] font-mono text-amber-400 uppercase font-black">Reported Content Moderation Queue</span>
                      {selectedCircle.reports?.filter(r => r.status === 'pending').map((rep) => (
                        <div key={rep.id} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="font-bold text-amber-300">Reason: {rep.reason}</p>
                            <p className="text-current/60 font-sans italic line-clamp-1">Content: "{rep.targetContent}"</p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => handleResolveReport(selectedCircle.id, rep.id, 'keep')} className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[9px] font-mono uppercase font-bold">Approve</button>
                            <button onClick={() => handleResolveReport(selectedCircle.id, rep.id, 'delete')} className="px-2.5 py-1 bg-rose-600 text-white rounded text-[9px] font-mono uppercase font-bold">Remove Post</button>
                          </div>
                        </div>
                      ))}

                      {selectedCircle.reports?.filter(r => r.status === 'pending').length === 0 && (
                        <p className="text-[10px] font-mono text-emerald-400 text-center py-2 bg-emerald-500/5 rounded-xl border border-emerald-500/10">🛡️ ALL CLEAR: No reported content pending review.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* 6. COMMUNITY INSIGHTS */}
                {activePortalTab === 'insights' && (
                  <div className="space-y-4 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Workspace Engagement Metrics</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1">
                        <span className="text-[9px] font-mono text-current/50 uppercase">Active Contributions</span>
                        <p className="text-base font-black text-pink-400">142 updates</p>
                      </div>
                      <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1">
                        <span className="text-[9px] font-mono text-current/50 uppercase">Monthly Spark Shift</span>
                        <p className="text-base font-black text-emerald-400">+1,240 sparks</p>
                      </div>
                      <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1">
                        <span className="text-[9px] font-mono text-current/50 uppercase">Completeness Quota</span>
                        <p className="text-base font-black text-cyan-400">94.8% SLA</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* FULL-SCREEN SELECTED PAGE PROFILE MODAL */}
      {/* ========================================================== */}
      <AnimatePresence>
        {selectedPage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md text-left">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-[#09071b] border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_60px_rgba(139,92,246,0.3)]"
            >
              {/* Cover Header */}
              <div className="relative h-28 sm:h-36 bg-slate-900 shrink-0">
                <img src={selectedPage.coverImage} className="w-full h-full object-cover brightness-75" />
                <button 
                  onClick={() => setSelectedPage(null)}
                  className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-xl border border-white/5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Floating Avatar */}
                <div className="absolute -bottom-6 left-6 w-16 h-16 rounded-2xl overflow-hidden border-2 border-zinc-900 bg-zinc-900">
                  <img src={selectedPage.avatar} className="w-full h-full object-cover" />
                </div>
              </div>

              {/* Profile Details */}
              <div className="p-6 pt-8 space-y-4 flex-1 overflow-y-auto text-white text-left">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-lg font-black text-white">{selectedPage.name}</h2>
                      {selectedPage.isVerified && <CheckCircle className="w-4 h-4 text-purple-400" />}
                    </div>
                    <p className="text-xs font-mono text-violet-300/60">@{selectedPage.username} • {selectedPage.category}</p>
                  </div>

                  <button
                    onClick={() => handleToggleFollowPage(selectedPage.id)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-mono font-bold uppercase ${
                      selectedPage.followers.includes(currentUser.id) 
                        ? 'bg-zinc-800 text-white border border-white/10' 
                        : 'bg-pink-600 text-white hover:brightness-110'
                    }`}
                  >
                    {selectedPage.followers.includes(currentUser.id) ? 'Following' : 'Follow Page'}
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-current/80 leading-relaxed font-sans">{selectedPage.description}</p>

                <div className="grid grid-cols-3 gap-3 bg-black/40 border border-white/5 rounded-2xl p-3 text-center">
                  <div>
                    <span className="text-[9px] font-mono text-current/40 uppercase block">Followers</span>
                    <span className="text-xs sm:text-sm font-black text-violet-300">{selectedPage.followersCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-current/40 uppercase block">Publications</span>
                    <span className="text-xs sm:text-sm font-black text-pink-300">{selectedPage.postsCount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-current/40 uppercase block">Sparks Received</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-300">{selectedPage.sparksReceived}</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono text-current/60">
                  {selectedPage.website && (
                    <p className="flex items-center gap-1.5">
                      <LinkIcon className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-white hover:underline cursor-pointer">{selectedPage.website}</span>
                    </p>
                  )}
                  {selectedPage.contactInfo && (
                    <p className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-violet-400" />
                      <span className="text-white">{selectedPage.contactInfo}</span>
                    </p>
                  )}
                  <p className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-violet-400" />
                    <span>{selectedPage.joinedDate}</span>
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* MODAL: CREATE COMMUNITY SPACE */}
      {/* ========================================================== */}
      <AnimatePresence>
        {showCreateCommunityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm text-left">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#09071b] border border-white/10 rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto text-white"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-black font-mono tracking-widest text-violet-400 uppercase">Initialize Community Space</h3>
                <button onClick={() => setShowCreateCommunityModal(false)} className="p-1 text-current/60 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateCommunity} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-300 block uppercase">Community Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quantum Physics Lab"
                    value={newCommName}
                    onChange={(e) => setNewCommName(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-300 block uppercase">Description</label>
                  <textarea
                    required
                    placeholder="Enter what members should expect from this workspace..."
                    value={newCommDesc}
                    onChange={(e) => setNewCommDesc(e.target.value)}
                    rows={2}
                    className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-violet-300 block uppercase">Access Scope Type</label>
                    <select
                      value={newCommType}
                      onChange={(e) => setNewCommType(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-white/5 p-2 rounded-xl text-xs text-violet-300 focus:outline-none focus:border-white/10"
                    >
                      <option value="public">Public (Everyone can join)</option>
                      <option value="private">Private (Approval required)</option>
                      <option value="invite-only">Invite Only</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-violet-300 block uppercase">Tags (comma-separated)</label>
                    <input
                      type="text"
                      placeholder="Physics, Science, Research"
                      value={newCommTags}
                      onChange={(e) => setNewCommTags(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-300 block uppercase">Banner Image Link</label>
                  <input
                    type="text"
                    value={newCommBanner}
                    onChange={(e) => setNewCommBanner(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-300 block uppercase">Avatar Image Link</label>
                  <input
                    type="text"
                    value={newCommAvatar}
                    onChange={(e) => setNewCommAvatar(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-300 block uppercase">Rules list (One per line)</label>
                  <textarea
                    value={newCommRules}
                    onChange={(e) => setNewCommRules(e.target.value)}
                    rows={3}
                    className="w-full bg-zinc-900 border border-white/5 p-2 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left font-mono"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-pink-600 hover:bg-pink-500 text-white rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  INITIALIZE NEW SPACE
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================== */}
      {/* MODAL: CREATE PAGE */}
      {/* ========================================================== */}
      <AnimatePresence>
        {showCreatePageModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm text-left">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-[#09071b] border border-white/10 rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto text-white"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="text-sm font-black font-mono tracking-widest text-violet-400 uppercase">Initialize Managed Page</h3>
                <button onClick={() => setShowCreatePageModal(false)} className="p-1 text-current/60 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreatePage} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-violet-300 block uppercase">Display Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Corporation"
                      value={newPageName}
                      onChange={(e) => setNewPageName(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-violet-300 block uppercase">Username (@)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. acme_corp"
                      value={newPageUsername}
                      onChange={(e) => setNewPageUsername(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-300 block uppercase">Category Entity Type</label>
                  <select
                    value={newPageCategory}
                    onChange={(e) => setNewPageCategory(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-white/5 p-2 rounded-xl text-xs text-violet-300 focus:outline-none focus:border-white/10"
                  >
                    {['Creator', 'Business', 'Brand', 'Organization', 'School', 'Sports Club', 'Entertainment', 'Music Artist', 'Public Figure', 'Community', 'News & Media', 'Non-Profit'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-300 block uppercase">Description</label>
                  <textarea
                    required
                    placeholder="Describe your brand, business, or organization to the Nexora ecosystem..."
                    value={newPageDesc}
                    onChange={(e) => setNewPageDesc(e.target.value)}
                    rows={2.5}
                    className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-violet-300 block uppercase">Website URL</label>
                    <input
                      type="text"
                      placeholder="acme.com"
                      value={newPageWebsite}
                      onChange={(e) => setNewPageWebsite(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-violet-300 block uppercase">Contact Info (future-ready)</label>
                    <input
                      type="text"
                      placeholder="contact@acme.com"
                      value={newPageContact}
                      onChange={(e) => setNewPageContact(e.target.value)}
                      className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-300 block uppercase">Avatar Link</label>
                  <input
                    type="text"
                    value={newPageAvatar}
                    onChange={(e) => setNewPageAvatar(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-violet-300 block uppercase">Cover Image Link</label>
                  <input
                    type="text"
                    value={newPageCover}
                    onChange={(e) => setNewPageCover(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/5 p-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-white/10 text-left"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-mono text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                >
                  CREATE ENTITY PAGE
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
