# Phase 7.1: Production infrastructure audit

**Audit date:** 2026-11-08  
**Repository:** `h123arry/nexora-app-`  
**Audited branch:** `main`  
**Audited commit:** `4e2d0779395d71690bd36c3ef102e6174b4b51cb`  
**Result:** Infrastructure foundation exists; production activation is blocked by owner-controlled cloud prerequisites. No production resources were changed.

## Executive result

NEXORA has a meaningful deployment foundation: Node.js 22 build configuration, Firebase rules and indexes in source control, isolated environment templates, a deployment metadata validator, staging-target safety checks, a comprehensive CI workflow, health/readiness endpoints, and deployment/rollback runbooks.

That is not the same as provisioned and verified production infrastructure. The repository does not prove that backups are scheduled, a restore has succeeded, monitoring alerts reach an operator, production IAM is correct, or the app is deployed and healthy. Phase 7.1 must remain **blocked for production activation** until the evidence below is supplied and tested.

## Verified from the repository

| Area | Evidence | Finding |
|---|---|---|
| Source and release baseline | `.firebaserc`, `firebase.json`, package manifests | Firebase Functions use Node.js 22; Firestore rules/indexes and Storage rules are source-controlled. |
| Target separation | `.firebaserc`, `.env.staging.example`, `scripts/validate-staging-config.mjs` | The default alias is `demo-nexora-local`; production is a separate explicit alias. Staging validation rejects the production project and emulator configuration. |
| Production metadata | `scripts/validate-deployment.mjs` | Checks project identity, web app identifiers, database manifest, rules/index files, Node runtime and required release assets. |
| CI | `.github/workflows/ci.yml` | One CI workflow covers secret scanning, frontend type-check, Functions build, unit and emulator security/integration tests, dependency audits, production build and deployment metadata validation. |
| Health checks | Existing Express health/readiness implementation and production architecture docs | `/healthz` reports process availability; `/readyz` checks configured dependencies. |
| Release procedure | `docs/deployment-runbook.md`, `docs/FIREBASE_DEPLOYMENT_RUNBOOK.md` | Staging-first deployment, restrictive rules, migration safeguards and rollback are documented. |
| Firestore indexes | `firestore.indexes.json` | Composite indexes and TTL field overrides are checked in. This does not establish that indexes are deployed or ready in a live project. |

The audited `main` commit's CI run (`42408299008`) completed successfully. This proves the configured GitHub workflow passed for that commit; it does not prove live Firebase deployment or production readiness.

## Production blockers

### P0: Resolve the named Firestore database SDK support decision

The deployment runbook records that both the browser Firebase JS SDK named-database call and the Firebase Admin named-database overload used by this architecture are documented as Public Preview in the referenced SDK documentation. The configured production database ID is `default`, which is a named database identifier in this project rather than Firestore's built-in `(default)` database.

**Required:** obtain and record an architecture decision backed by current official SDK support. Validate the actual browser and server paths against an isolated staging project. Do not treat emulator success as proof that this production architecture is supported.

### P0: Provision and verify production storage

The existing runbook records that the production project's Storage onboarding required Blaze billing and that a production bucket association had not been verified at the time of that inspection.

**Required:** owner verifies billing, bucket existence/location, bucket association, service identities and least-privilege IAM; then tests private media upload, authenticated playback, deletion and denied direct access in staging. Never make chat media public as a workaround.

### P0: Backups and restore

The repository documents the required backup plan but does not create or verify scheduled exports or a successful restore drill.

**Required:** configure scheduled Firestore exports to a dedicated access-controlled, retention-managed bucket; define Storage object retention/versioning and Auth recovery procedures; record encryption, retention, backup freshness, RPO and RTO. Perform a restore drill in an isolated project and smoke-test the restored database, objects, rules, indexes and identity-dependent workflows. Keep exports and credentials out of Git.

### P0: Monitoring and alert delivery

Health/readiness endpoints and structured request logs exist, but no verified production monitoring destination, alert route, on-call owner or tested alert is recorded.

**Required:** configure uptime checks for health and readiness, error/latency monitoring for Express and Functions, Firestore permission-denial and index failure signals, Storage errors, quota/billing alerts, and actionable delivery to an owner-controlled destination. Trigger and acknowledge a test alert.

### P0: Real staging deployment evidence

The repository's staging validator checks configuration shape and target separation only. It explicitly does not prove Firebase access or deployment.

**Required:** supply an owner-controlled non-production Firebase project, matching database and bucket, deployment identity/IAM, Auth providers, secrets, HTTPS staging URL and non-production test accounts. Deploy reviewed rules, indexes and Functions there; verify index readiness and execute allowed/denied-path smoke tests plus rollback.

### P1: Production hosting and release evidence

No production hosting target, deployment identity, immutable artifact digest, deployed Functions revision or release health evidence is verified by this audit.

**Required:** select and document the hosting target and region, configure secret-manager references, deploy only after staging acceptance, and record commit, artifact digest, target IDs, operator, approval, timestamps, smoke tests and rollback owner.

## Important configuration notes

- `.firebaserc` sets `default` to `demo-nexora-local` and `production` to `nexora-prod-voiceharrison`. Production commands must pass the explicit production project; never change the default alias to production.
- `firebase.json` targets the configured Firestore database entry and references the checked-in rules and index manifest. Deployment must use the verified database ID and should not assume emulator parity.
- `firebase-applet-config.json` contains public Firebase web-app configuration, not server credentials. Server secrets and Admin credentials must remain in the hosting secret manager / workload identity.
- The production environment template contains owner-supplied placeholders for database, bucket, release and optional provider values. Do not replace placeholders with guesses.
- The current CI validates source and emulator behavior. It is not a production deployment workflow and must not silently deploy production on push.

## Safe completion sequence

1. Resolve the named-database SDK support decision.
2. Provision the isolated staging project, database, Storage bucket, IAM and secrets.
3. Configure backups and complete a restore drill before any customer-data rollout.
4. Configure monitoring, alert delivery and a successful alert acknowledgement.
5. Deploy rules/indexes/Functions to staging and wait for index readiness.
6. Run authenticated positive and negative smoke tests, private-media tests, account lifecycle tests, and rollback rehearsal.
7. Record evidence and obtain explicit owner approval for a production change window.
8. Only then consider a separately approved production deployment.

## Explicitly not performed

- No Firebase project, database, bucket, billing plan, IAM role, Auth provider, secret, hosting service, backup schedule or monitoring destination was modified.
- No production data was read, exported, migrated or changed.
- No production rules, indexes, Functions or application deployment was run.
- No credentials or service-account keys were added to the repository.

**Phase 7.1 status: audit completed; production infrastructure activation remains blocked pending the owner-controlled prerequisites above.**
