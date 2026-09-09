import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import helpdeskService, {
  HD_STATUSES, HD_PRIORITIES, HD_STATUS_OPTIONS, fmtDateTime,
} from '../helpdeskService';

// ── Comment bubble ─────────────────────────────────────────────────────────────

function CommentBubble({ comment, colors }) {
  const isInternal = comment.is_internal;
  return (
    <View style={[
      s.bubble,
      isInternal
        ? [s.bubbleInternal, { backgroundColor: '#F59E0B0E', borderColor: '#F59E0B30' }]
        : { backgroundColor: colors.surface, borderColor: colors.border },
    ]}>
      {isInternal && (
        <View style={s.internalTag}>
          <Icon name="lock-closed-outline" size={10} color="#F59E0B" />
          <Text style={s.internalTagText}>Internal note</Text>
        </View>
      )}
      <View style={s.bubbleHeader}>
        <Text style={[s.bubbleAuthor, { color: colors.text }]}>{comment.author_name}</Text>
        <Text style={[s.bubbleTime, { color: colors.textLight }]}>{fmtDateTime(comment.created_at)}</Text>
      </View>
      <Text style={[s.bubbleBody, { color: colors.textSecondary }]}>{comment.body}</Text>
    </View>
  );
}

// ── Status change chip row (admin only) ────────────────────────────────────────

