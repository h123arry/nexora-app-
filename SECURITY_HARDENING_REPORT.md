# Nexora Authentication and Firestore Security Hardening

**Scope:** narrowly scoped application authentication and critical Firestore authorization changes. No production data was read or modified, and no deployment was performed.

## Findings confirmed

- App state previously allowed a localStorage `nexora_logged_in` value and cached user profile to act as an independent authentication signal.
- The app initiated Firebase Anonymous Authentication automatically, making its perceived identity diverge from an actual account session.
- The demo entry point was reachable in production and invoked the same success callback used by account login.
- Firestore rules did not adequately isolate private profile fields, chat participants/messages, notification recipients, or security logs.
- Profile discovery queried the private `users` collection, creating pressure to make full account records broadly readable.

## Changes implemented

- Firebase Auth UID plus a successfully loaded Firebase profile is now the sole authenticated identity. Anonymous sessions are treated as guests; automatic anonymous sign-in and the unused helper export were removed.
- Cached profile data is no longer proof of sign-in. It is cleared when the Firebase identity is absent, and account-specific screens are not rendered while auth is unresolved or the cached identity does not match the current UID.
- App-level checks bind publishing, profile editing, sharing, chat start, and account subscriptions to the current Firebase UID. Sign-out follows the Firebase provider and no longer changes local identity before sign-out succeeds.
- Demo access is development-only and explicitly read-only. Protected screens remain gated when using demo or guest mode. The admin client panel is replaced with a notice because this client has no trusted admin-claim/server authorization path.
- Public discovery now reads `publicProfiles`. `ProfileService` writes a sanitized projection separately from owner-only `users/{uid}` documents. Private account documents cannot be listed; role/moderation/balance fields are excluded from public projections and cannot be set in client profile creation or ordinary profile updates.
- Firestore rules default-deny unspecified paths. Chat/message reads and writes are participant-bound and message authorship is bound to Firebase UID. Notifications are recipient-readable and read-status-updatable but cannot be created by clients. Security-log writes are server-only. Client mail-queue writes are restricted to the authenticated account's own email.
- Public posts/profiles remain readable. Post creation binds authorship to the caller. Post owners can edit allowlisted content, but clients cannot initialize or rewrite engagement counters. Any participant can only append a comment whose `userId` matches their Firebase UID, without rewriting prior comments or counters.
- Added Firebase Emulator allow/deny tests for profile privacy and creation, participant access, forged messages, notifications/mail, security logs, comments, post ownership, and public reads.

## Verification performed

| Check | Result |
|---|---|
| `npm run lint` (TypeScript) | Passed |
| `npm run test:rules` (Firestore Emulator) | Passed: 8 tests, 0 failures |
| `npm run build` (Vite frontend + server bundle) | Passed |
| `git diff --check` | Passed |
| Credential-pattern scan of changed diff | No matches |

The emulator tests exercise both allowed and denied operations. They do not replace end-to-end tests against the live Firebase Auth project; no real user credentials or production Firebase project were used.

## Remaining limitations and deployment considerations

1. **Not deployed:** the updated rules must be reviewed and deployed manually to the intended Firebase project. The repository change alone does not protect a currently deployed database.
2. **Public-profile backfill:** existing profiles receive a sanitized `publicProfiles/{uid}` projection when that account next signs in. Until then, older accounts may not appear in public discovery. A trusted, reviewed backfill may be needed for inactive accounts.
3. **Non-owner likes/share counters:** the current app writes aggregate counters by rewriting a whole post. Hardened rules reject client-supplied likes/shares/views/saves counts (including owner-supplied inflation). A small trusted backend or per-user reaction/share records with atomic counter maintenance is needed for durable, abuse-resistant cross-user reaction/share totals. Comments have a constrained client rule; likes/shares do not gain a falsely trusted path here.
4. **Notifications/security events:** client-created recipient notifications and security-log entries are now denied. Trusted backend code must create those records. Own-account mail queue entries remain supported, but this does not provide rate limiting.
5. **Admin/moderation:** the client admin console is deliberately disabled until a trusted custom-claim and server-side authorization path exists.
6. **Legacy sessions:** accounts signed in through the old localStorage/demo path are no longer considered authenticated; they must establish a real Firebase Auth session. Existing anonymous Firebase sessions are treated as guest sessions.
7. **Build warnings:** the successful build still reports the repository's existing large JavaScript chunk and mixed static/dynamic Firestore import warnings; they are not introduced as a security failure by these changes.

## Git workflow

The work is prepared on the dedicated branch `security/auth-firestore-hardening`. The commit and remote branch details are reported separately after push verification. No force push or production deployment is planned.
