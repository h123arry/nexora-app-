# NEXORA Cloudflare migration foundation

## Safety boundary

This is an isolated staging foundation, not a production cutover. Firebase remains the production source of truth. Do not merge a cutover, change the public app API origin, or remove Firebase until the owner has supplied the required credentials/permissions and the migration has passed reconciliation and account-level smoke tests.

## Account resources inspected

- Cloudflare account is connected to ChatGPT.
- Existing Worker: `nexora-follow-edge`. It currently proxies follow-state requests to the existing Render API and has no D1 binding. It is intentionally untouched.
- Existing R2 bucket: `nexora-media`. It was created before this migration work and is reused by the staging Worker configuration; no objects were copied or modified.
- New D1 database: `nexora-migration-staging`, UUID `3ff38618-cdb5-4404-a58d-f61ba71bc4c6`, EU jurisdiction, primary region EEUR, read replication disabled.
- The D1 schema is applied from `migrations/0001_initial_schema.sql`. It includes a lossless staging document envelope, migration-run audit records, and initial profile/post/follow/media read models.

## Worker

`worker/wrangler.toml` configures a separate `nexora-api-staging` Worker with:
- D1 binding `DB` to the isolated staging database.
- R2 binding `MEDIA` to the existing `nexora-media` bucket.
- Firebase ID-token verification against Google's published Secure Token signing keys.
- Read-only `/api/v1/profile`, `/healthz`, and `/readyz` endpoints.

The staging Worker source is not deployed by this change. The existing `nexora-follow-edge` Worker is not modified.

## Firestore data import

`../scripts/migrate-firestore-to-d1.mjs` reads Firestore using Firebase Admin Application Default Credentials and imports document payloads into the D1 staging envelope. It walks nested subcollections, pages reads, hashes payloads, records a migration run, and upserts by Firestore document path.

The importer intentionally excludes credential/token-like fields (passwords, secrets, private keys, access/refresh/OAuth tokens, API keys, service-account data and credential fields). It does not migrate Firebase Authentication identities or Firebase Storage object bytes. Those require separate, owner-authorized workflows and verification.

Required owner-provided environment/permissions before running the importer:
- Source: `GCLOUD_PROJECT=nexora-prod-voiceharrison`, `FIRESTORE_DATABASE_ID=default`, and Firebase Admin ADC with read access to the source database.
- Destination: Cloudflare API token scoped to D1 edit, `CLOUDFLARE_ACCOUNT_ID`, and `CLOUDFLARE_D1_DATABASE_ID`.
- The script never prints tokens or document contents.

## Remaining gates before production

1. Review the exact Firestore collection/subcollection inventory and data classifications.
2. Obtain authorized source Firestore read access and run a staging export/import.
3. Reconcile per-collection counts and representative document hashes; investigate every skipped or redacted field.
4. Migrate media bytes from the actual Firebase Storage source (if any) into R2, preserving owner/path metadata and private access.
5. Implement and test production-grade API routes and authorization for each feature before routing app traffic to them.
6. Keep Firebase Authentication during the first migration stage; do not migrate password hashes or attempt to recreate user credentials.
7. Add D1/R2 integration tests, run repository CI, and verify staging with real test accounts.
8. Owner reviews secrets/permissions, approves any production changes, and explicitly authorizes merge/deploy and cutover.

A successful schema application or staging health check is not proof that NEXORA has been migrated or is production-ready.
