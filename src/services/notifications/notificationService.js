import {
  getMessaging,
  getToken,
  onMessage,
  onTokenRefresh,
  onNotificationOpenedApp,
  getInitialNotification,
  AuthorizationStatus,
  requestPermission,
} from '@react-native-firebase/messaging';
import notifee, {
  AndroidImportance,
  AndroidVisibility,
  EventType,
} from '@notifee/react-native';
import { Platform, Alert } from 'react-native';
import { notifStorage as storage } from '../storage/storageRegistry';
import { registerFcmToken } from '../../backend/RestAdapter';

// ── Channel IDs ───────────────────────────────────────────────
const CHANNEL = {
  task:    'tasks',
  comment: 'comments',
  team:    'team',
  chat:    'chat_messages',
};

const getChannel = (type) => {
  if (type === 'task_comment')  return CHANNEL.comment;
  if (type === 'team_invite')   return CHANNEL.team;
  if (type === 'chat_message')  return CHANNEL.chat;
  return CHANNEL.task;
};

class NotificationService {

  // ── Init — call once when user logs in ───────────────────
  async init(userId) {
    // Respect the user's in-app toggle
    if (storage.getString('notif_enabled') === 'false') return false;

    try {
      const messaging = getMessaging();

      // Request permission
      const authStatus = await requestPermission(messaging);
      const enabled    =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        return false;
      }

      // Create Android channels
      await this.createChannels();

      // Get + register FCM token
      const token = await getToken(messaging);
      if (token) {
        await this.registerToken(userId, token);
        storage.set('fcm_token', token);
      }

      // Refresh token listener
      onTokenRefresh(messaging, async newToken => {
        await this.registerToken(userId, newToken);
        storage.set('fcm_token', newToken);
      });

      return true;
    } catch (e) {
      return false;
    }
  }

  // ── Create Android notification channels ─────────────────
  async createChannels() {
    if (Platform.OS !== 'android') return;
    await notifee.createChannel({
      id: CHANNEL.task,   name: 'Tasks',    importance: AndroidImportance.HIGH,    vibration: true,  sound: 'default', visibility: AndroidVisibility.PUBLIC,
    });
    await notifee.createChannel({
      id: CHANNEL.comment, name: 'Comments', importance: AndroidImportance.HIGH,   vibration: true,  sound: 'default', visibility: AndroidVisibility.PUBLIC,
    });
    await notifee.createChannel({
      id: CHANNEL.team,   name: 'Team',     importance: AndroidImportance.DEFAULT, vibration: false, sound: 'default', visibility: AndroidVisibility.PUBLIC,
    });
    await notifee.createChannel({
      id: CHANNEL.chat,   name: 'Chat Messages', importance: AndroidImportance.HIGH, vibration: true,  sound: 'default', visibility: AndroidVisibility.PUBLIC,
    });
  }

  // ── Register FCM token with the backend ─────────────────
  async registerToken(userId, token) {
    try {
      await registerFcmToken(token);
    } catch (e) {
    }
  }

  // ── Foreground handler — show notifee notification ───────
  setupForegroundHandler(navigation) {
    const messaging = getMessaging();

    // FCM foreground — display real notification via notifee
    const unsubFcm = onMessage(messaging, async remoteMessage => {
      if (storage.getString('notif_enabled') === 'false') return;
      const { title, body } = remoteMessage.notification || {};
      const data = remoteMessage.data || {};
      const channelId = getChannel(data.type);

      await notifee.displayNotification({
        title: title || 'SimpleSoft Workspace',
        body:  body  || '',
        data,
        android: {
          channelId,
          importance:  AndroidImportance.HIGH,
          smallIcon:   'ic_notification',
          pressAction: { id: 'default' },
          actions: data.type === 'task_assigned' || data.type === 'task_comment'
            ? [{ title: 'View task', pressAction: { id: 'view' } }]
            : [],
        },
      });
    });

    // Notifee foreground event — handle tap + action buttons
    const unsubNotifee = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
        const data = detail.notification?.data || {};
        this.handleNotificationTap(data, navigation);
        notifee.cancelNotification(detail.notification.id);
      }
    });

    return () => { unsubFcm(); unsubNotifee(); };
  }

  // ── Background + quit handlers ────────────────────────────
  setupBackgroundHandler(navigation) {
    const messaging = getMessaging();

    // App was in background — user tapped notification
    onNotificationOpenedApp(messaging, remoteMessage => {
      if (remoteMessage?.data) {
        this.handleNotificationTap(remoteMessage.data, navigation);
      }
    });

    // App was closed — user tapped notification to open
    getInitialNotification(messaging).then(remoteMessage => {
      if (remoteMessage?.data) {
        setTimeout(() => this.handleNotificationTap(remoteMessage.data, navigation), 1000);
      }
    });

    // Notifee initial notification (action button tapped while closed)
    notifee.getInitialNotification().then(notification => {
      if (notification?.notification?.data) {
        setTimeout(() => this.handleNotificationTap(notification.notification.data, navigation), 1000);
      }
    });
  }

  // ── Navigate to correct screen ────────────────────────────
  handleNotificationTap(data, navigation) {
    if (!navigation || !data) return;
    switch (data.type) {
      case 'task_assigned':
      case 'task_comment':
        if (data.task_id) {
          navigation.navigate('Tasks', {
            screen: 'TaskDetail',
            params: { taskId: Number(data.task_id) },
          });
        }
        break;
      case 'team_invite':
        navigation.navigate('Team', { screen: 'TeamList' });
        break;
      case 'project_update':
        navigation.navigate('Projects');
        break;
      case 'chat_message':
        if (data.channel_id) {
          navigation.navigate('Chat', {
            screen: 'ChatThread',
            params: { channelId: Number(data.channel_id), channelName: data.channel_name || 'Chat' },
          });
        }
        break;
      default:
        navigation.navigate('Dashboard');
    }
  }

  // ── Badge count ───────────────────────────────────────────
  async setBadge(count) {
    await notifee.setBadgeCount(count);
  }

  async clearBadge() {
    await notifee.setBadgeCount(0);
  }

  async clearAll() {
    await notifee.cancelAllNotifications();
    await notifee.setBadgeCount(0);
  }
}

export default new NotificationService();
