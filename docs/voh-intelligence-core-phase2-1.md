# VOH Intelligence Core — Phase 2.1

## Goal
Connect VOH to two additional NEXORA features through explicit, request-scoped read permissions without widening access to private conversations or moderation data.

## Implemented
- Added separate `circles` and `notifications` context scopes. A request receives neither unless the user explicitly selects that scope.
- Circle context is resolved from active membership documents in the `communities/{communityId}/members/{uid}` hierarchy. The server queries membership records by the verified UID, filters to active memberships, resolves only their parent Circle documents, deduplicates them, and caps the result at 12.
- Circle context contains only the Circle ID, name, description, creator/owner ID, and a valid member count. It excludes member directories, pending requests, reports, moderation state, private media libraries, and activity logs.
- Notification context is loaded only from `users/{verifiedUid}/notifications`, ordered newest first and capped at five records. Only content and timestamp are passed to VOH.
- The VOH context selector now includes Feed, Profile, Feed + Profile, Circles, Notifications, Inbox (still private), and no extra context.
- Added isolated tool-scope and Firestore-reader tests. The membership lookup uses a single equality filter to avoid introducing a new composite-index dependency.

## Security boundaries
- Firebase ID-token verification remains the identity authority. Client-provided UIDs, Circle IDs, notification arrays, and profile values are not trusted as data sources.
- Inbox/private-message contents remain excluded.
- No write tools are enabled. VOH cannot mark notifications read, join/leave Circles, post, send, gift, pay, delete, or moderate.
- Firestore read failures fail the chat request rather than silently presenting unavailable data as an empty account snapshot.
- User-generated text remains untrusted data, never instructions.

## Verification
The new tests are included in `npm run test:unit`. Type-check, unit tests, security tests, and the repository CI suite must pass before merge and deployment.
