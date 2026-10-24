# Phase 10 production-readiness baseline

**Repository state inspected:** `main` at commit `72548d6` (`origin/main` synchronized, clean working tree). No production deployment or production data access was performed.

## Architecture observed

The frontend is a Vite-built React application using Firebase Web SDK for Authentication, Firestore, Storage, Functions, and optional App Check. The production build also bundles the existing Express server from `server.ts`; that server serves `dist/` and owns the authenticated VOH and private-chat-media HTTP boundaries. Firebase Cloud Functions in `functions/` use Node.js 22, the Admin SDK, the configured named Firestore database, and `us-central1`. Firestore and Storage rules, indexes, emulator suites, and a GitHub Actions quality workflow are already present.

## Findings by risk

### Critical security and data integrity

1. `server.ts` contained a legacy unauthenticated `/api/auth/send-email-otp` and `/api/auth/verify-email-otp` implementation backed by an in-memory process map. It was not used by the current frontend, which uses Firebase Auth email verification, password reset, and phone verification. The process-local design was not safe for multiple instances or recovery, and the send route could not represent a durable production email workflow.
2. The client `EmailService.sendTransactionalEmail` wrote rendered email content to the Firestore `mail` collection. The rules comment called this trusted-server-only, but the rule allowed an authenticated client to create a message addressed to its own Auth email. This was not a trusted delivery provider and could not support reliable security notifications. The client writer is disabled; native Firebase Auth email flows remain the supported verification/reset mechanism, while provider-backed security email remains explicitly unavailable.
3. The server used fallback production project, database, and Storage bucket identifiers. Production startup did not clearly require the deployment environment to declare its target configuration.

### Deployment blockers

The repository had no complete release workflow. CI omitted Storage rules tests, migration/engagement/VOH integration tests, production dependency audit for Functions, secret scanning, and deployment configuration validation. There was no repository-level release-readiness classification or one-step operational handover.

### Reliability and recovery gaps

Account deletion and migration runbooks existed and were conservative, but backup/export ownership, restore drills, retention/TTL configuration, and production rollback verification were external prerequisites rather than verified repository facts. No production deployment or staging smoke test was available in this environment.

### Performance and scalability

Phase 9 added bounded reads, cache limits, queue merge safety, and vendor chunking. The remaining Firebase vendor chunk is large but explicit and cacheable. Realtime directories and operational reads now have bounds; no new speculative infrastructure is justified in this phase.

### Monitoring and operations

The Express service had minimal health/readiness endpoints and request IDs but did not emit bounded structured request outcome/duration logs. Firebase/Functions observability, alert destinations, backup scheduling, App Check enforcement, and provider delivery were not verifiable here.

### Documentation and release process

The repository had Firebase-specific setup and migration notes plus a conservative launch contract, but lacked a single actual architecture description, deployment/rollback handover, backup/restore plan, incident procedure, security review, and verified-vs-blocked release checklist.

## Scope selected for implementation

This phase fixes the verified unsafe legacy paths, makes production configuration fail clearly, removes production-only debug probes, adds bounded structured server request logs, consolidates and strengthens existing CI, adds repository-safe secret/deployment checks, and creates truthful operational handover documents. It does not deploy Firebase, enable payments, invent an email provider, run a production migration, or claim production verification.
