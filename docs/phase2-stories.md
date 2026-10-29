# Phase 2 Stories implementation record

Date: 2026-10-29

## Implemented

The existing StoryRail was upgraded in place. It now supports:

- Text stories through the existing Firestore flow.
- Image and video stories using the existing resumable Storage upload service.
- Client-visible upload progress and recoverable publish errors.
- Cleanup of uploaded Storage objects and media metadata if Story persistence fails.
- Per-author story grouping and sequential navigation through a creator's active stories.
- Previous, next, close, keyboard navigation, and mobile-friendly horizontal browsing.
- Viewed/unviewed ring state persisted in the current browser session.
- Genuine Firestore viewer records at `stories/{storyId}/views/{viewerId}`.
- Video controls, muted autoplay to respect browser restrictions, and pause on document backgrounding.
- Logical expiration filtering for active story subscriptions.

## Data-layer protections

Firestore rules now validate:

- Story ownership and identity against `publicProfiles`.
- Allowed Story fields and caption length.
- Text versus image/video media metadata.
- Media ID binding to the Story document ID.
- A maximum 24-hour expiration window using the trusted create timestamp.
- Owner-only Story deletion.
- Viewer-record ownership and creator-only viewer-list reads.
- Expired public Stories are rejected for direct non-owner reads.

The rules remain additive and backward-compatible with existing text stories. The existing Storage owner convention is reused; Story recipients consume the intentionally stored Firebase download-token URL from an allowed public Story record rather than receiving a new publicly readable Storage path.

## Explicit limitations

- The current product rules support public Stories only. A followers-only or custom-audience Story mode was not added because the current follow/profile privacy model does not provide a single trusted query-safe audience predicate. It should be added through a server-mediated read path or a carefully indexed audience projection rather than weakening Firestore rules.
- Physical deletion of expired Story media is not automated by this checkpoint. Expired Stories are logically excluded from the active application flow, while a scheduled trusted cleanup worker remains an operational follow-up.
- Highlights, Story reactions, Story replies, and Story-specific notifications remain future work. The existing messaging and notification flows were not given fabricated Story events.
- Viewer IDs are protected at the Firestore layer; the current rail does not yet expose a creator-only viewer-list management screen.

## Validation

- Frontend TypeScript validation passed.
- Firestore authorization suite passed all 21 tests, including Story media, expiration, viewer records, forged metadata, and owner restrictions.
