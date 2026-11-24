# Public profile privacy scrub

This one-time migration removes two private fields from legacy `publicProfiles/{uid}` projection documents:

- `interestDNA`
- `dateOfBirth`

It does not read, modify, or delete the canonical private `users/{uid}` documents. It preserves all other public projection fields.

## Safety behavior

- Dry-run is the default; it performs no writes.
- Production writes require both the exact production project ID and the explicit `--confirm-production` flag.
- The script requires an explicit Firestore database ID outside the emulator. For NEXORA production, use the owner-confirmed literal database ID `default`.
- Processing is cursor-paginated in pages of 200 documents.
- Each page uses a bounded batch. A failed batch stops the run; the script does not silently skip failed documents.
- Logs and reports contain only aggregate counts, never profile values or private field contents.
- The script does not run automatically during app startup or deployment.

## Emulator verification

From the repository root:

```bash
npm run test:migration
```

This runs the existing public-post migration tests and the new public-profile scrub tests against the Firestore emulator.

## Production procedure (owner-controlled)

1. Use an owner-approved environment with Application Default Credentials. Never upload service-account keys to the repository or paste credentials into ChatGPT.
2. Confirm a recoverable export/backup exists for the production Firestore database before any write. This migration is intentionally not allowed to run as an automatic deployment step.
3. Build the Functions package:

```bash
npm --prefix functions run build
```

4. Run a dry-run against the exact production project and database:

```bash
GCLOUD_PROJECT=nexora-prod-voiceharrison NEXORA_ENV=production FIRESTORE_DATABASE_ID=default npm --prefix functions run migrate:public-profile-private-fields -- --report=/secure/path/public-profile-scrub-dry-run.json
```

5. Review the project ID, database ID, scanned count, and would-scrub count. Stop if the target or counts are unexpected.
6. Only after explicit owner approval and a verified backup, apply:

```bash
GCLOUD_PROJECT=nexora-prod-voiceharrison NEXORA_ENV=production FIRESTORE_DATABASE_ID=default npm --prefix functions run migrate:public-profile-private-fields -- --apply --confirm-production --report=/secure/path/public-profile-scrub-apply.json
```

7. Verify the final report has `scrubbed === wouldScrub` from the approved dry-run, and that the profile directory and username lookup paths work before deploying the restrictive read rule in PR #582.

Do not run the production apply step from an unreviewed shell, CI workflow, or ChatGPT session. The production migration requires the project owner's explicit approval and credentials.
