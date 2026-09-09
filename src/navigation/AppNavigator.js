import React, { useEffect, useRef, useState } from 'react';
import { StatusBar, Platform, AppState, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector, useDispatch } from 'react-redux';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import biometricService from '../services/biometric/biometricService';
import { checkSession, clearSessionExpired } from '../store/slices/authSlice';
import { setCloudAi } from '../store/slices/workspaceSlice';
import { fetchUserPermissions } from '../store/slices/permissionsSlice';
import PlanService from '../services/provision/planService';
import SubscriptionExpiredScreen from '../screens/subscription/SubscriptionExpiredScreen';
import BillingPlanScreen from '../screens/subscription/BillingPlanScreen';
import CheckoutScreen from '../screens/subscription/CheckoutScreen';
import { useTheme } from '../theme/ThemeContext';
import OnboardingStack       from './OnboardingStack';
import LoginScreen           from '../screens/auth/LoginScreen';
import MainDrawerNavigator   from './MainDrawerNavigator';
import SearchScreen          from '../screens/search/SearchScreen';
import NotificationScreen    from '../screens/notifications/NotificationScreen';
import httpClient           from '../services/api/httpClient';
import notesService         from '../services/notes/notesService';
import NotificationManager from '../services/notifications/NotificationManager';

const Stack = createNativeStackNavigator();

// ── Biometric lock screen ──────────────────────────────────────────────────────

function BiometricLockScreen({ onUnlock, colors }) {
  const [checking, setChecking] = useState(false);

  const prompt = async () => {
    setChecking(true);
    const ok = await biometricService.simplePrompt('Authenticate to open SimpleSoft');
    setChecking(false);
    if (ok) onUnlock();
  };

  // Auto-prompt on mount
  useEffect(() => { prompt(); }, []);

  return (
    <View style={[bs.root, { backgroundColor: colors?.background || '#F5F5FF' }]}>
      <Icon name="lock-closed" size={56} color={colors?.primary || '#7C3AED'} />
      <Text style={[bs.title, { color: colors?.text || '#1A1A2E' }]}>App Locked</Text>
      <Text style={[bs.sub, { color: colors?.textSecondary || '#4B4B6B' }]}>
        Authenticate to continue
      </Text>
      <TouchableOpacity
        style={[bs.btn, { backgroundColor: colors?.primary || '#7C3AED', opacity: checking ? 0.6 : 1 }]}
        onPress={prompt}
        disabled={checking}>
        <Icon name="finger-print-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={bs.btnText}>
          {biometricService.getBiometricTypeName() || 'Authenticate'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const bs = StyleSheet.create({
  root:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
  title:   { fontSize: 22, fontWeight: '800' },
  sub:     { fontSize: 14, marginTop: -4 },
  btn:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 28,
             paddingVertical: 14, borderRadius: 16, marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

// ── Biometric gate hook ────────────────────────────────────────────────────────

const useBiometricGate = (isAuthenticated) => {
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) { wasAuthenticated.current = false; return; }
    // Lock on first auth if biometric is enabled
    if (!wasAuthenticated.current && biometricService.isBiometricEnabled()) {
      setLocked(true);
    }
    wasAuthenticated.current = true;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const sub = AppState.addEventListener('change', nextState => {
      // Re-lock when returning to foreground if biometric is enabled
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (biometricService.isBiometricEnabled()) setLocked(true);
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [isAuthenticated]);

  return { locked, unlock: () => setLocked(false) };
};

// Initialize push notifications after user authenticates
const usePushNotifications = (isAuthenticated, userId, userEmail) => {
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    NotificationManager.initialize(userId, userEmail);
    return () => NotificationManager.cleanup();
  }, [isAuthenticated, userId, userEmail]);
};

// Consume any pending deep-link stored by NotificationManager when app was tapped
const usePendingNotificationNav = (isAuthenticated, navigation) => {
  const appState = useRef(AppState.currentState);

  const consume = async () => {
    try {
      const raw = await AsyncStorage.getItem('pending_notification');
      if (!raw) return;
      await AsyncStorage.removeItem('pending_notification');
      const data = JSON.parse(raw);
      NotificationManager.navigateFromNotification(navigation, data);
    } catch {}
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    // Consume on mount (cold-start tap or background→foreground tap)
    const t = setTimeout(consume, 800);

    // Also consume whenever app comes back to foreground
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        consume();
      }
      appState.current = nextState;
    });

    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [isAuthenticated]);
};

