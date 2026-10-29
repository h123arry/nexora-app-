# Nexora production Firebase migration

## Decision

**PARTIALLY CONFIGURED — owner-supplied Web App values and the confirmed Firestore target are integrated. Read-only Console checks found Email/Password and Google enabled, Phone disabled, RTDB rules deny-all, Storage not set up (Blaze billing required), App Check not configured, and Firestore scheduled backups disabled. Production sign-off is blocked by named-database Public Preview APIs, unverified live Firestore rules/data paths, and the absence of real signup/login and provider-backed tests.**

The repository's canonical Firebase target is `nexora-prod-voiceharrison`. The inaccessible project `evident-server-bqmt3` is no longer an active client, backend, Functions, deployment-alias, or environment target. Historical engineering reports that describe the former project remain unchanged as historical records.

Firebase Console resource metadata was inspected read-only. No project settings, rules, billing, or production data were changed; no documents or files were opened, no data was copied, and no deployment was attempted. Firebase CLI authorization is not available in this environment.

## Changes prepared in this repository

- Added `.firebaserc` aliases `default` and `production`, both explicitly targeting `nexora-prod-voiceharrison`.
- Integrated the owner-supplied Web App ID, browser API key, Auth domain, sender ID, Analytics ID, Storage bucket, and public VAPID key through the existing config and environment-variable names. Set the owner-confirmed Firestore database ID to the literal `default` and recorded its `europe-west1` location.
- Kept the Express server fail-closed in production and added a shared Cloud Functions guard that refuses to assume `(default)` outside the Firestore emulator.
- Synchronized the Firebase messaging service worker with the supplied Web App values.
- Restricted `firebase.json` to the only active, Console-confirmed Firestore database ID `default`; added deployment validation that rejects additional unconfirmed database targets.
- Strengthened `npm run validate:deployment` to require the canonical project, match project-number/app/domain/bucket fields, keep the service worker synchronized, and require the web config and `firebase.json` to target the same verified database.
- Added optional `VITE_FIREBASE_*` browser configuration overrides with a hard fail for unresolved placeholders or unexpected project IDs.
- Added deployment validation that checks the messaging service worker's public Firebase values against the web-app configuration.
- Added a Functions database-target regression test and Auth emulator coverage to the CI workflow; the deployment validator remains a hard-failing gate.
- Fixed Google and phone-auth profile failures to sign out the newly authenticated Firebase user, and fixed onboarding so a failed final profile update cannot enter the app as a successful signup.
- Updated active setup, architecture, deployment, authentication, staging, and launch-gate documentation. Historical security evidence retains the old project identifier for provenance.

## Owner action: verify the registered Firebase web app and Authentication settings

In Firebase Console, open **NEXORA Production** (`nexora-prod-voiceharrison`) using the owner account. Under **Project settings → Your apps**, verify that the intended registered Web app matches the owner-supplied values already integrated in `firebase-applet-config.json` and `public/firebase-messaging-sw.js`. The project overview lists three Web apps; do not register a duplicate if an existing app matches. The app ID/config association has not been independently compared yet.

