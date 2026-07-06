import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Heart, MessageSquare, Share2, Bookmark, Eye, 
  ChevronLeft, ChevronRight, UserPlus, Clock, Play
} from 'lucide-react';
import { Post, User } from '../types';
import NexoraVideoPlayer from './NexoraVideoPlayer';
import RelativeTimestamp from './RelativeTimestamp';

interface ImmersiveVideoViewerProps {
  initialPost: Post;
  creatorPosts: Post[];
  onClose: () => void;
  onLikePost: (postId: string) => void;
  onToggleFollow?: (userId: string) => void;
  isFollowing?: boolean;
}

export default function ImmersiveVideoViewer({
  initialPost,
  creatorPosts,
  onClose,
  onLikePost,
  onToggleFollow,
  isFollowing = false
}: ImmersiveVideoViewerProps) {
  // Only include posts that have videoUrl for the swipeable list
  const videoPosts = creatorPosts.filter(p => p.videoUrl);
  
  // Find initial index
  const startIndex = videoPosts.findIndex(p => p.id === initialPost.id);
  const [currentIndex, setCurrentIndex] = useState(startIndex >= 0 ? startIndex : 0);
  
  // If the initial post wasn't a video, we just show it alone as a fallback, 
  // but this component is intended primarily for videos.
  const postsToShow = videoPosts.length > 0 && startIndex >= 0 ? videoPosts : [initialPost];
  const currentPost = postsToShow[currentIndex];

  const [viewsCount, setViewsCount] = useState(currentPost?.views || 0);

  useEffect(() => {
    setViewsCount(currentPost?.views || 0);
  }, [currentPost]);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < postsToShow.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const formatVal = (val: number) => {
    if (val >= 1000000) return (val / 1000000).toFixed(1) + 'M';
    if (val >= 1000) return (val / 1000).toFixed(1) + 'K';
    return val.toString();
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const handleLike = async () => {
    setIsProcessing(true);
    await onLikePost(currentPost.id);
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col md:flex-row">
      {/* Video Player Section - takes up full mobile screen or left side on desktop */}
      <div className="relative flex-1 h-full bg-black flex items-center justify-center overflow-hidden">
        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <button 
            onClick={handlePrev}
            className="absolute left-4 z-20 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-all hidden md:block"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        
        {currentIndex < postsToShow.length - 1 && (
          <button 
            onClick={handleNext}
            className="absolute right-4 z-20 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-all hidden md:block"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}

        <button 
          onClick={onClose}
          className="absolute top-6 left-4 z-20 p-2 bg-black/50 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-all md:hidden"
        >
          <X className="w-5 h-5" />
        </button>

        {currentPost.videoUrl ? (
          <div className="w-full h-full max-w-[500px] mx-auto relative">
            <NexoraVideoPlayer
              post={currentPost}
              videoUrl={currentPost.videoUrl}
              onOpenFullscreen={() => {}}
              onSpark={handleLike}
              isProcessing={isProcessing}
              isActive={true}
              preloadMode="auto"
            />
          </div>
        ) : (
          <div className="w-full max-w-lg mx-auto p-4 relative">
             {currentPost.image && (
                <img src={currentPost.image} className="w-full rounded-2xl object-cover mb-4" alt="content" />
             )}
             <p className="text-white text-lg">{currentPost.content}</p>
          </div>
        )}
      </div>

      {/* Analytics & Interaction Sidebar (Visible on desktop, overlay on mobile?) 
          Let's make it a sidebar on md+ and a bottom sheet on mobile. */}
      <div className="w-full md:w-[400px] h-1/2 md:h-full bg-[#0b0922] border-t md:border-t-0 md:border-l border-white/10 flex flex-col z-20 shrink-0 absolute bottom-0 md:relative">
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <img src={currentPost.avatar} className="w-10 h-10 rounded-xl object-cover border border-white/10" alt="avatar" />
            <div>
              <h4 className="text-sm font-sans font-black text-white">{currentPost.name}</h4>
              <p className="text-xs font-mono text-zinc-400">@{currentPost.username}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {!isFollowing && onToggleFollow && (
               <button 
                 onClick={() => onToggleFollow(currentPost.userId || currentPost.id)}
                 className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-black uppercase tracking-wide transition-all"
               >
                 Follow
               </button>
            )}
            <button 
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white hidden md:block transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Detailed Stats Pane */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h3 className="text-xs font-mono font-black text-zinc-500 uppercase tracking-widest mb-3">Analytics Preview</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/30 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-400"><Eye className="w-4 h-4" /></div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Total Views</p>
                  <p className="text-lg font-black text-white">{formatVal(viewsCount)}</p>
                </div>
              </div>
              <div className="bg-black/30 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
                <div className="p-2 bg-pink-500/10 rounded-xl text-pink-400"><Heart className="w-4 h-4" /></div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Sparks</p>
                  <p className="text-lg font-black text-white">{formatVal(currentPost.likes || 0)}</p>
                </div>
              </div>
              <div className="bg-black/30 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
                <div className="p-2 bg-violet-500/10 rounded-xl text-violet-400"><MessageSquare className="w-4 h-4" /></div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Comments</p>
                  <p className="text-lg font-black text-white">{formatVal(currentPost.commentsCount || currentPost.comments?.length || 0)}</p>
                </div>
              </div>
              <div className="bg-black/30 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400"><Share2 className="w-4 h-4" /></div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Shares</p>
                  <p className="text-lg font-black text-white">{formatVal(currentPost.shares || 0)}</p>
                </div>
              </div>
              <div className="bg-black/30 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-400"><Bookmark className="w-4 h-4" /></div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Saves</p>
                  <p className="text-lg font-black text-white">{formatVal(currentPost.saves || 0)}</p>
                </div>
              </div>
              <div className="bg-black/30 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
                <div className="p-2 bg-zinc-500/10 rounded-xl text-zinc-400"><Clock className="w-4 h-4" /></div>
                <div>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase">Uploaded</p>
                  <p className="text-xs font-black text-white mt-1"><RelativeTimestamp timestamp={currentPost.timestamp} /></p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 bg-black/20 p-3 rounded-xl border border-white/5">
               <p className="text-xs text-zinc-400 font-mono">Posted: <RelativeTimestamp timestamp={currentPost.timestamp} /></p>
            </div>
          </div>
          
          <div>
            <h3 className="text-xs font-mono font-black text-zinc-500 uppercase tracking-widest mb-3">Caption</h3>
            <p className="text-sm font-sans text-zinc-200 leading-relaxed whitespace-pre-wrap">
              {currentPost.content}
            </p>
          </div>
        </div>
      </div>
      
      {/* Mobile navigation overlays */}
      <div className="absolute top-1/3 left-2 z-30 md:hidden">
         {currentIndex > 0 && (
          <button 
            onClick={handlePrev}
            className="p-2 bg-black/40 rounded-full text-white backdrop-blur-sm"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
      </div>
      <div className="absolute top-1/3 right-2 z-30 md:hidden">
        {currentIndex < postsToShow.length - 1 && (
          <button 
            onClick={handleNext}
            className="p-2 bg-black/40 rounded-full text-white backdrop-blur-sm"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </div>
  );
}
