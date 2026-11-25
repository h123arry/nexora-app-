# NEXORA Android release setup

The Android release workflow builds the real NEXORA application from this repository. It packages the production web application into the existing Capacitor Android project, uses the production Firebase web configuration in `firebase-applet-config.json`, and targets the canonical API origin `https://nexoraapp.com.ng`.

The Android application ID is `com.voiceofharrison.nexora`. Do not change it for an update release.

## 1. Create or provide the permanent signing key

If NEXORA already has a release keystore, keep using that exact keystore and alias. Android updates must be signed with the same signing identity as the installed app.

If this is the first public Android release, create a permanent key on a trusted computer:

```bash
keytool -genkeypair -v -keystore nexora-release.jks -keyalg RSA -keysize 4096 -validity 10000 -alias nexora-release
```

Keep the keystore and both passwords in a secure password manager and encrypted backup. Never commit the keystore, put it in a public artifact, or paste it into chat. Losing the keystore can prevent future in-place updates for users who install this APK.

Encode the keystore as one Base64 string:

- Linux: `base64 -w 0 nexora-release.jks`
- macOS: `base64 < nexora-release.jks | tr -d '\\n'`
- PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("nexora-release.jks"))`

## 2. Add GitHub Actions secrets

In the repository, open **Settings → Secrets and variables → Actions → New repository secret**. Add these four secrets:

- `NEXORA_ANDROID_KEYSTORE_BASE64`: the Base64 output from the previous step.
- `NEXORA_ANDROID_KEYSTORE_PASSWORD`: the keystore password.
- `NEXORA_ANDROID_KEY_ALIAS`: the alias used when creating the key.
- `NEXORA_ANDROID_KEY_PASSWORD`: the key password.

Do not put these values in repository files or Actions variables.

Optional repository Actions variables:

- `NEXORA_FIREBASE_APPCHECK_SITE_KEY`
- `NEXORA_FIREBASE_VAPID_KEY`

The workflow validates the committed Firebase configuration against the owner-confirmed production project and fails closed if required production configuration or signing material is absent.

## 3. Publish a version

After the release workflow changes are merged and the four signing secrets are configured, create and push a version tag from the intended `main` commit:

```bash
git checkout main
git pull --ff-only
git tag android-v1.0.0
git push origin android-v1.0.0
```

The tag triggers production type checks, unit tests, web asset build, Capacitor Android synchronization, signed release APK build, package-ID verification, cryptographic signature verification, and SHA-256 generation. The workflow then attaches the APK and checksum to the matching GitHub Release.

The download centre reads the latest GitHub Release and only enables its download action when an APK asset is published. Do not describe the app as published until the release contains the APK and the download link has been checked on the production site.
