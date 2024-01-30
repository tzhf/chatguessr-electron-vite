<template>
  <Vue3DraggableResizable
    v-model:x="position.x"
    v-model:y="position.y"
    v-model:w="position.w"
    v-model:h="position.h"
    :draggable="isDraggable"
    :min-w="340"
    :min-h="186"
    :parent="true"
    class-name-handle="scoreboard-handle"
    class="scoreboard"
    @drag-end="savePosition"
    @resize-end="savePosition"
  >
    <div class="scoreboard__header">
      <div class="scoreboard__settings">
        <button class="btn btn-icon" @click="toggleAutoScroll">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <g :fill="settings.autoScroll ? '#59f3b3' : 'white'">
              <path
                d="M10.293,16.293,9,17.586V4A1,1,0,0,0,7,4V17.586L5.707,16.293a1,1,0,0,0-1.414,1.414l3,3a1,1,0,0,0,1.416,0l3-3a1,1,0,0,0-1.414-1.414Z"
              />
              <path
                d="M19.707,6.293l-3-3a1,1,0,0,0-1.416,0l-3,3a1,1,0,0,0,1.414,1.414L15,6.414V20a1,1,0,0,0,2,0V6.414l1.293,1.293a1,1,0,0,0,1.414-1.414Z"
              />
            </g>
          </svg>
        </button>
        <button class="btn btn-icon" @click="isColumnVisibilityOpen = !isColumnVisibilityOpen">
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path
              :fill="isColumnVisibilityOpen ? '#59f3b3' : 'white'"
              d="M24 13.616v-3.232c-1.651-.587-2.694-.752-3.219-2.019v-.001c-.527-1.271.1-2.134.847-3.707l-2.285-2.285c-1.561.742-2.433 1.375-3.707.847h-.001c-1.269-.526-1.435-1.576-2.019-3.219h-3.232c-.582 1.635-.749 2.692-2.019 3.219h-.001c-1.271.528-2.132-.098-3.707-.847l-2.285 2.285c.745 1.568 1.375 2.434.847 3.707-.527 1.271-1.584 1.438-3.219 2.02v3.232c1.632.58 2.692.749 3.219 2.019.53 1.282-.114 2.166-.847 3.707l2.285 2.286c1.562-.743 2.434-1.375 3.707-.847h.001c1.27.526 1.436 1.579 2.019 3.219h3.232c.582-1.636.75-2.69 2.027-3.222h.001c1.262-.524 2.12.101 3.698.851l2.285-2.286c-.744-1.563-1.375-2.433-.848-3.706.527-1.271 1.588-1.44 3.221-2.021zm-12 2.384c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z"
            />
          </svg>
        </button>
        <div v-if="isColumnVisibilityOpen" class="column__visibility">
          <button
            class="btn"
            :class="{ active: settings.streak }"
            :disabled="isMultiGuess"
            @click="settings.streak = !settings.streak"
          >
            {{ columns[2].name }}
          </button>
          <button
            class="btn"
            :class="{ active: settings.distance }"
            :disabled="isMultiGuess"
            @click="settings.distance = !settings.distance"
          >
            {{ columns[3].name }}
          </button>
          <button
            class="btn"
            :class="{ active: settings.score }"
            :disabled="isMultiGuess"
            @click="settings.score = !settings.score"
          >
            {{ columns[4].name }}
          </button>
        </div>
      </div>
      <div class="scoreboard__title">{{ title }} ({{ rows.length }})</div>
      <label v-if="gameState === 'in-round'" class="switchContainer">
        <input type="checkbox" :checked="switchOn" @input="(event) => toggleGuesses(event)" />
        <div class="switch"></div>
      </label>
      <div v-if="isMultiGuess && gameState === 'in-round'" class="scoreboard__hint">
        Ordered by guess time
      </div>
    </div>
    <input
      v-model.number="settings.scrollSpeed"
      type="range"
      min="0.5"
      step="0.1"
      max="2"
      class="scrollSpeedSlider"
      :class="{ hidden: !settings.autoScroll }"
      @mouseover="isDraggable = false"
      @mouseleave="isDraggable = true"
    />

    <table>
      <thead>
        <tr>
          <th
            v-for="col in activeColumns"
            :key="col.value"
            :class="{ sortable: col.sortable }"
            :style="{ width: col.width }"
            @click="sortByCol(col)"
          >
            {{ col.name }}
          </th>
        </tr>
      </thead>
      <tbody ref="tBody">
        <tr
          v-for="row in rows"
          :key="row.username"
          :class="{ expand: row.animationActive }"
          @click="props.onRowClick(row)"
        >
          <td v-for="col in activeColumns" :key="col.value" :style="{ width: col.width }">
            <span v-if="col.value === 'player'" :style="{ color: row.color }" class="username">
              <span
                v-if="row.flag"
                class="flag-icon"
                :style="{ backgroundImage: `url('flag:${row.flag}')` }"
              ></span>
              {{ row.username }}
            </span>
            <span v-else>{{ row[col.value].display }}</span>
          </td>
        </tr>
      </tbody>
    </table>
  </Vue3DraggableResizable>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, watch, computed } from 'vue'
