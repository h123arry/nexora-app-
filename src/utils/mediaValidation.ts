export type MediaKind = 'image' | 'video' | 'audio';

export const MEDIA_LIMITS = {
  imageBytes: 12 * 1024 * 1024,
  videoBytes: 250 * 1024 * 1024,
  audioBytes: 50 * 1024 * 1024,
  maxVideoDurationSeconds: 180,
  maxImageWidth: 12000,
  maxImageHeight: 12000,
} as const;

const acceptedTypes: Record<MediaKind, readonly string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/aac'],
};

const acceptedExtensions: Record<MediaKind, readonly string[]> = {
  image: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'],
  video: ['mp4', 'webm', 'mov', 'ogg'],
  audio: ['mp3', 'm4a', 'wav', 'webm', 'ogg', 'aac'],
};

export interface MediaMetadata {
  kind: MediaKind;
  type: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

function extensionOf(name: string): string {
  return name.toLowerCase().split('.').pop() || '';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function maxBytesFor(kind: MediaKind): number {
  if (kind === 'image') return MEDIA_LIMITS.imageBytes;
  if (kind === 'video') return MEDIA_LIMITS.videoBytes;
  return MEDIA_LIMITS.audioBytes;
}

function assertType(file: File, kind: MediaKind): void {
  const typeAllowed = acceptedTypes[kind].includes(file.type);
  const extensionAllowed = acceptedExtensions[kind].includes(extensionOf(file.name));
  if (!typeAllowed && !extensionAllowed) {
    throw new Error(`Unsupported ${kind} format. Please choose a supported ${kind} file.`);
  }
}

function loadElementMetadata(file: File, kind: 'image' | 'video' | 'audio'): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const element = kind === 'image' ? new Image() : document.createElement(kind);
    const imageElement = element as HTMLImageElement;
    const mediaElement = element as HTMLMediaElement;
    let settled = false;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      element.onload = null;
      element.onerror = null;
      if (kind !== 'image') {
        element.onloadedmetadata = null;
      }
      element.removeAttribute('src');
      if (kind !== 'image') mediaElement.load();
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    element.onerror = () => fail(`The ${kind} file could not be decoded by this browser.`);
    if (kind === 'image') {
      element.onload = () => {
        if (settled) return;
        settled = true;
        const width = imageElement.naturalWidth;
        const height = imageElement.naturalHeight;
        cleanup();
        if (!width || !height) {
          reject(new Error('The image has no readable dimensions.'));
          return;
        }
        resolve({ kind, type: file.type, size: file.size, width, height });
      };
      element.src = objectUrl;
      return;
    }

    element.onloadedmetadata = () => {
      if (settled) return;
      settled = true;
      const duration = Number.isFinite(mediaElement.duration) ? mediaElement.duration : 0;
      const videoElement = mediaElement as HTMLVideoElement;
      const width = kind === 'video' ? videoElement.videoWidth : undefined;
      const height = kind === 'video' ? videoElement.videoHeight : undefined;
      cleanup();
      resolve({ kind, type: file.type, size: file.size, width, height, duration });
    };
    mediaElement.preload = 'metadata';
    element.src = objectUrl;
    mediaElement.load();
  });
}

export async function validateMediaFile(file: File, kind: MediaKind): Promise<MediaMetadata> {
  assertType(file, kind);
  if (file.size <= 0) throw new Error('The selected file is empty.');
  const maxBytes = maxBytesFor(kind);
  if (file.size > maxBytes) {
    throw new Error(`${kind[0].toUpperCase() + kind.slice(1)} files must be ${formatBytes(maxBytes)} or smaller.`);
  }

  const metadata = await loadElementMetadata(file, kind);
  if (kind === 'image' && (metadata.width! > MEDIA_LIMITS.maxImageWidth || metadata.height! > MEDIA_LIMITS.maxImageHeight)) {
    throw new Error(`Images must be ${MEDIA_LIMITS.maxImageWidth}px or smaller on each side.`);
  }
  if (kind === 'video' && metadata.duration && metadata.duration > MEDIA_LIMITS.maxVideoDurationSeconds) {
    throw new Error(`Videos must be ${MEDIA_LIMITS.maxVideoDurationSeconds} seconds or shorter.`);
  }
  return metadata;
}

export function revokeObjectUrl(url: string | null | undefined): void {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}
