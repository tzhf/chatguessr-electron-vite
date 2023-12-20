<template>
  <div id="CGFrameContainer" :style="gameState !== 'none' ? 'visibility: visible' : 'visibility: hidden'">

    <Scoreboard ref="scoreboard" :setGuessesOpen="chatguessrApi.setGuessesOpen"
      :style="widgetVisibility.scoreboardVisible && gameState != 'none' ? 'visibility: visible' : 'visibility: hidden'" />

    <Timer :gameState="gameState" :importAudioFile="chatguessrApi.importAudioFile"
      :appDataPathExists="chatguessrApi.appDataPathExists" :setGuessesOpen="chatguessrApi.setGuessesOpen"
      :style="widgetVisibility.timerVisible && gameState === 'in-round' ? 'visibility: visible' : 'visibility: hidden'" />
  </div>

  <div class="cg-menu">
    <button :class="['cg-button', twitchConnectionState.state]" title="settings" @click="settingsVisible = true">
      <span class="icon cg-icon--gear"></span>
    </button>
    <button class="cg-button" title="Show/Hide timer" @click="toggleTimer" :hidden="gameState === 'none'">
      <span :class="['icon', widgetVisibility.timerVisible ? 'cg-icon--timerVisible' : 'cg-icon--timerHidden']"></span>
    </button>
    <button class="cg-button" title="Show/Hide scoreboard" @click="toggleScoreboard" :hidden="gameState === 'none'">
      <span
        :class="['icon', widgetVisibility.scoreboardVisible ? 'cg-icon--scoreboardVisible' : 'cg-icon--scoreboardHidden']"></span>
    </button>
    <button class="cg-button" title="Center view" @click="centerSatelliteView"
      :hidden="satelliteModeEnabled.value !== 'enabled' || gameState !== 'in-round'">
      <span class="icon cg-icon--flag"></span>
    </button>
  </div>

  <Suspense>
    <transition name="modal">
      <Settings v-if="settingsVisible" @close="settingsVisible = false" :chatguessrApi="chatguessrApi"
        :socketConnectionState="socketConnectionState" :twitchConnectionState="twitchConnectionState" />
    </transition>
  </Suspense>
</template>

<script lang="ts" setup>
import { ref, reactive, shallowRef, onMounted, onBeforeUnmount, watch, computed } from "vue"
import { useStyleTag } from "@vueuse/core"
import Settings from "./Settings.vue";
import Scoreboard from "./Scoreboard.vue"
import Timer from "./Timer.vue"
import { getLocalStorage, setLocalStorage } from '../useLocalStorage'

defineOptions({
  inheritAttrs: false
})

const {
  chatguessrApi,
  ...rendererApi
} = defineProps<{
  chatguessrApi: Window['ChatguessrApi'],
  drawRoundResults: (location: Location, roundResults: Guess[], limit?: number) => void,
  drawGameLocations: (locations: Location[]) => void,
  drawPlayerResults: (locations: Location[], result: GameResult) => void,
  clearMarkers: () => void,
  focusOnGuess: (location: LatLng) => void,
  showSatelliteMap: (location: LatLng) => void,
  hideSatelliteMap: () => void,
  centerSatelliteView: (location: LatLng) => void,
}>();

const scoreboard = ref<typeof Scoreboard | null>(null);
const settingsVisible = ref(false);

const gameState = ref<GameState>("none");
const currentLocation = shallowRef<LatLng | null>(null);
const twitchConnectionState = useTwitchConnectionState();
const socketConnectionState = useSocketConnectionState();

// const CGFrameContainer = ref<HTMLDivElement | null>(null);
// const isCGFrameContainerVisible = computed(() => gameState.value !== "none");

const widgetVisibility = reactive(getLocalStorage({
  scoreboardVisible: true,
  timerVisible: true
}, 'cg_widget_visibility'))

watch(widgetVisibility, () => {
  setLocalStorage(widgetVisibility, "cg_widget_visibility")
})

const satelliteModeEnabled = {
  // Manual implementation of `ref()` API
  // As `useLocalStorage` does not receive storage events from the non-vue UI script
  // TODO(@ReAnnannanna): Replace this with `useLocalStorage` when the pregame UI script is using Vue
  get value(): "enabled" | "disabled" {
    return localStorage.getItem("satelliteModeEnabled") === "enabled" ? "enabled" : "disabled";
  },
  set value(value: "enabled" | "disabled") {
    localStorage.setItem("satelliteModeEnabled", value);
  },
};

onMounted(async () => {
  // scoreboard = new Scoreboard(CGFrameContainer.value!, {
  //   focusOnGuess(location) {
  //     rendererApi.focusOnGuess(location);
  //   },
  //   drawPlayerResults(locations, result) {
  //     rendererApi.drawPlayerResults(locations, result);
  //   },
  //   onToggleGuesses(open) {
  //     chatguessrApi.setGuessesOpen(open);
  //   },
  // });
});

// Remove the game's own markers while on a results screen (where we draw our own)
const markerRemover = useStyleTag('[data-qa="result-view-top"] [data-qa="guess-marker"], [data-qa="result-view-top"] [data-qa="correct-location-marker"], [class^="coordinate-result-map_line__"] { display: none; }', {
  id: 'cg-marker-remover',
  manual: true,
});
const removeMarkers = computed(() => gameState.value === "round-results" || gameState.value === "game-results");
watch(removeMarkers, (load) => {
  if (load) {
    markerRemover.load();
  } else {
    markerRemover.unload();
  }
}, { immediate: true });

