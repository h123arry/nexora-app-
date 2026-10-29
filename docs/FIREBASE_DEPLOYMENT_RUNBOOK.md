# Nexora Firebase rollout and legacy-post migration runbook

## Current deployment boundary

Repository state is not the deployed state. Do not deploy these rules or run this migration against production until the target project, owner approval, current backups, test results, and application compatibility have been checked. The migration is deliberately opt-in. This task inspected Console resource metadata read-only; no production documents/files were opened, and no data, rules, billing, project settings, or deployments were changed.

The canonical production target is project `nexora-prod-voiceharrison`. Firebase Console confirms the sole active Firestore database ID is the literal `default` in `europe-west1`; `firebase.json` now targets only that database, distinct from Firestore's built-in `(default)`. Keep `default` exactly in `firebase-applet-config.json`, `firebase.json`, and `FIRESTORE_DATABASE_ID`/`VITE_FIREBASE_DATABASE_ID`. The source config contains the owner-supplied Storage bucket name, but Firebase Console currently shows Storage onboarding that requires Blaze billing; no production bucket association is verified. The checked-in `.firebaserc` explicitly targets the canonical project, and deployment commands must still pass the project ID explicitly. `server.ts` and Cloud Functions need `GCLOUD_PROJECT`, `FIRESTORE_DATABASE_ID`, and `FIREBASE_STORAGE_BUCKET` set to verified resources. The Firestore Emulator does not model multiple databases. The rule suites install the source rules explicitly, but that is not proof of production named-database deployment. Validate the configured named database in a non-production Firebase project before rollout.

Firebase Console confirms the Realtime Database URL `https://nexora-prod-voiceharrison-default-rtdb.europe-west1.firebasedatabase.app` and its Belgium (`europe-west1`) location. The live RTDB rules are locked to `.read: false` and `.write: false`. The current application has no Realtime Database imports, calls, rules file, or Firebase CLI deployment target. Do not add a `databaseURL`, client reads/writes, or change those rules until a feature is designed and its access model is tested.

**Production release caveat:** the current web app's Firebase JS `getFirestore(app, databaseId)` call and the server/Functions Firebase Admin named-database overload are both marked **Public Preview** by their official references, which say not to use those APIs in production ([JS SDK](https://firebase.google.com/docs/reference/js/firestore_), [Admin SDK](https://firebase.google.com/docs/reference/admin/node/firebase-admin.firestore)). The Google Cloud Node Firestore client documents a `Settings.databaseId` option ([reference](https://docs.cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/settings)), but replacing only the backend client would not remove the browser SDK preview dependency. CI success does not resolve this platform limitation; obtain an architecture decision before production release. No data migration or database change was made.

Chat voice media is written/read only through the authenticated private-media API. The API verifies Firebase ID tokens, queries chat membership in the named database, enforces a per-user upload quota, and streams only message-referenced audio with `Cache-Control: no-store`. The source Storage Rules deny direct client access to `chats/**`; live Storage setup is currently blocked by the project's missing Blaze billing plan, so no upload or deployed Storage-rule claim is made. Verify server credentials and bucket access in staging before releasing this path. Never replace it with a permanent public download URL.

## Legacy public-post audience backfill

The migration does not infer that a missing `audience` means public. A reviewer with authorized access must independently verify public intent and create a protected manifest containing only approved post IDs and concise evidence notes. Do not put post bodies, media URLs, private user details, or other content in the manifest or logs. The checked-in `functions/migrations/public-posts-manifest.example.json` is empty and is not an approval list.

Manifest format:

```json
{
  "version": 1,
  "entries": [
    {
      "id": "reviewed-post-id",
      "confirmedPublic": true,
      "evidence": "Verified public on original publication record."
    }
  ]
}
```

First compile and test the Functions project and run the emulator integration test:

```sh
npm run functions:build
npm run test:migration
```

Run a dry-run against a specific project and a locally protected manifest (no `--apply`):

