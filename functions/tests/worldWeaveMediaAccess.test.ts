import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canReadWorldWeaveMedia } from '../src/worldWeaveMediaAccess.js';

describe('WorldWeave private media access policy', () => {
  it('allows the owner to resolve media for their own experience', () => {
    assert.equal(canReadWorldWeaveMedia({
      uid: 'alice', ownerId: 'alice', visibility: 'private', participantIds: ['alice'],
    }), true);
  });

  it('allows active contributors to private media and rejects removed or unrelated accounts', () => {
    const base = { ownerId: 'alice', visibility: 'private', participantIds: ['alice', 'bob'] };
    assert.equal(canReadWorldWeaveMedia({ ...base, uid: 'bob' }), true);
    assert.equal(canReadWorldWeaveMedia({ ...base, uid: 'carol' }), false);
    assert.equal(canReadWorldWeaveMedia({ ...base, uid: 'dave', participantIds: ['alice', 'bob'] }), false);
  });

  it('allows signed-in viewers to resolve public media', () => {
    assert.equal(canReadWorldWeaveMedia({
      uid: 'viewer', ownerId: 'alice', visibility: 'public', participantIds: ['alice'],
    }), true);
  });

  it('enforces both-direction blocks even when an experience is public', () => {
    const base = { uid: 'viewer', ownerId: 'alice', visibility: 'public', participantIds: ['alice'] };
    assert.equal(canReadWorldWeaveMedia({ ...base, viewerBlockedIds: ['alice'] }), false);
    assert.equal(canReadWorldWeaveMedia({ ...base, ownerBlockedIds: ['viewer'] }), false);
    assert.equal(canReadWorldWeaveMedia({ ...base, viewerBlockedIds: [], ownerBlockedIds: [] }), true);
  });

  it('fails closed for unknown visibility and malformed membership data', () => {
    assert.equal(canReadWorldWeaveMedia({
      uid: 'viewer', ownerId: 'alice', visibility: 'friends', participantIds: ['viewer'],
    }), false);
    assert.equal(canReadWorldWeaveMedia({
      uid: 'viewer', ownerId: 'alice', visibility: 'private', participantIds: 'viewer',
    }), false);
  });
});
