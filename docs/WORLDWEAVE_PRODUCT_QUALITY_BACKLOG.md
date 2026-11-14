# WorldWeave Product Quality Backlog

This backlog extends the existing WorldWeave implementation. Work should ship in vertical slices, each with working UI, trusted persistence, privacy rules, regression tests, and mobile acceptance coverage. It is not permission to build disconnected mock screens.

## 1. Story structure

### Chapters and milestones
- Let an owner create named chapters such as Before, During, After, and Reflections.
- Let contributors add moments to a chapter while preserving a single canonical timeline.
- Support chapter cover moments and a chapter introduction.
- Keep chapter order stable and allow owners to reorder chapters.
- Use server timestamps for ordering; never trust a client-supplied chronology.

### Pinned moments
- Allow owners to pin up to three moments to the story header.
- Keep pinned moments in their original chronological position as well.
- Unpinning must not delete or rewrite a moment.
- A pinned moment deleted by its author or owner must be removed from the pin index atomically.

### Story recap
- Build an opt-in recap from published moments and approved media.
- Clearly attribute every excerpt to its contributor.
- Do not generate a recap from private media without explicit experience-level permission.
- Preserve source links back to the original moment.

## 2. Contributor collaboration

- Add contributor roles only after Membership V2 becomes authoritative: owner, editor, contributor, and viewer.
- Define permission matrices per operation; never infer permissions from a UI label.
- Add per-experience posting controls (all members, owner approval, or owner/editor only).
- Add a pending-contribution review queue for moderated experiences.
- Add an explicit ownership succession flow with confirmation and audit history.
- Add contributor onboarding context: what the story is about, what is welcome, and any content boundaries.
- Add an owner-visible contributor directory with search and cursor pagination.
- Add per-contributor contribution counts based on server-verified moments, not client counters.

## 3. Moment interactions

- Add per-user reaction documents (one reaction per user per moment) rather than incrementing client-controlled counters.
- Add threaded replies as bounded subcollections with author attribution and deletion controls.
- Add moment bookmarks scoped to the user.
- Add content warnings and sensitive-media blur controls.
- Add report flows for moments and replies with trusted moderation queues.
- Add edit history for text moments, with a bounded revision log and clear edited labels.
- Keep reactions, replies, and bookmarks separate from the canonical story chronology.

## 4. Discovery and context

- Add tags and topics with controlled vocabulary and moderation.
- Add public story search using approved title/description/topic fields only.
- Add related stories using explicit shared topics and public metadata, not private membership graphs.
- Add featured public WorldWeaves with transparent editorial selection.
- Add location context only when the contributor explicitly attaches it and chooses its visibility.
- Add event/date filters without exposing private activity to non-members.

## 5. Media quality and access

- Generate media thumbnails and lightweight previews for large images/videos.
- Use adaptive video renditions and a bounded playback strategy consistent with the existing media pipeline.
- Keep original media private and serve published playback through an authorization-aware delivery layer.
- Add expiring upload sessions, retryable upload states, and orphan cleanup.
- Add storage quota and per-file limits with clear client-side preflight checks.
- Support captions/transcripts for audio and video moments.
- Never assume removing a member revokes an already-issued Firebase download-token URL; replace token URLs with revocable authenticated delivery before promising revocation.

## 6. Safety and governance

- Add invite rate limits and duplicate-invite recovery.
- Add block-aware invitation and contribution checks.
- Add report, appeal, and moderator escalation workflows.
- Add owner-visible audit history with actor, target, action, and timestamp.
- Keep audit events immutable and server-written.
- Add account deletion behavior for authored moments and media according to retention/legal policy; do not silently erase other contributors' context.
- Add abuse detection for spam bursts, repeated media uploads, and coordinated reactions without exposing private content to analytics.

## 7. Reliability and performance

- Move membership to per-user documents with bounded queries and cursor pagination.
- Add idempotency keys for all retryable writes.
- Add optimistic updates only where rollback is reliable.
- Add offline drafts for moments, with explicit local-only status until sync succeeds.
- Add reconnect recovery and duplicate-submit protection.
- Add query budgets, latency instrumentation, and load tests at 1, 10, 100, and 500 contributors.
- Add bounded cleanup for deleted experiences and nested content.
- Keep indexes documented alongside every new compound query.

## 8. Experience polish and accessibility

- Add skeletons, empty states, offline states, permission-revoked states, and recoverable error actions.
- Improve narrow Android layouts and one-handed interaction.
- Respect reduced-motion preferences for timeline and media transitions.
- Add keyboard navigation and screen-reader names for every action.
- Make chronological context, author attribution, and edited/deleted states obvious.
- Avoid decorative animation that delays contribution or hides essential controls.

## Delivery order

1. Complete current membership governance slice and its emulator validation.
2. Migrate membership to the V2 subcollection model with a dry-run/backfill/rollback plan.
3. Add role/permission enforcement and paginated member discovery.
4. Add pinned moments and chapters.
5. Add reactions, replies, bookmarks, and moderation as independent subcollections.
6. Upgrade media delivery and revocation before claiming private media access can be revoked.
7. Improve discovery, recap, accessibility, offline drafts, and scale instrumentation.

Every release must preserve the existing WorldWeave experience and pass the release gates in `WORLDWEAVE_EVOLUTION_PLAN.md`.
