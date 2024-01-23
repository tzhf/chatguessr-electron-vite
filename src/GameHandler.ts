// @ts-nocheck
import { ipcMain } from 'electron'
import { once } from 'events'
import { io } from 'socket.io-client'
import Game from './Game'
import TwitchBackend from './utils/useTwitchJS'
import { store } from './utils/useStore'
import { isGameURL, makeLink, parseCoordinates, getRandomCoordsInLand } from './utils/GameHelper'
import { getEmoji, randomCountryFlag, selectFlag } from './utils/flags/flags'
// import Settings from './utils/Settings'
// import createSettingsWindow from './settings/SettingsWindow'

import { useSettings } from './utils/useSettings'
const { settings, saveSettings } = useSettings()

const SOCKET_SERVER_URL = process.env.SOCKET_SERVER_URL ?? 'https://chatguessr-server.herokuapp.com'
// const settings = Settings.read()

export default class GameHandler {
  #db: Database

  #win: BrowserWindow

  // #settingsWindow: BrowserWindow | undefined

  #session: Session | undefined

  #backend: TwitchBackend | undefined

  #socket: Socket | undefined

  #game: Game

  #requestAuthentication

  constructor(
    db: Database,
    win: BrowserWindow,
    options: { requestAuthentication: () => Promise<void> }
  ) {
    this.#db = db
    this.#win = win
    this.#backend = undefined
    this.#socket = undefined
    this.#game = new Game(db, settings)
    this.#requestAuthentication = options.requestAuthentication
    this.init()
  }

  openGuesses() {
    this.#game.openGuesses()
    this.#win.webContents.send('switch-on')
    this.#backend?.sendMessage('Guesses are open...', { system: true })
  }

  closeGuesses() {
    this.#game.closeGuesses()
    this.#win.webContents.send('switch-off')
    this.#backend?.sendMessage('Guesses are closed.', { system: true })
  }

  nextRound() {
    if (this.#game.isFinished) {
      this.#game.finishGame()
      this.#showGameResults()
    } else {
      this.#win.webContents.send('next-round', this.#game.isMultiGuess, this.#game.getLocation())
      this.#backend?.sendMessage(`🌎 Round ${this.#game.round} has started`, { system: true })
      this.openGuesses()
    }
  }

  returnToMapPage() {
    const mapUrl = this.#game.seed?.map
    this.#win.loadURL(`https://www.geoguessr.com/maps/${mapUrl}/play`)
  }

  #showRoundResults(location: Location_, roundResults: RoundResult[]) {
    const round = this.#game.isFinished ? this.#game.round : this.#game.round - 1

    if (roundResults[0]) roundResults[0].color = '#E3BB39'
    if (roundResults[1]) roundResults[1].color = '#C9C9C9'
    if (roundResults[2]) roundResults[2].color = '#A3682E'

