# Nexora Next-Phase Execution Prompt

Use this prompt in a future Nexora implementation session after the current pushed checkpoints. The goal is to continue transforming Nexora into a trustworthy, premium, living social network without fabricating product behavior, inflating the download size, or weakening security.

## Mission

Continue work on the repository at `/home/ubuntu/nexora-app-`. Inspect the current `main` branch and preserve all pushed work. Execute the remaining social-platform roadmap in small, validated checkpoints. After every completed checkpoint:

1. Run the relevant unit tests.
2. Run Firestore security-rule tests.
3. Run TypeScript validation and the production build.
4. Run the Firebase Functions build when worker code changes.
5. Run `git diff --check`.
6. Commit with a clear conventional commit message.
7. Push immediately to `origin main`.
8. Report the commit hash, validation results, and any limitation that remains.

Do not wait until the end to commit. Do not claim a feature is production-ready merely because a UI exists. Keep the working tree clean after every successful checkpoint.

## Already completed and must be preserved

The repository already contains real Firebase authentication, profile/public-profile separation, Storage upload foundations, feed pagination primitives, messaging pagination/read receipts/typing indicators, moderation report and appeal intents, account export, deletion requests, a Firebase Functions account-lifecycle worker package, PWA support, App Check configuration, VOH hardening and explicit memory consent, accessibility shell improvements, CI, atomic username reservations, explainable feed ranking, and relevance-scored Explore search.

The account-deletion worker is implemented in `functions/`, registered in `firebase.json`, and builds successfully, but production deployment and live Firebase verification still require project credentials, runtime configuration, and operational checks. Never state that deletion is live until it has been deployed and tested against the real project.

## Phase 0: Trust, privacy, and data integrity

### A. Finish account lifecycle operations

Harden the existing Functions worker and lifecycle UI. Inventory every current and future UID-owned Firestore collection, subcollection, Storage prefix, derivative, token, index, cache, chat artifact, analytics record, AI-memory record, draft, scheduled job, and moderation record. Add a versioned deletion contract for each durable schema.

Add operator retry and dead-letter handling, orphan reconciliation, lease renewal, maximum attempts, progress checkpoints, structured audit events, alerting, and an owner-visible status history. Define cancellation behavior and a cancellation window before processing starts. Require recent reauthentication before submitting deletion. Ensure Auth deletion only happens after policy, retention, legal-hold, shared-content, and reference-handling decisions are applied.

Upgrade account export from an immediate bounded client JSON to a protected asynchronous export job. Include a schema version, complete eligible records, conversations according to policy, media manifests or signed artifacts where appropriate, export status, expiry time, redaction decisions, and a completion receipt. Never imply that browser-local storage clearing deletes server data.

### B. Make identity authoritative

Use the existing username claim model as the foundation. Add a server-authoritative rename flow with cooldown, reserved-word and impersonation policy, claim release, public projection synchronization, migration for legacy profiles, and race-condition tests. Move custom avatar onboarding to Firebase Storage with owner-bound paths, image validation, replacement cleanup, and deletion-worker inventory coverage.

Add reauthentication for deletion, password/email/phone changes, username changes, MFA changes, and other sensitive operations. Use provider-aware Firebase reauthentication rather than treating a local password field as proof.

### C. Make privacy and audience controls real

Create one canonical Firestore-backed privacy document and relationship policy. Migrate local-only privacy state. Implement public/private account state, follow requests, follower removal, block, mute, restrict, close-friends membership, message requests, mention/tag controls, collaboration permissions, download controls, and audience-aware delivery.

Enforce audience in Firestore rules or trusted server queries. Cover public, followers, circle, community, close friends, and only-me visibility. Ensure blocks and restrictions propagate to feed, search, recommendations, messages, notifications, stories, communities, media URLs, and live participation. Add rules tests for every audience combination and cross-account attack.

### D. Build trusted moderation operations

