import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, Users, Coins, Wand2, Check, Plus, Flame, Globe, X, Send, Volume2, Lock, FileText, Calendar, Shield, Trophy, Megaphone, UserCheck, BarChart2, Download, Award, Search, PlusCircle, Eye, Settings, Heart, MessageSquare, Bookmark, ThumbsUp, Trash2, AlertTriangle, UserPlus, ChevronRight, Phone, Link as LinkIcon, CheckCircle, HelpCircle, Info, Layers, ArrowRight, Forward } from 'lucide-react';
import { Circle, User, Page, Post, Comment } from '../types';
import { recordRecommendationEvent } from '../utils/recommendations';
import { addFollow, createCommunity, createPage, removeFollow, subscribeToCommunities, subscribeToFollows, subscribeToPages } from '../services/dataService';
import { isCircleJoinedDb } from '../data/database';
import { ActivityService } from '../services/activityService';
import { auth } from '../services/firebase/config';
import { CommunityService } from '../services/firebase/communityService';
import { getPageFollowerCount } from '../services/firebase/pageChannelService';
import BusinessServicesPanel from './BusinessServicesPanel';
import PageChannelPanel from './PageChannelPanel';

const hideUnavailableImage = (event: React.SyntheticEvent<HTMLImageElement>) => {
  event.currentTarget.style.display = 'none';
};

interface CommunitiesHubViewProps {
  currentUser: User;
  onSwitchIdentity: (identity: { id: string; name: string; username: string; avatar: string; isPage: boolean; originalUser?: User }) => void;
  posts: Post[];
  onAddPost: (content: string, imageUrl?: string, tagsString?: string, communityName?: string) => void;
  onLikePost: (postId: string) => void;
  onAddComment: (postId: string, commentContent: string) => void;
  theme: 'neon-cyber' | 'stealth-dark' | 'platinum-light' | 'emerald-glass';
  locale?: 'en' | 'fr' | 'ar' | 'pt';
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
  locale = 'en',
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

  useEffect(() => {
    try {
      const handoffQuery = window.sessionStorage.getItem('nexora_community_search_handoff');
      if (handoffQuery) {
        setSearchQuery(handoffQuery);
        setActiveFilter('explore');
        window.sessionStorage.removeItem('nexora_community_search_handoff');
      }
    } catch (error) {
      console.warn('Could not restore community search:', error);
    }
  }, []);

  // 4. Custom communities and pages state
  const [communities, setCommunities] = useState<Circle[]>(() => {
    const saved = localStorage.getItem(COMMUNITIES_STORAGE_KEY);
    if (saved) {
      try {
        const cached = JSON.parse(saved);
        const accountId = auth.currentUser?.uid || currentUser.id;
        return Array.isArray(cached) ? cached.map((community) => ({
          ...community,
          isJoinedByMe: isCircleJoinedDb(accountId, community.id)
        })) : [];
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
    return [];
  });
  const [followedPageIds, setFollowedPageIds] = useState<string[]>([]);
  const followActorId = auth.currentUser?.uid || currentUser.id;

  // 5. Active Selected Community Portal State
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [activePortalTab, setActivePortalTab] = useState<string>('feed');

  // 6. Selected Page Profile View State
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [selectedPageFollowerCount, setSelectedPageFollowerCount] = useState<number | null>(null);
  const [pageFollowerCountLoading, setPageFollowerCountLoading] = useState(false);

  useEffect(() => {
    let active = true;
    if (!selectedPage?.id) {
      setSelectedPageFollowerCount(null);
      return () => { active = false; };
    }
    setPageFollowerCountLoading(true);
    setSelectedPageFollowerCount(null);
    getPageFollowerCount(selectedPage.id)
      .then(count => { if (active) setSelectedPageFollowerCount(count); })
      .catch(() => { if (active) setSelectedPageFollowerCount(null); })
      .finally(() => { if (active) setPageFollowerCountLoading(false); });
    return () => { active = false; };
  }, [selectedPage?.id]);

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
  const [communityFeedPosts, setCommunityFeedPosts] = useState<Array<{ id: string; authorId: string; authorName: string; authorUsername: string; authorAvatar: string; content: string; createdAt: string }>>([]);
  const [communityFeedLoading, setCommunityFeedLoading] = useState(false);
  const [communityFeedError, setCommunityFeedError] = useState('');
  const [communityPostSubmitting, setCommunityPostSubmitting] = useState(false);
  const [communityEvents, setCommunityEvents] = useState<Array<{ id: string; title: string; startsAt: string; location: string; attendeeCount: number; createdBy: string; myRsvp: boolean }>>([]);
  const [communityEventsLoading, setCommunityEventsLoading] = useState(false);
  const [communityEventsError, setCommunityEventsError] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventStartsAt, setEventStartsAt] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [communityPolls, setCommunityPolls] = useState<Array<{ id: string; question: string; options: Array<{ id: string; text: string; votes: number }>; createdBy: string; status: string; myVote: string | null; createdAt: string }>>([]);
  const [communityPollsLoading, setCommunityPollsLoading] = useState(false);
  const [communityPollsError, setCommunityPollsError] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptionsText, setPollOptionsText] = useState('');
  const [pollSubmitting, setPollSubmitting] = useState(false);
  const [communityMembers, setCommunityMembers] = useState<Array<{ userId: string; name: string; username: string; avatar: string; role: string }>>([]);
  const [communityMembersLoading, setCommunityMembersLoading] = useState(false);
  const [communityMembersError, setCommunityMembersError] = useState('');
  const [communityMemberCount, setCommunityMemberCount] = useState<number | null>(null);

