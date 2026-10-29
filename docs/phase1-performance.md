# Phase 1 performance and media optimization record

Date: 2026-10-29

## Scope

This checkpoint preserves the existing React/Vite/Firebase architecture, feed ranking, pagination, offline synchronization, authentication, and media access boundaries. It applies a focused rendering and video-preparation optimization rather than a broad feed rewrite or an unverified media-processing service.

## Measured build baseline

The measurements below are production build artifact sizes from the repository sandbox. They are laboratory artifact measurements, not real-user performance data.

| Artifact | Before checkpoint | After checkpoint | Result |
|---|---:|---:|---|
| Main application chunk | ~415.1 kB | 415,398 bytes | Essentially unchanged |
| Firebase vendor chunk | ~969.8 kB | 969,830 bytes | Unchanged |
| Main CSS chunk | ~284.6 kB | 284,604 bytes | Unchanged |
| Feed route chunk | ~133.95 kB | 134,377 bytes | Small policy import increase |

The optimization target was runtime work and media network behavior, not arbitrary artifact-size reduction. The build continues to report the existing large Firebase and Matrix chunks. No Brotli/CDN result is claimed because this sandbox does not represent the deployed hosting or delivery layer.

## Implemented

### Feed derived-state memoization

Feed filtering now uses `useMemo` with explicit dependencies. The visible feed slice, active post index, visible video list, and active video index are also memoized. This prevents every interaction-related render from rescanning the full local post collection and rebuilding the same derived lists.

### Viewport-aware video preparation

The feed now uses a small pure policy in `src/utils/videoPreloadPolicy.ts`:

- The active video uses `preload="auto"`.
- At most the immediate previous or next video is prepared.
- Slow or data-saving connections use metadata-only preparation for adjacent video.
- Distant videos use `preload="none"` and are marked releasable.
- Non-video posts never receive media preparation work.

This replaces the previous behavior that could prepare several videos ahead of the active item. Existing mute, playback, visibility, release, and accessibility behavior remains owned by the existing player components.

### Regression coverage

`tests/video-preload-policy.test.ts` covers active playback, adjacent preparation on slow connections, distant release, and non-video behavior. It is included in `npm run test:unit`.

## Existing architecture verified but not rewritten

- Route-level lazy loading already exists for the major destinations.
- Feed pagination and duplicate prevention already exist.
- Feed rendering is bounded by the existing visible-post window rather than rendering an unbounded collection.
- IntersectionObserver-based active-post detection already exists.
- The service worker avoids caching API requests, uploads, Firebase endpoints, and large media files.
- Private chat media remains authenticated and is not publicly cached.
- Existing offline queue and cache tests remain in the unit suite.

Full virtualization was not added because the current feed renders a bounded visible window of eight posts and contains variable-height comments, drawers, and media. Forcing virtualization into that architecture without browser profiling would risk scroll restoration, accessibility, and player lifecycle regressions.

## Important limitations

This environment did not provide a real browser performance session, Android device, Lighthouse run, production CDN, staging Firebase project, or representative real-user traffic. Therefore no claims are made for LCP, INP, CLS, scroll FPS, memory usage, buffering rate, cache-hit rate, or network request counts in production.

The next measurement step should use a staging deployment and at least one narrow Android-class device profile. Capture cold and warm navigation, feed time to first meaningful content, scroll responsiveness through a long session, video startup, data-saving behavior, and memory after repeated route/feed transitions.
