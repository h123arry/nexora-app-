# Nexora Phase 11.6 — Controlled Beta & Real-User Readiness

## Release decision

**Current decision: NOT READY for real-user controlled beta yet.**

Nexora is a tested, deployable foundation that is ready for an owner-controlled staging verification window. It is not yet genuinely beta-ready because no live Firebase project, hosting target, Storage bucket, deployed Functions revision, real authentication journey, or two-account end-to-end smoke run was verified in this environment.

This document deliberately separates repository evidence from live checks. Passing emulator tests does not prove that production Auth, Firestore, Storage, Functions, App Check, email, push, quotas, or domain configuration work.

## What is verified in the repository

- TypeScript typecheck and the production build pass on Node.js 22.
- Unit and policy coverage passes for feed pagination, discovery, media lifecycle, message serialization, account-scoped storage, moderation, analytics policy, monetization policy, video preload behavior, and VOH memory consent.
- Firebase Auth emulator coverage exercises registration, session restoration, invalid credentials, duplicate registration, password reset enumeration safety, reauthentication, password changes, and account deletion safeguards.
- Firestore rules cover profiles, public projections, posts, comments, chat participants, notifications, follows, communities, moderation reports, appeals, deletion requests, settings, analytics, and financial records.
- Storage rules cover user media ownership and deny direct client access to private chat audio.
- VOH/private-media API security tests cover missing or malformed tokens, retired OTP endpoints, bounded audio input, rate limits, participant access, message linkage, and revoked sessions.
- Deployment metadata validation and tracked-file secret scanning pass.
- Production server health/readiness endpoints, request IDs, bounded structured logs, fail-closed production configuration, and rollback documentation exist.

## Required live beta gate

An owner must complete the following in an isolated, non-production staging project before inviting any real user. Record the exact project ID, Firestore database ID, Storage bucket, hosting URL, release commit, test account IDs, timestamps, and pass/fail evidence. Do not record passwords, tokens, message bodies, private media, or personal user data.

### Environment and security

- [ ] Firebase Console project and registered Web App match the reviewed configuration.
- [ ] Hosting domain is HTTPS and listed in Firebase Auth authorized domains.
- [ ] `NODE_ENV=production`, immutable `RELEASE_VERSION`, `GCLOUD_PROJECT`, `FIRESTORE_DATABASE_ID`, and `FIREBASE_STORAGE_BUCKET` are configured in the host secret/environment manager.
- [ ] Application Default Credentials/IAM allow the server and Functions to reach only the intended project and named database.
- [ ] Firestore rules and indexes are deployed from the reviewed commit; Storage rules are deployed from the same compatibility window.
- [ ] App Check registration and staged enforcement policy are configured, or the beta owner has explicitly approved a documented temporary exception.
- [ ] Storage billing/Blaze requirements, lifecycle cleanup, retention, and object access policy are approved.
- [ ] Scheduled Firestore exports, retention, restore access, and rollback owner are recorded.
- [ ] Monitoring destinations, alert ownership, provider quotas, and incident contacts are recorded.

### Two-account authentication journey

Use two non-production accounts, `A` and `B`, on a clean browser and a mobile viewport.

- [ ] Register `A` with email/password; verify the email if the flow requires it.
- [ ] Log out; log in again; refresh; confirm session restoration and remember-device behavior.
- [ ] Reject duplicate registration, invalid password, invalid reset identifier, and malformed input with clear non-sensitive errors.
- [ ] Request password recovery for an existing and unknown address; responses must be enumeration-safe.
- [ ] Confirm logout clears protected UI and device/session-specific state.
- [ ] If Google or Phone is in beta scope, verify provider, authorized domain, reCAPTCHA/SMS quota, and recovery behavior. Phone is currently disabled in the known project and must not be presented as available until enabled and tested.
- [ ] Complete onboarding with username, interests, and avatar; refresh midway to verify resume behavior and confirm a failed profile write cannot enter the app as success.
- [ ] Test account deletion request with reauthentication in staging; verify the expected delayed/server-owned deletion behavior.

### Core social journey

- [ ] `A` creates and edits a profile; `B` sees only the intended public projection.
- [ ] `A` creates a text post and a supported media post; verify loading, success, failure, retry, and refresh behavior.
- [ ] Verify feed pagination, empty feed, offline/slow-network behavior, and duplicate prevention.
- [ ] Verify comments, comment ownership, counter updates, and denied forged-author writes.
- [ ] Verify like/spark/reaction persistence across refresh and a second account. Do not mark this passed based only on a visible button; the repository currently notes that the matching live Functions endpoint needs verification.
- [ ] Verify follow/unfollow and private-account behavior across `A` and `B`.
- [ ] Verify block, mute, restrict, report, appeal, and moderation visibility with a reviewer test account where applicable.
- [ ] Verify search behavior and document its scope: current search is client-loaded data, not a durable global index.
- [ ] Verify notifications read/unread state, deep links, and failure handling. Mark push notifications separately from in-app Activity notifications.
- [ ] Verify direct messaging, participant isolation, send failure/rollback, read state, typing/presence cleanup, and private media access.
- [ ] Verify media upload MIME/size rejection, progress, cancel/retry, object ownership, and cleanup of abandoned objects.

### UX and mobile quality

