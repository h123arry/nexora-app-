import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getBytes, ref } from 'firebase/storage';
import { auth, db, storage } from './firebase/config';
import { deleteMediaFile, uploadMediaFile } from './firebase/storageService';
import { isStudioCloudAssetPathOwnedByUser, isStudioCloudRevisionCurrent } from '../utils/studioCloudDraftPolicy';

type CloudAsset = { storagePath: string; contentType: string; size: number };
type Encoded = null | string | number | boolean | Encoded[] | { [key: string]: Encoded };
type CloudManifest = { schemaVersion: 1; project: Encoded; assets: Record<string, CloudAsset> };
export type StudioCloudDraft<T> = { project: T; revision: number; updatedAt: number };
export type StudioCloudSaveResult = { revision: number; uploadedBytes: number };

const uploadedBlobs = new WeakMap<Blob, Promise<CloudAsset>>();
const assetIds = new WeakMap<Blob, string>();
const uploadedBlobByPath = new Map<string, WeakRef<Blob>>();
const MAX_CLOUD_DRAFT_BYTES = 500 * 1024 * 1024;
const MAX_CLOUD_DRAFT_ASSETS = 100;
const MAX_CLOUD_MANIFEST_BYTES = 700 * 1024;

function makeAssetId(): string {
  return crypto.randomUUID();
}

function assertSignedIn(userId: string): void {
  if (!db || !storage) throw new Error('NEXORA cloud drafts are not configured in this environment.');
  if (!auth.currentUser || auth.currentUser.uid !== userId) {
    throw new Error('Sign in to the same account before syncing this Studio draft.');
  }
}

async function encodeValue(
  value: unknown,
  userId: string,
  assets: Record<string, CloudAsset>,
  progress: (assetId: string, bytes: number) => void,
  createdAssets: Array<{ blob: Blob; asset: CloudAsset }>,
  signal?: AbortSignal,
): Promise<Encoded> {
  if (signal?.aborted) throw new DOMException('Cloud draft sync cancelled.', 'AbortError');
  if (value instanceof Blob) {
    let id = assetIds.get(value);
    if (!id) {
      id = makeAssetId();
      assetIds.set(value, id);
    }
    if (!assets[id] && Object.keys(assets).length >= MAX_CLOUD_DRAFT_ASSETS) {
      throw new Error('This Studio project contains too many separate media assets for cloud backup. Your local draft is safe.');
    }
    const asset = await uploadAssetWithId(value, userId, id, signal, progress, createdAssets);
    assets[id] = asset;
    return { $studioAsset: id };
  }
  if (Array.isArray(value)) {
    const encoded: Encoded[] = [];
    for (const item of value) encoded.push(await encodeValue(item, userId, assets, progress, createdAssets, signal));
    return encoded;
  }
  if (value && typeof value === 'object') {
    const encoded: Record<string, Encoded> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined && typeof item !== 'function') {
        encoded[key] = await encodeValue(item, userId, assets, progress, createdAssets, signal);
      }
    }
    return encoded;
  }
  if (value === null) return null;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return null;
}

async function uploadAssetWithId(
  blob: Blob,
  userId: string,
  id: string,
  signal?: AbortSignal,
  progress?: (assetId: string, bytes: number) => void,
  createdAssets: Array<{ blob: Blob; asset: CloudAsset }> = [],
): Promise<CloudAsset> {
  const existing = uploadedBlobs.get(blob);
  if (existing) return existing;
  const pending = uploadMediaFile({
    file: blob,
    userId,
    mediaId: id,
    fileName: `studio-asset-${id}`,
    metadata: { purpose: 'studio-draft', draftOwnerId: userId },
    signal,
    onProgress: percent => progress?.(id, Math.round(blob.size * percent / 100)),
  }).then(result => {
    const asset = { storagePath: result.storagePath, contentType: result.contentType, size: result.size };
    createdAssets.push({ blob, asset });
    uploadedBlobByPath.set(asset.storagePath, new WeakRef(blob));
    return asset;
  }).catch(error => {
    uploadedBlobs.delete(blob);
    assetIds.delete(blob);
    throw error;
  });
  uploadedBlobs.set(blob, pending);
  return pending;
}

async function decodeValue(value: Encoded, assets: Record<string, CloudAsset>, userId: string): Promise<unknown> {
  if (Array.isArray(value)) return Promise.all(value.map(item => decodeValue(item, assets, userId)));
  if (value && typeof value === 'object') {
    const assetId = (value as Record<string, Encoded>).$studioAsset;
    if (typeof assetId === 'string') {
      const asset = assets[assetId];
      if (!asset || !isStudioCloudAssetPathOwnedByUser(asset.storagePath, userId)) {
        throw new Error('A Studio draft media asset is missing or does not belong to this account.');
      }
      if (!storage) throw new Error('Cloud media storage is unavailable.');
      const bytes = await getBytes(ref(storage, asset.storagePath));
      const blob = new Blob([bytes], { type: asset.contentType });
      assetIds.set(blob, assetId);
      uploadedBlobs.set(blob, Promise.resolve(asset));
      uploadedBlobByPath.set(asset.storagePath, new WeakRef(blob));
      return blob;
    }
    const decoded: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) decoded[key] = await decodeValue(item, assets, userId);
    return decoded;
  }
  return value;
}

