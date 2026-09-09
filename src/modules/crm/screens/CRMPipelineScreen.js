import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import UpgradePrompt from '../../../components/UpgradePrompt';
import crmService from '../crmService';

const STAGE_COLORS = ['#2196F3', '#9C27B0', '#FF9800', '#4CAF50', '#F44336', '#00BCD4', '#795548'];

const CRMPipelineScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);
  const { hasAccess, upgradePrompt, closePrompt } = useFeatureAccess();

  if (!hasAccess('crm')) {
    return <UpgradePrompt {...upgradePrompt} onClose={closePrompt} />;
  }

  const [pipeline,   setPipeline]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [myOnly,     setMyOnly]     = useState(false);

  const fetchPipeline = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await crmService.getPipeline(myOnly ? user?.uid : null);
      setPipeline(data || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [myOnly, user?.uid]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  const totalRevenue = pipeline.reduce((sum, s) => sum + (s.expected_revenue || 0), 0);
  const totalLeads   = pipeline.reduce((sum, s) => sum + (s.stage_id_count || 0), 0);

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
        <Text style={[s.headerTitle, { color: colors.text }]}>Pipeline</Text>
        <TouchableOpacity
          style={[s.toggle, { backgroundColor: myOnly ? colors.primary : colors.border }]}
          onPress={() => setMyOnly(v => !v)}>
          <Icon name="person" size={14} color={myOnly ? '#fff' : colors.textSecondary} />
          <Text style={[s.toggleText, { color: myOnly ? '#fff' : colors.textSecondary }]}>Mine</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPipeline(true)} colors={[colors.primary]} />}
        contentContainerStyle={s.scroll}>

        {/* Summary cards */}
        <View style={s.summaryRow}>
          <View style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.summaryValue, { color: colors.primary }]}>{totalLeads}</Text>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Opportunities</Text>
          </View>
          <View style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.summaryValue, { color: '#4CAF50' }]}>
              ₹{totalRevenue >= 100000
                ? `${(totalRevenue / 100000).toFixed(1)}L`
                : totalRevenue.toLocaleString('en-IN')}
            </Text>
            <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>Expected Revenue</Text>
          </View>
        </View>

        {/* Stage columns */}
        {pipeline.map((stage, idx) => {
          const stageColor  = STAGE_COLORS[idx % STAGE_COLORS.length];
          const count       = stage.stage_id_count || 0;
          const revenue     = stage.expected_revenue || 0;
          const avgProb     = stage.probability || 0;
          const stageName   = Array.isArray(stage.stage_id) ? stage.stage_id[1] : 'Unknown';
          const stageId     = Array.isArray(stage.stage_id) ? stage.stage_id[0] : null;

          return (
            <TouchableOpacity
              key={stageId || idx}
              style={[s.stageCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => navigation.jumpTo('CRMLeads', { stageId, stageName })}
              activeOpacity={0.8}>

              {/* Stage header */}
              <View style={s.stageHeader}>
                <View style={[s.stageColorDot, { backgroundColor: stageColor }]} />
                <Text style={[s.stageName, { color: colors.text }]} numberOfLines={1}>{stageName}</Text>
                <View style={[s.stageCount, { backgroundColor: stageColor + '20' }]}>
                  <Text style={[s.stageCountText, { color: stageColor }]}>{count}</Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={[s.progressBg, { backgroundColor: colors.border }]}>
                <View style={[s.progressFill, { backgroundColor: stageColor, width: `${Math.min(avgProb, 100)}%` }]} />
              </View>
              <Text style={[s.probText, { color: colors.textSecondary }]}>{Math.round(avgProb)}% avg probability</Text>

              {/* Revenue */}
              <View style={s.stageFooter}>
                <Icon name="cash-outline" size={14} color="#4CAF50" />
                <Text style={[s.revenueText, { color: '#4CAF50' }]}>
                  ₹{revenue >= 100000
                    ? `${(revenue / 100000).toFixed(1)}L`
                    : revenue.toLocaleString('en-IN')}
                </Text>
                <Text style={[s.viewAll, { color: colors.primary }]}>View all →</Text>
              </View>
            </TouchableOpacity>
          );
        })}

        {pipeline.length === 0 && (
          <View style={s.empty}>
            <Icon name="git-branch-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No pipeline data</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:      { flex: 1 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:    { fontSize: 20, fontWeight: '700' },
  toggle:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  toggleText:     { fontSize: 12, fontWeight: '600' },
  scroll:         { padding: 12, paddingBottom: 100, gap: 12 },
  summaryRow:     { flexDirection: 'row', gap: 12, marginBottom: 4 },
  summaryCard:    { flex: 1, padding: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', gap: 4 },
  summaryValue:   { fontSize: 22, fontWeight: '800' },
  summaryLabel:   { fontSize: 12 },
  stageCard:      { borderRadius: 12, padding: 14, borderWidth: StyleSheet.hairlineWidth, gap: 8 },
  stageHeader:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageColorDot:  { width: 10, height: 10, borderRadius: 5 },
  stageName:      { flex: 1, fontSize: 15, fontWeight: '600' },
  stageCount:     { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  stageCountText: { fontSize: 13, fontWeight: '700' },
  progressBg:     { height: 4, borderRadius: 2 },
  progressFill:   { height: 4, borderRadius: 2 },
  probText:       { fontSize: 11 },
  stageFooter:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  revenueText:    { fontSize: 14, fontWeight: '600', flex: 1 },
  viewAll:        { fontSize: 12, fontWeight: '600' },
  empty:          { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyText:      { fontSize: 15 },
});

export default CRMPipelineScreen;
