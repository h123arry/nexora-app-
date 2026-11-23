# NEXORA Public Access and Account Registration

## Public entry

- Public browsing is available without a Firebase account.
- A Firebase account is created only after a visitor explicitly chooses email/password registration, Google sign-up, or an enabled and verified phone OTP flow.
- Opening a profile, content share, referral, or founding-beta invitation link must never silently create a Firebase anonymous account.
- Founding-beta invitation links open the normal registration/sign-in experience. The invitation is claimed only after the caller has a permanent email/password, Google, or phone provider linked to their Firebase UID.
- Anonymous Authentication may remain enabled temporarily for compatibility with legacy anonymous beta accounts. The current application does not call `signInAnonymously` for new visitors.
- Firestore and Storage continue to require a valid Firebase identity, non-revoked session, and owner-scoped access. Default-deny rules, moderation restrictions, private account isolation, and chat membership checks remain in force.

## Profile setup and account recovery

- New members choose a display name, date of birth, and unique public username during onboarding. The username is a profile handle, not a login credential.
- Date of birth is private and must never be copied into the public profile projection.
- Legacy anonymous beta accounts can link email/password, Google, or phone credentials to the current UID. Existing posts, follows, messages, profile data, and activity stay attached to that UID.
- Do not create replacement anonymous accounts to recover or complete an existing profile.
- Until a recovery credential is linked, clearing browser data or losing the device can make a legacy anonymous account unrecoverable. Separate browsers/devices do not create new identities unless the user explicitly registers or signs in.
- Account-protection reminders apply only to existing legacy anonymous accounts and must not block normal app use.

## Production deployment

1. Keep public browsing signed out. Do not add an automatic anonymous-auth bootstrap.
2. Keep Firebase Anonymous Authentication enabled only while legacy anonymous accounts still require credential linking; disable the provider after a verified migration/retirement plan, not as a substitute for removing automatic client sign-in.
3. Deploy the reviewed Firestore and Storage rules together with the matching frontend release.
4. Deploy Functions only when the reviewed release changes server-side callable behavior.
5. Manually deploy the merged main commit to the existing Render service (automatic deploy is disabled).
6. Verify a fresh browser can browse without creating a Firebase Auth user, then explicitly register with email/password or Google and confirm exactly one UID/profile is created.
7. Verify a founding-beta invitation does not create an account until the visitor completes sign-up, then claims against the permanent UID.
8. Verify legacy anonymous accounts can link a real provider without changing UID, and that founder/admin custom claims and existing founder profiles remain unchanged.

## Safety and abuse controls

Public browsing does not require a Firebase anonymous identity. Authenticated access remains protected by UID ownership checks, session revocation, account status restrictions, server-side moderation, rate limits, and default-deny rules. Do not remove those controls while retiring the legacy anonymous onboarding flow.
