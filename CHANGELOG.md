# Changelog

## [1.0.2](https://github.com/darthrater78/audiobookshelf-app/releases/tag/v1.0.2) — 2026-09-27

Security and quality audit release: hardened release pipeline, playback-speed fixes, and dependency advisories reduced from 88 to 59.

### Fixed
- The seek bar's drag handle was clipped to the 6 px bar by an upstream overflow fix, so it was mostly invisible and hard to grab. Only the progress fills are clipped now, so the full handle shows and can be dragged again
- A speed chosen in Android Auto could be reverted on the phone by any unrelated settings change (e.g. bookshelf sort order), because the web layer never re-read overrides written natively
- Picking a speed in the speed modal saved it twice (once on tap, again on close)
- "Set as default" left an older per-item override in place, so the next play of that item ignored the speed just saved as default

### Changed
- Release workflow: pinned actions to commit SHAs and dropped the third-party release action; refuses to publish unless the tag is on `master`, matches the version in `build.gradle` and `package.json`, and Build Check passed for that commit; signing secrets are passed via `env:` and the keystore is deleted after the build; the APK signature is verified and a SHA-256 checksum is attached; release notes come from this changelog. Pre-release tags (`v1.0.2-beta.1`, `-dev.N`, `-alpha.N`, `-rc.N`) can be pushed from a branch to publish a signed test build as a GitHub pre-release. The publish job runs in a `release` environment that can be given required reviewers
- Build Check: runs on every branch push (and by hand), Node 24 LTS, least-privilege token, concurrency and timeout, pinned actions; runs the Android unit tests (JUnit restored as a test dependency) and uploads two test builds per commit: a debug APK, and a release-signed APK with its SHA-256 checksum (signature verified, keystore deleted after the build)
- Added Dependabot version updates (npm, Gradle, GitHub Actions) and an actionlint workflow
- Signed test builds now run in the same `release` environment as the publish job, so required reviewers there hold every signing run for approval. Both write the keystore to the runner's temp directory, outside the checkout, and pass it to Gradle through environment variables instead of a `keystore.properties` file
- Build Check and the publish job validate the Gradle wrapper jar against Gradle's published checksums; published APKs carry a build-provenance attestation
- Added a Dependency Review workflow that fails a pull request adding a dependency with a High or Critical advisory, plus a weekly `npm audit` report
- versionCode 122, so this build installs over the earlier 1.0.2 test builds (versionCode 120 and 121)
- Connect screen now links to the release notes alongside GitHub, as the account page does
- Removed the unused `kotlin_version` from `android/variables.gradle`; `android/build.gradle` is the single source

### Security
- Item and podcast episode descriptions (which can come straight from third-party RSS feeds) are sanitized with DOMPurify 3.4.16 before rendering, instead of relying only on the server to strip scripts. The WebView can reach the native bridge, so injected script there would have had app-level access. The welcome message also escapes the username
- The MOBI reader renders book HTML in a sandboxed iframe, so event-handler attributes in a crafted ebook can no longer run script with access to the native bridge
- The access token, server list and refresh tokens are excluded from Android cloud backup and device transfer; after a restore the app asks you to log in again
- PDF reader loads documents with `isEvalSupported: false`, closing the malicious-PDF script execution path in pdfjs-dist 2.x (GHSA-wgrm-67xf-hhpq) that has no fixed release on that line
- epubjs 0.3.88 → 0.3.93, replacing the unmaintained `xmldom` (critical advisories) with `@xmldom/xmldom`, which is pinned to its 0.8.15 LTS line through `overrides` because epubjs still asks for the vulnerable 0.7 range
- Non-breaking `npm audit fix` across the lockfile (88 → 59 advisories). The remainder sit in the Nuxt 2 toolchain, `@nuxtjs/axios` and `@teckel/vue-pdf` and need the Nuxt 3/4 migration

### Docs
- README: added a Security section (what is stored on the device and whether it is encrypted at rest), Node 24 LTS / JDK 21 setup, the CI build command and how releases and pre-releases are published
- Corrected the v1.0.0 notes: the fork was taken from v0.14.0-beta, and ExoPlayer, AndroidX and Kotlin were not updated

## [1.0.1](https://github.com/darthrater78/audiobookshelf-app/releases/tag/v1.0.1) — 2026-09-05

Rework of per-item playback speed. The v1.0.0 implementation resolved speed independently in the web and native layers, using different storage keys, so overrides were frequently lost and playback fell back to 1x.

### Fixed
- Per-item speed override was never found for downloaded books — the override was saved under the server item id but looked up under the `local_` id, so the two never matched
- Setting a speed for an item whose download was not linked to a server overwrote the global default instead of creating an override
- Starting the app could reset a correctly restored session to the global speed, because the settings-loaded event resolved a speed before the session and the override map were available
- Per-media-type defaults (audiobooks/podcasts) never applied on the play path — `mediaType` was never passed to the resolver
- Setting a speed for one item leaked into the global default via a native cache that was written with per-item speeds and never invalidated
- Speed reverted to 1x after a transcode fallback, because the remembered rate was cleared whenever a null rate was passed
- "Item override active" and "Reset to default" did not appear in the speed modal — the override map was mutated in a way Vue 2 cannot track
- A first-time global speed set from Android Auto was never persisted (missing `apply()`)
- An out-of-range or corrupt stored speed reached ExoPlayer directly, which rejects non-positive values

### Changed
- The native layer is now the single resolver for playback speed. The web layer requests playback without a rate, and mirrors the rate native reports back via `onPlaybackSpeedChanged`
- Per-item speed is keyed consistently on both sides: server item id when linked, `local_` id otherwise (`PlaybackSession.playbackRateKey` / `speedKeyForSession`)
- `preparePlayer` emits the rate it applied, so the UI reflects restored and auto-advanced sessions
- Added `AbsAudioPlayer.getPlaybackSpeed()` so the UI can sync after a reload without waiting for an event it may have missed

## [1.0.0](https://github.com/darthrater78/audiobookshelf-app/releases/tag/v1.0.0) — 2026-09-04

First release of this fork. Forked from [advplyr/audiobookshelf-app](https://github.com/advplyr/audiobookshelf-app) at v0.14.0-beta. This fork is wholly authored with AI using the [dev-skills](https://github.com/darthrater78/claude-vibe-skills) methodology.

### Added
- Per-item playback speed — tap speed or +/- to set a per-item override; save as default per media type (audiobooks/podcasts) via the modal
- Three-tier playback speed fallback: per-item → per-media-type default → global
- Native (Kotlin) three-tier speed resolution matching the web layer
- Android Auto speed cycling uses per-item overrides

### Changed
- Updated dependencies: Capacitor CLI 7, OkHttp 4.12.0, Jackson 2.17.2, npm lockfile refresh; Android build moved to JDK 21
- Fixed launcher icons (black background, correct orientation)
- Removed iOS platform (Android-only fork)
- Removed upstream CI workflows and issue templates
