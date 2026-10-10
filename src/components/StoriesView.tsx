import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Clock3, LoaderCircle, Plus, Send, Trash2, X } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase/config';
import { User } from '../types';
import {
  createTextStory,
  deleteStory,
  NexoraStory,
  subscribeToPublicStories
} from '../services/firebase/storyService';

interface StoriesViewProps {
  currentUser: User;
  onRequireAuth?: () => void;
}

const timestampMillis = (value: NexoraStory['createdAt'] | NexoraStory['expiresAt']) => {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  if (value && 'toMillis' in value && typeof value.toMillis === 'function') return value.toMillis();
  return 0;
};

const formatStoryAge = (createdAt: NexoraStory['createdAt']) => {
  const elapsed = Math.max(0, Date.now() - timestampMillis(createdAt));
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return 'Expired';
};

function Avatar({ story, large = false }: { story: NexoraStory; large?: boolean }) {
  const size = large ? 'h-14 w-14' : 'h-12 w-12';
  return story.avatar ? (
    <img
      src={story.avatar}
      alt=""
      className={`${size} rounded-full object-cover ring-2 ring-violet-500/70 p-0.5`}
      referrerPolicy="no-referrer"
      loading="lazy"
    />
  ) : (
    <span className={`${size} rounded-full ring-2 ring-violet-500/70 bg-violet-950 text-violet-100 grid place-items-center font-bold`} aria-hidden="true">
      {(story.name || story.username || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

export default function StoriesView({ currentUser, onRequireAuth }: StoriesViewProps) {
  const [authUserId, setAuthUserId] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [stories, setStories] = useState<NexoraStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => onAuthStateChanged(auth, (user) => setAuthUserId(user?.uid ?? null)), []);

  useEffect(() => {
    if (!authUserId) {
      setStories([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    return subscribeToPublicStories(
      (nextStories) => {
        setStories(nextStories);
        setIsLoading(false);
      },
      (error) => {
        console.error('Unable to load Nexora stories', error);
        setErrorMessage('Stories could not be loaded. Please try again later.');
        setIsLoading(false);
      }
    );
  }, [authUserId]);

  const activeStories = useMemo(() => {
      const now = Date.now();
      return stories
      .filter((story) => timestampMillis(story.expiresAt) > now)
      .sort((a, b) => timestampMillis(b.createdAt) - timestampMillis(a.createdAt));
  }, [stories]);

  const storyByAuthor = useMemo(() => {
    const latestByAuthor = new Map<string, NexoraStory>();
    activeStories.forEach((story) => {
      if (!latestByAuthor.has(story.userId)) latestByAuthor.set(story.userId, story);
    });
    return Array.from(latestByAuthor.values());
  }, [activeStories]);

  const selectedStory = activeStories.find((story) => story.id === selectedStoryId) ?? null;
  const isSignedIn = Boolean(authUserId && authUserId === currentUser.id);

  const openComposer = () => {
    if (!isSignedIn) {
      onRequireAuth?.();
      return;
    }
    setErrorMessage('');
    setIsComposerOpen(true);
  };

  const publishStory = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isSignedIn || !caption.trim()) return;

    setIsSaving(true);
    setErrorMessage('');
    try {
      const storyId = await createTextStory(currentUser, caption);
      setCaption('');
      setIsComposerOpen(false);
      setSelectedStoryId(storyId);
    } catch (error) {
      console.error('Unable to publish Nexora story', error);
      setErrorMessage('Your story could not be shared. Check your connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const removeSelectedStory = async () => {
    if (!selectedStory || selectedStory.userId !== authUserId) return;
    try {
      await deleteStory(selectedStory.id);
      setSelectedStoryId(null);
    } catch (error) {
      console.error('Unable to delete Nexora story', error);
      setErrorMessage('That story could not be removed. Please try again.');
    }
  };

  return (
    <section className="border-b border-white/10 bg-[var(--nx-canvas)] px-4 py-3 sm:px-6" aria-label="Stories">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-white">Stories</h2>
          <p className="mt-0.5 text-[11px] text-zinc-400">Text updates from Nexora members · visible for 24 hours</p>
        </div>
        {isSignedIn ? (
          <button type="button" onClick={openComposer} className="nx-icon-button inline-flex gap-1.5 px-3 text-xs font-semibold text-violet-200" aria-label="Create a story">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New story</span>
          </button>
        ) : (
          <button type="button" onClick={onRequireAuth} className="nx-icon-button inline-flex px-3 text-xs font-semibold text-violet-200">
            Sign in to share
          </button>
        )}
      </div>

      {!isSignedIn ? (
        <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs text-zinc-400">
          Sign in to view and share stories.
        </p>
      ) : (
        <div className="mt-3 flex gap-4 overflow-x-auto overscroll-x-contain pb-1 scrollbar-none">
          <button type="button" onClick={openComposer} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 text-center" aria-label="Add your story">
            <span className="relative grid h-14 w-14 place-items-center rounded-full border border-dashed border-violet-400/70 bg-violet-500/10 text-violet-200">
              <Plus className="h-5 w-5" />
            </span>
            <span className="w-full truncate text-[10px] text-zinc-300">Your story</span>
          </button>

          {isLoading ? (
            <div className="flex h-[78px] items-center gap-2 text-xs text-zinc-400"><LoaderCircle className="h-4 w-4 animate-spin" /> Loading stories</div>
          ) : storyByAuthor.length ? (
            storyByAuthor.map((story) => (
              <button key={story.userId} type="button" onClick={() => setSelectedStoryId(story.id)} className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 text-center">
                <Avatar story={story} />
                <span className="w-full truncate text-[10px] text-zinc-300">{story.userId === authUserId ? 'You' : story.name}</span>
              </button>
            ))
          ) : (
            <p className="self-center py-3 text-xs text-zinc-500">No active stories yet.</p>
          )}
        </div>
      )}

      {errorMessage && <p role="status" className="mt-2 text-xs text-rose-300">{errorMessage}</p>}

      <AnimatePresence>
        {isComposerOpen && (
          <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close story composer" onClick={() => setIsComposerOpen(false)} />
            <motion.div className="relative z-10 w-full max-w-lg rounded-t-3xl border border-white/10 bg-[#100c21] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl" initial={{ y: 28 }} animate={{ y: 0 }} exit={{ y: 28 }}>
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-white">Share a story</h3>
                  <p className="mt-1 text-xs text-zinc-400">A short text update, shared with signed-in Nexora members for 24 hours.</p>
                </div>
                <button type="button" className="nx-icon-button inline-flex" onClick={() => setIsComposerOpen(false)} aria-label="Close"><X className="h-4 w-4" /></button>
              </div>
              <form onSubmit={publishStory} className="space-y-3">
                <label htmlFor="nexora-story-caption" className="sr-only">Story text</label>
                <textarea id="nexora-story-caption" autoFocus maxLength={500} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="What’s on your mind?" className="nx-field min-h-36 w-full resize-y px-4 py-3 text-sm" required />
                <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                  <span>Text stories only; media upload is not connected yet.</span>
                  <span>{caption.length}/500</span>
                </div>
                <button type="submit" disabled={!caption.trim() || isSaving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-4 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">
                  {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {isSaving ? 'Sharing…' : 'Share story'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedStory && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-3 backdrop-blur-sm sm:p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedStoryId(null)}>
            <motion.article role="dialog" aria-modal="true" aria-label={`${selectedStory.name}'s story`} className="relative flex min-h-[min(78vh,560px)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(ellipse_at_top_left,_rgba(139,92,246,.22),_transparent_45%),linear-gradient(150deg,#15102a,#090711_72%)] p-5 shadow-2xl" onClick={(event) => event.stopPropagation()} initial={{ y: 16, scale: 0.98 }} animate={{ y: 0, scale: 1 }} exit={{ y: 16, scale: 0.98 }}>
              <div className="mb-5 flex items-center gap-3">
                <Avatar story={selectedStory} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{selectedStory.userId === authUserId ? 'You' : selectedStory.name}</p>
                  <p className="flex items-center gap-1 text-xs text-zinc-400"><Clock3 className="h-3 w-3" /> {formatStoryAge(selectedStory.createdAt)}</p>
                </div>
                {selectedStory.userId === authUserId && <button type="button" className="nx-icon-button inline-flex text-rose-300" onClick={removeSelectedStory} aria-label="Delete your story"><Trash2 className="h-4 w-4" /></button>}
                <button type="button" className="nx-icon-button inline-flex" onClick={() => setSelectedStoryId(null)} aria-label="Close story"><X className="h-4 w-4" /></button>
              </div>
              <div className="flex flex-1 items-center justify-center py-8">
                <p className="whitespace-pre-wrap break-words text-center text-xl font-semibold leading-relaxed text-white sm:text-2xl">{selectedStory.caption}</p>
              </div>
              <p className="text-center text-[11px] text-violet-200/70">This story expires 24 hours after it was shared.</p>
            </motion.article>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
