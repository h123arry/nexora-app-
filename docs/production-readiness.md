# Nexora production-readiness checklist

**Current classification: Ready for staging verification, with listed blockers.** The repository is not production-ready certification. It is a tested deployable foundation whose next safe step is controlled staging verification.

## A. Verified in the repository

- React/Vite/Express production build succeeds with Node.js 22.
- Cloud Functions compile for Node.js 22.
- Frontend type-check and unit policy tests pass.
- Firestore and Storage authorization suites pass in emulators.
- Authenticated VOH/private-media boundary tests pass in emulators.
- Migration dry-run/idempotency and concurrent engagement tests pass.
- Production dependency audits pass in the current lockfiles.
- Deployment metadata validation and tracked-file secret scanning are implemented.
- CI has one authoritative workflow covering install, validation, type-check, Functions build, unit tests, Firestore/Storage rules, integration suites, audits, and production build.
- Production server startup requires explicit target configuration and release ID.
- Legacy custom OTP routes are disabled; native Firebase Auth is the supported verification/reset flow.
- Client-side transactional email writes are disabled and mail writes are denied by Firestore rules.
- Health/readiness endpoints, request IDs, bounded structured request logs, and rollback/runbook documentation exist.

## B. Verified in staging or an isolated test environment

The local Firebase emulator suites verify authorization logic and selected service behavior, but they are not a staging deployment. Before launch, an operator must verify a real non-production Firebase project with the intended named database and Storage bucket: Auth provider flows, authorized domains, Functions IAM, App Check behavior, indexes, private media, account deletion, provider quotas, and denied-path smoke tests.

## C. Verified in production

None. No production Firebase project, hosting target, deployed Functions revision, production database, bucket, monitoring system, or live user journey was inspected in this task.

## D. Blocked by external configuration

Production project and hosting credentials; named-database and bucket confirmation; Application Default Credentials/IAM; Auth provider enablement and authorized domains; App Check registration/enforcement; Functions secrets and runtime/region; backup/export scheduling and restore drill; monitoring and alert destinations; Storage lifecycle/retention; provider-backed transactional email; FCM/VAPID delivery; and staging/production smoke-test accounts are not available here.

Payments, payouts, creator earnings, trusted ledger operations, private audience variants, durable search indexing, media transcoding/moderation/captions, distributed abuse controls, MFA/trusted devices, and live moderation remain unimplemented or unavailable. They must not be represented as live features.

## E. Requires human approval or legal review

A production deployment window, Firebase target selection, rules/index rollout, reviewed legacy-public-post manifest, any data migration, backup retention/RPO/RTO, privacy/retention policy, incident-notification policy, domain/provider activation, and monetization/provider activation require the appropriate owner, security, legal, or compliance approval.

## Launch blockers

Do not launch until staging confirms the actual target configuration, backups and restore access, restrictive rules, private-media path, Auth providers, Functions IAM/secrets, App Check decision, monitoring, and critical user journeys. Do not run the legacy audience migration without its reviewed manifest, dry-run, backup, second-person review, and approved change window. Do not activate email, push, payments, payouts, or other optional providers merely because a UI exists or an environment variable is present.

## Immediate next action

Create an isolated staging Firebase project matching the intended named database and Storage architecture, configure non-production secrets and Auth providers, deploy the reviewed rules/indexes/Functions, and execute the smoke-test and rollback evidence described in [`docs/deployment-runbook.md`](deployment-runbook.md).
