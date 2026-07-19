import React, { useRef, useState, useEffect } from 'react';
import QuickActionsSheet from './QuickActionsSheet';
import ShareSheet from './ShareSheet';
import { recordRecommendationEvent } from '../utils/recommendations';
import { useResolvedUrl } from '../utils/indexedDbStorage';
import { globalVideoPlaybackManager } from '../utils/VideoPlaybackManager';
import VideoBottomSheet from './VideoBottomSheet';
import { Play, Pause, Volume2, VolumeX, Maximize2, Bookmark, Check, Plus, FolderHeart, Download, Settings, MoreVertical, Radio, Zap, RotateCcw, Heart, MessageSquare, X, AlertTriangle, EyeOff, Search, CheckCircle, Sun, Archive, Trash, UserPlus, Edit3, Music } from 'lucide-react';

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
  views?: number;
  saves?: number;
  searchSuggestion?: string;
  isLikedByUser?: boolean;
  isVerified?: boolean;
  isArchived?: boolean;
  isDraft?: boolean;
}

interface NexoraVideoPlayerProps {
  post: Post;
  videoUrl: string;
  onOpenFullscreen: () => void;
  onSpark: () => void;
  isActive?: boolean;
  preloadMode?: 'auto' | 'metadata' | 'none';
  isReleased?: boolean;
  shouldPreload?: boolean;
  isFollowing?: boolean;
  isProcessing?: boolean; // New prop
  onToggleFollow?: () => void;
  onCommentToggle?: () => void;
  isCommentsOpen?: boolean;
  onNotInterested?: () => void;
  onViewProfile?: (userId: string) => void;
  onViewSound?: (soundId: string) => void;
}

const VerificationBadge = () => (
  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center border border-white/10 shadow-lg ml-1.5 shrink-0">
    <Check className="w-2.5 h-2.5 text-white" />
  </div>
);

