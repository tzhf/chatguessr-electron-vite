import { store } from './useStore'

interface Settings {
  channelName: string
  token: string
  cgCmd: string
  cgCmdCooldown: number
  cgMsg: string
  flagsCmd: string
  flagsCmdMsg: string
  getUserStatsCmd: string
  getBestStatsCmd: string
  clearUserStatsCmd: string
  randomPlonkCmd: string
  showHasGuessed: boolean
  showHasAlreadyGuessed: boolean
  showGuessChanged: boolean
  showSubmittedPreviousGuess: boolean
  isMultiGuess: boolean
  guessMarkersLimit: number
}

class Settings implements Settings {
  constructor({
    channelName = '',
    token = '',
    cgCmd = '!cg',
    cgCmdCooldown = 30,
    cgMsg = `Two ways to play:
1. Login with Twitch, make your guess and press guess (spacebar).
2. Paste the command into chat without editing: <your cg link>`,
    flagsCmd = '!flags',
    flagsCmdMsg = 'chatguessr.com/flags',
    getUserStatsCmd = '!me',
    getBestStatsCmd = '!best',
    clearUserStatsCmd = '!clear',
    randomPlonkCmd = '!randomplonk',
    showHasGuessed = true,
    showHasAlreadyGuessed = true,
    showGuessChanged = true,
    showSubmittedPreviousGuess = true,
    isMultiGuess = false,
    guessMarkersLimit = 100
  }) {
    this.channelName = channelName
    this.token = token
    this.cgCmd = cgCmd
    this.cgCmdCooldown = cgCmdCooldown
    this.cgMsg = cgMsg
    this.flagsCmd = flagsCmd
    this.flagsCmdMsg = flagsCmdMsg
    this.getUserStatsCmd = getUserStatsCmd
    this.getBestStatsCmd = getBestStatsCmd
    this.clearUserStatsCmd = clearUserStatsCmd
    this.randomPlonkCmd = randomPlonkCmd
    this.showHasGuessed = showHasGuessed
    this.showHasAlreadyGuessed = showHasAlreadyGuessed
    this.showGuessChanged = showGuessChanged
    this.showSubmittedPreviousGuess = showSubmittedPreviousGuess
    this.isMultiGuess = isMultiGuess
    this.guessMarkersLimit = guessMarkersLimit
  }

  saveGlobalSettings(globalSettings: {
    cgCmd: string
    cgCmdCooldown: number
    cgMsg: string
    flagsCmd: string
    flagsCmdMsg: string
    clearUserStatsCmd: string
    getUserStatsCmd: string
    getBestStatsCmd: string
    randomPlonkCmd: string
    showHasGuessed: boolean
    showHasAlreadyGuessed: boolean
    showGuessChanged: boolean
    showSubmittedPreviousGuess: boolean
    isMultiGuess: boolean
    guessMarkersLimit: number
  }) {
    this.cgCmd = globalSettings.cgCmd
    this.cgCmdCooldown = globalSettings.cgCmdCooldown
    this.cgMsg = globalSettings.cgMsg
    this.flagsCmd = globalSettings.flagsCmd
    this.flagsCmdMsg = globalSettings.flagsCmdMsg
    this.getUserStatsCmd = globalSettings.getUserStatsCmd
    this.getBestStatsCmd = globalSettings.getBestStatsCmd
    this.clearUserStatsCmd = globalSettings.clearUserStatsCmd
    this.randomPlonkCmd = globalSettings.randomPlonkCmd
    this.showHasGuessed = globalSettings.showHasGuessed
    this.showHasAlreadyGuessed = globalSettings.showHasAlreadyGuessed
    this.showGuessChanged = globalSettings.showGuessChanged
    this.showSubmittedPreviousGuess = globalSettings.showSubmittedPreviousGuess
    this.isMultiGuess = globalSettings.isMultiGuess
    this.guessMarkersLimit = globalSettings.guessMarkersLimit
    this.#save()
  }

  saveTwitchSettings(channelName: string) {
    this.channelName = channelName
    this.#save()
  }

  toJSON() {
    return {
      channelName: this.channelName,
      token: this.token,
      cgCmd: this.cgCmd,
      cgCmdCooldown: this.cgCmdCooldown,
      cgMsg: this.cgMsg,
      flagsCmd: this.flagsCmd,
      flagsCmdMsg: this.flagsCmdMsg,
      getUserStatsCmd: this.getUserStatsCmd,
      getBestStatsCmd: this.getBestStatsCmd,
      clearUserStatsCmd: this.clearUserStatsCmd,
      randomPlonkCmd: this.randomPlonkCmd,
      showHasGuessed: this.showHasGuessed,
      showHasAlreadyGuessed: this.showHasAlreadyGuessed,
      showGuessChanged: this.showGuessChanged,
      showSubmittedPreviousGuess: this.showSubmittedPreviousGuess,
      isMultiGuess: this.isMultiGuess,
      guessMarkersLimit: this.guessMarkersLimit
    }
  }

  static read() {
    return new Settings(store.get('settings'))
  }

  #save() {
    store.set('settings', this.toJSON())
  }
}

export default Settings
