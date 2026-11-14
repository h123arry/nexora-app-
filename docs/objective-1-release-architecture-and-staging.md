# Objective 1 — Release architecture and staging boundary

This runbook records the release architecture and the exact owner-operated actions still required. It separates repository validation from remote Firebase provisioning.

## 1. Native distribution decision

NEXORA will retain its existing React 19 + Vite + TypeScript application and use Ionic Capacitor for Android and iOS packaging. See [ADR 0001](./adr/0001-native-mobile-packaging-capacitor.md).

The repository now declares Capacitor 8.6.x dependencies, a `capacitor.config.ts`, native build scripts, and a secure API-origin adapter. A one-time macOS workflow regenerates the lockfile, creates Android/iOS projects, syncs the existing web build, and compiles unsigned platform shells. Its final CI result and generated commits are the acceptance evidence. No remote development server URL is configured in release builds.

## 2. Environment contract

| Environment | Web mode | Firebase target | Emulator use |
|---|---|---|---|
| Local | local | demo-nexora-local | Required |
| Emulator | emulator | demo project | Required |
| Staging | staging | Owner-created staging project | Forbidden |
| Production | production | nexora-prod-voiceharrison | Forbidden |

Native builds must set `VITE_API_BASE_URL` to the environment's HTTPS API origin. The staging validator requires this value and rejects HTTP, local, credential-bearing, query-bearing, and fragment-bearing URLs. Staging must use the same non-production Firebase project ID in `NEXORA_STAGING_PROJECT_ID`, `GCLOUD_PROJECT`, and `VITE_FIREBASE_PROJECT_ID`. Server and browser Firestore database IDs and Storage buckets must match. The Auth domain must belong to the staging project, and the Web App ID must match the configured messaging sender ID.

The staging validator checks these relationships, requires HTTPS, App Check site-key configuration, and refuses emulator variables or the production project. It validates configuration shape only; it cannot prove remote resources or Firebase Console settings.

## 3. Owner-operated staging provisioning

The repository currently has no verified staging Firebase project. The project owner must:

1. Create a dedicated Firebase project for staging. Never reuse the production project.
2. Register a separate Firebase Web App.
3. Create the intended Firestore database and Storage bucket.
4. Enable only the authentication providers intended for the staging test.
5. Configure authorized domains, App Check, quotas, IAM, and required APIs.
6. Create an HTTPS staging hosting/API origin.
7. Populate the hosting secret/environment manager from `.env.staging.example`; do not commit real values.
8. Deploy Firestore rules, indexes, Storage rules, and Functions from the same reviewed commit.
9. Configure scheduled exports, retention, restore access, monitoring, alert ownership, and rollback owner.
10. Run the staging validator and record the project ID, database ID, bucket, hosting URL, release SHA, and timestamps. Never record secrets or personal test-account data in the evidence.

Run:

```bash
npm run validate:staging
npm run test:staging-config
```

## 4. Production protection

- `.firebaserc` default remains the local demo project.
- Production deployments require an explicit production target and owner-approved change window.
- Staging validation refuses the production project.
- Local/emulator configuration refuses the production project and requires emulator routing.
- Never use production credentials for local development or staging tests.

## 5. Acceptance criteria

- [x] Capacitor selected as the native packaging architecture.
- [x] Architecture decision and migration sequence documented.
- [x] Staging configuration contract documented.
- [x] Staging validator checks server/browser project, database, bucket, Auth domain, App ID/sender, HTTPS origin, and emulator isolation.
- [x] Capacitor packages and config declared in the existing app.
- [ ] Lockfile regenerated and verified by `npm ci`.
- [ ] Android and iOS projects generated, committed, and compiled by CI.
- [x] API-origin adapter added for native private-media requests.
- [x] PWA service-worker registration guarded from native builds.
- [x] Web Push prevented from being treated as native push.
- [x] Native Google popup sign-in fails clearly until OAuth adapter exists.
- [ ] Owner creates and provisions the staging Firebase project.
- [ ] Staging resources deployed and live two-account smoke test passed.
- [ ] Backup restore and monitoring evidence recorded.

## 6. Current honest status

Repository-side preparation is in progress. Staging is **not provisioned** until the owner creates the Firebase project and the live checks pass. The production Firebase project is not modified by this runbook.

## 7. Native build and store boundaries

- Capacitor bundle ID currently proposed as `com.voiceofharrison.nexora`; owner must verify and confirm it before creating store listings or Firebase native app registrations.
- Native builds use the matching environment's `VITE_API_BASE_URL` and Firebase public Web App configuration. Do not package the local emulator environment for distribution.
- Android debug compilation and iOS simulator compilation do not create signed store artifacts.
- Android release signing requires a protected keystore and passwords in the CI secret store; the keystore must never be committed.
- iOS distribution requires an Apple Developer Team, App Store Connect app record, signing certificate, provisioning profile, and protected signing secrets.
- Physical Android/iOS acceptance remains mandatory for login, OAuth, OTP, uploads, camera, microphone, notifications, deep links, background/resume, and payment journeys.
