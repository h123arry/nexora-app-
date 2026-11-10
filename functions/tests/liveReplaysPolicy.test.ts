import test from 'node:test';
import assert from 'node:assert/strict';
import { canWatchLiveReplay, isSafeLiveReplayObjectPath } from '../src/liveReplaysPolicy.js';

test('only the host or an authenticated attendee can watch a replay', () => {
  assert.equal(canWatchLiveReplay('host-1', 'host-1', false), true);
  assert.equal(canWatchLiveReplay('host-1', 'viewer-1', true), true);
  assert.equal(canWatchLiveReplay('host-1', 'outsider', false), false);
  assert.equal(canWatchLiveReplay('host-1', '', true), false);
});

test('replay object paths are restricted to the dedicated replay prefix', () => {
  assert.equal(isSafeLiveReplayObjectPath('nexora-live/session-123/recording.mp4'), true);
  assert.equal(isSafeLiveReplayObjectPath('../private/file.mp4'), false);
  assert.equal(isSafeLiveReplayObjectPath('/nexora-live/file.mp4'), false);
  assert.equal(isSafeLiveReplayObjectPath('users/person/file.mp4'), false);
  assert.equal(isSafeLiveReplayObjectPath('nexora-live/../../private'), false);
  assert.equal(isSafeLiveReplayObjectPath(null), false);
});