Create a server-authoritative moderation case pipeline. Reports must survive browser closure and include target snapshots, severity, policy version, evidence references, reporter privacy, deduplication, and source provenance. Add operator RBAC, queue assignment, reviewer actions, reason codes, evidence retention, scoped takedowns, account restrictions, strike expiry, notification decisions, and immutable audit events.

Implement Account Status, support-request history, appeal eligibility, appeal deadlines, decision explanations, and reversal tracking. Remove unsupported five-minute review promises. Add server-enforced abuse controls for login, SMS, recovery, username claims, follows, comments, DMs, uploads, reports, and live interactions. Keep local throttles only as user-experience feedback.

### E. Establish age and teen safety

Add a privacy-preserving age-assurance model and age-appropriate defaults. Define underage handling, sensitive-content restrictions, discovery and recommendation limits, messaging restrictions, live eligibility, monetization eligibility, parental/safety escalation, and retention. Do not collect more sensitive identity data than required, and document regional/provider differences.

## Phase 1: Core social loop

### F. Make engagement and collections durable

Replace localStorage-only saves, custom collections, bookmarks, likes, shares, views, and client-writable counters with authenticated idempotent records. Add cross-device collection queries, privacy controls, deduplication, trusted aggregation, and deletion/export contracts. Existing post creation rules must continue preventing forged counters.

### G. Build the feed service

The current discovery service provides deterministic ranking over available posts. Extend it into a trusted candidate/eligibility/ranking pipeline. Persist authenticated impression, completion, feedback, hide, mute, not-interested, follow, and search events. Add freshness, diversity, creator-frequency, safety, privacy, language, and repeated-content guardrails. Support For You, Following, Friends, chronological, trending, and topic modes.

Return grounded ranking explanations with real source signals, timestamps, and eligibility decisions. Never claim hidden telemetry that was not collected. Add replay fixtures, ranking regression tests, abuse tests, and a kill switch.

### H. Build real search and Explore

The current Explore search is bounded and relevance-scored over loaded posts. Build a normalized trusted index and cursor API for posts, profiles, communities, pages, hashtags, sounds/media, topics, and locations. Choose Firestore-compatible indexing or an external search provider deliberately. Add autocomplete, spelling tolerance, filters, safe eligibility, pagination, quotas, abuse controls, stable deep links, search analytics, and privacy-aware results.

Do not pretend a client array scan is a platform-wide search index. Label fallback behavior honestly until the index is deployed.

### I. Build the social graph

Make follows, follower counts, relationship state, block/mute/restrict, communities, groups, collaborations, mentions, and tags durable and cross-device. Add trusted notifications for requests and decisions. Ensure deletion and privacy workers clean graph references and denormalized counts.

### J. Build notifications

Create durable notification events, read state, deduplication, device-token registration/revocation, push/email delivery, quiet hours, per-category preferences, digest scheduling, security alerts, and retention. Do not use seeded notification counts or local-only toggles as authoritative product state.

### K. Build stories and highlights

Implement story expiry, audience snapshots or policy references, close-friends access, viewer privacy, replies/reactions, archive/highlight behavior, moderation, media lifecycle, and deletion coverage. Stories must not be hard-coded to public visibility.

### L. Complete messaging and communities

Extend the existing message pagination/read-receipt/typing system with durable groups, media attachments, delivery semantics, presence policy, conversation search, message requests, retention, export, deletion, block/report propagation, and notification integration. Add communities with membership roles, moderation, privacy, discovery, posts, events, and group safety. Only add voice/video calls after selecting and testing a real transport, identity, abuse, and billing model.

## Phase 2: Creator and media platform

### M. Build the production media pipeline

Create MediaAsset and MediaJob records. Use authenticated upload-session creation, quarantine, server MIME/codec/duration/dimension checks, malware and policy scanning, idempotent processing, thumbnails/posters, captions/transcripts, normalized renditions, adaptive manifests or deterministic device/network renditions, private delivery controls, quotas, retries, cancellation, and orphan cleanup.

Add durable IndexedDB drafts and outbound media queues with pause/resume/cancel, backoff, network awareness, quota handling, and permanent failure recovery. Never use client timers to claim that processing occurred. Keep browser checks as defense-in-depth, not as the security boundary.

