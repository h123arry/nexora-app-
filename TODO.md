# Nexora Full Product Pass — TODO

## Outcome 1 — Mobile-first feed is stable and polished

- [ ] The feed works cleanly on narrow Android-sized viewports with safe-area padding, no content hidden behind the bottom dock, no accidental horizontal overflow, and no nested-scroll trap in the primary feed.
- [x] Feed posts use consistent responsive media sizing, readable captions, stable action placement, and compact skeleton/empty states instead of blank or unexplained loading regions.
- [x] The mobile dock uses canonical Home, Explore, Communities, Create, Messages, Activity, and Profile labels, exposes active route state, and retains safe-area insets.

## Outcome 2 — Video playback feels like a finished short-video product

- [x] Video content shows a poster or stable media frame before playback and has clear play, pause, mute, buffering, retry, and unavailable states.
- [x] The TikTok-style action rail remains vertically stacked, thumb-reachable, placed beside the lower half of the video, uses readable compact counts, and reserves safe-area/caption space.
- [x] Videos pause when they leave the viewport, only nearby media is preloaded, and the existing global mute preference remains shared across videos.
- [x] Video failures expose a bounded recovery action and do not leave a permanent empty loading state.

## Outcome 3 — Creation is a coherent premium flow

- [ ] Create supports post, photo, video, reel, voice, poll, pulse, community, and story entry modes through a clear Type → Media → Edit → Details → Preview → Publish flow.
- [x] Creation preserves drafts/autosave, media permission states, audience selection, captions, hashtags, alt text, tagged people, location, media edits, music/trim controls, and preview state; autosave is user-scoped.
- [x] Publishing exposes progress, completed, retry/review, and failure states; upload errors can be recovered without losing the draft or selected media.
- [ ] Users can schedule, pin, control comments/shares/downloads, and select communities or broadcast destinations where supported by existing state.

## Outcome 4 — Explore and discovery are useful even when data is sparse

- [x] Explore is a real destination with search, trending topics, popular creators, suggested communities, and relevant content sections.
- [x] Empty sections have useful explanatory states and clear next actions rather than appearing broken.
- [ ] Discovery surfaces explain relevance where existing ranking data supports it and do not overwhelm the primary content hierarchy.

## Outcome 5 — Navigation and naming are consistent

- [ ] Home, Explore, Communities, Reels, Messages, Activity, Profile, Create, Creator Studio, and Settings use consistent labels across desktop, mobile, menus, and accessibility text.
- [x] Every primary route has a visible active state, preserves scroll position where appropriate, and provides a clear loading fallback for lazy screens.
- [ ] Messages, notifications/activity, communities, profile, creator tools, saved content, wallet, and settings remain reachable without relying on undocumented gestures.

## Outcome 6 — Trust, privacy, and safety are visible and actionable

- [ ] Post, comment, user, and community menus expose report entry points that use the existing report queue and success feedback.
- [ ] Users can find privacy, blocked, restricted, muted, hidden-chat, account deletion, and device/session controls from Settings or the safety center.
- [ ] Private-by-design messaging explains audience and visibility choices in plain language, and auth-gated actions explain how to sign in instead of failing silently.
- [ ] Existing Firestore security rules and durable report behavior remain intact.

## Outcome 7 — Performance is appropriate for Android and mobile networks

- [x] Heavy destinations remain lazy-loaded with meaningful fallback states; creation, auth, system hub, onboarding, universal search, settings privacy, and existing route surfaces are split where practical.
- [x] Responsive media sizing, nearby-video preloading, and stable list rendering reduce bandwidth and layout shift.
- [x] Production build output remains valid; the remaining large main chunk warning is documented by Vite output and was not hidden.

## Outcome 8 — Design-system consistency is maintained

- [ ] Major shared surfaces consume the Nexora tokens and reusable classes instead of drifting into unrelated emerald, cyan, pink, slate, or platinum systems.
- [ ] Buttons, inputs, tabs, cards, avatars, modals, action rails, and bottom-dock states share consistent touch targets, focus rings, hover/pressed states, and reduced-motion behavior.
- [ ] Browser metadata, PWA metadata, route manifest, and brand copy remain synchronized with the Nexora identity.

## Validation and delivery

- [x] Production build passes.
- [x] TypeScript check passes.
- [x] Unit tests pass.
- [x] Firestore authorization regression tests pass.
- [ ] Working tree is clean after commit.
- [ ] Changes are committed and pushed to the connected `main` branch.
