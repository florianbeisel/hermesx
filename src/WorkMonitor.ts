import { powerMonitor, Notification, app } from 'electron';
import path from 'path';
import {
    getCurrentTimestamp,
    stateMachine,
    DEBUG,
    performAction,
    formatDuration,
    userConfig,
    notificationManager,
    getCurrentTime,
} from './main';
import { WorkState, STATE_ACTIONS } from './StateMachine';

export class WorkMonitor {
    private lastActiveTime: number = getCurrentTimestamp();
    private lastBreakTime: number | null = null;
    private continuousWorkStartTime: number | null = null;
    private expectedBreakReturnTime: number | null = null;
    private lastNotificationTimes: Record<string, number> = {};

    constructor() {
        console.log('Initializing WorkMonitor...');
        this.setupActivityMonitoring();
        this.setupScheduleMonitoring();
    }

    private setupActivityMonitoring() {
        console.log('Setting up activity monitoring...');

        // Monitor both lock-screen and suspend events
        powerMonitor.on('lock-screen', () => this.handleLockScreen());
        powerMonitor.on('suspend', () => this.handleLockScreen());
        powerMonitor.on('shutdown', () => this.handleLockScreen());

        // Check for user activity periodically
        setInterval(() => {
            this.checkUserActivity();
        }, 60 * 1000); // Check every minute
    }

    private handleLockScreen() {
        if (stateMachine.getState() === WorkState.WORKING) {
            if (DEBUG.enabled) {
                console.log('Lock screen/suspend detected while working');
            }

            // For macOS, show multiple notifications with different properties to increase visibility
            if (process.platform === 'darwin') {
                // First notification - Critical alert
                const notification1 = new Notification({
                    title: '⚠️ Work Timer Active',
                    body: 'You are still clocked in!',
                    silent: false,
                    urgency: 'critical',
                    subtitle: 'Action Required',
                });

                notification1.on('show', () => {
                    if (DEBUG.enabled) console.log('First notification shown');
                });

                notification1.on('failed', (error) => {
                    console.error('First notification failed:', error);
                });

                notification1.show();

                // Second notification with action button
                setTimeout(() => {
                    if (stateMachine.getState() === WorkState.WORKING) {
                        const notification2 = new Notification({
                            title: '⚠️ Pause Required',
                            body: 'Click here to pause your work timer',
                            silent: false,
                            urgency: 'critical',
                            subtitle: 'Click to Pause',
                            actions: [
                                {
                                    text: 'Pause Timer',
                                    type: 'button',
                                },
                            ],
                        });

                        notification2.on('show', () => {
                            if (DEBUG.enabled) console.log('Second notification shown');
                        });

                        notification2.on('failed', (error) => {
                            console.error('Second notification failed:', error);
                        });

                        notification2.on('action', async () => {
                            const pauseAction = STATE_ACTIONS[WorkState.WORKING].find(
                                (action) => action.nextState === WorkState.PAUSED
                            );
                            if (pauseAction) {
                                await performAction(pauseAction);
                            }
                        });

                        notification2.show();
                    }
                }, 2000); // Longer delay to ensure notifications don't get bundled
            } else {
                // For other platforms, use the original notification
                const notification = new Notification({
                    title: 'Work Timer Active ⚠️',
                    body: 'You are still clocked in! Remember to pause or stop your work timer before leaving.',
                    silent: false,
                    urgency: 'critical',
                    timeoutType: 'never',
                    subtitle: 'Zeiterfassung Reminder - Important',
                    icon: app.isPackaged
                        ? path.join(process.resourcesPath, 'assets', 'icon.png')
                        : path.join(process.cwd(), 'assets', 'icon.png'),
                    actions: [
                        {
                            text: 'Pause Timer',
                            type: 'button',
                        },
                    ],
                    closeButtonText: 'Ignore',
                });

                notification.on('action', async () => {
                    const pauseAction = STATE_ACTIONS[WorkState.WORKING].find(
                        (action) => action.nextState === WorkState.PAUSED
                    );
                    if (pauseAction) {
                        await performAction(pauseAction);
                    }
                });

                notification.show();
            }

            // Show another notification after 30 seconds if still in working state
            setTimeout(() => {
                if (stateMachine.getState() === WorkState.WORKING) {
                    const followupNotification = new Notification({
                        title: '⚠️ Still Working ⚠️',
                        body: "Your work timer is still running! Please pause or stop it if you're taking a break.",
                        silent: false,
                        urgency: 'critical',
                        timeoutType: 'never',
                        subtitle: 'Zeiterfassung Reminder - Urgent',
                        icon: app.isPackaged
                            ? path.join(process.resourcesPath, 'icon.png')
                            : path.join(process.cwd(), 'resources', 'icon.png'),
                        actions: [
                            {
                                text: 'Pause Timer',
                                type: 'button',
                            },
                        ],
                        closeButtonText: 'Ignore',
                    });

                    followupNotification.on('action', async () => {
                        const pauseAction = STATE_ACTIONS[WorkState.WORKING].find(
                            (action) => action.nextState === WorkState.PAUSED
                        );
                        if (pauseAction) {
                            await performAction(pauseAction);
                        }
                    });

                    followupNotification.show();
                }
            }, 30 * 1000);
        }
    }

