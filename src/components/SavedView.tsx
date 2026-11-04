import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bookmark, Search, Trash2, Play, Volume2, Briefcase, Sparkles, FolderPlus, Check, Plus } from 'lucide-react';
import { Post, User } from '../types';
import RelativeTimestamp from './RelativeTimestamp';
import PurpleVerifiedBadge from './VohVerifiedBadge';
import { addPostToSavedCollection, createSavedCollection, listSavedCollections, listSavedCollectionPostIds, removeSavedCollection, type SavedCollection } from '../services/firebase/savedCollectionService';
import { listSavedContentSummaries, removeContentFromSavedCollection, type SavedContentSummary } from '../services/firebase/savedCollectionContentService';

interface SavedViewProps {
  currentUser: User;
  posts: Post[];
  userBookmarks: string[];
  onBookmarkPost: (postId: string) => void;
  onViewProfile?: (userId: string) => void;
  onSharePost?: (postId: string) => void;
  onSelectTab?: (tab: string) => void;
}

export default function SavedView({
  currentUser,
  posts,
  userBookmarks = [],
  onBookmarkPost,
  onViewProfile,
  onSelectTab
}: SavedViewProps) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'posts' | 'videos' | 'voice' | 'opportunities'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collections, setCollections] = useState<SavedCollection[]>([]);
  const [collectionPostIds, setCollectionPostIds] = useState<string[]>([]);
  const [collectionSummaries, setCollectionSummaries] = useState<SavedContentSummary[]>([]);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedCollectionId, setSelectedCollectionId] = useState('');
  const [collectionBusy, setCollectionBusy] = useState(false);
  const [collectionMessage, setCollectionMessage] = useState('');

  const refreshCollections = async () => {
    try {
      const next = await listSavedCollections(currentUser.id);
      setCollections(next);
      setSelectedCollectionId(previous => previous || next[0]?.id || '');
    } catch (error) {
      setCollectionMessage(error instanceof Error ? error.message : 'Could not load saved collections.');
    }
  };

  useEffect(() => { void refreshCollections(); }, [currentUser.id]);

  useEffect(() => {
    let active = true;
    if (!selectedCollectionId) {
      setCollectionPostIds([]);
      setCollectionSummaries([]);
      return () => { active = false; };
    }
    Promise.all([
      listSavedCollectionPostIds(currentUser.id, selectedCollectionId),
      listSavedContentSummaries(currentUser.id, selectedCollectionId),
    ]).then(([ids, summaries]) => {
      if (active) { setCollectionPostIds(ids); setCollectionSummaries(summaries); }
    }).catch(error => { if (active) setCollectionMessage(error instanceof Error ? error.message : 'Could not load collection items.'); });
    return () => { active = false; };
  }, [currentUser.id, selectedCollectionId]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim() || collectionBusy) return;
    setCollectionBusy(true);
    setCollectionMessage('');
    try {
      const id = await createSavedCollection(currentUser.id, newCollectionName);
      setNewCollectionName('');
      setSelectedCollectionId(id);
      await refreshCollections();
      setCollectionMessage('Collection created.');
    } catch (error) {
      setCollectionMessage(error instanceof Error ? error.message : 'Could not create collection.');
    } finally { setCollectionBusy(false); }
  };

  const handleAddBookmarksToCollection = async () => {
    if (!selectedCollectionId || collectionBusy) return;
    setCollectionBusy(true);
    setCollectionMessage('');
    try {
      const results: PromiseSettledResult<boolean>[] = [];
      for (let index = 0; index < bookmarkedPosts.length; index += 10) {
        const batch = bookmarkedPosts.slice(index, index + 10);
        results.push(...await Promise.allSettled(batch.map(post =>
          addPostToSavedCollection(currentUser.id, selectedCollectionId, post.id)
        )));
      }
      const added = results.filter(result => result.status === 'fulfilled' && result.value).length;
      const failed = results.filter(result => result.status === 'rejected').length;
      const skipped = results.length - added - failed;
      await refreshCollections();
      setCollectionPostIds(await listSavedCollectionPostIds(currentUser.id, selectedCollectionId));
      setCollectionMessage('Added ' + added + ' items' + (skipped ? '; ' + skipped + ' already in this collection' : '') + (failed ? '; ' + failed + ' could not be added.' : '.'));
    } catch (error) {
      setCollectionMessage(error instanceof Error ? error.message : 'Could not update collection.');
    } finally { setCollectionBusy(false); }
  };

  const handleDeleteCollection = async (id: string) => {
    if (collectionBusy || !window.confirm('Delete this collection and its saved references? Your original posts will not be deleted.')) return;
    setCollectionBusy(true);
    try {
      await removeSavedCollection(currentUser.id, id);
      setSelectedCollectionId('');
      await refreshCollections();
      setCollectionMessage('Collection deleted.');
    } catch (error) {
      setCollectionMessage(error instanceof Error ? error.message : 'Could not delete collection.');
    } finally { setCollectionBusy(false); }
  };

  // Filter bookmarked posts from parent list
  const bookmarkedPosts = posts.filter(p => userBookmarks.includes(p.id));
  const displayPosts = selectedCollectionId ? posts.filter(post => collectionPostIds.includes(post.id)) : bookmarkedPosts;

  const otherItems = selectedCollectionId ? collectionSummaries.filter(item => item.itemType !== 'post'
    && (item.title.toLowerCase().includes(searchQuery.toLowerCase()) || item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()))
    && activeCategory === 'all') : [];

  const filteredItems = displayPosts.filter(post => {
    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesContent = post.content.toLowerCase().includes(q);
      const matchesName = post.name.toLowerCase().includes(q);
      const matchesTag = post.tags?.some(t => t.toLowerCase().includes(q));
      if (!matchesContent && !matchesName && !matchesTag) return false;
    }

    // Category filter
    if (activeCategory === 'videos') return !!post.videoUrl;
    if (activeCategory === 'voice') return !!post.voiceAudioUrl;
    if (activeCategory === 'opportunities') return (post as any).opportunityType || post.tags?.includes('Opportunity');
    if (activeCategory === 'posts') return !post.videoUrl && !post.voiceAudioUrl;
    return true;
  });

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-28 sm:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-linear-to-r from-violet-950/40 via-purple-950/20 to-black border border-white/10 backdrop-blur-xl shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-violet-600/20 text-violet-400 border border-white/10">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight nx-gradient-text leading-none select-none block mb-1">NEXORA</span>
            <h1 className="text-xl font-sans font-black tracking-tight text-white flex items-center gap-2">
              Saved Collection
              <span className="text-xs font-mono font-bold text-violet-400 bg-violet-950/60 border border-white/10 px-2.5 py-0.5 rounded-full">
                {displayPosts.length + otherItems.length} Items
              </span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Your personal library of bookmarked posts, videos, voice clips, and opportunities
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search saved items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-2xl bg-black/50 border border-white/10 text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      <section className="rounded-3xl border border-violet-500/20 bg-violet-950/15 p-5 space-y-4" aria-label="Saved collections">
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="text-sm font-bold text-white flex items-center gap-2"><FolderPlus className="w-4 h-4 text-violet-300" /> Your collections</h2>
          <p className="text-xs text-zinc-400 mt-1">Private folders synced to your NEXORA account.</p></div>
          <span className="text-[10px] text-zinc-500">{collections.length}/50</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input value={newCollectionName} onChange={event => setNewCollectionName(event.target.value)} maxLength={48} placeholder="Name a collection..." aria-label="New collection name"
            className="min-w-0 flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-violet-500" />
          <button type="button" onClick={handleCreateCollection} disabled={collectionBusy || !newCollectionName.trim() || collections.length >= 50}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-40"><Plus className="w-3.5 h-3.5" /> Create</button>
        </div>
        {collections.length > 0 && <div className="flex flex-col sm:flex-row gap-2">
          <select value={selectedCollectionId} onChange={event => setSelectedCollectionId(event.target.value)} aria-label="Choose a collection"
            className="min-w-0 flex-1 rounded-xl bg-black/40 border border-white/10 px-3 py-2.5 text-xs text-white">
            <option value=''>All bookmarks</option>{collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name} · {collection.itemCount} items</option>)}
          </select>
          <button type="button" onClick={handleAddBookmarksToCollection} disabled={collectionBusy || !selectedCollectionId || bookmarkedPosts.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-xs font-bold text-violet-200 disabled:opacity-40"><Check className="w-3.5 h-3.5" /> Add all saved posts</button>
          <button type="button" onClick={() => void handleDeleteCollection(selectedCollectionId)} disabled={collectionBusy}
            className="rounded-xl border border-rose-500/20 px-3 py-2.5 text-xs text-rose-300 disabled:opacity-40">Delete</button>
        </div>}
        {collectionMessage && <p role="status" aria-live="polite" className="text-xs text-violet-200">{collectionMessage}</p>}
        {collections.length === 0 && <p className="text-xs text-zinc-500">Create your first folder to organise saved posts.</p>}
      </section>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: 'all', label: 'All Items', icon: Bookmark },
          { id: 'posts', label: 'Posts', icon: Sparkles },
          { id: 'videos', label: 'Videos', icon: Play },
          { id: 'voice', label: 'Voice Posts', icon: Volume2 },
          { id: 'opportunities', label: 'Opportunities', icon: Briefcase }
        ].map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-sans font-bold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? 'bg-violet-600/30 border-violet-500 text-violet-300 shadow-md shadow-violet-500/10'
                  : 'bg-white/5 border-white/5 hover:border-white/15 text-zinc-400 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Saved Pages, Circles and events share the same private collection as posts. */}
      {otherItems.length > 0 && <section className="space-y-2" aria-label="Saved Pages, Circles and events">
        {otherItems.map(item => <article key={item.itemType + '_' + item.itemId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0b1020] p-4">
          <div className="min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-wider text-violet-300">{item.itemType === 'circle' ? 'Circle' : item.itemType === 'page' ? 'Page' : 'Event'}</p>
            <h3 className="truncate text-sm font-semibold text-white">{item.title}</h3>
            {item.subtitle && <p className="mt-1 truncate text-xs text-slate-400">{item.subtitle}</p>}
            {!item.available && <p className="mt-1 text-[10px] text-amber-200/70">Saved reference retained; content may have been removed or access changed.</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" onClick={() => onSelectTab?.(item.itemType === 'page' ? 'communities' : 'matrix')} className="rounded-lg border border-violet-400/30 px-3 py-2 text-[10px] font-semibold text-violet-200">Explore</button>
            <button type="button" disabled={collectionBusy} onClick={async () => {
              if (!selectedCollectionId || collectionBusy) return;
              setCollectionBusy(true);
              try {
                await removeContentFromSavedCollection(currentUser.id, selectedCollectionId, item.itemType, item.itemId, item.parentId);
                setCollectionSummaries(previous => previous.filter(entry => !(entry.itemType === item.itemType && entry.itemId === item.itemId && entry.parentId === item.parentId)));
                await refreshCollections();
              } catch (error) { setCollectionMessage(error instanceof Error ? error.message : 'Could not remove saved item.'); }
              finally { setCollectionBusy(false); }
            }} className="rounded-lg border border-rose-500/20 px-3 py-2 text-[10px] text-rose-200 disabled:opacity-40">Remove</button>
          </div>
        </article>)}
      </section>}

      {/* List of saved items */}
      <div className="space-y-4">
        {filteredItems.length === 0 && otherItems.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/5 border border-white/5 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-600/10 border border-white/10 text-violet-400 flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No saved items found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto">
              Bookmark interesting posts, videos, or opportunities in your feed to access them anytime here.
            </p>
          </div>
        ) : (
          filteredItems.map(post => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-3xl nx-surface hover:border-white/10 transition-all shadow-lg text-left relative group"
            >
              {/* Post author header */}
              <div className="flex items-center justify-between mb-3">
                <div 
                  className="flex items-center gap-3 cursor-pointer group/saveduser" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewProfile && onViewProfile(post.userId || post.username);
                  }}
                >
                  <img
                    src={post.avatar}
                    alt={post.name}
                    className="w-9 h-9 rounded-xl object-cover ring-2 ring-violet-500/30"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white group-hover/saveduser:underline transition-colors">{post.name}</span>
                      {post.isVerified && <PurpleVerifiedBadge className="w-3.5 h-3.5" type="founder" />}
                    </div>
                    <span className="text-[10px] font-mono text-zinc-500 group-hover/saveduser:underline">@{post.username} &bull; <RelativeTimestamp timestamp={post.timestamp} /></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onBookmarkPost(post.id)}
                    className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Remove from saved"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </div>
              </div>

              {/* Content body */}
              <p className="text-xs text-zinc-200 leading-relaxed font-sans mb-3">{post.content}</p>

              {/* Video preview if present */}
              {post.videoUrl && (
                <div className="mb-3 rounded-2xl overflow-hidden bg-black/60 border border-white/10 aspect-video relative group">
                  <video
                    src={post.videoUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Voice clip if present */}
              {post.voiceAudioUrl && (
                <div className="mb-3 p-3 rounded-2xl bg-violet-950/30 border border-white/10 flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-600 text-white">
                    <Volume2 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-mono text-violet-300 font-bold block uppercase">Voice Pulse Audio</span>
                    <audio src={post.voiceAudioUrl} controls className="w-full h-8 mt-1" />
                  </div>
                </div>
              )}

              {/* Tags footer */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
                  {post.tags.map(t => (
                    <span key={t} className="text-[10px] font-mono text-violet-400 bg-violet-950/40 border border-white/10 px-2 py-0.5 rounded-lg">
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
