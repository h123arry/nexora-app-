# WorldWeave Private Media Access

## New upload behavior

For private WorldWeaves, media moments now persist:
- the canonical owner-scoped `storagePath`;
- an empty `mediaUrl` (no permanent Firebase download URL is written to Firestore).

The upload helper can complete without resolving a download URL. Public WorldWeaves retain their existing public media URL behavior.

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
9. returns a signed read URL that expires after 10 minutes.

The callable does not return private storage paths or membership records. A removed contributor cannot request a new signed URL. A URL already issued remains usable only until its short expiry.

## Client behavior

The WorldWeave client requests a temporary URL only when a member explicitly loads media without a persisted download URL. The URL stays in component memory and is not written back to Firestore. If the URL expires, the viewer can request a fresh one while they remain authorized.

## Important legacy limitation

Existing private moments may still contain permanent Firebase download-token URLs. This slice secures new uploads and provides the short-lived access path, but it does not automatically revoke previously issued tokens. A separate, dry-run-first migration is required to revoke old tokens and clear legacy media URLs safely.

## Verification

Policy tests cover private active-member access, removed/unrelated accounts, public visibility, both-direction blocks, and fail-closed unknown visibility. The Functions build and engagement emulator suite must pass before merge.
