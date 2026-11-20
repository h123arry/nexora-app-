# VOH Intelligence Core — Phase 2

## Goal
Connect VOH to NEXORA features through explicit, request-scoped permissions. This first integration slice adds multi-feature read scopes and gates model-visible tools to the exact scopes selected for a chat request.

## Implemented
- Explicit `feed`, `profile`, and `world_pulse` feature scopes, while preserving legacy single-scope clients.
- Missing, malformed, or unknown scopes grant no feature tools.
- The model only receives tool declarations for explicitly selected scopes.
- A read-only World Pulse snapshot tool returns only the bounded, shaped snapshot supplied for the request. If no snapshot is supplied, the tool reports that honestly.
- Profile loading remains server-side and tied to the verified Firebase UID.
- Feed and World Pulse context are excluded unless their matching feature scope is selected.
- Added tests for legacy compatibility, multi-scope selection, fail-closed behavior, and excluding unrelated/private/write tools.

## Security boundaries
- No inbox/private-message access.
- No publishing, sending, following, gifting, payment, moderation, deletion, or account-setting actions.
- Circles, notifications, drafts, Studio projects, and discovery tools are not advertised until their server-side ownership/visibility loaders and tests are implemented.
- User-generated content remains untrusted data, never instructions.

## Verification
Run `npm run test:unit` and `npm run lint`. CI must pass before merge or production deployment.
