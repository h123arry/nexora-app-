# NEXORA

## The World's Living Social Network

**One network. Real connections. Endless possibilities.**

NEXORA is an actively developed social platform bringing together profiles, a social feed, conversations, communities, creator tools, discovery, and VOH AI. Its product direction is an integrated, mobile-first experience rather than a collection of disconnected applications.

**Visual identity:** Nexora Violet: a premium violet signal on a private midnight canvas.

> **Project status:** This repository contains a mix of Firebase-backed application paths, client-local features, prototypes, and disabled integrations. Code or UI presence is not proof that a service is deployed, production-configured, or available to users.

## About NEXORA

NEXORA is being developed around meaningful interactions, secure accounts, reliable messaging, personalized discovery, and a consistent visual experience. The implementation is still evolving; the readiness of each feature varies. The sections below distinguish repository capabilities from integrations that remain incomplete or unverified.

## Features and implementation status

### Social networking and discovery

- Firebase Authentication provides user identities. Profile records and public profile projections are stored in Cloud Firestore.
- Post creation, public-feed retrieval, comments, and feed subscriptions use the existing Firestore-backed post path. Some engagement paths are mixed: repost/share counters are persisted by the main app flow, while bookmarks are stored in browser `localStorage`; an alternate share-sheet repost interaction is UI-local. The like mutation calls a Functions endpoint whose matching implementation was not found in the checked-in source, so end-to-end like persistence needs verification.
- Follow and profile-discovery surfaces are present. Explore searches the posts and public profiles currently loaded in the client, keeps recent search terms locally, and derives recent hashtag counts from loaded posts. The public-profile subscription is bounded; this is not a global indexed-search or personalized recommendation service.
- **World Pulse** has interactive topic and category controls, but live activity aggregation, map data, measured trends, and alert delivery are not connected. Treat it as an in-progress discovery surface, not a live trends service.

### Communities and Circles

- The Communities hub reads public and owner-managed community records from Firestore and supports search, browsing, and creation. Community posts use the regular public-post path with community labels; they are not a separate member-only feed.
- Community membership is currently stored per browser in `localStorage`, not as cross-device membership. Private or invite-only access requests and member-scoped permissions are not implemented; private records are owner-readable under the current rules.
- The separate Matrix **Circles** experience is a local prototype. Its builder, seeded polls, chat, voice controls, and several interactions are simulated or browser-local rather than live community services.

### Messaging and communication

- Chats, messages, conversation previews, read updates, typing indicators, and chat presence use Cloud Firestore, including real-time snapshot listeners. Presence and typing are therefore **Firestore-backed in the current implementation, not Firebase Realtime Database-backed**.
- The message UI has local `sending`, `sent`, and `failed` states and a Firestore read-receipt writer. A delivered-receipt helper exists, but a reliable end-to-end delivered transition has not been established.
- Voice notes use an authenticated private-media API and Firebase Storage. Other chat attachment options are not available in the current chat UI. Ordinary media flows can store metadata in Firestore and bytes in Firebase Storage.

### Feed personalization and privacy controls

- Feed controls include hiding posts, muting or blocking creators, and marking topics as not interesting. Authenticated clients persist preference settings through Firestore; guest/device-only preferences use `localStorage`.
- Filtering is performed in the client against the posts currently loaded; it is not a server-side feed query. Production cross-device behavior has not been verified. The empty-feed fallback currently does not reapply the not-interested-tag filter, so behavior can differ in that state.
- Reset controls clear saved feed lists and the current viewed-post cache while preserving the selected feed tab. They do not delete unrelated account data.

### Creators, analytics, reputation, and NEX

- The Creator Dashboard provides creator-facing content and achievement surfaces. Draft and scheduling behavior includes local/mock data.
- Analytics code records bounded client observations and can produce platform aggregates; it is not a verified creator-level analytics or revenue product. Some data is client-originated, and scheduled production aggregation has not been verified.
- Reputation scoring and activity logic exist, but are local-first/client-side with best-effort persistence; do not treat the result as a tamper-proof trust ledger.
- **NEX is not currently an operational currency or balance.** There is no available purchase, transfer, redemption, cash conversion, creator payout, or currency ledger.

### VOH AI

- The Express server contains authenticated, server-side Gemini endpoints for VOH chat, post improvement, audio transcription, and post summaries. `GEMINI_API_KEY` is server-only; `GEMINI_MODEL` defaults to `gemini-2.5-flash`. Without a valid configured provider key, VOH endpoints report that the service is unavailable.
- Chat history and optional memory preferences are browser-local. Memory starts disabled and can be enabled, disabled, or cleared locally. Cloud memory sync is not implemented, and the current chat request does not attach the stored memory profile as model context.
- A checked-in endpoint or UI does not establish that Gemini credentials, quotas, provider access, or production deployment are configured. Live provider-backed behavior has not been verified.

### Notifications and push

