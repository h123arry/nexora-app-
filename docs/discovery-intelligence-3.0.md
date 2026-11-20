# NEXORA Discovery Intelligence 3.0

## Scope

This tranche improves the existing Discovery and Universal Search systems in place. It does not replace the feed, search index, Firestore projection, privacy checks, or existing client integrations.

## Phase 1 — Recommendation intelligence

- Add a bounded adjacent-interest score to For You ranking. Exact topic affinity remains dominant; related topics receive only a small capped score.
- Expose a human-readable ranking reason when a post is introduced through adjacent-interest exploration.
- Diversify cold-start creator shelves using creators' declared topic categories, rather than treating every creator as one generic category.
- Preserve existing block, mute, hidden-post, not-interested, follow and account restriction boundaries.

## Phase 2 — Trending momentum

- Score topics from a bounded 250-post public sample across current and previous 24-hour windows.
- Require at least two current posts from at least two creators.
- Cap engagement contribution per creator and freshness-weight it.
- Return current/previous post counts, growth multiplier and new/rising/steady status.
- This remains a bounded recent sample, not a complete global analytics index.

## Phase 3 — Search relevance

- Retain all-term matching and typo fallback.
- Add a bounded exact multi-word phrase boost, with stronger weight for title matches than body matches.
- Keep freshness, bounded engagement and verification signals.

## Phase 4 — Cold-start discovery

- Ensure creators can be recommended when a viewer has no interest DNA.
- Use creator-declared topics to diversify the initial recommendation shelf.
- Do not fabricate viewer interests or claim behavioural learning before signals exist.

## Phase 5 — Verification and rollout

- Add regression coverage for adjacent-interest ranking, bounded exploration, cold-start diversity, exact phrase relevance and trending momentum.
- Run the repository's normal type-check, unit, Functions build and CI workflows before merge.
- Existing search-index backfill and staging deployment requirements remain unchanged. Do not target production as a substitute for staging.

## Operational boundaries

The recommendation ranking is deterministic and signal-based, not a trained machine-learning model. Trending is bounded by the current 250-public-post query. Search still uses the existing bounded candidate retrieval and Firestore index. These limits are explicit and should be measured before any scale claim.
