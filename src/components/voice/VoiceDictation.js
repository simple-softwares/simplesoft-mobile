import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';
import { useTheme } from '../../theme/ThemeContext';

/**
 * Drop next to ANY TextInput to add voice typing.
 *
 * Usage:
 *   <TextInput value={text} onChangeText={setText} />
 *   <VoiceDictation onTranscript={t => setText(prev => prev + t)} />
 */
const VoiceDictation = ({ onTranscript, language = 'hi-IN', size = 22 }) => {
  const [status, setStatus] = useState('idle'); // idle | listening | processing

  useEffect(() => {
    Voice.onSpeechResults = (e) => {
      const text = e.value?.[0] || '';
      if (text) onTranscript(text + ' ');
      setStatus('idle');
    };
    Voice.onSpeechError = () => setStatus('idle');
    Voice.onSpeechEnd   = () => setStatus('processing');

    return () => Voice.destroy().then(Voice.removeAllListeners);
  }, []);

  const toggle = async () => {
    if (status === 'listening') {
      try {
        await Voice.stop();
        setStatus('processing');
      } catch { setStatus('idle'); }
    } else {
      try {
        await Voice.start(language);
        setStatus('listening');
      } catch {
        Alert.alert('Permission needed', 'Allow microphone access to use voice input.');
      }
    }
  };

  const iconColor =
    status === 'listening'  ? colors.error :
    status === 'processing' ? colors.warning :
    colors.textSecondary;

  return (
    <TouchableOpacity
      style={styles.btn}
      onPress={toggle}
      disabled={status === 'processing'}
      activeOpacity={0.7}>
      {status === 'processing'
        ? <ActivityIndicator size="small" color={colors.primary} />
        : <Icon name={status === 'listening' ? 'mic' : 'mic-none'} size={size} color={iconColor} />
      }
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
});

export default VoiceDictation;
