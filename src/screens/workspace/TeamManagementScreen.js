import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl, Modal, TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
import axios from 'axios';
import { PROVISION_BASE } from '../../config';
import TeamService from '../../services/team/teamService';

const TeamManagementScreen = ({ navigation }) => {
  const { colors } = useTheme();
  const workspace = useSelector(s => s.workspace);
  const user = useSelector(s => s.auth?.user);

  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedRole, setSelectedRole] = useState('member');
  const [addingMember, setAddingMember] = useState(false);
  const [permissions, setPermissions] = useState({ canAddMembers: false, canEditMembers: false, canRemoveMembers: false });

  useEffect(() => {
    loadPermissions();
    if (workspace.slug) {
      fetchTeamData();
    }
  }, [workspace.slug]);

  const loadPermissions = async () => {
    try {
      const perms = await TeamService.getUserPermissions();
      setPermissions(perms);
    } catch (e) {
    }
  };

  const fetchTeamData = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${PROVISION_BASE}/api/workspace/${workspace.slug}/team`,
        { timeout: 8000 }
      );
      setTeamData(res.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load team data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedMember) {
      Alert.alert('Error', 'Please select a member');
      return;
    }

    try {
      setAddingMember(true);
      await TeamService.addMember(teamData.id, selectedMember.id, selectedRole);

      Alert.alert('Success', `${selectedMember.name} added to team`);
      setShowAddMemberModal(false);
      setSelectedMember(null);
      setSelectedRole('member');

      // Refresh team data
      await fetchTeamData();
    } catch (e) {
      if (e.response?.status === 402) {
        Alert.alert(
          'Team Quota Reached',
          `You have ${teamData?.member_count}/${teamData?.team_size_quota} members.\n\n` +
          'Purchase more team seats to add members.\n' +
          '₹50 per person per month',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Buy Seats', onPress: () => navigation.navigate('BuyTeamSeats') }
          ]
        );
      } else {
        const errorMsg = e.response?.data?.detail || e.message || 'Failed to add member';
        Alert.alert('Error', errorMsg);
      }
    } finally {
      setAddingMember(false);
    }
  };

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const isAtCapacity = teamData?.member_count >= teamData?.team_size_quota;
  const availableSlots = teamData?.available_slots || 0;

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Quota Status */}
      <View style={[s.quotaBox, { backgroundColor: colors.surface }]}>
        <View style={s.quotaHeader}>
          <Text style={[s.quotaTitle, { color: colors.text }]}>Team Quota</Text>
          <Text style={[s.quotaValue, { color: colors.primary }]}>
            {teamData?.member_count}/{teamData?.team_size_quota}
          </Text>
        </View>

        <View style={s.quotaBarContainer}>
          <View style={[s.quotaBarFull, { backgroundColor: colors.border }]}>
            <View
              style={[
                s.quotaBarFilled,
                {
                  width: `${(teamData?.member_count / teamData?.team_size_quota) * 100}%`,
                  backgroundColor: isAtCapacity ? colors.error : colors.primary
                }
              ]}
            />
          </View>
        </View>

        <Text style={[s.quotaText, { color: colors.textSecondary }]}>
          {availableSlots > 0
            ? `${availableSlots} slot${availableSlots > 1 ? 's' : ''} available`
            : 'Team quota at capacity'}
        </Text>
      </View>

      {/* Monthly Cost */}
      <View style={[s.costBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={s.costRow}>
          <Text style={[s.costLabel, { color: colors.textSecondary }]}>
            Team Members:
          </Text>
          <Text style={[s.costValue, { color: colors.text }]}>
            ₹{teamData?.monthly_cost?.team_cost || 0}/month
          </Text>
        </View>
        <View style={s.costRow}>
          <Text style={[s.costLabel, { color: colors.textSecondary }]}>
            Modules:
          </Text>
          <Text style={[s.costValue, { color: colors.text }]}>
            ₹{teamData?.monthly_cost?.module_cost || 0}/month
          </Text>
        </View>
        <View style={[s.costRow, s.costRowTotal]}>
          <Text style={[s.costLabel, { color: colors.text, fontWeight: '700' }]}>
            Total:
          </Text>
          <Text style={[s.costValue, { color: colors.primary, fontWeight: '700', fontSize: 16 }]}>
            ₹{teamData?.monthly_cost?.total || 0}/month
          </Text>
        </View>
      </View>

      {/* Team Members List */}
      <FlatList
        data={teamData?.members || []}
        keyExtractor={item => item.user_id.toString()}
        renderItem={({ item }) => (
          <View style={[s.memberCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={s.memberInfo}>
              <View style={[s.memberAvatar, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[s.memberInitial, { color: colors.primary }]}>
                  {item.name[0]?.toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.memberName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[s.memberEmail, { color: colors.textSecondary }]}>{item.email}</Text>
                <View style={s.roleBadge}>
                  <Text style={s.roleText}>{item.role}</Text>
                </View>
              </View>
            </View>
            <Text style={[s.memberStatus, { color: colors.primary }]}>{item.status}</Text>
          </View>
        )}
        ListHeaderComponent={
          <Text style={[s.sectionLabel, { color: colors.textLight }]}>
            TEAM MEMBERS ({teamData?.member_count}/{teamData?.team_size_quota})
          </Text>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchTeamData} />
        }
        scrollEnabled={true}
        style={{ flex: 1 }}
      />

      {/* Action Buttons */}
      {permissions.canAddMembers && (
        <View style={s.actionButtonsContainer}>
          {/* Add Member Button */}
          {isAtCapacity ? (
            <TouchableOpacity
              style={[s.actionButton, { backgroundColor: colors.error }]}
              onPress={() => navigation.navigate('BuyTeamSeats')}
            >
              <Icon name="add-circle-outline" size={20} color="#fff" />
              <Text style={s.actionButtonText}>Purchase More Seats (₹50/person)</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[s.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowAddMemberModal(true)}
            >
              <Icon name="person-add-outline" size={20} color="#fff" />
              <Text style={s.actionButtonText}>Add Member to Team</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Add Member Modal */}
      <Modal
        visible={showAddMemberModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddMemberModal(false)}
      >
        <View style={[s.modal, { backgroundColor: colors.background }]}>
          <View style={[s.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setShowAddMemberModal(false)}>
              <Icon name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[s.modalTitle, { color: colors.text }]}>Add Team Member</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={s.modalContent}>
            <Text style={[s.inputLabel, { color: colors.text }]}>Select Member</Text>
            <TouchableOpacity
              style={[s.memberSelectButton, {
                backgroundColor: colors.surface,
                borderColor: colors.border
              }]}
              onPress={() => navigation.navigate('MemberPicker', {
                onSelect: setSelectedMember,
                excludeIds: (teamData?.members || []).map(m => m.user_id)
              })}
            >
              <Text style={[s.memberSelectText, { color: selectedMember ? colors.text : colors.textLight }]}>
                {selectedMember ? selectedMember.name : 'Choose a member...'}
              </Text>
              <Icon name="chevron-forward" size={20} color={colors.textLight} />
            </TouchableOpacity>

            <Text style={[s.inputLabel, { color: colors.text, marginTop: 16 }]}>Role</Text>
            <View style={s.roleButtons}>
              {['member', 'manager'].map(role => (
                <TouchableOpacity
                  key={role}
                  style={[
                    s.roleButton,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    selectedRole === role && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary
                    }
                  ]}
                  onPress={() => setSelectedRole(role)}
                >
                  <Text style={[
                    s.roleButtonText,
                    selectedRole === role && { color: '#fff' },
                    { color: colors.text }
                  ]}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[s.addButton, { backgroundColor: colors.primary }]}
              onPress={handleAddMember}
              disabled={addingMember || !selectedMember}
            >
              {addingMember ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="person-add" size={18} color="#fff" />
                  <Text style={s.addButtonText}>Add Member</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  quotaBox: { padding: 16, marginTop: 12, marginHorizontal: 12, borderRadius: 12 },
  quotaHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  quotaTitle: { fontSize: 14, fontWeight: '700' },
  quotaValue: { fontSize: 18, fontWeight: '700' },
  quotaBarContainer: { marginBottom: 8 },
  quotaBarFull: { height: 8, borderRadius: 4, overflow: 'hidden' },
  quotaBarFilled: { height: 8, borderRadius: 4 },
  quotaText: { fontSize: 12 },
  costBox: { margin: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
  costRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  costLabel: { fontSize: 13 },
  costValue: { fontSize: 13, fontWeight: '600' },
  costRowTotal: { borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, margin: 12, marginBottom: 8 },
  memberCard: { margin: 12, padding: 12, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 16, fontWeight: '700' },
  memberName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  memberEmail: { fontSize: 12, marginBottom: 4 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#E3F2FD', borderRadius: 4 },
  roleText: { fontSize: 10, color: '#1976D2', fontWeight: '600' },
  memberStatus: { fontSize: 11, fontWeight: '600' },
  actionButtonsContainer: { paddingHorizontal: 12, paddingVertical: 8 },
  actionButton: { margin: 0, padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modal: { flex: 1, paddingTop: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalContent: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  memberSelectButton: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberSelectText: { fontSize: 14 },
  roleButtons: { flexDirection: 'row', gap: 8 },
  roleButton: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center' },
  roleButtonText: { fontSize: 12, fontWeight: '600' },
  addButton: { marginTop: 24, paddingVertical: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' }
});

export default TeamManagementScreen;