    private setupScheduleMonitoring() {
        console.log('Setting up schedule monitoring...');
        // Initial check
        this.checkScheduleCompliance();

        // Check schedule compliance every minute
        setInterval(() => {
            this.checkScheduleCompliance();
        }, 60 * 1000);
    }

    private checkUserActivity() {
        const idleTime = powerMonitor.getSystemIdleTime() * 1000; // Convert seconds to milliseconds
        const now = getCurrentTimestamp();

        if (DEBUG.enabled) {
            console.log('Activity Check:');
            console.log('Current time:', new Date(now).toLocaleTimeString());
            console.log('Current state:', stateMachine.getState());
            console.log('Idle time:', formatDuration(idleTime));
            if (this.expectedBreakReturnTime) {
                console.log(
                    'Expected break return:',
                    new Date(this.expectedBreakReturnTime).toLocaleTimeString()
                );
                console.log(
                    'Time until return:',
                    formatDuration(this.expectedBreakReturnTime - now)
                );
            }
        }

        if (stateMachine.getState() === WorkState.WORKING) {
            // Check for inactivity
            if (idleTime >= userConfig.inactivityThresholds.autoBreakSuggestion * 60 * 1000) {
                if (DEBUG.enabled) {
                    console.log('Triggering inactivity notification');
                }
                notificationManager.scheduleNotification(
                    'inactivity',
                    'Are you still working?',
                    `You've been inactive for ${formatDuration(idleTime)}. Should I switch you to break mode?`,
                    0,
                    false
                );
            }

            // Check for continuous work without breaks
            if (this.continuousWorkStartTime) {
                const continuousWorkTime = now - this.continuousWorkStartTime;
                if (
                    continuousWorkTime >=
                    userConfig.inactivityThresholds.shortBreakReminder * 60 * 1000
                ) {
                    if (DEBUG.enabled) {
                        console.log('Triggering break reminder');
                        console.log('Continuous work time:', formatDuration(continuousWorkTime));
                    }
                    notificationManager.scheduleNotification(
                        'break-reminder',
                        'Time for a Break',
                        "You've been working for a while. Taking regular breaks helps maintain productivity!",
                        0,
                        false
                    );
                }
            }
        } else if (stateMachine.getState() === WorkState.PAUSED) {
            // Check if break is running long
            if (this.expectedBreakReturnTime && now > this.expectedBreakReturnTime) {
                const breakOvertime = now - this.expectedBreakReturnTime;
                if (DEBUG.enabled) {
                    console.log('Break overrun detected:');
                    console.log('Break overtime:', formatDuration(breakOvertime));
                }

                // Only notify if we haven't notified in the last 5 minutes
                const lastNotificationTime = this.lastNotificationTimes['break-overrun'] || 0;
                if (now - lastNotificationTime > 5 * 60 * 1000) {
                    if (DEBUG.enabled) {
                        console.log('Sending break overrun notification');
                    }
                    notificationManager.scheduleNotification(
                        'break-overrun',
                        'Break Time Extended',
                        `Your ${userConfig.schedule.breakDuration} minute break has been extended by ${Math.floor(breakOvertime / (60 * 1000))} minutes. Ready to get back to work?`,
                        0,
                        false
                    );
                    this.lastNotificationTimes['break-overrun'] = now;
                }
            }
        }

        // Update activity tracking
        if (idleTime < 60 * 1000) {
            // Less than 1 minute idle
            this.lastActiveTime = now;
        }
    }

