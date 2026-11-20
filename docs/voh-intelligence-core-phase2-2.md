# VOH Intelligence Core — Phase 2.2

## Goal
Extend explicit, authenticated VOH context to saved post drafts and the user's cloud NEXORA Studio project without exposing media URLs, source files, or another account's work.

## Implemented
- Added separate `drafts` and `studio` context scopes and read-only tools.
- Saved post drafts are queried from `drafts` by the verified UID, newest first, capped at 10. VOH receives only draft ID, caption (500 characters max), type, up to eight tags, and update time. Video URLs and other document fields are excluded.
- The cloud Studio manifest is read only at `studioCloudDrafts/{verifiedUid}`. VOH receives a summary of clip/layer/subtitle counts, aspect ratio, revision, update time, soundtrack/voiceover presence, asset count, and caption.
- Studio source media is never downloaded for VOH context. Storage paths, asset references, raw manifests, and private media URLs are not exposed.
- The VOH selector now includes Drafts and Studio as explicit choices. Inbox remains private and excluded.

## Security boundaries
- Firebase ID-token verification remains the identity authority; client-supplied IDs and context payloads are not trusted.
- No write tools are enabled. VOH cannot edit, delete, publish, render, or sync drafts or Studio projects.
- Context is bounded and projected to an allowlisted set of fields. Firestore read failures fail the request rather than being presented as empty data.
- Draft and Studio text remains untrusted user content, never instructions.

## Verification
The new loader tests cover owner scoping, bounds, field projection, media URL exclusion, Studio manifest summarization, and missing identity. The tests are registered in `npm run test:unit`. CI, type-check, security tests, and production build must pass before merge.