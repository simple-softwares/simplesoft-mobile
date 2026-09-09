import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import DocumentPicker from 'react-native-document-picker';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import serviceService, {
  NATURE_OPTIONS, CALL_TYPE_OPTIONS, URGENCY_OPTIONS,
} from '../serviceService';
import { friendlyError } from '../../../utils/errorUtils';

const ACCENT = '#0EA5E9';

// ── Small helpers ─────────────────────────────────────────────────────────────

function Label({ text, required, colors }) {
  return (
    <Text style={[s.label, { color: colors.textSecondary }]}>
      {text}{required ? <Text style={{ color: '#EF4444' }}> *</Text> : null}
    </Text>
  );
}

function SectionHeader({ title, colors }) {
  return (
    <View style={[s.sectionHeader, { borderBottomColor: colors.border }]}>
      <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{title.toUpperCase()}</Text>
    </View>
  );
}

// ── Call Type multi-select checkboxes ─────────────────────────────────────────

function CallTypeSelector({ value, onChange, colors }) {
  const selected = value ? value.split(',').filter(Boolean) : [];

  const toggle = (type) => {
    const next = selected.includes(type)
      ? selected.filter(t => t !== type)
      : [...selected, type];
    onChange(next.join(','));
  };

  return (
    <View style={s.callTypeGrid}>
      {CALL_TYPE_OPTIONS.map(type => {
        const active = selected.includes(type);
        return (
          <TouchableOpacity
            key={type}
            style={[
              s.callTypeBtn,
              { borderColor: active ? ACCENT : colors.border, backgroundColor: active ? ACCENT + '15' : colors.background },
            ]}
            onPress={() => toggle(type)}>
            <View style={[s.callTypeCheck, { borderColor: active ? ACCENT : colors.textLight, backgroundColor: active ? ACCENT : 'transparent' }]}>
              {active && <Icon name="checkmark" size={11} color="#fff" />}
            </View>
            <Text style={[s.callTypeLabel, { color: active ? ACCENT : colors.text }]}>{type}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Date & Time picker field ───────────────────────────────────────────────────

function DateTimeField({ label, value, onChange, colors, required }) {
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const handleDateChange = (_, selected) => {
    setShowDate(false);
    if (!selected) return;
    const next = new Date(value || new Date());
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    onChange(next);
    if (Platform.OS !== 'ios') { setShowTime(true); }
  };

  const handleTimeChange = (_, selected) => {
    setShowTime(false);
    if (!selected) return;
    const next = new Date(value || new Date());
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next);
  };

  const dateStr = value
    ? value.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';
  const timeStr = value
    ? value.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  return (
    <View style={s.fieldWrap}>
      <Label text={label} required={required} colors={colors} />
      <View style={s.dtRow}>
        <TouchableOpacity
          style={[s.dtBtn, { borderColor: colors.border, backgroundColor: colors.background, flex: 1.4 }]}
          onPress={() => setShowDate(true)}>
          <Icon name="calendar-outline" size={15} color={value ? ACCENT : colors.textLight} />
          <Text style={[s.dtText, { color: value ? colors.text : colors.textLight }]}>
            {dateStr || 'Select date'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.dtBtn, { borderColor: colors.border, backgroundColor: colors.background, flex: 1 }]}
          onPress={() => setShowTime(true)}>
          <Icon name="time-outline" size={15} color={value ? ACCENT : colors.textLight} />
          <Text style={[s.dtText, { color: value ? colors.text : colors.textLight }]}>
            {timeStr || 'Time'}
          </Text>
        </TouchableOpacity>
        {value && (
          <TouchableOpacity style={s.dtClear} onPress={() => onChange(null)}>
            <Icon name="close-circle" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {showDate && (
        <DateTimePicker
          value={value || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={handleDateChange}
        />
      )}
      {showTime && (
        <DateTimePicker
          value={value || new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

// ── Picker modal (for Assigned To + Nature of Call) ───────────────────────────

function PickerField({ label, value, onValueChange, items, placeholder, colors, required }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = items.find(i => i.value === value)?.label || '';

  return (
    <View style={s.fieldWrap}>
      <Label text={label} required={required} colors={colors} />
      <TouchableOpacity
        style={[s.pickerBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
        onPress={() => setOpen(true)}>
        <Text style={[s.pickerBtnText, { color: value ? colors.text : colors.textLight }]}>
          {selectedLabel || placeholder}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.textLight} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={s.modalBg} activeOpacity={1} onPress={() => setOpen(false)} />
        <View style={[s.pickerSheet, { backgroundColor: colors.surface }]}>
          <View style={[s.pickerSheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[s.pickerSheetTitle, { color: colors.text }]}>{label}</Text>
            <TouchableOpacity onPress={() => setOpen(false)}>
              <Icon name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Picker
            selectedValue={value || ''}
            onValueChange={(v) => { onValueChange(v || null); setOpen(false); }}
            style={{ color: colors.text }}>
            <Picker.Item label={placeholder} value="" color={colors.textLight} />
            {items.map(item => (
              <Picker.Item key={String(item.value)} label={item.label} value={item.value} color={colors.text} />
            ))}
          </Picker>
        </View>
      </Modal>
    </View>
  );
}

// ── Photo attachment row ───────────────────────────────────────────────────────

function PhotoRow({ photos, onAdd, onRemove, colors }) {
  return (
    <View style={s.attachRow}>
      {photos.map((p, i) => (
        <View key={i} style={s.thumbWrap}>
          <Image source={{ uri: p.uri }} style={s.thumb} />
          <TouchableOpacity style={s.thumbRemove} onPress={() => onRemove(i)}>
            <Icon name="close-circle" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={[s.addAttachBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
        onPress={onAdd}>
        <Icon name="camera-outline" size={22} color={colors.textSecondary} />
        <Text style={[s.addAttachText, { color: colors.textSecondary }]}>Photo</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function NewTicketScreen({ navigation }) {
  const { colors }  = useTheme();
  const currentUser = useSelector(s => s.auth.user);

  // Core fields
  const [manualNumber,     setManualNumber]     = useState('');
  const [useManualNumber,  setUseManualNumber]  = useState(false);
  const [customerName,     setCustomerName]     = useState('');
  const [mobileNumber,     setMobileNumber]     = useState('');
  const [siteLocation,     setSiteLocation]     = useState('');
  const [natureOfCall,     setNatureOfCall]     = useState('Breakdown');
  const [callType,         setCallType]         = useState('');
  const [reportedProblem,  setReportedProblem]  = useState('');
  const [urgency,          setUrgency]          = useState('Normal');

  // Dates
  const [preferredDT,      setPreferredDT]      = useState(null);
  const [targetDT,         setTargetDT]         = useState(null);

  // Assignment
  const [assignedToId,     setAssignedToId]     = useState(null);
  const [users,            setUsers]            = useState([]);

  // Attachments
  const [photos,           setPhotos]           = useState([]);   // { uri, type }
  const [voiceNote,        setVoiceNote]        = useState(null); // { uri, name, type }

  // UI state
  const [saving,           setSaving]           = useState(false);
  const [uploadingFiles,   setUploadingFiles]   = useState(false);

  const inputStyle = [s.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }];

  // Load users for Assigned To dropdown
  useEffect(() => {
    serviceService.listUsers().then(list => setUsers(list || []));
  }, []);

  const userItems = users.map(u => ({ label: u.name, value: u.id }));
  const natureItems = NATURE_OPTIONS.map(n => ({ label: n, value: n }));

  // Pick photos from gallery
  const pickPhoto = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 5 });
      if (result.assets) {
        setPhotos(prev => [...prev, ...result.assets.map(a => ({ uri: a.uri, type: a.type || 'image/jpeg' }))]);
      }
    } catch {}
  };

  // Pick voice note using DocumentPicker
  const pickVoiceNote = async () => {
    try {
      const res = await DocumentPicker.pick({ type: [DocumentPicker.types.audio] });
      const file = Array.isArray(res) ? res[0] : res;
      setVoiceNote({ uri: file.uri, name: file.name, type: file.type || 'audio/m4a' });
    } catch (e) {
      if (!DocumentPicker.isCancel(e)) Alert.alert('Error', 'Could not pick file');
    }
  };

  const handleCreate = async () => {
    if (!customerName.trim()) { Alert.alert('Validation', 'Customer name is required'); return; }
    if (!reportedProblem.trim()) { Alert.alert('Validation', 'Problem description is required'); return; }

    setSaving(true);
    try {
      // Build payload
      const payload = {
        customer_name:     customerName.trim(),
        mobile_number:     mobileNumber.trim() || undefined,
        site_location:     siteLocation.trim() || undefined,
        nature_of_call:    natureOfCall,
        call_type:         callType || undefined,
        reported_problem:  reportedProblem.trim(),
        urgency,
        assigned_to:       assignedToId || undefined,
        assigned_by_name:  currentUser?.name || undefined,
        preferred_datetime: preferredDT ? preferredDT.toISOString() : undefined,
        target_datetime:    targetDT    ? targetDT.toISOString()    : undefined,
      };
      if (useManualNumber && manualNumber.trim()) {
        payload.ticket_number = manualNumber.trim();
      }

      const ticket = await serviceService.createTicket(payload);

      // Upload photos + attach
      if (photos.length > 0 || voiceNote) {
        setUploadingFiles(true);
        try {
          for (const photo of photos) {
            const url = await serviceService.uploadFile(photo.uri, photo.type, 'photo.jpg');
            await serviceService.addTicketPhoto(ticket.id, url);
          }
          if (voiceNote) {
            const url = await serviceService.uploadFile(voiceNote.uri, voiceNote.type, voiceNote.name);
            await serviceService.updateTicket(ticket.id, { voice_note_url: url });
          }
        } catch {
          // Ticket created; file uploads failed — non-fatal
          Alert.alert('Note', 'Ticket created but some file uploads failed. You can add them later.');
        }
        setUploadingFiles(false);
      }

      navigation.replace('ServiceDetail', { id: ticket.id });
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
      setSaving(false);
      setUploadingFiles(false);
    }
  };

  const isBusy = saving || uploadingFiles;
  const busyLabel = uploadingFiles ? 'Uploading…' : 'Creating…';

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn} disabled={isBusy}>
          <Icon name="close-outline" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
        <Text style={[s.topTitle, { color: colors.text }]}>New Service Call</Text>
        <TouchableOpacity
          style={[s.saveBtn, { backgroundColor: ACCENT, opacity: isBusy ? 0.7 : 1 }]}
          onPress={handleCreate}
          disabled={isBusy}>
          {isBusy
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.saveBtnText}>Create</Text>}
        </TouchableOpacity>
      </View>

      {uploadingFiles && (
        <View style={[s.uploadBanner, { backgroundColor: ACCENT + '15' }]}>
          <ActivityIndicator size="small" color={ACCENT} />
          <Text style={[s.uploadBannerText, { color: ACCENT }]}>Uploading attachments…</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Call Details ── */}
        <SectionHeader title="Call Details" colors={colors} />

        {/* Call Number */}
        <View style={s.fieldWrap}>
          <View style={s.labelRow}>
            <Label text="Call Number" colors={colors} />
            <TouchableOpacity onPress={() => { setUseManualNumber(p => !p); setManualNumber(''); }}>
              <Text style={[s.toggleLink, { color: ACCENT }]}>
                {useManualNumber ? 'Use Auto' : 'Enter Manually'}
              </Text>
            </TouchableOpacity>
          </View>
          {useManualNumber ? (
            <TextInput
              style={inputStyle}
              value={manualNumber}
              onChangeText={setManualNumber}
              placeholder="e.g. CL-2026-00042"
              placeholderTextColor={colors.textLight}
              autoCapitalize="characters"
            />
          ) : (
            <View style={[s.autoBadge, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Icon name="flash-outline" size={14} color={ACCENT} />
              <Text style={[s.autoBadgeText, { color: colors.textSecondary }]}>Auto-generated on save</Text>
            </View>
          )}
        </View>

        {/* Customer Name */}
        <View style={s.fieldWrap}>
          <Label text="Customer Name" required colors={colors} />
          <TextInput
            style={inputStyle}
            value={customerName}
            onChangeText={setCustomerName}
            placeholder="Company / customer name"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* Mobile Number */}
        <View style={s.fieldWrap}>
          <Label text="Mobile Number" colors={colors} />
          <TextInput
            style={inputStyle}
            value={mobileNumber}
            onChangeText={setMobileNumber}
            placeholder="+91 XXXXX XXXXX"
            placeholderTextColor={colors.textLight}
            keyboardType="phone-pad"
          />
        </View>

        {/* Site / Location */}
        <View style={s.fieldWrap}>
          <Label text="Site / Location" colors={colors} />
          <TextInput
            style={inputStyle}
            value={siteLocation}
            onChangeText={setSiteLocation}
            placeholder="Address or site name"
            placeholderTextColor={colors.textLight}
          />
        </View>

        {/* ── Classification ── */}
        <SectionHeader title="Classification" colors={colors} />

        {/* Call Type (multi-select) */}
        <View style={s.fieldWrap}>
          <Label text="Call Type" colors={colors} />
          <CallTypeSelector value={callType} onChange={setCallType} colors={colors} />
        </View>

        {/* Nature of Call */}
        <PickerField
          label="Nature of Call"
          value={natureOfCall}
          onValueChange={setNatureOfCall}
          items={natureItems}
          placeholder="Select nature"
          colors={colors}
        />

        {/* Urgency */}
        <View style={s.fieldWrap}>
          <Label text="Urgency" colors={colors} />
          <View style={s.chipsRow}>
            {URGENCY_OPTIONS.map(u => {
              const active = urgency === u;
              const color  = u === 'Critical' ? '#EF4444' : u === 'Urgent' ? '#F59E0B' : '#6366F1';
              return (
                <TouchableOpacity
                  key={u}
                  style={[s.chip, { borderColor: active ? color : colors.border, backgroundColor: active ? color + '18' : colors.background }]}
                  onPress={() => setUrgency(u)}>
                  <Text style={[s.chipText, { color: active ? color : colors.textSecondary }]}>{u}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Scheduling ── */}
        <SectionHeader title="Scheduling" colors={colors} />

        <DateTimeField
          label="Preferred Date & Time"
          value={preferredDT}
          onChange={setPreferredDT}
          colors={colors}
        />

        <DateTimeField
          label="Target Completion Date & Time"
          value={targetDT}
          onChange={setTargetDT}
          colors={colors}
        />

        {/* ── Assignment ── */}
        <SectionHeader title="Assignment" colors={colors} />

        <PickerField
          label="Assigned To (Engineer)"
          value={assignedToId}
          onValueChange={v => setAssignedToId(v ? Number(v) : null)}
          items={userItems}
          placeholder="Select engineer"
          colors={colors}
        />

        {/* Assigned By — read-only, auto-filled from current user */}
        <View style={s.fieldWrap}>
          <Label text="Assigned By" colors={colors} />
          <View style={[s.readonlyField, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
            <Icon name="person-circle-outline" size={16} color={colors.textSecondary} />
            <Text style={[s.readonlyText, { color: colors.textSecondary }]}>
              {currentUser?.name || 'You'}
            </Text>
          </View>
        </View>

        {/* ── Problem Description ── */}
        <SectionHeader title="Problem Description" colors={colors} />

        <View style={s.fieldWrap}>
          <Label text="Remark / Problem Description" required colors={colors} />
          <TextInput
            style={[inputStyle, s.textArea]}
            value={reportedProblem}
            onChangeText={setReportedProblem}
            placeholder="Describe the issue reported by the customer…"
            placeholderTextColor={colors.textLight}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* ── Attachments ── */}
        <SectionHeader title="Attachments" colors={colors} />

        {/* Photos */}
        <View style={s.fieldWrap}>
          <Label text="Photos / Files" colors={colors} />
          <PhotoRow
            photos={photos}
            onAdd={pickPhoto}
            onRemove={i => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
            colors={colors}
          />
        </View>

        {/* Voice Note */}
        <View style={s.fieldWrap}>
          <Label text="Voice Recording" colors={colors} />
          {voiceNote ? (
            <View style={[s.voiceCard, { backgroundColor: colors.surface, borderColor: ACCENT + '40' }]}>
              <Icon name="musical-notes-outline" size={20} color={ACCENT} />
              <Text style={[s.voiceName, { color: colors.text }]} numberOfLines={1}>{voiceNote.name}</Text>
              <TouchableOpacity onPress={() => setVoiceNote(null)}>
                <Icon name="close-circle-outline" size={20} color={colors.textLight} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.voicePickBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={pickVoiceNote}>
              <Icon name="mic-outline" size={20} color={colors.textSecondary} />
              <Text style={[s.voicePickText, { color: colors.textSecondary }]}>Attach Voice Recording</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1 },
  topBar:           { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 12,
                      paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:          { padding: 6 },
  topTitle:         { flex: 1, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  saveBtn:          { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  uploadBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  uploadBannerText: { fontSize: 13, fontWeight: '600' },
  scroll:           { paddingBottom: 40 },

  // Section headers
  sectionHeader:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionTitle:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.7 },

  // Fields
  fieldWrap:        { marginBottom: 16, paddingHorizontal: 16 },
  labelRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  label:            { fontSize: 12, fontWeight: '700', marginBottom: 6, letterSpacing: 0.3 },
  toggleLink:       { fontSize: 12, fontWeight: '600' },
  input:            { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  textArea:         { minHeight: 90, paddingTop: 10 },

  // Auto badge
  autoBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 10,
                      paddingHorizontal: 12, paddingVertical: 10, borderStyle: 'dashed' },
  autoBadgeText:    { fontSize: 13 },

  // Read-only
  readonlyField:    { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 10,
                      paddingHorizontal: 12, paddingVertical: 11 },
  readonlyText:     { fontSize: 14 },

  // Picker button
  pickerBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11 },
  pickerBtnText:    { fontSize: 14, flex: 1 },

  // Picker modal
  modalBg:          { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  pickerSheet:      { borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30 },
  pickerSheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  pickerSheetTitle: { fontSize: 16, fontWeight: '700' },

  // Call Type
  callTypeGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  callTypeBtn:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14,
                      paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  callTypeCheck:    { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5,
                      alignItems: 'center', justifyContent: 'center' },
  callTypeLabel:    { fontSize: 13, fontWeight: '600' },

  // Urgency chips
  chipsRow:         { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip:             { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText:         { fontSize: 13, fontWeight: '600' },

  // DateTime
  dtRow:            { flexDirection: 'row', gap: 8, alignItems: 'center' },
  dtBtn:            { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1,
                      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  dtText:           { fontSize: 13 },
  dtClear:          { padding: 4 },

  // Attachments
  attachRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  thumbWrap:        { position: 'relative' },
  thumb:            { width: 70, height: 70, borderRadius: 10 },
  thumbRemove:      { position: 'absolute', top: -6, right: -6 },
  addAttachBtn:     { width: 70, height: 70, borderRadius: 10, borderWidth: 1, borderStyle: 'dashed',
                      alignItems: 'center', justifyContent: 'center', gap: 4 },
  addAttachText:    { fontSize: 10, fontWeight: '600' },

  // Voice
  voicePickBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1,
                      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  voicePickText:    { fontSize: 14 },
  voiceCard:        { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1,
                      borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  voiceName:        { flex: 1, fontSize: 13 },
});
