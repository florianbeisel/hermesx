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

        // Set update check frequency (4 hours)
        const UPDATE_CHECK_FREQUENCY = 4 * 60 * 60 * 1000;

        if (DEBUG.enabled) {
            autoUpdater.logger = console;
            // Force update check on start in debug mode
            autoUpdater.checkForUpdates().catch((err) => {
                console.error('Error checking for updates:', err);
            });
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

        // Check for updates periodically
        setInterval(() => {
            autoUpdater.checkForUpdates().catch((err) => {
                console.error('Error checking for updates:', err);
            });
        }, UPDATE_CHECK_FREQUENCY);

        // Initial check
        autoUpdater.checkForUpdates().catch((err) => {
            console.error('Error on initial update check:', err);
        });
    }
}
