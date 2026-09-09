import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import attendanceService from '../attendanceService';

const EmployeeCard = ({ emp, colors }) => {
  const isIn    = emp.attendance_state === 'checked_in';
  const accent  = isIn ? '#4CAF50' : '#9E9E9E';
  const initial = emp.name?.[0]?.toUpperCase() || '?';

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[s.avatar, { backgroundColor: accent + '20' }]}>
        <Text style={[s.avatarText, { color: accent }]}>{initial}</Text>
      </View>
      <View style={s.info}>
        <Text style={[s.empName, { color: colors.text }]} numberOfLines={1}>{emp.name}</Text>
        {emp.job_title && (
          <Text style={[s.jobTitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {emp.job_title}
          </Text>
        )}
        {isIn && emp.last_check_in && (
          <Text style={[s.checkTime, { color: '#4CAF50' }]}>
            In since {attendanceService.formatTime(emp.last_check_in)}
          </Text>
        )}
        {!isIn && emp.last_check_out && (
          <Text style={[s.checkTime, { color: colors.textSecondary }]}>
            Out at {attendanceService.formatTime(emp.last_check_out)}
          </Text>
        )}
      </View>
      <View style={[s.statusBadge, { backgroundColor: accent + '15' }]}>
        <View style={[s.statusDot, { backgroundColor: isIn ? accent : 'transparent', borderColor: accent }]} />
        <Text style={[s.statusText, { color: accent }]}>
          {isIn ? 'In' : 'Out'}
        </Text>
      </View>
    </View>
  );
};

const AttendanceTeamScreen = () => {
  const { colors } = useTheme();

  const [employees,  setEmployees]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [filter,     setFilter]     = useState('all'); // all | in | out

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      // For team view, we'd need to get the user's department or team
      // For now, show a placeholder — this would require team_id from context
      const data = [];
      setEmployees(data || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const inCount  = employees.filter(e => e.attendance_state === 'checked_in').length;
  const outCount = employees.length - inCount;

  const visible = employees
    .filter(e => {
      if (filter === 'in')  return e.attendance_state === 'checked_in';
      if (filter === 'out') return e.attendance_state !== 'checked_in';
      return true;
    })
    .filter(e => !search || e.name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>;
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Team</Text>
        <Text style={[s.headerSub, { color: colors.textSecondary }]}>{employees.length} employees</Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => <EmployeeCard emp={item} colors={colors} />}
        ListHeaderComponent={
          <View style={s.listHeader}>
            {/* Summary */}
            <View style={s.summaryRow}>
              <TouchableOpacity
                style={[s.summaryCard, { backgroundColor: '#4CAF5015', borderColor: '#4CAF5030' }, filter === 'in' && { borderColor: '#4CAF50', borderWidth: 1.5 }]}
                onPress={() => setFilter(f => f === 'in' ? 'all' : 'in')}>
                <Icon name="log-in-outline" size={22} color="#4CAF50" />
                <Text style={[s.summaryNum, { color: '#4CAF50' }]}>{inCount}</Text>
                <Text style={[s.summaryLabel, { color: '#4CAF50' }]}>Checked In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.summaryCard, { backgroundColor: '#9E9E9E15', borderColor: '#9E9E9E30' }, filter === 'out' && { borderColor: '#9E9E9E', borderWidth: 1.5 }]}
                onPress={() => setFilter(f => f === 'out' ? 'all' : 'out')}>
                <Icon name="log-out-outline" size={22} color="#9E9E9E" />
                <Text style={[s.summaryNum, { color: '#9E9E9E' }]}>{outCount}</Text>
                <Text style={[s.summaryLabel, { color: '#9E9E9E' }]}>Checked Out</Text>
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={[s.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Icon name="search-outline" size={17} color={colors.textSecondary} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search employees..."
                placeholderTextColor={colors.textSecondary}
                value={search}
                onChangeText={setSearch}
              />
              {search ? <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="close-circle" size={17} color={colors.textSecondary} />
              </TouchableOpacity> : null}
            </View>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="people-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No employees found</Text>
          </View>
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:  { fontSize: 20, fontWeight: '700', flex: 1 },
  headerSub:    { fontSize: 13 },
  list:         { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 100 },
  listHeader:   { gap: 10, marginBottom: 4 },
  summaryRow:   { flexDirection: 'row', gap: 10 },
  summaryCard:  { flex: 1, alignItems: 'center', padding: 14, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 4 },
  summaryNum:   { fontSize: 28, fontWeight: '800' },
  summaryLabel: { fontSize: 12, fontWeight: '600' },
  searchBar:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  searchInput:  { flex: 1, fontSize: 14, padding: 0 },
  card:         { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  avatar:       { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 18, fontWeight: '700' },
  info:         { flex: 1, gap: 2 },
  empName:      { fontSize: 15, fontWeight: '600' },
  jobTitle:     { fontSize: 12 },
  checkTime:    { fontSize: 12, fontWeight: '500' },
  statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusDot:    { width: 7, height: 7, borderRadius: 4, borderWidth: 1.5 },
  statusText:   { fontSize: 12, fontWeight: '700' },
  empty:        { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:    { fontSize: 15 },
});

export default AttendanceTeamScreen;
