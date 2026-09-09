import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../../theme/ThemeContext';
import performanceService from '../performanceService';

const ACCENT = '#FF9800';

const MEDALS = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

const PodiumCard = ({ entry, rank, colors, isMe }) => {
  const medal = MEDALS[rank - 1];
  const mColor = MEDAL_COLORS[rank - 1];
  const heights = [120, 90, 75];
  const h = heights[rank - 1];
  const initial = entry.name?.[0]?.toUpperCase() || '?';

  return (
    <View style={[s.podiumCol, rank === 1 && s.podiumFirst]}>
      <Text style={s.podiumMedal}>{medal}</Text>
      <View style={[s.podiumAvatar, { backgroundColor: mColor + '30', borderColor: mColor }, isMe && s.podiumAvatarMe]}>
        <Text style={[s.podiumInitial, { color: mColor }]}>{initial}</Text>
      </View>
      <Text style={[s.podiumName, { color: colors.text }]} numberOfLines={1}>{entry.name}</Text>
      <Text style={[s.podiumPts, { color: mColor }]}>{entry.totalPoints} pts</Text>
      <View style={[s.podiumStand, { height: h, backgroundColor: mColor + '25', borderColor: mColor }]}>
        <Text style={[s.podiumRank, { color: mColor }]}>#{rank}</Text>
      </View>
    </View>
  );
};

const RankRow = ({ entry, rank, isMe, colors }) => {
  const initial = entry.name?.[0]?.toUpperCase() || '?';
  const earnedBadgeCount = entry.earnedBadgeCount ?? performanceService.computeBadges(entry).filter(b => b.earned).length;

  return (
    <View style={[
      s.row,
      { backgroundColor: isMe ? ACCENT + '12' : colors.surface, borderColor: isMe ? ACCENT : colors.border },
    ]}>
      <Text style={[s.rowRank, { color: isMe ? ACCENT : colors.textSecondary }]}>#{rank}</Text>
      <View style={[s.rowAvatar, { backgroundColor: (isMe ? ACCENT : colors.primary) + '20' }]}>
        <Text style={[s.rowInitial, { color: isMe ? ACCENT : colors.primary }]}>{initial}</Text>
      </View>
      <View style={s.rowInfo}>
        <Text style={[s.rowName, { color: colors.text }]} numberOfLines={1}>
          {entry.name}{isMe ? ' (you)' : ''}
        </Text>
        <Text style={[s.rowMeta, { color: colors.textSecondary }]}>
          {entry.monthAttendance}d · {entry.tasksCompleted} tasks · {entry.streak}🔥 · {earnedBadgeCount} badges
        </Text>
      </View>
      <View style={s.rowRight}>
        <Text style={[s.rowPts, { color: isMe ? ACCENT : colors.text }]}>{entry.totalPoints}</Text>
        <Text style={[s.rowPtsLabel, { color: colors.textSecondary }]}>pts</Text>
      </View>
    </View>
  );
};

const PerformanceLeaderboardScreen = () => {
  const { colors } = useTheme();
  const user       = useSelector(s => s.auth.user);

  const [board,      setBoard]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period,     setPeriod]     = useState('month');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const data = await performanceService.getLeaderboardData(period);
      setBoard(data || []);
    } catch {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [period]);

  // Leaderboard entries use user IDs (not employee IDs)
  const myUserId = user?.id;
  const myRank   = board.findIndex(e => e.id === myUserId) + 1;
  const top3     = board.slice(0, 3);
  const rest     = board.slice(3);

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
        <View>
          <Text style={[s.headerTitle, { color: colors.text }]}>Leaderboard</Text>
          {myRank > 0 && (
            <Text style={[s.headerSub, { color: ACCENT }]}>You're ranked #{myRank}</Text>
          )}
        </View>
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

      <FlatList
        data={rest}
        keyExtractor={item => String(item.id)}
        renderItem={({ item, index }) => (
          <RankRow
            entry={item}
            rank={index + 4}
            isMe={item.id === myUserId}
            colors={colors}
          />
        )}
        ListHeaderComponent={
          board.length > 0 ? (
            <View>
              {/* Podium */}
              <View style={[s.podiumWrap, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                {top3.length >= 2 && (
                  <PodiumCard entry={top3[1]} rank={2} colors={colors} isMe={top3[1]?.id === myUserId} />
                )}
                {top3.length >= 1 && (
                  <PodiumCard entry={top3[0]} rank={1} colors={colors} isMe={top3[0]?.id === myUserId} />
                )}
                {top3.length >= 3 && (
                  <PodiumCard entry={top3[2]} rank={3} colors={colors} isMe={top3[2]?.id === myUserId} />
                )}
              </View>
              {rest.length > 0 && (
                <Text style={[s.listLabel, { color: colors.textSecondary }]}>RANKINGS</Text>
              )}
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[ACCENT]} />
        }
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>No data yet</Text>
          </View>
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:     { flex: 1 },
  center:        { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle:   { fontSize: 18, fontWeight: '700' },
  headerSub:     { fontSize: 12, fontWeight: '600' },
  periodToggle:  { flexDirection: 'row', borderRadius: 20, padding: 3, gap: 2 },
  periodBtn:     { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 18 },
  periodText:    { fontSize: 13, fontWeight: '600' },
  // Podium
  podiumWrap:    { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', paddingTop: 24, paddingBottom: 0, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  podiumCol:     { alignItems: 'center', width: 100, gap: 4 },
  podiumFirst:   { marginBottom: 0 },
  podiumMedal:   { fontSize: 28 },
  podiumAvatar:  { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  podiumAvatarMe:{ borderWidth: 3 },
  podiumInitial: { fontSize: 22, fontWeight: '700' },
  podiumName:    { fontSize: 12, fontWeight: '600', textAlign: 'center', maxWidth: 90 },
  podiumPts:     { fontSize: 13, fontWeight: '800' },
  podiumStand:   { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, borderWidth: 1, borderBottomWidth: 0, alignItems: 'center', justifyContent: 'center' },
  podiumRank:    { fontSize: 16, fontWeight: '900' },
  // List
  list:          { paddingBottom: 100 },
  listLabel:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  row:           { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 6, borderRadius: 12, padding: 12, borderWidth: StyleSheet.hairlineWidth, gap: 10 },
  rowRank:       { fontSize: 14, fontWeight: '800', width: 30, textAlign: 'center' },
  rowAvatar:     { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  rowInitial:    { fontSize: 16, fontWeight: '700' },
  rowInfo:       { flex: 1, gap: 3 },
  rowName:       { fontSize: 14, fontWeight: '600' },
  rowMeta:       { fontSize: 11 },
  rowRight:      { alignItems: 'flex-end' },
  rowPts:        { fontSize: 18, fontWeight: '900' },
  rowPtsLabel:   { fontSize: 10 },
  empty:         { alignItems: 'center', paddingVertical: 60 },
  emptyText:     { fontSize: 15 },
});

export default PerformanceLeaderboardScreen;
