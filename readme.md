# Audiobookshelf Android App

A fork of [advplyr/audiobookshelf-app](https://github.com/advplyr/audiobookshelf-app) — the Android client for [Audiobookshelf](https://audiobookshelf.org), a self-hosted audiobook and podcast server.

[GitHub](https://github.com/darthrater78/audiobookshelf-app) · [Latest release notes](https://github.com/darthrater78/audiobookshelf-app/releases/latest)

This fork is wholly authored with AI using the [dev-skills](https://github.com/darthrater78/claude-vibe-skills) methodology.

**Requires an Audiobookshelf server to connect with**

### What's different in this fork

- Per-item playback speed with three-tier fallback (per-item, per-media-type default, global)
- Updated dependencies (Capacitor CLI 7, OkHttp, Jackson) and JDK 21 build
- Fixed launcher icons
- Android-only (iOS removed)

### Install

Get the APK from [Releases](https://github.com/darthrater78/audiobookshelf-app/releases).

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
- [Node.js](https://nodejs.org/en/) (version 20)
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
winget install -e --id OpenJS.NodeJS --version 20.11.0;
```

</p>
</details>
<br>

### Mac Environment Setup

Required Software:

- [Android Studio](https://developer.android.com/studio)
- [Node.js](https://nodejs.org/en/) (version 20)
- [Android SDK](https://developer.android.com/studio)

<details>
<summary>Install the required software with <a href=(https://brew.sh/)>homebrew</a></summary>

<p>

```zsh
brew install android-studio node
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
