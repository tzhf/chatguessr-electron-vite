import { ipcMain } from 'electron'
import { once } from 'events'
import { io } from 'socket.io-client'
import Game from './Game'
import TwitchBackend from './utils/useTwitchJS'
import { settings, saveSettings } from './utils/useSettings'
import { isGameURL, makeLink, parseCoordinates, getRandomCoordsInLand } from './utils/useGameHelper'
import { getEmoji, randomCountryFlag, selectFlag } from './utils/flags/flags'

const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_SERVER_URL ?? 'https://chatguessr-server.herokuapp.com'

export default class GameHandler {
  #db: Database

  #win: BrowserWindow

  #session: Session | undefined

  #backend: TwitchBackend | undefined

  #socket: Socket | undefined

  #game: Game

  #requestAuthentication: () => Promise<void>

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
    } catch (err) {
      console.error('could not upload summary', err)
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
            const restoredGuesses = this.#game.isMultiGuess
              ? this.#game.getRoundParticipants()
              : this.#game.getRoundResults()
            this.#win.webContents.send(
              'game-started',
              this.#game.isMultiGuess,
              restoredGuesses,
              this.#game.getLocation()
            )

            if (restoredGuesses.length > 0) {
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
          .catch((err) => {
            console.error(err)
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
        if (roundResults && roundResults.location) {
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

    ipcMain.handle('get-settings', () => {
      return settings
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

  async authenticate(session: Session) {
    this.#session = session
    await this.#initBackend(session)
    await this.#initSocket(session)
  }

  async #initBackend(session: Session) {
    this.#backend?.close()
    this.#backend = undefined
    if (!settings.channelName) {
      return
    }
    if (session.user.app_metadata.provider === 'twitch' && session.provider_token) {
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

    this.#backend.on('guess', (userstate: ChatUserstate, message: string) => {
      this.#handleGuess(userstate, message).catch((err) => {
        console.error(err)
      })
    })

    this.#backend.on('message', (userstate: ChatUserstate, message: string) => {
      this.#handleMessage(userstate, message).catch((err) => {
        console.error(err)
      })
    })

    emitConnectionState()
    try {
      await this.#backend.connect()
    } catch (err) {
      this.#win.webContents.send('twitch-error', err)
      console.error('Backend connection error:', err)
    }
  }

  async #handleGuess(userstate: ChatUserstate, message: string) {
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
        this.#win.webContents.send('render-multiguess', guess)

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

  async #handleMessage(userstate: ChatUserstate, message: string) {
    if (!message.startsWith('!')) return
    if (!userstate['user-id'] || !userstate['display-name']) return
    const userId = userstate.badges?.broadcaster === '1' ? 'BROADCASTER' : userstate['user-id']

    message = message.trim().toLowerCase()

    if (message === settings.cgCmd) {
      if (this.#cgCooldown && userId !== 'BROADCASTER') return

      await this.#backend?.sendMessage(
        settings.cgMsg.replace('<your cg link>', `chatguessr.com/map/${this.#backend?.botUsername}`)
      )

      this.#cgCooldown = true
      setTimeout(() => {
        this.#cgCooldown = false
      }, settings.cgCmdCooldown * 1000)

      return
    }

    if (message.startsWith('!flag ')) {
      const countryReq = message.slice(message.indexOf(' ') + 1).trim()
      const dbUser = this.#db.getOrCreateUser(userId, userstate['display-name'])
      if (!dbUser) return

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
      await this.#backend?.sendMessage('Available flags: chatguessr.com/flags')

      return
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
      if (!this.#game.isInGame) return

      const { lat, lng } = await getRandomCoordsInLand(this.#game.seed!.bounds)
      const randomGuess = `!g ${lat}, ${lng}`
      this.#handleGuess(userstate, randomGuess).catch((err) => {
        console.error(err)
      })

      return
    }

    // streamer commands
    if (userstate.badges?.broadcaster !== '1' || import.meta.env.VITE_NODE_ENV !== 'development') {
      return
    }

    if (message.startsWith('!spamguess')) {
      const max = parseInt(message.split(' ')[1] ?? '50', 10)
      for (let i = 0; i < max; i += 1) {
        const userId = `123450${i}`
        // const flag = randomCountryFlag()
        // this.#db.setUserFlag(userId, flag)
        const { lat, lng } = await getRandomCoordsInLand(this.#game.seed!.bounds)
        await this.#handleGuess(
          {
            'user-id': userId,
            username: `fake_${i}`,
            'display-name': `fake_${i}`,
            color: `#${Math.random().toString(16).slice(2, 8).padStart(6, '0')}`
          },
          `!g ${lat},${lng}`
        )
      }
    }
  }

  async #initSocket(session: Session) {
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
      this.#win.webContents.send('socket-connected')
    })

    this.#socket.on('disconnect', () => {
      this.#win.webContents.send('socket-disconnected')
    })

    this.#socket.on('guess', (userData: ChatUserstate, guess: string) => {
      this.#handleGuess(userData, guess).catch((err) => {
        console.error(err)
      })
    })

    await once(this.#socket, 'connect')
  }
}
