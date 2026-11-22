import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Zap, Trash, Send, MessageSquare, Search } from 'lucide-react';
import { getNearestMediaIndex, resolvePreservedMediaIndex } from '../utils/immersiveMediaViewerPolicy';
import { Post, User } from '../types';
import NexoraVideoPlayer from './NexoraVideoPlayer';
import NexoraImagePlayer from './NexoraImagePlayer';
import RelativeTime from './RelativeTime';
import { getVideoPreloadPlan } from '../utils/videoPreloadPolicy';

const VIDEO_MEDIA_URL_PATTERN = /\\.(?:mp4|m4v|mov|webm|m3u8)(?:$|[?#])/i;

function getImmersiveVideoUrl(post: Post): string {
  const mediaUrl = typeof post.media === 'string' ? post.media : '';
  const mediaType = String((post as any).mediaType || (post as any).type || '').toLowerCase();
  return post.videoUrl || ((mediaType === 'video' || VIDEO_MEDIA_URL_PATTERN.test(mediaUrl)) ? mediaUrl : '');
}

function getImmersiveImageUrl(post: Post): string {
  const mediaUrl = typeof post.media === 'string' ? post.media : '';
  return post.image
    || post.images?.find(Boolean)
    || (post as any).thumbnailUrl
    || (post as any).thumbnail
    || (post as any).posterUrl
    || (!getImmersiveVideoUrl(post) ? mediaUrl : '')
    || '';
}

interface ImmersiveVideoViewerProps {
  initialPost: Post;
  creatorPosts: Post[];
  currentUser: User;
  onClose: () => void;
  onLikePost: (postId: string) => void;
  onToggleFollow?: (userId: string) => void;
  isFollowing?: boolean;
  followingIds?: string[];
  onAddComment?: (postId: string, content: string) => void;
}

export default function ImmersiveVideoViewer({
  initialPost,
  creatorPosts = [],
  currentUser,
  onClose,
  onLikePost,
  onToggleFollow,
  isFollowing = false,
  followingIds,
  onAddComment
}: ImmersiveVideoViewerProps) {
  if (!initialPost) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white">
        <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin mb-4" aria-label="Loading" /><p className="text-sm font-medium text-zinc-300 mb-4">Preparing your video…</p>
        <button onClick={onClose} className="px-4 py-2 bg-violet-600 rounded-xl text-xs font-bold cursor-pointer">Close</button>
      </div>
    );
  }

  // Filter posts with videoUrl or media, and guarantee the clicked initialPost is included
  const postsToShow = useMemo(() => {
    const list = (creatorPosts || []).filter(p => p && (getImmersiveVideoUrl(p) || getImmersiveImageUrl(p) || p.id === initialPost.id));
    if (initialPost && !list.some(p => p.id === initialPost.id)) {
      return [initialPost, ...list];
    }
    return list.length > 0 ? list : [initialPost];
  }, [creatorPosts, initialPost]);

  // Keep the selected media stable when a parent refreshes or reorders the creator feed.
  const [currentIndex, setCurrentIndex] = useState(() => {
    const startIndex = postsToShow.findIndex(post => post?.id === initialPost?.id);
    return startIndex >= 0 ? startIndex : 0;
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activePostIdRef = useRef(initialPost?.id || '');
  const previousInitialPostIdRef = useRef(initialPost?.id || '');

  useEffect(() => {
    const nextIndex = resolvePreservedMediaIndex(
      postsToShow,
      activePostIdRef.current,
      initialPost?.id || '',
      previousInitialPostIdRef.current,
    );
    previousInitialPostIdRef.current = initialPost?.id || '';
    activePostIdRef.current = postsToShow[nextIndex]?.id || '';
    setCurrentIndex(nextIndex);
    const container = scrollContainerRef.current;
    if (container) container.scrollTop = nextIndex * container.clientHeight;
  }, [initialPost?.id, postsToShow]);

  useEffect(() => {
    const activePost = postsToShow[currentIndex];
    if (activePost?.id) activePostIdRef.current = activePost.id;
  }, [currentIndex]);

  // Listen for post deletions while viewer is open to avoid crashing
  useEffect(() => {
    const handleDeleteEvent = (e: Event) => {
      const { postId } = (e as CustomEvent).detail || {};
      if (!postId) return;
      if (postsToShow.length <= 1) {
        onClose();
      } else {
        setCurrentIndex(prev => {
          const nextIndex = Math.max(0, Math.min(prev, postsToShow.length - 2));
          const container = scrollContainerRef.current;
          if (container) container.scrollTop = nextIndex * container.clientHeight;
          return nextIndex;
        });
      }
    };
    window.addEventListener('nexora-delete-post', handleDeleteEvent);
    return () => {
      window.removeEventListener('nexora-delete-post', handleDeleteEvent);
    };
  }, [postsToShow.length, onClose]);

  const currentPost = postsToShow[currentIndex] || postsToShow[0] || initialPost;

  if (!currentPost || !currentPost.id) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white">
        <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin mb-4" aria-label="Loading" /><p className="text-sm font-medium text-zinc-300 mb-4">Preparing your video…</p>
        <button onClick={onClose} className="px-4 py-2 bg-violet-600 rounded-xl text-xs font-bold cursor-pointer">Close</button>
      </div>
    );
  }

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [activeReplyFieldId, setActiveReplyFieldId] = useState<string | null>(null);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  // Save last watched position to localStorage whenever currentIndex changes
  useEffect(() => {
    if (currentPost?.id) {
      localStorage.setItem('nexora_last_reels_post_id', currentPost.id);
      localStorage.setItem('nexora_last_reels_index', String(currentIndex));
    }
  }, [currentIndex, currentPost?.id]);

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const scrollToIndex = (index: number) => {
    const nextIndex = Math.max(0, Math.min(postsToShow.length - 1, index));
    const container = scrollContainerRef.current;
    if (!container || container.clientHeight <= 0) {
      setCurrentIndex(nextIndex);
      return;
    }
    container.scrollTo({ top: nextIndex * container.clientHeight, behavior: 'smooth' });
  };

  const handleStageScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (isCommentsOpen) return;
    const container = event.currentTarget;
    const nextIndex = getNearestMediaIndex(container.scrollTop, container.clientHeight, postsToShow.length);
    if (nextIndex !== currentIndex) {
      setCurrentIndex(nextIndex);
      setIsCommentsOpen(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          scrollToIndex(currentIndex - 1);
          setIsCommentsOpen(false);
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        if (currentIndex < postsToShow.length - 1) {
          scrollToIndex(currentIndex + 1);
          setIsCommentsOpen(false);
        }
      } else if (e.key === 'Escape') {
        if (isCommentsOpen) {
          setIsCommentsOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, postsToShow.length, isCommentsOpen, onClose]);

  // Android Back & Global escape handling
  useEffect(() => {
    const handleEscape = (e: Event) => {
      e.preventDefault();
      if (isCommentsOpen) {
        setIsCommentsOpen(false);
      } else {
        onClose();
      }
    };
    window.addEventListener('nexora-escape', handleEscape);
    return () => window.removeEventListener('nexora-escape', handleEscape);
  }, [isCommentsOpen, onClose]);

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentIndex < postsToShow.length - 1) {
      scrollToIndex(currentIndex + 1);
      setIsCommentsOpen(false);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentIndex > 0) {
      scrollToIndex(currentIndex - 1);
      setIsCommentsOpen(false);
    }
  };

  const handleLike = async (postId = currentPost.id) => {
    setIsProcessing(true);
    await onLikePost(postId);
    setIsProcessing(false);
  };

  // Comment Actions
  const handleSendComment = () => {
    if (!commentInput.trim() || !onAddComment) return;
    onAddComment(currentPost.id, commentInput.trim());
    setCommentInput('');
  };

  const handleSparkCommentLocal = (commentId: string) => {
    window.dispatchEvent(new CustomEvent('nexora-spark-comment', { 
      detail: { postId: currentPost.id, commentId } 
    }));
  };

  const handleSendReply = (commentId: string) => {
    const content = replyInputs[commentId]?.trim();
    if (!content) return;
    window.dispatchEvent(new CustomEvent('nexora-add-reply', { 
      detail: { postId: currentPost.id, commentId, replyContent: content } 
    }));
    setReplyInputs(prev => ({ ...prev, [commentId]: '' }));
    setActiveReplyFieldId(null);
  };


  const relatedSearchQuery = useMemo(() => {
    const suggestion = typeof currentPost.searchSuggestion === 'string' ? currentPost.searchSuggestion.trim() : '';
    if (suggestion) return suggestion.slice(0, 100);
    const tags = Array.isArray(currentPost.tags) ? currentPost.tags : [];
    const firstTag = tags.find(tag => typeof tag === 'string' && tag.trim());
    if (firstTag) return firstTag.replace(/^#/, '').trim().slice(0, 100);
    const hashtag = currentPost.content?.match(/#[A-Za-z0-9_]+/)?.[0];
    if (hashtag) return hashtag.slice(1);
    return (currentPost.content || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  }, [currentPost.id, currentPost.searchSuggestion, currentPost.tags, currentPost.content]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="nx-reels-viewer fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden h-[100dvh] w-full select-none"
    >
      {/* Related-content discovery replaces redundant top-right viewer controls. */}
      <div
        className="absolute left-4 right-4 z-50 flex justify-center pointer-events-none"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      >
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent('openUniversalSearch', { detail: { query: relatedSearchQuery } }))}
          aria-label="Find related content"
          className="pointer-events-auto flex h-11 w-full max-w-[560px] items-center gap-3 rounded-full border border-white/12 bg-[#10131d]/82 px-4 text-left text-sm font-medium text-white/90 shadow-lg shadow-black/20 backdrop-blur-xl transition-colors hover:bg-[#171b29]/95 active:scale-[0.99]"
        >
          <Search className="h-4 w-4 shrink-0 text-violet-300" />
          <span className="min-w-0 flex-1 truncate">Find related content</span>
          <ChevronRight className="h-4 w-4 shrink-0 text-white/45" />
        </button>
      </div>

      {/* Desktop Floating Navigation Arrows on edges */}
      {currentIndex > 0 && (
        <button 
          onClick={handlePrev}
          className="absolute left-6 z-40 p-3.5 bg-black/40 hover:bg-black/80 text-white rounded-full border border-white/10 backdrop-blur-md transition-all hidden md:block active:scale-95 cursor-pointer shadow-md"
          title="Previous video"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}
      
      {currentIndex < postsToShow.length - 1 && (
        <button 
          onClick={handleNext}
          className="absolute right-6 z-40 p-3.5 bg-black/40 hover:bg-black/80 text-white rounded-full border border-white/10 backdrop-blur-md transition-all hidden md:block active:scale-95 cursor-pointer shadow-md"
          title="Next video"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Full-screen vertical media pager. Native scroll + mandatory snap prevents half-visible posts. */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full h-full bg-black relative overflow-hidden"
      >
        <div
          ref={scrollContainerRef}
          onScroll={handleStageScroll}
          className="absolute inset-0 h-full w-full overflow-y-auto overscroll-y-contain touch-pan-y"
          style={{ display: 'flex', flexDirection: 'column', scrollSnapType: 'y mandatory', scrollSnapStop: 'always', scrollbarWidth: 'none', overscrollBehaviorY: 'contain' }}
        >
          {postsToShow.map((post, idx) => {
            const isCurrent = idx === currentIndex;
            const isNearby = idx >= currentIndex - 1 && idx <= currentIndex + 3;
            const videoUrl = getImmersiveVideoUrl(post);
            const imageUrl = getImmersiveImageUrl(post);
            const isVideo = Boolean(videoUrl);
            const hasImages = Boolean(imageUrl);
            const connection = typeof navigator !== 'undefined'
              ? (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
              : undefined;
            const isSlowConnection = Boolean(connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType || ''));
            const postVideoIndex = postsToShow.slice(0, idx + 1).filter(item => Boolean(getImmersiveVideoUrl(item))).length - 1;
            const activeVideoIndex = postsToShow.slice(0, currentIndex + 1).filter(item => Boolean(getImmersiveVideoUrl(item))).length - 1;
            const preloadPlan = getVideoPreloadPlan({
              isVideo,
              isActive: isCurrent,
              postIndex: idx,
              activePostIndex: currentIndex,
              postVideoIndex,
              activeVideoIndex,
              isSlowConnection,
            });

            return (
              <section
                key={post.id}
                className="relative h-full min-h-full w-full shrink-0 overflow-hidden bg-black"
                style={{ height: '100%', minHeight: '100%', flex: '0 0 100%', scrollSnapAlign: 'start', scrollSnapStop: 'always' }}
                aria-label={isVideo ? 'Video post' : hasImages ? 'Photo post' : 'Post'}
              >
                {isNearby && isVideo ? (
                  <NexoraVideoPlayer
                    post={post}
                    videoUrl={videoUrl}
                    onOpenFullscreen={() => {}}
                    onSpark={() => handleLike(post.id)}
                    isProcessing={isProcessing && isCurrent}
                    isActive={isCurrent}
                    hideTopRightSoundControl
                    preloadMode={preloadPlan.preloadMode}
                    isReleased={preloadPlan.isReleased}
                    shouldPreload={preloadPlan.shouldPreload}
                    isFollowing={followingIds ? followingIds.includes(post.userId || '') : isFollowing}
                    onToggleFollow={onToggleFollow ? () => onToggleFollow(post.userId || post.id) : undefined}
                    onCommentToggle={() => setIsCommentsOpen(open => !open)}
                    isCommentsOpen={isCurrent && isCommentsOpen}
                    onNotInterested={handleNext}
                    onViewProfile={(userId) => {
                      onClose();
                      window.dispatchEvent(new CustomEvent('nexora-view-profile', { detail: { userIdOrUsername: userId || post.userId || post.username } }));
                    }}
                  />
                ) : isNearby && hasImages ? (
                  <div className="h-full w-full">
                    <NexoraImagePlayer
                      post={post}
                      image={imageUrl}
                      images={post.images}
                      onSpark={() => handleLike(post.id)}
                      isProcessing={isProcessing && isCurrent}
                      isFollowing={followingIds ? followingIds.includes(post.userId || '') : isFollowing}
                      onToggleFollow={onToggleFollow ? () => onToggleFollow(post.userId || post.id) : undefined}
                      onCommentToggle={() => setIsCommentsOpen(open => !open)}
                      isCommentsOpen={isCurrent && isCommentsOpen}
                      onNotInterested={handleNext}
                      onViewProfile={(userId) => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('nexora-view-profile', { detail: { userIdOrUsername: userId || post.userId || post.username } }));
                      }}
                      isActive={isCurrent}
                      shouldPreload={preloadPlan.shouldPreload}
                      isReleased={preloadPlan.isReleased}
                      isImmersive
                    />
                  </div>
                ) : isNearby ? (
                  <div className="flex h-full w-full items-center justify-center px-6 text-center">
                    <p className="max-w-xl px-4 text-base font-bold leading-relaxed text-white">{post.content}</p>
                  </div>
                ) : (
                  <div className="h-full w-full bg-black" aria-hidden="true" />
                )}
              </section>
            );
          })}
        </div>
        {/* THREADED COMMENTS DRAWER ACCORDION OVERLAY */}
        <AnimatePresence>
          {isCommentsOpen && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="comments-container absolute bottom-0 inset-x-0 h-[65%] rounded-t-[32px] nx-glass-strong border-t border-white/10 z-40 flex flex-col p-5 shadow-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3 shrink-0">
                <span className="text-[10px] font-mono tracking-widest text-violet-400 font-extrabold uppercase flex items-center gap-1.5">
                  💬 Comments ({currentPost.comments?.length || 0})
                </span>
                <button
                  onClick={() => setIsCommentsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable List */}
              <div className="space-y-3.5 flex-1 overflow-y-auto pr-1 mb-4 custom-scrollbar">
                {(!currentPost.comments || currentPost.comments.length === 0) && (
                  <p className="text-[11px] font-mono text-violet-300/40 italic py-6 text-center">
                    No comments yet. Start the conversation!
                  </p>
                )}
                {currentPost.comments?.map((c, commentIndex) => (
                  <div key={c.id} className="p-3 rounded-2xl bg-slate-950/40 border border-white/5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2 text-xs">
                      <div 
                        className="flex gap-2 items-center cursor-pointer group/commentuser"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClose();
                          window.dispatchEvent(new CustomEvent('nexora-view-profile', { detail: { userIdOrUsername: c.userId || c.username } }));
                        }}
                      >
                        <img src={c.avatar} alt={c.name} className="w-7 h-7 rounded-lg object-cover ring-1 ring-violet-500/30" />
                        <div>
                          <span className="font-sans font-bold text-violet-200 group-hover/commentuser:underline">{c.name}</span>
                          <span className="text-[10px] font-mono text-violet-400/60 block group-hover/commentuser:underline">
                            @{c.username} • <RelativeTime timestamp={c.timestamp} />
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => handleSparkCommentLocal(c.id)}
                          className={`flex items-center gap-1 font-mono text-[10px] hover:text-pink-400 cursor-pointer transition-colors ${
                            c.isLikedByUser ? 'text-pink-400' : 'text-violet-400/50'
                          }`}
                        >
                          <Zap className="w-3 h-3 fill-current" />
                          <span>{c.likes}</span>
                        </button>
                        {(c.username === currentUser.username || currentPost.userId === currentUser.id) && (
                          <button
                            onClick={() => {
                              if (confirm('Delete this comment?')) {
                                window.dispatchEvent(new CustomEvent('nexora-delete-comment', { 
                                  detail: { postId: currentPost.id, commentIndex } 
                                }));
                              }
                            }}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors rounded-md hover:bg-white/5 cursor-pointer"
                            title="Delete comment"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-xs text-slate-200 pl-9 font-sans">{c.content}</p>

                    {/* Standard Threaded/Nested Replies */}
                    {c.replies && c.replies.length > 0 && (
                      <div className="pl-9 space-y-2.5 pt-1.5 border-l border-white/10 ml-3.5">
                        {c.replies.map(rep => (
                          <div key={rep.id} className="text-xs bg-white/2 p-2 rounded-xl border border-white/3">
                            <div 
                              className="flex items-center gap-2 mb-1 cursor-pointer group/replyuser"
                              onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                                window.dispatchEvent(new CustomEvent('nexora-view-profile', { detail: { userIdOrUsername: rep.userId || rep.username } }));
                              }}
                            >
                              <img src={rep.avatar} alt={rep.name} className="w-5 h-5 rounded-md object-cover ring-1 ring-violet-500/20" />
                              <div>
                                <span className="font-sans font-black text-violet-200 text-[11px] group-hover/replyuser:underline">{rep.name}</span>
                                <span className="text-[9px] font-mono text-violet-400/50 block group-hover/replyuser:underline">
                                  @{rep.username} • <RelativeTime timestamp={rep.timestamp} />
                                </span>
                              </div>
                            </div>
                            <p className="text-violet-200 pl-7 text-[11.5px] leading-relaxed">{rep.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply compose activator */}
                    <div className="pl-9">
                      {activeReplyFieldId === c.id ? (
                        <div className="flex gap-2 mt-2">
                          <input 
                            type="text"
                            placeholder="Write nested thread reply..."
                            value={replyInputs[c.id] || ''}
                            onChange={(e) => setReplyInputs(prev => ({ ...prev, [c.id]: e.target.value }))}
                            onKeyDown={(e) => { if(e.key === 'Enter') handleSendReply(c.id); }}
                            className="flex-1 nx-field py-1 px-3 text-xs text-white"
                          />
                          <button 
                            onClick={() => handleSendReply(c.id)}
                            className="bg-violet-600 hover:bg-violet-500 p-1.5 rounded-xl text-white cursor-pointer"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setActiveReplyFieldId(null)}
                            className="text-violet-400 text-xs hover:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setActiveReplyFieldId(c.id)}
                          className="text-[10px] font-mono text-violet-400 hover:text-white flex items-center gap-1 mt-1 cursor-pointer"
                        >
                          Reply to Thread 💬
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Main comment form */}
              <div className="flex items-center gap-2 pt-2 border-t border-white/5 shrink-0">
                <input 
                  type="text"
                  placeholder="Add a friendly comment..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter') handleSendComment(); }}
                  className="flex-1 nx-field py-2 px-4 text-xs text-white placeholder-zinc-500"
                />
                <button 
                  onClick={handleSendComment}
                  className="nx-btn-primary !min-h-0 py-2 px-4 text-xs"
                >
                  <span>Send</span>
                  <Send className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
