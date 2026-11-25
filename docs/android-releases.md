# NEXORA Android releases

NEXORA already uses Capacitor 8. This repository keeps the existing Android application ID:
`com.voiceofharrison.nexora`.

## Official download centre

The static page at `/download/` reads the latest published GitHub Release and exposes its APK.
It intentionally shows no download button until an APK asset exists. The page does not serve debug
builds or unsigned packages.

## Permanent release signing

Create one Android upload/release keystore and keep a protected offline backup. Never regenerate
or replace it for routine releases: Android updates must be signed with the same certificate as
the installed app.

Configure these GitHub Actions repository secrets:

- `NEXORA_ANDROID_KEYSTORE_BASE64`: base64-encoded JKS/PKCS12 keystore bytes.
- `NEXORA_ANDROID_KEYSTORE_PASSWORD`
- `NEXORA_ANDROID_KEY_ALIAS`
- `NEXORA_ANDROID_KEY_PASSWORD`

Configure these repository variables with the production public client configuration used by the
existing native build:

- `NEXORA_PRODUCTION_API_BASE_URL`
- `NEXORA_FIREBASE_PROJECT_ID`
- `NEXORA_FIREBASE_APP_ID`
- `NEXORA_FIREBASE_API_KEY`
- `NEXORA_FIREBASE_AUTH_DOMAIN`
- `NEXORA_FIREBASE_DATABASE_ID`
- `NEXORA_FIREBASE_STORAGE_BUCKET`
- `NEXORA_FIREBASE_MESSAGING_SENDER_ID`
- `NEXORA_FIREBASE_APPCHECK_SITE_KEY`
- `NEXORA_FIREBASE_VAPID_KEY`

These Vite Firebase values are public client configuration, not service-account credentials.
Never put Firebase Admin keys, service account JSON, private API tokens, or keystore passwords in
repository variables or source code.

## Publish a release

After the permanent signing key and production variables are configured, push a version tag:

```bash
git tag android-v1.0.0
git push origin android-v1.0.0
```

GitHub Actions builds the production web bundle, syncs Capacitor, signs the release APK, and
publishes the APK plus SHA-256 checksum as a GitHub Release. The download centre automatically
picks up the latest non-prerelease release.

Use increasing semantic versions and never reuse a tag. The workflow run number supplies a
monotonically increasing Android versionCode.

## Update behaviour and important limits

- Website deployments update the website/PWA, not already-installed Capacitor APKs.
- The download centre provides a reliable route to install the newest signed APK.
- Android requires user approval to install an APK update from outside Google Play.
- APK updates preserve app data only when the application ID and signing certificate remain the
  same and the Android versionCode increases.
- Seamless over-the-air updates of bundled web assets are a separate capability. They require a
  selected Capacitor live-update provider, configured deployment channels, and a tested rollback
  policy. Do not claim OTA updates are active until that integration is configured and verified.
