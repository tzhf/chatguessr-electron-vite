<template>
  <Vue3DraggableResizable :draggable="isDraggable" v-model:x="position.x" v-model:y="position.y" v-model:w="position.w"
    v-model:h="position.h" :minW="340" :minH="190" :parent="true" classNameHandle="scoreboard-handle" class="scoreboard"
    @drag-end="savePosition" @resize-end="savePosition">
    <div class="scoreboard__header">
      <div class="scoreboard__settings">
        <button class="btn btn-icon" @click="toggleAutoScroll">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <g :fill="settings.isAutoScroll ? '#59f3b3' : 'white'">
              <path
                d="M10.293,16.293,9,17.586V4A1,1,0,0,0,7,4V17.586L5.707,16.293a1,1,0,0,0-1.414,1.414l3,3a1,1,0,0,0,1.416,0l3-3a1,1,0,0,0-1.414-1.414Z" />
              <path
                d="M19.707,6.293l-3-3a1,1,0,0,0-1.416,0l-3,3a1,1,0,0,0,1.414,1.414L15,6.414V20a1,1,0,0,0,2,0V6.414l1.293,1.293a1,1,0,0,0,1.414-1.414Z" />
            </g>
          </svg>
        </button>
        <button class="btn btn-icon" @click="isColumnVisibilityOpen = !isColumnVisibilityOpen">
          <svg width="14" height="14" viewBox="0 0 24 24">
            <path :fill="isColumnVisibilityOpen ? '#59f3b3' : 'white'"
              d="M24 13.616v-3.232c-1.651-.587-2.694-.752-3.219-2.019v-.001c-.527-1.271.1-2.134.847-3.707l-2.285-2.285c-1.561.742-2.433 1.375-3.707.847h-.001c-1.269-.526-1.435-1.576-2.019-3.219h-3.232c-.582 1.635-.749 2.692-2.019 3.219h-.001c-1.271.528-2.132-.098-3.707-.847l-2.285 2.285c.745 1.568 1.375 2.434.847 3.707-.527 1.271-1.584 1.438-3.219 2.02v3.232c1.632.58 2.692.749 3.219 2.019.53 1.282-.114 2.166-.847 3.707l2.285 2.286c1.562-.743 2.434-1.375 3.707-.847h.001c1.27.526 1.436 1.579 2.019 3.219h3.232c.582-1.636.75-2.69 2.027-3.222h.001c1.262-.524 2.12.101 3.698.851l2.285-2.286c-.744-1.563-1.375-2.433-.848-3.706.527-1.271 1.588-1.44 3.221-2.021zm-12 2.384c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z" />
          </svg>
        </button>
        <div v-if="isColumnVisibilityOpen" class="column__visibility">
          <button class="btn" :class="{ active: settings.streak }" @click="settings.streak = !settings.streak"
            :disabled="isMultiGuess">
            {{ fields[2].name }}
          </button>
          <button class="btn" :class="{ active: settings.distance }" @click="settings.distance = !settings.distance"
            :disabled="isMultiGuess">
            {{ fields[3].name }}
          </button>
          <button class="btn" :class="{ active: settings.score }" @click="settings.score = !settings.score"
            :disabled="isMultiGuess">
            {{ fields[4].name }}
          </button>
        </div>
      </div>
      <div class="scoreboard__title">{{ title }} ({{ rows.length }})</div>
      <label v-if="switchVisible" class="switchContainer">
        <input class="switchBtn" type="checkbox" :checked="switchOn" @input="(event) => toggleGuesses(event)" />
        <div class="switch"></div>
      </label>
      <div v-if="isMultiGuess && gameState === 'in-round'" class="scoreboard__hint">Ordered by guess time</div>
    </div>
    <input type="range" v-model="settings.scrollSpeed" @mouseover="isDraggable = false" @mouseleave="isDraggable = true"
      min="0.5" step="0.1" max="2" class="scrollSpeedSlider" :class="{ hidden: !settings.isAutoScroll }">

    <table>
      <thead>
        <tr>
          <th v-for="field in activeFields" :key='field.value' @click="sortByCol(field)"
            :class="{ sortable: field.sortable }" :style="{ width: field.width }">
            {{ field.name }}
          </th>
        </tr>
      </thead>
      <tbody ref="tBody">
        <tr v-for="row in rows" :key='row.username' :class="{ expand: row.animationActive }"
          @click="props.onRowClick(row)">
          <td v-for="field in activeFields" :key='field.value' :style="{ width: field.width }">
            <!-- <span v-if="field.value === 'index'">{{ row.index.display }}</span> -->
            <span v-if="field.value === 'player'" :style="{ color: row.color }" class="username">
              <span v-if="row.flag" class="flag-icon" :style='{ backgroundImage: `url("flag:${row.flag}")` }'></span>
              {{ row.username }}
            </span>
            <!-- <span v-if="field.value === 'player'" v-html="row.player"></span> -->
            <!-- <span v-else-if="field.value === 'streak'">{{ row.streak.display }}</span> -->
            <!-- {{ gameState === 'round-results' && row.lastStreak ? row.streak + ` [` + row.lastStreak + `]` :
                row.streak }} -->
            <!-- <span v-else-if="field.value === 'distance'">{{ row.distance.display }}</span> -->
            <!-- {{ gameState === 'round-results' && row.score === 5000 ? toMeter(row.distance) + ` [` +
                formatDuration(row.time! * 1000) + `]` : toMeter(row.distance) }} -->
            <!-- <span v-else-if="field.value === 'score'">{{ row.score.display }}</span> -->
            <span v-else>{{ row[field.value].display }}</span>
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
  gameState: GameState,
  isMultiGuess: boolean
  setGuessesOpen: Window['ChatguessrApi']['setGuessesOpen'],
  onRowClick: (row: ScoreboardRow) => void,
}>()

