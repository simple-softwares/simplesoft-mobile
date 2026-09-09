import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView,
  Platform, ScrollView, Animated, Easing,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { useTheme } from '../../theme/ThemeContext';
import { setWorkspace } from '../../store/slices/workspaceSlice';
import SessionService from '../../services/auth/sessionService';
import { loginSuccess } from '../../store/slices/authSlice';
import { login as restLogin } from '../../services/api/auth';
import { extractSlug, verifyWorkspace } from '../../services/auth/workspaceResolver';
import { workspaceWebUrl } from '../../config';

// ── Dev quick-logins ───────────────────────────────────────────────────────────

const DEV_MODE = true;

const DUMMY_LOGINS = [
  { label: 'SimpleSoft Founder', email: 'founder@simplesoft.co.in', password: 'Simple@123', workspace: 'simple_soft' },
  { label: 'Operations Manager', email: 'meera@simplesoft.co.in',   password: 'Simple@123', workspace: 'simple_soft' },
  { label: 'Accounts',           email: 'neha@simplesoft.co.in',    password: 'Simple@123', workspace: 'simple_soft' },
  { label: 'Sales',              email: 'kabir@simplesoft.co.in',   password: 'Simple@123', workspace: 'simple_soft' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const STEP_EMAIL    = 'email';
const STEP_PASSWORD = 'password';

// ── Screen ─────────────────────────────────────────────────────────────────────

const LoginScreen = () => {
  const dispatch    = useDispatch();
  const { colors }  = useTheme();

  const [step,            setStep]           = useState(STEP_EMAIL);
  const [email,           setEmail]          = useState('');
  const [password,        setPassword]       = useState('');
  const [showPass,        setShowPass]       = useState(false);
  const [loading,         setLoading]        = useState(false);
  const [detecting,       setDetecting]      = useState(false);
  const [error,           setError]          = useState('');

  // Detected workspace state
  const [detectedSlug,    setDetectedSlug]   = useState('');   // auto-derived
  const [workspaceName,   setWorkspaceName]  = useState('');   // display name from server
  const [workspaceFound,  setWorkspaceFound] = useState(null); // true/false/null(unknown)
  const [manualMode,      setManualMode]     = useState(false); // user is typing slug manually
  const [manualSlug,      setManualSlug]     = useState('');

  const activeSlug = manualMode ? manualSlug : detectedSlug;

  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateIn = () => {
    slideAnim.setValue(30);
    Animated.timing(slideAnim, {
      toValue: 0, duration: 280,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  const goToStep = (s) => { setStep(s); setError(''); animateIn(); };

  // ── Email step → detect workspace ───────────────────────────────────────────

  const handleEmailNext = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Enter a valid email address');
      return;
    }

    const slug = extractSlug(trimmed);

    if (!slug && !manualMode) {
      // Domain didn't match workspace pattern — ask user to enter slug manually
      setManualMode(true);
      setManualSlug('');
      setError('');
      return;
    }

    const resolvedSlug = manualMode ? manualSlug.trim().toLowerCase() : slug;

    if (!resolvedSlug) {
      setError('Enter your workspace name');
      return;
    }

    setDetectedSlug(resolvedSlug);
    setDetecting(true);
    setError('');

    // Verify workspace exists on the server (non-blocking — degrade gracefully)
    const info = await verifyWorkspace(resolvedSlug);
    setDetecting(false);

    if (info !== null) {
      setWorkspaceFound(info.found);
      setWorkspaceName(info.found ? info.name : '');
      if (!info.found) {
        setError(`Workspace "${resolvedSlug}" not found. Check the name or your email.`);
        return;
      }
    } else {
      // Network error — proceed without confirmation
      setWorkspaceFound(null);
      setWorkspaceName(resolvedSlug);
    }

    goToStep(STEP_PASSWORD);
  }, [email, manualMode, manualSlug]);

  // ── Password step → login ────────────────────────────────────────────────────

  const handleLogin = useCallback(async () => {
    if (!password.trim()) { setError('Enter your password'); return; }
    const slug = activeSlug;
    if (!slug) { setError('Workspace could not be determined'); return; }

    setLoading(true); setError('');
    try {
      const result = await restLogin(email.trim().toLowerCase(), password, slug);
      if (result.success && result.user) {
        const user = result.user;
        SessionService.saveSession(user);
        dispatch(setWorkspace({
          slug:          user.db,
          workspace_url: workspaceWebUrl(user.db),
          company:       workspaceName || user.db,
          modules:       [],
        }));
        dispatch(loginSuccess(user));
      } else {
        setError(result.message || 'Incorrect email or password');
      }
    } catch {
      setError('Connection failed. Check your internet and try again.');
    } finally {
      setLoading(false);
    }
  }, [email, password, activeSlug, workspaceName, dispatch]);

  // ── Dev quick-login ──────────────────────────────────────────────────────────

  const handleDummyLogin = async (cred) => {
    setLoading(true); setError('');
    try {
      const result = await restLogin(cred.email, cred.password, cred.workspace);
      if (result.success && result.user) {
        const user = result.user;
        SessionService.saveSession(user);
        dispatch(setWorkspace({ slug: user.db, workspace_url: workspaceWebUrl(user.db), company: user.db, modules: [] }));
        dispatch(loginSuccess(user));
      } else {
        setError(result.message || 'Login failed');
      }
    } catch {
      setError('Connection error');
    } finally { setLoading(false); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const workspaceBadgeLabel = workspaceName || activeSlug;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={[s.container, { backgroundColor: colors.background }]}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <View style={s.logoRow}>
          <View style={[s.logoWrap, { backgroundColor: colors.primary + '18' }]}>
            <Icon name="layers" size={32} color={colors.primary} />
          </View>
          <View>
            <Text style={[s.brand, { color: colors.text }]}>SimpleSoft</Text>
            <Text style={[s.brandSub, { color: colors.primary }]}>Workspace</Text>
          </View>
        </View>

        {/* Workspace badge — shown on password step */}
        {step === STEP_PASSWORD && !!workspaceBadgeLabel && (
          <View style={[s.badge, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
            <Icon name="business-outline" size={14} color={colors.primary} />
            <Text style={[s.badgeText, { color: colors.primary }]}>{workspaceBadgeLabel}</Text>
            {workspaceFound === true && <Icon name="checkmark-circle" size={14} color="#4CAF50" />}
          </View>
        )}

        <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

          {/* ── STEP: EMAIL ── */}
          {step === STEP_EMAIL && (
            <View>
              <Text style={[s.title, { color: colors.text }]}>Welcome back</Text>
              <Text style={[s.sub, { color: colors.textSecondary }]}>
                Enter your work email to sign in
              </Text>

              {/* Email input */}
              <View style={[s.inputWrap, { borderColor: error ? colors.error : colors.border, backgroundColor: colors.surface }]}>
                <Icon name="mail-outline" size={18} color={colors.textLight} style={{ marginLeft: 14 }} />
                <TextInput
                  style={[s.input, { color: colors.text }]}
                  value={email}
                  onChangeText={v => { setEmail(v); setError(''); setManualMode(false); setManualSlug(''); setDetectedSlug(''); }}
                  placeholder="you@company.in"
                  placeholderTextColor={colors.textLight}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoFocus
                  returnKeyType={manualMode ? 'next' : 'done'}
                  onSubmitEditing={manualMode ? undefined : handleEmailNext}
                />
              </View>

              {/* Manual workspace input (shown when email domain is unknown) */}
              {manualMode && (
                <View style={{ marginTop: 4 }}>
                  <Text style={[s.manualHint, { color: colors.textSecondary }]}>
                    Could not detect workspace from your email. Enter it below:
                  </Text>
                  <View style={[s.inputWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                    <Icon name="business-outline" size={18} color={colors.textLight} style={{ marginLeft: 14 }} />
                    <TextInput
                      style={[s.input, { color: colors.text }]}
                      value={manualSlug}
                      onChangeText={v => { setManualSlug(v.toLowerCase().replace(/\s/g, '')); setError(''); }}
                      placeholder="yourcompany"
                      placeholderTextColor={colors.textLight}
                      autoCapitalize="none" autoCorrect={false} autoFocus
                      returnKeyType="done" onSubmitEditing={handleEmailNext}
                    />
                  </View>
                </View>
              )}

              {/* Hint about email format */}
              {!manualMode && !error && (
                <Text style={[s.formatHint, { color: colors.textLight }]}>
                  Your work email looks like: firstname@company.in
                </Text>
              )}
            </View>
          )}

          {/* ── STEP: PASSWORD ── */}
          {step === STEP_PASSWORD && (
            <View>
              <Text style={[s.title, { color: colors.text }]}>Enter password</Text>
              <Text style={[s.sub, { color: colors.textSecondary }]}>
                Signing in as{' '}
                <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text>
              </Text>
              <View style={[s.inputWrap, { borderColor: error ? colors.error : colors.border, backgroundColor: colors.surface }]}>
                <Icon name="lock-closed-outline" size={18} color={colors.textLight} style={{ marginLeft: 14 }} />
                <TextInput
                  style={[s.input, { color: colors.text }]}
                  value={password}
                  onChangeText={v => { setPassword(v); setError(''); }}
                  placeholder="Your password"
                  placeholderTextColor={colors.textLight}
                  secureTextEntry={!showPass} autoFocus
                  returnKeyType="go" onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPass(p => !p)} style={{ paddingRight: 14 }}>
                  <Icon name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Error message */}
          {!!error && (
            <View style={s.errorRow}>
              <Icon name="alert-circle-outline" size={15} color={colors.error} />
              <Text style={[s.errorText, { color: colors.error }]}>{error}</Text>
            </View>
          )}

          {/* Primary button */}
          <TouchableOpacity
            style={[s.btn, { backgroundColor: colors.primary }, (loading || detecting) && { opacity: 0.6 }]}
            onPress={step === STEP_EMAIL ? handleEmailNext : handleLogin}
            disabled={loading || detecting}>
            {detecting ? (
              <><ActivityIndicator color="#fff" size="small" style={{ marginRight: 8 }} />
                <Text style={s.btnText}>Detecting workspace…</Text></>
            ) : loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.btnText}>{step === STEP_PASSWORD ? 'Sign in' : 'Continue →'}</Text>
            )}
          </TouchableOpacity>

          {/* Back button on password step */}
          {step === STEP_PASSWORD && (
            <TouchableOpacity style={s.backBtn} onPress={() => { goToStep(STEP_EMAIL); setPassword(''); }}>
              <Icon name="arrow-back-outline" size={16} color={colors.textSecondary} />
              <Text style={[s.backText, { color: colors.textSecondary }]}>Back</Text>
            </TouchableOpacity>
          )}

          {/* "Enter workspace manually" link on email step (before manualMode) */}
          {step === STEP_EMAIL && !manualMode && (
            <TouchableOpacity style={s.backBtn} onPress={() => { setManualMode(true); setError(''); }}>
              <Text style={[s.backText, { color: colors.textSecondary }]}>
                Enter workspace name manually
              </Text>
            </TouchableOpacity>
          )}

          {/* Dev quick-logins */}
          {DEV_MODE && step === STEP_EMAIL && (
            <View style={{ marginTop: 32 }}>
              <Text style={[s.devLabel, { color: colors.textLight }]}>Quick Test Logins</Text>
              {DUMMY_LOGINS.map((cred, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[s.dummyBtn, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '08' }]}
                  onPress={() => handleDummyLogin(cred)}
                  disabled={loading}>
                  <Text style={[s.dummyLabel, { color: colors.primary }]}>{cred.label}</Text>
                  <Text style={[s.dummyEmail,  { color: colors.textSecondary }]}>{cred.email}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const s = StyleSheet.create({
  container:   { flex: 1 },
  content:     { padding: 28, paddingTop: 60, paddingBottom: 40 },
  logoRow:     { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 48 },
  logoWrap:    { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  brand:       { fontSize: 20, fontWeight: '800' },
  brandSub:    { fontSize: 14, fontWeight: '600' },
  badge:       { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, marginBottom: 20 },
  badgeText:   { fontSize: 13, fontWeight: '600' },
  title:       { fontSize: 26, fontWeight: '800', marginBottom: 8 },
  sub:         { fontSize: 15, marginBottom: 24, lineHeight: 22 },
  inputWrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 14, marginBottom: 8, height: 54 },
  input:       { flex: 1, paddingHorizontal: 10, fontSize: 16, height: '100%' },
  formatHint:  { fontSize: 12, marginBottom: 8, marginLeft: 2 },
  manualHint:  { fontSize: 13, marginBottom: 8, marginLeft: 2 },
  errorRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  errorText:   { fontSize: 13, flex: 1 },
  btn:         { borderRadius: 14, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 8, flexDirection: 'row' },
  btnText:     { color: '#fff', fontWeight: '700', fontSize: 16 },
  backBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16 },
  backText:    { fontSize: 14 },
  devLabel:    { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  dummyBtn:    { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8 },
  dummyLabel:  { fontSize: 13, fontWeight: '600', marginBottom: 3 },
  dummyEmail:  { fontSize: 11 },
});

export default LoginScreen;
