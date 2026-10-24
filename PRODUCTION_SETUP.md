# Nexora production setup and verification checklist

This file describes the repository's current configuration. It does **not** certify that any Firebase provider, rule, function, email extension, push certificate, or hosting service is enabled in production. Repository state is not deployed state.

For the complete handover, use [`docs/production-architecture.md`](docs/production-architecture.md), [`docs/deployment-runbook.md`](docs/deployment-runbook.md), [`docs/security-review.md`](docs/security-review.md), [`docs/operations-and-recovery.md`](docs/operations-and-recovery.md), and [`docs/production-readiness.md`](docs/production-readiness.md). The current release classification is staging verification, not production readiness.

## Configured Firebase resources

The checked-in client config points to Firebase project `evident-server-bqmt3`, named Firestore database `ai-studio-nexora-29627584-4036-4cc0-b743-61fab6f219f8`, and Storage bucket `evident-server-bqmt3.firebasestorage.app`. These values must be confirmed with the project owner before deployment. The `apiKey` in Firebase web config is a public client identifier; do not add service-account keys or other secrets to the repository.

The server and Cloud Functions use Firebase Admin credentials from the hosting environment's Application Default Credentials. Set and verify:

| Variable | Purpose |
|---|---|
| `GCLOUD_PROJECT` or `FIREBASE_PROJECT_ID` | Firebase/GCP project ID used by the Express API. |
| `FIRESTORE_DATABASE_ID` | Actual named Firestore database; required in production and defaulted only for local development. |
| `FIREBASE_STORAGE_BUCKET` | Actual Firebase Storage bucket used by the private chat-media proxy and account cleanup. |
| `GEMINI_API_KEY` | Server-only Gemini credential required for VOH generation; keep in the hosting secret manager. |
| `GEMINI_MODEL` | Optional server model override; default is `gemini-2.5-flash`. |
| `PORT` | Optional Express listening port; the host normally supplies it. |

Cloud Functions use the Node.js 22 runtime configured in `firebase.json`. Verify the target platform's supported runtime, region, service identity, Firestore access to the named database, and Storage permissions. Do not use a development service-account file in production.

## Authentication and account operations

The source contains email/password registration and sign-in, Google popup sign-in, and phone verification methods. Enabling any provider, configuring authorized domains, reCAPTCHA, quotas, test numbers, and production phone/SMS billing is a separate Firebase Console action and was not verified here. This login form's email/password fields only support that identifier path; it should not imply that username is accepted as an email alias.

Firebase's native account-protection controls and provider rate limits must be reviewed for the real project. Do not treat a browser-local failed-attempt counter as a backend brute-force defense. App Check is initialized only when a site key is injected into `globalThis.__NEXORA_APPCHECK_SITE_KEY__`; enabling App Check enforcement requires a separately tested release.

## Backend and private media

Run the production API as the same Express application that serves the built frontend, or deliberately route `/api/voh-ai/*` and `/api/private-chat-media/*` to the authenticated API service. VOH and private chat-media routes require Firebase ID tokens. VOH also requires the server-only Gemini key. Chat voice upload/playback requires server access to the configured Firestore database and private Storage bucket; Storage Rules deliberately deny direct client access to `chats/**`. Playback checks that the caller is still a chat participant and that a message refers to the object, then responds with `Cache-Control: private, no-store`. Do not replace this with a public download-token URL.

The integration tests cover this HTTP boundary in demo emulators, not the production account, named database, bucket, IAM role, network routing, or Cloud Run/server environment. Verify those in a staging project before release.

## Firebase deployment

Rules and indexes live in `firestore.rules`, `storage.rules`, and `firestore.indexes.json`. The `firebase.json` configuration includes both `(default)` and the configured named database. The Firebase Emulator currently warns that it does not model multiple Firestore databases; tests explicitly load the rules into the emulator test environment. Validate named-database rule deployment and queries in a non-production Firebase project before any production rollout.

Before a release:

1. Confirm the Firebase project, database ID, bucket, service identity, operator, backups, and deployment window.
2. Run `npm ci`, `npm ci --prefix functions`, `npm run lint`, `npm run functions:build`, and `npm run build`.
3. Run `npm run test:unit`, `npm run test:rules`, `npm run test:storage`, `npm run test:migration`, `npm run test:engagement`, and `npm run test:voh-security`.
4. Run `npm audit` and `npm audit --prefix functions --omit=dev` against the final lockfiles.
5. Deploy indexes and reviewed Firestore rules for the intended database(s), then Storage rules and Functions. Verify index readiness before app rollout.
6. Smoke-test both allowed and denied user paths in staging: public-only feeds, account/profile privacy, post likes/notifications, chat access and audio proxy, unauthenticated VOH rejection, and account deletion.
7. Observe Firebase permission denials, API/function errors, index state, storage failures, quotas, and billing before expanding rollout.

Legacy posts with missing audience are not automatically treated as public. See [`docs/FIREBASE_DEPLOYMENT_RUNBOOK.md`](docs/FIREBASE_DEPLOYMENT_RUNBOOK.md) for the reviewed-manifest, dry-run-first migration procedure and rollback guidance. Do not apply that migration or deploy rules without explicit project-owner approval and a reviewed backup.

## Integrations not verified or not implemented

- No deployment was performed; production Firebase configuration, provider activation, rules, indexes, and IAM remain unverified.
- Client-side writes to the `mail` collection are disabled. Native Firebase Auth verification/reset email is supported; trusted transactional/security email still requires a server-side provider.
- FCM/VAPID credentials and push delivery were not verified.
- No trusted NEX ledger, payment processor, transfer, deposit, withdrawal, or payout backend exists. Keep financial operations unavailable.
- No complete private audience model exists for followers, Close Friends, Circles, or member-only communities; publishing UI/rules remain public-only for shared posts.
- VOH remains unavailable if `GEMINI_API_KEY` is not configured. Errors should remain truthful; do not show demo output as a real model response.
- MFA, trusted-device management, production abuse controls, App Check enforcement, monitoring/alerting, retention/TTL configuration, and provider-specific compliance have not been verified.

See [`SECURITY_HARDENING_REPORT.md`](SECURITY_HARDENING_REPORT.md) for the implementation and test record. A successful local build or emulator suite is not a production readiness certificate.
