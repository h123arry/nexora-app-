import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Users, MessageSquare, Briefcase, Bookmark, Cpu, Globe, ArrowRight, Sparkles, Hash, Clock, Trash2, Plus, Shield, ShieldCheck, Heart, Play, Radio, ChevronRight } from 'lucide-react';
import { User, Post, Chat } from '../types';
import { searchPublicDirectory, type PublicDirectoryResult } from '../services/firebase/directorySearchService';
import { clearRecentSearches, deleteRecentSearch, listRecentSearches, saveRecentSearch } from '../services/firebase/searchHistoryService';
import { trackClientObservation } from '../services/analyticsService';

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  posts: Post[];
  users: User[];
  chats: Chat[];
  onSelectTab: (tab: string) => void;
  onOpenCreatePost: (mode?: string) => void;
  onViewProfile: (user: User) => void;
}

function searchText(value: unknown): string { return typeof value === 'string' ? value.normalize('NFKC').toLocaleLowerCase().trim() : ''; }
function readRecentSearches(userId: string): string[] { try { const saved = localStorage.getItem('nexora_recent_searches_' + userId); const parsed = saved ? JSON.parse(saved) : []; return Array.isArray(parsed) ? [...new Set(parsed.filter((item): item is string => typeof item === 'string').map(item => item.trim()).filter(Boolean))].slice(0, 10) : []; } catch { return []; } }

