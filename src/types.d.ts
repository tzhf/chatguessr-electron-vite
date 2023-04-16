type LatLng = { lat: number; lng: number }

type Location = {
  lat: number
  lng: number
  panoId: string | null
  heading: number
  pitch: number
  zoom: number
}

type Guess = {
  user: string
  username: string
  color: string
  flag: string | null
  position: LatLng
  streak: number
  lastStreak: number | null
  distance: number
  score: number
  time?: number
}

type MultiGuess = {
  user: string
  username: string
  color: string
  flag: string | null
}

type RoundScore = {
  id: string
  userId: string
  username: string
  user: string
  color: string
  flag: string | null
  streak: number
  lastStreak: number | null
  distance: number
  score: number
  time: number
  position: LatLng
}

type GameResult = {
  username: string
  color: string
  flag: string
  streak: number
  guesses: (LatLng | null)[]
  scores: (number | null)[]
  distances: (number | null)[]
  totalScore: number
  totalDistance: number
}

type Bounds = {
  min: LatLng
  max: LatLng
}

type GameMode = 'standard' | 'streak'

type GameType = 'standard' | 'streak'

type GameState = 'started' | 'finished'

type GameRound = {
  lat: number
  lng: number
  panoId: string | null
  heading: number
  pitch: number
  zoom: number
  streakLocationCode: string | null
  // TODO: Add missing fields
}

type GeoGuessrRoundScore = {
  amount: string
  unit: string
  percentage: number
}

type Distance = {
  meters: { amount: string; unit: string }
  miles: { amount: string; unit: string }
}

type GameGuess = {
  lat: number
  lng: number
  timedOut: boolean
  timedOutWithGuess: boolean
  roundScore: GeoGuessrRoundScore
  roundScoreInPercentage: number
  roundScoreInPoints: number
  distance: Distance
  distanceInMeters: number
  time: number
}

type GamePlayer = {
  guesses: GameGuess[]
  // TODO: Add rest
}

type GameSettings = {
  forbidMoving: boolean
  forbidRotating: boolean
  forbidZooming: boolean
  timeLimit: number
}

type Seed = GameSettings & {
  token: string
  bounds: Bounds
  map: string
  mapName: string
  mode: GameMode
  round: number
  roundCount: number
  rounds: GameRound[]
  player: GamePlayer
  state: GameState
  type: GameType
}

interface RendererApi {
  drawRoundResults(location: Location, roundResults: Guess[], limit?: number)
  drawGameLocations(locations: Location[])
  drawPlayerResults(locations: Location[], result: GameResult)
  focusOnGuess(location: LatLng)
  clearMarkers(keepLocationMarkers?: boolean)
  showSatelliteMap(location: LatLng)
  hideSatelliteMap()
  centerSatelliteView(location: LatLng)
  getBounds(location: LatLng, limit: number)
}

declare global {
  interface Window {
    jQuery: typeof import('jquery')
    $: typeof import('jquery')
  }

  namespace DataTables {
    interface Settings {
      // From datatables.net-plugins
      scrollResize?: boolean
    }
  }
}
