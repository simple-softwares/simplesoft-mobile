import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import { useFeatureAccess } from '../../../hooks/useFeatureAccess';
import UpgradePrompt from '../../../components/UpgradePrompt';
import attendanceService from '../../attendance/attendanceService';
import performanceService, { INCENTIVE_TARGET } from '../performanceService';

const ACCENT = '#FF9800';

// Circular score ring (pure RN, no SVG)
const ScoreRing = ({ points, target, colors }) => {
  const pct = Math.min(points / target, 1);
  const size = 160;
  const stroke = 10;
  const inner = size - stroke * 2;
  // Simulate arc with gradient border trick using rotation
  const rotation = pct * 360;

  return (
    <View style={[sr.outer, { width: size, height: size, borderRadius: size / 2 }]}>
      {/* Background ring */}
      <View style={[sr.bgRing, { width: size, height: size, borderRadius: size / 2, borderWidth: stroke, borderColor: colors.border }]} />
      {/* Progress arc (left half) */}
      {pct > 0 && (
        <View style={[sr.clip, { width: size / 2, height: size, left: size / 2 }]}>
          <View style={[sr.arc, {
            width: size, height: size, borderRadius: size / 2,
            borderWidth: stroke, borderColor: ACCENT,
            transform: [{ rotate: `${Math.min(rotation, 180)}deg` }],
            left: -size / 2,
          }]} />
        </View>
      )}
      {pct > 0.5 && (
        <View style={[sr.clip, { width: size / 2, height: size, left: 0 }]}>
          <View style={[sr.arc, {
            width: size, height: size, borderRadius: size / 2,
            borderWidth: stroke, borderColor: ACCENT,
            transform: [{ rotate: `${rotation - 180}deg` }],
          }]} />
        </View>
      )}
      {/* Inner circle */}
      <View style={[sr.inner, { width: inner, height: inner, borderRadius: inner / 2, backgroundColor: colors.background }]}>
        <Text style={[sr.pts, { color: ACCENT }]}>{points}</Text>
        <Text style={[sr.ptsLabel, { color: colors.textSecondary }]}>points</Text>
      </View>
    </View>
  );
};

const sr = StyleSheet.create({
  outer:    { alignItems: 'center', justifyContent: 'center' },
  bgRing:   { position: 'absolute' },
  clip:     { position: 'absolute', top: 0, overflow: 'hidden' },
  arc:      { position: 'absolute', top: 0 },
  inner:    { alignItems: 'center', justifyContent: 'center', gap: 2 },
  pts:      { fontSize: 36, fontWeight: '900' },
  ptsLabel: { fontSize: 12, fontWeight: '600' },
});

