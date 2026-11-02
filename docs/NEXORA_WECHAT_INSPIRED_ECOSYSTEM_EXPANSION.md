# NEXORA WeChat-Inspired Ecosystem Expansion

**Status:** Product and engineering blueprint; not a claim that the capabilities below are already implemented.
**Repository:** `h123arry/nexora-app-`
**Architecture to preserve:** React 19 + TypeScript + Vite, Express, Firebase Authentication, Cloud Firestore, Firebase Storage, and existing Cloud Functions.
**Design rule:** Nexora Violet remains the visual identity. Borrow product principles, not WeChat branding or a copy of its interface.

## 1. Research conclusion

WeChat's advantage is not one isolated feature. Tencent describes an ecosystem connecting messaging, Moments, Official Accounts, Mini Programs, Channels, Search, payments, shops, and games. The useful lesson for NEXORA is to connect communication, content, communities, creators, and services through shared identity, discovery, permissions, and deep links.

Tencent's public WeUI project is a reference for interaction consistency (cells, dialogs, progress, toast, article, action sheet, icons). It is not a reason to replace NEXORA's existing design system. Review the exact upstream licence and version before copying or depending on any code.

## 2. Existing NEXORA baseline to respect

The current repository already contains:
- Firebase-backed profiles, posts, follows, stories, chat, notifications, and user preferences in varying degrees of completeness.
- Circles/community records, membership records, member lists, real-time community messages, polls, events, and RSVP operations.
- Explore/search surfaces and feed ranking/personalization code.
- Creator-facing surfaces, VOH AI endpoints, and monetization policy scaffolding.

Important known gaps from the current README and code review:
- Some Circle membership, privacy, role, and access paths remain incomplete or inconsistent; do not assume a private Circle is a secure private space until rules and trusted server checks prove it.
- Some community features and creator workflows still include local/prototype state.
- Global indexed search, production-ready recommendation infrastructure, operational payments, and a verified merchant checkout are not established.
- A UI screen, Firestore collection, or callable function is not proof of a deployed, production-ready capability.

Any new work must extend these existing services and rules. Do not create a second identity system, parallel chat system, new feed, or replacement community architecture.

## 3. Product qualities to bring into NEXORA

### A. Moments-style personal social space
1. A profile activity timeline with posts, photos, short clips, and selected life updates.
2. Audience controls per post: public, followers, selected Circle, and only-me where supported by server rules.
3. Reshare-to-chat and reshare-to-Circle with an explicit audience preview.
4. Friend/follower reactions and threaded comments using the existing post/comment model.
5. Optional time-limited updates with clear expiry and archive controls.
6. A private-by-default draft and memories area; no silent publishing or unexpected audience expansion.

**Acceptance:** audience permissions are enforced in Firestore/Functions, not only hidden in the UI; cross-account emulator tests cover owner, follower, non-follower, blocked user, and Circle member/non-member.

### B. Official Accounts and trusted publisher pages
1. Distinct creator, organisation, business, publisher, and community page types.
2. Verified ownership workflow with evidence review and revocation.
3. Page admins with granular roles (owner, admin, editor, analyst, moderator).
4. Public profile header, about/contact links, pinned posts, article archive, and topic labels.
5. Broadcast posts with follower opt-in, notification preferences, and unsubscribe.
6. Publisher analytics based on server-validated events, with clear metric definitions.
7. A visible “official” identity that cannot be self-awarded by client writes.

**Acceptance:** every privileged action checks role membership server-side; admin changes are audited; followers can mute or unfollow; verification decisions are reviewable and reversible.

### C. Mini Services: NEXORA's extension ecosystem
Build this only after permission, moderation, and platform security foundations are ready.

1. A directory of lightweight services inside NEXORA: event tools, learning utilities, creator tools, community utilities, storefronts, booking and productivity tools.
2. Service detail pages with publisher, purpose, permissions, privacy summary, data access, support, pricing disclosure, and report action.
3. Deep links that open a specific service and screen, with safe fallback when the service is unavailable.
4. A versioned manifest and capability declaration (for example: read public profile, create an event, request a share sheet).
5. Explicit per-user consent for each sensitive capability, with revoke controls.
6. A server-mediated API gateway that authenticates the user, checks service scopes, rate-limits calls, logs security events, and returns only the minimum permitted data.
7. Publisher review, malware/security checks, moderation policy, version rollback, kill switch, and abuse reporting.
8. A staged developer programme with test environment, sample SDK, documentation, and app review.
9. Service ratings and feedback only after fraud-resistant review rules exist.
10. No arbitrary third-party JavaScript executing with host-app privileges. Use a restrictive sandbox/origin boundary or a controlled declarative UI schema; never expose Firebase credentials or unrestricted Firestore access to extensions.

