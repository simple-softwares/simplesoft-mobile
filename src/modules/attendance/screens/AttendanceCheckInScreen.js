import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import attendanceService from '../attendanceService';

const useClock = () => {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
};

const AttendanceCheckInScreen = () => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);
  const now  = useClock();

  const [employee,       setEmployee]       = useState(null);
  const [openAttendance, setOpenAttendance] = useState(null); // null = checked out
  const [loading,        setLoading]        = useState(true);
  const [acting,         setActing]         = useState(false);
  const [todayHours,     setTodayHours]     = useState(0);

  const isCheckedIn = !!openAttendance;

  const load = useCallback(async () => {
    try {
      const emp = await attendanceService.getMyEmployee(user?.uid);
      if (!emp) { setLoading(false); return; }
      setEmployee(emp);

      const open = await attendanceService.getOpenAttendance(emp.id);
      setOpenAttendance(open);

      // Calculate today's worked hours
      const today = new Date().toISOString().split('T')[0];
      const logs  = await attendanceService.getMyLogs(emp.id, { limit: 20 });
      const todayLogs = logs.filter(l => l.check_in?.startsWith(today));
      const total = todayLogs.reduce((sum, l) => sum + (l.worked_hours || 0), 0);
      // Add current session if checked in
      if (open) {
        const sessionHours = (Date.now() - new Date(open.check_in.replace(' ', 'T') + 'Z').getTime()) / 3600000;
        setTodayHours(total + sessionHours);
      } else {
        setTodayHours(total);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { load(); }, [load]);

  // Live session timer
  const sessionDuration = openAttendance
    ? (Date.now() - new Date(openAttendance.check_in.replace(' ', 'T') + 'Z').getTime()) / 3600000
    : 0;

  const handleToggle = async () => {
    if (!employee || acting) return;
    setActing(true);
    try {
      if (isCheckedIn) {
        await attendanceService.checkOut(openAttendance.id);
      } else {
        await attendanceService.checkIn(employee.id);
      }
      await load();
    } catch (e) {
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  if (!employee) {
    return <View style={[s.center, { backgroundColor: colors.background }]}>
      <Icon name="person-outline" size={56} color={colors.textLight} />
      <Text style={[s.emptyTitle, { color: colors.text }]}>No employee record found</Text>
      <Text style={[s.emptyText, { color: colors.textSecondary }]}>
        Your user account is not linked to an employee
      </Text>
    </View>;
  }

  const accentColor = isCheckedIn ? '#4CAF50' : colors.primary;
  const timeStr     = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const dateStr     = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={s.scroll}
      refreshControl={<RefreshControl refreshing={false} onRefresh={load} colors={[colors.primary]} />}>

      {/* Live clock */}
      <View style={[s.clockCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[s.clockTime, { color: colors.text }]}>{timeStr}</Text>
        <Text style={[s.clockDate, { color: colors.textSecondary }]}>{dateStr}</Text>
      </View>

      {/* Status + big button */}
      <View style={s.buttonSection}>
        <View style={[s.statusRing, {
          borderColor: accentColor,
          shadowColor: accentColor,
          shadowOpacity: isCheckedIn ? 0.3 : 0.1,
          shadowRadius: 20,
          elevation: isCheckedIn ? 10 : 4,
        }]}>
          <TouchableOpacity
            style={[s.mainButton, { backgroundColor: accentColor }]}
            onPress={handleToggle}
            disabled={acting}
            activeOpacity={0.85}>
            {acting
              ? <ActivityIndicator size="large" color="#fff" />
              : <Icon name={isCheckedIn ? 'log-out-outline' : 'log-in-outline'} size={44} color="#fff" />}
          </TouchableOpacity>
        </View>

        <Text style={[s.statusLabel, { color: accentColor }]}>
          {acting ? 'Processing...' : isCheckedIn ? 'Checked In' : 'Checked Out'}
        </Text>

        {isCheckedIn && (
          <Text style={[s.sessionTime, { color: colors.textSecondary }]}>
            Session: {attendanceService.formatDuration(sessionDuration)}
          </Text>
        )}
        {isCheckedIn && openAttendance?.check_in && (
          <Text style={[s.checkInTime, { color: colors.textSecondary }]}>
            Since {attendanceService.formatTime(openAttendance.check_in)}
          </Text>
        )}
      </View>

      {/* Today's summary */}
      <View style={s.statsRow}>
        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="time-outline" size={22} color="#2196F3" />
          <Text style={[s.statValue, { color: colors.text }]}>
            {attendanceService.formatDuration(todayHours)}
          </Text>
          <Text style={[s.statLabel, { color: colors.textSecondary }]}>Today</Text>
        </View>

        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="person-outline" size={22} color="#9C27B0" />
          <Text style={[s.statValue, { color: colors.text }]} numberOfLines={1}>
            {employee.job_title || 'Employee'}
          </Text>
          <Text style={[s.statLabel, { color: colors.textSecondary }]}>Role</Text>
        </View>

        <View style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Icon name="business-outline" size={22} color="#FF9800" />
          <Text style={[s.statValue, { color: colors.text }]} numberOfLines={1}>
            {employee.department_id?.[1] || '—'}
          </Text>
          <Text style={[s.statLabel, { color: colors.textSecondary }]}>Dept</Text>
        </View>
      </View>

      {/* Tip */}
      <Text style={[s.tip, { color: colors.textLight }]}>
        {isCheckedIn
          ? 'Tap the button when you finish your shift'
          : 'Tap the button to start your shift'}
      </Text>
    </ScrollView>
  );
};

const s = StyleSheet.create({
  scroll:       { flexGrow: 1, padding: 16, paddingBottom: 100, gap: 16, alignItems: 'center' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24 },
  emptyTitle:   { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  emptyText:    { fontSize: 14, textAlign: 'center' },
  clockCard:    { width: '100%', alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  clockTime:    { fontSize: 36, fontWeight: '200', letterSpacing: 2 },
  clockDate:    { fontSize: 14 },
  buttonSection:{ alignItems: 'center', gap: 14, paddingVertical: 8 },
  statusRing:   { width: 160, height: 160, borderRadius: 80, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  mainButton:   { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  statusLabel:  { fontSize: 20, fontWeight: '700' },
  sessionTime:  { fontSize: 28, fontWeight: '200' },
  checkInTime:  { fontSize: 14 },
  statsRow:     { flexDirection: 'row', gap: 10, width: '100%' },
  statCard:     { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  statValue:    { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  statLabel:    { fontSize: 11 },
  tip:          { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
});

export default AttendanceCheckInScreen;
