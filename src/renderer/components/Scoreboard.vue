<template>
  <Vue3DraggableResizable :draggable="isDraggable" v-model:x="position.x" v-model:y="position.y" v-model:w="position.w"
    v-model:h="position.h" :minW="340" :minH="180" :parent="true" classNameHandle="scoreboard-handle" class="scoreboard"
    @drag-end="savePosition" @resize-end="savePosition">
    <div class="scoreboard__header">
      <div class="scoreboard__settings">
        <button class="btn" @click="toggleAutoScroll">
          <svg width="18" height="18" viewBox="0 0 24 24">
            <g :fill="isAutoScroll ? '#59f3b3' : 'white'">
              <path
                d="M10.293,16.293,9,17.586V4A1,1,0,0,0,7,4V17.586L5.707,16.293a1,1,0,0,0-1.414,1.414l3,3a1,1,0,0,0,1.416,0l3-3a1,1,0,0,0-1.414-1.414Z" />
              <path
                d="M19.707,6.293l-3-3a1,1,0,0,0-1.416,0l-3,3a1,1,0,0,0,1.414,1.414L15,6.414V20a1,1,0,0,0,2,0V6.414l1.293,1.293a1,1,0,0,0,1.414-1.414Z" />
            </g>
          </svg>
        </button>
        <button class="btn" @click="isSettingsVisible = !isSettingsVisible">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path :fill="isSettingsVisible ? '#59f3b3' : 'white'"
              d="M24 13.616v-3.232c-1.651-.587-2.694-.752-3.219-2.019v-.001c-.527-1.271.1-2.134.847-3.707l-2.285-2.285c-1.561.742-2.433 1.375-3.707.847h-.001c-1.269-.526-1.435-1.576-2.019-3.219h-3.232c-.582 1.635-.749 2.692-2.019 3.219h-.001c-1.271.528-2.132-.098-3.707-.847l-2.285 2.285c.745 1.568 1.375 2.434.847 3.707-.527 1.271-1.584 1.438-3.219 2.02v3.232c1.632.58 2.692.749 3.219 2.019.53 1.282-.114 2.166-.847 3.707l2.285 2.286c1.562-.743 2.434-1.375 3.707-.847h.001c1.27.526 1.436 1.579 2.019 3.219h3.232c.582-1.636.75-2.69 2.027-3.222h.001c1.262-.524 2.12.101 3.698.851l2.285-2.286c-.744-1.563-1.375-2.433-.848-3.706.527-1.271 1.588-1.44 3.221-2.021zm-12 2.384c-2.209 0-4-1.791-4-4s1.791-4 4-4 4 1.791 4 4-1.791 4-4 4z" />
          </svg>
        </button>
        <div v-if="isSettingsVisible" class="settings">
          <button class="btn" :class="{ active: fields[2].active }" @click="fields[2].active = !fields[2].active">
            {{ fields[2].text }}
          </button>
          <button class="btn" :class="{ active: fields[3].active }" @click="fields[3].active = !fields[3].active">
            {{ fields[3].text }}
          </button>
          <button class="btn" :class="{ active: fields[4].active }" @click="fields[4].active = !fields[4].active">
            {{ fields[4].text }}
          </button>
        </div>
      </div>
      <span class="scoreboardTitle">GUESSES ({{ guesses.length }})</span>
      <label class="switchContainer">
        <input class="switchBtn" type="checkbox" :checked="switchOn" @input="(event) => toggleGuesses(event)" />
        <div class="switch"></div>
      </label>
      <div class="scoreboardHint"></div>
    </div>
    <input type="range" v-model="scrollSpeed" @mouseover="isDraggable = false" @mouseleave="isDraggable = true" min="0.5"
      step="0.1" max="2" class="scrollSpeedSlider" :class="{ invisible: !isAutoScroll }">

    <table>
      <thead>
        <tr>
          <th v-for="field in activeFields" :key='field.value' @click="sortByCol(field)"
            :class="{ sortable: field.sortable }" :style="{ width: field.width }">
            {{ field.text }}
          </th>
        </tr>
      </thead>
      <tbody ref="tBody">
        <tr v-for="guess in guesses" :key='guess.username' :class="{ expand: guess.animationActive }">
          <td v-for="field in activeFields" :key='field.value' :style="{ width: field.width }">
            <span v-if="field.value === 'player'" :style="{ color: guess.color }" class="username">
              <span v-if="guess.flag" class="flag-icon" :style='{ backgroundImage: `url("flag:${guess.flag}")` }'></span>
              {{ guess.username }}
            </span>
            <span v-else-if="field.value === 'distance'">{{ toMeter(guess.distance) }}</span>
            <span v-else>{{ guess[field.value] }}</span>
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