import { useScroll } from '@vueuse/core'
import { getLocalStorage, setLocalStorage } from '../useLocalStorage'
import formatDuration from 'format-duration'

const props = defineProps<{
  gameState: GameState
  isMultiGuess: boolean
  setGuessesOpen: Window['chatguessrApi']['setGuessesOpen']
  onRowClick: (row: ScoreboardRow) => void
}>()

const tBody = ref<HTMLDivElement | null>(null)

const isDraggable = ref(true)
const isColumnVisibilityOpen = ref(false)

const position = reactive({ x: 20, y: 50, w: 340, h: 390 })
const title = ref('GUESSES')
const switchOn = ref(true)

onMounted(async () => {
  Object.assign(
    position,
    getLocalStorage('cg_scoreboard__position', { x: 20, y: 50, w: 340, h: 390 })
  )
  runAutoScroll()
})

const settings = reactive(
  getLocalStorage('cg_scoreboard__settings', {
    autoScroll: false,
    scrollSpeed: 1,
    streak: true,
    distance: true,
    score: true
  })
)

watch(settings, () => {
  setLocalStorage('cg_scoreboard__settings', settings)
})

type Column = {
  name: string
  value: string
  width?: string
  sortable: boolean
}

const columns: Column[] = [
  { name: '#', value: 'index', width: '30px', sortable: true },
  { name: 'Player', value: 'player', sortable: false },
  { name: 'Streak', value: 'streak', width: '60px', sortable: true },
  { name: 'Distance', value: 'distance', width: '85px', sortable: true },
  { name: 'Score', value: 'score', width: '65px', sortable: true }
]

const activeColumns = computed(() =>
  props.gameState === 'in-round'
    ? props.isMultiGuess
      ? [columns[1]]
      : columns.filter(
          (f) => f.value === 'index' || f.value === 'player' || settings[f.value] === true
        )
    : columns
)

const rows = reactive<ScoreboardRow[]>([])

function onStartRound() {
  rows.length = 0
  title.value = 'GUESSES'
}

function renderGuess(guess: Guess) {
  console.log('🚀 ~ renderGuess ~ guess:', guess)
  const formatedRow = {
    index: { value: 0, display: '' },
    username: guess.username,
    flag: guess.flag,
    color: guess.color,
    streak: { value: guess.streak, display: guess.streak },
    distance: { value: guess.distance, display: toMeter(guess.distance) },
    score: { value: guess.score, display: guess.score },
    animationActive: true
  }

  rows.push(formatedRow)
  rows.sort((a, b) => a.distance.value - b.distance.value)

  for (let i = 0; i < rows.length; i++) {
    rows[i].index.value = i + 1
    rows[i].index.display = i + 1
  }

  setTimeout(() => {
    formatedRow.animationActive = false
  }, 500)
}

function renderMultiGuess(guesses: Guess[]) {
  console.log('🚀 ~ renderMultiGuess ~ guesses:', guesses)
  const formatedRows = guesses.map((guess) => {
    return {
      index: { value: 0, display: '' },
      username: guess.username,
      flag: guess.flag,
      color: guess.color,
      streak: { value: 0, display: '' },
      distance: { value: 0, display: '' },
      score: { value: 0, display: '' }
    }
  })
  Object.assign(rows, formatedRows)

  // guess.animationActive = true

  // setTimeout(() => {
  //   guess.animationActive = false
  // }, 500)
}

