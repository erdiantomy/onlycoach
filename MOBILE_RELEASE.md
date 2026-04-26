# Mobile Release Guide — Android AAB & iOS IPA

End-to-end checklist for shipping ONLY/COACH to the **Google Play Store** and
**Apple App Store** from the Capacitor scaffold already in this repo.

> **Where this runs**: every command below runs on **your local machine**
> (Mac for iOS, Mac/Windows/Linux for Android). The Lovable sandbox cannot
> produce native binaries.

---

## 0. One-time setup

1. Click **Export to GitHub** in Lovable, then `git clone` the repo locally.
2. `npm install`
3. Add native platforms (only the first time):
   ```bash
   npx cap add ios       # macOS only
   npx cap add android
   ```
4. Install the runtime plugins the app expects:
   ```bash
   npm install @capacitor/app @capacitor/browser @capacitor/push-notifications
   ```
5. Open the projects once to let the IDEs index:
   ```bash
   npx cap open ios       # opens Xcode
   npx cap open android   # opens Android Studio
   ```

---

## 1. Production configuration changes (REQUIRED before release)

### 1a. Remove the dev hot-reload server URL

`capacitor.config.ts` currently contains:
```ts
server: {
  url: "https://7ee943ba-...lovableproject.com?forceHideBadge=true",
  cleartext: true,
},
```

**Delete the entire `server` block** before building for release. If you
ship with it, the App Store / Play Store binary will load the Lovable
preview instead of the bundled `dist/`.

### 1b. Set a real `appId`

The default `appId` is `app.lovable.7ee943ba1d4f47bd8b62cc3bdd6d90c4`.
Change it to your own reverse-DNS bundle ID **before** the first
`npx cap add` (changing later requires re-adding platforms):
```ts
appId: "com.yourcompany.onlycoach",
appName: "ONLY COACH",
```

### 1c. Production env vars

Vite reads `.env.production` for `npm run build`. Required keys (all
publishable / safe-to-bundle):

| Var | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Lovable Cloud REST endpoint |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon key for Cloud |
| `VITE_SUPABASE_PROJECT_ID` | Project ref |
| `VITE_PAYMENTS_CLIENT_TOKEN` | Stripe publishable key (`pk_live_...`) — must be **live** for release |

These are auto-injected for you in the Lovable build pipeline. For local
release builds, copy them from the Lovable project settings into your local
`.env.production` before running `npm run build`.

> Server-side secrets (`STRIPE_API_KEY`, `XENDIT_SECRET_KEY`,
> `XENDIT_WEBHOOK_TOKEN`, `LOVABLE_API_KEY`, etc.) live in **Lovable
> Cloud → Secrets** and are only used by edge functions. Do **not** put
> them in `.env.production` — they would be bundled into the app.

### 1d. Production API URL

The app calls Supabase via `import.meta.env.VITE_SUPABASE_URL`, which is
the same prod URL in dev and release. No code change needed — just verify
the value in `.env.production` matches your live Cloud project.

The custom-scheme deep-link host in `src/components/DeepLinkHandler.tsx`
parses `onlycoach://...` URLs. If you change the scheme, also update:
- iOS `Info.plist` → `CFBundleURLSchemes`
- Android `AndroidManifest.xml` → `<intent-filter>`

### 1e. Run the preflight

```bash
npm run build
node scripts/mobile-preflight.mjs
```
Fix any `✗` errors before continuing. Warnings are OK to ship if you've
considered them.

---

## 2. Sync web assets into native projects

Every time you change web code or capacitor config:
```bash
npm run build && npx cap sync
```

---

## 3. Android — produce a signed AAB

### 3a. Generate an upload keystore (one-time)

```bash
keytool -genkey -v -keystore ~/keys/onlycoach-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias onlycoach
```
Back up the `.jks` file and passwords — losing them means losing the
ability to update the app on Play.

### 3b. Wire signing config

Create `android/keystore.properties` (gitignored):
```properties
storeFile=/absolute/path/to/onlycoach-upload.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=onlycoach
keyPassword=YOUR_KEY_PASSWORD
```

