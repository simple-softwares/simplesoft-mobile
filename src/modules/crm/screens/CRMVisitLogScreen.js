import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, FlatList as FL,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import crmService from '../crmService';

const PURPOSES = ['Demo', 'Follow-up', 'Installation', 'Collection', 'Survey', 'Complaint', 'Cold Visit', 'Other'];
const OUTCOMES = ['Interested', 'Not Interested', 'Follow-up Required', 'Order Placed', 'Deal Closed', 'Revisit Later', 'No Response'];

const OUTCOME_COLOR = {
  'Interested':            '#4CAF50',
  'Order Placed':          '#4CAF50',
  'Deal Closed':           '#4CAF50',
  'Not Interested':        '#F44336',
  'Follow-up Required':    '#FF9800',
  'Revisit Later':         '#FF9800',
  'No Response':           '#9E9E9E',
};

// ── Inline option picker ─────────────────────────────────────────────────
const OptionPicker = ({ visible, title, options, selected, onSelect, onClose, colors }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={op.backdrop} activeOpacity={1} onPress={onClose} />
    <View style={[op.sheet, { backgroundColor: colors.surface }]}>
      <View style={[op.handle, { backgroundColor: colors.border }]} />
      <Text style={[op.title, { color: colors.text }]}>{title}</Text>
      {options.map(opt => (
        <TouchableOpacity
          key={opt}
          style={[op.item, { borderBottomColor: colors.border }]}
          onPress={() => { onSelect(opt); onClose(); }}>
          {selected === opt && <Icon name="checkmark" size={16} color={colors.primary} />}
          <Text style={[op.itemText, { color: colors.text, marginLeft: selected === opt ? 8 : 24 }]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </Modal>
);

const op = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: '#00000040' },
  sheet:     { maxHeight: '60%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 34 },
  handle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title:     { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  item:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  itemText:  { fontSize: 15 },
});

// ── Visit card ───────────────────────────────────────────────────────────
const VisitCard = ({ visit, onEdit, onDelete, colors }) => {
  const outcomeColor = OUTCOME_COLOR[visit.outcome] || '#9E9E9E';
  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={s.cardTop}>
        <View style={s.cardLeft}>
          <Text style={[s.cardContact, { color: colors.text }]}>{visit.contact_name || '—'}</Text>
          <Text style={[s.cardDate, { color: colors.textSecondary }]}>
            <Icon name="calendar-outline" size={12} /> {visit.visit_date || '—'}
            {visit.distance_km ? `  ·  ${visit.distance_km} km` : ''}
          </Text>
        </View>
        <View style={s.cardActions}>
          <TouchableOpacity onPress={onEdit} style={s.iconBtn}>
            <Icon name="create-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={s.iconBtn}>
            <Icon name="trash-outline" size={18} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.badges}>
        {visit.purpose && (
          <View style={[s.badge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[s.badgeText, { color: colors.primary }]}>{visit.purpose}</Text>
          </View>
        )}
        {visit.outcome && (
          <View style={[s.badge, { backgroundColor: outcomeColor + '18' }]}>
            <Text style={[s.badgeText, { color: outcomeColor }]}>{visit.outcome}</Text>
          </View>
        )}
      </View>

      {visit.notes ? (
        <Text style={[s.notes, { color: colors.textSecondary }]} numberOfLines={2}>{visit.notes}</Text>
      ) : null}

      {visit.next_follow_up ? (
        <Text style={[s.followUp, { color: '#FF9800' }]}>
          <Icon name="alarm-outline" size={12} /> Follow-up: {visit.next_follow_up}
        </Text>
      ) : null}
    </View>
  );
};

// ── Visit form modal ─────────────────────────────────────────────────────
const VisitForm = ({ visible, visit, onClose, onSaved, colors }) => {
  const inp = [f.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }];

  const today = new Date().toISOString().split('T')[0];

  const [contact,    setContact]    = useState('');
  const [visitDate,  setVisitDate]  = useState(today);
  const [distance,   setDistance]   = useState('');
  const [purpose,    setPurpose]    = useState('');
  const [outcome,    setOutcome]    = useState('');
  const [notes,      setNotes]      = useState('');
  const [followUp,   setFollowUp]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [purposePicker, setPurposePicker] = useState(false);
  const [outcomePicker, setOutcomePicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setContact(visit?.contact_name   || '');
      setVisitDate(visit?.visit_date   || today);
      setDistance(visit?.distance_km != null ? String(visit.distance_km) : '');
      setPurpose(visit?.purpose        || '');
      setOutcome(visit?.outcome        || '');
      setNotes(visit?.notes            || '');
      setFollowUp(visit?.next_follow_up || '');
    }
  }, [visible, visit]);

  const handleSave = async () => {
    if (!contact.trim()) { Alert.alert('Required', 'Contact name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        contact_name:   contact.trim(),
        visit_date:     visitDate.trim() || today,
        distance_km:    distance ? parseFloat(distance) : undefined,
        purpose:        purpose  || undefined,
        outcome:        outcome  || undefined,
        notes:          notes.trim() || undefined,
        next_follow_up: followUp.trim() || undefined,
      };
      if (visit?.id) {
        await crmService.updateVisitLog(visit.id, payload);
      } else {
        await crmService.createVisitLog(payload);
      }
      onSaved();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={[f.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={f.headerBtn}>
            <Text style={{ color: colors.primary, fontSize: 15 }}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[f.headerTitle, { color: colors.text }]}>{visit ? 'Edit Visit' : 'Log Visit'}</Text>
          <TouchableOpacity onPress={handleSave} style={f.headerBtn} disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={colors.primary} />
              : <Text style={{ color: colors.primary, fontSize: 15, fontWeight: '700' }}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={[f.label, { color: colors.textSecondary }]}>Contact / Company *</Text>
            <TextInput style={inp} value={contact} onChangeText={setContact} placeholder="Customer name" placeholderTextColor={colors.textSecondary} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={[f.label, { color: colors.textSecondary }]}>Visit Date</Text>
              <TextInput style={inp} value={visitDate} onChangeText={setVisitDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[f.label, { color: colors.textSecondary }]}>Distance (km)</Text>
              <TextInput style={inp} value={distance} onChangeText={setDistance} placeholder="0" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />
            </View>
          </View>
          <View>
            <Text style={[f.label, { color: colors.textSecondary }]}>Purpose</Text>
            <TouchableOpacity style={[f.picker, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setPurposePicker(true)}>
              <Text style={{ flex: 1, fontSize: 15, color: purpose ? colors.text : colors.textSecondary }}>{purpose || 'Select purpose…'}</Text>
              <Icon name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View>
            <Text style={[f.label, { color: colors.textSecondary }]}>Outcome</Text>
            <TouchableOpacity style={[f.picker, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setOutcomePicker(true)}>
              <Text style={{ flex: 1, fontSize: 15, color: outcome ? colors.text : colors.textSecondary }}>{outcome || 'Select outcome…'}</Text>
              <Icon name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View>
            <Text style={[f.label, { color: colors.textSecondary }]}>Next Follow-up Date</Text>
            <TextInput style={inp} value={followUp} onChangeText={setFollowUp} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textSecondary} />
          </View>
          <View>
            <Text style={[f.label, { color: colors.textSecondary }]}>Notes</Text>
            <TextInput style={[inp, { minHeight: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={notes} onChangeText={setNotes} placeholder="Visit summary…" placeholderTextColor={colors.textSecondary} multiline />
          </View>
        </ScrollView>

        <OptionPicker visible={purposePicker} title="Purpose" options={PURPOSES} selected={purpose} onSelect={setPurpose} onClose={() => setPurposePicker(false)} colors={colors} />
        <OptionPicker visible={outcomePicker} title="Outcome" options={OUTCOMES} selected={outcome} onSelect={setOutcome} onClose={() => setOutcomePicker(false)} colors={colors} />
      </KeyboardAvoidingView>
    </Modal>
  );
};

const f = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn:   { minWidth: 60 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  label:       { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input:       { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  picker:      { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, gap: 8 },
});

// ── Main screen ──────────────────────────────────────────────────────────
const CRMVisitLogScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [visits,     setVisits]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editing,    setEditing]    = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    const data = await crmService.getVisitLogs();
    setVisits(data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setFormVisible(true); };
  const openEdit   = (v)  => { setEditing(v);   setFormVisible(true); };

  const handleDelete = (id) => {
    Alert.alert('Delete Visit', 'Remove this visit log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await crmService.deleteVisitLog(id); load(); }
        catch { Alert.alert('Error', 'Could not delete.'); }
      }},
    ]);
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
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Visit Log</Text>
        <TouchableOpacity style={[s.addBtn, { backgroundColor: colors.primary }]} onPress={openCreate}>
          <Icon name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={visits}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} />}
        renderItem={({ item }) => (
          <VisitCard
            visit={item}
            colors={colors}
            onEdit={() => openEdit(item)}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="map-outline" size={52} color={colors.textLight} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>No visits logged</Text>
            <Text style={[s.emptySub, { color: colors.textSecondary }]}>Tap + to log your first field visit</Text>
          </View>
        }
      />

      <VisitForm
        visible={formVisible}
        visit={editing}
        colors={colors}
        onClose={() => setFormVisible(false)}
        onSaved={() => { setFormVisible(false); load(); }}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  addBtn:      { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  card:        { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, marginBottom: 10, gap: 8 },
  cardTop:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardLeft:    { flex: 1, gap: 3 },
  cardContact: { fontSize: 15, fontWeight: '600' },
  cardDate:    { fontSize: 12 },
  cardActions: { flexDirection: 'row', gap: 4 },
  iconBtn:     { padding: 6 },
  badges:      { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge:       { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText:   { fontSize: 12, fontWeight: '600' },
  notes:       { fontSize: 13, lineHeight: 18 },
  followUp:    { fontSize: 12, fontWeight: '500' },
  empty:       { alignItems: 'center', justifyContent: 'center', paddingVertical: 80, gap: 8 },
  emptyTitle:  { fontSize: 17, fontWeight: '600' },
  emptySub:    { fontSize: 14 },
});

export default CRMVisitLogScreen;