export default function NexoraVideoPlayer({
  post,
  videoUrl,
  onOpenFullscreen,
  onSpark,
  isActive,
  preloadMode,
  isReleased,
  shouldPreload = false,
  isFollowing = false,
  isProcessing = false, // New prop
  onToggleFollow,
  onCommentToggle,
  isCommentsOpen = false,
  onNotInterested,
  onViewProfile,
  onViewSound
}: NexoraVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate a unique player ID for this player instance to avoid any collisions
  const playerId = useRef(`player-${post.id}-${Math.random().toString(36).substring(2, 11)}`).current;
  const [isNearby, setIsNearby] = useState(false);

  const currentUser = (() => {
    try {
      const u = localStorage.getItem('nexora_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })();
  const isOwnPost = currentUser && (post.userId === currentUser.id || post.username === currentUser.username);

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
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [selectedQuality, setSelectedQuality] = useState<'1080p' | '720p' | '480p' | 'Auto'>('Auto');
  const [isSwitchingQuality, setIsSwitchingQuality] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Premium Player Adjustments & HUD Telemetry
  const [brightnessLevel, setBrightnessLevel] = useState(100);
  const [volumeLevel, setVolumeLevel] = useState(() => {
    return globalVideoPlaybackManager.getMute() ? 0 : 80;
  });
  const [hud, setHud] = useState<{ type: 'volume' | 'brightness' | null; value: number; visible: boolean }>({
    type: null,
    value: 100,
    visible: false
  });
  const singleTapTimeoutRef = useRef<any>(null);
  const controlsTimeoutRef = useRef<any>(null);
  
  // Double-tap pulse effect
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
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
  const [exportState, setExportState] = useState<{
    isExporting: boolean;
    progress: number;
    statusText: string;
  } | null>(null);

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

  // Intelligent Video Quality Engine: adapt background network speed
  useEffect(() => {
    if (selectedQuality !== 'Auto') return;
    
    const checkQuality = () => {
      if (typeof navigator === 'undefined') return;
      const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
      let speedQuality: '1080p' | '720p' | '480p' = '720p';
      if (conn) {
        if (conn.saveData) {
          speedQuality = '480p';
        } else {
          const downlink = conn.downlink || 5; // default 5 Mbps
          if (downlink > 6) speedQuality = '1080p';
          else if (downlink > 2) speedQuality = '720p';
          else speedQuality = '480p';
        }
      }
      
      // Update simulated background quality without interrupting active playback!
      setIsSwitchingQuality(true);
      setTimeout(() => {
        setIsSwitchingQuality(false);
      }, 400);
    };

    checkQuality();
    
    // Periodically adapt quality to background bandwidth changes
    const interval = setInterval(checkQuality, 12000);
    return () => clearInterval(interval);
  }, [selectedQuality]);

  // Recover gracefully after temporary network loss
  useEffect(() => {
    const handleOnline = () => {
      if (isActive && videoRef.current) {
        window.dispatchEvent(new CustomEvent('toast', { detail: '⚡ Connection restored! Restabilizing playback stream...' }));
        videoRef.current.load();
        videoRef.current.play().catch(() => {});
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [isActive]);

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
    if (time < 0.5 && lastTimeRef.current > duration - 1.5 && duration > 0) {
      watchCompletedRef.current = false;
      recordRecommendationEvent('watch_complete', { 
        tags: post.tags, 
        creatorId: post.userId, 
        creatorUsername: post.username
      });
      window.dispatchEvent(new CustomEvent('toast', { detail: '🔄 Quiet replay engagement boost synced!' }));
    } else if (time < 0.5 && watchCompletedRef.current) {
      watchCompletedRef.current = false;
    }
    lastTimeRef.current = time;

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

      try {
        const currentUserStr = localStorage.getItem('nexora_user');
        const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
        
        // Block creator watching their own video from inflating views
        const isCreatorWatching = currentUser && (currentUser.id === post.userId || currentUser.username === post.username);
        
        if (!isCreatorWatching) {
          // Prevent rapid duplicate views within same session
          const viewedPostsJson = sessionStorage.getItem('nexora_viewed_posts');
          const viewedPosts = viewedPostsJson ? JSON.parse(viewedPostsJson) : [];
          
          if (!viewedPosts.includes(post.id)) {
            viewedPosts.push(post.id);
            sessionStorage.setItem('nexora_viewed_posts', JSON.stringify(viewedPosts));
            
            // Dispatch to root posts state (Single Source of Truth)
            window.dispatchEvent(new CustomEvent('nexora-increment-view', { detail: { postId: post.id } }));
          }
        }
      } catch (e) {
        console.error("View counting verification error:", e);
      }
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

  const handleStartHold = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    touchStartRef.current = { x: e.clientX, y: e.clientY };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      if (!videoRef.current) return;
      setShowShareSheet(true);
      videoRef.current.pause();
      setIsPlaying(false);
      setShowControls(false);
    }, 500);
  };

  const handleReleaseHold = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartRef.current = null;
  };

  // Variables to hold swipe state
  const isDraggingVerticalRef = useRef(false);
  const initialVolumeRef = useRef(80);
  const initialBrightnessRef = useRef(100);
  const hudTimeoutRef = useRef<any>(null);
  const touchStartTimeRef = useRef<number>(0);

  // Helper to show HUD temporarily
  const triggerHud = (type: 'volume' | 'brightness', value: number) => {
    setHud({ type, value, visible: true });
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => {
      setHud(prev => ({ ...prev, visible: false }));
    }, 1200); // 1.2s fade out
  };

  const resetControlsTimeout = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000); // 3 seconds autohide when playing
    }
  };

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Handle single tap, double tap, and long press gestures
  const handleTapOrGesture = (clientX: number, clientY: number) => {
    const clickArea = containerRef.current?.getBoundingClientRect();
    if (!clickArea) return;

    // Relative coordinates
    const x = clientX - clickArea.left;
    const y = clientY - clickArea.top;

    const now = Date.now();
    const DOUBLE_TAP_DELAY = 280;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Clear single tap timeout if any
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }

      // DOUBLE TAP: Spark post
      setHeartPosition({ x, y });
      setShowDoubleTapHeart(true);
      onSpark();
      recordRecommendationEvent('spark', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username });

      // If autoplay was blocked and we are muted, double tap to like can also unmute beautifully!
      if (autoplayBlocked && isMuted) {
        handleVolumeToggle(false);
      }

      // Clear double-tap heart visual after 800ms
      setTimeout(() => setShowDoubleTapHeart(false), 800);
      lastTapRef.current = 0;
    } else {
      lastTapRef.current = now;

      // SINGLE TAP: Schedule with 280ms delay to check for double tap
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
      singleTapTimeoutRef.current = setTimeout(() => {
        if (autoplayBlocked && isMuted) {
          handleVolumeToggle(false);
        } else {
          togglePlayback();
        }
        singleTapTimeoutRef.current = null;
      }, DOUBLE_TAP_DELAY);
    }
  };

  // Passive touch event listeners to ensure native vertical scrolling is never blocked on mobile/Android
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      touchStartTimeRef.current = Date.now();
      isDraggingVerticalRef.current = false;
      initialVolumeRef.current = videoRef.current ? videoRef.current.volume * 100 : volumeLevel;
      initialBrightnessRef.current = brightnessLevel;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return;
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      const startXPercent = (touchStartRef.current.x / window.innerWidth) * 100;

      // Detect vertical swipe on side boundaries
      if (!isDraggingVerticalRef.current) {
        if (absY > 12 && absY > absX) {
          if (startXPercent < 25 || startXPercent > 75) {
            isDraggingVerticalRef.current = true;
          } else {
            // Center vertical movement means scrolling feed - cancel hold timer
            touchStartRef.current = null;
          }
        } else if (absX > 10) {
          // Horizontal movement - cancel hold timer
          touchStartRef.current = null;
        }
      }

      // Perform Swipe volume/brightness adjustments
      if (isDraggingVerticalRef.current) {
        if (e.cancelable) e.preventDefault();
        
        // Negative deltaY means moving UP (increasing)
        const change = (deltaY / window.innerHeight) * 150;
        
        if (startXPercent < 25) {
          // LEFT SIDE: Brightness
          const newB = Math.max(10, Math.min(100, initialBrightnessRef.current - change));
          setBrightnessLevel(newB);
          triggerHud('brightness', Math.round(newB));
        } else if (startXPercent > 75) {
          // RIGHT SIDE: Volume
          const newV = Math.max(0, Math.min(100, initialVolumeRef.current - change));
          setVolumeLevel(newV);
          if (videoRef.current) {
            videoRef.current.volume = newV / 100;
            if (newV > 0 && isMuted) {
              handleVolumeToggle(false);
            }
          }
          triggerHud('volume', Math.round(newV));
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }

      const wasLongPressing = isLongPressing;
      setIsLongPressing(false);

      if (wasLongPressing && !showQuickActions) {
        if (videoRef.current) {
          videoRef.current.play().catch(() => {});
          setIsPlaying(true);
        }
        setShowControls(true);
      }

      // Check if this was a quick tap instead of a drag or hold
      if (!isDraggingVerticalRef.current && touchStartRef.current) {
        const duration = Date.now() - touchStartTimeRef.current;
        const endTouch = e.changedTouches[0];
        const deltaX = Math.abs(endTouch.clientX - touchStartRef.current.x);
        const deltaY = Math.abs(endTouch.clientY - touchStartRef.current.y);

        if (duration < 280 && deltaX < 8 && deltaY < 8) {
          handleTapOrGesture(endTouch.clientX, endTouch.clientY);
        }
      }

      touchStartRef.current = null;
      isDraggingVerticalRef.current = false;
    };

    // Attach with { passive: false } on onTouchMove to allow scroll prevention when dragging HUD
    element.addEventListener('touchstart', onTouchStart, { passive: true });
    element.addEventListener('touchmove', onTouchMove, { passive: false });
    element.addEventListener('touchend', onTouchEnd, { passive: true });
    element.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', onTouchStart);
      element.removeEventListener('touchmove', onTouchMove);
      element.removeEventListener('touchend', onTouchEnd);
      element.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isLongPressing, showLongPressMenu, brightnessLevel, volumeLevel, isMuted, autoplayBlocked]);

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
  const handleSimulateDownload = async () => {
    if (!downloadsOn) {
      window.dispatchEvent(new CustomEvent('toast', { detail: '🔒 Downloads are restricted of this video by creator settings!' }));
      return;
    }

    setExportState({
      isExporting: true,
      progress: 0,
      statusText: 'Preparing secure media pipeline...'
    });

    const videoSrc = finalVideoUrl || videoUrl;
    const uploader = post.username;

    // Standard high-fidelity Nexora logo drawer on canvas
    const drawNexoraN = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, strokeWidth: number, glow = false) => {
      const s = size / 240;
      
      const grad = ctx.createLinearGradient(x, y, x + size, y + size);
      grad.addColorStop(0, '#8B5CF6');
      grad.addColorStop(0.5, '#D946EF');
      grad.addColorStop(1, '#3B82F6');

      const path = () => {
        ctx.beginPath();
        ctx.moveTo(x + 50 * s, y + 190 * s);
        ctx.lineTo(x + 50 * s, y + 80 * s);
        ctx.quadraticCurveTo(x + 50 * s, y + 50 * s, x + 80 * s, y + 80 * s);
        ctx.lineTo(x + 160 * s, y + 160 * s);
        ctx.quadraticCurveTo(x + 190 * s, y + 190 * s, x + 190 * s, y + 160 * s);
        ctx.lineTo(x + 190 * s, y + 50 * s);
      };

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (glow) {
        ctx.shadowColor = '#8B5CF6';
        ctx.shadowBlur = 14 * s;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        path();
        ctx.strokeStyle = grad;
        ctx.lineWidth = (36 / 240) * size;
        ctx.globalAlpha = 0.5;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0; // reset shadow
      }

      path();
      ctx.strokeStyle = grad;
      ctx.lineWidth = (32 / 240) * size;
      ctx.stroke();

      const glass = ctx.createLinearGradient(x, y, x + size, y + size);
      glass.addColorStop(0, 'rgba(255, 255, 255, 0.7)');
      glass.addColorStop(0.2, 'rgba(255, 255, 255, 0.1)');
      glass.addColorStop(0.8, 'rgba(0, 0, 0, 0.1)');
      glass.addColorStop(1, 'rgba(0, 0, 0, 0.5)');

      path();
      ctx.strokeStyle = glass;
      ctx.lineWidth = (32 / 240) * size;
      ctx.stroke();

      // Inner Core Tube Reflection (Soft specular glint)
      path();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = (6 / 240) * size;
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = 0.3;
      ctx.stroke();

      ctx.restore();
    };

    // Helper to run fallback
    const runFallback = (errorMsg: string) => {
      console.warn("Export error, falling back to direct stream:", errorMsg);
      setExportState(prev => prev ? { ...prev, progress: 90, statusText: 'CORS/Environment limit detected. Downloading standard copy...' } : null);
      
      // Delay slightly so the user sees what's happening
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = videoSrc;
        link.setAttribute('download', `nexora_video_${post.id}.mp4`);
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.dispatchEvent(new CustomEvent('toast', { detail: '✅ Video stream downloaded successfully.' }));
        setExportState(null);
      }, 1500);
    };

    try {
      // Create offscreen video element
      const video = document.createElement('video');
      video.src = videoSrc;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;

      // Force video to load
      video.load();

      // Set a safety timeout of 10 seconds to load metadata
      const loadTimeout = setTimeout(() => {
        runFallback('Video metadata load timed out.');
      }, 10000);

      video.addEventListener('loadedmetadata', async () => {
        clearTimeout(loadTimeout);
        
        try {
          setExportState(prev => prev ? { ...prev, progress: 15, statusText: 'Configuring canvas rasterizer (720p aspect)...' } : null);
          
          const canvas = document.createElement('canvas');
          const width = video.videoWidth || 720;
          const height = video.videoHeight || 1280;
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Could not get 2D context');
          }

          setExportState(prev => prev ? { ...prev, progress: 25, statusText: 'Multiplexing audio streams...' } : null);

          // Prepare Web Audio if supported
          let audioDest: MediaStreamAudioDestinationNode | null = null;
          let audioCtx: AudioContext | null = null;
          try {
            audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const sourceNode = audioCtx.createMediaElementSource(video);
            audioDest = audioCtx.createMediaStreamDestination();
            sourceNode.connect(audioDest);
          } catch (ae) {
            console.warn("Audio Context capture failed, exporting video-only track", ae);
          }

          // Capture canvas stream at 30fps
          const canvasStream = canvas.captureStream(30);
          
          // Assemble combined stream
          const tracks = [...canvasStream.getVideoTracks()];
          if (audioDest) {
            tracks.push(...audioDest.stream.getAudioTracks());
          }
          const combinedStream = new MediaStream(tracks);

          // Setup MediaRecorder
          let options = { mimeType: 'video/webm;codecs=vp9,opus' };
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm;codecs=vp8,opus' };
          }
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/mp4' };
          }
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: '' }; // let browser decide
          }

          const recorder = new MediaRecorder(combinedStream, options);
          const chunks: Blob[] = [];

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              chunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            setExportState(prev => prev ? { ...prev, progress: 98, statusText: 'Packaging media container...' } : null);
            const blob = new Blob(chunks, { type: recorder.mimeType || 'video/mp4' });
            const url = URL.createObjectURL(blob);
            
            // Download the final watermarked video
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `nexora_watermarked_${post.username}_${post.id}.mp4`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('toast', { detail: '🔥 Premium watermarked video downloaded successfully!' }));
              setExportState(null);
            }, 1000);
          };

          // Start playback and recording
          video.currentTime = 0;
          await video.play();
          recorder.start();

          // Rendering / Animation loop variables
          const baseFontSize = Math.max(16, Math.round(width * 0.035));
          const duration = video.duration || 10; // Fallback to 10s if duration is NaN/Infinity
          const outroDuration = 1.8; // seconds

          // Keep track of animation frames
          let animFrameId: number;
          let isOutroStarted = false;
          let outroStartTime = 0;

          const renderFrame = () => {
            const now = video.currentTime;
            
            if (video.ended || now >= duration) {
              // Video finished, start or continue outro
              if (!isOutroStarted) {
                isOutroStarted = true;
                outroStartTime = performance.now();
                setExportState(prev => prev ? { ...prev, progress: 95, statusText: 'Baking branded outro and signature...' } : null);
              }

              const elapsedOutro = (performance.now() - outroStartTime) / 1000;
              if (elapsedOutro >= outroDuration) {
                // Outro finished! Stop recording
                recorder.stop();
                video.pause();
                cancelAnimationFrame(animFrameId);
                return;
              }

              // Draw beautiful branded outro
              // Deep Nexora purple/indigo radial gradient background
              const grad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, width);
              grad.addColorStop(0, '#15103c');
              grad.addColorStop(1, '#030112');
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, width, height);

              // Calculate outro text fade-in and fade-out opacity
              let outroOpacity = 1;
              if (elapsedOutro < 0.4) {
                outroOpacity = elapsedOutro / 0.4;
              } else if (elapsedOutro > outroDuration - 0.4) {
                outroOpacity = Math.max(0, (outroDuration - elapsedOutro) / 0.4);
              }

              ctx.save();
              ctx.globalAlpha = outroOpacity;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              // Violet glow shadow
              ctx.shadowColor = 'rgba(139, 92, 246, 0.5)';
              ctx.shadowBlur = 20;
              ctx.shadowOffsetX = 0;
              ctx.shadowOffsetY = 0;

              // Draw Centerpiece Glowing official N logo mark
              const logoL = baseFontSize * 3.5;
              const logoX = width / 2 - logoL / 2;
              const logoY = height / 2 - baseFontSize * 4.0;
              drawNexoraN(ctx, logoX, logoY, logoL, logoL * 0.12, true);

              // Draw title
              ctx.fillStyle = '#FFFFFF';
              ctx.font = `bold ${baseFontSize * 2.0}px "Space Grotesk", "Inter", sans-serif`;
              ctx.fillText('NEXORA', width / 2, height / 2 + baseFontSize * 0.4);

              // Draw uploader info
              ctx.shadowBlur = 5;
              ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
              ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
              ctx.font = `500 ${baseFontSize * 1.1}px "JetBrains Mono", sans-serif`;
              ctx.fillText(`@${uploader}`, width / 2, height / 2 + baseFontSize * 2.0);

              ctx.restore();

            } else {
              // Draw active video frame
              ctx.drawImage(video, 0, 0, width, height);

              // Update progress bar status
              const currentProgress = Math.min(90, Math.round(30 + (now / duration) * 60));
              setExportState(prev => prev ? { ...prev, progress: currentProgress, statusText: `Applying NEXORA watermark... ${Math.round((now/duration)*100)}%` } : null);

              // Watermark motion formula
              const interval = 4.0; // change position every 4 seconds
              const segment = Math.floor(now / interval);
              const segmentTime = now % interval;

              // Define watermark position calculator
              const getPosition = (isLeft: boolean, seg: number) => {
                const seedVal = seg + (isLeft ? 0 : 77);
                const seed1 = Math.sin(seedVal * 12.9898) * 43758.5453;
                const seed2 = Math.cos(seedVal * 78.233) * 43758.5453;
                const rand1 = seed1 - Math.floor(seed1);
                const rand2 = seed2 - Math.floor(seed2);

                const y = 0.35 * height + rand2 * (0.30 * height); // centered vertically 35% - 65%
                
                let x = 0;
                if (isLeft) {
                  x = 0.05 * width + rand1 * (0.12 * width); // Left side
                } else {
                  x = 0.62 * width + rand1 * (0.14 * width); // Right side
                }
                return { x, y };
              };

              const leftPos = getPosition(true, segment);
              const rightPos = getPosition(false, segment);

              // Smooth Transitions: slide and fade
              let opacity = 0.75;
              let leftX = leftPos.x;
              let rightX = rightPos.x;

              if (segmentTime < 0.5) {
                // Fade-in phase
                const slidePct = segmentTime / 0.5;
                opacity = slidePct * 0.75;
                // Slide from 20px off
                leftX = leftPos.x - 20 * (1 - slidePct);
                rightX = rightPos.x + 20 * (1 - slidePct);
              } else if (segmentTime > interval - 0.5) {
                // Fade-out phase
                const fadeOutPct = (interval - segmentTime) / 0.5;
                opacity = fadeOutPct * 0.75;
                leftX = leftPos.x + 20 * (1 - fadeOutPct);
                rightX = rightPos.x - 20 * (1 - fadeOutPct);
              } else {
                // Stable float phase
                opacity = 0.75;
                const floatAmt = Math.sin(segmentTime * 2.5) * 4;
                leftX = leftPos.x + floatAmt;
                rightX = rightPos.x - floatAmt;
              }

              // Draw left watermark
              const drawWatermark = (x: number, y: number) => {
                ctx.save();
                ctx.globalAlpha = opacity;

                const logoSize = baseFontSize * 1.25;
                // Draw official brand standard N logo mark on canvas!
                drawNexoraN(ctx, x, y - logoSize * 0.65, logoSize, logoSize * 0.12, true);

                // Title shifted right for standard alignment
                ctx.fillStyle = '#FFFFFF';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                ctx.shadowBlur = 8;
                ctx.shadowOffsetX = 1.5;
                ctx.shadowOffsetY = 1.5;
                ctx.font = `bold ${baseFontSize}px "Space Grotesk", "Inter", sans-serif`;
                ctx.fillText('NEXORA', x + logoSize * 1.1, y + logoSize * 0.1);

                // Handle shifted below the text
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.font = `500 ${baseFontSize * 0.78}px "JetBrains Mono", sans-serif`;
                ctx.fillText(`@${uploader}`, x, y + baseFontSize * 1.3);

                ctx.restore();
              };

              drawWatermark(leftX, leftPos.y);
              drawWatermark(rightX, rightPos.y);
            }

            animFrameId = requestAnimationFrame(renderFrame);
          };

          // Begin the render loop
          animFrameId = requestAnimationFrame(renderFrame);

        } catch (innerErr) {
          runFallback('Failed to initialize recording nodes: ' + String(innerErr));
        }
      });

      video.addEventListener('error', (e) => {
        runFallback('CORS or playback pipeline failure.');
      });

    } catch (e) {
      runFallback('Export context initiation error: ' + String(e));
    }
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
              src={isNearby || shouldPreload ? finalVideoUrl : undefined}
              loop
              playsInline
              preload={preloadMode || ((isNearby || shouldPreload) ? "auto" : "none")}
              muted={isMuted}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              onCanPlay={() => setIsBuffering(false)}
              className="w-full h-full object-cover cursor-pointer"
              style={{ filter: `brightness(${brightnessLevel}%)` }}
            />
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-xs pointer-events-none z-10 animate-fade-in">
                <div className="flex flex-col items-center gap-2 bg-slate-950/80 border border-violet-500/25 px-4 py-3 rounded-2xl shadow-xl">
                  <div className="w-7 h-7 border-3 border-violet-500 border-t-transparent animate-spin rounded-full" />
                </div>
              </div>
            )}

             {/* Right-Side Action Rail */}
            <div 
              className="absolute flex flex-col items-center gap-4 z-20"
              style={{
                bottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
                right: 'calc(env(safe-area-inset-right, 0px) + 12px)'
              }}
            >
              {/* Profile & Follow */}
              <div className="relative group/avatar mb-2">
                <div className="w-12 h-12 rounded-full border-2 border-white/20 overflow-hidden shadow-lg cursor-pointer" onClick={(e) => { e.stopPropagation(); onViewProfile?.(post.userId || ''); }}>
                  <img src={post.avatar} alt={post.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" loading="lazy" />
                </div>
                {onToggleFollow && !isFollowing && post.userId !== 'user-0' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onToggleFollow(); }}
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center text-white border border-black shadow-md hover:scale-110 active:scale-90 transition-transform"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                  </button>
                )}
              </div>

              {/* ❤️ Spark */}
              <button 
                onClick={(e) => { e.stopPropagation(); onSpark(); }}
                disabled={isProcessing}
                className={`flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/10 transition-all duration-300 active:scale-90 shadow-lg`}>
                  <Zap className={`w-6 h-6 transition-transform duration-300 group-hover/btn:scale-110 ${post.isLikedByUser ? 'fill-pink-500 text-pink-500' : 'text-white'}`} />
                </div>
                <span className="font-sans text-[11px] font-bold text-white drop-shadow-md select-none">{post.likes}</span>
              </button>

              {/* 💬 Comment */}
              <button 
                onClick={(e) => { e.stopPropagation(); onCommentToggle?.(); }}
                className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/10 transition-all duration-300 active:scale-90 shadow-lg`}>
                  <MessageSquare className={`w-6 h-6 transition-transform duration-300 group-hover/btn:scale-110 text-white`} />
                </div>
                <span className="font-sans text-[11px] font-bold text-white drop-shadow-md select-none">{post.comments?.length || 0}</span>
              </button>

              {/* 🔖 Save */}
              <button 
                onClick={(e) => { e.stopPropagation(); setShowSaveModal(true); }}
                className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center"
              >
                <div className={`w-11 h-11 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/10 transition-all duration-300 active:scale-90 shadow-lg`}>
                  <Bookmark className={`w-6 h-6 transition-transform duration-300 group-hover/btn:scale-110 ${savedCollectionForThis ? 'fill-yellow-400 text-yellow-400' : 'text-white'}`} />
                </div>
                <span className="font-sans text-[11px] font-bold text-white drop-shadow-md select-none">{post.bookmarksCount || 0}</span>
              </button>

              {/* ↗ Share */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setShowShareSheet(true);
                  recordRecommendationEvent('share', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username });
                }}
                className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/10 transition-all duration-300 active:scale-90 shadow-lg">
                  <svg className="w-6 h-6 text-white transition-transform duration-300 group-hover/btn:scale-110" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                </div>
                <span className="font-sans text-[11px] font-bold text-white drop-shadow-md select-none">{post.shares || 0}</span>
              </button>

              <VideoBottomSheet
                isOpen={showShareSheet}
                onClose={() => setShowShareSheet(false)}
                post={post}
                onDownload={() => {}}
                onSave={() => {}}
                onShare={() => {}}
                onReport={() => {}}
                onNotInterested={() => {}}
                onViewProfile={() => onViewProfile?.(post.userId || '')}
                onFollowToggle={() => onToggleFollow?.()}
                isFollowing={isFollowing}
              />

              {/* ⚙️ Options Menu */}
              <div className="relative flex flex-col items-center">
                <button 
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowMoreMenu(!showMoreMenu);
                  }}
                  className="flex flex-col items-center gap-1 group/btn cursor-pointer font-sans text-center"
                  title="More post options"
                >
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/5 transition-all duration-300 scale-100 active:scale-90 shadow-lg ${showMoreMenu ? 'border-violet-500/50 bg-violet-550/20' : ''}`}>
                    <MoreVertical className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-zinc-300 drop-shadow-md select-none">Options</span>
                </button>

                <AnimatePresence>
                  {showMoreMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, x: 10, y: 10 }}
                      animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: 10, y: 10 }}
                      className="absolute right-12 bottom-0 mb-2 w-44 bg-[#0c091f]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden font-sans py-1 text-left"
                    >
                      {isOwnPost ? (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const newCaption = prompt('Edit caption:', post.content);
                              if (newCaption !== null && newCaption.trim() !== '') {
                                window.dispatchEvent(new CustomEvent('nexora-edit-caption', { detail: { postId: post.id, newCaption } }));
                              }
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                          >
                            <Edit3 className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                            Edit Caption
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const archiveState = !post.isArchived;
                              window.dispatchEvent(new CustomEvent('nexora-archive-post', { detail: { postId: post.id, archiveState } }));
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                          >
                            <Archive className="w-3.5 h-3.5 shrink-0 text-fuchsia-400" />
                            {post.isArchived ? 'Restore Post' : 'Archive Post'}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
                                window.dispatchEvent(new CustomEvent('nexora-delete-post', { detail: { postId: post.id } }));
                              }
                              setShowMoreMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-red-500/10 text-red-400 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5 shrink-0 text-red-500" />
                            Delete Post
                          </button>
                        </>
                      ) : (
                        <>
                          {onToggleFollow && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFollow();
                                setShowMoreMenu(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer border-b border-white/5"
                            >
                              <UserPlus className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                              {isFollowing ? 'Unfollow Creator' : 'Follow Creator'}
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onNotInterested?.();
                              setShowMoreMenu(false);
                              window.dispatchEvent(new CustomEvent('toast', { detail: '🙈 Marked as not interested' }));
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-white/5 text-violet-300 font-bold flex items-center gap-2 text-xs transition-colors cursor-pointer"
                          >
                            <EyeOff className="w-3.5 h-3.5 shrink-0 text-zinc-400" />
                            Not Interested
                          </button>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

                          <div 
              className="absolute flex flex-col items-start gap-1 z-20 pointer-events-none text-left"
              style={{
                bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
                left: 'calc(env(safe-area-inset-left, 0px) + 14px)',
                right: 'calc(env(safe-area-inset-right, 0px) + 64px)'
              }}
            >
              {/* Search Suggestion */}
              {post.searchSuggestion && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('toast', { detail: `🔍 Searching: ${post.searchSuggestion}` }));
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 mb-1 rounded-sm bg-black/30 backdrop-blur-md border border-white/10 hover:bg-black/50 transition-colors pointer-events-auto"
                >
                  <Search className="w-3 h-3 text-white" />
                  <span className="text-[10px] font-mono text-white tracking-wider">Search • {post.searchSuggestion}</span>
                </button>
              )}

              {/* Creator Info */}
              <div className="pointer-events-auto text-left" onClick={() => onViewProfile?.(post.userId || '')}>
                <div className="flex items-center gap-1">
                  <span className="font-sans font-extrabold text-lg text-white drop-shadow-md truncate max-w-[200px]">{post.name}</span>
                  {post.isVerified && <VerificationBadge />}
                </div>
                <span className="text-xs font-mono text-zinc-300 drop-shadow-md font-medium">@{post.username}</span>
                {/* Audio Sound */}
                <div className="flex items-center gap-1 text-[10px] text-zinc-300 mt-1 cursor-pointer" onClick={(e) => {e.stopPropagation(); onViewSound?.('123')}}>
                  <Music className="w-3 h-3"/>
                  <span>♫ Original Sound - {post.name}</span>
                </div>
              </div>

              {/* Caption */}
              {post.content && (
                <div className="text-xs text-zinc-100 font-sans leading-relaxed drop-shadow-md pointer-events-auto max-w-xs mt-1">
                  <p className={isExpanded ? "" : "line-clamp-2"}>
                    {post.content}
                  </p>
                  {post.content.length > 50 && (
                    <button onClick={() => setIsExpanded(!isExpanded)} className="text-[10px] font-bold text-violet-300">
                      {isExpanded ? "Show less" : "Show more"}
                    </button>
                  )}
                </div>
              )}

              {/* Hashtags */}
              {post.tags && post.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 pointer-events-auto mt-0.5">
                  {post.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="text-[10px] font-mono text-violet-300 hover:text-white drop-shadow-md font-semibold"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Music Info - Interactive */}
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-white drop-shadow-md mt-1 cursor-pointer hover:text-violet-300 transition-colors pointer-events-auto" onClick={(e) => { e.stopPropagation(); onViewSound?.(post.id); }}>
                <Music className="w-3 h-3 text-white shrink-0" />
                <span className="truncate max-w-[150px]">Original Sound • {post.name.toUpperCase()}</span>
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
          <span className="text-[10px] font-sans text-purple-300 tracking-widest uppercase">Loading...</span>
        </div>
      )}

      {/* Hold to Pause Overlay Indicator */}
      {isLongPressing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-sans text-zinc-300 font-bold flex items-center gap-1.5 z-20 shadow-lg pointer-events-none tracking-widest uppercase">
          <span>Paused</span>
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

      {/* Sleek Central HUD Overlay for Volume/Brightness gesture feedback */}
      <AnimatePresence>
        {hud.visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-3.5 rounded-2xl bg-black/85 backdrop-blur-md border border-white/10 flex flex-col items-center gap-2.5 z-50 shadow-2xl min-w-[120px]"
          >
            {hud.type === 'brightness' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Volume2 className="w-5 h-5 text-violet-400" />
            )}
            <span className="text-[9px] font-mono text-zinc-400 font-bold uppercase tracking-widest">{hud.type}</span>
            <div className="w-20 h-1 bg-white/15 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-75" 
                style={{ width: `${hud.value}%` }}
              />
            </div>
            <span className="text-xs font-mono text-white font-extrabold">{hud.value}%</span>
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


      {/* Nexora Share Sheet */}
      <ShareSheet 
        isOpen={showShareSheet} 
        onClose={() => setShowShareSheet(false)} 
        post={post}
        onShare={(recipientId) => {
          recordRecommendationEvent('share', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username });
        }}
        onReport={() => {
          recordRecommendationEvent('skip_quick', { creatorId: post.userId, creatorUsername: post.username });
          window.dispatchEvent(new CustomEvent('toast', { detail: '⚠️ Video report filed. Moderation team is auditing this stream!' }));
        }}
        onNotInterested={() => {
          recordRecommendationEvent('skip_quick', { tags: post.tags, creatorId: post.userId, creatorUsername: post.username });
          window.dispatchEvent(new CustomEvent('toast', { detail: '🙈 Tuned: We will show you fewer videos like this.' }));
          onNotInterested?.();
        }}
        onSave={() => {
          setShowSaveModal(true);
        }}
      />

      {/* Floating Bottom custom simplified controls block */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
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

      {/* EXPORTING WATERMARKED VIDEO MODAL OVERLAY */}
      <AnimatePresence>
        {exportState && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#030112]/95 backdrop-blur-xl p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="w-full max-w-sm bg-[#09071d] border border-violet-500/20 rounded-3xl p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center"
            >
              {/* Decorative ambient background glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
              
              {/* Premium animated logo indicator */}
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <Download className="w-7 h-7 animate-bounce" />
                </div>
                <div className="absolute inset-0 rounded-full border border-dashed border-violet-500/40 animate-spin" style={{ animationDuration: '8s' }} />
              </div>

              <h3 className="text-xs font-mono font-black text-white uppercase tracking-widest mb-1">
                NEXORA STUDIO EXPORT
              </h3>
              <p className="text-[10px] font-sans text-zinc-400 mb-6">
                Burning creator watermark for <span className="text-violet-400 font-semibold">@{post.username}</span>
              </p>

              {/* Modern progress track */}
              <div className="w-full bg-slate-950/60 border border-white/5 rounded-full h-2.5 overflow-hidden mb-3 p-[2px]">
                <div 
                  className="h-full bg-gradient-to-r from-violet-600 to-pink-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(139,92,246,0.4)] animate-pulse"
                  style={{ width: `${exportState.progress}%` }}
                />
              </div>

              <div className="flex items-center justify-between w-full text-[9px] font-mono uppercase tracking-wider text-zinc-500 mb-5 px-1">
                <span className="truncate max-w-[240px]">{exportState.statusText}</span>
                <span className="text-zinc-300 font-extrabold text-xs">{exportState.progress}%</span>
              </div>

              <p className="text-[8px] font-mono text-zinc-600 max-w-[260px] leading-relaxed uppercase tracking-wider">
                Please do not close this window during the watermark rendering phase.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