const AppNavigator = () => {
  const dispatch        = useDispatch();
  const isAuthenticated = useSelector(s => s.auth.isAuthenticated);
  const hasWorkspace    = useSelector(s => s.workspace?.configured || false);
  const workspace       = useSelector(s => s.workspace);
  const sessionExpired  = useSelector(s => s.auth.sessionExpired);
  const user            = useSelector(s => s.auth.user);
  const { colors, isDark } = useTheme();
  const navigation      = useNavigation();

  useEffect(() => { dispatch(checkSession()); }, []);

  // Wire up deep-link navigation from push notification taps
  usePendingNotificationNav(isAuthenticated, navigation);

  // Initialize push notifications after user authenticates
  usePushNotifications(isAuthenticated, user?.uid || user?.id, user?.username || user?.email);

  const { locked, unlock } = useBiometricGate(isAuthenticated);

  // Show a message when the session expires automatically (not on manual logout)
  useEffect(() => {
    if (!sessionExpired) return;
    Alert.alert(
      'Session Expired',
      'Your session has expired. Please log in again.',
      [{ text: 'OK', onPress: () => dispatch(clearSessionExpired()) }]
    );
  }, [sessionExpired]);

  // Fetch user permissions as soon as the user is authenticated so module
  // access gates in the drawer are ready before any screen renders.
  useEffect(() => {
    if (!isAuthenticated || !user?.uid) return;
    dispatch(fetchUserPermissions(user.uid));
  }, [isAuthenticated, user?.uid]);

  // Fetch Cloud AI config after login, or whenever workspace slug changes.
  useEffect(() => {
    if (!isAuthenticated || !workspace.slug) return;
    notesService.clearCache();
    (async () => {
      try {
        const aiRes = await httpClient.get('/api/ai/config').catch(() => null);
        if (aiRes?.data?.status === 'success') {
          const d = aiRes.data;
          dispatch(setCloudAi({
            enabled:  d.enabled,
            provider: d.provider || null,
            model:    d.model    || null,
            isAdmin:  d.is_admin,
            hasKey:   d.has_key ?? false,
          }));
        }
      } catch (e) {
      }
    })();
  }, [isAuthenticated, workspace.slug]);

  // Fetch subscription plan whenever user logs in (or workspace changes)
  useEffect(() => {
    if (!isAuthenticated || !workspace.slug) return;
    PlanService.fetchPlan(workspace.slug).catch(() => {});
  }, [isAuthenticated, workspace.slug]);

  useEffect(() => {
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor(colors.background, true);
      StatusBar.setBarStyle(isDark ? 'light-content' : 'dark-content', true);
    }
  }, [isDark, colors.background]);

  if (isAuthenticated && locked) {
    return <BiometricLockScreen onUnlock={unlock} colors={colors} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {!hasWorkspace ? (
        <Stack.Screen name="Onboarding" component={OnboardingStack} />
      ) : isAuthenticated ? (
        <>
          <Stack.Screen name="Main"   component={MainDrawerNavigator} />
          <Stack.Screen name="Search" component={SearchScreen}
            options={{
              headerShown:      true,
              title:            'Search',
              headerStyle:      { backgroundColor: colors.surface },
              headerTitleStyle: { color: colors.text },
              headerTintColor:  colors.primary,
              animation:        'slide_from_bottom',
            }} />
          <Stack.Screen name="Notifications" component={NotificationScreen}
            options={{
              headerShown:      true,
              title:            'Notifications',
              headerStyle:      { backgroundColor: colors.surface },
              headerTitleStyle: { color: colors.text },
              headerTintColor:  colors.primary,
              animation:        'slide_from_right',
            }} />
          {/* Subscription & Billing screens as modal overlays */}
          <Stack.Group screenOptions={{ presentation: 'modal', animationEnabled: true }}>
            <Stack.Screen
              name="SubscriptionExpired"
              component={SubscriptionExpiredScreen}
              options={{
                headerShown:      true,
                title:            'Manage Modules',
                headerStyle:      { backgroundColor: colors.surface },
                headerTitleStyle: { color: colors.text },
                headerTintColor:  colors.primary,
              }}
            />
            <Stack.Screen
              name="BillingPlan"
              component={BillingPlanScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Checkout"
              component={CheckoutScreen}
              options={{
                headerShown: true,
                title: 'Checkout',
                headerStyle: { backgroundColor: colors.surface },
                headerTitleStyle: { color: colors.text },
                headerTintColor: colors.primary,
                animation: 'slide_from_bottom',
              }}
            />
          </Stack.Group>
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
