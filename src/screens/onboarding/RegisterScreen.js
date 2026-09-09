import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';
import ProvisionService from '../../services/provision/provisionService';

// ✅ Field defined OUTSIDE RegisterScreen — never remounts on parent re-render
const Field = ({ label, field, placeholder, keyboardType, secure, icon, value, onChange, error, colors, locked }) => {
  const [showPass, setShowPass] = useState(false);
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={[s.inputWrap, {
        borderColor: error ? colors.error : locked ? colors.success + '60' : colors.border,
        backgroundColor: locked ? colors.success + '08' : colors.surface,
      }]}>
        <Icon name={icon} size={16} color={locked ? colors.success : colors.textLight} style={{ marginLeft: 12 }} />
        <TextInput
          style={[s.input, { color: colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType || 'default'}
          secureTextEntry={secure && !showPass}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
          editable={!locked}
        />
        {locked && <Icon name="checkmark-circle" size={16} color={colors.success} style={{ marginRight: 12 }} />}
        {secure && (
          <TouchableOpacity onPress={() => setShowPass(p => !p)} style={{ paddingRight: 12 }}>
            <Icon name={showPass ? 'eye-off-outline' : 'eye-outline'} size={16} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={[s.errText, { color: colors.error }]}>{error}</Text>}
    </View>
  );
};

// ✅ SlugField defined OUTSIDE too
const SlugField = ({ value, onChange, slugStatus, error, colors }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={[s.label, { color: colors.textSecondary }]}>Workspace URL</Text>
    <View style={[s.inputWrap, {
      borderColor: slugStatus === 'available' ? colors.success
        : slugStatus === 'taken' ? colors.error
        : colors.border,
      backgroundColor: colors.surface,
    }]}>
      <Text style={[s.slugPrefix, { color: colors.textLight }]}>ss.co.in/</Text>
      <TextInput
        style={[s.input, { color: colors.text }]}
        value={value}
        onChangeText={onChange}
        placeholder="yourcompany"
        placeholderTextColor={colors.textLight}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {slugStatus === 'checking'  && <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 12 }} />}
      {slugStatus === 'available' && <Icon name="checkmark-circle" size={18} color={colors.success} style={{ marginRight: 12 }} />}
      {slugStatus === 'taken'     && <Icon name="close-circle"     size={18} color={colors.error}   style={{ marginRight: 12 }} />}
    </View>
    {slugStatus === 'available' && (
      <Text style={[s.slugHint, { color: colors.success }]}>
        ✓ {value}.simplesoft.co.in is available
      </Text>
    )}
    {!!error && <Text style={[s.errText, { color: colors.error }]}>{error}</Text>}
  </View>
);

