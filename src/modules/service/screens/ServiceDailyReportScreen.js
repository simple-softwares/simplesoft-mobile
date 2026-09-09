import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, FlatList, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import serviceService from '../serviceService';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function fmtDur(mins) {
  if (!mins && mins !== 0) return '—';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function fmtDisplayDate(isoDate) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// ── Engineer picker modal ──────────────────────────────────────────────────────

function EngineerPickerModal({ visible, engineers, selected, onSelect, onClose, colors }) {
  const [q, setQ] = useState('');
  const filtered = engineers.filter(e =>
    !q || e.name?.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={pm.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[pm.sheet, { backgroundColor: colors.surface }]}>
        <View style={[pm.handle, { backgroundColor: colors.border }]} />
        <Text style={[pm.title, { color: colors.text }]}>Select Engineer</Text>

        <View style={[pm.searchWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Icon name="search-outline" size={15} color={colors.textLight} />
          <TextInput
            style={[pm.searchInput, { color: colors.text }]}
            placeholder="Search…"
            placeholderTextColor={colors.textLight}
            value={q}
            onChangeText={setQ}
            autoFocus
          />
        </View>

        <FlatList
          data={[{ id: null, name: 'All Engineers' }, ...filtered]}
          keyExtractor={e => String(e.id)}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => {
            const active = item.id === selected;
            return (
              <TouchableOpacity
                style={[pm.row, active && { backgroundColor: colors.primary + '12' }]}
                onPress={() => { onSelect(item.id); onClose(); }}>
                <Text style={[pm.rowText, { color: active ? colors.primary : colors.text }]}>
                  {item.name}
                </Text>
                {active && <Icon name="checkmark" size={16} color={colors.primary} />}
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </Modal>
  );
}

// ── Ticket card ────────────────────────────────────────────────────────────────

function TicketRow({ ticket, index, colors }) {
  const isResolved = ticket.status === 'resolved';
  const statusColor = isResolved ? '#10B981' : '#F59E0B';
  const statusBg    = isResolved ? '#10B98115' : '#F59E0B15';
  const statusLabel = ticket.status?.replace('_', ' ') || '—';

  return (
    <View style={[s.ticketCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Row 1: index + number + status */}
      <View style={s.ticketTop}>
        <View style={s.ticketTopLeft}>
          <Text style={[s.ticketIdx, { color: colors.textLight }]}>{index + 1}</Text>
          <Text style={[s.ticketNum, { color: colors.text }]}>{ticket.ticket_number}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[s.statusText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>

      {/* Row 2: customer + instrument */}
      <Text style={[s.ticketCustomer, { color: colors.text }]} numberOfLines={1}>
        {ticket.customer_name}
      </Text>
      {ticket.instrument ? (
        <Text style={[s.ticketInstrument, { color: colors.textSecondary }]} numberOfLines={1}>
          {ticket.instrument}
        </Text>
      ) : null}

      {/* Row 3: problem */}
      {ticket.reported_problem ? (
        <Text style={[s.ticketProblem, { color: colors.textSecondary }]} numberOfLines={2}>
          Problem: {ticket.reported_problem}
        </Text>
      ) : null}

      {/* Row 4: timing + KM */}
      <View style={s.ticketMeta}>
        <View style={s.metaItem}>
          <Icon name="time-outline" size={13} color={colors.textLight} />
          <Text style={[s.metaText, { color: colors.textSecondary }]}>
            {fmtTime(ticket.call_start_time)} → {fmtTime(ticket.call_end_time)}
          </Text>
        </View>
        {ticket.distance_km ? (
          <View style={s.metaItem}>
            <Icon name="navigate-outline" size={13} color={colors.textLight} />
            <Text style={[s.metaText, { color: colors.textSecondary }]}>{ticket.distance_km} km</Text>
          </View>
        ) : null}
      </View>

      {/* Row 5: action taken */}
      {ticket.action_taken ? (
        <Text style={[s.ticketAction, { color: colors.textLight }]} numberOfLines={2}>
          Action: {ticket.action_taken}
        </Text>
      ) : null}

      {/* Row 6: spares */}
      {ticket.spares_text ? (
        <Text style={[s.ticketSpares, { color: colors.textLight }]} numberOfLines={1}>
          Spares: {ticket.spares_text}
        </Text>
      ) : null}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function ServiceDailyReportScreen({ navigation }) {
  const { colors } = useTheme();
  const user    = useSelector(s => s.auth?.user);
  const isAdmin = user?.is_admin || user?.role === 'admin';

  const [reportDate,    setReportDate]    = useState(todayISO());
  const [engineers,     setEngineers]     = useState([]);
  const [engineerId,    setEngineerId]    = useState(null);
  const [showPicker,    setShowPicker]    = useState(false);
  const [report,        setReport]        = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [generated,     setGenerated]     = useState(false);

  useEffect(() => {
    if (isAdmin) {
      serviceService.listUsers().then(setEngineers);
    }
  }, [isAdmin]);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await serviceService.getDailyReport({
      report_date: reportDate,
      engineer_id: engineerId,
    });
    setReport(data);
    setGenerated(true);
    setLoading(false);
  }, [reportDate, engineerId]);

  // Auto-load on mount
  useEffect(() => { load(); }, []);

  const selectedEngineer = engineers.find(e => e.id === engineerId);
  const summary = report?.summary || {};
  const tickets = report?.tickets || [];

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.topTitle, { color: colors.text }]}>Daily Report</Text>
        <TouchableOpacity onPress={load} style={s.refreshBtn} disabled={loading}>
          <Icon name="refresh-outline" size={20} color={loading ? colors.textLight : colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Controls */}
      <View style={[s.controls, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {/* Date navigator */}
        <View style={s.dateRow}>
          <TouchableOpacity onPress={() => setReportDate(d => addDays(d, -1))} style={s.dateArrow}>
            <Icon name="chevron-back" size={18} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[s.dateLabel, { color: colors.text }]}>{fmtDisplayDate(reportDate)}</Text>
          <TouchableOpacity
            onPress={() => setReportDate(d => addDays(d, 1))}
            style={s.dateArrow}
            disabled={reportDate >= todayISO()}>
            <Icon name="chevron-forward" size={18}
              color={reportDate >= todayISO() ? colors.textLight : colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Engineer filter (admin only) */}
        {isAdmin && (
          <TouchableOpacity
            style={[s.engineerBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => setShowPicker(true)}>
            <Icon name="person-outline" size={14} color={colors.textSecondary} />
            <Text style={[s.engineerBtnText, { color: colors.text }]} numberOfLines={1}>
              {selectedEngineer?.name || 'All Engineers'}
            </Text>
            <Icon name="chevron-down" size={13} color={colors.textSecondary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.generateBtn, { backgroundColor: colors.primary }]}
          onPress={load}
          disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={s.generateBtnText}>Generate</Text>}
        </TouchableOpacity>
      </View>

      {loading && !generated ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 80 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          {report ? (
            <>
              {/* Summary cards */}
              <View style={s.summaryRow}>
                {[
                  { label: 'Tickets',    value: summary.total_tickets ?? 0,                       icon: 'ticket-outline',   color: '#6366F1' },
                  { label: 'KM',         value: `${summary.total_km ?? 0} km`,                    icon: 'navigate-outline', color: '#0EA5E9' },
                  { label: 'Field Time', value: fmtDur(summary.total_minutes),                    icon: 'time-outline',     color: '#10B981' },
                  { label: 'Conveyance', value: `₹${summary.calculated_conveyance ?? 0}`,         icon: 'cash-outline',     color: '#F59E0B' },
                ].map(item => (
                  <View key={item.label} style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Icon name={item.icon} size={18} color={item.color} />
                    <Text style={[s.summaryValue, { color: colors.text }]}>{item.value}</Text>
                    <Text style={[s.summaryLabel, { color: colors.textLight }]}>{item.label}</Text>
                  </View>
                ))}
              </View>

              {/* Date + engineer header line */}
              <View style={[s.reportHeader, { borderBottomColor: colors.border }]}>
                <Text style={[s.reportHeaderDate, { color: colors.textSecondary }]}>
                  {fmtDisplayDate(reportDate)}
                </Text>
                {selectedEngineer && (
                  <Text style={[s.reportHeaderEng, { color: colors.primary }]}>
                    {selectedEngineer.name}
                  </Text>
                )}
              </View>

              {/* Ticket list */}
              {tickets.length === 0 ? (
                <View style={s.empty}>
                  <Icon name="clipboard-outline" size={48} color={colors.textLight} />
                  <Text style={[s.emptyText, { color: colors.textSecondary }]}>
                    No tickets found for this date
                  </Text>
                </View>
              ) : (
                tickets.map((t, i) => (
                  <TicketRow key={t.id} ticket={t} index={i} colors={colors} />
                ))
              )}

              {/* Totals footer */}
              {tickets.length > 0 && (
                <View style={[s.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[s.footerText, { color: colors.textSecondary }]}>
                    {summary.total_tickets} ticket{summary.total_tickets !== 1 ? 's' : ''} ·{' '}
                    {summary.total_km ?? 0} km total ·{' '}
                    {fmtDur(summary.total_minutes)} field time ·{' '}
                    ₹{summary.calculated_conveyance ?? 0} conveyance
                  </Text>
                </View>
              )}
            </>
          ) : generated ? (
            <View style={s.empty}>
              <Icon name="cloud-offline-outline" size={48} color={colors.textLight} />
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>Could not load report</Text>
              <TouchableOpacity onPress={load} style={[s.retryBtn, { borderColor: colors.primary }]}>
                <Text style={[s.retryText, { color: colors.primary }]}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </ScrollView>
      )}

      <EngineerPickerModal
        visible={showPicker}
        engineers={engineers}
        selected={engineerId}
        onSelect={setEngineerId}
        onClose={() => setShowPicker(false)}
        colors={colors}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:            { flex: 1 },
  topBar:          { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 12,
                     paddingHorizontal: 8, borderBottomWidth: 0.5 },
  backBtn:         { padding: 8 },
  topTitle:        { flex: 1, fontSize: 17, fontWeight: '700', marginLeft: 4 },
  refreshBtn:      { padding: 8 },
  controls:        { paddingHorizontal: 14, paddingVertical: 12, gap: 10, borderBottomWidth: 0.5 },
  dateRow:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dateArrow:       { padding: 6 },
  dateLabel:       { fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'center' },
  engineerBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12,
                     paddingVertical: 9, borderRadius: 10, borderWidth: 1 },
  engineerBtnText: { flex: 1, fontSize: 13 },
  generateBtn:     { paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  summaryRow:      { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 14, gap: 8 },
  summaryCard:     { flex: 1, alignItems: 'center', borderRadius: 12, borderWidth: 1,
                     paddingVertical: 10, paddingHorizontal: 4, gap: 4 },
  summaryValue:    { fontSize: 14, fontWeight: '800' },
  summaryLabel:    { fontSize: 10, fontWeight: '600' },
  reportHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                     marginHorizontal: 14, marginTop: 14, paddingBottom: 8, borderBottomWidth: 0.5 },
  reportHeaderDate:{ fontSize: 12 },
  reportHeaderEng: { fontSize: 12, fontWeight: '600' },
  ticketCard:      { marginHorizontal: 14, marginTop: 10, borderRadius: 12, borderWidth: 1,
                     paddingHorizontal: 14, paddingVertical: 12, gap: 5 },
  ticketTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketTopLeft:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketIdx:       { fontSize: 11, fontWeight: '600', minWidth: 18 },
  ticketNum:       { fontSize: 13, fontWeight: '700' },
  statusBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText:      { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  ticketCustomer:  { fontSize: 14, fontWeight: '600' },
  ticketInstrument:{ fontSize: 12 },
  ticketProblem:   { fontSize: 12, lineHeight: 17 },
  ticketMeta:      { flexDirection: 'row', gap: 14, marginTop: 2 },
  metaItem:        { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:        { fontSize: 12 },
  ticketAction:    { fontSize: 12, lineHeight: 17 },
  ticketSpares:    { fontSize: 11 },
  footer:          { marginHorizontal: 14, marginTop: 14, borderRadius: 12, borderWidth: 1,
                     padding: 12 },
  footerText:      { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  empty:           { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText:       { fontSize: 15 },
  retryBtn:        { marginTop: 4, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  retryText:       { fontSize: 14, fontWeight: '600' },
});

const pm = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:       { maxHeight: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12 },
  handle:      { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  title:       { fontSize: 16, fontWeight: '700', paddingHorizontal: 16, marginBottom: 10 },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12,
                 paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14 },
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                 paddingHorizontal: 16, paddingVertical: 13 },
  rowText:     { fontSize: 15 },
});
