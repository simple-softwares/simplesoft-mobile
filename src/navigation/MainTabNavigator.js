import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform, AppState,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSelector } from 'react-redux';
import { useTheme } from '../theme/ThemeContext';
import { MODULE_REGISTRY } from '../modules/registry';
import httpClient from '../services/api/httpClient';
import AIAssistantSheet from '../modules/ai/AIAssistantSheet';
import EmployeeHomeScreen from '../screens/dashboard/EmployeeHomeScreen';
import UpgradePrompt from '../components/UpgradePrompt';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import TasksStack      from './TasksStack';
import NotesStack      from './NotesStack';
import ProjectsScreen  from '../screens/projects/ProjectsScreen';
import ContactsStack   from './ContactsStack';
import SettingsScreen  from '../screens/workspace/SettingsScreen';
import StorageScreen   from '../screens/workspace/StorageScreen';

const Tab = createBottomTabNavigator();

const WORKSPACE_TABS = [
  { name: 'Dashboard', icon: 'home-outline',          iconActive: 'home',          label: 'Home',     moduleKey: null      }, // always visible
  { name: 'Tasks',     icon: 'checkbox-outline',      iconActive: 'checkbox',      label: 'Tasks',    moduleKey: 'tasks'   },
  { name: 'Projects',  icon: 'folder-outline',        iconActive: 'folder',        label: 'Projects', moduleKey: 'projects' },
  { name: 'Contacts',  icon: 'people-outline',        iconActive: 'people',        label: 'Contacts', moduleKey: 'contacts' },
  { name: 'Notes',     icon: 'document-text-outline', iconActive: 'document-text', label: 'Notes',    moduleKey: 'notes'   },
  { name: 'Settings',  icon: 'settings-outline',      iconActive: 'settings',      label: 'Settings', moduleKey: 'settings' },
];

