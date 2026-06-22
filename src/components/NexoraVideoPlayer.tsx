import React, { useRef, useState, useEffect } from 'react';
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
}

interface NexoraVideoPlayerProps {
  post: Post;
  videoUrl: string;
  onOpenFullscreen: () => void;
  onSpark: () => void;
}

export default function NexoraVideoPlayer({
  post,
  videoUrl,
  onOpenFullscreen,
  onSpark
}: NexoraVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Connection & Speed playback status states
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
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

  // 1. Intersection Observer for Auto-play and Auto-pause
  useEffect(() => {
    if (!videoRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Trigger customized global event to pause other players before entering local loop
            window.dispatchEvent(
              new CustomEvent('nexora-video-play', { detail: { url: videoUrl, id: post.id } })
            );
            videoRef.current?.play().catch(() => {});
            setIsPlaying(true);
          } else {
            videoRef.current?.pause();
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(videoRef.current);
    return () => {
      observer.disconnect();
    };
  }, [videoUrl, post.id]);

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
    } else {
      window.dispatchEvent(
        new CustomEvent('nexora-video-play', { detail: { url: videoUrl, id: post.id } })
      );
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
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

      // Clear double-tap heart visual after 1000ms
      setTimeout(() => setShowDoubleTapHeart(false), 800);
      lastTapRef.current = 0;
    } else {
      // SINGLE TAP: Toggle standard controls overlay
      setShowControls(!showControls);
    }
    lastTapRef.current = now;
  };

  // Long press speed up triggers while holding
  const handleStartHold = () => {
    longPressTimerRef.current = setTimeout(() => {
      if (!videoRef.current) return;
      setIsLongPressing(true);
      videoRef.current.playbackRate = 2.0;
      setPlaybackRate(2.0);
      window.dispatchEvent(new CustomEvent('toast', { detail: '⚡ Hyper-Speed Active: 2.0x playback enabled!' }));
    }, 450);
  };

  const handleReleaseHold = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    if (isLongPressing) {
      if (videoRef.current) {
        videoRef.current.playbackRate = 1.0;
      }
      setPlaybackRate(1.0);
      setIsLongPressing(false);
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

  return (
    <div 
      ref={containerRef}
      onMouseDown={handleStartHold}
      onMouseUp={handleReleaseHold}
      onMouseLeave={handleReleaseHold}
      onTouchStart={handleStartHold}
      onTouchEnd={handleReleaseHold}
      className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-black aspect-video select-none group w-full"
    >
      {/* Absolute Video Frame */}
      <video
        ref={videoRef}
        src={videoUrl}
        loop
        playsInline
        muted={isMuted}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onClick={handleTapOrGesture}
        className="w-full h-full object-cover cursor-pointer"
      />

      {/* Switching Quality overlay indicator */}
      {isSwitchingQuality && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center gap-2 z-20">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent animate-spin rounded-full" />
          <span className="text-[10px] font-mono text-purple-300 tracking-widest uppercase">STABILIZING {selectedQuality} CHANNEL...</span>
        </div>
      )}

      {/* 2X Speed Overlay Indicator */}
      {isLongPressing && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-purple-600/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-mono text-white font-extrabold flex items-center gap-1.5 z-20 shadow-lg pointer-events-none tracking-widest animate-pulse">
          <Zap className="w-3.5 h-3.5 fill-current animate-bounce" />
          <span>2.0X SPEED ACTIVE</span>
        </div>
      )}

      {/* Autoplay visual watermark */}
      <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-mono text-purple-300 uppercase tracking-widest flex items-center gap-1 pointer-events-none z-10">
        <Radio className="w-2.5 h-2.5 text-pink-400 animate-pulse" />
        <span>NEXORA LIVE PLAYER ({selectedQuality})</span>
      </div>

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

      {/* Top right parameters action bar */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20">
        {/* Save/Collection Bookmark */}
        <button
          onClick={() => setShowSaveModal(true)}
          className={`p-1.5 rounded-xl backdrop-blur-md border transition-all cursor-pointer ${
            savedCollectionForThis 
              ? 'bg-purple-600 border-purple-500 text-white shadow-md' 
              : 'bg-black/60 border-white/10 text-zinc-400 hover:text-white hover:bg-black/85'
          }`}
          title="Save Video to Collection"
        >
          <Bookmark className="w-3.5 h-3.5 fill-current" />
        </button>

        {/* Creator parameters options button */}
        <button
          onClick={() => setShowCreatorToggles(!showCreatorToggles)}
          className="p-1.5 bg-black/60 hover:bg-black/85 backdrop-blur-md rounded-xl text-zinc-400 hover:text-white border border-white/10 transition-all cursor-pointer"
          title="Creator Telemetry Toggles"
        >
          <Settings className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Creator parameters Popover panel */}
      <AnimatePresence>
        {showCreatorToggles && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="absolute top-12 right-3 w-48 bg-[#09071a]/95 backdrop-blur-xl border border-violet-500/20 p-3.5 rounded-xl text-left space-y-3 z-30 shadow-[0_10px_25px_rgba(0,0,0,0.5)]"
          >
            <span className="text-[8px] font-mono uppercase text-violet-300 font-black tracking-widest block border-b border-white/5 pb-1.5">
              Creator Media Controls
            </span>
            <div className="space-y-2 text-[10.5px]">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-zinc-300 font-sans">Allow Comments</span>
                <input 
                  type="checkbox" 
                  checked={commentsOn} 
                  onChange={(e) => {
                    setCommentsOn(e.target.checked);
                    window.dispatchEvent(new CustomEvent('toast', { detail: `Comments toggled ${e.target.checked ? 'ON' : 'OFF'} for this video!` }));
                  }}
                  className="rounded border-zinc-800 accent-purple-600 cursor-pointer text-purple-600 bg-black"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-zinc-300 font-sans">Allow Downloads</span>
                <input 
                  type="checkbox" 
                  checked={downloadsOn} 
                  onChange={(e) => {
                    setDownloadsOn(e.target.checked);
                    window.dispatchEvent(new CustomEvent('toast', { detail: `Downloads toggled ${e.target.checked ? 'ON' : 'OFF'} for this video!` }));
                  }}
                  className="rounded border-zinc-800 accent-purple-600 cursor-pointer text-purple-600 bg-black"
                />
              </label>
            </div>
            <div className="border-t border-white/5 pt-2 flex items-center justify-between">
              <span className="text-[8.5px] font-mono text-zinc-500 uppercase">Interactive specs</span>
              <button
                onClick={() => setShowCreatorToggles(false)}
                className="text-[9px] font-mono text-purple-400 hover:text-white"
              >
                APPLY
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save to Collection Modal overlay frame */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/85 backdrop-blur-md z-30 flex items-center justify-center p-3"
          >
            <div className="w-full max-w-xs bg-[#0b0821] border border-violet-500/20 p-4 rounded-xl space-y-3 shadow-2xl text-left">
              <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                <span className="text-[10px] font-mono uppercase text-violet-300 font-black tracking-wider flex items-center gap-1.5">
                  <FolderHeart className="w-3.5 h-3.5 text-pink-400" />
                  <span>Save to Collection</span>
                </span>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="text-zinc-500 hover:text-white font-mono text-[10px]"
                >
                  CLOSE
                </button>
              </div>

              {/* Collections listings scroll zone */}
              <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {collections.map((col) => (
                  <button
                    key={col}
                    onClick={() => handleSaveToCollection(col)}
                    className="w-full p-2 hover:bg-violet-950/30 rounded-lg text-left text-[11px] font-sans flex items-center justify-between group transition-all text-zinc-100"
                  >
                    <span>{col}</span>
                    <span className="text-[8px] font-mono opacity-0 group-hover:opacity-100 text-purple-400 uppercase tracking-widest font-black">
                      SELECT →
                    </span>
                  </button>
                ))}
              </div>

              {/* Create Custom input container */}
              <div className="border-t border-white/5 pt-2.5 space-y-2">
                <span className="text-[8.5px] font-mono text-zinc-500 uppercase block">Create Custom Collection</span>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="E.g., Tech Loops..."
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    className="flex-1 bg-black border border-white/5 rounded-lg py-1 px-2 text-[10.5px] focus:outline-hidden focus:border-purple-500 text-white"
                  />
                  <button
                    onClick={handleCreateNewCollection}
                    className="p-1 px-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Bottom custom video controls block */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/85 to-transparent p-3 pt-8 space-y-2 z-10"
          >
            {/* Play progress bar track slider */}
            <div className="flex items-center gap-2">
              <span className="text-[8.5px] font-mono text-zinc-400">
                {Math.floor(currentTime / 60)}:
                {Math.floor(currentTime % 60).toString().padStart(2, '0')}
              </span>
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleScrubChange}
                className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-purple-500 hover:accent-pink-500 transition-colors"
                title="Drag or scrub video timeline indicator"
              />
              <span className="text-[8.5px] font-mono text-zinc-400">
                {Math.floor(duration / 60)}:
                {Math.floor(duration % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Controls panel button deck */}
            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                {/* Play Action button toggle */}
                <button
                  onClick={togglePlayback}
                  className="p-1 text-zinc-300 hover:text-white cursor-pointer active:scale-90 transition-transform"
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-current text-white" /> : <Play className="w-4 h-4 fill-current text-white ml-0.5" />}
                </button>

                {/* Mute button toggler */}
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1 text-zinc-300 hover:text-white cursor-pointer active:scale-90 transition-transform"
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-pink-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>

                {/* Simulated Restore time progress button */}
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      setCurrentTime(0);
                    }
                  }}
                  className="p-1 text-zinc-400 hover:text-white transition-all cursor-pointer"
                  title="Re-play from beginning"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                {/* Simulated Resolution trigger */}
                <div className="relative group/qual">
                  <button className="text-[9px] font-mono uppercase bg-zinc-900 border border-white/5 py-0.5 px-2 rounded-md hover:text-cyan-400">
                    {selectedQuality} Resolution
                  </button>
                  <div className="hidden group-hover/qual:flex flex-col absolute bottom-full left-0 bg-black border border-white/10 p-1 rounded-lg w-20 space-y-0.5">
                    {(['1080p', '720p', '480p', 'Auto'] as const).map((q) => (
                      <button
                        key={q}
                        onClick={() => handleQualitySelect(q)}
                        className={`text-[8.5px] font-mono text-left px-1.5 py-0.5 rounded ${
                          selectedQuality === q ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right panel downloads and immersive fullscreen */}
              <div className="flex items-center gap-2">
                {/* Download option */}
                {downloadsOn && (
                  <button
                    onClick={handleSimulateDownload}
                    className="p-1 text-zinc-400 hover:text-emerald-400 active:scale-95 transition-all cursor-pointer"
                    title="Download Mp4 packet offline"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}

                {/* Fullscreen Overlay trigger */}
                <button
                  onClick={onOpenFullscreen}
                  className="p-1 text-zinc-400 hover:text-violet-400 cursor-pointer"
                  title="Expand Full Immersive Player Mode"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
