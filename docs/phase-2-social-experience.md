# Phase 2 · Social experience expansion

This phase improves the existing NEXORA social experience in place. It does not replace the current React/Firebase architecture.

## Delivered in this tranche

### Durable notification inbox actions
- Individual read/unread changes persist to `users/{uid}/notifications/{notificationId}`.
- Mark-selected and mark-all-read persist before the UI reports success.
- Opening a notification persists its read state.
- Single dismiss, swipe-to-delete, selected deletion and clear-all delete the owner's Firestore records.
- Failed writes are surfaced to the user rather than silently represented as saved.
- Firestore rules permit only the owner to update the `isRead` field, require a boolean value, and continue to prohibit client-created notification records.

### Atomic bulk notification operations
- Mark-selected and mark-all-read now use one Firestore batch rather than parallel independent writes.
- Selected deletion and clear-all likewise use one atomic batch.
- Duplicate IDs are collapsed, malformed IDs are rejected, and the batch is capped at 100 records to match the bounded inbox subscription.
- A failed batch leaves the operation unapplied as a unit instead of partially changing the inbox.

### Story creator analytics
- Story views remain durable, one-per-viewer records under `stories/{storyId}/views/{viewerId}`.
- A creator-only count query reads the aggregate view count while the story is active.
- The story viewer displays that count only to the story owner.
- Firestore rules allow the story owner to read/list view records and deny other accounts.
- Expired stories are not exposed to other users; client queries are bounded and filter by expiry.

### Trusted web push delivery
- A trusted Firestore create trigger sends new inbox notifications to the recipient's registered web devices through Firebase Admin Messaging.
- Delivery reads only the recipient's private token subcollection and respects the account's push preference when explicitly disabled.
- Provider-safe batches are capped at 500 tokens; invalid/unregistered device tokens are removed.
- Payload data is string-only and includes a bounded deep link; message notifications route to the relevant inbox conversation.
- This server trigger still requires deployed Functions, configured FCM/VAPID, valid device registration and a real end-to-end delivery test before production delivery can be claimed.

### Account-scoped web push registration
- When a signed-in user grants browser notification permission and an FCM token is successfully issued, the client persists the token under that account's private `users/{uid}/pushTokens` collection.
- Device-token document IDs are SHA-256 hashes; the raw token is stored only in the owner-private document for trusted delivery services.
- Firestore rules restrict token reads, registration, refresh and revocation to the owning account and validate the token shape and server timestamp.
- Registration is tied to the active account; switching accounts removes the previous account's registration before registering the new account.
- The service exposes an explicit unregister operation for device revocation.
- Missing VAPID configuration or failed token registration is not reported as active remote push delivery. A successful client token registration still does not prove that a deployed sender, service worker, or production delivery path is operational.

## Verification
- Existing notification authorization tests cover owner reads, owner read-state changes, owner deletion, cross-account denial and client-forged record denial.
- New assertions reject non-boolean notification read states.
- Story authorization tests cover viewer marker creation, owner-only get/list access, cross-account denial, validated replies and supported reactions.
- The existing CI workflow runs type-checking, unit tests, Auth/Firestore/Storage emulator tests, integration/security suites, dependency audits and production builds.

### Durable story interactions
- Viewers can send one of five supported emoji reactions; each account has one reaction record per story and can change it.
- Viewers can send a text reply of up to 500 characters to an active story.
- Reactions are readable by the reacting account and story owner; replies are readable by the author and story owner.
- Firestore validates account identity, supported reaction values, payload shape, message length and story expiry.

### Account-isolated local publishing drafts
- Saved drafts now use a UID-specific device-local storage key rather than one global browser key.
- Draft parsing is defensive against malformed/corrupt localStorage data.
- Composer autosave and draft persistence pause while the signed-in account changes, then load the new account's own draft state.
- The old unscoped global draft key is intentionally not auto-imported because its owner cannot be established safely.
- Drafts remain device-local; this change does not claim cross-device draft sync or durable media backup.

### Durable story interactions
- Viewers can send one of five supported emoji reactions; each account has one reaction record per story and can change it.
- Viewers can send a text reply of up to 500 characters to an active story.
- Reactions are readable by the reacting account and story owner; replies are readable by the author and story owner.
- Firestore validates account identity, supported reaction values, payload shape, message length and story expiry. Interaction records cannot be edited or deleted by arbitrary clients.
- Story interactions are durable Firestore records, not local-only UI state.

## Existing capabilities retained
- Public profile projection and owner-checked profile updates.
- Authenticated public directory search across people, Pages and Circles.
- Bounded public-feed pagination and subscription.
- Story text/image/video upload, 24-hour expiry, story navigation and owner deletion.
- Account-backed direct and group messaging, cross-device inbox conversation directory and account-scoped inbox preferences.
- Broadcast channels, business mini-services localization and booking request/decision notifications.
- Account-isolated local publishing drafts and private, cross-device recent-search history.

## Explicit limitations, not represented as complete
- Story audience controls remain public-only; close-friends/follower-only story privacy is not enabled.
- Story archive/highlights lifecycle and audience controls remain outstanding; current stories are public-only and expire after 24 hours.
- Notification push delivery still depends on valid FCM/VAPID configuration, a deployed service worker and a trusted sender; token registration alone does not prove end-to-end delivery.
- Profile privacy, follower-request enforcement and private-post audience enforcement require coordinated server/rules migrations before they can be safely enabled.
- Messaging still has legacy/local-first paths; simulated call UI is not a real-time calling transport.
- Directory search is a callable backend feature and still requires deployed-function verification.
- Live Firebase staging and two-account production-like verification remain separate release gates.

## Merge and release policy
Phase 2 code changes are merged only after the full CI workflow passes. Live Firebase staging, two-account production-like tests, deployed push delivery, private audiences and real-time calling are separate release gates and must not be described as production-verified without live evidence.
