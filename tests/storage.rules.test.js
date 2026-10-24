import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';

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
const seedChat = (chatId, participants) => env.withSecurityRulesDisabled(async (c) => {
  await setDoc(doc(c.firestore(), 'chats', chatId), { id: chatId, participants });
});
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
  });

  it('limits chat audio uploads, reads, and deletes to chat participants and the uploading owner', async () => {
    await seedChat('chat-1', ['alice', 'bob']);
    const path = 'chats/chat-1/audio/alice/voice-1';
    await assertSucceeds(uploadBytes(ref(ctx('alice').storage(), path), audio(), {
      contentType: 'audio/webm', customMetadata: { ownerId: 'alice', mediaId: 'voice-1', chatId: 'chat-1' }
    }));
    await assertSucceeds(getBytes(ref(ctx('bob').storage(), path)));
    await assertFails(getBytes(ref(ctx('mallory').storage(), path)));
    await assertFails(uploadBytes(ref(ctx('mallory').storage(), 'chats/chat-1/audio/mallory/voice-2'), audio(), {
      contentType: 'audio/webm', customMetadata: { ownerId: 'mallory', mediaId: 'voice-2', chatId: 'chat-1' }
    }));
  });
});
