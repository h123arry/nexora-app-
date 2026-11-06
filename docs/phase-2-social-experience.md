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
- Story authorization tests cover viewer marker creation, owner-only get/list access and cross-account denial.
- The existing CI workflow runs type-checking, unit tests, Auth/Firestore/Storage emulator tests, integration/security suites, dependency audits and production builds.

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
- Existing messaging, group chat, broadcast, inbox, media and receipt components.

## Explicit limitations, not represented as complete
- Story audience controls remain public-only; close-friends/follower-only story privacy is not enabled.
- Story replies/reactions and an archive/highlights lifecycle are not part of this tranche.
- Notification push delivery still depends on valid FCM/VAPID and service-worker deployment; durable inbox state does not prove push delivery.
- Profile privacy, follower-request enforcement and private-post audience enforcement require coordinated server/rules migrations before they can be safely enabled.
- Messaging still has legacy/local-first paths; simulated call UI is not a real-time calling transport.
- Directory search is a callable backend feature and still requires deployed-function verification.
- Live Firebase staging and two-account production-like verification remain separate release gates.

## Merge policy
Do not merge this phase branch until the latest commit passes the complete CI workflow. Do not describe staging, push delivery, private audiences or real-time calls as production-verified without live evidence.
