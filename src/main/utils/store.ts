import ElectronStore from 'electron-store'

type Schema = {
  settings: Settings
  lastLocation: LatLng | undefined
  session: Session | null
}

export const store: ElectronStore<Schema> = new ElectronStore()
