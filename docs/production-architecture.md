# Nexora production architecture

## Scope and deployment boundary

Nexora is a Vite-built React web application served by the existing Express process in `server.ts`. In production, `npm run build` produces the browser assets in `dist/` and bundles the Express server as `dist/server.cjs`; `npm start` runs that server. The Express process is the trusted API boundary for VOH and private chat audio. Firebase resources are separate managed dependencies. Nothing in this document claims that the configured Firebase project is deployed or that provider settings have been verified.

The checked-in Firebase client configuration targets project `evident-server-bqmt3`, the named Firestore database `ai-studio-nexora-29627584-4036-4cc0-b743-61fab6f219f8`, and the Storage bucket `evident-server-bqmt3.firebasestorage.app`. These values are repository configuration and must be confirmed against the authorized staging/production target before deployment.

## Request and data flow

1. The browser loads the React application and initializes Firebase Web SDK Authentication, Firestore, Storage, Functions, and optional reCAPTCHA Enterprise App Check. Browser configuration is public and is not a secret.
2. Firebase Auth establishes the user identity. Firestore and Storage rules use the verified Firebase identity and trusted claims; editable profile fields are not the source of administrative authority.
3. Public feed, profile, relationship, community, notification, and ordinary user-owned data paths use the Firebase client SDK subject to Firestore/Storage rules and explicit query bounds.
4. Trusted mutations such as public-post likes, account lifecycle processing, analytics ingestion/aggregation, moderation review, media-finalization verification, and monetization policy operations use Cloud Functions with the Admin SDK. Functions are configured for Node.js 22 in `us-central1` and use the configured named Firestore database.
5. The Express API verifies Firebase ID tokens before VOH and private chat-media operations. Private chat audio is stored under a private Storage path and is streamed only after checking current chat membership and a message reference. It is not exposed through a permanent public download URL.
6. The Express readiness endpoint checks server configuration and Firestore Admin connectivity. `/healthz` only reports process availability and release identifier; `/readyz` reports dependency readiness without exposing credentials or user data.

## Service responsibilities

| Service | Implemented responsibility | Current deployment fact |
| --- | --- | --- |
| React/Vite/Express | Browser shell, static assets, API routes, health endpoints | Buildable locally; hosting target is not configured or verified here |
| Firebase Auth | Email/password, Google, phone flows, identity tokens, native verification/reset | Providers and authorized domains require Firebase Console verification |
| Firestore | Application data, security rules, named database access, trusted operational records | Rules/indexes are in source; production deployment is unverified |
| Firebase Storage | User media and private object storage | Rules are in source; bucket/IAM and lifecycle policies require staging verification |
| Cloud Functions | Trusted mutations, lifecycle worker, moderation, analytics, media finalize, monetization foundation | Compiles locally; deployment, IAM, region, and named database require verification |
| Email provider | None trusted in this repository | Native Firebase Auth emails are supported; custom transactional/security email is unavailable |
| Push notifications | Browser/service-worker and optional FCM configuration | VAPID/provider delivery is not verified |
| Payments | Policy/catalog foundation only | Checkout, ledger, provider, webhooks, payouts, and refunds remain unavailable |

## Trust boundaries

Client-controlled profile values, post payloads, analytics events, media metadata, and UI state are untrusted. Firestore rules and Functions validate ownership, protected fields, audience, participant membership, and server-generated values. Sensitive provider credentials, Admin SDK access, Gemini keys, and deployment credentials must remain in the server or provider secret manager. `VITE_*` and the checked-in Firebase web config are public browser inputs.

## Unsupported or externally blocked capabilities

Private audience variants, production App Check enforcement, MFA/trusted devices, distributed abuse controls, durable search indexing, media transcoding/moderation/captions, push delivery, trusted transactional email, payments/payouts, live moderation, backup scheduling, monitoring destinations, and production deployment have not been verified here. They must remain unavailable or clearly labelled until their trusted implementation and provider configuration exist.
