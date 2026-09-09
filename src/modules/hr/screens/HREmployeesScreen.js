import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import UpgradePrompt from '../../../components/UpgradePrompt';
import hrService from '../hrService';
import { usePermissions } from '../../../hooks/usePermissions';

const EmployeeCard = ({ emp, colors, onPress }) => {
  const isIn    = emp.attendance_state === 'checked_in';
  const initial = emp.name?.[0]?.toUpperCase() || '?';
  const dept    = emp.department_id?.[1] || null;
  const job     = emp.job_title || emp.job_id?.[1] || null;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[s.avatar, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[s.avatarText, { color: colors.primary }]}>{initial}</Text>
      </View>
      <View style={s.info}>
        <Text style={[s.empName, { color: colors.text }]} numberOfLines={1}>{emp.name}</Text>
        {job  && <Text style={[s.detail, { color: colors.textSecondary }]} numberOfLines={1}>{job}</Text>}
        {dept && <Text style={[s.detail, { color: colors.textSecondary }]} numberOfLines={1}>{dept}</Text>}
      </View>
      <View style={s.right}>
        {emp.work_email ? (
          <Text style={[s.email, { color: colors.textSecondary }]} numberOfLines={1}>{emp.work_email}</Text>
        ) : null}
        <View style={[s.statusDot, { backgroundColor: isIn ? '#4CAF50' : '#9E9E9E' }]} />
      </View>
    </TouchableOpacity>
  );
};

const HREmployeesScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const user = useSelector(s => s.auth.user);
  const { canManageTeam } = usePermissions(user?.id);
  const { hasAccess, upgradePrompt, closePrompt } = useFeatureAccess();

  if (!hasAccess('hr')) {
    return <UpgradePrompt {...upgradePrompt} onClose={closePrompt} />;
  }

  const [employees,   setEmployees]   = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [search,      setSearch]      = useState('');
  const [deptFilter,  setDeptFilter]  = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [emps, depts] = await Promise.all([
        hrService.getEmployees({ search: '', departmentId: null }),
        hrService.getDepartments(),
      ]);
      setEmployees(emps || []);
      setDepartments(depts || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const visible = employees
    .filter(e => !deptFilter || e.department_id?.[0] === deptFilter)
    .filter(e => !search || e.name?.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Employees</Text>
        <Text style={[s.headerSub, { color: colors.textSecondary }]}>{employees.length} total</Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <EmployeeCard
            emp={item}
            colors={colors}
            onPress={() => navigation.navigate('EmployeeDetail', { employeeId: item.id, name: item.name })}
          />
        )}
        ListHeaderComponent={
          <View style={s.listHeader}>
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
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="close-circle" size={17} color={colors.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Dept filter pills */}
            {departments.length > 0 && (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[{ id: null, name: 'All' }, ...departments]}
                keyExtractor={item => String(item.id ?? 'all')}
                renderItem={({ item: dept }) => {
                  const active = deptFilter === dept.id;
                  return (
                    <TouchableOpacity
                      style={[
                        s.pill,
                        { backgroundColor: active ? colors.primary : colors.inputBackground,
                          borderColor: active ? colors.primary : colors.border },
                      ]}
                      onPress={() => setDeptFilter(dept.id)}>
                      <Text style={[s.pillText, { color: active ? '#fff' : colors.textSecondary }]}>
                        {dept.name}
                      </Text>
                    </TouchableOpacity>
                  );
                }}
                contentContainerStyle={s.pills}
              />
            )}
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />
        }
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="people-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No employees found</Text>
          </View>
        }
      />

      {/* Create Employee FAB — visible only to team managers */}
      {canManageTeam() && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => navigation.navigate('CreateEmployee')}
          activeOpacity={0.8}>
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
  headerSub:   { fontSize: 13 },
  list:        { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 100 },
  listHeader:  { gap: 10, marginBottom: 4 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  pills:       { paddingBottom: 4, gap: 8 },
  pill:        { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: StyleSheet.hairlineWidth },
  pillText:    { fontSize: 13, fontWeight: '500' },
  card:        { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  avatar:      { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 18, fontWeight: '700' },
  info:        { flex: 1, gap: 2 },
  empName:     { fontSize: 15, fontWeight: '600' },
  detail:      { fontSize: 12 },
  right:       { alignItems: 'flex-end', gap: 6 },
  email:       { fontSize: 11, maxWidth: 120 },
  statusDot:   { width: 8, height: 8, borderRadius: 4 },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:   { fontSize: 15 },
  fab:         { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
});

export default HREmployeesScreen;
