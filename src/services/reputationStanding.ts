export interface ReputationStanding {
  tier: 'Newcomer' | 'Active Member' | 'Trusted Builder' | 'Master Contributor' | 'Apex Luminary';
  nextTier: ReputationStanding['tier'] | null;
  nextThreshold: number | null;
  pointsRemaining: number;
  progress: number;
}

const TIERS: Array<{ name: ReputationStanding['tier']; threshold: number }> = [
  { name: 'Newcomer', threshold: 0 },
  { name: 'Active Member', threshold: 51 },
  { name: 'Trusted Builder', threshold: 201 },
  { name: 'Master Contributor', threshold: 501 },
  { name: 'Apex Luminary', threshold: 1001 },
];

/** Reputation levels are earned through trust signals; this helper never awards points. */
export function getReputationStanding(rawPoints: number): ReputationStanding {
  const points = Number.isFinite(rawPoints) ? Math.max(0, Math.floor(rawPoints)) : 0;
  let currentIndex = 0;
  for (let index = 1; index < TIERS.length; index += 1) {
    if (points >= TIERS[index].threshold) currentIndex = index;
  }

  const current = TIERS[currentIndex];
  const next = TIERS[currentIndex + 1];
  if (!next) {
    return { tier: current.name, nextTier: null, nextThreshold: null, pointsRemaining: 0, progress: 100 };
  }

  const previousThreshold = current.threshold;
  const span = next.threshold - previousThreshold;
  return {
    tier: current.name,
    nextTier: next.name,
    nextThreshold: next.threshold,
    pointsRemaining: Math.max(0, next.threshold - points),
    progress: Math.max(0, Math.min(100, Math.round(((points - previousThreshold) / span) * 100))),
  };
}
