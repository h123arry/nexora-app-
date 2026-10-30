import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isUserCacheReady, readUserScopedJson, userScopedStorageKey, writeUserScopedJson } from '../src/utils/userScopedStorage';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('UID-scoped local storage', () => {
  it('blocks writes until authenticated, visible, and loaded cache identities match', () => {
    assert.equal(isUserCacheReady('bob', 'alice', 'alice'), false);
    assert.equal(isUserCacheReady('bob', 'bob', 'alice'), false);
    assert.equal(isUserCacheReady('bob', 'bob', 'bob'), true);
    assert.equal(isUserCacheReady(null, 'guest', 'guest'), false);
  });

  it('does not fall back to a legacy unscoped cache or another account cache', () => {
    const storage = new MemoryStorage();
    storage.setItem('nexora_notifications', JSON.stringify([{ id: 'legacy-private' }]));
    storage.setItem(userScopedStorageKey('nexora_notifications', 'alice'), JSON.stringify([{ id: 'alice-only' }]));

    assert.deepEqual(readUserScopedJson(storage, 'nexora_notifications', 'alice', []), [{ id: 'alice-only' }]);
    assert.deepEqual(readUserScopedJson(storage, 'nexora_notifications', 'bob', []), []);
    assert.deepEqual(readUserScopedJson(storage, 'nexora_notifications', '', []), []);
  });

  it('writes only to the explicit account key and rejects missing account identity', () => {
    const storage = new MemoryStorage();
    assert.equal(writeUserScopedJson(storage, 'nexora_messages', 'alice', [{ id: 'm1' }]), true);
    assert.equal(storage.getItem('nexora_messages'), null);
    assert.deepEqual(JSON.parse(storage.getItem('nexora_messages_alice') || 'null'), [{ id: 'm1' }]);
    assert.equal(writeUserScopedJson(storage, 'nexora_messages', '', [{ id: 'unowned' }]), false);
    assert.equal(storage.getItem('nexora_messages_'), null);
  });

  it('uses the fallback for malformed JSON without consulting another key', () => {
    const storage = new MemoryStorage();
    storage.setItem('nexora_chats_alice', 'not-json');
    storage.setItem('nexora_chats_bob', JSON.stringify([{ id: 'bob-chat' }]));
    assert.deepEqual(readUserScopedJson(storage, 'nexora_chats', 'alice', []), []);
    assert.deepEqual(readUserScopedJson(storage, 'nexora_chats', 'bob', []), [{ id: 'bob-chat' }]);
  });
});