const RegisterScreen = ({ route, navigation }) => {
  const { googleData } = route.params;
  const { colors } = useTheme();

  // Pre-fill from Google Sign-In if available
  const [ownerName,  setOwnerName]  = useState(googleData?.name  || '');
  const [email,      setEmail]      = useState(googleData?.email || '');
  const [phone,      setPhone]      = useState('');
  const [password,   setPassword]   = useState('');
  const [company,    setCompany]    = useState('');
  const [slug,       setSlug]       = useState('');
  const [slugStatus, setSlugStatus] = useState(null);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const slugTimer = useRef(null);

  const clearError = (k) => setErrors(p => ({ ...p, [k]: null }));

  const checkSlug = (val) => {
    if (!val || val.length < 3) return;
    clearTimeout(slugTimer.current);
    setSlugStatus('checking');
    slugTimer.current = setTimeout(async () => {
      try {
        const res = await ProvisionService.checkSlug(val);
        setSlugStatus(res.available ? 'available' : 'taken');
        if (!res.available) setErrors(p => ({ ...p, slug: res.message }));
        else clearError('slug');
      } catch (e) {
        setSlugStatus(null);
      }
    }, 400);
  };

  const handleCompanyChange = (v) => {
    setCompany(v);
    clearError('company');
    const auto = v.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 20);
    if (auto.length >= 3) {
      setSlug(auto);
      checkSlug(auto);
    }
  };

  const handleSlugChange = (v) => {
    const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSlug(clean);
    clearError('slug');
    checkSlug(clean);
  };

  const validate = () => {
    const e = {};
    if (!ownerName.trim())  e.owner_name = 'Required';
    if (!email.trim())      e.email      = 'Required';
    if (password.length < 8) e.password  = 'Min 8 characters';
    if (!company.trim())    e.company    = 'Required';
    if (!slug.trim())       e.slug       = 'Required';
    if (slugStatus === 'taken')    e.slug = 'Already taken';
    if (slugStatus === 'checking') e.slug = 'Still checking...';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        account_type: 'company',
        owner_name:   ownerName.trim(),
        email:        email.trim(),
        phone:        phone.trim(),
        password,
        company:      company.trim(),
        slug:         slug.trim(),
        modules:      [],
      };

      // Create workspace directly (skip module picker)
      const res = await ProvisionService.provision(payload);
      const jobId = res.job_id || `sync-${res.workspace_id || res.slug}`;

      // Navigate to workspace loading screen
      navigation.navigate('WorkspaceLoading', {
        jobId:   jobId,
        slug:    res.slug,
        payload: payload,
        isSyncCreation: !res.job_id,
      });
    } catch (e) {
      Alert.alert('Error', friendlyError(e, 'Workspace creation failed. Please try again.'));
    } finally { setSubmitting(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[s.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled">

        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[s.title, { color: colors.text }]}>
            Create your workspace
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <Field label="Your name" field="owner_name" placeholder="Rahul Sharma"
          icon="person-outline" value={ownerName}
          onChange={v => { if (!googleData?.name) { setOwnerName(v); clearError('owner_name'); } }}
          error={errors.owner_name} colors={colors}
          locked={!!googleData?.name} />

        <Field label="Email" field="email" placeholder="you@example.com"
          icon="mail-outline" keyboardType="email-address" value={email}
          onChange={v => { if (!googleData?.email) { setEmail(v); clearError('email'); } }}
          error={errors.email} colors={colors}
          locked={!!googleData?.email} />

        <Field label="Phone" field="phone" placeholder="+91 98765 43210"
          icon="call-outline" keyboardType="phone-pad" value={phone}
          onChange={setPhone} colors={colors} />

        <Field label="Password" field="password" placeholder="Min 8 characters"
          icon="lock-closed-outline" secure value={password}
          onChange={v => { setPassword(v); clearError('password'); }}
          error={errors.password} colors={colors} />

        <View style={[s.divider, { backgroundColor: colors.divider }]} />
        <Text style={[s.sectionTitle, { color: colors.text }]}>Company details</Text>

        <Field label="Company name" field="company" placeholder="Acme Pvt Ltd"
          icon="business-outline" value={company}
          onChange={handleCompanyChange}
          error={errors.company} colors={colors} />

        <SlugField
          value={slug}
          onChange={handleSlugChange}
          slugStatus={slugStatus}
          error={errors.slug}
          colors={colors}
        />

        <TouchableOpacity
          style={[s.submitBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.6 }]}
          onPress={handleSubmit} disabled={submitting}>
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.submitText}>Create workspace →</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const S = StyleSheet;
const s = S.create({
  container:    { flex: 1 },
  headerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  title:        { fontSize: 18, fontWeight: '700' },
  label:        { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  inputWrap:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12 },
  input:        { flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15 },
  errText:      { fontSize: 12, marginTop: 4 },
  slugPrefix:   { paddingLeft: 12, fontSize: 13, fontWeight: '500' },
  slugHint:     { fontSize: 12, marginTop: 4 },
  divider:      { height: 1, marginVertical: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  submitBtn:    { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  slugPreview:  { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
  slugPreviewText: { fontSize: 12, fontWeight: '500', flex: 1 },
  submitText:   { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default RegisterScreen;
