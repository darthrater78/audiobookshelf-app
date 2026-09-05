# Changelog

## Unreleased

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

First release of this fork. Forked from [advplyr/audiobookshelf-app](https://github.com/advplyr/audiobookshelf-app) at v0.9.74-beta. This fork is wholly authored with AI using the [dev-skills](https://github.com/darthrater78/claude-vibe-skills) methodology.

### Added
- Per-item playback speed — tap speed or +/- to set a per-item override; save as default per media type (audiobooks/podcasts) via the modal
- Three-tier playback speed fallback: per-item → per-media-type default → global
- Native (Kotlin) three-tier speed resolution matching the web layer
- Android Auto speed cycling uses per-item overrides

### Changed
- Updated dependencies: Capacitor 7, AndroidX, ExoPlayer, Kotlin
- Fixed launcher icons (black background, correct orientation)
- Removed iOS platform (Android-only fork)
- Removed upstream CI workflows and issue templates
