import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Image, Linking, Share,
  FlatList, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import serviceService, {
  TICKET_STATUSES, URGENCY_CONFIGS,
  fmtDate, fmtDateTime, fmtDuration, mediaUrl,
} from '../serviceService';

// ── Small components ──────────────────────────────────────────────────────────

function SectionHeader({ label, colors }) {
  return <Text style={[s.sectionLabel, { color: colors.textLight }]}>{label.toUpperCase()}</Text>;
}

function InfoRow({ label, value, colors }) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Text style={[s.infoLabel, { color: colors.textLight }]}>{label}</Text>
      <Text style={[s.infoValue, { color: colors.text }]} numberOfLines={3}>{value}</Text>
    </View>
  );
}

function WorkLogEntry({ log, colors }) {
  const duration = fmtDuration(log.call_start, log.call_end);
  const statusColor = log.status === 'completed' ? '#10B981' : log.status === 'pending_parts' ? '#F97316' : '#F59E0B';

  return (
    <View style={[s.logEntry, { borderColor: colors.border }]}>
      <View style={[s.logDot, { backgroundColor: statusColor }]} />
      <View style={s.logBody}>
        <View style={s.logHeader}>
          <Text style={[s.logEngineer, { color: colors.text }]}>{log.engineer_name}</Text>
          <View style={[s.logBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[s.logBadgeText, { color: statusColor }]}>
              {log.status === 'pending_parts' ? 'Pending Parts' : log.status === 'escalated' ? 'Escalated' : 'Completed'}
            </Text>
          </View>
        </View>
        {log.call_start && (
          <Text style={[s.logTime, { color: colors.textLight }]}>
            {fmtDateTime(log.call_start)}
            {duration ? ` · ${duration}` : ''}
          </Text>
        )}
        <Text style={[s.logAction, { color: colors.textSecondary }]}>{log.action_taken}</Text>
        {log.distance_km > 0 && (
          <Text style={[s.logKm, { color: colors.textLight }]}>{log.distance_km} km travelled</Text>
        )}
        {log.remarks && (
          <Text style={[s.logRemarks, { color: colors.textLight }]}>{log.remarks}</Text>
        )}
        {log.photos?.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.logPhotos}>
            {log.photos.map((url, i) => (
              <Image key={i} source={{ uri: mediaUrl(url) }} style={s.logThumb} />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function PhotoViewer({ visible, uri, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={s.photoViewerBg} activeOpacity={1} onPress={onClose}>
        <Image source={{ uri }} style={s.photoViewerImage} resizeMode="contain" />
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ServiceDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const user = useSelector(s => s.auth?.user);
  const isAdmin   = user?.is_admin || user?.role === 'admin';
  const myTicket  = ticket => ticket?.assigned_to === user?.id;

  const [ticket,        setTicket]        = useState(null);
  const [workLogs,      setWorkLogs]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewerUri,     setViewerUri]     = useState(null);

  const load = useCallback(async () => {
    try {
      const [t, logs] = await Promise.all([
        serviceService.getTicket(id),
        serviceService.listWorkLogs(id),
      ]);
      setTicket(t);
      setWorkLogs(logs);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const reload = () => load();

  const confirm = (title, msg, onOk) =>
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: onOk },
    ]);

  const doAction = async (fn, successMsg) => {
    setActionLoading(true);
    try {
      await fn();
      await reload();
      Alert.alert('Done', successMsg);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.detail || e.message || 'Action failed');
    }
    setActionLoading(false);
  };

  const handleStart = () =>
    confirm('Start Work', 'Clock in and start working on this ticket?', () =>
      doAction(() => serviceService.startTicket(id), 'Ticket started. GPS clock-in recorded.'));

  const handleCancel = () =>
    confirm('Cancel Ticket', 'Cancel this ticket?', () =>
      doAction(() => serviceService.cancelTicket(id), 'Ticket cancelled.'));

  const handleReopen = () =>
    confirm('Reopen Ticket', 'Reopen this resolved ticket?', () =>
      doAction(() => serviceService.reopenTicket(id), 'Ticket reopened.'));

  const handleSharePDF = async () => {
    const url = serviceService.pdfUrl(id);
    try {
      await Share.share({ url, message: url, title: `Service Report ${ticket?.ticket_number}` });
    } catch { }
  };

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>Ticket not found</Text>
      </View>
    );
  }

  const st       = TICKET_STATUSES[ticket.status] || TICKET_STATUSES.open;
  const urgCfg   = URGENCY_CONFIGS[ticket.urgency] || URGENCY_CONFIGS.Normal;
  const photos   = ticket.photos || [];
  const spares   = ticket.spares || [];
  const isActive = ['open', 'assigned', 'wip', 'hold', 'pending_parts'].includes(ticket.status);

  // What the action bar shows
  const canStart   = ticket.status === 'assigned' && (myTicket(ticket) || isAdmin);
  const canLogVisit= ['wip', 'hold', 'pending_parts', 'assigned'].includes(ticket.status) && (myTicket(ticket) || isAdmin);
  const canCancel  = isAdmin && isActive;
  const canReopen  = isAdmin && ticket.status === 'resolved';

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <View style={s.topCenter}>
          <Text style={[s.topTitle, { color: colors.text }]}>{ticket.ticket_number}</Text>
          <View style={[s.badge, { backgroundColor: st.bg }]}>
            <Text style={[s.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        <TouchableOpacity style={s.pdfBtn} onPress={handleSharePDF}>
          <Icon name="share-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={[s.hero, { backgroundColor: st.color + 'E0' }]}>
          <View style={[s.urgencyTag, { backgroundColor: urgCfg.bg + '50' }]}>
            <Text style={[s.urgencyText, { color: '#fff' }]}>{ticket.urgency}</Text>
          </View>
          <Text style={s.heroInstrument}>{ticket.instrument}</Text>
          <Text style={s.heroCustomer}>{ticket.customer_name}</Text>
          {ticket.nature_of_call && (
            <Text style={s.heroNature}>{ticket.nature_of_call}</Text>
          )}
        </View>

        {/* Reported problem */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader label="Reported Problem" colors={colors} />
          <Text style={[s.problemText, { color: colors.text }]}>{ticket.reported_problem}</Text>
        </View>

        {/* Ticket details */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <SectionHeader label="Details" colors={colors} />
          {ticket.mobile_number && <InfoRow label="Mobile"       value={ticket.mobile_number}  colors={colors} />}
          {ticket.site_location && <InfoRow label="Site"         value={ticket.site_location}  colors={colors} />}
          {ticket.call_type     && (
            <InfoRow label="Call Type" value={ticket.call_type.split(',').join(' · ')} colors={colors} />
          )}
          {ticket.preferred_datetime && (
            <InfoRow label="Preferred Date" value={fmtDateTime(ticket.preferred_datetime)} colors={colors} />
          )}
          {ticket.target_datetime && (
            <InfoRow label="Target Completion" value={fmtDateTime(ticket.target_datetime)} colors={colors} />
          )}
          {ticket.assigned_by_name && <InfoRow label="Assigned By"  value={ticket.assigned_by_name} colors={colors} />}
          <InfoRow label="End User"   value={ticket.end_user_name} colors={colors} />
          <InfoRow label="Department" value={ticket.department}    colors={colors} />
          <InfoRow label="Created"    value={fmtDate(ticket.created_at)} colors={colors} />
          <InfoRow label="Assigned"   value={fmtDate(ticket.assigned_at)} colors={colors} />
          {ticket.plan_of_action && (
            <InfoRow label="Plan of Action" value={ticket.plan_of_action} colors={colors} />
          )}
          {ticket.distance_km > 0 && (
            <InfoRow label="Distance" value={`${ticket.distance_km} km`} colors={colors} />
          )}
        </View>

        {/* Voice note */}
        {ticket.voice_note_url && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader label="Voice Recording" colors={colors} />
            <TouchableOpacity
              style={s.voiceRow}
              onPress={() => Linking.openURL(mediaUrl(ticket.voice_note_url))}>
              <Icon name="musical-notes-outline" size={20} color={colors.primary} />
              <Text style={[s.voiceLabel, { color: colors.primary }]}>Play / Download Recording</Text>
              <Icon name="open-outline" size={16} color={colors.textLight} />
            </TouchableOpacity>
          </View>
        )}

        {/* Work Log Timeline */}
        {workLogs.length > 0 && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader label={`Visit Logs (${workLogs.length})`} colors={colors} />
            {workLogs.map(log => (
              <WorkLogEntry key={log.id} log={log} colors={colors} />
            ))}
          </View>
        )}

        {/* Action taken (final resolve) */}
        {ticket.action_taken && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader label="Resolution" colors={colors} />
            <Text style={[s.problemText, { color: colors.text }]}>{ticket.action_taken}</Text>
            {ticket.remarks && (
              <Text style={[s.problemText, { color: colors.textSecondary, marginTop: 8 }]}>{ticket.remarks}</Text>
            )}
            {ticket.resolved_at && (
              <Text style={[s.metaText, { color: colors.textLight, marginTop: 6 }]}>
                Resolved {fmtDateTime(ticket.resolved_at)}
              </Text>
            )}
          </View>
        )}

        {/* Spare parts */}
        {spares.length > 0 && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader label={`Spare Parts (${spares.length})`} colors={colors} />
            {spares.map(sp => (
              <View key={sp.id} style={[s.spareRow, { borderBottomColor: colors.divider }]}>
                <Text style={[s.spareName, { color: colors.text }]}>{sp.item_name}</Text>
                <Text style={[s.spareQty, { color: colors.textSecondary }]}>
                  {sp.qty_issued} {sp.unit || 'pcs'}
                  {sp.is_returned ? ` · returned ${sp.return_qty}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Site photos */}
        {photos.length > 0 && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader label={`Site Photos (${photos.length})`} colors={colors} />
            <View style={s.photoGrid}>
              {photos.map((url, i) => (
                <TouchableOpacity key={i} onPress={() => setViewerUri(mediaUrl(url))}>
                  <Image source={{ uri: mediaUrl(url) }} style={s.photoThumb} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Verification */}
        {ticket.cross_checked_at && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <SectionHeader label="Verification" colors={colors} />
            <InfoRow label="Customer Feedback" value={ticket.customer_feedback} colors={colors} />
            <InfoRow label="Remarks"            value={ticket.verification_remarks} colors={colors} />
            <InfoRow label="Verified at"        value={fmtDate(ticket.cross_checked_at)} colors={colors} />
          </View>
        )}
      </ScrollView>

      {/* Action bar */}
      <View style={[s.actionBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        {canCancel && (
          <TouchableOpacity
            style={[s.secondaryBtn, { borderColor: colors.error || '#EF4444' }]}
            onPress={handleCancel}
            disabled={actionLoading}>
            <Icon name="close-outline" size={16} color={colors.error || '#EF4444'} />
            <Text style={[s.secondaryBtnText, { color: colors.error || '#EF4444' }]}>Cancel</Text>
          </TouchableOpacity>
        )}

        {canReopen && (
          <TouchableOpacity
            style={[s.secondaryBtn, { borderColor: colors.primary }]}
            onPress={handleReopen}
            disabled={actionLoading}>
            <Icon name="refresh-outline" size={16} color={colors.primary} />
            <Text style={[s.secondaryBtnText, { color: colors.primary }]}>Reopen</Text>
          </TouchableOpacity>
        )}

        {canStart && (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: '#0EA5E9' }]}
            onPress={handleStart}
            disabled={actionLoading}>
            {actionLoading
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Icon name="play-outline" size={16} color="#fff" />
                  <Text style={s.primaryBtnText}>Start Work</Text>
                </>}
          </TouchableOpacity>
        )}

        {canLogVisit && (
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('WorkLog', { ticketId: id, ticket })}>
            <Icon name="clipboard-outline" size={16} color="#fff" />
            <Text style={s.primaryBtnText}>Log Visit</Text>
          </TouchableOpacity>
        )}
      </View>

      <PhotoViewer
        visible={!!viewerUri}
        uri={viewerUri}
        onClose={() => setViewerUri(null)}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:         { flex: 1 },
  topBar:       { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 12,
                  paddingHorizontal: 8, borderBottomWidth: 0.5 },
  backBtn:      { padding: 8 },
  topCenter:    { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  topTitle:     { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  pdfBtn:       { padding: 8 },
  badge:        { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  badgeText:    { fontSize: 10, fontWeight: '700' },
  hero:         { paddingVertical: 22, paddingHorizontal: 18, alignItems: 'flex-start' },
  urgencyTag:   { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginBottom: 8 },
  urgencyText:  { fontSize: 11, fontWeight: '700', color: '#fff' },
  heroInstrument: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroCustomer: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 2 },
  heroNature:   { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
  section:      { marginHorizontal: 14, marginTop: 12, borderRadius: 14, borderWidth: 1,
                  paddingHorizontal: 14, paddingVertical: 12 },
  sectionLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 10 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 },
  infoLabel:    { fontSize: 13 },
  infoValue:    { fontSize: 13, fontWeight: '600', maxWidth: '60%', textAlign: 'right' },
  problemText:  { fontSize: 14, lineHeight: 20 },
  metaText:     { fontSize: 12 },
  // Work log
  logEntry:     { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 0.5, gap: 10 },
  logDot:       { width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0 },
  logBody:      { flex: 1 },
  logHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  logEngineer:  { fontSize: 13, fontWeight: '700' },
  logBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  logBadgeText: { fontSize: 10, fontWeight: '700' },
  logTime:      { fontSize: 11, marginBottom: 4 },
  logAction:    { fontSize: 13, lineHeight: 18, marginBottom: 2 },
  logKm:        { fontSize: 11, marginTop: 2 },
  logRemarks:   { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  logPhotos:    { marginTop: 8 },
  logThumb:     { width: 60, height: 60, borderRadius: 8, marginRight: 6 },
  // Spare parts
  spareRow:     { flexDirection: 'row', justifyContent: 'space-between',
                  paddingVertical: 8, borderBottomWidth: 0.5 },
  spareName:    { fontSize: 13, fontWeight: '600', flex: 1 },
  spareQty:     { fontSize: 13 },
  // Photos
  photoGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoThumb:   { width: 80, height: 80, borderRadius: 10 },
  // Photo viewer modal
  photoViewerBg:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center' },
  photoViewerImage: { width: '100%', height: '80%' },
  // Voice note
  voiceRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  voiceLabel:   { flex: 1, fontSize: 14, fontWeight: '600' },
  // Action bar
  actionBar:    { position: 'absolute', bottom: 0, left: 0, right: 0,
                  flexDirection: 'row', gap: 8, padding: 12, paddingBottom: 28, borderTopWidth: 0.5 },
  primaryBtn:   { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                  gap: 6, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14,
                  paddingVertical: 14, borderRadius: 12, borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 13, fontWeight: '700' },
});
