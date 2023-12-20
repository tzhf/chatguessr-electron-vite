<template>
  <div class="modal-mask">
    <div class="modal-wrapper">
      <div class="modal-container">
        <div class="tab">
          <button :class="{ active: currentTab === 1 }" @click="currentTab = 1">Settings</button>
          <button :class="{ active: currentTab === 2 }" @click="currentTab = 2">Twitch Connect</button>
          <button :class="{ active: currentTab === 3 }" @click="currentTab = 3">Banlist</button>
          <button class="close" @click="$emit('close')">&times;</button>
        </div>

        <div v-show="currentTab === 1" class="modal-content">
          <h2>Game Settings</h2>
          <div class="ml-05">
            <label class="form__group"
              data-tip="Players can change their guess. Streaks, scores & distances won't be displayed on the leaderboard">
              Allow guess changing
              <input type="checkbox" v-model="settings.isMultiGuess">
            </label>
            <label class="form__group"
              data-tip="Drawing too much guess markers on the map may affect performance (default: 100)">
              Guess markers limit ({{ settings.guessMarkersLimit }}) :
              <input type="range" min="10" step="10" max="1000" v-model="settings.guessMarkersLimit" />
            </label>
          </div>
          <hr />

          <h2>Twitch notifications</h2>
          <div class="ml-05">
            <label class="form__group" data-tip="Display &lt;User&gt; has guessed">
              <i>&lt;User&gt; has guessed</i>
              <input type="checkbox" v-model="settings!.showHasGuessed" />
            </label>
            <label class="form__group" data-tip="Display &lt;User&gt; has already guessed">
              <i>&lt;User&gt; has already guessed</i>
              <input type="checkbox" v-model="settings.showHasAlreadyGuessed" />
            </label>
            <label class="form__group" data-tip="Display &lt;User&gt; guess changed">
              <i>&lt;User&gt; guess changed</i>
              <input type="checkbox" v-model="settings.showGuessChanged" />
            </label>
            <label class="form__group" data-tip="Display &lt;User&gt; submitted previous guess">
              <i>&lt;User&gt; submitted previous guess</i>
              <input type="checkbox" v-model="settings.showSubmittedPreviousGuess" />
            </label>
          </div>

          <hr />

          <h2>Twitch commands <small>(leave empty to disable)</small></h2>
          <div class="ml-05">
            <div class="grid__col">
              <div>
                <label class="form__group" data-tip="Get user stats in chat  (default: !me)">
                  Get user stats :
                  <input type="text" spellcheck="false" v-model.trim="settings.getUserStatsCmd" />
                </label>
                <label class="form__group" data-tip="Get channel best stats (default: !best)">
                  Get best stats :
                  <input type="text" spellcheck="false" v-model.trim="settings.getBestStatsCmd" />
                </label>
                <label class="form__group" data-tip="Clear user stats (default: !clear)">
                  Clear user stats :
                  <input type="text" spellcheck="false" v-model.trim="settings.clearUserStatsCmd" />
                </label>
                <label class="form__group" data-tip="Get map link (default: !cg)">
                  Get map link :
                  <input type="text" spellcheck="false" v-model.trim="settings.cgCmd" />
                </label>
              </div>

              <div>
                <label class="form__group" data-tip="Get flags list  (default: !flags)">
                  Get flags list :
                  <input type="text" spellcheck="false" v-model.trim="settings.flagsCmd" />
                </label>
                <label class="form__group" data-tip="Return list of available flags  (default: chatguessr.com/flags)">
                  Flags link :
                  <input type="text" spellcheck="false" v-model.trim="settings.flagsCmdMsg" />
                </label>
                <label class="form__group" data-tip="Guess random coordinates (default: !randomplonk)">
                  Random plonk :
                  <input type="text" spellcheck="false" v-model.trim="settings.randomPlonkCmd" />
                </label>
                <label class="form__group" data-tip="Map link cooldown (default: 30)">
                  Map link Cooldown ({{ settings.cgCmdCooldown }} sec) :
                  <input type="range" min="0" step="5" max="120" v-model="settings.cgCmdCooldown" />
                </label>
              </div>
            </div>

            <label class="form__group">
              Map link message :
            </label>
            <textarea spellcheck="false" rows="3" v-model="settings.cgMsg"></textarea>
          </div>

          <hr>
          <div class="flex flex-col gap-05 mt-1-5">
            <small>ChatGuessr version {{ currentVerion }}</small>
            <button type="button"
              :class="['btn', clearStatsBtn.state === 1 ? 'warning' : clearStatsBtn.state === 2 ? 'success' : 'danger']"
              @click="clearStats()">{{ clearStatsBtn.text }}</button>
          </div>
        </div>

        <div v-show="currentTab === 2" class="modal-content">
          <div class="flex flex-col flex-center gap-05 mx-1">
            <span class="icon twitch-icon"></span>
            <span :class="[twitchConnectionState.state]">
              {{ twitchConnectionState.state }}
              <span v-if="twitchConnectionState.state === 'connected'"> as {{ twitchConnectionState.botUsername }}</span>
            </span>
            <button :class="['btn', twitchConnectionState.state]" @click="chatguessrApi.replaceSession">
              {{ twitchConnectionState.state === 'connected' ? 'Change account' : twitchConnectionState.state ===
                'connecting' ? 'Connecting...' : 'Login' }}
            </button>
          </div>
          <h2>Status :</h2>
          <div style="margin-left:1rem">
            <label class="form__group">
              Twitch :<span :class="[twitchConnectionState.state]">{{ twitchConnectionState.state }}</span>
            </label>
            <label class="form__group">
              Server :<span :class="[socketConnectionState.state]">{{ socketConnectionState.state }}</span>
            </label>
            <label class="form__group" data-tip="Your streamer account">
              Your streaming channel :
              <form @submit.prevent="changeChannel()">
                <div class="flex gap-05">
                  <input type="text" v-model="newChannelName" spellcheck="false" required />
                  <button type="submit" v-if="newChannelName != settings.channelName" class="btn">Update</button>
                </div>
              </form>
            </label>

            <label class="form__group">
              Your cg link :
              <div>
                <div class="flex gap-05">
                  <input type="text"
                    :value="twitchConnectionState.state === 'connected' ? `chatguessr.com/map/${twitchConnectionState.botUsername}` : ''"
                    disabled />
                  <button class="btn success" style="margin-right: 2px">🖊️</button>
                </div>
              </div>
            </label>
          </div>
        </div>

        <div v-show="currentTab === 3" class="modal-content">
          <div class="form__group gap-05">
            <input class="form__group w-full" type="text" spellcheck="false" v-model.trim="newBannedUser"
              @keyup.enter="addBannedUser()" />
            <button type="button" class="btn small danger" @click="addBannedUser()">Ban User</button>
          </div>

          <h3>Banned users :</h3>
          <div class="flex flex-wrap gap-05">
            <span v-for="(user, index) of bannedUsers" :key="index" class="badge danger" title="Unban user"
              @click="removeBannedUser(index, user)">{{ user.username }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue"

const { chatguessrApi, socketConnectionState, twitchConnectionState } = defineProps<{
  chatguessrApi: Window['ChatguessrApi'],
  twitchConnectionState: TwitchConnectionState,
  socketConnectionState: SocketConnectionState,
}>()

const settings = reactive<Settings>(await chatguessrApi.getSettings())
const bannedUsers = reactive<{ username: string }[]>(await chatguessrApi.getBannedUsers())
const currentVerion = ref(await chatguessrApi.getCurrentVersion())

const newChannelName = ref(settings.channelName)
const newBannedUser = ref('')
const currentTab = ref(twitchConnectionState.state === 'disconnected' ? 2 : 1)
const clearStatsBtn = reactive({ state: 0, text: "🗑️ Clear user stats" })

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
    clearStatsBtn.text = "⚠️ Are you sure ?"
    clearStatsBtn.state = 1
  } else {
    clearStatsBtn.text = "✔️ All stats cleared"
    clearStatsBtn.state = 2
    chatguessrApi.clearStats()

    setTimeout(() => {
      clearStatsBtn.state = 0
      clearStatsBtn.text = "🗑️ Clear user stats"
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
  background-color: rgba(0, 0, 0, 0.3);
  transition: opacity 0.3s ease;
  z-index: 99999;
}

.modal-wrapper {
  display: table-cell;
  vertical-align: middle;
}

.modal-container {
  margin: 0 auto;
  max-width: 800px;
  min-height: 680px;
  font-family: 'Montserrat';
  font-size: 13px;
  font-weight: 700;
  color: white;
  background-color: rgb(0, 0, 0, 0.75);
  border-radius: .5rem;
  user-select: none;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid rgb(82, 82, 82);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

.modal-content {
  padding: 1rem;
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
  cursor: pointer;
  transition: 0.5s;
  letter-spacing: 1px;
  background-color: rgb(58, 58, 58);
  color: #fff;
}

.tab button:not(:last-child) {
  border-right: solid 1px rgb(0, 0, 0);
}

.tab button:hover {
  background: #4fc489;
}

.tab button.active {
  color: #000;
  background: var(--main-color);
}

.tab button.close {
  font-size: 24px;
  background: #c91414;
}

.tab button.close:hover {
  background: #a02727;
}

.tab button.close:active {
  background: #a02727;
}

[data-tip] {
  position: relative;
}

[data-tip]:hover:after,
[data-tip]:hover:before {
  display: block;
}

[data-tip]:before {
  content: "";
  display: none;
  position: absolute;
  top: 24px;
  right: 4px;
  width: 0;
  height: 0;
  /* font-size: 0; */
  /* line-height: 0; */
  border-left: 5px solid transparent;
  border-right: 5px solid transparent;
  border-bottom: 8px solid rgb(99, 99, 99);
  z-index: 9;
}

[data-tip]:after {
  content: attr(data-tip);
  display: none;
  position: absolute;
  top: 32px;
  right: 0;
  min-width: 200px;
  padding: 12px;
  font-size: 14px;
  font-weight: 700;
  text-align: center;
  word-wrap: break-word;
  color: #ffffff;
  background: rgb(99, 99, 99);
  border-radius: 4px;
  z-index: 999;
}

.btn.connected {
  background: var(--main-color)
}

.btn.connecting {
  background: rgb(255, 174, 0);
}

.btn.disconnected {
  background: rgb(255, 0, 0);
}

span.connected {
  color: var(--main-color)
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
  box-shadow: 0 1px 3px rgb(0 0 0 / 12%), 0 1px 2px rgb(0 0 0 / 24%);
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
