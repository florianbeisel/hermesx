import { Notification, systemPreferences } from 'electron';
import { exec } from 'child_process';
import { UserConfig } from './ConfigManager';
import { WorkState, StateNotification } from './StateMachine';
import { DEBUG } from './main';  // Import the global DEBUG object

export class NotificationManager {
  private lastNotificationTime: Record<string, number> = {};
  private notificationQueue: Array<{ id: string; notification: Notification; timeout: number }> = [];
  private static readonly NOTIFICATION_COOLDOWN = 2 * 60 * 1000; // Reduce cooldown to 2 minutes for testing
  private userConfig: UserConfig;
  private getCurrentTimestamp: () => number;

  constructor(userConfig: UserConfig, getCurrentTimestamp: () => number) {
    this.userConfig = userConfig;
    this.getCurrentTimestamp = getCurrentTimestamp;
    console.log('Initializing NotificationManager...');
    
    this.processNotificationQueue();
  }

  private async isInMeeting(): Promise<boolean> {
    if (!this.userConfig.notifications.suppressDuringCalls) return false;
    
    try {
      switch (process.platform) {
        case 'darwin': {
          const micAccess = systemPreferences.getMediaAccessStatus('microphone');
          const cameraAccess = systemPreferences.getMediaAccessStatus('camera');
          
          if (DEBUG.enabled) {
            console.log('Media access status:', { micAccess, cameraAccess });
          }
          
          return micAccess === 'granted';
        }

        case 'win32': {
          // Fallback to process detection on Windows
          return this.isInMeetingLegacy();
        }

        default:
          return this.isInMeetingLegacy();
      }
    } catch (error) {
      console.error('Error checking meeting status:', error);
      return false;
    }
  }

  // Fallback method using process scanning
  private async isInMeetingLegacy(): Promise<boolean> {
    try {
      const processes = await this.getRunningProcesses();
      const meetingApps = [
        'zoom', 'teams', 'webex', 'skype', 'discord', 'slack',
        'meet.google.com', 'CptHost', 'CiscoCollabHost'
      ];
      
      const meetingProcesses = processes.filter(proc => 
        meetingApps.some(app => proc.toLowerCase().includes(app.toLowerCase()))
      );

      if (DEBUG.enabled && meetingProcesses.length > 0) {
        console.log('Detected meeting processes:', meetingProcesses);
      }

      return meetingProcesses.length > 0;
    } catch (error) {
      console.error('Legacy meeting detection error:', error);
      return false;
    }
  }

  // Similarly for gaming detection, we can use better APIs
  private async isGaming(): Promise<boolean> {
    if (!this.userConfig.notifications.suppressDuringGaming) return false;
    // Simplified to just check if any full-screen app is running
    return false; // Implement platform-specific checks if needed
  }

  private async shouldSuppressNotification(): Promise<boolean> {
    if (this.userConfig.notifications.quietMode) return true;
    const inMeeting = await this.isInMeeting();
    const gaming = await this.isGaming();
    return inMeeting || gaming;
  }

  private processNotificationQueue() {
    setInterval(async () => {
      if (this.notificationQueue.length === 0) return;

      const now = this.getCurrentTimestamp();
      const shouldSuppress = await this.shouldSuppressNotification();

      if (DEBUG.enabled) {
        console.log('Processing notification queue:', {
          queueLength: this.notificationQueue.length,
          shouldSuppress,
          now: new Date(now).toLocaleTimeString()
        });
      }

      const processedNotifications: string[] = [];
      this.notificationQueue = this.notificationQueue.filter(({ id, notification, timeout }) => {
        if (shouldSuppress) {
          if (DEBUG.enabled) {
            console.log('Suppressing notification:', id);
          }
          return true; // Keep in queue if suppressed
        }

        const lastTime = this.lastNotificationTime[id] || 0;
        const timeSinceLastNotification = now - lastTime;

        if (DEBUG.enabled && timeSinceLastNotification < NotificationManager.NOTIFICATION_COOLDOWN) {
          console.log(`Notification ${id} in cooldown:`, {
            timeSince: formatDuration(timeSinceLastNotification),
            cooldown: formatDuration(NotificationManager.NOTIFICATION_COOLDOWN)
          });
        }

        if (timeSinceLastNotification < NotificationManager.NOTIFICATION_COOLDOWN) {
          return true; // Keep in queue if in cooldown
        }

        if (now >= timeout) {
          if (DEBUG.enabled) {
            console.log('Showing notification:', {
              id,
              scheduledFor: new Date(timeout).toLocaleTimeString(),
              timeSinceLastNotification: formatDuration(timeSinceLastNotification)
            });
          }

          // Prevent duplicate notifications in the same batch
          if (!processedNotifications.includes(id)) {
            notification.show();
            this.lastNotificationTime[id] = now;
            processedNotifications.push(id);
          }
          return false; // Remove from queue
        }

        if (DEBUG.enabled) {
          console.log('Keeping notification in queue:', {
            id,
            scheduledFor: new Date(timeout).toLocaleTimeString(),
            timeUntilShow: formatDuration(timeout - now)
          });
        }
        return true; // Keep in queue if not yet time
      });
    }, 1000);
  }