const StatBox = ({ label, value, sub, color, colors }) => (
  <View style={[s.statBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[s.statValue, { color: color || colors.text }]}>{value}</Text>
    {sub ? <Text style={[s.statSub, { color: color || colors.primary }]}>{sub}</Text> : null}
    <Text style={[s.statLabel, { color: colors.textSecondary }]}>{label}</Text>
  </View>
);

const BadgeChip = ({ badge, colors }) => (
  <View style={[s.badgeChip, {
    backgroundColor: badge.earned ? ACCENT + '20' : colors.inputBackground,
    borderColor: badge.earned ? ACCENT : colors.border,
    opacity: badge.earned ? 1 : 0.45,
  }]}>
    <Text style={s.badgeEmoji}>{badge.emoji}</Text>
    <Text style={[s.badgeName, { color: badge.earned ? ACCENT : colors.textSecondary }]} numberOfLines={1}>
      {badge.name}
    </Text>
  </View>
);

const BreakdownRow = ({ label, pts, color, colors }) => (
  <View style={[s.bkRow, { borderBottomColor: colors.border }]}>
    <Text style={[s.bkLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[s.bkPts, { color: color || colors.text }]}>+{pts} pts</Text>
  </View>
);

const PerformanceMyScoreScreen = () => {
  const { colors } = useTheme();
  const user       = useSelector(s => s.auth.user);
  const { hasAccess, upgradePrompt, closePrompt } = useFeatureAccess();

  if (!hasAccess('performance')) {
    return <UpgradePrompt {...upgradePrompt} onClose={closePrompt} />;
  }

  const [stats,      setStats]      = useState(null);
  const [employee,   setEmployee]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period,     setPeriod]     = useState('month');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      let emp = employee;
      if (!emp) {
        emp = await attendanceService.getMyEmployee(user?.uid);
        setEmployee(emp);
      }
      if (!emp) return;
      const data = await performanceService.getMyStats(emp.id, user?.uid, period);
      setStats(data);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.uid, employee, period]);

  useEffect(() => { load(); }, [period]);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (!employee) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={[s.emptyText, { color: colors.textSecondary }]}>No employee record found</Text>
      </View>
    );
  }

  const pts      = stats?.totalPoints || 0;
  const earnedBadges = (stats?.badges || []).filter(b => b.earned);
  const pctGoal  = Math.min(pts / INCENTIVE_TARGET * 100, 100).toFixed(0);
  const bk       = stats?.breakdown || {};

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[s.headerTitle, { color: colors.text }]}>My Performance</Text>
          <Text style={[s.headerSub, { color: colors.textSecondary }]}>{employee.name}</Text>
        </View>
        {/* Period toggle */}
        <View style={[s.periodToggle, { backgroundColor: colors.inputBackground }]}>
          {['week', 'month'].map(p => (
            <TouchableOpacity
              key={p}
              style={[s.periodBtn, period === p && { backgroundColor: ACCENT }]}
              onPress={() => setPeriod(p)}>
              <Text style={[s.periodText, { color: period === p ? '#fff' : colors.textSecondary }]}>
                {p === 'week' ? 'Week' : 'Month'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[ACCENT]} />}>

        {/* Score ring + rank */}
        <View style={s.heroRow}>
          <ScoreRing points={pts} target={INCENTIVE_TARGET} colors={colors} />
          <View style={s.heroRight}>
            <View style={[s.rankBadge, { backgroundColor: ACCENT }]}>
              <Text style={s.rankText}>#{stats?.rank || '—'}</Text>
              <Text style={s.rankLabel}>Team Rank</Text>
            </View>
            <View style={[s.streakBadge, { backgroundColor: '#FF572220' }]}>
              <Text style={s.streakEmoji}>🔥</Text>
              <Text style={[s.streakNum, { color: '#FF5722' }]}>{stats?.streak || 0}</Text>
              <Text style={[s.streakLabel, { color: '#FF5722' }]}>day streak</Text>
            </View>
          </View>
        </View>

        {/* Incentive goal */}
        <View style={[s.goalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.goalTop}>
            <Text style={[s.goalTitle, { color: colors.text }]}>Bonus Goal</Text>
            <Text style={[s.goalPts, { color: ACCENT }]}>{pts} / {INCENTIVE_TARGET} pts</Text>
          </View>
          <View style={[s.goalBar, { backgroundColor: colors.border }]}>
            <View style={[s.goalFill, { width: `${pctGoal}%`, backgroundColor: ACCENT }]} />
          </View>
          <Text style={[s.goalSub, { color: colors.textSecondary }]}>
            {pts >= INCENTIVE_TARGET
              ? '🎉 Eligible for bonus!'
              : `${INCENTIVE_TARGET - pts} pts to go`}
          </Text>
        </View>

        {/* Stats row */}
        <View style={s.statsRow}>
          <StatBox label="Days Present" value={stats?.monthAttendance || 0} color="#4CAF50" colors={colors} />
          <StatBox label="Tasks Done"   value={stats?.tasksCompleted  || 0} color="#2196F3" colors={colors} />
          <StatBox label="Early Ins"    value={stats?.earlyCheckIns   || 0} color="#FF9800" colors={colors} />
          <StatBox label="Week Days"    value={stats?.weekAttendance   || 0} color="#9C27B0" colors={colors} />
        </View>

        {/* Points breakdown */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>POINTS BREAKDOWN</Text>
          <BreakdownRow label={`Attendance (${stats?.monthAttendance || 0} days × 5)`} pts={bk.attendance || 0} color="#4CAF50" colors={colors} />
          <BreakdownRow label={`Tasks completed (${stats?.tasksCompleted || 0} × 10)`}  pts={bk.tasks      || 0} color="#2196F3" colors={colors} />
          <BreakdownRow label={`Early check-in bonus (${stats?.earlyCheckIns || 0} × 3)`} pts={bk.earlyBonus || 0} color="#FF9800" colors={colors} />
          {bk.streakBonus > 0 && (
            <BreakdownRow label={`Streak bonus (${stats?.streak || 0}-day streak)`} pts={bk.streakBonus} color="#FF5722" colors={colors} />
          )}
          <View style={[s.totalRow, { backgroundColor: ACCENT + '15' }]}>
            <Text style={[s.totalLabel, { color: ACCENT }]}>Total</Text>
            <Text style={[s.totalPts, { color: ACCENT }]}>{pts} pts</Text>
          </View>
        </View>

        {/* Badges */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.sectionHeader}>
            <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>BADGES</Text>
            <Text style={[s.badgeCount, { color: ACCENT }]}>
              {earnedBadges.length}/{(stats?.badges || []).length} earned
            </Text>
          </View>
          <View style={s.badgesGrid}>
            {(stats?.badges || []).map(b => <BadgeChip key={b.id} badge={b} colors={colors} />)}
          </View>
        </View>

      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText:     { fontSize: 15 },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:   { fontSize: 18, fontWeight: '700' },
  headerSub:     { fontSize: 12 },
  periodToggle:  { flexDirection: 'row', borderRadius: 20, padding: 3, gap: 2 },
  periodBtn:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18 },
  periodText:    { fontSize: 13, fontWeight: '600' },
  scroll:        { padding: 16, paddingBottom: 120, gap: 16, alignItems: 'center' },
  heroRow:       { flexDirection: 'row', alignItems: 'center', gap: 24 },
  heroRight:     { gap: 12 },
  rankBadge:     { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, gap: 2 },
  rankText:      { color: '#fff', fontSize: 22, fontWeight: '900' },
  rankLabel:     { color: '#fff', fontSize: 11, fontWeight: '600' },
  streakBadge:   { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, gap: 2 },
  streakEmoji:   { fontSize: 20 },
  streakNum:     { fontSize: 22, fontWeight: '900' },
  streakLabel:   { fontSize: 11, fontWeight: '600' },
  goalCard:      { width: '100%', borderRadius: 16, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth },
  goalTop:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  goalTitle:     { fontSize: 15, fontWeight: '700' },
  goalPts:       { fontSize: 14, fontWeight: '700' },
  goalBar:       { height: 10, borderRadius: 5, overflow: 'hidden' },
  goalFill:      { height: 10, borderRadius: 5 },
  goalSub:       { fontSize: 12, textAlign: 'right' },
  statsRow:      { flexDirection: 'row', gap: 8, width: '100%' },
  statBox:       { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, gap: 2 },
  statValue:     { fontSize: 22, fontWeight: '800' },
  statSub:       { fontSize: 10 },
  statLabel:     { fontSize: 10, fontWeight: '600' },
  section:       { width: '100%', borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  sectionTitle:  { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  badgeCount:    { fontSize: 12, fontWeight: '700' },
  bkRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  bkLabel:       { fontSize: 13, flex: 1 },
  bkPts:         { fontSize: 14, fontWeight: '700' },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  totalLabel:    { fontSize: 14, fontWeight: '700' },
  totalPts:      { fontSize: 18, fontWeight: '900' },
  badgesGrid:    { flexDirection: 'row', flexWrap: 'wrap', padding: 12, gap: 8 },
  badgeChip:     { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  badgeEmoji:    { fontSize: 16 },
  badgeName:     { fontSize: 12, fontWeight: '600', maxWidth: 90 },
});

export default PerformanceMyScoreScreen;
