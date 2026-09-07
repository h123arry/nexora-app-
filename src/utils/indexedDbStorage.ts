import { useState, useEffect } from 'react';

/**
 * Nexora Persistent IndexedDB Media Storage Utility
 * Designed to persist large video and audio binaries in-browser across page refreshes,
 * login/logout sessions, and prevent localStorage limit crashes.
 */

const DB_NAME = 'NexoraMediaDB';
const DB_VERSION = 1;
const STORE_NAME = 'media';

export function initMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open Nexora IndexedDB media storage');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
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

// In-memory cache of resolved db-media object URLs to avoid redundant blob url creation
const objectUrlCache = new Map<string, string>();

/**
 * Resolves any custom `db-media://` URL to a usable browser object URL.
 * Pass-through if it's already a regular URL or base64.
 */
export async function resolveMediaUrl(url: string): Promise<string> {
  if (!url || !url.startsWith('db-media://')) {
    return url;
  }

  if (objectUrlCache.has(url)) {
    return objectUrlCache.get(url)!;
  }

  const basePart = url.split('#')[0].split('?')[0];
  const hashPart = url.includes('#') ? '#' + url.split('#')[1] : '';
  const queryPart = url.includes('?') ? '?' + url.split('?')[1].split('#')[0] : '';

  const id = basePart.replace('db-media://', '');
  const blob = await getMediaBlob(id);
  if (!blob) {
    console.warn(`[Storage] Blob not found in IndexedDB for URL: ${url}, using sample video asset fallback`);
    const fallback = 'https://assets.mixkit.co/videos/preview/mixkit-matrix-style-code-digital-falling-40114-large.mp4' + queryPart + hashPart;
    objectUrlCache.set(url, fallback);
    return fallback;
  }

  const objectUrl = URL.createObjectURL(blob);
  const resolvedWithSuffix = objectUrl + queryPart + hashPart;
  objectUrlCache.set(url, resolvedWithSuffix);
  return resolvedWithSuffix;
}

/**
 * Generates and stores a video thumbnail at 0.1-0.5s from a video File or Blob
 */
export function generateVideoThumbnail(videoBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;

    const url = URL.createObjectURL(videoBlob);
    video.src = url;

    let hasExtracted = false;

    // Timeout fallback if generating takes too long
    const timeoutId = setTimeout(() => {
      if (!hasExtracted) {
        hasExtracted = true;
        extractFrame();
      }
    }, 3000);

    const cleanup = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
      video.onloadeddata = null;
      video.onloadedmetadata = null;
      video.oncanplay = null;
      video.onseeked = null;
      video.onerror = null;
    };

    const extractFrame = () => {
      try {
        const width = video.videoWidth || 480;
        const height = video.videoHeight || 640;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          cleanup();
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        console.error('[Storage] Error drawing video thumbnail frame', err);
      }
      cleanup();
      resolve('');
    };

    const prepareAndSeek = () => {
      if (hasExtracted) return;
      let seekTime = 0.2;
      if (video.duration && video.duration > 0 && isFinite(video.duration)) {
        seekTime = Math.max(0.1, Math.min(0.5, video.duration / 2));
      }
      try {
        video.currentTime = seekTime;
      } catch {
        // Seek failed or unsupported, extract immediately
        hasExtracted = true;
        extractFrame();
      }
    };

    video.onloadedmetadata = prepareAndSeek;
    video.onloadeddata = prepareAndSeek;
    video.oncanplay = () => {
      if (!hasExtracted && video.currentTime > 0) {
        hasExtracted = true;
        extractFrame();
      }
    };

    video.onseeked = () => {
      if (!hasExtracted) {
        hasExtracted = true;
        extractFrame();
      }
    };
    
    video.onerror = () => {
      console.warn('[Storage] Video thumbnail load error, resolving fallback');
      cleanup();
      resolve('');
    };
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

