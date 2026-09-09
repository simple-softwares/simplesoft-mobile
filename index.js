import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance, AndroidVisibility, EventType } from '@notifee/react-native';

// ── Create notification channels (Android requires this) ──────
async function createChannels() {
  await notifee.createChannel({
    id:          'tasks',
    name:        'Task notifications',
    importance:  AndroidImportance.HIGH,
    visibility:  AndroidVisibility.PUBLIC,
    vibration:   true,
    sound:       'default',
  });
  await notifee.createChannel({
    id:          'comments',
    name:        'Comment notifications',
    importance:  AndroidImportance.HIGH,
    visibility:  AndroidVisibility.PUBLIC,
    vibration:   true,
    sound:       'default',
  });
  await notifee.createChannel({
    id:          'team',
    name:        'Team notifications',
    importance:  AndroidImportance.DEFAULT,
    visibility:  AndroidVisibility.PUBLIC,
    vibration:   false,
    sound:       'default',
  });
}

createChannels();

// ── Display a notification using notifee ─────────────────────
async function displayNotification(remoteMessage) {
  const { title, body } = remoteMessage.notification || {};
  const data            = remoteMessage.data || {};

  // Pick channel based on notification type
  let channelId = 'tasks';
  if (data.type === 'task_comment')  channelId = 'comments';
  if (data.type === 'team_invite')   channelId = 'team';

  await notifee.displayNotification({
    title: title || 'SimpleSoft Workspace',
    body:  body  || '',
    data,
    android: {
      channelId,
      importance:   AndroidImportance.HIGH,
      visibility:   AndroidVisibility.PUBLIC,
      smallIcon:    'ic_notification',  // white icon in status bar
      pressAction:  { id: 'default' }, // opens app on tap
      // Action buttons
      actions: data.type === 'task_assigned' || data.type === 'task_comment'
        ? [{ title: 'View task', pressAction: { id: 'view' } }]
        : [],
    },
  });
}

// ── Background FCM handler (app closed / background) ─────────
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  await displayNotification(remoteMessage);
});

// ── Background notifee event handler (action button taps) ────
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.PRESS || type === EventType.ACTION_PRESS) {
    // Navigation handled in App.js via getInitialNotification
    await notifee.cancelNotification(detail.notification.id);
  }
});

AppRegistry.registerComponent(appName, () => App);
