import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch } from 'react-redux';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { useTheme } from '../../theme/ThemeContext';
import { friendlyError } from '../../utils/errorUtils';
import { setWorkspace } from '../../store/slices/workspaceSlice';
import ProvisionService from '../../services/provision/provisionService';

const OnboardingScreen = ({ navigation }) => {
  const { colors }   = useTheme();
  const dispatch     = useDispatch();
  const [loading, setLoading] = useState(false);

  // ── Google Sign-In ────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      // Force account picker by signing out first
      try { await GoogleSignin.signOut(); } catch {}
      const userInfo = await GoogleSignin.signIn();
      const idToken  = userInfo.data?.idToken || userInfo.idToken;
      const email    = userInfo.data?.user?.email || userInfo.user?.email;
      const name     = userInfo.data?.user?.name  || userInfo.user?.name;

      // Check if workspace exists by email domain
      try {
        const found = await ProvisionService.findWorkspace(email);
        if (found.found) {
          // Existing workspace — save and go to login
          dispatch(setWorkspace({
            slug:          found.slug,
            workspace_url: found.workspace_url,
            company:       found.company,
            modules:       [],
          }));
          navigation.navigate('Login', { googleIdToken: idToken, email });
        } else {
          // New workspace — go to register with Google data pre-filled
          navigation.navigate('Register', { type: 'company', googleData: { idToken, email, name } });
        }
      } catch {
        navigation.navigate('Register', { type: 'company', googleData: { idToken, email, name } });
      }
    } catch (e) {
      if (e.code !== statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert('Google Sign-In failed', friendlyError(e, 'Sign-in failed. Please try again.'));
      }
    } finally { setLoading(false); }
  };

  return (
    <SafeAreaView style={[s.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="dark-content" />

      {/* Logo */}
      <View style={s.header}>
        <View style={[s.logoWrap, { backgroundColor: colors.primary + '18' }]}>
          <Icon name="layers" size={36} color={colors.primary} />
        </View>
        <Text style={[s.brand, { color: colors.text }]}>SimpleSoft</Text>
        <Text style={[s.brandSub, { color: colors.primary }]}>Workspace</Text>
        <Text style={[s.tagline, { color: colors.textSecondary }]}>
          Your business, organised.
        </Text>
      </View>

      <View style={s.cards}>
        {/* Workspace */}
        <View style={[s.card, { backgroundColor: colors.primary }]}>
          <View style={s.cardTop}>
            <View style={[s.cardIcon, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
              <Icon name="layers" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.cardTitle, { color: '#fff' }]}>Create your workspace</Text>
              <Text style={[s.cardDesc, { color: 'rgba(255,255,255,0.75)' }]}>
                Start with free, add modules as you grow
              </Text>
            </View>
          </View>
          <View style={s.cardBtns}>
            <TouchableOpacity
              style={[s.googleBtn, { borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.15)' }]}
              onPress={() => handleGoogle('company')} disabled={loading}>
              <Text style={[s.googleG, { color: '#fff' }]}>G</Text>
              <Text style={[s.googleText, { color: '#fff' }]}>Continue with Google</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.emailBtn, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => navigation.navigate('Register', { type: 'company' })}
              disabled={loading}>
              <Icon name="mail-outline" size={16} color="#fff" />
              <Text style={s.emailText}>Use email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading && (
        <View style={[s.loadingOverlay, { backgroundColor: colors.background + 'CC' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Already have workspace */}
      <TouchableOpacity style={s.loginRow}
        onPress={() => navigation.navigate('EnterWorkspace')}>
        <Text style={[s.loginText, { color: colors.textSecondary }]}>
          Already have a workspace?{' '}
        </Text>
        <Text style={[s.loginLink, { color: colors.primary }]}>Sign in</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const S = StyleSheet;
const s = S.create({
  container:     { flex: 1 },
  header:        { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  logoWrap:      { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  brand:         { fontSize: 28, fontWeight: '800' },
  brandSub:      { fontSize: 16, fontWeight: '600', marginTop: -2, marginBottom: 6 },
  tagline:       { fontSize: 14, textAlign: 'center' },
  cards:         { padding: 16, gap: 12 },
  card:          { borderRadius: 18, padding: 18, borderWidth: 1 },
  cardFeatured:  { elevation: 6, shadowColor: '#2196F3', shadowOffset: { width:0, height:4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  cardTop:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardIcon:      { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle:     { fontSize: 15, fontWeight: '700' },
  cardDesc:      { fontSize: 12, marginTop: 2 },
  cardBtns:      { flexDirection: 'row', gap: 8 },
  googleBtn:     { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 10 },
  googleG:       { fontSize: 16, fontWeight: '800', color: '#4285F4' },
  googleText:    { fontSize: 13, fontWeight: '600' },
  emailBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 10 },
  emailText:     { fontSize: 13, fontWeight: '600', color: '#fff' },
  loginRow:      { flexDirection: 'row', justifyContent: 'center', padding: 24 },
  loginText:     { fontSize: 14 },
  loginLink:     { fontSize: 14, fontWeight: '700' },
  loadingOverlay:{ ...S.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
});

export default OnboardingScreen;
