# Nexora production Firebase migration

## Decision

**PARTIALLY CONFIGURED — deployment and live verification are blocked pending owner-provided Firebase configuration and authenticated access.**

The repository's canonical Firebase target is `nexora-prod-voiceharrison`. The inaccessible project `evident-server-bqmt3` is no longer an active client, backend, Functions, deployment-alias, or environment target. Historical engineering reports that describe the former project remain unchanged as historical records.

No Firebase project was modified, no data was copied, and no deployment was attempted because this environment has no authorized Firebase CLI account.

## Changes prepared in this repository

- Added `.firebaserc` aliases `default` and `production`, both explicitly targeting `nexora-prod-voiceharrison`.
- Replaced the active checked-in web configuration with an owner-provided template whose only fixed project value is the confirmed project ID. App ID, API key, Auth domain, messaging sender ID, named Firestore database ID, and Storage bucket are not guessed.
- Updated the server and Cloud Functions fallbacks so they cannot silently use the inaccessible project. Production still requires environment-provided configuration; local fallback uses the explicit `(default)` Firestore database only where the existing local architecture needs one.
- Updated the Firebase messaging service worker target template.
- Replaced the active named-database deployment entry with an explicit owner-verified placeholder rather than silently deploying to an arbitrary database.
- Strengthened `npm run validate:deployment` to require the canonical aliases and to fail while the owner-provided web configuration remains incomplete.
- Added optional `VITE_FIREBASE_*` browser configuration overrides with a hard fail for unresolved placeholders or unexpected project IDs.
- Added deployment validation that checks the messaging service worker's public Firebase values against the web-app configuration.
- Fixed Google and phone-auth profile failures to sign out the newly authenticated Firebase user, and fixed onboarding so a failed final profile update cannot enter the app as a successful signup.
- Updated active setup, architecture, deployment, authentication, staging, and launch-gate documentation. Historical security evidence retains the old project identifier for provenance.

## Owner action: register or retrieve the Firebase web app

In Firebase Console, open **NEXORA Production** (`nexora-prod-voiceharrison`) using the owner account. Under **Project settings → Your apps**, select the existing Web app if one already represents NEXORA. Otherwise select **Add app → Web**, register the app, and copy the Firebase SDK configuration.

Fill the corresponding fields in a private working copy of `firebase-applet-config.json`:

- `projectId` must remain `nexora-prod-voiceharrison`.
- `appId`, `apiKey`, `authDomain`, and `messagingSenderId` must come from the registered web app.
- `firestoreDatabaseId` must be the actual database used by the application. Do not substitute a newly created or guessed ID.
- `storageBucket` must be the actual bucket configured for this project. Do not infer it from naming conventions.
- Keep `measurementId` empty unless Analytics is deliberately enabled and its value is supplied by Firebase.

The Firebase browser API key is client configuration, not an authorization mechanism. Never add service-account JSON, private keys, refresh tokens, passwords, or other credentials to Git or chat.

The service worker at `public/firebase-messaging-sw.js` must receive the same `projectId`, `appId`, `apiKey`, and `messagingSenderId` values. Keep both copies synchronized. A future build-system improvement may generate the service-worker configuration from one source, but this migration intentionally preserves the existing architecture.

## Owner action: verify resources before any deployment

In the target project, record the actual state before changing anything:

1. Authentication: Email/Password and Google providers, authorized domains, email action links, sender settings, quotas, and OAuth consent configuration.
2. Firestore: the actual database ID, existing document/data presence, database location, current rules, indexes, and any required composite-index build state.
3. Storage: the actual bucket, existing object presence, lifecycle/retention settings, IAM, and current Storage Rules.
4. Functions: enabled APIs, billing/runtime support, Node.js 22 support, `us-central1` region, service accounts, schedules, and server-side environment values.
5. App Check: registered web app/site key, enforcement mode, and whether the production domain is authorized.
6. External providers: FCM/VAPID, Gemini/VOH, email, SMS, payment, monitoring, and backup/export configuration. Unconfigured providers must remain disabled rather than simulated.

Preserve any existing data and review the diff of rules and indexes before deployment. Do not deploy broad or temporary allow rules.

## Owner action: install verified values and run checks

From a clean checkout of the reviewed commit:

```sh
# Use an owner-controlled private worktree or environment file for the real values.
cp .env.example .env.local
# Replace every <owner-verified-...> and <owner-provided-...> value.

npm ci --no-audit --no-fund
npm ci --prefix functions --no-audit --no-fund
npm run validate:deployment
npm run lint
npm run functions:build
npm run test:auth
npm run test:unit
npm run test:rules
npm run test:storage
npm run security:scan
npm run build
git diff --check
```

The validator is intentionally fail-closed while placeholders remain. Do not weaken it to make CI green; install the real owner-provided configuration in the approved deployment environment instead. The private configuration file must not be committed.

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

- Firebase CLI authorization: **not available in this environment**.
- Target-project resource state: **not inspected**.
- Existing data in `nexora-prod-voiceharrison`: **unknown; preserve and inspect before deployment**.
- Authentication: only existing emulator coverage can be relied upon until real target-project accounts are tested.
- Rules/indexes/Storage/Functions/App Check/IAM/schedules/backups: source is present, live state is unverified.
- The old project was not modified, accessed, or used as a migration source.
