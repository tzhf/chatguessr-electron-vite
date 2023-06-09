import { join } from 'path'
import { app, BrowserWindow, protocol, shell } from 'electron'
import { loadCustomFlags, findFlagFile } from '../utils/flags'

const isDev = process.env.npm_lifecycle_event === 'dev'

require('update-electron-app')()

// Serve assets to 'asset:' file protocol
// assets must be placed in the public folder because rollup cannot resolve urls with `asset:` prefix
function serveAssets() {
  const assetDir = join(__dirname, './assets')
  protocol.interceptFileProtocol('asset', (request, callback) => {
    const assetFile = join(assetDir, new URL(request.url).pathname)
    if (!assetFile.startsWith(assetDir)) {
      callback({ statusCode: 404, data: 'Not Found' })
    } else {
      callback({ path: assetFile })
    }
  })
}

async function serveFlags() {
  await loadCustomFlags()

  protocol.interceptFileProtocol('flag', async (request, callback) => {
    const name = request.url.replace(/^flag:/, '')
    try {
      callback(await findFlagFile(name))
    } catch (err: any) {
      callback({ statusCode: 500, data: err.message })
    }
  })
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit()
}

// Create the browser window.
const createWindow = () => {
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
  mainWindow.loadURL('https://www.geoguessr.com/maps')

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
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  createWindow()
  serveAssets()
  await serveFlags()
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
