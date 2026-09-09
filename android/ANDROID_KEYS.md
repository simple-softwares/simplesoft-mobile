# Android Build & Signing Reference

## App Identity

| Field | Value |
|---|---|
| Application ID | `com.simplesoft.workspace` |
| Package Name (Firebase) | `com.simplesoft.leados` |
| App Name | SimpleSoft Workspace |
| Version Code | 1 |
| Version Name | 1.0 |

> **Note:** Firebase `google-services.json` still uses the old package name `com.simplesoft.leados`. If you rename the app or publish to Play Store under `com.simplesoft.workspace`, update the Firebase project and re-download `google-services.json`.

---

## SDK Versions

| Setting | Value |
|---|---|
| compileSdkVersion | 35 |
| targetSdkVersion | 35 |
| minSdkVersion | 23 (Android 6.0+) |
| buildToolsVersion | 35.0.0 |
| NDK Version | 26.1.10909125 |
| Kotlin Version | 1.9.22 |

---

## Gradle

| Setting | Value |
|---|---|
| Gradle Wrapper | 8.5 |
| JVM Heap | -Xmx2048m |
| Architectures | armeabi-v7a, arm64-v8a, x86, x86_64 |
| Hermes JS Engine | Enabled |
| New Architecture | Disabled |

---

## Release Signing (Keystore)

Signing credentials are stored in `android/gradle.properties` — **never commit real passwords to git**.

| Field | Value |
|---|---|
| Keystore file | `my-release-key.keystore` |
| Key alias | `my-key-alias` |
| Store password | `123456789` |
| Key password | `123456789` |

The `app/build.gradle` reads these via:
```
MYAPP_UPLOAD_STORE_FILE
MYAPP_UPLOAD_STORE_PASSWORD
MYAPP_UPLOAD_KEY_ALIAS
MYAPP_UPLOAD_KEY_PASSWORD
```

> **Important:** `gradle.properties` currently uses `MYAPP_RELEASE_*` keys but `build.gradle` reads `MYAPP_UPLOAD_*`. Make sure these match, or builds will be unsigned.
> Fix: rename the keys in `gradle.properties` to `MYAPP_UPLOAD_*`.

### Generate a new keystore (if lost)

```bash
keytool -genkeypair -v \
  -keystore android/app/my-release-key.keystore \
  -alias my-key-alias \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

### Verify keystore fingerprints

```bash
keytool -list -v \
  -keystore android/app/my-release-key.keystore \
  -alias my-key-alias
```

---

## Debug Signing

| Field | Value |
|---|---|
| Keystore file | `android/app/debug.keystore` |
| Key alias | `androiddebugkey` |
| Store password | `android` |
| Key password | `android` |

---

## Firebase / Google Services

| Field | Value |
|---|---|
| Firebase Project ID | `leados-1cc58` |
| Firebase Project Number | `480330871250` |
| Firebase App ID (Android) | `1:480330871250:android:ab3214568ecbb66f88580b` |
| Storage Bucket | `leados-1cc58.firebasestorage.app` |
| Google API Key | `AIzaSyB-JRxuqot8QZ03YUE_xhCrgXaJkFL64Kg` |
| Google Web Client ID | `480330871250-0hrts60lab2algs69vqtk9r011rn1k1h.apps.googleusercontent.com` |

Config file location: `android/app/google-services.json`

---

## Build Commands

```bash
# Debug APK
cd android && ./gradlew assembleDebug

# Release APK
cd android && ./gradlew assembleRelease

# Release AAB (for Play Store)
cd android && ./gradlew bundleRelease

# Clean build
cd android && ./gradlew clean

# Install debug on connected device
cd android && ./gradlew installDebug
```

Output locations:
- APK: `android/app/build/outputs/apk/release/app-release.apk`
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`

---

## Permissions

| Permission | Purpose |
|---|---|
| INTERNET | Odoo / API calls |
| ACCESS_NETWORK_STATE | Offline detection |
| RECORD_AUDIO | Voice notes |
| CALL_PHONE | Direct call from contacts |
| READ_PHONE_STATE | Telecalling features |
| READ_CALL_LOG | Call history |
| CAMERA | Barcode scanning (future) |
| READ/WRITE_EXTERNAL_STORAGE | Attachments (≤ API 32) |
| POST_NOTIFICATIONS | Push notifications |
| VIBRATE / WAKE_LOCK | Notification alerts |

---

## Play Store Checklist (before first upload)

- [ ] Increment `versionCode` and `versionName` in `app/build.gradle`
- [ ] Confirm keystore file exists at `android/app/my-release-key.keystore`
- [ ] Align `MYAPP_UPLOAD_*` keys in `gradle.properties`
- [ ] Update `google-services.json` package name to `com.simplesoft.workspace`
- [ ] Run `./gradlew bundleRelease` — upload the `.aab`
- [ ] Add SHA-1 and SHA-256 fingerprints to Firebase console for the release key
