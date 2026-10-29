# Nexora final launch gate — 2026-10-29

## 1. Release decision

**BLOCKED for production release.**

The repository is in a buildable, security-tested state, and the Firebase Auth client flow passes the available emulator lifecycle tests. Production release cannot be certified because this environment does not have verified access to the canonical Firebase project `nexora-prod-voiceharrison`'s Authentication provider settings, authorized domains, staging deployment, provider quotas, backup/restore evidence, or real two-account end-to-end test accounts.

This is an external verification blocker, not a claim that the application code is unusable.

## 2. Repository and commit

- Repository: `h123arry/nexora-app-`
- Branch: `main`
- Latest implementation commit before this report: `97b7fe4 feat(scale): add bounded expired story cleanup`
- This report is committed separately after validation.
- The working tree must remain clean and synchronized with `origin/main` after the report commit.

## 3. Authentication

### Verified code and emulator behavior

The canonical browser project is `nexora-prod-voiceharrison`; its registered web-app values are supplied by the owner in `firebase-applet-config.json`, which is consumed by `src/lib/firebase.ts`. The canonical authentication service is `src/services/firebase/authService.ts`; the React auth state boundary is `src/context/FirebaseContext.tsx`.

The available Auth emulator suite passed all four authentication tests:

1. Firebase configuration and credential failures are mapped without exposing provider details.
2. Email registration, session restoration, and email sign-in work through Firebase Auth.
3. Duplicate registration and invalid credentials are rejected without creating a second account.
4. Password reset uses the real Firebase Auth provider and handles unknown accounts safely.

The code already maps `auth/operation-not-allowed` to an honest provider-disabled message. It does not replace Firebase with local or mock authentication, and no hardcoded test account is used in production code.

### Production blocker

The earlier `auth/operation-not-allowed` result cannot be fixed by a source-code change. The project owner must verify, in the canonical Firebase project `nexora-prod-voiceharrison` after owner-provided web configuration is installed:

1. Authentication → Sign-in method → Email/Password enabled.
2. Phone enabled only if phone sign-in is intentionally in launch scope, with SMS, reCAPTCHA, quota, billing, and abuse controls configured.
3. Production and staging domains listed under Authorized domains.
4. Email action configuration and sender settings for verification and password reset.
5. Firebase web configuration and the deployed application target refer to the same project.
6. Real authorized staging test accounts complete signup, login, refresh/session restoration, logout, reset, and protected-route checks.

No private credentials should be shared in chat.

## 4. Core user journeys

### Verified locally or through emulator coverage

- Firebase Auth registration, login, duplicate-account rejection, invalid credentials, password reset, and session restoration: **PASS in emulator**.
- Firestore authorization regression suite: **21/21 PASS**.
- Feed pagination, ranking, discovery, preferences, media paths, message serialization, lifecycle, moderation, analytics, monetization-policy, performance, and video-preload unit coverage: **PASS through `npm run test:unit`**.
- Expired Story cleanup: Functions TypeScript build passed; production execution and schedule are not verified until deployment.
- PWA update flow: source and production build passed; real installed-device update behavior still needs staging smoke testing.

### Not verified in this environment

- Real production/staging signup and login against the canonical Firebase project `nexora-prod-voiceharrison`.
- Two-account feed, follow, profile, privacy, messaging, typing, read-receipt, attachment, and unread-count journey.
- Real Storage upload/retrieval against the target bucket.
- Push delivery through configured FCM/VAPID credentials.
- Payment, payout, subscription, email-provider, and SMS-provider delivery.
- Production Functions deployment, IAM, named-database behavior, and scheduled-job execution.

These items are **BLOCKED**, not marked as passed.

## 5. Security and data integrity

The available Firestore authorization suite passed all 21 tests, including owner scoping, protected fields, relationship ownership, moderation reports and appeals, lifecycle requests, private records, and financial-record restrictions.