const props = defineProps<{
  setGuessesOpen: Window['ChatguessrApi']['setGuessesOpen']
}>()

const tBody = ref<HTMLDivElement | null>(null)
const position = reactive({ x: 200, y: 50, w: 340, h: 180 })
const { y, arrivedState } = useScroll(tBody, { behavior: 'smooth' })
const isDraggable = ref(true)
const isAutoScroll = ref(false)
const scrollSpeed = ref("1")
const isSettingsVisible = ref(false)

const title = ref('GUESSES (0)')
const hint = ref('')
const switchOn = ref(true)
const switchVisible = ref(true)
const isMultiGuess = ref(false)
const state = ref<'in-game' | 'round-results' | 'game-results'>('in-game')

const columnVisibility = getLocalStorage(
  {
    streak: true,
    distance: true,
    score: true,
  }, 'cg_scoreboard_column_visibility')

const fields = reactive([
  { text: '#', value: 'index', width: "30px", sortable: true, active: true },
  { text: 'Player', value: 'player', sortable: false, active: true },
  { text: 'Streak', value: 'streak', width: "60px", sortable: true, active: columnVisibility.streak },
  { text: 'Distance', value: 'distance', width: "85px", sortable: true, active: columnVisibility.distance },
  { text: 'Score', value: 'score', width: "60px", sortable: true, active: columnVisibility.score }
])

watch(fields, () => {
  const fieldsToSave = Object.assign({}, ...fields.map(el => { return { [el.value]: el.active } }))
  setLocalStorage(fieldsToSave, 'cg_scoreboard_column_visibility')
})

const activeFields = computed(() => state.value === 'in-game' ? (isMultiGuess.value ? [fields[1]] : fields.filter(f => f.active)) : fields)
const sortType = ref<'desc' | 'asc'>('desc')

const guesses = reactive<Guess[]>([])

onMounted(async () => {
  Object.assign(position, getLocalStorage({ x: 200, y: 50, w: 380, h: 180 }, "cg_scoreboard__position"))
})

function renderGuess(guess: Guess) {
  console.log("🚀 ~ file: Scoreboard.vue:115 ~ renderGuess ~ guess:", guess)

  guess.animationActive = true

  guesses.push(guess)
  guesses.sort((a, b) => a.distance - b.distance)

  for (let i = 0; i < guesses.length; i++) {
    guesses[i].index = i + 1
  }

  setTimeout(() => {
    guess.animationActive = false
  }, 500)
}

function reset(isMultiGuess_: boolean) {
  isMultiGuess.value = isMultiGuess_
  title.value = 'GUESSES (0)'
  guesses.length = 0
  if (isMultiGuess) {
    hint.value = 'Ordered by guess time'
  } else {
    hint.value = ''
  }
}

function sortByCol(col) {
  if (!col.sortable) return

  sortGuessesBy(col.value, sortType.value)
  sortType.value = sortType.value === 'asc' ? 'desc' : 'asc';
}

function sortGuessesBy(col: string, sortType: 'desc' | 'asc') {
  if (sortType === 'asc') {
    guesses.sort((a, b) => a[col] - b[col])
  } else {
    guesses.sort((a, b) => b[col] - a[col])
  }
}

