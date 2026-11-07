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
The watch-time policy credits plausible forward playback progress only. Paused updates, seeks, rewinds, non-finite timestamps and long timer gaps are excluded. Completion and meaningful-view signals require actual credited playback, rather than simply seeking the playhead near the end or beyond three seconds. A replay is recorded only when a previously completed video wraps back to its beginning; that viewer-scoped rewatch signal feeds the existing reel ranker and the consented analytics stream.

Watch-history records and session view-deduplication keys are scoped to the active account. Existing unscoped local history is not automatically reassigned because its owner cannot be established safely.

### Playback reliability
Playback position persistence uses a bounded hashed key rather than embedding the complete media URL in a local-storage key. Storage failures no longer prevent playback, old position keys remain readable for continuity, and saved positions are restored only when duration metadata is valid.

### Idempotent media finalization
PR #58 adds a transaction around finalized-object state changes. Duplicate Storage events can no longer overwrite a later `processing` or `ready` state, and a reused media ID cannot change the owner of an existing asset. Only a new asset or the same owner's `pending_upload` record can advance through this verifier. The worker still records `uploaded`, not `ready`, until a real processor is configured.

## Implemented production pipeline (PR #60)

- `services/media-worker` is a Node 22 Cloud Run worker packaged with FFmpeg and Sharp. It validates the owner-scoped finalized Storage object and uses a Firestore processing token to prevent duplicate workers from overwriting a later state.
- Video processing uses ffprobe to extract actual duration, dimensions, container and codec metadata; it generates available 360p, 720p and 1080p MP4 renditions, HLS VOD playlists/segments, and a poster frame.
- Image processing strips orientation metadata and generates responsive WebP variants at bounded widths. Original uploads remain unchanged.
- Generated objects use generation-scoped paths and immutable cache headers. `infra/media-cdn` provisions a HTTPS Cloud CDN backend bucket and a signed-URL key. The source bucket remains private; public bucket access is not a supported shortcut.
- `recordVideoWatchHeartbeat` records authenticated sessions with server timestamps and bounded plausible forward-progress credit. `creatorVideoDaily` stores daily accepted watch seconds, sessions and daily unique viewers. The Creator Dashboard reads those aggregates and labels their limitations.
- The watch-time policy has regression tests for seeks, rewinds, impossible progress and long heartbeat gaps.

## External deployment and acceptance gates

The code and infrastructure definitions are committed, but the following owner-controlled deployment steps are still required before these systems can be called live:

1. Deploy `services/media-worker` to Cloud Run with the correct private `MEDIA_BUCKET` and a least-privilege service identity.
2. Configure Eventarc for `google.cloud.storage.object.v1.finalized`, with authenticated invocation and retry enabled.
3. Apply `infra/media-cdn` using a real domain, DNS, a newly generated signing key stored in Secret Manager, and the private bucket's Cloud CDN origin permissions. Wire signed delivery into the app's playback URL resolver before enabling CDN playback.
4. Deploy Firebase Functions and the new Firestore composite index to the dedicated staging project.
5. Run real staging uploads for video and image assets; verify processing states, metadata, renditions, HLS segments, posters, CDN authorization, second-account playback, duplicate events, retry after failure and abandoned-job recovery.
6. Confirm the creator dashboard populates from real sessions after deployment. Daily unique-viewer totals are not cross-day unique reach. Client playback position remains a signal, so accepted server-timed records are abuse-bounded observations, not cryptographic proof of human attention.

Do not report live deployment or verified CDN playback until those checks pass. Do not show fake quality labels, fabricated thumbnails, invented duration values or unsupported creator metrics.

## Validation expectations

- Run the full repository CI after each Phase 3 PR.
- Keep pure watch-time policy regression tests in `npm run test:unit`.
- Validate upload → finalized Storage object → `mediaAssets` state → feed post → player using staging and at least two signed-in accounts.
- Verify offline/online transitions, data-saver connections, seek/rewind behavior, replay, autoplay rejection, media errors and browser storage denial.
- Preserve existing post IDs, media references, engagement counters and creator data throughout all migrations.
