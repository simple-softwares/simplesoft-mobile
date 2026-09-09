import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput,
  RefreshControl, Linking, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { friendlyError } from '../../../utils/errorUtils';
import { useSelector } from 'react-redux';
import TeamService from '../../../services/team/teamService';
import Avatar from '../../../components/team/Avatar';
import InviteManagerSheet from './InviteManagerSheet';
import PermissionsSheet from './PermissionsSheet';
import { useTheme } from '../../../theme/ThemeContext';
import { spacing, layout } from '../../../theme/spacing';
import typography from '../../../theme/typography';

const ROLES = ['admin','manager','member'];
const TEAM_COLORS = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#BE185D','#9333EA'];

// ── Role picker sheet ────────────────────────────────────────
const RoleSheet = ({ visible, member, onClose, onSave }) => {
  const { colors } = useTheme();
  const [role, setRole] = useState(member?.role || 'member');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => { if (visible) setRole(member?.role || 'member'); }, [visible]);

  const save = async () => {
    if (role === member?.role) { onClose(); return; }
    setSaving(true);
    try { await onSave(role); onClose(); }
    catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <TouchableOpacity style={styles.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Change role</Text>
          {member && (
            <View style={styles.memberRowSmall}>
              <Avatar user={member} size={36} />
              <Text style={styles.memberName}>{member.name}</Text>
            </View>
          )}
          {ROLES.map(r => (
            <TouchableOpacity key={r} style={[styles.roleRow, role === r && styles.roleRowActive]}
              onPress={() => setRole(r)}>
              <View style={[styles.roleIndicator, { backgroundColor: TeamService.getRoleColor(r) }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.roleLabel}>{TeamService.getRoleLabel(r)}</Text>
                <Text style={styles.roleDesc}>
                  {r === 'admin'   ? 'Full control — add, remove, delete team' :
                   r === 'manager' ? 'Add & remove members, manage tasks' :
                                     'View team, work on assigned tasks'}
                </Text>
              </View>
              {role === r && <Icon name="checkmark-circle" size={20} color={colors.primary} />}
            </TouchableOpacity>
          ))}
          <View style={styles.sheetBtns}>
            <TouchableOpacity style={styles.sheetCancel} onPress={onClose}>
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetSave, saving && { opacity: 0.6 }]}
              onPress={save} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={styles.sheetSaveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ── Invite sheet ─────────────────────────────────────────────
const InviteSheet = ({ visible, teamId, existingUserIds, onClose, onAdded }) => {
    const { colors } = useTheme();  

  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding,  setAdding]  = useState(null); // userId being added
  const [role,    setRole]    = useState('member');
  const timer = React.useRef(null);

  React.useEffect(() => { if (!visible) { setQuery(''); setResults([]); } }, [visible]);

  const search = (q) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try { setResults(await TeamService.searchUsers(q, existingUserIds)); }
      catch {}
      finally { setLoading(false); }
    }, 400);
  };

  const addUser = async (user) => {
    setAdding(user.id);
    try {
      const member = await TeamService.addMember(teamId, user.id, role);
      onAdded(member);
      setResults(r => r.filter(u => u.id !== user.id));
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setAdding(null); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <TouchableOpacity style={styles.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { maxHeight: '80%' }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Add member</Text>

          {/* Role selector */}
          <View style={styles.roleTabRow}>
            {ROLES.map(r => (
              <TouchableOpacity key={r}
                style={[styles.roleTab, role === r && { backgroundColor: TeamService.getRoleColor(r) }]}
                onPress={() => setRole(r)}>
                <Text style={[styles.roleTabText, role === r && { color: '#fff' }]}>
                  {TeamService.getRoleLabel(r)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <Icon name="search-outline" size={16} color={colors.textLight} style={{ marginLeft: 10 }} />
            <TextInput style={styles.searchInput} value={query} onChangeText={search}
              placeholder="Search by name or email..."
              placeholderTextColor={colors.textLight} autoFocus />
            {loading && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 10 }} />}
          </View>

          {/* Results */}
          <ScrollView style={{ maxHeight: 300 }}>
            {results.map(u => (
              <View key={u.id} style={styles.searchResult}>
                <Avatar user={u} size={40} />
                <View style={{ flex: 1, marginLeft: spacing.sm }}>
                  <Text style={styles.memberName}>{u.name}</Text>
                  <Text style={styles.memberSub}>{u.email}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.addBtn, adding === u.id && { opacity: 0.6 }]}
                  onPress={() => addUser(u)} disabled={adding === u.id}>
                  {adding === u.id
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Icon name="add" size={18} color="#fff" />}
                </TouchableOpacity>
              </View>
            ))}
            {query.length > 0 && results.length === 0 && !loading && (
              <Text style={styles.noResults}>No users found for "{query}"</Text>
            )}
            {query.length === 0 && (
              <Text style={styles.searchHint}>Type a name or email to search</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ── Member row ───────────────────────────────────────────────
const MemberRow = ({ member, myRole, myUid, onRolePress, onRemove, onPermPress }) => {
   const { colors } = useTheme(); 
  const roleColor   = TeamService.getRoleColor(member.role);
  const canManage   = TeamService.canManage(myRole);
  const isMe        = member.user_id === myUid;
  const canEdit     = canManage && !isMe;

  return (
    <View style={styles.memberRow}>
      <Avatar user={member} size={44} />
      <View style={styles.memberInfo}>
        <View style={styles.memberTopRow}>
          <Text style={styles.memberName}>{member.name}{isMe ? ' (you)' : ''}</Text>
          <TouchableOpacity
            style={[styles.roleChip, { backgroundColor: roleColor + '18', borderColor: roleColor + '40' }]}
            onPress={canEdit ? () => onRolePress(member) : undefined}
            disabled={!canEdit}>
            <Text style={[styles.roleChipText, { color: roleColor }]}>
              {TeamService.getRoleLabel(member.role)}
            </Text>
            {canEdit && <Icon name="chevron-down" size={11} color={roleColor} style={{ marginLeft: 2 }} />}
          </TouchableOpacity>
        </View>
        <Text style={styles.memberSub}>
          {member.phone || member.email}
          {member.task_count > 0 ? ` · ${member.task_count} tasks` : ''}
        </Text>
      </View>
      {/* Actions */}
      <View style={styles.memberActions}>
        {member.phone && (
          <TouchableOpacity style={styles.actionIcon}
            onPress={() => Linking.openURL(`https://wa.me/${member.phone.replace(/\D/g,'')}`)}>
            <Icon name="logo-whatsapp" size={20} color="#25D366" />
          </TouchableOpacity>
        )}
        {canEdit && (
          <TouchableOpacity style={styles.actionIcon} onPress={() => onPermPress(member)}>
            <Icon name="shield-checkmark-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        )}
        {canEdit && (
          <TouchableOpacity style={styles.actionIcon} onPress={() => onRemove(member)}>
            <Icon name="person-remove-outline" size={20} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// ── Main screen ──────────────────────────────────────────────
const TeamDetailScreen = ({ route, navigation }) => {
  const { colors } = useTheme();
  const { teamId } = route.params;
  const user   = useSelector(s => s.auth.user);
  const myUid  = user?.uid || user?.id;

  const [team,       setTeam]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showInviteManager, setShowInviteManager] = useState(false);
  const [roleSheet,  setRoleSheet]  = useState({ visible: false, member: null });
  const [permSheet,  setPermSheet]  = useState({ visible: false, member: null });

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const data = await TeamService.getTeam(teamId);
      setTeam(data);
      navigation.setOptions({ title: data.name });
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [teamId]);

  useFocusEffect(useCallback(() => {
    let active = true;
    const fetch = async () => {
      try {
        const data = await TeamService.getTeam(teamId);
        if (active) { setTeam(data); setLoading(false); navigation.setOptions({ title: data.name }); }
      } catch { if (active) setLoading(false); }
    };
    fetch();
    return () => { active = false; };
  }, [teamId]));

  const handleRemove = (member) => {
    Alert.alert(`Remove ${member.name}?`, 'They will lose access to this team.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try { await TeamService.removeMember(teamId, member.id); load(true); }
        catch (e) { Alert.alert('Error', friendlyError(e)); }
      }},
    ]);
  };

  const handleRoleSave = async (role) => {
    await TeamService.updateMemberRole(teamId, roleSheet.member.id, role);
    load(true);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  if (!team)   return <View style={styles.center}><Text style={{ color: colors.textSecondary }}>Team not found</Text></View>;

  const tc       = TEAM_COLORS[team.color] || TEAM_COLORS[0];
  const myRole   = team.my_role;
  const canManage= TeamService.canManage(myRole);
  const memberUserIds = (team.members || []).map(m => m.user_id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header card */}
      <View style={[styles.headerCard, { borderTopColor: tc }]}>
        <View style={[styles.teamIconLg, { backgroundColor: tc + '20' }]}>
          <Icon name="people" size={32} color={tc} />
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.teamName}>{team.name}</Text>
          {!!team.description && <Text style={styles.teamDesc}>{team.description}</Text>}
          <View style={styles.headerStats}>
            <Text style={[styles.headerStat, { color: tc }]}>{team.members?.length || 0} members</Text>
            <Text style={styles.headerStatDot}>·</Text>
            <Text style={styles.headerStat}>{team.members?.reduce((n, m) => n + m.task_count, 0) || 0} open tasks</Text>
          </View>
        </View>
      </View>

      {/* Members list */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Members</Text>
        {canManage && (
          <View style={{flexDirection:'row', gap:8}}>
            <TouchableOpacity style={[styles.addMemberBtn, { backgroundColor: tc + '20', borderWidth:1, borderColor: tc }]}
              onPress={() => setShowInviteManager(true)}>
              <Icon name="link-outline" size={15} color={tc} />
              <Text style={[styles.addMemberText, { color: tc }]}>Invite link</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addMemberBtn, { backgroundColor: tc }]}
              onPress={() => setShowInvite(true)}>
            <Icon name="person-add-outline" size={15} color="#fff" />
            <Text style={styles.addMemberText}>Add</Text>
          </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={team.members || []}
        keyExtractor={m => String(m.id)}
        contentContainerStyle={styles.memberList}
        refreshControl={<RefreshControl refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); load(); }}
          tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <MemberRow
            member={item}
            myRole={myRole}
            myUid={myUid}
            onRolePress={(m) => setRoleSheet({ visible: true, member: m })}
            onRemove={handleRemove}
            onPermPress={(m) => setPermSheet({ visible: true, member: m })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyMembers}>
            <Text style={styles.emptyMembersText}>No members yet — add someone!</Text>
          </View>
        }
      />

      {/* Invite sheet */}
      <InviteManagerSheet
        visible={showInviteManager}
        teamId={teamId}
        teamName={team?.name || ''}
        teamColor={team?.color || 0}
        onClose={() => setShowInviteManager(false)}
      />

      <InviteSheet
        visible={showInvite}
        teamId={teamId}
        existingUserIds={memberUserIds}
        onClose={() => setShowInvite(false)}
        onAdded={() => { setShowInvite(false); load(true); }}
      />

      {/* Permissions sheet */}
      <PermissionsSheet
        visible={permSheet.visible}
        teamId={teamId}
        member={permSheet.member}
        onClose={() => setPermSheet({ visible: false, member: null })}
      />

      {/* Role sheet */}
      <RoleSheet
        visible={roleSheet.visible}
        member={roleSheet.member}
        onClose={() => setRoleSheet({ visible: false, member: null })}
        onSave={handleRoleSave}
      />
    </View>
  );
};

const S = StyleSheet;
const styles = S.create({
  container:    { flex: 1, backgroundColor: '#FAFAF7' },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard:   { backgroundColor: '#FFFFFF', padding: spacing.lg, flexDirection: 'row', alignItems: 'center', borderTopWidth: 4, marginBottom: spacing.xs, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4 },
  teamIconLg:   { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  headerMeta:   { flex: 1 },
  teamName:     { fontSize: typography.h4, fontWeight: '800', color: '#0D0D14' },
  teamDesc:     { fontSize: typography.body2, color: '#3A3A4A', marginTop: 3 },
  headerStats:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  headerStat:   { fontSize: typography.caption, fontWeight: '600', color: '#3A3A4A' },
  headerStatDot:{ color: '#E8E8E0' },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  sectionTitle: { fontSize: typography.body2, fontWeight: '700', color: '#0D0D14' },
  addMemberBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  addMemberText:{ color: '#fff', fontWeight: '700', fontSize: 13 },
  memberList:   { paddingHorizontal: spacing.md, paddingBottom: 40 },
  memberRow:    { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: layout.borderRadius.lg, padding: spacing.md, marginBottom: 8, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  memberInfo:   { flex: 1, marginLeft: spacing.sm },
  memberTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  memberName:   { fontSize: typography.body2, fontWeight: '700', color: '#0D0D14', flex: 1 },
  memberSub:    { fontSize: typography.caption, color: '#3A3A4A' },
  roleChip:     { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  roleChipText: { fontSize: 11, fontWeight: '700' },
  memberActions:{ flexDirection: 'row', gap: 8 },
  actionIcon:   { padding: 4 },
  emptyMembers: { alignItems: 'center', padding: spacing.xl },
  emptyMembersText: { fontSize: typography.body2, color: '#3A3A4A' },
  // Modal
  modalWrap:    { flex: 1, justifyContent: 'flex-end' },
  modalBg:      { ...S.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:        { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xl, paddingBottom: 36 },
  sheetHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E8E8E0', alignSelf: 'center', marginBottom: spacing.lg },
  sheetTitle:   { fontSize: typography.h5, fontWeight: '700', color: '#0D0D14', marginBottom: spacing.lg },
  sheetBtns:    { flexDirection: 'row', gap: 12, marginTop: spacing.md },
  sheetCancel:  { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: layout.borderRadius.md, borderWidth: 1, borderColor: '#E8E8E0' },
  sheetCancelText: { color: '#3A3A4A', fontWeight: '600', fontSize: typography.body2 },
  sheetSave:    { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: layout.borderRadius.md, backgroundColor: '#2563EB' },
  sheetSaveText:{ color: '#fff', fontWeight: '700', fontSize: typography.body2 },
  // Role sheet
  memberRowSmall: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.lg },
  roleRow:      { flexDirection: 'row', alignItems: 'center', gap: 12, padding: spacing.md, borderRadius: layout.borderRadius.md, marginBottom: 6, borderWidth: 1, borderColor: '#E8E8E0' },
  roleRowActive:{ borderColor: '#2563EB', backgroundColor: '#EEF3FF' },
  roleIndicator:{ width: 10, height: 10, borderRadius: 5 },
  roleLabel:    { fontSize: typography.body2, fontWeight: '700', color: '#0D0D14' },
  roleDesc:     { fontSize: typography.caption, color: '#3A3A4A', marginTop: 2 },
  // Invite sheet
  roleTabRow:   { flexDirection: 'row', gap: 8, marginBottom: spacing.md },
  roleTab:      { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: layout.borderRadius.md, borderWidth: 1, borderColor: '#E8E8E0' },
  roleTabText:  { fontSize: 12, fontWeight: '600', color: '#3A3A4A' },
  searchBox:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#E8E8E0', borderRadius: layout.borderRadius.round, backgroundColor: '#FAFAF7', marginBottom: spacing.md },
  searchInput:  { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: typography.body2, color: '#0D0D14' },
  searchResult: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: S.hairlineWidth, borderBottomColor: '#F0F0F0' },
  memberSub:    { fontSize: typography.caption, color: '#3A3A4A' },
  addBtn:       { backgroundColor: '#2563EB', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  noResults:    { textAlign: 'center', padding: spacing.lg, color: '#3A3A4A', fontSize: typography.body2 },
  searchHint:   { textAlign: 'center', padding: spacing.md, color: '#9E9E9E', fontSize: typography.caption },
});

export default TeamDetailScreen;
