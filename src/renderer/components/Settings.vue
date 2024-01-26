<template>
  <div class="modal-mask">
    <div class="modal-wrapper">
      <div class="modal-container">
        <div class="tab">
          <button :class="{ active: currentTab === 1 }" @click="currentTab = 1">Settings</button>
          <button :class="{ active: currentTab === 2 }" @click="currentTab = 2">
            Twitch Connect
          </button>
          <button :class="{ active: currentTab === 3 }" @click="currentTab = 3">Banlist</button>
          <button class="close" @click="$emit('close')">&times;</button>
        </div>

        <div v-show="currentTab === 1" class="modal-content">
          <h2>Game Settings</h2>
          <div class="ml-05">
            <label
              class="form__group"
              data-tip="Players can change their guess. Streaks, scores & distances won't be displayed on the leaderboard"
            >
              Allow guess changing
              <input v-model="settings.isMultiGuess" type="checkbox" />
            </label>
            <label
              class="form__group"
              data-tip="Drawing too much guess markers on the map may affect performance (default: 100)"
            >
              Guess markers limit ({{ settings.guessMarkersLimit }}) :
              <input
                v-model="settings.guessMarkersLimit"
                type="range"
                min="10"
                step="10"
                max="1000"
              />
            </label>
          </div>
          <hr />

          <h2>Twitch notifications</h2>
          <div class="ml-05">
            <label class="form__group" data-tip="Display &lt;User&gt; has guessed">
              <i>&lt;User&gt; has guessed</i>
              <input v-model="settings!.showHasGuessed" type="checkbox" />
            </label>
            <label class="form__group" data-tip="Display &lt;User&gt; has already guessed">
              <i>&lt;User&gt; has already guessed</i>
              <input v-model="settings.showHasAlreadyGuessed" type="checkbox" />
            </label>
            <label class="form__group" data-tip="Display &lt;User&gt; guess changed">
              <i>&lt;User&gt; guess changed</i>
              <input v-model="settings.showGuessChanged" type="checkbox" />
            </label>
            <label class="form__group" data-tip="Display &lt;User&gt; submitted previous guess">
              <i>&lt;User&gt; submitted previous guess</i>
              <input v-model="settings.showSubmittedPreviousGuess" type="checkbox" />
            </label>
          </div>
          <hr />

          <h2>Twitch commands <small>(leave empty to disable)</small></h2>
          <div class="ml-05">
            <div class="grid__col">
              <div>
                <label class="form__group" data-tip="Get user stats in chat  (default: !me)">
                  Get user stats :
                  <input v-model.trim="settings.getUserStatsCmd" type="text" spellcheck="false" />
                </label>
                <label class="form__group" data-tip="Get channel best stats (default: !best)">
                  Get best stats :
                  <input v-model.trim="settings.getBestStatsCmd" type="text" spellcheck="false" />
                </label>
                <label class="form__group" data-tip="Clear user stats (default: !clear)">
                  Clear user stats :
                  <input v-model.trim="settings.clearUserStatsCmd" type="text" spellcheck="false" />
                </label>
                <label class="form__group" data-tip="Get map link (default: !cg)">
                  Get map link :
                  <input v-model.trim="settings.cgCmd" type="text" spellcheck="false" />
                </label>
              </div>

              <div>
                <label class="form__group" data-tip="Get flags list  (default: !flags)">
                  Get flags list :
                  <input v-model.trim="settings.flagsCmd" type="text" spellcheck="false" />
                </label>
                <label
                  class="form__group"
                  data-tip="Return list of available flags  (default: chatguessr.com/flags)"
                >
                  Flags link :
                  <input v-model.trim="settings.flagsCmdMsg" type="text" spellcheck="false" />
                </label>
                <label
                  class="form__group"
                  data-tip="Guess random coordinates (default: !randomplonk)"
                >
                  Random plonk :
                  <input v-model.trim="settings.randomPlonkCmd" type="text" spellcheck="false" />
                </label>
                <label class="form__group" data-tip="Map link cooldown (default: 30)">
                  Map link Cooldown ({{ settings.cgCmdCooldown }} sec) :
                  <input v-model="settings.cgCmdCooldown" type="range" min="0" step="5" max="120" />
                </label>
              </div>
            </div>

            <label class="form__group"> Map link message : </label>
            <textarea v-model="settings.cgMsg" spellcheck="false" rows="3"></textarea>
          </div>

          <hr />
          <div class="flex flex-col gap-05 mt-1">
            <small>ChatGuessr version {{ currentVerion }}</small>
            <button
              type="button"
              :class="[
                'btn',
                clearStatsBtn.state === 1
                  ? 'warning'
                  : clearStatsBtn.state === 2
                    ? 'success'
                    : 'danger'
              ]"
              @click="clearStats()"
            >
              {{ clearStatsBtn.text }}
            </button>
          </div>
        </div>

        <div v-show="currentTab === 2" class="modal-content">
          <div class="flex flex-col flex-center gap-05 mx-1">
            <span class="icon twitch-icon"></span>
            <span :class="[twitchConnectionState.state]">
              {{ twitchConnectionState.state }}
              <span v-if="twitchConnectionState.state === 'connected'">
                as {{ twitchConnectionState.botUsername }}</span
              >
            </span>
            <button
              :class="['btn', twitchConnectionState.state]"
              @click="chatguessrApi.replaceSession"
            >
              {{
                twitchConnectionState.state === 'connected'
                  ? 'Change account'
                  : twitchConnectionState.state === 'connecting'
                    ? 'Connecting...'
                    : 'Login'
              }}
            </button>
          </div>
          <h2>Status :</h2>
          <div style="margin-left: 1rem">
            <label class="form__group">
              Twitch :<span :class="[twitchConnectionState.state]">{{
                twitchConnectionState.state
              }}</span>
            </label>
            <label class="form__group">
              Server :<span :class="[socketConnectionState.state]">{{
                socketConnectionState.state
              }}</span>
            </label>
            <label class="form__group" data-tip="Your streamer account">
              Your streaming channel :
              <form @submit.prevent="changeChannel()">
                <div class="flex gap-05">
                  <input v-model="newChannelName" type="text" spellcheck="false" required />
                  <button v-if="newChannelName != settings.channelName" type="submit" class="btn">
                    Update
                  </button>
                </div>
              </form>
            </label>

            <label class="form__group">
              Your cg link :
              <div>
                <div class="flex gap-05">
                  <input
                    type="text"
                    :value="
                      twitchConnectionState.state === 'connected'
                        ? `chatguessr.com/map/${twitchConnectionState.botUsername}`
                        : ''
                    "
                    disabled
                  />
                  <button class="btn success">🖊️</button>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div v-show="currentTab === 3" class="modal-content">
          <div class="form__group gap-05">
            <input
              v-model.trim="newBannedUser"
              class="form__group w-full"
              type="text"
              spellcheck="false"
              @keyup.enter="addBannedUser()"
            />
            <button type="button" class="btn small danger" @click="addBannedUser()">
              Ban User
            </button>
          </div>

          <h3>Banned users :</h3>
          <div class="flex flex-wrap gap-05">
            <span
              v-for="(user, index) of bannedUsers"
              :key="index"
              class="badge danger"
              title="Unban user"
              @click="removeBannedUser(index, user)"
              >{{ user.username }}</span
            >
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'