Edit `android/app/build.gradle` — inside `android { ... }`:
```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

signingConfigs {
    release {
        storeFile file(keystoreProperties['storeFile'])
        storePassword keystoreProperties['storePassword']
        keyAlias keystoreProperties['keyAlias']
        keyPassword keystoreProperties['keyPassword']
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        minifyEnabled true
        shrinkResources true
        proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
    }
}
```

### 3c. Bump version

`android/app/build.gradle`:
```gradle
defaultConfig {
    applicationId "com.yourcompany.onlycoach"
    versionCode 2          // increment for every Play upload
    versionName "1.0.1"    // semver shown to users
    minSdkVersion 22
    targetSdkVersion 34    // Play requires 34+ as of Aug 2024
}
```

### 3d. Build the AAB

```bash
cd android
./gradlew bundleRelease
```
Output: `android/app/build/outputs/bundle/release/app-release.aab` →
upload to **Play Console → Production → Create release**.

### 3e. Required Play Console setup

- App content questionnaire (target audience, ads, data safety)
- Privacy policy URL (your `/privacy` page works)
- Content rating
- For first release: closed testing → production rollout
- **Data safety**: declare auth, payment info, photos (`message-attachments`,
  `post-media`, `avatars`)

---

## 4. iOS — produce a signed IPA

### 4a. Apple Developer account

You need a paid **Apple Developer Program** membership ($99/yr).

### 4b. Open in Xcode

```bash
npx cap sync ios
npx cap open ios
```

In Xcode → select **App** target → **Signing & Capabilities**:
- **Team**: your Apple Developer team
- **Bundle Identifier**: matches `appId` from `capacitor.config.ts`
- Enable **Automatically manage signing** (Xcode creates provisioning profiles)
- Add capability **Push Notifications** (required for the push handler)
- Add capability **Associated Domains** if you want universal links
  (`applinks:onlycoach.app`)

### 4c. Configure Info.plist

`ios/App/App/Info.plist` should include:

```xml
<!-- Custom URL scheme for deep links -->
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array><string>onlycoach</string></array>
  </dict>
</array>

<!-- Privacy descriptions — required if any plugin touches these -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Attach photos to messages and posts.</string>
<key>NSCameraUsageDescription</key>
<string>Take photos to share with your coach.</string>
<key>NSUserTrackingUsageDescription</key>
<string>We do not track you across other apps.</string>
```

Do **not** set `NSAllowsArbitraryLoads = true` — Apple may reject. The
preflight script flags this.

### 4d. Bump version

In Xcode → App target → **General**:
- **Version** (CFBundleShortVersionString): `1.0.1`
- **Build** (CFBundleVersion): `2` (must increase every TestFlight/App Store
  upload)

### 4e. Archive & upload

1. Set scheme to **App** and destination to **Any iOS Device (arm64)**.
2. **Product → Archive**.
3. When the Organizer opens, click **Distribute App → App Store Connect →
   Upload**. Xcode signs with the auto-managed cert and uploads.
4. The build appears in **App Store Connect → TestFlight** after ~10–30 min
   processing.

### 4f. App Store Connect submission

- Create app record (matching bundle ID)
- Screenshots: 6.7", 6.5", 5.5" iPhone + 12.9" iPad if supporting iPad
- Privacy policy URL (`/privacy`)
- App Privacy questionnaire (mirror the Play Data Safety answers)
- **App Review Information**: provide a test login. Mention in review notes:
  > "Subscriptions and per-session bookings on iOS open in the system
  > browser per Guideline 3.1.1. The in-app 'Manage on Web' button is the
  > correct flow."

This last note matches the iOS compliance routing already in
`src/lib/checkout.ts` + `ManageOnWebNotice.tsx`.

---

## 5. Re-release checklist

Every subsequent release:

```bash
git pull
npm install
npm run build
npx cap sync
node scripts/mobile-preflight.mjs
```

Then bump versions and run the platform-specific build steps in §3d / §4e.
