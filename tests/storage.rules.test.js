import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes, deleteObject } from 'firebase/storage';

const projectId = 'demo-nexora-storage-rules';
let env;
before(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
    storage: { rules: await readFile(new URL('../storage.rules', import.meta.url), 'utf8') }
  });
});
after(async () => env?.cleanup());
const ctx = (uid) => env.authenticatedContext(uid);
const audio = () => new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' });

describe('Firebase Storage authorization regression tests', () => {
  it('binds uploaded user media metadata to the exact object path ID', async () => {
    const storage = ctx('alice').storage();
    await assertSucceeds(uploadBytes(ref(storage, 'users/alice/media/media-1'), audio(), {
      contentType: 'audio/webm', customMetadata: { ownerId: 'alice', mediaId: 'media-1' }
    }));
    await assertFails(uploadBytes(ref(storage, 'users/alice/media/media-2'), audio(), {
      contentType: 'audio/webm', customMetadata: { ownerId: 'alice', mediaId: 'not-media-2' }
    }));
    await assertFails(uploadBytes(ref(ctx('bob').storage(), 'users/alice/media/media-3'), audio(), {
      contentType: 'audio/webm', customMetadata: { ownerId: 'alice', mediaId: 'media-3' }
    }));
    await assertSucceeds(getBytes(ref(storage, 'users/alice/media/media-1')));
    await assertFails(getBytes(ref(ctx('bob').storage(), 'users/alice/media/media-1')));
    await assertFails(uploadBytes(ref(storage, 'users/alice/media/bad-type'), new Blob(['not image'], { type: 'text/plain' }), {
      contentType: 'text/plain', customMetadata: { ownerId: 'alice', mediaId: 'bad-type' }
    }));
    await assertFails(deleteObject(ref(ctx('bob').storage(), 'users/alice/media/media-1')));
    await assertSucceeds(deleteObject(ref(storage, 'users/alice/media/media-1')));
  });

  it('denies direct client access to chat audio so membership is checked against the named database by the server', async () => {
    const path = 'chats/chat-1/audio/alice/voice-1';
    await assertFails(uploadBytes(ref(ctx('alice').storage(), path), audio(), {
      contentType: 'audio/webm', customMetadata: { ownerId: 'alice', mediaId: 'voice-1', chatId: 'chat-1' }
    }));
    await assertFails(getBytes(ref(ctx('mallory').storage(), path)));
    await assertFails(getBytes(ref(ctx('bob').storage(), path)));
    await assertFails(uploadBytes(ref(ctx('mallory').storage(), 'chats/chat-1/audio/mallory/voice-2'), audio(), {
      contentType: 'audio/webm', customMetadata: { ownerId: 'mallory', mediaId: 'voice-2', chatId: 'chat-1' }
    }));
    await assertFails(uploadBytes(ref(ctx('alice').storage(), 'chats/chat-1/audio/alice/not-audio'), new Blob(['image'], { type: 'image/png' }), {
      contentType: 'image/png', customMetadata: { ownerId: 'alice', mediaId: 'not-audio', chatId: 'chat-1' }
    }));
    await assertFails(deleteObject(ref(ctx('bob').storage(), path)));
    await assertFails(deleteObject(ref(ctx('alice').storage(), path)));
  });
});
