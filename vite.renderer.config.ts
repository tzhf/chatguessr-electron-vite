import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import svgLoader from 'vite-svg-loader'
// import { fileURLToPath } from 'node:url'
import path from 'path'

// https://vitejs.dev/config
export default defineConfig({
  plugins: [vue(), svgLoader()],
  define: {
    'process.env': {}
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer')
    }
  }
})
