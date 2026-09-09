import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  FlatList, Alert, ActivityIndicator, Share, Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import TeamService from '../../../services/team/teamService';
import { friendlyError } from '../../../utils/errorUtils';
import { useTheme } from '../../../theme/ThemeContext';

const TEAM_COLORS = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#BE185D','#9333EA'];

const ROLE_OPTIONS = [
  { value: 'member',  label: 'Member',  color: '#059669' },
  { value: 'manager', label: 'Manager', color: '#D97706' },
  { value: 'admin',   label: 'Admin',   color: '#DC2626' },
];

const EXPIRY_OPTIONS = [
  { days: 1,  label: '1 day'   },
  { days: 7,  label: '7 days'  },
  { days: 30, label: '30 days' },
];

const MAX_USES_OPTIONS = [
  { value: 0,  label: 'Unlimited'  },
  { value: 1,  label: 'Single use' },
  { value: 5,  label: '5 uses'     },
  { value: 10, label: '10 uses'    },
];

const InviteCard = ({ inv, tc, onShare, onWhatsApp, onRevoke, formatExpiry }) => {
  const { colors } = useTheme();
  return (
    <View style={[styles.inviteCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={styles.codeRow}>
        <View style={[styles.codeBadge, { backgroundColor: tc + '15', borderColor: tc + '40' }]}>
          <Text style={[styles.codeText, { color: tc }]}>{inv.code}</Text>
        </View>
        <View style={[styles.roleTag, { backgroundColor: TeamService.getRoleColor(inv.role) + '18' }]}>
          <Text style={[styles.roleTagText, { color: TeamService.getRoleColor(inv.role) }]}>
            {TeamService.getRoleLabel(inv.role)}
          </Text>
        </View>
      </View>

      <View style={styles.inviteMeta}>
        <Text style={[styles.inviteMetaText, { color: colors.textSecondary }]}>
          {formatExpiry(inv.expires_at)}
          {inv.max_uses > 0 ? ` · ${inv.use_count}/${inv.max_uses} used` : ` · ${inv.use_count} used`}
        </Text>
        <Text style={[styles.inviteBy, { color: colors.textLight }]}>by {inv.created_by}</Text>
      </View>

      <View style={[styles.inviteActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={[styles.inviteAction, { backgroundColor: colors.surface }]} onPress={() => onWhatsApp(inv)}>
          <Icon name="logo-whatsapp" size={18} color="#25D366" />
          <Text style={[styles.inviteActionText, { color: '#25D366' }]}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.inviteAction, { backgroundColor: colors.surface }]} onPress={() => onShare(inv)}>
          <Icon name="share-outline" size={18} color={colors.primary} />
          <Text style={[styles.inviteActionText, { color: colors.primary }]}>Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.inviteAction, { backgroundColor: colors.surface }]} onPress={() => onRevoke(inv)}>
          <Icon name="close-circle-outline" size={18} color={colors.error} />
          <Text style={[styles.inviteActionText, { color: colors.error }]}>Revoke</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const InviteManagerSheet = ({ visible, teamId, teamName, teamColor, onClose }) => {
  const { colors } = useTheme();
  const [invites,    setInvites]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [selRole,    setSelRole]    = useState('member');
  const [selDays,    setSelDays]    = useState(7);
  const [selMaxUses, setSelMaxUses] = useState(0);

  const tc = TEAM_COLORS[teamColor] || TEAM_COLORS[0];

  useEffect(() => {
    if (visible) loadInvites();
  }, [visible]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const data = await TeamService.getInvites(teamId);
      setInvites(data);
    } catch {} finally { setLoading(false); }
  };

  const createInvite = async () => {
    setCreating(true);
    try {
      const inv = await TeamService.createInvite(teamId, {
        role: selRole, maxUses: selMaxUses, expiresDays: selDays,
      });
      setInvites(prev => [inv, ...prev]);
      setShowCreate(false);
      shareInvite(inv);
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setCreating(false); }
  };

  const shareInvite = (inv) => {
    const msg =
      `You're invited to join *${teamName}* on SimpleSoft Workspace!\n\n` +
      `Use invite code: *${inv.code}*\n\n` +
      `Role: ${TeamService.getRoleLabel(inv.role)}\n` +
      `Expires: ${new Date(inv.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}\n\n` +
      `Open the app → Team tab → Join Team → enter the code`;
    Share.share({ message: msg, title: `Join ${teamName}` });
  };

  const whatsappShare = (inv) => {
    const msg = encodeURIComponent(
      `You're invited to join *${teamName}* on SimpleSoft Workspace!\n\nInvite code: *${inv.code}*\n\nOpen the app, go to Team tab → Join Team → enter this code.`
    );
    Linking.openURL(`https://wa.me/?text=${msg}`);
  };

  const revokeInvite = (inv) => {
    Alert.alert('Revoke invite?', `Code ${inv.code} will stop working.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
        try {
          await TeamService.revokeInvite(inv.id);
          setInvites(prev => prev.filter(i => i.id !== inv.id));
        } catch (e) { Alert.alert('Error', friendlyError(e)); }
      }},
    ]);
  };

  const formatExpiry = (dateStr) => {
    const d    = new Date(dateStr);
    const now  = new Date();
    const diff = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Expired';
    if (diff === 1) return 'Expires tomorrow';
    return `Expires in ${diff} days`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalWrap}>
        <TouchableOpacity style={styles.modalBg} onPress={onClose} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Invite links</Text>
            <TouchableOpacity
              style={[styles.newBtn, { backgroundColor: tc }]}
              onPress={() => setShowCreate(!showCreate)}>
              <Icon name={showCreate ? 'chevron-up' : 'add'} size={16} color="#fff" />
              <Text style={styles.newBtnText}>{showCreate ? 'Cancel' : 'New invite'}</Text>
            </TouchableOpacity>
          </View>

          {showCreate && (
            <View style={[styles.createForm, { borderBottomColor: colors.border }]}>
              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Role</Text>
              <View style={styles.optionRow}>
                {ROLE_OPTIONS.map(r => (
                  <TouchableOpacity key={r.value}
                    style={[styles.optionBtn, { borderColor: colors.border }, selRole === r.value && { borderColor: r.color, backgroundColor: r.color + '12' }]}
                    onPress={() => setSelRole(r.value)}>
                    <Text style={[styles.optionBtnText, { color: colors.textSecondary }, selRole === r.value && { color: r.color, fontWeight: '700' }]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Expires after</Text>
              <View style={styles.optionRow}>
                {EXPIRY_OPTIONS.map(e => (
                  <TouchableOpacity key={e.days}
                    style={[styles.optionBtn, { borderColor: colors.border }, selDays === e.days && { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}
                    onPress={() => setSelDays(e.days)}>
                    <Text style={[styles.optionBtnText, { color: colors.textSecondary }, selDays === e.days && { color: colors.primary, fontWeight: '700' }]}>
                      {e.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.formLabel, { color: colors.textSecondary }]}>Max uses</Text>
              <View style={styles.optionRow}>
                {MAX_USES_OPTIONS.map(m => (
                  <TouchableOpacity key={m.value}
                    style={[styles.optionBtn, { borderColor: colors.border }, selMaxUses === m.value && { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}
                    onPress={() => setSelMaxUses(m.value)}>
                    <Text style={[styles.optionBtnText, { color: colors.textSecondary }, selMaxUses === m.value && { color: colors.primary, fontWeight: '700' }]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.generateBtn, { backgroundColor: tc }, creating && { opacity: 0.6 }]}
                onPress={createInvite}
                disabled={creating}>
                {creating
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <><Icon name="link" size={16} color="#fff" /><Text style={styles.generateBtnText}>Generate & share</Text></>
                }
              </TouchableOpacity>
            </View>
          )}

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : invites.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Icon name="link-outline" size={36} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.text }]}>No active invites</Text>
              <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Create one above to share with your team</Text>
            </View>
          ) : (
            <FlatList
              data={invites}
              keyExtractor={i => String(i.id)}
              style={styles.list}
              renderItem={({ item }) => (
                <InviteCard
                  inv={item}
                  tc={tc}
                  onShare={shareInvite}
                  onWhatsApp={whatsappShare}
                  onRevoke={revokeInvite}
                  formatExpiry={formatExpiry}
                />
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalWrap:  { flex: 1, justifyContent: 'flex-end' },
  modalBg:    { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:      { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%', paddingBottom: 32 },
  handle:     { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  sheetHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  newBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  createForm:    { padding: 20, borderBottomWidth: 1 },
  formLabel:     { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  optionRow:     { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  optionBtn:     { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  optionBtnText: { fontSize: 13, fontWeight: '500' },
  generateBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 8, paddingVertical: 13, marginTop: 4 },
  generateBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  list:          { paddingHorizontal: 16, paddingTop: 8 },
  inviteCard:    { borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1 },
  codeRow:       { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  codeBadge:     { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1.5 },
  codeText:      { fontSize: 16, fontWeight: '800', letterSpacing: 1.5, fontFamily: 'monospace' },
  roleTag:       { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  roleTagText:   { fontSize: 12, fontWeight: '700' },
  inviteMeta:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  inviteMetaText:{ fontSize: 12 },
  inviteBy:      { fontSize: 12 },
  inviteActions: { flexDirection: 'row', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10 },
  inviteAction:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 6, borderRadius: 6 },
  inviteActionText: { fontSize: 12, fontWeight: '600' },
  loadingWrap:   { padding: 24, alignItems: 'center' },
  emptyWrap:     { padding: 24, alignItems: 'center', gap: 8 },
  emptyText:     { fontSize: 14, fontWeight: '700' },
  emptySubText:  { fontSize: 12, textAlign: 'center' },
});

export default InviteManagerSheet;
