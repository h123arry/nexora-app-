# Circle moderation operations

## Supported actions

Circle owners, admins, and moderators can manage lower-ranked active members from the member directory.

- **Remove** deletes the active membership record. A removed member may join a public Circle again unless a separate ban exists.
- **Ban** deletes the active membership record and creates a private `communities/{communityId}/bans/{userId}` record. Public join and invite redemption both reject a user while that marker exists.
- **Unban** deletes the private ban marker. The person must join again or redeem a valid invitation to create a fresh membership record.
- **Ban review** is available only through an authenticated manager callable. The UI never queries the private ban collection directly.

## Authorization model

The membership document is the canonical role source. The callable checks the actor's active membership and role inside the same transaction that changes the target membership. A manager cannot moderate a member with an equal or higher role; owners cannot be targeted through member moderation. Client writes to ban markers, role records, audit events, and the ban list are denied by Firestore Rules.

The public Circle document does not store banned user IDs. Ban markers are stored in a private subcollection and are unreadable to all clients, including Circle managers. Managers receive only the bounded fields returned by the trusted list callable.

## Audit trail

Each successful action creates an append-only `auditEvents` record containing the actor UID, target UID, action, prior role when relevant, reason, and timestamp. Audit records are written by the Admin SDK and are not client-writable. The reason is required and limited to 500 characters.

## Member reporting and review

Active Circle members can submit one private report per target with a reason between 10 and 1,000 characters. Self-reports are rejected. Reports are stored in a server-only `reports` subcollection; clients cannot read, forge, or edit them. Managers can review up to 50 open reports from a bounded recent-record scan, then dismiss a report, remove the reported post/message, or ban the reported member through the same role-safe moderation path. Every content removal and member ban writes its own moderation audit event. Report decisions require a review reason.

## Limits and release checks

- Ban-list retrieval is capped at 100 most recent records.
- Mute/time-limited restrictions and report-driven moderation are not yet implemented.
- Circle media upload/download is not yet implemented.
- Complete multi-account staging acceptance is still required: owner, admin, moderator, ordinary member, banned account, unban/rejoin, invitation redemption, and attempted client-side privilege forgery.
- Deploy the matching Functions and Firestore Rules before treating these controls as available in production.
