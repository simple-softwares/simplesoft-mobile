import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import AttendanceService from '../../modules/attendance/attendanceService';
import backend from '../../backend/BackendService';

const TODAY = () => new Date().toISOString().split('T')[0];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

// ── Task row ────────────────────────────────────────────────────
const TaskRow = ({ task, colors }) => {
  const today = TODAY();
  const overdue = task.date_deadline && task.date_deadline < today;
  const dueSoon = task.date_deadline && task.date_deadline <= new Date(new Date().getTime() + 3*24*60*60*1000).toISOString().split('T')[0] && !overdue;

  let statusColor = colors.primary;
  let statusIcon = 'checkmark-circle-outline';
  if (overdue) {
    statusColor = '#F44336';
    statusIcon = 'alert-circle-outline';
  } else if (dueSoon) {
    statusColor = '#FF9800';
    statusIcon = 'warning-outline';
  }

  return (
    <View style={[sr.taskRow, { borderBottomColor: colors.divider }]}>
      <Icon name={statusIcon} size={16} color={statusColor} style={{ marginRight: 4 }} />
      <View style={{ flex: 1 }}>
        <Text style={[sr.taskName, { color: colors.text }]} numberOfLines={1}>{task.name}</Text>
        <Text style={[sr.taskSub, { color: colors.textSecondary }]} numberOfLines={1}>
          {task.project_id?.[1] || 'No project'}
          {task.date_deadline
            ? ` · ${new Date(task.date_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
            : ' · No deadline'}
        </Text>
      </View>
      {task.stage_id && (
        <Text style={[sr.stageBadge, { color: statusColor }]} numberOfLines={1}>
          {task.stage_id[1]}
        </Text>
      )}
    </View>
  );
};

// ── Main ────────────────────────────────────────────────────────
const EmployeeHomeScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);

  const [refreshing, setRefreshing]   = useState(false);
  const [attLoading, setAttLoading]   = useState(false);

  const [employee, setEmployee]       = useState(null);
  const [openAtt, setOpenAtt]         = useState(null);   // open hr.attendance record
  const [checkedIn, setCheckedIn]     = useState(false);
  const [checkInTime, setCheckInTime] = useState(null);

  const [tasks, setTasks]             = useState([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.uid) return;

    // ── Attendance ──
    try {
      const emp = await AttendanceService.getMyEmployee(user.uid);
      setEmployee(emp);
      if (emp) {
        const open = await AttendanceService.getOpenAttendance(emp.id);
        setOpenAtt(open || null);
        setCheckedIn(!!open);
        setCheckInTime(open ? new Date(open.check_in.replace(' ', 'T') + 'Z') : null);
      }
    } catch (_) {}

    // ── My assigned tasks (open only) ──
    setTasksLoading(true);
    try {
      const uid = user?.uid || user?.id;
      const rows = await backend.getMyTasks(uid, 15);
      setTasks(rows);
    } catch (_) {
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  }, [user?.uid || user?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleAttendance = async () => {
    if (!employee) {
      Alert.alert('No employee record', 'Your account has no linked HR employee record. Contact your admin.');
      return;
    }
    setAttLoading(true);
    try {
      if (checkedIn && openAtt) {
        await AttendanceService.checkOut(openAtt.id);
        setCheckedIn(false);
        setOpenAtt(null);
        setCheckInTime(null);
        Alert.alert('Checked out', 'Have a great rest of your day!');
      } else {
        const result = await AttendanceService.checkIn(employee.id);
        setCheckedIn(true);
        setOpenAtt({ id: result.id, check_in: result.check_in });
        setCheckInTime(new Date());
        Alert.alert('Checked in', 'Welcome! You\'re now checked in.');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Attendance update failed. Try again.');
    } finally {
      setAttLoading(false);
    }
  };

  const btnColor  = checkedIn ? '#EF4444' : '#10B981';
  const btnIcon   = checkedIn ? 'log-out-outline' : 'log-in-outline';
  const btnLabel  = checkedIn ? 'Check Out' : 'Check In';
  const firstName = (user?.name || '').split(' ')[0];

  const elapsed = useCallback(() => {
    if (!checkedIn || !checkInTime) return null;
    const secs = Math.floor((Date.now() - checkInTime.getTime()) / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return `${h}h ${m}m`;
  }, [checkedIn, checkInTime]);

  return (
    <ScrollView
      style={[sr.screen, { backgroundColor: colors.background }]}
      contentContainerStyle={sr.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}>

      {/* Greeting */}
      <View style={sr.greetRow}>
        <View>
          <Text style={[sr.greetSub, { color: colors.textSecondary }]}>{greeting()},</Text>
          <Text style={[sr.greetName, { color: colors.text }]}>{firstName || 'there'}</Text>
        </View>
        <View style={[sr.datePill, { backgroundColor: colors.surfaceVariant || colors.card }]}>
          <Text style={[sr.dateText, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </View>

      {/* Attendance card */}
      <View style={[sr.attCard, { backgroundColor: colors.surface }]}>
        <View style={sr.attTop}>
          <View>
            <Text style={[sr.attStatus, { color: checkedIn ? '#10B981' : colors.textSecondary }]}>
              {checkedIn ? 'Currently checked in' : 'Not checked in'}
            </Text>
            {checkedIn && checkInTime && (
              <Text style={[sr.attTime, { color: colors.textSecondary }]}>
                Since {checkInTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                {elapsed() ? `  ·  ${elapsed()}` : ''}
              </Text>
            )}
          </View>
          <View style={[sr.statusDot, { backgroundColor: checkedIn ? '#10B98130' : '#9CA3AF20' }]}>
            <View style={[sr.statusDotInner, { backgroundColor: checkedIn ? '#10B981' : '#9CA3AF' }]} />
          </View>
        </View>

        <TouchableOpacity
          style={[sr.attBtn, { backgroundColor: btnColor }]}
          onPress={handleAttendance}
          activeOpacity={0.85}
          disabled={attLoading}>
          {attLoading
            ? <ActivityIndicator color="#fff" />
            : (
              <>
                <Icon name={btnIcon} size={22} color="#fff" />
                <Text style={sr.attBtnLabel}>{btnLabel}</Text>
              </>
            )}
        </TouchableOpacity>
      </View>

      {/* My assigned tasks */}
      <View style={[sr.section, { backgroundColor: colors.surface }]}>
        <View style={sr.sectionHeader}>
          <Icon name="checkbox-outline" size={16} color={colors.primary} />
          <Text style={[sr.sectionTitle, { color: colors.text }]}>My Assigned Tasks</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tasks')} style={sr.seeAll}>
            <Text style={[sr.seeAllText, { color: colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {tasksLoading
          ? <ActivityIndicator style={{ marginVertical: 16 }} color={colors.primary} />
          : tasks.length === 0
            ? (
              <View style={sr.emptyRow}>
                <Icon name="checkmark-circle-outline" size={24} color={colors.success || '#10B981'} />
                <Text style={[sr.emptyText, { color: colors.textSecondary }]}>All clear for today</Text>
              </View>
            )
            : tasks.map(t => <TaskRow key={t.id} task={t} colors={colors} />)
        }
      </View>

    </ScrollView>
  );
};

const sr = StyleSheet.create({
  screen:  { flex: 1 },
  content: { padding: 16, gap: 12 },

  greetRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 4,
  },
  greetSub:  { fontSize: 13, marginBottom: 2 },
  greetName: { fontSize: 22, fontWeight: '700' },
  datePill:  { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dateText:  { fontSize: 12 },

  attCard: {
    borderRadius: 14, padding: 16, gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  attTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  attStatus:    { fontSize: 15, fontWeight: '600' },
  attTime:      { fontSize: 12, marginTop: 2 },
  statusDot:    { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  statusDotInner: { width: 12, height: 12, borderRadius: 6 },

  attBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, borderRadius: 10, paddingVertical: 14,
  },
  attBtnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },

  section: {
    borderRadius: 14, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle:  { fontSize: 14, fontWeight: '600', flex: 1 },
  seeAll:        {},
  seeAllText:    { fontSize: 12 },

  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  taskName:    { fontSize: 14, fontWeight: '500' },
  taskSub:     { fontSize: 12, marginTop: 2 },
  stageBadge:  { fontSize: 10, fontWeight: '600' },

  emptyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 12, justifyContent: 'center',
  },
  emptyText: { fontSize: 13 },
});

export default EmployeeHomeScreen;
