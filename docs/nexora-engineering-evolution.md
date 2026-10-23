# Nexora engineering evolution

## Scope

This continuation preserved the React 19/Vite/TypeScript/Firebase architecture and focused on measurable correctness and resource-boundary improvements. No Android, Flutter, Go, Appwrite, Supabase, FFmpeg, Grafika, or Fresco runtime was added to the browser bundle.

## Research patterns and decisions

- **AndroidX Media3:** adopted the lifecycle idea of explicit prepare/play/pause/release and a replaceable player boundary conceptually. The web implementation remains `HTMLVideoElement` plus `VideoPlaybackManager`; Media3 itself is Android/Kotlin and is reserved for a future native Android client.
- **TikTok-Flutter reference:** used only as a cautionary interaction reference. Adjacent preloading, active-item playback, and pause-offscreen patterns already exist in Nexora's player; this pass tightened resource release and data-saver behavior rather than importing Flutter code. The selected repository is a community clone with stale mobile dependencies, not official TikTok code.
- **CloudWeGo Kitex/Netpoll:** applied the transferable ideas of bounded work, explicit lifecycle, service boundaries, and observability thinking. No Go microservice was introduced because Firebase already supplies the current backend boundary.
- **Appwrite and Supabase:** used as architecture comparisons for typed service boundaries, least-privilege authorization, and asynchronous work. No backend migration was justified or attempted.
- **FFmpeg/MobileFFmpeg:** documented as a future server-side worker concern only. MobileFFmpeg is archival; client-side arbitrary transcoding would add excessive bundle, CPU, licensing, and security cost.
- **Grafika:** treated as an archival Android graphics reference. The transferable lesson is cleanup of visual loops and scarce resources; no Android graphics code was used.
- **Fresco:** adapted as web image-loading principles: staged loading, metadata validation, bounded work, placeholders, and failure states. No Fresco dependency was added.

## Implemented changes

### Feed and Firestore access

- Added `getGlobalPostsPage()` with cursor-based pagination, bounded page sizes, `hasMore`, and a retained Firestore cursor.
- Reduced the default global feed fetch and realtime feed subscription from 150 to 50 records.
- Added service-boundary deduplication by document ID before caching or returning posts.
- Added bounded realtime listeners for notifications, communities, pages, follows, chats, messages, and presence.
- Ordered and bounded message history to 200 records so chat listeners do not grow without limit.

### Messaging reliability

- Deduplicated message snapshot records by document ID.
- Preserved deterministic timestamp ordering in the active inbox listener.
- Rolled back optimistic messages and surfaced a user-facing retry message when Firestore rejects a send.
- Kept existing participant-based Firestore authorization and listener cleanup intact.

### Video lifecycle

- Player unregistration now pauses and releases the active element before removing it from the shared manager.
- Preloading skips Save-Data and slow 2G connections.
- Playback errors now stop the active player, clear buffering state, and expose the existing retry UI.
- Stalled/aborted media states are surfaced through the existing loading overlay.
- Delayed quality-switch timers are cleared on changes/unmount, and quality recovery routes back through the shared playback manager.
- Existing visibility, intersection, mute, preload, and active-player coordination were preserved.

### Media validation and creator cleanup

- Added `src/utils/mediaValidation.ts` with bounded image/video/audio sizes, supported-format checks, image dimension checks, video duration limits, and browser metadata decoding.
- Wired image and video uploads through validation before accepting files.
- Added cleanup for preview object URLs, camera tracks, media recorders, interval timers, and upload timers.
- Limited multi-image selection to ten files in one selection event.
- Kept expensive transcoding out of the client; existing IndexedDB persistence remains the local fallback for recorded/uploaded video.

## Verification

- `npm run lint` — passed.
- `npm run build` — passed.
- `npm run test:rules` — passed: 10 Firestore authorization regression tests.
- `git diff --check` — passed.

The production build still reports the repository's pre-existing Firebase dynamic/static import warning and large application chunk warning. These are warnings, not build failures, and should be addressed in a future code-splitting pass after route boundaries are measured.

## Remaining limitations and deferred work

- The current client still uses a Firebase realtime feed subscription rather than wiring the new cursor API into an infinite-scroll UI. The API is available for a measured follow-up without changing current feed behavior.
- Client validation is defense-in-depth only. Trusted Firebase Storage rules or a server-side media worker must validate content type, size, metadata, and authorization again.
- There is no deployed server-side transcoding/thumbnail pipeline in this repository. Adding FFmpeg would require a managed worker, job state, quotas, cleanup, output validation, provenance, and legal review.
- Firebase rules and emulator coverage are present and passing, but a production deployment should also verify Storage rules, App Check, rate limits, backups, alerting, and secrets configuration in the actual Firebase project.
- Advanced adaptive HLS/DASH quality selection is not claimed because the current media records are fixed URLs; the existing quality UI remains a presentation affordance until the delivery backend provides multiple renditions.

## Primary sources

- https://github.com/androidx/media
- https://developer.android.com/media/media3
- https://github.com/salvadordeveloper/flutter-tiktok
- https://github.com/cloudwego/kitex
- https://github.com/cloudwego/netpoll
- https://github.com/appwrite/appwrite
- https://appwrite.io/docs/advanced/self-hosting
- https://github.com/supabase/supabase
- https://supabase.com/docs/guides/getting-started/architecture
- https://ffmpeg.org/legal.html
- https://github.com/tanersener/mobile-ffmpeg
- https://github.com/google/grafika
- https://github.com/facebook/fresco
- https://frescolib.org/docs/
