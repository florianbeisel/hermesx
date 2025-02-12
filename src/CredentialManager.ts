import { safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

interface Credentials {
    username: string;
    password: string;
}

export class CredentialManager {
    private credentialsPath: string;

    constructor() {
        // Store encrypted credentials in the user's app data
        const userDataPath =
            process.env.APPDATA ||
            (process.platform === 'darwin'
                ? `${process.env.HOME}/Library/Application Support`
                : `${process.env.HOME}/.config`);

        this.credentialsPath = path.join(userDataPath, 'work-time-tracker', 'credentials.enc');

        // Ensure directory exists
        const dir = path.dirname(this.credentialsPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    public async saveCredentials(credentials: Credentials): Promise<void> {
        console.log('CredentialManager: Saving credentials');
        try {
            if (!safeStorage.isEncryptionAvailable()) {
                console.error('CredentialManager: System encryption not available');
                throw new Error('System encryption is not available');
            }

            const encryptedData = safeStorage.encryptString(JSON.stringify(credentials));
            fs.writeFileSync(this.credentialsPath, encryptedData);
            console.log('CredentialManager: Credentials saved successfully');
        } catch (error) {
            console.error('CredentialManager: Failed to save credentials:', error);
            throw error;
        }
    }

    public getCredentials(): Credentials | null {
        console.log('CredentialManager: Getting credentials');
        try {
            if (!fs.existsSync(this.credentialsPath)) {
                console.log('CredentialManager: No credentials file found');
                return null;
            }

            if (!safeStorage.isEncryptionAvailable()) {
                console.error('CredentialManager: System encryption not available');
                throw new Error('System encryption is not available');
            }

            const encryptedData = fs.readFileSync(this.credentialsPath);
            const decryptedData = safeStorage.decryptString(encryptedData);
            const credentials = JSON.parse(decryptedData);
            console.log('CredentialManager: Credentials retrieved successfully');
            return credentials;
        } catch (error) {
            console.error('CredentialManager: Failed to retrieve credentials:', error);
            return null;
        }
    }

    public clearCredentials(): void {
        try {
            if (fs.existsSync(this.credentialsPath)) {
                fs.unlinkSync(this.credentialsPath);
            }
        } catch (error) {
            console.error('Failed to clear credentials:', error);
            throw error;
        }
    }
}
