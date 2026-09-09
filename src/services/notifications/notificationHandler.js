import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'notification_history';
const MAX_HISTORY = 50;

// ── Lazy-load Firebase messaging so the app doesn't crash
//    if google-services.json isn't configured yet ──────────────
let messaging = null;
const getMessaging = () => {
  if (!messaging) {
    try { messaging = require('@react-native-firebase/messaging').default; }
    catch { messaging = null; }
  }
  return messaging;
};

let notifee = null;
const getNotifee = () => {
  if (!notifee) {
    try { notifee = require('@notifee/react-native').default; }
    catch { notifee = null; }
  }
  return notifee;
};

class NotificationHandler {

  // ── Setup ────────────────────────────────────────────────────

  async configure() {
    try {
      const m = getMessaging();
      if (!m) return;

      // Request permission
      const authStatus = await m().requestPermission();
      const enabled = authStatus === 1 || authStatus === 2; // AUTHORIZED or PROVISIONAL
      if (!enabled) return;

      // FCM token
      const token = await m().getToken();
      if (token) await AsyncStorage.setItem('fcm_token', token);

      // Foreground messages
      m().onMessage(async remoteMessage => {
        await this.storeNotification({
          title:   remoteMessage.notification?.title || 'New notification',
          message: remoteMessage.notification?.body  || '',
          data:    remoteMessage.data || {},
        });
        // Show local notification via notifee
        await this._displayLocal(remoteMessage);
      });

      // Background / quit tap
      m().onNotificationOpenedApp(remoteMessage => {
        this.storeNotification({
          title:   remoteMessage.notification?.title || 'Notification',
          message: remoteMessage.notification?.body  || '',
          data:    remoteMessage.data || {},
        });
      });

    } catch (e) {
    }
  }

  async _displayLocal(remoteMessage) {
    try {
      const n = getNotifee();
      if (!n) return;
      const channelId = await n.createChannel({ id: 'default', name: 'Default' });
      await n.displayNotification({
        title: remoteMessage.notification?.title,
        body:  remoteMessage.notification?.body,
        android: { channelId, pressAction: { id: 'default' } },
      });
    } catch (e) {
    }
  }

  // ── Storage helpers ──────────────────────────────────────────

  async getNotifications() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  async storeNotification({ title, message, data = {} }) {
    try {
      const history = await this.getNotifications();
      history.unshift({
        id:        Date.now(),
        title:     title  || 'Notification',
        message:   message || '',
        data,
        timestamp: new Date().toISOString(),
        read:      false,
      });
      if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
    }
  }

  async markAsRead(notificationId) {
    try {
      const history = await this.getNotifications();
      const updated = history.map(n => n.id === notificationId ? { ...n, read: true } : n);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  async markAllRead() {
    try {
      const history = await this.getNotifications();
      const updated = history.map(n => ({ ...n, read: true }));
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  }

  async clearAll() {
    try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
  }

  async getUnreadCount() {
    const history = await this.getNotifications();
    return history.filter(n => !n.read).length;
  }

  async getFcmToken() {
    return AsyncStorage.getItem('fcm_token');
  }
}

export default new NotificationHandler();
