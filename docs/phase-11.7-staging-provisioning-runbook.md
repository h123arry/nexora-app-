# Phase 11.7 — Firebase staging provisioning runbook

**Status: NOT PROVISIONED.** This document is an owner-operated setup and verification checklist. It does not claim that a Firebase project, Functions deployment, Storage bucket, ruleset, or App Check enforcement has been created.

## 1. Create an isolated Firebase project

- Create a new Firebase project dedicated to NEXORA staging.
- Do not use `nexora-prod-voiceharrison`, the production project, or the production Firestore database.
- Record the new project ID as `NEXORA_STAGING_PROJECT_ID`.
- Register a separate Web app and obtain its Web App ID, Firebase API key, auth domain, messaging sender ID, and Storage bucket.
- Create the staging Firestore database in the intended region and record the exact database ID.
- Create/enable Firebase Storage for the staging project.
- Add a staging hosting domain and add it to Firebase Authentication's authorized domains.

## 2. Configure the repository

Copy `.env.staging.example` into the staging deployment environment. Do not commit the real environment file.

Required values include:
- `NEXORA_ENV=staging`
- `VITE_NEXORA_ENV=staging`
- `NEXORA_STAGING_PROJECT_ID` and `VITE_FIREBASE_PROJECT_ID` set to the new staging project ID
- Staging-only Web App ID, API key, auth domain, database ID, Storage bucket and messaging sender ID
- `VITE_FIREBASE_APPCHECK_SITE_KEY` for the staging app
- `VITE_NEXORA_PHONE_AUTH_ENABLED=false` until the Phone Auth acceptance tests pass

The validator checks required values and prevents staging from targeting the production project. It cannot verify that a project exists or that remote resources are deployed.

## 3. Deploy backend resources to staging only

- Confirm the Firebase CLI project alias points to the staging project before any deploy.
- Deploy Firestore rules and indexes.
- Deploy Storage rules.
- Deploy Cloud Functions from the trusted Functions build.
- Confirm Functions use the staging project and staging Firestore database.
- Confirm Storage uploads and downloads work only under the intended authenticated rules.
- Run the repository's staging configuration validator and full emulator CI suite before connecting a browser build.

Do not run a production deploy as a shortcut. Do not point local/emulator builds at production.

## 4. App Check

- Register the staging Web app with reCAPTCHA Enterprise in Firebase App Check.
- Configure the site key in `VITE_FIREBASE_APPCHECK_SITE_KEY`.
- Confirm the staging build initializes App Check and obtains valid attestation tokens.
- Observe metrics, then enforce App Check for the staging Firestore, Storage and callable Functions resources that support it.
- Verify requests without valid attestation are rejected after enforcement.
- Capture Console evidence for each enforced product.

A client-side site key is not proof of enforcement. Console-side enforcement must be checked directly.

## 5. Phone Auth

- Enable the Phone provider in staging only.
- Configure authorized domains, reCAPTCHA and SMS region policy.
- Confirm the +234 route, SMS quota and billing limits.
- Use Firebase fictional test phone numbers for repeatable testing; use real SMS only with authorized testers.
- Keep `VITE_NEXORA_PHONE_AUTH_ENABLED=false` until all tests in `docs/phone-auth-staging-verification.md` pass.
- The current Phone flow is sign-in/sign-up, not phone-based password recovery.

## 6. Two-account smoke test on mobile

Create two separate staging accounts and use phone-sized screens:

1. Register both accounts and verify their profiles are isolated.
2. Account A publishes a public post; Account B sees it in the feed.
3. B likes/sparks the post; verify the server counter and A's notification update once.
4. B comments; A sees the comment and notification.
5. B follows A; verify both relationship views update.
6. B blocks A; verify the saved settings and confirm prohibited messaging/feed interactions are rejected.
7. B reports A; verify a durable moderation report exists and the UI only confirms success after the callable accepts it.
8. Unblock A and verify the intended access is restored.
9. Sign out and back in on both accounts; confirm state persists across reloads and devices.

Record project ID, app build commit, device/browser, test account aliases (never passwords/OTP codes), timestamps, and pass/fail evidence.

## 7. Exit criteria

