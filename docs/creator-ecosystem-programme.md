# NEXORA Creator Ecosystem Programme

**Product direction:** Build a complete creator institution and creator economy inside the existing NEXORA product. Extend current identity, creator dashboard, feed, media, live, messaging, analytics, moderation, wallet and monetisation systems. Do not create a parallel application or duplicate an existing service.

## Programme principles

- Real functionality only: no demo balances, invented analytics, fake audience counts or simulated payouts.
- Reuse existing Firebase identity, Firestore, Storage, callable Functions, analytics and financial ledgers.
- Server-authoritative for certificates, public rankings, revenue, payouts, campaign settlement, paid access and trust decisions.
- Owner-scoped data by default; least-privilege Firestore and Storage rules.
- Progressive disclosure: keep advanced controls discoverable without overwhelming new creators.
- Every phase ships with tests, migration/index review, operational notes and explicit external dependencies.
- Do not promise production payments, certificates or live features until the required provider and staging acceptance tests pass.

## Nine workstreams

### 1. Creator Academy / NEXORA Institute
- Structured curriculum and learning paths for beginner, intermediate and advanced creators.
- Lesson content with accessible video/text formats, transcripts and practical assignments.
- Assessments, question banks, attempts, scoring and retake policies.
- Server-verified completion, signed/verifiable certificates and credential revocation.
- Learning history, progress sync, course bookmarks and accessibility support.
- Expert masterclasses, scheduled workshops, mentor office hours and instructor tools.
- AI tutor grounded in Academy course materials, with citations to lessons and safe boundaries.
- Course authoring, editorial review, versioning, localization and content moderation.

### 2. Creator Studio
- Drafts, scheduled publishing, calendar, reusable templates and content library.
- Caption and hashtag management, thumbnail workflow and post preview.
- Cross-format publishing built on existing post/media creation services.
- Content experiments and post-publication improvement suggestions.
- Explicit publishing states, retry handling and idempotency.

### 3. Creator Intelligence
- Verified impressions/reach, unique viewers, retention, completion and engagement definitions.
- Audience growth, returning viewers, content conversion and cohort trends.
- Creator-facing dashboards and exportable reports with privacy thresholds.
- AI growth diagnosis grounded only in available verified analytics.
- Annotations for creator experiments and comparisons over fair time windows.

### 4. Creator Economy
- Membership tiers, exclusive content entitlements and gifted memberships.
- Paid messages/live highlights, ticketed events, creator products and courses.
- Affiliate attribution, creator storefronts and service/coaching bookings.
- Reuse existing checkout, subscription, entitlement, refund, wallet and ledger primitives.
- Server-authoritative settlement, idempotent webhooks, refunds, tax/fee disclosures and payout reconciliation.

### 5. Live Evolution
- Multi-guest rooms, guest requests, moderator roles and audience participation.
- Battles, polls, Q&A, milestones and animated gifts with server-validated gift transactions.
- Live scheduling, replay controls, clip creation and creator-approved sharing.
- Abuse controls, age/safety controls, rate limits and resilient reconnect behaviour.
- Load, concurrency, media delivery and payment acceptance tests before broad rollout.

### 6. Creator Marketplace
- Creator portfolios/media kits and brand discovery.
- Campaign briefs, eligibility, applications, negotiation and deliverable tracking.
- Clear sponsorship disclosures, contracts/terms, milestones and dispute paths.
- Verified brand accounts and fraud detection.
- Escrow/settlement only through approved payment rails and backend financial ledger.

### 7. Creator Network
- Mentor/mentee matching, creator groups and collaboration requests.
- Co-created posts and shared publishing workflows with clear ownership/permissions.
- Creator partner programme with transparent eligibility and benefits.
- Moderation, reporting and anti-spam controls for networking surfaces.

### 8. Creator Trust and Protection
- Account protection, impersonation reporting and recovery escalation.
- Copyright notices, permission records, dispute/appeal workflows and repeat-infringer policy.
- Brand-deal scam detection and suspicious-link warnings.
- Transparent policy explanations, creator support tickets and status tracking.
- Human review and audit trails for consequential enforcement decisions.

