import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal,
  KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';
import { logout, loginSuccess } from '../../store/slices/authSlice';
import { setWorkspace } from '../../store/slices/workspaceSlice';
import ProfileService from '../../services/profile/profileService';
import ProvisionService from '../../services/provision/provisionService';
import PricingService from '../../services/billing/pricingService';
import TeamService from '../../services/team/teamService';


// ── Editable avatar ───────────────────────────────────────────
const EditableAvatar = ({ uid, name, onPress, loading }) => {
  const { colors } = useTheme();
  const [imgErr, setImgErr] = useState(false);
  const color    = TeamService.getColor(uid);
  const initials = (name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <TouchableOpacity style={avS.wrap} onPress={onPress} activeOpacity={0.85}>
      {!imgErr
        ? <Image source={{ uri: ProfileService.avatarUrl(uid) }} style={avS.img} onError={() => setImgErr(true)} />
        : <View style={[avS.img, { backgroundColor: color, alignItems: 'center', justifyContent: 'center' }]}>
            <Text style={avS.initials}>{initials}</Text>
          </View>}
      <View style={[avS.overlay, { backgroundColor: colors.primary }]}>
        {loading ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="camera" size={14} color="#fff" />}
      </View>
    </TouchableOpacity>
  );
};
const avS = StyleSheet.create({
  wrap:     { position: 'relative', marginBottom: 12 },
  img:      { width: 88, height: 88, borderRadius: 44 },
  initials: { fontSize: 30, fontWeight: '800', color: '#fff' },
  overlay:  { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
});

// ── Info row ──────────────────────────────────────────────────
const InfoRow = ({ icon, label, value, onPress, accent, last }) => {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[rS.row, { borderBottomColor: colors.divider }, last && { borderBottomWidth: 0 }]}
      onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={[rS.iconWrap, { backgroundColor: (accent || colors.primary) + '18' }]}>
        <Icon name={icon} size={16} color={accent || colors.primary} />
      </View>
      <View style={rS.content}>
        <Text style={[rS.label, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[rS.value, { color: colors.text }]} numberOfLines={1}>{value || '—'}</Text>
      </View>
      {onPress && <Icon name="chevron-forward" size={15} color={colors.textLight} />}
    </TouchableOpacity>
  );
};
const rS = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: StyleSheet.hairlineWidth },
  iconWrap:{ width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content: { flex: 1 },
  label:   { fontSize: 11, fontWeight: '500' },
  value:   { fontSize: 14, marginTop: 1 },
});

