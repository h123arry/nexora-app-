import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Flame, ArrowRight, Play, X, UserPlus, Check, Trash2, Clock, Globe, Users, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Post } from '../types';
import { SettingsService } from '../services/firebase/settingsService';
import { normalizeFeedPreferences } from '../services/discovery/feedPreferences';
import { auth } from '../services/firebase/config';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import MiniServicesHub from './MiniServicesHub';
import { searchCreators, searchPosts, recommendCreators, rankTrendingTopics } from '../services/discovery/discoveryService';
import { searchPublicDirectory, type PublicDirectoryResult } from '../services/firebase/directorySearchService';
import { getTranslations } from '../utils/translations';
import { readUserScopedJson } from '../utils/userScopedStorage';

function readExploreRecentSearches(userId: string): string[] {
  if (!userId) return [];
  try { const saved = localStorage.getItem('nexora_recent_searches_' + userId); const parsed = saved ? JSON.parse(saved) : []; return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string').slice(0, 8) : []; } catch { return []; }
}

interface ExploreViewProps {
  creators: User[];
  posts: Post[];
  setSelectedTag: (tag: string | null) => void;
  setActiveTab: (tab: any) => void;
  onLikePost: (postId: string) => void;
  onToggleFollow?: (creatorId: string) => void;
  followingIds: string[];
  onViewProfile?: (userIdOrUsername: string) => void;
  interestDNA?: Record<string, number>;
  currentUserId?: string;
  onOpenVohAi: () => void;
  locale?: string;
}

export default function ExploreView({
  creators,
  posts,
  setSelectedTag,
  setActiveTab,
  onLikePost,
  onToggleFollow,
  followingIds,
  onViewProfile,
  interestDNA = {},
  currentUserId = '',
  onOpenVohAi,
  locale = 'en'
}: ExploreViewProps) {
  const copy = getTranslations(locale);
  const [localSearch, setLocalSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchFilterType, setSearchFilterType] = useState<'all' | 'users' | 'posts' | 'videos' | 'communities'>('all');
  const [showAllPulse, setShowAllPulse] = useState(false);
  const [blockedCreatorIds, setBlockedCreatorIds] = useState<string[]>(() => readUserScopedJson(localStorage, 'nexora_blocked_users', currentUserId, []));
  const [mutedCreatorIds, setMutedCreatorIds] = useState<string[]>(() => readUserScopedJson(localStorage, 'nexora_muted_users', currentUserId, []));

  useEffect(() => {
    setBlockedCreatorIds(readUserScopedJson(localStorage, 'nexora_blocked_users', currentUserId, []));
    setMutedCreatorIds(readUserScopedJson(localStorage, 'nexora_muted_users', currentUserId, []));
  }, [currentUserId]);

  // Use the same owner-scoped relationship preferences as For You. Local
  // storage is only the offline/guest fallback, never the signed-in source.
  useEffect(() => {
    if (!currentUserId || auth.currentUser?.uid !== currentUserId) return;
    let cancelled = false;
    SettingsService.getSettings(currentUserId).then(settings => {
      if (cancelled) return;
      const preferences = normalizeFeedPreferences(settings.feed);
      setBlockedCreatorIds(preferences.blockedCreatorIds);
      setMutedCreatorIds(preferences.mutedCreatorIds);
    }).catch(() => {
      // Keep the existing local fallback if the preference read is unavailable.
    });
    return () => { cancelled = true; };
  }, [currentUserId]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readExploreRecentSearches(currentUserId));
  useEffect(() => { setRecentSearches(readExploreRecentSearches(currentUserId)); }, [currentUserId]);

  const [directoryResults, setDirectoryResults] = useState<PublicDirectoryResult | null>(null);
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [directoryError, setDirectoryError] = useState('');
  const [directoryLoadingMore, setDirectoryLoadingMore] = useState(false);
  const directoryRequestKey = useRef('');
  directoryRequestKey.current = currentUserId + ':' + debouncedSearch.trim();

  // Signed-in discovery uses the privacy-filtered server directory for people,
  // Pages and public Circles. Local post search remains scoped to loaded public posts.
  useEffect(() => {
    const term = debouncedSearch.trim();
    if (!currentUserId || term.length < 2) {
      setDirectoryResults(null);
      setDirectoryLoading(false);
      setDirectoryError('');
      return;
    }
    let cancelled = false;
    setDirectoryLoading(true);
    setDirectoryResults(null);
    setDirectoryError('');
    void searchPublicDirectory(term).then(results => {
      if (!cancelled) setDirectoryResults(results);
    }).catch(error => {
      if (!cancelled) {
        setDirectoryResults(null);
        setDirectoryError(error instanceof Error ? error.message : 'Directory search is temporarily unavailable.');
      }
    }).finally(() => {
      if (!cancelled) setDirectoryLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentUserId, debouncedSearch]);

  // Continue the server directory using its opaque, query-bound cursor. Results
  // are merged by stable document ID so overlapping prefix indexes never duplicate cards.
  const loadMoreDirectoryResults = async () => {
    const cursor = directoryResults?.nextCursor;
    const term = debouncedSearch.trim();
    const requestKey = directoryRequestKey.current;
    if (!currentUserId || !cursor || directoryLoadingMore || term.length < 2) return;
    setDirectoryLoadingMore(true);
    setDirectoryError('');
    try {
      const next = await searchPublicDirectory(term, cursor);
      if (directoryRequestKey.current !== requestKey) return;
      setDirectoryResults(current => {
        if (!current) return next;
        const mergeById = <T extends { id: string },>(previous: T[], incoming: T[]) =>
          [...new Map([...previous, ...incoming].map(item => [item.id, item])).values()];
        return {
          people: mergeById(current.people, next.people),
          pages: mergeById(current.pages, next.pages),
          circles: mergeById(current.circles, next.circles),
          nextCursor: next.nextCursor,
        };
      });
    } catch (error) {
      if (directoryRequestKey.current === requestKey) setDirectoryError(error instanceof Error ? error.message : 'More directory results could not be loaded.');
    } finally {
      if (directoryRequestKey.current === requestKey) setDirectoryLoadingMore(false);
    }
  };

    // Debounce search input for performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(localSearch);
    }, 150);
    return () => clearTimeout(timer);
  }, [localSearch]);

  // Save search to recent searches when submitted or selected
  const addRecentSearch = (term: string) => {
    if (!currentUserId || !term.trim()) return;
    const trimmed = term.trim();
    setRecentSearches(prev => {
      const updated = [trimmed, ...prev.filter(item => item !== trimmed)].slice(0, 8);
      try {
        localStorage.setItem('nexora_recent_searches_' + currentUserId, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const removeRecentSearch = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) return;
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== term);
      try {
        localStorage.setItem('nexora_recent_searches_' + currentUserId, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const clearAllRecentSearches = () => {
    setRecentSearches([]);
    if (!currentUserId) return;
    try {
      localStorage.removeItem('nexora_recent_searches_' + currentUserId);
    } catch {}
  };

  // Recent topic momentum is based on real loaded posts from multiple creators.
  const trendingTags = useMemo(() => rankTrendingTopics(posts, { windowHours: 168, minPosts: 2, limit: 6 })
    .map(topic => [`#${topic.tag}`, topic.postCount] as [string, number]), [posts]);

  // Personalize creator suggestions using the signed-in user's interest profile.
  const suggestedCreators = useMemo(() => recommendCreators(creators, {
    followingIds,
    blockedCreatorIds,
    mutedCreatorIds,
    interests: interestDNA,
    limit: 12,
  }).map(item => item.creator), [creators, followingIds, blockedCreatorIds, mutedCreatorIds, interestDNA]);

  // Filtered lists for search
  const filteredPosts = useMemo(() => {
    return searchPosts(posts, debouncedSearch);
  }, [posts, debouncedSearch]);

  const filteredCreators = useMemo(() => {
    return searchCreators(creators, debouncedSearch, { limit: 50 });
  }, [creators, debouncedSearch]);

  const filteredVideos = useMemo(() => {
    return searchPosts(posts, debouncedSearch, { videosOnly: true });
  }, [posts, debouncedSearch]);

  const hasActiveSearch = debouncedSearch.trim().length > 0;
  const searchPeople = currentUserId && directoryResults ? directoryResults.people : filteredCreators;
  const searchPages = directoryResults?.pages || [];
  const searchCircles = directoryResults?.circles || [];
  const directoryEntryCount = searchPages.length + searchCircles.length;
  const visibleResultCount = searchFilterType === 'users'
    ? searchPeople.length
    : searchFilterType === 'posts'
      ? filteredPosts.length
      : searchFilterType === 'videos'
        ? filteredVideos.length
        : searchFilterType === 'communities'
          ? directoryEntryCount
          : searchPeople.length + filteredPosts.length + filteredVideos.length + directoryEntryCount;

  return (
    <div id="explore-view-master-panel" className="nx-page-shell space-y-6 pb-12 max-w-4xl mx-auto px-4 sm:px-6">
      
      {/* Search Header & Input */}
      <div className="nx-page-header sticky top-0 z-30 pb-4 pt-3 px-3 sm:px-0 space-y-3 border-b">
        <div className="flex items-baseline gap-2 px-1">
          <span className="text-lg sm:text-xl font-extrabold tracking-tight nx-gradient-text leading-none">NEXORA</span>
          <span className="nx-eyebrow">Discover</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
            <input
              type="text"
              placeholder={copy.searchPlaceholder}
              aria-label="Search people, posts, videos, hashtags and communities"
              autoComplete="off"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && localSearch.trim()) {
                  addRecentSearch(localSearch.trim());
                }
              }}
              className="nx-field w-full pl-11 pr-10 text-sm font-sans"
            />
            {localSearch && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setLocalSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Tabs */}
        <div role="group" aria-label="Filter discovery results" className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'all', label: copy.filterAll },
            { id: 'users', label: copy.filterUsers },
            { id: 'posts', label: copy.filterPosts },
            { id: 'videos', label: copy.filterVideos },
            { id: 'communities', label: copy.filterCommunities }
          ].map(f => (
            <button
              type="button"
              key={f.id}
              aria-pressed={searchFilterType === f.id}
              onClick={() => setSearchFilterType(f.id as any)}
                className={`nx-explore-filter px-4 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all shrink-0 cursor-pointer border ${
                  searchFilterType === f.id
                  ? 'bg-violet-600/20 text-violet-100 border-violet-300/40 shadow-[inset_0_0_0_1px_rgba(182,155,255,0.08)]'
                  : 'bg-transparent text-zinc-400 hover:text-white border-[#1b2940]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {!hasActiveSearch && <MiniServicesHub signedIn={Boolean(currentUserId)} onOpen={setActiveTab} onOpenVohAi={onOpenVohAi} locale={locale} />}

      {/* Recent Searches (shown when search is empty) */}
      {!hasActiveSearch && recentSearches.length > 0 && (
        <div className="space-y-2.5 text-left">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-mono tracking-widest text-violet-400 font-bold uppercase flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Recent Searches
            </span>
            <button 
              onClick={clearAllRecentSearches}
              className="text-[10px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((term) => (
              <div key={term} className="group flex items-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-xs text-zinc-300 transition-all">
                <button
                  type="button"
                  onClick={() => {
                    setLocalSearch(term);
                    addRecentSearch(term);
                  }}
                  className="min-h-10 px-3 py-1.5 rounded-l-xl text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-violet-300"
                >
                  {term}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${term} from recent searches`}
                  onClick={(event) => removeRecentSearch(term, event)}
                  className="min-h-10 min-w-10 flex items-center justify-center rounded-r-xl text-zinc-500 hover:text-violet-300 focus-visible:outline-2 focus-visible:outline-violet-300"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH RESULTS VIEW */}
      {hasActiveSearch ? (
        <div id="explore-search-results" className="space-y-6 text-left">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-mono text-violet-400 uppercase tracking-widest font-extrabold">
              Found {visibleResultCount} {visibleResultCount === 1 ? 'result' : 'results'} for "{debouncedSearch}"
            </h2>
            <button
              onClick={() => { setLocalSearch(''); setSearchFilterType('all'); }}
              className="text-[11px] font-mono text-violet-300 hover:text-violet-200 font-bold uppercase cursor-pointer"
            >
              Clear Search ✖
            </button>
          </div>
          {directoryLoading && <p role="status" className="px-1 text-[10px] text-violet-300">Searching the live directory…</p>}
          {directoryError && <p role="alert" className="px-1 text-[10px] text-amber-300">Live directory search is unavailable. Showing locally loaded results where possible.</p>}

          {visibleResultCount === 0 && searchFilterType === 'communities' && directoryLoading ? (
            <div role="status" className="p-8 rounded-3xl nx-surface text-center text-xs text-zinc-400">Searching public people, Pages and Circles…</div>
          ) : visibleResultCount === 0 && searchFilterType === 'communities' ? (
            <div className="p-6 rounded-3xl nx-surface text-center space-y-3 my-8">
              <h3 className="text-sm font-bold text-white">{directoryError ? 'Directory search is unavailable' : 'No public Pages or Circles found'}</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans">{directoryError || 'Try another search term, or open the Communities hub to browse available groups.'}</p>
              <button type="button" onClick={() => setActiveTab('communities')} className="px-4 py-2 rounded-xl bg-violet-600/15 hover:bg-violet-600 border border-violet-400/30 text-violet-200 hover:text-white text-[10px] font-mono font-bold uppercase">Open Communities</button>
            </div>
          ) : visibleResultCount === 0 ? (
            <div className="p-12 rounded-3xl nx-surface text-center space-y-3 my-8">
              <div className="w-12 h-12 rounded-2xl bg-violet-600/20 border border-white/10 flex items-center justify-center mx-auto text-violet-400">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">No {searchFilterType === 'all' ? 'matches' : searchFilterType} found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto font-sans">
                We couldn't find anything matching "{debouncedSearch}". Try a different keyword, hashtag, creator, or community.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* Users Section */}
              {(searchFilterType === 'all' || searchFilterType === 'users') && searchPeople.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-mono text-violet-400 uppercase tracking-wider font-bold">Users ({searchPeople.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {searchPeople.map(user => (
                      <div
                        key={user.id}
                        className="nx-soft-card p-3 hover:border-violet-400/30 flex items-center justify-between gap-3 transition-all group"
                      >
                        <button
                          type="button"
                          aria-label={`View ${user.name}'s profile`}
                          onClick={() => {
                            addRecentSearch(user.username);
                            onViewProfile?.(user.id);
                          }}
                          className="min-w-0 flex flex-1 items-center gap-3 overflow-hidden rounded-lg text-left focus-visible:outline-2 focus-visible:outline-violet-300"
                        >
                          <img src={user.avatar} alt="" loading="lazy" decoding="async" className="w-12 h-12 rounded-xl object-cover ring-2 ring-violet-500/30 group-hover:scale-105 transition-transform" />
                          <div className="overflow-hidden">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                              {user.isVerified && <PurpleVerifiedBadge />}
                            </div>
                            <span className="text-[10px] font-mono text-violet-400 truncate block">@{user.username}</span>
                            <p className="text-[10px] text-zinc-400 truncate mt-0.5">{user.bio || 'Nexora Creator'}</p>
                          </div>
                        </button>
                        <button
                          type="button"
                          aria-pressed={followingIds.includes(user.id)}
                          aria-label={followingIds.includes(user.id) ? `Unfollow ${user.username}` : `Follow ${user.username}`}
                          onClick={() => {
                            onToggleFollow?.(user.id);
                          }}
                          className={`px-4 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer shrink-0 ${
                            followingIds.includes(user.id)
                              ? 'bg-white/10 text-zinc-300 hover:bg-white/20'
                              : 'bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                          }`}
                        >
                          {followingIds.includes(user.id) ? 'Following' : 'Follow'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts Section */}
              {(searchFilterType === 'all' || searchFilterType === 'posts') && filteredPosts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-mono text-violet-400 uppercase tracking-wider font-bold">Posts & Discussions ({filteredPosts.length})</h3>
                  <div className="space-y-3">
                    {filteredPosts.map(post => (
                      <div key={post.id} className="p-4 rounded-2xl nx-surface space-y-2.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <button type="button" onClick={() => onViewProfile?.(post.userId || post.username)} aria-label={`View @${post.username}'s profile`} className="flex min-h-11 items-center gap-2.5 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-violet-300 focus-visible:outline-offset-2">
                            <img src={post.avatar} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            <span>
                              <span className="flex items-center gap-1">
                                <span className="text-xs font-bold text-white">{post.name}</span>
                                {post.isVerified && <PurpleVerifiedBadge />}
                              </span>
                              <span className="block text-[9px] font-mono text-zinc-400">@{post.username}</span>
                            </span>
                          </button>
                          <span className="text-[9px] font-mono text-violet-400 bg-violet-600/10 px-2 py-0.5 rounded-full border border-white/10">Post</span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed font-sans">{post.content}</p>
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {post.tags.map(t => (
                              <button 
                                key={t} 
                                onClick={() => {
                                  setSelectedTag(t);
                                  setActiveTab('feed');
                                }}
                                className="text-[10px] font-mono text-violet-300 bg-violet-950/40 border border-white/10 px-2 py-0.5 rounded-lg hover:bg-violet-900/40 transition-colors"
                              >
                                #{t}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Videos Section */}
              {(searchFilterType === 'all' || searchFilterType === 'videos') && filteredVideos.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-mono text-violet-400 uppercase tracking-wider font-bold">Videos ({filteredVideos.length})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredVideos.map(video => (
                      <div key={video.id} className="p-3.5 rounded-2xl nx-surface space-y-2 flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="relative w-12 h-14 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                            {video.videoUrl ? (
                              <video src={video.videoUrl} poster={video.image || undefined} className="w-full h-full object-cover" muted playsInline preload="none" aria-hidden="true" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs">🎥</div>
                            )}
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <Play className="w-4 h-4 text-white fill-white drop-shadow" />
                            </div>
                          </div>
                          <div className="overflow-hidden">
                            <h4 className="text-xs font-bold text-white truncate">{video.content || 'Untitled Video'}</h4>
                            <span className="text-[10px] font-mono text-violet-400 truncate block">@{video.username}</span>
                            <span className="text-[9px] font-mono text-zinc-500 block mt-0.5">{video.likes || 0} sparks</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedTag(null);
                            setActiveTab('feed');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-mono font-bold uppercase transition-all shrink-0 cursor-pointer shadow-md"
                        >
                          Watch
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(searchFilterType === 'all' || searchFilterType === 'communities') && directoryEntryCount > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[10px] font-mono text-violet-300 uppercase tracking-wider font-bold">Pages & Circles ({directoryEntryCount})</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {searchPages.map(page => (
                      <button key={'page-' + page.id} type="button" onClick={() => {
                        try { window.sessionStorage.setItem('nexora_community_search_handoff', debouncedSearch); } catch {}
                        setActiveTab('communities');
                      }} className="nx-soft-card min-h-24 p-3 text-left hover:border-violet-400/30">
                        <span className="block text-xs font-bold text-white">{page.name}</span>
                        <span className="block text-[10px] text-violet-300">@{page.username} · {page.category}</span>
                        <span className="mt-1 block text-[10px] leading-relaxed text-zinc-400">{page.description || 'NEXORA Page'}</span>
                      </button>
                    ))}
                    {searchCircles.map(circle => (
                      <button key={'circle-' + circle.id} type="button" onClick={() => {
                        try { window.sessionStorage.setItem('nexora_community_search_handoff', debouncedSearch); } catch {}
                        setActiveTab('communities');
                      }} className="nx-soft-card min-h-24 p-3 text-left hover:border-violet-400/30">
                        <span className="block text-xs font-bold text-white">{circle.name}</span>
                        <span className="block text-[10px] text-violet-300">Public Circle</span>
                        <span className="mt-1 block text-[10px] leading-relaxed text-zinc-400">{circle.description || 'Explore this public Circle'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(searchFilterType === 'all' || searchFilterType === 'communities') && (
                <div className="rounded-2xl nx-surface p-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-zinc-400">{directoryLoading ? 'Searching the live NEXORA directory…' : directoryError ? directoryError : 'Open the Communities hub to explore and join available communities.'}</p>
                  <button type="button" onClick={() => {
                    try { window.sessionStorage.setItem('nexora_community_search_handoff', debouncedSearch); } catch {}
                    setActiveTab('communities');
                  }} className="px-3.5 py-2 rounded-xl bg-violet-500/15 hover:bg-violet-600 border border-violet-400/25 text-violet-200 hover:text-white text-[10px] font-mono font-bold uppercase shrink-0">Open hub</button>
                </div>
              )}

              {currentUserId && directoryResults?.nextCursor && (searchFilterType === 'all' || searchFilterType === 'users' || searchFilterType === 'communities') && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    disabled={directoryLoadingMore}
                    onClick={() => void loadMoreDirectoryResults()}
                    className="min-h-11 rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-2 text-xs font-mono font-bold uppercase text-violet-200 transition-colors hover:bg-violet-500/20 disabled:cursor-wait disabled:opacity-60"
                  >
                    {directoryLoadingMore ? 'Loading more…' : 'Load more directory results'}
                  </button>
                </div>
              )}

            </div>
          )}
        </div>
      ) : (
        /* DEFAULT DISCOVERY LANDING */
        <div className="space-y-6">

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('communities')}
              className="group flex min-h-20 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition-all hover:border-violet-300/30 hover:bg-violet-500/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200"><Users className="h-5 w-5" aria-hidden="true" /></span>
              <span><span className="block text-sm font-bold text-white">Communities</span><span className="mt-0.5 block text-[10px] text-zinc-400">Find your people</span></span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pulse')}
              className="group flex min-h-20 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-left transition-all hover:border-violet-300/30 hover:bg-violet-500/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200"><Radio className="h-5 w-5" aria-hidden="true" /></span>
              <span><span className="block text-sm font-bold text-white">Pulse</span><span className="mt-0.5 block text-[10px] text-zinc-400">Live aggregation not connected</span></span>
            </button>
          </div>

          {/* Nexora Pulse: locally observed post topics, not network-wide aggregation */}
          <div className="nx-surface rounded-3xl p-5 space-y-4 shadow-sm text-left">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-xs font-mono font-black text-violet-400 uppercase tracking-widest flex items-center gap-2">
                <Flame className="w-4 h-4 text-pink-500" /> Nexora Pulse
              </h3>
              <button 
                onClick={() => setShowAllPulse(!showAllPulse)} 
                className="text-[11px] font-mono font-bold text-violet-300 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                {showAllPulse ? 'Show less' : 'View more'} →
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Topics in recent posts · 7 days</span>
                {trendingTags.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 p-4 text-xs leading-relaxed text-zinc-500">No trending hashtags yet. Start the next conversation from your feed.</div>
                ) : trendingTags.slice(0, showAllPulse ? 6 : 4).map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => {
                      const clean = tag.startsWith('#') ? tag.slice(1) : tag;
                      setLocalSearch(clean);
                      addRecentSearch(tag);
                    }}
                    className="w-full text-left p-2.5 rounded-xl bg-white/5 hover:bg-violet-600/15 border border-white/5 text-xs text-zinc-200 font-medium transition-all flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-mono text-violet-300">{tag}</span>
                    <span className="text-[10px] font-mono text-zinc-500">{count} posts</span>
                  </button>
                ))}
              </div>
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 uppercase block">Network activity</span>
                <p className="rounded-xl border border-dashed border-white/10 p-3 text-xs leading-relaxed text-zinc-500">Live network-wide activity and community metrics are not available here yet.</p>
              </div>
            </div>
          </div>

          {/* Suggested Accounts (Real Creators from DB) */}
          <div className="space-y-3 text-left">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-mono font-black text-violet-400 uppercase tracking-widest">Suggested Creators</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {suggestedCreators.length === 0 ? (
                <div className="nx-surface rounded-2xl p-5 text-xs text-zinc-500">Creator suggestions will appear as Nexora learns your interests.</div>
              ) : suggestedCreators.map(user => (
                <div
                  key={user.id}
                  onClick={() => onViewProfile?.(user.id)}
                  className="w-[150px] shrink-0 p-4 nx-surface hover:border-white/10 rounded-2xl flex flex-col items-center text-center gap-2.5 cursor-pointer transition-all group shadow-sm"
                >
                  <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-xl object-cover ring-2 ring-violet-500/30 group-hover:scale-105 transition-all" />
                  <div className="w-full overflow-hidden">
                    <div className="flex items-center justify-center gap-1">
                      <h4 className="text-xs font-bold text-white truncate">{user.name}</h4>
                      {user.isVerified && <PurpleVerifiedBadge />}
                    </div>
                    <span className="text-[9px] font-mono text-violet-400 truncate block">@{user.username}</span>
                    {Object.keys(interestDNA).some(tag => (user.interestDNA || {})[tag] > 0) && <span className="text-[9px] text-zinc-500">Shared interests</span>}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFollow?.(user.id);
                    }}
                    className={`w-full py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                      followingIds.includes(user.id)
                        ? 'bg-white/10 text-zinc-300 hover:bg-white/20'
                        : 'bg-violet-600 text-white hover:bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]'
                    }`}
                  >
                    {followingIds.includes(user.id) ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
