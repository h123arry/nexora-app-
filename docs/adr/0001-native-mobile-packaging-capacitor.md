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

The architecture decision is accepted and documented. Capacitor dependencies, configuration, and generated native projects have **not** yet been added. No Android or iOS store build has been produced or tested by this decision record.

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
