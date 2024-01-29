<template>
  <div id="CGFrameContainer" :class="{ hidden: gameState === 'none' }">
    <Scoreboard
      ref="scoreboard"
      :game-state="gameState"
      :is-multi-guess="isMultiGuess"
      :on-row-click="onRowClick"
      :set-guesses-open="chatguessrApi.setGuessesOpen"
      :class="{ hidden: gameState === 'none' || !widgetVisibility.scoreboardVisible }"
    />

    <Timer
      :game-state="gameState"
      :import-audio-file="chatguessrApi.importAudioFile"
      :app-data-path-exists="chatguessrApi.appDataPathExists"
      :set-guesses-open="chatguessrApi.setGuessesOpen"
      :style="
        widgetVisibility.timerVisible && gameState === 'in-round'
          ? 'visibility: visible'
          : 'visibility: hidden'
      "
    />
  </div>

  <div class="cg-menu">
    <button
      :class="['cg-button', twitchConnectionState.state]"
      title="settings"
      @click="settingsVisible = true"
    >
      <span class="icon cg-icon--gear"></span>
    </button>
    <button
      class="cg-button"
      title="Show/Hide timer"
      :hidden="gameState === 'none'"
      @click="widgetVisibility.timerVisible = !widgetVisibility.timerVisible"
    >
      <span
        :class="[
          'icon',
          widgetVisibility.timerVisible ? 'cg-icon--timerVisible' : 'cg-icon--timerHidden'
        ]"
      ></span>
    </button>
    <button
      class="cg-button"
      title="Show/Hide scoreboard"
      :hidden="gameState === 'none'"
      @click="widgetVisibility.scoreboardVisible = !widgetVisibility.scoreboardVisible"
    >
      <span
        :class="[
          'icon',
          widgetVisibility.scoreboardVisible
            ? 'cg-icon--scoreboardVisible'
            : 'cg-icon--scoreboardHidden'
        ]"
      ></span>
    </button>
    <button
      class="cg-button"
      title="Center view"
      :hidden="!satelliteMode.value.enabled || gameState !== 'in-round'"
      @click="onClickCenterSatelliteView"
    >
      <span class="icon cg-icon--flag"></span>
    </button>
  </div>

  <Suspense>
    <transition name="modal">
      <Settings
        v-if="settingsVisible"
        :chatguessr-api="chatguessrApi"
        :socket-connection-state="socketConnectionState"
        :twitch-connection-state="twitchConnectionState"
        @close="settingsVisible = false"
      />
    </transition>
  </Suspense>
</template>

