# Phase 6 — Full integration, testing and launch readiness

## Purpose

Phase 6 is the final repository engineering and verification phase for the six-phase NEXORA programme. It consolidates the existing application rather than replacing it. Preserve the React 19, Vite, TypeScript, Express, Firebase and existing service architecture.

This document is a release-evidence contract. It does not convert a passing build, emulator suite, source file, or UI into proof of a deployed production feature.

## Current repository baseline

At the start of this phase, the default branch was `main` at commit `cb76600082ac2792a997918661765a7a087879b3`. The repository metadata reported 16,803 KB (about 16.8 MB). Repository size is informational; do not add unused media, generated binaries, duplicate assets, or filler merely to reach a target size. Add only assets and code that are actually consumed by the product.

The current CI workflow is `.github/workflows/ci.yml`. It runs on pushes and pull requests to `main` and includes:

- tracked-file secret scanning;
- frontend TypeScript checking;
- trusted Firebase Functions build;
- media-worker syntax validation;
- the registered unit and policy test suite;
- staging configuration safety tests;
- Firebase Auth, Firestore rules and Storage rules emulator tests;
- migration, engagement, repost, comment deletion, comment reaction and reply integration suites;
- authenticated API security tests;
- production dependency audits for the web and Functions packages;
- frontend and Express production builds; and
- deployment metadata validation.

The CI workflow does not deploy Firebase, Cloud Run, Eventarc, CDN, hosting, payment providers, or other external services.

## Integration areas to verify

### Accounts and identity
- Verify sign-up, sign-in, sign-out, session restoration, profile completion, password recovery and provider-specific error handling using non-production accounts.
- Confirm every protected action uses the authenticated Firebase UID, not a client-supplied owner ID.
- Verify account deletion end-to-end, including retries, Storage cleanup, Auth deletion, shared-content policy and final completion evidence.
- MFA, trusted devices, provider configuration and real hosted-domain flows remain release gates until tested against the configured staging project.

### Social graph, feed and discovery
- Verify post creation, feed visibility, follows, likes, comments, replies, reposts, bookmarks, profile projections and deletion behavior across two accounts.
- Check that hidden, muted, blocked and not-interested preferences are consistently enforced on every feed path, including empty-feed fallbacks and pagination.
- Treat World Pulse, global trends, durable search indexing and server-side feed retrieval at scale as unavailable until their real aggregation/indexing services are deployed and measured.
- Do not present local counters, loaded-client subsets, synthetic events or unverified creator analytics as platform-wide metrics.

### Messaging and communities
- Verify participant-scoped chat reads/writes, individual and group read receipts, message reactions, typing/presence expiry, unread state, pagination, retry/error states and cross-account isolation.
- Verify community membership, role hierarchy, invite admission, polls, events, announcements, moderation reports and removal/ban flows with member, non-member and manager accounts.
- Keep private media inaccessible to non-participants and verify the complete upload-to-playback path in staging.
- A UI-local fallback is not cross-device persistence. Mark it as local-only wherever it remains.

### Creator, NEX and GiftVerse
- NEXORA Studio uploads now attach the validated `mediaAssets` document ID to the published post record. This establishes a durable source-asset link; it does **not** yet expose owner-only processing metadata to public feed viewers or switch playback to adaptive renditions. That public playback projection remains a separate integration gate.
- Verify catalogue identity and pricing against the trusted server catalogue; never trust client-supplied prices, balances or earnings.
- Verify each gift debit/credit with ledger invariants, idempotent retries, creator revenue calculations, reversals and audit events.
- Keep paid subscriptions, checkout and withdrawals disabled until provider approval, compliance, funding, reconciliation, refunds and live transfer acceptance are complete.
- Creator Academy, asset library, gift art and animations must be connected to the real catalogue or creator workflows; unused asset bundles do not count as integration.

