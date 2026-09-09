import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import UpgradePrompt from '../../../components/UpgradePrompt';
import crmService from '../crmService';

const STATE_CONFIG = {
  overdue: { color: '#F44336', bg: '#F4433615', icon: 'warning-outline',  label: 'Overdue'  },
  today:   { color: '#FF9800', bg: '#FF980015', icon: 'time-outline',     label: 'Today'    },
  planned: { color: '#4CAF50', bg: '#4CAF5015', icon: 'calendar-outline', label: 'Planned'  },
};

const ActivityCard = ({ lead, onPress, colors }) => {
  const cfg = STATE_CONFIG[lead.activity_state] || STATE_CONFIG.planned;
  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}>
      <View style={[s.stateBar, { backgroundColor: cfg.color }]} />
      <View style={s.cardContent}>
        <View style={s.topRow}>
          <View style={[s.stateBadge, { backgroundColor: cfg.bg }]}>
            <Icon name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[s.stateBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          {lead.activity_date_deadline && (
            <Text style={[s.deadline, { color: colors.textSecondary }]}>
              {new Date(lead.activity_date_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          )}
        </View>

        <Text style={[s.leadName, { color: colors.text }]} numberOfLines={1}>
          {lead.name}
        </Text>

        {lead.partner_id?.[1] && (
          <Text style={[s.customer, { color: colors.textSecondary }]} numberOfLines={1}>
            {lead.partner_id[1]}
          </Text>
        )}

        <View style={s.bottomRow}>
          {lead.stage_id?.[1] && (
            <View style={[s.stageBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[s.stageBadgeText, { color: colors.primary }]}>{lead.stage_id[1]}</Text>
            </View>
          )}
          {lead.activity_type_id?.[1] && (
            <Text style={[s.actType, { color: colors.textSecondary }]}>
              {lead.activity_type_id[1]}
            </Text>
          )}
          {lead.user_id?.[1] && (
            <View style={[s.userAvatar, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[s.userAvatarText, { color: colors.primary }]}>
                {lead.user_id[1][0]?.toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const CRMActivitiesScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);
  const { hasAccess, upgradePrompt, closePrompt } = useFeatureAccess();

  if (!hasAccess('crm')) {
    return <UpgradePrompt {...upgradePrompt} onClose={closePrompt} />;
  }

  const [leads,      setLeads]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myOnly,     setMyOnly]     = useState(true);

  const fetchActivities = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await crmService.getActivities(myOnly ? user?.uid : null);
      setLeads(data || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [myOnly, user?.uid]);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  // Group by activity state
  const grouped = {
    overdue: leads.filter(l => l.activity_state === 'overdue'),
    today:   leads.filter(l => l.activity_state === 'today'),
    planned: leads.filter(l => l.activity_state === 'planned'),
  };

  const sections = ['overdue', 'today', 'planned'].filter(k => grouped[k].length > 0);

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
        <Text style={[s.headerTitle, { color: colors.text }]}>Activities</Text>
        <TouchableOpacity
          style={[s.toggle, { backgroundColor: myOnly ? colors.primary : colors.border }]}
          onPress={() => setMyOnly(v => !v)}>
          <Icon name="person" size={14} color={myOnly ? '#fff' : colors.textSecondary} />
          <Text style={[s.toggleText, { color: myOnly ? '#fff' : colors.textSecondary }]}>Mine</Text>
        </TouchableOpacity>
      </View>

      {leads.length === 0 ? (
        <View style={s.center}>
          <Icon name="checkmark-done-circle-outline" size={56} color={colors.textLight} />
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>All clear! No pending activities</Text>
        </View>
      ) : (
        <FlatList
          data={sections}
          keyExtractor={k => k}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchActivities(true)} colors={[colors.primary]} />}
          contentContainerStyle={s.list}
          renderItem={({ item: key }) => {
            const cfg = STATE_CONFIG[key];
            return (
              <View>
                {/* Section header */}
                <View style={[s.sectionHeader, { backgroundColor: cfg.bg }]}>
                  <Icon name={cfg.icon} size={14} color={cfg.color} />
                  <Text style={[s.sectionTitle, { color: cfg.color }]}>
                    {cfg.label} · {grouped[key].length}
                  </Text>
                </View>

                {grouped[key].map(lead => (
                  <ActivityCard
                    key={lead.id}
                    lead={lead}
                    colors={colors}
                    onPress={() => navigation.navigate('LeadDetail', { leadId: lead.id, leadName: lead.name })}
                  />
                ))}
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container:       { flex: 1 },
  center:          { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:     { fontSize: 20, fontWeight: '700' },
  toggle:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  toggleText:      { fontSize: 12, fontWeight: '600' },
  list:            { padding: 12, paddingBottom: 100, gap: 8 },
  sectionHeader:   { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, marginBottom: 6, marginTop: 4 },
  sectionTitle:    { fontSize: 13, fontWeight: '700' },
  card:            { flexDirection: 'row', borderRadius: 12, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  stateBar:        { width: 4 },
  cardContent:     { flex: 1, padding: 12, gap: 5 },
  topRow:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stateBadge:      { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stateBadgeText:  { fontSize: 11, fontWeight: '600' },
  deadline:        { fontSize: 12 },
  leadName:        { fontSize: 15, fontWeight: '600' },
  customer:        { fontSize: 13 },
  bottomRow:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stageBadge:      { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  stageBadgeText:  { fontSize: 11, fontWeight: '600' },
  actType:         { fontSize: 12, flex: 1 },
  userAvatar:      { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  userAvatarText:  { fontSize: 11, fontWeight: '700' },
  emptyText:       { fontSize: 15, textAlign: 'center' },
});

export default CRMActivitiesScreen;