<script lang="ts" setup>
import { ref, reactive, shallowRef, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { useStyleTag } from '@vueuse/core'
import Settings from './Settings.vue'
import Scoreboard from './Scoreboard.vue'
import Timer from './Timer.vue'
import { getLocalStorage, setLocalStorage } from '../useLocalStorage'

defineOptions({
  inheritAttrs: false
})

const { chatguessrApi, rendererApi } = defineProps<{
  chatguessrApi: Window['chatguessrApi']
  rendererApi: RendererApi
}>()

const scoreboard = ref<InstanceType<typeof Scoreboard> | null>(null)
const settingsVisible = ref(false)

const gameState = ref<GameState>('none')
const isMultiGuess = ref<boolean>(false)
const currentLocation = shallowRef<LatLng | null>(null)
const gameResultLocations = shallowRef<Location_[] | null>(null)

const widgetVisibility = reactive(
  getLocalStorage('cg_widget__visibility', {
    scoreboardVisible: true,
    timerVisible: true
  })
)
watch(widgetVisibility, () => {
  setLocalStorage('cg_widget__visibility', widgetVisibility)
})

const satelliteMode = {
  // Manual implementation of `ref()` API
  // As `useLocalStorage` does not receive storage events from the non-vue UI script
  // TODO(@ReAnnannanna): Replace this with `useLocalStorage` when the pregame UI script is using Vue
  get value(): { enabled: boolean } {
    return getLocalStorage('cg_satelliteMode__settings', { enabled: false })
  }
}

// Remove the game's own markers while on a results screen (where we draw our own)
const markerRemover = useStyleTag(
  '[data-qa="result-view-top"] [data-qa="guess-marker"], [data-qa="result-view-top"] [data-qa="correct-location-marker"], [class^="coordinate-result-map_line__"] { display: none; }',
  {
    id: 'cg-marker-remover',
    manual: true
  }
)
const removeMarkers = computed(
  () => gameState.value === 'round-results' || gameState.value === 'game-results'
)
watch(
  removeMarkers,
  (load) => {
    if (load) {
      markerRemover.load()
    } else {
      markerRemover.unload()
    }
  },
  { immediate: true }
)

// Remove the game's controls when in satellite mode.
const gameControlsRemover = useStyleTag(
  '[class^="styles_columnTwo__"], [class^="styles_controlGroup__"], [data-qa="compass"], [class^="panorama-compass_"] { display: none !important; }',
  {
    id: 'cg-game-controls-remover',
    manual: true
  }
)
// `satelliteMode` is not actually reactive, but the actual change we're interested in is in `gameState` anyways.
const removeGameControls = computed(() => gameState.value !== 'none' && satelliteMode.value.enabled)
watch(
  removeGameControls,
  (load) => {
    if (load) {
      gameControlsRemover.load()
    } else {
      gameControlsRemover.unload()
    }
  },
  { immediate: true }
)

onBeforeUnmount(
  chatguessrApi.onGameStarted((isMultiGuess_, restoredGuesses, location) => {
    isMultiGuess.value = isMultiGuess_
    gameState.value = 'in-round'

    currentLocation.value = location
    if (satelliteMode.value.enabled) {
      rendererApi.showSatelliteMap(location)
    } else {
      rendererApi.hideSatelliteMap()
    }

    scoreboard.value!.onStartRound()

    if (restoredGuesses.length > 0) {
      if (isMultiGuess.value) {
        scoreboard.value!.renderMultiGuess(restoredGuesses)
      } else {
        // Not very fast KEKW
        for (const guess of restoredGuesses) {
          scoreboard.value!.renderGuess(guess)
        }
      }
    }
  })
)

onBeforeUnmount(
  chatguessrApi.onStartRound(() => {
    gameState.value = 'in-round'
    rendererApi.clearMarkers()
    scoreboard.value!.onStartRound()
  })
)

onBeforeUnmount(
  chatguessrApi.onRefreshRound((location) => {
    gameState.value = 'in-round'
    currentLocation.value = location
    if (satelliteMode.value.enabled) {
      rendererApi.showSatelliteMap(location)
    }
  })
)

onBeforeUnmount(
  chatguessrApi.onGameQuit(() => {
    gameState.value = 'none'
    rendererApi.clearMarkers()
  })
)

onBeforeUnmount(
  chatguessrApi.onReceiveGuess((guess) => {
    scoreboard.value!.renderGuess(guess)
  })
)

onBeforeUnmount(
  chatguessrApi.onReceiveMultiGuesses((guesses) => {
    scoreboard.value!.renderMultiGuess(guesses)
  })
)

onBeforeUnmount(
  chatguessrApi.onShowRoundResults((round, location, roundResults, guessMarkersLimit) => {
    gameState.value = 'round-results'

    rendererApi.drawRoundResults(location, roundResults, guessMarkersLimit)
    scoreboard.value!.showRoundResults(round, roundResults)
  })
)

onBeforeUnmount(
  chatguessrApi.onShowGameResults((locations, gameResults) => {
    gameState.value = 'game-results'
    gameResultLocations.value = locations

    rendererApi.drawGameLocations(locations)
    rendererApi.drawPlayerResults(locations, gameResults[0])
    scoreboard.value!.showGameResults(gameResults)
  })
)

onBeforeUnmount(
  chatguessrApi.onGuessesOpenChanged((open) => {
    scoreboard.value!.setSwitchOn(open)
  })
)

// TODO: make sure this works with guessMarkersLimit
function onRowClick(row: ScoreboardRow) {
  if (gameState.value === 'round-results' && row.position) {
    rendererApi.focusOnGuess(row.position)
  } else if (gameState.value === 'game-results' && 'guesses' in row && 'distances' in row) {
    // @ts-expect-error
    if (gameResultLocations.value) rendererApi.drawPlayerResults(gameResultLocations.value, row)
  }
}

function onClickCenterSatelliteView() {
  if (currentLocation.value) rendererApi.centerSatelliteView(currentLocation.value)
}

/** Load and update twitch connection state. */
const twitchConnectionState = useTwitchConnectionState()
function useTwitchConnectionState() {
  const conn = ref<TwitchConnectionState>({ state: 'disconnected' })

  onMounted(async () => {
    const state = await chatguessrApi.getTwitchConnectionState()
    conn.value = state
  })

  onBeforeUnmount(
    chatguessrApi.onTwitchConnectionStateChange((state) => {
      conn.value = state
    })
  )

  return conn
}

/** Load and update socket connection state. */
const socketConnectionState = useSocketConnectionState()
function useSocketConnectionState() {
  const conn = ref<SocketConnectionState>({ state: 'disconnected' })

  onMounted(async () => {
    const state = await chatguessrApi.getSocketConnectionState()
    conn.value = state
  })

  onBeforeUnmount(
    chatguessrApi.onSocketConnected(() => {
      conn.value.state = 'connected'
    })
  )
  onBeforeUnmount(
    chatguessrApi.onSocketDisconnected(() => {
      conn.value.state = 'disconnected'
    })
  )

  return conn
}
</script>

<style scoped>
[hidden] {
  display: none !important;
}

#CGFrameContainer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  pointer-events: none;
}

.cg-menu {
  z-index: 23;
  display: flex;
  flex-direction: column;
  gap: 5px;
  top: 100px;
  position: fixed;
  right: 7px;
}

.cg-button {
  box-sizing: content-box;
  display: flex;
  user-select: none;
  background: rgba(0, 0, 0, 0.4);
  border: none;
  border-radius: 50px;
  padding: 0.5rem;
  width: 1.7rem;
  height: 1.7rem;
  transition: 0.3s;
  cursor: pointer;
}

.cg-button:hover {
  background: rgba(0, 0, 0, 0.5);
}

.cg-button.disconnected {
  background: red;
}

.cg-button.connecting {
  background: blue;
}

.cg-icon--gear {
  background-image: url(asset:icons/gear.svg);
}

.cg-icon--scoreboardVisible {
  background-image: url(asset:icons/scoreboard_visible.svg);
}

.cg-icon--scoreboardHidden {
  background-image: url(asset:icons/scoreboard_hidden.svg);
}

.cg-icon--timerVisible {
  background-image: url(asset:icons/timer_visible.svg);
}

.cg-icon--timerHidden {
  background-image: url(asset:icons/timer_hidden.svg);
}

.cg-icon--flag {
  background-image: url(asset:icons/start_flag.svg);
}

/* Vue draggable-resizable */
.drv,
.vdr-container {
  border: none;
}
</style>