- The Activity view and shared data services include Firestore-backed notification reads and updates. Other app notification state and some synthetic events are stored in React state or browser `localStorage`.
- Optional Firebase Cloud Messaging code can request browser permission, obtain a token when configured, and handle foreground messages. The repository does not establish a backend token-registration/sending pipeline or reliable background/closed-tab push delivery.

### Monetization and payments

Monetization is **not available**. The repository contains a disabled product catalog, protected billing read paths, and tested policy helpers, but no configured payment provider or working checkout. Subscriptions, paid entitlements, refunds, recognized creator earnings, payouts, and live payment processing are not enabled. No sandbox or production payment has been verified.

## Technology stack

| Technology | Current role |
| --- | --- |
| React 19 | Web application UI |
| TypeScript | Application and server type safety |
| Vite | Development server and frontend build |
| Tailwind CSS 4 | Utility styling and responsive layouts |
| Motion | Interface animation |
| Express 4 | Node.js application/API server |
| Firebase Authentication | User identity |
| Cloud Firestore | Profiles, posts, chats, presence, typing, settings, and some notification data |
| Firebase Storage | Media bytes and private chat voice media |
| Firebase Functions | Trusted/server-side operations and scheduled functions where configured |
| Google GenAI SDK (Gemini) | Optional server-side VOH provider integration |

The root application and Functions package target **Node.js 22**. Firebase Realtime Database is not listed as an active application dependency below because the current repository does not initialize or use its SDK/API.

## Firebase architecture and configuration

Firebase services have separate configuration and security models:

| Service | Repository usage |
| --- | --- |
| Firebase Authentication | Email/Password and Google are enabled in the Console. Phone is disabled. Authorized domains include `localhost`, `nexora-prod-voiceharrison.firebaseapp.com`, and `nexora-prod-voiceharrison.web.app`; no custom host is listed. No live signup/login flow has been tested. |
| Cloud Firestore | Primary persistence for profiles, posts/feed, follows, communities, chats/messages, notifications, and preferences. Messaging typing and presence snapshots are Firestore-backed, not RTDB. The active `default` database is in `europe-west1`; the Console showed no read/write/realtime-read metrics for the selected last seven days, scheduled backups are disabled, and published rules are unverified. |
| Firebase Storage | App code expects Storage for media and private chat voice media, but the Console shows Storage onboarding and requires Blaze billing. No production bucket or upload is verified. |
| Firebase Functions | Callable, scheduled, and trusted operations. Source presence does not prove deployment. |
| Firebase Cloud Messaging | Optional foreground/browser messaging code; end-to-end background delivery is not established. |
| Firebase Realtime Database | **No current application initialization or use found**, including for messaging, typing, or presence. The Console confirms the supplied `europe-west1` instance; live rules are deny-all (`.read: false`, `.write: false`). |

The owner-confirmed Firebase project is `nexora-prod-voiceharrison`. Firebase Console lists the single active Cloud Firestore database as the literal `default` in `europe-west1`. This is distinct from Firestore's special `(default)` database. `FIRESTORE_DATABASE_ID` and `VITE_FIREBASE_DATABASE_ID` select a **Firestore database ID**; they are not Realtime Database URLs. The Firebase CLI config now targets only the confirmed `default` database to avoid an accidental deployment to the separate `(default)` target. No collection or document was opened during verification.

The Realtime Database URL `https://nexora-prod-voiceharrison-default-rtdb.europe-west1.firebasedatabase.app` was independently confirmed in Console; its location is Belgium (`europe-west1`). Its live rules deny all reads and writes. Because no application feature initializes or uses RTDB, no `databaseURL` was added to the app configuration. Do not treat this URL as a Firestore database ID or add RTDB reads/writes unless a feature and its access model are deliberately designed and tested.

The current client and Admin code use Firebase named-database APIs. Firebase's official references mark the relevant named-database overloads as **Public Preview** and advise against production use: [Firebase JS Firestore reference](https://firebase.google.com/docs/reference/js/firestore_) and [Firebase Admin Firestore reference](https://firebase.google.com/docs/reference/admin/node/firebase-admin.firestore). The Firestore emulator also does not model multiple databases. This is a production architecture decision, not something CI success resolves.

## Security and engineering

Security-related controls present in the repository include:

- Firestore rules with a default-deny unmatched-path policy and owner-, membership-, and data-scoped access.
- Storage rules that constrain user media and deny direct client access to private chat objects.
- Firebase ID-token verification and server-side authorization checks for protected API routes.
- Bounded VOH request context and per-user rate limiting; private chat media checks verify conversation access and message linkage.
- Emulator-based Auth, Firestore Rules, Storage Rules, and API security tests, plus unit and policy tests.

These are source and test artifacts—not proof of production enforcement. Email/Password and Google are enabled, but Phone Auth is disabled and no custom domain is listed. Published Firestore rules/indexes, App Check (Console still shows `Get started`), IAM, rate limits, secrets, backups, and live data behavior remain unverified or incomplete. Storage is not set up in the project. Do not disable checks or deploy broad allow rules to work around configuration failures.

