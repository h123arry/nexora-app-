# NEXORA Public Access and Anonymous Account Rollout

## Public entry

- The Render URL is open to anyone. No private invitation, approval workflow, or 300-member cap is required for ordinary registration.
- The browser creates a Firebase Anonymous Authentication identity in the background. Each browser profile/device receives its own UID unless the user later links a credential.
- Firestore and Storage continue to require a valid Firebase identity, non-revoked session, and owner-scoped access. Default-deny rules, moderation restrictions, private account isolation, and chat membership checks remain in force.
- Existing beta invitation links may remain available for legacy cohorts, but they are not a prerequisite for public access.

## Profile setup and account recovery

- New members choose a display name, date of birth, and unique username before completing profile setup.
- Date of birth is private and must never be copied into the public profile projection.
- Users can add and verify email and phone credentials later by linking them to the current anonymous UID. Existing posts, follows, messages, profile data, and activity stay attached to that UID.
- Until a recovery credential is linked, clearing browser data or losing the device can make an anonymous account unrecoverable. Separate browsers/devices ordinarily create separate identities.
- Daily in-app reminders encourage users to secure the same account. They must not block normal app use.

## Production deployment

1. Enable Firebase Anonymous Authentication for the production Firebase project.
2. Deploy the reviewed Firestore and Storage rules together with the matching frontend release.
3. Deploy Functions only when the reviewed release changes server-side callable behavior.
4. Manually deploy the merged main commit to the existing Render service (automatic deploy is disabled).
5. Verify a fresh browser can enter, create a profile, post, follow, upload owner-scoped media, and later link a recovery credential without changing UID.
6. Verify founder/admin custom claims and existing founder profile remain unchanged.

## Safety and abuse controls

Anonymous access is public access, not unauthenticated database access. Do not remove UID ownership checks, session revocation, account status restrictions, server-side moderation, rate limits, or default-deny rules. Monitor abuse and be prepared to tighten registration controls without deleting existing accounts.
