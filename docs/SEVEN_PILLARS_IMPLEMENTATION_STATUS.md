# NEXORA seven-pillar implementation gates

This document tracks the seven ecosystem upgrades against the existing product. It is an engineering gate, not a claim that a feature is complete.

## 1. Official broadcast channels and creator subscriptions
- [ ] Server-authoritative channel membership and subscription state
- [ ] Creator publishing permissions and follower delivery
- [ ] Subscription entitlements, cancellation and renewal lifecycle
- [ ] Abuse controls, reporting, rate limits and audit trail
- [ ] Provider-backed payments and verified webhook settlement before paid access is enabled

## 2. Unified discovery directory
- [ ] Authenticated server-side search across people, Pages, Circles, posts and events
- [ ] Cursor pagination, bounded query sizes and abuse controls
- [ ] Visibility, block, suspension and moderation filters enforced server-side
- [ ] Stable ranking and explainable result categories

## 3. Cross-device inbox and group messaging
- [x] Account-scoped Firestore inbox preferences exist for pin/archive
- [ ] Verify listener and writes in multi-device acceptance tests
- [ ] Group membership, roles, invitations and removal lifecycle
- [ ] Group-specific privacy, read receipts, mentions and notification controls
- [ ] Server-side membership checks for every group mutation

## 4. Saved collections
- [x] Private Firestore collections and post items exist
- [ ] Typed references for Circles, events, Pages and other supported content
- [ ] Revalidate visibility and access when reading saved references
- [ ] Safe handling of deleted, private or unavailable content

## 5. Business services, bookings and commerce
- [ ] Page service catalogue with owner-controlled publishing
- [ ] Booking requests with transactional availability and idempotency
- [ ] Owner accept/decline/cancel lifecycle and customer status tracking
- [ ] Audit trail, abuse controls and privacy-safe notifications
- [ ] Provider integration, webhook verification, refunds and reconciliation before payments

## 6. Localisation and accessibility
- [ ] Inventory every user-facing string and move it into locale resources
- [ ] Complete English, French, Arabic and Portuguese coverage
- [ ] RTL layout audit, keyboard navigation, focus management and screen-reader labels
- [ ] Contrast, reduced motion, zoom and touch-target regression checks
- [ ] Automated locale completeness and accessibility tests

## 7. Curated mini-services
- [ ] Typed, curated service registry with explicit route targets
- [ ] No arbitrary user-supplied code execution or privileged client secrets
- [ ] Per-service permissions, data minimisation and safe external-link handling
- [ ] Health, error, abuse and availability monitoring

## Release rule
A pillar is not complete because a screen exists. It must have persisted data, server-side authorization, abuse and failure handling, tests, documented deployment requirements and production verification. CI success does not mean Firebase functions are deployed or a payment provider is active.