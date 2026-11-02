# WeChat-inspired ecosystem upgrade programme

**Repository:** `h123arry/nexora-app-`  
**Target:** Existing `main` architecture  
**Status:** Research and implementation blueprint; this document does not claim that the proposed capabilities are already shipped.

## Product principle

NEXORA should learn from WeChat's ecosystem design, not imitate its visual identity or import an unrelated application. The objective is to make NEXORA feel like one connected place where people discover, communicate, organise, create, transact, and access useful services.

Keep the existing React 19 + Vite + TypeScript client, Express server, Firebase Auth/Firestore/Storage/Functions foundation, and Nexora Violet identity. Extend current domains instead of creating a parallel social network.

## Repository baseline checked for this audit

The current repository already contains meaningful foundations that must be reused:

- Circles/community records, membership subcollections, member roles, public discovery, community messaging, polls, events and RSVP flows.
- Trusted callable Functions for creating/voting in community polls and creating/responding to community events.
- Profile QR panel state and QR-related UI in `ProfileView.tsx`; do not build a duplicate profile QR feature before checking its existing implementation.
- Broadcast-related types and post fields, including `isBroadcast`, broadcast modes, recipient and delivery-stat metadata.
- Existing post, story, messaging, notification, profile, monetization, moderation, analytics and VOH AI domains.
- Firestore rules already distinguish public community data from private community state, restrict member records, and reserve event/RSVP and poll mutations for trusted callables.

Important gaps visible in the current implementation:
- Circle membership roles exist, but a complete trusted role-management and delegation workflow needs verification before moderators/admins are treated as a production-grade permission system.
- Community discovery currently reads a bounded public-community set and performs per-community membership reads; it needs scalable pagination and a more efficient membership summary.
- Circle message reads/writes require a focused authorization review to ensure every read, create and subscription is bound to active membership, suspension state, rate limits and moderation controls.
- The profile QR panel exists, but a secure, revocable, deep-link invitation and referral lifecycle is a separate capability.
- Broadcast metadata exists, but that alone does not prove reliable channel subscriptions, fan-out delivery, delivery receipts, audience controls or creator analytics.
- There is no verified sandboxed third-party mini-program runtime. Do not execute arbitrary third-party JavaScript inside the main app.

## Capability portfolio

The table distinguishes inspiration from implementation status. “Existing foundation” means related code is present, not that the full WeChat-grade capability is complete.

| WeChat quality to learn from | NEXORA opportunity | Baseline status |
|---|---|---|
| One account across services | One identity, profile, trust and preference layer across every NEXORA surface | Existing foundation |
| Moments | Rich personal timeline with audience controls, replies and reshares | Existing foundation; audit audience enforcement |
| Official Accounts | Verified creator, publisher, organisation and business channels | Partial broadcast foundation |
| Mini Programs | Curated NEXORA mini-services and partner integrations | Not present as a secure runtime |
| QR connections | Scan-to-open profiles, Circles, events and verified service pages | Profile QR UI exists; deep links/invites need audit |
| Group chats | Reliable group messaging, roles, moderation, mentions and media | Existing messaging foundation; verify scale and policy |
| Community groups | Public, private and invite-only Circles with clear access states | Existing Circles foundation |
| Group announcements | Owner/moderator-only pinned announcements with read state | Broadcast primitives exist; Circle announcement lifecycle needs implementation |
| Channels | One-to-many creator and organisation publishing | Partial broadcast foundation |
| Service discovery | Searchable directory of trusted services, creators, communities and tools | Search/discovery foundation; unified directory missing |
| Payments | Safe checkout, receipts, refunds and creator/business payouts | Monetization foundation; do not introduce wallet custody casually |
| Commerce | Product/service listings, seller identity, order status and dispute handling | Not verified as complete |
| Events | Event pages, RSVP, capacity, reminders and calendar export | Circle events and RSVP exist; capacity/reminders need work |
| Reservations | Bookings for events, sessions and service providers | Not present |
| Digital identity cards | Shareable profile cards with privacy-safe fields | Profile/share foundations exist |
| Saved items | Cross-surface collections for posts, channels, services and events | Bookmarks/collections foundation; unify |
| Search everywhere | One search experience across people, posts, Circles, channels and services | Search foundation; entity coverage needs audit |
| Notifications | Unified inbox, category controls, quiet hours and delivery preferences | Existing notification foundation; unify and verify |
| Translation | In-context translation for posts and messages, user-triggered | Not verified |
| Accessibility | Readable type, screen-reader labels, captions, reduced motion and keyboard support | Needs systematic audit |
| Local services | Location-aware discovery with explicit permission and privacy controls | Not verified; never infer or expose precise location |
| Customer support | Official help accounts, case status and trusted support handoff | Not verified |
| Business profiles | Verified organisations, staff roles, contact actions and analytics | Profile/business foundations need audit |
| Automation | User-consented bots and workflow integrations with scoped permissions | VOH AI foundation exists; third-party bot platform not present |
| Cross-device continuity | Consistent sessions, drafts, read state, settings and device management | Firebase foundation; verify each surface |
| Privacy controls | Per-surface visibility, discoverability, contact, data export and deletion | Existing settings/security foundations; unify and test |
| Safety operations | Rate limits, abuse reports, admin audit logs and appeal paths | Moderation foundation; operational completeness needs verification |
| Lightweight app shell | Fast startup, lazy loading, offline-safe read surfaces and graceful recovery | Existing PWA/performance work; continue measurement |
| Developer ecosystem | Documented APIs, webhooks, app directory and permission review | Not present as a public platform |

