import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Alert, AppState,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import httpClient from '../../services/api/httpClient';

const getTimeAgo = (ts) => {
  const diff = Math.floor((Date.now() - new Date(ts)) / 1000);
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const TYPE_ICON = {
  task_assigned:     'checkbox-outline',
  task_comment:      'chatbubble-outline',
  comment:           'chatbubble-outline',
  expense_approved:  'checkmark-circle-outline',
  expense_rejected:  'close-circle-outline',
  expense_submitted: 'receipt-outline',
  leave_requested:   'calendar-outline',
  leave_approved:    'checkmark-circle-outline',
  leave_rejected:    'close-circle-outline',
  ticket_assigned:   'construct-outline',
  ticket_resolved:   'checkmark-done-outline',
  lead_assigned:     'person-add-outline',
  invoice_paid:      'cash-outline',
  payroll_approved:  'wallet-outline',
  payroll_paid:      'card-outline',
};

const TYPE_COLOR = {
  expense_approved:  '#22c55e',
  expense_rejected:  '#ef4444',
  leave_approved:    '#22c55e',
  leave_rejected:    '#ef4444',
  ticket_resolved:   '#22c55e',
  invoice_paid:      '#22c55e',
  payroll_paid:      '#10b981',
  expense_submitted: '#f59e0b',
  leave_requested:   '#f59e0b',
  payroll_approved:  '#3b82f6',
  task_assigned:     '#3b82f6',
  ticket_assigned:   '#3b82f6',
  task_comment:      '#8b5cf6',
  comment:           '#8b5cf6',
  lead_assigned:     '#6366f1',
};

const NotificationScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await httpClient.get('/notifications');
      setNotifications(res.data || []);
    } catch {
      // silent — show empty state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') load();
    });
    return () => sub.remove();
  }, [load]);

  const onRefresh = () => { setRefreshing(true); load(); };

  const handlePress = async (item) => {
    if (!item.is_read) {
      httpClient.post(`/notifications/${item.id}/read`).catch(() => {});
      setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n));
    }
  };

  const handleMarkAll = () => {
    httpClient.post('/notifications/read-all').catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const renderItem = ({ item }) => {
    const accent = TYPE_COLOR[item.type] || colors.primary;
    const icon   = TYPE_ICON[item.type]  || 'notifications-outline';
    return (
      <TouchableOpacity
        style={[
          s.item,
          {
            backgroundColor: item.is_read ? colors.surface : accent + '12',
            borderBottomColor: colors.border,
          },
        ]}
        onPress={() => handlePress(item)}
        activeOpacity={0.75}>
        <View style={[s.iconBox, { backgroundColor: accent + '20' }]}>
          <Icon name={icon} size={20} color={accent} />
        </View>
        <View style={s.content}>
          <Text style={[s.title, { color: item.is_read ? colors.textSecondary : colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.body ? (
            <Text style={[s.message, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
          ) : null}
          <Text style={[s.time, { color: colors.textLight }]}>{getTimeAgo(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={[s.dot, { backgroundColor: accent }]} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={notifications}
        keyExtractor={item => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
            tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListHeaderComponent={
          unreadCount > 0 ? (
            <TouchableOpacity style={[s.markAllBtn, { borderBottomColor: colors.border }]} onPress={handleMarkAll}>
              <Icon name="checkmark-done-outline" size={16} color={colors.primary} />
              <Text style={[s.markAllText, { color: colors.primary }]}>Mark all as read</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={s.empty}>
              <Icon name="notifications-off-outline" size={56} color={colors.border} />
              <Text style={[s.emptyTitle, { color: colors.text }]}>No notifications</Text>
              <Text style={[s.emptyText, { color: colors.textSecondary }]}>Pull down to refresh</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1 },
  item:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  iconBox:     { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  content:     { flex: 1, gap: 2 },
  title:       { fontSize: 14, fontWeight: '600' },
  message:     { fontSize: 12, lineHeight: 18 },
  time:        { fontSize: 11, marginTop: 2 },
  dot:         { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  markAllBtn:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  markAllText: { fontSize: 13, fontWeight: '600' },
  empty:       { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle:  { fontSize: 16, fontWeight: '700' },
  emptyText:   { fontSize: 14 },
});

export default NotificationScreen;
