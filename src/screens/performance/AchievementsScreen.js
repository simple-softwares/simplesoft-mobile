import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, FlatList, Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import PerformanceService from '../../services/performance/performanceService';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';

// ── Badge Card Component ───────────────────────────────────────

const EarnedBadgeCard = memo(({ badge, onPress, colors, isNew }) => (
  <TouchableOpacity
    style={[s.badgeCard, { backgroundColor: colors.surface }]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    {isNew && (
      <View style={[s.newBadge, { backgroundColor: '#FF5722' }]}>
        <Text style={s.newText}>NEW</Text>
      </View>
    )}

    <View
      style={[
        s.badgeIcon,
        { backgroundColor: badge.color + '20', borderColor: badge.color },
      ]}
    >
      <Icon name={badge.icon} size={32} color={badge.color} />
    </View>

    <Text style={[s.badgeName, { color: colors.text }]}>
      {badge.name}
    </Text>

    <View style={s.rarityBadge}>
      <Text style={[s.rarityText, { color: getRarityColor(badge.rarity) }]}>
        {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
      </Text>
    </View>
  </TouchableOpacity>
));

const LockedBadgeCard = memo(({ badge, colors }) => {
  const percentage = badge.percentage || 0;

  return (
    <View style={[s.lockedCard, { backgroundColor: colors.surface }]}>
      <View style={s.lockedHeader}>
        <View
          style={[
            s.badgeIconLocked,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          <Icon name="lock-closed" size={24} color={colors.textLight} />
        </View>

        <View style={s.lockedInfo}>
          <Text style={[s.badgeName, { color: colors.text }]} numberOfLines={1}>
            {badge.name}
          </Text>
          <Text style={[s.badgeDesc, { color: colors.textSecondary }]} numberOfLines={2}>
            {badge.description}
          </Text>
        </View>
      </View>

      <View style={s.progressContainer}>
        <View
          style={[
            s.progressBar,
            { backgroundColor: colors.surfaceVariant },
          ]}
        >
          <View
            style={[
              s.progressFill,
              {
                backgroundColor: getRarityColor(badge.rarity),
                width: `${Math.min(percentage, 100)}%`,
              },
            ]}
          />
        </View>
        <Text style={[s.progressText, { color: colors.textSecondary }]}>
          {badge.progress}/{badge.threshold}
        </Text>
      </View>
    </View>
  );
});

// ── Badge Detail Modal ─────────────────────────────────────────

const BadgeDetailModal = memo(({ visible, badge, onClose, colors }) => {
  if (!badge) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={[s.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <View style={[s.modalContent, { backgroundColor: colors.surface }]}>
          <View style={s.modalHeader}>
            <Text style={[s.modalTitle, { color: colors.text }]}>
              Badge Earned
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={s.modalBody}>
            <View
              style={[
                s.modalBadgeIcon,
                { backgroundColor: badge.color + '30' },
              ]}
            >
              <Icon name={badge.icon} size={64} color={badge.color} />
            </View>

            <Text style={[s.modalBadgeName, { color: colors.text }]}>
              {badge.name}
            </Text>

            <Text style={[s.modalDescription, { color: colors.textSecondary }]}>
              {badge.description}
            </Text>

            <View style={s.badgeStats}>
              <View style={s.statItem}>
                <Text style={[s.statLabel, { color: colors.textSecondary }]}>
                  Rarity
                </Text>
                <Text
                  style={[
                    s.statValue,
                    { color: getRarityColor(badge.rarity) },
                  ]}
                >
                  {badge.rarity.toUpperCase()}
                </Text>
              </View>

              {badge.earned_date && (
                <View style={s.statItem}>
                  <Text style={[s.statLabel, { color: colors.textSecondary }]}>
                    Earned
                  </Text>
                  <Text style={[s.statValue, { color: colors.text }]}>
                    {new Date(badge.earned_date).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[s.closeButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
          >
            <Text style={s.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

// ── Main Screen Component ──────────────────────────────────────

const AchievementsScreen = ({ navigation }) => {
  const colors = useTheme().colors;
  const { t } = useTranslation();

  const user = useSelector(state => state.auth.user);
  const workspace = useSelector(state => state.workspace.current);

  const [badges, setBadges] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  const loadBadges = useCallback(async () => {
    if (!user?.id || !workspace?.slug) return;

    try {
      setError(null);
      const data = await PerformanceService.getBadges(
        workspace.slug,
        user.id
      );

      // Mark badges as shown on load
      if (data.earned && data.earned.length > 0) {
        const notShownIds = data.earned
          .filter(b => !b.shown)
          .map(b => b.badge_id);

        if (notShownIds.length > 0) {
          await PerformanceService.markBadgesShown(
            workspace.slug,
            user.id,
            notShownIds
        }
      }

      setBadges(data);
    } catch (err) {
      setError(err.message || 'Failed to load badges');
    }
  }, [user?.id, workspace?.slug]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadBadges();
    } finally {
      setRefreshing(false);
    }
  }, [loadBadges]);

  // Load on screen focus
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        setLoading(true);
        loadBadges().finally(() => setLoading(false));
      }
    }, [loadBadges])
  );

  // Render loading skeleton
  if (loading && !badges) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const earnedBadges = badges?.earned || [];
  const lockedBadges = badges?.locked || [];
  const totalEarned = badges?.total_earned || 0;
  const totalAvailable = badges?.total_available || 0;

  const showBadgeDetail = (badge) => {
    setSelectedBadge(badge);
    setModalVisible(true);
  };

  return (
    <>
      <ScrollView
        style={[s.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header Stats */}
        <View style={[s.statsBox, { backgroundColor: colors.surface }]}>
          <View style={s.statCol}>
            <Text style={[s.statNum, { color: colors.primary }]}>
              {totalEarned}
            </Text>
            <Text style={[s.statName, { color: colors.textSecondary }]}>
              Earned
            </Text>
          </View>
          <View style={[s.divider, { backgroundColor: colors.divider }]} />
          <View style={s.statCol}>
            <Text style={[s.statNum, { color: colors.primary }]}>
              {totalAvailable}
            </Text>
            <Text style={[s.statName, { color: colors.textSecondary }]}>
              Available
            </Text>
          </View>
          <View style={[s.divider, { backgroundColor: colors.divider }]} />
          <View style={s.statCol}>
            <Text
              style={[
                s.statNum,
                { color: getRarityColor('rare') },
              ]}
            >
              {Math.round((totalEarned / totalAvailable) * 100)}%
            </Text>
            <Text style={[s.statName, { color: colors.textSecondary }]}>
              Complete
            </Text>
          </View>
        </View>

        {/* Error Message */}
        {error && (
          <View style={[s.errorBox, { backgroundColor: '#FFEBEE' }]}>
            <Icon name="alert-circle" size={16} color="#C62828" />
            <Text style={[s.errorText, { color: '#C62828' }]}>
              {error}
            </Text>
          </View>
        )}

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>
              Earned Badges ({earnedBadges.length})
            </Text>
            <View style={s.badgesGrid}>
              {earnedBadges.map(badge => (
                <EarnedBadgeCard
                  key={badge.badge_id}
                  badge={badge}
                  colors={colors}
                  isNew={!badge.shown}
                  onPress={() => showBadgeDetail(badge)}
                />
              ))}
            </View>
          </View>
        )}

        {/* Locked Badges */}
        {lockedBadges.length > 0 && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.text }]}>
              In Progress ({lockedBadges.length})
            </Text>
            {lockedBadges.map(badge => (
              <LockedBadgeCard
                key={badge.badge_id}
                badge={badge}
                colors={colors}
              />
            ))}
          </View>
        )}

        {/* Empty State */}
        {earnedBadges.length === 0 && lockedBadges.length === 0 && (
          <View style={[s.emptyBox, { backgroundColor: colors.surface }]}>
            <Icon name="trophy-outline" size={48} color={colors.textLight} />
            <Text style={[s.emptyText, { color: colors.textSecondary }]}>
              No badges yet
            </Text>
            <Text style={[s.emptySub, { color: colors.textLight }]}>
              Complete tasks to earn achievements
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Badge Detail Modal */}
      <BadgeDetailModal
        visible={modalVisible}
        badge={selectedBadge}
        onClose={() => setModalVisible(false)}
        colors={colors}
      />
    </>
  );
};

// ── Helper Functions ───────────────────────────────────────────

function getRarityColor(rarity) {
  switch (rarity) {
    case 'common': return '#9E9E9E';
    case 'uncommon': return '#4CAF50';
    case 'rare': return '#2196F3';
    case 'epic': return '#9C27B0';
    case 'legendary': return '#FFD700';
    default: return '#2196F3';
  }
}

// ── Styles ────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsBox: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginVertical: 12,
    paddingVertical: 16,
    marginHorizontal: 12,
    borderRadius: 12,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statNum: {
    fontSize: 24,
    fontWeight: '700',
  },
  statName: {
    fontSize: 11,
    marginTop: 4,
    fontWeight: '500',
  },
  divider: {
    width: 1,
    height: 30,
    marginHorizontal: 8,
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
  section: {
    paddingHorizontal: 12,
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 10,
  },
  badgeIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  rarityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rarityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  newBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  lockedCard: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  badgeIconLocked: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  lockedInfo: {
    flex: 1,
  },
  badgeDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 45,
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalBadgeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBadgeName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  badgeStats: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  closeButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default AchievementsScreen;
