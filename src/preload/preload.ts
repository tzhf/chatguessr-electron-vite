import fs from 'fs'
import { join } from 'node:path'
import whenDomReady from 'when-dom-ready'
import useLoading from './useLoading'

const { appendLoading, removeLoading } = useLoading()

const rendererJS = fs.readFileSync(join(__dirname, 'renderer.js'), 'utf8')
const rendererCSS = fs.readFileSync(join(__dirname, 'style.css'), 'utf8')

whenDomReady().then(() => {
  appendLoading()

  const script = document.createElement('script')
  script.type = 'module'
  script.innerHTML = rendererJS
  document.body.appendChild(script)

  const css = document.createElement('style')
  css.textContent = rendererCSS
  document.body.appendChild(css)
})

window.onmessage = (ev) => {
  ev.data.payload === 'removeLoading' && removeLoading()
}
setTimeout(removeLoading, 4999)
