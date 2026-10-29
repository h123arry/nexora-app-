import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, FileImage, LoaderCircle, Plus, Send, X } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase/config';
import { User } from '../types';
import {
  createTextStory,
  createMediaStory,
  markStoryViewed,
  NexoraStory,
  subscribeToPublicStories
} from '../services/firebase/storyService';

interface StoryRailProps {
  currentUser: User;
  onRequireAuth?: () => void;
  onViewProfile?: (userId: string) => void;
}

const toMillis = (value: NexoraStory['createdAt'] | NexoraStory['expiresAt']) => {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (value && typeof (value as any).toMillis === 'function') return (value as any).toMillis();
  return 0;
};

const ageLabel = (createdAt: NexoraStory['createdAt']) => {
  const minutes = Math.floor(Math.max(0, Date.now() - toMillis(createdAt)) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
};

function StoryAvatar({ story, size = 'h-14 w-14', text = 'text-base' }: { story: NexoraStory; size?: string; text?: string }) {
  if (story.avatar) {
    return (
      <img
        src={story.avatar}
        alt=""
        className={`${size} rounded-full object-cover`}
        referrerPolicy="no-referrer"
        loading="lazy"
      />
    );
  }
  return (
    <span className={`${size} rounded-full bg-violet-950 text-violet-100 grid place-items-center font-bold ${text}`} aria-hidden="true">
      {(story.name || story.username || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function StoryRail({ currentUser, onRequireAuth, onViewProfile }: StoryRailProps) {
  const [authUserId, setAuthUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [stories, setStories] = useState<NexoraStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [viewerSelection, setViewerSelection] = useState<{ authorIndex: number; storyIndex: number } | null>(null);
  const [viewedStoryIds, setViewedStoryIds] = useState<string[]>(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem('nexora_viewed_stories') || '[]');
      return Array.isArray(stored) ? stored.filter((id): id is string => typeof id === 'string') : [];
    } catch {
      return [];
    }
  });
  const railRef = useRef<HTMLDivElement>(null);

  useEffect(() => onAuthStateChanged(auth, (user) => setAuthUserId(user?.uid ?? null)), []);

  useEffect(() => {
    if (!authUserId) {
      setStories([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    return subscribeToPublicStories(
      (next) => {
        setStories(next);
        setIsLoading(false);
      },
      (err) => {
        console.error('Unable to load Nexora stories', err);
        setIsLoading(false);
      }
    );
  }, [authUserId]);

  // Group active stories by author so the viewer can advance through a creator's sequence.
  const storyGroups = useMemo(() => {
    const byUser = new Map<string, NexoraStory[]>();
    for (const story of stories) {
      const group = byUser.get(story.userId) || [];
      group.push(story);
      byUser.set(story.userId, group);
    }
    return Array.from(byUser.values())
      .map(group => group.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt)))
      .sort((a, b) => toMillis(b[b.length - 1].createdAt) - toMillis(a[a.length - 1].createdAt));
  }, [stories]);

  const authors = useMemo(() => storyGroups.map(group => group[group.length - 1]), [storyGroups]);

  const rememberViewed = (story: NexoraStory) => {
    setViewedStoryIds(previous => {
      const next = previous.includes(story.id) ? previous : [...previous, story.id].slice(-500);
      try { sessionStorage.setItem('nexora_viewed_stories', JSON.stringify(next)); } catch {}
      return next;
    });
    void markStoryViewed(story).catch(() => undefined);
  };

  const scrollRail = (dir: -1 | 1) => {
    railRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' });
  };

  const openComposer = () => {
    if (!authUserId) {
      onRequireAuth?.();
      return;
    }
    setError('');
    setMediaFile(null);
    setUploadProgress(0);
    setComposerOpen(true);
  };

  const submitStory = async () => {
    if (!authUserId) return;
    const clean = caption.trim();
    if (!clean && !mediaFile) {
      setError('Write something to share.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (mediaFile) {
        await createMediaStory(currentUser, mediaFile, clean, setUploadProgress);
      } else {
        await createTextStory(currentUser, clean);
      }
      setCaption('');
      setMediaFile(null);
      setUploadProgress(0);
      setComposerOpen(false);
    } catch (err: any) {
      setError(err?.message || 'Could not publish your story.');
    } finally {
      setSaving(false);
    }
  };

  const activeGroup = viewerSelection ? storyGroups[viewerSelection.authorIndex] : null;
  const activeStory = activeGroup && viewerSelection ? activeGroup[viewerSelection.storyIndex] : null;

  const moveViewer = (direction: -1 | 1) => {
    if (!viewerSelection) return;
    const group = storyGroups[viewerSelection.authorIndex];
    const nextStoryIndex = viewerSelection.storyIndex + direction;
    if (nextStoryIndex >= 0 && nextStoryIndex < group.length) {
      const nextStory = group[nextStoryIndex];
      setViewerSelection({ ...viewerSelection, storyIndex: nextStoryIndex });
      rememberViewed(nextStory);
      return;
    }
    const nextAuthorIndex = viewerSelection.authorIndex + direction;
    if (nextAuthorIndex >= 0 && nextAuthorIndex < storyGroups.length) {
      const nextGroup = storyGroups[nextAuthorIndex];
      const nextStoryIndexForAuthor = direction === 1 ? 0 : nextGroup.length - 1;
      const nextStory = nextGroup[nextStoryIndexForAuthor];
      setViewerSelection({ authorIndex: nextAuthorIndex, storyIndex: nextStoryIndexForAuthor });
      rememberViewed(nextStory);
    } else if (direction === 1) {
      setViewerSelection(null);
    }
  };

  return (
    <section aria-label="Stories" className="relative">
      <div className="flex items-center justify-between px-4 sm:px-6 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="nx-eyebrow">Stories</span>
          {isLoading && <LoaderCircle className="w-3.5 h-3.5 text-violet-400 animate-spin" aria-hidden="true" />}
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <button type="button" onClick={() => scrollRail(-1)} className="nx-icon-button !min-w-8 !min-h-8 !rounded-lg" aria-label="Scroll stories left">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => scrollRail(1)} className="nx-icon-button !min-w-8 !min-h-8 !rounded-lg" aria-label="Scroll stories right">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={railRef} className="flex gap-3.5 overflow-x-auto scrollbar-none px-4 sm:px-6 pb-4">
        {/* Create story tile */}
        <button
          type="button"
          onClick={openComposer}
          className="shrink-0 w-[68px] flex flex-col items-center gap-1.5 group cursor-pointer"
          aria-label="Add to your story"
        >
          <span className="relative grid h-14 w-14 place-items-center rounded-full border border-dashed border-violet-400/50 bg-violet-500/10 text-violet-200 group-hover:bg-violet-500/20 transition-colors">
            <Plus className="w-6 h-6" />
          </span>
          <span className="text-[10px] font-medium text-zinc-300 truncate w-full text-center">Your story</span>
        </button>

        {authors.map((story, index) => {
          const isUnviewed = storyGroups[index].some(item => !viewedStoryIds.includes(item.id));
          return (
          <button
            key={story.id}
            type="button"
            onClick={() => {
              const firstUnviewed = storyGroups[index].findIndex(item => !viewedStoryIds.includes(item.id));
              const storyIndex = firstUnviewed >= 0 ? firstUnviewed : storyGroups[index].length - 1;
              setViewerSelection({ authorIndex: index, storyIndex });
              rememberViewed(storyGroups[index][storyIndex]);
            }}
            className="shrink-0 w-[68px] flex flex-col items-center gap-1.5 group cursor-pointer"
            aria-label={`View ${story.name || story.username}'s story`}
          >
            <span className={`${isUnviewed ? 'nx-story-ring' : 'nx-story-ring-seen'} group-hover:scale-[1.03] transition-transform`}>
              <StoryAvatar story={story} />
            </span>
            <span className="text-[10px] font-medium text-zinc-300 truncate w-full text-center">
              {story.name?.split(' ')[0] || story.username}
            </span>
          </button>
          );
        })}

        {!isLoading && authors.length === 0 && (
          <div className="flex items-center text-[11px] text-zinc-500 pl-1">
            No stories yet — be the first to share a moment.
          </div>
        )}
      </div>

      {/* Composer */}
      <AnimatePresence>
        {composerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
            onClick={() => !saving && setComposerOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.94, y: 12, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl nx-surface p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white">Create a story</h3>
                <button type="button" onClick={() => setComposerOpen(false)} className="nx-icon-button !min-w-9 !min-h-9" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-start gap-3">
                <StoryAvatar
                  story={{ avatar: currentUser.avatar } as NexoraStory}
                  size="h-11 w-11"
                  text="text-sm"
                />
                  <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value.slice(0, 500))}
                  placeholder="Share a moment…"
                  rows={4}
                  autoFocus
                  className="nx-field w-full resize-none p-3 text-sm"
                  />
              </div>
              <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-violet-400/30 bg-violet-500/5 px-3 text-xs text-zinc-300 hover:bg-violet-500/10">
                <FileImage className="h-4 w-4 text-violet-300" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{mediaFile ? mediaFile.name : 'Add a photo or video'}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime,video/ogg"
                  className="sr-only"
                  onChange={(event) => setMediaFile(event.target.files?.[0] || null)}
                />
              </label>
              {mediaFile && <button type="button" onClick={() => setMediaFile(null)} className="mt-1 text-[10px] text-zinc-500 hover:text-white">Remove media</button>}
              <div className="flex items-center justify-between mt-3">
                <span className="text-[10px] font-mono text-zinc-500">{caption.length}/500 · visible for 24h{saving && mediaFile ? ` · ${uploadProgress}%` : ''}</span>
                <button
                  type="button"
                  onClick={submitStory}
                  disabled={saving || (!caption.trim() && !mediaFile)}
                  className="nx-btn-primary !min-h-10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Share
                </button>
              </div>
              {error && <p className="mt-2 text-[11px] text-rose-400">{error}</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Viewer */}
      <AnimatePresence>
        {activeStory && (
          <StoryViewer
            story={activeStory}
            onClose={() => setViewerSelection(null)}
            onPrev={() => moveViewer(-1)}
            onNext={() => moveViewer(1)}
            onViewProfile={onViewProfile}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

function StoryViewer({
  story,
  onClose,
  onPrev,
  onNext,
  onViewProfile
}: {
  story: NexoraStory;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onViewProfile?: (userId: string) => void;
}) {
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setProgress(0);
    const started = Date.now();
    const duration = 5000;
    const timer = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(timer);
        onNext();
      }
    }, 50);
    return () => clearInterval(timer);
  }, [story.id, onNext]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') onNext();
      if (e.key === 'ArrowLeft') onPrev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onNext, onPrev]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) videoRef.current?.pause();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/92 backdrop-blur-lg p-3"
    >
      <div className="relative w-full max-w-sm h-[80vh] max-h-[720px] rounded-3xl overflow-hidden nx-gradient-border flex flex-col">
        <div className="absolute inset-0" style={{ background: 'var(--nx-gradient-soft)' }} aria-hidden="true" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex gap-1 p-3">
            <div className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white rounded-full transition-[width] duration-100 ease-linear" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-center justify-between px-4">
            <button
              type="button"
              onClick={() => onViewProfile?.(story.userId)}
              className="flex items-center gap-2.5 cursor-pointer"
            >
              <span className="nx-story-ring">
                <StoryAvatar story={story} size="h-9 w-9" text="text-xs" />
              </span>
              <span className="text-left">
                <span className="block text-xs font-bold text-white leading-tight">{story.name || story.username}</span>
                <span className="block text-[10px] text-zinc-300">{ageLabel(story.createdAt)} ago</span>
              </span>
            </button>
            <button type="button" onClick={onClose} className="nx-icon-button !min-w-9 !min-h-9" aria-label="Close story">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 grid place-items-center px-6">
            {story.mediaType === 'image' && story.mediaUrl ? (
              <img src={story.mediaUrl} alt={story.caption || `Story from ${story.name || story.username}`} className="max-h-full max-w-full rounded-2xl object-contain" />
            ) : story.mediaType === 'video' && story.mediaUrl ? (
              <video
                ref={videoRef}
                src={story.mediaUrl}
                className="max-h-full max-w-full rounded-2xl object-contain"
                controls
                autoPlay
                muted
                playsInline
                preload="metadata"
                aria-label={story.caption || `Story video from ${story.name || story.username}`}
              />
            ) : (
              <p className="text-center text-xl sm:text-2xl font-bold leading-snug text-white drop-shadow">{story.caption}</p>
            )}
          </div>
          <div className="flex items-center justify-between p-4">
            <button type="button" onClick={onPrev} className="nx-btn-ghost !min-h-9 text-xs">Prev</button>
            <span className="text-[10px] font-mono text-zinc-400">24h story</span>
            <button type="button" onClick={onNext} className="nx-btn-ghost !min-h-9 text-xs">Next</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
