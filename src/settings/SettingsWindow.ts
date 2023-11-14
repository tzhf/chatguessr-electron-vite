import { join } from 'path'
import { BrowserWindow, shell } from 'electron'

export default function createSettingsWindow(parentWindow: BrowserWindow) {
  const isLinux = process.platform === 'linux'

  const win = new BrowserWindow({
    title: 'Chatguessr Settings',
    parent: parentWindow,
    width: 750,
    height: 720,
    minWidth: 750,
    minHeight: 720,
    show: false,
    fullscreen: false,
    maximizable: false,
    frame: isLinux ? true : false,
    transparent: isLinux ? false : true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      devTools: process.env.NODE_ENV === 'development'
    }
  })
  win.setMenuBarVisibility(false)
  win.loadURL(`file://${join(__dirname, '../../src/settings/settings.html')}`)

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  return win
}
