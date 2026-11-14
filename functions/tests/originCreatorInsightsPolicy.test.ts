import assert from 'node:assert/strict';
import test from 'node:test';
import { buildOriginCreatorInsights } from '../src/originCreatorInsightsPolicy.ts';

test('Origin creator insights aggregate attribution from a bounded sample', () => {
  const result = buildOriginCreatorInsights('creator-a', [
    { eventType: 'remix_created', actorUid: 'creator-b', assetId: 'derivative-1', lineageDepth: 2, parentAttribution: [{ sourceAssetId: 'source-1', creatorUid: 'creator-a' }] },
    { eventType: 'remix_created', actorUid: 'creator-b', assetId: 'derivative-2', lineageDepth: 6, parentAttribution: [{ sourceAssetId: 'source-1', creatorUid: 'creator-a' }] },
    { eventType: 'remix_created', actorUid: 'creator-a', assetId: 'derivative-3', lineageDepth: 1, parentAttribution: [{ sourceAssetId: 'source-1', creatorUid: 'creator-a' }] },
    { eventType: 'uploaded_to_nexora', actorUid: 'creator-a', assetId: 'source-1' },
    { eventType: 'remix_created', actorUid: 'creator-c', assetId: 'derivative-4', parentAttribution: [{ sourceAssetId: 'other', creatorUid: 'creator-x' }] },
  ], 10);
  assert.deepEqual(result, { remixesCreatedByYou: 1, sourceUsesAttributedToYou: 3, uniqueRemixers: 2, selfRemixUses: 1, deepLineageUses: 1, repeatedSourceUsePatterns: 1, sampleSize: 4, sampleLimit: 10, sampleCapped: false });
});

test('Origin creator insights report the sample boundary honestly', () => {
  const events = Array.from({ length: 501 }, (_, i) => ({ eventType: 'remix_created', actorUid: 'other', assetId: 'd-' + i }));
  assert.equal(buildOriginCreatorInsights('creator-a', events.slice(0, 500), 500).sampleCapped, false);
  assert.equal(buildOriginCreatorInsights('creator-a', events, 500).sampleCapped, true);
});

test('Origin creator insights reject invalid inputs', () => {
  assert.throws(() => buildOriginCreatorInsights('', []));
  assert.throws(() => buildOriginCreatorInsights('creator-a', [], 0));
});
