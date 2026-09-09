import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, FlatList, Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import PerformanceService from '../../services/performance/performanceService';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';

// ── Leaderboard Entry Component ────────────────────────────────

const LeaderboardEntry = memo(({
  entry, rank, isYou, colors
}) => {
  const getRankMedal = (rankNum) => {
    switch (rankNum) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return null;
    }
  };

  const medalEmoji = getRankMedal(rank);
  const bgColor = isYou ? (colors.primary + '15') : colors.surface;
  const borderColor = isYou ? colors.primary : colors.divider;

  return (
    <View
      style={[
        s.entryCard,
        {
          backgroundColor: bgColor,
          borderLeftColor: borderColor,
          borderLeftWidth: isYou ? 4 : 1,
        },
      ]}
    >
      <View style={s.rankSection}>
        {medalEmoji ? (
          <Text style={s.medal}>{medalEmoji}</Text>
        ) : (
          <View style={[s.rankBadge, { backgroundColor: colors.surfaceVariant }]}>
            <Text style={[s.rankNum, { color: colors.textSecondary }]}>
              {rank}
            </Text>
          </View>
        )}
      </View>

      <View style={s.userSection}>
        {entry.avatar_url ? (
          <Image
            source={{ uri: entry.avatar_url }}
            style={s.avatar}
          />
        ) : (
          <View style={[s.avatar, { backgroundColor: colors.surfaceVariant }]}>
            <Icon name="person" size={20} color={colors.textSecondary} />
          </View>
        )}

        <View style={s.userInfo}>
          <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>
            {entry.user_name}
            {isYou && (
              <Text style={[s.youBadge, { color: colors.primary }]}>
                {' '}(You)
              </Text>
            )}
          </Text>
          <Text style={[s.userId, { color: colors.textSecondary }]}>
            #{entry.user_id}
          </Text>
        </View>
      </View>

      <View style={s.scoreSection}>
        <Text style={[s.score, { color: colors.primary }]}>
          {entry.score}
        </Text>
        {entry.amount && (
          <Text style={[s.amount, { color: colors.textSecondary }]}>
            ₹{Math.round(entry.amount).toLocaleString('en-IN')}
          </Text>
        )}
      </View>
    </View>
  );
});

// ── Filter Tab Component ───────────────────────────────────────

