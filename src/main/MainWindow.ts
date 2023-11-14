import { join } from 'path'
import { BrowserWindow, shell } from 'electron'

const isDev = process.env.npm_lifecycle_event === 'dev'

// Create the Main window.
export default function createWindow() {
  const mainWindow = new BrowserWindow({
    show: false,
    ...(process.platform === 'linux'
      ? {
          icon: join(__dirname, '../../build/icon.png')
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, './preload.js'),
      devTools: isDev ? true : false,
      sandbox: false
    }
  })

  mainWindow.setMenuBarVisibility(false)
  mainWindow.loadURL('https://www.geoguessr.com/community/maps')

  // Open links in default OS browser
  // Allow login via socials to open a new window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const socialUrls = [
      'https://www.facebook.com',
      'https://accounts.google.com',
      'https://appleid.apple.com'
    ]
    if (socialUrls.some((_url) => url.startsWith(_url))) return { action: 'allow' }

    shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
    if (isDev) mainWindow.webContents.openDevTools()
  })

  mainWindow.on('close', () => BrowserWindow.getAllWindows().forEach((window) => window.destroy()))

  return mainWindow
}