const { chatguessrApi, socketConnectionState, twitchConnectionState } = defineProps<{
  chatguessrApi: Window['chatguessrApi']
  twitchConnectionState: TwitchConnectionState
  socketConnectionState: SocketConnectionState
}>()

const settings = reactive<Settings>(await chatguessrApi.getSettings())
const bannedUsers = reactive<{ username: string }[]>(await chatguessrApi.getBannedUsers())
const currentVerion = ref(await chatguessrApi.getCurrentVersion())

const newChannelName = ref(settings.channelName)
const newBannedUser = ref('')
const currentTab = ref(twitchConnectionState.state === 'disconnected' ? 2 : 1)
const clearStatsBtn = reactive({ state: 0, text: '🗑️ Clear user stats' })

watch(settings, () => {
  chatguessrApi.saveSettings({ ...settings })
})

const changeChannel = () => {
  settings.channelName = newChannelName.value
}

const addBannedUser = () => {
  if (!newBannedUser.value) return
  bannedUsers.push({ username: newBannedUser.value })
  chatguessrApi.addBannedUser(newBannedUser.value)
  newBannedUser.value = ''
}

const removeBannedUser = (index: number, user: { username: string }) => {
  chatguessrApi.deleteBannedUser(user.username)
  bannedUsers.splice(index, 1)
}
// onBeforeUnmount(chatguessrApi.onTwitchError(() => {
//   console.log("error")
// }));

