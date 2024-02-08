import { createApp } from 'vue'
import Vue3DraggableResizable from 'vue3-draggable-resizable'
import { getLocalStorage, setLocalStorage } from './useLocalStorage'
import Frame from './components/Frame.vue'
import './assets/styles.css'

import './mods/extenssrMenuItemsPlugin'
import './mods/noCarNoCompass'
import './mods/blinkMode'
import './mods/satelliteMode'

const wrapper = document.createElement('div')
document.body.append(wrapper)

createApp(Frame, {
  rendererApi: {
    drawRoundResults,
    drawPlayerResults,
    drawGameLocations,
    focusOnGuess,
    clearMarkers,
    showSatelliteMap,
    hideSatelliteMap,
    centerSatelliteView
  }
})
  .use(Vue3DraggableResizable)
  .mount(wrapper)
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })

let globalMap: google.maps.Map | undefined = undefined
let satelliteLayer: google.maps.Map | undefined = undefined
let satelliteMarker: google.maps.Marker | undefined = undefined
const satelliteCanvas = document.createElement('div')
satelliteCanvas.id = 'satelliteCanvas'

const mapReady = hijackMap()

let guessMarkers: google.maps.Marker[] = []
let locationMarkers: google.maps.Marker[] = []
let polylines: google.maps.Polyline[] = []

function drawRoundResults(location: Location_, roundResults: RoundResult[], limit: number = 100) {
  const map = globalMap
  const infowindow = new google.maps.InfoWindow()

  const icon = makeIcon()
  const locationMarker = makeLocationMarker(location, icon, map)
  locationMarkers.push(locationMarker)

  icon.scale = 1
  roundResults.forEach((result, index) => {
    if (index >= limit) return

    icon.fillColor = result.color

    const guessMarker = new google.maps.Marker({
      position: result.position,
      icon,
      map,
      label: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: '16px',
        text: `${index + 1}`
      },
      optimized: true
    })
    guessMarker.addListener('mouseover', () => {
      infowindow.setContent(`
        ${result.flag ? `<span class="flag-icon" style="background-image: url(flag:${result.flag})"></span>` : ''}
        <span class="username" style="color:${result.color}">${result.username}</span><br>
        ${result.score}<br>
        ${toMeter(result.distance)}
      `)
      infowindow.open(map, guessMarker)
    })
    guessMarker.addListener('mouseout', () => {
      infowindow.close()
    })
    guessMarkers.push(guessMarker)

    polylines.push(
      new google.maps.Polyline({
        strokeColor: result.color,
        strokeWeight: 4,
        strokeOpacity: 0.6,
        geodesic: true,
        map,
        path: [result.position, location]
      })
    )
  })
}

function drawGameLocations(locations: Location_[]) {
  const map = globalMap
  const icon = makeIcon()

  locations.forEach((location, index) => {
    const locationMarker = makeLocationMarker(location, icon, map, index + 1)
    locationMarkers.push(locationMarker)
  })
}

function drawPlayerResults(locations: Location_[], result: GameResultDisplay) {
  const map = globalMap
  const infowindow = new google.maps.InfoWindow()
  const color = result.color || '#fff'

  clearMarkers(true)

  const icon = makeIcon()
  icon.scale = 1
  icon.fillColor = color

  result.guesses.forEach((guess, index) => {
    if (!guess) return

    const guessMarker = new google.maps.Marker({ position: guess, icon, map, optimized: true })

    guessMarker.addListener('mouseover', () => {
      infowindow.setContent(`
				${result.flag ? `<span class="flag-icon" style="background-image: url(flag:${result.flag})"></span>` : ''}
        <span class="username" style="color:${color}">${result.username}</span><br>
        ${result.scores[index]}<br>
				${toMeter(result.distances[index]!)}
			`)
      infowindow.open(map, guessMarker)
    })
    guessMarker.addListener('mouseout', () => {
      infowindow.close()
    })

    guessMarkers.push(guessMarker)

    polylines.push(
      new google.maps.Polyline({
        strokeColor: color,
        strokeWeight: 4,
        strokeOpacity: 0.6,
        geodesic: true,
        map,
        path: [guess, locations[index]]
      })
    )
  })
}

