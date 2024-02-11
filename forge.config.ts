import type { ForgeConfig } from '@electron-forge/shared-types'
import { MakerSquirrel } from '@electron-forge/maker-squirrel'
import { MakerZIP } from '@electron-forge/maker-zip'
import { MakerDeb } from '@electron-forge/maker-deb'
import { VitePlugin } from '@electron-forge/plugin-vite'
import { PublisherGithub } from '@electron-forge/publisher-github'

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: 'build/icon',
    executableName: 'chatguessr-electron-vite'
  },
  makers: [
    new MakerSquirrel({
      name: 'chatguessr-electron-vite',
      setupIcon: 'build/icon.ico',
      loadingGif: 'build/icon_installer.gif',
      iconUrl: 'file://build/icon.ico'
    }),
    new MakerZIP({}, ['darwin']),
    new MakerDeb({
      options: {
        bin: 'chatguessr-electron-vite'
      }
    })
  ],
  publishers: [
    new PublisherGithub({
      repository: {
        owner: 'tzhf',
        name: 'chatguessr-electron-vite'
      }
    })
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: 'src/main/main.ts',
          config: 'vite.main.config.ts'
        },
        {
          entry: 'src/preload/preload.ts'
        },
        {
          entry: 'src/renderer/renderer.ts',
          config: 'vite.renderer.config.ts'
        },
        {
          entry: 'src/auth/auth_preload.ts'
        },
        {
          entry: 'src/auth/auth_impl.ts'
        }
      ],
      // Usually renderer goes here but in our case we need the compiled JS
      // so we can inject it into GeoGuessr instead of running a vite dev server
      renderer: []
    })
  ]
}

export default config
