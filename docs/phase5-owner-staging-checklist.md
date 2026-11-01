# Phase 5 owner staging checklist

## Current status

**STAGING BLOCKED — owner configuration and Firebase authorization are unavailable.**

Verified from the Phase 4 checkout at commit `5652aa3954e7f4f0b8a85424c2a62be90785c2fb`:

- Repository is clean and synchronized with `origin/main`.
- `npm run validate:deployment` passes.
- The 16 targeted environment-isolation tests pass.
- No private staging environment file is present; only the committed templates exist.
- Required staging values are unavailable: project ID, Web App config, database ID, Storage bucket, App Check site key, Auth provider/domain settings, and server secrets.
- Firebase CLI has no authorized accounts (`firebase login:list` reports none).
- No staging endpoint, deployment evidence, monitoring destination, backup/export, rollback artifact, or disposable staging accounts are available.

No deployment, Firebase Console change, production change, credential creation, or external resource modification was performed.

## Owner inputs required

- Separate non-production Firebase project ID.
- Firebase Web App configuration: App ID, API key, Auth domain, messaging sender ID, Storage bucket, and optional VAPID key.
- Auth provider selection and exact staging Authorized Domain.
- Firestore database ID and Storage bucket.
- Functions project/region configuration and non-production server secrets.
- App Check registration, staging site key, and explicit monitoring/enforcement decision.
- Firebase CLI authorization and least-privilege deployment permissions.
- Backup/export location, restore access, rollback owner, and prior known-good artifact.
- Two disposable staging accounts for end-to-end testing.

## Owner setup sequence

1. Create or select the separate staging project and record its ID privately.
2. Configure the Web App, Auth providers, Authorized Domains, Firestore database, Storage bucket, Functions runtime, and App Check.
3. Copy `.env.staging.example` to a private `.env.staging.local` and replace every placeholder with owner-provided values.
4. Authenticate the pinned Firebase CLI with the owner-approved account.
5. Load the private environment and validate without deploying:

```sh
set -a
. ./.env.staging.local
set +a
npm run validate:staging
npm run security:scan
npm run lint
npm run functions:build
npm run build
```

6. Confirm the active CLI project is exactly `$NEXORA_STAGING_PROJECT_ID`.
7. Review rules, indexes, Functions, and the working-tree diff.
8. Only after explicit owner confirmation, deploy with an explicit `--project "$NEXORA_STAGING_PROJECT_ID"`.
9. Run the two-account authentication/social/media/privacy smoke test and record `/healthz`, `/readyz`, request-ID, Functions, Storage, App Check, monitoring, backup, and rollback evidence.

## What is verified versus pending

| Area | Status | Evidence or blocker |
| --- | --- | --- |
| Environment isolation | Verified | Phase 4 resolver tests pass; staging rejects production. |
| Production exclusion | Verified | Local/emulator/staging safeguards and CLI alias validation pass. |
| Firebase CLI authorization | Blocked | No authorized Firebase CLI account. |
| Staging project | Blocked | Owner project ID not supplied. |
| Auth providers/domains | Blocked | Firebase Console access/configuration unavailable. |
| Firestore/Storage | Blocked | Database ID and bucket not supplied. |
| Functions | Blocked | No authorized staging target or deployment evidence. |
| App Check | Blocked | Staging registration/site key/enforcement mode unavailable. |
| Health/readiness | Code present | Cannot verify a deployed staging endpoint. |
| Monitoring/backups/rollback | Blocked | Owner operational configuration and evidence unavailable. |
| Two-account E2E | Blocked | No deployed staging target or disposable accounts. |
| Responsive browser testing | Not run | No staging application URL available; viewport testing is not physical Android-device testing. |

Do not classify staging as active or beta-ready until the blocked items have owner evidence.
