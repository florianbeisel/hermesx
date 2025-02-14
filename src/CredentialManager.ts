import { safeStorage, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

interface Credentials {
  username: string;
  password: string;
}

export class CredentialManager {
  private credentialsPath: string;

  constructor() {
    // Use app.getPath('userData') instead of process.env paths
    const userDataPath = app.getPath('userData');
    this.credentialsPath = path.join(userDataPath, 'credentials.enc');

    // Ensure directory exists
    const dir = path.dirname(this.credentialsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  public async saveCredentials(credentials: Credentials): Promise<void> {
    console.log('CredentialManager: Saving credentials');
    try {
      const isEncryptionAvailable = safeStorage.isEncryptionAvailable();
      console.log(
        'CredentialManager: Encryption available:',
        isEncryptionAvailable
      );

      if (!isEncryptionAvailable) {
        console.warn(
          'CredentialManager: System encryption not available, using fallback'
        );
        // Simple fallback: Base64 encoding (NOT secure, only for development)
        const fallbackData = Buffer.from(JSON.stringify(credentials)).toString(
          'base64'
        );
        fs.writeFileSync(this.credentialsPath, fallbackData);
        console.log(
          'CredentialManager: Credentials saved using fallback method'
        );
        return;
      }

      const encryptedData = safeStorage.encryptString(
        JSON.stringify(credentials)
      );
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

      const isEncryptionAvailable = safeStorage.isEncryptionAvailable();
      console.log(
        'CredentialManager: Encryption available:',
        isEncryptionAvailable
      );

      const fileData = fs.readFileSync(this.credentialsPath);

      if (!isEncryptionAvailable) {
        console.warn(
          'CredentialManager: System encryption not available, using fallback'
        );
        // Simple fallback: Base64 decoding (NOT secure, only for development)
        const fallbackData = Buffer.from(
          fileData.toString(),
          'base64'
        ).toString();
        const credentials = JSON.parse(fallbackData);
        console.log(
          'CredentialManager: Credentials retrieved using fallback method'
        );
        return credentials;
      }

      const decryptedData = safeStorage.decryptString(fileData);
      const credentials = JSON.parse(decryptedData);
      console.log('CredentialManager: Credentials retrieved successfully');
      return credentials;
    } catch (error) {
      console.error(
        'CredentialManager: Failed to retrieve credentials:',
        error
      );
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