// ── Edit modal ────────────────────────────────────────────────
const EditModal = ({ visible, title, value, onSave, onClose, placeholder, keyboardType }) => {
  const { colors } = useTheme();
  const [val, setVal]       = useState('');
  const [saving, setSaving] = useState(false);
  React.useEffect(() => { if (visible) setVal(value || ''); }, [visible]);
  const handleSave = async () => {
    setSaving(true);
    try { await onSave(val); onClose(); }
    catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setSaving(false); }
  };
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} pointerEvents="box-none" />
        <View style={[mS.sheet, { backgroundColor: colors.surface }]}>
          <View style={[mS.handle, { backgroundColor: colors.border }]} />
          <Text style={[mS.title, { color: colors.text }]}>{title}</Text>
          <View style={[mS.input, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput style={[mS.textInput, { color: colors.text }]}
              value={val} onChangeText={setVal} placeholder={placeholder}
              placeholderTextColor={colors.textLight} autoFocus
              keyboardType={keyboardType || 'default'} returnKeyType="done"
              onSubmitEditing={handleSave} />
          </View>
          <View style={mS.btns}>
            <TouchableOpacity style={[mS.cancel, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[mS.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[mS.save, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={mS.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// ── Change password modal ─────────────────────────────────────
const ChangePwdModal = ({ visible, onClose, isGoogleUser }) => {
  const { colors } = useTheme();
  const [curr, setCurr]     = useState('');
  const [next, setNext]     = useState('');
  const [conf, setConf]     = useState('');
  const [showC, setShowC]   = useState(false);
  const [showN, setShowN]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const reset = () => { setCurr(''); setNext(''); setConf(''); setErrors({}); };
  const validate = () => {
    const e = {};
    if (!isGoogleUser && !curr.trim()) e.curr = 'Required';
    if (next.length < 8)               e.next = 'Min 8 characters';
    if (next !== conf)                 e.conf = 'Passwords do not match';
    setErrors(e);
    return !Object.keys(e).length;
  };
  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await ProfileService.changePassword(isGoogleUser ? '' : curr, next);
      Alert.alert('✅ Done', 'Password updated.');
      reset(); onClose();
    } catch (e) { Alert.alert('Failed', friendlyError(e)); }
    finally { setSaving(false); }
  };
  const PF = ({ label, val, setVal, show, toggle, err }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>{label}</Text>
      <View style={[mS.input, { borderColor: err ? colors.error : colors.border, backgroundColor: colors.background, flexDirection: 'row', alignItems: 'center' }]}>
        <TextInput style={[mS.textInput, { color: colors.text, flex: 1 }]}
          value={val} onChangeText={setVal} secureTextEntry={!show} autoCapitalize="none" />
        <TouchableOpacity onPress={toggle} style={{ paddingRight: 12 }}>
          <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={17} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      {err && <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{err}</Text>}
    </View>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { reset(); onClose(); }}>
      <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill}
          onPress={() => { reset(); onClose(); }} activeOpacity={1} pointerEvents="box-none" />
        <View style={[mS.sheet, { backgroundColor: colors.surface }]}>
          <View style={[mS.handle, { backgroundColor: colors.border }]} />
          <Text style={[mS.title, { color: colors.text }]}>Change password</Text>
          {isGoogleUser && (
            <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#E8F0FE', borderRadius: 10, padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#4285F4' }}>G</Text>
              <Text style={{ flex: 1, fontSize: 12, color: '#1A73E8', lineHeight: 18 }}>Set a password to also log in with email.</Text>
            </View>
          )}
          {!isGoogleUser && <PF label="Current password" val={curr} setVal={setCurr} show={showC} toggle={() => setShowC(!showC)} err={errors.curr} />}
          <PF label="New password" val={next} setVal={setNext} show={showN} toggle={() => setShowN(!showN)} err={errors.next} />
          <View style={{ marginBottom: 14 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, textTransform: 'uppercase' }}>Confirm new password</Text>
            <View style={[mS.input, { borderColor: errors.conf ? colors.error : colors.border, backgroundColor: colors.background }]}>
              <TextInput style={[mS.textInput, { color: colors.text }]}
                value={conf} onChangeText={setConf} secureTextEntry autoCapitalize="none" onSubmitEditing={handleSave} />
            </View>
            {errors.conf && <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>{errors.conf}</Text>}
          </View>
          <View style={mS.btns}>
            <TouchableOpacity style={[mS.cancel, { borderColor: colors.border }]} onPress={() => { reset(); onClose(); }}>
              <Text style={[mS.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[mS.save, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
              onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={mS.saveText}>Update</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const mS = StyleSheet.create({
  sheet:     { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  handle:    { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title:     { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  input:     { borderWidth: 1, borderRadius: 10, marginBottom: 16 },
  textInput: { padding: 14, fontSize: 15 },
  btns:      { flexDirection: 'row', gap: 12 },
  cancel:    { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 10, borderWidth: 1 },
  cancelText:{ fontWeight: '600', fontSize: 14 },
  save:      { flex: 2, alignItems: 'center', paddingVertical: 14, borderRadius: 10 },
  saveText:  { color: '#fff', fontWeight: '700', fontSize: 14 },
});

// ── Modules card ──────────────────────────────────────────────
// ── Main screen ───────────────────────────────────────────────
const ProfileScreen = () => {
  const dispatch   = useDispatch();
  const authUser   = useSelector(s => s.auth.user);
  const { colors } = useTheme();
  const uid        = authUser?.uid || authUser?.id;

  const [profile,           setProfile]           = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [photoLoading,      setPhotoLoading]      = useState(false);
  const [editName,          setEditName]          = useState(false);
  const [editPhone,         setEditPhone]         = useState(false);
  const [editPwd,           setEditPwd]           = useState(false);

  const isGoogleUser = !!authUser?.via_google;

  useFocusEffect(useCallback(() => {
    let active = true;
    const fetchProfile = async () => {
      try {
        const p = await ProfileService.getProfile(uid);
        if (active) setProfile(p);
      } catch {}
      finally { if (active) setLoading(false); }
    };
    fetchProfile();
    return () => { active = false; };
  }, [uid]));

  const handlePhotoPress = () => {
    Alert.alert('Profile photo', 'Choose source', [
      { text: 'Camera',        onPress: () => pickPhoto('camera')  },
      { text: 'Photo library', onPress: () => pickPhoto('library') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const pickPhoto = async (source) => {
    const opts = { mediaType: 'photo', includeBase64: true, maxWidth: 512, maxHeight: 512, quality: 0.8 };
    try {
      const result = source === 'camera' ? await launchCamera(opts) : await launchImageLibrary(opts);
      if (result.didCancel || result.errorCode) return;
      const asset = result.assets?.[0];
      if (!asset?.base64) return;
      setPhotoLoading(true);
      await ProfileService.uploadPhoto(uid, asset.base64);
      const p = await ProfileService.getProfile(uid);
      setProfile(p);
    } catch (e) { Alert.alert('Error', friendlyError(e)); }
    finally { setPhotoLoading(false); }
  };

  const saveName = async (name) => {
    await ProfileService.updateProfile(uid, { name });
    dispatch(loginSuccess({ ...authUser, name }));
    const p = await ProfileService.getProfile(uid);
    setProfile(p);
  };

  const savePhone = async (phone) => {
    await ProfileService.updateProfile(uid, { phone });
    const p = await ProfileService.getProfile(uid);
    setProfile(p);
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  if (loading) return (
    <View style={[s.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  const displayName  = profile?.name   || authUser?.name  || 'User';
  const displayEmail = profile?.email  || profile?.login  || authUser?.email || '';
  const displayPhone = profile?.phone  || profile?.mobile || '';
  const company      = Array.isArray(profile?.company_id) ? profile.company_id[1] : '';

  return (
    <ScrollView
      style={[s.container, { backgroundColor: colors.background }]}
      contentContainerStyle={s.content}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <View style={[s.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <EditableAvatar uid={uid} name={displayName} onPress={handlePhotoPress} loading={photoLoading} />
        <Text style={[s.headerName, { color: colors.text }]}>{displayName}</Text>
        {!!company && <Text style={[s.headerSub, { color: colors.textSecondary }]}>{company}</Text>}
        {isGoogleUser && (
          <View style={s.googleBadge}>
            <Text style={s.googleG}>G</Text>
            <Text style={s.googleText}>Google account</Text>
          </View>
        )}
      </View>

      {/* Profile */}
      <View style={[s.card, { backgroundColor: colors.surface }]}>
        <Text style={[s.cardLabel, { color: colors.textLight }]}>Profile</Text>
        <InfoRow icon="person-outline" label="Name"  value={displayName}  onPress={() => setEditName(true)} />
        <InfoRow icon="call-outline"   label="Phone" value={displayPhone || 'Add phone number'} onPress={() => setEditPhone(true)} />
        <InfoRow icon="mail-outline"   label="Email" value={displayEmail} last />
      </View>

      {/* Security */}
      <View style={[s.card, { backgroundColor: colors.surface }]}>
        <Text style={[s.cardLabel, { color: colors.textLight }]}>Security</Text>
        <InfoRow icon="lock-closed-outline"
          label="Password"
          value={isGoogleUser ? 'Set a password' : 'Change password'}
          onPress={() => setEditPwd(true)}
          accent="#7C3AED" last />
      </View>

      {/* Sign out */}
      <TouchableOpacity
        style={[s.logoutBtn, { backgroundColor: colors.error + '10', borderColor: colors.error + '30' }]}
        onPress={handleLogout}>
        <Icon name="log-out-outline" size={18} color={colors.error} />
        <Text style={[s.logoutText, { color: colors.error }]}>Sign out</Text>
      </TouchableOpacity>

      <Text style={[s.brand, { color: colors.textLight }]}>SimpleSoft Workspace · v1.0.0</Text>

      {/* Modals */}
      <EditModal visible={editName} title="Edit name" value={displayName}
        placeholder="Your full name" onSave={saveName} onClose={() => setEditName(false)} />
      <EditModal visible={editPhone} title="Phone number" value={displayPhone}
        placeholder="+91 98765 43210" keyboardType="phone-pad"
        onSave={savePhone} onClose={() => setEditPhone(false)} />
      <ChangePwdModal visible={editPwd} onClose={() => setEditPwd(false)} isGoogleUser={isGoogleUser} />
    </ScrollView>
  );
};

const s = StyleSheet.create({
  container:     { flex: 1 },
  content:       { paddingBottom: 48 },
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header:        { alignItems: 'center', paddingVertical: 28, borderBottomWidth: StyleSheet.hairlineWidth, marginBottom: 12 },
  headerName:    { fontSize: 20, fontWeight: '800' },
  headerSub:     { fontSize: 13, marginTop: 3 },
  googleBadge:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8, backgroundColor: '#E8F0FE', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  googleG:       { fontSize: 12, fontWeight: '800', color: '#4285F4' },
  googleText:    { fontSize: 12, color: '#1A73E8', fontWeight: '500' },
  card:      { marginHorizontal: 12, marginBottom: 12, borderRadius: 14, overflow: 'hidden' },
  cardLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 2 },
  divider:   { height: StyleSheet.hairlineWidth, marginHorizontal: 16 },
  logoutBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  logoutText:    { fontSize: 14, fontWeight: '700' },
  brand:         { fontSize: 11, textAlign: 'center', marginTop: 16 },
});

export default ProfileScreen;
