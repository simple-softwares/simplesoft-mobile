import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, ActivityIndicator, RefreshControl,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import foundersRadarService from '../foundersRadarService';

const ACCENT = '#7C3AED';

// ── Storage keys ──────────────────────────────────────────────────────────────

const GOALS_KEY   = 'founders_radar_goals';
const COMPASS_KEY = (weekKey) => `founders_radar_compass_${weekKey}`;

function getWeekKey() {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

// ── Weekly Compass items ──────────────────────────────────────────────────────

const COMPASS_ITEMS = [
  { id: 'daybook',    label: 'Review daybook & financials' },
  { id: 'pipeline',   label: 'Check sales pipeline progress' },
  { id: 'expenses',   label: 'Review expenses & cash position' },
  { id: 'team',       label: 'Team check-in & blockers' },
  { id: 'goals',      label: 'Review weekly goals progress' },
  { id: 'customer',   label: 'Customer feedback & retention' },
  { id: 'strategic',  label: 'Strategic alignment check' },
  { id: 'personal',   label: 'Personal growth & reflection' },
];

// ── Vision Board tab ──────────────────────────────────────────────────────────

const HORIZONS = [
  { key: '1yr', label: '1 Year',  icon: 'flag-outline',     color: '#10B981' },
  { key: '3yr', label: '3 Years', icon: 'trending-up-outline', color: '#3B82F6' },
  { key: '5yr', label: '5 Years', icon: 'rocket-outline',   color: ACCENT },
];

function VisionBoard({ colors }) {
  const [goals,      setGoals]      = useState([]);
  const [horizon,    setHorizon]    = useState('1yr');
  const [newText,    setNewText]    = useState('');
  const [showInput,  setShowInput]  = useState(false);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(GOALS_KEY).then(raw => {
      if (raw) setGoals(JSON.parse(raw));
    });
  }, []);

  const persist = async (updated) => {
    setGoals(updated);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(updated));
  };

  const addGoal = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    const goal = { id: Date.now().toString(), horizon, text: newText.trim(), done: false };
    await persist([...goals, goal]);
    setNewText('');
    setShowInput(false);
    setSaving(false);
  };

  const toggleGoal = async (id) => {
    await persist(goals.map(g => g.id === id ? { ...g, done: !g.done } : g));
  };

  const deleteGoal = (id) => {
    Alert.alert('Delete Goal', 'Remove this goal?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => persist(goals.filter(g => g.id !== id)) },
    ]);
  };

  const currentHorizon = HORIZONS.find(h => h.key === horizon);
  const filtered = goals.filter(g => g.horizon === horizon);
  const done = filtered.filter(g => g.done).length;

  return (
    <ScrollView contentContainerStyle={vs.scroll} keyboardShouldPersistTaps="handled">
      {/* Horizon tabs */}
      <View style={vs.horizonRow}>
        {HORIZONS.map(h => (
          <TouchableOpacity
            key={h.key}
            style={[vs.horizonBtn, { borderColor: h.color, backgroundColor: horizon === h.key ? h.color : 'transparent' }]}
            onPress={() => setHorizon(h.key)}>
            <Icon name={h.icon} size={14} color={horizon === h.key ? '#fff' : h.color} />
            <Text style={[vs.horizonLabel, { color: horizon === h.key ? '#fff' : h.color }]}>{h.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Progress */}
      {filtered.length > 0 && (
        <View style={vs.progressRow}>
          <Text style={[vs.progressLabel, { color: colors.textSecondary }]}>
            {done} / {filtered.length} goals achieved
          </Text>
          <View style={[vs.progressBg, { backgroundColor: colors.border }]}>
            <View style={[vs.progressFill, {
              width: `${filtered.length > 0 ? (done / filtered.length) * 100 : 0}%`,
              backgroundColor: currentHorizon.color,
            }]} />
          </View>
        </View>
      )}

      {/* Goals list */}
      {filtered.map(goal => (
        <View key={goal.id} style={[vs.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TouchableOpacity onPress={() => toggleGoal(goal.id)} style={vs.goalCheck}>
            <Icon
              name={goal.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={goal.done ? currentHorizon.color : colors.textLight}
            />
          </TouchableOpacity>
          <Text style={[vs.goalText, { color: colors.text }, goal.done && vs.goalDone]}>
            {goal.text}
          </Text>
          <TouchableOpacity onPress={() => deleteGoal(goal.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="trash-outline" size={16} color={colors.textLight} />
          </TouchableOpacity>
        </View>
      ))}

      {filtered.length === 0 && !showInput && (
        <View style={vs.empty}>
          <Icon name="flag-outline" size={40} color={colors.textLight} />
          <Text style={[vs.emptyText, { color: colors.textSecondary }]}>
            No {currentHorizon.label} goals yet
          </Text>
          <Text style={[vs.emptyHint, { color: colors.textLight }]}>
            Tap + to add your first goal
          </Text>
        </View>
      )}

      {/* Add input */}
      {showInput && (
        <View style={[vs.inputCard, { backgroundColor: colors.surface, borderColor: currentHorizon.color }]}>
          <TextInput
            style={[vs.input, { color: colors.text }]}
            placeholder={`What's your ${currentHorizon.label} goal?`}
            placeholderTextColor={colors.textLight}
            value={newText}
            onChangeText={setNewText}
            autoFocus
            multiline
          />
          <View style={vs.inputActions}>
            <TouchableOpacity onPress={() => { setShowInput(false); setNewText(''); }} style={vs.cancelBtn}>
              <Text style={[vs.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={addGoal}
              disabled={saving || !newText.trim()}
              style={[vs.addBtn, { backgroundColor: currentHorizon.color, opacity: (!newText.trim() || saving) ? 0.5 : 1 }]}>
              <Text style={vs.addBtnText}>Add Goal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* FAB */}
      {!showInput && (
        <TouchableOpacity
          style={[vs.fab, { backgroundColor: currentHorizon.color }]}
          onPress={() => setShowInput(true)}>
          <Icon name="add" size={24} color="#fff" />
          <Text style={vs.fabText}>Add Goal</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const vs = StyleSheet.create({
  scroll:        { padding: 16, paddingBottom: 100 },
  horizonRow:    { flexDirection: 'row', gap: 8, marginBottom: 16 },
  horizonBtn:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  horizonLabel:  { fontSize: 12, fontWeight: '700' },
  progressRow:   { marginBottom: 12, gap: 6 },
  progressLabel: { fontSize: 12 },
  progressBg:    { height: 5, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 5, borderRadius: 3 },
  goalCard:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: StyleSheet.hairlineWidth },
  goalCheck:     { paddingTop: 1 },
  goalText:      { flex: 1, fontSize: 14, lineHeight: 20 },
  goalDone:      { textDecorationLine: 'line-through', opacity: 0.5 },
  empty:         { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyText:     { fontSize: 15, fontWeight: '600' },
  emptyHint:     { fontSize: 13 },
  inputCard:     { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1.5 },
  input:         { fontSize: 14, lineHeight: 20, minHeight: 60, textAlignVertical: 'top' },
  inputActions:  { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 12 },
  cancelBtn:     { paddingHorizontal: 14, paddingVertical: 8 },
  cancelText:    { fontSize: 14, fontWeight: '600' },
  addBtn:        { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  addBtnText:    { color: '#fff', fontSize: 14, fontWeight: '700' },
  fab:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  fabText:       { color: '#fff', fontSize: 15, fontWeight: '700' },
});

// ── Business Pulse tab ────────────────────────────────────────────────────────

function fmt(val, prefix = '₹') {
  if (val == null) return '—';
  const n = Number(val);
  if (isNaN(n)) return '—';
  if (Math.abs(n) >= 1_00_000) return `${prefix}${(n / 1_00_000).toFixed(1)}L`;
  if (Math.abs(n) >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${n.toFixed(0)}`;
}

function KpiCard({ label, value, icon, color, colors }) {
  return (
    <View style={[bp.kpiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[bp.kpiIcon, { backgroundColor: color + '18' }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={[bp.kpiValue, { color: colors.text }]}>{value}</Text>
      <Text style={[bp.kpiLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function InsightRow({ icon, text, color, colors }) {
  return (
    <View style={[bp.insight, { backgroundColor: color + '10', borderColor: color + '30' }]}>
      <Icon name={icon} size={16} color={color} />
      <Text style={[bp.insightText, { color: colors.text }]}>{text}</Text>
    </View>
  );
}

function BusinessPulse({ colors }) {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      setData(await foundersRadarService.getBusinessPulse());
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <View style={[bp.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  const erp  = data?.erp  || {};
  const pl   = data?.pl   || {};
  const dash = data?.dashboard?.stats || {};

  const revenue   = pl.income?.total   ?? 0;
  const expenses  = pl.expenses?.total ?? 0;
  const netProfit = pl.net_profit      ?? 0;
  const margin    = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : null;

  // Build insights
  const insights = [];
  if (erp.overdue_count > 0) {
    insights.push({ icon: 'warning-outline', text: `${erp.overdue_count} overdue invoice${erp.overdue_count > 1 ? 's' : ''} — ${fmt(erp.overdue_amount)} pending`, color: '#F44336' });
  }
  if (erp.cash_position < 0) {
    insights.push({ icon: 'alert-circle-outline', text: 'Cash position is negative — review bank account', color: '#EF4444' });
  }
  if (margin !== null && parseFloat(margin) >= 20) {
    insights.push({ icon: 'trending-up-outline', text: `Strong margin at ${margin}% — above 20% threshold`, color: '#10B981' });
  } else if (margin !== null && parseFloat(margin) < 10) {
    insights.push({ icon: 'trending-down-outline', text: `Low margin at ${margin}% — review cost structure`, color: '#FF9800' });
  }
  if (dash.overdue_tasks > 0) {
    insights.push({ icon: 'time-outline', text: `${dash.overdue_tasks} overdue task${dash.overdue_tasks > 1 ? 's' : ''} — team attention needed`, color: '#FF9800' });
  }

  return (
    <ScrollView
      contentContainerStyle={bp.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[ACCENT]} />}>

      <Text style={[bp.sectionTitle, { color: colors.textSecondary }]}>FINANCIAL OVERVIEW</Text>
      <View style={bp.kpiGrid}>
        <KpiCard label="Revenue (FY)" value={fmt(revenue)} icon="cash-outline" color="#10B981" colors={colors} />
        <KpiCard label="Net Profit" value={fmt(netProfit)} icon="trending-up-outline" color={netProfit >= 0 ? '#3B82F6' : '#EF4444'} colors={colors} />
        <KpiCard label="Invoiced (Mo)" value={fmt(erp.invoiced_this_month)} icon="document-text-outline" color="#7C3AED" colors={colors} />
        <KpiCard label="Cash Position" value={fmt(erp.cash_position)} icon="wallet-outline" color={erp.cash_position >= 0 ? '#10B981' : '#EF4444'} colors={colors} />
        <KpiCard label="Outstanding AR" value={fmt(erp.outstanding_ar)} icon="hourglass-outline" color="#FF9800" colors={colors} />
        <KpiCard label="Margin" value={margin != null ? `${margin}%` : '—'} icon="pie-chart-outline" color="#EC4899" colors={colors} />
      </View>

      <Text style={[bp.sectionTitle, { color: colors.textSecondary, marginTop: 8 }]}>OPERATIONS</Text>
      <View style={bp.kpiGrid}>
        <KpiCard label="Team Size" value={String(data?.teamSize || 0)} icon="people-outline" color="#6366F1" colors={colors} />
        <KpiCard label="Open Tasks" value={String(dash.open_tasks ?? '—')} icon="checkbox-outline" color="#F59E0B" colors={colors} />
        <KpiCard label="Overdue Tasks" value={String(dash.overdue_tasks ?? '—')} icon="time-outline" color={dash.overdue_tasks > 0 ? '#EF4444' : '#10B981'} colors={colors} />
        <KpiCard label="Open Quotes" value={String(erp.open_quotes ?? '—')} icon="pricetag-outline" color="#8B5CF6" colors={colors} />
        <KpiCard label="Projects" value={String(dash.total_projects ?? '—')} icon="folder-outline" color="#0EA5E9" colors={colors} />
        <KpiCard label="Contacts" value={String(dash.total_contacts ?? '—')} icon="person-outline" color="#14B8A6" colors={colors} />
      </View>

      {insights.length > 0 && (
        <>
          <Text style={[bp.sectionTitle, { color: colors.textSecondary, marginTop: 8 }]}>INSIGHTS</Text>
          {insights.map((ins, i) => (
            <InsightRow key={i} {...ins} colors={colors} />
          ))}
        </>
      )}
    </ScrollView>
  );
}

const bp = StyleSheet.create({
  scroll:       { padding: 16, paddingBottom: 100 },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, marginBottom: 10 },
  kpiGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  kpiCard:      { width: '47%', borderRadius: 14, padding: 14, gap: 6, borderWidth: StyleSheet.hairlineWidth },
  kpiIcon:      { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  kpiValue:     { fontSize: 20, fontWeight: '800' },
  kpiLabel:     { fontSize: 12, fontWeight: '500' },
  insight:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1 },
  insightText:  { flex: 1, fontSize: 13, lineHeight: 18 },
});

// ── Weekly Compass tab ────────────────────────────────────────────────────────

function WeeklyCompass({ colors }) {
  const weekKey = getWeekKey();
  const storageKey = COMPASS_KEY(weekKey);

  const [checked,     setChecked]     = useState({});
  const [reflection,  setReflection]  = useState('');
  const [loading,     setLoading]     = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then(raw => {
      if (raw) {
        const saved = JSON.parse(raw);
        setChecked(saved.checked || {});
        setReflection(saved.reflection || '');
      }
      setLoading(false);
    });
  }, [storageKey]);

  const persist = async (newChecked, newReflection) => {
    await AsyncStorage.setItem(storageKey, JSON.stringify({ checked: newChecked, reflection: newReflection }));
  };

  const toggleItem = async (id) => {
    const updated = { ...checked, [id]: !checked[id] };
    setChecked(updated);
    await persist(updated, reflection);
  };

  const onReflectionChange = async (text) => {
    setReflection(text);
    await persist(checked, text);
  };

  const completedCount = COMPASS_ITEMS.filter(i => checked[i.id]).length;
  const progress = completedCount / COMPASS_ITEMS.length;

  if (loading) {
    return (
      <View style={[wc.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={ACCENT} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={wc.scroll} keyboardShouldPersistTaps="handled">
        {/* Progress ring substitute — simple bar */}
        <View style={[wc.progressCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={wc.progressTop}>
            <Text style={[wc.weekLabel, { color: colors.text }]}>Week {weekKey.split('-W')[1]}</Text>
            <Text style={[wc.progressCount, { color: ACCENT }]}>{completedCount}/{COMPASS_ITEMS.length}</Text>
          </View>
          <View style={[wc.progressBg, { backgroundColor: colors.border }]}>
            <View style={[wc.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={[wc.progressHint, { color: colors.textSecondary }]}>
            {completedCount === COMPASS_ITEMS.length
              ? '🎉 All items complete!'
              : `${COMPASS_ITEMS.length - completedCount} items remaining`}
          </Text>
        </View>

        {/* Checklist */}
        <Text style={[wc.sectionLabel, { color: colors.textSecondary }]}>WEEKLY CHECKLIST</Text>
        {COMPASS_ITEMS.map(item => {
          const done = !!checked[item.id];
          return (
            <TouchableOpacity
              key={item.id}
              style={[wc.checkItem, { backgroundColor: colors.surface, borderColor: done ? ACCENT : colors.border }]}
              onPress={() => toggleItem(item.id)}
              activeOpacity={0.7}>
              <View style={[wc.checkbox, { backgroundColor: done ? ACCENT : 'transparent', borderColor: done ? ACCENT : colors.textLight }]}>
                {done && <Icon name="checkmark" size={13} color="#fff" />}
              </View>
              <Text style={[wc.checkLabel, { color: done ? colors.textSecondary : colors.text }, done && wc.checkDone]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Reflection */}
        <Text style={[wc.sectionLabel, { color: colors.textSecondary, marginTop: 8 }]}>WEEKLY REFLECTION</Text>
        <View style={[wc.reflectionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[wc.reflectionInput, { color: colors.text }]}
            placeholder="What went well? What to improve next week? Key learnings..."
            placeholderTextColor={colors.textLight}
            value={reflection}
            onChangeText={onReflectionChange}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const wc = StyleSheet.create({
  scroll:         { padding: 16, paddingBottom: 100 },
  center:         { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressCard:   { borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  progressTop:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekLabel:      { fontSize: 16, fontWeight: '700' },
  progressCount:  { fontSize: 20, fontWeight: '900' },
  progressBg:     { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill:   { height: 8, borderRadius: 4, backgroundColor: ACCENT },
  progressHint:   { fontSize: 12, textAlign: 'center' },
  sectionLabel:   { fontSize: 11, fontWeight: '700', letterSpacing: 0.7, marginBottom: 8 },
  checkItem:      { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: StyleSheet.hairlineWidth },
  checkbox:       { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkLabel:     { flex: 1, fontSize: 14, lineHeight: 20 },
  checkDone:      { textDecorationLine: 'line-through', opacity: 0.5 },
  reflectionCard: { borderRadius: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth },
  reflectionInput:{ fontSize: 14, lineHeight: 21, minHeight: 120 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

const TABS = [
  { key: 'vision',  label: 'Vision Board',    icon: 'flag-outline'      },
  { key: 'pulse',   label: 'Business Pulse',  icon: 'pulse-outline'     },
  { key: 'compass', label: 'Weekly Compass',  icon: 'compass-outline'   },
];

const FoundersRadarScreen = () => {
  const { colors } = useTheme();
  const [tab, setTab] = useState('vision');

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[s.headerTitle, { color: colors.text }]}>Founder's Radar</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>Vision · Pulse · Compass</Text>
        </View>
        <View style={[s.accentDot, { backgroundColor: ACCENT }]}>
          <Icon name="radio-outline" size={18} color="#fff" />
        </View>
      </View>

      {/* Tab bar */}
      <View style={[s.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabItem, tab === t.key && [s.tabActive, { borderBottomColor: ACCENT }]]}
            onPress={() => setTab(t.key)}>
            <Icon name={t.icon} size={14} color={tab === t.key ? ACCENT : colors.textSecondary} />
            <Text style={[s.tabText, { color: tab === t.key ? ACCENT : colors.textSecondary }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab content */}
      <View style={{ flex: 1 }}>
        {tab === 'vision'  && <VisionBoard  colors={colors} />}
        {tab === 'pulse'   && <BusinessPulse colors={colors} />}
        {tab === 'compass' && <WeeklyCompass colors={colors} />}
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSub:   { fontSize: 12, marginTop: 2 },
  accentDot:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tabBar:      { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem:     { flex: 1, alignItems: 'center', paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent', gap: 3 },
  tabActive:   {},
  tabText:     { fontSize: 11, fontWeight: '600' },
});

export default FoundersRadarScreen;
