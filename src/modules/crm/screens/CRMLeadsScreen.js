import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import UpgradePrompt from '../../../components/UpgradePrompt';
import crmService from '../crmService';

const PRIORITY_COLOR = { '0': '#9E9E9E', '1': '#2196F3', '2': '#FF9800', '3': '#F44336' };
const PRIORITY_STAR  = { '0': 'star-outline', '1': 'star', '2': 'star', '3': 'star' };

const ACTIVITY_COLOR = { overdue: '#F44336', today: '#FF9800', planned: '#4CAF50' };
const ACTIVITY_ICON  = { overdue: 'warning-outline', today: 'time-outline', planned: 'calendar-outline' };

const FILTERS = [
  { key: 'all',     label: 'All'      },
  { key: 'my',      label: 'Mine'     },
  { key: 'overdue', label: '⚠ Overdue'},
  { key: 'won',     label: 'Won'      },
];

// ── Lead card ────────────────────────────────────────────────────────────
const LeadCard = ({ lead, onPress, colors }) => {
  const accentColor  = PRIORITY_COLOR[lead.priority] || '#9E9E9E';
  const actColor     = lead.activity_state ? ACTIVITY_COLOR[lead.activity_state] : null;
  const revenue      = lead.expected_revenue
    ? `₹${Number(lead.expected_revenue).toLocaleString('en-IN')}`
    : null;
  const today        = new Date().toISOString().split('T')[0];
  const isOverdue    = lead.date_deadline && lead.date_deadline < today;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}>
      <View style={[s.cardAccent, { backgroundColor: accentColor }]} />

      <View style={s.cardBody}>
        {/* Title row */}
        <View style={s.titleRow}>
          <Text style={[s.leadName, { color: colors.text }]} numberOfLines={1}>
            {lead.name}
          </Text>
          <Icon name={PRIORITY_STAR[lead.priority]} size={14} color={accentColor} />
        </View>

        {/* Customer */}
        {lead.partner_id?.[1] && (
          <Text style={[s.customer, { color: colors.textSecondary }]} numberOfLines={1}>
            <Icon name="person-outline" size={12} /> {lead.partner_id[1]}
          </Text>
        )}

        {/* Meta row */}
        <View style={s.metaRow}>
          {/* Stage */}
          <View style={[s.badge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[s.badgeText, { color: colors.primary }]} numberOfLines={1}>
              {lead.stage_id?.[1] || '—'}
            </Text>
          </View>

          {/* Revenue */}
          {revenue && (
            <View style={[s.badge, { backgroundColor: '#4CAF5015' }]}>
              <Text style={[s.badgeText, { color: '#4CAF50' }]}>{revenue}</Text>
            </View>
          )}

          {/* Deadline */}
          {lead.date_deadline && (
            <View style={[s.badge, { backgroundColor: (isOverdue ? '#F4433615' : colors.border) }]}>
              <Text style={[s.badgeText, { color: isOverdue ? '#F44336' : colors.textSecondary }]}>
                {isOverdue ? '⚠ ' : ''}{new Date(lead.date_deadline + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          )}

          {/* Activity indicator */}
          {lead.activity_state && (
            <Icon name={ACTIVITY_ICON[lead.activity_state] || 'ellipse'} size={14} color={actColor} />
          )}
        </View>
      </View>

      {/* Salesperson avatar */}
      {lead.user_id?.[1] && (
        <View style={[s.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[s.avatarText, { color: colors.primary }]}>
            {lead.user_id[1][0]?.toUpperCase()}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── Main screen ─────────────────────────────────────────────────────────
const CRMLeadsScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);
  const { hasAccess, upgradePrompt, closePrompt } = useFeatureAccess();

  if (!hasAccess('crm')) {
    return <UpgradePrompt {...upgradePrompt} onClose={closePrompt} />;
  }

  const [leads,      setLeads]      = useState([]);
  const [stages,     setStages]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter,     setFilter]     = useState('all');
  const [search,     setSearch]     = useState('');
  const [searching,  setSearching]  = useState(false);

  const fetchLeads = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [leadsData, stagesData] = await Promise.all([
        crmService.getLeads({ userId: filter === 'my' ? user?.uid : null }),
        stages.length ? Promise.resolve(stages) : crmService.getStages(),
      ]);
      setLeads(leadsData || []);
      if (stagesData?.length) setStages(stagesData);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, user?.uid]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Filter + search
  const today = new Date().toISOString().split('T')[0];
  const visible = leads.filter(l => {
    if (filter === 'overdue') return l.date_deadline && l.date_deadline < today;
    if (filter === 'won')     return l.stage_id && stages.find(s => s.id === l.stage_id[0])?.is_won;
    return true;
  }).filter(l =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.partner_id?.[1]?.toLowerCase().includes(search.toLowerCase())
  );

  const renderHeader = () => (
    <View>
      {/* Search bar */}
      <View style={[s.searchBar, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
        <Icon name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={[s.searchInput, { color: colors.text }]}
          placeholder="Search leads..."
          placeholderTextColor={colors.textSecondary}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearching(true)}
          onBlur={() => setSearching(false)}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Icon name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter chips */}
      <View style={s.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[s.chip, filter === f.key && { backgroundColor: colors.primary }]}
            onPress={() => setFilter(f.key)}>
            <Text style={[s.chipText, { color: filter === f.key ? '#fff' : colors.textSecondary }]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[s.count, { color: colors.textSecondary }]}>
        {visible.length} {visible.length === 1 ? 'opportunity' : 'opportunities'}
      </Text>
    </View>
  );

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
        <Text style={[s.headerTitle, { color: colors.text }]}>Leads</Text>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('LeadForm', {})}>
          <Icon name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={visible}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <LeadCard
            lead={item}
            colors={colors}
            onPress={() => navigation.navigate('LeadDetail', { leadId: item.id, leadName: item.name })}
          />
        )}
        ListHeaderComponent={renderHeader}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchLeads(true)} colors={[colors.primary]} />}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="trending-up-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No opportunities found</Text>
          </View>
        }
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
  list:        { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 100 },
  searchBar:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 0, marginBottom: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  filters:     { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  chip:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#0000000A' },
  chipText:    { fontSize: 12, fontWeight: '600' },
  count:       { fontSize: 12, marginBottom: 8 },
  card:        { flexDirection: 'row', borderRadius: 12, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardAccent:  { width: 4 },
  cardBody:    { flex: 1, padding: 12, gap: 5 },
  titleRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  leadName:    { flex: 1, fontSize: 15, fontWeight: '600' },
  customer:    { fontSize: 13 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  badge:       { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:   { fontSize: 11, fontWeight: '600' },
  avatar:      { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', margin: 12 },
  avatarText:  { fontSize: 13, fontWeight: '700' },
  empty:       { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText:   { fontSize: 15 },
});

export default CRMLeadsScreen;
