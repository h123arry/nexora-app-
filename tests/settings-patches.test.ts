import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeSettingsNamespace } from '../src/services/firebase/settingsPatches';

test('merges only the requested settings namespace and preserves sibling fields', () => {
  const current = {
    privacy: { isPrivateAccount: true, allowDms: false, showActivityStatus: true },
    notifications: { pushEnabled: true, emailDigests: false },
    appearance: { theme: 'midnight', reducedMotion: false },
  };
  const patch = mergeSettingsNamespace(current, 'privacy', { allowDms: true });

  assert.deepEqual(patch, {
    privacy: { isPrivateAccount: true, allowDms: true, showActivityStatus: true },
  });
  assert.equal('notifications' in patch, false);
  assert.equal('appearance' in patch, false);
});

test('adds a previously absent optional namespace field without dropping existing values', () => {
  const current = { notifications: { pushEnabled: true, emailDigests: false } };
  assert.deepEqual(
    mergeSettingsNamespace(current, 'notifications', { emailDigests: true }),
    { notifications: { pushEnabled: true, emailDigests: true } },
  );
});
