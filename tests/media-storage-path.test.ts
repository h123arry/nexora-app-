import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mediaStoragePath } from '../src/services/firebase/storagePaths';

describe('media storage paths', () => {
  it('uses the exact mediaId path segment required by user-media rules', () => {
    assert.equal(mediaStoragePath('user-123', 'media-456'), 'users/user-123/media/media-456');
  });
  it('scopes chat audio under its chat and owner for participant-only Storage rules', () => {
    assert.equal(mediaStoragePath('user-123', 'media-456', 'chat-789'), 'chats/chat-789/audio/user-123/media-456');
  });
});
