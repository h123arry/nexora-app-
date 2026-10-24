# Nexora authentication recovery and Firebase ownership

Date: 2026-10-24

## Executive result

Nexora was not rebuilt and no Firebase project, account, profile, post, message, preference, or media data was deleted. The repository now has one canonical email-authentication path, safer Firebase error handling, idempotent profile recovery, browser-storage portability, and emulator-backed authentication regression coverage.

The repository evidence confirms that the client targets the Firebase project `evident-server-bqmt3`, application ID `1:354472369675:web:2f0b1348b19669e794b10e`, Firebase Auth domain `evident-server-bqmt3.firebaseapp.com`, named Firestore database `ai-studio-nexora-29627584-4036-4cc0-b743-61fab6f219f8`, and Storage bucket `evident-server-bqmt3.firebasestorage.app`.

The available environment does not provide authenticated Firebase Console administration for that project, so this pass cannot truthfully claim that a production provider is enabled, that the deployed domain is authorized, or that an owner-controlled replacement project has been created. Those items are explicitly separated below.

## Confirmed code-level causes and risks

### Two competing email-login implementations

The primary `AuthView` login form previously called `signInWithEmailAndPassword` directly. The application also contained `AuthService.loginWithEmail`, which performed its own rate limiting, profile recovery, security notification, and error mapping. This split meant the visible login path did not consistently use the canonical service. It also duplicated profile creation logic and displayed raw Firebase error messages directly in the UI.

The direct path additionally called `recordFailedAttempt` itself, while the service path also recorded failed attempts. Once the login path was consolidated, each failed credential attempt is recorded once.

### Authentication and profile failures were conflated

The previous service wrapped both the Firebase credential operation and the Firestore profile lookup/creation in one catch block. A successful Firebase sign-in followed by a Firestore profile failure could therefore be reported as a generic authentication failure and could be counted as a failed password attempt.

The service now handles these stages separately. Credential failures preserve their Firebase error code and use safe mapped text. Profile failures are reported as a profile-recovery problem after the authenticated session is safely signed out. A missing profile is recovered idempotently through `ProfileService.getOrCreateProfile`.

### Raw provider details were exposed

Several UI handlers logged Firebase error objects, messages, and stack traces. The default AuthService mapping also returned arbitrary provider messages. These paths could expose internal provider details in browser logs or user-facing text.

Provider failures now map to bounded actionable messages. Authentication UI handlers no longer log credential errors or stacks. Security-notification, push, and profile-loading logs also avoid raw exception objects.

### Browser-only rate-limit storage

The rate-limit implementation assumed `localStorage` existed. That is valid in the browser but caused the canonical authentication service to fail in emulator and non-DOM runtimes before it could reach Firebase Auth. The implementation now degrades safely when browser storage is unavailable; browser users retain the existing local rate-limit behavior.

### Profile data was too permissive at the service boundary

`ProfileService.createProfile` spread the entire caller-provided data object over the constructed profile, allowing runtime-supplied fields such as `id` or protected counters to override the intended values before Firestore rules evaluated the write. The constructed profile now uses an explicit allowlisted set of profile fields and always preserves the authenticated UID. Profile updates also require the current Firebase user to own the target UID before writing.

Firestore rules remain authoritative and were not loosened.

## Authentication methods found in the repository

Email/password registration and login are implemented with Firebase Authentication. Password reset uses Firebase's `sendPasswordResetEmail`. Email verification uses Firebase's `sendEmailVerification` and `reload`. Google sign-in uses `GoogleAuthProvider` and `signInWithPopup`. Phone sign-in uses Firebase SMS authentication with `RecaptchaVerifier` and `signInWithPhoneNumber`.

Apple sign-in is not implemented. It was not added because enabling it requires project-side provider configuration, platform-specific redirect configuration, and a verified Apple developer setup. The UI does not pretend that Apple sign-in is available.

The code cannot establish from repository files alone whether Email/Password, Google, Phone, or reCAPTCHA enforcement is enabled in the current Firebase Console. The owner must verify each provider in the project named above.

## Implemented changes

The main AuthView email login now calls `AuthService.loginWithEmail`. The service performs the authoritative Firebase credential operation, retrieves or creates the owner profile, clears rate limits only after success, and returns the authenticated profile to the application.

Firebase error codes are preserved on safe wrapped errors so the UI can distinguish duplicate accounts, invalid credentials, unauthorized domains, disabled providers, network failures, popup cancellation, and configuration errors without exposing raw provider messages.

Registration continues to call the real Firebase provider before any success state is shown. The profile creation is owner-scoped and safe to retry. Repeated sign-in does not create duplicate profiles because profile recovery checks for the existing UID first and uses merge-safe writes.

Password reset and verification continue to use Firebase Auth directly. Transactional email writes remain unavailable until a trusted email provider is configured; the client does not pretend that a secondary email delivery provider succeeded.

