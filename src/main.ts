import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, systemPreferences } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { ConfigManager, UserConfig } from './ConfigManager';
import { NotificationManager } from './NotificationManager';
import { StateMachine, WorkState, WorkAction, STATE_EMOJIS } from './StateMachine';
import { WorkMonitor } from './WorkMonitor';
import { SettingsWindow } from './SettingsWindow';
import { CredentialManager } from './CredentialManager';
import squirrelStartup from 'electron-squirrel-startup';
import { updateElectronApp } from 'update-electron-app';

// Initialize auto-updates
updateElectronApp();

// Handle Squirrel startup
if (squirrelStartup) {
    app.quit();
    process.exit(0);
}

// Global variable declarations
let tray: Tray | null = null;
let workMonitor: WorkMonitor;
const credentialManager = new CredentialManager();
let menuUpdateTimer: ReturnType<typeof setInterval> | null = null;
let isQuitting = false;

// Initialize core services first
const configManager = new ConfigManager();
export const userConfig: UserConfig = configManager.loadConfig();

// Control real vs simulated actions
export const DRY_RUN = false;

// Debug configuration - now initialized after userConfig
export const DEBUG = {
    enabled: userConfig.debug || false,
    timeOffset: 0,
    setTime: (hours: number, minutes = 0) => {
        const now = new Date();
        const target = new Date(now);
        target.setHours(hours, minutes, 0, 0);

        DEBUG.timeOffset = target.getTime() - now.getTime();

        if (DEBUG.enabled) {
            console.log('Debug time set:', {
                target: target.toLocaleTimeString(),
                offset: formatDuration(DEBUG.timeOffset),
                current: getCurrentTime().toLocaleTimeString(),
            });
        }
    },
};

// Initialize other services that depend on userConfig and DEBUG
export const notificationManager = new NotificationManager(userConfig, getCurrentTimestamp);
const settingsWindow = new SettingsWindow();

// Initialize state machine
export const stateMachine = new StateMachine({
    onWorkStateChange: (newState: WorkState) => {
        workMonitor.onWorkStateChange(newState);
        updateContextMenu();
    },
});

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        show: false, // Start hidden
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            javascript: true,
            webSecurity: true,
            allowRunningInsecureContent: true,
            webviewTag: true,
            partition: 'persist:main',
        },
    });

    // Show window only when it's ready to avoid visual flash
    win.once('ready-to-show', () => {
        win.show();
    });

    // Handle window closing properly
    win.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            win.hide();
        }
    });

    return win;
}

export function formatDuration(duration: number): string {
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}

export async function performAction(action: WorkAction) {
    console.log('Current state:', stateMachine.getState());
    console.log('Performing action:', action);

    const win = createWindow();

    try {
        // Load URL and wait for page
        await win.loadURL('https://zeusx.intersport.de');

        // Get stored credentials
        const credentials = credentialManager.getCredentials();

        if (!credentials) {
            console.error('No credentials found');
            notificationManager.scheduleNotification(
                'credentials-missing',
                'Login Failed',
                'Please set your credentials in the settings.',
                0,
                true
            );
            return;
        }

        // Login first
        await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        try {
          const usernameElements = document.getElementsByName('uiUserName');
          const passwordElements = document.getElementsByName('uiPassword');
          const loginButton = document.getElementById('uiLogOnButton_I');
          
          if (usernameElements.length > 0) {
            usernameElements[0].value = '${credentials.username}';
          }
          if (passwordElements.length > 0) {
            passwordElements[0].value = '${credentials.password}';
          }
          if (loginButton) {
            loginButton.click();
          }
          resolve();
        } catch (error) {
          console.error('Error:', error);
          resolve();
        }
      })
    `);

        // Wait for login and page content
        await new Promise<void>((resolve) => {
            win.webContents.once('did-navigate', async () => {
                await win.webContents.executeJavaScript(`
          new Promise((resolve) => {
            const waitForContent = () => {
              const targetButton = document.getElementById('${action.buttonId}');
              if (targetButton) {
                console.log('Target button found:', targetButton.id);
                resolve();
              } else {
                console.log('Waiting for target button ${action.buttonId}...');
                setTimeout(waitForContent, 500);
              }
            };
            setTimeout(waitForContent, 1000);
          })
        `);
                resolve();
            });
        });

        // Modify the button click and logout section
        await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const waitForButton = () => {
          console.log('Searching for button...');
          let targetButton = document.getElementById('${action.buttonId}');
          console.log('By ID ${action.buttonId}:', targetButton);
          
          if (!targetButton) {
            const buttons = Array.from(document.querySelectorAll('[id^="TerminalButton"]'));
            console.log('Found terminal buttons:', buttons.map(b => ({id: b.id, text: b.textContent})));
            const textMatch = buttons.find(btn => btn.textContent?.includes('${action.buttonText}'));
            if (textMatch) {
              targetButton = textMatch;
            }
          }
          
          if (targetButton) {
            console.log('Found target button:', {
              id: targetButton.id,
              text: targetButton.textContent,
              classes: targetButton.className
            });
            if (${DRY_RUN}) {
              alert('DRY RUN: Would click button: ' + targetButton.id + ' with text: ' + targetButton.textContent);
            } else {
              targetButton.click();
            }
            // Wait 3 seconds after clicking before resolving
            setTimeout(resolve, 3000);
          } else {
            console.log('Button not found, retrying...');
            setTimeout(waitForButton, 500);
          }
        };
        waitForButton();
      })
    `);

        // After successful action and state transition
        console.log('Transitioning state:', action);
        await stateMachine.transition(action, getCurrentTime);

        // For dry runs, close after alert
        if (DRY_RUN) {
            win.close();
            return;
        }

        // For real runs, do logout first
        await win.webContents.executeJavaScript(`
      new Promise((resolve) => {
        const logoffLink = document.querySelector('#uiMenuLogOff');
        if (logoffLink) {
          console.log('Logging out...');
          logoffLink.click();
        }
        resolve();
      })
    `);

        // Wait for logout to complete
        await new Promise((resolve) => setTimeout(resolve, 1000));
        win.close();
    } catch (error) {
        console.error('Error during action:', error);
        win.close();
    }
}

