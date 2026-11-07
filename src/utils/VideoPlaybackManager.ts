// Coordinates the single active player, bounded preloads, playback positions and mute state.

function positionStorageKey(url: string): string {
  let hash = 2166136261;
  for (let index = 0; index < url.length; index += 1) {
    hash = Math.imul(hash ^ url.charCodeAt(index), 16777619);
  }
  return `nexora_vid_pos_v2_${(hash >>> 0).toString(36)}`;
}

export type PlayerCallback = {
  pause: () => void;
  play?: () => void;
  setVolumeMuted?: (muted: boolean) => void;
};

class VideoPlaybackManager {
  private activePlayerId: string | null = null;
  private activeVideoElement: HTMLVideoElement | null = null;
  private activeVideoUrl: string | null = null;
  private registeredPlayers = new Map<string, PlayerCallback>();
  private playbackPositions = new Map<string, number>();
  private MAX_POSITION_COUNT = 100;
  
  // Predictive preloading cache sandbox
  private preloadElements = new Map<string, HTMLVideoElement>();
  private MAX_PRELOAD_COUNT = 3; // Keep a maximum of 3 preloaded videos to prevent memory leaks

  // Persistent mute state synced with localStorage
  private globalMuted: boolean = (() => {
    try {
      return typeof localStorage === 'undefined' || localStorage.getItem('nexora_video_muted') !== 'false';
    } catch {
      return true;
    }
  })();

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen to visibility change to pause video on backgrounding and resume on returning!
      window.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseActive();
        } else {
          this.resumeActive();
        }
      });
      
      // Handle page-level events for cross-tab or global triggers
      window.addEventListener('nexora-video-global-pause-all', () => {
        this.pauseAll();
      });

    }
  }

  /**
   * Translates a raw video URL to its optimized stream URL
   */
  public getAdaptiveUrl(rawUrl: string): string {
    if (!rawUrl) return '';
    return rawUrl;
  }

  /**
   * Resume the active player that was paused
   */
  public resumeActive() {
    if (this.activePlayerId && this.activeVideoElement && this.activeVideoUrl) {
      const callbacks = this.registeredPlayers.get(this.activePlayerId);
      if (callbacks && callbacks.play) {
        try {
          callbacks.play();
        } catch (e) {
          this.play(this.activePlayerId, this.activeVideoElement, this.activeVideoUrl).catch(() => {});
        }
      } else {
        this.play(this.activePlayerId, this.activeVideoElement, this.activeVideoUrl).catch(() => {});
      }
    }
  }

  /**
   * Register a player instance with the manager
   */
  public register(id: string, callbacks: PlayerCallback) {
    this.registeredPlayers.set(id, callbacks);
    
    // Immediately apply current global volume mute state
    if (callbacks.setVolumeMuted) {
      callbacks.setVolumeMuted(this.globalMuted);
    }
  }

  /**
   * Unregister a player instance
   */
  public unregister(id: string) {
    if (this.activePlayerId === id) {
      this.pause(id);
    }
    this.registeredPlayers.delete(id);
  }

  /**
   * Predictively preloads subsequent video files into a hidden element sandbox.
   * This downloads the video segment ahead of time, ensuring instant playback startup.
   */
  public preloadVideo(url: string) {
    if (!url || typeof document === 'undefined') return;
    const connection = typeof navigator !== 'undefined' ? (navigator as any).connection : undefined;
    if (connection?.saveData || ['slow-2g', '2g', '3g'].includes(connection?.effectiveType)) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
    const resolvedUrl = this.getAdaptiveUrl(url);

    if (this.preloadElements.has(resolvedUrl)) return; // Already cached/preloading

    // Evict oldest if limit reached
    if (this.preloadElements.size >= this.MAX_PRELOAD_COUNT) {
      const firstKey = this.preloadElements.keys().next().value;
      if (firstKey) {
        const oldestEl = this.preloadElements.get(firstKey);
        if (oldestEl) {
          oldestEl.src = '';
          oldestEl.load();
        }
        this.preloadElements.delete(firstKey);
      }
    }

    try {
      const hiddenVid = document.createElement('video');
      hiddenVid.preload = 'auto';
      hiddenVid.muted = true;
      hiddenVid.src = resolvedUrl;
      hiddenVid.style.display = 'none';
      hiddenVid.load(); // Warm up the buffer

      this.preloadElements.set(resolvedUrl, hiddenVid);
    } catch (e) {
      // Preload failed
    }
  }

  /**
   * Request play for a player instance with fast startup & intelligent buffering optimization
   */
  public async play(id: string, videoElement: HTMLVideoElement, url: string): Promise<boolean> {
    if (!videoElement) return false;

    // Only update videoElement.src if it is empty or points to a different source
    const targetUrl = this.getAdaptiveUrl(url);
    const existingSrc = videoElement.currentSrc || videoElement.src || '';
    if (!existingSrc || (!existingSrc.endsWith(targetUrl) && existingSrc !== targetUrl)) {
      videoElement.src = targetUrl;
    }

    // Guard: Prevent trying to play a video element with no source
    if (!videoElement.src || (typeof window !== 'undefined' && videoElement.src === window.location.href) || videoElement.src.trim() === '') {
      return false;
    }

    // If another video was active, pause it immediately
    if (this.activePlayerId && this.activePlayerId !== id) {
      this.pauseActive();
    }

    this.activePlayerId = id;
    this.activeVideoElement = videoElement;
    this.activeVideoUrl = url;

    // Fast Startup Buffering Configuration
    videoElement.preload = 'auto';
    videoElement.setAttribute('playsinline', 'true');
    videoElement.setAttribute('webkit-playsinline', 'true');

    // Apply the current global mute setting to this element
    videoElement.muted = this.globalMuted;

    // Retrieve and restore saved position if any
    const savedPos = this.getPosition(url);
    if (savedPos > 0 && Math.abs(videoElement.currentTime - savedPos) > 1.0) {
      if (Number.isFinite(videoElement.duration) && videoElement.duration > 0 && savedPos < videoElement.duration - 2) {
        videoElement.currentTime = savedPos;
      }
    }

    try {
      // Direct play call
      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        await playPromise;
      }
      
      // Dispatch play event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('nexora-video-play-sync', { detail: { id, url: targetUrl } })
        );
      }
      return true;
    } catch (err) {
      // Autoplay failed
      // Attempt muted fallback to bypass browser autoplay constraints
      if (!videoElement.muted) {
        try {
          videoElement.muted = true;
          await videoElement.play();
          return true;
        } catch (e) {
          // Muted playback also failed
        }
      }
      return false;
    }
  }

  /**
   * Pause a specific player instance
   */
  public pause(id: string) {
    if (this.activePlayerId === id && this.activeVideoElement) {
      this.savePositionOfActive();
      this.activeVideoElement.pause();
    }
    
    const callbacks = this.registeredPlayers.get(id);
    if (callbacks) {
      callbacks.pause();
    }

    if (this.activePlayerId === id) {
      this.activePlayerId = null;
      this.activeVideoElement = null;
      this.activeVideoUrl = null;
    }
  }

  /**
   * Save current position of the active video
   */
  public savePositionOfActive() {
    if (this.activeVideoElement && this.activeVideoUrl) {
      const time = this.activeVideoElement.currentTime;
      this.savePosition(this.activeVideoUrl, time);
    }
  }

  /**
   * Pause the currently active player
   */
  public pauseActive() {
    if (this.activePlayerId) {
      this.pause(this.activePlayerId);
    }
  }

  /**
   * Pause all players
   */
  public pauseAll() {
    this.savePositionOfActive();
    
    if (this.activeVideoElement) {
      this.activeVideoElement.pause();
    }

    this.registeredPlayers.forEach((callbacks, id) => {
      try {
        callbacks.pause();
      } catch (e) {
        // Error pausing player
      }
    });

    this.activePlayerId = null;
    this.activeVideoElement = null;
    this.activeVideoUrl = null;
  }

  /**
   * Store video playback position
   */
  public savePosition(url: string, position: number) {
    if (!url) return;
    if (!Number.isFinite(position) || position < 0) return;
    if (!this.playbackPositions.has(url) && this.playbackPositions.size >= this.MAX_POSITION_COUNT) {
      const oldestUrl = this.playbackPositions.keys().next().value;
      if (oldestUrl) this.playbackPositions.delete(oldestUrl);
    }
    this.playbackPositions.set(url, position);
    try {
      localStorage.setItem(positionStorageKey(url), String(position));
    } catch {
      // Playback continues even when storage is unavailable or full.
    }
  }

  /**
   * Retrieve video playback position
   */
  public getPosition(url: string): number {
    if (!url) return 0;
    if (this.playbackPositions.has(url)) {
      return this.playbackPositions.get(url)!;
    }
    try {
      const saved = localStorage.getItem(positionStorageKey(url))
        ?? localStorage.getItem(`nexora_vid_pos_${url}`);
      if (saved) {
        const parsed = Number.parseFloat(saved);
        return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
      }
    } catch {
      return 0;
    }
    return 0;
  }

  /**
   * Update and synchronize global mute/volume settings
   */
  public setMute(muted: boolean) {
    this.globalMuted = muted;
    try {
      localStorage.setItem('nexora_video_muted', muted ? 'true' : 'false');
    } catch {
      // Mute state remains active in memory for this session.
    }
    
    if (this.activeVideoElement) {
      this.activeVideoElement.muted = muted;
    }

    this.syncMuteStateToAll();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('nexora-volume-change', { detail: { muted, senderId: 'playback-manager' } })
      );
    }
  }

  /**
   * Synchronize current mute state to all registered players
   */
  private syncMuteStateToAll() {
    this.registeredPlayers.forEach((callbacks) => {
      if (callbacks.setVolumeMuted) {
        try {
          callbacks.setVolumeMuted(this.globalMuted);
        } catch (e) {
          // Error syncing mute
        }
      }
    });
  }

  /**
   * Get the global muted setting
   */
  public getMute(): boolean {
    return this.globalMuted;
  }

  /**
   * Check if a specific player is active
   */
  public isActive(id: string): boolean {
    return this.activePlayerId === id;
  }

  /**
   * Retrieve active player ID
   */
  public getActiveId(): string | null {
    return this.activePlayerId;
  }

  /**
   * Cleans up all preload sandbox elements to free up browser memory
   */
  public clearMemory() {
    this.preloadElements.forEach((el) => {
      el.src = '';
      el.load();
    });
    this.preloadElements.clear();
  }
}

export const globalVideoPlaybackManager = new VideoPlaybackManager();
export { VideoPlaybackManager };
