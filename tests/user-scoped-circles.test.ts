import assert from 'node:assert/strict';
import { after, test } from 'node:test';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

const originalLocalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
const storage = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: storage });

const { getJoinedCirclesForUser } = await import('../src/data/database.ts');

test("legacy circle memberships are migrated only to the matching user's cache", () => {
  storage.setItem('nexora_db_joined_circles', JSON.stringify([
    { userId: 'alice', circleId: 'circle-a' },
    { userId: 'bob', circleId: 'circle-b' },
  ]));

  assert.deepEqual(getJoinedCirclesForUser('alice'), [{ userId: 'alice', circleId: 'circle-a' }]);
  assert.deepEqual(getJoinedCirclesForUser('bob'), [{ userId: 'bob', circleId: 'circle-b' }]);
  assert.deepEqual(JSON.parse(storage.getItem('nexora_db_joined_circles_alice') || 'null'), [
    { userId: 'alice', circleId: 'circle-a' },
  ]);
  assert.deepEqual(JSON.parse(storage.getItem('nexora_db_joined_circles_bob') || 'null'), [
    { userId: 'bob', circleId: 'circle-b' },
  ]);
});

test('an explicitly empty user cache does not resurrect legacy membership records', () => {
  storage.setItem('nexora_db_joined_circles_alice', '[]');
  assert.deepEqual(getJoinedCirclesForUser('alice'), []);
});

after(() => {
  if (originalLocalStorage) Object.defineProperty(globalThis, 'localStorage', originalLocalStorage);
  else Reflect.deleteProperty(globalThis, 'localStorage');
});
