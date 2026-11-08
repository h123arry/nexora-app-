import { authenticatedVohFetch } from '../services/voh/authenticatedVohFetch';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Map, Search, Bell, X, Brain, ArrowRight } from 'lucide-react';
import VohIcon from './VohIcon';
import { readUserScopedJson } from '../utils/userScopedStorage';
import { getJoinedCirclesForUser } from '../data/database';
import { SettingsService } from '../services/firebase/settingsService';
import { getGlobalPostsPage } from '../services/posts/postService';
import { rankTrendingTopics } from '../services/discovery/discoveryService';
import { rankRisingTopics } from '../services/discovery/worldPulseSignals';
import type { Post } from '../types';

export interface WorldPulseViewProps {
  theme: string;
  currentUserId: string;
}

export default function WorldPulseView({ theme, currentUserId }: WorldPulseViewProps) {
  const [pulseSearch, setPulseSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'trending' | 'map' | 'sports' | 'business' | 'tech' | 'entertainment' | 'education' | 'local'>('trending');
  
  // VOH AI interactive module
  const [vohSearch, setVohSearch] = useState('');
  const [vohReplies, setVohReplies] = useState<{ query: string; reply: string }[]>([]);
  const [isVohThinking, setIsVohThinking] = useState(false);

  // User interactive states
  const [followedAlerts, setFollowedAlerts] = useState<string[]>([]);
  const [topicsLoading, setTopicsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [pulsePosts, setPulsePosts] = useState<Post[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityLoadingMore, setActivityLoadingMore] = useState(false);
  const [activityError, setActivityError] = useState(false);
  const [activityHasMore, setActivityHasMore] = useState(false);
  const pulseCursorRef = React.useRef<Awaited<ReturnType<typeof getGlobalPostsPage>>['nextCursor']>(null);

  React.useEffect(() => {
    let cancelled = false;
    setTopicsLoading(true);
    void SettingsService.getSettings(currentUserId).then(settings => {
      if (!cancelled) setFollowedAlerts(settings.content.contentPreferences);
    }).finally(() => {
      if (!cancelled) setTopicsLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentUserId]);

  React.useEffect(() => {
    let cancelled = false;
    setActivityLoading(true);
    setActivityError(false);
    void getGlobalPostsPage(null, 30).then(page => {
      if (cancelled) return;
      setPulsePosts(page.posts);
      pulseCursorRef.current = page.nextCursor;
      setActivityHasMore(page.hasMore);
    }).catch(error => {
      console.error('World Pulse public activity could not be loaded:', error);
      if (!cancelled) setActivityError(true);
    }).finally(() => {
      if (!cancelled) setActivityLoading(false);
    });
    return () => { cancelled = true; };
  }, [currentUserId]);

  const pulseTopics = React.useMemo(() => rankTrendingTopics(pulsePosts, {
    windowHours: 24 * 7, minPosts: 2, limit: 10,
  }), [pulsePosts]);

  const risingTopics = React.useMemo(() => rankRisingTopics(pulsePosts, { windowHours: 24, minPosts: 2, minCreators: 2, limit: 5 }), [pulsePosts]);

  const categoryTerms: Record<string, string[]> = {
    sports: ['football', 'soccer', 'basketball', 'tennis', 'sports', 'match', 'goal'],
    business: ['business', 'startup', 'finance', 'entrepreneur', 'market', 'company'],
    tech: ['technology', 'tech', 'ai', 'software', 'developer', 'coding', 'digital'],
    entertainment: ['music', 'film', 'movie', 'entertainment', 'artist', 'celebrity'],
    education: ['education', 'learning', 'school', 'university', 'study', 'course'],
  };
  const visiblePulsePosts = React.useMemo(() => {
    const query = pulseSearch.trim().toLowerCase().replace(/^#/, '');
    return pulsePosts.filter(post => {
      if (activeTab === 'local' && !post.location?.trim()) return false;
      if (categoryTerms[activeTab]) {
        const terms = categoryTerms[activeTab];
        const searchable = `${post.content} ${(post.tags || []).join(' ')}`.toLowerCase();
        if (!terms.some(term => searchable.includes(term))) return false;
      }
      if (!query) return true;
      const searchable = `${post.content} ${post.username} ${post.name} ${(post.tags || []).join(' ')}`.toLowerCase();
      return searchable.includes(query);
    });
  }, [pulsePosts, pulseSearch, activeTab]);

  const loadMorePulse = async () => {
    if (!pulseCursorRef.current || activityLoadingMore) return;
    setActivityLoadingMore(true);
    try {
      const page = await getGlobalPostsPage(pulseCursorRef.current, 30);
      setPulsePosts(current => {
        const existing = new Set(current.map(post => post.id));
        return [...current, ...page.posts.filter(post => !existing.has(post.id))];
      });
      pulseCursorRef.current = page.nextCursor;
      setActivityHasMore(page.hasMore);
    } catch (error) {
      console.error('World Pulse could not load more public posts:', error);
      triggerToast('More activity could not be loaded. Please try again.');
    } finally {
      setActivityLoadingMore(false);
    }
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // VOH AI response triggers (fully interactive)
  const handleAskVoh = async (query: string) => {
    if (!query.trim()) return;
    setVohSearch(query);
    setIsVohThinking(true);

    try {
      // Fetch from the real VOH AI endpoint
      const response = await authenticatedVohFetch('/api/voh-ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: [],
          context: {
            posts: pulsePosts.slice(0, 5).map(post => ({ id: post.id, username: post.username, content: post.content, tags: post.tags, likes: post.likes, commentsCount: post.commentsCount, timestamp: post.timestamp })),
            circles: getJoinedCirclesForUser(currentUserId),
            notifications: readUserScopedJson(localStorage, 'nexora_notifications', currentUserId, [])
          }
        })
      });

      if (!response.ok) throw new Error('VOH AI request failed');
      const data = await response.json();
      const responseText = data.isDemo
        ? 'VOH AI demo mode is active. It cannot verify current Nexora activity.'
        : data.text;
      setVohReplies(prev => [{ query, reply: responseText || 'No response was returned.' }, ...prev]);
    } catch (err) {
      console.error("VOH AI Pulse request failed:", err);
      setVohReplies(prev => [{ query, reply: 'VOH AI could not reach the service. Check your connection and try again.' }, ...prev]);
    } finally {
      setIsVohThinking(false);
    }
  };

  // World Pulse Alert toggler
  const handleToggleAlert = async (topic: string) => {
    if (topicsLoading) return;
    const next = followedAlerts.includes(topic)
      ? followedAlerts.filter(item => item !== topic)
      : [...followedAlerts, topic];
    try {
      const settings = await SettingsService.getSettings(currentUserId);
      await SettingsService.updateSettings(currentUserId, {
        content: { ...settings.content, contentPreferences: next },
      });
      setFollowedAlerts(next);
      triggerToast(`${followedAlerts.includes(topic) ? 'Removed' : 'Saved'} ${topic} in your account topic preferences. Alerts are not delivered yet.`);
    } catch (error) {
      console.error('World Pulse topic preference update failed:', error);
      triggerToast('Your topic preferences could not be saved. Please try again.');
    }
  };



  return (
    <div id="nexora-world-pulse-root" className="nx-surface space-y-6 rounded-2xl p-4 sm:p-5 text-left select-none relative pb-10">
      
      {/* Dynamic Toast Feedback Overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-24 left-1/4 right-1/4 md:left-auto md:right-10 bg-linear-to-r from-cyan-950/90 to-blue-900/90 border border-cyan-500/30 text-white font-sans text-xs px-4 py-3 rounded-2xl shadow-md backdrop-blur-md z-50 text-center"
          >
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-xl font-black font-sans text-white flex items-center gap-2 tracking-tight">
          <span className="text-xl">🌍</span> World Pulse
        </h2>
        <p className="text-xs text-violet-300/60 mt-0.5">
          Recent public posts and topic activity from NEXORA, with no synthetic trends.
        </p>
      </div>

      {/* SEARCH BAR & QUICK TAGS */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-violet-400/40" />
          <input 
            type="text"
            placeholder="Search World Pulse topics..."
            value={pulseSearch}
            onChange={(e) => setPulseSearch(e.target.value)}
            className="nx-field min-h-12 w-full pl-12 pr-5 py-3 font-sans text-xs focus:border-cyan-500/50 focus:bg-[#070514]"
          />
          {pulseSearch && (
            <button 
              onClick={() => setPulseSearch('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-violet-400 hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Clicking Tag Examples */}
        <div className="flex flex-wrap items-center gap-1.5 px-0.5">
          <span className="text-[10px] font-mono text-violet-400/60 uppercase mr-1">Explore topics:</span>
          {pulseTopics.length === 0 ? <span className="text-[10px] text-violet-300/40">Topics appear as multiple creators discuss them.</span> : pulseTopics.slice(0, 6).map(({ tag }) => (
            <button
              key={tag}
              onClick={() => {
                setPulseSearch(tag);
              }}
              className="px-2.5 py-1 rounded-xl bg-violet-500/5 hover:bg-violet-500/15 border border-white/10 hover:border-white/10 text-[10px] font-sans text-violet-300 transition-all cursor-pointer"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* INTEREST RADAR: momentum is calculated only from loaded public NEXORA posts. */}
      {risingTopics.length > 0 && (
        <section className="rounded-2xl border border-violet-400/15 bg-linear-to-br from-violet-950/25 to-[#080614] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-white"><Globe className="h-4 w-4 text-violet-300" /> Interest Radar</div>
              <p className="mt-1 text-[10px] text-violet-200/50">Conversations gaining momentum in the latest 24 hours versus the previous 24 hours.</p>
            </div>
            <span className="shrink-0 rounded-full border border-violet-400/20 px-2 py-1 text-[9px] font-semibold text-violet-200">Live sample</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {risingTopics.map(topic => (
              <button key={topic.tag} type="button" onClick={() => { setPulseSearch(topic.tag); setActiveTab('trending'); }} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-left transition-colors hover:border-violet-400/25 hover:bg-violet-500/5">
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-violet-100">#{topic.tag}</span>
                  <span className="mt-1 block text-[10px] text-violet-200/45">{topic.currentPosts} recent posts · {topic.creatorCount} creators</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[10px] font-bold text-violet-200">
                  <span>{topic.status === 'new' ? 'NEW' : `${topic.growthMultiplier}×`}</span>
                  <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
          <p className="text-[9px] text-violet-200/35">Signals reflect the public posts currently loaded in World Pulse, not all activity across the internet or all NEXORA posts.</p>
        </section>
      )}

      {/* TOP FILTERS - CATEGORY TABS */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none border-b border-white/10 items-center">
        {[
          { id: 'trending', label: 'Activity' },
          { id: 'map', label: 'Map' },
          { id: 'sports', label: '⚽ Sports' },
          { id: 'business', label: '💼 Business' },
          { id: 'tech', label: '🧠 Technology' },
          { id: 'entertainment', label: 'Entertainment' },
          { id: 'education', label: 'Education' },
          { id: 'local', label: 'Local posts' }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
              }}
              className={`min-h-11 flex items-center gap-1.5 px-3.5 py-2 text-xs font-sans font-bold rounded-xl border transition-all shrink-0 cursor-pointer ${
                isActive 
                  ? 'bg-violet-500/15 border-violet-400/40 text-violet-200 font-extrabold' 
                  : 'bg-transparent border-transparent text-violet-400/60 hover:text-white hover:bg-violet-500/5'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* VOH AI INSIDE PULSE MODULE */}
      <div className="p-4 rounded-3xl bg-linear-to-tr from-[#09071c] to-[#04020a] border border-white/10 space-y-3.5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-44 h-44 bg-violet-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-violet-500/10 border border-white/10">
              <VohIcon size={18} animated glow variant="brand" />
            </div>
            <div>
              <span className="text-xs font-mono uppercase tracking-widest font-black text-violet-300">VOH AI assistant</span>
              <p className="text-[10px] text-violet-300/50">VOH can use recent public posts loaded in this view as context.</p>
            </div>
          </div>
          <span className="text-[9px] font-mono bg-violet-500/10 text-violet-300 border border-white/10 px-2 py-0.5 rounded-md uppercase font-black tracking-tight">AI service</span>
        </div>

        {/* Dynamic input bar to Ask VOH */}
        <div className="flex items-center gap-2">
          <input 
            type="text"
            placeholder="Ask VOH AI about recent NEXORA topics or a new idea..."
            value={vohSearch}
            onChange={(e) => setVohSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAskVoh(vohSearch);
            }}
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-white/10 focus:outline-none focus:border-white/10 text-xs text-white placeholder:text-violet-400/30 text-left font-sans"
          />
          <button
            onClick={() => handleAskVoh(vohSearch)}
            disabled={isVohThinking}
            className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 disabled:opacity-50 text-xs font-sans font-bold text-white transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>Ask VOH</span>
          </button>
        </div>

        {/* Predefined clicking templates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
          <button 
            onClick={() => handleAskVoh('What makes a strong community?')}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-white/10 hover:border-white/10 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="truncate">"What makes a strong community?"</span>
          </button>
          
          <button 
            onClick={() => handleAskVoh('Help me write an engaging post.')}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-white/10 hover:border-white/10 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-500 shrink-0" />
            <span className="truncate">"Help me write an engaging post."</span>
          </button>

          <button 
            onClick={() => handleAskVoh('Suggest questions for a sports discussion.')}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-white/10 hover:border-white/10 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" />
            <span className="truncate">"Suggest questions for a sports discussion."</span>
          </button>

          <button 
            onClick={() => handleAskVoh('How can a new creator find an audience?')}
            className="p-2 rounded-xl bg-black/35 hover:bg-violet-500/5 border border-white/10 hover:border-white/10 text-[10px] text-violet-300/70 text-left font-sans transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRight className="w-3 h-3 text-violet-400 shrink-0" />
            <span className="truncate">"How can a new creator find an audience?"</span>
          </button>
        </div>

        {/* Dynamic chat replies logs rendering */}
        <AnimatePresence>
          {isVohThinking && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs text-violet-400 font-mono flex items-center gap-2 animate-pulse"
            >
              <Brain className="w-4 h-4 text-violet-400 animate-spin" />
              <span>VOH AI is thinking...</span>
            </motion.div>
          )}
          {vohReplies.map((log, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs text-violet-100 font-sans leading-relaxed space-y-1 text-left relative"
            >
              <div className="text-[9px] font-mono text-cyan-400 font-bold">Query: "{log.query}"</div>
              <div>{log.reply}</div>
              <button 
                onClick={() => setVohReplies(prev => prev.filter((_, i) => i !== idx))}
                className="absolute top-2 right-2 text-violet-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Map view: no sample locations are shown without trusted live aggregation. */}
      {activeTab === 'map' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="nx-surface rounded-3xl p-8 text-center">
          <Map className="mx-auto h-8 w-8 text-violet-300/50" />
          <h3 className="mt-3 text-sm font-semibold text-white">Location activity is not available yet</h3>
          <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-zinc-400">Live, privacy-respecting location aggregation is not connected. No sample pins or activity are shown.</p>
        </motion.div>
      )}

      {activeTab !== 'map' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white">{activeTab === 'trending' ? 'Recent public activity' : `${activeTab[0].toUpperCase()}${activeTab.slice(1)} posts`}</h3>
              <p className="mt-1 text-[10px] text-violet-300/50">Loaded from public NEXORA posts. Engagement figures reflect stored post data.</p>
            </div>
            <span className="shrink-0 text-[10px] text-violet-300/50">{visiblePulsePosts.length} loaded</span>
          </div>
          {activityLoading ? (
            <div className="nx-surface rounded-2xl p-6 text-center text-xs text-violet-200/60">Loading recent public activity...</div>
          ) : activityError ? (
            <div className="nx-surface rounded-2xl p-6 text-center space-y-2">
              <p className="text-sm font-semibold text-white">Activity could not be loaded</p>
              <p className="text-xs text-violet-200/60">Check your connection and try again. No placeholder activity is shown.</p>
              <button type="button" onClick={() => { setActivityError(false); setActivityLoading(true); void getGlobalPostsPage(null, 30).then(page => { setPulsePosts(page.posts); pulseCursorRef.current = page.nextCursor; setActivityHasMore(page.hasMore); }).catch(() => setActivityError(true)).finally(() => setActivityLoading(false)); }} className="min-h-10 rounded-xl bg-violet-600 px-4 text-xs font-semibold text-white hover:bg-violet-500">Try again</button>
            </div>
          ) : visiblePulsePosts.length === 0 ? (
            <div className="nx-surface rounded-2xl p-7 text-center">
              <Globe className="mx-auto h-7 w-7 text-violet-400/50" />
              <p className="mt-3 text-sm font-semibold text-white">{pulsePosts.length ? 'No matching public posts' : 'No public posts yet'}</p>
              <p className="mt-1 text-xs text-violet-200/50">{pulseSearch ? 'Try another search or clear the filter.' : 'New public posts will appear here as creators publish.'}</p>
              {(pulseSearch || activeTab !== 'trending') && <button type="button" onClick={() => { setPulseSearch(''); setActiveTab('trending'); }} className="mt-3 min-h-10 rounded-xl border border-violet-400/20 px-4 text-xs font-semibold text-violet-200">Clear filters</button>}
            </div>
          ) : (
            <div className="space-y-3">
              {visiblePulsePosts.map(post => (
                <article key={post.id} className="nx-surface rounded-2xl border border-white/5 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">{post.name || post.username || 'NEXORA creator'}</p>
                      <p className="truncate text-[10px] text-violet-300/50">@{post.username || 'creator'} · {Number.isFinite(Date.parse(String(post.timestamp))) ? new Date(post.timestamp).toLocaleString() : 'Date unavailable'}</p>
                    </div>
                    {post.videoUrl && <span className="rounded-lg bg-violet-500/15 px-2 py-1 text-[9px] font-bold uppercase text-violet-200">Video</span>}
                  </div>
                  {post.content && <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-violet-50/90">{post.content}</p>}
                  {(post.image || post.images?.length) && <div className="text-[10px] text-violet-300/60">Photo attached to this post</div>}
                  {!!post.tags?.length && <div className="flex flex-wrap gap-1.5">{post.tags.slice(0, 8).map(tag => <button key={tag} type="button" onClick={() => setPulseSearch(tag.replace(/^#/, ''))} className="rounded-lg border border-violet-400/15 bg-violet-500/5 px-2 py-1 text-[10px] text-violet-200">#{tag.replace(/^#/, '')}</button>)}</div>}
                  <div className="flex items-center gap-4 border-t border-white/5 pt-2 text-[10px] text-violet-200/55"><span>{Math.max(0, post.likes || 0)} likes</span><span>{Math.max(0, post.commentsCount || 0)} comments</span><span>{Math.max(0, post.shares || 0)} shares</span></div>
                </article>
              ))}
            </div>
          )}
          {activityHasMore && !activityLoading && !activityError && <div className="text-center"><button type="button" onClick={() => void loadMorePulse()} disabled={activityLoadingMore} className="min-h-11 rounded-xl border border-violet-400/20 px-5 text-xs font-semibold text-violet-200 hover:bg-violet-500/10 disabled:opacity-50">{activityLoadingMore ? 'Loading...' : 'Load more activity'}</button></div>}
        </section>
      )}

      {/* WORLD PULSE ALERTS CONFIG BOX */}
      <div className="p-4 rounded-3xl bg-black/40 border border-white/10 space-y-3">
        <div className="flex items-center gap-1.5">
          <Bell className="w-4 h-4 text-violet-300" />
          <span className="text-xs font-mono uppercase tracking-widest font-black text-violet-200">Saved topic preferences</span>
        </div>
        <p className="text-[11px] text-violet-100/60 leading-relaxed">
Choose topics from actual recent posts or keep topics already saved to your account. Push notifications for topics are not connected yet.
        </p>

        <div className="flex flex-wrap gap-1.5 pt-1">
          {[...new Set([...followedAlerts, ...pulseTopics.map(item => item.tag)])].slice(0, 12).map((topic) => {
            const isFollowed = followedAlerts.includes(topic);
            return (
              <button
                key={topic}
                onClick={() => void handleToggleAlert(topic)}
                disabled={topicsLoading}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-sans font-bold transition-all cursor-pointer ${
                  isFollowed 
                    ? 'bg-violet-500/15 border-violet-400/40 text-violet-200 font-extrabold' 
                    : 'bg-transparent border-white/10 text-violet-400/40 hover:text-white'
                }`}
              >
                <span>{topic}</span>
                {isFollowed && <span className="ml-1.5 text-[9px] text-emerald-400 font-black">✓</span>}
              </button>
            );
          })}
        </div>
      </div>


    </div>
  );
}