## Getting started

### Prerequisites

- Node.js 22 and npm.
- Java 21 for the Firebase Emulator Suite tests.
- Authorized access to a suitable Firebase emulator or non-production project for backend-dependent development.

### Install and run

```sh
git clone https://github.com/h123arry/nexora-app-.git
cd nexora-app-
npm ci
npm ci --prefix functions
```

Review `.env.example`, then create a local `.env` and set values for an emulator or owner-approved staging project before starting the app. The example contains production-shaped Firebase identifiers; do not assume that using it is safe for production data. `.env` files are ignored by Git, while `.env.example` is tracked. The `npm run dev` script starts the application server; it does not start the Firebase emulators.

```sh
npm run dev
```

The server listens on `PORT` (default `3000`). To build and run the bundled server:

```sh
npm run build
npm start
```

### Environment configuration

Use the existing variable names in `.env.example` and the deployment documentation. Key settings include:

- `GCLOUD_PROJECT`, `FIRESTORE_DATABASE_ID`, `FIREBASE_STORAGE_BUCKET`, `PORT`, and `RELEASE_VERSION` for the server. Production startup requires the Firebase project, Firestore database ID, storage bucket, and release version; server credentials must be supplied through the host's credential/secret mechanism.
- `VITE_FIREBASE_*` values are browser-visible configuration, not secrets. App Check site keys and FCM VAPID keys are also public client configuration.
- `GEMINI_API_KEY` is a private, server-only secret. Never prefix it with `VITE_`, place it in frontend source, or commit it or service-account credentials.
- `APP_URL` is optional for integrations that need the hosted application URL.

See [the deployment runbook](docs/deployment-runbook.md), [Firebase deployment runbook](docs/FIREBASE_DEPLOYMENT_RUNBOOK.md), [staging setup](docs/staging-setup-and-verification.md), and [production Firebase status](docs/production-firebase-migration.md) before configuring or deploying services.

## Checks and tests

The root package exposes named scripts; there is no `npm test` or `npm run test` script.

| Command | Purpose |
| --- | --- |
| `npm run lint` | TypeScript check (`tsc --noEmit`) |
| `npm run functions:build` | Build Firebase Functions |
| `npm run test:unit` | Unit and policy tests |
| `npm run test:auth` | Auth regression tests using Auth/Firestore emulators |
| `npm run test:rules` | Firestore security rules tests |
| `npm run test:storage` | Storage security rules tests |
| `npm run test:migration` | Public-post migration tests |
| `npm run test:engagement` | Post engagement tests |
| `npm run test:voh-security` | Authenticated VOH API security tests |
| `npm run security:scan` | Scan tracked files for secret patterns |
| `npm run validate:deployment` | Validate checked-in deployment metadata; does not deploy |
| `npm run validate:staging` | Validate staging configuration metadata |
| `npm run build` | Build frontend and bundled Express server |

The Firebase emulator tests use demo project IDs and do not access production data. Relevant emulator tests are started by their individual scripts. CI additionally audits production dependencies with `npm audit --omit=dev --audit-level=high` and the equivalent Functions command.

## CI and deployment status

GitHub Actions runs on pushes and pull requests to `main`. The workflow installs both lockfiles, runs the secret scan, type check, Functions build, unit and emulator suites, production dependency audits, production build, and deployment metadata validation. **CI does not deploy the app or verify live Firebase resources.** A passing CI run is not proof of production registration, login, push, AI, or payment behavior.

Production release is not certified. Blockers include the named-Firestore API Public Preview limitation, Storage requiring Blaze billing, App Check not configured, Phone Auth disabled, any custom production host not yet authorized, disabled Firestore scheduled backups, unverified published Firestore rules, and untested live authentication, server environment, and provider integrations. The `.firebaserc` includes the production project; always verify the target and owner approval before any deployment. Do not run an unrestricted production deploy.

## Project principles

- Preserve existing functionality and data; review the current architecture before changing it.
- Prefer real, persistent behavior over mock interactions, and label prototypes honestly.
- Keep authentication, authorization, privacy, and fail-closed validation enabled.
- Test changes before merging or deploying; do not confuse emulator tests with live-project verification.
- Keep Nexora Violet and the mobile-first product identity cohesive.
- Report incomplete integrations and unverified production behavior honestly.

## Contributing

Development takes place in the existing repository. Before proposing changes, identify the affected components and dependencies, preserve security and data-integrity guarantees, avoid duplicating working systems, validate relevant package scripts, and document any configuration or deployment requirements.

## License

No root `LICENSE` file is present in this repository. Do not assume an open-source license or permissions that have not been established.

---

**NEXORA — The World's Living Social Network**
Connection, creativity, community, and intelligent experiences.