const FilterTab = memo(({ label, value, selected, onPress, colors }) => (
  <TouchableOpacity
    style={[
      s.filterTab,
      selected && { borderBottomColor: colors.primary, borderBottomWidth: 3 },
    ]}
    onPress={onPress}
  >
    <Text
      style={[
        s.filterTabText,
        {
          color: selected ? colors.primary : colors.textSecondary,
          fontWeight: selected ? '600' : '400',
        },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
));

// ── Main Screen Component ──────────────────────────────────────

const LeaderboardScreen = ({ navigation }) => {
  const colors = useTheme().colors;
  const { t } = useTranslation();

  const user = useSelector(state => state.auth.user);
  const workspace = useSelector(state => state.workspace.current);

  const [leaderboard, setLeaderboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('weekly');
  const [metricType, setMetricType] = useState('task_completed');

  const PERIODS = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
  ];

  const METRIC_TYPES = [
    { label: 'Tasks', value: 'task_completed', icon: 'checkmark-done' },
    { label: 'Contacts', value: 'contact_reached', icon: 'person-add' },
    { label: 'Deals', value: 'deal_closed', icon: 'briefcase' },
    { label: 'Notes', value: 'note_created', icon: 'document-text' },
  ];

  const loadLeaderboard = useCallback(async () => {
    if (!user?.id || !workspace?.slug) return;

    try {
      setError(null);
      const data = await PerformanceService.getLeaderboard(
        workspace.slug,
        user.id,
        period,
        metricType
      );
      setLeaderboard(data);
    } catch (err) {
      setError(err.message || 'Failed to load leaderboard');
    }
  }, [user?.id, workspace?.slug, period, metricType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadLeaderboard();
    } finally {
      setRefreshing(false);
    }
  }, [loadLeaderboard]);

  // Load on screen focus or when filters change
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        setLoading(true);
        loadLeaderboard().finally(() => setLoading(false));
      }
    }, [loadLeaderboard])
  );

  // Reload when filters change
  useEffect(() => {
    if (leaderboard) {
      setLoading(true);
      loadLeaderboard().finally(() => setLoading(false));
    }
  }, [period, metricType]);

  const entries = leaderboard?.leaderboard || [];
  const yourRank = leaderboard?.your_rank;
  const totalUsers = leaderboard?.total_users || 0;
  const currentMetric = METRIC_TYPES.find(m => m.value === metricType);

  // Render loading skeleton
  if (loading && !leaderboard) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Period Filter Tabs */}
      <View style={[s.periodTabs, { borderBottomColor: colors.divider }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.periodScroll}
        >
          {PERIODS.map(p => (
            <FilterTab
              key={p.value}
              label={p.label}
              value={p.value}
              selected={period === p.value}
              onPress={() => setPeriod(p.value)}
              colors={colors}
            />
          ))}
        </ScrollView>
      </View>

      {/* Metric Type Filter */}
      <View style={[s.metricTabs, { backgroundColor: colors.surface }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
        >
          {METRIC_TYPES.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[
                s.metricButton,
                metricType === m.value && {
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={() => setMetricType(m.value)}
            >
              <Icon
                name={m.icon}
                size={16}
                color={metricType === m.value ? '#fff' : colors.primary}
              />
              <Text
                style={[
                  s.metricButtonText,
                  {
                    color: metricType === m.value ? '#fff' : colors.primary,
                  },
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Your Rank Card */}
        {yourRank && (
          <View style={[s.yourRankCard, { backgroundColor: colors.primary + '15' }]}>
            <View style={s.yourRankContent}>
              <Icon name="person" size={20} color={colors.primary} />
              <View style={s.yourRankText}>
                <Text style={[s.yourRankLabel, { color: colors.textSecondary }]}>
                  Your Current Rank
                </Text>
                <Text style={[s.yourRankValue, { color: colors.primary }]}>
                  #{yourRank} of {totalUsers}
                </Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={colors.primary} />
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View style={[s.errorBox, { backgroundColor: '#FFEBEE' }]}>
            <Icon name="alert-circle" size={16} color="#C62828" />
            <Text style={[s.errorText, { color: '#C62828' }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Leaderboard Entries */}
        {entries.length > 0 ? (
          <View style={s.entriesContainer}>
            {entries.map((entry, index) => (
              <LeaderboardEntry
                key={index}
                entry={entry}
                rank={entry.rank}
                isYou={entry.is_you}
                colors={colors}
              />
            ))}
          </View>
        ) : (
          <View style={[s.emptyBox, { backgroundColor: colors.surface }]}>
            <Icon name="podium-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              No leaderboard data
            </Text>
            <Text style={[s.emptySub, { color: colors.textLight }]}>
              Start completing tasks to see rankings
            </Text>
          </View>
        )}

        {/* Footer Info */}
        <View style={s.footerInfo}>
          <Text style={[s.footerText, { color: colors.textSecondary }]}>
            {currentMetric?.label} Leaderboard · {entries.length} participants
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  periodTabs: {
    borderBottomWidth: 1,
    paddingHorizontal: 0,
  },
  periodScroll: {
    paddingHorizontal: 16,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  filterTabText: {
    fontSize: 14,
  },
  metricTabs: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metricButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metricButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '500',
  },
  yourRankCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 12,
    marginVertical: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  yourRankContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  yourRankText: {
    marginLeft: 12,
  },
  yourRankLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  yourRankValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '500',
  },
  entriesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  entryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rankSection: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 44,
    marginRight: 12,
  },
  medal: {
    fontSize: 28,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankNum: {
    fontSize: 14,
    fontWeight: '700',
  },
  userSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
  },
  youBadge: {
    fontWeight: '700',
    fontSize: 12,
  },
  userId: {
    fontSize: 11,
    marginTop: 2,
  },
  scoreSection: {
    alignItems: 'flex-end',
  },
  score: {
    fontSize: 16,
    fontWeight: '700',
  },
  amount: {
    fontSize: 11,
    marginTop: 2,
  },
  emptyBox: {
    marginHorizontal: 16,
    marginVertical: 48,
    paddingVertical: 48,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4,
  },
  footerInfo: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 12,
  },
});

export default LeaderboardScreen;
