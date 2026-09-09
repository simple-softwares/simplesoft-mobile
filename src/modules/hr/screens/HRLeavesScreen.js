import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal, TextInput,
  ScrollView, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import hrService from '../hrService';
import { friendlyError } from '../../../utils/errorUtils';

function daysBetween(from, to) {
  if (!from || !to) return null;
  try {
    const d = (new Date(to) - new Date(from)) / 86400000;
    return Math.round(d) + 1;
  } catch { return null; }
}

const LeaveCard = ({ leave, colors, onApprove, onRefuse, isManager }) => {
  const state   = hrService.STATE_LABELS[leave.state] || { label: leave.state, color: '#9E9E9E' };
  const from    = leave.date_from;
  const to      = leave.date_to;
  const sameDay = from === to;
  const days    = daysBetween(from, to);
  const canAct  = isManager && leave.state === 'confirm';

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[s.cardAccent, { backgroundColor: state.color }]} />
      <View style={s.cardBody}>
        <View style={s.cardTop}>
          <Text style={[s.leaveName, { color: colors.text }]} numberOfLines={1}>
            {leave.holiday_status_name || leave.holiday_status_id?.[1] || leave.name || 'Leave'}
          </Text>
          <View style={[s.stateBadge, { backgroundColor: state.color + '20' }]}>
            <Text style={[s.stateText, { color: state.color }]}>{state.label}</Text>
          </View>
        </View>

        <View style={s.dateRow}>
          <Icon name="calendar-outline" size={13} color={colors.textSecondary} />
          <Text style={[s.dateText, { color: colors.textSecondary }]}>
            {sameDay ? from : `${from} → ${to}`}
            {days ? ` · ${days}d` : ''}
          </Text>
        </View>

        {leave.employee_name && (
          <Text style={[s.empName, { color: colors.textSecondary }]}>
            {leave.employee_name}
          </Text>
        )}

        {leave.name ? (
          <Text style={[s.desc, { color: colors.textSecondary }]} numberOfLines={2}>
            {leave.name}
          </Text>
        ) : null}

        {canAct && (
          <View style={s.actions}>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#4CAF5020', borderColor: '#4CAF5040' }]}
              onPress={() => onApprove(leave.id)}>
              <Icon name="checkmark-outline" size={15} color="#4CAF50" />
              <Text style={[s.actionText, { color: '#4CAF50' }]}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.actionBtn, { backgroundColor: '#F4433620', borderColor: '#F4433640' }]}
              onPress={() => onRefuse(leave.id)}>
              <Icon name="close-outline" size={15} color="#F44336" />
              <Text style={[s.actionText, { color: '#F44336' }]}>Refuse</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const HRLeavesScreen = () => {
  const { colors } = useTheme();

  const [tab,          setTab]          = useState('mine');
  const [myLeaves,     setMyLeaves]     = useState([]);
  const [teamLeaves,   setTeamLeaves]   = useState([]);
  const [leaveTypes,   setLeaveTypes]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form,         setForm]         = useState({ typeId: null, dateFrom: '', dateTo: '', description: '' });
  const [submitting,   setSubmitting]   = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [types, mine, team] = await Promise.all([
        hrService.getLeaveTypes(),
        hrService.getMyLeaves(),
        hrService.getTeamLeaves(),
      ]);
      setLeaveTypes(types || []);
      setMyLeaves(mine || []);
      setTeamLeaves(team || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    try {
      await hrService.approveLeave(id);
      load(true);
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    }
  };

  const handleRefuse = (id) => {
    Alert.alert('Refuse Leave', 'Refuse this leave request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Refuse', style: 'destructive', onPress: async () => {
        try { await hrService.refuseLeave(id); load(true); }
        catch (e) { Alert.alert('Error', friendlyError(e)); }
      }},
    ]);
  };

  const handleSubmit = async () => {
    if (!form.typeId) { Alert.alert('Validation', 'Select a leave type'); return; }
    if (!form.dateFrom || !form.dateTo) { Alert.alert('Validation', 'Enter both dates'); return; }
    setSubmitting(true);
    try {
      await hrService.createLeave({
        holiday_status_id: form.typeId,
        date_from:         form.dateFrom,
        date_to:           form.dateTo,
        name:              form.description || 'Leave Request',
      });
      setModalVisible(false);
      setForm({ typeId: null, dateFrom: '', dateTo: '', description: '' });
      load(true);
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const data = tab === 'mine' ? myLeaves : teamLeaves;

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
        <Text style={[s.headerTitle, { color: colors.text }]}>Leaves</Text>
        {tab === 'mine' && (
          <TouchableOpacity
            style={[s.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setModalVisible(true)}>
            <Icon name="add" size={18} color="#fff" />
            <Text style={s.addBtnText}>Request</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={[s.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {[{ key: 'mine', label: 'My Leaves' }, { key: 'team', label: 'Pending Approval' }].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabItem, tab === t.key && [s.tabActive, { borderBottomColor: colors.primary }]]}
            onPress={() => setTab(t.key)}>
            <Text style={[s.tabText, { color: tab === t.key ? colors.primary : colors.textSecondary }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={data}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <LeaveCard leave={item} colors={colors} isManager={tab === 'team'}
            onApprove={handleApprove} onRefuse={handleRefuse} />
        )}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="calendar-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              {tab === 'team' ? 'No pending approvals' : 'No leaves found'}
            </Text>
          </View>
        }
      />

      {/* Request Leave Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={[s.modal, { backgroundColor: colors.surface }]}>
            <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[s.modalTitle, { color: colors.text }]}>Request Leave</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.modalBody} keyboardShouldPersistTaps="handled">
              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Leave Type *</Text>
              <View style={s.typeRow}>
                {leaveTypes.map(lt => (
                  <TouchableOpacity
                    key={lt.id}
                    style={[s.typeChip, {
                      borderColor: form.typeId === lt.id ? colors.primary : colors.border,
                      backgroundColor: form.typeId === lt.id ? colors.primary + '15' : colors.inputBackground,
                    }]}
                    onPress={() => setForm(f => ({ ...f, typeId: lt.id }))}>
                    <Text style={[s.typeText, { color: form.typeId === lt.id ? colors.primary : colors.textSecondary }]}>
                      {lt.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>From *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={form.dateFrom}
                onChangeText={v => setForm(f => ({ ...f, dateFrom: v }))}
              />

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>To *</Text>
              <TextInput
                style={[s.input, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={form.dateTo}
                onChangeText={v => setForm(f => ({ ...f, dateTo: v }))}
              />

              <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Reason</Text>
              <TextInput
                style={[s.input, s.textarea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="Optional reason..."
                placeholderTextColor={colors.textSecondary}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                multiline
                numberOfLines={3}
              />
            </ScrollView>
            <TouchableOpacity
              style={[s.submitBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={submitting}>
              {submitting
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitText}>Submit Request</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 20, fontWeight: '700', flex: 1 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  addBtnText:  { color: '#fff', fontWeight: '600', fontSize: 13 },
  tabBar:      { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem:     { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:   {},
  tabText:     { fontSize: 14, fontWeight: '600' },
  list:        { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 100 },
  card:        { flexDirection: 'row', borderRadius: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardAccent:  { width: 4 },
  cardBody:    { flex: 1, padding: 12, gap: 6 },
  cardTop:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  leaveName:   { flex: 1, fontSize: 15, fontWeight: '600' },
  stateBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  stateText:   { fontSize: 11, fontWeight: '700' },
  dateRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dateText:    { fontSize: 12 },
  empName:     { fontSize: 12, fontWeight: '500' },
  desc:        { fontSize: 12 },
  actions:     { flexDirection: 'row', gap: 8, marginTop: 4 },
  actionBtn:   { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  actionText:  { fontSize: 13, fontWeight: '600' },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText:   { fontSize: 15 },
  overlay:     { flex: 1, backgroundColor: '#00000060', justifyContent: 'flex-end' },
  modal:       { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle:  { fontSize: 17, fontWeight: '700', flex: 1 },
  modalBody:   { padding: 20 },
  fieldLabel:  { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  typeRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  typeChip:    { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  typeText:    { fontSize: 13, fontWeight: '500' },
  input:       { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14 },
  textarea:    { minHeight: 80, textAlignVertical: 'top' },
  submitBtn:   { margin: 16, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default HRLeavesScreen;