function showRoundResults(round: number, roundResults: RoundResult[]) {
  console.log('🚀 ~ showRoundResults ~ roundResults:', roundResults)
  const formatedRows = roundResults.map((result, i) => {
    return {
      index: { value: i + 1, display: i + 1 },
      username: result.username,
      flag: result.flag,
      color: result.color,
      streak: {
        value: result.streak,
        display: result.lastStreak ? result.streak + ` [` + result.lastStreak + `]` : result.streak
      },
      distance: {
        value: result.distance,
        display:
          result.score === 5000
            ? toMeter(result.distance) + ` [` + formatDuration(result.time * 1000) + `]`
            : toMeter(result.distance)
      },
      score: {
        value: result.score,
        display: result.score
      },
      position: result.position
    }
  })
  Object.assign(rows, formatedRows)

  title.value = `ROUND ${round} RESULTS`
}

function showGameResults(gameResults: GameResult[]) {
  console.log('🚀 ~ showGameResults ~ gameResults:', gameResults)
  const formatedRows = gameResults.map((result, i) => {
    return {
      index: { value: i + 1, display: i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1 },
      username: result.username,
      flag: result.flag,
      color: result.color,
      guesses: result.guesses,
      scores: result.scores,
      distances: result.distances,
      totalScore: result.totalScore,
      totalDistance: result.totalDistance,
      streak: {
        value: result.streak,
        display: result.streak
      },
      distance: {
        value: result.totalDistance,
        display: toMeter(result.totalDistance)
      },
      score: {
        value: result.totalScore,
        display: `${result.totalScore} [${result.guesses.filter(Boolean).length}]`
      }
    }
  })
  Object.assign(rows, formatedRows)

  title.value = 'HIGHSCORES'
}

function sortByCol(col: Column) {
  if (!col.sortable) return
  sortGuessesBy(col.value)
}

function sortGuessesBy(col: string) {
  rows.sort((a, b) => {
    const x = a[col].value
    const y = b[col].value
    return isSorted(col) ? x - y : y - x
  })
}

function isSorted(col: string) {
  const arr: number[] = rows.map((row) => row[col].value)
  return JSON.stringify(arr) === JSON.stringify(arr.sort((a, b) => b - a))
}

const { y, arrivedState } = useScroll(tBody, { behavior: 'smooth' })
function runAutoScroll() {
  // 0: up, 1: down
  let direction = 1
  // we need decimals to reduce the default speed
  // however 'y' cannot handle decimals so we increment newY
  // one downside is that we can't scroll during autoscroll
  let newY = y.value

  function scrollFunc() {
    if (!settings.autoScroll) return
    if (arrivedState.top && arrivedState.bottom) arrivedState.bottom = false

    if (direction) {
      if (arrivedState.bottom) {
        setTimeout(() => {
          direction = 0
          requestAnimationFrame(scrollFunc)
        }, 2000)
      } else {
        newY = newY + settings.scrollSpeed
        y.value = newY
        requestAnimationFrame(scrollFunc)
      }
    } else {
      if (arrivedState.top) {
        setTimeout(() => {
          direction = 1
          newY = y.value
          requestAnimationFrame(scrollFunc)
        }, 3500)
      } else {
        y.value -= 5
        requestAnimationFrame(scrollFunc)
      }
    }
  }
  requestAnimationFrame(scrollFunc)
}

function toggleAutoScroll() {
  settings.autoScroll = !settings.autoScroll
  runAutoScroll()
}

function toggleGuesses(event: Event) {
  props.setGuessesOpen((event.target as HTMLInputElement).checked)
}

function setSwitchOn(state: boolean) {
  switchOn.value = state
}

function savePosition() {
  setLocalStorage('cg_scoreboard__position', position)
}

const toMeter = (distance: number) =>
  distance >= 1 ? distance.toFixed(1) + 'km' : Math.floor(distance * 1000) + 'm'

defineExpose({
  onStartRound,
  showRoundResults,
  showGameResults,
  renderGuess,
  renderMultiGuess,
  setSwitchOn
})
</script>

<style scoped>
.scoreboard {
  font-family: 'Montserrat', sans-serif;
  text-align: center;
  padding: 5px;
  color: #fff;
  font-size: 13px;
  background-color: var(--bg-dark-transparent);
  box-shadow: 2px 2px 7px -2px #000;
  border-radius: 10px;
  pointer-events: auto;
  user-select: none;
  cursor: move;
  z-index: 24;
}
.scoreboard__header {
  display: grid;
  grid-template-areas:
    'settings title switch'
    'hint hint hint';
  grid-template-columns: 90px auto 80px;
  margin-top: 10px;
  font-size: 18px;
  align-items: center;
}
.scoreboard__settings {
  grid-area: settings;
  display: flex;
  gap: 0.2rem;
}

