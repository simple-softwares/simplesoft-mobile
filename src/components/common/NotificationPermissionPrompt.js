import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, Platform, Linking,
} from 'react-native';
import notifee, { AuthorizationStatus } from '@notifee/react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { MMKV } from 'react-native-mmkv';
import { useTheme } from '../../theme/ThemeContext';

const storage = new MMKV({ id: 'app-prefs' });

const NotificationPermissionPrompt = () => {
  const { colors }      = useTheme();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show once — check if already asked
    const alreadyAsked = storage.getBoolean('notif_permission_asked');
    if (alreadyAsked) return;

    // Check current permission status
    const check = async () => {
      const settings = await notifee.getNotificationSettings();
      if (settings.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
        // Small delay so it doesn't show immediately on launch
        setTimeout(() => setVisible(true), 2000);
      }
    };
    check();
  }, []);

  const handleEnable = async () => {
    storage.set('notif_permission_asked', true);
    setVisible(false);

    if (Platform.OS === 'android') {
      // Android 13+ needs explicit permission request
      await notifee.requestPermission();
      // Check if granted, if not open settings
      const settings = await notifee.getNotificationSettings();
      if (settings.authorizationStatus !== AuthorizationStatus.AUTHORIZED) {
        Linking.openSettings();
      }
    } else {
      await notifee.requestPermission();
    }
  };

  const handleSkip = () => {
    storage.set('notif_permission_asked', true);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* Icon */}
          <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
            <Icon name="notifications" size={36} color={colors.primary} />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Stay on top of your work
          </Text>

          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Get notified when tasks are assigned to you, teammates comment,
            or you receive team invites.
          </Text>

          {/* Preview items */}
          {[
            { icon: 'checkbox-outline',     color: '#2196F3', text: 'New task assigned to you'      },
            { icon: 'chatbubble-outline',    color: '#9C27B0', text: 'Comment on your task'          },
            { icon: 'people-outline',        color: '#059669', text: 'Team invite received'           },
          ].map((item, i) => (
            <View key={i} style={[styles.previewRow, { borderBottomColor: colors.divider }]}>
              <View style={[styles.previewIcon, { backgroundColor: item.color + '18' }]}>
                <Icon name={item.icon} size={16} color={item.color} />
              </View>
              <Text style={[styles.previewText, { color: colors.text }]}>{item.text}</Text>
            </View>
          ))}

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.enableBtn, { backgroundColor: colors.primary }]}
            onPress={handleEnable}>
            <Icon name="notifications-outline" size={18} color="#fff" />
            <Text style={styles.enableText}>Enable notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>
              Not now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const S = StyleSheet;
const styles = S.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card:        { borderRadius: 20, padding: 24, width: '100%', maxWidth: 360, alignItems: 'center' },
  iconWrap:    { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:       { fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  body:        { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  previewRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', paddingVertical: 10, borderBottomWidth: S.hairlineWidth },
  previewIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  previewText: { fontSize: 13, fontWeight: '500' },
  enableBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 20 },
  enableText:  { color: '#fff', fontWeight: '700', fontSize: 15 },
  skipBtn:     { paddingVertical: 12, marginTop: 4 },
  skipText:    { fontSize: 13 },
});

export default NotificationPermissionPrompt;
