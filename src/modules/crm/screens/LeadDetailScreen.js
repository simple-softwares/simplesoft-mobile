import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import crmService from '../crmService';

const PRIORITY_COLOR = { '0': '#9E9E9E', '1': '#2196F3', '2': '#FF9800', '3': '#F44336' };
const PRIORITY_LABEL = { '0': 'Normal',  '1': 'Low',     '2': 'High',    '3': 'Very High' };

const InfoRow = ({ icon, label, value, color, onPress }) => {
  const { colors } = useTheme();
  if (!value) return null;
  return (
    <TouchableOpacity style={s.infoRow} onPress={onPress} disabled={!onPress} activeOpacity={onPress ? 0.6 : 1}>
      <Icon name={icon} size={18} color={color || colors.textSecondary} style={s.infoIcon} />
      <View style={s.infoContent}>
        <Text style={[s.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[s.infoValue, { color: onPress ? colors.primary : colors.text }]} numberOfLines={2}>{value}</Text>
      </View>
      {onPress && <Icon name="chevron-forward" size={16} color={colors.textLight} />}
    </TouchableOpacity>
  );
};

const LeadDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { leadId, leadName } = route.params || {};

  const [lead,    setLead]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting,  setActing]  = useState(false);

  const loadLead = useCallback(async () => {
    if (!leadId) { setLoading(false); return; }
    try {
      const data = await crmService.getLead(leadId);
      setLead(data);
      navigation.setOptions({ title: data.name || leadName || 'Lead' });
    } catch {
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => { loadLead(); }, [loadLead]);

  // Refresh when returning from edit form
  useEffect(() => {
    const unsub = navigation.addListener('focus', () => {
      if (lead) loadLead();
    });
    return unsub;
  }, [navigation, lead]);

  const handleMarkWon = () => {
    Alert.alert('Mark as Won', 'Move this lead to Won?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Won', style: 'default', onPress: async () => {
        setActing(true);
        try { await crmService.markWon(leadId); navigation.goBack(); }
        catch (e) { Alert.alert('Error', e?.response?.data?.detail || 'Failed'); }
        finally { setActing(false); }
      }},
    ]);
  };

  const handleMarkLost = () => {
    Alert.alert('Mark as Lost', 'Archive this lead as lost?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Mark Lost', style: 'destructive', onPress: async () => {
        setActing(true);
        try { await crmService.markLost(leadId); navigation.goBack(); }
        catch (e) { Alert.alert('Error', e?.response?.data?.detail || 'Failed'); }
        finally { setActing(false); }
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

  if (!lead) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Icon name="alert-circle-outline" size={48} color={colors.textLight} />
        <Text style={[s.emptyText, { color: colors.textSecondary }]}>Lead not found</Text>
      </View>
    );
  }

  const accentColor = PRIORITY_COLOR[lead.priority] || '#9E9E9E';
  const revenue     = lead.expected_revenue
    ? `₹${Number(lead.expected_revenue).toLocaleString('en-IN')}`
    : null;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="chevron-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>{lead.name}</Text>
        <TouchableOpacity
          style={s.editBtn}
          onPress={() => navigation.navigate('LeadForm', { lead })}>
          <Icon name="create-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        {/* Stage + Priority banner */}
        <View style={[s.banner, { backgroundColor: accentColor + '12', borderColor: accentColor + '30' }]}>
          <View style={[s.stagePill, { backgroundColor: colors.primary }]}>
            <Text style={s.stagePillText}>{lead.stage_id?.[1] || '—'}</Text>
          </View>
          <View style={[s.priorityPill, { backgroundColor: accentColor + '20' }]}>
            <Icon name="flag-outline" size={12} color={accentColor} />
            <Text style={[s.priorityText, { color: accentColor }]}>{PRIORITY_LABEL[lead.priority] || 'Normal'}</Text>
          </View>
          {revenue && (
            <View style={[s.revenuePill, { backgroundColor: '#4CAF5020' }]}>
              <Icon name="cash-outline" size={12} color="#4CAF50" />
              <Text style={[s.revenueText, { color: '#4CAF50' }]}>{revenue}</Text>
            </View>
          )}
        </View>

        {/* Contact details */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <InfoRow icon="person-outline"        label="Customer"    value={lead.partner_id?.[1]} />
          <InfoRow icon="mail-outline"          label="Email"       value={lead.email_from}
            onPress={() => lead.email_from && Linking.openURL(`mailto:${lead.email_from}`)} />
          <InfoRow icon="call-outline"          label="Phone"       value={lead.phone}
            onPress={() => lead.phone && Linking.openURL(`tel:${lead.phone}`)} />
          <InfoRow icon="person-circle-outline" label="Salesperson" value={lead.user_id?.[1]} />
          <InfoRow icon="people-outline"        label="Sales Team"  value={lead.team_id?.[1]} />
          <InfoRow icon="business-outline"      label="Company"     value={lead.company_id?.[1]} />
          <InfoRow icon="radio-button-on-outline" label="Source"    value={lead.source_id?.[1]} />
          <InfoRow icon="calendar-outline"      label="Deadline"    value={lead.date_deadline
            ? new Date(lead.date_deadline + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
            : null} />
        </View>

        {/* Notes */}
        {lead.description ? (
          <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>Notes</Text>
            <Text style={[s.description, { color: colors.text }]}>{lead.description}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#4CAF50', opacity: acting ? 0.6 : 1 }]}
            onPress={handleMarkWon}
            disabled={acting}>
            <Icon name="trophy-outline" size={18} color="#fff" />
            <Text style={s.actionBtnText}>Won</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: '#F44336', opacity: acting ? 0.6 : 1 }]}
            onPress={handleMarkLost}
            disabled={acting}>
            <Icon name="close-circle-outline" size={18} color="#fff" />
            <Text style={s.actionBtnText}>Lost</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.actionBtn, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('LeadForm', { lead })}>
            <Icon name="create-outline" size={18} color="#fff" />
            <Text style={s.actionBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:       { padding: 8 },
  headerTitle:   { flex: 1, fontSize: 17, fontWeight: '600', marginHorizontal: 4 },
  editBtn:       { padding: 8 },
  scroll:        { padding: 12, paddingBottom: 100, gap: 12 },
  banner:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  stagePill:     { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  stagePillText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  priorityPill:  { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  priorityText:  { fontSize: 12, fontWeight: '600' },
  revenuePill:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  revenueText:   { fontSize: 12, fontWeight: '600' },
  section:       { borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sectionTitle:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, padding: 12, paddingBottom: 4 },
  infoRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 12 },
  infoIcon:      { width: 20, alignItems: 'center' },
  infoContent:   { flex: 1 },
  infoLabel:     { fontSize: 11 },
  infoValue:     { fontSize: 14, fontWeight: '500', marginTop: 1 },
  description:   { fontSize: 14, lineHeight: 21, padding: 12, paddingTop: 4 },
  actions:       { flexDirection: 'row', gap: 10 },
  actionBtn:     { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  emptyText:     { fontSize: 15 },
});

export default LeadDetailScreen;