**Acceptance:** a malicious test service cannot read another user's data, access host tokens, call undeclared capabilities, or persist after permission revocation. Services are isolated, versioned, rate-limited, and kill-switchable.

### D. Unified NEXORA Search
1. Search people, posts, hashtags, Circles, official pages, events, and approved services from one entry point.
2. Type-aware filters and ranking; no private content leakage through suggestions, snippets, counts, or autocomplete.
3. Recent searches with local clear controls and account-level sync only with consent.
4. Search suggestions that explain why a result is relevant where possible.
5. Safe spelling/phrase matching and bounded pagination.
6. Verified publisher and service labels, with sponsored placement clearly disclosed if ever introduced.

**Acceptance:** server-side ACL filters apply before results and snippets are returned; blocked users/content are excluded; pagination is stable and indexed; abuse and query quotas are enforced.

### E. Channels and broadcast communities
1. One-to-many creator and organisation channels.
2. Public, private, and invite-only channel visibility with server-enforced access.
3. Posts, media, polls, scheduled announcements, pinned messages, and optional discussion threads.
4. Subscriber controls for all, highlights, or muted notifications.
5. Channel admins, moderators, editorial roles, and auditable ownership transfer.
6. Cross-posting to a Circle or profile only after showing the destination and audience.

**Acceptance:** subscription state is durable and cross-device; private channel records and media are inaccessible to non-members; broadcasts are queued and retryable without duplicate delivery.

### F. Social commerce and service discovery
1. Business pages and product/service catalogues.
2. Shareable product cards and saved collections.
3. Enquiry/chat handoff to a business with user consent.
4. Store policies, availability, fulfilment information, and transparent seller identity.
5. Reviews restricted to verifiable interactions when transaction support exists.
6. Merchant analytics with consent and aggregation.
7. Checkout, refunds, disputes, seller verification, payouts, and ledger only after a trusted payment provider and financial compliance design are in place.

**Acceptance:** no fake wallet balance or simulated purchase; every order and payment state is provider-verified and idempotent; seller and buyer data access is scoped; refunds and disputes have auditable states.

### G. QR identity and universal deep links
1. Shareable QR for profile, Circle invite, channel, event, post, and approved service.
2. Rotatable/revocable invite tokens; QR must not expose raw private IDs or long-lived bearer credentials.
3. Preview screen before joining, following, messaging, or opening an external destination.
4. Deferred deep links for app install / browser fallback.
5. Rate limits, abuse reporting, expiry, and link ownership checks.

**Acceptance:** revoked/expired links stop working; private destinations require authentication and membership; scanning never silently joins or grants permissions.

### H. Connected messaging and service handoff
1. Share posts, profiles, events, services, and products into existing chats.
2. Context cards with safe previews and clear origin.
3. Group message actions: pinned items, polls, event invitations, files, and moderation notices.
4. Delivery/read state definitions that match real backend events.
5. Search within a conversation and bounded attachment history.
6. Per-chat notification, media auto-download, privacy, and retention controls.
7. Abuse prevention: block/report from a conversation, invite limits, spam throttles, and safety interstitials for suspicious links.

**Acceptance:** preserve existing chat collections and message service; no parallel messenger. Verify sender/recipient rules, block behavior, attachment ownership, retry/idempotency, and multi-device consistency.

### I. Better Circle operations
1. Server-authoritative membership, join requests, invitations, roles, and bans.
2. Owner/admin/moderator/member role matrix.
3. Private member-only feeds and media with security-rule tests.
4. Pinned resources, shared files, event calendar, polls, and announcement mode.
5. Member onboarding/rules acceptance and moderation queue.
6. Circle discovery with clear privacy labels and useful recommendations.
7. Export, ownership transfer, archive, and deletion lifecycle.

**Acceptance:** private content cannot be read by non-members even with a guessed document path; role escalation is impossible from the client; membership changes revoke access promptly.

### J. Practical everyday utility layer
1. Events with reminders, RSVP limits, waitlists, calendar export, and location/link details.
2. Appointment and booking requests for approved businesses/services.
3. Community resource directories and saved shortcuts.
4. Lightweight forms and polls with privacy-aware result visibility.
5. Localised date, time, currency, and low-bandwidth behaviour.
6. Optional offline read cache for explicitly cacheable public content, with clear stale/offline indicators.

**Acceptance:** no false “confirmed” booking or event reminder; all asynchronous work has pending/success/failure states; offline actions are queued only when safe and idempotent.