    private checkScheduleCompliance() {
        const now = getCurrentTime();
        const currentDay = now.getDay();

        // Only proceed if it's a workday
        if (!userConfig.schedule.workdays[currentDay]) {
            if (DEBUG.enabled) {
                console.log('Not a workday, skipping schedule check');
            }
            return;
        }

        // Add check for finished state
        if (stateMachine.isFinishedForToday()) {
            if (DEBUG.enabled) {
                console.log('Work finished for today, skipping schedule check');
            }
            return;
        }

        const scheduledStartTime = new Date(now);
        scheduledStartTime.setHours(userConfig.schedule.startTime.hour);
        scheduledStartTime.setMinutes(userConfig.schedule.startTime.minute);
        scheduledStartTime.setSeconds(0);
        scheduledStartTime.setMilliseconds(0);

        // Calculate scheduled end time
        const scheduledEndTime = new Date(scheduledStartTime);
        scheduledEndTime.setHours(scheduledEndTime.getHours() + userConfig.schedule.workDuration);

        // For debugging
        if (DEBUG.enabled) {
            console.log('Schedule Check:');
            console.log('Current time:', now.toLocaleTimeString());
            console.log('Scheduled start:', scheduledStartTime.toLocaleTimeString());
            console.log('Scheduled end:', scheduledEndTime.toLocaleTimeString());
            console.log('Current state:', stateMachine.getState());
            console.log(
                'Minutes late:',
                Math.floor((now.getTime() - scheduledStartTime.getTime()) / (60 * 1000))
            );
        }

        // Check start time compliance
        if (
            stateMachine.getState() === WorkState.NOT_WORKING &&
            !stateMachine.isFinishedForToday() &&
            now > scheduledStartTime
        ) {
            const minutesLate = Math.floor(
                (now.getTime() - scheduledStartTime.getTime()) / (60 * 1000)
            );
            const notificationKey = 'morning-reminder';
            const lastNotificationTime = this.lastNotificationTimes[notificationKey] || 0;
            const now_ms = now.getTime();

            if (DEBUG.enabled) {
                console.log('Not working and past start time:');
                console.log('Minutes late:', minutesLate);
                console.log(
                    'Last notification:',
                    new Date(lastNotificationTime).toLocaleTimeString()
                );
                console.log('Should notify:', now_ms - lastNotificationTime > 5 * 60 * 1000);
            }

            // Only show notification if we haven't shown one in the last 5 minutes
            if (now_ms - lastNotificationTime > 5 * 60 * 1000) {
                if (minutesLate >= 15 && minutesLate < 30) {
                    console.log('Sending first morning reminder...');
                    notificationManager.scheduleNotification(
                        'late-start',
                        'Good morning!',
                        `You planned to start at ${userConfig.schedule.startTime.hour}:${String(userConfig.schedule.startTime.minute).padStart(2, '0')}. Don't forget to check in 🚀`,
                        0,
                        false
                    );
                    this.lastNotificationTimes[notificationKey] = now_ms;
                } else if (minutesLate >= 30) {
                    console.log('Sending second morning reminder...');
                    notificationManager.scheduleNotification(
                        'very-late-start',
                        'Still not working?',
                        "Let me know if you're starting later today. ⏰",
                        0,
                        false
                    );
                    this.lastNotificationTimes[notificationKey] = now_ms;
                }
            }
        }

        // Check end time compliance
        if (stateMachine.getState() === WorkState.WORKING && now > scheduledEndTime) {
            const minutesOver = Math.floor(
                (now.getTime() - scheduledEndTime.getTime()) / (60 * 1000)
            );
            const notificationKey = 'end-day-reminder';
            const lastNotificationTime = this.lastNotificationTimes[notificationKey] || 0;
            const now_ms = now.getTime();

            if (now_ms - lastNotificationTime > 5 * 60 * 1000) {
                if (minutesOver >= 0 && minutesOver < 30) {
                    notificationManager.scheduleNotification(
                        'end-of-day',
                        'Great job today!',
                        "You've completed your scheduled hours. Want to wrap up now? 🌟",
                        0,
                        false
                    );
                    this.lastNotificationTimes[notificationKey] = now_ms;
                } else if (minutesOver >= 30) {
                    notificationManager.scheduleNotification(
                        'overtime',
                        'Working Late',
                        "You're over your planned hours. Don't forget to check out! 🏁",
                        0,
                        false
                    );
                    this.lastNotificationTimes[notificationKey] = now_ms;
                }
            }
        }
    }

    public onWorkStateChange(newState: WorkState) {
        const now = getCurrentTimestamp();

        if (DEBUG.enabled) {
            console.log('State change to:', newState, 'at:', new Date(now).toLocaleTimeString());
        }

        switch (newState) {
            case WorkState.WORKING:
                this.continuousWorkStartTime = now;
                this.expectedBreakReturnTime = null;
                break;

            case WorkState.PAUSED:
                this.continuousWorkStartTime = null;
                this.lastBreakTime = now;
                this.expectedBreakReturnTime = now + userConfig.schedule.breakDuration * 60 * 1000;
                if (DEBUG.enabled) {
                    console.log('Break started at:', new Date(now).toLocaleTimeString());
                    console.log(
                        'Expected return at:',
                        new Date(this.expectedBreakReturnTime).toLocaleTimeString()
                    );
                }
                break;

            case WorkState.FINISHED:
                this.continuousWorkStartTime = null;
                this.expectedBreakReturnTime = null;
                this.lastBreakTime = null;
                break;
        }
    }
}
