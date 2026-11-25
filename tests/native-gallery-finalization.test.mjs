import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const native = read('../android/app/src/main/java/com/voiceofharrison/nexora/NexoraMediaPlugin.java');
const activity = read('../android/app/src/main/java/com/voiceofharrison/nexora/MainActivity.java');
const service = read('../src/services/nativeGalleryService.ts');
const composer = read('../src/components/MediaCreationEngine.tsx');
const manifest = read('../android/app/src/main/AndroidManifest.xml');

test('Android gallery asks for Photos and Videos access separately', () => {
  assert.match(native, /alias = "galleryPhotos"/);
  assert.match(native, /alias = "galleryVideos"/);
  assert.match(native, /kind\.equals\("videos"\) \? "galleryVideos" : "galleryPhotos"/);
  assert.match(manifest, /READ_MEDIA_VISUAL_USER_SELECTED/);
  assert.match(manifest, /READ_EXTERNAL_STORAGE" android:maxSdkVersion="32"/);
});

test('native gallery imports are size-limited and temporary files are safely cleaned', () => {
  assert.match(native, /250L \* 1024L \* 1024L/);
  assert.match(native, /12L \* 1024L \* 1024L/);
  assert.match(native, /copied > maxBytes/);
  assert.match(native, /getCanonicalFile\(\)/);
  assert.match(service, /deleteGalleryImport/);
  assert.match(service, /finally/);
});

test('gallery browsing is paginated and preserves media metadata for previews', () => {
  assert.match(native, /loadThumbnail/);
  assert.match(native, /DATE_ADDED \+ " DESC"/);
  assert.match(native, /durationMs/);
  assert.match(composer, /loadNativeGalleryPage\(galleryTab, 0, 60\)/);
  assert.match(composer, /loadMoreNativeGalleryItems/);
  assert.match(composer, /nativeGalleryAlbum/);
});

test('native video selection supports Studio multi-clip handoff while photos support multi-select', () => {
  assert.match(composer, /galleryTab === 'photos' \? 20 : \(onOpenStudio \? 12 : 1\)/);
  assert.match(composer, /slice\(0, galleryTab === 'videos' \? \(onOpenStudio \? 12 : 1\) : 20\)/);
  assert.match(composer, /setActiveMode\('video'\)/);
  assert.match(composer, /handleVideoUpload\(event\)/);
  assert.match(composer, /Open \\${nativeGallerySelectedIds.length} clips in Studio/);
});

test('Android hardware back is routed into the active Create navigation stack', () => {
  assert.match(native, /setCreateExperienceActive/);
  assert.match(activity, /isCreateExperienceActive\(\)/);
  assert.match(activity, /nexora:android-back/);
  assert.match(composer, /addEventListener\('nexora:android-back'/);
  assert.match(composer, /setShowExitConfirm\(false\)/);
});

test('gallery permission recovery offers retry and Android app settings', () => {
  assert.match(native, /openAppSettings/);
  assert.match(service, /openNativeAppSettings/);
  assert.match(composer, /Try again/);
  assert.match(composer, /App settings/);
});

test('offline publishing retains local draft recovery and exposes upload retry', () => {
  assert.match(composer, /Connect to the internet before publishing photos/);
  assert.match(composer, /Connect to publish this video/);
  assert.match(composer, /Your draft is still safe to retry/);
  assert.match(composer, /Review and try again/);
});
