import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking, Alert, ActionSheetIOS, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import call from 'react-native-phone-call';
import { useTheme } from '../../../theme/ThemeContext';

const CallBar = ({ channel, members = [] }) => {
  const { colors } = useTheme();
  const [calling, setCalling] = useState(false);

  const handlePhoneCall = async () => {
    const phoneNumbers = members
      .filter(m => m.phone || m.mobile)
      .map(m => ({ name: m.name, phone: m.phone || m.mobile }));

    if (phoneNumbers.length === 0) {
      Alert.alert('Error', 'No phone numbers available in this conversation');
      return;
    }

    if (phoneNumbers.length === 1) {
      // Direct call
      try {
        setCalling(true);
        await call({ number: phoneNumbers[0].phone, prompt: true });
      } catch (e) {
        Alert.alert('Error', 'Failed to initiate call');
      } finally {
        setCalling(false);
      }
    } else {
      // Show action sheet for group channels
      const options = phoneNumbers.map(p => `${p.name} (${p.phone})`);
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancel', ...options],
            cancelButtonIndex: 0,
            destructiveButtonIndex: 0,
          },
          async (buttonIndex) => {
            if (buttonIndex > 0) {
              try {
                setCalling(true);
                await call({ number: phoneNumbers[buttonIndex - 1].phone, prompt: true });
              } catch (e) {
                Alert.alert('Error', 'Failed to initiate call');
              } finally {
                setCalling(false);
              }
            }
          }
        );
      } else {
        // Android: show alert with options
        Alert.alert(
          'Call Member',
          'Select a member to call:',
          [
            { text: 'Cancel', style: 'cancel' },
            ...phoneNumbers.map((p, idx) => ({
              text: p.name,
              onPress: async () => {
                try {
                  setCalling(true);
                  await call({ number: p.phone, prompt: true });
                } catch (e) {
                  Alert.alert('Error', 'Failed to initiate call');
                } finally {
                  setCalling(false);
                }
              },
            })),
          ]
        );
      }
    }
  };

  const handleVideoCall = () => {
    const jitsiRoom = `simplesoftws-ch-${channel.id}`;
    const jitsiUrl = `https://meet.jit.si/${jitsiRoom}`;

    Alert.alert(
      'Start Video Call',
      'Open Jitsi Meet to video call?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Open Jitsi Meet',
          onPress: async () => {
            try {
              await Linking.openURL(jitsiUrl);
            } catch (e) {
              Alert.alert('Error', 'Failed to open video call');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary + '15' }]}
        onPress={handlePhoneCall}
        disabled={calling}
      >
        {calling ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <Icon name="call-outline" size={18} color={colors.primary} />
            <Text style={[styles.buttonText, { color: colors.primary }]}>Call</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primary + '15' }]}
        onPress={handleVideoCall}
        disabled={calling}
      >
        <Icon name="videocam-outline" size={18} color={colors.primary} />
        <Text style={[styles.buttonText, { color: colors.primary }]}>Video</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});

export default CallBar;