function createTray() {
    // First, let's add some debug logging
    console.log('Creating tray...');
    let iconPath: string;
    // Update path to use assets folder instead of resources
    if (app.isPackaged) {
        if (process.platform === 'win32') {
            iconPath = path.join(process.resourcesPath, 'icons', 'icon.ico');
        } else {
            iconPath = path.join(process.resourcesPath, 'icons', '1024x1024.png');
        }
    } else {
        if (process.platform === 'win32') {
            iconPath = path.join(process.cwd(), 'assets', 'icon.ico');
        } else {
            iconPath = path.join(process.cwd(), 'assets', 'icon.png');
        }
    }

    console.log('Icon path:', iconPath);

    // Check if icon file exists
    if (!fs.existsSync(iconPath)) {
        console.error('Icon file not found at:', iconPath);
        // Fallback to a simple empty image if icon is missing
        tray = new Tray(nativeImage.createEmpty());
    } else {
        const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
        console.log('Icon created successfully');

        // Destroy existing tray if it exists
        if (tray !== null) {
            tray.destroy();
        }

        tray = new Tray(icon);
        console.log('Tray created successfully');

        // Add click handler here after tray is created
        tray.on('click', () => {
            if (BrowserWindow.getAllWindows().length > 0) {
                BrowserWindow.getAllWindows()[0].hide();
            }
        });
    }

    // Set initial tooltip
    tray?.setToolTip('Work Time Tracker');

    // Force initial context menu update
    updateContextMenu();
}

// Update the updateContextMenu function to include settings
function updateContextMenu() {
    const stateActions = stateMachine.getAvailableActions();
    const startTime = stateMachine.getStartTime();
    const currentState = stateMachine.getState();
    const totalWorkedTime = stateMachine.getTotalWorkedTime();

    const currentTimeWorked =
        startTime && currentState === WorkState.WORKING
            ? getCurrentTime().getTime() - startTime.getTime()
            : 0;

    // Update tray title with current duration
    if (startTime && (currentState === WorkState.WORKING || currentState === WorkState.PAUSED)) {
        const duration = formatDuration(getCurrentTime().getTime() - startTime.getTime());
        tray?.setTitle(`${STATE_EMOJIS[currentState]} ${duration}`);
    } else {
        tray?.setTitle(STATE_EMOJIS[currentState]);
    }

    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
        ...(startTime && (currentState === WorkState.WORKING || currentState === WorkState.PAUSED)
            ? [
                  {
                      label: `Current session: ${formatDuration(getCurrentTime().getTime() - startTime.getTime())}`,
                      enabled: false,
                  },
              ]
            : []),
        ...(totalWorkedTime > 0 || currentTimeWorked > 0
            ? [
                  {
                      label: `Total time today: ${formatDuration(totalWorkedTime + currentTimeWorked)}`,
                      enabled: false,
                  },
              ]
            : []),
        { type: 'separator' as const },
        ...stateActions.map((action) => ({
            label: `${action.label} ${DRY_RUN ? '(Dry Run)' : ''}`,
            click: async () => {
                await performAction(action);
            },
        })),
        { type: 'separator' as const },
        {
            label: 'Settings',
            click: () => settingsWindow.open(),
        },
        DEBUG.enabled ? { type: 'separator' as const } : null,
        DEBUG.enabled
            ? {
                  label: 'Debug: Set Time',
                  submenu: [
                      {
                          label: 'Set to 8:15 AM (Start Day)',
                          click: () => {
                              DEBUG.setTime(8, 15);
                              updateContextMenu();
                          },
                      },
                      {
                          label: 'Set to 12:00 PM (Lunch)',
                          click: () => {
                              DEBUG.setTime(12, 0);
                              updateContextMenu();
                          },
                      },
                      {
                          label: 'Set to 4:45 PM (End Day)',
                          click: () => {
                              DEBUG.setTime(16, 45);
                              updateContextMenu();
                          },
                      },
                      {
                          label: 'Reset Debug Time',
                          click: () => {
                              DEBUG.timeOffset = 0;
                              updateContextMenu();
                          },
                      },
                  ],
              }
            : null,
        { type: 'separator' as const },
        {
            label: 'Quit',
            click: () => {
                isQuitting = true;
                // Persist state before quitting
                stateMachine.persistState();
                // Close all windows and quit
                BrowserWindow.getAllWindows().forEach((window) => window.close());
                app.quit();
            },
        },
    ].filter((item) => item !== null) as Electron.MenuItemConstructorOptions[];

    // Persist state if we're tracking time
    if (currentState === WorkState.WORKING || currentState === WorkState.PAUSED) {
        stateMachine.persistState();
    }

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    tray?.setContextMenu(contextMenu);
}

