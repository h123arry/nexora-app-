# NEXORA quality gate: moving from a feature-rich build to an 8/10 product

**Purpose:** Define the measurable work required before NEXORA is described as an 8/10 social product. This is a release-quality checklist, not a claim that every item is already complete.

## Product quality principles

1. Real user actions must persist to the intended account and survive refresh, a second device, and a fresh session where applicable.
2. UI must describe the actual state. No fake counts, fabricated activity, pretend uploads, or success toasts for unfinished actions.
3. Every interactive control must be keyboard-operable, have an accessible name, expose its state, and provide visible focus.
4. Every media flow must have validation, progress, cancellation or recovery, failure feedback, and cleanup.
5. Every private-data path must be enforced by trusted backend rules, not merely hidden in the client.
6. Mobile is a first-class layout: safe areas, readable type, touch targets, stable scroll, and no horizontal overflow.
7. A passing build is necessary but does not replace real Firebase staging verification.

## Scorecard and evidence required

| Area | Evidence required for an 8/10 bar |
|---|---|
| Identity and onboarding | Sign-up, verification, sign-in, recovery, profile completion, and sign-out tested against the owner-controlled Firebase project |
| Feed and discovery | Cursor-based loading, ranking inputs, hide/mute/block controls, report flow, and refresh persistence verified with two accounts |
| Stories and media | Upload, expiry, view receipts, privacy, file validation, retry, and cleanup tested on real devices |
| Messaging | Two-user send, delivery/read state, attachments, typing, offline recovery, pagination, and access isolation verified |
| Profiles and graph | Follow/unfollow, private profile visibility, block/mute, edit profile, collections, and account switching tested |
| Trust and safety | Reports, moderation decisions, appeals, rate limits, account deletion worker, and audit trail verified server-side |
| Design and accessibility | Consistent violet tokens, responsive layouts, reduced motion, contrast, focus, semantics, and empty/error/loading states reviewed |
| Performance | Route chunks, image loading, feed listener bounds, video lifecycle, low-memory Android and slow-network checks measured |
| Operations | Staging smoke tests, backups, alerting, deployment rollback, secrets checks, and incident runbooks exercised |

## Repository growth policy

The repository should grow through useful implementation, not padding. Acceptable additions include:

- Tested product capabilities and their reusable components.
- Production-safe service boundaries, security rules, migrations, and emulator tests.
- Original, optimized brand assets and responsive illustrations where they improve the interface.
- Developer runbooks, threat models, acceptance tests, and architecture records that prevent regressions.
- Performance budgets and reproducible test fixtures.

Do not commit generated build output, dependency folders, duplicate media, stock-photo dumps, arbitrary large binaries, or fabricated sample data to reach a target size. An 80 MB Git repository is not an 80 MB user-storage allowance. User uploads belong in managed object storage with quotas, lifecycle rules, and per-account authorization.

## Immediate verification sequence

1. Confirm production Firebase Auth providers and authorized domains in the owner-controlled project.
2. Run the full CI workflow and emulator suites after each coherent implementation batch.
3. Execute a two-account staging script for feed, follow graph, stories, messaging, reporting, and privacy.
4. Test Android mobile layouts on a narrow viewport and a slow connection.
5. Verify account export and deletion through the trusted worker before public onboarding.
6. Record known gaps rather than masking them with UI-only workarounds.

## Current engineering note

The existing CI pipeline is green at the time this document was added, but live production authentication and real-device journeys remain separate release gates. This document intentionally avoids assigning a new score without that evidence.
