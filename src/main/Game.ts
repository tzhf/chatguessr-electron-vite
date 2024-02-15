// @ts-nocheck
import pMap from 'p-map'
import { store } from './utils/useStore'

import {
  latLngEqual,
  calculateScale,
  fetchSeed,
  getCountryCode,
  haversineDistance,
  calculateScore
} from './utils/useGameHelper'

export default class Game {
  #db: IDatabase

  /**
   * Play link for the current game.
   */
  #url: string | undefined

  #settings: Settings

  /**
   * The database UUID of the current round.
   */
  #roundId: string | undefined

  /**
   * Country code for the current round's location.
   */
  #country: string | undefined

  seed: Seed | undefined

  mapScale: number | undefined

  location: Location_ | undefined

  lastLocation: LatLng | undefined

  isInGame = false

  guessesOpen = false

  isMultiGuess = false

  constructor(db: IDatabase, settings: Settings) {
    this.#db = db
    this.#settings = settings
    this.lastLocation = store.get('lastLocation', undefined)
  }

  async start(url: string, isMultiGuess: boolean) {
    this.isInGame = true
    this.isMultiGuess = isMultiGuess
    if (this.#url === url) {
      await this.refreshSeed()
    } else {
      this.#url = url
      this.seed = await this.#getSeed()
      if (!this.seed) {
        throw new Error('Could not load seed for this game')
      }

      try {
        this.#db.createGame(this.seed)
        this.#roundId = this.#db.createRound(this.seed.token, this.seed.rounds[0])
      } catch (err) {
        // In this case we are restoring an existing game.
        if (err instanceof Error && err.message.includes('UNIQUE constraint failed: games.id')) {
          this.#roundId = this.#db.getCurrentRound(this.seed.token)
        } else {
          throw err
        }
      }

      this.mapScale = calculateScale(this.seed.bounds)
      this.#getCountry()
    }
  }

  outGame() {
    this.isInGame = false
    this.closeGuesses()
  }

