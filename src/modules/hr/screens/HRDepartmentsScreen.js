import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import hrService from '../hrService';
import { usePermissions } from '../../../hooks/usePermissions';
import { friendlyError } from '../../../utils/errorUtils';

const DeptCard = ({ dept, employeeCount, colors, onPress }) => {
  const initial = dept.name?.[0]?.toUpperCase() || '?';
  const manager = dept.manager_id?.[1];
  const parent  = dept.parent_id?.[1];

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[s.avatar, { backgroundColor: colors.primary + '15' }]}>
        <Text style={[s.avatarText, { color: colors.primary }]}>{initial}</Text>
      </View>
      <View style={s.info}>
        <Text style={[s.deptName, { color: colors.text }]}>{dept.name}</Text>
        {parent && (
          <Text style={[s.parent, { color: colors.textSecondary }]}>{parent}</Text>
        )}
        {manager && (
          <View style={s.managerRow}>
            <Icon name="person-outline" size={12} color={colors.textSecondary} />
            <Text style={[s.manager, { color: colors.textSecondary }]}>{manager}</Text>
          </View>
        )}
      </View>
      <View style={[s.countBadge, { backgroundColor: colors.primary + '15' }]}>
        <Text style={[s.countNum, { color: colors.primary }]}>{employeeCount}</Text>
        <Text style={[s.countLabel, { color: colors.primary }]}>staff</Text>
      </View>
    </TouchableOpacity>
  );
};

const HRDepartmentsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);
  const { canManageTeam } = usePermissions(user?.id);

  const [departments,  setDepartments]  = useState([]);
  const [employees,    setEmployees]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [showCreate,   setShowCreate]   = useState(false);
  const [newDeptName,  setNewDeptName]  = useState('');
  const [creating,     setCreating]     = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [depts, emps] = await Promise.all([
        hrService.getDepartments(),
        hrService.getEmployees({}),
      ]);
      setDepartments(depts || []);
      setEmployees(emps || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  // Count employees per department
  const empCountByDept = employees.reduce((acc, emp) => {
    const dId = emp.department_id?.[0];
    if (dId) acc[dId] = (acc[dId] || 0) + 1;
    return acc;
  }, {});

  const totalEmployees = employees.length;

  const handleCreate = async () => {
    if (!newDeptName.trim()) { Alert.alert('Validation', 'Department name is required'); return; }
    setCreating(true);
    try {
      const dept = await hrService.createDepartment({ name: newDeptName.trim() });
      setDepartments(prev => [...prev, dept]);
      setNewDeptName('');
      setShowCreate(false);
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setCreating(false);
    }
  };

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
        <Text style={[s.headerTitle, { color: colors.text }]}>Departments</Text>
        <Text style={[s.headerSub, { color: colors.textSecondary }]}>{departments.length} depts · {totalEmployees} staff</Text>
      </View>

      <FlatList
        data={departments}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <DeptCard
            dept={item}
            employeeCount={empCountByDept[item.id] || 0}
            colors={colors}
            onPress={() => {
              // Placeholder: can navigate to detail view when DepartmentDetail screen exists
              // For now, just show a brief feedback
            }}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />
        }
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="business-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No departments found</Text>
          </View>
        }
      />

      {/* Create Department FAB — visible only to team managers */}
      {canManageTeam() && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
          onPress={() => setShowCreate(true)}
          activeOpacity={0.8}>
          <Icon name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Create Department Modal */}
      <Modal visible={showCreate} transparent animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <View style={s.modalWrap}>
          <TouchableOpacity style={s.modalBg} onPress={() => setShowCreate(false)} activeOpacity={1} />
          <View style={[s.sheet, { backgroundColor: colors.surface }]}>
            <View style={[s.handle, { backgroundColor: colors.border }]} />
            <Text style={[s.sheetTitle, { color: colors.text }]}>New Department</Text>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Department Name *</Text>
            <TextInput
              style={[s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBackground }]}
              placeholder="e.g. Engineering, Sales, HR"
              placeholderTextColor={colors.textSecondary}
              value={newDeptName}
              onChangeText={setNewDeptName}
              autoFocus
            />
            <View style={s.sheetBtns}>
              <TouchableOpacity
                style={[s.cancelBtn, { borderColor: colors.border }]}
                onPress={() => { setNewDeptName(''); setShowCreate(false); }}>
                <Text style={[s.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.saveBtn, { backgroundColor: colors.primary }, creating && { opacity: 0.6 }]}
                onPress={handleCreate}
                disabled={creating}>
                {creating
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.saveText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  card:        { flexDirection: 'row', alignItems: 'center', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  avatar:      { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 20, fontWeight: '700' },
  info:        { flex: 1, gap: 3 },
  deptName:    { fontSize: 15, fontWeight: '600' },
  parent:      { fontSize: 12 },
  managerRow:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  manager:     { fontSize: 12 },
  countBadge:  { alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  countNum:    { fontSize: 22, fontWeight: '800' },
  countLabel:  { fontSize: 10, fontWeight: '600' },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:   { fontSize: 15 },
  fab:         { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8 },
  modalWrap:   { flex: 1, justifyContent: 'flex-end' },
  modalBg:     { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  handle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  sheetTitle:  { fontSize: 17, fontWeight: '700', marginBottom: 16 },
  fieldLabel:  { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  input:       { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, marginBottom: 20 },
  sheetBtns:   { flexDirection: 'row', gap: 12 },
  cancelBtn:   { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10, borderWidth: 1 },
  cancelText:  { fontWeight: '600', fontSize: 14 },
  saveBtn:     { flex: 2, alignItems: 'center', paddingVertical: 13, borderRadius: 10 },
  saveText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default HRDepartmentsScreen;