  // 11. Community Moderation State Variables
  const [banInput, setBanInput] = useState('');
  const [reportReasonInput, setReportReasonInput] = useState('');
  const [reportedPostId, setReportedPostId] = useState<string | null>(null);

  // Real-time synchronization for Communities and Pages
  useEffect(() => {
    let active = true;
    const unsubComm = subscribeToCommunities(followActorId, (dbComms) => {
      void Promise.all(dbComms.map(async community => ({
        ...community,
        isJoinedByMe: await CommunityService.isActiveMember(followActorId, community.id).catch(() => false),
      }))).then(next => {
        if (active) setCommunities(next);
      });
    });
    const unsubPages = subscribeToPages((dbPages) => {
      setPages(dbPages);
    });
    const unsubFollows = subscribeToFollows(followActorId, (follows) => {
      setFollowedPageIds(follows.map((follow) => follow.followingId).filter((id): id is string => typeof id === 'string'));
    });
    return () => {
      active = false;
      unsubComm();
      unsubPages();
      unsubFollows();
    };
  }, [followActorId]);

  useEffect(() => {
    if (!selectedCircle?.id) {
      setCommunityFeedPosts([]);
      setCommunityFeedLoading(false);
      setCommunityFeedError('');
      return;
    }
    let active = true;
    setCommunityFeedLoading(true);
    setCommunityFeedError('');
    const stop = CommunityService.watchPosts(
      selectedCircle.id,
      followActorId,
      nextPosts => {
        if (!active) return;
        setCommunityFeedPosts(nextPosts);
        setCommunityFeedLoading(false);
      },
      error => {
        if (!active) return;
        setCommunityFeedError(error.message || 'The Circle feed could not be loaded.');
        setCommunityFeedLoading(false);
      },
    );
    return () => { active = false; stop(); };
  }, [selectedCircle?.id, followActorId]);

  useEffect(() => {
    if (!selectedCircle?.id) {
      setCommunityEvents([]);
      setCommunityEventsLoading(false);
      setCommunityEventsError('');
      return;
    }
    let active = true;
    setCommunityEventsLoading(true);
    const stop = CommunityService.watchEvents(selectedCircle.id, followActorId, events => {
      if (!active) return;
      setCommunityEvents(events);
      setCommunityEventsLoading(false);
    }, error => {
      if (!active) return;
      setCommunityEventsError(error.message || 'Circle events could not be loaded.');
      setCommunityEventsLoading(false);
    });
    return () => { active = false; stop(); };
  }, [selectedCircle?.id, followActorId]);

  useEffect(() => {
    if (!selectedCircle?.id) {
      setCommunityPolls([]);
      setCommunityPollsLoading(false);
      setCommunityPollsError('');
      return;
    }
    let active = true;
    setCommunityPollsLoading(true);
    const stop = CommunityService.watchPolls(selectedCircle.id, followActorId, polls => {
      if (!active) return;
      setCommunityPolls(polls);
      setCommunityPollsLoading(false);
    }, error => {
      if (!active) return;
      setCommunityPollsError(error.message || 'Circle polls could not be loaded.');
      setCommunityPollsLoading(false);
    });
    return () => { active = false; stop(); };
  }, [selectedCircle?.id, followActorId]);

  useEffect(() => {
    if (!selectedCircle?.id || activePortalTab !== 'roles') {
      setCommunityMembers([]);
      setCommunityMembersLoading(false);
      setCommunityMembersError('');
      return;
    }
    let active = true;
    setCommunityMembersLoading(true);
    setCommunityMembersError('');
    CommunityService.listActiveMembersPage(selectedCircle.id, 40).then(result => {
      if (!active) return;
      setCommunityMembers(result.members);
      setCommunityMembersLoading(false);
    }).catch(error => {
      if (!active) return;
      setCommunityMembersError(error instanceof Error ? error.message : 'Circle members could not be loaded.');
      setCommunityMembersLoading(false);
    });
    return () => { active = false; };
  }, [selectedCircle?.id, activePortalTab, followActorId]);

