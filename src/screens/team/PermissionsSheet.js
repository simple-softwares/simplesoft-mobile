import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, Switch,
  TouchableOpacity, ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import TeamService from '../../services/team/teamService';
import { teamStorage as storage } from '../../services/storage/storageRegistry';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';

const PERMISSION_GROUPS = [
  {
    label: 'Tasks',
    icon:  'checkbox-outline',
    keys: [
      { key: 'can_create_tasks', label: 'Create tasks' },
      { key: 'can_assign_tasks', label: 'Assign tasks' },
      { key: 'can_delete_tasks', label: 'Delete tasks' },
    ],
  },
  {
    label: 'Projects',
    icon:  'folder-outline',
    keys: [
      { key: 'can_create_projects', label: 'Create projects' },
      { key: 'can_manage_projects', label: 'Manage projects' },
    ],
  },
  {
    label: 'Contacts',
    icon:  'people-outline',
    keys: [
      { key: 'can_view_contacts', label: 'View contacts' },
      { key: 'can_edit_contacts', label: 'Edit contacts' },
    ],
  },
  {
    label: 'Team',
    icon:  'shield-outline',
    keys: [
      { key: 'can_view_reports',   label: 'View reports'   },
      { key: 'can_invite_members', label: 'Invite members' },
    ],
  },
];

const DEFAULT_PERMS = {
  can_create_tasks:    true,
  can_assign_tasks:    false,
  can_delete_tasks:    false,
  can_create_projects: false,
  can_manage_projects: false,
  can_view_contacts:   true,
  can_edit_contacts:   false,
  can_view_reports:    false,
  can_invite_members:  false,
};

const storageKey = (teamId, memberId) => `perms_${teamId}_${memberId}`;

const PermissionsSheet = ({ visible, teamId, member, onClose }) => {
  const { colors }    = useTheme();
  const [perms,   setPerms]   = useState(DEFAULT_PERMS);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    if (visible && member) {
      setLoading(true);
      const loadPerms = async () => {
        try {
          // Load from server via teamService, fall back to MMKV cache
          const fetched = await TeamService.getMemberPermissions(teamId, member.member_id);
          const { _new, ...permsWithoutNew } = fetched;
          setPerms(permsWithoutNew || DEFAULT_PERMS);
        } catch (e) {
          // Fallback to MMKV cache
          try {
            const raw = storage.getString(storageKey(teamId, member.id));
            setPerms(raw ? JSON.parse(raw) : { ...DEFAULT_PERMS });
          } catch {
            setPerms({ ...DEFAULT_PERMS });
          }
        } finally {
          setLoading(false);
        }
      };
      loadPerms();
    }
  }, [visible, member]);

  const save = async () => {
    setSaving(true);
    try {
      // Save via teamService
      await TeamService.updateMemberPermissions(teamId, member.member_id, perms);
      // Write-through to MMKV cache
      storage.set(storageKey(teamId, member.id), JSON.stringify(perms));
      Alert.alert('Saved', 'Permissions updated');
      onClose();
    } catch (e) {
      Alert.alert('Error', friendlyError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.wrap}>
        <TouchableOpacity style={styles.bg} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.title, { color: colors.text }]}>
            Permissions — {member?.name}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Role: {member?.role} · Fine-tune what this member can do
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ padding: 24 }} />
          ) : (
            <ScrollView style={{ maxHeight: 420 }}>
              {PERMISSION_GROUPS.map(group => (
                <View key={group.label} style={{ marginBottom: 16 }}>
                  <View style={styles.groupHeader}>
                    <Icon name={group.icon} size={14} color={colors.primary} />
                    <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                      {group.label}
                    </Text>
                  </View>
                  {group.keys.map(p => (
                    <View key={p.key}
                      style={[styles.permRow, { borderBottomColor: colors.border }]}>
                      <Text style={[styles.permLabel, { color: colors.text }]}>{p.label}</Text>
                      <Switch
                        value={!!perms[p.key]}
                        onValueChange={v => setPerms(prev => ({ ...prev, [p.key]: v }))}
                        trackColor={{ false: colors.border, true: colors.primary }}
                        thumbColor={colors.surface}
                      />
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}

          <View style={styles.btns}>
            <TouchableOpacity style={[styles.cancel, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.save, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={save}
              disabled={saving || loading}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.saveText}>Save permissions</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const S = StyleSheet;
const styles = S.create({
  wrap:        { flex: 1, justifyContent: 'flex-end' },
  bg:          { ...S.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:       { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle:      { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:       { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  subtitle:    { fontSize: 12, marginBottom: 16 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  groupLabel:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  permRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: S.hairlineWidth },
  permLabel:   { fontSize: 14 },
  btns:        { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancel:      { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 10, borderWidth: 1 },
  cancelText:  { fontWeight: '600', fontSize: 14 },
  save:        { flex: 2, alignItems: 'center', paddingVertical: 13, borderRadius: 10 },
  saveText:    { color: '#fff', fontWeight: '700', fontSize: 14 },
});

export default PermissionsSheet;