- [ ] Test a current Android browser at narrow and wide mobile widths; verify bottom navigation, safe-area spacing, keyboard focus, dialogs, composer, chat input, and media controls.
- [ ] Test desktop width and a slow network profile. Capture loading, empty, error, retry, and offline states for feed, profile, inbox, communities, notifications, and media.
- [ ] Confirm every failed write shows a truthful error or retry state; no demo fallback is presented as a successful live operation.
- [ ] Run keyboard navigation and critical axe checks on the staged URL.
- [ ] Record at least one cold start and one returning-session observation; do not claim real-user performance targets until measured with representative devices.

## Feature readiness matrix

| Capability | Repository evidence | Live beta status |
|---|---|---|
| Registration/login/logout/recovery | Auth emulator tests and service boundaries | **Manual staging blocker** |
| Profiles/onboarding | Owner-scoped rules and onboarding safeguards | **Manual staging blocker** |
| Feed/posts/comments | Bounded feed, rules, pagination and policy tests | **Manual staging blocker** |
| Reactions/likes | Trusted policy tests; live Functions path needs confirmation | **Blocked until cross-account persistence is proven** |
| Follows/privacy | Deterministic relationships and rules | **Manual staging blocker** |
| Messaging | Participant rules, bounded history, API security tests | **Manual staging blocker** |
| Search | Client-loaded discovery/search only | **Limited; not a global indexed search** |
| Notifications | Firestore Activity paths plus local/synthetic state | **In-app manual check; push not certified** |
| Media uploads | Storage paths/rules and lifecycle tests | **Blocked until live Storage/billing is configured** |
| Moderation/reporting | Rules and policy tests; reviewer claims are server-owned | **Manual staging blocker** |
| Mobile/slow network UX | Source-level states and type/build checks | **Manual device/browser blocker** |

## Known issues and beta exclusions

Do not advertise or expose these as fully live beta capabilities:

1. Production Storage is not verified and the Firebase Console previously showed Storage onboarding/Blaze billing requirements.
2. App Check is not verified as registered or enforced.
3. Phone Auth is disabled in the known project; the UI must not imply that phone sign-in is available.
4. Production Firestore rules, indexes, Functions, IAM, named-database behavior, and private media paths have not been live-verified.
5. Firebase named-database SDK overloads are documented as Public Preview; an owner architecture decision is still required for production confidence.
6. Provider-backed transactional email, SMS, FCM background delivery, Gemini/VOH quotas, and monitoring/alert destinations are not certified.
7. Search is limited to data loaded by the client; it is not a durable global search index.
8. Some community membership, Circles, creator scheduling, analytics, reputation, World Pulse, and monetization surfaces remain local, simulated, disabled, or best-effort.
9. Like/reaction persistence through the matching live Functions endpoint still requires a two-account staging check.
10. Delivered messaging receipts, cross-device community membership, durable notification delivery, media transcoding/moderation/captions, MFA/trusted devices, and distributed abuse controls are not beta guarantees.

If a beta build contains any of these surfaces, label them clearly as unavailable, preview, local-only, or not yet supported. Do not replace a missing provider with fake success data.

## Rollback plan

1. Freeze invitations and new beta traffic; preserve the release commit, artifact digest, deployment timestamp, and request IDs.
2. Check `/healthz`, `/readyz`, structured server logs, Functions logs, Firebase permission errors, Storage errors, quotas, and billing signals.
3. If the issue is frontend/Express-only, restore the previous known-good artifact and `RELEASE_VERSION`.
4. If the issue is Functions-only, deploy the previous compatible Functions revision and restore its environment/secrets.
5. If the issue is rules/index configuration, redeploy the last reviewed restrictive rules/index source. Never use allow-all rules as an emergency fix.
6. Do not automatically reverse Firestore data changes, account deletion, moderation actions, financial state, or migrations. Use a separately reviewed recovery procedure and verified backup.
7. Re-run health/readiness, denied-path smoke tests, Auth login, profile access, feed read, chat participant isolation, and private media checks before reopening the beta.
8. Record impact, affected accounts/data classes, start/end times, containment, rollback commit, root cause, and follow-up owner.

## Support procedure

Create one private support channel with the beta owner, one technical operator, and one moderation/privacy owner. Every report should include:

- release version and approximate timestamp;
- device/browser and network condition;
- screen/feature and action attempted;
- visible error text and `X-Request-Id` if present;
- whether the problem reproduces for the second test account;
- screenshots only after removing private messages, email addresses, tokens, and media.

Triage severity:

- **S0:** suspected privacy/security exposure, unauthorized access, credential compromise, or data loss. Freeze beta traffic and follow the incident runbook immediately.
- **S1:** authentication outage, widespread posting/messaging failure, destructive account issue, or private media exposure. Pause new invitations and roll back or disable the affected capability.
- **S2:** one-user feature failure with a safe retry or workaround. Keep beta limited and create a tracked fix.
- **S3:** cosmetic, copy, or non-blocking UX issue. Record for the next release.

Never ask a user to send a password, verification code, Firebase token, private message, or raw media file through support. For account recovery, use the trusted Firebase Auth flow and owner-approved identity verification.

## Final classification and exact next actions

Nexora should remain **STAGING-READY / BETA-BLOCKED** until the owner:

1. creates or confirms a non-production staging Firebase project and Storage bucket;
2. configures Auth providers, authorized domains, App Check, Functions IAM/secrets, email/SMS/push decisions, and backups;
3. deploys reviewed rules/indexes/Functions/frontend artifacts;
4. runs the two-account checklist above on desktop and Android/mobile slow-network conditions;
5. records evidence and an explicit approval from the release owner;
6. starts with a small, invited group only after the rollback owner and support channel are active.

No invitations, announcements, production writes, billing activation, or third-party-provider activation are authorized by this repository change.
