# Nexora staging setup and verification

## Current status

**STAGING BLOCKED — OWNER ACTION REQUIRED.**

The repository now explicitly targets the owner-controlled production project `nexora-prod-voiceharrison`. The checked-in browser configuration is an owner-provided template, and no named database, bucket, provider, or deployment readiness is inferred.

The available environment has no authenticated Firebase CLI session. No Firebase project was created, selected, modified, or deployed by this task.

## Owner action 1: establish project control

1. Sign in to the Google account that owns or administers the intended Firebase project.
2. In Firebase Console, confirm the project ID, billing/plan requirements, project members, and recovery access.
3. Prefer a separate Firebase project for staging. Do not use the current repository target as staging until ownership and isolation are explicitly confirmed.
4. Grant the deployment operator only the least-privileged access required for staging, or perform the deployment commands yourself.
5. Never place passwords, service-account JSON, refresh tokens, or private keys in this repository or chat.

If no staging project exists, create one under the owner-controlled account and record its project ID in the private release record. Do not commit the real staging ID unless the owner intentionally treats it as non-sensitive configuration.

## Owner action 2: create matching staging resources

Configure these resources in the staging project:

- Firebase Web App for the staging frontend.
- Authentication with Email/Password enabled.
- Phone Authentication only if it is intentionally in scope; configure SMS, reCAPTCHA, quotas, billing, and abuse controls first.
- The named Firestore database expected by the staging configuration.
- A staging Storage bucket.
- Cloud Functions in `us-central1` using Node.js 22.
- Staging authorized domains, including the exact HTTPS staging hostname.
- Required Firestore composite indexes from `firestore.indexes.json`.
- App Check registration and a deliberate enforcement decision.
- Non-production secrets for VOH or other optional providers only when those services are intentionally enabled.

Download the staging web-app configuration from Firebase Console and use it in a temporary, uncommitted staging worktree as `firebase-applet-config.json`. Never commit production or staging secrets. The Firebase browser API key is public configuration, but the configuration must still point to the intended staging project.

The checked-in `firebase.json` contains the current named database ID. Before deployment, review whether the staging project uses the same named database ID. If not, update the staging worktree configuration and deployment manifest together, review the diff, and do not merge environment-specific values into `main` without an approved configuration strategy.

## Owner action 3: load and validate staging environment

Copy `.env.staging.example` to a private staging environment file and replace every placeholder:

```sh
cp .env.staging.example .env.staging.local
# Edit .env.staging.local using the owner-controlled values.
set -a
. ./.env.staging.local
set +a
npm run validate:staging
```

`npm run validate:staging` checks target separation and configuration shape only. A successful result does **not** prove Firebase access or deployment.

The validator refuses the canonical production target for staging, rejects local HTTP URLs, requires a non-empty owner-verified named database, and checks that the Storage bucket belongs to the declared staging project.

## Owner action 4: deploy only to staging

Install the pinned CLI through `npx` if the machine does not already have Firebase CLI:

```sh
npx --yes firebase-tools@15.33.0 login
npx --yes firebase-tools@15.33.0 projects:list
npx --yes firebase-tools@15.33.0 use --clear
```

From a clean checkout of the reviewed commit, after loading the private staging environment:

```sh
npm ci --no-audit --no-fund
npm ci --prefix functions --no-audit --no-fund
npm run validate:staging
npm run validate:deployment
npm run security:scan
npm run lint
npm run functions:build
npm run build

# Review the active project and exact deployment files before continuing.
npx --yes firebase-tools@15.33.0 use "$NEXORA_STAGING_PROJECT_ID"
npx --yes firebase-tools@15.33.0 deploy \
  --project "$NEXORA_STAGING_PROJECT_ID" \
  --only firestore:rules,firestore:indexes,storage,functions
```

Do not run these commands against production. Before deployment, verify the CLI project output matches the owner-approved staging ID and that the working tree contains no secrets, generated artifacts, or unintended production changes.

## Owner action 5: real two-account smoke test

Create two non-production staging accounts, `A` and `B`, and record only their test IDs in the private release record. Never use real users' private data.

Record every result as `PASS`, `FAIL`, `BLOCKED`, or `NOT TESTED`:

| Journey | Evidence required | Result |
| --- | --- | --- |
| Register A and B | Auth provider response and user IDs |  |
| Login, refresh, logout, login again | Session restoration and protected-route evidence |  |
| Profile initialization/edit | Owner-scoped profile and public projection |  |
| Publish and view post | A publishes; B sees only permitted content |  |
| Follow/unfollow | Relationship documents and UI state |  |
| Like/comment/feed refresh | Durable state, no duplicate post or interaction |  |
| Private-content denial | B cannot read A-only/private records directly |  |
| Conversation and messages | Both directions, reload, pagination, authorization |  |
| Read/typing/unread state | Evidence-backed states only |  |
| Supported media upload | Type/size/path/access checks |  |
| Notifications | In-app record separately from real push/email |  |
| Account deletion request | Owner request and trusted worker status |  |

Emulator results are not real staging results. Do not mark a row `PASS` based only on emulator execution.

## Owner action 6: operational evidence

Capture, without secrets or private message content:

- Commit SHA and deployment timestamp.
- Staging project ID, named database ID, bucket, Functions region, and hosting URL.
- `/healthz` and `/readyz` responses.
- Deployed Functions list and revision/runtime details.
- Firestore/Storage rules and index deployment output.
- Scheduled Story cleanup execution evidence.
- Auth provider and authorized-domain confirmation.
- App Check mode and test result.
- Backup configuration, retention, restore access, and an isolated restore-drill result.
- Monitoring destination, alert thresholds, and one test alert.
- Two-account smoke-test matrix above.
- Rollback owner and prior known-good artifact.

## Final staging decision

Nexora may be classified **STAGING VERIFIED** only after the owner records successful deployment and real two-account evidence for the required journeys. Until then it remains **STAGING BLOCKED**. Staging success does not by itself authorize a production release; production requires a separate target, approval, backup/rollback evidence, provider configuration, and production smoke test.