function toggleAutoScroll() {
  isAutoScroll.value = !isAutoScroll.value
  // 0: up, 1: down
  let direction = 1
  // we need decimals to reduce the default speed
  // however 'y' cannot handle decimals so we increment newY
  // one downside is that we can't scroll during autoscroll
  let newY = y.value

  function scrollFunc() {
    if (!isAutoScroll.value) return
    if (arrivedState.top && arrivedState.bottom) arrivedState.bottom = false

    if (direction) {
      if (arrivedState.bottom) {
        setTimeout(() => {
          direction = 0
          requestAnimationFrame(scrollFunc)
        }, 2000)
      }
      else {
        newY = newY + parseFloat(scrollSpeed.value)
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

const setTitle = (title_: string) => {
  title.value = title_
}

const showSwitch = (visibility: boolean) => {
  switchVisible.value = visibility
}

const toggleGuesses = (event: Event) => {
  console.log("aaaaaaaa");
  props.setGuessesOpen((event.target as HTMLInputElement).checked)
}

const setSwitchOn = (state: boolean) => {
  switchOn.value = state
}

const savePosition = () => {
  setLocalStorage(position, 'cg_scoreboard__position')
}

const toMeter = (distance: number) => distance >= 1 ? distance.toFixed(1) + 'km' : Math.floor(distance * 1000) + 'm'

defineExpose({
  renderGuess,
  setTitle,
  setSwitchOn,
  showSwitch,
  reset
})
</script>

<style scoped>
.vdr-container {
  border: none !important;
}

#CGFrameContainer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  overflow: hidden;
  /* pointer-events: none; */
}

.scoreboard {
  font-family: Montserrat, sans-serif;
  text-align: center;
  padding: 5px;
  color: #fff;
  font-size: 14px;
  background-color: rgba(0, 0, 0, 0.4);
  box-shadow: 2px 2px 7px -2px #000;
  border-radius: 10px;
  pointer-events: auto;
  user-select: none;
  cursor: move;
  z-index: 99999;
}

.scoreboard__header {
  display: grid;
  grid-template-areas: 'settings title switch';
  grid-template-columns: 90px auto 80px;
  /* grid-template-rows: 40px; */
  /* justify-items: center; */
  margin-top: 10px;
  font-size: 18px;
  align-items: center;
}

.scoreboard__settings {
  grid-area: settings;
  display: flex;
  gap: 0.2rem;
}

.scoreboardTitle {
  grid-area: title;
}

.settings {
  position: absolute;
  left: 75px;
  margin-top: -4px;
  display: flex;
  gap: 0.2rem;
  background-color: #000;
  padding: 0.2rem;
  border-radius: 5px;
  z-index: 999999;
}

.btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  /* width: 37px; */
  height: 24px;
  border: 1px solid rgb(0, 0, 0);
  border-radius: 4px;
  background-size: 200% auto;
  background-image: linear-gradient(to right,
      #2e2e2e 0%,
      #454545 51%,
      #2e2e2e 100%);
  transition: 0.3s;
  -webkit-transition: 0.3s;
  color: #fff;
}

.btn:hover {
  background-position: right center;
  box-shadow: 2px 2px 5px -2px #000;
}

.btn.active {
  background-image: linear-gradient(to right,
      #1cd997 0%,
      #33b09b 51%,
      #1cd997 100%);
}

.switchContainer {
  grid-area: switch;
  position: relative;
  display: inline-block;
  width: 37px;
  height: 21px;
  margin-left: auto;
  transition: 0.3s;
  -webkit-transition: 0.3s;
  /* z-index: 99; */
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
  border-radius: 4px;
  background-color: #e04352;
  /* transition: 0.1s; */
}

.switch:before {
  position: absolute;
  content: '';
  height: 16px;
  width: 16px;
  left: 2px;
  bottom: 3px;
  border-radius: 3px;
  background-color: #fff;
  transition: transform 0.2s;
}

input:checked+.switch {
  background-color: #1cd997;
  box-shadow: 2px 2px 7px -2px #000;
}

input:checked+.switch:before {
  transform: translateX(17px);
}

table {
  position: relative;
  height: calc(100% - 80px);
  margin: 0 auto;
  border-collapse: collapse;
  table-layout: fixed;
  word-wrap: break-word;
  /* overflow-y:hidden; */
  /* -ms-overflow-style: none; */
  /* scrollbar-width: none; */
  /* scroll-behavior: smooth; */
}

tbody {
  height: 100%;
  position: absolute;
  overflow-y: scroll;
  overflow-x: hidden;
  /* font-weight: 800; */
  /* width: 100%; */
  /* display:block; */
  /* overflow-y:scroll; */
  /* -ms-overflow-style: none; */
  /* scrollbar-width: none; */
  /* scroll-behavior: smooth; */
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

.username {
  font-size: 16px;
  text-shadow: 0.05em 0.05em 0.05em #fff;
}



/* SCROLL SLIDER */
.scrollSpeedSlider {
  height: 5px;
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  width: 100%;
  border-radius: 5px;
  /* background: #fff; */
  outline: none;
  opacity: 0.2;
  -webkit-transition: 0.3s;
  transition: opacity 0.3s;
  /* direction: rtl; */
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

.invisible {
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

.flex {
  display: flex;
  gap: 0.5rem;
}
</style>
