# NEXORA product improvement tranche: discovery quality

**Date:** 2026-11-01  
**Repository:** h123arry/nexora-app-  
**Baseline:** a890db5f7c76395bf037494e8d1af62f2d91c572

## What changed

### Creator diversity in ranked feeds
- The feed ranking now interleaves eligible creators instead of placing several top-scoring posts from one creator next to each other by default.
- Relevance scores remain unchanged; this is a sequence-diversity rule, not a penalty against creators.
- The per-creator total cap remains configurable through the existing `maxPostsPerCreator` option.
- A new `maxConsecutivePostsPerCreator` option allows tests or future feed modes to tune the sequence rule.
- If no alternative creator is eligible, the ranking falls back to the highest-ranked remaining eligible post. Candidates over the per-creator cap remain at the end rather than being silently discarded.

### Why this matters
A discovery feed should help people find more than one creator. TikTok's own explanation describes recommendation diversity as a deliberate way to introduce people to different creators and content, alongside user interaction and content signals. NEXORA now has a deterministic, testable first step toward that experience.

## Existing foundations retained
- Existing ranking signals and grounded explanation reasons.
- Follow, interest, recency, engagement, seen-post and muted/blocked preference inputs.
- Existing Firestore/local preference persistence boundaries.
- No fake engagement, synthetic users, or invented popularity data.

## Next recommended improvements
1. Add an in-product "Why am I seeing this?" explanation using actual ranking reasons, without claiming server-side personalization.
2. Add a visible topic/keyword filter manager that uses the existing preference storage.
3. Add a safe "refresh recommendations" action that clears only recommendation feedback/seen state, not follows, posts, messages, or account data.
4. Validate cross-account and low-end Android journeys in owner-controlled staging before describing personalization as live.

## Verification
The discovery unit test was updated to assert creator interleaving. This GitHub API edit has not been run locally in this environment; run `npm run lint` and `npm run test:unit` before relying on the behavior in a release. Staging and Android verification remain separate owner-controlled steps.
