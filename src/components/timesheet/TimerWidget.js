import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import TimesheetService from '../../services/timesheet/timesheetService';
import { useTheme } from '../../theme/ThemeContext';

const TimerWidget = ({ taskId, projectId, taskName, onLogged }) => {
  const { colors } = useTheme();
  const [isRunning,    setIsRunning]    = useState(false);
  const [elapsed,      setElapsed]      = useState(0);
  const [showLogModal, setShowLogModal] = useState(false);
  const [description,  setDescription]  = useState('');
  const [logging,      setLogging]      = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const active = TimesheetService.getActiveTimer();
    if (active && active.taskId === taskId) {
      setIsRunning(true);
      setElapsed(TimesheetService.getElapsedSeconds());
    }
    return () => clearInterval(intervalRef.current);
  }, [taskId]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(TimesheetService.getElapsedSeconds());
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const handleStart = () => {
    TimesheetService.startTimer(taskId, projectId, taskName);
    setElapsed(0);
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
    setShowLogModal(true);
  };

  const handleDiscard = () => {
    Alert.alert('Discard Time?', 'This will delete the tracked time without logging.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => {
        TimesheetService.discardTimer();
        setIsRunning(false);
        setElapsed(0);
        setShowLogModal(false);
      }},
    ]);
  };

  const handleLog = async () => {
    setLogging(true);
    try {
      const result = await TimesheetService.stopAndLog(description);
      setElapsed(0);
      setDescription('');
      setShowLogModal(false);
      Alert.alert('Logged', `${result.hours}h logged successfully`);
      onLogged?.(result);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to log time');
    } finally {
      setLogging(false);
    }
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.timerDisplay}>
          <Icon name="schedule" size={20} color={isRunning ? colors.success : colors.textSecondary} />
          <Text style={[styles.timerText, { color: colors.text }, isRunning && styles.timerTextActive]}>
            {TimesheetService.formatElapsed(elapsed)}
          </Text>
          {isRunning && <View style={styles.pulseDot} />}
        </View>

        <View style={styles.controls}>
          {!isRunning ? (
            <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
              <Icon name="play-arrow" size={20} color="#fff" />
              <Text style={styles.btnText}>Start</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopBtn} onPress={handleStop}>
              <Icon name="stop" size={20} color="#fff" />
              <Text style={styles.btnText}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Modal visible={showLogModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Log Time</Text>
            <Text style={[styles.modalSubtitle, { color: colors.primary }]}>
              Time tracked: {TimesheetService.formatElapsed(elapsed)}
            </Text>
            <TextInput
              style={[styles.descInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="What did you work on? (optional)"
              placeholderTextColor={colors.textLight}
              multiline
              numberOfLines={3}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.discardBtn} onPress={handleDiscard}>
                <Text style={styles.discardBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.logBtn, { backgroundColor: colors.primary }, logging && { opacity: 0.6 }]}
                onPress={handleLog}
                disabled={logging}>
                {logging
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.logBtnText}>Log Time</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 16, borderWidth: 1 },
  timerDisplay: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerText:    { fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  timerTextActive: { color: '#059669' },
  pulseDot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: '#059669' },
  controls:     { flexDirection: 'row', gap: 8 },
  startBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#059669', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 },
  stopBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DC2626', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16 },
  btnText:      { color: '#fff', fontWeight: '600', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle:   { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  modalSubtitle:{ fontSize: 14, fontWeight: '600', marginBottom: 20 },
  descInput:    { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', gap: 12 },
  discardBtn:   { flex: 1, borderWidth: 1, borderColor: '#DC2626', borderRadius: 12, padding: 16, alignItems: 'center' },
  discardBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 14 },
  logBtn:       { flex: 2, borderRadius: 12, padding: 16, alignItems: 'center' },
  logBtnText:   { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default TimerWidget;
