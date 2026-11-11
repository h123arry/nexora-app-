import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRemixPermissionEvent, canRemixOrigin, normalizeOriginRemixPolicy } from '../src/originPermissionPolicy.js';

test('remixing own source is allowed without changing the default policy', () => {
  assert.equal(normalizeOriginRemixPolicy(undefined), 'closed');
  assert.equal(canRemixOrigin({ derivativeOwnerUid: 'creator_1', sourceOwnerUid: 'creator_1', sourcePolicy: 'closed' }), true);
});

test('cross-account remix requires explicit allow-with-attribution opt-in', () => {
  assert.equal(canRemixOrigin({ derivativeOwnerUid: 'creator_2', sourceOwnerUid: 'creator_1', sourcePolicy: undefined }), false);
  assert.equal(canRemixOrigin({ derivativeOwnerUid: 'creator_2', sourceOwnerUid: 'creator_1', sourcePolicy: 'closed' }), false);
  assert.equal(canRemixOrigin({ derivativeOwnerUid: 'creator_2', sourceOwnerUid: 'creator_1', sourcePolicy: 'allow_with_attribution' }), true);
  assert.equal(canRemixOrigin({ derivativeOwnerUid: 'creator_2', sourceOwnerUid: 'creator_1', sourcePolicy: 'unknown' }), false);
});

test('permission history records creator declaration and previous/next policy', () => {
  const event = buildRemixPermissionEvent({
    assetId: 'asset_1',
    actorUid: 'creator_1',
    previousPolicy: undefined,
    nextPolicy: 'allow_with_attribution',
    eventId: 'event_1',
  });
  assert.equal(event.eventType, 'remix_permission_updated');
  assert.equal(event.disclosureSource, 'creator_declaration');
  assert.equal(event.previousPolicy, 'closed');
  assert.equal(event.nextPolicy, 'allow_with_attribution');
  assert.throws(() => buildRemixPermissionEvent({
    assetId: '../bad',
    actorUid: 'creator_1',
    previousPolicy: 'closed',
    nextPolicy: 'closed',
    eventId: 'event_1',
  }));
});
