# Objective 1 — Release architecture and staging boundary

This runbook records the release architecture and the exact owner-operated actions still required. It separates repository validation from remote Firebase provisioning.

## 1. Native distribution decision

NEXORA will retain its existing React 19 + Vite + TypeScript application and use Ionic Capacitor for Android and iOS packaging. See [ADR 0001](./adr/0001-native-mobile-packaging-capacitor.md).

The decision does not claim that native projects or store builds already exist. Before adding Capacitor packages, audit relative API calls, OAuth redirects, service-worker assumptions, uploads, camera/microphone, push, downloads, and deep links. Then install compatible Capacitor packages using npm and commit the generated platform source projects without signing secrets.

## 2. Environment contract

| Environment | Web mode | Firebase target | Emulator use |
|---|---|---|---|
| Local | local | demo-nexora-local | Required |
| Emulator | emulator | demo project | Required |
| Staging | staging | Owner-created staging project | Forbidden |
| Production | production | nexora-prod-voiceharrison | Forbidden |

Staging must use the same non-production Firebase project ID in `NEXORA_STAGING_PROJECT_ID`, `GCLOUD_PROJECT`, and `VITE_FIREBASE_PROJECT_ID`. Server and browser Firestore database IDs and Storage buckets must match. The Auth domain must belong to the staging project, and the Web App ID must match the configured messaging sender ID.

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
- [ ] Capacitor packages and config integrated.
- [ ] Android and iOS projects generated and committed.
- [ ] API-origin and native compatibility audit completed.
- [ ] Owner creates and provisions the staging Firebase project.
- [ ] Staging resources deployed and live two-account smoke test passed.
- [ ] Backup restore and monitoring evidence recorded.

## 6. Current honest status

Repository-side preparation is in progress. Staging is **not provisioned** until the owner creates the Firebase project and the live checks pass. The production Firebase project is not modified by this runbook.
