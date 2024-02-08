import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'
import { fileURLToPath } from 'node:url'

// https://vitejs.dev/config
export default defineConfig({
  plugins: [vue(), svgLoader()],
  define: {
    'process.env': {}
  },
  resolve: {
    alias: [
      {
        find: '@',
        replacement: fileURLToPath(new URL('./src/renderer', import.meta.url))
      }
    ]
  }
})