function focusOnGuess(location: LatLng) {
  if (!globalMap) return
  globalMap.setCenter(location)
  globalMap.setZoom(8)
}

function makeIcon(): google.maps.Symbol {
  return {
    path: `M13.04,41.77c-0.11-1.29-0.35-3.2-0.99-5.42c-0.91-3.17-4.74-9.54-5.49-10.79c-3.64-6.1-5.46-9.21-5.45-12.07
            c0.03-4.57,2.77-7.72,3.21-8.22c0.52-0.58,4.12-4.47,9.8-4.17c4.73,0.24,7.67,3.23,8.45,4.07c0.47,0.51,3.22,3.61,3.31,8.11
            c0.06,3.01-1.89,6.26-5.78,12.77c-0.18,0.3-4.15,6.95-5.1,10.26c-0.64,2.24-0.89,4.17-1,5.48C13.68,41.78,13.36,41.78,13.04,41.77z`,
    fillColor: '#de3e3e',
    fillOpacity: 0.7,
    scale: 1.2,
    strokeColor: '#000',
    strokeWeight: 1,
    anchor: new google.maps.Point(14, 43),
    labelOrigin: new google.maps.Point(13.5, 15)
  }
}

function makeLocationMarker(
  location: Location_,
  icon: google.maps.Symbol,
  map?: google.maps.Map,
  index: number | null = null
): google.maps.Marker {
  const locationMarker = new google.maps.Marker({ position: location, icon, map, optimized: true })

  if (index) {
    locationMarker.setLabel({
      color: '#000',
      fontWeight: 'bold',
      fontSize: '16px',
      text: `${index}`
    })
  }

  locationMarker.addListener('click', () => {
    const url = new URL('https://www.google.com/maps/@?api=1&map_action=pano')
    if (location.panoId) {
      url.searchParams.set('pano', location.panoId)
    }
    url.searchParams.set('viewpoint', `${location.lat},${location.lng}`)
    url.searchParams.set('heading', String(location.heading))
    url.searchParams.set('pitch', String(location.pitch))
    const fov = 180 / 2 ** location.zoom
    url.searchParams.set('fov', String(fov))
    window.open(url.href, '_blank')
  })

  return locationMarker
}

function clearMarkers(keepLocationMarkers = false) {
  for (const marker of guessMarkers) {
    marker.setMap(null)
  }
  for (const line of polylines) {
    line.setMap(null)
  }
  guessMarkers = []
  polylines = []

  if (!keepLocationMarkers) {
    for (const marker of locationMarkers) {
      marker.setMap(null)
    }
    locationMarkers = []
  }
}

