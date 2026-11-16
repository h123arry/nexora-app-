# Legacy WorldWeave download-token migration

This migration retires legacy Firebase download-token URLs from WorldWeave moments. New WorldWeave media should store an empty `mediaUrl` and the canonical owner-scoped `storagePath`; viewers obtain short-lived URLs through the authenticated resolver.

## What the migration changes

For each WorldWeave moment with a Firebase Storage URL containing a `token` query parameter, the migration:

1. Confirms the URL host is `firebasestorage.googleapis.com` and decodes the exact object path.
2. Confirms the moment's author, moment ID, and canonical `users/{authorId}/media/{momentId}` storage path agree.
3. Confirms the Storage object exists.
4. Rotates `firebaseStorageDownloadTokens` to a fresh, undistributed random value on that exact object, invalidating all previously issued download URLs while preserving unrelated custom metadata. The new token is not returned or logged.
5. Clears `mediaUrl` only if the Firestore moment still points to the same URL and storage path.

Missing objects, unsafe path bindings, and concurrent edits are reported and left untouched. The migration never logs URLs, tokens, object metadata, or message content. It does not delete media objects.

## Safe execution

The command is dry-run by default and caps the number of inspected moments per run (default 5,000; maximum 100,000). Build the Functions package first:

```sh
npm --prefix functions run build
```

Run a dry-run against an isolated staging project first, with the correct staging credentials and explicit project/database/bucket configuration:

```sh
NEXORA_ENV=staging \
NEXORA_STAGING_PROJECT_ID=<staging-project-id> \
GCLOUD_PROJECT=<staging-project-id> \
FIRESTORE_DATABASE_ID=default \
FIREBASE_STORAGE_BUCKET=<staging-bucket> \
npm --prefix functions run migrate:legacy-worldweave-media -- \
  --max-moments=5000 --report=./legacy-worldweave-media-dry-run.json
```

Review the report. Investigate every unsafe reference, missing object, failed operation, or concurrent change before applying. Then run the staging apply explicitly:

```sh
NEXORA_ENV=staging \
NEXORA_STAGING_PROJECT_ID=<staging-project-id> \
GCLOUD_PROJECT=<staging-project-id> \
FIRESTORE_DATABASE_ID=default \
FIREBASE_STORAGE_BUCKET=<staging-bucket> \
npm --prefix functions run migrate:legacy-worldweave-media -- \
  --apply --confirm-project=<staging-project-id> \
  --max-moments=5000 --report=./legacy-worldweave-media-staging-apply.json
```

Use the emulator-backed test command during development:

```sh
npm run test:legacy-media-migration
```

## Production boundary

Production apply requires both `--confirm-project=nexora-prod-voiceharrison` and the additional `--allow-production` flag. Do not use either flag or run a production migration until an owner explicitly approves the dry-run report, staging results, maintenance window, and rollback/recovery plan.

The operation is idempotent: rerunning it skips moments whose `mediaUrl` has already been cleared. If Storage token removal succeeds but the Firestore update is interrupted, a subsequent run can clear the still-present URL once the object metadata confirms the legacy token has been rotated.

This does not revoke URLs copied outside Firebase metadata, erase backups, or delete external copies. It only invalidates prior Firebase download tokens attached to the exact WorldWeave Storage objects found by this migration; a new undistributed token remains in Storage metadata.
