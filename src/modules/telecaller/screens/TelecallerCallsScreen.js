import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import { DEMO_CALLS, DISPOSITIONS, DISP_CFG, AGENTS, initials } from '../telecallerData';

const ACCENT = '#16A34A';
const AGENT_NAMES = AGENTS.map(a => a.name);
const DISP_OPTIONS = DISPOSITIONS.filter(d => d !== 'All');

// ── Log Call bottom-sheet ──────────────────────────────────────────────────────

function LogCallModal({ visible, onClose, colors }) {
  const [form, setForm] = useState({
    agent: AGENT_NAMES[0], customer: '', phone: '',
    duration: '', disposition: 'Interested', notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = () => {
    if (!form.customer.trim()) { Alert.alert('Required', 'Enter customer name'); return; }
    Alert.alert('Logged', `Call for ${form.customer} saved as "${form.disposition}"`);
    setForm({ agent: AGENT_NAMES[0], customer: '', phone: '', duration: '', disposition: 'Interested', notes: '' });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={m.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[m.sheet, { backgroundColor: colors.surface }]}>
        <View style={[m.handle, { backgroundColor: colors.border }]} />
        <Text style={[m.title, { color: colors.text }]}>Log a Call</Text>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Agent */}
          <Text style={[m.label, { color: colors.textSecondary }]}>Agent</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={m.agentRow}>
            {AGENT_NAMES.map(name => (
              <TouchableOpacity
                key={name}
                onPress={() => set('agent', name)}
                style={[m.agentChip, { borderColor: form.agent === name ? ACCENT : colors.border,
                  backgroundColor: form.agent === name ? ACCENT + '15' : colors.background }]}>
                <Text style={[m.agentChipText, { color: form.agent === name ? ACCENT : colors.textSecondary }]}>
                  {name.split(' ')[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Customer */}
          <Text style={[m.label, { color: colors.textSecondary }]}>Customer Name *</Text>
          <TextInput
            style={[m.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={form.customer} onChangeText={v => set('customer', v)}
            placeholder="e.g. Ramesh Gupta" placeholderTextColor={colors.textLight}
          />

          {/* Phone + Duration */}
          <View style={m.row}>
            <View style={{ flex: 1 }}>
              <Text style={[m.label, { color: colors.textSecondary }]}>Phone</Text>
              <TextInput
                style={[m.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={form.phone} onChangeText={v => set('phone', v)}
                placeholder="98765 XXXXX" placeholderTextColor={colors.textLight}
                keyboardType="phone-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[m.label, { color: colors.textSecondary }]}>Duration (m:ss)</Text>
              <TextInput
                style={[m.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={form.duration} onChangeText={v => set('duration', v)}
                placeholder="e.g. 2:30" placeholderTextColor={colors.textLight}
              />
            </View>
          </View>

          {/* Disposition */}
          <Text style={[m.label, { color: colors.textSecondary }]}>Disposition</Text>
          <View style={m.dispRow}>
            {DISP_OPTIONS.map(d => (
              <TouchableOpacity
                key={d}
                onPress={() => set('disposition', d)}
                style={[m.dispChip, { borderColor: form.disposition === d ? ACCENT : colors.border,
                  backgroundColor: form.disposition === d ? ACCENT : colors.background }]}>
                <Text style={[m.dispChipText, { color: form.disposition === d ? '#fff' : colors.textSecondary }]}>
                  {d}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notes */}
          <Text style={[m.label, { color: colors.textSecondary }]}>Notes</Text>
          <TextInput
            style={[m.input, m.notesInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            value={form.notes} onChangeText={v => set('notes', v)}
            placeholder="Call outcome, next steps…" placeholderTextColor={colors.textLight}
            multiline numberOfLines={3} textAlignVertical="top"
          />

          {/* Buttons */}
          <View style={m.btnRow}>
            <TouchableOpacity onPress={onClose} style={[m.cancelBtn, { borderColor: colors.border }]}>
              <Text style={[m.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[m.saveBtn, { backgroundColor: ACCENT }]}>
              <Text style={m.saveText}>Save Call</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Disposition badge ──────────────────────────────────────────────────────────

function DispBadge({ disposition, colors }) {
  const cfg = DISP_CFG[disposition] || {};
  return (
    <View style={[s.badge, { backgroundColor: cfg.bg || '#eee' }]}>
      <Text style={[s.badgeText, { color: cfg.color || colors.textSecondary }]}>{disposition}</Text>
    </View>
  );
}

// ── Call card ─────────────────────────────────────────────────────────────────

function CallCard({ call, expanded, onToggle, colors }) {
  const cfg = DISP_CFG[call.disposition] || {};
  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity style={s.cardMain} onPress={onToggle} activeOpacity={0.8}>
        <View style={[s.dispIcon, { backgroundColor: cfg.bg || '#eee' }]}>
          <Icon name={cfg.icon || 'call-outline'} size={16} color={cfg.color || '#888'} />
        </View>
        <View style={s.cardCenter}>
          <View style={s.cardTopRow}>
            <Text style={[s.customerName, { color: colors.text }]} numberOfLines={1}>{call.customer}</Text>
            <DispBadge disposition={call.disposition} colors={colors} />
          </View>
          <Text style={[s.cardSub, { color: colors.textLight }]}>{call.agent} · {call.phone}</Text>
        </View>
        <View style={s.cardRight}>
          <Text style={[s.cardDuration, { color: colors.textSecondary }]}>{call.duration || '—'}</Text>
          <Text style={[s.cardDate, { color: colors.textLight }]}>{call.date}</Text>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textLight} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[s.cardDetail, { borderTopColor: colors.border }]}>
          <View style={s.detailRow}>
            {[
              { label: 'Agent',    value: call.agent                 },
              { label: 'Time',     value: `${call.date} ${call.time}` },
              { label: 'Duration', value: call.duration || 'N/A'     },
            ].map(({ label, value }) => (
              <View key={label} style={[s.detailCell, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[s.detailLabel, { color: colors.textLight }]}>{label}</Text>
                <Text style={[s.detailValue, { color: colors.text }]}>{value}</Text>
              </View>
            ))}
          </View>
          {!!call.notes && (
            <View style={[s.notesBox, { backgroundColor: colors.background }]}>
              <Icon name="document-text-outline" size={13} color={colors.textLight} style={{ marginTop: 1 }} />
              <Text style={[s.notesText, { color: colors.textSecondary }]}>{call.notes}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function TelecallerCallsScreen() {
  const { colors } = useTheme();
  const [search,    setSearch]    = useState('');
  const [dispFilter, setDisp]     = useState('All');
  const [expanded,  setExpanded]  = useState(null);
  const [showModal, setShowModal] = useState(false);

  const visible = DEMO_CALLS.filter(c => {
    const matchDisp = dispFilter === 'All' || c.disposition === dispFilter;
    const q = search.toLowerCase();
    return matchDisp && (!search || c.customer.toLowerCase().includes(q) || c.agent.toLowerCase().includes(q) || c.phone.includes(q));
  });

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={s.headerLeft}>
          <Icon name="list-outline" size={18} color={ACCENT} />
          <Text style={[s.headerTitle, { color: colors.text }]}>Call Log</Text>
        </View>
        <TouchableOpacity
          style={[s.logBtn, { backgroundColor: ACCENT }]}
          onPress={() => setShowModal(true)}>
          <Icon name="add" size={16} color="#fff" />
          <Text style={s.logBtnText}>Log Call</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visible}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            {/* Search */}
            <View style={[s.searchWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
              <Icon name="search-outline" size={15} color={colors.textLight} />
              <TextInput
                style={[s.searchInput, { color: colors.text }]}
                placeholder="Search customer, agent, phone…"
                placeholderTextColor={colors.textLight}
                value={search}
                onChangeText={setSearch}
              />
              {!!search && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Icon name="close-circle" size={15} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {/* Disposition filter */}
            <View style={[s.filterBar, { borderBottomColor: colors.border }]}>
              {DISPOSITIONS.map(d => {
                const active = dispFilter === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDisp(d)}
                    style={[s.filterChip, active && { backgroundColor: ACCENT + '20', borderColor: ACCENT }]}>
                    <Text style={[s.filterText, { color: active ? ACCENT : colors.textSecondary }]}>
                      {d === 'Not Interested' ? 'Not Int.' : d}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <CallCard
            call={item}
            expanded={expanded === item.id}
            onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
            colors={colors}
          />
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="call-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No calls match your filter</Text>
          </View>
        }
        ListFooterComponent={
          <Text style={[s.footer, { color: colors.textLight }]}>
            Demo data · {visible.length} of {DEMO_CALLS.length} calls
          </Text>
        }
      />

      <LogCallModal visible={showModal} onClose={() => setShowModal(false)} colors={colors} />
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14, borderBottomWidth: 0.5 },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  logBtn:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  logBtnText:  { color: '#fff', fontSize: 13, fontWeight: '700' },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14,
                 paddingVertical: 10, borderBottomWidth: 0.5 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  filterBar:   { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 10,
                 gap: 6, borderBottomWidth: 0.5 },
  filterChip:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, borderWidth: 1,
                 borderColor: 'transparent', backgroundColor: '#00000008' },
  filterText:  { fontSize: 11, fontWeight: '600' },
  card:        { marginHorizontal: 14, marginTop: 10, borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cardMain:    { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  dispIcon:    { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardCenter:  { flex: 1, gap: 3 },
  cardTopRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  customerName:{ fontSize: 14, fontWeight: '700', flexShrink: 1 },
  badge:       { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  badgeText:   { fontSize: 10, fontWeight: '700' },
  cardSub:     { fontSize: 11 },
  cardRight:   { alignItems: 'flex-end', gap: 2 },
  cardDuration:{ fontSize: 12, fontWeight: '600' },
  cardDate:    { fontSize: 10 },
  cardDetail:  { borderTopWidth: StyleSheet.hairlineWidth, padding: 12, gap: 10 },
  detailRow:   { flexDirection: 'row', gap: 8 },
  detailCell:  { flex: 1, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, padding: 10 },
  detailLabel: { fontSize: 10, marginBottom: 3 },
  detailValue: { fontSize: 11, fontWeight: '600' },
  notesBox:    { flexDirection: 'row', gap: 6, borderRadius: 10, padding: 10 },
  notesText:   { flex: 1, fontSize: 12, lineHeight: 17 },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyText:   { fontSize: 15 },
  footer:      { textAlign: 'center', fontSize: 11, paddingVertical: 20 },
});

const m = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:         { maxHeight: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:        { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:         { fontSize: 17, fontWeight: '700', marginBottom: 14 },
  label:         { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  agentRow:      { paddingBottom: 4, gap: 8 },
  agentChip:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  agentChipText: { fontSize: 12, fontWeight: '600' },
  input:         { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  notesInput:    { minHeight: 70 },
  row:           { flexDirection: 'row', gap: 10 },
  dispRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dispChip:      { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1 },
  dispChipText:  { fontSize: 12, fontWeight: '600' },
  btnRow:        { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancelBtn:     { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelText:    { fontSize: 14, fontWeight: '600' },
  saveBtn:       { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveText:      { color: '#fff', fontSize: 14, fontWeight: '700' },
});
