import { defineConfig } from 'vite'
// import commonjs from '@rollup/plugin-commonjs'

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    // Some libs that can run in both Web and Node.js, such as `axios`, we need to tell Vite to build them in Node.js.
    browserField: false,
    conditions: ['node'],
    mainFields: ['module', 'jsnext:main', 'jsnext']
  },
  plugins: [
    // commonjs({
    // ignoreDynamicRequires: true
    // dynamicRequireTargets: [
    // include using a glob pattern (either a string or an array of strings)
    // 'node_modules/better_sqlite3/*.js',
    // 'node_modules/better-sqlite3/*.js',
    // 'node_modules/better-sqlite3/*',
    // 'node_modules/better-sqlite3/*'
    // 'better-sqlite3'
    // ]
    // })
  ],

  build: {
    rollupOptions: {
      external: ['coordinate_to_country']
    }
  }
})