// Remove the game's controls when in satellite mode.
const gameControlsRemover = useStyleTag('[class^="styles_columnTwo__"], [class^="styles_controlGroup__"], [data-qa="compass"], [class^="panorama-compass_"] { display: none !important; }', {
  id: "cg-game-controls-remover",
  manual: true,
});
// `satelliteModeEnabled` is not actually reactive, but the actual change we're interested in is in `gameState` anyways.
const removeGameControls = computed(() => gameState.value !== "none" && satelliteModeEnabled.value === "enabled");
watch(removeGameControls, (load) => {
  if (load) {
    gameControlsRemover.load();
  } else {
    gameControlsRemover.unload();
  }
}, { immediate: true });

// @ts-expect-error
onBeforeUnmount(chatguessrApi.onGameStarted((isMultiGuess, restoredGuesses, location) => {
  gameState.value = "in-round";
  currentLocation.value = location;

  if (satelliteModeEnabled.value === "enabled") {
    rendererApi.showSatelliteMap(location);
  } else {
    rendererApi.hideSatelliteMap();
  }

  // if (!scoreboard) {
  //   return;
  // }

  scoreboard.value!.reset(isMultiGuess);

  // if (restoredGuesses.length > 0) {
  //   if (isMultiGuess) {
  //     scoreboard.renderMultiGuess(restoredGuesses);
  //   } else {
  //     // Not very fast KEKW
  //     for (const guess of restoredGuesses) {
  //       scoreboard.renderGuess(guess);
  //     }
  //   }
  // }

  // timer.value!.reset();
  // if (timer.value!.settings.autoStart) timer.value!.start()
}));

onBeforeUnmount(chatguessrApi.onRefreshRound((location) => {
  gameState.value = "in-round";
  if (satelliteModeEnabled.value === "enabled") {
    rendererApi.showSatelliteMap(location);
  }
}));

onBeforeUnmount(chatguessrApi.onGameQuit(() => {
  gameState.value = "none";
  // timer.value!.reset();
  rendererApi.clearMarkers();
}));

onBeforeUnmount(chatguessrApi.onReceiveGuess((guess) => {
  scoreboard.value!.renderGuess(guess);
}));

// onBeforeUnmount(chatguessrApi.onReceiveMultiGuesses((guesses) => {
//   scoreboard?.renderMultiGuess(guesses);
// }));


onBeforeUnmount(chatguessrApi.onShowRoundResults((round, location, roundResults, guessMarkersLimit) => {
  gameState.value = "round-results";

  rendererApi.drawRoundResults(location, roundResults, guessMarkersLimit);

  // if (!scoreboard) {
  //   return;
  // }

  // scoreboard.displayRoundResults(roundResults, guessMarkersLimit);
  scoreboard.value!.setTitle(`ROUND ${round} RESULTS (${roundResults.length})`)
  scoreboard.value!.showSwitch(false);

  // timer.value!.reset();
}));

onBeforeUnmount(chatguessrApi.onShowGameResults((locations, gameResults) => {
  gameState.value = "game-results";
  rendererApi.drawGameLocations(locations);
  rendererApi.drawPlayerResults(locations, gameResults[0]);

  // if (!scoreboard) {
  //   return;
  // }

  // scoreboard.displayGameResults(locations, gameResults);
  scoreboard.value!.setTitle(`HIGHSCORES (${gameResults.length})`);
  scoreboard.value!.showSwitch(false);
}));

onBeforeUnmount(chatguessrApi.onStartRound((isMultiGuess, location) => {
  gameState.value = "in-round";
  currentLocation.value = location;

  rendererApi.clearMarkers();
  if (satelliteModeEnabled.value === "enabled") {
    rendererApi.showSatelliteMap(location);
  }

  // if (!scoreboard) {
  //   return;
  // }

  scoreboard.value!.reset(isMultiGuess);
  scoreboard.value!.showSwitch(true);

  // timer.value!.reset();
  // if (timer.value!.settings.autoStart) timer.value!.start()
}));

onBeforeUnmount(chatguessrApi.onGuessesOpenChanged((open) => {
  scoreboard.value!.setSwitchOn(open);
}));

/** Load and update twitch connection state. */
function useTwitchConnectionState() {
  const conn = ref<TwitchConnectionState>({ state: "disconnected" })

  onMounted(async () => {
    const state = await chatguessrApi.getTwitchConnectionState()
    conn.value = state
  });

  onBeforeUnmount(chatguessrApi.onTwitchConnectionStateChange((state) => {
    conn.value = state
  }));

  return conn
}

/** Load and update socket connection state. */
function useSocketConnectionState() {
  const conn = ref<SocketConnectionState>({ state: "disconnected" })

  onMounted(async () => {
    const state = await chatguessrApi.getSocketConnectionState()
    conn.value = state
  });

  onBeforeUnmount(chatguessrApi.onSocketConnected(() => {
    conn.value.state = "connected"
  }))
  onBeforeUnmount(chatguessrApi.onSocketDisconnected(() => {
    conn.value.state = "disconnected"
  }))

  return conn
}

const centerSatelliteView = () => {
  if (currentLocation.value) rendererApi.centerSatelliteView(currentLocation.value)
}

const toggleScoreboard = () => { widgetVisibility.scoreboardVisible = !widgetVisibility.scoreboardVisible }
const toggleTimer = () => { widgetVisibility.timerVisible = !widgetVisibility.timerVisible }
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

#satelliteCanvas {
  z-index: 9;
  display: none;
  z-index: 1;
  width: 100%;
  height: 100%;
}

.drv {
  border: none
}

.vdr-container {
  border: none
}

.cg-menu {
  z-index: 99998;
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
</style>

