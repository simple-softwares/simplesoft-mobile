import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import PerformanceService from '../../services/performance/performanceService';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';

const { width } = Dimensions.get('window');

// ── Metric Card Component ──────────────────────────────────────

const MetricCard = memo(({
  type, label, value, trend, icon, accent, colors
}) => {
  const trendIcon = trend?.direction === 'up' ? 'trending-up' :
                   trend?.direction === 'down' ? 'trending-down' : 'remove';
  const trendColor = trend?.direction === 'up' ? '#4CAF50' :
                    trend?.direction === 'down' ? '#FF9800' : colors.textSecondary;

  return (
    <View style={[s.metricCard, { backgroundColor: colors.surface }]}>
      <View style={s.metricHeader}>
        <View style={[s.iconCircle, { backgroundColor: accent + '20' }]}>
          <Icon name={icon} size={24} color={accent} />
        </View>
        <Text style={[s.metricLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
      </View>

      <Text style={[s.metricValue, { color: accent }]}>
        {value ?? 0}
      </Text>

      {trend && (
        <View style={s.metricTrend}>
          <Icon name={trendIcon} size={16} color={trendColor} />
          <Text style={[s.trendText, { color: trendColor }]}>
            {trend.value > 0 ? '+' : ''}{trend.value} {trend.direction}
          </Text>
        </View>
      )}
    </View>
  );
});

// ── Main Screen Component ──────────────────────────────────────

const MetricsScreen = ({ navigation }) => {
  const colors = useTheme().colors;
  const { t } = useTranslation();

  const user = useSelector(state => state.auth.user);
  const workspace = useSelector(state => state.workspace.current);

  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Metric type configuration
  const METRICS_CONFIG = {
    task_completed: {
      label: 'Tasks Completed',
      icon: 'checkmark-done',
      accent: '#4CAF50',
    },
    contact_reached: {
      label: 'Contacts Reached',
      icon: 'person-add',
      accent: '#2196F3',
    },
    deal_closed: {
      label: 'Deals Closed',
      icon: 'briefcase',
      accent: '#FF9800',
    },
    note_created: {
      label: 'Notes Created',
      icon: 'document-text',
      accent: '#9C27B0',
    },
    attendance_marked: {
      label: 'Attendance Marked',
      icon: 'calendar',
      accent: '#F44336',
    },
  };

  const loadMetrics = useCallback(async () => {
    if (!user?.id || !workspace?.slug) return;

    try {
      setError(null);
      const data = await PerformanceService.getMetrics(
        workspace.slug,
        user.id,
        1
      );
      setMetrics(data);
    } catch (err) {
      setError(err.message || 'Failed to load metrics');
    }
  }, [user?.id, workspace?.slug]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadMetrics();
    } finally {
      setRefreshing(false);
    }
  }, [loadMetrics]);

  // Load on screen focus
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        setLoading(true);
        loadMetrics().finally(() => setLoading(false));
      }
    }, [loadMetrics])
  );

  // Render loading skeleton
  if (loading && !metrics) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  const metricsList = metrics?.metrics ? Object.entries(metrics.metrics) : [];
  const trends = metrics?.trend || {};

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.divider }]}>
        <View>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            {t('Today\'s Performance') || 'Today\'s Performance'}
          </Text>
          <Text style={[s.headerDate, { color: colors.textSecondary }]}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.refreshBtn, { backgroundColor: colors.surface }]}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Icon name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
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

      {/* Metrics Grid */}
      {metricsList.length > 0 ? (
        <View style={s.metricsGrid}>
          {metricsList.map(([type, value]) => {
            const config = METRICS_CONFIG[type] || {};
            const trend = trends[type];
            return (
              <MetricCard
                key={type}
                type={type}
                label={config.label || type}
                value={value}
                trend={trend}
                icon={config.icon || 'stats-chart'}
                accent={config.accent || colors.primary}
                colors={colors}
              />
            );
          })}
        </View>
      ) : (
        <View style={[s.emptyBox, { backgroundColor: colors.surface }]}>
          <Icon name="today" size={48} color={colors.textLight} />
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>
            No metrics yet today
          </Text>
          <Text style={[s.emptySub, { color: colors.textLight }]}>
            Complete tasks to see your progress
          </Text>
        </View>
      )}

      {/* Quick Actions */}
      <View style={s.actionsSection}>
        <Text style={[s.sectionTitle, { color: colors.text }]}>
          Quick Actions
        </Text>
        <TouchableOpacity
          style={[s.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('TaskStack', { screen: 'TaskList' })}
        >
          <Icon name="checkmark-done-outline" size={20} color="#4CAF50" />
          <Text style={[s.actionLabel, { color: colors.text }]}>
            Add Task
          </Text>
          <Icon name="chevron-forward" size={16} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Achievements')}
        >
          <Icon name="trophy-outline" size={20} color="#FFD700" />
          <Text style={[s.actionLabel, { color: colors.text }]}>
            View Achievements
          </Text>
          <Icon name="chevron-forward" size={16} color={colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.actionButton, { backgroundColor: colors.surface }]}
          onPress={() => navigation.navigate('Leaderboard')}
        >
          <Icon name="podium-outline" size={20} color="#2196F3" />
          <Text style={[s.actionLabel, { color: colors.text }]}>
            Leaderboard
          </Text>
          <Icon name="chevron-forward" size={16} color={colors.textLight} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ── Styles ────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 12,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  metricsGrid: {
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  metricCard: {
    marginHorizontal: 8,
    marginVertical: 6,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderTopWidth: 3,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: '700',
    marginVertical: 4,
  },
  metricTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  trendText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyBox: {
    marginHorizontal: 16,
    marginVertical: 32,
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
  actionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
});

export default MetricsScreen;
