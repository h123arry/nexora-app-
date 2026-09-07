import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft, ChevronRight, Zap, Trash, Send, MessageSquare } from 'lucide-react';
import { Post, User } from '../types';
import NexoraVideoPlayer from './NexoraVideoPlayer';
import NexoraImagePlayer from './NexoraImagePlayer';
import RelativeTime from './RelativeTime';

interface ImmersiveVideoViewerProps {
  initialPost: Post;
  creatorPosts: Post[];
  currentUser: User;
  onClose: () => void;
  onLikePost: (postId: string) => void;
  onToggleFollow?: (userId: string) => void;
  isFollowing?: boolean;
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
  onAddComment
}: ImmersiveVideoViewerProps) {
  if (!initialPost) {
    return (
      <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center text-white">
        <p className="text-sm font-mono mb-4">Post unavailable.</p>
        <button onClick={onClose} className="px-4 py-2 bg-violet-600 rounded-xl text-xs font-bold cursor-pointer">Close</button>
      </div>
    );
  }

  // Filter posts with videoUrl or media, and guarantee the clicked initialPost is included
  const postsToShow = useMemo(() => {
    const list = (creatorPosts || []).filter(p => p && (p.videoUrl || p.image || p.id === initialPost.id));
    if (initialPost && !list.some(p => p.id === initialPost.id)) {
      return [initialPost, ...list];
    }
    return list.length > 0 ? list : [initialPost];
  }, [creatorPosts, initialPost]);

  // Initialize strictly with initialPost index
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (initialPost?.id) {
      const startIdx = postsToShow.findIndex(p => p && p.id === initialPost.id);
      if (startIdx >= 0) return startIdx;
    }
    return 0;
  });

  // Sync index whenever initialPost ID changes
  useEffect(() => {
    if (initialPost?.id) {
      const idx = postsToShow.findIndex(p => p && p.id === initialPost.id);
      if (idx >= 0) {
        setCurrentIndex(idx);
      }
    }
  }, [initialPost?.id, postsToShow]);

  // Listen for post deletions while viewer is open to avoid crashing
  useEffect(() => {
    const handleDeleteEvent = (e: Event) => {
      const { postId } = (e as CustomEvent).detail || {};
      if (!postId) return;
      if (postsToShow.length <= 1) {
        onClose();
      } else {
        setCurrentIndex(prev => Math.max(0, Math.min(prev, postsToShow.length - 2)));
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
        <p className="text-sm font-mono mb-4">Video stream unavailable.</p>
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

  // Handle wheel scrolling on desktop
  const wheelTimerRef = useRef<any>(null);
  const handleWheel = (e: React.WheelEvent) => {
    if (isCommentsOpen) return;
    if (wheelTimerRef.current) return;
    if (Math.abs(e.deltaY) > 25) {
      wheelTimerRef.current = setTimeout(() => {
        wheelTimerRef.current = null;
      }, 350);
      if (e.deltaY > 0 && currentIndex < postsToShow.length - 1) {
        handleNext();
      } else if (e.deltaY < 0 && currentIndex > 0) {
        handlePrev();
      }
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        if (currentIndex > 0) {
          setCurrentIndex(prev => prev - 1);
          setIsCommentsOpen(false);
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        if (currentIndex < postsToShow.length - 1) {
          setCurrentIndex(prev => prev + 1);
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
      setCurrentIndex(currentIndex + 1);
      setIsCommentsOpen(false);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsCommentsOpen(false);
    }
  };

  const handleLike = async () => {
    setIsProcessing(true);
    await onLikePost(currentPost.id);
    setIsProcessing(false);
  };

  // Touch/Swipe Gesture Detection Engine
  const touchStartY = useRef(0);
  const touchStartX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;

    // Distinguish scrolling up/down or swiping left/right
    if (Math.abs(diffY) > 50 && Math.abs(diffY) > Math.abs(diffX)) {
      if (diffY > 0 && currentIndex < postsToShow.length - 1) {
        handleNext();
      } else if (diffY < 0 && currentIndex > 0) {
        handlePrev();
      }
    } else if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX > 0 && currentIndex < postsToShow.length - 1) {
        handleNext();
      } else if (diffX < 0 && currentIndex > 0) {
        handlePrev();
      }
    }
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

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center overflow-hidden h-[100dvh] w-full select-none"
    >
      {/* Absolute Exit / Close button in top-right */}
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 p-2.5 bg-black/40 hover:bg-black/80 text-white rounded-full border border-white/10 backdrop-blur-md transition-all shadow-md active:scale-95 cursor-pointer"
        title="Exit player"
      >
        <X className="w-5 h-5" />
      </button>

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

      {/* Interactive Edge-to-Edge Fullscreen Player Stage */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
        className="w-full h-full bg-black relative flex flex-col justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {postsToShow.map((post, idx) => {
          if (!post.videoUrl) return null;
          const isCurrent = idx === currentIndex;
          const isNearby = idx >= currentIndex - 1 && idx <= currentIndex + 3;
          if (!isNearby) return null;

          return (
            <div 
              key={post.id} 
              className="w-full h-full" 
              style={{ display: isCurrent ? 'block' : 'none' }}
            >
              <NexoraVideoPlayer
                post={post}
                videoUrl={post.videoUrl}
                onOpenFullscreen={() => {}}
                onSpark={handleLike}
                isProcessing={isProcessing}
                isActive={isCurrent}
                preloadMode={isCurrent ? "auto" : "metadata"}
                shouldPreload={true}
                isFollowing={isFollowing}
                onToggleFollow={onToggleFollow ? () => onToggleFollow(post.userId || post.id) : undefined}
                onCommentToggle={() => setIsCommentsOpen(!isCommentsOpen)}
                isCommentsOpen={isCommentsOpen}
                onNotInterested={handleNext}
                onViewProfile={(userId) => {
                  onClose();
                  window.dispatchEvent(new CustomEvent('nexora-view-profile', { detail: { userIdOrUsername: userId || post.userId || post.username } }));
                }}
              />
            </div>
          );
        })}
        
        {!currentPost.videoUrl && (currentPost.image || (currentPost.images && currentPost.images.length > 0)) ? (
          <div className="w-full h-full">
            <NexoraImagePlayer
              post={currentPost}
              image={currentPost.image}
              images={currentPost.images}
              onSpark={handleLike}
              isProcessing={isProcessing}
              isFollowing={isFollowing}
              onToggleFollow={onToggleFollow ? () => onToggleFollow(currentPost.userId || currentPost.id) : undefined}
              onCommentToggle={() => setIsCommentsOpen(!isCommentsOpen)}
              isCommentsOpen={isCommentsOpen}
              onNotInterested={handleNext}
              onViewProfile={(userId) => {
                onClose();
                window.dispatchEvent(new CustomEvent('nexora-view-profile', { detail: { userIdOrUsername: userId || currentPost.userId || currentPost.username } }));
              }}
            />
          </div>
        ) : !currentPost.videoUrl ? (
          <div className="w-full p-6 text-center select-none flex flex-col items-center justify-center h-full">
            <p className="text-white text-base font-sans leading-relaxed font-bold px-4">{currentPost.content}</p>
          </div>
        ) : null}

        {/* THREADED COMMENTS DRAWER ACCORDION OVERLAY */}
        <AnimatePresence>
          {isCommentsOpen && (
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 220 }}
              className="comments-container absolute bottom-0 inset-x-0 h-[65%] rounded-t-[32px] bg-zinc-950/95 backdrop-blur-2xl border-t border-white/10 z-40 flex flex-col p-5 shadow-md overflow-hidden"
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
                            className="flex-1 bg-slate-900 border border-white/10 rounded-xl py-1 px-3 text-xs text-white focus:outline-hidden"
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
                  className="flex-1 bg-slate-950 border border-white/10 rounded-2xl py-2 px-4 text-xs text-white placeholder-zinc-500 focus:outline-hidden focus:border-white/10"
                />
                <button 
                  onClick={handleSendComment}
                  className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-mono font-bold text-xs px-4 py-2 rounded-2xl transition-all flex items-center gap-1 cursor-pointer"
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
