/** Shared bounded quality signals for feed ranking and local search. */
export interface EngagementCounts {
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
}

function boundedCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1_000_000, value))
    : 0;
}

/** Prevent lifetime counters from growing without bound and swamping freshness. */
export function boundedEngagementScore(counts: EngagementCounts): number {
  const likes = Math.log1p(boundedCount(counts.likes));
  const comments = Math.log1p(boundedCount(counts.comments));
  const shares = Math.log1p(boundedCount(counts.shares));
  const saves = Math.log1p(boundedCount(counts.saves));
  return Math.min(40, likes + comments * 2.5 + shares * 2 + saves * 1.5);
}

/** Exponential freshness decay; a half-life of 24 means a signal halves every 24 hours. */
export function freshnessMultiplier(ageHours: number, halfLifeHours = 24): number {
  if (!Number.isFinite(ageHours)) return 0;
  const age = Math.max(0, ageHours);
  const halfLife = Number.isFinite(halfLifeHours) ? Math.max(1, halfLifeHours) : 24;
  return Math.pow(0.5, age / halfLife);
}

/** Normalize Unicode, accents and punctuation consistently before matching. */
export function normalizeSearchText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}@#]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** All query terms must match; exact and prefix matches outrank substring matches. */
export function scoreSearchTerms(query: string, fields: string[]): number | null {
  const normalizedQuery = normalizeSearchText(query).replace(/^[@#]/, '');
  if (!normalizedQuery || normalizedQuery.length > 120) return null;
  const terms = normalizedQuery.split(' ').filter(Boolean);
  const normalizedFields = fields.map(normalizeSearchText).filter(Boolean);
  let total = 0;
  for (const term of terms) {
    let best = 0;
    for (const field of normalizedFields) {
      const tokens = field.split(' ');
      if (tokens.includes(term)) best = Math.max(best, 8);
      else if (tokens.some(token => token.startsWith(term))) best = Math.max(best, 5);
      else if (field.includes(term)) best = Math.max(best, 2);
    }
    if (best === 0) return null;
    total += best;
  }
  return total;
}
