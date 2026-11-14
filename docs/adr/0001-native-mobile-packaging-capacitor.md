# ADR 0001: Native mobile packaging with Capacitor

- Status: Accepted architecture decision
- Date: 2026-11-14
- Scope: NEXORA Android and iOS distribution
- Decision owner: NEXORA project owner

## Context

NEXORA is an established React 19 + Vite + TypeScript application with an Express server, Firebase Authentication, Firestore, Storage, Functions, and an existing Progressive Web App shell.

The repository currently contains PWA metadata and a service worker, but no Capacitor configuration, generated Android project, or generated iOS project. The current web application must remain the canonical product implementation.

A framework rewrite would duplicate working UI and application logic, increase regression risk, and consume launch time without solving the immediate store-packaging problem.

## Decision

Adopt **Ionic Capacitor** as the native packaging layer around the existing Vite-built React application.

- Keep React, TypeScript, Vite, and the existing application architecture.
- Build the web application to the existing `dist` directory.
- Configure Capacitor's web directory as `dist`.
- Generate and maintain Android and iOS native projects through Capacitor CLI.
- Use Gradle/Android Studio for Android release builds and Xcode for iOS release builds.
- Keep the Express/Firebase backend hosted remotely over HTTPS. The native shell must never embed service-account credentials or server secrets.
- Add native plugins only for required capabilities such as camera/photo library, push notifications, deep links, share sheets, and secure platform integrations.
- Preserve the web/PWA deployment as a supported distribution channel.

## Why Capacitor

1. Reuses the existing React application rather than rebuilding it.
2. Provides native Android and iOS containers and plugin bridges.
3. Keeps web and native feature development aligned.
4. Allows platform-specific capabilities to be introduced incrementally.
5. Minimizes architectural change during the launch programme.

## Required implementation sequence

1. Audit frontend-to-server calls and remove assumptions that a native app has the web server's origin. Define one explicit HTTPS API base URL for native builds if Express endpoints are required.
2. Audit browser-only APIs, service-worker registration, cookies/session assumptions, OAuth redirect handling, file uploads, camera, microphone, downloads, and push registration in a Capacitor WebView.
3. Add pinned, mutually compatible Capacitor core, CLI, Android, and iOS packages as development dependencies/runtime dependencies where required. Update the lockfile through npm; do not hand-edit lockfile integrity metadata.
4. Add `capacitor.config.ts` with a stable app ID, NEXORA app name, `webDir: 'dist'`, and an explicit production-safe server policy. Do not configure a remote development server URL in release builds.
5. Add deterministic scripts for web build, Capacitor sync, Android open/build, and iOS open/build.
6. Generate the native Android and iOS projects, commit their source configuration, and exclude generated build outputs, signing material, provisioning profiles, and local secrets.
7. Configure app icons, splash screens, package/bundle identifiers, versioning, permissions, URL schemes, associated domains, and platform privacy manifests.
8. Test on physical Android and iOS devices before store submission.

## Security and release requirements

- Release builds must use the production Firebase web configuration and HTTPS API origin; staging builds must use the isolated staging project and origin.
- Native builds must not connect to Firebase emulators.
- Staging must never target `nexora-prod-voiceharrison`.
- Do not ship test accounts, debug menus, local fallback authentication, secret keys, service-account JSON, or development server URLs.
- Use platform secure storage for any sensitive native tokens; do not store long-lived credentials in plain local storage.
- Validate OAuth, email action links, password reset links, and deep links on both platforms.
- Push notification delivery must be tested with real device tokens; PWA push support is not proof of native push support.
- Camera, microphone, photo library, notifications, tracking, and background capabilities must request only necessary permissions and have accurate store disclosures.

## Consequences

Positive:
- Existing React screens, state, services, and design system remain the product source of truth.
- Android and iOS can be released without maintaining two separate UI implementations.
- PWA remains available.

Trade-offs:
- Capacitor WebView behaviour and native plugin compatibility require physical-device testing.
- Some browser assumptions, OAuth flows, media APIs, downloads, and push paths may need platform adapters.
- Android signing and Apple signing/provisioning must be managed outside source control.
- Store acceptance and native capability verification remain separate release gates.

## Current status

The architecture decision is accepted and the initial integration has been committed on the Objective 1 release branch. Capacitor dependencies and configuration are now declared. Native project generation and platform compilation are being automated and remain subject to CI evidence. No signed Android or iOS store build has been produced.

The next implementation step is the dependency/configuration integration, preceded by the API-origin and browser/native compatibility audit.


## Repository compatibility audit — confirmed findings

The initial source inspection found several web-origin assumptions that must be adapted before native release:

- `src/services/firebase/storageService.ts` calls relative `/api/private-chat-media/...` endpoints for private voice uploads and playback. A Capacitor app's local WebView origin is not the Express API origin. These calls need a single validated HTTPS API base URL for staging and production, with auth tokens and request IDs preserved.
- `src/services/firebase/authService.ts` imports and uses Firebase `signInWithPopup` for Google sign-in. The native app needs a tested native-compatible OAuth/deep-link flow; a browser popup flow must not be assumed to work inside the packaged WebView.
- `src/services/firebase/pushNotificationService.ts` uses Firebase Web Messaging, browser `Notification`, and a Web Push token labelled `platform: 'web'`. This is not native FCM registration. Android/iOS push needs a native push integration, platform-specific token registration, permission handling, and real-device delivery tests.
- `src/main.tsx` registers `/service-worker.js` in production. The Capacitor build must not rely on a service worker for native push or app-shell lifecycle. PWA registration should remain web-only or be explicitly guarded for native runtime.
- `index.html` includes a CDN-hosted LiveKit UMD script. Native release testing must verify network availability, CSP/origin behaviour, and that the native app can load the required LiveKit runtime reliably; bundling a pinned dependency may be preferable if the compatibility audit confirms it.
- Existing localStorage-based browser persistence and lockout UX must be reviewed for native lifecycle and account-switch behaviour. Security-critical throttling must remain server-authoritative.

These findings are compatibility work items, not evidence that the features are already native-ready. They should be resolved with small platform adapters while preserving the current web implementation.

## Implementation update — 2026-11-14

- Capacitor 8 is the selected stable major line. The repository now declares `@capacitor/core`, `@capacitor/android`, `@capacitor/ios`, and `@capacitor/cli` on the 8.6.x line.
- `capacitor.config.ts` uses `dist` as the bundled web directory, sets a stable proposed bundle identifier, disables cleartext traffic and mixed content, and does not configure a remote development server.
- `src/lib/nativeRuntime.ts` detects iOS Capacitor and Android localhost WebView origins.
- `src/lib/apiBaseUrl.ts` resolves API paths against a configured HTTPS origin for native builds and preserves same-origin paths for the web app. It rejects insecure origins, credentials, query strings, fragments, and absolute request paths.
- Private chat voice uploads now use the shared API URL resolver.
- PWA service-worker registration is skipped inside the native WebView.
- Web FCM registration is explicitly disabled inside native builds until native push is integrated; the app does not mislabel Web Push as native push.
- Google popup sign-in is explicitly blocked in native builds until a native OAuth/deep-link adapter is implemented. Email/password remains on the existing Firebase Web SDK path.
- The bundle identifier `com.voiceofharrison.nexora` is a proposed stable identifier and must be checked against the owner's Apple/Google developer accounts and Firebase Android/iOS app registrations before store submission.
- A one-time macOS bootstrap workflow is preparing the npm lockfile, Android/iOS source projects, and unsigned simulator/debug compilation. Its result must be checked before calling native project generation complete.

### Known native capability gaps

Native Google OAuth, native push, native camera/gallery plugin integration, native share/deep-link handling, and secure native token storage are not claimed complete by the Capacitor shell. These require platform adapters and physical-device verification in subsequent release objectives. The app's web-only popup and web push implementations are not used as substitutes.

## Native API and hosting compatibility update — 2026-11-14

- The existing Express API is the canonical remote API for native builds. A Cloud Run multi-stage image is now defined for the existing React/Express application; it does not introduce a second backend or duplicate business logic.
- Web builds use same-origin relative API paths. Native builds require `VITE_API_BASE_URL` to point to the staging/production Express service over HTTPS.
- The Express server now handles CORS preflight and allows only same-origin requests, Capacitor iOS/Android WebView origins, and explicitly configured HTTPS origins. This is not a replacement for Firebase ID-token verification.
- The staging deployment workflow is designed to deploy Firestore/Storage rules, Functions, and the Express/React container to Cloud Run. It prints the service URL and checks both health and Firebase readiness.
- Cloud Run deployment, Firebase project creation, WIF setup, IAM, and live readiness are not claimed complete until the owner provisions the cloud resources and the protected workflow succeeds.

## Media processing integration

The staging deployment design includes the existing private FFmpeg/Sharp media worker as a separate Cloud Run service, invoked only by an authenticated Eventarc trigger for Cloud Storage object-finalized events. The worker uses a dedicated runtime identity and remains private; it is not a public upload or transcode endpoint. Its lockfile and Functions Framework startup target are now explicit and reproducible. A real staging upload/transcode/playback round trip is still required before media capabilities can be declared production-ready.
