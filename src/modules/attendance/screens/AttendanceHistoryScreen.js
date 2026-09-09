import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import AttendanceService from '../attendanceService';
import { useTheme } from '../../../theme/ThemeContext';
import { friendlyError } from '../../../utils/errorUtils';

const { width } = Dimensions.get('window');

const AttendanceHistoryScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month'); // 'week', 'month'
  const [totalHours, setTotalHours] = useState('0h 0m');

  useFocusEffect(
    React.useCallback(() => {
      loadAttendance();
    }, [period])
  );

  const getPeriodDates = () => {
    const now = new Date();
    let startDate;

    if (period === 'week') {
      const day = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    return { startDate, endDate: now };
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getPeriodDates();
      const [history, hours] = await Promise.all([
        AttendanceService.getAttendanceHistory({ startDate, endDate, limit: 100 }),
        AttendanceService.getWorkingHours(startDate, endDate),
      ]);

      setRecords(history);
      setTotalHours(AttendanceService.formatDuration(parseFloat(hours.totalHours)));
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const groupByDate = (records) => {
    const grouped = {};
    records.forEach(record => {
      if (!record.checkIn) return; // Skip records without check-in
      const dateKey = record.checkIn.toLocaleDateString('en-IN');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(record);
    });
    return grouped;
  };

  const AttendanceRecord = ({ item }) => {
    // Skip records with no check-in time
    if (!item.checkIn) return null;

    return (
      <View style={[s.record, { borderBottomColor: colors.border }]}>
        <View style={s.recordLeft}>
          <View style={[s.dot, { backgroundColor: AttendanceService.getStatusColor('checked_in') }]} />
          <View style={s.recordTimes}>
            <Text style={[s.recordTime, { color: colors.text }]}>
              {AttendanceService.formatTime(item.checkIn)}
            </Text>
            {item.checkOut && (
              <Text style={[s.recordTime, { color: colors.textSecondary }]}>
                {AttendanceService.formatTime(item.checkOut)}
              </Text>
            )}
          </View>
        </View>
        <View style={s.recordRight}>
          <Text style={[s.duration, { color: colors.text }]}>
            {item.duration ? AttendanceService.formatDuration(parseFloat(item.duration)) : 'In progress'}
          </Text>
        </View>
      </View>
    );
  };

  const DateGroup = ({ date, items }) => (
    <View style={{ marginBottom: 24 }}>
      <View style={s.dateHeader}>
        <Text style={[s.dateTitle, { color: colors.text }]}>{date}</Text>
        <Text style={[s.dayTotal, { color: colors.textSecondary }]}>
          {items.reduce((sum, item) => sum + (parseFloat(item.duration) || 0), 0).toFixed(1)}h
        </Text>
      </View>
      {items.map((item, idx) => (
        <AttendanceRecord key={idx} item={item} />
      ))}
    </View>
  );

  const grouped = groupByDate(records);
  const dateGroupsArray = Object.entries(grouped).sort(([a], [b]) => new Date(b) - new Date(a));

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Summary Card */}
      <View style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.summaryContent}>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>
            Total Hours ({period === 'week' ? 'This Week' : 'This Month'})
          </Text>
          <Text style={[s.summaryValue, { color: colors.text }]}>{totalHours}</Text>
        </View>
        <View style={s.summaryDivider} />
        <View style={s.summaryContent}>
          <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Records</Text>
          <Text style={[s.summaryValue, { color: colors.text }]}>{records.length}</Text>
        </View>
      </View>

      {/* Period Selector */}
      <View style={s.periodSelector}>
        {['week', 'month'].map(p => (
          <TouchableOpacity
            key={p}
            style={[
              s.periodBtn,
              period === p && { backgroundColor: colors.primary },
              { borderColor: colors.border },
            ]}
            onPress={() => setPeriod(p)}>
            <Text style={[s.periodBtnText, { color: period === p ? '#fff' : colors.text }]}>
              {p === 'week' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Records List */}
      {records.length === 0 ? (
        <View style={[s.empty, { marginTop: 40 }]}>
          <Icon name="calendar-outline" size={48} color={colors.textSecondary} />
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>No records found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.listContent}>
          {dateGroupsArray.map(([date, items]) => (
            <DateGroup key={date} date={date} items={items} />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  summaryContent: { flex: 1, padding: 16, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700' },
  summaryDivider: { width: 1, backgroundColor: 'rgba(0,0,0,0.05)' },
  periodSelector: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  periodBtn: { flex: 1, borderRadius: 8, borderWidth: 1, paddingVertical: 10, alignItems: 'center' },
  periodBtnText: { fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  dateHeader: { marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  dateTitle: { fontSize: 13, fontWeight: '700' },
  dayTotal: { fontSize: 12 },
  record: {
    borderBottomWidth: 1,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  recordTimes: { gap: 2 },
  recordTime: { fontSize: 13, fontWeight: '600' },
  recordRight: { alignItems: 'flex-end' },
  duration: { fontSize: 12, fontWeight: '700' },
  notes: { fontSize: 11, marginTop: 2 },
  empty: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, marginTop: 8 },
});

export default AttendanceHistoryScreen;
