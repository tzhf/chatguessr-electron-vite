import { join } from 'node:path'
import { app, shell, BrowserWindow, protocol } from 'electron'

const isDev = process.env.npm_lifecycle_event === 'dev'

// Serve assets to 'asset:' file protocol
// assets must be placed in the public folder because rollup cannot resolve urls with `asset:` prefix
function serveAssets() {
  const assetDir = join(__dirname, '../renderer/assets')
  protocol.interceptFileProtocol('asset', (request, callback) => {
    const assetFile = join(assetDir, new URL(request.url).pathname)
    if (!assetFile.startsWith(assetDir)) {
      callback({ statusCode: 404, data: 'Not Found' })
    } else {
      callback({ path: assetFile })
    }
  })
}

// Create the browser window.
function createWindow() {
  const mainWindow = new BrowserWindow({
    show: false,
    ...(process.platform === 'linux'
      ? {
          icon: join(__dirname, '../../build/icon.png')
        }
      : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      devTools: isDev ? true : false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    mainWindow.maximize()
    if (isDev) mainWindow.webContents.openDevTools()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.setMenuBarVisibility(false)
  mainWindow.loadURL('https://www.geoguessr.com/maps')
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  serveAssets()
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
