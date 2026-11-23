import { useState, useEffect } from 'react';
import { apiRequestUrl } from '../lib/apiBaseUrl';

/**
 * Nexora Persistent IndexedDB Media Storage Utility
 * Designed to persist large video and audio binaries in-browser across page refreshes,
 * login/logout sessions, and prevent localStorage limit crashes.
 */

const DB_NAME = 'NexoraMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media';

// Reuse one database connection instead of opening a new connection for every
// media lookup. Browsers can otherwise accumulate idle IndexedDB connections.
let mediaDbPromise: Promise<IDBDatabase> | null = null;

export function initMediaDB(): Promise<IDBDatabase> {
  if (mediaDbPromise) return mediaDbPromise;

  mediaDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open Nexora IndexedDB media storage');
      mediaDbPromise = null;
      reject(request.error);
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        mediaDbPromise = null;
      };
      resolve(db);
    };

    request.onblocked = () => {
      console.warn('[Storage] IndexedDB upgrade is blocked by another open connection');
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });

  return mediaDbPromise;
}

/**
 * Saves a binary blob to the IndexedDB media store
 */
export async function saveMediaBlob(id: string, blob: Blob): Promise<string> {
  const db = await initMediaDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, id);

    request.onsuccess = () => {
      resolve(`db-media://${id}`);
    };

    request.onerror = () => {
      console.error(`[Storage] Failed to store media blob in IndexedDB: ${id}`, request.error);
      reject(request.error);
    };
  });
}

/**
 * Retrieves a media blob from IndexedDB by ID
 */
export async function getMediaBlob(id: string): Promise<Blob | null> {
  const db = await initMediaDB();
  return new Promise((resolve) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result || null);
    };

    request.onerror = () => {
      console.error(`[Storage] Retrieve error for ID: ${id}`);
      resolve(null);
    };
  });
}

// Cache both completed and in-flight resolutions. The in-flight map prevents
// simultaneous feed cards from creating duplicate object URLs for the same blob.
const objectUrlCache = new Map<string, string>();
const objectUrlPromises = new Map<string, Promise<string>>();

/**
 * Resolves any custom `db-media://` URL to a usable browser object URL.
 * Pass-through if it's already a regular URL or base64.
 */
export async function resolveMediaUrl(url: string): Promise<string> {
  if (!url) return url;
  // Public R2 gateway URLs are stored as relative /api/media paths. Native
  // Capacitor WebViews must send them to the configured HTTPS API origin.
  if (url.startsWith('/api/')) return apiRequestUrl(url);
  if (!url.startsWith('db-media://')) return url;

  const cached = objectUrlCache.get(url);
  if (cached) return cached;

  const pending = objectUrlPromises.get(url);
  if (pending) return pending;

  const resolution = (async () => {
    const basePart = url.split('#')[0].split('?')[0];
    const hashPart = url.includes('#') ? '#' + url.split('#')[1] : '';
    const queryPart = url.includes('?') ? '?' + url.split('?')[1].split('#')[0] : '';

    const id = basePart.replace('db-media://', '');
    const blob = await getMediaBlob(id);
    if (!blob) {
      console.warn(`[Storage] Blob not found in IndexedDB for URL: ${url}`);
      return '';
    }

    const objectUrl = URL.createObjectURL(blob);
    const resolvedWithSuffix = objectUrl + queryPart + hashPart;
    objectUrlCache.set(url, resolvedWithSuffix);
    return resolvedWithSuffix;
  })();

  objectUrlPromises.set(url, resolution);
  try {
    return await resolution;
  } finally {
    objectUrlPromises.delete(url);
  }
}

/**
 * Extract a real frame from an uploaded video before it is sent to R2.
 *
 * Waits for decoded frame data before drawing. The old timeout path attempted
 * to draw even when the browser had not decoded a frame yet, which produced
 * blank thumbnails on slower phones and larger videos.
 */
export function generateVideoThumbnail(videoBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    if (!videoBlob || videoBlob.size <= 0 || typeof document === 'undefined') {
      resolve('');
      return;
    }

    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    let settled = false;
    let frameRequested = false;
    const objectUrl = URL.createObjectURL(videoBlob);

    const cleanup = () => {
      clearTimeout(timeoutId);
      video.removeEventListener('loadedmetadata', handleMetadata);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
      video.pause();
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    const finish = (thumbnail: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(thumbnail);
    };

    const extractFrame = () => {
      if (settled || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
        || video.videoWidth <= 0 || video.videoHeight <= 0) {
        return false;
      }
      try {
        const maxEdge = 1280;
        const scale = Math.min(1, maxEdge / Math.max(video.videoWidth, video.videoHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) return false;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.88);
        if (!thumbnail.startsWith('data:image/jpeg;base64,') || thumbnail.length < 500) return false;
        finish(thumbnail);
        return true;
      } catch (error) {
        console.warn('[Storage] Could not extract a video thumbnail frame.', error);
        return false;
      }
    };

    const requestFrame = () => {
      if (settled || frameRequested) return;
      if (extractFrame()) return;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      frameRequested = true;
      // A frame can be decoded just after loadeddata/seeked on mobile browsers.
      if (typeof video.requestVideoFrameCallback === 'function') {
        video.requestVideoFrameCallback(() => {
          frameRequested = false;
          if (!extractFrame()) finish('');
        });
      } else {
        requestAnimationFrame(() => {
          frameRequested = false;
          if (!extractFrame()) finish('');
        });
      }
    };

    const handleMetadata = () => {
      const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      const seekTime = duration > 0 ? Math.min(0.5, Math.max(0.05, duration * 0.12)) : 0;
      try {
        if (seekTime > 0 && Math.abs(video.currentTime - seekTime) > 0.01) {
          video.currentTime = seekTime;
        } else {
          requestFrame();
        }
      } catch {
        requestFrame();
      }
    };

    const handleLoadedData = () => {
      if (video.currentTime > 0.01) requestFrame();
      else handleMetadata();
    };
    const handleSeeked = () => requestFrame();
    const handleError = () => finish('');

    const timeoutId = setTimeout(() => {
      // Never turn an undecoded video frame into a permanent black thumbnail.
      if (!extractFrame()) finish('');
    }, 12000);

    video.addEventListener('loadedmetadata', handleMetadata);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('seeked', handleSeeked);
    video.addEventListener('error', handleError);
    video.src = objectUrl;
    video.load();
  });
}

/**
 * A custom React hook that automatically resolves custom db-media:// URLs or pass-through
 * standard URLs asynchronously, so standard HTML <video> and <audio> elements work seamlessly.
 */
export function useResolvedUrl(url: string | undefined): string {
  const [resolved, setResolved] = useState<string>('');

  useEffect(() => {
    if (!url) {
      setResolved('');
      return;
    }
    
    // Never keep showing the previous post's media while a new URL resolves.
    setResolved('');
    let active = true;
    resolveMediaUrl(url)
      .then(res => {
        if (active) {
          setResolved(res || '');
        }
      })
      .catch(err => {
        console.error('[Storage] Failed to resolve media URL:', url, err);
        if (active) {
          setResolved('');
        }
      });

    return () => {
      active = false;
    };
  }, [url]);

  return resolved;
}