    this.#win.webContents.send(
      'show-round-results',
      round,
      location,
      roundResults,
      settings.guessMarkersLimit
    )
    this.#backend?.sendMessage(
      `🌎 Round ${round} has finished. Congrats ${getEmoji(roundResults[0].flag)} ${
        roundResults[0].username
      } !`,
      { system: true }
    )
  }

  async #showGameResults() {
    const gameResults = this.#game.getGameResults()
    const locations = this.#game.getLocations()

    if (gameResults[0]) gameResults[0].color = '#E3BB39'
    if (gameResults[1]) gameResults[1].color = '#C9C9C9'
    if (gameResults[2]) gameResults[2].color = '#A3682E'

    this.#win.webContents.send('show-game-results', locations, gameResults)

    let link: string | undefined
    try {
      link = await makeLink(
        this.#session!.access_token,
        this.#session!.user.user_metadata.name,
        settings.channelName,
        this.#game.mapName,
        this.#game.mode,
        locations,
        gameResults
      )
    } catch (error) {
      console.error('could not upload summary', error)
    }
    await this.#backend?.sendMessage(
      `🌎 Game finished. Congrats ${getEmoji(gameResults[0].flag)} ${gameResults[0].username} 🏆! ${
        link != undefined ? `Game summary: ${link}` : ''
      }`,
      { system: true }
    )
  }

  init() {
    // Browser Listening
    this.#win.webContents.on('did-navigate-in-page', (_event, url) => {
      if (isGameURL(url)) {
        // TODO(reanna) warn about the thing not being connected
        if (!this.#backend) return

        this.#game
          .start(url, settings.isMultiGuess)
          .then(() => {
            const guesses = this.#game.isMultiGuess
              ? this.#game.getMultiGuesses()
              : this.#game.getRoundResults()
            this.#win.webContents.send(
              'game-started',
              this.#game.isMultiGuess,
              guesses,
              this.#game.getLocation()
            )

            if (guesses.length > 0) {
              this.#backend?.sendMessage(`🌎 Round ${this.#game.round} has resumed`, {
                system: true
              })
            } else if (this.#game.round === 1) {
              this.#backend?.sendMessage(`🌎 A new seed of ${this.#game.mapName} has started`, {
                system: true
              })
            } else {
              this.#backend?.sendMessage(`🌎 Round ${this.#game.round} has started`, {
                system: true
              })
            }

            this.openGuesses()
          })
          .catch((error) => {
            console.error(error)
          })
      } else {
        this.#game.outGame()
        this.#win.webContents.send('game-quitted')
      }
    })

    this.#win.webContents.on('did-frame-finish-load', () => {
      if (!this.#game.isInGame) return

      this.#win.webContents.executeJavaScript(`
                window.nextRoundBtn = document.querySelector('[data-qa="close-round-result"]');
                window.playAgainBtn = document.querySelector('[data-qa="play-again-button"]');

                if (window.nextRoundBtn) {
                    nextRoundBtn.addEventListener("click", () => {
                        nextRoundBtn.setAttribute('disabled', 'disabled');
                        chatguessrApi.startNextRound();
                    });
                }

                if (window.playAgainBtn) {
                    playAgainBtn.addEventListener("click", () => {
                        playAgainBtn.setAttribute('disabled', 'disabled');
                        chatguessrApi.returnToMapPage();
                    });
                }
            `)

      if (this.#game.isFinished) return

      this.#win.webContents.send('refreshed-in-game', this.#game.getLocation())
      // Checks and update seed when the this.game has refreshed
      // update the current location if it was skipped
      // if the streamer has guessed returns scores
      this.#game.refreshSeed().then((roundResults) => {
        if (roundResults) {
          this.#showRoundResults(roundResults.location, roundResults.roundResults)
        }
      })
    })

    ipcMain.on('next-round-click', () => {
      this.nextRound()
    })

    ipcMain.on('return-to-map-page', () => {
      this.returnToMapPage()
    })

    ipcMain.on('open-guesses', () => {
      this.openGuesses()
    })

    ipcMain.on('close-guesses', () => {
      if (this.#game.guessesOpen) this.closeGuesses()
    })

    // ipcMain.on('save-twitch-settings', (_event, channelName: string) => {
    //   settings.saveTwitchSettings(channelName)
    //   this.#requestAuthentication()
    // })

    ipcMain.handle('get-settings', () => {
      return { ...settings }
    })

    ipcMain.on('save-settings', (_event, settings_: Settings) => {
      if (settings_.channelName != settings.channelName) {
        this.#requestAuthentication()
      }
      saveSettings(settings_)
    })

    ipcMain.handle('get-banned-users', () => {
      return this.#db.getBannedUsers()
    })

    ipcMain.on('add-banned-user', (_event, username: string) => {
      this.#db.addBannedUser(username)
    })

    ipcMain.on('delete-banned-user', (_event, username: string) => {
      this.#db.deleteBannedUser(username)
    })

    ipcMain.on('clear-stats', async () => {
      await this.#db.clear()
      await this.#backend?.sendMessage('All stats cleared 🗑️', { system: true })
    })
  }

  getTwitchConnectionState() {
    if (!this.#backend) {
      return { state: 'disconnected' }
    } else if (this.#backend.isConnected()) {
      return {
        state: 'connected',
        botUsername: this.#backend.botUsername,
        channelName: this.#backend.channelName
      }
    }
    return { state: 'connecting' }
  }

  getSocketConnectionState() {
    if (!this.#socket) {
      return { state: 'disconnected' }
    } else if (this.#socket.connected) {
      return { state: 'connected' }
    }
    return { state: 'connecting' }
  }

  async authenticate(session: import('@supabase/supabase-js').Session) {
    this.#session = session
    await this.#initBackend(session)
    await this.#initSocket(session)
  }

  async #initBackend(session: import('@supabase/supabase-js').Session) {
    this.#backend?.close()
    this.#backend = undefined
    if (!settings.channelName) {
      return
    }
    if (session.user.app_metadata.provider === 'twitch') {
      this.#backend = new TwitchBackend({
        botUsername: session.user.user_metadata.name,
        channelName: settings.channelName,
        whisperToken: session.provider_token
      })
    } else {
      throw new Error('unsupported provider')
    }

    const emitConnectionState = () => {
      const state = this.getTwitchConnectionState()
      this.#win.webContents.send('twitch-connection-state', state)
      // this.#settingsWindow?.webContents.send('connection-state', state)
    }

    this.#backend.on('connected', () => {
      emitConnectionState()
      this.#backend?.sendMessage('is now connected', { system: true })
    })
    this.#backend.on('disconnected', (requestedClose) => {
      emitConnectionState()
      if (!requestedClose) {
        // Try to reconnect.
        this.#requestAuthentication()
      }
    })

    this.#backend.on('guess', (userstate, message) => {
      this.#handleGuess(userstate, message).catch((error) => {
        console.error(error)
      })
    })

    this.#backend.on('message', (userstate, message) => {
      this.#handleMessage(userstate, message).catch((error) => {
        console.error(error)
      })
    })

    emitConnectionState()
    try {
      await this.#backend.connect()
    } catch (error) {
      // if (this.#settingsWindow) {
      this.#win.webContents.send('twitch-error', error)
      // }
      console.log('errrrrrror', error)
      console.error(error)
    }
  }

  async #handleGuess(userstate: import('tmi.js').ChatUserstate, message: string) {
    if (!message.startsWith('!g') || !this.#game.guessesOpen) return
    // Ignore guesses made by the broadcaster with the CG map: prevents seemingly duplicate guesses
    if (userstate.username?.toLowerCase() === settings.channelName.toLowerCase()) return

    // Check if user is banned
    const bannedUsers = this.#db.getBannedUsers()
    const isBanned = bannedUsers.some((user) => user.username === userstate.username)
    if (isBanned) return

    const location = parseCoordinates(message.replace(/^!g\s+/, ''))

    if (!location) return

    try {
      const guess = await this.#game.handleUserGuess(userstate, location)

      if (!this.#game.isMultiGuess) {
        this.#win.webContents.send('render-guess', guess)
        if (settings.showHasGuessed) {
          await this.#backend?.sendMessage(
            `${getEmoji(guess.flag)} ${userstate['display-name']} has guessed`
          )
        }
      } else {
        const guesses = this.#game.getMultiGuesses()
        this.#win.webContents.send('render-multiguess', guesses)
        if (!guess.modified) {
          if (settings.showHasGuessed) {
            await this.#backend?.sendMessage(
              `${getEmoji(guess.flag)} ${userstate['display-name']} has guessed`
            )
          }
        } else {
          if (settings.showGuessChanged) {
            await this.#backend?.sendMessage(
              `${getEmoji(guess.flag)} ${userstate['display-name']} guess changed`
            )
          }
        }
      }
    } catch (err: any) {
      if (err.code === 'alreadyGuessed') {
        if (settings.showHasAlreadyGuessed) {
          await this.#backend?.sendMessage(`${userstate['display-name']} you already guessed`)
        }
      } else if (err.code === 'submittedPreviousGuess') {
        if (settings.showSubmittedPreviousGuess) {
          await this.#backend?.sendMessage(
            `${userstate['display-name']} you submitted your previous guess`
          )
        }
      } else {
        console.error(err)
      }
    }
  }

  #cgCooldown: boolean = false

  async #handleMessage(userstate: import('tmi.js').ChatUserstate, message: string) {
    if (!message.startsWith('!')) return
    message = message.trim().toLowerCase()

    const userId = userstate.badges?.broadcaster === '1' ? 'BROADCASTER' : userstate['user-id']

    if (message === settings.cgCmd) {
      if (userId === 'BROADCASTER') {
        await this.#backend?.sendMessage(
          settings.cgMsg.replace(
            '<your cg link>',
            `chatguessr.com/map/${this.#backend?.botUsername}`
          )
        )
      } else if (!this.#cgCooldown) {
        await this.#backend?.sendMessage(
          settings.cgMsg.replace(
            '<your cg link>',
            `chatguessr.com/map/${this.#backend?.botUsername}`
          )
        )
        this.#cgCooldown = true
        setTimeout(() => {
          this.#cgCooldown = false
        }, settings.cgCmdCooldown * 1000)
      }
      return
    }

    if (message.startsWith('!flag ')) {
      const countryReq = message.slice(message.indexOf(' ') + 1).trim()
      const dbUser = this.#db.getOrCreateUser(userId, userstate['display-name'])

      let newFlag
      if (countryReq === 'none') {
        newFlag = null
      } else if (countryReq === 'random') {
        newFlag = randomCountryFlag()
      } else {
        newFlag = selectFlag(countryReq)
        if (!newFlag) {
          await this.#backend?.sendMessage(`${userstate['display-name']} no flag found`)
          return
        }
      }

      this.#db.setUserFlag(dbUser.id, newFlag)

      if (countryReq === 'none') {
        await this.#backend?.sendMessage(`${userstate['display-name']} flag removed`)
      } else if (countryReq === 'random') {
        await this.#backend?.sendMessage(`${userstate['display-name']} got ${getEmoji(newFlag)}`)
      }
      return
    }

    if (message === settings.flagsCmd) {
      await this.#backend?.sendMessage(settings.flagsCmdMsg)
    }

    if (message === settings.getUserStatsCmd) {
      const userInfo = this.#db.getUserStats(userId)
      if (!userInfo) {
        await this.#backend?.sendMessage(`${userstate['display-name']} you've never guessed yet.`)
      } else {
        await this.#backend?.sendMessage(`
					${getEmoji(userInfo.flag)} ${userInfo.username} : Current streak: ${userInfo.streak}.
					Best streak: ${userInfo.bestStreak}.
					Correct countries: ${userInfo.correctGuesses}/${userInfo.nbGuesses}${
            userInfo.nbGuesses > 0
              ? ` (${((userInfo.correctGuesses / userInfo.nbGuesses) * 100).toFixed(2)}%).`
              : '.'
          }
					Avg. score: ${Math.round(userInfo.meanScore)}.
					Victories: ${userInfo.victories}.
					Perfects: ${userInfo.perfects}.
				`)
      }
      return
    }

    if (message === settings.getBestStatsCmd) {
      const { streak, victories, perfects } = this.#db.getGlobalStats()
      if (!streak && !victories && !perfects) {
        await this.#backend?.sendMessage('No stats available.')
      } else {
        let msg = ''
        if (streak) {
          msg += `Streak: ${streak.streak} (${streak.username}). `
        }
        if (victories) {
          msg += `Victories: ${victories.victories} (${victories.username}). `
        }
        if (perfects) {
          msg += `Perfects: ${perfects.perfects} (${perfects.username}). `
        }
        await this.#backend?.sendMessage(`Channels best: ${msg}`)
      }
      return
    }

    if (message === settings.clearUserStatsCmd) {
      // @ts-ignore
      store.delete(`users.${userstate.username}`)

      const dbUser = this.#db.getUser(userId)
      if (dbUser) {
        this.#db.resetUserStats(dbUser.id)
        await this.#backend?.sendMessage(
          `${getEmoji(dbUser.flag)} ${userstate['display-name']} 🗑️ stats cleared !`
        )
      } else {
        await this.#backend?.sendMessage(`${userstate['display-name']} you've never guessed yet.`)
      }

      return
    }

    if (message === settings.randomPlonkCmd) {
      const { lat, lng } = await getRandomCoordsInLand(this.#game.seed.bounds)
      const randomGuess = `!g ${lat}, ${lng}`
      this.#handleGuess(userstate, randomGuess).catch((error) => {
        console.error(error)
      })
    }

    // streamer commands
    if (userstate.badges?.broadcaster !== '1') {
      return
    }
    if (process.env.NODE_ENV !== 'development') {
      return
    }

    if (message.startsWith('!spamguess')) {
      const max = parseInt(message.split(' ')[1] ?? '50', 10)
      for (let i = 0; i < max; i += 1) {
        const { lat, lng } = await getRandomCoordsInLand()
        await this.#handleGuess(
          {
            'user-id': `123450${i}`,
            username: `fake_${i}`,
            'display-name': `fake_${i}`,
            flag: randomCountryFlag(),
            color: `#${Math.random().toString(16).slice(2, 8).padStart(6, '0')}`
          },
          `!g ${lat},${lng}`
        )
      }
    }
  }

  async #initSocket(session: import('@supabase/supabase-js').Session) {
    if (this.#socket?.connected) {
      this.#socket.disconnect()
    }

    const botUsername: string = session.user.user_metadata.name

    this.#socket = io(SOCKET_SERVER_URL, {
      transportOptions: {
        polling: {
          extraHeaders: {
            access_token: session.access_token,
            channelname: settings.channelName,
            bot: botUsername
          }
        }
      }
    })

    this.#socket.on('connect', () => {
      this.#socket?.emit('join', botUsername)
      // if (this.#settingsWindow) {
      this.#win.webContents.send('socket-connected')
      // }
    })

    this.#socket.on('disconnect', () => {
      // if (this.#settingsWindow) {
      this.#win.webContents.send('socket-disconnected')
      // }
    })

    this.#socket.on('guess', (userData, guess) => {
      this.#handleGuess(userData, guess).catch((error) => {
        console.error(error)
      })
    })

    await once(this.#socket, 'connect')
  }

  // openSettingsWindow() {
  //   // Initialise the window if it doesn't exist,
  //   // especially important in non-windows systems where Chatguessr may not be able
  //   // to prevent the window from being completely closed.
  //   if (!this.#settingsWindow) {
  //     this.#settingsWindow = createSettingsWindow(this.#win).on('closed', () => {
  //       this.#settingsWindow = undefined
  //     })

  //     this.#settingsWindow.webContents.on('did-finish-load', () => {
  //       this.#settingsWindow?.webContents.send(
  //         'render-settings',
  //         settings,
  //         this.#db.getBannedUsers(),
  //         this.getTwitchConnectionState(),
  //         this.#socket?.connected
  //       )

  //       this.#settingsWindow?.show()
  //     })
  //   }
  // }

  // closeSettingsWindow() {
  //   this.#settingsWindow?.close()
  // }
}
