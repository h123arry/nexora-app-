import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { MemoryEngine } from '../src/services/voh/memoryEngine';

class MemoryStorage {
  private values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
  clear() { this.values.clear(); }
}

describe('VOH memory consent boundary', () => {
  const storage = new MemoryStorage();

  beforeEach(() => {
    storage.clear();
    storage.setItem('nexora_user', JSON.stringify({ id: 'spoofed-old-user' }));
    (globalThis as any).localStorage = storage;
  });

  it('starts disabled and does not invent personal memories', () => {
    assert.equal(MemoryEngine.getActiveUserId(), 'guest');
    const memory = MemoryEngine.getMemory();
    assert.equal(memory.memoryEnabled, false);
    assert.deepEqual(memory.creatorGoals, []);
    assert.deepEqual(memory.personalFacts, []);
    assert.deepEqual(memory.interests, []);
    assert.deepEqual(memory.savedPrompts, []);
  });

  it('requires explicit consent and can be disabled again', () => {
    const enabled = MemoryEngine.setConsent(true);
    assert.equal(enabled.memoryEnabled, true);
    assert.equal(enabled.consentVersion, '2026-11');

    const disabled = MemoryEngine.setConsent(false);
    assert.equal(disabled.memoryEnabled, false);
    assert.equal(disabled.consentVersion, undefined);
  });

  it('does not activate legacy profiles that lack an explicit consent flag', () => {
    storage.setItem('voh_memory_profile_guest', JSON.stringify({
      interests: ['legacy-interest'],
      creatorGoals: ['legacy-goal'],
      savedPrompts: [{ id: 'legacy', name: 'Legacy', content: 'private' }]
    }));
    const memory = MemoryEngine.getMemory();
    assert.equal(memory.memoryEnabled, false);
    assert.deepEqual(memory.interests, []);
    assert.deepEqual(memory.creatorGoals, []);
    assert.deepEqual(memory.savedPrompts, []);
  });

  it('rejects sensitive credential and identity details from memory capture', async () => {
    await assert.rejects(
      MemoryEngine.rememberFact('My bank account number is 1234567890'),
      /will not store passwords, financial credentials, or sensitive identity numbers/
    );
  });

  it('requires memory consent before capturing an explicit remember request', async () => {
    await assert.rejects(
      MemoryEngine.rememberFact('I prefer concise answers'),
      /Enable VOH Memory in settings/
    );
  });

  it('clears the complete local memory profile', () => {
    MemoryEngine.setConsent(true);
    MemoryEngine.saveMemory({
      ...MemoryEngine.getMemory(),
      interests: ['private-test-interest'],
      savedPrompts: [{ id: 'p1', name: 'Private prompt', content: 'secret' }]
    });

    const cleared = MemoryEngine.clearMemory();
    assert.equal(cleared.memoryEnabled, false);
    assert.deepEqual(cleared.interests, []);
    assert.deepEqual(cleared.savedPrompts, []);
  });
});