### 9. Creator Discovery and Recognition
- Emerging creator discovery, topic/niche collections and local discovery controls.
- Creator spotlights, editorial collections, seasonal awards and leaderboards.
- Ranking quality based on verified, integrity-filtered signals, not follower count alone.
- Diversity, freshness, safety, anti-manipulation and appeal mechanisms.

## Delivery sequence

1. Academy foundation and creator dashboard integration.
2. Academy institution services: curriculum CMS, assessments, instructor workflows and verified certificates.
3. Creator Studio and publishing workflow improvements.
4. Creator Intelligence and verified reporting.
5. Creator Economy expansion on existing financial infrastructure.
6. Live Evolution, including animated gifts and co-host experiences.
7. Creator Marketplace.
8. Creator Network and Partner Programme.
9. Creator Trust and Protection expansion.
10. Creator Discovery and Recognition.

The nine workstreams are the product scope; the ten delivery steps separate the Academy's initial learner experience from its institution-grade authoring, assessment and credential services.

## Release gates

A workstream is not complete because a screen exists. It must have:
- Authenticated end-to-end flows and persisted data.
- Firestore/Storage rules and server authorization tests.
- Unit tests for policies and edge cases.
- Emulator or staging acceptance tests for multi-user ownership boundaries.
- Loading, empty, offline, retry and error states.
- Accessibility and mobile layout checks.
- Observability without logging secrets or unnecessary personal data.
- Migration, rollback and feature-flag plans where data or rollout risk exists.
- Explicit provider, legal, operational and owner configuration dependencies.

## Current implementation status

### Delivered in the Creator Studio phase
- Added owner-scoped reusable post templates to the existing Creator Dashboard. Creators can save a named caption, format and hashtag structure, apply it to a fresh draft, and delete their own templates.
- Template reads and writes use authenticated callable Functions; clients cannot write the template collection directly.
- Enforced bounded template names, captions, format values, tag counts, a 40-template per-creator cap, and ownership checks on edits/deletes.
- The existing draft editor, media upload, post editing and archive workflows remain the canonical Studio foundation.
- Automatic scheduled publishing remains explicitly unavailable; the dashboard does not represent a queued draft as a published post.

### Delivered in this branch: Academy learner foundation and institution backend
- Added an Academy experience within the existing Creator Dashboard.
- Added eight initial learning paths and 24 introductory lessons.
- Added per-account Firestore progress persistence.
- Added owner-scoped rules for progress reads and writes.
- Added Firestore rules regression coverage for ownership, invalid course IDs, oversized progress, forged credential fields and deletion.
- Clearly labels current completion as learner progress, not a verified certificate.

### Delivered in the current institution phase
- Added trusted instructor course drafting, lesson authoring, transcript/resource fields, editorial review and publication callables.
- Added a connected institution workspace in the existing Academy dashboard for course authoring, lesson entry, editorial actions, assessment setup, learner attempts, certificate verification/revocation, Creator Tutor and mentorship actions.
- Added server-side assessment grading and persisted attempts; answer keys are never returned to learner clients.
- Added idempotent certificate issuance, public verification codes and admin-only revocation.
- Connected VOH AI to selected, published Academy lessons. Tutor answers are grounded in approved lesson text, cite source lessons and abstain when the material does not support an answer.
- Added mentor session scheduling and transactional capacity-limited bookings.
- Added default-deny Firestore rules for institution records, supporting indexes, emulator integration tests and explicit anti-forgery rules tests.

### Remaining Academy production gates
- Full media ingestion/playback, caption generation and transcript processing; current authoring supports lesson text, transcript and HTTPS resource links.
- Course version migration, attempt limits/retake policies, question randomization and credential appeals.
- Instructor role provisioning/review operations and final live Firebase/Gemini staging acceptance.
- Full accessibility/mobile review and operational monitoring.
- The remaining eight creator ecosystem workstreams listed above.

### Verification status
The changes are committed to the feature branch. Automated build, lint and emulator tests must be run in CI or a configured local/staging environment before merge. Do not claim those checks passed until their results are observed.