Staging remains **NOT READY** until all of the following have evidence:
- Separate project and separate Web app confirmed.
- Correct Firestore database and Storage bucket confirmed.
- Firestore/Storage rules and Functions deployed to staging.
- Staging environment validator passes.
- App Check initialization and Console enforcement confirmed.
- Phone Auth SMS quotas and delivery verified, or Phone Auth remains hidden.
- Two-account mobile smoke tests pass.
- No real payments or production user data are used in these tests.

Only after these checks should the controlled-beta readiness document be updated.

## 8. Express API and React hosting on Cloud Run

The existing `server.ts` Express process is the API host for private chat voice media and VOH, and it serves the production-built React assets. The repository now includes a Node.js 22 multi-stage `Dockerfile` and a protected staging deployment workflow.

The workflow deploys:
1. Firestore rules/indexes, Storage rules, and Cloud Functions to the isolated Firebase project.
2. A versioned container image to Artifact Registry in `europe-west1`.
3. The Express/React service as Cloud Run service `nexora-api-staging`, using a dedicated runtime service account.
4. A staging URL returned by Cloud Run, followed by configuration validation and `/healthz` plus `/readyz` checks.

Cloud Run runtime configuration uses `NEXORA_ENV=staging`, `NODE_ENV=production`, `RELEASE_VERSION`, `GCLOUD_PROJECT`, `NEXORA_STAGING_PROJECT_ID`, `FIRESTORE_DATABASE_ID`, and `FIREBASE_STORAGE_BUCKET`. The runtime service account must have least-privilege access to the staging Firestore database and Storage bucket. Do not attach a project Owner identity.

Add the GitHub Environment variable `GCP_STAGING_RUNTIME_SERVICE_ACCOUNT` containing the runtime service-account email. Enable Cloud Run and Artifact Registry APIs and grant the WIF deployer permission to push images, deploy Cloud Run, and attach the runtime service account.

The Cloud Run web build keeps `VITE_API_BASE_URL` empty so browser requests remain same-origin. After deployment, the Cloud Run service URL is printed in the workflow summary. Copy it into `VITE_API_BASE_URL` for native staging builds. The Express API permits same-origin traffic and the two Capacitor origins (`capacitor://localhost` and `https://localhost`) while retaining Firebase ID-token authorization.

**This workflow is a deploy mechanism, not proof of provisioning.** Staging is still NOT PROVISIONED until the owner creates the project/resources, configures WIF and runtime IAM, and the workflow's readiness checks pass.

## 9. Private media processing and Eventarc

The staging workflow also builds the locked `services/media-worker` image and deploys `nexora-media-worker` to Cloud Run with private ingress and authenticated invocation only. The service runs the Functions Framework `processMedia` HTTP target with FFmpeg and Sharp; concurrency is one job per instance, with a 4 GiB memory allocation, 2 vCPU, 900-second timeout, and a maximum of three instances.

It creates `nexora-media-staging-finalized` for `google.cloud.storage.object.v1.finalized` events on the staging bucket. Set `MEDIA_BUCKET_LOCATION` to the bucket's exact region or multi-region. Eventarc trigger location must match the bucket; the destination Cloud Run service remains in `europe-west1`. Eventarc trigger event filters cannot be changed after creation, so changing the source bucket/location requires a controlled trigger replacement.

Add these GitHub Environment variables:
- `MEDIA_BUCKET_LOCATION`
- `GCP_STAGING_MEDIA_RUNTIME_SERVICE_ACCOUNT`
- `GCP_STAGING_EVENTARC_SERVICE_ACCOUNT`

Grant the media runtime service account only the Firestore permissions and bucket-scoped object read/create permissions needed to read original media and write `processed/**`. Grant the Eventarc trigger identity `roles/eventarc.eventReceiver` and `roles/run.invoker` on the worker. Grant the Cloud Storage service agent `roles/pubsub.publisher` so the direct Storage event can be delivered. The deployer identity must be able to create the trigger and attach the selected service accounts.

After deployment, upload a short video through the staging app and verify the event reaches the private worker, the `mediaAssets` document reaches `ready`, expected poster/MP4/HLS objects exist, duplicate events do not overwrite a completed asset, and a second authenticated account can play the media through the app's authorized delivery path. Do not make the source bucket public. CDN signing configuration is a separate optional staging setting and must use Secret Manager.
