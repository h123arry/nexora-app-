import React, { useRef, useState, useEffect } from 'react';
import { recordRecommendationEvent } from '../utils/recommendations';
import { useResolvedUrl } from '../utils/indexedDbStorage';
import { globalVideoPlaybackManager } from '../utils/VideoPlaybackManager';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  Bookmark, 
  Check, 
  Plus, 
  FolderHeart, 
  Download, 
  Settings,
  MoreVertical,
  Radio,
  Zap,
  RotateCcw,
  Heart,
  MessageSquare,
  Share2,
  Music,
  X,
  AlertTriangle,
  EyeOff,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Post {
  id: string;
  username: string;
  name: string;
  avatar: string;
  content: string;
  videoUrl?: string;
  likes: number;
  comments: any[];
  tags: string[];
  userId?: string;
  bookmarksCount?: number;
  shares?: number;
  isLikedByUser?: boolean;
  isVerified?: boolean;
}

interface NexoraVideoPlayerProps {
  post: Post;
  videoUrl: string;
  onOpenFullscreen: () => void;
  onSpark: () => void;
  isActive?: boolean;
  preloadMode?: 'auto' | 'metadata' | 'none';
  isReleased?: boolean;
  isFollowing?: boolean;
  onToggleFollow?: () => void;
  onCommentToggle?: () => void;
  isCommentsOpen?: boolean;
  onNotInterested?: () => void;
  onViewProfile?: (userId: string) => void;
}

