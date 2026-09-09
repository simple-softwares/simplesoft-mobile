import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api/httpClient';
import HRService from '../../modules/hr/hrService';
import TeamService from '../../services/team/teamService';
import Avatar from '../../components/team/Avatar';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';

const PERM_GROUPS = [
  {
    label: 'Tasks',
    icon: 'checkbox-outline',
    keys: [
      { key: 'can_create_tasks', label: 'Create tasks' },
      { key: 'can_assign_tasks', label: 'Assign tasks' },
      { key: 'can_delete_tasks', label: 'Delete tasks' },
    ],
  },
  {
    label: 'Projects',
    icon: 'folder-outline',
    keys: [
      { key: 'can_create_projects', label: 'Create projects' },
      { key: 'can_manage_projects', label: 'Manage projects' },
    ],
  },
  {
    label: 'Contacts',
    icon: 'people-outline',
    keys: [
      { key: 'can_view_contacts', label: 'View contacts' },
      { key: 'can_edit_contacts', label: 'Edit contacts' },
    ],
  },
  {
    label: 'Team',
    icon: 'shield-outline',
    keys: [
      { key: 'can_view_reports', label: 'View reports' },
      { key: 'can_invite_members', label: 'Invite members' },
    ],
  },
];

const EmployeeProfileScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { employeeId } = route.params;

  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [archiving, setArchiving] = useState(false);
  const [teams, setTeams] = useState([]);
  const [perms, setPerms] = useState({});
  const [permLoading, setPermLoading] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      loadEmployee();
      return () => {};
    }, [employeeId])
  );

  const loadEmployee = async () => {
    setLoading(true);
    try {
      const emp = await HRService.getEmployee(employeeId);
      setEmployee(emp);

      // Fetch teams where this employee's user_id is a member
      const allTeams = await TeamService.getTeams();
      const empUserId = emp.user_id?.[0];
      const empTeams = allTeams.filter(t =>
        t.members.some(m => m.user_id === empUserId)
      );
      setTeams(empTeams);

      // Load permissions for this employee in all teams
      const permsMap = {};
      for (const team of empTeams) {
        const member = team.members.find(m => m.user_id === empUserId);
        if (member?.member_id) {
          const p = await TeamService.getMemberPermissions(team.id, member.member_id);
          const { _new, ...permsWithoutNew } = p;
          permsMap[team.id] = permsWithoutNew;
        }
      }
      setPerms(permsMap);
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  const archive = () => {
    Alert.alert(
      'Archive Employee',
      `Archive ${employee?.name}? They can still be accessed later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            setArchiving(true);
            try {
              await api.patch(`/hr/employees/${employeeId}`, { active: false });
              Alert.alert('Success', 'Employee archived', [
                { text: 'OK', onPress: () => navigation.goBack() }
              ]);
            } catch (e) {
              Alert.alert('Error', friendlyError(e));
            } finally {
              setArchiving(false);
            }
          }
        }
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

  if (!employee) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Text style={[s.errorText, { color: colors.text }]}>Employee not found</Text>
      </View>
    );
  }

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Hero Section */}
        <View style={[s.hero, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <Avatar user={employee} size={80} />
          <View style={s.heroInfo}>
            <Text style={[s.name, { color: colors.text }]}>{employee.name}</Text>
            <Text style={[s.jobTitle, { color: colors.textSecondary }]}>
              {employee.job_title || 'Employee'}
            </Text>
            {employee.department_id && (
              <View style={[s.deptBadge, { backgroundColor: colors.primary + '15' }]}>
                <Text style={[s.deptText, { color: colors.primary }]}>
                  {employee.department_id?.[1]}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Work Info */}
        <Section title="Work Information" colors={colors}>
          {employee.work_email && (
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={employee.work_email}
              onTap={() => Linking.openURL(`mailto:${employee.work_email}`)}
              colors={colors}
            />
          )}
          {employee.work_phone && (
            <InfoRow
              icon="call-outline"
              label="Phone"
              value={employee.work_phone}
              onTap={() => Linking.openURL(`tel:${employee.work_phone}`)}
              colors={colors}
            />
          )}
          {employee.mobile_phone && (
            <InfoRow
              icon="phone-portrait-outline"
              label="Mobile"
              value={employee.mobile_phone}
              onTap={() => Linking.openURL(`tel:${employee.mobile_phone}`)}
              colors={colors}
            />
          )}
          {employee.parent_id && (
            <InfoRow
              icon="person-outline"
              label="Manager"
              value={employee.parent_id?.[1]}
              colors={colors}
            />
          )}
          {employee.department_id && (
            <InfoRow
              icon="folder-outline"
              label="Department"
              value={employee.department_id?.[1]}
              colors={colors}
            />
          )}
        </Section>

        {/* Personal Info */}
        <Section title="Personal Information" colors={colors}>
          {employee.gender && (
            <InfoRow
              label="Gender"
              value={employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1)}
              colors={colors}
            />
          )}
          {employee.birthday && (
            <InfoRow
              label="Birthday"
              value={new Date(employee.birthday).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              colors={colors}
            />
          )}
          {employee.marital && (
            <InfoRow
              label="Marital Status"
              value={employee.marital.charAt(0).toUpperCase() + employee.marital.slice(1)}
              colors={colors}
            />
          )}
          {employee.emergency_contact && (
            <InfoRow
              label="Emergency Contact"
              value={employee.emergency_contact}
              colors={colors}
            />
          )}
          {employee.emergency_phone && (
            <InfoRow
              label="Emergency Phone"
              value={employee.emergency_phone}
              onTap={() => Linking.openURL(`tel:${employee.emergency_phone}`)}
              colors={colors}
            />
          )}
        </Section>

        {/* Teams */}
        {teams.length > 0 && (
          <Section title="Team Memberships" colors={colors}>
            {teams.map(team => (
              <View key={team.id} style={[s.teamRow, { borderBottomColor: colors.border }]}>
                <View style={s.teamInfo}>
                  <Text style={[s.teamName, { color: colors.text }]}>{team.name}</Text>
                  <Text style={[s.teamRole, { color: colors.textSecondary }]}>
                    {TeamService.getRoleLabel(
                      team.members.find(m => m.user_id === employee.user_id?.[0])?.role || 'member'
                    )}
                  </Text>
                </View>
              </View>
            ))}
          </Section>
        )}

        {/* Permissions (inline, simple) */}
        {teams.length > 0 && (
          <Section title="Permissions" colors={colors}>
            {teams.map(team => {
              const teamPerms = perms[team.id];
              if (!teamPerms) return null;

              return (
                <View key={team.id} style={s.permTeam}>
                  <Text style={[s.permTeamName, { color: colors.text }]}>{team.name}</Text>
                  {PERM_GROUPS.map(group => (
                    <View key={group.label} style={s.permGroup}>
                      <View style={s.permGroupHeader}>
                        <Icon name={group.icon} size={12} color={colors.primary} />
                        <Text style={[s.permGroupLabel, { color: colors.textSecondary }]}>
                          {group.label}
                        </Text>
                      </View>
                      {group.keys.map(p => (
                        <View key={p.key} style={[s.permItem, { borderBottomColor: colors.border }]}>
                          <Text style={[s.permLabel, { color: colors.text }]}>{p.label}</Text>
                          <View style={[s.checkbox, teamPerms[p.key] && { backgroundColor: colors.primary }]}>
                            {teamPerms[p.key] && <Icon name="checkmark" size={12} color="#fff" />}
                          </View>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              );
            })}
          </Section>
        )}

        <View style={s.spacer} />
      </ScrollView>

      {/* Archive Button */}
      <View style={[s.footer, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[s.archiveBtn, archiving && { opacity: 0.6 }]}
          onPress={archive}
          disabled={archiving}>
          {archiving ? <ActivityIndicator size="small" color="#DC2626" />
            : <Icon name="trash-outline" size={18} color="#DC2626" />}
          <Text style={s.archiveBtnText}>Archive</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const Section = ({ title, children, colors }) => (
  <View style={s.section}>
    <Text style={[s.sectionTitle, { color: colors.textSecondary }]}>{title}</Text>
    {children}
  </View>
);

const InfoRow = ({ icon, label, value, onTap, colors }) => (
  <TouchableOpacity
    style={[s.infoRow, { borderBottomColor: colors.border }]}
    onPress={onTap}
    disabled={!onTap}
    activeOpacity={onTap ? 0.7 : 1}>
    {icon && <Icon name={icon} size={16} color={colors.primary} />}
    <View style={s.infoText}>
      <Text style={[s.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[s.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
    {onTap && <Icon name="open-outline" size={16} color={colors.textSecondary} />}
  </TouchableOpacity>
);

const s = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 100 },
  hero: { padding: 20, alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  heroInfo: { alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700' },
  jobTitle: { fontSize: 13 },
  deptBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, marginTop: 6 },
  deptText: { fontSize: 12, fontWeight: '600' },
  section: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  sectionTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, gap: 10 },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  teamRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 14, fontWeight: '600' },
  teamRole: { fontSize: 12, marginTop: 2 },
  permTeam: { marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  permTeamName: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  permGroup: { marginBottom: 8 },
  permGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  permGroupLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  permItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, paddingLeft: 12, borderBottomWidth: 1 },
  permLabel: { fontSize: 13 },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: 16, flexDirection: 'row' },
  archiveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, borderWidth: 1, borderColor: '#DC2626', paddingVertical: 12 },
  archiveBtnText: { color: '#DC2626', fontWeight: '600', fontSize: 14 },
  spacer: { height: 40 },
  errorText: { fontSize: 14 },
});

export default EmployeeProfileScreen;
