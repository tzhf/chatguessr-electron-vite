import { defineConfig } from 'vite'

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
    browserField: false,
    conditions: ['node'],
    mainFields: ['module', 'jsnext:main', 'jsnext']
  },
  build: {
    rollupOptions: {
      // if we don't include 'bufferutil', 'utf-8-validate' we get 'Could not resolve "utf-8-validate" imported by "ws"'
      external: ['coordinate_to_country', 'bufferutil', 'utf-8-validate']
    }
  }
})
