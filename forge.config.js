module.exports = {
  packagerConfig: {
    asar: true,
    icon: 'build/icon',
    executableName: 'chatguessr-electron-vite'
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'chatguessr-electron-vite',
        setupIcon: 'build/icon.ico',
        loadingGif: 'build/icon_installer.gif',
        iconUrl: 'file://build/icon.ico'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-deb',
      options: {
        bin: 'chatguessr-electron-vite'
      }
    }
  ],

  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'tzhf',
          name: 'chatguessr-electron-vite'
        }
      }
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          {
            entry: 'src/main/main.ts',
            config: 'vite.main.config.mjs'
          },
          {
            entry: 'src/preload/preload.ts'
          },
          {
            entry: 'src/renderer/renderer.ts',
            config: 'vite.renderer.config.mjs'
          },
          {
            entry: 'src/auth/auth_preload.ts'
          },
          {
            entry: 'src/auth/auth_impl.ts'
          }
        ],
        renderer: []
      }
    }
  ]
}
