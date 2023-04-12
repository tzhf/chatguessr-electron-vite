import { ipcRenderer } from 'electron'

export const chatguessrApi = {
  sendToA() {
    ipcRenderer.send('A')
  },
  receiveFromMain() {
    ipcRendererOn('main-process-message', (_event, ...args) => {
      console.log('[Receive Main-process message]:', ...args)
    })
  },
  openSettings() {
    ipcRenderer.send('openSettings')
  }
}

function ipcRendererOn(event: string, callback: (...args: unknown[]) => void) {
  const listener = (_event: unknown, ...args: unknown[]) => {
    callback(...args)
  }

  ipcRenderer.on(event, listener)
  return () => ipcRenderer.off(event, listener)
}

declare global {
  interface Window {
    chatguessrApi: typeof chatguessrApi
  }
}
