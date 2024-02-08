type Socket = import('socket.io-client').Socket

type ChatUserstate = import('tmi.js').ChatUserstate

type Settings = {
  channelName: string
  token: string
  cgCmd: string
  cgCmdCooldown: number
  cgMsg: string
  flagsCmd: string
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

type LatLng = { lat: number; lng: number }

type Location_ = {
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
  modified?: boolean
}

type RoundResult = {
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

type RoundParticipant = {
  id: string
  username: string
  color: string
  flag: string | null
}

type GameResult = {
  username: string
  color: string
  flag: string | null
  streak: number
  guesses: (LatLng | null)[]
  scores: (number | null)[]
  distances: (number | null)[]
  totalScore: number
  totalDistance: number
}

type GameResultDisplay = {
  username: string
  color: string
  flag: string | null
  guesses: (LatLng | null)[]
  distances: (number | null)[]
  scores: (number | null)[]
}

type ScoreboardRow = {
  index?: { value: number; display: string | number }
  username: string
  flag: string | null
  color: string
  streak?: {
    value: number
    display: number | string
  }
  distance?: {
    value: number
    display: number | string
  }
  score?: {
    value: number
    display: number | string
  }
  modified?: boolean
  position?: LatLng
  guesses?: (LatLng | null)[]
  distances?: (number | null)[]
  scores?: (number | null)[]
  totalScore?: number
  totalDistance?: number
}

type Bounds = {
  min: LatLng
  max: LatLng
}

type GameMode = 'standard' | 'streak'

type GameType = 'standard' | 'streak'

type GameStatus = 'started' | 'finished'

type GameState = 'in-round' | 'round-results' | 'game-results' | 'none'

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
  state: GameStatus
  type: GameType
}

type Flag = {
  code: string
  names: string
  emoji?: string
}

type TwitchConnectionState =
  | { state: 'disconnected' }
  | { state: 'connecting' }
  | { state: 'connected'; botUsername: string; channelName: string }
  | { state: 'error'; error: unknown }

type SocketConnectionState =
  | { state: 'disconnected' }
  | { state: 'connecting' }
  | { state: 'connected' }
