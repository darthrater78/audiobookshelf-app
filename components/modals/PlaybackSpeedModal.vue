<template>
  <modals-modal v-model="show" @input="modalInput" :width="260" height="100%">
    <template #outer>
      <div class="absolute top-8 left-4 z-40">
        <p class="text-white text-2xl truncate">{{ $strings.LabelPlaybackSpeed }}</p>
      </div>
    </template>

    <div class="w-full h-full overflow-hidden absolute top-0 left-0 flex items-center justify-center">
      <div class="w-full overflow-x-hidden overflow-y-auto bg-primary rounded-lg border border-border" style="max-height: 75%" @click.stop>
        <ul class="w-full" role="listbox" aria-labelledby="listbox-label">
          <template v-for="rate in rates">
            <li :key="rate" class="text-fg select-none relative py-3" :class="rate === selected ? 'bg-bg-hover/50' : ''" role="option" @click="clickedOption(rate)">
              <div class="flex items-center justify-center">
                <span class="font-normal block truncate text-lg">{{ rate }}x</span>
              </div>
            </li>
          </template>
        </ul>
        <div class="flex items-center justify-center py-3 border-t border-fg/10">
          <button :disabled="!canDecrement" @click="decrement" class="icon-num-btn w-8 h-8 text-fg-muted rounded border border-border flex items-center justify-center">
            <span class="material-symbols">remove</span>
          </button>
          <div class="w-24 text-center">
            <p class="text-xl">{{ playbackRate }}<span class="text-lg">⨯</span></p>
          </div>
          <button :disabled="!canIncrement" @click="increment" class="icon-num-btn w-8 h-8 text-fg-muted rounded border border-border flex items-center justify-center">
            <span class="material-symbols">add</span>
          </button>
        </div>
        <div v-if="setDefaultLabel || hasItemOverride" class="flex flex-col items-center gap-1.5 py-2 px-3 border-t border-fg/10">
          <p v-if="hasItemOverride" class="text-xs text-fg-muted/70">Item override active</p>
          <button v-if="hasItemOverride" @click="clearOverride" class="w-full text-xs text-fg-muted px-2 py-1.5 rounded border border-border active:bg-bg-hover/50">
            Reset to default
          </button>
          <p v-if="currentDefaultLabel" class="text-xs text-fg-muted/50 capitalize">{{ currentDefaultLabel }}</p>
          <button v-if="setDefaultLabel" @click="setAsDefault" class="w-full text-xs text-fg-muted px-2 py-1.5 rounded border border-border active:bg-bg-hover/50">
            {{ setDefaultLabel }}
          </button>
        </div>
      </div>
    </div>
  </modals-modal>
</template>

<script>
export default {
  props: {
    value: Boolean,
    playbackRate: Number,
    mediaType: {
      type: String,
      default: null
    },
    hasItemOverride: {
      type: Boolean,
      default: false
    },
    mediaTypeDefault: {
      type: Number,
      default: null
    }
  },
  data() {
    return {
      currentPlaybackRate: 0,
      skipChangeOnClose: false,
      MIN_SPEED: 0.5,
      MAX_SPEED: 10
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.currentPlaybackRate = this.selected
      }
    }
  },
  computed: {
    show: {
      get() {
        return this.value
      },
      set(val) {
        this.$emit('input', val)
      }
    },
    selected: {
      get() {
        return this.playbackRate
      },
      set(val) {
        this.$emit('update:playbackRate', val)
      }
    },
    rates() {
      return [0.5, 1, 1.2, 1.5, 1.7, 2, 3]
    },
    canIncrement() {
      return this.playbackRate + 0.1 <= this.MAX_SPEED
    },
    canDecrement() {
      return this.playbackRate - 0.1 >= this.MIN_SPEED
    },
    mediaTypeLabel() {
      if (!this.mediaType) return null
      return this.mediaType === 'podcast' ? 'podcasts' : 'audiobooks'
    },
    currentDefaultLabel() {
      if (!this.mediaTypeLabel || this.mediaTypeDefault == null) return null
      return `${this.mediaTypeLabel} default: ${this.mediaTypeDefault}x`
    },
    setDefaultLabel() {
      if (!this.mediaTypeLabel) return null
      if (this.mediaTypeDefault === this.playbackRate) return null
      return `Set ${this.playbackRate}x as default for ${this.mediaTypeLabel}`
    }
  },
  methods: {
    increment() {
      if (this.selected + 0.1 > this.MAX_SPEED) return
      var newPlaybackRate = this.selected + 0.1
      this.selected = Number(newPlaybackRate.toFixed(1))
    },
    decrement() {
      if (this.selected - 0.1 < this.MIN_SPEED) return
      var newPlaybackRate = this.selected - 0.1
      this.selected = Number(newPlaybackRate.toFixed(1))
    },
    modalInput(val) {
      if (!val) {
        if (this.skipChangeOnClose) {
          this.skipChangeOnClose = false
          return
        }
        if (this.currentPlaybackRate !== this.selected) {
          this.$emit('change', this.selected)
        }
      }
    },
    clickedOption(rate) {
      this.selected = Number(rate)
      this.$emit('change', Number(rate))
    },
    setAsDefault() {
      if (!this.mediaType) return
      this.$emit('setDefault', this.playbackRate)
      this.skipChangeOnClose = true
      this.show = false
    },
    clearOverride() {
      this.skipChangeOnClose = true
      this.$emit('clearItemOverride')
      this.show = false
    }
  },
  mounted() {}
}
</script>

<style>
button.icon-num-btn:disabled {
  cursor: not-allowed;
}
button.icon-num-btn:disabled::before {
  background-color: rgba(0, 0, 0, 0.2);
}
button.icon-num-btn:disabled span {
  color: #777;
}
</style>
