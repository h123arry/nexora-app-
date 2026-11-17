# NEXORA Founding 300 Beta Access Rollout

## What this release adds

- A reusable founder-issued invitation URL.
- Server-enforced allocation of at most 300 founding_300 places across self-service beta claims and existing administrator-created founding accounts.
- Firebase Anonymous Authentication for invited members, with the Firebase UID and app data retained when credentials are linked later.
- Firestore and Storage rules that reject unclaimed anonymous sessions.
- Email/password and SMS phone credential linking under Settings → Connected Accounts.
- In-app account-security reminders after 3, 7 and 30 days while either contact method remains unsecured.

## Required production setup

1. In Firebase Authentication for nexora-prod-voiceharrison, enable the Anonymous provider.
2. Confirm the Render production domain nexora-o3od.onrender.com is listed under Firebase Authentication authorized domains.
3. Confirm the email/password provider and email verification template/action domain are configured.
4. Enable the Phone provider and configure its SMS/recaptcha settings before expecting phone linking to work. Phone linking remains subject to Firebase's SMS quotas and abuse checks.
5. Confirm the existing production founder/admin custom claims are present for the account that will generate the link.

## Deployment sequence

1. Merge this reviewed PR only after frontend type-check, Functions build, Firestore rules tests, Storage rules tests and auth regression tests pass.
2. Run GitHub Actions → Deploy NEXORA Production Founding and Beta Access Functions with confirm_production_deploy=true in the protected nexora-production environment. This deploys the two beta callables, the existing founding-member callable, and Firestore/Storage rules to the pinned production project.
3. Render has auto-deploy disabled for this service. Manually deploy the merged main commit to the existing NEXORA Render service and wait for live.
4. Sign in as a founder/admin, open Settings → Beta feedback, generate the invitation link once, and share that same URL.
5. Test with one fresh browser profile before distributing widely. Verify an invited user can create a profile, upload media, and later link email and phone without changing UID.

## Member behavior and limitations

- Each successful claim consumes one place. The backend transaction prevents claim 301.
- The cap counts Firebase UIDs, not verified human beings. Without requiring a phone/email at entry, one person can create multiple browser/device sessions; Firebase App Check and monitoring should be used to reduce abuse.
- Anonymous sessions persist on the same browser/device under Firebase Auth persistence. Clearing browser data, using private browsing, or losing the device can make an unlinked account unrecoverable.
- Email and phone credentials are linked to the existing UID. If a credential already belongs to another Firebase account, NEXORA refuses an automatic merge.
- The reminder schedule is in-app and device-local. It is not an email or SMS campaign.
- Current Storage rules allow owner-scoped image uploads up to 12 MB and video uploads up to 250 MB; media processing and publication still follow the existing NEXORA pipeline.

## Emergency pause

To stop new claims without deleting existing members, set the relevant betaInvites document's active field to false in the production Firestore console. Existing beta members retain their accounts and content. Do not delete betaClaims or reset the shared foundingMemberCohorts/founding_300 counter.
