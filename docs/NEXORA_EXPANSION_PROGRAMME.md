# NEXORA Expansion Programme
## Product objective

Extend the existing NEXORA application into a connected social, creator, community, commerce, opportunity, and entertainment ecosystem. This programme is additive: retain the existing React/Vite/Express/Firebase architecture, Nexora Violet identity, account model, moderation controls, privacy boundaries, and established services. Do not create a replacement application or duplicate existing capabilities.

This document is a delivery contract and status baseline, not a claim that the features below are already implemented or deployed. Every capability must be marked implemented only after its UI, trusted backend path, authorization, persistence, tests, and operational configuration have been verified.

## Delivery principles

- Build on the existing repository and reuse existing profiles, posts, follows, chat, notifications, communities, Creator Dashboard, media lifecycle, analytics, Nex Coin ledger, Giftverse, and moderation systems where suitable.
- No fake balances, simulated purchases, invented analytics, client-authoritative earnings, placeholder marketplace listings, or UI-only permissions.
- Every write that affects money, reputation, memberships, entitlements, campaigns, rewards, or public status must be validated and committed by a trusted server operation.
- Enforce ownership, membership, role, consent, account-status, rate-limit, and moderation checks on the server and in Firestore rules where applicable.
- Use bounded pagination, idempotency keys for retryable mutations, server timestamps, schema validation, and audit events for consequential actions.
- Keep private fan data, campaign contracts, applications, messages, and personal memories private by default.
- Label integrations requiring external providers, billing, legal review, deployment, or operator configuration as blocked until verified.
- Add unit, authorization/rules, emulator integration, and relevant UI tests with each implementation tranche.
- Update this document with commit/PR references and verified test results; do not infer production readiness from source code or emulator success.

## Existing foundations to reuse

The current repository already contains Firebase-backed account/profile, feed and engagement, messaging, moderation, analytics, media lifecycle, community events/polls/announcements/invites/governance, page channels, business services, public directory search, Nex Coin wallet ledger, and Giftverse catalogue foundations. Existing documentation also identifies important limitations: some Circles and creator interactions remain local/prototype paths; production Firebase services and payment integrations are not fully verified. Expansion work must close those gaps rather than layering more mock UI over them.

## Workstreams

### 1. Creator Business Suite
- Creator business profile and public professional portfolio.
- Media-kit generation from verified profile and analytics data.
- Brand discovery and creator search with category, audience fit, location, language, and availability filters.
- Campaign briefs, creator applications, shortlist, offers, acceptance, deliverables, milestones, and dispute workflow.
- Contract/document records with explicit acceptance and immutable version history; legal enforceability requires jurisdiction-specific review.
- Campaign reporting based on verified platform events, with clear metric definitions.
- Invoice and payment status records; actual collection and payout remain disabled until a payment provider, compliance, reconciliation, refunds, and payout controls are configured.
- Brand and creator safety reports, blocklists, fraud review, and audit trail.

### 2. Fan Universe
- Creator-owned fan clubs with public/private visibility and approval-based admission.
- Membership tiers and entitlements; paid tiers must remain unavailable until billing is verified.
- Fan tenure, anniversaries, supporter recognition, and creator milestones based on server timestamps.
- Fan-only posts, scheduled sessions, polls, and event access enforced by backend authorization.
- Collectible badges and achievements that are earned by defined actions, never purchasable reputation.
- Anti-spam controls, privacy settings, moderation tools, and export/deletion handling.

### 3. NEXORA Live 2.0
- Multi-guest rooms, host/co-host/moderator roles, invitations, waiting room, and participant controls.
- Audience polls, missions, moderated Q&A, scheduled sessions, replay chapters, and highlight metadata.
- Giftverse integration using existing quote/ledger authority; never trust client-supplied prices or balances.
- Battle and tournament formats with transparent rules, anti-collusion safeguards, and eligibility checks.
- Real-time transport, recording, transcoding, CDN, and replay delivery require provider infrastructure and staging verification. Do not represent a UI prototype as production live streaming.

### 4. NEXORA World
- Country/region/topic trend pages based on measured, privacy-aware activity.
- Public event discovery and hosting with location privacy controls.
- Global challenges with published eligibility, moderation, deadlines, and verifiable results.
- Localized discovery with language and regional preferences.
- A map must use consented/coarse location or explicit user-selected places; never expose precise user location by default.
- Trending scores must resist spam, brigading, and coordinated manipulation.

### 5. Communities 2.0
- Convert existing community/Circles prototypes into persistent, cross-device membership and role-aware experiences.
- Public, private, and invite-only access with server-enforced admission.
- Dedicated channels, community knowledge libraries, events, polls, announcements, governance, and moderation queues.
- Community-specific feeds and notification preferences.
- Membership changes and role assignments must be auditable and protected from client privilege escalation.

### 6. Social Commerce
- Verified seller and brand storefronts, product catalogues, creator product collections, and product tagging.
- Product discovery and reviews with verified-purchase provenance where available.
- Live-shopping product cards and affiliate attribution.
- Checkout, refunds, chargebacks, tax, seller verification, fraud controls, and payouts require an approved provider and operational readiness. Until then, commerce may be discovery/catalogue only and must not imply a working checkout.

