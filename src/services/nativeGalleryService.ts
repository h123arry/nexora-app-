import { Capacitor, registerPlugin } from '@capacitor/core';

export interface NexoraGalleryItem {
  id: string;
  uri: string;
  name: string;
  mimeType: string;
  dateAdded: number;
  size: number;
  width: number;
  height: number;
  album: string;
  thumbnail: string;
}

interface GalleryPage {
  items: NexoraGalleryItem[];
  nextOffset: number;
  hasMore: boolean;
}

interface ImportedMedia {
  filePath: string;
  name: string;
  mimeType: string | null;
  size: number;
}

interface NexoraMediaPlugin {
  requestGalleryAccess(options: { kind: 'photos' | 'videos' }): Promise<{ granted: boolean }>;
  listGalleryMedia(options: { kind: 'photos' | 'videos'; offset: number; limit: number }): Promise<GalleryPage>;
  importGalleryMedia(options: { uri: string; name: string }): Promise<ImportedMedia>;
}

const NativeMedia = registerPlugin<NexoraMediaPlugin>('NexoraMedia');

export const isNativeGalleryAvailable = (): boolean =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export async function requestNativeGalleryAccess(kind: 'photos' | 'videos'): Promise<boolean> {
  if (!isNativeGalleryAvailable()) return false;
  const result = await NativeMedia.requestGalleryAccess({ kind });
  return result.granted;
}

export async function loadNativeGalleryPage(
  kind: 'photos' | 'videos',
  offset = 0,
  limit = 100,
): Promise<GalleryPage> {
  if (!isNativeGalleryAvailable()) throw new Error('The native gallery is only available in the Android app.');
  return NativeMedia.listGalleryMedia({ kind, offset, limit });
}

export async function importNativeGalleryItem(item: NexoraGalleryItem): Promise<File> {
  if (!isNativeGalleryAvailable()) throw new Error('Native media import is unavailable.');
  const imported = await NativeMedia.importGalleryMedia({ uri: item.uri, name: item.name });
  const localUrl = Capacitor.convertFileSrc(imported.filePath);
  const response = await fetch(localUrl);
  if (!response.ok) throw new Error('The selected media could not be opened. Please try again.');
  const blob = await response.blob();
  const type = imported.mimeType || item.mimeType || blob.type || 'application/octet-stream';
  return new File([blob], imported.name || item.name, { type, lastModified: item.dateAdded || Date.now() });
}