const clearStats = () => {
  if (clearStatsBtn.state === 2) return
  if (clearStatsBtn.state === 0) {
    clearStatsBtn.text = '⚠️ Are you sure ?'
    clearStatsBtn.state = 1
  } else {
    clearStatsBtn.text = '✔️ All stats cleared'
    clearStatsBtn.state = 2
    chatguessrApi.clearStats()

    setTimeout(() => {
      clearStatsBtn.state = 0
      clearStatsBtn.text = '🗑️ Clear user stats'
    }, 2000)
  }
}
</script>
<style scoped>
.modal-mask {
  position: fixed;
  display: table;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: var(--bg-dark-transparent);
  transition: opacity 0.3s ease;
  z-index: 99999;
}

.modal-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.modal-container {
  margin: 0 auto;
  max-width: 780px;
  min-height: 660px;
  font-family: Montserrat, sans-serif;
  font-size: 13px;
  font-weight: 700;
  color: white;
  background-color: var(--bg-dark-transparent);
  border-radius: 0.5rem;
  border: 1px solid rgb(63, 63, 63, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
  transition: all 0.3s ease;
  user-select: none;
  overflow: hidden;
}

.modal-content {
  padding: 0.5rem 1rem;
}

.grid__col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 1rem;
}

.tab {
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 40px;
}

.tab button {
  line-height: 1;
  padding: 0.5rem;
  letter-spacing: 1px;
  color: #fff;
  font-weight: 500;
  background-color: rgb(58, 58, 58);
  transition: 0.3s;
  cursor: pointer;
}

.tab button:not(:last-child) {
  border-right: solid 1px rgb(0, 0, 0);
}

.tab button:hover,
.tab button.active {
  color: #000;
  background: var(--main-color);
}

.tab button.close {
  font-size: 24px;
  background: var(--danger);
}

.tab button.close:hover {
  background: var(--danger-hover);
}

.tab button.close:active {
  background: var(--danger-active);
}

[data-tip] {
  position: relative;
}

[data-tip]:hover:after,
[data-tip]:hover:before {
  display: block;
}

[data-tip]:before {
  content: '';
  display: none;
  position: absolute;
  top: 22px;
  right: 4px;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 8px solid rgb(127 127 127);
  z-index: 1;
}

[data-tip]:after {
  content: attr(data-tip);
  display: none;
  position: absolute;
  top: 30px;
  right: 0;
  min-width: 200px;
  padding: 0.7rem 1rem;
  text-align: center;
  /* word-wrap: break-word; */
  color: #ffffff;
  background: rgb(127 127 127);
  border-radius: 4px;
  z-index: 1;
}

.btn.connected {
  background: var(--main-color);
}

.btn.connecting {
  background: rgb(255, 174, 0);
}

.btn.disconnected {
  background: rgb(255, 0, 0);
}

span.connected {
  color: var(--main-color);
}

span.connecting {
  color: rgb(255, 174, 0);
}

span.disconnected {
  color: rgb(255, 0, 0);
}

.twitch-icon {
  background-image: url(asset:icons/twitch_icon.svg);
  display: block;
  width: 100px;
  height: 100px;
}

.badge {
  cursor: pointer;
  padding: 5px;
  border-radius: 5px;
  box-shadow:
    0 1px 3px rgb(0 0 0 / 12%),
    0 1px 2px rgb(0 0 0 / 24%);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container,
.modal-leave-active .modal-container {
  -webkit-transform: scale(1.1);
  transform: scale(1.1);
}
</style>
