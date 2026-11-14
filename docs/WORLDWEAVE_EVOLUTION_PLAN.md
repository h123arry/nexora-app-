# WorldWeave Evolution Plan

**Product promise:** WorldWeave is NEXORA's collaborative living-story space: people build a shared, evolving record of an experience from their own perspectives.

This plan extends the existing WorldWeave implementation. It is not a rewrite and does not authorize duplicate collections, parallel services, broad Firestore permissions, or production deployment.

## Existing foundation

The current implementation (merged in PR #204) includes:
- Public and private WorldWeaves with owner-editable title, description, and visibility.
- Owner invitations, invite acceptance/decline/revocation, and public joining.
- Multi-contributor chronological timelines with text, image, video, and audio moments.
- Live subscriptions, bounded latest-page reads, older-moment pagination, and discovery over loaded public experiences.
- Media upload recovery/cleanup and Firestore rules/tests for membership and privacy boundaries.

The repository README correctly identifies staging multi-account verification and production configuration as separate release requirements. A merged implementation is not proof of production deployment.

## Upgrade principles

1. Preserve existing WorldWeave documents and moment paths. Add optional, versioned fields and use idempotent backfills only when necessary.
2. Keep authorization authoritative in Firestore rules or trusted Functions. UI checks are convenience, never security boundaries.
3. Keep private experiences undiscoverable to non-members. Do not leak private titles, member identities, invite state, or media URLs through search projections.
4. Never trust client-supplied owner IDs, contributor counts, reaction totals, moderation outcomes, or role assignments.
5. Bound every list/query and paginate using stable cursors. Avoid unbounded arrays on the parent document as membership grows.
6. Preserve existing live timeline ordering and historical moments during migrations.
7. Keep media bytes in Storage and metadata in Firestore. Verify membership and object ownership before issuing access; clean up failed/unpublished uploads.
8. Ship in small, testable increments. Do not claim a capability is live until emulator tests and owner-approved staging acceptance pass.

## Delivery sequence

### WW-1 — Collaboration and membership integrity

Implementation contract: [WorldWeave Membership V2 migration design](./WORLDWEAVE_MEMBERSHIP_V2_MIGRATION.md). The design defines the compatibility window, deterministic backfill, versioned authorization, member lifecycle invariants, audit trail, rollback, and release gates. It is a design artifact only; it does not authorize production migration.
- Replace growth-sensitive parent-document membership arrays with a scalable membership subcollection while retaining a compatibility reader during migration.
- Introduce explicit owner/contributor roles and trusted role-change operations. The owner cannot accidentally remove the final owner.
- Add contributor leave, owner-controlled removal, and safe ownership handover. Prevent an owner from leaving without transferring ownership or closing the experience.
- Make member counts derived or trusted-server-maintained; never accept client counter changes.
- Add an activity/audit trail for invitations, joins, departures, removals, role changes, and ownership transfers.
- Keep invitation operations idempotent and prevent duplicate or stale invitations.

**Acceptance:** two-account and multi-account tests cover public join, private invite, duplicate invite, revoke/accept races, leave, removal, role escalation attempts, owner handover, and cross-account reads. Concurrent joins/removals must not corrupt counts or access.

### WW-2 — Rich shared storytelling
- Add reactions to moments with one active reaction per user per moment, transactional counters, and safe toggle semantics.
- Add threaded replies with bounded pagination, author attribution, edit/delete rules, and moderation hooks.
- Add owner/contributor pinning with a bounded number of pins and clear pinned-by metadata.
- Add moment editing with revision timestamps and a visible edited state; preserve immutable author identity and creation time.
- Add lightweight content warnings and accessible media captions/alt text.
- Keep timeline order deterministic when timestamps collide; new activity may update the experience's activity time without rewriting moment creation times.

**Acceptance:** duplicate taps do not inflate counts, concurrent reactions remain correct, unauthorized edits/deletes fail, reply access follows experience membership, and old moments remain readable and ordered.

### WW-3 — Discovery and context
- Add optional topics/tags and a small, controlled category taxonomy to new experiences.
- Add server-backed, bounded discovery queries and filters for category, topic, recency, and contributor count.
- Keep search projections server-maintained and privacy-filtered; never expose private experiences in public search.
- Add featured/trending ranking only when based on measured, abuse-resistant signals. Label editorially featured content separately from algorithmic ranking.
- Add share previews that reveal only public fields and never expose private invitation or member data.

**Acceptance:** query limits and indexes are documented; private experiences are absent from guest/non-member results; search and filter results are stable and paginated; ranking can be explained and does not rely on fabricated engagement.

### WW-4 — Trust, safety, and media lifecycle
- Add report flows for experiences, moments, and replies, with private moderation queues and auditable moderator actions.
- Add block/mute-aware discovery and contributor interaction safeguards without silently changing existing membership.
- Enforce media type, size, and ownership limits on the trusted upload path; do not rely on browser accept attributes.
- Ensure revoked, removed, or departed members lose access to private media according to the product's retention policy.
- Add deletion/recovery handling for parent experiences, nested moments, replies, reactions, and Storage assets. Use resumable bounded cleanup for large trees.
- Add rate limits and abuse controls for invites, joins, posting, reactions, and replies.

**Acceptance:** rules and callable/API tests prove isolation across two unrelated users, removed members, blocked users, and moderators; cleanup is idempotent and observable; no public Storage rule is introduced.

### WW-5 — Experience quality and scale
- Upgrade the experience page with a clear story header, contributor strip, pinned moments, activity context, and responsive timeline cards.
- Add optimistic UI only where rollback is reliable; show sending/failed/retry states for media and moment publication.
- Improve empty, loading, offline, and permission-revoked states.
- Use cursor pagination for both discovery and timeline history; avoid loading all moments or all contributors into memory.
- Add instrumentation for load latency, query size, upload failures, pagination errors, and contribution completion without collecting private message/content data unnecessarily.
- Verify keyboard navigation, screen-reader labels, reduced motion, and narrow Android viewport behavior.

**Acceptance:** performance checks use realistic timelines and contributor counts; mobile interaction tests cover create, invite, contribute, paginate, retry, and return navigation.

## Release gates

A WorldWeave upgrade is not complete until:
- TypeScript, lint, production build, Functions build, unit tests, Firestore rules tests, and relevant Storage/API security tests pass.
- Emulator tests cover owner, contributor, invited non-member, unrelated user, removed member, and guest contexts.
- A staging smoke test uses at least two real test accounts and multiple devices.
- Private experience and media access are verified after invite revocation, contributor removal, and account changes.
- Migration/backfill scripts are idempotent, bounded, observable, and tested against a staging copy.
- No production deploy or production data migration occurs without explicit owner approval.

## Immediate implementation order

Start with a focused audit and tests for membership growth, concurrent membership changes, and private media access. Then deliver WW-1 in small changes before adding reactions, replies, or ranking. This prevents richer social interactions from being built on a fragile membership model.