function StatusChips({ current, onChange, colors }) {
  return (
    <View style={s.statusChips}>
      {HD_STATUS_OPTIONS.map(key => {
        const cfg    = HD_STATUSES[key];
        const active = current === key;
        return (
          <TouchableOpacity
            key={key}
            style={[s.statusChip, {
              borderColor:       active ? cfg.color : colors.border,
              backgroundColor:   active ? cfg.color + '20' : colors.background,
            }]}
            onPress={() => onChange(key)}>
            <Text style={[s.statusChipText, { color: active ? cfg.color : colors.textSecondary }]}>
              {cfg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ── Info row ───────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value, colors, valueColor }) {
  if (!value) return null;
  return (
    <View style={s.infoRow}>
      <Icon name={icon} size={14} color={colors.textLight} style={s.infoIcon} />
      <Text style={[s.infoLabel, { color: colors.textLight }]}>{label}</Text>
      <Text style={[s.infoValue, { color: valueColor || colors.text }]}>{value}</Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────

export default function HelpdeskDetailScreen({ navigation, route }) {
  const { id } = route.params;
  const { colors } = useTheme();
  const user    = useSelector(s => s.auth?.user);
  const isAdmin = user?.is_admin || user?.role === 'admin';

  const [ticket,      setTicket]      = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isInternal,  setIsInternal]  = useState(false);
  const [posting,     setPosting]     = useState(false);
  const [saving,      setSaving]      = useState(false);

  const scrollRef = useRef(null);

  const load = async () => {
    try {
      const data = await helpdeskService.getTicket(id);
      setTicket(data);
    } catch {
      Alert.alert('Error', 'Could not load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === ticket.status) return;
    setSaving(true);
    try {
      const updated = await helpdeskService.updateTicket(id, { status: newStatus });
      setTicket(updated);
    } catch {
      Alert.alert('Error', 'Could not update status');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const comment = await helpdeskService.addComment(id, {
        body:        commentText.trim(),
        is_internal: isInternal,
      });
      setTicket(prev => ({
        ...prev,
        comments: [...(prev.comments || []), comment],
        status: prev.status === 'open' && !isInternal ? 'in_progress' : prev.status,
      }));
      setCommentText('');
      setIsInternal(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch {
      Alert.alert('Error', 'Could not post comment');
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.root, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!ticket) return null;

  const st  = HD_STATUSES[ticket.status]    || HD_STATUSES.open;
  const pri = HD_PRIORITIES[ticket.priority] || HD_PRIORITIES.medium;
  const isResolved = ['resolved', 'closed'].includes(ticket.status);

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}>

      {/* Top bar */}
      <View style={[s.topBar, { backgroundColor: st.color + 'E8' }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.ticketNum}>{ticket.ticket_number}</Text>
          <Text style={s.topSubject} numberOfLines={1}>{ticket.subject}</Text>
        </View>
        {saving && <ActivityIndicator size="small" color="#fff" style={{ marginRight: 4 }} />}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll}>

        {/* Info card */}
        <View style={[s.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Status + Priority row */}
          <View style={s.statusRow}>
            <View style={[s.stBadge, { backgroundColor: st.bg }]}>
              <Icon name={st.icon} size={11} color={st.color} style={{ marginRight: 4 }} />
              <Text style={[s.stBadgeText, { color: st.color }]}>{st.label}</Text>
            </View>
            <View style={[s.priBadge, { backgroundColor: pri.color + '18' }]}>
              <Text style={[s.priText, { color: pri.color }]}>{pri.label} Priority</Text>
            </View>
          </View>

          <InfoRow icon="person-outline"      label="Requester"   value={ticket.requester_name}   colors={colors} />
          <InfoRow icon="mail-outline"         label="Email"       value={ticket.requester_email}  colors={colors} />
          <InfoRow icon="person-circle-outline" label="Assigned"   value={ticket.assigned_to_name} colors={colors} />
          <InfoRow icon="layers-outline"       label="Source"      value={ticket.source}           colors={colors} />
          <InfoRow icon="calendar-outline"     label="Created"     value={fmtDateTime(ticket.created_at)} colors={colors} />
          {ticket.resolved_at && (
            <InfoRow icon="checkmark-circle-outline" label="Resolved" value={fmtDateTime(ticket.resolved_at)} colors={colors} valueColor="#10B981" />
          )}

          {!!ticket.description && (
            <View style={[s.descBox, { borderTopColor: colors.border }]}>
              <Text style={[s.descLabel, { color: colors.textLight }]}>Description</Text>
              <Text style={[s.descText, { color: colors.textSecondary }]}>{ticket.description}</Text>
            </View>
          )}
        </View>

        {/* Admin: status change */}
        {isAdmin && (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textLight }]}>CHANGE STATUS</Text>
            <StatusChips current={ticket.status} onChange={handleStatusChange} colors={colors} />
          </View>
        )}

        {/* Comments thread */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textLight }]}>
            COMMENTS {ticket.comments?.length > 0 ? `· ${ticket.comments.length}` : ''}
          </Text>
          {(!ticket.comments || ticket.comments.length === 0) ? (
            <Text style={[s.noComments, { color: colors.textLight }]}>No comments yet. Be the first to reply.</Text>
          ) : (
            ticket.comments.map(c => (
              <CommentBubble key={c.id} comment={c} colors={colors} />
            ))
          )}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Comment input — sticky at bottom */}
      {!isResolved && (
        <View style={[s.inputWrap, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {isAdmin && (
            <View style={s.internalRow}>
              <Text style={[s.internalLabel, { color: colors.textSecondary }]}>Internal note</Text>
              <Switch
                value={isInternal}
                onValueChange={setIsInternal}
                trackColor={{ false: colors.border, true: '#F59E0B60' }}
                thumbColor={isInternal ? '#F59E0B' : colors.textLight}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          )}
          <View style={s.inputRow}>
            <TextInput
              style={[s.input, { color: colors.text, borderColor: isInternal ? '#F59E0B50' : colors.border,
                backgroundColor: isInternal ? '#F59E0B06' : colors.background }]}
              placeholder={isInternal ? 'Add an internal note…' : 'Reply to customer…'}
              placeholderTextColor={colors.textLight}
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[s.sendBtn, { backgroundColor: isInternal ? '#F59E0B' : colors.primary,
                opacity: (posting || !commentText.trim()) ? 0.5 : 1 }]}
              onPress={handleAddComment}
              disabled={posting || !commentText.trim()}>
              {posting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Icon name="send" size={16} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  topBar:    { flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingBottom: 14,
               paddingHorizontal: 14, gap: 10 },
  backBtn:   { padding: 4 },
  ticketNum: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.7)', marginBottom: 2 },
  topSubject: { fontSize: 15, fontWeight: '700', color: '#fff' },

  scroll:    { padding: 14, gap: 12, paddingBottom: 20 },

  infoCard:  { borderRadius: 16, borderWidth: 1, padding: 16 },
  statusRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  stBadge:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10,
               paddingVertical: 4, borderRadius: 20 },
  stBadgeText: { fontSize: 12, fontWeight: '700' },
  priBadge:  { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  priText:   { fontSize: 12, fontWeight: '700' },

  infoRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoIcon:  { marginRight: 8, width: 16 },
  infoLabel: { fontSize: 12, width: 68 },
  infoValue: { flex: 1, fontSize: 13, fontWeight: '500' },

  descBox:   { marginTop: 12, paddingTop: 12, borderTopWidth: 0.5 },
  descLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, marginBottom: 6 },
  descText:  { fontSize: 13, lineHeight: 20 },

  section:   { borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },

  statusChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  statusChipText: { fontSize: 12, fontWeight: '600' },

  noComments: { fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 16 },

  bubble:         { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  bubbleInternal: { borderStyle: 'dashed' },
  internalTag:    { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  internalTagText: { fontSize: 10, fontWeight: '700', color: '#F59E0B' },
  bubbleHeader:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  bubbleAuthor:   { fontSize: 12, fontWeight: '700' },
  bubbleTime:     { fontSize: 11 },
  bubbleBody:     { fontSize: 13, lineHeight: 20 },

  inputWrap:   { borderTopWidth: 0.5, paddingHorizontal: 12, paddingTop: 10,
                 paddingBottom: Platform.OS === 'ios' ? 28 : 12 },
  internalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
                 gap: 6, marginBottom: 6 },
  internalLabel: { fontSize: 12, fontWeight: '600' },
  inputRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  input:       { flex: 1, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12,
                 paddingVertical: 10, fontSize: 14, maxHeight: 100 },
  sendBtn:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
