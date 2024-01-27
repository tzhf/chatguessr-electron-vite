type BrowserWindow = import('electron').BrowserWindow

type IpcMainEvent = import('electron').IpcMainEvent

type Socket = import('socket.io-client').Socket

type Session = import('@supabase/supabase-js').Session

type ChatUserstate = import('tmi.js').ChatUserstate

type Database = import('./utils/useDatabase').Database

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
  // index?: number | string
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
  // animationActive?: boolean
}

type MultiGuess = {
  user: string
  username: string
  color: string
  flag: string | null
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

type ScoreboardRow = {
  index: { value: number; display: string }
  username: string
  flag: string | null
  color: string
  streak: {
    value: number
    display: number | string
  }
  distance: {
    value: number
    display: number | string
  }
  score: {
    value: number
    display: number | string
  }
  position?: LatLng
  guesses?: (LatLng | null)[]
  totalScore?: number
  totalDistance?: number
  scores?: (number | null)[]
  distances?: (number | null)[]
  animationActive?: boolean
}

type GameResultDisplay = {
  username: string
  flag: string | null
  color: string
  guesses: (LatLng | null)[]
  distances: (number | null)[]
  scores: (number | null)[]
  // totalDistance: number
  // totalScore: number
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

type SocketConnectionState =
  | { state: 'disconnected' }
  | { state: 'connecting' }
  | { state: 'connected' }
