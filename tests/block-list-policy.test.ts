import assert from 'node:assert/strict';
import test from 'node:test';
import { clearBlockedUserLists, MAX_BLOCKED_USERS, updateBlockedUserLists } from '../src/services/firebase/blockListPolicy';

test('blocking updates the messaging and feed enforcement lists together', () => {
  const result = updateBlockedUserLists({
    ownerId: 'alice',
    targetId: 'bob',
    blockedUserIds: ['carol'],
    blockedCreatorIds: ['dave'],
    blocked: true,
  });

  assert.equal(result.blocked, true);
  assert.deepEqual(result.blockedUserIds, ['carol', 'bob']);
  assert.deepEqual(result.blockedCreatorIds, ['dave', 'bob']);
});

test('toggle removes an existing block from both lists and preserves unrelated entries', () => {
  const result = updateBlockedUserLists({
    ownerId: 'alice',
    targetId: 'bob',
    blockedUserIds: ['bob', 'carol'],
    blockedCreatorIds: ['dave', 'bob'],
  });

  assert.equal(result.blocked, false);
  assert.deepEqual(result.blockedUserIds, ['carol']);
  assert.deepEqual(result.blockedCreatorIds, ['dave']);
});

test('explicit block and unblock operations are idempotent', () => {
  const blocked = updateBlockedUserLists({
    ownerId: 'alice',
    targetId: 'bob',
    blockedUserIds: ['bob'],
    blockedCreatorIds: ['bob'],
    blocked: true,
  });
  const unblocked = updateBlockedUserLists({
    ownerId: 'alice',
    targetId: 'bob',
    blockedUserIds: [],
    blockedCreatorIds: [],
    blocked: false,
  });

  assert.deepEqual(blocked.blockedUserIds, ['bob']);
  assert.deepEqual(blocked.blockedCreatorIds, ['bob']);
  assert.deepEqual(unblocked.blockedUserIds, []);
  assert.deepEqual(unblocked.blockedCreatorIds, []);
});

test('rejects self-blocking and malformed account references', () => {
  assert.throws(() => updateBlockedUserLists({
    ownerId: 'alice', targetId: 'alice', blockedUserIds: [], blockedCreatorIds: [], blocked: true,
  }), /own account/);
  assert.throws(() => updateBlockedUserLists({
    ownerId: 'alice', targetId: 'users/bob', blockedUserIds: [], blockedCreatorIds: [], blocked: true,
  }), /valid account/);
});

test('refuses to exceed the bounded block list without returning a partial update', () => {
  const existing = Array.from({ length: MAX_BLOCKED_USERS }, (_, index) => `user-${index}`);
  assert.throws(() => updateBlockedUserLists({
    ownerId: 'alice',
    targetId: 'new-user',
    blockedUserIds: existing,
    blockedCreatorIds: existing,
    blocked: true,
  }), /up to 500/);
  assert.deepEqual(clearBlockedUserLists(), { blockedUserIds: [], blockedCreatorIds: [] });
});

test('normalizes duplicate and whitespace-padded identifiers', () => {
  const result = updateBlockedUserLists({
    ownerId: 'alice',
    targetId: 'bob',
    blockedUserIds: [' carol ', 'carol'],
    blockedCreatorIds: [' dave ', 'dave'],
    blocked: true,
  });
  assert.deepEqual(result.blockedUserIds, ['carol', 'bob']);
  assert.deepEqual(result.blockedCreatorIds, ['dave', 'bob']);
});