.scoreboard__title {
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  grid-area: title;
}

.scoreboard__hint {
  grid-area: hint;
  font-size: 0.75rem;
}

.column__visibility {
  font-size: 12px;
  position: absolute;
  display: flex;
  gap: 0.19rem;
  margin-top: -7px;
  left: 75px;
  padding: 0.2rem;
  background-color: #000;
  border-radius: 5px;
  z-index: 999999;
}

.btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  width: 65px;
  color: #fff;
  font-weight: 700;
  background-size: 200% auto;
  background-image: linear-gradient(to right, #2e2e2e 0%, #454545 51%, #2e2e2e 100%);
  border: 1px solid #000;
  transition: background-position 0.3s;
  -webkit-transition: background-position 0.3s;
}

.btn-icon {
  width: 32px;
  height: 22px;
}

.btn:hover:not([disabled]) {
  background-position: right center;
}

.btn.active:not([disabled]) {
  background-image: linear-gradient(to right, #1cd997 0%, #33b09b 51%, #1cd997 100%);
}

.switchContainer {
  grid-area: switch;
  position: relative;
  display: inline-block;
  width: 32px;
  height: 22px;
  margin-left: auto;
}

.switchContainer:hover {
  transition: box-shadow 0.3s;
  box-shadow: 2px 2px 5px -2px #000;
}

.switchContainer input {
  display: none;
}

.switch {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border: 1px solid #000;
  border-radius: 4px;
  background-color: #e04352;
}

.switch:before {
  position: absolute;
  content: '';
  height: 15px;
  width: 15px;
  left: 2px;
  bottom: 3px;
  border-radius: 3px;
  background-color: #fff;
  transition: transform 0.2s;
  -webkit-transition: transform 0.2s;
}

input:checked + .switch {
  background-color: #1cd997;
}

input:checked + .switch:before {
  transform: translateX(11px);
}

table {
  position: relative;
  height: calc(100% - 89px);
  margin: 0 auto;
  border-collapse: collapse;
  table-layout: fixed;
  word-wrap: break-word;
}

tbody {
  font-weight: bold;
  height: 100%;
  position: absolute;
  overflow-y: scroll;
  overflow-x: hidden;
}

tbody::-webkit-scrollbar {
  display: none;
}

thead,
tbody tr {
  display: table;
  width: 100%;
  table-layout: fixed;
}

thead {
  font-size: 14px;
  background-color: rgba(0, 0, 0, 0.5);
}

tbody td,
thead th {
  padding: 8px 0;
  line-height: 1em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

tr:nth-child(odd) {
  background-color: rgba(0, 0, 0, 0.1);
}

tr:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.2);
}

tbody > tr:hover {
  transition: 0.1s;
  -webkit-transition: 0.1s;
  transform: scale(1.01);
  background-color: rgba(0, 0, 0, 0.3);
}

th.sortable {
  cursor: pointer;
}

th.sortable:hover {
  color: rgb(180, 180, 180);
}

/* SCROLL SLIDER */
.scrollSpeedSlider {
  height: 5px;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  border-radius: 5px;
  outline: none;
  opacity: 0.2;
  transition: opacity 0.3s;
  -webkit-transition: opacity 0.3s;
}

.scrollSpeedSlider:hover {
  opacity: 1;
}

.scrollSpeedSlider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 30px;
  height: 7px;
  background: #63db85;
  cursor: pointer;
  border-radius: 5px;
}

.scrollSpeedSlider::-moz-range-thumb {
  width: 30px;
  height: 7px;
  background: #63db85;
  cursor: pointer;
  border-radius: 5px;
}

.expand {
  animation: expand 0.3s ease-out;
}
@keyframes expand {
  from {
    transform: scale(0);
    opacity: 0;
  }
}

.medal {
  font-size: 20px;
  line-height: 0;
}

.scoreboard_modal-enter-active {
  animation: bounce-in 0.3s;
}
.scoreboard_modal-leave-active {
  animation: bounce-in 0.3s reverse;
}
@keyframes bounce-in {
  0% {
    /* transform: scale(0); */
    transform: scale3d(0, 0, 0);
  }
  50% {
    transform: scale3d(1.2, 1.2, 1.2);
    /* transform: scale(1.2); */
  }
  100% {
    transform: scale3d(1, 1, 1);
    /* transform: scale(1); */
  }
}
</style>