### 7. Identity and Reputation
- User-controlled profile identity, verified expertise evidence, achievement history, and community contribution recognition.
- Separate popularity, trust/safety signals, and contribution achievements; do not collapse them into one score.
- No reputation purchase or paid rank.
- Explainable eligibility and appeal paths for consequential trust decisions.
- Rate limits and anti-gaming protections for all reputation events.

### 8. NEXORA Intelligence
- Consent-based AI captioning, subtitle generation, translation, post drafting, and content organization.
- Creator insights derived from measured data with clear sample sizes and metric definitions.
- Moderation assistance must be human-reviewable for consequential enforcement.
- AI outputs must be labeled where appropriate; provide opt-outs and data controls.
- Keep provider credentials server-only, rate-limit usage, bound context, and avoid training or retaining private content without explicit consent.

### 9. NEXORA Memories
- Private personal archive, saved collections, anniversaries, and opt-in recap generation.
- Explicit inclusion/exclusion controls for posts, people, and time ranges.
- Private by default; sharing a recap requires a separate user action.
- Respect deleted content, blocks, consent, retention, and account deletion.
- Do not infer sensitive traits or create public relationship timelines without consent.

### 10. NEXORA Opportunities
- Moderated listings for jobs, internships, scholarships, grants, competitions, and volunteer opportunities.
- Publisher verification, expiry dates, eligibility criteria, location/remote labels, and reporting.
- Applications should share only user-approved profile fields and documents.
- Anti-scam review, suspicious-link handling, takedown, and appeal processes.
- No promise of placement, award, or endorsement.

### 11. Distinctive experiences: Arcade, Radio, Vault, Foundation
- Arcade: lightweight social games, transparent scoring, abuse prevention, and age-appropriate controls; no gambling or cash wagering.
- Radio: creator audio shows, scheduled broadcasts, podcast publishing, moderation, and rights/consent controls.
- Vault: private saved collections and personal archives with export and deletion controls.
- Foundation: transparent grant programmes, eligibility, applications, reviewer separation, conflict-of-interest declarations, award decisions, and public accountability reporting. Financial disbursement requires verified payment operations.

### 12. NEXORA Origin — Creative Provenance and Attribution
- Create a durable, privacy-aware origin record for media created through NEXORA's camera, Studio, Lensverse, and other first-party creative tools.
- Preserve source-to-derivative relationships for permitted remixes, edits, templates, sounds, and collaborative works; show a readable creative lineage without exposing private source material.
- Attribute contributors using verified account IDs and explicit contribution roles; distinguish original creator, editor, remix creator, collaborator, and platform-generated assets.
- Verify asset integrity with content hashes and append-only, server-authoritative provenance events. Never treat a hash as proof that depicted events are true or that a person owns every underlying right.
- Import and validate interoperable C2PA Content Credentials when present; retain clear states for verified credentials, absent credentials, invalid credentials, and unknown provenance. Never label unverified uploads as authentic.
- Record AI assistance and material edits only when supported by trustworthy tool-generated signals or creator disclosure; do not claim reliable AI detection from visual inspection alone.
- Give creators controls over attribution display, remix permissions, source visibility, and opt-out/appeal workflows, subject to safety, legal, and platform integrity requirements.
- Keep original media private where appropriate; expose only approved lineage metadata. Respect deletion, blocks, consent, moderation holds, and account export/deletion.
- Reward eligible original contributions only through separately validated creator-economy rules; provenance alone must not mint Nex Coins or determine reputation.
- Add tests for forged parent IDs, cross-account access, cyclic lineage, duplicate events, edited/re-encoded assets, deleted sources, private sources, C2PA validation failures, and attribution disputes.

## Suggested implementation sequence

1. Audit existing code paths and classify each workstream as existing, partial, prototype, missing, or externally blocked.
2. Close foundational persistence and authorization gaps in Communities, creator profiles, fan membership, and event access.
3. Deliver Creator Business Suite and Fan Universe as connected creator workflows.
4. Extend Live using existing Giftverse, moderation, notification, and media lifecycle foundations.
5. Deliver World discovery and Opportunities with trustworthy aggregation and publisher verification.
6. Deliver Commerce only to the level supported by verified seller, payment, refund, and payout infrastructure.
7. Add Identity, Intelligence, Memories, Arcade, Radio, Vault, and Foundation with privacy, safety, and consent built in.
8. Run full CI and relevant emulator suites; document provider and production gates separately.

## Release gates

A workstream is not complete until:
- UI is connected to real application services.
- Server-side validation and authorization are present for all consequential operations.
- Firestore rules deny unauthorized direct reads/writes.
- Cross-account tests prove isolation and role enforcement.
- Retry, pagination, abuse, deletion, and failure cases are covered where relevant.
- No fabricated records or client-authoritative financial/reputation state are used.
- Accessibility, mobile responsiveness, loading/empty/error states, and localization are addressed.
- CI passes and any external configuration is explicitly documented.
- Production claims are limited to behavior verified against the live configured service.

## Status

Programme defined. This document does not mark any of the 11 workstreams complete. Implementation status must be updated only with repository evidence and passing checks.
