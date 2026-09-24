<template>
  <div>
    <app-audio-player ref="audioPlayer" :bookmarks="bookmarks" :sleep-timer-running="isSleepTimerRunning" :sleep-time-remaining="sleepTimeRemaining" :serverLibraryItemId="serverLibraryItemId" @selectPlaybackSpeed="showPlaybackSpeedModal = true" @updateTime="(t) => (currentTime = t)" @playbackSpeedChanged="onPlaybackSpeedChanged" @showSleepTimer="showSleepTimer" @showBookmarks="showBookmarks" />

    <modals-playback-speed-modal v-model="showPlaybackSpeedModal" :playback-rate.sync="playbackSpeed" :media-type="currentMediaType" :has-item-override="hasItemOverride" :media-type-default="currentMediaTypeDefault" @update:playbackRate="updatePlaybackSpeed" @change="changePlaybackSpeed" @setDefault="setDefaultPlaybackSpeed" @clearItemOverride="clearItemOverride" />
    <modals-sleep-timer-modal v-model="showSleepTimerModal" :current-time="sleepTimeRemaining" :sleep-timer-running="isSleepTimerRunning" :current-end-of-chapter-time="currentEndOfChapterTime" :is-auto="isAutoSleepTimer" @change="selectSleepTimeout" @cancel="cancelSleepTimer" @increase="increaseSleepTimer" @decrease="decreaseSleepTimer" />
    <modals-bookmarks-modal v-model="showBookmarksModal" :bookmarks="bookmarks" :current-time="currentTime" :library-item-id="serverLibraryItemId" :playback-rate="playbackSpeed" @select="selectBookmark" />
  </div>
</template>

<script>
import { AbsAudioPlayer, AbsLogger } from '@/plugins/capacitor'
import { Dialog } from '@capacitor/dialog'
import CellularPermissionHelpers from '@/mixins/cellularPermissionHelpers'

