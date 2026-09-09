import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LeaveService from '../leaveService';
import { useTheme } from '../../../theme/ThemeContext';
import { friendlyError } from '../../../utils/errorUtils';

const LeaveDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { leaveId } = route.params;
  const [leave, setLeave] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadLeave();
  }, [leaveId]);

  const loadLeave = async () => {
    setLoading(true);
    try {
      const data = await LeaveService.getLeave(leaveId);
      setLeave(data);
      navigation.setOptions({
        title: data?.leaveTypeName || 'Leave Request',
      });
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = () => {
    Alert.alert(
      'Approve Leave',
      `Approve this leave request for ${leave?.estimatedDays || leave?.days} days?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setActionLoading(true);
            try {
              await LeaveService.approveLeave(leaveId);
              Alert.alert('Success', 'Leave approved', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (e) {
              Alert.alert('Error', friendlyError(e));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRefuse = () => {
    Alert.alert(
      'Refuse Leave',
      'Are you sure you want to refuse this leave request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Refuse',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await LeaveService.refuseLeave(leaveId);
              Alert.alert('Success', 'Leave refused', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (e) {
              Alert.alert('Error', friendlyError(e));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this leave request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await LeaveService.cancelLeave(leaveId);
              Alert.alert('Success', 'Request cancelled', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (e) {
              Alert.alert('Error', friendlyError(e));
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!leave) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={[s.errorText, { color: colors.text }]}>Leave request not found</Text>
      </View>
    );
  }

  const isPending = leave.state === 'confirm';
  const isDraft = leave.state === 'draft';
  const isApproved = leave.state === 'validate' || leave.state === 'validate1';
  const isRefused = leave.state === 'refuse';

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Status Card */}
        <View style={[s.statusCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.statusHeader}>
            <View style={[s.statusIcon, { backgroundColor: LeaveService.getStatusColor(leave.state) + '15' }]}>
              <Icon
                name={isApproved ? 'checkmark-circle' : isRefused ? 'close-circle' : 'time'}
                size={24}
                color={LeaveService.getStatusColor(leave.state)}
              />
            </View>
            <View>
              <Text style={[s.statusLabel, { color: colors.text }]}>
                {LeaveService.getStatusLabel(leave.state)}
              </Text>
              {leave.managerName && (
                <Text style={[s.managerName, { color: colors.textSecondary }]}>
                  {isPending ? 'Waiting approval from' : 'Approved by'} {leave.managerName}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Leave Details */}
        <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.cardTitle, { color: colors.text }]}>Leave Details</Text>

          <InfoRow
            label="Leave Type"
            value={leave.leaveTypeName}
            colors={colors}
          />
          <InfoRow
            label="Start Date"
            value={leave.startDate?.toLocaleDateString('en-IN')}
            colors={colors}
          />
          <InfoRow
            label="End Date"
            value={leave.endDate?.toLocaleDateString('en-IN')}
            colors={colors}
          />
          <InfoRow
            label="Duration"
            value={`${leave.days} working day${leave.days !== 1 ? 's' : ''}`}
            colors={colors}
          />
          {leave.reason && (
            <InfoRow
              label="Reason"
              value={leave.reason}
              colors={colors}
            />
          )}
        </View>

        {/* Employee Info (if manager viewing) */}
        {leave.employeeName && (
          <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[s.cardTitle, { color: colors.text }]}>Employee</Text>
            <InfoRow
              label="Name"
              value={leave.employeeName}
              colors={colors}
            />
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      {(isPending || isDraft) && (
        <View style={[s.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
          {isPending && (
            <>
              <TouchableOpacity
                style={[s.btn, s.approveBtn, { backgroundColor: colors.primary }, actionLoading && { opacity: 0.6 }]}
                onPress={handleApprove}
                disabled={actionLoading}>
                <Icon name="checkmark" size={18} color="#fff" />
                <Text style={s.btnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.btn, s.refuseBtn, actionLoading && { opacity: 0.6 }]}
                onPress={handleRefuse}
                disabled={actionLoading}>
                <Icon name="close" size={18} color="#DC2626" />
                <Text style={s.refuseBtnText}>Refuse</Text>
              </TouchableOpacity>
            </>
          )}
          {isDraft && (
            <TouchableOpacity
              style={[s.btn, s.cancelBtn, actionLoading && { opacity: 0.6 }]}
              onPress={handleCancel}
              disabled={actionLoading}>
              <Icon name="trash-outline" size={18} color="#DC2626" />
              <Text style={s.refuseBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const InfoRow = ({ label, value, colors }) => (
  <View style={[s.infoRow, { borderBottomColor: colors.border }]}>
    <Text style={[s.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
    <Text style={[s.infoValue, { color: colors.text }]}>{value}</Text>
  </View>
);

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 16, paddingBottom: 120 },
  statusCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusHeader: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { borderRadius: 12, padding: 8 },
  statusLabel: { fontSize: 14, fontWeight: '700' },
  managerName: { fontSize: 12, marginTop: 4 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  cardTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1 },
  infoLabel: { fontSize: 12 },
  infoValue: { fontSize: 13, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: 16 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 16, flexDirection: 'row', gap: 12 },
  btn: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  approveBtn: { backgroundColor: '#10B981' },
  refuseBtn: { borderWidth: 1, borderColor: '#FCA5A5' },
  cancelBtn: { borderWidth: 1, borderColor: '#FCA5A5' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  refuseBtnText: { color: '#DC2626', fontWeight: '700', fontSize: 14 },
  errorText: { fontSize: 14 },
});

export default LeaveDetailScreen;