An explicit opt-in emulator switch was added for tests. It activates only when the test runtime sets `globalThis.__NEXORA_FIREBASE_EMULATORS__ = true`; production targeting is unchanged.

The authentication test suite is available through `npm run test:auth` and covers provider error mapping, successful registration, profile creation, session restoration through sign-out and sign-in, duplicate registration, invalid credentials, and password reset behavior.

## Current Firebase project dependencies

The frontend uses the checked-in public Firebase web configuration in `firebase-applet-config.json`. The backend uses the server-side project and database settings represented in `.env.example`, including `GCLOUD_PROJECT`, `FIRESTORE_DATABASE_ID`, and `FIREBASE_STORAGE_BUCKET`. Cloud Functions use the Firebase project environment and the repository's Functions source. Firestore rules and indexes are in `firestore.rules` and `firestore.indexes.json`; Storage authorization is in `storage.rules`.

The Firebase web API key in the web configuration is a public client identifier, not a service-account credential. Privileged service-account credentials must never be placed in frontend code. Gemini and other backend secrets remain server-only.

## Owner verification steps in Firebase Console

1. Open the Firebase project `evident-server-bqmt3` and confirm that it is the intended existing project before changing any settings.
2. In Authentication, confirm that Email/Password is enabled.
3. Confirm that the deployed Nexora domains and local development domains are listed under authorized domains. A missing authorized domain produces `auth/unauthorized-domain`.
4. Confirm that Google provider configuration is complete if Google sign-in is desired.
5. Confirm Phone provider and reCAPTCHA configuration if SMS sign-in is desired. Configure test phone numbers for non-production testing rather than using real accounts in automated tests.
6. Configure the Firebase email action domain, templates, and sender identity for verification and password reset.
7. Deploy the repository's Firestore rules and indexes to the intended database. Confirm that the named database is selected rather than silently using an empty default database.
8. Deploy Storage rules and verify the configured bucket matches `evident-server-bqmt3.firebasestorage.app`.
9. Configure App Check only after the deployed domain has a registered reCAPTCHA Enterprise site key. Keep the key in the public `VITE_FIREBASE_APPCHECK_SITE_KEY` configuration; never place a secret key in frontend code.
10. Configure Functions runtime secrets and the production release identifier through the hosting environment or secret manager.

## Safe user-owned Firebase project path

Changing the Firebase web configuration does not transfer Firebase Auth users, Firestore documents, Storage objects, Functions, or provider settings. Do not replace the current project by editing only the project ID.

If the owner cannot administer the current project, first export or otherwise preserve data using an authorized administrative process. Establish a new Firebase project, enable the required providers, create its Firestore database and Storage bucket, deploy this repository's rules and indexes, configure authorized domains, deploy Functions, and then migrate data with a UID-preserving plan where the provider permits it. Firebase Auth account migration may require an official export/import process and password-hash compatibility; existing passwords must not be copied through client code.

A project switch should be performed only after staging verification. Production users must never be silently sent to a new empty project. Keep the existing `firebase-applet-config.json` and current environment values until the owner has confirmed the new project and migration plan.

## Compatibility and data preservation

Existing Firebase UIDs remain compatible with the current code. Existing private profiles are read by UID. Missing profiles are recreated only for the currently authenticated UID. Existing public profile projections are refreshed from a sanitized private profile projection during authenticated recovery.

No deletion, bulk migration, UID rewrite, account replacement, public-write relaxation, or administrator privilege change was performed. Existing role and admin claims remain server-controlled by the existing Firestore rules. A user-controlled profile field or email address is not treated as administrator authority.

## Verification performed

The following checks passed in the repository environment:

- `npm run test:auth`: 4 authentication tests passed against the Firebase Auth and Firestore emulators.
- `npm run lint`: TypeScript validation passed.
- `npm run test:unit`: 33 tests passed.
- `npm run test:rules`: 21 Firestore authorization tests passed.
- `npm run test:storage`: 2 Storage authorization tests passed.
- `npm run functions:build`: passed.
- `npm run build`: production frontend and backend artifacts built successfully.
- `npm run validate:deployment`: passed.
- `npm run security:scan`: passed for 244 tracked files.

The emulator suite prints a warning that this Firebase CLI configuration contains a named Firestore database that the emulator does not fully support. The authentication tests still exercised real Firebase Auth emulator registration, duplicate-account handling, invalid-credential handling, password reset, and profile recovery. Emulator tests do not prove production provider enablement or production domain authorization.

The production build continues to report the existing large Firebase chunk warning. It is unrelated to authentication correctness and remains documented for a future bundle-splitting pass.

## Remaining external dependencies

The owner must supply or verify the production Firebase Console access, provider enablement, authorized domains, email sender/action configuration, Google OAuth configuration if desired, Phone/reCAPTCHA configuration if desired, App Check site key, Functions deployment secrets, and any data migration permissions.

No new Firebase project was created or connected during this pass. No claim is made that production authentication is fixed until the owner verifies the existing project settings and completes a real staging sign-up and sign-in with a safe test account.
