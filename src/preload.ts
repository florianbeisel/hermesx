// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';
import { UserConfig } from './ConfigManager';

declare global {
    interface Window {
        electronAPI: {
            saveConfig: (config: UserConfig) => void;
            getCredentials: () => Promise<{
                username: string;
                password: string;
            } | null>;
            saveCredentialsToMain: (credentials: {
                username: string;
                password: string;
            }) => Promise<{ success: boolean; error?: string }>;
            clearCredentialsFromMain: () => Promise<{ success: boolean }>;
            saveCredentials?: () => Promise<void>;
            clearCredentials?: () => Promise<void>;
        };
    }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    saveConfig: (config: UserConfig) => {
        console.log('Saving config:', config);
        ipcRenderer.send('save-config', config);
    },
    getCredentials: async () => {
        console.log('Preload: Requesting credentials from main');
        const result = await ipcRenderer.invoke('get-credentials');
        console.log('Preload: Received credentials:', result ? 'Found' : 'Not found');
        return result;
    },
    saveCredentialsToMain: async (credentials: { username: string; password: string }) => {
        console.log('Preload: Saving credentials to main');
        const result = await ipcRenderer.invoke('save-credentials', credentials);
        console.log('Preload: Save result:', result);
        return result;
    },
    clearCredentialsFromMain: async () => {
        console.log('Preload: Clearing credentials');
        const result = await ipcRenderer.invoke('clear-credentials');
        console.log('Preload: Clear result:', result);
        return result;
    },
});
