# TikTok vs NEXORA: product review and implementation checkpoint

**Repository:** h123arry/nexora-app-  
**Branch:** main  
**Baseline reviewed:** 24862a5c5d845e6b8e9bc3cf0b2575da4237d490

## Executive assessment

NEXORA already has a multi-mode feed, immersive vertical viewer, creator profiles with a media grid, Explore search, follow controls, comments, sharing, saving, and a recommendation-ranking foundation. The opportunity is to make these surfaces work as one coherent social journey.

The supplied TikTok references demonstrate a strong content-to-creator loop: identify who made a video, follow immediately, open the creator profile, and continue exploring their work. NEXORA's player had creator actions available elsewhere, but its primary video overlay did not make creator identity and follow conversion immediate. In addition, the Reels viewer was passed a hard-coded false follow state, which could show Follow to someone already following that creator.

## What already exists

| Area | Existing NEXORA foundation | Honest assessment |
| --- | --- | --- |
| Feed | Posts, Following, Friends, Trending, Reels, bounded loading and preferences | Good foundation; validate real-account journeys and empty states |
| Short video | Immersive viewer with touch, wheel and keyboard navigation, comments drawer and player handoff | Good interaction base; strengthen creator context and relationship state |
| Player actions | Spark, comments, share, save, more actions, playback controls and watch-history hooks | Broad coverage; some history and recommendation signals remain device-local |
| Profiles | Identity, follower/following context, pinned content and three-column media grid | Strong destination; validate counts and relationship state against persisted sources |
| Explore | Search currently loaded posts and public creators; users/posts/videos filters | Useful in-session discovery, not global indexed search |
| Recommendations | Interest, follow, recency, engagement and local feedback ranking | Explainable foundation, not a server-trained cross-device recommendation system |

## Implemented in this checkpoint

1. Added creator avatar, display name, username and verification identity directly to the immersive video overlay.
2. Added a visible Follow/Following control beside creator identity, with direct profile navigation. It is hidden for the viewer's own posts.
3. Connected Reels to the actual `followingIds` supplied by FeedView rather than hard-coding the follow state to false. State is derived per displayed creator.
4. Preserved NEXORA's existing violet visual identity and player actions. No fake counts, users, posts or backend capabilities were introduced.

## Remaining priorities

### P0: trust and platform authority
- Complete the trusted moderation case pipeline and enforcement authority.
- Enforce post audiences, private-account relationships, blocks and message restrictions in trusted server/rules paths.
- Complete account-deletion processing and retention verification.
- Establish server-side abuse budgets, upload controls and reliable production media handling.

See `docs/nexora-social-platform-gap-audit.md` for the broader platform capability backlog.

### P1: core social loop
- Make follow/unfollow state and follower/following counts authoritative across feed, profile, search and viewer.
- Make like, save, comment, share and view semantics consistent; verify persistence and prevent duplicate event counting.
- Improve profile-to-content navigation, creator grids, pinned posts and honest empty states.
- Keep For You and Following behavior visibly distinct.

### P1: discovery and recommendations
- Replace loaded-client-data search limits with bounded indexed search when trusted backend and cost controls are ready.
- Persist recommendation events with consent-aware retention and deduplication before using them as platform-wide ranking signals.
- Provide transparent controls such as why-this-post, not-interested, mute creator and reset recommendations, while clearly labeling device-local behavior until sync exists.

### P2: short-video quality
- Test one-active-video playback, pause-on-navigation, Android back, weak-network startup, resume position and media recovery on real Android devices.
- Add creator camera editing and publishing only after media processing, upload validation, moderation and deletion lifecycles are ready.
- Optimize loading and thumbnails using measured low-end Android and constrained-network performance.

## Verification boundaries

This change was made through the GitHub source API. It has not been run through the repository's local test/build commands in this environment, and it does not constitute live Firebase acceptance, two-account staging verification, physical Android testing or production telemetry review. Existing README disclosures about local-only behavior, unconfigured services and production blockers remain in force.
