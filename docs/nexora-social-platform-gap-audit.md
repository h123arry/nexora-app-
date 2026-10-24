# Nexora social-platform gap audit

**Audience:** Nexora product, engineering, trust & safety, and operations leadership  
**Purpose:** Decide what must be added before Nexora can credibly operate as a serious TikTok/Instagram-class social platform.  
**Status basis:** The 17 area audits supplied for this review; no implementation work is proposed or performed by this report.

## Executive assessment

Nexora has a meaningful foundation: Firebase Auth, owner-bound Firestore rules, public/private profile separation, real post and text-story persistence, bounded feed and inbox listeners, resumable Storage uploads, browser capture/playback, report and appeal intents, PWA shell behavior, and a substantial product UI. The central issue is not a lack of screens. It is that many screens imply capabilities whose authoritative backend, lifecycle, safety, or measurement systems do not exist yet.

The highest-risk omissions are shared platform foundations: a trusted asynchronous account-deletion worker; server-authoritative moderation and abuse controls; durable event/analytics infrastructure; privacy/audience enforcement; and production media processing. These are prerequisites because adding recommendations, live, messaging media, monetization, search indexes, or AI memory before them creates data-integrity, safety, deletion, and trust debt.

The roadmap below contains **20 deduplicated capabilities**, ordered by delivery priority. P0 items are trust, safety, privacy, and data-integrity prerequisites. P1 items are the competitive product capabilities that make Nexora recognizably social-platform grade after the foundations exist. P2/P3 items are valuable differentiators and scale improvements, but should follow the prerequisites. A capability marked “partially present” is not a claim that the current UI is absent; it means the audit found that the current implementation is simulated, local-only, incomplete, or missing trusted production infrastructure.

## Prioritized capability backlog

### P0 — trust, safety, privacy, and data integrity prerequisites

#### 1. Deploy the trusted asynchronous account-deletion cleanup worker

