import { store } from './store'

const storedSettings = store.get('settings')

declare global {
  type Settings = typeof defaultSettings
}

const defaultSettings = {
  channelName: '',
  token: '',
  cgCmd: '!cg',
  cgCmdCooldown: 30,
  cgMsg: `Two ways to play: Link your Twitch account, guess and plonk with spacebar | or paste the command into chat without editing: <your cg link>`,
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
  guessMarkersLimit: 30
}

const settings = storedSettings ?? defaultSettings

const saveSettings = (settings_: Settings): void => {
  Object.assign(settings, settings_)
  store.set('settings', settings)
}

export { settings, saveSettings }
