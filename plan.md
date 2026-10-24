# Nexora Full Product Pass

## Scope

This pass turns the current Nexora shell into a stronger mobile-first social product by improving the core loop: discover something interesting, watch or read it smoothly, interact, follow the creator, and create something yourself. Existing Firebase, authentication, routing, feed, messaging, notifications, creator tools, AI surfaces, and security rules remain in place; the work should reuse those capabilities rather than replacing them.

## Implementation approach

### Phase 1 — Mobile feed and video loop

- Normalize mobile viewport and safe-area behavior so the feed, bottom dock, modals, and keyboards do not create nested-scroll or obscured-content failures.
- Improve feed loading states with reusable skeletons and compact empty states.
- Make media cards responsive and consistent: poster-first video rendering, stable aspect ratios, graceful fallback, and controls that do not cover captions.
- Preserve the TikTok-style action rail but give it a reusable component class, readable compact counts, lower-half placement, and touch-sized controls.
- Add viewport-aware playback behavior: pause offscreen videos, preload only nearby media, preserve mute preference, and expose a clear play/buffering state.

### Phase 2 — Creation and discovery

- Refine the existing `MediaCreationEngine` into a coherent Type → Media → Edit → Details → Preview → Publish flow.
- Keep drafts/autosave, media permissions, audience controls, scheduling, captions, hashtags, alt text, music/trim controls, polls, voice, stories, reels, and upload progress.
- Add robust retry/error states for uploads and an honest publish status treatment.
- Make Explore a first-class destination with search, trending topics, popular creators, communities, and suggested content using existing data services.
- Keep relevance explanations visible without making the interface noisy.

### Phase 3 — Navigation and trust

- Standardize route naming and labels around Home, Explore, Communities, Reels, Messages, Activity, Profile, Create, Creator Studio, and Settings.
- Add/finish visible active states and consistent mobile/desktop navigation behavior.
- Surface existing report, privacy, blocked, restricted, muted, account deletion, and safety functionality through clear entry points.
- Add a consistent moderation affordance to post/user/community menus while preserving the existing `ReportModal` and durable report queue.
- Ensure privacy defaults and “private by design” messaging are understandable rather than decorative.

### Phase 4 — Performance and design-system consistency

- Keep heavy destinations lazy-loaded and improve Suspense fallbacks.
- Reduce eager imports and avoid loading media-heavy modules until needed where practical.
- Migrate remaining major surfaces to the Nexora token classes and reusable primitives without changing semantic status colors.
- Keep `manus-routes.json` synchronized with the actual top-level route surface.
- Validate build, TypeScript, unit tests, Firestore rules, and the rendered primary feed flow.

## Project structure

- `src/App.tsx`: shell, navigation, global overlays, route composition, and shared state.
- `src/components/FeedView.tsx`: feed tabs, stories, composer entry, media post list, comments, and discovery transitions.
- `src/components/FeedPostCard.tsx`: post surface and inline media/action presentation.
- `src/components/NexoraVideoPlayer.tsx` and `src/components/ImmersiveVideoViewer.tsx`: video playback, action rail, overlays, and viewer behavior.
- `src/components/MediaCreationEngine.tsx`: creation wizard, drafts, media editing, upload/publish states, and advanced options.
- `src/components/ExploreView.tsx`, `RightSidebar.tsx`, and discovery services: search, trends, creators, communities, and relevance explanations.
- `src/components/ReportModal.tsx`, `PrivacySettingsModal.tsx`, `SettingsView.tsx`, and Firebase data services: safety, privacy, reporting, and account controls.
- `src/index.css`: Nexora tokens, shared surfaces, responsive primitives, and accessibility states.
- `tests/`: unit and Firestore authorization regression coverage.

## Design direction

### Candidate styles

- Probability 0.06 — **Indigo Signal Console**: dense, data-rich social UI with electric violet signal accents.
- Probability 0.05 — **Nocturne Editorial**: quiet dark editorial surfaces with luminous metadata and restrained motion.
- Probability 0.04 — **Creator Stage**: cinematic media-first surfaces with a performance-oriented action rail.

### Chosen style: Indigo Signal Console with Creator Stage media moments

- **Design movement:** premium dark social software combining a calm indigo canvas with electric-violet signal highlights and cinematic media overlays.
- **Core principles:** content first; touch-first controls; clear hierarchy; graceful states instead of dead ends.
- **Color philosophy:** `#090714` makes long sessions comfortable, `#120E2B` separates content without flat black, and the `#8A3FFC → #1600A3` gradient gives Nexora a recognizable creative signal.
- **Layout paradigm:** persistent desktop rails with a focused feed stage; on mobile, a full-bleed content stream with a stable bottom dock and contextual controls.
- **Signature elements:** violet signal gradient, compact monospaced metadata, and lower-half media action rails with soft black readability gradients.
- **Interaction philosophy:** controls should feel immediate and thumb-reachable; state changes should be visible through color, count changes, and small motion, not blocking dialogs.
- **Animation:** short 160–240ms transitions, restrained spring for sheets, reduced-motion support, no decorative motion competing with media.
- **Typography system:** Plus Jakarta Sans for content and controls, JetBrains Mono for counts, labels, timestamps, and technical metadata.
- **Brand essence:** a living, creator-led social network for people building, sharing, and belonging; personality: intentional, luminous, human.
- **Brand voice:** direct, warm, and signal-oriented. Example lines: “Find your people.” and “Share a moment that moves the network.”
- **Wordmark and logo:** the existing N mark and gradient wordmark remain the source of truth; do not replace supplied branding with generic text.
- **Signature brand color:** electric violet `#4B10F2`, brightened through `#8A3FFC` for active creative moments.

## Material and constraints

- Reuse existing supplied Nexora visual references and existing project media; no new external assets are required for this pass.
- Preserve current Firebase and local persistence behavior.
- Do not introduce destructive data migrations.
- Keep the app usable for visitors; auth-gated actions should explain the next step rather than fail silently.
- Keep commit/push on the connected `main` branch after validation.
