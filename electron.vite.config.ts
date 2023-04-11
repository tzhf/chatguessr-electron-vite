import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      minify: true
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      minify: true
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer')
      }
    },
    plugins: [vue()],
    build: {
      minify: true,
      rollupOptions: {
        input: resolve(__dirname, 'src/renderer/renderer.ts'),
        output: {
          entryFileNames: '[name].js',
          assetFileNames: '[name][extname]'
        }
      }
    }
  }
})
