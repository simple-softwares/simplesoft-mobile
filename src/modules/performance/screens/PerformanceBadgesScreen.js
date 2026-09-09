import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, Modal,
} from 'react-native';
import { useTheme } from '../../../theme/ThemeContext';
import performanceService, { BADGES } from '../performanceService';

const ACCENT = '#FF9800';

const BadgeCard = ({ badge, onPress }) => (
  <TouchableOpacity
    style={[
      s.card,
      badge.earned && { borderColor: ACCENT },
      !badge.earned && { opacity: 0.5 },
    ]}
    onPress={onPress}
    activeOpacity={0.75}>
    <View style={[s.emojiWrap, { backgroundColor: badge.earned ? ACCENT + '20' : '#9E9E9E20' }]}>
      <Text style={s.emoji}>{badge.emoji}</Text>
    </View>
    <Text style={[s.badgeName, { color: badge.earned ? '#FF9800' : '#9E9E9E' }]}>{badge.name}</Text>
    {badge.earned && (
      <View style={[s.earnedDot, { backgroundColor: ACCENT }]} />
    )}
  </TouchableOpacity>
);

const PerformanceBadgesScreen = () => {
  const { colors } = useTheme();

  const [badges,     setBadges]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected,   setSelected]   = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const stats = await performanceService.getMyStats();
      setBadges(stats.badges || performanceService.computeBadges(stats));
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, []);

  const earned = badges.filter(b => b.earned).length;

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.text }]}>Badges</Text>
        <Text style={[s.headerSub, { color: ACCENT }]}>{earned} / {BADGES.length} earned</Text>
      </View>

      {/* Summary bar */}
      <View style={[s.summaryBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[s.progressBg, { backgroundColor: colors.border }]}>
          <View style={[s.progressFill, { width: `${BADGES.length > 0 ? (earned / BADGES.length) * 100 : 0}%` }]} />
        </View>
        <Text style={[s.progressLabel, { color: colors.textSecondary }]}>
          {BADGES.length > 0 ? Math.round((earned / BADGES.length) * 100) : 0}% complete
        </Text>
      </View>

      <FlatList
        data={badges}
        keyExtractor={item => item.id}
        numColumns={3}
        renderItem={({ item }) => (
          <BadgeCard badge={item} onPress={() => setSelected(item)} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[ACCENT]} />
        }
        contentContainerStyle={s.grid}
        ListHeaderComponent={
          earned > 0 ? (
            <View style={s.earnedSection}>
              <Text style={[s.earnedLabel, { color: ACCENT }]}>
                🎉 {earned === BADGES.length ? 'All badges earned!' : `${earned} badge${earned > 1 ? 's' : ''} earned!`}
              </Text>
            </View>
          ) : (
            <View style={s.earnedSection}>
              <Text style={[s.earnedLabel, { color: colors.textSecondary }]}>
                Start checking in and completing tasks to earn badges
              </Text>
            </View>
          )
        }
      />

      {/* Badge detail modal */}
      <Modal visible={!!selected} animationType="fade" transparent>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setSelected(null)}>
          <View style={[s.modal, { backgroundColor: colors.surface }]}>
            <Text style={s.modalEmoji}>{selected?.emoji}</Text>
            <Text style={[s.modalName, { color: selected?.earned ? ACCENT : colors.text }]}>
              {selected?.name}
            </Text>
            <Text style={[s.modalDesc, { color: colors.textSecondary }]}>{selected?.desc}</Text>
            <View style={[s.modalStatus, { backgroundColor: selected?.earned ? '#4CAF5020' : colors.inputBackground }]}>
              <Text style={[s.modalStatusText, { color: selected?.earned ? '#4CAF50' : colors.textSecondary }]}>
                {selected?.earned ? '✓ Earned' : 'Not yet earned'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:   { fontSize: 20, fontWeight: '700' },
  headerSub:     { fontSize: 14, fontWeight: '700' },
  summaryBar:    { paddingHorizontal: 16, paddingVertical: 10, gap: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  progressBg:    { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill:  { height: 6, borderRadius: 3, backgroundColor: ACCENT },
  progressLabel: { fontSize: 12, textAlign: 'right' },
  grid:          { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 120 },
  earnedSection: { paddingHorizontal: 8, paddingBottom: 12 },
  earnedLabel:   { fontSize: 13, fontWeight: '500', textAlign: 'center' },
  card:          { flex: 1, margin: 5, alignItems: 'center', borderRadius: 16, padding: 14, gap: 8, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E0E0E0', position: 'relative' },
  emojiWrap:     { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  emoji:         { fontSize: 26 },
  badgeName:     { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  earnedDot:     { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  // Modal
  overlay:       { flex: 1, backgroundColor: '#00000070', alignItems: 'center', justifyContent: 'center', padding: 40 },
  modal:         { width: '100%', borderRadius: 24, padding: 32, alignItems: 'center', gap: 10 },
  modalEmoji:    { fontSize: 56 },
  modalName:     { fontSize: 20, fontWeight: '800' },
  modalDesc:     { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalStatus:   { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginTop: 6 },
  modalStatusText:{ fontSize: 14, fontWeight: '700' },
});

export default PerformanceBadgesScreen;