- **Current implementation status:** **Partially present / critical gap.** The client can create a deduplicated, append-only `delete_account` request and export a bounded JSON snapshot. Firestore rules correctly prevent the client from changing lifecycle status or deleting protected records. No trusted worker, Firebase Functions/Cloud Run job, Admin SDK processor, Auth deletion, Storage sweep, retry/dead-letter path, or completion verification was found. Deletion is therefore an intent, not a completed capability.
- **Why users need it:** Users need a credible way to leave the service and know that their Auth identity, private profile, public projection, owned posts/media, derived renditions, follows, messages and message assets, notifications, device tokens, analytics, search/recommendation records, AI memory, drafts, scheduled jobs, and other UID-owned data are deleted or anonymized according to a disclosed retention policy. Without it, requests can remain pending indefinitely and orphaned or copied data accumulates.
- **Benchmark relevance:** Instagram and TikTok distinguish deletion from ordinary content removal, expose processing/cancellation windows, and disclose backup/legal-retention limits. Firebase requires trusted administrative handling for Auth deletion and recursive data cleanup. Sources: [Instagram deletion](https://help.instagram.com/370452623149242), [TikTok deletion](https://support.tiktok.com/en/account-and-privacy/deleting-an-account), [Firebase Auth management](https://firebase.google.com/docs/auth/admin/manage-users), [Firebase recursive deletion](https://firebase.google.com/docs/firestore/solutions/delete-collections).
- **Scope:** Keep the current client request flow, but add a server-owned state machine such as `pending → processing → completed/failed/cancelled`, with one active lease per UID, bounded pagination, idempotency keys, retries, dead-letter handling, restricted audit checkpoints, and owner-visible status. Inventory every current and future Firestore collection/subcollection, Storage prefix and derivative, search/index/cache record, notification/token, live/replay asset, moderation/analytics record, and provider copy. Revoke Auth sessions and delete the Auth user only after policy, legal holds, shared-content handling, and retention exceptions are applied. Add orphan sweeps, reconciliation, alerts, emulator/integration tests, and a completion receipt. LocalStorage/IndexedDB clearing must be disclosed as device-local best effort, never presented as server erasure.
- **Dependencies:** Least-privilege trusted runtime and Admin SDK; canonical data inventory; retention/legal-hold policy; reauthentication/confirmation; idempotent queue and observability; integration tests; all future durable-data schemas must register their deletion contract before launch.
- **Priority:** **P0 — launch blocker for complete privacy claims and a dependency of nearly every durable feature.**

#### 2. Establish a trusted moderation authority, case pipeline, appeals, and Account Status

- **Current implementation status:** **Partially present / simulated operations.** `moderationReports` and `moderationAppeals` are real, bounded, owner-scoped, append-only client intents. Report UI and post-appeal submission exist. Reviewer queues, case assignment, policy decisions, evidence snapshots, enforcement actions, strikes, notifications, SLAs, and independent appeal outcomes do not. The admin console is a prototype whose privileged client writes are rejected by hardened rules.
- **Why users need it:** Reporting must protect people even when the reporter closes the browser; creators need understandable decisions and a path to correction; operators need safe, auditable tools to remove content or restrict accounts without weakening client rules. Local reports and client “resolve” buttons cannot protect users or support defensible enforcement.
- **Benchmark relevance:** Instagram documents reporting and Account Status/Support Requests; TikTok describes machine-plus-human review, enforcement explanations, strikes, and appeals. Sources: [Instagram reporting](https://help.instagram.com/2922067214679225/), [Instagram Account Status](https://help.instagram.com/338481628002750/), [Meta appeals](https://transparency.meta.com/policies/improving/appealed-content-metric/), [TikTok moderation](https://newsroom.tiktok.com/en-eu/fulfilling-commitments-dsa-update).
- **Scope:** Add trusted report ingestion with deduplication, target snapshots/hashes, severity, anonymous reporter handling, evidence retention, policy version, automation/human provenance, case assignment, reviewer RBAC, decision reason codes, reversible/scoped enforcement, strike expiry, reporter and creator notifications, appeal eligibility/status, and audit events. Cover posts, comments, profiles, DMs, stories, live, impersonation, IP, child safety, self-harm, and illegal content. Replace the five-minute review promise with truthful status/SLA language.
- **Dependencies:** Admin SDK/custom claims or equivalent operator gateway; policy registry; secure evidence store; notification pipeline; App Check/quotas; trusted deletion and retention worker; QA and human-review operations.
- **Priority:** **P0 — required before live, broad media, public communities, or serious safety claims.**

#### 3. Implement server-enforced abuse, spam, and coordinated-manipulation controls

- **Current implementation status:** **Mostly missing / local simulation.** Client lockouts, local block/mute/not-interested state, NIDA/anti-spam screens, and heuristic scores are not enforcement. App Check initializes but production enforcement and behavioral controls are not evidenced.
- **Why users need it:** Rate limits, velocity detection, new-account friction, duplicate/link analysis, bot signals, report-brigade detection, upload quarantine, and strike escalation protect users from harassment, spam, fake engagement, credential abuse, and cost attacks. Browser-local controls are trivially bypassed and do not propagate across devices.
- **Benchmark relevance:** TikTok and Instagram combine platform controls, safety eligibility, reporting, and enforcement; Firebase states App Check reduces unauthorized clients but does not eliminate abuse. Sources: [Firebase App Check](https://firebase.google.com/docs/app-check), [TikTok safety/account security](https://support.tiktok.com/en/safety-hc/account-and-user-safety/account-safety), [TikTok moderation](https://newsroom.tiktok.com/en-eu/fulfilling-commitments-dsa-update).
- **Scope:** Add authenticated per-account/device/IP budgets, SMS/recovery/DM/follow/comment/upload quotas, idempotency and replay protection, duplicate-content/link burst detection, risk scoring, challenge/escalation, anti-collusion signals, quarantine/review states, and server-side strike effects. Retain local feedback as UX only. Instrument security events with privacy-aware retention and alert thresholds.
- **Dependencies:** Trusted write gateways/workers; App Check; identity/device-risk signals; moderation case model; distributed rate-limit store; abuse telemetry and kill switches.
- **Priority:** **P0 — prerequisite for growth, messaging, live, monetization, and reliable metrics.**

#### 4. Make privacy settings, account audiences, and relationship safety authoritative

- **Current implementation status:** **Partially present / enforcement gap.** Settings schemas and UI vocabulary exist, but many controls are local React/localStorage state. Post audience values are stored, while public read rules do not consistently enforce followers, circles, community, or only-me visibility. Close Friends, private-account requests, block/restrict/mute, message requests, mentions/tags, downloads, and collaboration permissions are not a coherent server policy.
- **Why users need it:** Users need privacy choices to follow the account across devices and surfaces. A “private” or “close friends” label that only changes a preview is a privacy failure; blocks and restrictions must stop server delivery in feed, search, DMs, communities, notifications, calls, and recommendations.
- **Benchmark relevance:** Instagram and TikTok provide public/private accounts, per-post/story audiences, Close Friends/Friends controls, message restrictions, and download/privacy settings. Sources: [TikTok private accounts](https://support.tiktok.com/en/account-and-privacy/account-privacy-settings/making-your-account-public-or-private), [TikTok video visibility](https://support.tiktok.com/en/account-and-privacy/account-privacy-settings/video-visibility), [Instagram Close Friends](https://help.instagram.com/476003390920140/), [Firebase security](https://firebase.google.com/docs/firestore/security/get-started).
- **Scope:** Create one canonical server-backed privacy document and relationship-edge model. Add public/private state, follow requests/approval/removal, block/restrict/mute, Close Friends membership, message/mention/tag/collaboration/download controls, and audience-aware query/delivery authorization. Use secure materializations or server APIs where Firestore queries cannot evaluate membership. Test every audience combination, deletion, block propagation, and media URL access.
- **Dependencies:** Canonical graph and settings schemas; server-mediated reads/writes; Storage/CDN access policy; notification/search/feed integration; migration from local keys; lifecycle cleanup.
- **Priority:** **P0 — required before private sharing, stories, communities, or claims of user control.**

#### 5. Build a trusted event, analytics, and experimentation foundation

- **Current implementation status:** **Partially present / not authoritative.** Post counters, local recommendation events, creatorAnalytics reads, activity records, and some broadcast fields exist. Client-derived metrics, formulas, seeded values, localStorage profiles, random simulation, and client-writable analytics are not trustworthy measurement.
- **Why users need it:** Creators need reliable reach, watch time, retention, audience, and conversion metrics; product teams need exposure logs, guardrails, and rollback; safety teams need report and enforcement SLAs. Without one event contract, Nexora cannot know whether a feature helps or harms users.
- **Benchmark relevance:** Instagram Insights, TikTok Studio, and Trial Reels use dated, event-backed metrics and controlled exposure. Sources: [Instagram Insights](https://help.instagram.com/788388387972460), [TikTok Studio](https://newsroom.tiktok.com/en-us/helping-creators-bring-creativity-to-life-with-tiktok-studio), [Instagram Trial Reels](https://creators.instagram.com/blog/instagram-trial-reels?locale=en_GB), [Firebase App Check](https://firebase.google.com/docs/app-check).
- **Scope:** Define versioned events for exposure, impressions, watch milestones, completion, likes/comments/shares/saves/follows/searches, delivery, reports, appeals, publish, processing, and payouts. Ingest through trusted endpoints, deduplicate, aggregate with time windows and privacy thresholds, and maintain metric definitions/freshness. Add server-controlled feature flags, cohort assignment, holdouts, exposure logging, guardrails, audit history, and kill switches. Replace synthetic actors, random activity, formulas, and hard-coded revenue/health values in production paths.
- **Dependencies:** Trusted ingestion and aggregation runtime; privacy/retention policy; data warehouse or rollup store; remote configuration; dashboards; deletion/export coverage.
- **Priority:** **P0 — platform operating foundation; required before ranking, creator analytics, monetization, or re-engagement.**

#### 6. Deliver a trusted server-side media pipeline and lifecycle

- **Current implementation status:** **Partially present / major infrastructure gap.** Browser validation, camera capture, resumable Storage upload, poster extraction, playback controls, and a single `videoUrl` post path are real. Timer-based processing, Auto-Cut, captions/transcription, quality selection, moderation, rendition generation, and cross-device durable processing state are simulated or absent.
- **Why users need it:** Uploaded media must be safe, playable on varied devices, bandwidth-efficient, captionable, and recoverable when jobs fail. Publishing a raw client URL or pretending a trim/progress timer changed the asset causes incompatibility, data loss, and creator distrust.
- **Benchmark relevance:** TikTok/Instagram creator tools include editing, captions, sound, and adaptive delivery; Meta documents multiple encodings, HDR/SDR handling, and device-aware Reels delivery. Sources: [TikTok editing](https://support.tiktok.com/en/using-tiktok/creating-videos/editing-tiktok-videos-and-photos), [TikTok accessibility](https://support.tiktok.com/en/using-tiktok/creating-videos/accessibility), [Meta video encoding](https://engineering.fb.com/2022/11/04/video-engineering/instagram-video-processing-encoding-reduction/).
- **Scope:** Add `MediaAsset`/`MediaJob` records, authenticated upload-session creation, quarantine and server MIME/codec/duration/dimension/malware/moderation checks, idempotent processing jobs, normalized compatible SDR renditions, posters/thumbnails, caption tracks/transcripts, adaptive manifests or deterministic device/network renditions, status/retry/cancel UI, CDN/private delivery, quotas, orphan cleanup, and source/derivative lifecycle deletion. Keep browser checks as defense-in-depth; do not add client FFmpeg/codecs.
- **Dependencies:** Cloud Run/Functions worker and Storage design; queue/job state; moderation/caption providers; CDN; deletion worker; Storage and integration tests.
- **Priority:** **P0 — required for dependable short video, stories, live replay, messaging media, and accessibility.**

#### 7. Replace the simulated creator editor with a minimal real timeline and accessible captions

- **Current implementation status:** **Partially present / visible promises exceed output.** The composer has trim state, media types, selected music, overlays, and a hard-coded voice transcript, but publish uploads the raw Blob and does not reliably apply edits. No timed caption track or real speech-to-text flow is established.
- **Why users need it:** Creators need the edit they selected to be the asset viewers receive; viewers need timed captions and transcripts. A polished editor that silently discards trim, overlays, audio, or transcript choices is worse than a smaller truthful editor.
- **Benchmark relevance:** TikTok and Instagram document trim/split/reorder, speed, transitions, audio/voiceover, editable captions, language selection, and text-to-speech. Sources: [TikTok editing](https://support.tiktok.com/en/using-tiktok/creating-videos/editing-tiktok-videos-and-photos), [TikTok captions](https://support.tiktok.com/en/using-tiktok/creating-videos/accessibility), [Instagram Edits captions](https://help.instagram.com/9347605771917220/).
- **Scope:** First release: one or more clips, trim/split/reorder, clip speed, mute/volume, one rights-cleared or original audio track, timed text, preview, server export, creator review, viewer caption toggle/transcript, and alt text for images. Label or hide Auto-Cut/advanced effects until they produce output. Add language, line editing, safe wrapping, caption provenance, and transcript retention/deletion.
- **Dependencies:** Media pipeline; timeline/project schema; speech-to-text; audio rights metadata; caption rendering; draft persistence; lifecycle cleanup.
- **Priority:** **P0 — core creator trust and accessibility capability after the media job foundation.**

#### 8. Make messaging fully durable and server-authoritative, including delivery, receipts, media, and lifecycle

- **Current implementation status:** **Partially present.** NewInboxView has real participant-scoped Firestore reads, pagination, optimistic rollback, typing paths, and some receipt writes. LocalStorage-first hydration, legacy timer-based sent/delivered/read simulation, placeholder attachments, local reactions/delete/edit, incomplete groups, and absent notification fan-out create cross-device divergence. Calls remain simulated.
- **Why users need it:** A social platform needs messages that converge across devices, do not disappear when browser storage is cleared, distinguish accepted/delivered/read, and protect private media. Users also need safe message requests, block/restrict/report, and honest offline failure states.
- **Benchmark relevance:** Instagram and TikTok support message requests, group chats, replies/reactions, media/voice messages, mute controls, and read/activity settings; Firebase documents FCM as the trusted delivery channel. Sources: [Instagram messaging](https://help.instagram.com/155540431448273/), [TikTok DMs](https://support.tiktok.com/en/using-tiktok/messaging-and-notifications/direct-message-settings), [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging).
- **Scope:** Make Firestore/server data canonical with deterministic conversation/message IDs, idempotency, server timestamps, pending/failed/reconciled state, unread counts, cursor pagination, and multi-device receipts. Add message requests, mute/block/restrict/report, delete-for-me/unsend semantics, private validated image/short voice-note assets, push delivery, and deletion policy for shared conversations. Define group membership separately from a mutable participants array.
- **Dependencies:** Message schema and indexes; FCM/token pipeline; private Storage delivery; graph safety; moderation cases; lifecycle worker; offline persistence and integration tests.
- **Priority:** **P0 — a core social expectation and privacy boundary.**

#### 9. Replace fake calls and Live UI with a safe, server-authoritative realtime transport

- **Current implementation status:** **Mostly missing / simulated.** LiveView toggles local state and chat; CallScreen simulates ringing, participants, network quality, and active calls. There is no WebRTC/managed provider, signaling, session persistence, participant ACL, or real viewer presence.
- **Why users need it:** Calling and live broadcast are high-trust surfaces. A button that appears connected without transmitting audio/video is misleading; launching without moderation, permissions, age policy, reconnect, and replay deletion creates acute safety and privacy risk.
- **Benchmark relevance:** TikTok LIVE and Instagram Live Rooms provide broadcast lifecycle, co-hosts/guests, moderators, low-latency chat/reactions, audience controls, and safety tools. Sources: [TikTok LIVE](https://newsroom.tiktok.com/enhancing-the-live-community-experience-with-new-features-updates-and-policies-ca?lang=en-CA&ref=fomoera.com), [Instagram Live Rooms](https://about.instagram.com/blog/announcements/doubling-up-on-instagram-live-with-live-rooms), [Firebase App Check](https://firebase.google.com/docs/app-check).
- **Scope:** Choose a managed live provider or operate WebRTC/ingest/SFU/CDN deliberately. Implement authenticated preflight, creator eligibility/age/audience, session state, transport adapter, playback, reconnect/failover, server presence, text chat/reactions with slow mode and moderation, report-live/report-comment, participant roles, guest/co-host admission, captions, recording consent, replay expiry, stream-health telemetry, and kill switch. Start with real 1:1 audio/video or a narrow broadcast MVP; keep unavailable states honest.
- **Dependencies:** Provider/transport decision; session and participant schemas; moderation/age policy; FCM/incoming-call path; media pipeline; deletion worker; cost and regional policy.
- **Priority:** **P1 product capability, but no public launch before P0 trust/moderation foundations.**

#### 10. Make follows, communities, groups, and collaboration a real social graph

- **Current implementation status:** **Partially present / fragmented.** Follows have Firestore create/delete rules and UI, but duplicate/idempotency, follower queries, private requests, counters, and notification fan-out are incomplete. Communities are durable as owner-created documents but membership/governance is local. Groups, invite roles, collaboration, and much community moderation are simulated.
- **Why users need it:** The graph should reliably determine who can see, message, invite, collaborate with, or moderate whom. Users need mutuals, follower lists, private requests, remove-follower, durable communities, group roles, and consented co-authorship across devices.
- **Benchmark relevance:** TikTok Friends/following and account privacy use relationship state; Instagram Close Friends and collaborative posts demonstrate curated subgraphs and explicit co-author consent. Sources: [TikTok graph recommendations](https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content), [Instagram collaboration](https://help.instagram.com/5861247717337470/), [Instagram Close Friends](https://help.instagram.com/476003390920140/), [Firebase security](https://firebase.google.com/docs/firestore/security/get-started).
- **Scope:** Use canonical edge IDs and typed targets, paginated followers/following, mutuals, server-maintained count projections, follow requests, graph safety edges, community member/join-request/role/ban/mute/report/pin models, group invite/role/moderation models, and one-owner/one-collaborator invitation acceptance with shared attribution and removal rules. Remove seeded members/random stage activity from production paths.
- **Dependencies:** Privacy/audience model; trusted notifications; moderation/RBAC; event pipeline; indexes and pagination; deletion cleanup; migration from local state.
- **Priority:** **P1 — required for relationship-first discovery, communities, collaboration, and safe sharing.**

### P1 — competitive product capabilities

#### 11. Build a trusted server-side search, Explore, hashtags, and trends system

- **Current implementation status:** **Partially present / bounded client prototype.** Explore/Search UI, debouncing, recent searches, typed sections, hashtag filtering, and dynamic tag counts exist. Retrieval scans only loaded arrays (roughly bounded posts/profiles/communities); filters do not consistently narrow data; there is no index, canonical hashtag page, autocomplete, time-windowed trend model, or eligibility join.
- **Why users need it:** Users need to find people and content beyond the current 50/500-item client window, discover safe topics, reach canonical hashtag pages, and understand why a topic is trending. Creators need demand/content-gap discovery rather than hard-coded pills.
- **Benchmark relevance:** TikTok Discover/Search and Creator Search Insights, plus Instagram Explore/hashtag discovery, are ranked, personalized, filtered, and safety-aware. Sources: [TikTok Discover/Search](https://support.tiktok.com/en/using-tiktok/exploring-videos/discover-and-search), [TikTok Creator Search Insights](https://support.tiktok.com/en/using-tiktok/growing-your-audience/creator-search-insights), [Instagram Explore](https://help.instagram.com/487224561296752/).
- **Scope:** Build a thin server API or search service with normalized typed entities, relevance ranking, cursors, autocomplete, filters/counts, safe deep links, and eligibility for deleted/private/blocked/moderated content. Add canonical hashtag pages with Top/Recent, related tags, follow/mute controls; windowed trend scoring with velocity, unique creators, region/language, diversity, anti-spam, lifecycle, and “why trending” reasons. Add mobile Explore/Search entry and URL-backed navigation.
- **Dependencies:** Search index/backfill; event pipeline; moderation/privacy joins; deletion worker; query quotas/App Check; route and navigation contract.
- **Priority:** **P1 — competitive discovery capability after trusted data/lifecycle foundations.**

#### 12. Implement a real feed/recommendation service with controls, diversity, and explanations

- **Current implementation status:** **Partially present / client heuristic.** Feed tabs, local filtering, feedback events, interleaving, and a Why-style modal exist. Ranking is browser-side over loaded posts with seeded defaults, hard-coded founder/official boosts, random/unutilized engines, localStorage feedback, simulated refresh, and no server candidate generation, model/rules version, exposure logging, or evaluation.
- **Why users need it:** Users need relevant discovery that learns across devices without trapping them in narrow loops, reintroducing muted content, amplifying authority, or hiding safety decisions. Creators need fairer distribution and measurable quality.
- **Benchmark relevance:** TikTok and Instagram describe surface-specific ranking, interaction/content/user signals, Following modes, Not Interested/reset controls, diversity, recommendation eligibility, and item-level explanations. Sources: [TikTok recommendation](https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you), [TikTok Why](https://newsroom.tiktok.com/en-us/learn-why-a-video-is-recommended-for-you), [Instagram ranking](https://about.instagram.com/blog/announcements/instagram-ranking-explained), [Instagram exploration](https://about.instagram.com/blog/engineering/designing-a-constrained-exploration-system).
- **Scope:** Establish one authoritative pipeline: candidate generation → privacy/safety eligibility → rank → diversity/novelty/repetition constraints → explanation. Start with deterministic server rules and authenticated events, then add ML only after replay/evaluation. Provide true chronological Following, personalized discovery, reset, topic/creator controls, item reasons, seen-content suppression, creator/topic caps, exploration quotas, satisfaction and guardrail metrics. Remove artificial founder boosts and unused/random ranking paths.
- **Dependencies:** Event and graph foundations; privacy/moderation eligibility; search/media metadata; deletion retention; experiments/observability.
- **Priority:** **P1 — signature competitive capability, after P0 data integrity and safety.**

#### 13. Make stories, audiences, engagement, archive, and Highlights first-class

- **Current implementation status:** **Partially present / split paths.** Firebase supports authenticated, public text stories with 24-hour query filtering and owner deletion. A richer FeedView moments/highlights path is localStorage/sample data; there is no media story pipeline, audience enforcement, views, reactions, replies, archive, or durable Highlights.
- **Why users need it:** Stories are a daily lightweight publishing and conversation loop. Users need to know who can see a story, creators need view/reaction/reply feedback, and selected stories need to persist as profile Highlights without relying on a browser.
- **Benchmark relevance:** Instagram and TikTok provide 24-hour stories, media editing, Close Friends/audiences, views, reactions/DM replies, archive, and Highlights. Sources: [Instagram Stories](https://about.instagram.com/features/stories), [Instagram archive](https://help.instagram.com/1729008150678239/), [TikTok Stories](https://support.tiktok.com/en/using-tiktok/creating-videos/tiktok-stories), [TikTok story viewing](https://support.tiktok.com/en/using-tiktok/exploring-videos/watching-stories-on-tiktok).
- **Scope:** Unify to one story service; add versioned text/photo/video/audio schema, server media processing, audience picker/Close Friends, expiry and physical cleanup policy, views, emoji reactions, DM replies, reply controls, report/block/mute, archive, profile Highlights with cover/reorder/membership, and accessible captions/alt text. Keep local drafts explicitly device-local.
- **Dependencies:** Media and privacy/audience foundations; messaging/notifications; moderation; deletion/retention; profile routes and migrations.
- **Priority:** **P1 — high-frequency social loop after P0 story privacy/media foundations.**

#### 14. Add durable notification, preferences, push, and re-engagement delivery

- **Current implementation status:** **Partially present / conflicting paths.** Firestore recipient-scoped notification reads and read/delete rules, browser notifications, partial FCM/service worker, and a settings schema exist. Core event creation remains local/synthetic; notification UI preferences are not consistently persisted/enforced; token registry, trusted sender, digest scheduler, and event reminders are absent.
- **Why users need it:** Users need reliable cross-device activity, message and security notifications, granular mute/quiet-hour controls, and opt-out that actually prevents delivery. Creators need per-account post/story/live subscriptions without forcing unfollow.
- **Benchmark relevance:** Instagram and TikTok provide category/per-creator/conversation notification controls, mute, and LIVE/event reminders; FCM documents trusted server sends and device-token lifecycle. Sources: [Instagram notifications](https://help.instagram.com/162672033874406/), [Instagram per-account notifications](https://help.instagram.com/1687419104847502/), [TikTok muting](https://support.tiktok.com/en/using-tiktok/followers-and-following/muting), [FCM Admin SDK](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk).
- **Scope:** Consolidate schemas; create notifications from trusted event handlers with idempotency; persist in-app/push/email/digest settings, quiet hours/time zone, per-creator and per-chat mute/reminder state; register/rotate/revoke device tokens; implement foreground/background deep links, aggregation, cursor actions, retention, weekly digest, delivery outcomes, and deletion cleanup. Remove random `NETWORK_CREATORS` engagement simulation from production.
- **Dependencies:** Event pipeline; FCM/VAPID and email provider; settings/privacy; scheduled worker; notification indexes; lifecycle cleanup.
- **Priority:** **P1 — required for a living network and reliable messaging/live use.**

#### 15. Add age assurance, teen defaults, and sensitive-content controls

- **Current implementation status:** **Missing.** No age field/age band, under-13 route, teen-private defaults, age-aware DMs/live/recommendations, specialist review, or age appeal path was found.
- **Why users need it:** Young users need safer defaults and limits on discovery, messaging, live, downloads, and sensitive content. The platform needs a defensible response to underage reports and age mismatch without collecting excessive identity data.
- **Benchmark relevance:** TikTok documents layered age checks, under-13 reporting/specialist review, age appeals, teen-private defaults, and restricted DMs; Instagram has teen-account protections. Sources: [TikTok age-appropriate experiences](https://newsroom.tiktok.com/updates-to-how-we-enforce-age-appropriate-experiences?lang=en-GB), [Instagram Teen Accounts](https://about.instagram.com/blog/announcements/instagram-teen-accounts).
- **Scope:** Add neutral DOB/age-band collection with regional policy, privacy-preserving verification/manual review, underage report route, teen defaults, sensitive-content eligibility, unknown-adult contact restrictions, age-aware recommendations/live/downloads/notifications, parental/support escalation where required, and appeal/retention controls.
- **Dependencies:** Trust/moderation authority; privacy/legal policy; audience/DM/live/recommendation enforcement; specialist review; lifecycle retention.
- **Priority:** **P1 — safety launch requirement before broad public growth, live, or monetization.**

#### 16. Add account security center: MFA, recent reauthentication, recovery, and sessions

- **Current implementation status:** **Partially present / missing production state.** Email/phone verification, Google/phone Auth, reset email, and auth-state restoration are real. The session list is hard-coded; no enrolled MFA/TOTP/backup codes, trusted-device revocation, recent-auth gate, or provider-aware recovery escalation exists.
- **Why users need it:** Social accounts contain identity, private messages, media, and money. A stolen session should not be able to change contact information, enroll MFA, delete the account, or rebind identity without recent authentication; users also need a route when email/phone access is lost.
- **Benchmark relevance:** TikTok Security Checkup and Instagram 2FA/trusted-device/recovery flows set the benchmark; Firebase documents reauthentication and MFA requirements. Sources: [TikTok account safety](https://support.tiktok.com/en/safety-hc/account-and-user-safety/account-safety), [Instagram 2FA](https://help.instagram.com/566810106808145), [Firebase MFA](https://firebase.google.com/docs/auth/web/multi-factor), [Firebase user management](https://firebase.google.com/docs/auth/web/manage-users).
- **Scope:** Add reusable recent-auth gates for deletion, email/phone/password/username/MFA changes; implement authenticator/TOTP or Firebase MFA, backup codes, new-device challenges, trusted-session records from server-observed facts, revoke-one/all, security alerts, provider-aware phone/Google recovery, bounded human escalation, enumeration-safe responses, and rate limits.
- **Dependencies:** Firebase Identity Platform/MFA or trusted auth boundary; notification/email; reauthentication UX; abuse controls; account lifecycle worker.
- **Priority:** **P1 — critical account-protection capability before sensitive controls and monetization.**

#### 17. Make collections, saves, reactions, counters, and identity lifecycle authoritative

- **Current implementation status:** **Partially present / mostly local.** Posts and basic owner CRUD are real; Firestore rules prevent forged aggregate counters. Bookmarks, folders, Favorites mapping, saves, many reactions, and feed counts remain local or client-derived; username availability is a non-atomic query-before-write; notable verification is conflated with email/phone verification.
- **Why users need it:** Users need saves and collections on every device, reliable likes/shares/views, collision-free handles, and a clear distinction between contact verification and authenticity badges. Creators need engagement records that can feed notifications, ranking, and analytics without client forgery.
- **Benchmark relevance:** Instagram saved collections/collaborative collections, TikTok interaction signals, and both platforms’ verification programs establish durable saves, engagement, and authenticity expectations. Sources: [Instagram saved collections](https://help.instagram.com/274531543007118/), [Firebase transactions](https://firebase.google.com/docs/firestore/transactions), [TikTok verification](https://support.tiktok.com/en/using-tiktok/growing-your-audience/how-to-tell-if-an-account-is-verified-on-tiktok), [Instagram verification](https://help.instagram.com/854227311295302/).
- **Scope:** Add owner-scoped collections/items with stable post IDs, pagination and move/remove semantics; per-user reaction/event records and trusted aggregate projections; atomic normalized username claims, cooldown/history/reserved impersonation names; server-owned authenticity verification applications, review, revocation, and badge provenance separate from Auth verification.
- **Dependencies:** Event pipeline; username/profile projection; privacy/audience; moderation; lifecycle worker; migration from localStorage.
- **Priority:** **P1 — necessary for durable everyday use and trustworthy identity.**

#### 18. Build creator analytics, scheduling, and professional Studio workflows

- **Current implementation status:** **Partially present / simulated metrics.** Creator CRUD and Studio shell are useful; stored post counters and analytics reads exist. Retention, audience, follower growth, unique viewers, watch time, schedule execution, many drafts, revenue charts, and growth recommendations are formulas, fallbacks, local intervals, or “Not tracked.”
- **Why users need it:** Serious creators need dated, defined, exportable metrics and dependable drafts/scheduling—not hard-coded growth narratives or a browser timer that disappears when the tab closes.
- **Benchmark relevance:** Instagram Insights and TikTok Studio provide time ranges, reach/views, audience behavior, content reporting, and creator management. Sources: [Instagram Insights](https://help.instagram.com/788388387972460), [TikTok Creator Rewards/Studio](https://newsroom.tiktok.com/en-us/introducing-the-new-creator-rewards-program).
- **Scope:** Use the trusted event pipeline for overview and per-content reports: reach vs views, unique viewers, watch retention/completion, shares/comments/saves, follower conversion, source, cohorts with privacy thresholds, CSV export, and metric definitions. Move drafts/projects and scheduled posts to owner-scoped durable records; publish through an idempotent worker with processing/moderation gates, timezone, retry and failure states.
- **Dependencies:** Event analytics; media pipeline; scheduled worker; creator authorization; lifecycle cleanup; export service.
- **Priority:** **P1 — differentiates Nexora for creators after measurement foundations.**

#### 19. Add server-authoritative monetization: ledger, gifts, subscriptions, eligibility, and payouts

- **Current implementation status:** **Missing / UI prototype.** Wallet balances, transactions, exchange rates, tipping cards, subscriptions, exclusive content, and revenue charts are static/local or disabled. No payment provider, ledger, entitlement, payout/KYC/tax, fraud, refund, chargeback, or eligibility engine exists.
- **Why users need it:** Monetization must not display fabricated balances or unlock content via React state. Creators and fans need receipts, entitlements, transparent economics, eligibility, holds, cancellation, refunds, and support.
- **Benchmark relevance:** TikTok Gifts/Creator Rewards/Series and Instagram Gifts/Subscriptions establish fan support, paid access, eligibility, and payout expectations. Sources: [TikTok Video Gifts](https://support.tiktok.com/en/business-and-creator/video-gifts-on-tiktok), [TikTok Series](https://support.tiktok.com/en/business-and-creator/tiktok-series/about-tiktok-series), [Instagram Gifts](https://help.instagram.com/738469380549477), [Instagram Subscriptions](https://help.instagram.com/406451644272016).
- **Scope:** First establish a reviewed fiat/virtual-currency decision, payment provider, immutable double-entry ledger, verified webhooks, idempotency, reconciliation, pending/available balances, payout onboarding, KYC/tax/age/region/standing gates, fraud/chargeback/refund handling, and support. Then add a small gift catalog and one monthly subscription tier with durable entitlements and cancellation; keep NEX/Mainnet/Monetized labels unavailable until real.
- **Dependencies:** Legal/compliance; payment provider; creator eligibility; event analytics; moderation; account deletion/retention; finance operations.
- **Priority:** **P1/P2 — valuable but should not launch before trust, age, analytics, and deletion foundations.**

### P2/P3 — differentiators and scale improvements

#### 20. Establish a durable privacy/export/consent, accessibility/localization, PWA/offline, and operational-quality layer

- **Current implementation status:** **Partially present / cross-cutting gaps.** PWA shell, service worker, local queues, accessibility semantics, four translation bundles, local consent, export prototype, and offline/player controls exist. Firestore persistence is not enabled; locale bundles are not wired; accessibility preferences are mostly local; export is bounded/client-only; adaptive quality, field telemetry, retention, and lifecycle processing are absent.
- **Why users need it:** A serious platform must work on low-end and low-bandwidth devices, be usable with assistive technology and multiple languages, preserve drafts safely, and provide honest cache/sync/error states. Users also need portable data, purpose-specific consent, retention controls, and observable job outcomes.
- **Benchmark relevance:** WCAG 2.2 requires accessible names, keyboard operation, alternatives, and captions; TikTok/Instagram expose accessibility, language, captions, privacy/export, and low-bandwidth-friendly controls; Firebase documents explicit offline persistence; Core Web Vitals provides field targets. Sources: [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [TikTok accessibility](https://support.tiktok.com/en/using-tiktok/exploring-videos/accessibility-for-watching-videos), [TikTok language](https://support.tiktok.com/en/getting-started/setting-up-your-profile/changing-language-preferences), [Firebase offline](https://firebase.google.com/docs/firestore/manage-data/enable-offline), [Web Vitals](https://web.dev/articles/vitals).
- **Scope:** Enable scoped Firebase persistent cache with sign-out/account-switch handling; build IndexedDB drafts/outbound media queue with resumable state and honest device-only labels; harden service-worker revision/update/rollback behavior; wire runtime i18n, RTL, locale formatting and translation QA; persist accessibility settings and add WCAG/axe/keyboard/screen-reader journeys; complete media captions/alt text and Save-Data behavior against real renditions. Replace client JSON export with an asynchronous, paginated, redacted, expiring artifact service with status/cancel/notify. Add purpose/versioned server consent ledger and VOH memory viewer/delete/export/retention. Add field telemetry for LCP/INP/CLS, startup, media QoE, upload, reconnect, queue depth, moderation SLA, deletion health, and index freshness.
- **Dependencies:** P0 lifecycle, media, event, privacy and moderation foundations; settings/consent schemas; export worker; CDN/renditions; browser/device QA; privacy/legal policy; operational ownership.
- **Priority:** **P2/P3 — essential quality and inclusivity layer, sequenced after P0/P1 foundations.**

## What should not be built now

1. **Do not add artificial binary/download padding.** Do not inflate the bundle, add unused codecs, duplicate media downloads, preload more neighbors, or add large client libraries merely to make Nexora appear feature-rich. Use route splitting, measured field performance, server-derived renditions, bounded prefetch, and real telemetry.
2. **Do not fabricate content, followers, engagement, trends, creators, notifications, analytics, revenue, wallet balances, live viewers, transcripts, or “compression complete” states.** Seed/demo data may exist behind an explicit development flag, never in production-facing decisions or metrics.
3. **Do not ship fake quality selectors, Auto-Cut, voice transcripts, adaptive streaming, live/call connection states, scheduled publishing, monetization, or moderation outcomes.** Either implement the underlying service or label the control as prototype/unavailable.
4. **Do not tune unused or random ranking engines, add ML, or optimize raw engagement before the candidate/eligibility/ranking contract, durable events, diversity guardrails, explanations, and replay tests exist.**
5. **Do not build client-side destructive deletion, client-enforced bans, client-writable moderation/analytics/financial balances, or browser-only privacy as a substitute for trusted services.**
6. **Do not launch broad public Live, paid subscriptions/gifts, public communities, durable AI memory, or indexed personalized discovery before the P0 deletion, moderation, abuse, privacy, event, and media foundations are operational.**
7. **Do not add speculative avatar/video generation, a marketplace, collaborative collections, advanced HDR/AV1, or a large sound catalog before rights, processing, safety, accessibility, and usage evidence justify them.**
8. **Do not treat phone sign-in as MFA, email/phone verification as notable-account verification, localStorage as account truth, browser online state as backend health, or a UI label as authorization.**

## Sequencing recommendation

**Phase 0 — trust gate:** items 1–6, with item 4 privacy enforcement and item 5 event foundations designed together. Establish the deletion inventory before adding durable behavioral/media/index records. Build moderation and abuse controls before opening live, broad media, or communities.

**Phase 1 — credible social product:** items 7–18 in dependency order: media/editor and messaging, graph/audiences, stories, notifications, age safety, security center, search/discovery, recommendation, collections, and creator Studio. Keep every simulated path visibly scoped until its backend contract is real.

**Phase 2 — differentiated scale:** items 19–20 only after trust, event, eligibility, and lifecycle systems are proven. Monetization should follow finance/compliance readiness; quality, accessibility, localization, export, consent, and operational telemetry should become release gates rather than polish.

## Known limitations of this audit

- This report synthesizes repository/audit evidence supplied in the brief; it does not independently verify a deployed Firebase project, production configuration, billing, live provider, email/SMTP, App Check enforcement, or worker runtime.
- “Already present” means a UI path or partial implementation was found. It does not mean production-grade availability, cross-device durability, server authority, accessibility conformance, or operational readiness.
- External benchmark documentation changes over time and feature availability can vary by region, age, account type, and platform. Benchmark links are included as directional evidence, not a promise that Nexora should copy every feature.
- Local browser data, cached media, backups, legal holds, other users’ copies of shared messages/content, and third-party provider retention require explicit product/legal policy; a server worker cannot honestly promise deletion outside its control.
- The exact cost, staffing, provider choice, data residency, and legal obligations for moderation, age assurance, payments, media processing, and live transport require separate architecture and compliance decisions.

## Consolidated source URLs

### Product benchmarks

- https://support.tiktok.com/en/safety-hc/account-and-user-safety/account-safety
- https://support.tiktok.com/en/log-in-troubleshoot/log-in/reset-password
- https://support.tiktok.com/en/using-tiktok/exploring-videos/how-tiktok-recommends-content
- https://newsroom.tiktok.com/en-us/how-tiktok-recommends-videos-for-you
- https://newsroom.tiktok.com/en-us/learn-why-a-video-is-recommended-for-you
- https://support.tiktok.com/en/using-tiktok/exploring-videos/discover-and-search
- https://support.tiktok.com/en/using-tiktok/creating-videos/editing-tiktok-videos-and-photos
- https://support.tiktok.com/en/using-tiktok/creating-videos/accessibility
- https://support.tiktok.com/en/using-tiktok/creating-videos/tiktok-stories
- https://support.tiktok.com/en/using-tiktok/messaging-and-notifications/direct-message-settings
- https://newsroom.tiktok.com/enhancing-the-live-community-experience-with-new-features-updates-and-policies-ca?lang=en-CA&ref=fomoera.com
- https://newsroom.tiktok.com/en-us/introducing-the-new-creator-rewards-program
- https://support.tiktok.com/en/business-and-creator/video-gifts-on-tiktok
- https://support.tiktok.com/en/business-and-creator/tiktok-series/about-tiktok-series
- https://support.tiktok.com/en/account-and-privacy/deleting-an-account
- https://support.tiktok.com/en/account-and-privacy/personalized-ads-and-data/requesting-your-data
- https://support.tiktok.com/en/account-and-privacy/account-privacy-settings/making-your-account-public-or-private
- https://support.tiktok.com/en/account-and-privacy/account-privacy-settings/video-visibility
- https://support.tiktok.com/en/account-and-privacy/account-privacy-settings/refresh-your-for-you-feed
- https://support.tiktok.com/en/using-tiktok/growing-your-audience/creator-search-insights
- https://about.instagram.com/blog/announcements/instagram-ranking-explained
- https://about.instagram.com/blog/engineering/designing-a-constrained-exploration-system
- https://about.instagram.com/features/stories
- https://about.instagram.com/blog/announcements/doubling-up-on-instagram-live-with-live-rooms
- https://help.instagram.com/566810106808145
- https://help.instagram.com/370452623149242
- https://help.instagram.com/155540431448273/
- https://help.instagram.com/162672033874406/
- https://help.instagram.com/1687419104847502/
- https://help.instagram.com/476003390920140/
- https://help.instagram.com/5861247717337470/
- https://help.instagram.com/274531543007118/
- https://help.instagram.com/788388387972460
- https://help.instagram.com/738469380549477
- https://help.instagram.com/406451644272016
- https://help.instagram.com/2922067214679225/
- https://help.instagram.com/338481628002750/
- https://help.instagram.com/854227311295302/
- https://about.instagram.com/blog/announcements/instagram-teen-accounts

### Platform, privacy, safety, and engineering references

- https://firebase.google.com/docs/auth/web/manage-users
- https://firebase.google.com/docs/auth/web/multi-factor
- https://firebase.google.com/docs/auth/admin/manage-users
- https://firebase.google.com/docs/firestore/security/get-started
- https://firebase.google.com/docs/firestore/solutions/delete-collections
- https://firebase.google.com/docs/firestore/manage-data/delete-data
- https://firebase.google.com/docs/firestore/manage-data/enable-offline
- https://firebase.google.com/docs/firestore/transactions
- https://firebase.google.com/docs/storage/security
- https://firebase.google.com/docs/storage/web/upload-files
- https://firebase.google.com/docs/app-check
- https://firebase.google.com/docs/cloud-messaging/send/admin-sdk
- https://firebase.google.com/docs/cloud-messaging/web/receive-messages
- https://firebase.google.com/docs/functions
- https://firebase.google.com/docs/functions/firestore-events
- https://engineering.fb.com/2022/11/04/video-engineering/instagram-video-processing-encoding-reduction/
- https://engineering.fb.com/2023/02/21/video-engineering/av1-codec-facebook-instagram-reels/
- https://www.w3.org/TR/WCAG22/
- https://web.dev/articles/vitals
- https://web.dev/learn/pwa/service-workers
- https://web.dev/learn/pwa/offline-data
- https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation
- https://genai.owasp.org/llm-top-10/

### Repository evidence cited by the audits

- `/home/ubuntu/nexora-app-/src/services/firebase/accountLifecycleService.ts`
- `/home/ubuntu/nexora-app-/firestore.rules`
- `/home/ubuntu/nexora-app-/storage.rules`
- `/home/ubuntu/nexora-app-/src/components/AuthView.tsx`
- `/home/ubuntu/nexora-app-/src/components/FeedView.tsx`
- `/home/ubuntu/nexora-app-/src/components/MediaCreationEngine.tsx`
- `/home/ubuntu/nexora-app-/src/components/NewInboxView.tsx`
- `/home/ubuntu/nexora-app-/src/components/PrivacySettingsModal.tsx`
- `/home/ubuntu/nexora-app-/src/components/CreatorDashboardView.tsx`
- `/home/ubuntu/nexora-app-/src/services/firebase/authService.ts`
- `/home/ubuntu/nexora-app-/src/services/firebase/profileService.ts`
- `/home/ubuntu/nexora-app-/src/services/voh/memoryEngine.ts`
- `/home/ubuntu/nexora-app-/tests/firestore.rules.test.js`
- `/home/ubuntu/nexora-app-/docs/nexora-transformation-research.md`
- `/home/ubuntu/nexora-app-/SECURITY_HARDENING_REPORT.md`