### K. Ecosystem-wide trust, safety, and privacy
1. One privacy and permission centre for profile, content, messages, Circles, pages, services, and connected apps.
2. Durable report/case pipeline, reviewer roles, policy decisions, appeals, and Account Status.
3. App Check, server-side quotas, abuse detection, idempotency, audit logs, and kill switches.
4. Account export and trusted deletion workflow covering all new data and service grants.
5. Data minimisation, retention schedules, user-visible consent, and revocation.
6. Accessibility, reduced motion, keyboard/screen-reader support, and low-bandwidth Android performance.
7. Clear separation between client UI state and authoritative backend state.

**Acceptance:** every new collection has an owner, access matrix, retention rule, export/deletion contract, indexes, emulator tests, and operational alert plan before launch.

## 4. Delivery order

### Wave 0 — Audit and platform contracts
- Inventory current collections, Functions, rules, and UI paths.
- Map every item in this plan to an existing implementation or a verified gap.
- Define roles, permissions, event taxonomy, privacy labels, feature flags, and kill switches.
- No duplicate feature surfaces and no speculative dependencies.

### Wave 1 — Complete the current social core
- Close Circle membership and private-access gaps.
- Complete server-authoritative roles, moderation, reporting, and account safety.
- Improve existing chat share cards, message search, notification preferences, and reliability.
- Make profile activity/audience controls durable and enforceable.

### Wave 2 — Publisher and channel layer
- Official Accounts/pages, verification workflow, broadcast subscriptions, channel moderation.
- Unified search across existing indexed/public entities with ACL-safe results.
- QR profile, Circle, event, and channel links.

### Wave 3 — Commerce and utility
- Business catalogues, product/service cards, enquiries, events, bookings, saved services.
- Payment provider integration only after compliance, ledger, refunds, disputes, and payout architecture are approved.

### Wave 4 — Mini Services developer ecosystem
- Versioned service manifest, scoped capabilities, consent/revocation, sandbox, API gateway, review pipeline, developer docs, and test environment.
- Launch with a small curated set of first-party services before third-party publishing.

### Wave 5 — Intelligence and optimisation
- Relevance explanations, service recommendations, safe cross-surface recommendations, creator discovery, and aggregate analytics.
- Measure user value and satisfaction, not only session time or click volume.

## 5. Engineering guardrails

- Keep the current React/Express/Firebase architecture. Do not migrate platforms to imitate WeChat.
- Reuse existing profile, post, chat, notification, community, storage, and callable-function services where they are authoritative and tested.
- All privileged writes must go through trusted Functions/Express handlers with authenticated identity and server-side authorization.
- Never trust a client-supplied UID, role, balance, verification flag, price, payment status, view count, or permission grant.
- Use transactions/idempotency for membership, subscriptions, RSVPs, orders, and delivery jobs.
- Add Firestore rules and Storage rules tests for every new collection/path.
- Add retention/export/deletion coverage for every new data type.
- Keep third-party extensions sandboxed; no arbitrary plugin code with host credentials.
- Do not import WeChat trademarks, visual assets, proprietary code, or unlicensed code.
- Preserve Nexora Violet and the established navigation model; apply interaction lessons without replacing the brand.
- Ship in small, reviewable commits. Run lint, build, unit, emulator, rules, and relevant integration tests before calling a feature complete.

## 6. Suggested first implementation tranche

The highest-value first tranche is not Mini Programs yet. It is:
1. Complete Circle membership and private authorization end-to-end.
2. Add Circle role/permission enforcement and durable join/invite flows.
3. Add a real broadcast/announcement mode to existing community infrastructure.
4. Add shareable QR/deep links for profiles, Circles, and events using expiring/revocable tokens.
5. Add ACL-safe unified search coverage for existing public profiles, posts, communities, and events.
6. Add share-to-chat cards for existing posts, profiles, events, and Circles.
7. Add a trusted publisher/page model only after role verification and moderation workflows are ready.

This sequence gives users meaningful WeChat-inspired value while strengthening the product they already have. Mini Services remain a later platform milestone, not a rushed iframe/plugin feature.

## 7. Research references

- Tencent Weixin/WeChat product overview: https://www.tencent.com/products/weixin-wechat/
- Tencent WeUI (official WeChat design-team UI library): https://github.com/Tencent/weui
- Tencent WeUI for Mini Programs: https://github.com/Tencent/weui-wxss
- Tencent's public description of the Weixin ecosystem and Mini Programs: https://static.www.tencent.com/uploads/2025/09/16/ec455a8989ba1c03aa2bafe97de0618d.pdf