// ── Custom tab bar ─────────────────────────────────────────────────────────
const CustomTabBar = ({ state, navigation }) => {
  const { colors } = useTheme();
  const plan = useSelector(s => s.plan);
  const activeRouteName  = state.routes[state.index]?.name;
  const [aiOpen, setAiOpen] = useState(false);
  const [upgradePrompt, setUpgradePrompt] = useState({
    visible: false,
    moduleKey: null,
    moduleName: null,
    requiredTier: null,
  });

  const enabledModules = useSelector(s => s.auth.enabledModules || []);
  const moduleAccess   = useSelector(s => s.permissions.currentPermissionSummary?.moduleAccess ?? null);
  const subscriptionModules = plan?.selected_modules || [];

  const user = useSelector(s => s.auth.user);
  const userRole = user?.role || 'employee';
  const isAdmin = userRole === 'admin' || user?.is_admin === true;

  // Gate: tier subscription AND legacy per-user restriction AND Odoo module permission
  // Admins bypass subscription/permission gates
  const canAccess = (moduleKey) => {
    if (!moduleKey) return true;
    if (moduleKey === 'settings') return true;
    if (moduleKey === 'admin') return isAdmin;
    if (isAdmin) return true; // admins see all modules
    if (!subscriptionModules.includes(moduleKey)) return false;
    if (enabledModules.length > 0 && !enabledModules.includes(moduleKey)) return false;
    if (moduleAccess && moduleAccess[moduleKey] === false) return false;
    return true;
  };

  const hasAIFeature = canAccess('ai');

  // Filter modules by subscription access
  const accessibleModules = MODULE_REGISTRY.filter(m => canAccess(m.key));

  // Are we inside a module sub-screen?
  const activeModule = accessibleModules.find(
    m => m.tabs.some(t => t.name === activeRouteName)
  );

  const bar = { backgroundColor: colors.surface, borderTopColor: colors.border };

  // ── Inside a module: show its sub-tabs + Back ──────────────────
  if (activeModule) {
    const accent = activeModule.color || colors.primary;
    return (
      <>
        <View style={[s.tabBar, bar]}>
          <TouchableOpacity style={s.tab} onPress={() => navigation.navigate('Dashboard')}>
            <Icon name="chevron-back" size={22} color={colors.textLight} />
            <Text style={[s.label, { color: colors.textLight }]}>Back</Text>
          </TouchableOpacity>

          {activeModule.tabs.map(tab => {
            const active = activeRouteName === tab.name;
            const color  = active ? accent : colors.textLight;
            return (
              <TouchableOpacity key={tab.name} style={s.tab} onPress={() => navigation.navigate(tab.name)}>
                <Icon name={active ? tab.iconActive : tab.icon} size={22} color={color} />
                <Text style={[s.label, { color, fontWeight: active ? '700' : '400' }]}>{tab.label}</Text>
                {active && <View style={[s.dot, { backgroundColor: accent }]} />}
              </TouchableOpacity>
            );
          })}

          {/* AI button — only if user has AI feature */}
          {hasAIFeature && (
            <TouchableOpacity style={s.tab} onPress={() => setAiOpen(true)}>
              <View style={[s.aiDot, { backgroundColor: '#7C3AED' }]}>
                <Icon name="sparkles" size={15} color="#fff" />
              </View>
              <Text style={[s.label, { color: '#7C3AED', fontWeight: '600' }]}>AI</Text>
            </TouchableOpacity>
          )}
        </View>
        <AIAssistantSheet visible={aiOpen} onClose={() => setAiOpen(false)} />
      </>
    );
  }

  // ── Default: workspace tabs + AI button (elevated center) + drawer ──
  const visibleTabs = WORKSPACE_TABS.filter(t => canAccess(t.moduleKey));
  const midPoint   = Math.ceil(visibleTabs.length / 2);
  const LEFT_TABS  = visibleTabs.slice(0, midPoint);
  const RIGHT_TABS = visibleTabs.slice(midPoint);

  return (
    <>
      <View style={[s.tabBar, bar, s.tabBarRelative]}>
        {LEFT_TABS.map(t => {
          const active = activeRouteName === t.name;
          const color  = active ? colors.primary : colors.textLight;
          return (
            <TouchableOpacity key={t.name} style={s.tab} onPress={() => navigation.navigate(t.name)}>
              <Icon name={active ? t.iconActive : t.icon} size={22} color={color} />
              <Text style={[s.label, { color, fontWeight: active ? '700' : '400' }]}>{t.label}</Text>
              {active && <View style={[s.dot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}

        {/* AI elevated center button — only if user has AI feature */}
        {hasAIFeature && (
          <View style={s.aiSlot}>
            <TouchableOpacity
              style={[s.aiBtn, { shadowColor: '#7C3AED' }]}
              onPress={() => setAiOpen(true)}
              activeOpacity={0.85}>
              <Icon name="sparkles" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={[s.label, { color: '#7C3AED', fontWeight: '700', marginTop: 32 }]}>AI</Text>
          </View>
        )}

        {RIGHT_TABS.map(t => {
          const active = activeRouteName === t.name;
          const color  = active ? colors.primary : colors.textLight;
          return (
            <TouchableOpacity key={t.name} style={s.tab} onPress={() => navigation.navigate(t.name)}>
              <Icon name={active ? t.iconActive : t.icon} size={22} color={color} />
              <Text style={[s.label, { color, fontWeight: active ? '700' : '400' }]}>{t.label}</Text>
              {active && <View style={[s.dot, { backgroundColor: colors.primary }]} />}
            </TouchableOpacity>
          );
        })}
      </View>
      <AIAssistantSheet visible={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
};

// ── Notification bell with unread badge ───────────────────────────────────
const NotificationBell = ({ navigation, colors }) => {
  const [unread, setUnread] = useState(0);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await httpClient.get('/notifications/unread-count');
      setUnread(res.data?.count || 0);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUnread();
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') fetchUnread();
    });
    return () => sub.remove();
  }, [fetchUnread]);

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Notifications')}
      style={{ paddingRight: 16, paddingVertical: 4 }}>
      <Icon name="notifications-outline" size={24} color={colors.text} />
      {unread > 0 && (
        <View style={bell.badge}>
          <Text style={bell.badgeText}>{unread > 99 ? '99+' : unread}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const bell = StyleSheet.create({
  badge:     { position: 'absolute', top: 0, right: 12, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700', lineHeight: 16 },
});

// ── Drawer menu button for screens that own their own header ───────────────
const DrawerMenuBtn = ({ navigation, colors }) => (
  <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ paddingLeft: 16 }}>
    <Icon name="menu-outline" size={24} color={colors.text} />
  </TouchableOpacity>
);

// ── Screen options ─────────────────────────────────────────────────────────
const makeScreenOptions = (colors) => ({ route, navigation }) => {
  const noHeaderScreens = ['Tasks', 'Notes', 'Contacts', 'Storage', 'Settings'];
  const isModuleScreen  = MODULE_REGISTRY.some(m => m.tabs.some(t => t.name === route.name));
  const showHeader      = !noHeaderScreens.includes(route.name) && !isModuleScreen;
  return {
    headerShown:      showHeader,
    headerStyle:      { backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
    headerTitleStyle: { fontSize: 18, fontWeight: '600', color: colors.text },
    headerTintColor:  colors.primary,
    headerLeft:       showHeader ? () => <DrawerMenuBtn navigation={navigation} colors={colors} /> : undefined,
    headerRight:      showHeader ? () => <NotificationBell navigation={navigation} colors={colors} /> : undefined,
  };
};

// ── Navigator ──────────────────────────────────────────────────────────────
const MainTabNavigator = () => {
  const { colors } = useTheme();
  const plan = useSelector(s => s.plan);
  const user = useSelector(s => s.auth.user);
  const currentTier  = plan?.tier || 'foundation';
  const role         = user?.role || 'employee';
  const deptId       = user?.department_id || null;
  const deptName     = user?.department || '';

  const enabledModules = useSelector(s => s.auth.enabledModules || []);
  const subscriptionModules = plan?.selected_modules || [];

  const isAdminUser = role === 'admin' || user?.is_admin === true;

  // Match DrawerContent filtering logic — admins bypass subscription gates
  const canAccessModule = (moduleKey) => {
    if (!moduleKey) return true;
    if (moduleKey === 'settings') return true;
    if (moduleKey === 'admin') return isAdminUser;
    if (isAdminUser) return true; // admins see all modules
    if (!subscriptionModules.includes(moduleKey)) return false;
    if (enabledModules.length > 0 && !enabledModules.includes(moduleKey)) return false;
    return true;
  };

  const moduleScreens = useMemo(() => {
    return MODULE_REGISTRY.flatMap(m => {
      // Use same filtering as DrawerContent to ensure consistency
      if (!canAccessModule(m.key)) return [];

      return m.tabs.map(tab => (
        <Tab.Screen
          key={tab.name}
          name={tab.name}
          component={tab.component}
          options={{ title: tab.label }}
        />
      ));
    });
  }, [subscriptionModules, enabledModules]);

  // Employees get a simplified home — no analytics dashboard
  const HomeScreen = role === 'employee' ? EmployeeHomeScreen : DashboardScreen;

  return (
    <Tab.Navigator
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={makeScreenOptions(colors)}>

      {/* Core screens */}
      <Tab.Screen name="Dashboard" component={HomeScreen}      options={{ title: 'Home' }} />
      <Tab.Screen name="Tasks"     component={TasksStack} />
      <Tab.Screen name="Notes"     component={NotesStack} />
      <Tab.Screen name="Projects"  component={ProjectsScreen} />
      <Tab.Screen name="Contacts"  component={ContactsStack} />
      <Tab.Screen name="Storage"   component={StorageScreen} />
      <Tab.Screen name="Settings"  component={SettingsScreen} />

      {/* Module screens — gated by tier AND role */}
      {moduleScreens}
    </Tab.Navigator>
  );
};


const s = StyleSheet.create({
  tabBar: {
    flexDirection:  'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    height:         Platform.OS === 'ios' ? 84 : 64,
    paddingBottom:  Platform.OS === 'ios' ? 24 : 8,
    paddingTop:     6,
    elevation:      8,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: -2 },
    shadowOpacity:  0.06,
    shadowRadius:   4,
  },
  tab: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            2,
    position:       'relative',
  },
  label: {
    fontSize:   10,
    fontWeight: '500',
  },
  dot: {
    position:     'absolute',
    bottom:       0,
    width:        4,
    height:       4,
    borderRadius: 2,
  },
  tabBarRelative: {
    position: 'relative',
  },
  aiSlot: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'flex-end',
    paddingBottom:  Platform.OS === 'ios' ? 20 : 6,
    position:       'relative',
  },
  aiBtn: {
    position:     'absolute',
    top:          Platform.OS === 'ios' ? -28 : -24,
    width:        52,
    height:       52,
    borderRadius: 26,
    backgroundColor: '#7C3AED',
    alignItems:   'center',
    justifyContent: 'center',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius:  10,
    elevation:     10,
  },
  aiDot: {
    width:        28,
    height:       28,
    borderRadius: 14,
    alignItems:   'center',
    justifyContent: 'center',
  },
});

export default MainTabNavigator;