### Sound, uploads and media delivery
- Verify sound preferences and event cues remain optional, gesture-safe and non-blocking.
- Verify upload interruption, retry, ownership, MIME validation, finalization, duplicate event handling, worker lease recovery, derived image/video variants, playback, private access and cleanup.
- Test offline/online transitions, save-data behavior, autoplay rejection, backgrounding, memory release and media failures on representative mobile browsers.
- Cloud Run, Eventarc, FFmpeg/Sharp processing, signed CDN delivery, bucket IAM and real staging playback are external deployment gates, not CI assertions.

### VOH AI and external providers
- Verify server-only credentials, bounded context, per-user quotas, safe error handling, consent and privacy boundaries.
- Gemini, email, SMS, push delivery, LiveKit, payment and payout behavior must remain disabled or explicitly labelled unavailable until the provider is configured and a real staging acceptance test passes.
- Never simulate a provider success or store a private credential in browser configuration or Git.

## Release evidence and gates

| Gate | Repository evidence | Required release evidence |
| --- | --- | --- |
| Build and static checks | CI type-check and production build | Build from the exact release commit and retained artifact digest |
| Functions and worker | Functions build and worker syntax check | Deployed revision, runtime, IAM and logs |
| Authorization | Firestore/Storage/Auth emulator suites | Published rules/indexes and allowed/denied staging requests |
| Account journeys | Auth and two-account emulator tests | Real staging registration, login, session and deletion flows |
| Messaging and communities | Unit/rules/integration coverage | Two-account and multi-member staging verification |
| Media | Policy tests and worker source | Real upload, processing, signed delivery and second-account denial/allowance checks |
| Operations | Health/readiness and runbooks in source | Live health checks, alert routing, backup and restore drill, rollback evidence |
| Providers and finance | Fail-closed adapters and policy tests | Provider approval, secrets, webhook verification, reconciliation and test/live acceptance |
| Privacy and legal | Source controls and documentation | Reviewed retention, deletion, privacy, terms and incident procedures |

## Known external blockers at this baseline

The repository's current production-readiness and Firebase migration records explicitly identify these unresolved owner-controlled items:

- a real isolated staging Firebase project and real two-account smoke test;
- Firebase Storage project/bucket setup and billing approval;
- App Check registration and an explicit monitoring/enforcement decision;
- published Firestore rules/index verification against the intended named database;
- backup scheduling plus a successful restore drill;
- production IAM, Functions secrets, runtime/region and deployment evidence;
- live Auth provider and authorized-domain testing;
- monitoring, alert destinations and incident response ownership;
- Cloud Run media worker and authenticated Eventarc deployment;
- private bucket permissions, CDN signing and real media playback verification;
- server-side FCM token registration and background/closed-tab push delivery;
- external provider setup for email, SMS, Gemini, LiveKit and payments where those capabilities are enabled;
- legal/privacy/retention review and approval of any production data migration.

The production Firebase record also flags the named-Firestore API Public Preview limitation as an architecture decision requiring owner review. Do not silently migrate database IDs or deploy against a different database to bypass it.

## Safe completion rule

A repository workstream may be marked complete only when its UI, service, trusted authorization, persistence, failure behavior, tests and documentation agree. A feature requiring an external provider remains **blocked** until staging evidence exists. A production feature remains **not verified** until production evidence exists.

No production deployment is performed by this phase without the owner's explicit target, credentials, change approval and rollback plan. Never weaken security rules, invent test results, fabricate analytics, or claim a live integration from repository evidence alone.

## Final sign-off record

Before release, append or link a release record containing:

- exact commit SHA and artifact digest;
- staging project, Firestore database, Storage bucket and Functions region;
- deployed rules, indexes, Functions and worker revisions;
- Auth providers, App Check mode and authorized domains;
- two-account journey results and denied-path results;
- media processing and private-delivery evidence;
- backup/restore and rollback evidence;
- monitoring/alert checks and known incidents;
- provider/payment acceptance evidence, if enabled; and
- named owner approval for the release window.

Until those records exist, NEXORA may be repository-verified and CI-tested, but it must not be described as production-certified.
