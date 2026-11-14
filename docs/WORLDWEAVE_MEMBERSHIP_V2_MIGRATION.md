# WorldWeave Membership V2 — Migration Contract

**Status:** engineering design for the next WorldWeave slice. This document does not authorize a production migration or change the current membership model.

## Why this change is needed

The current parent document stores every contributor in `worldWeaves/{weaveId}.participantIds`. Public joins, invitation acceptance, and Firestore rules all depend on that array. The current 500-member ceiling is a protective guard, not a scalable long-term design. Membership, roles, removal, and ownership transfer should become individually addressable records.

The existing `worldWeaves/{weaveId}` documents, `moments`, and `invites` paths must remain intact. This is an additive migration, not a rewrite.

## Target data model

### Membership record

Path: `worldWeaves/{weaveId}/members/{uid}`

Required fields:

| Field | Meaning |
| --- | --- |
| `userId` | Must equal the document ID and authenticated account ID |
| `role` | `owner` or `contributor` |
| `status` | `active` or `removed` |
| `joinedAt` | Server timestamp for the first successful join |
| `updatedAt` | Server timestamp for the latest membership change |

Optional provenance fields may include `invitedBy` and `removedAt`. Do not copy profile names, avatars, email addresses, or other mutable profile data into the authorization record.

The parent document retains `ownerId` as a convenient canonical pointer and gains `membershipSchemaVersion: 2`. During migration, legacy `participantIds` and `memberCount` remain available for compatibility. They are not authoritative once a weave is marked version 2.

### Membership invariants

1. Every version-2 weave has exactly one active `owner` membership.
2. The active owner membership's document ID equals the parent `ownerId`.
3. A user has at most one membership record per weave because the UID is the document ID.
4. Only active members can read private moments or contribute.
5. A removed member cannot regain access merely by retaining a stale client cache.
6. Member counts are derived from active membership records or updated only by trusted transactional code. Clients never choose the count.
7. A membership change and its parent summary/audit event are committed atomically where supported.
8. No client may create an owner role, change a role, or change `ownerId` directly.

## Read and write rollout

### Stage A — compatibility readers

- Add a single membership resolver used by WorldWeave service operations.
- For records with `membershipSchemaVersion === 2`, read the member document and require `status === active`.
- For legacy records, retain the existing owner/participant-array interpretation.
- Keep the current 500-member ceiling for legacy records until they are migrated.
- Do not silently treat a missing version-2 membership document as a legacy member.

### Stage B — idempotent backfill

For each legacy weave, create:
- one active owner record for `ownerId`;
- one active contributor record for each distinct valid UID in `participantIds`.

The backfill must:
- use deterministic document IDs (UIDs);
- preserve the earliest trustworthy join time when one exists; otherwise use a migration timestamp and record that it was backfilled;
- avoid overwriting an existing valid membership record;
- flag conflicting owner/participant data for review rather than guessing;
- process bounded batches below Firestore's write limit;
- be safe to rerun after partial failure;
- write `membershipSchemaVersion: 2` only after all expected member records are verified.

No production backfill should run without explicit owner approval and a tested dry-run report.

### Stage C — dual-write window

Until all supported clients and records have moved to version 2:
- route joins and invite acceptance through trusted transaction logic;
- create/update the membership record and legacy summary fields in the same transaction;
- make duplicate joins idempotent;
- prevent an invite from being accepted after it has been revoked or already consumed;
- never allow the legacy array and membership records to disagree silently.

If a transaction cannot safely update both representations, fail closed and emit an operational error rather than partially applying membership.

### Stage D — version-2 authority

After migration verification:
- use membership records for all authorization and membership queries;
- use bounded queries and pagination for member lists;
- use a collection-group query on `members` for a user's memberships only after the required index and rules are tested;
- retain legacy fields temporarily for rollback/older clients, then remove them in a separately reviewed cleanup release.

## Member lifecycle operations

### Join / invitation acceptance

Use a trusted transaction to validate the parent state, invitation state, and current membership before creating an active contributor record. Repeated requests by an existing active member return an idempotent result. Revoked, expired, malformed, or mismatched invitations fail closed.

### Leave

An active contributor may leave. The active owner may not leave while still owner. The owner must first transfer ownership or use a separately designed close/archive flow. Leaving should revoke access to private moments and future contribution rights without deleting historical moments authored by that member.

### Owner removal

Only the active owner may remove an active contributor. The owner cannot remove themself through this operation, cannot remove another owner, and cannot remove a user who is not an active contributor. Removal revokes private access but preserves historical contributions and audit history.

### Ownership transfer

Transfer is one atomic operation:
1. verify the caller is the current active owner;
2. verify the recipient is an active contributor;
3. demote the old owner to contributor;
4. promote the recipient to owner;
5. update the parent `ownerId`;
6. append an immutable ownership-transfer audit event.

The transaction must leave exactly one active owner. A stale owner client must not be able to overwrite the new owner.

## Authorization requirements

- Firestore rules must authorize private reads and moment creation against active membership records for version-2 weaves.
- Version-2 rules must not fall back to `participantIds` when the membership record is missing.
- Member documents are readable only by active members and the owner, subject to the product's member-list privacy policy.
- Role/status writes should be server-only (trusted callable/administrative service) unless a narrowly scoped, fully validated transaction rule is proven safe.
- Audit records are immutable and not client-writable.
- Storage access to private media must use the same membership authority; a Firestore membership migration is incomplete if stale media URLs remain accessible to removed members.
- Public discovery must not expose private weave titles, member identities, invite state, or private media metadata.

## Audit trail

Path: `worldWeaves/{weaveId}/activity/{eventId}`

Record only necessary operational facts: event type, actor UID, target UID when applicable, server timestamp, and a bounded metadata object. Events include invite accepted/revoked, joined, left, removed, role changed, and ownership transferred. The client cannot create, update, or delete audit events.

## Required verification before rollout

- Legacy owner-only, owner-plus-contributors, duplicate participant IDs, missing arrays, and inconsistent count fixtures.
- Idempotent backfill, partial-batch retry, conflicting owner data, and dry-run verification.
- Public and private reads for owner, active contributor, invited non-member, removed member, unrelated signed-in user, and guest.
- Join/invite races, duplicate acceptance, invite revocation race, concurrent removals, and concurrent ownership transfers.
- Owner cannot leave or remove self without transfer; exactly one owner remains after every successful transfer.
- Removed members lose private moment and Storage access while historical moments remain intact.
- Collection-group query limits, pagination, and required Firestore indexes.
- Existing timeline subscriptions, pagination, media upload/recovery, and deletion cleanup remain compatible.
- Frontend type-check, Functions build, unit tests, Firestore and Storage rules tests, and staging multi-account acceptance.

## Rollback and release gates

- Keep the legacy fields and compatibility reader through the observation window.
- A rollback must switch reads back only for records whose legacy representation is verified; never infer membership from stale arrays for version-2 records after removals have occurred.
- Do not deploy rules that require version-2 membership until the backfill and all writers are ready.
- Do not run production migrations, delete legacy fields, or claim production readiness without explicit owner approval and verified staging evidence.