export default {
  data() {
    return {
      isReady: false,
      settingsLoaded: false,
      audioPlayerReady: false,
      stream: null,
      download: null,
      showPlaybackSpeedModal: false,
      showBookmarksModal: false,
      showSleepTimerModal: false,
      playbackSpeed: 1,
      currentTime: 0,
      isSleepTimerRunning: false,
      sleepTimerEndTime: 0,
      sleepTimeRemaining: 0,
      isAutoSleepTimer: false,
      onLocalMediaProgressUpdateListener: null,
      onSleepTimerEndedListener: null,
      onSleepTimerSetListener: null,
      onMediaPlayerChangedListener: null,
      sleepInterval: null,
      currentEndOfChapterTime: 0,
      serverLibraryItemId: null,
      serverEpisodeId: null,
      itemPlaybackRates: {},
      itemRatesLoaded: false
    }
  },
  mixins: [CellularPermissionHelpers],
  computed: {
    bookmarks() {
      if (!this.serverLibraryItemId) return []
      return this.$store.getters['user/getUserBookmarksForItem'](this.serverLibraryItemId)
    },
    isIos() {
      return this.$platform === 'ios'
    },
    currentPlaybackSession() {
      return this.$store.state.currentPlaybackSession
    },
    currentMediaType() {
      return this.currentPlaybackSession?.mediaType || null
    },
    currentSpeedKey() {
      return this.speedKeyForSession(this.currentPlaybackSession)
    },
    hasItemOverride() {
      const key = this.currentSpeedKey
      if (!key) return false
      return this.itemPlaybackRates[key] != null
    },
    currentMediaTypeDefault() {
      const settings = this.$store.state.user.settings
      if (this.currentMediaType === 'podcast') return settings.podcastPlaybackRate
      if (this.currentMediaType === 'book') return settings.bookPlaybackRate
      return null
    }
  },
  methods: {
    showBookmarks() {
      this.showBookmarksModal = true
    },
    selectBookmark(bookmark) {
      this.showBookmarksModal = false
      if (!bookmark || isNaN(bookmark.time)) return
      const bookmarkTime = Number(bookmark.time)
      if (this.$refs.audioPlayer) {
        this.$refs.audioPlayer.seek(bookmarkTime)
      }
    },
    onSleepTimerEnded({ value: currentPosition }) {
      this.isSleepTimerRunning = false
      if (currentPosition) {
        console.log('Sleep Timer Ended Current Position: ' + currentPosition)
      }
    },
    onSleepTimerSet(payload) {
      const { value: sleepTimeRemaining, isAuto } = payload
      console.log('SLEEP TIMER SET', JSON.stringify(payload))
      if (sleepTimeRemaining === 0) {
        console.log('Sleep timer canceled')
        this.isSleepTimerRunning = false
      } else {
        this.isSleepTimerRunning = true
      }

      this.isAutoSleepTimer = !!isAuto
      this.sleepTimeRemaining = sleepTimeRemaining
    },
    showSleepTimer() {
      if (this.$refs.audioPlayer && this.$refs.audioPlayer.currentChapter) {
        this.currentEndOfChapterTime = Math.floor(this.$refs.audioPlayer.currentChapter.end)
      } else {
        this.currentEndOfChapterTime = 0
      }
      this.showSleepTimerModal = true
    },
    async selectSleepTimeout({ time, isChapterTime }) {
      console.log('Setting sleep timer', time, isChapterTime)
      var res = await AbsAudioPlayer.setSleepTimer({ time: String(time), isChapterTime })
      if (!res.success) {
        return this.$toast.error('Sleep timer did not set, invalid time')
      }
    },
    increaseSleepTimer() {
      // Default time to increase = 5 min
      AbsAudioPlayer.increaseSleepTime({ time: '300000' })
    },
    decreaseSleepTimer() {
      AbsAudioPlayer.decreaseSleepTime({ time: '300000' })
    },
    async cancelSleepTimer() {
      console.log('Canceling sleep timer')
      await AbsAudioPlayer.cancelSleepTimer()
    },
    streamClosed() {
      console.log('Stream Closed')
    },
    streamProgress(data) {
      if (!data.numSegments) return
      const chunks = data.chunks
      if (this.$refs.audioPlayer) {
        this.$refs.audioPlayer.setChunksReady(chunks, data.numSegments)
      }
    },
    streamReady() {
      console.log('[StreamContainer] Stream Ready')
      if (this.$refs.audioPlayer) {
        this.$refs.audioPlayer.setStreamReady()
      }
    },
    streamReset({ streamId, startTime }) {
      console.log('received stream reset', streamId, startTime)
      if (this.$refs.audioPlayer) {
        if (this.stream && this.stream.id === streamId) {
          this.$refs.audioPlayer.resetStream(startTime)
        }
      }
    },
    /**
     * Canonical key for a per-item speed override.
     *
     * A downloaded book is played by its "local_" id but its session reports the server
     * id, so keying off whichever one happens to be at hand splits the same book into two
     * entries and the override is never found again. Prefer the server id, fall back to
     * the local id. PlaybackSession.playbackRateKey on the native side derives the same
     * key - keep the two in sync.
     */
    speedKeyForSession(session) {
      if (!session) return null
      return session.libraryItemId || session.localLibraryItem?.id || null
    },
    speedKeyForPayload(payload) {
      if (!payload) return null
      return payload.serverLibraryItemId || payload.libraryItemId || null
    },
    /**
     * Speed for display only. The native layer owns the real resolution and reports the
     * rate it applied via onPlaybackSpeedChanged - never use this to drive the player.
     */
    resolvePlaybackRate(speedKey, mediaType) {
      const itemRate = speedKey ? this.itemPlaybackRates[speedKey] : null
      if (itemRate != null) return itemRate

      const settings = this.$store.state.user.settings
      if (mediaType === 'podcast' && settings.podcastPlaybackRate != null) {
        return settings.podcastPlaybackRate
      }
      if (mediaType === 'book' && settings.bookPlaybackRate != null) {
        return settings.bookPlaybackRate
      }
      return settings.playbackRate
    },
    /** Native reports the rate it actually applied - mirror it, do not fight it. */
    onPlaybackSpeedChanged(rate) {
      if (rate == null || isNaN(rate)) return
      this.playbackSpeed = Number(rate)
      // Android Auto persists its per-item override natively, so pick it up here or
      // hasItemOverride stays stale for the rest of the session
      this.reloadItemPlaybackRates()
    },
    async reloadItemPlaybackRates() {
      this.itemPlaybackRates = (await this.$localStore.getItemPlaybackRates()) || {}
    },
    /**
     * Re-reads the override map before deciding, since native may have written an override
     * (Android Auto speed cycling) that this component never saw. Resolving against a stale
     * map would push a default into a player that is correctly running at its override.
     */
    async applyDefaultSpeedIfNoOverride() {
      await this.reloadItemPlaybackRates()
      if (this.hasItemOverride) {
        console.log(`[AudioPlayerContainer] Settings Update | Item override active, keeping ${this.playbackSpeed}x`)
        return
      }
      const resolvedRate = this.resolvePlaybackRate(this.currentSpeedKey, this.currentMediaType)
      if (this.playbackSpeed !== resolvedRate) {
        this.playbackSpeed = resolvedRate
        console.log(`[AudioPlayerContainer] Settings Update | PlaybackRate Updated: ${resolvedRate}`)
        this.updatePlaybackSpeed(resolvedRate)
      }
    },
    updatePlaybackSpeed(speed) {
      if (this.$refs.audioPlayer) {
        console.log(`[AudioPlayerContainer] Update Playback Speed: ${speed}`)
        this.$refs.audioPlayer.setPlaybackSpeed(speed)
      }
    },
    changePlaybackSpeed(speed) {
      const key = this.currentSpeedKey
      if (key) {
        // $set so the override map stays reactive - a plain assignment adds an untracked
        // key in Vue 2 and hasItemOverride never updates.
        this.$set(this.itemPlaybackRates, key, speed)
        this.$localStore.setItemPlaybackRate(key, speed)
      } else if (!this.currentPlaybackSession) {
        // Only with no session at all does changing the speed mean "change my default".
        // Falling through to this while a session was playing is what let a per-item
        // speed quietly overwrite the global default.
        this.$store.dispatch('user/updateUserSettings', { playbackRate: speed })
      }
      this.playbackSpeed = speed
      this.updatePlaybackSpeed(speed)
    },
    setDefaultPlaybackSpeed(speed) {
      const mediaType = this.currentMediaType
      if (!mediaType) return
      const key = mediaType === 'podcast' ? 'podcastPlaybackRate' : 'bookPlaybackRate'
      // The speed the user is saving as default is also what this item is playing at, so an
      // older override would win on the next play and silently undo the choice. Drop it and
      // let the item follow the new default.
      const itemKey = this.currentSpeedKey
      if (itemKey && this.hasItemOverride) {
        this.$delete(this.itemPlaybackRates, itemKey)
        this.$localStore.removeItemPlaybackRate(itemKey)
      }
      this.$store.dispatch('user/updateUserSettings', { [key]: speed })
      const label = mediaType === 'podcast' ? 'podcasts' : 'audiobooks'
      this.$toast.success(`Default speed for ${label} set to ${speed}x`)
    },
    clearItemOverride() {
      const key = this.currentSpeedKey
      if (!key) return
      // $delete so the computed re-evaluates - plain delete is not reactive in Vue 2
      this.$delete(this.itemPlaybackRates, key)
      this.$localStore.removeItemPlaybackRate(key)
      const resolvedRate = this.resolvePlaybackRate(key, this.currentMediaType)
      this.playbackSpeed = resolvedRate
      this.updatePlaybackSpeed(resolvedRate)
      this.$toast.success(`Cleared speed override, using ${resolvedRate}x`)
    },
    settingsUpdated(settings) {
      const session = this.currentPlaybackSession

      // No session yet: track the default for display only. This fires on app start while
      // the native player may already be restoring a session at its own per-item speed -
      // pushing the global rate into the player here is what reset playback to 1x.
      if (!session) {
        this.playbackSpeed = settings.playbackRate
        console.log(`[AudioPlayerContainer] Settings Update | No session, display rate: ${this.playbackSpeed}`)
      } else if (!this.itemRatesLoaded) {
        // Overrides not read from storage yet - resolving now could wrongly conclude this
        // item has no override and reset a correctly restored session to the global rate
        console.log('[AudioPlayerContainer] Settings Update | Overrides not loaded yet, leaving player speed alone')
      } else {
        // An explicit per-item speed outranks any default the user just changed
        this.applyDefaultSpeedIfNoOverride()
      }

      if (!this.settingsLoaded) {
        this.settingsLoaded = true
        this.notifyOnReady()
      }
    },
    closeStreamOnly() {
      // If user logs out or disconnects from server and not playing local
      if (this.$refs.audioPlayer && !this.$refs.audioPlayer.isLocalPlayMethod) {
        this.$refs.audioPlayer.closePlayback()
      }
    },
    castLocalItem() {
      if (!this.serverLibraryItemId) {
        this.$toast.error(`Cannot cast locally downloaded media`)
      } else {
        // Change to server library item
        this.playServerLibraryItemAndCast(this.serverLibraryItemId, this.serverEpisodeId)
      }
    },
    playServerLibraryItemAndCast(libraryItemId, episodeId) {
      var playbackRate = 1
      if (this.$refs.audioPlayer) {
        playbackRate = this.$refs.audioPlayer.currentPlaybackRate || 1
      }
      AbsAudioPlayer.prepareLibraryItem({ libraryItemId, episodeId, playWhenReady: false, playbackRate })
        .then((data) => {
          if (data.error) {
            const errorMsg = data.error || 'Failed to play'
            this.$toast.error(errorMsg)
          } else {
            console.log('Library item play response', JSON.stringify(data))
            AbsAudioPlayer.requestSession()
          }
        })
        .catch((error) => {
          console.error('Failed', error)
          this.$toast.error('Failed to play')
        })
    },
    async playLibraryItem(payload) {
      await AbsLogger.info({ tag: 'AudioPlayerContainer', message: `playLibraryItem: Received play request for library item ${payload.libraryItemId} ${payload.episodeId ? `episode ${payload.episodeId}` : ''}` })
      const libraryItemId = payload.libraryItemId
      const episodeId = payload.episodeId
      const startTime = payload.startTime
      const startWhenReady = !payload.paused

      const isLocal = libraryItemId.startsWith('local')
      if (!isLocal) {
        const hasPermission = await this.checkCellularPermission('streaming')
        if (!hasPermission) {
          this.$store.commit('setPlayerDoneStartingPlayback')
          return
        }
      }

      // When playing local library item and can also play this item from the server
      //   then store the server library item id so it can be used if a cast is made
      const serverLibraryItemId = payload.serverLibraryItemId || null
      const serverEpisodeId = payload.serverEpisodeId || null

      if (isLocal && this.$store.state.isCasting) {
        const { value } = await Dialog.confirm({
          title: 'Warning',
          message: `Cannot cast downloaded media items. Confirm to close cast and play on your device.`
        })
        if (!value) {
          this.$store.commit('setPlayerDoneStartingPlayback')
          return
        }
      }

      // if already playing this item then jump to start time
      if (this.$store.getters['getIsMediaStreaming'](libraryItemId, episodeId)) {
        console.log('Already streaming item', startTime)
        if (startTime !== undefined && startTime !== null) {
          // seek to start time
          AbsAudioPlayer.seek({ value: startTime })
        } else if (this.$refs.audioPlayer) {
          this.$refs.audioPlayer.play()
        }
        this.$store.commit('setPlayerDoneStartingPlayback')
        return
      }

      this.serverLibraryItemId = null
      this.serverEpisodeId = null

      // Optimistic display value only, so the UI does not flash 1x while the session
      // loads. The rate the player actually uses is resolved natively and arrives back
      // via onPlaybackSpeedChanged - deliberately no playbackRate in the prepare payload.
      const displayRate = this.resolvePlaybackRate(this.speedKeyForPayload(payload), payload.mediaType || null)
      this.playbackSpeed = displayRate
      if (this.$refs.audioPlayer) {
        this.$refs.audioPlayer.currentPlaybackRate = displayRate
      }

      console.log('Called playLibraryItem', libraryItemId, 'display rate', displayRate)
      const preparePayload = { libraryItemId, episodeId, playWhenReady: startWhenReady }
      if (startTime !== undefined && startTime !== null) preparePayload.startTime = startTime
      AbsAudioPlayer.prepareLibraryItem(preparePayload)
        .then((data) => {
          if (data.error) {
            const errorMsg = data.error || 'Failed to play'
            this.$toast.error(errorMsg)
          } else {
            console.log('Library item play response', JSON.stringify(data))
            if (!libraryItemId.startsWith('local')) {
              this.serverLibraryItemId = libraryItemId
            } else {
              this.serverLibraryItemId = serverLibraryItemId
            }
            if (episodeId && !episodeId.startsWith('local')) {
              this.serverEpisodeId = episodeId
            } else {
              this.serverEpisodeId = serverEpisodeId
            }
          }
        })
        .catch((error) => {
          console.error('Failed', error)
          this.$toast.error('Failed to play')
        })
        .finally(() => {
          this.$store.commit('setPlayerDoneStartingPlayback')
        })
    },
    pauseItem() {
      if (this.$refs.audioPlayer && this.$refs.audioPlayer.isPlaying) {
        this.$refs.audioPlayer.pause()
      }
    },
    onLocalMediaProgressUpdate(localMediaProgress) {
      console.log('Got local media progress update', localMediaProgress.progress, JSON.stringify(localMediaProgress))
      this.$store.commit('globals/updateLocalMediaProgress', localMediaProgress)
    },
    onMediaPlayerChanged(data) {
      this.$store.commit('setMediaPlayer', data.value)
    },
    onReady() {
      // The UI is reporting elsewhere we are ready
      this.isReady = true
      this.notifyOnReady()
    },
    notifyOnReady() {
      // TODO: was used on iOS to open last played media. May be removed
      if (!this.isIos) return

      // If settings aren't loaded yet, native player will receive incorrect settings
      console.log('Notify on ready... settingsLoaded:', this.settingsLoaded, 'isReady:', this.isReady)
      if (this.settingsLoaded && this.isReady && this.$store.state.isFirstAudioLoad) {
        this.$store.commit('setIsFirstAudioLoad', false) // Only run this once on app launch
        AbsAudioPlayer.onReady()
      }
    },
    playbackTimeUpdate(currentTime) {
      this.$refs.audioPlayer?.seek(currentTime)
    },
    /**
     * Fetch the current user's media progress from the server for a given library item / episode.
     * Returns the server media progress object, or null if the request fails, times out, or the
     * response doesn't match the requested library item.
     *
     * The audio player's loading state is shown while the request is in flight so the user
     * doesn't tap play before we have a chance to update the timestamps. The request timeout
     * is 7 seconds so a slow/unresponsive server doesn't block the user for long.
     */
    async getServerMediaProgressForCurrentSession() {
      if (!this.$store.state.user.user || !this.$store.state.networkConnected) return null
      const libraryItemId = this.currentPlaybackSession?.libraryItemId
      const episodeId = this.currentPlaybackSession?.episodeId
      if (!libraryItemId) return null

      if (this.$refs.audioPlayer?.isCheckingServerProgress) {
        console.log('[AudioPlayerContainer] getServerMediaProgressForCurrentSession: already checking server progress')
        return null
      }

      const url = episodeId ? `/api/me/progress/${libraryItemId}/${episodeId}` : `/api/me/progress/${libraryItemId}`

      this.$refs.audioPlayer?.setIsCheckingServerProgress(true)
      try {
        const data = await this.$nativeHttp.get(url, { connectTimeout: 7000, readTimeout: 7000 })
        if (!data || data.libraryItemId !== libraryItemId) return null
        return data
      } catch (error) {
        console.error('[AudioPlayerContainer] Failed to get server media progress', error)
        return null
      } finally {
        this.$refs.audioPlayer?.setIsCheckingServerProgress(false)
      }
    },
    getLocalMediaProgressForCurrentSession() {
      if (!this.currentPlaybackSession) return null
      return this.$store.getters['globals/getLocalMediaProgressById'](this.currentPlaybackSession.localLibraryItem?.id, this.currentPlaybackSession.localEpisodeId)
    },
    /**
     * Sync the server media progress with the local media progress
     */
    async syncServerMediaProgressWithLocalMediaProgress(localMediaProgressId, serverMediaProgress) {
      try {
        const newLocalMediaProgress = await this.$db.syncServerMediaProgressWithLocalMediaProgress({
          localMediaProgressId,
          mediaProgress: serverMediaProgress
        })
        if (newLocalMediaProgress?.id) {
          this.$store.commit('globals/updateLocalMediaProgress', newLocalMediaProgress)
        }
      } catch (error) {
        console.error('[AudioPlayerContainer] Failed to sync server progress with local media progress', error)
      }
    },
    /**
     * Check if the server media progress is more recent than the local media progress and sync if so
     */
    async checkSyncServerProgressWithLocalProgress(localMediaProgress) {
      if (!localMediaProgress) return
      console.log('[AudioPlayerContainer] checkSyncServerProgressWithLocalProgress: checking server media progress for local media item open in player')
      const serverMediaProgress = await this.getServerMediaProgressForCurrentSession()
      if (!serverMediaProgress?.lastUpdate || serverMediaProgress.lastUpdate <= localMediaProgress.lastUpdate) return

      console.log('[AudioPlayerContainer] checkSyncServerProgressWithLocalProgress: server progress is more recent than local progress. Server current time:', serverMediaProgress.currentTime, 'vs local', localMediaProgress.currentTime, `(server lastUpdate=${serverMediaProgress.lastUpdate} > local lastUpdate=${localMediaProgress.lastUpdate})`)
      if (!this.$refs.audioPlayer?.isPlaying && serverMediaProgress.currentTime !== localMediaProgress.currentTime) {
        // Use seek() so the native audio player's current session is updated
        this.$refs.audioPlayer.seek(serverMediaProgress.currentTime)
      }

      await this.syncServerMediaProgressWithLocalMediaProgress(localMediaProgress.id, serverMediaProgress)
    },
    /**
     * When socket is reconnected after a delay, if a local media item is open in the player (paused)
     * we fetch the server media progress and sync it if it is more recent than the local progress
     *
     * If there is no socket connection we may have missed external progress updates
     */
    async socketReconnected() {
      if (!this.currentPlaybackSession) return
      // dont update timestamps if player is playing
      if (this.$refs.audioPlayer?.isPlaying) return

      if (this.$refs.audioPlayer.isLocalPlayMethod) {
        const localMediaProgress = this.getLocalMediaProgressForCurrentSession()
        if (!localMediaProgress) {
          console.error('[AudioPlayerContainer] socket reconnected: Local media progress not found')
          return
        }

        await this.checkSyncServerProgressWithLocalProgress(localMediaProgress)
      }
    },
    /**
     * When device re-gains focus then refresh the timestamps in the audio player
     * if local item is open then fetch the server media progress and update if more recent
     */
    async deviceFocused(hasFocus) {
      if (!this.currentPlaybackSession || !hasFocus) return
      // dont update timestamps if player is playing
      if (this.$refs.audioPlayer?.isPlaying) return

      if (this.$refs.audioPlayer.isLocalPlayMethod) {
        const localMediaProgress = this.getLocalMediaProgressForCurrentSession()
        if (!localMediaProgress) {
          console.error('[AudioPlayerContainer] device visibility: Local media progress not found')
          return
        }

        console.log('[AudioPlayerContainer] device visibility: found local media progress', localMediaProgress.currentTime, 'last time in player is', this.currentTime)
        this.$refs.audioPlayer.currentTime = localMediaProgress.currentTime
        this.$refs.audioPlayer.timeupdate()

        await this.checkSyncServerProgressWithLocalProgress(localMediaProgress)
      } else {
        // server item so fetch server media progress and update player time
        console.log('[AudioPlayerContainer] device visibility: checking server media progress for server media item open in player')
        const data = await this.getServerMediaProgressForCurrentSession()
        if (!data) return
        if (!this.$refs.audioPlayer?.isPlaying) {
          console.log('[AudioPlayerContainer] device visibility: got server media progress', data.currentTime, 'last time in player is', this.currentTime)
          // Only seek if the difference is greater than 1 second
          if (Math.abs(data.currentTime - this.currentTime) > 1) {
            // Use seek() so the native audio player's current session is updated
            this.$refs.audioPlayer.seek(data.currentTime)
          }
        }
      }
    }
  },
  async mounted() {
    // Register bus listeners before any await so an early user-settings event is not missed
    this.$eventBus.$on('abs-ui-ready', this.onReady)
    this.$eventBus.$on('play-item', this.playLibraryItem)
    this.$eventBus.$on('pause-item', this.pauseItem)
    this.$eventBus.$on('close-stream', this.closeStreamOnly)
    this.$eventBus.$on('cast-local-item', this.castLocalItem)
    this.$eventBus.$on('user-settings', this.settingsUpdated)
    this.$eventBus.$on('playback-time-update', this.playbackTimeUpdate)
    this.$eventBus.$on('device-focus-update', this.deviceFocused)
    this.$eventBus.$on('socket-reconnected', this.socketReconnected)

    // Load the override map before anything can consult it. settingsUpdated checks
    // itemRatesLoaded so a settings event arriving first cannot resolve against an
    // empty map and push the global rate into a player already at its per-item speed.
    this.itemPlaybackRates = (await this.$localStore.getItemPlaybackRates()) || {}
    this.itemRatesLoaded = true
    this.playbackSpeed = this.$store.getters['user/getUserSetting']('playbackRate') || 1
    console.log(`[AudioPlayerContainer] Init Playback Speed: ${this.playbackSpeed} | Item overrides: ${Object.keys(this.itemPlaybackRates).length}`)

    this.onLocalMediaProgressUpdateListener = await AbsAudioPlayer.addListener('onLocalMediaProgressUpdate', this.onLocalMediaProgressUpdate)
    this.onSleepTimerEndedListener = await AbsAudioPlayer.addListener('onSleepTimerEnded', this.onSleepTimerEnded)
    this.onSleepTimerSetListener = await AbsAudioPlayer.addListener('onSleepTimerSet', this.onSleepTimerSet)
    this.onMediaPlayerChangedListener = await AbsAudioPlayer.addListener('onMediaPlayerChanged', this.onMediaPlayerChanged)
  },
  beforeDestroy() {
    this.onLocalMediaProgressUpdateListener?.remove()
    this.onSleepTimerEndedListener?.remove()
    this.onSleepTimerSetListener?.remove()
    this.onMediaPlayerChangedListener?.remove()

    this.$eventBus.$off('abs-ui-ready', this.onReady)
    this.$eventBus.$off('play-item', this.playLibraryItem)
    this.$eventBus.$off('pause-item', this.pauseItem)
    this.$eventBus.$off('close-stream', this.closeStreamOnly)
    this.$eventBus.$off('cast-local-item', this.castLocalItem)
    this.$eventBus.$off('user-settings', this.settingsUpdated)
    this.$eventBus.$off('playback-time-update', this.playbackTimeUpdate)
    this.$eventBus.$off('device-focus-update', this.deviceFocused)
    this.$eventBus.$off('socket-reconnected', this.socketReconnected)
  }
}
</script>
