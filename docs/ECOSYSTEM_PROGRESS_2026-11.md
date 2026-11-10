# NEXORA ecosystem progress

This is an implementation snapshot, not a release-readiness certification.

## Implemented in the current codebase

- Private saved collections now accept typed references to public posts, public Circles, Pages and scheduled events. Circle and event views expose save actions. Firestore rules re-check public visibility and active Circle membership.
- Universal Search has a server-backed directory path for public people, Pages and public Circles. Private profiles require an existing follow relationship; blocked, suspended and seed accounts are excluded. Other categories still use currently loaded client data.
- Business Pages can publish and pause service listings. Customers can submit booking requests; Page owners can accept or decline. Requests are idempotent, rate-limited, private to the customer and Page owner, and do not imply payment or confirmed availability.
- Creator and organisation Pages have follower-only official channel updates. Page owners publish and remove updates through trusted callables.
- Explore now includes a curated, route-only Mini Services hub. It does not execute third-party scripts or arbitrary user code.
- Explore and Universal Search recent-search records are scoped to the signed-in account.
- Circle member pagination, role governance, trusted remove/ban/unban actions, private manager-only ban review, invitation enforcement, and append-only moderation audit events are connected. Bans use private server-owned subcollection records rather than exposing banned user IDs on public Circle documents.
- Inbox pin/archive preferences already use account-owned Firestore records for cross-device synchronisation.

## Still incomplete

- Paid creator subscriptions remain unavailable until a payment provider adapter, signed webhooks, settlement, refunds and entitlement activation are implemented and verified.
- Broadcast channels need delivery notifications, richer media, moderation workflows and creator analytics.
- Directory search still needs server-backed posts, events, tags and service indexing, cursor pagination and production ranking.
- Circle mute enforcement, report-driven Circle moderation, secure Circle media upload/download, and multi-account moderation acceptance tests remain incomplete.\n- Group messaging still needs trusted group creation, invitations, roles, removal/leave lifecycle and end-to-end acceptance tests.
- Saved content needs richer presentation and more entry points beyond Circle and event views.
- Business services need availability/slot management, customer cancellation, owner scheduling and operational notifications. Payment collection is intentionally disabled.
- Mini Services currently route to existing NEXORA modules; external provider integrations and permission scopes are not yet implemented.
- Translation coverage and accessibility need a full application-wide audit, not just locale direction and individual component improvements.

## Release gates

1. Pass the complete current CI workflow, including TypeScript, Functions build, Firestore rules, engagement tests, security tests, dependency audits and production build.
2. Deploy the matching Firebase Functions, rules and indexes to staging.
3. Complete multi-account and multi-device acceptance tests.
4. Measure production latency, error rates, feed quality, message delivery and abuse response under real load.
5. Keep payment-dependent features disabled until provider settlement and refund paths are verified.
