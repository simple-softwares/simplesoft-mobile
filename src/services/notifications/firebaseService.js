/**
 * ============================================================================
 * FIREBASE SERVICE (Wrapper/Adapter)
 *
 * This is now a thin wrapper around NotificationManager.
 * All notification logic has been consolidated into NotificationManager.
 *
 * Use NotificationManager directly for new code.
 * This file is kept for backward compatibility.
 * ============================================================================
 */

import NotificationManager from './NotificationManager';

class FirebaseNotificationService {
  // Delegate to NotificationManager
  async initialize(userId) {
    return NotificationManager.initialize(userId);
  }

  async cleanup() {
    NotificationManager.cleanup();
  }

  async registerTokenWithOdoo() {
    // Already handled in NotificationManager.registerToken()
  }

  async checkPendingNotification() {
    return null; // Notification data is in AsyncStorage, check there
  }

  // Legacy methods for backward compatibility
  async getFCMToken() {
    return NotificationManager.token;
  }

  async setupMessageHandlers() {
    // Already handled in NotificationManager.setupMessageHandlers()
  }
}

export default new FirebaseNotificationService();
