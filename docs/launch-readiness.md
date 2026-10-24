# Nexora launch-readiness contract

Nexora is being built as a real social platform, not a collection of demo screens. A capability is **shipped** only when its authoritative state, abuse controls, privacy behavior, observability, tests, and failure path exist. UI copy must never imply that a provider, metric, payment, moderation decision, or deletion operation is live when it is not verified.

## Product layers

### 1. Identity and account security

- Firebase Auth providers must be enabled and tested in the target project: email/password, Google, phone, recovery, verified email, re-authentication, session revocation, and account linking.
- Add MFA and trusted-device/session management before high-risk creator, payout, moderation, or account-deletion operations.
- Username lookup must resolve to a verified account identifier server-side; a username field must not be passed to an email-password API as if it were an email.
- App Check, provider quotas, password policy, abuse throttles, authorized domains, and recovery email delivery must be verified in staging and production.

### 2. Privacy and relationships

- Privacy settings, private accounts, follow requests, Close Friends, block, restrict, mute, mention/tag permissions, message requests, downloads, and audience selection must be canonical server-backed data.
- Every feed, search, recommendation, notification, message, community, story, media URL, and export path must enforce the same policy.
- A blocked or deleted user must stop receiving new delivery and must not regain access through cached or derived records.

### 3. Content and media

- Uploads enter a quarantine state and receive server-side MIME, codec, duration, dimensions, malware, copyright, and safety checks.
- Processing creates durable job records, idempotent retries, posters, captions, accessible text alternatives, and device/network-compatible renditions.
- Publish, processing, failure, retry, cancellation, and deletion states are authoritative and visible to the creator.

### 4. Trust and safety

- Reports become deduplicated moderation cases with target snapshots, severity, policy version, evidence retention, reviewer identity, decision reason, enforcement scope, and audit history.
- Account Status shows strikes, recommendations eligibility, removed content, and appeal state. Appeals must have a durable outcome, not only a submission receipt.
- Abuse controls are server-side: velocity limits, duplicate/link bursts, bot/device signals, report brigading, spam quarantine, and escalation. Browser-local counters are UX only.

### 5. Discovery and creator growth

- Recommendations use trusted exposure/watch/retention/negative-feedback events, privacy eligibility, creator safety state, and documented ranking versions.
- Creators get dated metrics with definitions, freshness, retention thresholds, and no synthetic actors or hard-coded revenue.
- Explore, search, hashtags, sounds, profiles, and recommendations share canonical indexing and deletion behavior.

### 6. Messaging, live, and notifications

- Messages, media, calls, live rooms, replays, push tokens, and notification preferences need participant authorization, quotas, abuse reporting, delivery state, retry behavior, and cleanup contracts.
- Live and monetization remain disabled until moderation, media processing, identity, ledger, payments, tax, refunds, and payout reconciliation are complete.

### 7. Data, operations, and investor proof

- Account deletion is an idempotent trusted workflow with leases, retries, progress, storage cleanup, Auth deletion, shared-content policy, retention disclosure, and completion verification.
- Every release has CI, rules tests, Functions tests, dependency audit, migrations, rollback notes, monitoring, error budgets, and a staging smoke test.
- Investor metrics come from versioned, deduplicated events and warehouse/rollup queries. Never present localStorage counters, seeded users, random values, or formulas as DAU, retention, revenue, or health.

## Current shipped foundations in this repository

- Firebase Auth integration and auth-gated actions.
- Firestore and Storage rules with emulator regression suites.
- Trusted account-deletion trigger and worker with leases, progress, shared-chat handling, Storage cleanup, and Auth deletion.
- Durable report and appeal intents.
- Private chat-media API boundary.
- Short-form Reels ranking, retention signals, and double-tap sparks.
- Express request IDs, security headers, health/readiness endpoints, and a GitHub quality gate.

## Release blockers still requiring product/provider verification

MFA and trusted devices, authoritative privacy graph enforcement across every surface, distributed abuse controls, production media transcode/moderation/captions, reviewer operations and Account Status, event ingestion/aggregation/experimentation, search indexing, push delivery, live moderation, creator monetization, payments/payouts, legal/privacy policy review, backups, disaster recovery, observability alerts, and production Firebase/provider configuration.

This contract is intentionally conservative: passing a local build is evidence of code health, not evidence that provider configuration or social-platform operations are live.
