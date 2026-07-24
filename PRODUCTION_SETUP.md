# Nexora Infrastructure Production Setup & Audit Matrix

This document provides an exhaustive production infrastructure audit and step-by-step setup guide for all authentication, messaging, transactional email, security logging, and database systems implemented in Nexora.

---

## 📊 Infrastructure Status Matrix

| Subsystem / Feature | Current Operational Status | Active Engine / Architecture | Action Required for Launch |
| :--- | :--- | :--- | :--- |
| **Firestore Persistence** | ✅ **100% Fully Connected** | Firebase Firestore (`ai-studio-nexora-29627584-4036-4cc0-b743-61fab6f219f8`) | Already provisioned & verified. |
| **Firestore Security Rules** | ✅ **100% Deployed** | ABAC Rules (`firestore.rules`) with `mail/` and `securityLogs` isolation | Rules deployed & active. |
| **Google OAuth Authentication** | ✅ **Fully Functional** | `signInWithPopup` via `@google/genai` & Firebase Auth (`GoogleAuthProvider`) | Add domain to Firebase Console Authorized Domains. |
| **Email/Password Auth** | ⚡ **Active with Fallback** | `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `sendEmailVerification` | Enable "Email/Password" in Firebase Console. |
| **Phone SMS Authentication** | ⚡ **Active with Recaptcha** | `signInWithPhoneNumber` & `RecaptchaVerifier` | Enable "Phone" in Firebase Console & add SMS quota/billing. |
| **Brute-Force Rate Limiting** | ✅ **100% Active** | Local & Persistent Lockout Engine (`AuthService.recordFailedAttempt`) | Active out-of-the-box (5 attempts threshold / 5 min lockout). |
| **Security Audit Logging** | ✅ **100% Active** | `SecurityNotificationService` + Firestore `users/{userId}/securityLogs` | Active out-of-the-box. |
| **Transactional Email Queue** | ⚡ **Queued to Firestore** | `EmailService.sendTransactionalEmail` logging to `mail/` collection | Install "Trigger Email" Firebase Extension or SendGrid webhook. |
| **Web Push Notifications** | ⚡ **Native OS Active** | FCM (`PushNotificationService`) with fallback to browser `Notification` API | Generate VAPID key in Firebase Console & set `VITE_FIREBASE_VAPID_KEY`. |

---

## 🛠️ Step-by-Step Production Configuration Guide

### 1. Firebase Authentication Setup

To ensure seamless Google OAuth, Email/Password, and Phone SMS authentication across web and mobile browsers:

1. **Enable Authentication Providers**:
   - Go to [Firebase Console](https://console.firebase.google.com/) -> Select Project `evident-server-bqmt3`.
   - Navigate to **Build** -> **Authentication** -> **Sign-in method**.
   - Enable **Google** (select support email).
   - Enable **Email/Password** (check "Email link (passwordless sign-in)" if desired).
   - Enable **Phone** (add test phone numbers for QA, e.g. `+1 555-555-5555` with code `123456`).

2. **Add Authorized Domains**:
   - Under **Authentication** -> **Settings** -> **Authorized domains**, click **Add domain**.
   - Add your Cloud Run / Applet production domain:
     `ais-dev-2j4v4otimkkbjuf3l6dhwe-938616763502.europe-west2.run.app`
     `ais-pre-2j4v4otimkkbjuf3l6dhwe-938616763502.europe-west2.run.app`
   - Add any custom domain configured for your deployment.

---

### 2. Firebase Cloud Messaging (FCM) & Web Push Setup

Nexora includes foreground/background push notification handling via `/public/firebase-messaging-sw.js` and native OS notification fallbacks.

1. **Generate Web Push Certificate (VAPID Key)**:
   - Go to **Project Settings** -> **Cloud Messaging** tab.
   - Under **Web Configuration**, find **Web Push certificates**.
   - Click **Generate key pair**.
   - Copy the generated VAPID Key.

2. **Configure Environment Variable**:
   - In `.env.example` and your production deployment environment, set:
     ```env
     VITE_FIREBASE_VAPID_KEY=your_generated_vapid_key_here
     ```

3. **Verify Service Worker**:
   - Ensure `/public/firebase-messaging-sw.js` is served at root level `/firebase-messaging-sw.js`. Nexora serves this static asset automatically.

---

### 3. Transactional Email System Setup (SendGrid / Firebase Extension)

Nexora's `EmailService` outputs responsive, branded transactional HTML emails for `WELCOME`, `VERIFY_EMAIL`, `PASSWORD_RESET`, and `SECURITY_ALERT_*` directly into the Firestore `mail/` collection.

To dispatch these emails to real inbox recipients:

1. **Install Firebase Extension**:
   - Go to Firebase Console -> **Extensions** -> Explore Extensions.
   - Search for **Trigger Email from Firestore** (by Firebase).
   - Click **Install in Console**.

2. **Configure Extension Parameters**:
   - **Collection path**: `mail`
   - **SMTP Connection URI** or **SendGrid API Key**: Enter your SendGrid API Key or SMTP credentials (e.g. `smtps://apikey:YOUR_SENDGRID_KEY@smtp.sendgrid.net:465`).
   - **Default FROM address**: `noreply@nexora.app` (or verified domain address).

---

### 4. Firestore Database & Security Rules Verification

1. **Database Path**:
   - Target Database ID: `ai-studio-nexora-29627584-4036-4cc0-b743-61fab6f219f8`
   - Region: Provisioned automatically via AI Studio Cloud environment.

2. **Security Rules Ruleset**:
   - Rules are maintained in `/firestore.rules` and deployed via `deploy_firebase`.
   - Validated collections: `users`, `mail`, `users/{userId}/securityLogs`, `users/{userId}/notifications`, `posts`, `drafts`, `follows`, `activities`, `notifications`, `chats`, `presence`.

---

### 5. Android & iOS Native Mobile App Setup (When Exported)

For native mobile packaging (Capacitor / React Native / Flutter):

1. **SHA Fingerprints (Android)**:
   - Obtain SHA-1 & SHA-256 hashes using `./gradlew signingReport`.
   - Register fingerprints in **Project Settings** -> **General** -> **Android apps**.
   - Download the generated `google-services.json` into `android/app/`.

2. **APNs Push Keys (iOS)**:
   - In Apple Developer Console, export an **APNs Key** (`.p8` file).
   - Upload the `.p8` key in Firebase Console under **Project Settings** -> **Cloud Messaging** -> **iOS app configuration**.
   - Download `GoogleService-Info.plist` into `ios/Runner/`.

---

## 🛡️ Fallback & Graceful Degradation Logic

Nexora includes fail-safe degradation routines across all security and auth modules:
- **No Uncaught Exceptions**: If Firebase Auth providers are disabled, users receive explicit guidance ("⚠️ Firebase Email/Password sign-in is disabled in Firebase Console...").
- **Offline & Local Store Resilience**: If client connectivity fluctuates, accounts fall back securely to encrypted local account registries (`loadAccounts`) and record suspicious lockout events.
- **Native Notification Fallback**: If FCM VAPID key is omitted, `PushNotificationService` seamlessly utilizes OS Native Web Notifications so users never miss security alerts.

---

*Last Audited: July 24, 2026*
