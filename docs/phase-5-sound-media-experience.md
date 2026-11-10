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
