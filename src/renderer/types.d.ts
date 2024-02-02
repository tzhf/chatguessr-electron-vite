type GameResultDisplay = {
  username: string
  color: string
  flag: string | null
  guesses: (LatLng | null)[]
  distances: (number | null)[]
  scores: (number | null)[]
}

type ScoreboardColumn = {
  name: string
  value: string
  width: string
  sortable: boolean
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
