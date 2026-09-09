import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Alert, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';
import { useTheme } from '../../theme/ThemeContext';

const VoiceRecorder = ({
  onTranscript,
  onRecordingComplete,
  language = 'hi-IN',
  disabled = false,
}) => {
  const { colors } = useTheme();
  const [status,      setStatus]      = useState('idle'); // idle | listening | processing
  const [partialText, setPartialText] = useState('');
  const [finalText,   setFinalText]   = useState('');
  const [duration,    setDuration]    = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef(null);
  const timerRef  = useRef(null);

  useEffect(() => {
    Voice.onSpeechStart   = () => setStatus('listening');
    Voice.onSpeechEnd     = () => setStatus('processing');
    Voice.onSpeechError   = (e) => {
      stopAll();
    };
    Voice.onSpeechPartialResults = (e) => {
      setPartialText(e.value?.[0] || '');
    };
    Voice.onSpeechResults = (e) => {
      const text = e.value?.[0] || '';
      setFinalText(text);
      onTranscript?.(text);
      onRecordingComplete?.({ transcript: text });
      stopAll();
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      clearInterval(timerRef.current);
    };
  }, []);

  const startPulse = () => {
    pulseLoop.current = setInterval(() => {
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 500, useNativeDriver: true }),
      ]).start();
    }, 1000);
  };

  const stopAll = () => {
    clearInterval(pulseLoop.current);
    clearInterval(timerRef.current);
    pulseAnim.setValue(1);
    setStatus('idle');
    setPartialText('');
    setDuration(0);
  };

  const handleStart = async () => {
    if (disabled) return;
    try {
      setFinalText('');
      setPartialText('');
      setDuration(0);
      await Voice.start(language);
      startPulse();
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (e) {
      Alert.alert('Microphone Error', 'Could not start voice input. Check mic permission.');
    }
  };

  const handleStop = async () => {
    try {
      setStatus('processing');
      clearInterval(pulseLoop.current);
      clearInterval(timerRef.current);
      pulseAnim.setValue(1);
      await Voice.stop();
    } catch (e) {
      stopAll();
    }
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <View style={styles.container}>
      {(partialText || finalText) ? (
        <View style={[styles.transcriptBox, { backgroundColor: colors.primary + '15', borderLeftColor: colors.primary }]}>
          <Text style={[styles.transcriptText, { color: colors.text }]} numberOfLines={3}>
            {finalText || partialText}
          </Text>
        </View>
      ) : null}

      {status === 'listening' && (
        <View style={styles.timerRow}>
          <View style={styles.recDot} />
          <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(duration)}</Text>
          <Text style={[styles.langBadge, { color: colors.primary, backgroundColor: colors.primary + '15' }]}>{language}</Text>
        </View>
      )}

      <View style={styles.btnWrap}>
        {status === 'idle' && (
          <TouchableOpacity
            style={[styles.micBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }, disabled && styles.micBtnDisabled]}
            onPress={handleStart}
            disabled={disabled}
            activeOpacity={0.8}>
            <Icon name="mic" size={30} color="#fff" />
          </TouchableOpacity>
        )}

        {status === 'listening' && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity style={styles.stopBtn} onPress={handleStop} activeOpacity={0.8}>
              <Icon name="stop" size={30} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        )}

        {status === 'processing' && (
          <View style={[styles.processingBtn, { backgroundColor: colors.border }]}>
            <ActivityIndicator size="small" color="#fff" />
          </View>
        )}
      </View>

      <Text style={[styles.hint, { color: colors.textLight }]}>
        {status === 'idle'      ? `Tap to speak in ${language}` :
         status === 'listening' ? 'Listening... tap to stop' :
                                  'Processing...'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container:      { alignItems: 'center', paddingVertical: 16 },
  transcriptBox:  { borderRadius: 12, padding: 16, marginBottom: 8, width: '100%', borderLeftWidth: 3 },
  transcriptText: { fontSize: 14, lineHeight: 22 },
  timerRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  recDot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: '#DC2626' },
  timerText:      { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  langBadge:      { fontSize: 10, fontWeight: '600', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  btnWrap:        { marginVertical: 16 },
  micBtn:         { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', elevation: 5, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
  micBtnDisabled: { opacity: 0.4 },
  stopBtn:        { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center', elevation: 5 },
  processingBtn:  { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  hint:           { fontSize: 12, marginTop: 4 },
});

export default VoiceRecorder;
