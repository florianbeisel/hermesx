import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: '**/credentials.enc',
    },
    icon: 'assets/icons/icon',
    name: 'HermesX',
    executableName: 'hermesx',
    appBundleId: 'com.florianbeisel.hermesx',
    appCategoryType: 'public.app-category.productivity',
    appCopyright: `Copyright © ${new Date().getFullYear()} Florian Beisel`,
    extraResource: [
      'assets/icons',
      'build/app-update.yml',
      'build/dev-app-update.yml',
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerZIP({}, ['darwin', 'win32']),
    new MakerRpm({}),
    new MakerDeb({
      options: {
        maintainer: 'Florian Beisel',
        homepage: 'https://your-website.com',
        icon: 'assets/icons/icon.png',
      },
    }),
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'hermesx',
        authors: 'Florian Beisel',
        description: 'Work time tracking reminder application',
        iconUrl:
          'https://raw.githubusercontent.com/florianbeisel/hermesx/main/assets/icons/icon.ico',
        setupIcon: 'assets/icons/icon.ico',
        remoteReleases: 'https://github.com/florianbeisel/hermesx',
      },
    },
    new MakerDMG(
      {
        icon: 'assets/icons/icon.icns',
        format: 'ULFO',
      },
      ['darwin']
    ),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.ts',
          target: 'main',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.ts',
          target: 'preload',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.ts',
        },
      ],
    }),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
