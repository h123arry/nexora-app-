export type RemixLineageInput = {
  derivativeAssetId: string;
  ownerUid: string;
  parentAssetIds: string[];
  parentLineageAncestors: string[][];
  parentLineageDepths: number[];
  parentOwnerUids: string[];
  parentPermissionSnapshots: Array<'owner_remix' | 'allow_with_attribution'>;
};

const SAFE_LINEAGE_ID = /^[A-Za-z0-9_-]{1,128}$/;
export const MAX_REMIX_PARENTS = 5;
export const MAX_LINEAGE_DEPTH = 8;
export const MAX_LINEAGE_ANCESTORS = 40;

export function buildRemixLineageRecord(input: RemixLineageInput) {
  if (!SAFE_LINEAGE_ID.test(input.derivativeAssetId) || !SAFE_LINEAGE_ID.test(input.ownerUid)) {
    throw new Error('A valid derivative asset and owner are required.');
  }
  if (!Array.isArray(input.parentAssetIds)
    || input.parentAssetIds.length < 1
    || input.parentAssetIds.length > MAX_REMIX_PARENTS
    || input.parentAssetIds.some(id => typeof id !== 'string' || !SAFE_LINEAGE_ID.test(id))) {
    throw new Error('A remix must reference between one and five valid source assets.');
  }
  if (new Set(input.parentAssetIds).size !== input.parentAssetIds.length) {
    throw new Error('A source asset can only be included once.');
  }
  if (input.parentAssetIds.includes(input.derivativeAssetId)) {
    throw new Error('An asset cannot be its own source.');
  }
  if (input.parentLineageAncestors.length !== input.parentAssetIds.length
    || input.parentLineageDepths.length !== input.parentAssetIds.length
    || input.parentOwnerUids.length !== input.parentAssetIds.length
    || input.parentPermissionSnapshots.length !== input.parentAssetIds.length
    || input.parentOwnerUids.some(uid => !SAFE_LINEAGE_ID.test(uid))) {
    throw new Error('Source lineage information is incomplete.');
  }

  const ancestors = new Set<string>();
  let depth = 1;
  input.parentLineageAncestors.forEach((parentAncestors, index) => {
    if (!Array.isArray(parentAncestors) || parentAncestors.length > MAX_LINEAGE_ANCESTORS) {
      throw new Error('Source lineage exceeds the supported graph size.');
    }
    if (!Number.isInteger(input.parentLineageDepths[index])
      || input.parentLineageDepths[index] < 0
      || input.parentLineageDepths[index] >= MAX_LINEAGE_DEPTH) {
      throw new Error('Source lineage has reached the maximum remix depth.');
    }
    depth = Math.max(depth, input.parentLineageDepths[index] + 1);
    for (const ancestor of parentAncestors) {
      if (typeof ancestor !== 'string' || !SAFE_LINEAGE_ID.test(ancestor)) {
        throw new Error('Source lineage contains an invalid reference.');
      }
      if (ancestor === input.derivativeAssetId) {
        throw new Error('This remix would create a lineage cycle.');
      }
      ancestors.add(ancestor);
    }
  });
  if (depth > MAX_LINEAGE_DEPTH) throw new Error('Source lineage has reached the maximum remix depth.');
  for (const id of input.parentAssetIds) ancestors.add(id);
  if (ancestors.size > MAX_LINEAGE_ANCESTORS) {
    throw new Error('Source lineage exceeds the supported graph size.');
  }

  return {
    parentAssetIds: [...input.parentAssetIds],
    lineageAncestors: [...ancestors],
    lineageDepth: depth,
    lineageState: 'recorded' as const,
    event: {
      eventId: `derivative_${input.derivativeAssetId}`,
      assetId: input.derivativeAssetId,
      actorUid: input.ownerUid,
      eventType: 'remix_created' as const,
      contributionRole: 'remixer' as const,
      disclosureSource: 'platform_observed' as const,
      parentAssetIds: [...input.parentAssetIds],
      parentAttribution: input.parentAssetIds.map((sourceAssetId, index) => ({
        sourceAssetId,
        creatorUid: input.parentOwnerUids[index],
        permissionSnapshot: input.parentPermissionSnapshots[index],
      })),
      schemaVersion: 1 as const,
    },
  };
}
