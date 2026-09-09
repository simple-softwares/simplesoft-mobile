import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../../theme/ThemeContext';
import { AGENTS, DISP_CFG, RECENT_CALLS, initials } from '../telecallerData';

const ACCENT = '#16A34A';

const STATS = (() => {
  const totalDials    = AGENTS.reduce((s, a) => s + a.dials, 0);
  const totalConnects = AGENTS.reduce((s, a) => s + a.connects, 0);
  const totalConv     = AGENTS.reduce((s, a) => s + a.conversions, 0);
  const totalTarget   = AGENTS.reduce((s, a) => s + a.target, 0);
  const connectRate   = Math.round((totalConnects / totalDials) * 100);
  const convRate      = Math.round((totalConv / totalConnects) * 100);
  return [
    { icon: 'call-outline',         label: 'Total Dials',    value: totalDials,    sub: `target ${totalTarget}`,  color: '#3B82F6' },
    { icon: 'checkmark-circle-outline', label: 'Connects',   value: totalConnects, sub: `${connectRate}% rate`,  color: '#16A34A' },
    { icon: 'trending-up-outline',  label: 'Conversions',    value: totalConv,     sub: `${convRate}% conv`,     color: '#A855F7' },
    { icon: 'repeat-outline',       label: 'Call Backs',     value: 14,            sub: 'pending follow-up',     color: '#D97706' },
    { icon: 'phone-portrait-outline', label: 'No Answer',    value: 38,            sub: 'not reached',           color: '#F43F5E' },
    { icon: 'people-outline',       label: 'Active Agents',  value: AGENTS.length, sub: 'on floor today',        color: '#14B8A6' },
  ];
})();

export default function TelecallerDashboardScreen({ navigation }) {
  const { colors } = useTheme();
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <View style={[s.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View>
          <View style={s.headerTitle}>
            <Icon name="call" size={18} color={ACCENT} />
            <Text style={[s.titleText, { color: colors.text }]}>Telecaller</Text>
          </View>
          <Text style={[s.subtitle, { color: colors.textLight }]}>{today}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Stat cards — horizontal scroll */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.statScroll}>
          {STATS.map(stat => (
            <View key={stat.label} style={[s.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={[s.statIcon, { backgroundColor: stat.color + '18' }]}>
                <Icon name={stat.icon} size={16} color={stat.color} />
              </View>
              <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
              <Text style={[s.statLabel, { color: colors.text }]}>{stat.label}</Text>
              <Text style={[s.statSub, { color: colors.textLight }]}>{stat.sub}</Text>
            </View>
          ))}
        </ScrollView>

        {/* Dial Progress */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Today's Dial Progress</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TelecallerLeaderboard')}>
              <Text style={[s.sectionLink, { color: ACCENT }]}>Leaderboard</Text>
            </TouchableOpacity>
          </View>
          {AGENTS.map((a, i) => {
            const pct     = Math.min(100, Math.round((a.dials / a.target) * 100));
            const convPct = a.connects > 0 ? Math.round((a.conversions / a.connects) * 100) : 0;
            return (
              <View key={a.id} style={[s.agentRow, i < AGENTS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <View style={[s.avatar, { backgroundColor: a.color }]}>
                  <Text style={s.avatarText}>{initials(a.name)}</Text>
                </View>
                <View style={s.agentBody}>
                  <View style={s.agentNameRow}>
                    <Text style={[s.agentName, { color: colors.text }]}>{a.name}</Text>
                    <Text style={[s.agentDials, { color: colors.textSecondary }]}>{a.dials}/{a.target}</Text>
                  </View>
                  <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
                    <View style={[s.progressFill, { width: `${pct}%`, backgroundColor: pct >= 100 ? '#16A34A' : ACCENT }]} />
                  </View>
                </View>
                <View style={s.agentMetrics}>
                  <Text style={[s.metricVal, { color: '#3B82F6' }]}>{a.connects}</Text>
                  <Text style={[s.metricLbl, { color: colors.textLight }]}>con</Text>
                </View>
                <View style={s.agentMetrics}>
                  <Text style={[s.metricVal, { color: '#A855F7' }]}>{a.conversions}</Text>
                  <Text style={[s.metricLbl, { color: colors.textLight }]}>cvt</Text>
                </View>
                <View style={s.agentMetrics}>
                  <Text style={[s.metricVal, { color: convPct >= 40 ? '#16A34A' : convPct >= 25 ? '#D97706' : '#EF4444' }]}>
                    {convPct}%
                  </Text>
                  <Text style={[s.metricLbl, { color: colors.textLight }]}>rate</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Recent Calls */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.sectionHead}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>Recent Calls</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TelecallerCalls')}>
              <Text style={[s.sectionLink, { color: ACCENT }]}>View All</Text>
            </TouchableOpacity>
          </View>
          {RECENT_CALLS.map((c, i) => {
            const cfg = DISP_CFG[c.disposition] || DISP_CFG['Interested'];
            return (
              <View key={i} style={[s.callRow, i < RECENT_CALLS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <View style={[s.callIcon, { backgroundColor: cfg.bg }]}>
                  <Icon name={cfg.icon} size={14} color={cfg.color} />
                </View>
                <View style={s.callBody}>
                  <Text style={[s.callCustomer, { color: colors.text }]} numberOfLines={1}>{c.customer}</Text>
                  <Text style={[s.callMeta, { color: colors.textLight }]}>{c.agent} · {c.phone}</Text>
                </View>
                <View style={s.callRight}>
                  <Text style={[s.callDisp, { color: cfg.color }]}>{c.disposition}</Text>
                  <Text style={[s.callTime, { color: colors.textLight }]}>{c.time}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:          { flex: 1 },
  header:        { paddingHorizontal: 16, paddingTop: 54, paddingBottom: 14, borderBottomWidth: 0.5 },
  headerTitle:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  titleText:     { fontSize: 20, fontWeight: '800' },
  subtitle:      { fontSize: 12 },
  statScroll:    { paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4, gap: 10 },
  statCard:      { width: 108, borderRadius: 14, borderWidth: 1, padding: 12, gap: 3 },
  statIcon:      { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  statValue:     { fontSize: 22, fontWeight: '800' },
  statLabel:     { fontSize: 11, fontWeight: '700' },
  statSub:       { fontSize: 10 },
  section:       { marginHorizontal: 14, marginTop: 12, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionHead:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                   paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  sectionTitle:  { fontSize: 13, fontWeight: '700' },
  sectionLink:   { fontSize: 12, fontWeight: '600' },
  agentRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  avatar:        { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  avatarText:    { color: '#fff', fontSize: 12, fontWeight: '700' },
  agentBody:     { flex: 1, gap: 5 },
  agentNameRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  agentName:     { fontSize: 13, fontWeight: '600' },
  agentDials:    { fontSize: 12, fontWeight: '600' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  progressFill:  { height: 4, borderRadius: 2 },
  agentMetrics:  { alignItems: 'center', minWidth: 30 },
  metricVal:     { fontSize: 12, fontWeight: '700' },
  metricLbl:     { fontSize: 9, fontWeight: '600' },
  callRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  callIcon:      { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  callBody:      { flex: 1 },
  callCustomer:  { fontSize: 13, fontWeight: '600' },
  callMeta:      { fontSize: 11, marginTop: 1 },
  callRight:     { alignItems: 'flex-end' },
  callDisp:      { fontSize: 11, fontWeight: '700' },
  callTime:      { fontSize: 10, marginTop: 2 },
});
