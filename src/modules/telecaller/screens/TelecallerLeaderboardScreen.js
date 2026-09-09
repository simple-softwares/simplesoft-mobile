import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import { PERIOD_DATA, initials } from '../telecallerData';

const ACCENT = '#16A34A';

const PERIODS = [
  { key: 'today', label: 'Today'      },
  { key: 'week',  label: 'This Week'  },
  { key: 'month', label: 'This Month' },
];

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_BG = ['#FEF9C3', '#F1F5F9', '#FFF7ED'];
const MEDAL_BORDER = ['#FDE047', '#CBD5E1', '#FDBA74'];

function TrendIcon({ trend, size = 13 }) {
  if (trend === 'up')   return <Icon name="trending-up-outline"   size={size} color="#16A34A" />;
  if (trend === 'down') return <Icon name="trending-down-outline" size={size} color="#EF4444" />;
  return <Icon name="remove-outline" size={size} color="#9CA3AF" />;
}

function rateColor(rate) {
  if (rate >= 40) return '#16A34A';
  if (rate >= 28) return '#D97706';
  return '#EF4444';
}

function PodiumCard({ agent, rank, colors }) {
  const pct = Math.min(100, Math.round((agent.dials / agent.target) * 100));
  return (
    <View style={[p.card, { backgroundColor: MEDAL_BG[rank - 1], borderColor: MEDAL_BORDER[rank - 1] }]}>
      {/* Name row */}
      <View style={p.cardTop}>
        <View style={[p.avatar, { backgroundColor: agent.color }]}>
          <Text style={p.avatarText}>{initials(agent.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={p.agentName}>{agent.name}</Text>
          <Text style={p.agentRole}>{agent.role}</Text>
        </View>
        <Text style={p.medal}>{MEDALS[rank - 1]}</Text>
      </View>

      {/* Stats grid */}
      <View style={p.statsRow}>
        {[
          { label: 'Dials',     value: agent.dials       },
          { label: 'Connects',  value: agent.connects    },
          { label: 'Converted', value: agent.conversions },
        ].map(({ label, value }) => (
          <View key={label} style={p.statCell}>
            <Text style={p.statVal}>{value}</Text>
            <Text style={p.statLbl}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Progress bar */}
      <View style={p.progressRow}>
        <Text style={p.progressLabel}>Target {pct}%</Text>
        <View style={p.progressTrack}>
          <View style={[p.progressFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? '#16A34A' : '#F59E0B' }]} />
        </View>
      </View>

      {/* Footer */}
      <View style={p.footer}>
        <View style={p.footerLeft}>
          <Icon name="call-outline" size={11} color="#888" />
          <Text style={p.footerText}>avg {agent.avgDuration}</Text>
        </View>
        <View style={p.footerRight}>
          <TrendIcon trend={agent.trend} />
          <Text style={[p.rateText, { color: rateColor(agent.rate) }]}>{agent.rate}% conv.</Text>
        </View>
      </View>
    </View>
  );
}

export default function TelecallerLeaderboardScreen() {
  const { colors } = useTheme();
  const [period, setPeriod] = useState('today');
  const agents = PERIOD_DATA[period];
  const totals = agents.reduce((acc, a) => ({
    dials: acc.dials + a.dials,
    connects: acc.connects + a.connects,
    conversions: acc.conversions + a.conversions,
  }), { dials: 0, connects: 0, conversions: 0 });

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={s.headerLeft}>
          <Icon name="trophy-outline" size={18} color="#F59E0B" />
          <Text style={[s.headerTitle, { color: colors.text }]}>Leaderboard</Text>
        </View>
        {/* Period tabs */}
        <View style={[s.periodRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
          {PERIODS.map(pr => (
            <TouchableOpacity
              key={pr.key}
              onPress={() => setPeriod(pr.key)}
              style={[s.periodChip, period === pr.key && { backgroundColor: ACCENT }]}>
              <Text style={[s.periodText, { color: period === pr.key ? '#fff' : colors.textSecondary }]}>
                {pr.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Team summary */}
        <View style={s.summaryRow}>
          {[
            { icon: 'call-outline',         label: 'Total Dials',    value: totals.dials,       color: '#3B82F6' },
            { icon: 'people-outline',        label: 'Total Connects', value: totals.connects,    color: ACCENT    },
            { icon: 'flash-outline',         label: 'Conversions',    value: totals.conversions, color: '#A855F7' },
          ].map(item => (
            <View key={item.label} style={[s.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.summaryIcon, { backgroundColor: item.color + '18' }]}>
                <Icon name={item.icon} size={16} color={item.color} />
              </View>
              <Text style={[s.summaryValue, { color: item.color }]}>{item.value}</Text>
              <Text style={[s.summaryLabel, { color: colors.textSecondary }]}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Top 3 podium */}
        <Text style={[s.sectionLabel, { color: colors.textLight }]}>TOP PERFORMERS</Text>
        {agents.slice(0, 3).map((a, i) => (
          <PodiumCard key={a.name} agent={a} rank={i + 1} colors={colors} />
        ))}

        {/* Full rankings */}
        <View style={[s.rankingsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.rankingsTitle, { color: colors.text, borderBottomColor: colors.border }]}>
            Full Rankings
          </Text>
          {agents.map((a, i) => {
            const pct = Math.round((a.dials / a.target) * 100);
            return (
              <View
                key={a.name}
                style={[s.rankRow, i < agents.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
                  i < 3 && { backgroundColor: '#FEF9C318' }]}>
                {/* Rank */}
                <View style={s.rankBadge}>
                  {i < 3
                    ? <Text style={s.rankMedal}>{MEDALS[i]}</Text>
                    : <Text style={[s.rankNum, { color: colors.textLight }]}>#{i + 1}</Text>}
                </View>
                {/* Agent */}
                <View style={[s.rankAvatar, { backgroundColor: a.color }]}>
                  <Text style={s.rankAvatarText}>{initials(a.name)}</Text>
                </View>
                <View style={s.rankInfo}>
                  <Text style={[s.rankName, { color: colors.text }]}>{a.name}</Text>
                  <View style={[s.miniProgress, { backgroundColor: colors.border }]}>
                    <View style={[s.miniProgressFill, { width: `${Math.min(100, pct)}%`, backgroundColor: pct >= 100 ? '#16A34A' : '#3B82F6' }]} />
                  </View>
                </View>
                {/* Metrics */}
                <View style={s.rankMetrics}>
                  <Text style={[s.rankDials, { color: colors.text }]}>{a.dials}</Text>
                  <Text style={[s.rankDialsSub, { color: colors.textLight }]}>dials</Text>
                </View>
                <View style={s.rankMetrics}>
                  <Text style={[s.rankConv, { color: colors.text }]}>{a.conversions}</Text>
                  <Text style={[s.rankDialsSub, { color: colors.textLight }]}>cvt</Text>
                </View>
                <View style={s.rankMetrics}>
                  <Text style={[s.rankRate, { color: rateColor(a.rate) }]}>{a.rate}%</Text>
                  <TrendIcon trend={a.trend} size={11} />
                </View>
              </View>
            );
          })}
        </View>

        {/* Motivational banner */}
        <View style={[s.banner, { backgroundColor: ACCENT }]}>
          <Icon name="trophy" size={22} color="rgba(255,255,255,0.9)" />
          <Text style={s.bannerTitle}>
            {agents[0].name} leads with {agents[0].conversions} conversions!
          </Text>
          <Text style={s.bannerSub}>
            AI-suggested best call times and WhatsApp follow-up bot coming soon.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:             { flex: 1 },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                      paddingHorizontal: 14, paddingTop: 54, paddingBottom: 12, borderBottomWidth: 0.5 },
  headerLeft:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle:      { fontSize: 20, fontWeight: '800' },
  periodRow:        { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 3, gap: 2 },
  periodChip:       { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 7 },
  periodText:       { fontSize: 11, fontWeight: '700' },
  summaryRow:       { flexDirection: 'row', paddingHorizontal: 14, paddingTop: 14, gap: 8 },
  summaryCard:      { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, alignItems: 'center', gap: 4 },
  summaryIcon:      { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  summaryValue:     { fontSize: 20, fontWeight: '800' },
  summaryLabel:     { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  sectionLabel:     { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginHorizontal: 14,
                      marginTop: 16, marginBottom: 6 },
  rankingsCard:     { marginHorizontal: 14, marginTop: 14, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  rankingsTitle:    { fontSize: 13, fontWeight: '700', padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  rankRow:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  rankBadge:        { width: 24, alignItems: 'center' },
  rankMedal:        { fontSize: 16 },
  rankNum:          { fontSize: 12, fontWeight: '700' },
  rankAvatar:       { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rankAvatarText:   { color: '#fff', fontSize: 10, fontWeight: '700' },
  rankInfo:         { flex: 1, gap: 4 },
  rankName:         { fontSize: 12, fontWeight: '600' },
  miniProgress:     { height: 3, borderRadius: 2, overflow: 'hidden' },
  miniProgressFill: { height: 3 },
  rankMetrics:      { alignItems: 'center', minWidth: 30 },
  rankDials:        { fontSize: 12, fontWeight: '700' },
  rankDialsSub:     { fontSize: 9 },
  rankConv:         { fontSize: 12, fontWeight: '700' },
  rankRate:         { fontSize: 11, fontWeight: '700' },
  banner:           { marginHorizontal: 14, marginTop: 14, borderRadius: 14, padding: 18, alignItems: 'center', gap: 6 },
  bannerTitle:      { color: '#fff', fontWeight: '700', fontSize: 14, textAlign: 'center' },
  bannerSub:        { color: 'rgba(255,255,255,0.8)', fontSize: 11, textAlign: 'center', lineHeight: 16 },
});

const p = StyleSheet.create({
  card:         { marginHorizontal: 14, marginTop: 10, borderRadius: 14, borderWidth: 2, padding: 14, gap: 10 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  avatar:       { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#fff', fontSize: 13, fontWeight: '700' },
  agentName:    { fontSize: 14, fontWeight: '700', color: '#111' },
  agentRole:    { fontSize: 11, color: '#666' },
  medal:        { fontSize: 22 },
  statsRow:     { flexDirection: 'row', gap: 8 },
  statCell:     { flex: 1, backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: 8, alignItems: 'center' },
  statVal:      { fontSize: 16, fontWeight: '800', color: '#111' },
  statLbl:      { fontSize: 10, color: '#666' },
  progressRow:  { gap: 4 },
  progressLabel:{ fontSize: 10, color: '#666', textAlign: 'right' },
  progressTrack:{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)', overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  footer:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText:   { fontSize: 11, color: '#666' },
  footerRight:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rateText:     { fontSize: 12, fontWeight: '700' },
});
