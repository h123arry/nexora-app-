# Phase 4 · Intelligent feed, search, recommendations and discovery

Phase 4 improves the existing NEXORA discovery architecture. It does not replace the feed, search UI, Firebase data model or reel ranking system.

## Phase 4.1 · Feed correctness and ranking foundations

- Treat Following as a strict eligibility boundary: only creators in the viewer's followed set can appear in that mode.
- Preserve an honest empty Following feed when the viewer follows nobody; never backfill it with unrelated accounts.
- Keep Latest chronological across the full age range. Older posts must not collapse into a zero-score tie after an arbitrary freshness window.
- Keep privacy and negative-feedback exclusions ahead of ranking.
- Preserve deterministic ordering and creator diversity without silently deleting eligible overflow.

## Existing systems retained

- `src/services/discovery/discoveryService.ts` remains the shared source for post ranking, people search, post search, creator recommendations and trending topics.
- `src/services/discovery/feedPreferences.ts` remains the account-scoped preference boundary.
- `src/services/reels/reelsRanking.ts` remains the viewer-scoped short-video ranking path.
- Existing Firestore retrieval and pagination remain intact.

## Acceptance tests added

- Following excludes non-followed creators even when those posts are newer or more popular.
- Following returns no unrelated posts when the followed set is empty.
- Latest sorts older posts correctly instead of tying all posts beyond seven days.
- Existing discovery regression tests continue to cover blocked/muted creators, hidden posts, negative topic feedback, creator diversity, search matching, recommendations and trending topic quality.

## Phase 4.2 · Bounded ranking and normalized search signals

- Bound lifetime engagement counters so extreme historical totals cannot dominate the feed indefinitely.
- Apply exponential freshness decay to engagement contributions in For You and Trending ranking.
- Normalize Unicode accents, punctuation and case consistently for local post search.
- Require every search term to match while ranking exact token matches above prefixes and substrings.
- Keep search result limits, archive exclusions and video-only filtering intact.
- Add isolated policy tests for bounded engagement, freshness half-life and search relevance.

## Phase 4.3 · Account-scoped feedback learning

- Apply locally learned positive and negative tag, creator and community signals directly to For You ranking.
- Bound learned weights to a finite range and limit stored signal maps to 200 entries per category.
- Persist recommendation signals inside the existing owner-only Firestore feed settings document, using the existing transactional feed update path.
- Hydrate remote signals for signed-in accounts and retain local storage as an offline fallback.
- Synchronize learning from searches, sparks, comments, saves and explicit not-interested actions.
- Respect the user's recommendations-personalization privacy setting and clear learned signals when recommendation preferences are reset.
- Keep guest profiles local and isolate signed-in profile keys by account.

## Phase 4.4 · Qualified feed impression measurement

- Observe actual feed-card visibility with IntersectionObserver.
- Count an impression only after at least 50% of a card remains visible for one continuous second.
- Deduplicate per post and signed-in account session in the feed UI.
- Emit the existing consent-gated `content_impression` analytics event with post reference and non-sensitive surface/qualification metadata.
- Disconnect observers and clear pending timers when cards leave the UI.
- Keep telemetry best-effort so analytics outages never block feed rendering or interactions.

## Phase 4.5 · Cross-surface impression and watch-signal reconciliation

- Keep feed-card impressions and video-player impressions as distinct surfaces, each qualified at 50% visibility for one continuous second.
- Video-player impressions use the existing consent-gated analytics ingestion path and never block playback.
- Reuse the authenticated server-timed video heartbeat path for creator retention; client playback position remains an input signal, not proof of human attention.
- Keep client reel-learning signals separate from server-accepted watch seconds so creator reporting does not mistake local estimates for server aggregates.
- Preserve account/session deduplication and the existing analytics retention boundary.

## Phase 4.6 · Cursor-paginated directory search

- Add opaque, versioned continuation cursors tied to the normalized query.
- Page each indexed username/name prefix query with Firestore document cursors; avoid offset pagination.
- Preserve private-profile, mutual-block, ban, suspension, seed-account and public-Circle visibility filters on every page.
- Expose continuation through the callable API and the Universal Search "Load more directory results" action.
- Reject malformed, stale and cross-query cursors and allow the user to restart the search.
- Prefix search remains prefix search; it is not full-text global search.

## Phase 4.7 · Discovery scale and index regression coverage

- Exercise ranking and local search against a deterministic 5,000-post / 250-creator fixture.
- Assert unique post retention, creator diversity, bounded result sizes and explicit execution budgets.
- Assert required Firestore composite indexes for public Circle directory and creator video retention queries.
- Keep these checks in the normal unit-test CI command so regressions are caught before merge.

## Phase 4.8 · Discovery coverage and deployment verification

- Verify authenticated server-backed directory results for people, Pages and public Circles, including visibility filtering and continuation pages, in the Firestore Emulator.
- Verify feed ranking, search relevance, feedback exclusions and creator diversity in deterministic large fixtures.
- Verify required composite-index declarations in CI.
- Production/staging deployment, live index readiness and real-user coverage remain owner-environment acceptance checks. They must be confirmed against the deployed staging project before claiming live global discovery. The current product search surface is prefix-based and must not be described as full-text global search.

## Release discipline

Run the complete repository CI before merge. Do not claim global search, live trend coverage or deployed recommendation infrastructure unless the relevant server-side index and production path are actually configured. Preserve existing post IDs, follow relationships, feed preferences and engagement data.
