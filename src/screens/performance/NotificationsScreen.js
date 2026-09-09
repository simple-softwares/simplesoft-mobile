import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, SwipeableListView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import NotificationHandler from '../../services/notifications/notificationHandler';
import { useTheme } from '../../theme/ThemeContext';
import { useTranslation } from '../../hooks/useTranslation';

// ── Notification Item Component ────────────────────────────────

const NotificationItem = memo(({
  notification, onPress, onDelete, colors
}) => {
  const getTypeIcon = (type) => {
    switch (type) {
      case 'badge_earned': return { icon: 'trophy', color: '#FFD700' };
      case 'daily_reminder': return { icon: 'stats-chart', color: '#2196F3' };
      case 'rank_change': return { icon: 'podium', color: '#FF9800' };
      default: return { icon: 'notifications', color: colors.primary };
    }
  };

  const typeInfo = getTypeIcon(notification.data?.type || '');
  const timeAgo = getTimeAgo(notification.timestamp);

  return (
    <TouchableOpacity
      style={[
        s.notificationItem,
        {
          backgroundColor: notification.read ? colors.surface : (colors.primary + '10'),
          borderLeftColor: typeInfo.color,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[s.iconBox, { backgroundColor: typeInfo.color + '20' }]}>
        <Icon name={typeInfo.icon} size={24} color={typeInfo.color} />
      </View>

      <View style={s.content}>
        <Text
          style={[
            s.title,
            {
              color: colors.text,
              fontWeight: notification.read ? '500' : '700',
            },
          ]}
        >
          {notification.title}
        </Text>
        <Text style={[s.message, { color: colors.textSecondary }]} numberOfLines={2}>
          {notification.message}
        </Text>
        <Text style={[s.time, { color: colors.textLight }]}>
          {timeAgo}
        </Text>
      </View>

      {!notification.read && (
        <View style={[s.unreadDot, { backgroundColor: colors.primary }]} />
      )}

      <TouchableOpacity onPress={onDelete} style={s.deleteBtn}>
        <Icon name="trash-outline" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

// ── Main Screen Component ──────────────────────────────────────

const NotificationsScreen = ({ navigation }) => {
  const colors = useTheme().colors;
  const { t } = useTranslation();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const notifs = await NotificationHandler.getNotifications();
      const unread = await NotificationHandler.getUnreadCount();
      setNotifications(notifs);
      setUnreadCount(unread);
    } catch (err) {
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [loadNotifications]);

  // Load on screen focus
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        setLoading(true);
        loadNotifications().finally(() => setLoading(false));
      }
    }, [loadNotifications])
  );

  const handleNotificationPress = async (notification) => {
    // Mark as read
    await NotificationHandler.markAsRead(notification.id);
    setNotifications(prev =>
      prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
    );

    // Navigate based on notification type
    const type = notification.data?.type;
    switch (type) {
      case 'badge_earned':
        navigation.navigate('Achievements');
        break;
      case 'daily_reminder':
        navigation.navigate('Metrics');
        break;
      case 'rank_change':
        navigation.navigate('Leaderboard');
        break;
      default:
        break;
    }

    // Update unread count
    const unread = await NotificationHandler.getUnreadCount();
    setUnreadCount(unread);
  };

  const handleDelete = async (notificationId) => {
    // Remove from list UI
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    // Mark as read (soft delete)
    await NotificationHandler.markAsRead(notificationId);
  };

  const handleClearAll = async () => {
    await NotificationHandler.clearAll();
    setNotifications([]);
    setUnreadCount(0);
  };

  // Render loading skeleton
  if (loading && notifications.length === 0) {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { borderBottomColor: colors.divider }]}>
        <View>
          <Text style={[s.headerTitle, { color: colors.text }]}>
            {t('Notifications') || 'Notifications'}
          </Text>
          {unreadCount > 0 && (
            <Text style={[s.unreadLabel, { color: colors.textSecondary }]}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {notifications.length > 0 && (
          <TouchableOpacity
            style={[s.clearBtn, { backgroundColor: colors.surfaceVariant }]}
            onPress={handleClearAll}
          >
            <Icon name="trash-outline" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Notifications List */}
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={({ item }) => (
            <NotificationItem
              notification={item}
              onPress={() => handleNotificationPress(item)}
              onDelete={() => handleDelete(item.id)}
              colors={colors}
            />
          )}
          keyExtractor={item => item.id.toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={s.listContainer}
        />
      ) : (
        <View style={[s.emptyBox, { backgroundColor: colors.surface }]}>
          <Icon name="notifications-off-outline" size={48} color={colors.textLight} />
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>
            No notifications yet
          </Text>
          <Text style={[s.emptySub, { color: colors.textLight }]}>
            You'll get updates on badges and leaderboard changes
          </Text>
        </View>
      )}
    </View>
  );
};

// ── Helper Functions ───────────────────────────────────────────

function getTimeAgo(timestamp) {
  const now = new Date();
  const time = new Date(timestamp);
  const diff = Math.floor((now - time) / 1000); // Seconds

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return time.toLocaleDateString('en-IN');
}

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
    marginBottom: 2,
  },
  unreadLabel: {
    fontSize: 12,
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 8,
    marginVertical: 6,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    borderLeftWidth: 4,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    marginBottom: 4,
  },
  message: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    flexShrink: 0,
  },
  deleteBtn: {
    padding: 8,
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
    textAlign: 'center',
  },
});

export default NotificationsScreen;
