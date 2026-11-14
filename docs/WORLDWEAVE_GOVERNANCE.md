# WorldWeave Governance — Contributor Lifecycle

This slice adds trusted lifecycle operations to the existing parent-array membership model. It is intentionally compatible with the current schema and retains the 500-contributor protective ceiling until Membership V2 is migrated and verified.

## Available operations

### Contributor leave
- Callable: `leaveWorldWeave`
- A signed-in active contributor may leave.
- The current owner cannot leave until ownership is transferred.
- A pending invitation owned by the caller may be withdrawn.
- Historical moments are retained; leaving changes membership, not story history.

### Owner removal
- Callable: `removeWorldWeaveContributor`
- Only the current owner may remove an active contributor.
- The owner cannot remove themself.
- Removal updates the membership summary and records an immutable activity event.
- Existing moments remain in the timeline.

### Ownership transfer
- Callable: `transferWorldWeaveOwnership`
- Only the current owner may transfer.
- The recipient must already be an active contributor with a verified public profile.
- Parent owner identity and owner display name are changed in one Firestore transaction.
- The former owner remains a contributor.
- A transfer event records the actor and previous owner.

## Activity history

Events are stored at `worldWeaves/{weaveId}/activity/{eventId}` and are written only by trusted Functions. Current members and the owner can read them; clients cannot create, edit, or delete history. The WorldWeave detail view shows the latest 20 events.

The activity feed deliberately uses generic actor/target labels in the client rather than exposing profile details through the event document.

## Client experience

- The contributor management panel loads a privacy-checked directory for members.
- Owners can select a contributor to remove or promote through ownership transfer.
- Non-owner contributors can leave with a confirmation.
- Confirmations explain that historical moments remain.
- Actions are busy-state guarded and display explicit success/error feedback.

## Limits and next stage

- The current membership array is still authoritative for existing WorldWeaves.
- Contributor directory reads are capped at the first 100 entries.
- This is not yet the per-user membership-subcollection architecture.
- Activity history currently covers leave, removal, and ownership transfer; invite, join, contribution, and moderation events can be added through trusted event writers.
- Private Storage object access remains governed by existing owner-scoped Storage rules and media lifecycle. Do not treat a download-token URL as revocable access.
- Full revocation of previously issued media download URLs requires a separate media-delivery design.

## Verification gates

The new emulator suite covers leave, owner leave prevention, owner-only removal, ownership transfer, membership preservation, historical moment retention, and invalid target cases. Firestore rules tests cover activity privacy and immutability.

Before merge, require frontend type-check, Functions build, unit suite, Firestore rules suite, Functions engagement emulator suite, Storage rules suite, and staging multi-account verification. Do not deploy callables or run data migrations to production without explicit owner approval.
