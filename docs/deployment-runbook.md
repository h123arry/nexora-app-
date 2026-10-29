# Nexora deployment and rollback runbook

## Release classification

A repository commit is not a deployment. The release operator must record the exact commit, target Firebase project, named database, Storage bucket, Functions region, hosting target, operator, change window, and rollback owner before proceeding. Production deployment requires authorized credentials and human approval; none are assumed by this repository.

## Pre-release verification

For staging setup, first follow [`staging-setup-and-verification.md`](staging-setup-and-verification.md). The repository does not assume that the checked-in Firebase target is owner-controlled or suitable for staging. Load an owner-provided non-production environment and run `npm run validate:staging` before any Firebase CLI command.

From a clean checkout of the intended commit, use Node.js 22 and the lockfiles:

```sh
npm ci --no-audit --no-fund
npm ci --prefix functions --no-audit --no-fund
npm run validate:deployment
npm run security:scan
npm run lint
npm run functions:build
npm run test:unit
npm run test:rules
npm run test:storage
npm run test:migration
npm run test:engagement
npm run test:voh-security
npm audit --omit=dev --audit-level=high
npm --prefix functions audit --omit=dev --audit-level=high
npm run build
```

The migration test is not production migration approval. It proves the guarded tool behavior only. Review `git diff`, confirm no secrets or generated artifacts are present, and retain the build artifact checksum in the release record.

## Configuration validation

Set production-only server configuration in the hosting secret/environment manager, not in Git:

```text
NODE_ENV=production
RELEASE_VERSION=<immutable commit or release identifier>
GCLOUD_PROJECT=<verified Firebase project ID>
FIRESTORE_DATABASE_ID=default
FIREBASE_STORAGE_BUCKET=<verified bucket>
PORT=<host supplied port, if required>
```

Set `GEMINI_API_KEY` only if VOH is intentionally enabled, and store it as a server-side secret. `VITE_FIREBASE_APPCHECK_SITE_KEY` and `VITE_FIREBASE_VAPID_KEY` are public browser configuration and require provider/domain registration. Production startup now fails when the target project, database, bucket, or release identifier is missing. Optional providers remain unavailable rather than silently falling back.

## Controlled deployment order

1. Confirm an authorized backup/export exists and that restoration access was tested.
2. Confirm the staging project uses the intended Auth providers, named Firestore database, Storage bucket, Functions identity, indexes, App Check policy, and authorized domains.
3. Deploy and verify Firestore indexes for the intended database. Do not deploy broad allow rules.
4. Deploy reviewed Firestore rules and Storage rules. Verify allowed and denied staging reads/writes.
5. Deploy Functions with Node.js 22, the intended region, named database, bucket, and secret configuration.
6. Deploy the frontend/Express artifact only after backend compatibility and required indexes are ready.
7. Smoke-test authentication, profile ownership, public feed visibility, private data denial, chat membership, private audio upload/playback, media access, account deletion request, admin denial, and trusted like/engagement behavior using non-production accounts.
8. Check `/healthz`, `/readyz`, structured request logs, Firebase Functions logs, Firestore permission failures, Storage failures, index state, quota errors, and billing signals.
9. Expand traffic only after the staging/production evidence is recorded and the release owner approves.

The legacy public-post audience migration is a separate guarded operation. Use a reviewed manifest, dry-run first, backup, second-person review, and the documented `--confirm-production` guard. Never run it merely because the application deploy succeeded.

## Rollback

Frontend/Express rollback means restoring the prior known-good artifact and release configuration. Functions rollback means deploying the prior compatible Functions version and restoring its environment configuration. Firestore and Storage rules rollback means redeploying the last reviewed source-controlled ruleset; never use an allow-all emergency ruleset. Index changes should be reviewed before removal because deleting a serving index can break queries.

Do not automatically reverse Firestore data changes. Audience migration, account deletion, moderation, and financial-state changes require a separately reviewed recovery procedure using a verified backup or narrowly scoped script. If frontend and backend versions are not schema-compatible, roll back them together or deploy a backward-compatible bridge first.

## Post-release evidence

Record commit, artifact digest, target identifiers, deploy timestamps, test account IDs (non-production only), health/readiness responses, smoke-test results, error/permission rates, and approval. A missing staging test, unavailable provider, missing backup, or unverified target is a release blocker, not a successful deployment.
