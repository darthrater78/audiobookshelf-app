# Audiobookshelf Android App

A fork of [advplyr/audiobookshelf-app](https://github.com/advplyr/audiobookshelf-app) — the Android client for [Audiobookshelf](https://audiobookshelf.org), a self-hosted audiobook and podcast server.

[GitHub](https://github.com/darthrater78/audiobookshelf-app) · [v1.0.2 release notes](https://github.com/darthrater78/audiobookshelf-app/releases/tag/v1.0.2)

This fork is wholly authored with AI using the [dev-skills](https://github.com/darthrater78/claude-vibe-skills) methodology.

**Requires an Audiobookshelf server to connect with**

### What's different in this fork

- Per-item playback speed with three-tier fallback (per-item, per-media-type default, global)
- Updated dependencies (Capacitor CLI 7, OkHttp, Jackson) and JDK 21 build
- Fixed launcher icons
- Android-only (iOS removed)

### Install

Get the APK from [Releases](https://github.com/darthrater78/audiobookshelf-app/releases). Each release also carries a `.sha256` checksum file for the APK.

### Security

What the app stores on the device, and whether it is encrypted at rest:

| Data | Where | Encrypted at rest |
|---|---|---|
| Refresh tokens | App-private `SecureStorage` preferences | Yes: AES-GCM (Android Keystore default 128-bit key), key held in the Android Keystore (never leaves the device, not included in backups) |
| Access token, server list, local library index | App-private Paper database | No, protected by Android app sandboxing only. The access token is short-lived and refreshed from the encrypted refresh token |
| Settings, per-item playback speeds | App-private Capacitor preferences | No, not sensitive |
| Downloaded audiobooks, podcasts and ebooks | The folders you pick when downloading | No, plain media files |

Android backup is enabled (`allowBackup`), so the unencrypted app data above can be included in a device backup; the refresh tokens cannot be decrypted outside this device. Cleartext HTTP and user-installed CA certificates are allowed so the app can reach self-hosted servers on a LAN or behind a self-signed certificate. Prefer HTTPS where your server supports it.

---

[Upstream project: github.com/advplyr/audiobookshelf](https://github.com/advplyr/audiobookshelf) | [audiobookshelf.org](https://audiobookshelf.org) | [Discord](https://discord.gg/pJsjuNCKRq)

<img alt="Screenshot" src="https://github.com/advplyr/audiobookshelf-app/raw/master/screenshots/DeviceDemoScreens.png" />

## Contributing

This application is built using [NuxtJS](https://nuxtjs.org/) and [Capacitor](https://capacitorjs.com/) for Android.

### Localization

Thank you to [Weblate](https://hosted.weblate.org/engage/audiobookshelf/) for hosting our localization infrastructure pro-bono. If you want to see Audiobookshelf in your language, please help us localize. Additional information on helping with the translations [here](https://www.audiobookshelf.org/faq#how-do-i-help-with-translations). <a href="https://hosted.weblate.org/engage/audiobookshelf/"> <img src="https://hosted.weblate.org/widget/audiobookshelf/abs-mobile-app/horizontal-auto.svg" alt="Translation status" /> </a>

### Windows Environment Setup

Required Software:

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/en/) (24 LTS)
- JDK 21 (bundled with current Android Studio)
- Code editor of choice ([VSCode](https://code.visualstudio.com/download), etc)
- [Android Studio](https://developer.android.com/studio)
- [Android SDK](https://developer.android.com/studio)

<details>
<summary>Install the required software with <a href=(https://docs.microsoft.com/en-us/windows/package-manager/winget/#production-recommended)>winget</a></summary>

<p>
Note: This requires a PowerShell prompt with winget installed. You should be able to copy and paste the code block to install. If you use an elevated PowerShell prompt, UAC will not pop up during the installs.

```PowerShell
winget install -e --id Git.Git; `
winget install -e --id Microsoft.VisualStudioCode; `
winget install -e --id  Google.AndroidStudio; `
winget install -e --id OpenJS.NodeJS.LTS;
```

</p>
</details>
<br>

### Mac Environment Setup

Required Software:

- [Android Studio](https://developer.android.com/studio)
- [Node.js](https://nodejs.org/en/) (24 LTS)
- JDK 21 (bundled with current Android Studio)
- [Android SDK](https://developer.android.com/studio)

<details>
<summary>Install the required software with <a href=(https://brew.sh/)>homebrew</a></summary>

<p>

```zsh
brew install --cask android-studio && brew install node@24
```

</p>
</details>

### Build the Android app

Clone or fork the project and `cd` into the project directory.

Install the required node packages:

```shell
npm install
```

Generate static web app:

```shell
npm run generate
```

Copy web app into native Android folder:

```shell
npx cap sync android
```

Open Android Studio:

```shell
npx cap open android
```

After making changes to the JS layer, rebuild and sync:

```shell
npm run sync
```

Build a debug APK and run the unit tests from the command line (what CI runs):

```shell
./android/gradlew assembleDebug testDebugUnitTest -p android
```

### Releases

Releases are built and signed by `.github/workflows/release.yml` when a `v*` tag is pushed. The workflow refuses to publish unless the tag is on `master`, matches the version in `android/app/build.gradle` and `package.json`, and Build Check passed for that commit. Pre-release tags (`v1.0.2-beta.1`, `-dev.N`, `-alpha.N`, `-rc.N`) may be pushed from a branch to publish a signed test build as a GitHub pre-release.