The repository includes server-side Firebase ID-token verification for protected Express operations, bounded request payloads, request IDs, safe error responses, structured request outcome logs, App Check support when configured, and a bounded expired-Story cleanup worker. The cleanup worker validates owner-scoped media paths, processes at most 100 records per run, isolates failures, and recursively removes Story view subcollections.

The security scan passed for all 259 tracked files. No secrets were added by this final phase.

The following still require staging verification: production rules deployment, Storage rules against the actual bucket, App Check enforcement, Functions IAM, private-media access, cross-account denied paths, and backup/restore procedures.

## 6. Build and automated tests

Executed successfully:

```text
npm run test:auth
npm run test:unit
npm run test:rules
npm run lint
npm run functions:build
npm run build
git diff --check
npm run security:scan
npm run validate:deployment
```

Evidence:

- Auth emulator: 4 tests passed.
- Firestore rules: 21 tests passed, 0 failed.
- Unit suite: passed.
- Root TypeScript check: passed.
- Firebase Functions TypeScript build: passed.
- Vite and Express production build: passed.
- Secret scan: passed for 259 tracked files.
- Deployment metadata validation: passed.
- Production build still reports a large Firebase browser chunk warning; route-level code splitting exists, but the Firebase bundle should be measured and optimized as a post-gate performance task rather than hidden.

## 7. External services

| Service | Status | Evidence or limitation |
| --- | --- | --- |
| Firebase Auth | Emulator verified; production blocked | Provider enablement and authorized domains are not verified here |
| Firestore | Emulator rules verified | Target named database deployment is not verified |
| Firebase Storage | Code and rules present | Target bucket, private access, and upload smoke test are not verified |
| Cloud Functions | Compiles locally | Deployment, IAM, schedule execution, and logs are not verified |
| Push notifications | Partial code only | FCM/VAPID token registration and trusted delivery are not verified |
| Email/SMS providers | Not verified | Native Firebase Auth flows require project configuration; custom transactional email is unavailable |
| Payments/payouts | Disabled | No provider, checkout, webhook, or payout deployment is configured |
| Monitoring/alerts | Not verified | No active alert destination or production dashboard was tested |
| Backups/restore | Not verified | Owner must establish retention and complete a restore drill |

## 8. Outstanding blockers

### P0 — Release prohibited if authentication is unavailable

**Blocker:** The target Firebase project's Email/Password provider, authorized domains, and real account lifecycle are not verified.

**Next action:** Configure and verify the exact Firebase project in staging, then run authorized real-account signup/login/reset/logout/session tests.

### P1 — Required before launch

- Deploy and smoke-test Firestore/Storage rules and indexes in an isolated staging project.
- Verify two-account privacy, blocking, messaging, media, and notification journeys.
- Deploy Functions and verify IAM, named database, Storage bucket, scheduled Story cleanup, account deletion, and sanitized logs.
- Establish backups, retention, restore access, rollback procedure, and a restore drill.
- Configure App Check, rate/quota controls, authorized domains, and monitoring/alert destinations.
- Decide launch scope for payments, push, email, SMS, and live functionality; keep unavailable services disabled and honestly labelled.

### P2 — Important follow-up

- Reduce or further split the large Firebase browser bundle after measuring real mobile startup impact.
- Add device/browser smoke coverage for PWA installation, offline recovery, service-worker updates, and media playback.
- Complete production field telemetry and SLO dashboards without collecting private message or media contents.

## 9. Deployment readiness

The repository is ready for a controlled staging deployment, not an unreviewed production launch. The deployment runbook, production-readiness documentation, Firestore/Storage rules, indexes, Functions source, and CI checks are present. A production release still requires an approved target, environment secrets, Firebase provider configuration, staging evidence, backup/restore confirmation, legal/privacy approval, and an explicit launch owner.

No destructive migration or live deployment was performed during this gate.

## 10. Single next action

Create or select an isolated staging Firebase project matching the checked-in Auth, named Firestore, Storage, and Functions architecture; enable Email/Password, configure authorized domains, deploy the reviewed rules/indexes/Functions, and run the two-account end-to-end smoke checklist. That staging evidence is the shortest path from this repository's verified code state to a real launch decision.