export async function getStudioCloudDraftRevision(userId: string): Promise<number> {
  assertSignedIn(userId);
  const snapshot = await getDoc(doc(db!, 'studioCloudDrafts', userId));
  if (!snapshot.exists()) return 0;
  const revision = snapshot.data().revision;
  return Number.isInteger(revision) && revision >= 0 ? revision : 0;
}

export async function loadStudioCloudDraft<T>(userId: string): Promise<StudioCloudDraft<T> | null> {
  assertSignedIn(userId);
  const snapshot = await getDoc(doc(db!, 'studioCloudDrafts', userId));
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  const manifest = data.manifest as CloudManifest | undefined;
  if (!manifest || manifest.schemaVersion !== 1 || !manifest.project || !manifest.assets) {
    throw new Error('The cloud Studio draft has an unsupported format. Your local draft is untouched.');
  }
  const project = await decodeValue(manifest.project, manifest.assets, userId) as T;
  const updatedAt = typeof data.updatedAt?.toMillis === 'function' ? data.updatedAt.toMillis() : 0;
  return { project, revision: Number.isInteger(data.revision) ? data.revision : 0, updatedAt };
}

export async function saveStudioCloudDraft<T>(
  userId: string,
  project: T,
  expectedRevision: number,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<StudioCloudSaveResult> {
  assertSignedIn(userId);
  const draftRef = doc(db!, 'studioCloudDrafts', userId);
  const before = await getDoc(draftRef);
  const currentRevision = before.exists() && Number.isInteger(before.data().revision) ? before.data().revision : 0;
  if (!isStudioCloudRevisionCurrent(expectedRevision, currentRevision)) {
    throw new Error('This Studio draft changed on another device. Reload the cloud version before syncing to avoid overwriting those edits.');
  }
  const oldManifest = before.exists() ? before.data().manifest as CloudManifest | undefined : undefined;
  const assets: Record<string, CloudAsset> = {};
  let totalBytes = 0;
  const countedBlobs = new Set<Blob>();
  const collectBytes = (value: unknown): void => {
    if (value instanceof Blob) {
      if (!countedBlobs.has(value)) { countedBlobs.add(value); totalBytes += value.size; }
      return;
    }
    if (Array.isArray(value)) value.forEach(collectBytes);
    else if (value && typeof value === 'object') Object.values(value as Record<string, unknown>).forEach(collectBytes);
  };
  collectBytes(project);
  if (totalBytes > MAX_CLOUD_DRAFT_BYTES) {
    throw new Error('This Studio project exceeds the 500 MB cloud-backup limit. Your on-device draft remains available.');
  }
  const progressByAsset = new Map<string, number>();
  const createdAssets: Array<{ blob: Blob; asset: CloudAsset }> = [];
  const nextRevision = expectedRevision + 1;
  try {
    const encoded = await encodeValue(project, userId, assets, (assetId, bytes) => {
      progressByAsset.set(assetId, bytes);
      const uploadedBytes = [...progressByAsset.values()].reduce((sum, value) => sum + value, 0);
      onProgress?.(totalBytes ? Math.min(99, Math.round(uploadedBytes / totalBytes * 100)) : 99);
    }, createdAssets, signal);
    const manifest: CloudManifest = { schemaVersion: 1, project: encoded, assets };
    if (new TextEncoder().encode(JSON.stringify(manifest)).byteLength > MAX_CLOUD_MANIFEST_BYTES) {
      throw new Error('This Studio project metadata is too large to back up safely. Your on-device draft remains available.');
    }
    if (signal?.aborted) throw new DOMException('Cloud draft sync cancelled.', 'AbortError');
    await runTransaction(db!, async transaction => {
      const latest = await transaction.get(draftRef);
      const latestRevision = latest.exists() && Number.isInteger(latest.data().revision) ? latest.data().revision : 0;
      if (!isStudioCloudRevisionCurrent(expectedRevision, latestRevision)) {
        throw new Error('This Studio draft changed on another device. Reload the cloud version before syncing to avoid overwriting those edits.');
      }
      transaction.set(draftRef, {
        userId,
        revision: nextRevision,
        manifest,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    await Promise.allSettled(createdAssets.map(async ({ blob, asset }) => {
      uploadedBlobs.delete(blob);
      assetIds.delete(blob);
      uploadedBlobByPath.delete(asset.storagePath);
      await deleteMediaFile(asset.storagePath);
    }));
    throw error;
  }
  const currentPaths = new Set(Object.values(assets).map(asset => asset.storagePath));
  const obsoletePaths = Object.values(oldManifest?.assets || {})
    .map(asset => asset.storagePath)
    .filter(path => !currentPaths.has(path));
  await Promise.allSettled(obsoletePaths.map(async path => {
    const oldBlob = uploadedBlobByPath.get(path)?.deref();
    if (oldBlob) {
      uploadedBlobs.delete(oldBlob);
      assetIds.delete(oldBlob);
      uploadedBlobByPath.delete(path);
    }
    await deleteMediaFile(path);
  }));
  onProgress?.(100);
  return { revision: nextRevision, uploadedBytes: totalBytes };
}
