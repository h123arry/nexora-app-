import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BACKUP_DEMO_PREFERENCES_KEY, loadBackupDemoPreferences } from '../src/utils/backupDemoPreferences';

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null { return this.values.get(key) ?? null; }
  setItem(key: string, value: string): void { this.values.set(key, value); }
  removeItem(key: string): void { this.values.delete(key); }
}

test('migrates legacy backup demo settings without retaining plaintext password or recovery-key fields', () => {
  const storage = new MemoryStorage();
  storage.setItem(BACKUP_DEMO_PREFERENCES_KEY, JSON.stringify({
    schedule: 'monthly',
    encryptionPassword: 'a-real-user-entered-secret',
    recoveryKey: 'legacy-placeholder',
    enabledItems: { messages: false },
    destinations: { iCloud: true },
  }));

  const preferences = loadBackupDemoPreferences(storage as unknown as Storage);
  const persisted = JSON.parse(storage.getItem(BACKUP_DEMO_PREFERENCES_KEY) || '{}') as Record<string, unknown>;

  assert.equal(preferences.schedule, 'monthly');
  assert.equal(preferences.enabledItems.messages, false);
  assert.equal(preferences.destinations.iCloud, true);
  assert.equal('encryptionPassword' in persisted, false);
  assert.equal('recoveryKey' in persisted, false);
  assert.doesNotMatch(JSON.stringify(persisted), /a-real-user-entered-secret|legacy-placeholder/);
});

test('resets malformed backup demo settings and removes the corrupt local value', () => {
  const storage = new MemoryStorage();
  storage.setItem(BACKUP_DEMO_PREFERENCES_KEY, '{invalid json');

  const preferences = loadBackupDemoPreferences(storage as unknown as Storage);

  assert.equal(preferences.schedule, 'weekly');
  assert.equal(storage.getItem(BACKUP_DEMO_PREFERENCES_KEY), null);
});
