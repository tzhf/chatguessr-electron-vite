import { createApp } from 'vue'
import Frame from './components/Frame.vue'
import './styles.css'

import './mods/extenssrMenuItemsPlugin'
import './mods/geoNoCar'
import './mods/blinkMode'

const wrapper = document.createElement('div')
document.body.append(wrapper)

createApp(Frame)
  .mount(wrapper)
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
