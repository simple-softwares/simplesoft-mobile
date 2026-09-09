import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import attendanceService from '../attendanceService';

const LogCard = ({ log, colors }) => {
  const checkIn  = attendanceService.formatTime(log.check_in);
  const checkOut = log.check_out ? attendanceService.formatTime(log.check_out) : null;
  const dateStr  = attendanceService.formatDate(log.check_in);
  const duration = attendanceService.formatDuration(log.worked_hours);
  const isOpen   = !log.check_out;

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[s.accentBar, { backgroundColor: isOpen ? '#4CAF50' : colors.primary }]} />
      <View style={s.cardContent}>
        <View style={s.topRow}>
          <Text style={[s.dateText, { color: colors.text }]}>{dateStr}</Text>
          {isOpen
            ? <View style={[s.badge, { backgroundColor: '#4CAF5020' }]}>
                <View style={[s.dot, { backgroundColor: '#4CAF50' }]} />
                <Text style={[s.badgeText, { color: '#4CAF50' }]}>Active</Text>
              </View>
            : <Text style={[s.duration, { color: colors.primary }]}>{duration}</Text>}
        </View>

        <View style={s.timeRow}>
          <View style={s.timeItem}>
            <Icon name="log-in-outline" size={14} color="#4CAF50" />
            <Text style={[s.timeLabel, { color: colors.textSecondary }]}>In</Text>
            <Text style={[s.timeValue, { color: colors.text }]}>{checkIn}</Text>
          </View>
          <View style={[s.timeDash, { backgroundColor: colors.border }]} />
          <View style={s.timeItem}>
            <Icon name="log-out-outline" size={14} color={isOpen ? colors.textLight : '#F44336'} />
            <Text style={[s.timeLabel, { color: colors.textSecondary }]}>Out</Text>
            <Text style={[s.timeValue, { color: isOpen ? colors.textLight : colors.text }]}>
              {checkOut || '—'}
            </Text>
          </View>
          {!isOpen && (
            <>
              <View style={[s.timeDash, { backgroundColor: colors.border }]} />
              <View style={s.timeItem}>
                <Icon name="time-outline" size={14} color={colors.primary} />
                <Text style={[s.timeLabel, { color: colors.textSecondary }]}>Hours</Text>
                <Text style={[s.timeValue, { color: colors.primary }]}>{duration}</Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const AttendanceMyLogsScreen = () => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);

  const [employee,   setEmployee]   = useState(null);
  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [weekHours,  setWeekHours]  = useState(0);
  const [monthHours, setMonthHours] = useState(0);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      let emp = employee;
      if (!emp) {
        emp = await attendanceService.getMyEmployee(user?.uid);
        setEmployee(emp);
      }
      if (!emp) return;

      const data = await attendanceService.getMyLogs(emp.id, { limit: 30 });
      setLogs(data || []);

      // Calculate week and month totals
      const now    = new Date();
      const monday = new Date(now); monday.setDate(now.getDate() - now.getDay() + 1); monday.setHours(0,0,0,0);
      const month1 = new Date(now.getFullYear(), now.getMonth(), 1);

      let wk = 0, mo = 0;
      (data || []).forEach(l => {
        const d = new Date(l.check_in?.replace(' ', 'T') + 'Z');
        if (d >= monday) wk += l.worked_hours || 0;
        if (d >= month1) mo += l.worked_hours || 0;
      });
      setWeekHours(wk);
      setMonthHours(mo);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, employee]);

  useEffect(() => { load(); }, []);

  if (loading) {
    return <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>My Logs</Text>
      </View>

      <FlatList
        data={logs}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <LogCard log={item} colors={colors} />}
        ListHeaderComponent={
          <View style={s.summaryRow}>
            <View style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon name="calendar-outline" size={20} color="#2196F3" />
              <Text style={[s.summaryValue, { color: colors.text }]}>
                {attendanceService.formatDuration(weekHours)}
              </Text>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>This Week</Text>
            </View>
            <View style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Icon name="stats-chart-outline" size={20} color="#9C27B0" />
              <Text style={[s.summaryValue, { color: colors.text }]}>
                {attendanceService.formatDuration(monthHours)}
              </Text>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>This Month</Text>
            </View>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="time-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No attendance records</Text>
          </View>
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:  { fontSize: 20, fontWeight: '700' },
  list:         { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 100, gap: 4 },
  summaryRow:   { flexDirection: 'row', gap: 10, marginBottom: 10 },
  summaryCard:  { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  summaryValue: { fontSize: 16, fontWeight: '700', flex: 1 },
  summaryLabel: { fontSize: 11 },
  card:         { flexDirection: 'row', borderRadius: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  accentBar:    { width: 4 },
  cardContent:  { flex: 1, padding: 12, gap: 8 },
  topRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateText:     { fontSize: 14, fontWeight: '600' },
  duration:     { fontSize: 14, fontWeight: '700' },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dot:          { width: 6, height: 6, borderRadius: 3 },
  badgeText:    { fontSize: 11, fontWeight: '700' },
  timeRow:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeItem:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeLabel:    { fontSize: 11 },
  timeValue:    { fontSize: 13, fontWeight: '600' },
  timeDash:     { width: StyleSheet.hairlineWidth, height: 20 },
  empty:        { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:    { fontSize: 15 },
});

export default AttendanceMyLogsScreen;
