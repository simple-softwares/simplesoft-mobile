import ReactNativeBiometrics from 'react-native-biometrics';
import { storage } from '../storage/mmkv';
import { Platform } from 'react-native';

// Fixed: unified key names
const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';
const BIOMETRIC_USER_KEY = 'biometric_user';

class BiometricService {
  constructor() {
    this.rnBiometrics = new ReactNativeBiometrics();
    this.biometricAvailable = false;
    this.biometricType = null;
    this.checkBiometricAvailability();
  }

  async checkBiometricAvailability() {
    try {
      const { available, biometryType } = await this.rnBiometrics.isSensorAvailable();
      this.biometricAvailable = available;
      this.biometricType = biometryType;
      return { available, biometryType };
    } catch (error) {
      return { available: false, biometryType: null };
    }
  }

  getBiometricTypeName() {
    switch (this.biometricType) {
      case 'FaceID': return 'Face ID';
      case 'TouchID': return 'Touch ID';
      case 'Biometrics': return 'Fingerprint';
      default: return 'Biometric';
    }
  }

  async createKeys() {
    try {
      const { publicKey } = await this.rnBiometrics.createKeys();
      return publicKey;
    } catch (error) {
      return null;
    }
  }

  async deleteKeys() {
    try {
      const { keysDeleted } = await this.rnBiometrics.deleteKeys();
      return keysDeleted;
    } catch (error) {
      return false;
    }
  }

  async enableBiometric(username, password) {
    try {
      if (!this.biometricAvailable) {
        throw new Error(`${this.getBiometricTypeName()} is not available on this device`);
      }
      await this.createKeys();
      const timestamp = Date.now().toString();
      const payload = `${username}:${timestamp}`;
      const { success, signature } = await this.rnBiometrics.createSignature({
        promptMessage: `Authenticate to enable ${this.getBiometricTypeName()}`,
        payload,
      });
      if (success) {
        // NOTE: Password stored for Odoo re-auth. Encrypt in v2.
        const credentials = { username, password, timestamp, signature, enabled: true };
        storage.set(BIOMETRIC_CREDENTIALS_KEY, JSON.stringify(credentials));
        storage.set(BIOMETRIC_ENABLED_KEY, 'true');   // FIX: was BIOMETRIC_KEY
        storage.set(BIOMETRIC_USER_KEY, username);
        return { success: true };
      }
      throw new Error('Biometric authentication failed');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  disableBiometric() {
    storage.delete(BIOMETRIC_CREDENTIALS_KEY);
    storage.delete(BIOMETRIC_ENABLED_KEY);   // FIX: was BIOMETRIC_KEY
    storage.delete(BIOMETRIC_USER_KEY);
    this.deleteKeys();
  }

  isBiometricEnabled() {
    return storage.getBoolean(BIOMETRIC_ENABLED_KEY) || false;
  }

  getBiometricUser() {
    return storage.getString(BIOMETRIC_USER_KEY);
  }

  async authenticateWithBiometric() {
    try {
      if (!this.biometricAvailable) throw new Error(`${this.getBiometricTypeName()} is not available`);
      if (!this.isBiometricEnabled()) throw new Error('Biometric login not enabled');
      const credentialsJson = storage.getString(BIOMETRIC_CREDENTIALS_KEY);
      if (!credentialsJson) throw new Error('No stored credentials found');
      const credentials = JSON.parse(credentialsJson);
      const payload = `${credentials.username}:${Date.now()}`;
      const { success } = await this.rnBiometrics.createSignature({
        promptMessage: `Authenticate with ${this.getBiometricTypeName()} to login`,
        payload,
      });
      if (success) {
        return { success: true, username: credentials.username, password: credentials.password };
      }
      throw new Error('Biometric authentication failed');
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async simplePrompt(promptMessage = 'Authenticate to continue') {
    try {
      const { success } = await this.rnBiometrics.simplePrompt({ promptMessage });
      return success;
    } catch (error) {
      return false;
    }
  }

  getSettings() {
    return {
      available: this.biometricAvailable,
      type: this.biometricType,
      typeName: this.getBiometricTypeName(),
      enabled: this.isBiometricEnabled(),
      user: this.getBiometricUser(),
    };
  }
}

export default new BiometricService();
