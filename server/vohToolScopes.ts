export type VohFeatureScope = 'feed' | 'profile' | 'world_pulse' | 'circles';

const ALLOWED_SCOPES = new Set<VohFeatureScope>(['feed', 'profile', 'world_pulse', 'circles']);
const TOOL_SCOPE: Record<string, VohFeatureScope> = {
  get_visible_feed: 'feed',
  get_my_profile_summary: 'profile',
  get_world_pulse_snapshot: 'world_pulse',
  get_my_communities: 'circles',
};

/** Resolve explicit feature permissions. Legacy single-scope clients remain supported. */
export function resolveVohFeatureScopes(value: unknown, legacyScope: unknown): Set<VohFeatureScope> {
  const requested = Array.isArray(value) ? value : [legacyScope];
  return new Set(requested.filter((scope): scope is VohFeatureScope =>
    typeof scope === 'string' && ALLOWED_SCOPES.has(scope as VohFeatureScope),
  ));
}

/** Only expose tools for features the user explicitly selected for this request. */
export function selectVohToolsForScopes<T extends { name: string }>(
  declarations: readonly T[],
  scopes: ReadonlySet<VohFeatureScope>,
): T[] {
  return declarations.filter(declaration => {
    const requiredScope = TOOL_SCOPE[declaration.name];
    return requiredScope !== undefined && scopes.has(requiredScope);
  });
}
