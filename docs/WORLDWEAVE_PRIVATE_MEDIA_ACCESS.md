# WorldWeave Private Media Access

## New upload behavior

For all new WorldWeave media moments, public and private, media moments now persist:
- the canonical owner-scoped `storagePath`;
- an empty `mediaUrl` (no permanent Firebase download URL is written to Firestore).

The upload helper completes without resolving a download URL. Public and private WorldWeaves both use the same short-lived URL resolver; access checks differ by visibility.

## Access resolver

The trusted `resolveWorldWeaveMomentMediaUrl` callable:
1. requires an authenticated account;
2. verifies the parent experience and moment still exist;
3. validates the exact owner-scoped Storage path against the moment author and moment ID;
4. checks current private membership or public visibility;
5. checks blocks in both directions for the experience owner and moment author;
6. respects private-profile follow requirements for public experiences and active account restrictions;
7. confirms the Storage object exists;
8. re-checks the experience immediately before returning the signed URL;
9. returns a signed read URL that expires after 10 minutes; the Storage object response is marked `private, no-store, max-age=0`.

The callable does not return storage paths or membership records. A removed contributor cannot request a new signed URL. A URL already issued remains usable only until its short expiry.

## Client behavior

The WorldWeave client uses the temporary resolver for every owner-scoped Storage object, even when an older `mediaUrl` field is still present. It never renders that legacy private URL directly. A direct URL fallback is retained only for older public moments that have no Storage path; private legacy moments without a safe Storage path are withheld. Viewers explicitly load media, the signed URL stays in component memory, and it is never written back to Firestore. If the URL expires, the viewer can request a fresh one while they remain authorized. New uploads and migrated private objects carry `private, no-store, max-age=0` cache metadata.

## Important legacy limitation

Existing private moments may still contain permanent Firebase download-token URLs. This slice secures new uploads and provides the short-lived access path, but it does not automatically revoke previously issued tokens. A separate, dry-run-first migration is required to revoke old tokens and clear legacy media URLs safely.

## Verification

Policy tests cover private active-member access, removed/unrelated accounts, public visibility, both-direction blocks, and fail-closed unknown visibility. The Functions build and engagement emulator suite must pass before merge.
