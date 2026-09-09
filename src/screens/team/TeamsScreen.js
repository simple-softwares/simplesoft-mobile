import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
  TextInput, Modal, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import TeamService from '../../services/team/teamService';
import HRService from '../../modules/hr/hrService';
import { AvatarStack } from '../../components/team/Avatar';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';
import { undoDelete } from '../../utils/undoDelete';

const TEAM_COLORS = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#BE185D','#9333EA'];

// ── Create team modal ─────────────────────────────────────────
const CreateTeamModal = ({ visible, onClose, onCreated, colors }) => {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [color, setColor] = useState(TEAM_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const reset = () => { setName(''); setDesc(''); setColor(TEAM_COLORS[0]); setErr(''); };

  const submit = async () => {
    if (!name.trim()) { setErr('Team name is required'); return; }
    setSaving(true);
    try {
      const idx = TEAM_COLORS.indexOf(color);
      const team = await TeamService.createTeam({ name: name.trim(), description: desc.trim(), color: idx });
      reset(); onClose(); onCreated(team);
    } catch (e) { setErr(friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <View style={s.modalWrap}>
        <TouchableOpacity style={s.modalBg} onPress={() => { reset(); onClose(); }} activeOpacity={1} />
        <View style={[s.sheet, { backgroundColor: colors.surface }]}>
          <View style={[s.sheetHandle, { backgroundColor: colors.border }]} />
          <Text style={[s.sheetTitle, { color: colors.text }]}>New team</Text>

          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Color</Text>
          <View style={s.colorRow}>
            {TEAM_COLORS.map(c => (
              <TouchableOpacity key={c}
                style={[s.colorDotWrap, color === c && { borderColor: c }]}
                onPress={() => setColor(c)} activeOpacity={0.8}>
                <View style={[s.colorDot, { backgroundColor: c }]}>
                  {color === c && <Icon name="checkmark" size={15} color="#fff" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Team name *</Text>
          <View style={[s.fieldInput, { borderColor: err ? colors.error : colors.border, backgroundColor: colors.background }]}>
            <TextInput style={[s.fieldTextInput, { color: colors.text }]} value={name}
              onChangeText={t => { setName(t); setErr(''); }}
              placeholder="e.g. Engineering, Sales..." placeholderTextColor={colors.textLight} autoFocus />
          </View>
          {!!err && <Text style={[s.errText, { color: colors.error }]}>{err}</Text>}

          <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Description <Text style={s.optional}>(optional)</Text></Text>
          <View style={[s.fieldInput, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput style={[s.fieldTextInput, { color: colors.text, minHeight: 64, textAlignVertical: 'top' }]}
              value={desc} onChangeText={setDesc}
              placeholder="What does this team work on?" placeholderTextColor={colors.textLight} multiline />
          </View>

          <View style={s.sheetBtns}>
            <TouchableOpacity style={[s.sheetCancel, { borderColor: colors.border }]} onPress={() => { reset(); onClose(); }}>
              <Text style={[s.sheetCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.sheetSave, { backgroundColor: color }, saving && { opacity: 0.6 }]}
              onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={s.sheetSaveText}>Create</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Main screen ───────────────────────────────────────────────
const PeopleScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [tab, setTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [teams, setTeams] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState(null);
  const searchTimer = useRef(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    const load = async () => {
      try {
        const [emps, teams, depts] = await Promise.all([
          HRService.getEmployees({ search: '', limit: 100 }),
          TeamService.getTeams(),
          HRService.getDepartments(),
        ]);
        if (active) {
          setEmployees(emps);
          setTeams(teams);
          setDepartments(depts);
          setLoading(false);
          setRefreshing(false);
        }
      } catch (e) {
        if (active) { setLoading(false); setRefreshing(false); }
      }
    };
    load();
    return () => { active = false; };
  }, []));

  const handleSearch = (query) => {
    setSearchQuery(query);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const filtered = await HRService.getEmployees({ search: query, limit: 100 });
        setEmployees(filtered);
      } catch (e) {
      }
    }, 300);
  };

  const handleTeamDelete = (team) => {
    if (!TeamService.canManage(team.my_role)) return;
    setTeams(prev => prev.filter(t => t.id !== team.id));
    undoDelete(
      `"${team.name}"`,
      () => TeamService.deleteTeam(team.id).catch(() => {}),
      () => setTeams(prev => [team, ...prev]),
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const [emps, teams, depts] = await Promise.all([
        HRService.getEmployees({ search: '', limit: 100 }),
        TeamService.getTeams(),
        HRService.getDepartments(),
      ]);
      setEmployees(emps);
      setTeams(teams);
      setDepartments(depts);
    } catch (e) {
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const filteredEmps = deptFilter
    ? employees.filter(e => e.department_id?.[0] === deptFilter)
    : employees;

  const fabOnPress = tab === 'teams'
    ? () => setShowCreate(true)
    : tab === 'employees'
    ? () => navigation.navigate('CreateEmployee')
    : undefined;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Summary Stats */}
      <View style={s.summaryRow}>
        {[
          { value: employees.length, label: 'Employees', icon: 'people-outline' },
          { value: teams.length, label: 'Teams', icon: 'folder-outline' },
          { value: departments.length, label: 'Departments', icon: 'grid-outline' },
        ].map(tile => (
          <View key={tile.label} style={[s.summaryTile, { backgroundColor: colors.surface }]}>
            <Icon name={tile.icon} size={20} color={colors.primary} />
            <Text style={[s.summaryValue, { color: colors.text }]}>{tile.value}</Text>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{tile.label}</Text>
          </View>
        ))}
      </View>

      {/* Tab Switcher */}
      <View style={[s.tabRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {[
          { key: 'employees', label: 'Employees', icon: 'people-outline' },
          { key: 'teams', label: 'Teams', icon: 'folder-outline' },
          { key: 'departments', label: 'Departments', icon: 'grid-outline' },
        ].map(t => (
          <TouchableOpacity key={t.key}
            style={[s.tab, tab === t.key && { backgroundColor: colors.primary }]}
            onPress={() => { setTab(t.key); setDeptFilter(null); setSearchQuery(''); }}>
            <Icon name={t.icon} size={15} color={tab === t.key ? '#fff' : colors.textSecondary} />
            <Text style={[s.tabText, { color: tab === t.key ? '#fff' : colors.textSecondary }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Employees Tab */}
      {tab === 'employees' && (
        <>
          <View style={[s.searchBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Icon name="search" size={16} color={colors.textSecondary} />
            <TextInput
              style={[s.searchInput, { color: colors.text }]}
              placeholder="Search employees..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>
          <FlatList
            data={filteredEmps}
            keyExtractor={e => String(e.id)}
            contentContainerStyle={s.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            renderItem={({ item: emp }) => (
              <TouchableOpacity
                style={[s.empCard, { backgroundColor: colors.surface, borderLeftColor: emp.department_id ? colors.primary : colors.border }]}
                onPress={() => navigation.navigate('EmployeeProfile', { employeeId: emp.id, employeeName: emp.name })}>
                <View style={s.empCardHeader}>
                  <View style={s.empInitials}>
                    <Text style={s.empInitialsText}>
                      {emp.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={s.empMeta}>
                    <Text style={[s.empName, { color: colors.text }]}>{emp.name}</Text>
                    <Text style={[s.empJobTitle, { color: colors.textSecondary }]}>{emp.job_title || 'Employee'}</Text>
                  </View>
                  {emp.department_id && (
                    <View style={[s.deptPill, { backgroundColor: colors.primary + '15' }]}>
                      <Text style={[s.deptPillText, { color: colors.primary }]}>
                        {emp.department_id[1]}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={s.empty}>
                <Icon name="people-outline" size={48} color={colors.border} />
                <Text style={[s.emptyTitle, { color: colors.text }]}>No employees</Text>
              </View>
            }
          />
        </>
      )}

      {/* Teams Tab */}
      {tab === 'teams' && (
        <FlatList
          data={teams}
          keyExtractor={t => String(t.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item: team }) => (
            <TouchableOpacity
              style={[s.teamCard, { backgroundColor: colors.surface, borderLeftColor: TeamService.getColor(team.color) }]}
              onPress={() => navigation.navigate('TeamDetail', { teamId: team.id, teamName: team.name })}
              onLongPress={() => handleTeamDelete(team)}
              activeOpacity={0.82}>
              <View style={s.teamCardContent}>
                <View style={s.teamInfo}>
                  <Text style={[s.teamName, { color: colors.text }]}>{team.name}</Text>
                  <View style={s.teamMeta}>
                    <Text style={[s.teamMetaText, { color: colors.textSecondary }]}>
                      {team.member_count} members · {team.task_count} tasks
                    </Text>
                  </View>
                </View>
                {team.members.length > 0 && (
                  <AvatarStack users={team.members.slice(0, 4)} size={24} max={4} />
                )}
              </View>
              {team.my_role && (
                <View style={[s.roleBadge, { backgroundColor: TeamService.getRoleColor(team.my_role) + '18', borderColor: TeamService.getRoleColor(team.my_role) + '40' }]}>
                  <Text style={[s.roleBadgeText, { color: TeamService.getRoleColor(team.my_role) }]}>
                    {TeamService.getRoleLabel(team.my_role)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="folder-outline" size={48} color={colors.border} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>No teams</Text>
            </View>
          }
        />
      )}

      {/* Departments Tab */}
      {tab === 'departments' && (
        <FlatList
          data={departments}
          keyExtractor={d => String(d.id)}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item: dept }) => (
            <TouchableOpacity
              style={[s.deptCard, { backgroundColor: colors.surface }]}
              onPress={() => { setDeptFilter(dept.id); setTab('employees'); }}>
              <View style={s.deptCardContent}>
                <Icon name="folder-outline" size={28} color={colors.primary} />
                <View style={s.deptInfo}>
                  <Text style={[s.deptName, { color: colors.text }]}>{dept.name}</Text>
                  {dept.manager_id && (
                    <Text style={[s.deptManager, { color: colors.textSecondary }]}>
                      Manager: {dept.manager_id[1]}
                    </Text>
                  )}
                </View>
              </View>
              <View style={[s.memberCountPill, { backgroundColor: colors.background }]}>
                <Text style={[s.memberCountText, { color: colors.textSecondary }]}>
                  {dept.member_ids?.length || 0}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="grid-outline" size={48} color={colors.border} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>No departments</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      {fabOnPress && (
        <TouchableOpacity style={[s.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]} onPress={fabOnPress}>
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Team Modal */}
      <CreateTeamModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(t) => {
          setShowCreate(false);
          setTeams(prev => [t, ...prev]);
          navigation.navigate('TeamDetail', { teamId: t.id, teamName: t.name });
        }}
        colors={colors}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  summaryTile: { flex: 1, borderRadius: 8, padding: 12, alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  summaryValue: { fontSize: 16, fontWeight: '800', marginTop: 4 },
  summaryLabel: { fontSize: 9, fontWeight: '500', marginTop: 2 },
  tabRow: { flexDirection: 'row', marginHorizontal: 12, marginBottom: 12, borderRadius: 8, padding: 3, borderWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: 6 },
  tabText: { fontSize: 12, fontWeight: '600' },
  searchBox: { marginHorizontal: 12, marginBottom: 10, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14 },
  list: { paddingHorizontal: 12, paddingBottom: 100 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  // Employee card
  empCard: { borderRadius: 8, marginBottom: 10, padding: 12, borderLeftWidth: 3, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  empCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  empInitials: { width: 40, height: 40, borderRadius: 8, backgroundColor: '#7C3AED20', alignItems: 'center', justifyContent: 'center' },
  empInitialsText: { fontWeight: '700', fontSize: 14, color: '#7C3AED' },
  empMeta: { flex: 1 },
  empName: { fontSize: 14, fontWeight: '600' },
  empJobTitle: { fontSize: 12, marginTop: 2 },
  deptPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  deptPillText: { fontSize: 11, fontWeight: '600' },
  // Team card
  teamCard: { borderRadius: 8, marginBottom: 10, padding: 12, borderLeftWidth: 3, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  teamCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 14, fontWeight: '700' },
  teamMeta: { marginTop: 4 },
  teamMetaText: { fontSize: 12 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, marginTop: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '600' },
  // Department card
  deptCard: { borderRadius: 8, marginBottom: 10, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  deptCardContent: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  deptInfo: { flex: 1 },
  deptName: { fontSize: 14, fontWeight: '600' },
  deptManager: { fontSize: 12, marginTop: 2 },
  memberCountPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  memberCountText: { fontSize: 12, fontWeight: '600' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
  // Modal
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBg: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '700', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { borderWidth: 1, borderRadius: 8, marginBottom: 16 },
  fieldTextInput: { padding: 12, fontSize: 14 },
  errText: { fontSize: 12, marginBottom: 8, marginTop: -8 },
  optional: { fontWeight: '400', textTransform: 'none' },
  colorRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  colorDotWrap: { width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  colorDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sheetBtns: { flexDirection: 'row', gap: 12 },
  sheetCancel: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 8, borderWidth: 1 },
  sheetCancelText: { fontWeight: '600', fontSize: 14 },
  sheetSave: { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 8 },
  sheetSaveText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default PeopleScreen;