## Recommended build order

### Track A — ecosystem foundations (P0)

1. **Unified identity and permissions**
   - Define canonical user, organisation, Circle, channel, service and mini-service ownership.
   - Centralise capability checks; never rely on hidden buttons or client-supplied role fields.
   - Keep private account fields separate from public profile projections.
   - Add explicit consent and revocation for connected services.

2. **Circle role and governance system**
   - Define owner, admin, moderator and member capabilities in a single server-authoritative policy.
   - Add callable operations for role grants/revocations, bans, mutes, invite approval and ownership transfer.
   - Record actor, target, action, reason, timestamp and outcome in append-only audit events.
   - Prevent privilege escalation, self-promotion, owner lockout and stale moderator access.
   - Test every role against every operation in Firestore emulator tests.

3. **Circle announcements**
   - Add trusted owner/moderator announcement publishing, editing, pinning and expiry.
   - Support optional acknowledgement/read state without exposing member lists.
   - Keep announcements distinct from ordinary chat so important updates do not disappear in message volume.
   - Enforce membership and role checks in callable Functions; client writes must not set privileged fields.

4. **Invitations and QR deep links**
   - Extend the existing QR profile experience rather than replacing it.
   - Support shareable links for profiles, Circles, events and channels.
   - Use opaque, random, revocable tokens; store only token hashes server-side where feasible.
   - Add expiry, usage limits, intended audience, abuse throttles and preview-before-join.
   - Never encode email, phone, private IDs or long-lived credentials in QR payloads.

5. **Unified service and content directory**
   - Search people, posts, Circles, channels, events, businesses and approved mini-services from one entry point.
   - Add entity type filters, safe ranking, report actions and verified labels.
   - Keep search results permission-aware; private/invite-only entities must not leak through autocomplete or indexing.

### Track B — communication and publisher ecosystem (P1)

6. **Official channels**
   - Channels for creators, publishers, organisations and public-interest accounts.
   - Follow/unfollow, notification preferences, post scheduling, pinned posts and channel-specific analytics.
   - Separate channel publishing rights from personal profile rights.
   - Support verified ownership and transfer/recovery procedures.

7. **Group quality upgrades**
   - Admin/moderator tools, join requests, slow mode, member caps, message pinning, searchable history and topic threads.
   - Media/file sharing with malware scanning, storage quotas and retention controls.
   - Mentions and role-based announcement permissions.
   - Leave, mute, report and block flows must be easy to find.

8. **Unified inbox**
   - Direct messages, group conversations, Circle threads, channel notifications and service updates in a coherent inbox.
   - Clear unread state, mute, archive, pin, message requests and privacy controls.
   - Preserve message delivery truth states; do not display a delivered/read state without authoritative evidence.

9. **Moments and personal sharing**
   - A personal update stream that can mix text, photos, short video and links.
   - Audience selector, close-friends lists, expiry, replies and resharing rules.
   - Respect blocked users, account privacy and content audience on every query and notification.

10. **Translation and accessibility**
    - On-demand translation with original-text visibility and language preference.
    - Captions/transcripts for video and voice where technically supported.
    - Screen-reader labels, contrast checks, scalable text and reduced-motion support.

### Track C — services and transactions (P1/P2)

11. **Verified business and organisation profiles**
    - Distinct personal and organisation identities.
    - Staff seats with scoped roles, recovery contacts and audit logs.
    - Business hours/contact actions only when the owner supplies them.
    - Transparent verification criteria and appeals.

12. **Service listings and booking**
    - Directory cards, service descriptions, availability, booking requests and cancellation policies.
    - Do not launch booking until timezone, capacity, duplicate reservation and refund rules are tested.

13. **Commerce and payments**
    - Product/service catalogues, seller identity, checkout, order status, receipts, refunds and disputes.
    - Reuse the existing monetization/ledger policy where applicable.
    - Payment provider remains authoritative for payment status; never trust client success callbacks.
    - No peer-to-peer wallet or stored-value claims until licensing, custody, fraud and reconciliation requirements are resolved.

14. **Events as first-class objects**
    - Extend existing Circle events with capacity, waitlists, reminders, calendar export and public/private visibility.
    - Use idempotent RSVP operations and server-side capacity transactions.
    - Keep attendee privacy configurable.

