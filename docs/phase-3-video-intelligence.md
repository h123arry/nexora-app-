# Phase 3 · Video intelligence and production quality

Phase 3 extends the existing feed, media and creator systems. It does not replace the app architecture or rewrite existing posts.

## Existing foundation retained

- The feed selects an active video using viewport visibility and keeps nearby media lazy-loaded.
- `videoPreloadPolicy` bounds speculative preparation to adjacent videos, downgrades slow connections to metadata, and avoids new speculative requests while offline.
- The feed listens for Network Information API changes where supported.
- `VideoPlaybackManager` coordinates one active player, bounded preload elements, mute state and playback positions.
- Reel ranking already consumes viewer-scoped watch, completion, replay, like, share, save and follow signals, along with freshness, interests, diversity and negative feedback.
- The finalized-media trigger validates the Storage object and records a durable `uploaded` state. It intentionally does not invent media metadata or claim a transcode has completed.
- Creator post insights use persisted counters and display unavailable views/rates honestly when source counters are absent.

## Phase 3 improvements merged or in progress

### Network-aware playback
PR #56 is merged to `main`. It updates connection-quality state while the feed remains mounted, disables speculative preloads offline, and preserves the active mounted video instead of releasing it during an offline transition.

### Watch-time integrity
The watch-time policy credits plausible forward playback progress only. Paused updates, seeks, rewinds, non-finite timestamps and long timer gaps are excluded. Completion and meaningful-view signals require actual credited playback, rather than simply seeking the playhead near the end or beyond three seconds.

Watch-history records and session view-deduplication keys are scoped to the active account. Existing unscoped local history is not automatically reassigned because its owner cannot be established safely.

### Playback reliability
Playback position persistence uses a bounded hashed key rather than embedding the complete media URL in a local-storage key. Storage failures no longer prevent playback, old position keys remain readable for continuity, and saved positions are restored only when duration metadata is valid.

## Explicit remaining production gates

The following are not represented as completed:

1. **Transcoding and adaptive renditions:** there is no configured transcoder/Cloud Run pipeline producing verified MP4 renditions or HLS/DASH manifests. The current URL resolver is pass-through, not adaptive streaming.
2. **Thumbnail generation and media metadata:** no trusted worker currently extracts real duration, dimensions, poster frames or codec metadata.
3. **Compression and CDN delivery:** no configured image/video transformation or CDN cache-invalidation lifecycle is verified.
4. **Durable watch-time analytics:** reel preference signals are local viewer-scoped observations. They are not yet a server-authoritative, cross-device watch-time ledger.
5. **Creator retention analytics:** creator insights still rely on post counters; unique reach, average watch duration, completion rate, retention curves and traffic-source breakdowns are not yet supported by authoritative events.
6. **Deployed media verification:** Storage trigger deployment, real upload/finalization, playback across devices and retry/cleanup behavior require the owner's staging Firebase project and real media tests.

These gates require provider configuration and/or real deployed media infrastructure. The app must not show fake quality labels, fabricated thumbnails, invented duration values or unsupported creator metrics while those services are absent.

## Validation expectations

- Run the full repository CI after each Phase 3 PR.
- Keep pure watch-time policy regression tests in `npm run test:unit`.
- Validate upload → finalized Storage object → `mediaAssets` state → feed post → player using staging and at least two signed-in accounts.
- Verify offline/online transitions, data-saver connections, seek/rewind behavior, replay, autoplay rejection, media errors and browser storage denial.
- Preserve existing post IDs, media references, engagement counters and creator data throughout all migrations.
