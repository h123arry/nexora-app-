# NEXORA native incoming-call notifications

## Current implementation boundary

This release integrates real one-to-one voice and video calls in the web app, including the LiveKit media connection and browser push payload. The current Capacitor build does **not** register native FCM device tokens yet. Therefore native Android/iOS incoming-call alerts are not enabled by this change, and no lock-screen answering is claimed.

Do not treat the steps below as a completed setup. They are prerequisites for a separate native push integration.

## Android prerequisites

1. Register the Android app in Firebase project `nexora-prod-voiceharrison` with package name `com.voiceofharrison.nexora`.
2. Add its Firebase client configuration at `android/app/google-services.json`.
3. Implement and validate Capacitor Firebase Messaging token registration, token ownership and logout cleanup before enabling native call alerts.
4. Request Android 13+ notification permission and create the `nexora_calls` notification channel.

## iOS prerequisites

1. Register the iOS app in the same Firebase project with bundle ID `com.voiceofharrison.nexora`.
2. Add `ios/App/App/GoogleService-Info.plist`.
3. Enable Push Notifications for the App ID and upload the matching APNs authentication key in Firebase Console.
4. Implement and validate Capacitor Firebase Messaging token registration and logout cleanup.

## Acceptance tests required

Use two separate NEXORA accounts on two physical phones. Test incoming calls with the recipient app foregrounded, backgrounded and the screen locked. Confirm the alert opens the authenticated incoming-call screen, Accept joins the same LiveKit room, Decline ends ringing, unanswered calls expire, and logout revokes the device token.

Standard FCM/APNs alerts do not provide native Android Telecom full-screen call UI or iOS CallKit/PushKit wake-up while the app is force-quit. Those require separate native call-provider work and device testing.
