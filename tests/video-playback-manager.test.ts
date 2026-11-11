import assert from 'node:assert/strict';
import test from 'node:test';
import { VideoPlaybackManager } from '../src/utils/VideoPlaybackManager';

test('clearMemory fully releases hidden video preload elements', () => {
  const manager = new VideoPlaybackManager();
  const calls: string[] = [];
  const element = {
    pause: () => calls.push('pause'),
    removeAttribute: (name: string) => calls.push(`remove:${name}`),
    load: () => calls.push('load'),
    preload: 'auto',
  } as unknown as HTMLVideoElement;

  (manager as any).preloadElements.set('https://cdn.example/video.mp4', element);
  manager.clearMemory();

  assert.deepEqual(calls, ['pause', 'remove:src', 'load']);
  assert.equal((manager as any).preloadElements.size, 0);
});
