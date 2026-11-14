export type OriginRemixPolicy = 'closed' | 'allow_with_attribution';

export function normalizeOriginRemixPolicy(value: unknown): OriginRemixPolicy {
  return value === 'allow_with_attribution' ? 'allow_with_attribution' : 'closed';
}

export function canRemixOrigin(input: {
  derivativeOwnerUid: string;
  sourceOwnerUid: string;
  sourcePolicy: unknown;
}): boolean {
  if (!input.derivativeOwnerUid || !input.sourceOwnerUid) return false;
  if (input.derivativeOwnerUid === input.sourceOwnerUid) return true;
  return normalizeOriginRemixPolicy(input.sourcePolicy) === 'allow_with_attribution';
}

export function buildRemixPermissionEvent(input: {
  assetId: string;
  actorUid: string;
  previousPolicy: unknown;
  nextPolicy: OriginRemixPolicy;
  eventId: string;
}) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(input.assetId)
    || !/^[A-Za-z0-9_-]{1,128}$/.test(input.actorUid)
    || !/^[A-Za-z0-9_-]{1,160}$/.test(input.eventId)) {
    throw new Error('A valid asset, actor and event ID are required.');
  }
  return {
    eventId: input.eventId,
    assetId: input.assetId,
    actorUid: input.actorUid,
    eventType: 'remix_permission_updated' as const,
    contributionRole: 'original_uploader' as const,
    disclosureSource: 'creator_declaration' as const,
    previousPolicy: normalizeOriginRemixPolicy(input.previousPolicy),
    nextPolicy: input.nextPolicy,
    schemaVersion: 1 as const,
  };
}
