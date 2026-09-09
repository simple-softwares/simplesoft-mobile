import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import payrollService, { PAYROLL_STATES, fmtINR, fmtMonth } from '../payrollService';

function StatusBadge({ state, colors }) {
  const cfg = PAYROLL_STATES[state] || PAYROLL_STATES.draft;
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg }]}>
      <Icon name={cfg.icon} size={10} color={cfg.color} style={{ marginRight: 3 }} />
      <Text style={[s.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

function RunCard({ run, myLine, isAdmin, onPress, colors }) {
  const cfg = PAYROLL_STATES[run.state] || PAYROLL_STATES.draft;
  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.78}>
      <View style={[s.accent, { backgroundColor: cfg.color }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={[s.month, { color: colors.text }]}>{fmtMonth(run.month)}</Text>
          <StatusBadge state={run.state} colors={colors} />
        </View>
        {isAdmin ? (
          <View style={s.adminRow}>
            <View style={s.metaItem}>
              <Text style={[s.metaLabel, { color: colors.textLight }]}>Total Gross</Text>
              <Text style={[s.metaValue, { color: colors.text }]}>{fmtINR(run.total_gross)}</Text>
            </View>
            <View style={s.metaItem}>
              <Text style={[s.metaLabel, { color: colors.textLight }]}>Net Payout</Text>
              <Text style={[s.metaValue, { color: colors.text }]}>{fmtINR(run.total_net)}</Text>
            </View>
            <View style={s.metaItem}>
              <Text style={[s.metaLabel, { color: colors.textLight }]}>Employees</Text>
              <Text style={[s.metaValue, { color: colors.text }]}>{run.line_count || '—'}</Text>
            </View>
          </View>
        ) : myLine ? (
          <View style={s.employeeRow}>
            <View>
              <Text style={[s.metaLabel, { color: colors.textLight }]}>Your Net Pay</Text>
              <Text style={[s.netSalary, { color: '#10B981' }]}>{fmtINR(myLine.net_salary)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[s.metaLabel, { color: colors.textLight }]}>Days Paid</Text>
              <Text style={[s.metaValue, { color: colors.text }]}>
                {myLine.paid_days}/{myLine.working_days}
              </Text>
            </View>
          </View>
        ) : (
          <Text style={[s.noLine, { color: colors.textLight }]}>No payslip for this run</Text>
        )}
      </View>
      <Icon name="chevron-forward" size={16} color={colors.textLight} />
    </TouchableOpacity>
  );
}

export default function PayrollListScreen({ navigation }) {
  const { colors } = useTheme();
  const user    = useSelector(s => s.auth?.user);
  const isAdmin = user?.is_admin || user?.role === 'admin';

  const [runs,       setRuns]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const data = await payrollService.listRuns();
    setRuns(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Find the current employee's line inside a run (runs may include embedded lines)
  const findMyLine = (run) => {
    if (!run.lines) return null;
    const uname = (user?.name || '').trim().toLowerCase();
    return run.lines.find(l => l.employee_name?.trim().toLowerCase() === uname) || null;
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[s.title, { color: colors.text }]}>Payroll</Text>
          {runs.length > 0 && (
            <Text style={[s.subtitle, { color: colors.textLight }]}>
              {runs.length} payroll run{runs.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 60 }} />
      ) : (
        <FlatList
          data={runs}
          keyExtractor={r => String(r.id)}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />
          }
          renderItem={({ item }) => (
            <RunCard
              run={item}
              myLine={findMyLine(item)}
              isAdmin={isAdmin}
              colors={colors}
              onPress={() => navigation.navigate('PayrollDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="receipt-outline" size={48} color={colors.textLight} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>No payroll runs yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14, borderBottomWidth: 0.5 },
  title:       { fontSize: 20, fontWeight: '800' },
  subtitle:    { fontSize: 12, marginTop: 1 },
  card:        { flexDirection: 'row', alignItems: 'center', marginHorizontal: 14, marginTop: 10,
                 borderRadius: 14, borderWidth: 1, overflow: 'hidden',
                 shadowColor: '#000', shadowOpacity: 0.04,
                 shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 1 },
  accent:      { width: 4, alignSelf: 'stretch' },
  cardBody:    { flex: 1, paddingVertical: 14, paddingHorizontal: 14 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  month:       { fontSize: 16, fontWeight: '700' },
  badge:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7,
                 paddingVertical: 2, borderRadius: 10 },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  adminRow:    { flexDirection: 'row', justifyContent: 'space-between' },
  employeeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  metaItem:    { alignItems: 'flex-start' },
  metaLabel:   { fontSize: 10, fontWeight: '600', marginBottom: 2 },
  metaValue:   { fontSize: 14, fontWeight: '700' },
  netSalary:   { fontSize: 18, fontWeight: '800' },
  noLine:      { fontSize: 12, fontStyle: 'italic' },
  empty:       { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:   { fontSize: 15 },
});
