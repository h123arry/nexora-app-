# Phase 5 — Sound and Media Experience

## Sound experience
- Central Web Audio synthesis avoids large binary sound packs and keeps cues local to the app.
- Per-device controls cover notification, interface, gift-delivery and live-session sounds.
- Preferences are schema-normalized, tolerate unavailable local storage, and default safely.
- Notification cues route through one sound service; playback is best-effort and never blocks notification delivery.
- Only known event IDs can produce audio. The preview is initiated by a direct user gesture to satisfy browser autoplay policy.

## Media reliability foundation retained
- Existing owner-scoped Storage paths, MIME/extension validation, media lifecycle, upload finalization transaction, bounded video preloading, watch-time integrity and media worker remain authoritative.
- The worker can generate image variants, video renditions, HLS VOD and poster frames when deployed and configured. Source code alone is not proof of live processing or CDN delivery.
- No fake media URLs, synthetic analytics, fabricated metadata or placeholder transcoding states are introduced.

## Verification
- Automated tests cover defaults, partial preference records and malformed persisted values.
- Full CI must validate type-check, unit tests, Functions build, rules/emulator suites and production build.

## Operational boundary
The sound layer is browser-local. It does not request microphone permission, capture audio or upload audio. Live transport, transcoding, signed CDN delivery and provider configuration remain separately gated by the existing Phase 3 deployment runbook.

## Phase 5 reliability completion work

- The sound catalogue now includes dedicated spark, comment and share cues in addition to notification, interface, gift and live-session cues. Spark interactions in the video player trigger the shared engine; all playback remains optional and preference-gated.
- Interrupted media uploads retain their Firestore asset record as `failed` with a bounded failure category/message, rather than deleting the record. The same media ID and owner-scoped path can be retried through the existing upload service; storage cleanup is best-effort.
- The playback manager releases speculative video elements when the document is backgrounded, supports explicit per-URL preload release, and reduces the preload budget for metadata-only preparation.
- Media worker event redelivery can reclaim a stale `processing` lease after 15 minutes, while a live processing token remains protected. This supports Eventarc retry after worker termination without allowing concurrent workers to claim an active job.

## Remaining owner-controlled acceptance gates

Source changes cannot prove Cloud Run, Eventarc, CDN signing, private-origin permissions or real staging playback are configured. Those require the staging deployment procedure in the Phase 3 video intelligence runbook. Do not mark those external gates as passed from repository CI alone.
