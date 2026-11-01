# NEXORA staging setup and verification

## Phase 4 status

The application is now environment-explicit and fails closed:

- `local` is the default browser mode and must use Auth, Firestore, Storage, and Functions emulators.
- `emulator` is an explicit browser mode for the same four emulators.
- `staging` requires an owner-provided non-production Firebase project and complete browser/server configuration.
- `production` requires explicit production configuration and the canonical production project ID; it is never selected by a staging or local fallback.
- Firebase Admin Functions resolve the project, Firestore database, and Storage bucket centrally. Service-account credentials are never part of frontend configuration.
- The Firebase CLI default alias is local-only. Production requires an explicit `--project` target.

The checked-in Firebase Web configuration remains a public production reference for release validation, but the application does not silently import it as a runtime fallback.

## Local development and emulator safety

Copy `.env.example` to a private local environment file, start the Firebase emulators, and run the app with `NEXORA_ENV=local`. Local server startup requires `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, and `FIREBASE_STORAGE_EMULATOR_HOST`; the browser also routes Functions to port `5001`.

```sh
cp .env.example .env.local
# Load .env.local in the shell or your process manager.
npm run lint
npm run test:unit
```

Do not set local `GCLOUD_PROJECT` or any `VITE_FIREBASE_*` value to `nexora-prod-voiceharrison`. The resolver rejects that target. Emulator mode uses the safe project ID `demo-nexora-local` and synthetic browser configuration.

## Required owner-provided staging settings

Create or select a separate Firebase project under the owner-controlled Google account. Do not use `nexora-prod-voiceharrison` as staging. Record the project ID in the private release record and populate a private copy of `.env.staging.example`.

The staging project must have:

1. A Firebase Web App. Copy its public web configuration into `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_STORAGE_BUCKET`.
2. Authentication providers required by the product, at minimum Email/Password if that is the selected launch path. Enable Phone only if SMS, reCAPTCHA, quotas, billing, and abuse controls are intentionally configured. Add the exact staging HTTPS hostname to Authorized Domains.
3. A Firestore database with the owner-confirmed database ID. Set both `FIRESTORE_DATABASE_ID` and `VITE_FIREBASE_DATABASE_ID` to that ID. Review the repository rules and indexes before any owner-run deployment.
4. A staging Storage bucket belonging to the staging project. Set both `FIREBASE_STORAGE_BUCKET` and `VITE_FIREBASE_STORAGE_BUCKET` to the owner-confirmed bucket name.
5. Cloud Functions in `us-central1` using the repository's Node.js 22 runtime. Functions must receive `NEXORA_ENV=staging`, `NEXORA_STAGING_PROJECT_ID`, `GCLOUD_PROJECT`, the named database ID, and the staging bucket.
6. App Check registration for the staging web app if enforcement is enabled. Set `VITE_FIREBASE_APPCHECK_SITE_KEY` only to the staging reCAPTCHA Enterprise site key. Decide explicitly whether enforcement is monitoring or enforced; do not reuse a production site key without owner confirmation.
7. Non-production values for optional providers such as Gemini. Keep API keys in the server secret manager, never in `VITE_` variables, frontend code, or this repository.

Load the private environment and validate its shape:

```sh
cp .env.staging.example .env.staging.local
# Replace every placeholder with owner-provided values.
set -a
. ./.env.staging.local
set +a
npm run validate:staging
```

A successful validation proves target separation and configuration shape only. It does not prove that the Firebase project exists, that credentials work, or that deployment is authorized.

## Firebase CLI authorization and least privilege

The owner or deployment operator must authenticate the pinned Firebase CLI using an owner-approved Google account, verify the exact staging project ID, and use an explicit `--project "$NEXORA_STAGING_PROJECT_ID"` on any deployment command. Required permissions depend on the chosen deployment scope, but normally include Firebase project access plus permission to manage the selected Firestore rules/indexes, Storage rules, and Cloud Functions. Grant the least privilege needed; do not commit service-account JSON, OAuth refresh tokens, or private keys.

Before any owner-run deployment, use a clean checkout and run `npm run validate:staging`, `npm run security:scan`, `npm run lint`, `npm run functions:build`, and `npm run build`. Review the active CLI project and exact diff. This phase did not deploy anything.

## Verification required before calling staging ready

Run a real two-account staging smoke test using non-production accounts. Verify registration, login/session restoration, profile updates, publishing and feed visibility, follow/like/comment, private-content denial, messaging, unread/read state, supported media upload, notifications, account deletion workflow, App Check behavior, `/healthz`, and `/readyz`. Emulator results are not staging results.

Record the commit SHA, project ID, database ID, bucket, Functions region/runtime, authorized domains, Auth providers, App Check mode, rules/index deployment evidence, monitoring, backups, rollback owner, and the two-account result matrix. Keep private user data and secrets out of the release record.

## What Manus completed vs. what the owner must do

Manus completed the repository-side resolver, fail-closed checks, emulator routing, targeted tests, templates, and documentation. Manus did not create or modify a Firebase project, configure Auth, create a database or bucket, register App Check, authorize the Firebase CLI, provide credentials, deploy rules/functions, or perform real staging smoke tests.

The owner must provide the staging project and Web App values, enable Auth providers and Authorized Domains, confirm the Firestore database ID and Storage bucket, configure App Check, supply secret-manager values, authorize the CLI with least privilege, run the reviewed validation/deployment commands, and record real staging evidence.

Until those owner actions and real smoke tests are complete, the status remains **STAGING BLOCKED**. Phase 5 should cover owner-run staging activation, controlled deployment, observability, rollback evidence, and the two-account verification matrix.
