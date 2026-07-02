// Reusable global VideoPlaybackManager for single active video orchestration
// Supporting features: Picture-in-Picture, auto-next, casting, and playlists.

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
  
  // Persistent mute state synced with localStorage
  private globalMuted: boolean = (() => {
    return localStorage.getItem('nexora_video_muted') !== 'false';
  })();

  constructor() {
    if (typeof window !== 'undefined') {
      // Listen to visibility change to pause video on backgrounding
      window.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.pauseActive();
        }
      });
      
      // Handle page-level events for cross-tab or global triggers
      window.addEventListener('nexora-video-global-pause-all', () => {
        this.pauseAll();
      });
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
    this.registeredPlayers.delete(id);
    if (this.activePlayerId === id) {
      this.activePlayerId = null;
      this.activeVideoElement = null;
      this.activeVideoUrl = null;
    }
  }

  /**
   * Request play for a player instance
   */
  public async play(id: string, videoElement: HTMLVideoElement, url: string): Promise<boolean> {
    // Guard: Prevent trying to play a video element with no source or unresolved source
    if (!videoElement || !videoElement.src || videoElement.src === window.location.href || videoElement.src.trim() === '') {
      return false;
    }

    // If another video was active, pause it immediately
    if (this.activePlayerId && this.activePlayerId !== id) {
      this.pauseActive();
    }

    this.activePlayerId = id;
    this.activeVideoElement = videoElement;
    this.activeVideoUrl = url;

    // Apply the current global mute setting to this element
    videoElement.muted = this.globalMuted;

    // Retrieve and restore saved position if any
    const savedPos = this.getPosition(url);
    if (savedPos > 0 && Math.abs(videoElement.currentTime - savedPos) > 1.0) {
      // If position is far from current, restore it
      if (savedPos < videoElement.duration - 2) {
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
          new CustomEvent('nexora-video-play-sync', { detail: { id, url } })
        );
      }
      return true;
    } catch (err) {
      console.warn(`[VideoPlaybackManager] Autoplay failed for player ${id}:`, err);
      // Attempt muted fallback to bypass browser autoplay constraints without destroying user's sound preferences
      if (!videoElement.muted) {
        try {
          videoElement.muted = true;
          await videoElement.play();
          return true;
        } catch (e) {
          console.warn(`[VideoPlaybackManager] Muted playback also failed:`, e);
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
    
    // Pause any actual active element playing
    if (this.activeVideoElement) {
      this.activeVideoElement.pause();
    }

    this.registeredPlayers.forEach((callbacks, id) => {
      try {
        callbacks.pause();
      } catch (e) {
        console.warn(`[VideoPlaybackManager] Error pausing player ${id}:`, e);
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
    this.playbackPositions.set(url, position);
    localStorage.setItem(`nexora_vid_pos_${url}`, String(position));
  }

  /**
   * Retrieve video playback position
   */
  public getPosition(url: string): number {
    if (!url) return 0;
    if (this.playbackPositions.has(url)) {
      return this.playbackPositions.get(url)!;
    }
    const saved = localStorage.getItem(`nexora_vid_pos_${url}`);
    if (saved) {
      const parsed = parseFloat(saved);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  /**
   * Update and synchronize global mute/volume settings
   */
  public setMute(muted: boolean) {
    this.globalMuted = muted;
    localStorage.setItem('nexora_video_muted', muted ? 'true' : 'false');
    
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
          console.warn('[VideoPlaybackManager] Error syncing mute to player', e);
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
}

export const globalVideoPlaybackManager = new VideoPlaybackManager();
