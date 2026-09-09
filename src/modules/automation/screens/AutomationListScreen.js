import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import UpgradePrompt from '../../../components/UpgradePrompt';
import AutomationService from '../automationService';
import { friendlyError } from '../../../utils/errorUtils';

const TRIGGER_META = {
  manual:         { label: 'Manual',          icon: 'play-outline',        color: '#6B7280' },
  scheduled:      { label: 'Scheduled',        icon: 'time-outline',        color: '#2563EB' },
  webhook:        { label: 'Webhook',           icon: 'globe-outline',       color: '#7C3AED' },
  record_created: { label: 'Record Created',   icon: 'document-outline',    color: '#16A34A' },
  record_updated: { label: 'Record Updated',   icon: 'create-outline',      color: '#EA580C' },
};

const WorkflowCard = ({ wf, onPress, onToggle, colors }) => {
  const meta    = TRIGGER_META[wf.trigger_type] || TRIGGER_META.manual;
  const success = wf.run_count > 0 ? Math.round((wf.success_count / wf.run_count) * 100) : null;

  return (
    <TouchableOpacity
      style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.75}>
      {/* Left accent */}
      <View style={[s.accent, { backgroundColor: wf.active ? meta.color : colors.border }]} />

      <View style={s.cardBody}>
        {/* Top row */}
        <View style={s.cardTop}>
          <Text style={[s.wfName, { color: colors.text }]} numberOfLines={1}>
            {wf.name}
          </Text>
          <TouchableOpacity
            style={[s.toggleBtn, { backgroundColor: wf.active ? '#4CAF5020' : colors.inputBackground }]}
            onPress={() => onToggle(wf)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon
              name={wf.active ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={wf.active ? '#4CAF50' : colors.textLight}
            />
          </TouchableOpacity>
        </View>

        {/* Trigger badge */}
        <View style={s.badgeRow}>
          <View style={[s.badge, { backgroundColor: meta.color + '15' }]}>
            <Icon name={meta.icon} size={12} color={meta.color} />
            <Text style={[s.badgeText, { color: meta.color }]}>{meta.label}</Text>
          </View>
          {wf.trigger_model ? (
            <View style={[s.badge, { backgroundColor: colors.inputBackground }]}>
              <Text style={[s.badgeText, { color: colors.textSecondary }]}>{wf.trigger_model}</Text>
            </View>
          ) : null}
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <View style={s.stat}>
            <Icon name="play-circle-outline" size={13} color={colors.textLight} />
            <Text style={[s.statText, { color: colors.textSecondary }]}>
              {wf.run_count} runs
            </Text>
          </View>
          {success !== null && (
            <View style={s.stat}>
              <Icon
                name="checkmark-circle-outline"
                size={13}
                color={success >= 80 ? '#4CAF50' : '#FF9800'}
              />
              <Text style={[s.statText, { color: success >= 80 ? '#4CAF50' : '#FF9800' }]}>
                {success}% success
              </Text>
            </View>
          )}
          {wf.last_run_at && (
            <Text style={[s.lastRun, { color: colors.textLight }]}>
              {new Date(wf.last_run_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          )}
        </View>
      </View>

      <Icon name="chevron-forward" size={16} color={colors.textLight} style={{ marginRight: 12 }} />
    </TouchableOpacity>
  );
};

const AutomationListScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const { hasAccess, upgradePrompt, closePrompt } = useFeatureAccess();

  const [workflows,  setWorkflows]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  if (!hasAccess('automation')) {
    return <UpgradePrompt {...upgradePrompt} onClose={closePrompt} />;
  }

  const fetchWorkflows = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      setWorkflows(await AutomationService.list());
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWorkflows(); }, [fetchWorkflows]);

  const handleToggle = async (wf) => {
    try {
      const active = await AutomationService.toggle(wf.id, wf.active);
      setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, active } : w));
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    }
  };

  const handleCreate = () => {
    navigation.navigate('WorkflowDetail', { mode: 'create' });
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Automation</Text>
        <TouchableOpacity
          style={[s.addBtn, { backgroundColor: colors.primary }]}
          onPress={handleCreate}>
          <Icon name="add" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={workflows}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <WorkflowCard
            wf={item}
            colors={colors}
            onPress={() => navigation.navigate('WorkflowDetail', { workflowId: item.id, workflowName: item.name })}
            onToggle={handleToggle}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchWorkflows(true)} colors={[colors.primary]} />
        }
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="flash-outline" size={56} color={colors.textLight} />
            <Text style={[s.emptyTitle, { color: colors.text }]}>No workflows yet</Text>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              Create your first automation to get started
            </Text>
            <TouchableOpacity
              style={[s.emptyBtn, { backgroundColor: colors.primary }]}
              onPress={handleCreate}>
              <Icon name="add" size={18} color="#fff" />
              <Text style={s.emptyBtnText}>New Workflow</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:  { fontSize: 20, fontWeight: '700' },
  addBtn:       { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  list:         { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 100 },
  card:         { flexDirection: 'row', alignItems: 'center', borderRadius: 12, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  accent:       { width: 4, alignSelf: 'stretch' },
  cardBody:     { flex: 1, padding: 12, gap: 6 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wfName:       { flex: 1, fontSize: 15, fontWeight: '600' },
  toggleBtn:    { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  badgeRow:     { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  badge:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText:    { fontSize: 11, fontWeight: '600' },
  statsRow:     { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stat:         { flexDirection: 'row', alignItems: 'center', gap: 3 },
  statText:     { fontSize: 12 },
  lastRun:      { fontSize: 11, marginLeft: 'auto' },
  empty:        { alignItems: 'center', paddingVertical: 80, gap: 10 },
  emptyTitle:   { fontSize: 17, fontWeight: '700', marginTop: 6 },
  emptyText:    { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  emptyBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});

export default AutomationListScreen;
