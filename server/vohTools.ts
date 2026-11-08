export interface VohToolContext {
  currentUser: Record<string, unknown> | null;
  posts: Record<string, unknown>[];
  circles: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
}

export const VOH_CONTEXT_TOOL_DECLARATIONS = [
  { name: 'get_my_profile_summary', description: 'Read the authenticated user profile summary and creator status supplied by NEXORA.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'get_visible_feed', description: 'Read only the posts currently supplied as visible in the authenticated user feed.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'get_my_communities', description: 'Read the joined community snapshot supplied for this request.', parameters: { type: 'OBJECT', properties: {} } },
  { name: 'get_recent_notifications', description: 'Read the recent notification snapshot supplied for this request.', parameters: { type: 'OBJECT', properties: {} } },
] as const;

/** Execute only allowlisted, read-only tools against already-authorized request context. */
export function runVohContextTool(name: string, context: VohToolContext): { ok: true; data: unknown } | { ok: false; error: string } {
  switch (name) {
    case 'get_my_profile_summary': return { ok: true, data: context.currentUser };
    case 'get_visible_feed': return { ok: true, data: context.posts };
    case 'get_my_communities': return { ok: true, data: context.circles };
    case 'get_recent_notifications': return { ok: true, data: context.notifications };
    default: return { ok: false, error: 'This VOH tool is not available.' };
  }
}