async function hijackMap() {
  const MAPS_API_URL = 'https://maps.googleapis.com/maps/api/js?'
  const MAPS_SCRIPT_SELECTOR = `script[src^="${MAPS_API_URL}"]`
  await new Promise((resolve) => {
    let bodyDone = false
    let headDone = false

    function checkBodyDone() {
      if (!bodyDone && document.body) {
        scriptObserver.observe(document.body, { childList: true })
        bodyDone = true
      }
    }
    function checkHeadDone() {
      if (!headDone && document.head) {
        scriptObserver.observe(document.head, { childList: true })
        headDone = true
      }
    }

    /**
     * Check if `element` is a Google Maps script tag and resolve the outer Promise if so.
     */
    function checkMapsScript(element: Element) {
      if (element.matches(MAPS_SCRIPT_SELECTOR)) {
        const onload = () => {
          pageObserver.disconnect()
          scriptObserver.disconnect()
          resolve(undefined)
        }
        // It may already be loaded :O
        if (typeof google !== 'undefined' && google?.maps?.Map) {
          onload()
        } else {
          element.addEventListener('load', onload)
        }
      }
    }

    const scriptObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const tmp of mutation.addedNodes) {
          if (tmp.nodeType === Node.ELEMENT_NODE) {
            checkMapsScript(tmp as Element)
          }
        }
      }
    })
    const pageObserver = new MutationObserver((_, observer) => {
      checkBodyDone()
      checkHeadDone()
      if (headDone && bodyDone) {
        observer.disconnect()
      }
    })

    pageObserver.observe(document.documentElement, {
      childList: true,
      subtree: true
    })

    // Do an initial check, we may be running in a fully loaded game already.
    checkBodyDone()
    checkHeadDone()
    const existingTag: HTMLElement | null = document.querySelector(MAPS_SCRIPT_SELECTOR)
    if (existingTag) checkMapsScript(existingTag)
  })

  await new Promise<void>((resolve, reject) => {
    const google = window.google
    const isGamePage = () =>
      location.pathname.startsWith('/results/') || location.pathname.startsWith('/game/')

    function onMapUpdate(map: google.maps.Map) {
      try {
        if (!isGamePage()) return
        globalMap = map
        resolve()
      } catch (err) {
        console.error('GeoguessrHijackMap Error:', err)
        reject(err)
      }
    }

    google.maps.Map = class extends google.maps.Map {
      constructor(mapDiv: HTMLElement, opts: google.maps.MapOptions) {
        super(mapDiv, opts)
        this.addListener('idle', () => {
          if (globalMap == null) {
            onMapUpdate(this)
          }
        })
        this.addListener('maptypeid_changed', () => {
          // Save the map type ID so we can prevent GeoGuessr from resetting it
          setLocalStorage('cg_MapTypeId', this.getMapTypeId())
        })
      }

      setOptions(opts: google.maps.MapOptions) {
        // GeoGuessr's `setOptions` calls always include `backgroundColor`
        // so this is how we can distinguish between theirs and ours
        if (opts.backgroundColor) {
          opts.mapTypeId = getLocalStorage('cg_MapTypeId', opts.mapTypeId)
          opts.mapTypeControl = true
          opts.mapTypeControlOptions = {
            style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
            position: google.maps.ControlPosition.TOP_RIGHT
          }
        }
        super.setOptions(opts)
      }
    }
  })
}

async function showSatelliteMap(location: LatLng) {
  await mapReady

  const satelliteMode = getLocalStorage('cg_satelliteMode__settings', { boundsLimit: 10 })

  if (!document.body.contains(satelliteCanvas)) {
    document.querySelector('[data-qa="panorama"] [aria-label="Map"]')?.append(satelliteCanvas)
  }
  satelliteCanvas.style.display = 'block'

  satelliteLayer ??= new google.maps.Map(satelliteCanvas, {
    fullscreenControl: false,
    mapTypeId: google.maps.MapTypeId.SATELLITE
  })

  satelliteLayer.setOptions({
    restriction: {
      latLngBounds: getBounds(location, satelliteMode.boundsLimit),
      strictBounds: true
    }
  })

  satelliteLayer.setCenter(location)
  satelliteLayer.setZoom(15)

  satelliteMarker?.setMap(null)

  satelliteMarker = new google.maps.Marker({
    position: location,
    map: satelliteLayer
  })
}

async function hideSatelliteMap() {
  await mapReady
  satelliteCanvas.style.display = 'none'
}

function centerSatelliteView(location: LatLng) {
  if (!satelliteLayer) return
  satelliteLayer.setCenter(location)
}

function getBounds(location: LatLng, limitInKm: number) {
  const meters = (limitInKm * 1000) / 2
  const earth = 6371.071
  const pi = Math.PI
  const m = 1 / (((2 * pi) / 360) * earth) / 1000

  const north = location.lat + meters * m
  const south = location.lat - meters * m
  const west = location.lng - (meters * m) / Math.cos(location.lat * (pi / 180))
  const east = location.lng + (meters * m) / Math.cos(location.lat * (pi / 180))

  return { north, south, west, east }
}

function toMeter(distance: number) {
  return distance >= 1 ? distance.toFixed(1) + 'km' : Math.floor(distance * 1000) + 'm'
}

declare global {
  interface RendererApi {
    drawRoundResults: typeof drawRoundResults
    drawPlayerResults: typeof drawPlayerResults
    drawGameLocations: typeof drawGameLocations
    focusOnGuess: typeof focusOnGuess
    clearMarkers: typeof clearMarkers
    showSatelliteMap: typeof showSatelliteMap
    hideSatelliteMap: typeof hideSatelliteMap
    centerSatelliteView: typeof centerSatelliteView
  }
}
