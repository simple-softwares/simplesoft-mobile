import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Linking, TextInput, Modal, Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import AttendanceService from '../attendanceService';
import { useTheme } from '../../../theme/ThemeContext';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import UpgradePrompt from '../../../components/UpgradePrompt';
import { friendlyError } from '../../../utils/errorUtils';


const { width } = Dimensions.get('window');

const AttendanceScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { hasAccess, upgradePrompt, closePrompt } = useFeatureAccess();

  if (!hasAccess('attendance')) {
    return <UpgradePrompt {...upgradePrompt} onClose={closePrompt} />;
  }

  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState('0h 0m');
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [overrideTime, setOverrideTime] = useState('');
  const timerRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      loadStatus();
      const timer = setInterval(() => {
        if (status?.status === 'checked_in') {
          const elapsed = Math.floor(
            (new Date() - new Date(status.checkIn)) / 1000
          );
          const hours = Math.floor(elapsed / 3600);
          const mins = Math.floor((elapsed % 3600) / 60);
          setElapsedTime(`${hours}h ${mins}m`);
        }
      }, 60000);
      timerRef.current = timer;
      return () => clearInterval(timer);
    }, [status?.status])
  );

  const loadStatus = async () => {
    setLoading(true);
    try {
      const today = await AttendanceService.getTodayStatus();
      setStatus(today);
      if (today.status === 'checked_in') {
        const hours = Math.floor(today.elapsedSeconds / 3600);
        const mins = Math.floor((today.elapsedSeconds % 3600) / 60);
        setElapsedTime(`${hours}h ${mins}m`);
        setCheckInTime(today.checkIn);
      }
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const requestGPS = async () => {
    setGpsError(null);
    try {
      if (Platform.OS !== 'web') {
        const granted = await requestLocationPermission();
        if (!granted) {
          setGpsError('Location permission denied');
          return null;
        }
      }

      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          setGpsError('GPS timeout - using offline mode');
          resolve(null);
        }, 5000);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeout);
            const { latitude, longitude } = pos.coords;
            setGpsLocation({ latitude, longitude });
            resolve({ latitude, longitude });
          },
          () => {
            clearTimeout(timeout);
            setGpsError('GPS unavailable - using offline mode');
            resolve(null);
          }
        );
      });
    } catch (e) {
      setGpsError('GPS error - using offline mode');
      return null;
    }
  };

  const performCheckIn = async () => {
    setActionLoading(true);
    try {
      await AttendanceService.checkIn({});

      setShowCheckInModal(false);
      await loadStatus();

      Alert.alert('Success', 'Checked in successfully');
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const performCheckOut = async () => {
    if (!status?.id) {
      Alert.alert('Error', 'No active check-in found');
      return;
    }

    setActionLoading(true);
    try {
      const overrideDate = overrideTime
        ? new Date(overrideTime)
        : undefined;

      await AttendanceService.checkOut(status.id, {
        overrideTime: overrideDate,
      });

      setOverrideTime('');
      setShowCheckOutModal(false);
      await loadStatus();

      Alert.alert('Success', 'Checked out successfully');
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckInPress = () => {
    setShowCheckInModal(true);
  };

  const handleCheckOutPress = () => {
    setShowCheckOutModal(true);
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isCheckedIn = status?.status === 'checked_in';
  const isCheckedOut = status?.status === 'checked_out';

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Status Card */}
        <View style={[s.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.statusHeader}>
            <Icon
              name={isCheckedIn ? 'checkmark-circle' : 'ellipse'}
              size={24}
              color={AttendanceService.getStatusColor(status?.status)}
            />
            <Text style={[s.statusText, { color: colors.text }]}>
              {AttendanceService.getStatusLabel(status?.status)}
            </Text>
          </View>

          {isCheckedIn && (
            <View style={s.timeInfo}>
              <Text style={[s.elapsedLabel, { color: colors.textSecondary }]}>Elapsed Time</Text>
              <Text style={[s.elapsedTime, { color: colors.text }]}>{elapsedTime}</Text>
              <Text style={[s.checkInTime, { color: colors.textSecondary }]}>
                Checked in at {AttendanceService.formatTime(status?.checkIn)}
              </Text>
            </View>
          )}

          {isCheckedOut && (
            <View style={s.timeInfo}>
              <Text style={[s.workDuration, { color: colors.text }]}>
                Worked: {AttendanceService.formatDuration(status?.duration)}
              </Text>
              <Text style={[s.timeRange, { color: colors.textSecondary }]}>
                {AttendanceService.formatTime(status?.checkIn)} – {AttendanceService.formatTime(status?.checkOut)}
              </Text>
            </View>
          )}
        </View>


        {/* Action Buttons */}
        {!isCheckedIn && !isCheckedOut && (
          <TouchableOpacity
            style={[s.mainBtn, { backgroundColor: colors.primary }, actionLoading && { opacity: 0.6 }]}
            onPress={handleCheckInPress}
            disabled={actionLoading}>
            {actionLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="play-circle" size={20} color="#fff" />
                <Text style={s.mainBtnText}>Check In</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isCheckedIn && (
          <TouchableOpacity
            style={[s.mainBtn, { backgroundColor: '#DC2626' }, actionLoading && { opacity: 0.6 }]}
            onPress={handleCheckOutPress}
            disabled={actionLoading}>
            {actionLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="stop-circle" size={20} color="#fff" />
                <Text style={s.mainBtnText}>Check Out</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {isCheckedOut && (
          <TouchableOpacity
            style={[s.mainBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('AttendanceHistory')}>
            <Icon name="calendar" size={20} color="#fff" />
            <Text style={s.mainBtnText}>View History</Text>
          </TouchableOpacity>
        )}

        {/* Quick Stats */}
        {isCheckedOut && (
          <View style={[s.statsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.statItem}>
              <Icon name="time-outline" size={18} color={colors.primary} />
              <Text style={[s.statLabel, { color: colors.textSecondary }]}>Today</Text>
              <Text style={[s.statValue, { color: colors.text }]}>
                {AttendanceService.formatDuration(status?.duration)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Check In Modal */}
      <Modal visible={showCheckInModal} transparent animationType="slide" onRequestClose={() => setShowCheckInModal(false)}>
        <View style={s.modalWrap}>
          <TouchableOpacity style={s.modalBg} onPress={() => setShowCheckInModal(false)} activeOpacity={1} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Confirm Check In</Text>
            <Text style={[s.sheetSubtitle, { color: colors.textSecondary }]}>
              You are about to check in for today
            </Text>

            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: colors.primary }, actionLoading && { opacity: 0.6 }]}
              onPress={performCheckIn}
              disabled={actionLoading}>
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.submitBtnText}>Check In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Check Out Modal */}
      <Modal visible={showCheckOutModal} transparent animationType="slide" onRequestClose={() => setShowCheckOutModal(false)}>
        <View style={s.modalWrap}>
          <TouchableOpacity style={s.modalBg} onPress={() => setShowCheckOutModal(false)} activeOpacity={1} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>Check Out Time</Text>
            <Text style={[s.sheetSubtitle, { color: colors.textSecondary }]}>Leave blank for current time</Text>

            <View style={[s.noteInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
              <TextInput
                style={[s.noteTextInput, { color: colors.text }]}
                placeholder="HH:MM (e.g., 17:30)"
                placeholderTextColor={colors.textLight}
                value={overrideTime}
                onChangeText={setOverrideTime}
              />
            </View>

            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: colors.primary }, actionLoading && { opacity: 0.6 }]}
              onPress={performCheckOut}
              disabled={actionLoading}>
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.submitBtnText}>Check Out</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 20 },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 20,
    marginBottom: 16,
    marginTop: 16,
  },
  statusHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  statusText: { fontSize: 16, fontWeight: '700' },
  timeInfo: { alignItems: 'center' },
  elapsedLabel: { fontSize: 12, marginBottom: 4 },
  elapsedTime: { fontSize: 28, fontWeight: '700', marginBottom: 8 },
  checkInTime: { fontSize: 12 },
  workDuration: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  timeRange: { fontSize: 12 },
  gpsCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gpsText: { fontSize: 12 },
  errorCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorText: { fontSize: 12, flex: 1 },
  mainBtn: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  mainBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  statsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: { alignItems: 'center', gap: 8 },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 16, fontWeight: '700' },
  // Modals
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '60%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sheetSubtitle: { fontSize: 12, marginBottom: 16 },
  noteInput: { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  noteTextInput: { fontSize: 14, minHeight: 80 },
  submitBtn: { borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default AttendanceScreen;