export default function NexoraVideoPlayer({
  post,
  videoUrl,
  onOpenFullscreen,
  onSpark,
  isActive,
  preloadMode,
  isReleased,
  isFollowing = false,
  onToggleFollow,
  onCommentToggle,
  isCommentsOpen = false,
  onNotInterested,
  onViewProfile
}: NexoraVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate a unique player ID for this player instance to avoid any collisions
  const playerId = useRef(`player-${post.id}-${Math.random().toString(36).substring(2, 11)}`).current;
  const [isNearby, setIsNearby] = useState(false);

  const resolvedUrl = useResolvedUrl(videoUrl);
  const finalVideoUrl = videoUrl?.startsWith('db-media://') ? resolvedUrl : videoUrl;

  // Connection & Speed playback status states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    return globalVideoPlaybackManager.getMute();
  });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [showTapForSound, setShowTapForSound] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showLongPressMenu, setShowLongPressMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState<'1080p' | '720p' | '480p' | 'Auto'>('Auto');
  const [isSwitchingQuality, setIsSwitchingQuality] = useState(false);
  
  // Double-tap pulse effect
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<any>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Save System & custom collections list
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [collections, setCollections] = useState<string[]>(() => {
    const saved = localStorage.getItem('nexora_collections_list');
    return saved ? JSON.parse(saved) : ['Favorites 🌟', 'Football ⚽', 'Business 💼'];
  });
  const [newCollectionName, setNewCollectionName] = useState('');
  const [savedCollectionForThis, setSavedCollectionForThis] = useState<string | null>(() => {
    const savedMapping = localStorage.getItem(`nexora_saved_mapping_${post.id}`);
    return savedMapping || null;
  });

  // Creator options
  const [commentsOn, setCommentsOn] = useState(true);
  const [downloadsOn, setDownloadsOn] = useState(true);
  const [showCreatorToggles, setShowCreatorToggles] = useState(false);

  // Watch duration log trigger state
  const viewLoggedRef = useRef(false);
  const watchCompletedRef = useRef(false);
  const playStartedTimeRef = useRef<number>(0);
  const [showPlayStateIndicator, setShowPlayStateIndicator] = useState<'play' | 'pause' | null>(null);

  const handleVolumeToggle = (forcedMute?: boolean) => {
    const newMuted = forcedMute !== undefined ? forcedMute : !isMuted;
    globalVideoPlaybackManager.setMute(newMuted);
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
    if (!newMuted) {
      localStorage.setItem('nexora_unmuted_once', 'true');
      setAutoplayBlocked(false);
    }
  };

  // Manage first-time user "Tap for Sound" overlay fading
  useEffect(() => {
    if (isPlaying && isMuted) {
      const hasUnmutedOnce = localStorage.getItem('nexora_unmuted_once') === 'true';
      if (!hasUnmutedOnce) {
        setShowTapForSound(true);
        const timer = setTimeout(() => {
          setShowTapForSound(false);
        }, 4000); // Fades away after 4 seconds
        return () => clearTimeout(timer);
      }
    } else {
      setShowTapForSound(false);
    }
  }, [isPlaying, isMuted]);

  // Register this player instance with the global VideoPlaybackManager
  useEffect(() => {
    globalVideoPlaybackManager.register(playerId, {
      pause: () => {
        if (videoRef.current) {
          try {
            videoRef.current.pause();
          } catch (e) {}
        }
        setIsPlaying(false);
      },
      play: () => {
        if (videoRef.current && isNearby) {
          try {
            videoRef.current.play().catch(() => {});
          } catch (e) {}
        }
        setIsPlaying(true);
      },
      setVolumeMuted: (muted) => {
        setIsMuted(muted);
        if (videoRef.current) {
          videoRef.current.muted = muted;
        }
      }
    });

    return () => {
      globalVideoPlaybackManager.unregister(playerId);
    };
  }, [playerId, isNearby]);

  // Observer 1: Detect if video container is nearby (within 1 viewport height above/below)
  // Used for preloading / unloading (lazy loading far off-screen videos to free memory)
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsNearby(entry.isIntersecting);
        });
      },
      {
        rootMargin: '100% 0px', // 100% viewport margin (current & next/prev preloading)
        threshold: 0.0,
      }
    );

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Observer 2: Scroll-Based Playback: play only if >= 80% is visible.
  // If leaves viewport (< 80% visible), pause immediately and save position.
  useEffect(() => {
    if (!containerRef.current || !isNearby || !finalVideoUrl) {
      // If not nearby or no resolved URL yet, ensure paused
      globalVideoPlaybackManager.pause(playerId);
      setIsPlaying(false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.8) {
            if (videoRef.current && finalVideoUrl) {
              globalVideoPlaybackManager.play(playerId, videoRef.current, videoUrl)
                .then((played) => {
                  if (played) {
                    setIsPlaying(true);
                    playStartedTimeRef.current = Date.now();
                  }
                });
            }
          } else {
            globalVideoPlaybackManager.pause(playerId);
            setIsPlaying(false);
          }
        });
      },
      {
        threshold: [0.0, 0.8, 1.0] // Observe transition boundaries clearly
      }
    );

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, [playerId, videoUrl, isNearby, finalVideoUrl]);

  // Sync playback with isActive prop to guarantee zero sound bleed from inactive/hidden tabs
  useEffect(() => {
    if (!videoRef.current) return;
    if (isActive && finalVideoUrl) {
      if (isNearby) {
        globalVideoPlaybackManager.play(playerId, videoRef.current, videoUrl)
          .then((played) => {
            if (played) {
              setIsPlaying(true);
            }
          });
      }
    } else {
      globalVideoPlaybackManager.pause(playerId);
      setIsPlaying(false);
    }
  }, [isActive, isNearby, playerId, videoUrl, finalVideoUrl]);

  // Try recovering playback history on load
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    
    // Read saved positions
    const savedPos = globalVideoPlaybackManager.getPosition(videoUrl);
    if (savedPos > 0) {
      if (savedPos < videoRef.current.duration - 2) {
        videoRef.current.currentTime = savedPos;
        setCurrentTime(savedPos);
      }
    }
  };

  // periodic update to record position
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    localStorage.setItem(`nexora_vid_pos_${videoUrl}`, String(time));

    // Reset watchCompletedRef if wrapped/replayed
    if (time < 0.5 && watchCompletedRef.current) {
      watchCompletedRef.current = false;
    }

    // Detect complete watch
    if (duration > 0 && time > duration - 0.5) {
      if (!watchCompletedRef.current) {
        watchCompletedRef.current = true;
        recordRecommendationEvent('watch_complete', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username });
      }
    }

    // Watch History: Log view when watched for more than 3 seconds (Meaningful watch duration)
    if (time > 3.0 && !viewLoggedRef.current) {
      viewLoggedRef.current = true;
      logToWatchHistory();
    }
  };

  // Add video metadata to Watch History in localStorage
  const logToWatchHistory = () => {
    try {
      const historyJson = localStorage.getItem('nexora_watch_history');
      let historyList = historyJson ? JSON.parse(historyJson) : [];
      
      // Filter existing item to move to top of queue
      historyList = historyList.filter((item: any) => item.postId !== post.id);
      
      const newItem = {
        postId: post.id,
        videoUrl,
        username: post.username,
        name: post.name,
        avatar: post.avatar,
        content: post.content,
        timestamp: Date.now(),
        duration: videoRef.current?.duration || 0,
        progress: videoRef.current?.currentTime || 0
      };
      
      historyList.unshift(newItem);
      // Cap at 15 items
      if (historyList.length > 15) historyList.pop();
      
      localStorage.setItem('nexora_watch_history', JSON.stringify(historyList));
      // Dispatch event to refresh Watch History lists in UI
      window.dispatchEvent(new CustomEvent('update-watch-history'));
    } catch (e) {
      console.error("Watch history saving issue", e);
    }
  };

  // Periodic triggers for watch history updates
  useEffect(() => {
    if (currentTime > 0 && Math.floor(currentTime) % 3 === 0) {
      // Periodic save current progress to watch history if already logged
      if (viewLoggedRef.current) {
        logToWatchHistory();
      }
    }
  }, [currentTime]);

  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      globalVideoPlaybackManager.pause(playerId);
      setIsPlaying(false);
      setShowPlayStateIndicator('pause');
    } else {
      // If muted because of autoplay, let's unmute on user's direct play request!
      if (autoplayBlocked && isMuted) {
        handleVolumeToggle(false);
      }
      
      globalVideoPlaybackManager.play(playerId, videoRef.current, videoUrl)
        .then((played) => {
          if (played) {
            setIsPlaying(true);
            setShowPlayStateIndicator('play');
          }
        });
    }
    setTimeout(() => {
      setShowPlayStateIndicator(null);
    }, 600);
  };

  // Handle single tap, double tap, and long press gestures
  const handleTapOrGesture = (e: React.MouseEvent<HTMLDivElement>) => {
    const clickArea = containerRef.current?.getBoundingClientRect();
    if (!clickArea) return;

    // Relative mouse taps
    const x = e.clientX - clickArea.left;
    const y = e.clientY - clickArea.top;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // DOUBLE TAP: Spark post
      setHeartPosition({ x, y });
      setShowDoubleTapHeart(true);
      onSpark();
      recordRecommendationEvent('spark', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username });

      // If autoplay was blocked and we are muted, double tap to like can also unmute beautifully!
      if (autoplayBlocked && isMuted) {
        handleVolumeToggle(false);
      }

      // Clear double-tap heart visual after 1000ms
      setTimeout(() => setShowDoubleTapHeart(false), 800);
      lastTapRef.current = 0;
    } else {
      // If autoplay was blocked and we single tap, unmute immediately rather than toggling playback
      if (autoplayBlocked && isMuted) {
        handleVolumeToggle(false);
      } else {
        // SINGLE TAP: Toggle playback/pause
        togglePlayback();
      }
    }
    lastTapRef.current = now;
  };

  // Long press hold-to-pause triggers while holding, but avoids intercepting vertical scrolling swipes
  const handleStartHold = (e: any) => {
    if (e.type === 'mousedown' && e.button !== 0) return;

    const touch = e.touches ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : e.clientX;
    const clientY = touch ? touch.clientY : e.clientY;

    touchStartRef.current = { x: clientX, y: clientY };
    setIsLongPressing(false);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = setTimeout(() => {
      if (!videoRef.current) return;
      setIsLongPressing(true);
      setShowLongPressMenu(true);
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(false);
    }, 1500); // 1.5 seconds is perfect for natural, comfortable long-press discovery!
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    // If movement is > 10px, the user is swiping/scrolling. Cancel long-press to let native scroll work smoothly!
    if (deltaY > 10 || deltaX > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      touchStartRef.current = null;
    }
  };

  const handleReleaseHold = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartRef.current = null;
    if (isLongPressing && !showLongPressMenu) {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      setIsLongPressing(false);
      setShowControls(true);
    }
  };

  // Passive touch event listeners to ensure native vertical scrolling is never blocked on mobile/Android
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onTouchStart = (e: TouchEvent) => {
      handleStartHold(e);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // If vertical movement is detected, cancel the hold-to-pause timers instantly to let native scroll take over smoothly
      if (deltaY > 8 || deltaX > 8) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        touchStartRef.current = null;
      }
    };

    const onTouchEnd = () => {
      handleReleaseHold();
    };

    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: true });
    element.addEventListener('touchend', onTouchEnd, { passive: true });
    element.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isLongPressing, showLongPressMenu]);

  // Seek bar scrub action
  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const seekTo = parseFloat(e.target.value);
    videoRef.current.currentTime = seekTo;
    setCurrentTime(seekTo);
  };

  // Simulated quality switch
  const handleQualitySelect = (quality: '1080p' | '720p' | '480p' | 'Auto') => {
    setSelectedQuality(quality);
    setIsSwitchingQuality(true);
    
    const wasPlaying = isPlaying;
    if (videoRef.current) {
      videoRef.current.pause();
    }

    setTimeout(() => {
      setIsSwitchingQuality(false);
      if (wasPlaying && videoRef.current) {
        videoRef.current.play().catch(() => {});
      }
      window.dispatchEvent(
        new CustomEvent('toast', { detail: `✨ Video quality updated to ${quality}!` })
      );
    }, 900);
  };

  // Add the post URL to a bookmark collection
  const handleSaveToCollection = (collection: string) => {
    localStorage.setItem(`nexora_saved_mapping_${post.id}`, collection);
    setSavedCollectionForThis(collection);
    recordRecommendationEvent('save', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username });

    // Record list of posts inside this collection
    try {
      const savedCollectionPosts = localStorage.getItem(`nexora_col_posts_${collection}`);
      const postsList = savedCollectionPosts ? JSON.parse(savedCollectionPosts) : [];
      
      if (!postsList.some((p: any) => p.id === post.id)) {
        postsList.push({
          id: post.id,
          username: post.username,
          name: post.name,
          avatar: post.avatar,
          content: post.content,
          videoUrl,
          likes: post.likes
        });
        localStorage.setItem(`nexora_col_posts_${collection}`, JSON.stringify(postsList));
      }
      
      window.dispatchEvent(new CustomEvent('toast', { detail: `📂 Saved video to "${collection}" successfully!` }));
      window.dispatchEvent(new CustomEvent('update-collections'));
    } catch (err) {
      console.error(err);
    }
    setShowSaveModal(false);
  };

  // Create an entirely custom new collection
  const handleCreateNewCollection = () => {
    if (!newCollectionName.trim()) return;
    const updated = [...collections, newCollectionName.trim()];
    setCollections(updated);
    localStorage.setItem('nexora_collections_list', JSON.stringify(updated));
    handleSaveToCollection(newCollectionName.trim());
    setNewCollectionName('');
  };

  // Download simulation
  const handleSimulateDownload = () => {
    if (!downloadsOn) {
      window.dispatchEvent(new CustomEvent('toast', { detail: '🔒 Downloads are restricted of this video by creator settings!' }));
      return;
    }
    window.dispatchEvent(new CustomEvent('toast', { detail: '📥 Initializing metadata download packet... Saved offline!' }));
    // Simulate simple client cache download anchor
    const link = document.createElement('a');
    link.href = videoUrl;
    link.setAttribute('download', `nexora_video_${post.id}.mp4`);
    document.body.appendChild(link);
    // Suppress open errors because of iframe environments and resolve cleanly
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('toast', { detail: '✅ Video stream downloaded successfully.' }));
    }, 1500);
  };

  const handleOpenFullscreenWithSync = () => {
    if (videoRef.current) {
      (window as any).nexoraFullscreenSync = {
        postId: post.id,
        currentTime: videoRef.current.currentTime,
        isPlaying: isPlaying,
        isMuted: isMuted,
        videoElement: videoRef.current,
        onClose: (finalTime: number, finalIsPlaying: boolean, finalIsMuted: boolean) => {
          if (videoRef.current) {
            videoRef.current.currentTime = finalTime;
            setIsMuted(finalIsMuted);
            videoRef.current.muted = finalIsMuted;
            if (finalIsPlaying) {
              videoRef.current.play().catch(() => {});
              setIsPlaying(true);
            } else {
              videoRef.current.pause();
              setIsPlaying(false);
            }
          }
        }
      };
    }
    onOpenFullscreen();
  };

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleStartHold}
      onMouseUp={handleReleaseHold}
      onMouseLeave={handleReleaseHold}
      className="relative overflow-hidden bg-black select-none group w-full h-full flex items-center justify-center animate-fade-in touch-pan-y"
    >
       {/* Absolute Video Frame */}
       {finalVideoUrl ? (
          <>
            {/* Soft Ambient Contrast Gradients for Controls Readability */}
            <div className="bg-gradient-to-t from-black/90 via-black/25 to-transparent absolute bottom-0 inset-x-0 h-52 pointer-events-none z-10" />
            <div className="bg-gradient-to-l from-black/55 via-transparent to-transparent absolute right-0 inset-y-0 w-28 pointer-events-none z-10" />
            
            {/* Prevent Next-Video Bleeding, Glows, and Flickering (Solid Black cover when inactive) */}
            {!isActive && (
              <div className="absolute inset-0 bg-black z-30 pointer-events-none transition-opacity duration-300" />
            )}

            <video
              ref={videoRef}
              src={isNearby ? finalVideoUrl : undefined}
              loop
              playsInline
              preload={preloadMode || (isNearby ? "auto" : "none")}
              muted={isMuted}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onClick={handleTapOrGesture}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onCanPlay={() => setIsBuffering(false)}
              className="w-full h-full object-cover cursor-pointer"
            />
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs pointer-events-none z-10 animate-fade-in">
                <div className="flex flex-col items-center gap-2 bg-slate-950/80 border border-violet-500/25 px-4 py-3 rounded-2xl shadow-xl">
                  <div className="w-7 h-7 border-3 border-violet-500 border-t-transparent animate-spin rounded-full" />
                  <span className="text-[9px] font-mono font-bold tracking-widest text-violet-300 uppercase animate-pulse">Buffering...</span>
                </div>
              </div>
            )}

             {/* Right-Side Action Rail */}
            <div 
              className="absolute flex flex-col items-center gap-4.5 z-20"
              style={{
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 72px)',
                right: 'calc(env(safe-area-inset-right, 0px) + 14px)'
              }}
            >
              {/* ❤️ Spark */}
              <button 
                onClick={(e) => { e.stopPropagation(); onSpark(); }}
                className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/5 transition-all duration-300 scale-100 active:scale-90 shadow-lg ${post.isLikedByUser ? 'border-pink-500/30' : ''}`}>
                  <Zap className={`w-5 h-5 transition-transform duration-300 group-hover/btn:scale-110 ${post.isLikedByUser ? 'fill-pink-500 text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]' : 'text-white'}`} />
                </div>
                <span className="font-mono text-[10px] font-bold text-zinc-300 drop-shadow-md select-none">{post.likes}</span>
              </button>

              {/* 💬 Comment */}
              <button 
                onClick={(e) => { e.stopPropagation(); onCommentToggle?.(); }}
                className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/5 transition-all duration-300 scale-100 active:scale-90 shadow-lg ${isCommentsOpen ? 'border-violet-500/30 bg-violet-650/20' : ''}`}>
                  <MessageSquare className={`w-5 h-5 transition-transform duration-300 group-hover/btn:scale-110 text-white ${isCommentsOpen ? 'text-violet-400 fill-violet-500/20' : 'text-white'}`} />
                </div>
                <span className="font-mono text-[10px] font-bold text-zinc-300 drop-shadow-md select-none">{post.comments?.length || 0}</span>
              </button>

              {/* 🔖 Save */}
              <button 
                onClick={(e) => { e.stopPropagation(); setShowSaveModal(true); }}
                className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/5 transition-all duration-300 scale-100 active:scale-90 shadow-lg ${savedCollectionForThis ? 'border-yellow-500/30 bg-yellow-500/10' : ''}`}>
                  <Bookmark className={`w-5 h-5 transition-transform duration-300 group-hover/btn:scale-110 ${savedCollectionForThis ? 'fill-yellow-500 text-yellow-400' : 'text-white'}`} />
                </div>
                <span className="font-mono text-[10px] font-bold text-zinc-300 drop-shadow-md select-none">{post.bookmarksCount || 0}</span>
              </button>

              {/* ↗ Share */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  const text = `${window.location.origin}/post/${post.id}`;
                  navigator.clipboard.writeText(text);
                  window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Copy successful! Link stored in buffer.' }));
                  recordRecommendationEvent('share', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username });
                }}
                className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/5 transition-all duration-300 scale-100 active:scale-90 shadow-lg">
                  <Share2 className="w-5 h-5 text-white transition-transform duration-300 group-hover/btn:scale-110" />
                </div>
                <span className="font-mono text-[10px] font-bold text-zinc-300 drop-shadow-md select-none">{post.shares || 0}</span>
              </button>
            </div>

            {/* Bottom-Left Creator Info Overlay */}
            <div 
              className="absolute flex flex-col items-start gap-1.5 z-20 pointer-events-none text-left"
              style={{
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)',
                left: 'calc(env(safe-area-inset-left, 0px) + 14px)',
                right: 'calc(env(safe-area-inset-right, 0px) + 64px)'
              }}
            >
              <div className="flex items-center gap-2 pointer-events-auto">
                <img 
                  src={post.avatar} 
                  alt={post.name} 
                  className="w-8 h-8 rounded-lg object-cover border border-white/10 cursor-pointer shadow-md shrink-0 animate-fade-in"
                  onClick={() => onViewProfile?.(post.userId || '')}
                  referrerPolicy="no-referrer"
                />
                <div className="flex flex-col leading-tight cursor-pointer" onClick={() => onViewProfile?.(post.userId || '')}>
                  <div className="flex items-center gap-1">
                    <span className="font-sans font-extrabold text-xs text-white hover:text-violet-400 transition-colors drop-shadow-md">{post.name}</span>
                    {(post.isVerified || post.username === 'voh' || post.userId === 'user-0' || post.username === 'voh_ai' || post.username === 'nexora_ai' || post.username === 'lunash') && (
                      <CheckCircle className="w-3.5 h-3.5 text-violet-400 fill-current shrink-0" />
                    )}
                  </div>
                  <span className="text-[9.5px] font-mono text-zinc-300/80 drop-shadow-md">@{post.username}</span>
                </div>
                {onToggleFollow && post.userId !== 'user-0' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleFollow(); }}
                    className={`ml-2 px-2 py-0.5 rounded-md text-[8.5px] font-mono font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md shrink-0 ${
                      isFollowing 
                        ? 'bg-zinc-800/80 border border-zinc-700/50 text-violet-300' 
                        : 'bg-violet-600 hover:bg-violet-500 text-white'
                    }`}
                  >
                    {isFollowing ? '✓ Mutual' : '+ Follow'}
                  </button>
                )}
              </div>

              {/* Caption */}
              {post.content && (
                <p className="text-[11.5px] text-zinc-100 font-sans leading-relaxed drop-shadow-md select-text pointer-events-auto max-w-xs line-clamp-2">
                  {post.content}
                </p>
              )}

              {/* Hashtags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pointer-events-auto">
                  {post.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="text-[9px] font-mono text-violet-300 hover:text-white drop-shadow-md font-semibold"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Future-Ready Music Info */}
              <div className="flex items-center gap-1 text-[9px] font-mono text-violet-300 drop-shadow-md bg-black/35 backdrop-blur-xs px-2 py-0.5 rounded-full select-none max-w-[150px] truncate">
                <Music className="w-2.5 h-2.5 text-pink-400 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
                <span className="truncate">Original Sound - @{post.username}</span>
              </div>
            </div>
          </>
        ) : (
         <div className="w-full h-full bg-black/90 flex flex-col items-center justify-center gap-2">
           <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent animate-spin rounded-full" />
           <span className="text-[10px] font-mono text-violet-400">LOADING ENCRYPTED VIDEO FEED...</span>
         </div>
       )}

      {/* Tap for sound overlay */}
      <AnimatePresence>
        {showTapForSound && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={(e) => {
              e.stopPropagation();
              handleVolumeToggle(false);
            }}
            className="absolute inset-0 bg-black/30 flex items-center justify-center z-10 cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-purple-600/95 hover:bg-purple-500/95 backdrop-blur-md px-4 py-2.5 rounded-full border border-purple-400/30 text-white text-xs font-mono font-black uppercase tracking-widest flex items-center gap-2 shadow-lg"
            >
              <VolumeX className="w-4 h-4 animate-bounce" />
              <span>Tap for sound</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Switching Quality overlay indicator */}
      {isSwitchingQuality && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 z-20">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent animate-spin rounded-full" />
          <span className="text-[10px] font-mono text-purple-300 tracking-widest uppercase">STABILIZING {selectedQuality} CHANNEL...</span>
        </div>
      )}

      {/* Hold to Pause Overlay Indicator */}
      {isLongPressing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-zinc-300 font-extrabold flex items-center gap-1.5 z-20 shadow-lg pointer-events-none tracking-widest uppercase">
          <span>PAUSED (VIEW MODE)</span>
        </div>
      )}

      {/* DOUBLE TAP ANIMATED SPARK OR HEART */}
      <AnimatePresence>
        {showDoubleTapHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0, y: -20 }}
            animate={{ scale: [1, 1.3, 1], opacity: [1, 1, 0], y: -50 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{ 
              position: 'absolute',
              left: `${heartPosition.x - 30}px`, 
              top: `${heartPosition.y - 30}px`,
              zIndex: 30
            }}
            className="flex flex-col items-center justify-center leading-none pointer-events-none bg-purple-600/40 backdrop-blur-md p-3.5 rounded-full border border-purple-400/50"
          >
            <Zap className="w-8 h-8 text-pink-400 fill-current drop-shadow-[0_0_15px_rgba(236,72,153,0.8)]" />
            <span className="text-[8px] font-mono text-white font-black mt-1 uppercase tracking-wider">SPARKED</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Centered Play/Pause state tap indicator */}
      <AnimatePresence>
        {showPlayStateIndicator && (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            exit={{ scale: 1.4, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
          >
            <div className="p-4 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-xl">
              {showPlayStateIndicator === 'play' ? (
                <Play className="w-6 h-6 fill-current text-white ml-0.5" />
              ) : (
                <Pause className="w-6 h-6 fill-current text-white" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save to Collection Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => { e.stopPropagation(); setShowSaveModal(false); }}
              className="absolute inset-0 bg-black/75 backdrop-blur-xs z-45 flex items-center justify-center p-4 cursor-pointer"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-sm bg-[#0a071d]/95 border border-violet-500/25 p-5 rounded-3xl text-left shadow-2xl backdrop-blur-xl cursor-default"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-mono tracking-widest text-[#8B5CF6] font-extrabold uppercase flex items-center gap-1.5">
                    🔖 Save to Collection
                  </span>
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="p-1 rounded-full hover:bg-white/15 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Collections List */}
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1 mb-4">
                  {collections.map((col) => (
                    <button
                      key={col}
                      onClick={() => handleSaveToCollection(col)}
                      className={`w-full p-3 rounded-2xl text-left text-xs font-sans font-semibold flex items-center justify-between transition-all border cursor-pointer ${
                        savedCollectionForThis === col
                          ? 'bg-violet-600/25 border-violet-500/40 text-violet-200'
                          : 'bg-white/5 border-white/5 hover:border-violet-500/20 text-zinc-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>📁</span>
                        <span>{col}</span>
                      </div>
                      {savedCollectionForThis === col && (
                        <Check className="w-3.5 h-3.5 text-violet-400" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Create New Collection Form */}
                <div className="flex gap-2 pt-2 border-t border-white/5">
                  <input
                    type="text"
                    placeholder="New folder name..."
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="flex-1 bg-white/5 hover:bg-white/8 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-violet-500/40 font-sans"
                  />
                  <button
                    onClick={handleCreateNewCollection}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-sans font-extrabold cursor-pointer transition-colors shrink-0"
                  >
                    Create
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Polished Bottom Sheet for Long Press Menu */}
      <AnimatePresence>
        {showLongPressMenu && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                setShowLongPressMenu(false);
                if (videoRef.current && isPlaying) {
                  videoRef.current.play().catch(() => {});
                }
              }}
              className="absolute inset-0 bg-black/65 z-40 cursor-pointer backdrop-blur-xs"
            />
            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute bottom-0 inset-x-0 bg-[#0c0a21]/95 border-t border-violet-500/20 rounded-t-3xl p-5 z-50 text-left shadow-2xl backdrop-blur-xl"
            >
              {/* Drag Handle */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-5" />
              
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-mono font-bold tracking-widest text-violet-400 uppercase">Video Actions</h4>
                <button
                  onClick={() => {
                    setShowLongPressMenu(false);
                    if (videoRef.current && isPlaying) {
                      videoRef.current.play().catch(() => {});
                    }
                  }}
                  className="p-1 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3">
                {/* Share */}
                <button
                  onClick={() => {
                    setShowLongPressMenu(false);
                    const text = `${window.location.origin}/post/${post.id}`;
                    navigator.clipboard.writeText(text);
                    window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Copy successful! Link stored in buffer.' }));
                    recordRecommendationEvent('share', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username });
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-violet-500/30 rounded-2xl transition-all cursor-pointer group"
                >
                  <Share2 className="w-5 h-5 text-zinc-300 group-hover:text-violet-400 transition-colors mb-1.5" />
                  <span className="text-[10px] font-sans font-medium text-zinc-400 group-hover:text-zinc-200">Share</span>
                </button>

                {/* Save */}
                <button
                  onClick={() => {
                    setShowLongPressMenu(false);
                    setShowSaveModal(true);
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-violet-500/30 rounded-2xl transition-all cursor-pointer group"
                >
                  <Bookmark className="w-5 h-5 text-zinc-300 group-hover:text-violet-400 transition-colors mb-1.5" />
                  <span className="text-[10px] font-sans font-medium text-zinc-400 group-hover:text-zinc-200">Save</span>
                </button>

                {/* Copy Link */}
                <button
                  onClick={() => {
                    setShowLongPressMenu(false);
                    const text = `${window.location.origin}/post/${post.id}`;
                    navigator.clipboard.writeText(text);
                    window.dispatchEvent(new CustomEvent('toast', { detail: '🔗 Copy successful! Link stored in buffer.' }));
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-violet-500/30 rounded-2xl transition-all cursor-pointer group"
                >
                  <Check className="w-5 h-5 text-zinc-300 group-hover:text-violet-400 transition-colors mb-1.5" />
                  <span className="text-[10px] font-sans font-medium text-zinc-400 group-hover:text-zinc-200">Copy Link</span>
                </button>

                {/* Download */}
                <button
                  onClick={() => {
                    setShowLongPressMenu(false);
                    handleSimulateDownload();
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-violet-500/30 rounded-2xl transition-all cursor-pointer group"
                >
                  <Download className="w-5 h-5 text-zinc-300 group-hover:text-violet-400 transition-colors mb-1.5" />
                  <span className="text-[10px] font-sans font-medium text-zinc-400 group-hover:text-zinc-200">Download</span>
                </button>

                {/* Report */}
                <button
                  onClick={() => {
                    setShowLongPressMenu(false);
                    window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Report received! Our moderation team is investigating.' }));
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-red-950/20 border border-white/5 hover:border-red-500/30 rounded-2xl transition-all cursor-pointer group"
                >
                  <AlertTriangle className="w-5 h-5 text-zinc-300 group-hover:text-red-400 transition-colors mb-1.5" />
                  <span className="text-[10px] font-sans font-medium text-zinc-400 group-hover:text-red-200">Report</span>
                </button>

                {/* Not Interested */}
                <button
                  onClick={() => {
                    setShowLongPressMenu(false);
                    if (onNotInterested) {
                      onNotInterested();
                    } else {
                      window.dispatchEvent(new CustomEvent('toast', { detail: '👎 Not interested. Tailoring your feed.' }));
                    }
                  }}
                  className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-zinc-900 border border-white/5 hover:border-zinc-500/30 rounded-2xl transition-all cursor-pointer group"
                >
                  <EyeOff className="w-5 h-5 text-zinc-300 group-hover:text-zinc-400 transition-colors mb-1.5" />
                  <span className="text-[10px] font-sans font-medium text-zinc-400 group-hover:text-zinc-200">Not Interested</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Bottom custom simplified controls block */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
        {/* Maximize / Fullscreen Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleOpenFullscreenWithSync();
          }}
          className="p-2 bg-black/60 hover:bg-black/85 border border-white/10 backdrop-blur-md rounded-full text-white transition-all cursor-pointer active:scale-90 shadow-md"
          title="Expand Full Immersive Player Mode"
        >
          <Maximize2 className="w-3.5 h-3.5 text-violet-300" />
        </button>
      </div>

      {/* Thin elegant progress bar indicator at the very bottom edge of the player */}
      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 z-10 pointer-events-none">
        <div 
          className="h-full bg-linear-to-r from-violet-600 via-pink-500 to-cyan-400 transition-all duration-100"
          style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
