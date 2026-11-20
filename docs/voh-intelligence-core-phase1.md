# VOH Intelligence Core — Phase 1

## Goal
Make VOH's application intelligence independent of a model vendor while preserving the existing NEXORA application, Firebase authentication, memory storage, chat UI, World Pulse and existing Gemini integration.

## What Phase 1 establishes
- `server/vohIntelligenceCore.ts` defines the provider-neutral model request/response contract, bounded tool orchestration, tool registry and fail-closed context scope policy.
- Gemini is currently an adapter (`createGeminiVohProvider`), not the intelligence core itself.
- `VOH_AI_PROVIDER` selects the configured adapter (defaults to `gemini`); `VOH_AI_MODEL` can override the model name, with `GEMINI_MODEL` retained as the legacy fallback.
- The tool registry exposes only explicitly registered tools. Phase 1 executes read-only tools only; write actions are rejected until user confirmation and audit controls are implemented.
- Context scope is enforced on the server. Only explicit `feed` scope receives the supplied feed snapshot; only explicit `profile` scope loads the authenticated profile from Firestore. Missing or unknown scope becomes `none`. Private inbox messages are never attached.
- Existing cloud memory remains opt-in and UID-scoped. It is loaded separately from feed/profile context and is not treated as instructions.
- Empty model responses remain errors; VOH does not fabricate a successful answer.

## Current boundaries
- Gemini remains the default model adapter. Phase 3.1 adds a private OpenAI-compatible self-hosted adapter, but no GPU host or model weights have been provisioned yet. This does not claim that NEXORA has trained a foundation model or that the self-hosted runtime is live.
- Existing specialised endpoints (Creator Tutor, post improvement, and other AI features) still use their existing provider calls; migrating them into the core is follow-on integration work.
- The UI's existing context selector controls feed/profile/none. The profile details in the user's message are sent only when profile is selected; server-side profile context is independently fetched using the verified Firebase UID.
- Tool execution is read-only. Publishing, messaging, gifting, payments, moderation and account changes are not exposed as AI actions.

## Verification
Run `npm run test:unit` and `npm run lint`. CI must pass before merging or deploying.
