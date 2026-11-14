import assert from 'node:assert/strict';
import test from 'node:test';
import { assertSameAccountRemixSources, buildRemixLineageRecord } from '../src/originLineagePolicy.js';

const valid = {
  derivativeAssetId: 'derivative_1',
  ownerUid: 'creator_1',
  parentAssetIds: ['source_1', 'source_2'],
  parentLineageAncestors: [[], ['root_1']],
  parentLineageDepths: [0, 1],
  parentOwnerUids: ['creator_1', 'creator_2'],
  parentPermissionSnapshots: ['owner_remix', 'allow_with_attribution'],
};

test('records multi-source lineage and bounded ancestor closure', () => {
  const record = buildRemixLineageRecord(valid);
  assert.deepEqual(record.parentAssetIds, ['source_1', 'source_2']);
  assert.deepEqual(new Set(record.lineageAncestors), new Set(['source_1', 'source_2', 'root_1']));
  assert.equal(record.lineageDepth, 2);
  assert.equal(record.lineageState, 'recorded');
  assert.equal(record.event.eventType, 'remix_created');
  assert.equal(record.event.contributionRole, 'remixer');
  assert.deepEqual(record.event.parentAttribution, [
    { sourceAssetId: 'source_1', creatorUid: 'creator_1', permissionSnapshot: 'owner_remix' },
    { sourceAssetId: 'source_2', creatorUid: 'creator_2', permissionSnapshot: 'allow_with_attribution' },
  ]);
});

test('rejects self-parenting, duplicate parents, malformed IDs and excessive parent count', () => {
  for (const patch of [
    { parentAssetIds: ['derivative_1'] },
    { parentAssetIds: ['source_1', 'source_1'] },
    { parentAssetIds: ['../private'] },
    { parentAssetIds: ['a', 'b', 'c', 'd', 'e', 'f'] },
    { parentAssetIds: [] },
  ]) assert.throws(() => buildRemixLineageRecord({ ...valid, ...patch } as typeof valid));
});

test('rejects cycles and lineage deeper than eight levels', () => {
  assert.throws(() => buildRemixLineageRecord({
    ...valid,
    parentLineageAncestors: [['derivative_1'], []],
  }), /cycle/);
  assert.throws(() => buildRemixLineageRecord({
    ...valid,
    parentLineageDepths: [8, 0],
  }), /maximum remix depth/);
});

test('rejects oversized ancestor graphs and mismatched source metadata', () => {
  assert.throws(() => buildRemixLineageRecord({
    ...valid,
    parentLineageAncestors: [Array.from({ length: 41 }, (_, index) => `ancestor_${index}`), []],
  }), /graph size/);
  assert.throws(() => buildRemixLineageRecord({
    ...valid,
    parentLineageDepths: [0],
  }), /incomplete/);
});


test('keeps cross-account remix closed until privacy and relationship checks are authoritative', () => {
  assert.doesNotThrow(() => assertSameAccountRemixSources({
    derivativeOwnerUid: 'creator_1',
    sourceOwnerUids: ['creator_1', 'creator_1'],
  }));
  assert.throws(() => assertSameAccountRemixSources({
    derivativeOwnerUid: 'creator_1',
    sourceOwnerUids: ['creator_1', 'creator_2'],
  }), /Cross-account remix is temporarily unavailable/);
  assert.throws(() => assertSameAccountRemixSources({
    derivativeOwnerUid: 'creator_1',
    sourceOwnerUids: [],
  }), /ownership could not be verified/);
});
