# VOH Intelligence Core — Phase 2

## Goal
Connect VOH to NEXORA features through explicit, request-scoped permissions. The first Phase 2 slice adds multi-feature read scopes and gates model-visible tools to the exact scopes selected for a chat request.

## Implemented in this slice
- Added explicit `feed`, `profile`, and `world_pulse` feature scopes while preserving legacy single-scope clients.
- A missing, malformed, or unknown scope grants no feature tools.
- The model only receives tool declarations for explicitly selected scopes.
- Added a read-only World Pulse snapshot tool. It returns only the already-shaped, request-supplied sample and reports when no snapshot was supplied.
- Kept profile loading server-side from the verified Firebase UID. Feed and World Pulse snapshots remain bounded and shaped before they enter the prompt/tool context.
- Added tests for legacy compatibility, multi-scope selection, fail-closed behavior, and preventing unrelated/private/write tools from being exposed.

## Security boundaries
- No inbox or private message access.
- No publishing, sending, following, gifting, payment, moderation, deletion, or account-setting actions.
- No client-supplied identity can select another user's profile; profile lookup continues to use the verified Firebase UID.
- User-generated feed and World Pulse content remains untrusted data, never instructions.
- Scopes are per request; selecting one feature does not grant access to another.

## Remaining Phase 2 integrations
The following are intentionally not advertised as working tools yet: Circles membership/details, notifications, creator drafts, Studio projects, and discovery recommendations. Each needs a verified server-side ownership/visibility loader and feature-specific tests before it is exposed to the model. Private messages and financial credentials remain outside VOH context by default.

## Verification
Run `npm run test:unit` and `npm run lint`. CI must pass before merge or production deployment.
