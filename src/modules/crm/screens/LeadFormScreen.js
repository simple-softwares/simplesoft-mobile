import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, FlatList, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import crmService from '../crmService';

const PRIORITIES = [
  { value: '0', label: 'Normal',    color: '#9E9E9E' },
  { value: '1', label: 'Low',       color: '#2196F3' },
  { value: '2', label: 'High',      color: '#FF9800' },
  { value: '3', label: 'Very High', color: '#F44336' },
];

// ── Reusable inline picker ────────────────────────────────────────────────
const PickerModal = ({ visible, title, items, onSelect, onClose, colors }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onClose} />
    <View style={[pm.sheet, { backgroundColor: colors.surface }]}>
      <View style={[pm.handle, { backgroundColor: colors.border }]} />
      <Text style={[pm.title, { color: colors.text }]}>{title}</Text>
      <FlatList
        data={items}
        keyExtractor={i => String(i.value)}
        renderItem={({ item }) => (
          <TouchableOpacity style={[pm.item, { borderBottomColor: colors.border }]} onPress={() => { onSelect(item); onClose(); }}>
            {item.color && <View style={[pm.dot, { backgroundColor: item.color }]} />}
            <Text style={[pm.itemText, { color: colors.text }]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  </Modal>
);

const pm = StyleSheet.create({
  backdrop:  { flex: 1, backgroundColor: '#00000040' },
  sheet:     { maxHeight: '55%', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 34 },
  handle:    { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title:     { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  item:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  dot:       { width: 10, height: 10, borderRadius: 5 },
  itemText:  { fontSize: 15 },
});

// ── Field wrapper ─────────────────────────────────────────────────────────
const Field = ({ label, children, colors }) => (
  <View style={f.field}>
    <Text style={[f.label, { color: colors.textSecondary }]}>{label}</Text>
    {children}
  </View>
);

const f = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ── Main screen ──────────────────────────────────────────────────────────
const LeadFormScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { lead } = route.params || {};
  const isEdit = !!lead;

  const inp = [s.input, { color: colors.text, backgroundColor: colors.inputBackground, borderColor: colors.border }];

  const [name,        setName]        = useState(lead?.name        || '');
  const [contact,     setContact]     = useState(lead?.partner_id?.[1] || '');
  const [email,       setEmail]       = useState(lead?.email_from  || '');
  const [phone,       setPhone]       = useState(lead?.phone       || '');
  const [revenue,     setRevenue]     = useState(lead?.expected_revenue ? String(lead.expected_revenue) : '');
  const [deadline,    setDeadline]    = useState(lead?.date_deadline || '');
  const [notes,       setNotes]       = useState(lead?.description  || '');

  const [stage,       setStage]       = useState(lead?.stage_id   ? { value: lead.stage_id[0], label: lead.stage_id[1] }   : null);
  const [priority,    setPriority]    = useState(PRIORITIES.find(p => p.value === (lead?.priority || '0')));
  const [source,      setSource]      = useState(lead?.source_id  ? { value: lead.source_id[0], label: lead.source_id[1] } : null);

  const [stages,      setStages]      = useState([]);
  const [sources,     setSources]     = useState([]);
  const [saving,      setSaving]      = useState(false);

  const [stagePicker,    setStagePicker]    = useState(false);
  const [priorityPicker, setPriorityPicker] = useState(false);
  const [sourcePicker,   setSourcePicker]   = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit Lead' : 'New Lead' });
    Promise.all([crmService.getStages(), crmService.getLeadSources()]).then(([st, so]) => {
      setStages(st.map(s => ({ value: s.id, label: s.name })));
      setSources([{ value: null, label: 'None' }, ...so.map(s => ({ value: s.id, label: s.name }))]);
    });
  }, []);

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Required', 'Lead name is required.'); return; }
    setSaving(true);
    try {
      const payload = {
        name:              name.trim(),
        partner_name:      contact.trim() || undefined,
        email_from:        email.trim()   || undefined,
        phone:             phone.trim()   || undefined,
        expected_revenue:  revenue ? parseFloat(revenue) : undefined,
        stage_id:          stage?.value   || undefined,
        priority:          priority?.value || '0',
        source_id:         source?.value  || undefined,
        date_deadline:     deadline.trim() || undefined,
        description:       notes.trim()   || undefined,
      };
      if (isEdit) {
        await crmService.updateLead(lead.id, payload);
      } else {
        await crmService.createLead(payload);
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.detail || e.message || 'Could not save lead.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Text style={[s.headerCancel, { color: colors.primary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]}>{isEdit ? 'Edit Lead' : 'New Lead'}</Text>
        <TouchableOpacity onPress={handleSave} style={s.headerBtn} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color={colors.primary} />
            : <Text style={[s.headerSave, { color: colors.primary }]}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Basic info */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Field label="Lead Name *" colors={colors}>
            <TextInput style={inp} value={name} onChangeText={setName} placeholder="e.g. Website Redesign Project" placeholderTextColor={colors.textSecondary} />
          </Field>
          <Field label="Contact / Company" colors={colors}>
            <TextInput style={inp} value={contact} onChangeText={setContact} placeholder="Customer or company name" placeholderTextColor={colors.textSecondary} />
          </Field>
          <Field label="Email" colors={colors}>
            <TextInput style={inp} value={email} onChangeText={setEmail} placeholder="contact@example.com" placeholderTextColor={colors.textSecondary} keyboardType="email-address" autoCapitalize="none" />
          </Field>
          <Field label="Phone" colors={colors}>
            <TextInput style={inp} value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" placeholderTextColor={colors.textSecondary} keyboardType="phone-pad" />
          </Field>
        </View>

        {/* Deal info */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Field label="Expected Revenue (₹)" colors={colors}>
            <TextInput style={inp} value={revenue} onChangeText={setRevenue} placeholder="0" placeholderTextColor={colors.textSecondary} keyboardType="numeric" />
          </Field>

          <Field label="Stage" colors={colors}>
            <TouchableOpacity style={[s.picker, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setStagePicker(true)}>
              <Text style={[s.pickerText, { color: stage ? colors.text : colors.textSecondary }]}>{stage?.label || 'Select stage…'}</Text>
              <Icon name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </Field>

          <Field label="Priority" colors={colors}>
            <TouchableOpacity style={[s.picker, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setPriorityPicker(true)}>
              <View style={[s.dot, { backgroundColor: priority?.color || '#9E9E9E' }]} />
              <Text style={[s.pickerText, { color: colors.text }]}>{priority?.label || 'Normal'}</Text>
              <Icon name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </Field>

          <Field label="Lead Source" colors={colors}>
            <TouchableOpacity style={[s.picker, { backgroundColor: colors.inputBackground, borderColor: colors.border }]} onPress={() => setSourcePicker(true)}>
              <Text style={[s.pickerText, { color: source?.value ? colors.text : colors.textSecondary }]}>{source?.label || 'Select source…'}</Text>
              <Icon name="chevron-down" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          </Field>

          <Field label="Expected Close Date (YYYY-MM-DD)" colors={colors}>
            <TextInput style={inp} value={deadline} onChangeText={setDeadline} placeholder="2026-12-31" placeholderTextColor={colors.textSecondary} />
          </Field>
        </View>

        {/* Notes */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Field label="Notes" colors={colors}>
            <TextInput
              style={[inp, s.textarea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes or description…"
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </Field>
        </View>
      </ScrollView>

      <PickerModal visible={stagePicker}    title="Select Stage"    items={stages}     onSelect={setStage}    onClose={() => setStagePicker(false)}    colors={colors} />
      <PickerModal visible={priorityPicker} title="Select Priority" items={PRIORITIES} onSelect={setPriority} onClose={() => setPriorityPicker(false)} colors={colors} />
      <PickerModal visible={sourcePicker}   title="Lead Source"     items={sources}    onSelect={setSource}   onClose={() => setSourcePicker(false)}   colors={colors} />
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn:    { minWidth: 60 },
  headerTitle:  { fontSize: 16, fontWeight: '700' },
  headerCancel: { fontSize: 15 },
  headerSave:   { fontSize: 15, fontWeight: '700' },
  scroll:       { padding: 12, paddingBottom: 60, gap: 12 },
  section:      { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 0 },
  input:        { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  textarea:     { minHeight: 90, paddingTop: 10 },
  picker:       { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, gap: 8 },
  pickerText:   { flex: 1, fontSize: 15 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
});

export default LeadFormScreen;
