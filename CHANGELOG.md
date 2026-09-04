# Changelog

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
