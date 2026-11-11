# Phase C — Community Progression & Trust

## Product objective

Make participation, contribution quality, feed ranking, and safety outcomes understandable and meaningful without turning NEXORA into a points-farming system.

## Existing systems to reuse

- Social Challenges already provide server-managed creation, joining, and idempotent public-post contribution tracking. Phase C must extend that system rather than introduce duplicate challenges.
- The reputation engine and creator achievements already calculate reputation tiers and creator milestones. New levels must use trusted, quality-gated signals and must not let users grant themselves status.
- Feed ranking already returns reason strings from the ranking policy. Those reasons are now carried into feed cards so members can inspect why a recommendation appeared.
- Moderation reports already have a trusted callable submission/review path. Phase C adds a private, owner-scoped status history rather than creating a second reporting system.
- Circle events and RSVP records already exist. Seasonal events should extend this event infrastructure where appropriate rather than duplicate Circle events.

## Phase C workstreams and release gates

1. Missions and capability unlocks
   - Reuse existing challenge participation where it fits.
   - Unlock privileges only from server-verified milestones.
   - Never grant moderation, finance, or identity-verification privileges from activity points.
2. Creator and contributor levels
   - Keep creator milestones distinct from community contribution levels.
   - Use transparent thresholds and anti-farming rules.
   - Do not equate popularity with trust.
3. Helpful-content verification
   - Use distinct-account, non-self endorsements and abuse-resistant thresholds.
   - Label community usefulness separately from identity verification or factual certification.
4. Transparent feed explanations
   - Show only ranking reasons actually produced by the ranking policy.
   - Avoid exposing private personalization data, hidden weights, or other users' activity.
5. Report-resolution tracking
   - Reporters can read only their own status projection.
   - Reviewer notes, evidence, and staff identity remain private.
6. Seasonal community events
   - Use real event windows, server-owned participation, and idempotent contribution records.
   - Avoid fake attendance, invented rewards, or automatic NEX issuance.

## Implemented in this branch

- Added listMyModerationReports, an authenticated callable returning a bounded status projection for the signed-in reporter only.
- Added an account-support report history panel with refresh and live refresh after a report is submitted.
- Added emulator coverage proving that another account's reports and private reviewer fields are not returned.
- Carried actual ranking reason strings from rankPosts and rankReels into feed cards, with a compact “Why am I seeing this?” disclosure.
- Preserved the existing /logo.svg and NEXORA violet brand identity; no replacement logo or creator-content watermarking was introduced.

## Safety and deployment

- No production Functions, Firestore rules, or production data were deployed or modified by this branch.
- New report history is served through an authenticated callable; no client-side read access to moderation collections is added.
- Remaining workstreams are not considered complete until their trusted backend, UI, abuse controls, tests, and release gates are implemented and validated.

## Implemented in the current Phase C slice

- Creator progression now derives six named levels from the existing reputation score (Newcomer through Legacy Builder). The dashboard shows current level, next threshold, and points remaining. This is a recognition layer only: it does not mint NEX, grant paid entitlements, or bypass moderation and verification.
- Creator milestones now include separate Helpful Contributor and Trusted Guide recognitions, driven by the existing helpfulness component of the reputation breakdown. Likes and views cannot unlock these recognitions; the UI does not present them as fact-checking or proof that an individual claim is true.
- Unit coverage verifies level boundaries, invalid reputation handling, and the separation between helpfulness and popularity signals.


## Additional implementation — helpful-content endorsements

- Added a trusted callable for a one-per-account endorsement on public posts.
- Self-endorsement is rejected, repeat calls are idempotent, and the count is updated transactionally by the server.
- Each account is limited to 20 new endorsements per UTC day. The limit is a friction control, not a claim that endorsements prove factual accuracy.
- Feed cards expose a lightweight “Helpful” action; the control is disabled for the post author and after a successful endorsement in the current card session.
- Emulator tests cover idempotency, self-endorsement, private-post rejection, malformed IDs, and daily limits.


## Seasonal platform events

- Added a separate platform-managed seasonal event collection; ordinary Circle events remain distinct.
- Only accounts carrying trusted admin/founder claims can publish official events.
- Members can list upcoming/active events and RSVP through authenticated callables. Attendance markers are per-account and counts update transactionally.
- Events support bounded date windows, optional capacity, duplicate-safe RSVP, withdrawal, and automatic completion when listing discovers an expired event.
- No event rewards, NEX issuance, attendance claims, or production events are fabricated.


## Backend-verified mission capability unlocks

- Added a signed-in capability snapshot based on server-recorded challenge contributions, not client-submitted counters.
- The Advanced Challenge Host capability unlocks only after at least 10 verified public-post contributions across at least 3 distinct challenges.
- The unlocked capability raises the active challenge creation ceiling from 5 to 10; the backend enforces the limit during challenge creation.
- No reputation score, likes, views, NEX balance, admin role, moderation power, financial entitlement, or identity-verification state is changed by this unlock.
