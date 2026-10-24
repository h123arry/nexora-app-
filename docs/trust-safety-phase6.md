# Nexora Phase 6: Trust and Safety Foundation

This phase replaces the prototype moderation path with a trusted backend boundary. It is intentionally a foundation rather than a claim of complete automated moderation.

## Implemented

- Reports are submitted through the `submitModerationReport` callable. The callable validates target type, target ID, category, and explanation length, derives the reporter from Firebase Auth, and uses a deterministic report ID to deduplicate repeat submissions.
- The client can read only its own reports. Moderation queue reads require a server-issued reviewer claim (`moderator`, `admin`, or an approved `role` claim). Direct client report creation, update, and deletion are denied by Firestore rules.
- Authorized reviewers use `reviewModerationReport`. Supported decisions are dismissal, warning, posting restriction, messaging restriction, suspension, and ban. Review writes are server-authoritative and create an append-only audit event.
- Enforcement records are owner-readable but immutable to clients. A trusted `accountStatus/{uid}` projection is used by Firestore rules to stop restricted users from creating posts, drafts, stories, chats, and messages. Restrictions include an expiry timestamp; direct user-profile edits cannot change enforcement flags.
- Appeals use `submitModerationAppeal`. The callable requires an active enforcement owned by the signed-in user and deduplicates open appeals. Direct appeal creation and state changes are denied.
- The existing report modal now shows success only after the callable accepts the report. It no longer writes fabricated local report records.
- The existing moderation workspace is claim-gated, reads the protected queue, avoids displaying reporter identity or private evidence, and uses callable-backed dismiss/restrict actions.

## Progressive disclosure

Everyday feed and profile surfaces keep reporting in their existing contextual modal. Reviewer queue access is limited to the existing administrative workspace. Account status and appeal history remain owner-scoped records rather than permanent feed controls. The current UI does not expose reviewer tools merely because a user profile contains a mutable `role` field.

## Required production configuration

Firebase Authentication custom claims must be provisioned by an offline administrative process for real reviewer accounts. The claims are not granted by the client and should be removed promptly when staff access ends. The production deployment must publish the updated Firestore rules and Cloud Functions together, then verify callable App Check enforcement and logs in the target project.

Create and verify the Firestore composite index required by the appeal lookup (`accountEnforcements.accountId` plus `status`) before enabling appeals in production. Confirm the report queue query and the callable region match the deployed client configuration.

The backend still needs a real reviewer operations process: queue assignment, evidence retention policy, reviewer training, escalation/SLA handling, and a separate secure evidence viewer. No AI moderation provider was invented in this phase; automated signals may be added later as review inputs, not unilateral enforcement.

The current phase does not complete FCM delivery, notification preference enforcement, notification pagination, message retry controls, group read receipts, live-session persistence/moderation, WebRTC infrastructure, or full group and messaging abuse controls.
