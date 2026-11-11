# NEXORA Phone OTP staging verification

Phone OTP must remain unavailable in production until a separate staging project has passed the checks below. The current Auth screen implements phone sign-in/sign-up; phone-based password recovery is not implemented by this flow.

## Environment gate

- `VITE_NEXORA_PHONE_AUTH_ENABLED=false` is the default.
- The UI only exposes Phone when `VITE_NEXORA_ENV=staging` and `VITE_NEXORA_PHONE_AUTH_ENABLED=true`.
- Never set the flag in production while provider setup, SMS delivery, quota behaviour, and recovery semantics remain unverified.

## Firebase Console staging setup

1. Create a Firebase project dedicated to NEXORA staging. Do not reuse `nexora-prod-voiceharrison`.
2. Register a separate staging Web app and populate `.env.staging` from `.env.staging.example`.
3. Enable Phone under Authentication > Sign-in method for staging only.
4. Add the staging hostname to Authentication authorized domains.
5. Configure the reCAPTCHA/Phone Auth integration and App Check for the staging app.
6. Review SMS region policy and quotas. Allow only the countries required for the test cohort; confirm the Nigeria (+234) route and project billing/quota limits before sending live SMS.
7. Use Firebase fictional test phone numbers for repeatable automated/manual tests where supported. Use a real SMS only with an authorized tester who has agreed to receive it.
8. Deploy staging Auth settings, Functions, Firestore rules/indexes and Storage rules. Keep staging credentials and service-account keys out of Git.

## Required acceptance tests

- With the flag absent or false, no Phone sign-in/sign-up option is visible and direct OTP handler calls fail closed.
- With the flag true in staging, the phone option appears.
- Valid +234 number: reCAPTCHA completes, SMS is delivered, and the six-digit code signs in the expected account.
- Invalid number, wrong code, expired code, unauthorized domain, denied reCAPTCHA, network failure and SMS quota exhaustion all show accurate errors.
- Repeated send/resend attempts respect the cooldown and Firebase quotas.
- Verify that the account profile is created/linked once and that retries do not create duplicate profiles.
- Verify that phone auth is still hidden in a production build even if someone accidentally sets the flag true there.

## Release gate

Do not mark Phone OTP as ready until the above tests are recorded against the staging project and real device/browser combination. This checklist does not claim that Firebase Console settings have been changed or that an SMS has been sent.

## Password recovery distinction

The current phone flow authenticates users. It does not prove or implement a secure phone-based password reset for existing email/password accounts. Design and test that as a separate account-recovery flow before advertising it.
