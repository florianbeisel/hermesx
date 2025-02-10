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
    asar: true,
    icon: 'assets/icons/icon',
    name: 'HermesX',
    executableName: 'hermesx',
    appBundleId: 'com.florianbeisel.hermesx',
    appCategoryType: 'public.app-category.productivity',
    appCopyright: `Copyright © ${new Date().getFullYear()} Florian Beisel`,
  },
  rebuildConfig: {},
  makers: [
    new MakerZIP({}, ['darwin', 'win32']),
    new MakerRpm({}),
    new MakerDeb({
      options: {
        maintainer: 'Florian Beisel',
        homepage: 'https://your-website.com',
        icon: 'assets/icons/icon.png'
      }
    }),
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'zeiterfassung-reminder',
        authors: 'Florian Beisel',
        description: 'Work time tracking reminder application',
        iconUrl: 'https://raw.githubusercontent.com/yourusername/zeiterfassung-reminder/main/assets/icons/icon.ico',
        setupIcon: 'assets/icons/icon.ico'
      },
    },
    new MakerDMG({
      icon: 'assets/icons/icon.icns',
      format: 'ULFO'
    }, ['darwin']),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
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
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
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
