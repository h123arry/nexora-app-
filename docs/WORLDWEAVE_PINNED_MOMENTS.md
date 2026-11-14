# WorldWeave Pinned Moments

## Product behavior

The WorldWeave owner can feature up to three defining moments at the top of the experience. Pinned moments remain in their original chronological position in the shared timeline; pinning is a curated shortcut, not a move or copy.

- Pinning an already-unpinned moment adds it to the featured set.
- Selecting an already-pinned moment unpins it.
- A fourth pin is rejected until one of the existing three is removed.
- If a moment is deleted by its author or the owner, a trusted deletion trigger removes its stale pin reference.
- Deleting a moment never deletes other moments or changes contributor attribution.

## Persistence and authorization

- The parent weave stores up to three IDs in `pinnedMomentIds`.
- Only the owner can change the featured set, through `toggleWorldWeaveMomentPin`.
- The callable verifies owner identity and moment existence in a Firestore transaction.
- Clients cannot update `pinnedMomentIds` directly.
- Pin/unpin changes are written to the immutable activity collection.
- The delete trigger is idempotent: it removes the reference only when the deleted moment is still pinned.

## Client experience

- Owners see Pin to story / Unpin from story on timeline moments.
- The UI disables additional pin actions when three moments are already featured.
- All current contributors can see the pinned story section.
- Pinned media and text are fetched by their stable moment IDs, so a featured moment remains visible even when it is older than the latest timeline page.
- Activity history identifies pin and unpin events.

## Verification

- Functions emulator tests cover pin, unpin, owner-only access, the three-item cap, and missing moments.
- Firestore rules tests prove clients cannot modify pinned references, including the owner.
- Existing timeline ordering and moment records remain unchanged.
- Full CI is required before merge.