  #streamerHasGuessed(newSeed: Seed) {
    return newSeed.player.guesses.length != this.seed.player.guesses.length
  }

  #locHasChanged(newSeed: Seed) {
    return !latLngEqual(newSeed.rounds.at(-1), this.getLocation())
  }

  async refreshSeed() {
    const newSeed = await this.#getSeed()
    // If a guess has been comitted, process streamer guess then return scores
    if (this.#streamerHasGuessed(newSeed)) {
      this.closeGuesses()

      this.seed = newSeed
      const location = this.location
      await this.#makeGuess()

      const roundResults = this.getRoundResults()

      if (this.seed.state !== 'finished') {
        this.#roundId = this.#db.createRound(this.seed.token, this.seed.rounds.at(-1))
        this.#getCountry()
      } else {
        this.#roundId = undefined
      }

      return { location, roundResults }
      // Else, if only the loc has changed, the location was skipped, replace current loc
    } else if (this.#locHasChanged(newSeed)) {
      this.seed = newSeed
      this.#roundId = this.#db.createRound(this.seed.token, this.seed.rounds.at(-1))

      this.#getCountry()

      return false
    }
  }

  async #getSeed() {
    return this.#url ? await fetchSeed(this.#url) : undefined
  }

  async #getCountry() {
    this.location = this.getLocation()
    this.#country = await getCountryCode(this.location)

    this.#db.setRoundCountry(this.#roundId, this.#country)
  }

  async #makeGuess() {
    this.seed = await this.#getSeed()

    if (this.isMultiGuess) {
      await this.#processMultiGuesses()
    }
    await this.#processStreamerGuess()

    this.lastLocation = { ...this.location }
    store.set('lastLocation', this.lastLocation)
  }

  /**
   * Update streaks for multi-guesses.
   */
  async #processMultiGuesses() {
    // TODO only retrieve location and streak values
    // Very slow
    const guesses = this.#db.getRoundResults(this.#roundId)
    await pMap(
      guesses,
      async (guess) => {
        const guessedCountry = await getCountryCode(guess.position)

        this.#db.setUserLastLocation(guess.userId, this.location)

        const correct = guessedCountry === this.#country
        this.#db.setGuessCountry(
          guess.id,
          guessedCountry,
          correct ? guess.streak + 1 : 0,
          correct ? null : guess.streak
        )
        if (correct) {
          this.#db.addUserStreak(guess.userId, this.#roundId)
        } else {
          this.#db.resetUserStreak(guess.userId)
        }
      },
      { concurrency: 10 }
    )
  }

  async #processStreamerGuess() {
    const index = this.seed.state === 'finished' ? 1 : 2
    const streamerGuess = this.seed.player.guesses[this.seed.round - index]
    const location = { lat: streamerGuess.lat, lng: streamerGuess.lng }

    // TODO GET AVATAR FROM ENDPOINT
    const avatar =
      'https://static-cdn.jtvnw.net/jtv_user_pictures/90fe5728-5e40-4855-9849-0f11e92fb9c9-profile_image-300x300.png'
    const dbUser = this.#db.getOrCreateUser(
      'BROADCASTER',
      this.#settings.channelName,
      '#FFF',
      avatar
    )

    const guessedCountry = await getCountryCode(location)
    let lastStreak: number | null = null
    if (guessedCountry === this.#country) {
      this.#db.addUserStreak(dbUser.id, this.#roundId)
    } else {
      lastStreak = this.#db.resetUserStreak(dbUser.id)
    }

    const distance = haversineDistance(location, this.location)
    const score = streamerGuess.timedOut ? 0 : calculateScore(distance, this.mapScale)

    const streak = this.#db.getUserStreak(dbUser.id)

    this.#db.createGuess(this.#roundId, dbUser.id, {
      location,
      country: guessedCountry,
      streak: streak?.count ?? 0,
      lastStreak,
      distance,
      score
    })
  }

  async handleUserGuess(userstate: UserData, location: LatLng): Promise<Guess> {
    const dbUser = this.#db.getOrCreateUser(
      userstate['user-id'],
      userstate['display-name'],
      userstate.color,
      userstate.avatar
    )

    const existingGuess = this.#db.getUserGuess(this.#roundId, dbUser.id)
    if (!this.isMultiGuess && existingGuess) {
      throw Object.assign(new Error('User already guessed'), { code: 'alreadyGuessed' })
    }

    if (dbUser.previousGuess && latLngEqual(dbUser.previousGuess, location)) {
      throw Object.assign(new Error('Same guess'), { code: 'submittedPreviousGuess' })
    }

    // Reset streak if the player skipped a round
    if (!dbUser.lastLocation || !latLngEqual(dbUser.lastLocation, this.lastLocation)) {
      this.#db.resetUserStreak(dbUser.id)
    }

    let guessedCountry: string | null = null
    let lastStreak: number | null = null

    if (!this.isMultiGuess) {
      // TODO I think this is only used for streaks,
      // DB streaks track their own last round id so then this would be unnecessary
      this.#db.setUserLastLocation(dbUser.id, this.location)

      guessedCountry = await getCountryCode(location)
      if (guessedCountry === this.#country) {
        this.#db.addUserStreak(dbUser.id, this.#roundId)
      } else {
        lastStreak = this.#db.resetUserStreak(dbUser.id)
      }
    }

    const streak = this.#db.getUserStreak(dbUser.id)
    const distance = haversineDistance(location, this.location)
    const score = calculateScore(distance, this.mapScale)

    // Modify guess or push it
    let modified = false
    if (this.isMultiGuess && existingGuess) {
      this.#db.updateGuess(existingGuess.id, {
        location,
        country: guessedCountry,
        streak: streak?.count ?? 0,
        lastStreak,
        distance,
        score
      })
      modified = true
    } else {
      this.#db.createGuess(this.#roundId, dbUser.id, {
        location,
        country: guessedCountry,
        streak: streak?.count ?? 0,
        lastStreak,
        distance,
        score
      })
    }

    // TODO save previous guess? No, fetch previous guess from the DB
    this.#db.setUserPreviousGuess(dbUser.id, location)

    // Old shape, for the scoreboard UI
    return {
      user: userstate.username,
      username: userstate['display-name'],
      color: dbUser.color,
      avatar: dbUser.avatar,
      flag: dbUser.flag,
      position: location,
      streak: streak?.count ?? 0,
      lastStreak,
      distance,
      score,
      modified
    }
  }

  getLocation(): Location_ {
    return this.seed.rounds.at(-1)
  }

  getLocations(): Location_[] {
    return this.seed.rounds.map((round) => ({
      lat: round.lat,
      lng: round.lng,
      panoId: round.panoId,
      heading: Math.round(round.heading),
      pitch: Math.round(round.pitch),
      zoom: round.zoom
    }))
  }

  openGuesses() {
    this.guessesOpen = true
  }

  closeGuesses() {
    this.guessesOpen = false
  }

  /**
   * Get the participants for the current round, sorted by who guessed first.
   */
  getRoundParticipants() {
    return this.#db.getRoundParticipants(this.#roundId)
  }

  /**
   * Get the scores for the current round, sorted by distance from closest to farthest away.
   */
  getRoundResults() {
    return this.#db.getRoundResults(this.#roundId)
  }

  finishGame() {
    return this.#db.finishGame(this.seed.token)
  }

  /**
   * Get the combined scores for the current game, sorted from highest to lowest score.
   */
  getGameResults() {
    return this.#db.getGameResults(this.seed.token)
  }

  get isFinished() {
    return this.seed.state === 'finished'
  }

  get mapName() {
    return this.seed.mapName
  }

  get mode() {
    return {
      noMove: this.seed.forbidMoving,
      noPan: this.seed.forbidRotating,
      noZoom: this.seed.forbidZooming
    }
  }

  get round() {
    return this.seed.round
  }
}