const tBody = ref<HTMLDivElement | null>(null)
const { y, arrivedState } = useScroll(tBody, { behavior: 'smooth' })
const position = reactive({ x: 200, y: 50, w: 380, h: 190 })
const isDraggable = ref(true)
const isColumnVisibilityOpen = ref(false)

const title = ref('GUESSES')
const switchOn = ref(true)
const switchVisible = ref(true)

onMounted(async () => {
  Object.assign(position, getLocalStorage('cg_scoreboard__position', { x: 200, y: 50, w: 380, h: 190 }))
  runAutoScroll()
})

const settings = reactive(getLocalStorage('cg_scoreboard__settings',
  {
    isAutoScroll: false,
    scrollSpeed: "1",
    streak: true,
    distance: true,
    score: true,
  })
)

watch(settings, () => {
  setLocalStorage('cg_scoreboard__settings', settings)
})

type Field = { name: string, value: string, width?: string, sortable: boolean }

const fields: Field[] = [
  { name: '#', value: 'index', width: '30px', sortable: true },
  { name: 'Player', value: 'player', sortable: false },
  { name: 'Streak', value: 'streak', width: '60px', sortable: true },
  { name: 'Distance', value: 'distance', width: '85px', sortable: true },
  { name: 'Score', value: 'score', width: '65px', sortable: true }
]

const activeFields = computed(() => props.gameState === 'in-round' ? (props.isMultiGuess ? [fields[1]] : fields.filter(f => f.value === 'index' || f.value === 'player' || settings[f.value] === true)) : fields)
const sortType = ref<'desc' | 'asc'>('desc')

const rows = reactive<ScoreboardRow[]>([])

function onStartRound() {
  rows.length = 0
  title.value = 'GUESSES'
  showSwitch(true)
}

function renderGuess(guess: Guess) {
  console.log("🚀 ~ renderGuess ~ guess:", guess)
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
  }

  setTimeout(() => {
    formatedRow.animationActive = false
  }, 500)
}

function renderMultiGuess(guesses: Guess[]) {
  console.log("🚀 ~ renderMultiGuess ~ guesses:", guesses)
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
  console.log("🚀 ~ showRoundResults ~ roundResults:", roundResults)
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
        display: result.score === 5000 ? toMeter(result.distance) + ` [` + formatDuration(result.time * 1000) + `]` : toMeter(result.distance)
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
  showSwitch(false)
}

function showGameResults(gameResults: GameResult[]) {
  console.log("🚀 ~ showGameResults ~ gameResults:", gameResults)
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
      },
    }
  })
  Object.assign(rows, formatedRows)

  title.value = `HIGHSCORES`
  showSwitch(false)
}