  useEffect(() => {
    if (!selectedCircle?.id) {
      setCommunityMemberCount(null);
      return;
    }
    let active = true;
    CommunityService.getActiveMemberCount(selectedCircle.id).then(count => {
      if (active) setCommunityMemberCount(count);
    }).catch(() => {
      if (active) setCommunityMemberCount(null);
    });
    return () => { active = false; };
  }, [selectedCircle?.id, communityMembers.length]);

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
  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommName.trim()) return;

    const newComm: Circle = {
      id: `comm-${Date.now()}`,
      name: newCommName,
      description: newCommDesc,
      bannerImage: newCommBanner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      avatarImage: newCommAvatar || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150',
      creatorId: followActorId,
      rules: newCommRules.split('\n').filter(r => r.trim() !== ''),
      tags: newCommTags.split(',').map(t => t.trim()).filter(t => t !== ''),
      isJoinedByMe: true,
      moderators: [currentUser.username],
      admins: [currentUser.username],
      ownerId: followActorId,
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

    try {
      await createCommunity(newComm);
      setCommunities(prev => [newComm, ...prev]);
      setShowCreateCommunityModal(false);
    } catch (error) {
      console.error('Community creation failed:', error);
      window.dispatchEvent(new CustomEvent('toast', {
        detail: error instanceof Error ? error.message : 'The community could not be created. Please retry.',
      }));
      return;
    }
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
      joinedDate: `Joined ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      ownerId: followActorId
    };

    setPages(prev => [newPg, ...prev]);
    createPage(newPg);
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
  const handleToggleFollowPage = async (pageId: string) => {
    const isFollowing = followedPageIds.includes(pageId);
    setFollowedPageIds((prev) => isFollowing ? prev.filter((id) => id !== pageId) : [...prev, pageId]);
    try {
      if (isFollowing) await removeFollow(followActorId, pageId);
      else await addFollow(followActorId, pageId);
    } catch (error) {
      setFollowedPageIds((prev) => isFollowing ? [...prev, pageId] : prev.filter((id) => id !== pageId));
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Page follow could not be saved. Please try again.' }));
      console.error('Page follow update failed:', error);
    }
  };

  // 18. Circle posts are private to the active membership boundary.
  const handleCommunityPostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = communityPostInput.trim();
    if (!content || !selectedCircle || communityPostSubmitting) return;
    setCommunityPostSubmitting(true);
    setCommunityFeedError('');
    try {
      await CommunityService.createPost(selectedCircle.id, content);
      setCommunityPostInput('');
      window.dispatchEvent(new CustomEvent('toast', { detail: `Published to ${selectedCircle.name}` }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Your Circle post could not be published. Please retry.';
      setCommunityFeedError(message);
      window.dispatchEvent(new CustomEvent('toast', { detail: message }));
    } finally {
      setCommunityPostSubmitting(false);
    }
  };

  // 19. Join/Leave Community
  const handleJoinCircleToggle = async (circleId: string, e?: React.MouseEvent): Promise<boolean> => {
    if (e) e.stopPropagation();
    
    const target = communities.find(c => c.id === circleId);
    if (!target) return false;
    const willJoin = !target.isJoinedByMe;
    const access = target.type ?? 'unknown';
    if (willJoin && access !== 'public' && target.ownerId !== followActorId) {
      window.dispatchEvent(new CustomEvent('toast', { detail: access === 'unknown' ? 'Access settings are unavailable for this community.' : 'Access requests are not available yet.' }));
      return false;
    }

    try {
      if (willJoin) {
        recordRecommendationEvent('join_community', { communityName: target.name, tags: target.tags });
        await CommunityService.joinCommunity(followActorId, circleId);
      } else {
        await CommunityService.leaveCommunity(followActorId, circleId);
      }

      setCommunities(prev => prev.map(c => {
        if (c.id === circleId) {
          return {
            ...c,
            isJoinedByMe: willJoin,
          };
        }
        return c;
      }));
      window.dispatchEvent(new CustomEvent('toast', { detail: willJoin ? `✓ Joined ${target.name}` : `✓ Left ${target.name}` }));
      return true;
    } catch (err) {
      console.error('Failed community join/leave:', err);
      window.dispatchEvent(new CustomEvent('toast', { detail: `Failed to update membership. Please try again.` }));
      return false;
    }
  };

  const handleOpenCommunity = async (community: Circle) => {
    const access = community.type ?? 'unknown';
    if (access === 'unknown') {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Access settings are unavailable for this community.' }));
      return;
    }
    if (access !== 'public' && !community.isJoinedByMe && community.ownerId !== followActorId) {
      window.dispatchEvent(new CustomEvent('toast', { detail: 'This community is restricted. Access requests are not available yet.' }));
      return;
    }
    if (access === 'public' && !community.isJoinedByMe) {
      const joined = await handleJoinCircleToggle(community.id);
      if (!joined) return;
    }
    setSelectedCircle(community);
    setActivePortalTab('feed');
  };

  // 20. Circle events and polls use authenticated Firestore operations.
  const handleCreateCommunityEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircle || eventSubmitting) return;
    const start = new Date(eventStartsAt);
    if (!eventTitle.trim() || !Number.isFinite(start.getTime()) || start.getTime() <= Date.now()) {
      setCommunityEventsError('Enter an event title and a future date.');
      return;
    }
    setEventSubmitting(true);
    setCommunityEventsError('');
    try {
      await CommunityService.createEvent(selectedCircle.id, eventTitle, start.toISOString(), eventLocation);
      setEventTitle('');
      setEventStartsAt('');
      setEventLocation('');
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Circle event created.' }));
    } catch (error) {
      setCommunityEventsError(error instanceof Error ? error.message : 'The Circle event could not be created.');
    } finally {
      setEventSubmitting(false);
    }
  };

  const handleRsvpEvent = async (event: { id: string; myRsvp: boolean }) => {
    if (!selectedCircle) return;
    try {
      await CommunityService.rsvpEvent(selectedCircle.id, event.id, !event.myRsvp);
      window.dispatchEvent(new CustomEvent('toast', { detail: event.myRsvp ? 'RSVP cancelled.' : 'You are registered for this Circle event.' }));
    } catch (error) {
      setCommunityEventsError(error instanceof Error ? error.message : 'Your RSVP could not be saved.');
    }
  };

  const handleCreateCommunityPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCircle || pollSubmitting) return;
    const options = pollOptionsText.split(/\\r?\\n/).map(option => option.trim()).filter(Boolean);
    setPollSubmitting(true);
    setCommunityPollsError('');
    try {
      await CommunityService.createPoll(selectedCircle.id, pollQuestion, options);
      setPollQuestion('');
      setPollOptionsText('');
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Circle poll published.' }));
    } catch (error) {
      setCommunityPollsError(error instanceof Error ? error.message : 'The Circle poll could not be created.');
    } finally {
      setPollSubmitting(false);
    }
  };

  const handleVoteCommunityPoll = async (pollId: string, optionId: string) => {
    if (!selectedCircle) return;
    try {
      await CommunityService.votePoll(selectedCircle.id, pollId, optionId);
      window.dispatchEvent(new CustomEvent('toast', { detail: 'Your vote has been recorded.' }));
    } catch (error) {
      setCommunityPollsError(error instanceof Error ? error.message : 'Your vote could not be recorded.');
    }
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
    <div className="nx-page-shell space-y-6 pb-28 sm:pb-12">
      {/* 🔴 Section Title & Premium Controls */}
      <div className="nx-page-header flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5 text-left">
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
        <div className="nx-soft-card flex items-center gap-3 p-2 rounded-2xl">
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
                    <Sparkles className="w-3.5 h-3.5" /> Communities on Nexora
                  </h3>
                  <div className="space-y-2">
                    {getFeaturedCommunities().map((c) => (
                      <div key={c.id} onClick={() => void handleOpenCommunity(c)} className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/5 rounded-2xl flex items-center justify-between cursor-pointer transition-all">
                        <div className="flex items-center gap-2">
                          <img src={c.avatarImage || c.bannerImage || ''} alt="" onError={hideUnavailableImage} className="w-9 h-9 rounded-xl object-cover ring-1 ring-violet-500/30 bg-zinc-900" />
                          <div>
                            <p className="text-xs font-bold text-white">{c.name}</p>
                            <p className="text-[9px] font-mono text-violet-400/60">{c.type === 'unknown' ? 'Access not configured' : c.type === 'public' ? 'Public community' : 'Restricted community'}</p>
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
                    <Flame className="w-3.5 h-3.5" /> Member-created spaces
                  </h3>
                  <div className="space-y-2">
                    {getNewCommunities().length > 0 ? (
                      getNewCommunities().map((c) => (
                      <div key={c.id} onClick={() => void handleOpenCommunity(c)} className="p-2.5 bg-black/40 hover:bg-black/60 border border-white/5 rounded-2xl flex items-center justify-between cursor-pointer transition-all">
                          <div className="flex items-center gap-2">
                            <img src={c.avatarImage || c.bannerImage || ''} alt="" onError={hideUnavailableImage} className="w-9 h-9 rounded-xl object-cover ring-1 ring-cyan-500/30 bg-zinc-900" />
                            <div>
                              <p className="text-xs font-bold text-white">{c.name}</p>
                              <p className="text-[9px] font-mono text-cyan-400/60">New • {c.tags[0] ? `#${c.tags[0]}` : 'Community'}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-cyan-400/40" />
                        </div>
                      ))
                    ) : (
                      <p className="text-[11px] text-current/45 italic py-4">No member-created spaces yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Communities Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCommunities.map((circle) => {
                const isModerator = circle.moderators?.includes(currentUser.username) || circle.ownerId === followActorId;
                
                return (
                  <div 
                    key={circle.id} 
                    onClick={() => void handleOpenCommunity(circle)}
                    className="nx-soft-card overflow-hidden hover:border-violet-400/30 transition-all duration-300 group flex flex-col justify-between cursor-pointer relative"
                  >
                    {/* Cover image banner */}
                    <div className="relative h-24 w-full bg-slate-900 border-b border-white/5 overflow-hidden">
                      <img 
                        src={circle.bannerImage || ''}
                        alt=""
                        onError={hideUnavailableImage}
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
                        <img src={circle.avatarImage || circle.bannerImage || ''} alt="" onError={hideUnavailableImage} className="w-full h-full object-cover" />
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

                    {/* Access label and button */}
                    <div className="p-3 bg-zinc-900/40 border-t border-white/5 flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1.5 text-[9px] font-mono text-current/50">
                        <Users className="w-3 h-3 text-violet-400" />
                        <span>{circle.type === 'unknown' ? 'Access not configured' : circle.type === 'public' ? 'Public community' : 'Restricted community'}</span>
                      </div>

                      <button
                        onClick={(e) => handleJoinCircleToggle(circle.id, e)}
                        disabled={!circle.isJoinedByMe && circle.type !== 'public' && circle.ownerId !== followActorId}
                        className={`min-h-11 min-w-11 px-3 py-2 rounded-xl font-mono text-[9px] font-black uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          circle.isJoinedByMe 
                            ? 'bg-transparent text-emerald-400 border border-emerald-500/30' 
                            : 'bg-violet-600 text-white hover:brightness-110'
                        }`}
                      >
                        {circle.isJoinedByMe ? 'JOINED' : circle.type === 'public' || circle.ownerId === followActorId ? 'JOIN' : circle.type === 'unknown' ? 'UNAVAILABLE' : 'RESTRICTED'}
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
                const isFollowing = followedPageIds.includes(pg.id);
                const isOwner = pg.ownerId === followActorId;
                const pagePosts = posts.filter((post) => post.userId === pg.id);

                return (
                  <div 
                    key={pg.id}
                    onClick={() => setSelectedPage(pg)}
                    className="nx-soft-card overflow-hidden hover:border-violet-400/30 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    {/* Header Cover */}
                    <div className="relative h-24 bg-slate-800">
                      <img src={pg.coverImage || ''} alt="" onError={hideUnavailableImage} className="w-full h-full object-cover brightness-75" />
                      
                      {pg.isVerified && (
                        <div className="absolute top-2 right-2 bg-purple-900/80 border border-purple-500/40 text-purple-300 text-[8px] font-mono px-1.5 py-0.5 rounded flex items-center gap-0.5 uppercase">
                          <CheckCircle className="w-2.5 h-2.5" /> Verified
                        </div>
                      )}

                      {/* Floating Profile Avatar */}
                      <div className="absolute -bottom-4 left-4 w-12 h-12 rounded-xl overflow-hidden border border-zinc-900 bg-zinc-900">
                        <img src={pg.avatar || ''} alt="" onError={hideUnavailableImage} className="w-full h-full object-cover" />
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
                        <p>Follower total not tracked</p>
                        <p>{pagePosts.length} Posts in feed</p>
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFollowPage(pg.id);
                          }}
                          className={`min-h-11 px-3 py-2 rounded-xl font-mono text-[9px] font-black uppercase transition-all ${
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
              {filteredPages.length === 0 && (
                <div className="col-span-full nx-surface rounded-2xl p-6 text-center">
                  <h3 className="text-sm font-semibold text-zinc-200">
                    {pages.length === 0 ? 'No public Pages are available yet.' : 'No Pages match these filters.'}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                    {pages.length === 0 ? 'New Pages will appear here when their owners publish them.' : 'Try another search term or choose a different category.'}
                  </p>
                </div>
              )}
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
                      <img src={p.avatar || ''} alt="" onError={hideUnavailableImage} className="w-12 h-12 rounded-xl object-cover ring-1 ring-violet-500/20 bg-zinc-900" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-bold text-white">{p.name}</h4>
                          <span className="text-[8px] font-mono uppercase bg-violet-600/20 text-violet-300 border border-white/10 px-1 py-0.5 rounded">{p.category}</span>
                        </div>
                        <p className="text-[10px] font-mono text-current/40">@{p.username} • Follower total not tracked</p>
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
            className="nx-surface rounded-3xl p-6 text-left"
          >
            <h3 className="text-sm font-black font-mono tracking-widest text-violet-300 uppercase">Page analytics</h3>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Audience reach, follower totals, demographics, and engagement trends are not connected to a trusted analytics source yet. No sample metrics are shown here.
            </p>
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
                  src={selectedCircle.bannerImage || ''}
                  onError={hideUnavailableImage}
                  alt={selectedCircle.name} 
                  className="absolute inset-0 w-full h-full object-cover brightness-50" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09071b] to-transparent" />
                
                <div className="relative z-10 flex items-center justify-between w-full gap-4">
                  <div className="flex items-center gap-3">
                    <img src={selectedCircle.avatarImage || selectedCircle.bannerImage || ''} alt="" onError={hideUnavailableImage} className="w-12 h-12 rounded-xl object-cover ring-2 ring-violet-500 bg-zinc-900" />
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
                    { id: 'polls', label: '🗳️ Polls' },
                    { id: 'media', label: '📁 Media Library' },
                    { id: 'events', label: '📅 Events' },
                    { id: 'roles', label: '🛡️ Members' },
                    { id: 'moderation', label: '🔧 Moderation' },
                    { id: 'insights', label: '📈 Insights' }
                  ].map(tab => (
                    <button key={tab.id} onClick={() => setActivePortalTab(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold font-mono uppercase tracking-wider transition-all duration-200 cursor-pointer ${activePortalTab === tab.id ? 'bg-[#8b5cf6] text-white shadow-lg' : 'text-violet-300/60 hover:text-white hover:bg-white/5'}`}>
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
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={communityPostSubmitting || !communityPostInput.trim()}
                          className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-mono font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                          <span>{communityPostSubmitting ? 'PUBLISHING…' : 'PUBLISH TO CIRCLE'}</span>
                        </button>
                      </div>
                    </form>

                    {communityFeedError && (
                      <div role="alert" className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 text-xs text-rose-200">{communityFeedError}</div>
                    )}
                    {communityFeedLoading && <p className="py-8 text-center text-xs text-zinc-400">Loading Circle posts…</p>}
                    {!communityFeedLoading && !communityFeedError && communityFeedPosts.length === 0 && (
                      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-8 text-center">
                        <p className="text-sm font-semibold text-white">A fresh start for {selectedCircle.name}</p>
                        <p className="mt-1 text-xs text-zinc-400">Posts shared here are visible to this Circle&apos;s active members.</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      {communityFeedPosts.map(post => (
                        <article key={post.id} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            {post.authorAvatar ? <img src={post.authorAvatar} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <div className="h-9 w-9 rounded-xl bg-violet-500/15" />}
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-white">{post.authorName}</p>
                              <p className="text-[10px] text-zinc-400">{post.authorUsername ? `@${post.authorUsername} · ` : ''}{post.createdAt}</p>
                            </div>
                            <span className="ml-auto rounded-full border border-violet-400/20 px-2 py-1 text-[9px] text-violet-200">CIRCLE ONLY</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-100">{post.content}</p>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {/* 1. Persisted Circle polls */}
                {activePortalTab === 'polls' && (
                  <div className="space-y-4 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Circle polls</h3>
                    <form onSubmit={handleCreateCommunityPoll} className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
                      <p className="text-xs font-semibold text-white">Create a poll</p>
                      <input value={pollQuestion} onChange={e => setPollQuestion(e.target.value)} maxLength={240} required placeholder="Ask your Circle a question" className="w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-xs text-white" />
                      <textarea value={pollOptionsText} onChange={e => setPollOptionsText(e.target.value)} required rows={4} placeholder={"One answer per line\nFirst option\nSecond option"} className="w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-xs text-white" />
                      <p className="text-[10px] text-zinc-500">Add 2 to 5 distinct options, one per line. Votes are recorded once per member.</p>
                      <div className="flex justify-end">
                        <button type="submit" disabled={pollSubmitting || !pollQuestion.trim() || !pollOptionsText.trim()} className="rounded-lg bg-violet-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50">{pollSubmitting ? 'PUBLISHING…' : 'PUBLISH POLL'}</button>
                      </div>
                    </form>
                    {communityPollsError && <p role="alert" className="text-xs text-rose-300">{communityPollsError}</p>}
                    {communityPollsLoading && <p className="py-6 text-center text-xs text-zinc-400">Loading polls…</p>}
                    {!communityPollsLoading && communityPolls.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-400">No polls have been published in this Circle.</p>}
                    {communityPolls.map(poll => {
                      const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);
                      return (
                        <article key={poll.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <h4 className="text-sm font-semibold text-white">{poll.question}</h4>
                            <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] uppercase text-zinc-400">{poll.status}</span>
                          </div>
                          <p className="text-[10px] text-zinc-500">{totalVotes.toLocaleString()} votes · {poll.createdAt}</p>
                          <div className="space-y-2">
                            {poll.options.map(option => {
                              const selected = poll.myVote === option.id;
                              const percent = totalVotes > 0 ? Math.round(option.votes / totalVotes * 100) : 0;
                              return (
                                <button key={option.id} type="button" disabled={Boolean(poll.myVote) || poll.status !== 'open'} onClick={() => void handleVoteCommunityPoll(poll.id, option.id)} className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-xs disabled:cursor-default ${selected ? 'border-violet-400/50 text-white' : 'border-white/10 text-zinc-200'}`}>
                                  <span className="absolute inset-y-0 left-0 bg-violet-500/15" style={{ width: `${percent}%` }} />
                                  <span className="relative flex items-center justify-between gap-2"><span>{option.text}</span><span className="text-[10px] text-zinc-400">{percent}% · {option.votes}</span></span>
                                </button>
                              );
                            })}
                          </div>
                          {poll.myVote && <p className="text-[10px] text-emerald-300">Your vote is recorded.</p>}
                        </article>
                      );
                    })}
                  </div>
                )}

                {/* 2. Shared media storage is not connected to a downloadable asset source. */}
                {activePortalTab === 'media' && (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center space-y-2">
                    <h3 className="text-sm font-semibold text-white">Circle media library</h3>
                    <p className="text-xs text-zinc-400">A secure, member-scoped upload and download pipeline is not connected to this library yet. No placeholder files or fake download actions are shown.</p>
                  </div>
                )}

                {/* 3. Persisted community events */}
                {activePortalTab === 'events' && (
                  <div className="space-y-4 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Circle events</h3>
                    <form onSubmit={handleCreateCommunityEvent} className="rounded-2xl border border-white/10 bg-black/30 p-4 space-y-3">
                      <p className="text-xs font-semibold text-white">Create an event</p>
                      <input value={eventTitle} onChange={e => setEventTitle(e.target.value)} maxLength={120} required placeholder="Event title" className="w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-xs text-white" />
                      <input type="datetime-local" value={eventStartsAt} onChange={e => setEventStartsAt(e.target.value)} required className="w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-xs text-white" />
                      <input value={eventLocation} onChange={e => setEventLocation(e.target.value)} maxLength={180} placeholder="Location or online meeting details (optional)" className="w-full rounded-lg border border-white/10 bg-zinc-900 p-2 text-xs text-white" />
                      <div className="flex justify-end">
                        <button type="submit" disabled={eventSubmitting || !eventTitle.trim() || !eventStartsAt} className="rounded-lg bg-violet-600 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-50">{eventSubmitting ? 'CREATING…' : 'CREATE EVENT'}</button>
                      </div>
                    </form>
                    {communityEventsError && <p role="alert" className="text-xs text-rose-300">{communityEventsError}</p>}
                    {communityEventsLoading && <p className="py-6 text-center text-xs text-zinc-400">Loading events…</p>}
                    {!communityEventsLoading && communityEvents.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-400">No upcoming events have been created for this Circle.</p>}
                    {communityEvents.map(event => (
                      <article key={event.id} className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-white">{event.title}</h4>
                          <p className="text-[10px] text-violet-200/70">{event.startsAt}</p>
                          {event.location && <p className="text-[10px] text-zinc-400">{event.location}</p>}
                          <p className="text-[10px] text-zinc-400">{event.attendeeCount.toLocaleString()} attending</p>
                        </div>
                        <button type="button" onClick={() => void handleRsvpEvent(event)} className={`rounded-lg px-3 py-2 text-[10px] font-bold ${event.myRsvp ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'bg-violet-600 text-white'}`}>
                          {event.myRsvp ? 'CANCEL RSVP' : 'RSVP'}
                        </button>
                      </article>
                    ))}
                  </div>
                )}

                {/* 4. Firestore-backed Circle members */}
                {activePortalTab === 'roles' && (
                  <div className="space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Active Circle members</h3>
                      <span className="text-xs text-violet-200">{communityMemberCount === null ? 'Count unavailable' : `${communityMemberCount.toLocaleString()} members`}</span>
                    </div>
                    {communityMembersError && <p role="alert" className="text-xs text-rose-300">{communityMembersError}</p>}
                    {communityMembersLoading && <p className="py-6 text-center text-xs text-zinc-400">Loading members…</p>}
                    {!communityMembersLoading && communityMembers.length === 0 && <p className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-zinc-400">No member records are available to display.</p>}
                    <div className="space-y-2">
                      {communityMembers.map(member => (
                        <div key={member.userId} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                          {member.avatar ? <img src={member.avatar} alt="" className="h-9 w-9 rounded-xl object-cover" /> : <div className="h-9 w-9 rounded-xl bg-violet-500/15" />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-white">{member.name}</p>
                            <p className="text-[10px] text-zinc-400">{member.username ? `@${member.username}` : member.userId}</p>
                          </div>
                          <span className="rounded-full border border-violet-400/20 px-2 py-1 text-[9px] uppercase text-violet-200">{member.role}</span>
                        </div>
                      ))}
                    </div>
                    {communityMembers.length >= 40 && <p className="text-center text-[10px] text-zinc-500">Showing the first 40 active members.</p>}
                  </div>
                )}

                {/* 5. Moderation availability is explicit; no local-only actions are presented as enforcement. */}
                {activePortalTab === 'moderation' && (
                  <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-5 space-y-2">
                    <h3 className="text-sm font-bold text-amber-200">Circle moderation controls</h3>
                    <p className="text-xs leading-relaxed text-zinc-300">Ban, mute, report-review and content-removal controls are not available in this Circle workspace yet. This panel will not claim that a restriction has been applied unless a trusted moderation operation confirms it.</p>
                  </div>
                )}

                {/* 6. Measured Circle activity only */}
                {activePortalTab === 'insights' && (
                  <div className="space-y-4 text-left">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-violet-400 font-bold">Circle activity snapshot</h3>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <span className="text-[10px] uppercase text-zinc-400">Active members</span>
                        <p className="mt-1 text-2xl font-black text-violet-200">{communityMemberCount === null ? 'Unavailable' : communityMemberCount.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                        <span className="text-[10px] uppercase text-zinc-400">Recent posts loaded</span>
                        <p className="mt-1 text-2xl font-black text-violet-200">{communityFeedPosts.length.toLocaleString()}</p>
                        <p className="mt-1 text-[10px] text-zinc-500">Latest feed window, not a lifetime total.</p>
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
                <img src={selectedPage.coverImage || ''} alt="" onError={hideUnavailableImage} className="w-full h-full object-cover brightness-75" />
                <button 
                  onClick={() => setSelectedPage(null)}
                  className="absolute top-3 right-3 p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-xl border border-white/5 transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Floating Avatar */}
                <div className="absolute -bottom-6 left-6 w-16 h-16 rounded-2xl overflow-hidden border-2 border-zinc-900 bg-zinc-900">
                  <img src={selectedPage.avatar || ''} alt="" onError={hideUnavailableImage} className="w-full h-full object-cover" />
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
                    className={`min-h-11 px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase ${
                      followedPageIds.includes(selectedPage.id)
                        ? 'bg-zinc-800 text-white border border-white/10' 
                        : 'bg-pink-600 text-white hover:brightness-110'
                    }`}
                    type="button"
                  >
                    {followedPageIds.includes(selectedPage.id) ? 'Following' : 'Follow Page'}
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-current/80 leading-relaxed font-sans">{selectedPage.description}</p>

                <div className="grid grid-cols-3 gap-3 bg-black/40 border border-white/5 rounded-2xl p-3 text-center">
                  <div>
                    <span className="text-[9px] font-mono text-current/40 uppercase block">Followers</span>
                    <span className="text-xs sm:text-sm font-black text-violet-300">{pageFollowerCountLoading ? 'Loading...' : selectedPageFollowerCount === null ? 'Unavailable' : selectedPageFollowerCount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-current/40 uppercase block">Posts in feed</span>
                    <span className="text-xs sm:text-sm font-black text-pink-300">{posts.filter((post) => post.userId === selectedPage.id).length}</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-current/40 uppercase block">Sparks on feed posts</span>
                    <span className="text-xs sm:text-sm font-black text-emerald-300">{posts.filter((post) => post.userId === selectedPage.id).reduce((total, post) => total + (post.likes || 0), 0)}</span>
                  </div>
                </div>

                <section className="space-y-3 pt-2" aria-label="Page posts">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-violet-300">Recent Page posts</h3>
                    <span className="text-[10px] text-violet-200/50">From your loaded feed</span>
                  </div>
                  {posts.filter(post => post.userId === selectedPage.id).slice(0, 20).length === 0 ? (
                    <p className="rounded-xl border border-dashed border-white/10 p-4 text-xs text-violet-200/50">This Page has not published a post visible in your current feed.</p>
                  ) : posts.filter(post => post.userId === selectedPage.id).slice(0, 20).map(post => (
                    <article key={post.id} className="rounded-2xl border border-white/10 bg-black/25 p-4 space-y-3">
                      <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-white/90">{post.content}</p>
                      {post.image && <img src={post.image} alt="" loading="lazy" onError={hideUnavailableImage} className="max-h-72 w-full rounded-xl object-cover" />}
                      {post.videoUrl && <video src={post.videoUrl} controls preload="metadata" className="max-h-72 w-full rounded-xl bg-black" />}
                      <div className="flex items-center justify-between border-t border-white/5 pt-2">
                        <span className="text-[10px] text-violet-200/50">{Number(post.likes || 0).toLocaleString()} Sparks</span>
                        <button type="button" onClick={() => onLikePost(post.id)} className="rounded-lg border border-violet-400/20 px-3 py-2 text-[10px] font-bold text-violet-200 hover:bg-violet-500/10">Spark</button>
                      </div>
                    </article>
                  ))}
                </section>

                <PageChannelPanel pageId={selectedPage.id} ownerId={selectedPage.ownerId} currentUserId={currentUser.id} isFollowing={followedPageIds.includes(selectedPage.id)} locale={locale} />\n\n                {selectedPage.category === 'Business' && <BusinessServicesPanel pageId={selectedPage.id} ownerId={selectedPage.ownerId} currentUserId={currentUser.id} locale={locale} />}

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
                    <span>{selectedPage.joinedDate || 'Date unavailable'}</span>
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