### N. Build creator analytics

Use the trusted event taxonomy to provide privacy-safe time series for impressions, unique viewers, watch starts, 25/50/75/100 percent completion, likes, comments, shares, saves, follows, profile visits, audience composition, follower changes, live activity, and revenue events. Add freshness timestamps and metric definitions. Remove estimates, fabricated values, and client-writable analytics as sources of truth.

### O. Build creator eligibility and monetization safely

Create a transparent creator eligibility and policy-standing center. Define age, geography, account standing, originality, audience, payout readiness, and content requirements. Add support and appeals.

Only expose subscriptions, tips, gifts, or wallet balances after adding a legally reviewed payment provider and server-authoritative immutable double-entry ledger. Include idempotency keys, reconciliation, refunds, chargebacks, holds, entitlement checks, cancellation, receipts, tax/jurisdiction decisions, payout audit, fraud controls, and deletion/retention behavior. Never display fabricated balances or transactions.

### P. Scheduling and creator workflow

Replace local-only scheduling and drafts with durable server jobs or clearly label them as device drafts. Add timezone handling, idempotency, cancellation, failure notifications, media readiness checks, policy checks, and deletion coverage.

## Phase 3: VOH and premium differentiation

### Q. Make VOH a trusted assistant

Authenticate Firebase identity at the server boundary. Do not trust browser-supplied currentUser, posts, circles, notifications, or permissions. Retrieve only ACL-eligible records. Return source IDs, timestamps, freshness, retrieval scope, and evidence summaries. Clearly separate retrieved facts, user-provided material, and generated suggestions.

Persist conversations securely with pagination, retention, search, export, deletion, per-conversation privacy, and provider-processing disclosure. Implement inspectable memory facts with explicit consent, per-item forget/delete, export, withdrawal propagation, and lifecycle cleanup.

Add safe read-only tools first. For social writes, require authorization, preview, explicit confirmation, idempotency, audit events, rollback or cancellation where possible, and clear success/failure results. Add user feedback, evaluation datasets, faithfulness checks, latency/cost quotas, multilingual tests, prompt-injection tests, and unauthorized-action tests.

## Phase 4: Accessibility, localization, performance, and operations

Make accessibility settings persistent and testable. Complete alt text, captions, transcripts, language selection, audio descriptions where appropriate, photosensitivity controls, focus management, keyboard coverage, semantic labels, contrast testing, reduced-motion behavior, and screen-reader QA.

Implement runtime localization for all user-facing copy, errors, toasts, notifications, dates, numbers, and accessibility labels. Do not let a locale picker merely update an in-memory field.

Enable durable Firestore offline persistence where safe. Build a real outbound queue for writes and media. Improve service-worker versioning, update prompts, cache integrity, bounded storage, offline fallbacks, installation analytics, Core Web Vitals, long-task/memory telemetry, playback/upload SLOs, and reconnect diagnostics.

Build trusted admin operations, support cases, experimentation flags, rollout controls, kill switches, crash/error observability, data-quality monitoring, moderation SLA dashboards, and operator audit trails. Keep admin access behind RBAC and never permit client role/balance/moderation mutation.

## Non-negotiable engineering rules

- Do not fabricate users, followers, comments, trends, live viewers, revenue, analytics, transcripts, moderation decisions, backups, encryption, adaptive quality, scheduled publishing, or AI actions.
- Do not use localStorage as a substitute for cross-device server state.
- Do not let clients delete protected account data or mark lifecycle requests complete.
- Do not weaken Firestore or Storage rules to make a UI work.
- Do not add artificial binary/download bulk. Prefer route splitting, server media renditions, and measured assets.
- Add tests for authorization, idempotency, retries, deletion coverage, privacy boundaries, ranking behavior, search behavior, and failure states.
- Commit and push after every completed validated slice.
- If deployment credentials, billing, legal policy, moderation staffing, provider configuration, or regional requirements are missing, implement the safe repository boundary and document the deployment blocker instead of pretending it is live.