The owner has confirmed, and Firebase Console lists, Nexora's existing Firestore database ID as `default` in `europe-west1`. The repository uses that exact ID in `firebase-applet-config.json`, the single named-database entry in `firebase.json`, and the environment template. Firebase's special built-in `(default)` is a different database ID; do not substitute it or create another database. [Firebase documentation](https://firebase.google.com/docs/firestore/manage-databases) distinguishes named databases from `(default)`.

The supplied Storage bucket name is present in client configuration, but the Firebase Storage Console currently shows onboarding and requires a Blaze billing account; a live bucket association is not verified. Confirm the intended bucket and Analytics ID before enabling billing or deploying. The deployment validator checks supplied IDs for consistency but cannot prove that a resource exists or that the current app uses it.

The Firebase browser API key is client configuration, not an authorization mechanism. Never add service-account JSON, private keys, refresh tokens, passwords, or other credentials to Git or chat.

The service worker at `public/firebase-messaging-sw.js` must retain the same `projectId`, `appId`, `apiKey`, and `messagingSenderId` values as the Web App config. Keep both copies synchronized. A future build-system improvement may generate the service-worker configuration from one source, but this change intentionally preserves the existing architecture.

## Owner action: verify resources before any deployment

In the target project, record the actual state before changing anything:

1. Authentication: Email/Password and Google are enabled. Phone is disabled. Current authorized domains are `localhost` and the Firebase `firebaseapp.com`/`web.app` domains; add the real app host if a custom domain is used. If Phone Auth remains in the UI, enable the provider only after setting SMS region policy, quotas, test numbers, and reCAPTCHA configuration. Email action links/sender settings and Google OAuth client/domain behavior remain untested.
2. Firestore: Console confirms the active `default` database in `europe-west1`; published rules and indexes were not independently verified. The Console dashboard showed no read/write/realtime-read metrics for the selected last seven days, and scheduled backups are disabled. No collections or documents were opened.
3. Storage: Firebase Storage is not set up in Console and requires a Blaze billing account. No live bucket, object, lifecycle, IAM, or Storage Rules configuration was verified. Do not enable billing or create a bucket without the owner's approval.
4. Functions: enabled APIs, billing/runtime support, Node.js 22 support, `us-central1` region, service accounts, schedules, and server-side environment values.
5. App Check: Console shows the `Get started` onboarding state; no app registration or enforcement configuration is visible. Register a Web provider and decide on staged enforcement after confirming the production host.
6. External providers: FCM/VAPID, Gemini/VOH, email, SMS, payment, monitoring, and backup/export configuration. Unconfigured providers must remain disabled rather than simulated.

Firebase Console confirms the Realtime Database URL `https://nexora-prod-voiceharrison-default-rtdb.europe-west1.firebasedatabase.app` and Belgium (`europe-west1`) location. Its live rules are `.read: false` and `.write: false`. The repository has no Realtime Database SDK use, rules file, or Firebase CLI deployment target; no feature currently reads or writes RTDB, so no `databaseURL` was added.

Preserve any existing data and review the diff of rules and indexes before deployment. Do not deploy broad or temporary allow rules.

## Owner action: install verified values and run checks

From a clean checkout of the reviewed commit:

```sh
# Use an owner-controlled private worktree or environment file for the real values.
cp .env.example .env.local
# Replace the remaining Firestore database-ID placeholders only after Console verification.

npm ci --no-audit --no-fund
npm ci --prefix functions --no-audit --no-fund
npm run validate:deployment
npm run lint
npm run functions:build
npm run test:auth
npm run test:unit
npm run test:engagement
npm run test:migration
npm run test:rules
npm run test:storage
npm run test:voh-security
npm run security:scan
npm run build
git diff --check
```

The validator is intentionally fail-closed while the database ID is unconfirmed. Do not weaken it or guess a value to make CI green. The emulator suites use demo project IDs and do not touch production; passing them is not live-project evidence. Never commit private environment files or server credentials.

## Owner action: inspect, then deploy explicitly

After authenticating the Firebase CLI and confirming the CLI output is the exact target:

```sh
npx --yes firebase-tools@15.33.0 login
npx --yes firebase-tools@15.33.0 projects:list
npx --yes firebase-tools@15.33.0 use --clear
npx --yes firebase-tools@15.33.0 use nexora-prod-voiceharrison
npx --yes firebase-tools@15.33.0 deploy --project nexora-prod-voiceharrison \
  --only firestore:rules,firestore:indexes,storage,functions
```

Before the deploy command, verify the named database in `firebase.json`, the web config, `FIRESTORE_DATABASE_ID`, and `FIREBASE_STORAGE_BUCKET` all describe the same owner-verified resources. If the project uses a different database or bucket, update the private deployment worktree and review it before proceeding. Do not run an unrestricted `firebase deploy`.

Record deployment output, commit SHA, project ID, database ID, bucket, Functions region/runtime, deployed function list, index state, and rollback owner. No deployment is considered successful without this evidence.

## Required live verification

Using two non-production test accounts in the owner-controlled project, verify signup, email/password login, Google login if in scope, duplicate and invalid credential handling, email verification, password reset, logout, session restoration, profile creation/editing, feed access, follow/unfollow, private-content denial, messaging, media upload/retrieval, notifications, Functions, scheduled jobs, and denied Firestore/Storage paths.

Emulator tests are not live-project evidence. Do not mark any live journey as passed until the target project, account IDs, timestamps, and relevant logs or responses are recorded without including private user data.

## Current evidence and risks

- Firebase Console: **owner-authenticated; read-only project/resource metadata inspected**. No user documents/files were opened and no production settings or data were changed.
- Firebase CLI authorization: **not available in this environment**.
- Firestore database ID `default` and location `europe-west1`: **owner-confirmed and visible in Console as the sole active database**. No document reads/writes or deployments were performed; published Firestore rules remain unverified.
- The Firebase JS and Admin SDK named-database overloads used by the current app are documented as **Public Preview** and explicitly not recommended for production. The supported Google Cloud Node client has a named-database setting, but a backend-only replacement would leave the browser preview dependency; owner architecture decision required before release. See the [JS SDK reference](https://firebase.google.com/docs/reference/js/firestore_), [Admin SDK reference](https://firebase.google.com/docs/reference/admin/node/firebase-admin.firestore), and [Google Cloud Node client settings](https://docs.cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/settings).
- Authentication: **Email/Password and Google enabled; Phone disabled; only `localhost` and Firebase-hosted domains listed**. Real signup/login has not been tested.
- Storage: **not set up; Console requires Blaze billing**. App Check: **not configured**. Firestore scheduled backups: **disabled**. RTDB: **URL/location confirmed; live rules deny all access; no app code uses it**.
- Existing Firestore data: **not inspected**. The Console dashboard showed no read/write/realtime-read metrics for the selected last seven days; this is not proof that the database is empty.
- Production Firestore/Storage rules, indexes, Functions deployment/environment, IAM, schedules, FCM, Gemini/VOH, payment, and live media/message persistence: **not verified**. Emulator coverage does not establish production behavior.
- The old project was not modified, accessed, or used as a migration source.
