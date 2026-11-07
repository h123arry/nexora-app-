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

## Remaining Phase 4 work

1. Audit and improve ranking signal quality, including recency decay and meaningful engagement without lifetime-popularity dominance.
2. Ensure all search surfaces use consistent eligibility, bounded queries, deduplication and useful relevance ordering.
3. Improve recommendation explanations and feedback loops while retaining account isolation and reset controls.
4. Improve trending quality with time windows, distinct-creator participation and anti-spike protections.
5. Add measurable ranking/search instrumentation that respects analytics consent and avoids collecting unnecessary personal data.
6. Validate performance and pagination on realistic large candidate sets.

## Release discipline

Run the complete repository CI before merge. Do not claim global search, live trend coverage or deployed recommendation infrastructure unless the relevant server-side index and production path are actually configured. Preserve existing post IDs, follow relationships, feed preferences and engagement data.
