# NEXORA feature expansion and launch-readiness tranche
Date: 2026-11-02
Base: main at the start of this tranche

This tranche improves existing surfaces without presenting unconfigured providers or local-only behavior as production functionality.

## Implemented in this tranche

- World Pulse topic selections now load from and save to the signed-in account's Firestore settings (content.contentPreferences). The interface explicitly distinguishes saved preferences from live activity and push-alert delivery, which remain unconnected.
- Creator Studio edit, archive, delete, and bulk actions now wait for Firestore writes before showing success or changing the local view. Failed writes retain the edit state/selection and show a retry message rather than claiming success.
- Creator Studio no longer displays fabricated media-safety, copyright, or duplication scan clearance. It identifies those checks as not connected or not verified.
- VOH AI's preference capsule no longer starts with invented sample interests. It displays only opted-in local memory interests and creator goals.

## Existing feature surfaces and gaps confirmed during repository review

### World Pulse
- Account topic preferences are now durable.
- Live activity aggregation, trusted trend ranking, privacy-safe map aggregation, and topic push delivery are not connected. Do not show synthetic trends, locations, counts, or alert-delivery success.

### Creator Studio
- Existing publishing, draft, media upload, archive, appeal submission, and post analytics surfaces are retained.
- Creator metrics must remain limited to stored, defined counters; unknown metrics stay unavailable.
- Provider-backed copyright matching, platform-wide duplicate detection, media safety scanning, and transcoding are not connected. UI must not show clearance.

### Circles
- The current community view still uses browser-local community records and local membership helpers. The community Firestore rules have an owner/public read boundary, but member-level authorization and durable member actions are not fully implemented.
- The current portal contains local-only chat, poll, RSVP, and challenge interaction state. These must not be represented as cross-device community activity. A future implementation must add canonical Firestore membership and per-action authorization before enabling these surfaces as shared community functionality.

### VOH AI
- Chat sessions and optional memory are browser-local and account-scoped; memory is consent-gated.
- Cloud memory sync is intentionally unavailable. Do not imply cross-device memory or private-message access.
- The preference capsule must be derived from opted-in memory, never prefilled with invented profile facts.

### NEXORA Economy
- The current wallet does not have a trusted NEX ledger. Profile balance fields are not a transaction ledger.
- Financial billing records are server-owned; checkout is disabled until a real payment provider adapter and merchant configuration exist.
- A tested NEX ledger policy module now defines balanced debit/credit transfer entries, stable idempotency references, safe integer arithmetic, and overdraft prevention. It is not yet wired to a trusted persistent ledger or wallet API.
- Do not enable transfers, redemptions, cash conversion, creator payouts, or rewards that mint value until the immutable ledger is persisted atomically by trusted server code, with authorization, reconciliation, abuse controls, and owner-approved economic policy.

## Launch-readiness checks still requiring owner/provider action

1. Enable and verify Firebase Auth providers, authorized domains, App Check, quotas, and production email/phone delivery in the actual target Firebase project.
2. Configure scheduled Firestore exports, Storage retention/versioning, and approved Auth recovery; perform and document an isolated restore drill with RPO/RTO targets.
3. Configure external error monitoring, alert destinations, on-call ownership, and incident escalation. Structured request logs and health/readiness routes are not a substitute for alerting.
4. Deploy and verify reviewed Firestore/Storage rules, indexes, Functions, and Hosting configuration in staging before production.
5. Run staging smoke tests for account creation/recovery, two-account privacy, feed, media lifecycle, messaging, deletion, and failure/retry paths on real supported devices and networks.
6. Complete production media processing, moderation, captions, derived playback variants, push delivery, authoritative privacy graph enforcement, and operational review queues before claiming full social-platform readiness.
7. Complete legal/privacy review, data retention disclosures, and the user-facing support/incident process.

## Release discipline

- CI success proves the configured automated checks passed; it does not prove production provider configuration, deployment, restore capability, live alerts, or real-device acceptance.
- Keep each feature tranche on a reviewable branch/PR. Merge only after the full required CI workflow succeeds and verify that main points to the resulting merge commit.
- Never put customer data, secrets, tokens, message contents, or private media in diagnostics or test fixtures.