function sortByCol(col: Field) {
  if (!col.sortable) return

  sortGuessesBy(col.value, sortType.value)
  sortType.value = sortType.value === 'asc' ? 'desc' : 'asc';
}

function sortGuessesBy(col: string, sortType: 'desc' | 'asc') {
  if (sortType === 'asc') {
    rows.sort((a, b) => a[col].value - b[col].value)
  } else {
    rows.sort((a, b) => b[col].value - a[col].value)
  }
}

function toggleAutoScroll() {
  settings.isAutoScroll = !settings.isAutoScroll
  runAutoScroll()
}

function runAutoScroll() {
  // 0: up, 1: down
  let direction = 1
  // we need decimals to reduce the default speed
  // however 'y' cannot handle decimals so we increment newY
  // one downside is that we can't scroll during autoscroll
  let newY = y.value

  function scrollFunc() {
    if (!settings.isAutoScroll) return
    if (arrivedState.top && arrivedState.bottom) arrivedState.bottom = false

    if (direction) {
      if (arrivedState.bottom) {
        setTimeout(() => {
          direction = 0
          requestAnimationFrame(scrollFunc)
        }, 2000)
      }
      else {
        newY = newY + parseFloat(settings.scrollSpeed)
        y.value = newY
        requestAnimationFrame(scrollFunc)
      }
    }
    else {
      if (arrivedState.top) {
        setTimeout(() => {
          direction = 1
          newY = y.value
          requestAnimationFrame(scrollFunc)
        }, 3500)
      }
      else {
        y.value -= 5
        requestAnimationFrame(scrollFunc)
      }
    }
  }
  requestAnimationFrame(scrollFunc)
}

function showSwitch(visibility: boolean) {
  switchVisible.value = visibility
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

const toMeter = (distance: number) => distance >= 1 ? distance.toFixed(1) + 'km' : Math.floor(distance * 1000) + 'm'

defineExpose({
  onStartRound,
  showRoundResults,
  showGameResults,
  renderGuess,
  renderMultiGuess,
  setSwitchOn,
})
</script>

<style scoped>
.scoreboard {
  font-family: Montserrat, sans-serif;
  text-align: center;
  padding: 5px;
  color: #fff;
  font-size: 13px;
  background-color: rgba(0, 0, 0, 0.4);
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
    "settings title switch"
    "hint hint hint";
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
  gap: 0.2rem;
  margin-top: -6px;
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
  cursor: pointer;
  border: 1px solid #000;
  border-radius: 4px;
  background-size: 200% auto;
  background-image: linear-gradient(to right,
      #2e2e2e 0%,
      #454545 51%,
      #2e2e2e 100%);
  transition: 0.3s;
  -webkit-transition: 0.3s;
  color: #fff;
  font-size: inherit;
}

.btn-icon {
  width: 32px;
  height: 22px;
}

.btn[disabled] {
  cursor: not-allowed;
  color: #8f8f8f;
}

.btn:hover:not([disabled]) {
  background-position: right center;
  box-shadow: 2px 2px 5px -2px #000;
}

.btn.active:not([disabled]) {
  background-image: linear-gradient(to right,
      #1cd997 0%,
      #33b09b 51%,
      #1cd997 100%);
}

.switchContainer {
  grid-area: switch;
  position: relative;
  display: inline-block;
  width: 32px;
  height: 22px;
  margin-left: auto;
  transition: 0.3s;
  -webkit-transition: 0.3s;
}

.switchContainer:hover {
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
}

input:checked+.switch {
  background-color: #1cd997;
}

input:checked+.switch:before {
  transform: translateX(11px);
}

table {
  position: relative;
  height: calc(100% - 92px);
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
  transition: all 0.2s ease-in-out;
}

tr:nth-child(odd) {
  background-color: rgba(0, 0, 0, 0.1);
}

tr:nth-child(even) {
  background-color: rgba(0, 0, 0, 0.2);
}

tbody>tr:hover {
  -webkit-transition: 0.1s;
  transition: 0.1s;
  transform: scale(1.01);
  background-color: rgba(0, 0, 0, 0.3);
}

th.sortable {
  cursor: pointer
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
  -webkit-transition: 0.3s;
  transition: opacity 0.3s;
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

.hidden {
  visibility: hidden;
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
</style>
