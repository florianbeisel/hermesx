import { autoUpdater } from 'electron-updater';
import { app } from 'electron';
import { DEBUG } from './main';

export class AutoUpdater {
  constructor() {
    if (app.isPackaged) {
      this.initializeAutoUpdater();
    }
  }

  private initializeAutoUpdater() {
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;

    if (DEBUG.enabled) {
      autoUpdater.logger = console;
    }

    autoUpdater.on('checking-for-update', () => {
      if (DEBUG.enabled) console.log('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
      if (DEBUG.enabled) console.log('Update available:', info);
    });

    autoUpdater.on('update-not-available', (info) => {
      if (DEBUG.enabled) console.log('Update not available:', info);
    });

    autoUpdater.on('error', (err) => {
      console.error('AutoUpdater error:', err);
    });

    // Check for updates every hour
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 60 * 60 * 1000);

    // Initial check
    autoUpdater.checkForUpdates();
  }
} 