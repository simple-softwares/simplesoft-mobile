import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import helpdeskService, { HD_PRIORITY_OPTIONS, HD_SOURCE_OPTIONS, HD_PRIORITIES } from '../helpdeskService';

function Label({ text, colors }) {
  return <Text style={[s.label, { color: colors.textSecondary }]}>{text}</Text>;
}

function ChipRow({ options, value, onChange, colors, getLabel, getColor }) {
  return (
    <View style={s.chipsRow}>
      {options.map(opt => {
        const active = value === opt;
        const color  = getColor ? getColor(opt) : colors.primary;
        const label  = getLabel ? getLabel(opt) : opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[s.chip, {
              borderColor:     active ? color : colors.border,
              backgroundColor: active ? color + '18' : colors.background,
            }]}
            onPress={() => onChange(opt)}>
            <Text style={[s.chipText, { color: active ? color : colors.textSecondary }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const SOURCE_LABELS = { internal: 'Internal', phone: 'Phone', email: 'Email', web: 'Web' };
const SOURCE_ICONS  = { internal: 'business-outline', phone: 'call-outline', email: 'mail-outline', web: 'globe-outline' };

export default function NewHelpdeskTicketScreen({ navigation }) {
  const { colors } = useTheme();

  const [subject,       setSubject]       = useState('');
  const [description,   setDescription]   = useState('');
  const [requesterName, setRequesterName] = useState('');
  const [requesterEmail,setRequesterEmail]= useState('');
  const [priority,      setPriority]      = useState('medium');
  const [source,        setSource]        = useState('internal');
  const [categoryId,    setCategoryId]    = useState(null);
  const [categories,    setCategories]    = useState([]);
  const [saving,        setSaving]        = useState(false);

  const inputStyle = [s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];

  useEffect(() => {
    helpdeskService.listCategories().then(setCategories);
  }, []);

  const handleCreate = async () => {
    if (!subject.trim())        { Alert.alert('Error', 'Subject is required');        return; }
    if (!requesterName.trim())  { Alert.alert('Error', 'Requester name is required'); return; }

    setSaving(true);
    try {
      const ticket = await helpdeskService.createTicket({
        subject:         subject.trim(),
        description:     description.trim() || undefined,
        requester_name:  requesterName.trim(),
        requester_email: requesterEmail.trim() || undefined,
        priority,
        source,
        category_id:     categoryId || undefined,
      });
      navigation.replace('HelpdeskDetail', { id: ticket.id });
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || 'Could not create ticket');
      setSaving(false);
    }
  };

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="close-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[s.topTitle, { color: colors.text }]}>New Helpdesk Ticket</Text>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleCreate}
          disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnText}>Create</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* Priority */}
        <View style={s.fieldWrap}>
          <Label text="Priority" colors={colors} />
          <ChipRow
            options={HD_PRIORITY_OPTIONS}
            value={priority}
            onChange={setPriority}
            colors={colors}
            getLabel={k => HD_PRIORITIES[k]?.label || k}
            getColor={k => HD_PRIORITIES[k]?.color || colors.primary}
          />
        </View>

        {/* Source */}
        <View style={s.fieldWrap}>
          <Label text="Source" colors={colors} />
          <ChipRow
            options={HD_SOURCE_OPTIONS}
            value={source}
            onChange={setSource}
            colors={colors}
            getLabel={k => SOURCE_LABELS[k] || k}
          />
        </View>

        {/* Subject */}
        <View style={s.fieldWrap}>
          <Label text="Subject *" colors={colors} />
          <TextInput
            style={inputStyle}
            value={subject}
            onChangeText={setSubject}
            placeholder="Brief description of the issue"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Description */}
        <View style={s.fieldWrap}>
          <Label text="Description" colors={colors} />
          <TextInput
            style={[inputStyle, s.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Detailed description of the problem…"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Requester name */}
        <View style={s.fieldWrap}>
          <Label text="Requester Name *" colors={colors} />
          <TextInput
            style={inputStyle}
            value={requesterName}
            onChangeText={setRequesterName}
            placeholder="Customer or user name"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Requester email */}
        <View style={s.fieldWrap}>
          <Label text="Requester Email (optional)" colors={colors} />
          <TextInput
            style={inputStyle}
            value={requesterEmail}
            onChangeText={setRequesterEmail}
            placeholder="customer@email.com"
            placeholderTextColor={colors.textLight}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Category */}
        {categories.length > 0 && (
          <View style={s.fieldWrap}>
            <Label text="Category (optional)" colors={colors} />
            <View style={s.chipsRow}>
              {categories.map(cat => {
                const active = categoryId === cat.id;
                const color  = cat.color || colors.primary;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.chip, {
                      borderColor:     active ? color : colors.border,
                      backgroundColor: active ? color + '18' : colors.background,
                    }]}
                    onPress={() => setCategoryId(active ? null : cat.id)}>
                    <Text style={[s.chipText, { color: active ? color : colors.textSecondary }]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  topBar:      { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 12,
                 paddingHorizontal: 12, borderBottomWidth: 0.5 },
  backBtn:     { padding: 6 },
  topTitle:    { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  saveBtn:     { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll:      { padding: 16, gap: 4 },
  fieldWrap:   { marginBottom: 18 },
  label:       { fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  input:       { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  textArea:    { minHeight: 90, paddingTop: 10 },
  chipsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:        { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipText:    { fontSize: 13, fontWeight: '600' },
});
