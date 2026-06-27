import React, { useRef, useState, useEffect } from 'react';
import { recordRecommendationEvent } from '../utils/recommendations';
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
  RotateCcw
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
}

interface NexoraVideoPlayerProps {
  post: Post;
  videoUrl: string;
  onOpenFullscreen: () => void;
  onSpark: () => void;
  isActive?: boolean;
  preloadMode?: 'auto' | 'metadata' | 'none';
  isReleased?: boolean;
}

export default function NexoraVideoPlayer({
  post,
  videoUrl,
  onOpenFullscreen,
  onSpark,
  isActive,
  preloadMode,
  isReleased
}: NexoraVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Connection & Speed playback status states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    return localStorage.getItem('nexora_video_muted') !== 'false';
  });
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [showTapForSound, setShowTapForSound] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState<'1080p' | '720p' | '480p' | 'Auto'>('Auto');
  const [isSwitchingQuality, setIsSwitchingQuality] = useState(false);
  
  // Double-tap pulse effect
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);
  const longPressTimerRef = useRef<any>(null);

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
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
    localStorage.setItem('nexora_video_muted', newMuted ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent('nexora-volume-change', { detail: { muted: newMuted, senderId: post.id } })
    );
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

  // 1. Unified Play/Pause controller linked to viewport active state or fallback intersection
  useEffect(() => {
    if (!videoRef.current) return;

    if (isActive !== undefined) {
      if (isActive) {
        // Trigger customized global event to pause other players before entering local loop
        window.dispatchEvent(
          new CustomEvent('nexora-video-play', { detail: { url: videoUrl, id: post.id } })
        );

        // Sync current mute preference
        const isPrefMuted = localStorage.getItem('nexora_video_muted') !== 'false';
        setIsMuted(isPrefMuted);
        videoRef.current.muted = isPrefMuted;

        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            setIsPlaying(true);
            playStartedTimeRef.current = Date.now();
          }).catch((error) => {
            console.log("Autoplay failed. Retrying muted:", error);
            if (videoRef.current) {
              videoRef.current.muted = true;
              setIsMuted(true);
              videoRef.current.play()
                .then(() => {
                  setIsPlaying(true);
                  playStartedTimeRef.current = Date.now();
                })
                .catch(e => console.error("Muted play failed", e));
            }
          });
        }
      } else {
        if (!videoRef.current.paused) {
          const playDuration = (Date.now() - playStartedTimeRef.current) / 1000;
          if (playDuration > 0.2 && playDuration < 3.0) {
            recordRecommendationEvent('skip_quick', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username });
          }
        }
        videoRef.current.pause();
        setIsPlaying(false);
      }
      return;
    }

    // FALLBACK: If isActive is not specified, use a standard viewport observer
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            window.dispatchEvent(
              new CustomEvent('nexora-video-play', { detail: { url: videoUrl, id: post.id } })
            );

            const isPrefMuted = localStorage.getItem('nexora_video_muted') !== 'false';
            setIsMuted(isPrefMuted);
            if (videoRef.current) {
              videoRef.current.muted = isPrefMuted;
            }

            const playPromise = videoRef.current?.play();
            if (playPromise !== undefined) {
              playPromise.then(() => {
                setIsPlaying(true);
                playStartedTimeRef.current = Date.now();
              }).catch((error) => {
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  setIsMuted(true);
                  videoRef.current.play()
                    .then(() => {
                      setIsPlaying(true);
                      playStartedTimeRef.current = Date.now();
                    })
                    .catch(e => console.error(e));
                }
              });
            }
          } else {
            if (videoRef.current && !videoRef.current.paused) {
              const playDuration = (Date.now() - playStartedTimeRef.current) / 1000;
              if (playDuration > 0.2 && playDuration < 3.0) {
                recordRecommendationEvent('skip_quick', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username });
              }
            }
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.6 }
    );

    observer.observe(videoRef.current);
    return () => {
      observer.disconnect();
    };
  }, [videoUrl, post.id, isActive]);

  // 2. Global event listener to support "Only one video plays at a time"
  useEffect(() => {
    const handleGlobalPlay = (e: any) => {
      if (e.detail?.id !== post.id && videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };
    window.addEventListener('nexora-video-play', handleGlobalPlay);
    return () => {
      window.removeEventListener('nexora-video-play', handleGlobalPlay);
    };
  }, [post.id]);

  // Global Volume-sync listener
  useEffect(() => {
    const handleVolumeChange = (e: any) => {
      if (e.detail && e.detail.senderId !== post.id && videoRef.current) {
        const newMuted = e.detail.muted;
        setIsMuted(newMuted);
        videoRef.current.muted = newMuted;
        if (!newMuted) {
          setAutoplayBlocked(false);
        }
      }
    };
    window.addEventListener('nexora-volume-change', handleVolumeChange);
    return () => {
      window.removeEventListener('nexora-volume-change', handleVolumeChange);
    };
  }, [post.id]);

  // 3. Try recovering playback history on load
  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
    
    // Read saved positions
    const savedPos = localStorage.getItem(`nexora_vid_pos_${videoUrl}`);
    if (savedPos) {
      const position = parseFloat(savedPos);
      if (position < videoRef.current.duration - 2) {
        videoRef.current.currentTime = position;
        setCurrentTime(position);
      }
    }
  };

  // 4. periodic update to record position
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
      videoRef.current.pause();
      setIsPlaying(false);
      setShowPlayStateIndicator('pause');
    } else {
      window.dispatchEvent(
        new CustomEvent('nexora-video-play', { detail: { url: videoUrl, id: post.id } })
      );
      
      // If muted because of autoplay, let's unmute on user's direct play request!
      if (autoplayBlocked && isMuted) {
        handleVolumeToggle(false);
      }
      
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setShowPlayStateIndicator('play');
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

  // Long press hold-to-pause triggers while holding
  const handleStartHold = () => {
    longPressTimerRef.current = setTimeout(() => {
      if (!videoRef.current) return;
      setIsLongPressing(true);
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(false);
    }, 450);
  };

  const handleReleaseHold = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (isLongPressing) {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      setIsLongPressing(false);
      setShowControls(true);
    }
  };

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
        new CustomEvent('toast', { detail: `✨ Video telemetry stabilized: Switched to ${quality} resolution!` })
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

  if (isReleased) {
    return (
      <div 
        className="relative overflow-hidden rounded-none md:rounded-3xl border-y md:border border-violet-500/10 bg-zinc-950/95 select-none w-full h-full min-h-[240px] md:aspect-video flex flex-col items-center justify-center animate-fade-in"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b091e]/50 via-black to-[#070518]/50" />
        <div className="absolute inset-0 bg-violet-500/5 animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
          <div className="p-3.5 bg-violet-950/40 border border-violet-500/15 rounded-full text-violet-400/90 shadow-lg shadow-violet-500/5">
            <Radio className="w-5 h-5 text-violet-400 animate-pulse" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-mono font-bold text-violet-400 uppercase tracking-widest block">NEXORA Stream (Optimized)</span>
            <span className="text-[9px] font-sans text-zinc-500 block">Memory-released • Swipe to play</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleStartHold}
      onMouseUp={handleReleaseHold}
      onMouseLeave={handleReleaseHold}
      onTouchStart={handleStartHold}
      onTouchEnd={handleReleaseHold}
      className="relative overflow-hidden rounded-none md:rounded-3xl border-y md:border border-violet-500/10 bg-black select-none group w-full h-full md:aspect-video flex items-center justify-center animate-fade-in"
    >
      {/* Absolute Video Frame */}
      <video
        ref={videoRef}
        src={videoUrl}
        loop
        playsInline
        preload={preloadMode || "metadata"}
        muted={isMuted}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onClick={handleTapOrGesture}
        className="w-full h-full object-cover cursor-pointer"
      />

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

      {/* Floating Bottom custom simplified controls block */}
      <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
        {/* Mute/Unmute Toggler */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleVolumeToggle();
          }}
          className="p-2 bg-black/60 hover:bg-black/85 border border-white/10 backdrop-blur-md rounded-full text-white transition-all cursor-pointer active:scale-90 shadow-md"
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5 text-pink-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
        </button>

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
