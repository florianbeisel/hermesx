import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

export interface WorkSchedule {
    startTime: { hour: number; minute: number };
    workDuration: number; // in hours
    breakDuration: number; // in minutes
    isFlexible: boolean;
    workdays: boolean[]; // Array of 7 booleans, starting with Sunday
}

export interface NotificationPreferences {
    quietMode: boolean;
    smartFlexibility: boolean;
    workModeDetection: boolean;
    autoCheckIn: boolean;
    autoCheckOut: boolean;
    suppressDuringCalls: boolean;
    suppressDuringGaming: boolean;
}

export interface UserConfig {
    schedule: WorkSchedule;
    notifications: NotificationPreferences;
    inactivityThresholds: {
        shortBreakReminder: number; // in minutes
        longBreakReminder: number; // in minutes
        autoBreakSuggestion: number; // in minutes
        autoCheckOut: number; // in minutes
    };
    debug: boolean;
}

// Default configuration
export const defaultConfig: UserConfig = {
    schedule: {
        startTime: { hour: 8, minute: 30 },
        workDuration: 8, // 8 hours
        breakDuration: 30, // 30 minutes
        isFlexible: true,
        workdays: [false, true, true, true, true, true, false], // Mon-Fri
    },
    notifications: {
        quietMode: false,
        smartFlexibility: true,
        workModeDetection: true,
        autoCheckIn: false,
        autoCheckOut: false,
        suppressDuringCalls: true,
        suppressDuringGaming: true,
    },
    inactivityThresholds: {
        shortBreakReminder: 240, // 4 hours
        longBreakReminder: 270, // 4.5 hours
        autoBreakSuggestion: 15, // 15 minutes
        autoCheckOut: 30, // 30 minutes
    },
    debug: false,
};

export class ConfigManager {
    private static readonly CONFIG_FILE = 'user-config.json';
    private configPath: string;

    constructor() {
        this.configPath = app.isPackaged
            ? path.join(app.getPath('userData'), ConfigManager.CONFIG_FILE)
            : path.join(process.cwd(), ConfigManager.CONFIG_FILE);
    }

    public loadConfig(): UserConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const savedConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                // Merge with default config to ensure all fields exist
                return { ...defaultConfig, ...savedConfig };
            }
        } catch (error) {
            console.error('Error loading config:', error);
        }
        return { ...defaultConfig };
    }

    public saveConfig(config: UserConfig): void {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error('Error saving config:', error);
        }
    }

    public updateConfig(partialConfig: Partial<UserConfig>): UserConfig {
        const currentConfig = this.loadConfig();
        const newConfig = { ...currentConfig, ...partialConfig };
        this.saveConfig(newConfig);
        return newConfig;
    }
}
