import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import LeaveService from '../leaveService';
import { useTheme } from '../../../theme/ThemeContext';
import { friendlyError } from '../../../utils/errorUtils';

const LeaveListScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'pending', 'approved', 'refused'

  useFocusEffect(
    React.useCallback(() => {
      loadLeaves();
    }, [filter])
  );

  const loadLeaves = async () => {
    setLoading(true);
    try {
      const state = filter === 'all' ? null : filter === 'pending' ? 'confirm' : filter;
      const data = await LeaveService.getMyLeaveRequests({ state });
      setLeaves(data);
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const state = filter === 'all' ? null : filter === 'pending' ? 'confirm' : filter;
      const data = await LeaveService.getMyLeaveRequests({ state });
      setLeaves(data);
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancel = (leave) => {
    if (['draft', 'confirm'].includes(leave.state)) {
      Alert.alert(
        'Cancel Request',
        'Are you sure you want to cancel this leave request?',
        [
          { text: 'No', style: 'cancel' },
          {
            text: 'Yes',
            style: 'destructive',
            onPress: async () => {
              try {
                await LeaveService.cancelLeave(leave.id);
                Alert.alert('Success', 'Leave request cancelled');
                loadLeaves();
              } catch (e) {
                Alert.alert('Error', friendlyError(e));
              }
            },
          },
        ]
      );
    }
  };

  const LeaveItem = ({ item }) => (
    <TouchableOpacity
      style={[s.item, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('LeaveDetail', { leaveId: item.id })}>
      <View style={s.itemLeft}>
        <View style={[s.statusDot, { backgroundColor: LeaveService.getStatusColor(item.state) }]} />
        <View style={s.itemInfo}>
          <Text style={[s.leaveType, { color: colors.text }]}>{item.leaveTypeName}</Text>
          <Text style={[s.dateRange, { color: colors.textSecondary }]}>
            {LeaveService.formatDateRange(item.startDate, item.endDate)}
          </Text>
          <Text style={[s.days, { color: colors.textSecondary }]}>
            {item.days} working day{item.days !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
      <View style={s.itemRight}>
        <Text style={[s.status, { color: LeaveService.getStatusColor(item.state) }]}>
          {LeaveService.getStatusLabel(item.state)}
        </Text>
        {['draft', 'confirm'].includes(item.state) && (
          <TouchableOpacity
            style={s.cancelBtn}
            onPress={() => handleCancel(item)}>
            <Icon name="close" size={14} color="#DC2626" />
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const FilterButton = ({ label, value }) => (
    <TouchableOpacity
      style={[
        s.filterBtn,
        filter === value && { backgroundColor: colors.primary },
        { borderColor: colors.border },
      ]}
      onPress={() => setFilter(value)}>
      <Text style={[s.filterBtnText, { color: filter === value ? '#fff' : colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Filter Tabs */}
      <View style={s.filterBar}>
        <FilterButton label="All" value="all" />
        <FilterButton label="Pending" value="pending" />
        <FilterButton label="Approved" value="validate" />
        <FilterButton label="Refused" value="refuse" />
      </View>

      {/* Leave List */}
      {leaves.length === 0 ? (
        <View style={[s.empty, { marginTop: 40 }]}>
          <Icon name="checkmark-circle-outline" size={48} color={colors.textSecondary} />
          <Text style={[s.emptyText, { color: colors.textSecondary }]}>No leave requests</Text>
        </View>
      ) : (
        <FlatList
          data={leaves}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => <LeaveItem item={item} />}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* FAB - New Request */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('LeaveRequest')}>
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterBar: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  filterBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  filterBtnText: { fontSize: 12, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingVertical: 12 },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemLeft: { flexDirection: 'row', gap: 12, flex: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  itemInfo: { flex: 1 },
  leaveType: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  dateRange: { fontSize: 12, marginBottom: 2 },
  days: { fontSize: 11 },
  itemRight: { alignItems: 'flex-end', gap: 8 },
  status: { fontSize: 12, fontWeight: '600' },
  cancelBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, marginTop: 8 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default LeaveListScreen;