15. **Saved collections across NEXORA**
    - Save posts, channels, Circles, services and events into private named collections.
    - Add export and deletion behavior to the account data lifecycle.

### Track D — extensibility and scale (P2/P3)

16. **Curated mini-services directory**
    - Begin with first-party NEXORA tools and trusted partner links, not arbitrary executable bundles.
    - Every listing has an owner, purpose, data requested, permission rationale, support contact, privacy policy and removal path.
    - Launch services as isolated routes or server-backed integrations with strict scopes.

17. **Developer API and webhooks**
    - Versioned API, OAuth-style consent, scoped tokens, revocation, quotas and signed webhooks.
    - Never expose Firebase Admin credentials or broad database access to third parties.
    - Maintain developer terms, abuse reporting, audit logs and incident revocation.

18. **Bot and automation framework**
    - Explicit user opt-in, clear bot identity and per-Circle permissions.
    - Rate limits, command allowlists, content moderation and data retention limits.
    - Do not allow bots to scrape private conversations or message users without permission.

19. **Offline and cross-device continuity**
    - Sync drafts, read state, saved collections and preferences with conflict handling.
    - Queue only operations that are safe to retry; use idempotency keys.
    - Show honest pending/synced/failed states and allow retry.

20. **Operational observability**
    - Measure cold start, feed latency, message delivery, upload success, search quality, notification delivery and crash-free sessions.
    - Use privacy-minimised telemetry, retention limits and access controls.
    - Add feature flags and staged rollouts for new ecosystem domains.

## Mini-service architecture guardrails

A mini-program ecosystem is a major platform/security project, not a UI tab. The safe path is:

1. Start with a curated directory of first-party service cards and deep links.
2. Add isolated, server-backed service modules with declared API scopes.
3. Introduce a reviewed partner integration model with OAuth consent, quotas and revocation.
4. Only consider sandboxed third-party code after a separate threat model, isolation design, CSP policy, signing/review pipeline, permission broker, supply-chain scanning and incident kill switch.

Never use unrestricted `eval`, dynamic code injection, shared privileged Firebase clients, or arbitrary third-party JavaScript in the main application origin.

## Data model direction

Prefer domain-specific subcollections and server-owned state. Example shapes are illustrative, not deployed schemas:

- `communities/{circleId}/announcements/{announcementId}`
- `communities/{circleId}/auditEvents/{eventId}`
- `communities/{circleId}/invites/{inviteId}` (store token hash, expiry, uses, revocation state)
- `channels/{channelId}` and `channels/{channelId}/followers/{uid}`
- `serviceDirectory/{serviceId}` with owner, status, permissions, privacy URL and review state
- `serviceGrants/{grantId}` with user, service, scopes, expiry and revocation metadata
- `businesses/{businessId}/staff/{uid}`
- `bookings/{bookingId}` with server-authoritative status and idempotency key
- `users/{uid}/savedCollections/{collectionId}`

Every new collection must have a documented owner, read/write policy, retention policy, deletion contract, index plan, abuse controls and emulator tests before UI integration.

## Open-source study list

Use upstream projects as references and verify the exact license/version before copying any code:

- Tencent WeUI: https://github.com/Tencent/weui — study mobile interaction patterns and component consistency; adapt concepts, not visual branding.
- WeUI for WeChat Mini Program: https://github.com/Tencent/weui-wxss — study compact component APIs and mini-program interaction conventions; it is not a drop-in React component library.
- Wechaty: https://github.com/wechaty/wechaty — study bot abstractions and adapter architecture; do not assume it is an official WeChat API or use it to automate personal accounts in ways that violate platform terms.
- Wechaty Puppet ecosystem: https://github.com/wechaty — inspect adapter boundaries, event models and plugin separation; treat third-party adapters as untrusted dependencies.

WeChat's proprietary backend, ranking systems, payments infrastructure and mini-program runtime are not available for direct reuse. Do not treat unofficial clones or protocol reverse-engineering as production dependencies.

## Delivery gates

A capability is not “done” because a screen exists. Each release must include:

- Server-authoritative authorization and validation.
- Firestore rules and callable-function tests.
- Two-user and multi-role acceptance tests.
- Abuse, rate-limit and blocked-user cases.
- Privacy, notification and deletion lifecycle coverage.
- Loading, empty, offline, retry and failure states.
- Accessibility and mobile layout checks.
- Observability and staged rollout controls.
- Documentation updated to match actual behavior.

## First implementation tranche

Start with the highest leverage, lowest duplication work:

1. Audit and close Circle messaging authorization gaps.
2. Build server-authoritative Circle role management and audit events.
3. Add Circle announcements with pin/expiry/read acknowledgement.
4. Extend QR sharing into revocable, expiring Circle/event/channel invitations.
5. Unify directory search across current entity types.
6. Add channel subscription/delivery semantics on top of existing broadcast foundations.

Do not start mini-program execution, payments custody, reservations or arbitrary bot execution in this tranche. Those require separate security, legal and operational designs.
