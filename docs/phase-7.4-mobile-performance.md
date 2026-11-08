# Phase 7.4: Mobile experience and performance

## Implemented

- Detects browser-provided Data Saver, approximate device memory and logical processor count without collecting or transmitting device information.
- Applies a conservative constrained-device presentation profile when Data Saver is enabled, memory is at most 2 GB, or logical processor count is at most four.
- Removes expensive backdrop filters and reduces surface shadows on constrained devices.
- Disables skeleton shimmer when Data Saver is enabled and respects reduced-motion / slow-update preferences.
- Reduces mobile dock blur while preserving the NEXORA midnight-indigo and violet visual system.
- Extends conservative media preparation to low-memory and low-core devices, not only slow/data-saving connections; adjacent videos remain metadata-only on constrained devices.
- Cleans up the connection listener and root data attributes when the app unmounts.

## Privacy and compatibility

Signals are read locally in the browser only. No fingerprint, analytics event, account field or network request is created. Missing or invalid hints default to the standard profile. Existing devices without the Network Information API remain supported.

## Validation

The pure profile policy has unit coverage for missing hints, Data Saver, low-memory devices, low-core devices and invalid values. CI remains the acceptance gate for the full frontend and production build.

## Remaining real-device acceptance

Run cold-start, feed scroll, video playback, navigation, keyboard/input and memory checks on representative low-end Android devices and a current iOS device. Browser hints are heuristics, not a substitute for measured device profiling.


## Media image scheduling

- Video poster images load eagerly only for the active/nearby/preloaded player; offscreen posters are lazy-loaded.
- Feed carousel images, story avatars/media, and gallery thumbnails use asynchronous image decoding; gallery thumbnails are lazy-loaded.
- Sidebar profile imagery decodes asynchronously to reduce main-thread image decode contention during navigation.


## Video poster request budget

- The video element's native poster URL is now withheld from released/offscreen players as well as the separate poster image being lazy-loaded. Active and nearby players retain their poster for a smooth playback handoff.
- The poster visibility decision is covered by unit tests.


## Active video visibility

- Clears the active feed-post identity when its card exits the viewport before another card crosses the activation threshold, preventing stale offscreen playback state.
- Provides a deterministic first-video/first-post fallback for older embedded browsers without IntersectionObserver.

- Clears the active player once its card falls below the same 30% visibility threshold used to activate the next card, avoiding stale playback during partial offscreen transitions.

- Removes nonessential feed-card GPU transforms and active-navigation glow filters on constrained devices; skeleton shimmer is also disabled for low-memory/low-core profiles, not only Data Saver.
