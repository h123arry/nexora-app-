export type OriginRemixEvent = { eventType?: unknown; actorUid?: unknown; assetId?: unknown; lineageDepth?: unknown; parentAttribution?: unknown };
type SourceAttribution = { sourceAssetId?: unknown; creatorUid?: unknown };

/** Aggregates a bounded sample. Repeated-use and deep-lineage counts are review signals, never fraud findings. */
export function buildOriginCreatorInsights(ownerUid: string, events: OriginRemixEvent[], sampleLimit = 500) {
  if (!ownerUid || !Array.isArray(events) || !Number.isInteger(sampleLimit) || sampleLimit < 1) throw new Error('A valid creator and bounded Origin event sample are required.');
  const remixes = events.filter(event => event?.eventType === 'remix_created');
  let remixesCreatedByYou = 0, sourceUsesAttributedToYou = 0, selfRemixUses = 0, deepLineageUses = 0;
  const uniqueRemixers = new Set<string>();
  const repeatedSourceUse = new Map<string, Set<string>>();
  for (const event of remixes) {
    const actorUid = typeof event.actorUid === 'string' ? event.actorUid : '';
    const derivativeAssetId = typeof event.assetId === 'string' ? event.assetId : '';
    if (actorUid === ownerUid) remixesCreatedByYou += 1;
    if (!Array.isArray(event.parentAttribution)) continue;
    for (const raw of event.parentAttribution as SourceAttribution[]) {
      if (!raw || raw.creatorUid !== ownerUid || typeof raw.sourceAssetId !== 'string') continue;
      sourceUsesAttributedToYou += 1;
      if (actorUid) uniqueRemixers.add(actorUid);
      if (actorUid === ownerUid) selfRemixUses += 1;
      if (typeof event.lineageDepth === 'number' && Number.isInteger(event.lineageDepth) && event.lineageDepth >= 6) deepLineageUses += 1;
      if (actorUid && derivativeAssetId) {
        const key = actorUid + ':' + raw.sourceAssetId;
        const derivatives = repeatedSourceUse.get(key) || new Set<string>();
        derivatives.add(derivativeAssetId);
        repeatedSourceUse.set(key, derivatives);
      }
    }
  }
  return {
    remixesCreatedByYou, sourceUsesAttributedToYou, uniqueRemixers: uniqueRemixers.size, selfRemixUses, deepLineageUses,
    repeatedSourceUsePatterns: [...repeatedSourceUse.values()].filter(derivatives => derivatives.size > 1).length,
    sampleSize: remixes.length, sampleLimit, sampleCapped: events.length > sampleLimit,
  };
}
