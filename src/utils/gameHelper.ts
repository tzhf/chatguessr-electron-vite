import axios from 'axios'
import countryIso from 'coordinate_to_country'
/**
 * Country code mapping for 2-character ISO codes that should be considered
 * part of another country for GeoGuessr streak purposes.
 */
import countryCodes from './countryCodes.json'

const GEOGUESSR_URL = 'https://geoguessr.com'
const CG_API_URL = process.env.CG_API_URL ?? 'https://chatguessr.com/api'
const CG_PUBLIC_URL = process.env.CG_PUBLIC_URL ?? 'chatguessr.com'

/**
 * Checks if the URL is an in-game page.
 */
export function isGameURL(url: string): boolean {
  return url.includes('/game/')
}

/**
 * Gets the Game ID from a game URL
 * Checks if ID is 16 characters in length
 */
export function getGameId(url: string): string | void {
  const id = url.slice(url.lastIndexOf('/') + 1)
  if (id.length == 16) return id
}

/**
 * Fetch a game seed from the GeoGuessr API.
 */
export async function fetchSeed(url: string): Promise<Seed | undefined> {
  const gameId = getGameId(url)
  if (!gameId) return

  const { data } = await axios.get(`${GEOGUESSR_URL}/api/v3/games/${gameId}`)
  return data
}

/**
 * Compare two coordinates
 */
export function latLngEqual(a: LatLng, b: LatLng) {
  return a.lat === b.lat && a.lng === b.lng
}

/**
 * Get the country code for a coordinate.
 */
export async function getCountryCode(location: LatLng): Promise<string | undefined> {
  const localResults = countryIso(location.lat, location.lng, true)
  const localIso = localResults.length > 0 ? localResults[0] : undefined
  if (!localIso) return

  return countryCodes[localIso]
}

/**
 * Parse lat/lng coordinates from a string.
 */
export function parseCoordinates(coordinates: string): LatLng | void {
  const regex =
    /^(?<lat>[-+]?(?:[1-8]?\d(?:\.\d+)?|90(?:\.0+)?)),\s*(?<lng>[-+]?(?:180(?:\.0+)?|(?:(?:1[0-7]\d)|(?:[1-9]?\d))(?:\.\d+)?))$/
  const m = regex.exec(coordinates)
  if (m?.groups) {
    return { lat: parseFloat(m.groups.lat), lng: parseFloat(m.groups.lng) }
  }
}

/**
 * Returns map scale
 */
export function calculateScale(bounds: Bounds): number {
  return haversineDistance(bounds.min, bounds.max) / 7.458421
}

/**
 * Returns distance in km between two coordinates
 */
export function haversineDistance(mk1: LatLng, mk2: LatLng): number {
  const R = 6371.071
  const rlat1 = mk1.lat * (Math.PI / 180)
  const rlat2 = mk2.lat * (Math.PI / 180)
  const difflat = rlat2 - rlat1
  const difflon = (mk2.lng - mk1.lng) * (Math.PI / 180)
  const km =
    2 *
    R *
    Math.asin(
      Math.sqrt(
        Math.sin(difflat / 2) * Math.sin(difflat / 2) +
          Math.cos(rlat1) * Math.cos(rlat2) * Math.sin(difflon / 2) * Math.sin(difflon / 2)
      )
    )
  return km
}

/**
 * Returns score based on distance and scale
 */
export function calculateScore(distance: number, scale: number): number {
  if (distance * 1000 < 25) return 5000

  return Math.round(5000 * Math.pow(0.99866017, (distance * 1000) / scale))
}

/**
 * Upload scores to the Chatguessr API and return the game summary link
 */
export async function makeLink(
  accessToken: string,
  bot: string,
  streamer: string,
  map: string,
  mode: object,
  locations: Location[],
  gameResults: GameResult[]
): Promise<string> {
  const res = await axios.post<{ code: string }>(
    `${CG_API_URL}/game`,
    {
      bot: bot,
      streamer: streamer,
      map: map,
      mode: mode,
      locations: locations,
      players: gameResults
    },
    { headers: { access_token: accessToken } }
  )

  return `${CG_PUBLIC_URL}/game/${res.data.code}`
}

/**
 * Returns random coordinates within land, no Antarctica
 */
export async function getRandomCoordsInLand(): Promise<LatLng> {
  const lat = Math.random() * (85 + 60) - 60
  const lng = Math.random() * 360 - 180
  const localResults = countryIso(lat, lng, true)
  if (!localResults.length) return await getRandomCoordsInLand()
  return { lat, lng }
}