  public scheduleNotification(
    id: string,
    title: string,
    body: string,
    delayMs = 0,
    forceShow = false
  ) {
    if (DEBUG.enabled) {
      console.log('Scheduling notification:', {
        id,
        title,
        forceShow,
        delay: formatDuration(delayMs)
      });
    }

    const notification = new Notification({ 
      title, 
      body,
      silent: false,
      urgency: 'critical',
      timeoutType: 'never',
      subtitle: 'Zeiterfassung Reminder',
      actions: [{
        text: 'OK',
        type: 'button'
      }],
      closeButtonText: 'Dismiss'
    });

    notification.on('show', () => {
      if (DEBUG.enabled) {
        console.log('Notification shown:', id);
      }
    });

    notification.on('click', () => {
      if (DEBUG.enabled) {
        console.log('Notification clicked:', id);
      }
    });

    notification.on('close', () => {
      if (DEBUG.enabled) {
        console.log('Notification closed:', id);
      }
    });

    notification.on('failed', (error) => {
      console.error('Notification failed:', { id, error });
    });

    const timeout = this.getCurrentTimestamp() + delayMs;

    if (forceShow) {
      if (DEBUG.enabled) {
        console.log('Force showing notification:', { id, title });
      }
      notification.show();
      this.lastNotificationTime[id] = this.getCurrentTimestamp();
      return;
    }

    // Check if a similar notification is already in the queue
    const existingNotification = this.notificationQueue.find(n => n.id === id);
    if (existingNotification) {
      if (DEBUG.enabled) {
        console.log('Updating existing notification in queue:', id);
      }
      existingNotification.notification = notification;
      existingNotification.timeout = timeout;
    } else {
      if (DEBUG.enabled) {
        console.log('Adding new notification to queue:', id);
      }
      this.notificationQueue.push({ id, notification, timeout });
    }
  }

  public clearNotificationsById(id: string) {
    this.notificationQueue = this.notificationQueue.filter(item => item.id !== id);
  }

  public updateConfig(newConfig: UserConfig) {
    this.userConfig = newConfig;
    
    if (DEBUG.enabled) {
      console.log('NotificationManager config updated:', {
        quietMode: newConfig.notifications.quietMode,
        suppressDuringCalls: newConfig.notifications.suppressDuringCalls,
        suppressDuringGaming: newConfig.notifications.suppressDuringGaming
      });
    }

    // Clear existing notifications if quiet mode is enabled
    if (newConfig.notifications.quietMode) {
      this.notificationQueue = [];
    }
  }

  public handleStateChange(newState: WorkState, notification?: StateNotification) {
    if (!notification) return;

    this.scheduleNotification(
      notification.id,
      notification.title,
      notification.body,
      notification.delayMs || 0,
      notification.forceShow || false
    );

    // Schedule break reminder if state is WORKING
    if (newState === WorkState.WORKING) {
      const breakReminderDelay = 45 * 60 * 1000; // 45 minutes
      this.scheduleNotification(
        'break-reminder',
        'Break Reminder',
        'You have been working for 45 minutes. Consider taking a short break.',
        breakReminderDelay
      );
    }

    // Clear break reminder if state changes from WORKING
    if (newState !== WorkState.WORKING) {
      this.clearNotificationsById('break-reminder');
    }
  }

  private async getRunningProcesses(): Promise<string[]> {
    return new Promise((resolve) => {
      switch (process.platform) {
        case 'win32':
          exec('wmic process get description', (error: Error, stdout: string) => {
            if (error) {
              console.error('Error getting processes:', error);
              resolve([]);
              return;
            }
            const processes = stdout.split('\n')
              .map(line => line.trim())
              .filter(line => line && line !== 'Description');
            resolve(processes);
          });
          break;
          
        case 'darwin': // macOS
          exec('ps -ax -o comm=', (error: Error, stdout: string) => {
            if (error) {
              console.error('Error getting processes:', error);
              resolve([]);
              return;
            }
            const processes = stdout.split('\n')
              .map(line => line.trim())
              .filter(Boolean);
            resolve(processes);
          });
          break;
          
        default:
          resolve([]);
      }
    });
  }
}

// Helper function to format duration in milliseconds to human readable string
function formatDuration(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
} 