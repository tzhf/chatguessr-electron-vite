import { store } from './useStore'

const storedSettings = store.get('settings')

const settings: Settings = storedSettings ?? {
  channelName: '',
  token: '',
  cgCmd: '!cg',
  cgCmdCooldown: 30,
  cgMsg: `
      Two ways to play:
      1. Login with Twitch, make your guess and press guess (spacebar).
      2. Paste the command into chat without editing: <your cg link>
    `,
  flagsCmd: '!flags',
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

const saveSettings = (settings_: Settings): void => {
  Object.assign(settings, settings_)
  store.set('settings', settings)
}

export { settings, saveSettings }