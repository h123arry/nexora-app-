# Nexora security review

**Review basis:** repository source, rules, Functions, Express API, emulator tests, and CI configuration. No production account, production database, live Storage bucket, or deployed service was accessed.

## Verified repository protections

Firestore rules bind private profile writes to the authenticated owner, protect privileged and server-generated fields, restrict chat and relationship access, block client financial mutation, and keep moderation/analytics boundaries explicit. Storage rules constrain owner media and deny direct client access to private chat audio. Trusted Functions handle account deletion, engagement counters, media-finalization verification, moderation review, analytics aggregation, and the disabled monetization foundation. The Express private-media API verifies Firebase ID tokens, chat membership, message linkage, content type, object size, and no-store response headers.

The repository contains emulator regression tests for Firestore rules, Storage rules, VOH/auth/private-media boundaries, migration behavior, trusted engagement concurrency, and unit policy modules. The CI workflow now runs these checks, dependency audits, deployment metadata validation, and tracked-file secret scanning.

## Phase 10 fixes

The legacy process-local custom email OTP endpoints were not used by the current Firebase Auth flow and were disabled with explicit `410 Gone` responses. This prevents a multi-instance, non-durable OTP mechanism from being mistaken for a production identity service. Firebase Auth remains the supported email verification, password reset, and phone verification path.

The browser-side transactional email writer was removed. It no longer writes rendered mail bodies, verification content, or security messages to Firestore. The mail rule is now server-only (`allow create, update, delete: if false`). A trusted provider-backed email service has not been implemented, so security email alerts remain unavailable rather than being presented as delivered.

Production Express startup now requires the project, named database, Storage bucket, and release identifier. Local development retains documented defaults. Browser Firebase initialization no longer performs a synthetic `test/connection` read or emits startup debug logs. Service-worker registration is production-only to avoid stale local development assets.

## Secret and logging review

A repository scanner checks tracked files for private keys, service-account JSON, AWS keys, live Stripe secrets, GitHub tokens, and Slack tokens without printing matched values. The Firebase web API key is intentionally public client configuration and is not treated as a private credential. Server logs now emit bounded JSON request outcome, status, duration, environment, and request ID fields without request bodies, authorization headers, tokens, message contents, or payment data. Error responses do not expose internal exception details on the reviewed paths.

## Remaining security blockers

Production Auth providers, authorized domains, email/SMS quotas, App Check enforcement, MFA/trusted devices, abuse throttles, Functions IAM, named-database deployment, Storage lifecycle policy, backup/restore, monitoring destinations, legal/privacy review, and provider configuration remain external verification requirements. The repository is not a production security certification and should not be described as one.