// Add this to reset the total time at midnight
function scheduleMiddnightReset() {
    const now = getCurrentTime();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
        stateMachine.resetDailyTime();
        updateContextMenu();
        scheduleMiddnightReset(); // Schedule next reset
    }, timeUntilMidnight);
}

// Helper functions
export function getCurrentTime(): Date {
    if (DEBUG.enabled) {
        const now = new Date();
        const debugTime = new Date(now.getTime() + DEBUG.timeOffset);
        return debugTime;
    }
    return new Date();
}

export function getCurrentTimestamp(): number {
    return getCurrentTime().getTime();
}

// Add this function to start the menu update timer
function startMenuUpdateTimer() {
    // Clear existing timer if any
    if (menuUpdateTimer) {
        console.log('Clearing existing menu update timer');
        clearInterval(menuUpdateTimer);
    }

    console.log('Starting new menu update timer');
    // Update every second when working or paused
    menuUpdateTimer = setInterval(() => {
        const currentState = stateMachine.getState();
        if (currentState === WorkState.WORKING || currentState === WorkState.PAUSED) {
            console.log('Updating menu - Current state:', currentState);
            console.log('Start time:', stateMachine.getStartTime()?.toLocaleTimeString());
            updateContextMenu();
        }
    }, 1000);
}

// Update app.whenReady() to include our new systems and IPC handlers
app.whenReady().then(() => {
    // Add this line to hide dock icon on macOS
    if (process.platform === 'darwin') {
        app.dock.hide();
        systemPreferences.askForMediaAccess('microphone');
        systemPreferences.askForMediaAccess('camera');
    }

    createTray();
    scheduleMiddnightReset();

    // Initialize work monitoring
    workMonitor = new WorkMonitor();

    // Start the menu update timer
    startMenuUpdateTimer();

    // Set up IPC handlers
    ipcMain.on('save-config', (_, newConfig: UserConfig) => {
        // Create a new config object to avoid modifying the constant
        const updatedConfig = { ...newConfig };
        Object.assign(userConfig, updatedConfig); // Update the global config

        configManager.saveConfig(updatedConfig); // Save to disk

        // Propagate config changes to relevant components
        notificationManager.updateConfig(updatedConfig);

        // Update tray menu if needed
        updateContextMenu(); // Changed from updateTrayMenu to updateContextMenu
    });

    // Add these new IPC handlers
    ipcMain.handle('save-credentials', async (_event, credentials) => {
        console.log('Main: Received save credentials request');
        try {
            await credentialManager.saveCredentials(credentials);
            console.log('Main: Credentials saved successfully');
            return { success: true };
        } catch (error) {
            console.error('Main: Failed to save credentials:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-credentials', () => {
        console.log('Main: Received get credentials request');
        const credentials = credentialManager.getCredentials();
        console.log('Main: Retrieved credentials:', credentials ? 'Found' : 'Not found');
        return credentials;
    });

    ipcMain.handle('clear-credentials', () => {
        console.log('Main: Received clear credentials request');
        try {
            credentialManager.clearCredentials();
            console.log('Main: Credentials cleared successfully');
            return { success: true };
        } catch (error) {
            console.error('Main: Failed to clear credentials:', error);
            return { success: false, error: error.message };
        }
    });
});

// Update app quit handling
app.on('before-quit', (event) => {
    if (!isQuitting) {
        event.preventDefault();
        return;
    }

    // Ensure state is persisted
    if (stateMachine) {
        stateMachine.persistState();
    }
});

app.on('window-all-closed', () => {
    if (isQuitting) {
        app.quit();
    }
});

// Add will-quit handler for final cleanup
app.on('will-quit', () => {
    // Clear any timers or intervals
    if (menuUpdateTimer) {
        clearInterval(menuUpdateTimer);
        menuUpdateTimer = null;
    }
});
