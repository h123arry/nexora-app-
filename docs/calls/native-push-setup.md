# NEXORA incoming-call push setup

The direct-call backend sends an urgent, audible FCM alert for incoming calls. The recipient's device token is stored under their own account at `users/{uid}/pushTokens/{tokenHash}`. A notification tap opens NEXORA; the app's authenticated active-call listener then opens the real incoming-call screen, where the recipient can accept or decline.

## Android

1. In Firebase project `nexora-prod-voiceharrison`, register an Android app with package name `com.voiceofharrison.nexora`.
2. Download its `google-services.json` and place it at `android/app/google-services.json`. Do not commit a file containing a service-account private key; the Firebase Android client configuration is expected here.
3. Build and install the updated native app.
4. In NEXORA Notifications, grant device notification permission. Android 13+ requires this permission for alerts.
5. Confirm the `NEXORA calls` notification channel is enabled in Android system settings.

## iOS

1. In the same Firebase project, register an iOS app with bundle ID `com.voiceofharrison.nexora`.
2. Add its `GoogleService-Info.plist` to the iOS app target at `ios/App/App/GoogleService-Info.plist`.
3. In Apple Developer, enable Push Notifications for the matching App ID and create an APNs authentication key.
4. Upload the APNs key, Key ID and Team ID in Firebase Console → Project Settings → Cloud Messaging.
5. Build and install the signed iOS app, then grant notification permission in NEXORA Notifications.

## Device acceptance test

Use two separate NEXORA accounts on two physical phones. Place a voice call while the recipient app is foregrounded, backgrounded, and the screen is locked. Verify the alert appears, tapping it opens the incoming call screen, Accept joins the same LiveKit room, Decline ends the ringing state, and unanswered calls expire as missed calls.

## Important platform boundary

This implementation sends standard high-priority FCM/APNs alert notifications. It does not yet claim a native Android Telecom full-screen call activity or iOS CallKit/PushKit VoIP wake-up while the app is force-quit. Those require additional native call-provider integration and, on iOS, VoIP push credentials and App Store/device testing. Standard alert delivery also depends on the Firebase platform app files and APNs key above being configured.
