import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import AutomationService from '../automationService';

const STATUS_META = {
  success: { color: '#4CAF50', icon: 'checkmark-circle', label: 'Success' },
  failed:  { color: '#F44336', icon: 'close-circle',     label: 'Failed'  },
  running: { color: '#2196F3', icon: 'time',             label: 'Running' },
};

const STEP_STATUS = {
  success: { color: '#4CAF50', icon: 'checkmark-circle-outline' },
  failed:  { color: '#F44336', icon: 'close-circle-outline'     },
  skipped: { color: '#9E9E9E', icon: 'remove-circle-outline'    },
};

const RunCard = ({ run, isExpanded, onExpand, colors }) => {
  const meta = STATUS_META[run.status] || STATUS_META.success;
  const date = new Date(run.created_at);
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <TouchableOpacity style={s.cardHeader} onPress={onExpand} activeOpacity={0.7}>
        <View style={[s.statusDot, { backgroundColor: meta.color + '20' }]}>
          <Icon name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={s.cardInfo}>
          <Text style={[s.runId, { color: colors.text }]}>Run #{run.id}</Text>
          <Text style={[s.runDate, { color: colors.textSecondary }]}>{dateStr} · {timeStr}</Text>
        </View>
        <View style={s.cardRight}>
          {run.duration_ms != null && (
            <Text style={[s.duration, { color: colors.textLight }]}>{run.duration_ms}ms</Text>
          )}
          <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textLight} />
        </View>
      </TouchableOpacity>

      {run.error ? (
        <View style={[s.errorBox, { backgroundColor: '#FEE2E2' }]}>
          <Icon name="warning-outline" size={14} color="#DC2626" />
          <Text style={[s.errorText, { color: '#DC2626' }]} numberOfLines={isExpanded ? undefined : 2}>
            {run.error}
          </Text>
        </View>
      ) : null}

      {isExpanded && run.steps?.length > 0 && (
        <View style={[s.stepsContainer, { borderTopColor: colors.border }]}>
          {run.steps.map((step, idx) => {
            const sm = STEP_STATUS[step.status] || STEP_STATUS.success;
            return (
              <View key={step.node_id || idx} style={[s.step, idx < run.steps.length - 1 && s.stepBorder, { borderColor: colors.border }]}>
                <View style={s.stepLeft}>
                  <Icon name={sm.icon} size={16} color={sm.color} />
                  <View style={s.stepLine}>
                    {idx < run.steps.length - 1 && (
                      <View style={[s.connector, { backgroundColor: colors.border }]} />
                    )}
                  </View>
                </View>
                <View style={s.stepBody}>
                  <Text style={[s.stepLabel, { color: colors.text }]}>
                    {step.node_label || step.node_type}
                  </Text>
                  <Text style={[s.stepType, { color: colors.textLight }]}>{step.node_type}</Text>
                  {step.error ? (
                    <Text style={[s.stepError, { color: '#F44336' }]}>{step.error}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const WorkflowRunsScreen = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { workflowId, workflowName } = route.params || {};

  const [runs,       setRuns]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded,   setExpanded]   = useState(null);

  const fetchRuns = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      setRuns(await AutomationService.history(workflowId));
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workflowId]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const successCount = runs.filter(r => r.status === 'success').length;
  const failCount    = runs.filter(r => r.status === 'failed').length;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Icon name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {workflowName || 'History'}
        </Text>
      </View>

      {runs.length > 0 && (
        <View style={[s.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={s.stat}>
            <Text style={[s.statNum, { color: colors.text }]}>{runs.length}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Total</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statNum, { color: '#4CAF50' }]}>{successCount}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Success</Text>
          </View>
          <View style={[s.statDivider, { backgroundColor: colors.border }]} />
          <View style={s.stat}>
            <Text style={[s.statNum, { color: '#F44336' }]}>{failCount}</Text>
            <Text style={[s.statLabel, { color: colors.textSecondary }]}>Failed</Text>
          </View>
        </View>
      )}

      <FlatList
        data={runs}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <RunCard
            run={item}
            colors={colors}
            isExpanded={expanded === item.id}
            onExpand={() => setExpanded(expanded === item.id ? null : item.id)}
          />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchRuns(true)} colors={[colors.primary]} />
        }
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Icon name="list-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No runs yet</Text>
          </View>
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backBtn:     { padding: 4 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700' },
  statsBar:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  stat:        { flex: 1, alignItems: 'center', gap: 2 },
  statNum:     { fontSize: 20, fontWeight: '700' },
  statLabel:   { fontSize: 11, fontWeight: '600' },
  statDivider: { width: 1, height: 32 },
  list:        { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 100 },
  card:        { borderRadius: 12, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  statusDot:   { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  cardInfo:    { flex: 1 },
  runId:       { fontSize: 14, fontWeight: '600' },
  runDate:     { fontSize: 12 },
  cardRight:   { alignItems: 'flex-end', gap: 4 },
  duration:    { fontSize: 11 },
  errorBox:    { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginHorizontal: 14, marginBottom: 14, padding: 10, borderRadius: 8 },
  errorText:   { flex: 1, fontSize: 12 },
  stepsContainer:{ borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  step:        { flexDirection: 'row', gap: 10, paddingBottom: 10 },
  stepLeft:    { alignItems: 'center', width: 18 },
  stepLine:    { flex: 1, alignItems: 'center' },
  connector:   { width: 1, flex: 1, marginTop: 3 },
  stepBorder:  {},
  stepBody:    { flex: 1, paddingBottom: 2 },
  stepLabel:   { fontSize: 13, fontWeight: '600' },
  stepType:    { fontSize: 11, marginTop: 1 },
  stepError:   { fontSize: 11, marginTop: 2 },
  empty:       { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText:   { fontSize: 15 },
});

export default WorkflowRunsScreen;