```sh
GCLOUD_PROJECT=YOUR_PROJECT npm --prefix functions run migrate:public-post-audience -- \
  --manifest=/secure/path/reviewed-posts.json \
  --report=/secure/path/migration-dry-run.json
```

Review only the aggregate counts and metadata-only record outcomes. The migration fetches only listed IDs, processes at most 200 per outer batch and 10 concurrently, and changes only the `audience` field in a per-document transaction. Existing public posts are no-ops; existing non-public audience values are skipped; missing documents are skipped. It preserves post IDs, authorship, timestamps, media, and engagement fields. Re-running it is idempotent. Failures are recorded as an outcome without logging document contents.

Production application requires a separate approved change window and a second-person review of the manifest and dry-run. Only then, and only against the explicitly verified project, run with both `--apply` and `--confirm-production`. The process refuses a non-emulator apply without the latter flag. Do not use this option as a substitute for approval. Verify the updated count against successful outcomes and re-read a small sample of only the reviewed records with an authorized operator. Never apply to records with ambiguous, followers-only, private, community, unknown, or missing evidence.

### Partial failure and recovery

The script writes each approved document independently, so a process interruption can leave a subset updated. Preserve the metadata-only report. Re-run the same reviewed manifest in dry-run mode: records already set to `public` are reported as `already-public`, and remaining eligible absent-audience records as `would-update`. After the failure cause is resolved and the authorized change window remains open, re-run apply with the same manifest. The operation does not overwrite an existing audience value. If a record is found with a restricted audience, investigate it separately; never add it to the approved list to force it public. For accidental promotion, use a separately reviewed, backed-up rollback procedure to restore only the affected records' previous audience state; this tool intentionally has no bulk demotion mode.

## Safe Firebase deployment sequence

1. Confirm the intended Firebase project ID, billing/runtime support, authorized deployer, maintenance window, and current rule/index configuration. Inspect changes with `git diff` and `firebase use`; do not rely on a stale local project alias.
2. Ensure a tested backup/export exists and recovery access is verified. Keep it out of Git.
3. Run `npm ci`, `npm ci --prefix functions`, `npm run lint`, `npm run functions:build`, `npm run build`, `npm run test:unit`, `npm run test:rules`, `npm run test:storage`, `npm run test:migration`, `npm run test:engagement`, `npm run test:voh-security`, `npm audit`, and `npm audit --prefix functions --omit=dev`.
4. Resolve data compatibility before strict public-feed rules: run the reviewed-post migration only after explicit approval. Unlisted and ambiguous records remain unreadable in global feeds.
5. Deploy Firestore indexes and reviewed rules for the intended database(s) as one controlled release, then Storage rules. Verify the Functions Node 22 runtime/region, named database and bucket environment, Admin permissions, Storage proxy permissions, Auth verification, and Gemini secret configuration in staging. Deploy the app only after required indexes are ready and rule-denial telemetry is reviewed.
6. Smoke-test authorized and denied reads/writes with non-production test accounts. Verify public feed reads, private-post denial, cross-user follow/community denial, owner media boundaries, private-chat upload/playback through the API, denial of direct chat Storage access, message-reference gating, and the app's supported interaction paths.
7. Monitor function errors, Firestore permission denials, index build state, and Storage failures. Keep production transfers, private audiences, and unimplemented operations disabled.

## Rollback

Rules rollback means re-deploying the last reviewed, known-good ruleset from source control; do not use a broad allow-all rule. Roll back app and Functions versions separately if a compatibility regression occurs, taking care not to re-open a confirmed privacy exposure. Firestore index definitions can be restored from the prior version, but deletion of a serving index can disrupt queries; do not delete indexes during an incident without checking query dependencies. Audience migration updates are field-only and non-destructive to other post fields, but rules rollback does not reverse those updates. Any data rollback must use the secure pre-change backup and a narrowly scoped, reviewed recovery script.

## Remaining external prerequisites

Production CLI authorization, backup readiness, a reviewer-approved list of legacy public post IDs, observed production rule/query compatibility, and an approved deployment window remain outstanding. The project and Firestore database target are confirmed; no production migration or deploy was performed.
