import { store } from './useStore'
import { reactive } from 'vue'

// export interface Settings {
//   channelName: string
//   token: string
//   cgCmd: string
//   cgCmdCooldown: number
//   cgMsg: string
//   flagsCmd: string
//   flagsCmdMsg: string
//   getUserStatsCmd: string
//   getBestStatsCmd: string
//   clearUserStatsCmd: string
//   randomPlonkCmd: string
//   showHasGuessed: boolean
//   showHasAlreadyGuessed: boolean
//   showGuessChanged: boolean
//   showSubmittedPreviousGuess: boolean
//   isMultiGuess: boolean
//   guessMarkersLimit: number
// }

export function useSettings() {
  const storedSettings = store.get('settings')

  const settings = reactive(
    storedSettings || {
      channelName: '',
      token: '',
      cgCmd: '!cg',
      cgCmdCooldown: 30,
      cgMsg: `Two ways to play:
1. Login with Twitch, make your guess and press guess (spacebar).
2. Paste the command into chat without editing: <your cg link>`,
      flagsCmd: '!flags',
      flagsCmdMsg: 'chatguessr.com/flags',
      getUserStatsCmd: '!me',
      getBestStatsCmd: '!best',
      clearUserStatsCmd: '!clear',
      randomPlonkCmd: '!randomplonk',
      showHasGuessed: true,
      showHasAlreadyGuessed: true,
      showGuessChanged: true,
      showSubmittedPreviousGuess: true,
      isMultiGuess: false,
      guessMarkersLimit: 100
    }
  )

  const saveSettings = (settings_: Settings): void => {
    Object.assign(settings, settings_)
    store.set('settings', settings)
  }

  return { settings, saveSettings }
}