export default function UniversalSearchModal({
  isOpen,
  onClose,
  currentUser,
  posts,
  users,
  chats,
  onSelectTab,
  onOpenCreatePost,
  onViewProfile,
}: UniversalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => readRecentSearches(currentUser.id));
  const [serverResults, setServerResults] = useState<PublicDirectoryResult | null>(null);
  const [serverSearchLoading, setServerSearchLoading] = useState(false);
  const [serverSearchError, setServerSearchError] = useState('');
  useEffect(() => {
    setRecentSearches(readRecentSearches(currentUser.id));
    let active = true;
    listRecentSearches(currentUser.id).then(remoteTerms => {
      if (!active || remoteTerms.length === 0) return;
      setRecentSearches(remoteTerms);
      try { localStorage.setItem('nexora_recent_searches_' + currentUser.id, JSON.stringify(remoteTerms)); } catch {}
    }).catch(() => {
      // Local history remains available when the account history is temporarily offline.
    });
    return () => { active = false; };
  }, [currentUser.id]);

  useEffect(() => {
    const term = query.trim();
    if (!isOpen || term.length < 2) {
      setServerResults(null); setServerSearchError(''); setServerSearchLoading(false); return;
    }
    let active = true;
    setServerResults(null);
    const timer = window.setTimeout(async () => {
      setServerSearchLoading(true); setServerSearchError('');
      trackClientObservation({ eventType: 'search_started', properties: { surface: 'universal_directory' } });
      try {
        const result = await searchPublicDirectory(term);
        if (active) {
          setServerResults(result);
          trackClientObservation({
            eventType: 'search_completed',
            properties: {
              surface: 'universal_directory',
              success: true,
              people_count: result.people.length,
              pages_count: result.pages.length,
              circles_count: result.circles.length,
            },
          });
        }
      } catch {
        if (active) {
          setServerSearchError('Live directory search is temporarily unavailable. Loaded results are still available.');
          trackClientObservation({ eventType: 'search_completed', properties: { surface: 'universal_directory', success: false } });
        }
      } finally { if (active) setServerSearchLoading(false); }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [isOpen, query, currentUser.id]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      const handleEscape = (e: Event) => {
        e.preventDefault();
        onClose();
      };

      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('nexora-escape', handleEscape);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('nexora-escape', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSaveSearch = (searchKeyword: string) => {
    if (!searchKeyword.trim()) return;
    const trimmed = searchKeyword.trim();
    const updated = [trimmed, ...recentSearches.filter(s => s.toLowerCase() !== trimmed.toLowerCase())].slice(0, 10);
    setRecentSearches(updated);
    try {
      localStorage.setItem('nexora_recent_searches_' + currentUser.id, JSON.stringify(updated));
    } catch {}
    void saveRecentSearch(currentUser.id, trimmed).catch(() => {
      // Keep the device-local fallback; cloud history can retry on a later search.
    });
  };

  const handleRemoveRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentSearches.filter(s => s !== term);
    setRecentSearches(updated);
    try {
      localStorage.setItem('nexora_recent_searches_' + currentUser.id, JSON.stringify(updated));
    } catch {}
    void deleteRecentSearch(currentUser.id, term).catch(() => undefined);
  };

  const handleClearAllRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('nexora_recent_searches_' + currentUser.id);
    } catch {}
    void clearRecentSearches(currentUser.id).catch(() => undefined);
  };

  const trimmedQ = searchText(query);

  // 1. People
  const matchedUsers = users.filter(u => !u.isBanned && !u.isSuspended).filter(u => 
    searchText(u.name).includes(trimmedQ) || 
    searchText(u.username).includes(trimmedQ) || 
    searchText(u.bio).includes(trimmedQ)
  ).slice(0, 5);

  // 2. Posts
  const matchedPosts = posts.filter(p =>
    searchText(p.content).includes(trimmedQ) ||
    searchText(p.name).includes(trimmedQ) ||
    searchText(p.username).includes(trimmedQ) ||
    p.tags?.some(t => searchText(t).includes(trimmedQ)) ||
    searchText(p.communityName).includes(trimmedQ)
  ).slice(0, 5);

  // 3. World Pulse
  const matchedPulse = posts.filter(p =>
    (p.location || p.tags?.some(t => ['pulse', 'breaking', 'news', 'world'].includes(t.toLowerCase()))) &&
    (searchText(p.content).includes(trimmedQ) || p.tags?.some(t => searchText(t).includes(trimmedQ)) || searchText(p.location).includes(trimmedQ))
  ).slice(0, 4);

  // 4. Communities
  let storedCommunities: any[] = [];
  try {
    const saved = localStorage.getItem('nexora_communities_list');
    if (saved) storedCommunities = JSON.parse(saved);
  } catch {}
  const matchedCommunities = storedCommunities.filter(c =>
    searchText(c?.name).includes(trimmedQ) || searchText(c?.description).includes(trimmedQ) || searchText(c?.category).includes(trimmedQ)
  ).slice(0, 4);

  // 5. Circles
  let storedCircles: any[] = [];
  try {
    const saved = localStorage.getItem('nexora_user_circles');
    if (saved) storedCircles = JSON.parse(saved);
  } catch {}
  const matchedCircles = storedCircles.filter(cir =>
    searchText(cir?.name).includes(trimmedQ) || searchText(cir?.description).includes(trimmedQ)
  ).slice(0, 3);

  // 6. Messages / Chats
  const matchedChats = chats.filter(ch =>
    searchText(ch.partnerName).includes(trimmedQ) ||
    searchText(ch.lastMessage).includes(trimmedQ) ||
    searchText(ch.groupCategory).includes(trimmedQ)
  ).slice(0, 4);

  // 7. Opportunities (from real published posts with opportunity tag/type)
  const matchedOpportunities = posts.filter(p =>
    p.opportunityType && (
      searchText(p.content).includes(trimmedQ) ||
      searchText(p.opportunityType).includes(trimmedQ) ||
      p.tags?.some(t => searchText(t).includes(trimmedQ))
    )
  ).map(p => ({
    id: p.id,
    title: p.content.slice(0, 45) + (p.content.length > 45 ? '...' : ''),
    type: p.opportunityType || 'Opportunity',
    reward: p.tags?.find(t => t.includes('NEX') || t.includes('$')) || 'Verified',
    description: p.content
  })).slice(0, 3);

  // 8. Saved Content
  const savedPostIds = currentUser.savedCollections ? Object.values(currentUser.savedCollections).flat() : [];
  const matchedSaved = posts.filter(p => 
    savedPostIds.includes(p.id) && (searchText(p.content).includes(trimmedQ) || p.tags?.some(t => searchText(t).includes(trimmedQ)))
  ).slice(0, 3);

  // 9. VOH AI conversations
  let aiConversations: any[] = [];
  try {
    const aiSaved = localStorage.getItem(`nexora_ai_chats_${currentUser.id}`);
    if (aiSaved) aiConversations = JSON.parse(aiSaved);
  } catch {}
  const matchedAiChats = aiConversations.filter(chat =>
    searchText(chat?.title).includes(trimmedQ) || chat.messages?.some((m: any) => searchText(m?.content).includes(trimmedQ))
  ).slice(0, 3);

  const hasAnyResults = 
    matchedUsers.length > 0 ||
    matchedPosts.length > 0 ||
    matchedPulse.length > 0 ||
    matchedCommunities.length > 0 ||
    matchedCircles.length > 0 ||
    matchedChats.length > 0 ||
    matchedOpportunities.length > 0 ||
    matchedSaved.length > 0 ||
    matchedAiChats.length > 0 ||
    (serverResults !== null && (serverResults.people.length > 0 || serverResults.pages.length > 0 || serverResults.circles.length > 0)) || serverSearchLoading || Boolean(serverSearchError);

  return (
    <div id="universal-search-modal" role="dialog" aria-modal="true" aria-label="NEXORA universal search" className="fixed inset-0 z-100 bg-[#060412]/98 backdrop-blur-2xl flex flex-col overflow-hidden text-white animate-fade-in select-none">
      
      {/* Top Header & Search Input Bar */}
      <div className="shrink-0 border-b border-white/10 bg-[#0c091d]/90 px-4 sm:px-8 py-4 sm:py-5 flex flex-col gap-3">
        <div className="max-w-4xl mx-auto w-full flex items-center gap-4">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-4 w-6 h-6 text-violet-400 stroke-[2]" />
            <input
              ref={inputRef}
              type="text"
              aria-label="Search NEXORA"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveSearch(query);
              }}
              placeholder="Search loaded people, posts, communities, chats, and saved content..."
              className="w-full bg-white/5 border border-white/15 focus:border-violet-500 rounded-2xl pl-13 pr-12 py-3.5 text-base sm:text-lg text-white placeholder-zinc-400 outline-none transition-all shadow-inner font-sans"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-4 p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Clear input"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white font-sans text-sm font-semibold transition-all cursor-pointer active:scale-95"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="max-w-4xl mx-auto w-full flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-zinc-400 font-mono shrink-0">Trending:</span>
          {['#NexoraGlobal', 'VOH AI Core', 'Quantum Mesh', 'Creator Grants', 'Soundwave', 'Global Tech'].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setQuery(tag);
                handleSaveSearch(tag);
              }}
              className="shrink-0 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-white/10 text-zinc-300 hover:text-white font-sans transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Hash className="w-3.5 h-3.5 text-violet-400" />
              <span>{tag.replace('#', '')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-8 pb-20">

          {/* EMPTY QUERY STATE: Quick Actions & Recent Searches */}
          {!query.trim() && (
            <div className="space-y-8 animate-fade-in" aria-live="polite">
              
              {/* Quick Actions / Productivity Hub */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400 px-1">Command Center & Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Create Post', icon: Plus, action: () => { onClose(); onOpenCreatePost('text'); }, color: 'from-violet-600 to-indigo-600' },
                    { label: 'Upload Media', icon: Play, action: () => { onClose(); onOpenCreatePost('video'); }, color: 'from-pink-600 to-rose-600' },
                    { label: 'Record Voice', icon: Radio, action: () => { onClose(); onOpenCreatePost('voice'); }, color: 'from-amber-600 to-orange-600' },
                    { label: 'Ask VOH AI', icon: Sparkles, action: () => { onClose(); onSelectTab('ai'); }, color: 'from-cyan-600 to-blue-600' },
                    { label: 'Open Wallet', icon: Briefcase, action: () => { onClose(); onSelectTab('wallet'); }, color: 'from-emerald-600 to-teal-600' },
                    { label: 'View Saved', icon: Bookmark, action: () => { onClose(); onSelectTab('saved'); }, color: 'from-purple-600 to-fuchsia-600' },
                    { label: 'Communities', icon: Users, action: () => { onClose(); onSelectTab('communities'); }, color: 'from-blue-600 to-indigo-600' },
                    { label: 'Circles', icon: Globe, action: () => { onClose(); onSelectTab('matrix'); }, color: 'from-violet-500 to-purple-600' },
                    { label: 'Creator Hub', icon: Shield, action: () => { onClose(); onSelectTab('creator'); }, color: 'from-rose-500 to-pink-600' },
                    { label: 'Settings', icon: ArrowRight, action: () => { onClose(); onSelectTab('settings'); }, color: 'from-zinc-700 to-zinc-800' },
                  ].map((act, i) => {
                    const Icon = act.icon;
                    return (
                      <button
                        key={i}
                        onClick={act.action}
                        className="group flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/10 transition-all cursor-pointer active:scale-95 text-center gap-2"
                      >
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${act.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-sans font-medium text-zinc-200 group-hover:text-white">{act.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Recent Searches */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-400">Recent Searches</h3>
                  {recentSearches.length > 0 && (
                    <button
                      onClick={handleClearAllRecent}
                      className="text-xs text-zinc-400 hover:text-red-400 transition-colors cursor-pointer flex items-center gap-1 font-sans"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}
                </div>
                {recentSearches.length === 0 ? (
                  <div className="py-6 px-4 text-center rounded-2xl bg-white/5 border border-white/5 text-zinc-400 text-xs font-sans">
                    No recent searches.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <div
                        key={term}
                        onClick={() => {
                          setQuery(term);
                          handleSaveSearch(term);
                        }}
                        className="group flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-violet-500/20 border border-white/10 hover:border-white/10 text-zinc-200 hover:text-white transition-all cursor-pointer text-sm font-sans"
                      >
                        <Clock className="w-4 h-4 text-zinc-400 group-hover:text-violet-400" />
                        <span>{term}</span>
                        <button
                          onClick={(e) => handleRemoveRecent(term, e)}
                          className="p-1 rounded-full hover:bg-white/20 text-zinc-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Platform Overview Info */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-900/20 via-purple-900/10 to-black border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1.5 text-left">
                  <h4 className="text-base font-sans font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                    <span>Nexora Unified Search & Command Center</span>
                  </h4>
                  <p className="text-xs text-zinc-300 font-sans leading-relaxed max-w-xl">
                    Searches public people, Pages and Circles through NEXORA's server-backed directory, alongside posts, chats, saved content, opportunities and VOH AI history currently loaded in this browser.
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ACTIVE SEARCH RESULTS: Grouped by Category */}
          {query.trim() && (
            <div className="space-y-8 animate-fade-in">
              {!hasAnyResults ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
                    <Search className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-sans font-bold text-white">No results found for "{query}"</h3>
                  <p className="text-sm text-zinc-400 font-sans max-w-sm mx-auto">
                    Try a different keyword, username, hashtag (#), or Circle name. Directory results are server-backed; other content is searched from data currently loaded for this account.
                  </p>
                </div>
              ) : (
                <div className="space-y-10">

                  {serverSearchLoading && <p className="text-xs text-violet-200/70">Searching the live NEXORA directory…</p>}
                  {serverSearchError && <p role="status" className="text-xs text-amber-200/80">{serverSearchError}</p>}
                  {serverResults && (
                    <section className="space-y-4 rounded-2xl border border-violet-400/20 bg-violet-500/[0.04] p-4" aria-label="Live directory results">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-violet-300">Live NEXORA directory</h4>
                      {serverResults.people.length > 0 && <div className="space-y-2">
                        <p className="text-xs font-semibold text-white">People</p>
                        {serverResults.people.map(person => <button key={person.id} type="button" onClick={() => onViewProfile({
                          id: person.id, username: person.username, name: person.name, avatar: person.avatar, bio: person.bio,
                          location: '', website: '', followers: 0, following: 0, isVerified: person.isVerified, coverImage: '', joinedDate: '',
                          reputationPoints: 0, reputationBreakdown: { contributions: 0, helpfulness: 0, missionsCompleted: 0, skillsVerified: 0 },
                          interestDNA: {}, skills: [],
                        })} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5">
                          <img src={person.avatar || ''} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} className="h-9 w-9 rounded-full bg-white/10 object-cover" />
                          <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{person.name}</span><span className="block truncate text-xs text-violet-200/60">@{person.username}</span></span>
                        </button>)}
                      </div>}
                      {serverResults.pages.length > 0 && <div className="space-y-2">
                        <p className="text-xs font-semibold text-white">Pages</p>
                        {serverResults.pages.map(page => <button key={page.id} type="button" onClick={() => { onClose(); onSelectTab('communities'); }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5">
                          <img src={page.avatar || ''} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} className="h-9 w-9 rounded-xl bg-white/10 object-cover" />
                          <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{page.name}</span><span className="block truncate text-xs text-violet-200/60">@{page.username} · {page.category}</span></span>
                        </button>)}
                      </div>}
                      {serverResults.circles.length > 0 && <div className="space-y-2">
                        <p className="text-xs font-semibold text-white">Public Circles</p>
                        {serverResults.circles.map(circle => <button key={circle.id} type="button" onClick={() => { onClose(); onSelectTab('matrix'); }} className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-white/5">
                          <img src={circle.bannerImage || ''} alt="" onError={event => { event.currentTarget.style.display = 'none'; }} className="h-9 w-9 rounded-xl bg-white/10 object-cover" />
                          <span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{circle.name}</span><span className="block truncate text-xs text-violet-200/60">{circle.description}</span></span>
                        </button>)}
                      </div>}
                    </section>
                  )}

                  {/* 1. PEOPLE */}
                  {matchedUsers.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-violet-400 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>People ({matchedUsers.length})</span>
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {matchedUsers.map(u => (
                          <div
                            key={u.id}
                            onClick={() => {
                              onViewProfile(u);
                              onClose();
                            }}
                            className="group p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/10 transition-all cursor-pointer flex items-center gap-3"
                          >
                            <img src={u.avatar} alt={u.name} className="w-12 h-12 rounded-full object-cover border border-white/20 shrink-0" referrerPolicy="no-referrer" />
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-sans font-bold text-white truncate flex items-center gap-1.5">
                                <span className="truncate">{u.name}</span>
                                {u.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
                              </h5>
                              <p className="text-xs text-zinc-400 truncate">@{u.username}</p>
                              {u.bio && <p className="text-xs text-zinc-300 truncate mt-0.5">{u.bio}</p>}
                            </div>
                            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. POSTS */}
                  {matchedPosts.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-pink-400 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          <span>Posts ({matchedPosts.length})</span>
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {matchedPosts.map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              onSelectTab('feed');
                              onClose();
                            }}
                            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 transition-all cursor-pointer space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <img src={p.avatar} alt={p.name} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                              <span className="text-xs font-sans font-bold text-white">{p.name}</span>
                              <span className="text-[11px] text-zinc-400">@{p.username}</span>
                            </div>
                            <p className="text-sm text-zinc-200 font-sans line-clamp-2">{p.content}</p>
                            <div className="flex items-center gap-4 text-xs text-zinc-400 pt-1">
                              <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5 text-rose-400" /> {p.likes}</span>
                              <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5 text-violet-400" /> {p.commentsCount}</span>
                              {p.tags?.map(t => <span key={t} className="text-violet-300 font-mono text-[10px]">#{t}</span>)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. WORLD PULSE */}
                  {matchedPulse.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                          <Globe className="w-4 h-4" />
                          <span>World Pulse ({matchedPulse.length})</span>
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {matchedPulse.map(pulse => (
                          <div
                            key={pulse.id}
                            onClick={() => {
                              onSelectTab('pulse');
                              onClose();
                            }}
                            className="p-3.5 rounded-2xl bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 font-mono text-[10px]">World Pulse</span>
                              <span className="text-[11px] text-zinc-400">{pulse.location || 'Global'}</span>
                            </div>
                            <h5 className="text-sm font-sans font-bold text-white truncate">{pulse.content}</h5>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. COMMUNITIES */}
                  {matchedCommunities.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          <span>Communities ({matchedCommunities.length})</span>
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {matchedCommunities.map(c => (
                          <div
                            key={c.id}
                            onClick={() => {
                              onSelectTab('communities');
                              onClose();
                            }}
                            className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/40 transition-all cursor-pointer space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-sans font-bold text-white">{c.name}</h5>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">{c.category}</span>
                            </div>
                            <p className="text-xs text-zinc-300 line-clamp-2">{c.description}</p>
                            <div className="text-[11px] text-zinc-400">{c.membersCount.toLocaleString()} members</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. OPPORTUNITIES */}
                  {matchedOpportunities.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-amber-400 flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          <span>Opportunities ({matchedOpportunities.length})</span>
                        </h4>
                      </div>
                      <div className="space-y-3">
                        {matchedOpportunities.map(opp => (
                          <div
                            key={opp.id}
                            onClick={() => {
                              onSelectTab('explore');
                              onClose();
                            }}
                            className="p-4 rounded-2xl bg-amber-950/20 hover:bg-amber-950/40 border border-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer flex items-center justify-between gap-4"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]">{opp.type}</span>
                                <h5 className="text-sm font-sans font-bold text-white">{opp.title}</h5>
                              </div>
                              <p className="text-xs text-zinc-300">{opp.description}</p>
                            </div>
                            <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 font-mono text-xs font-bold shrink-0">
                              {opp.reward}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 6. VOH AI CONVERSATIONS */}
                  {matchedAiChats.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-cyan-400 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          <span>VOH AI Chats ({matchedAiChats.length})</span>
                        </h4>
                      </div>
                      <div className="space-y-2">
                        {matchedAiChats.map(chat => (
                          <div
                            key={chat.id}
                            onClick={() => {
                              onSelectTab('ai');
                              onClose();
                            }}
                            className="p-3.5 rounded-2xl bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/20 transition-all cursor-pointer flex items-center justify-between"
                          >
                            <span className="text-sm font-sans font-medium text-white">{chat.title || 'Untitled Conversation'}</span>
                            <ArrowRight className="w-4 h-4 text-cyan-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
