import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { useTheme } from '../theme/ThemeContext';
import { MODULE_REGISTRY } from '../modules/registry';
import PlanService from '../services/provision/planService';
import { workspaceWebUrl } from '../config';

// ── Suite definitions — mirrors frontend Sidebar.jsx ──────────────────────────
// Each item has either `screen` (direct drawer/tab navigate) or `module` (module key)
const SUITES = [
  {
    key: 'operations',
    label: 'Operations',
    icon: 'flash-outline',
    items: [
      { label: 'Tasks',    icon: 'checkbox-outline',      screen: 'Tasks',    moduleKey: 'tasks'    },
      { label: 'Projects', icon: 'folder-outline',        screen: 'Projects', moduleKey: 'projects' },
      { label: 'Contacts', icon: 'people-outline',        screen: 'Contacts', moduleKey: 'contacts' },
      { label: 'Notes',    icon: 'document-text-outline', screen: 'Notes',    moduleKey: 'notes'    },
      { label: 'Chat',     icon: 'chatbubbles-outline',   module: 'chat'     },
      { label: 'Files',    icon: 'folder-open-outline',   module: 'files'    },
      { label: 'Calendar', icon: 'calendar-outline',      module: 'calendar' },
    ],
  },
  {
    key: 'financials',
    label: 'Financials',
    icon: 'book-outline',
    items: [
      { label: 'Invoices', icon: 'receipt-outline',       module: 'invoices' },
      { label: 'Expenses', icon: 'card-outline',          module: 'expenses' },
    ],
  },
  {
    key: 'sales',
    label: 'Sales & Commerce',
    icon: 'trending-up-outline',
    items: [
      { label: 'CRM',          icon: 'trending-up-outline', module: 'crm'      },
      { label: 'Quotations',   icon: 'document-outline',    module: 'invoices', tab: 'Quotations'  },
      { label: 'Sales Orders', icon: 'bag-outline',         module: 'sales',    tab: 'SalesOrders' },
    ],
  },
  {
    key: 'supply',
    label: 'Supply Chain',
    icon: 'cube-outline',
    items: [
      { label: 'Products',  icon: 'cube-outline',   module: 'inventory', tab: 'InventoryProducts' },
      { label: 'Inventory', icon: 'layers-outline',  module: 'inventory', tab: 'InventoryStock'    },
    ],
  },
  {
    key: 'hr',
    label: 'HR & Payroll',
    icon: 'briefcase-outline',
    items: [
      { label: 'Employees',  icon: 'people-outline',   module: 'hr'         },
      { label: 'Attendance', icon: 'time-outline',     module: 'attendance' },
      { label: 'Leaves',     icon: 'calendar-outline', module: 'leave'      },
      { label: 'Payroll',    icon: 'wallet-outline',   module: 'payroll'    },
    ],
  },
  {
    key: 'workspace',
    label: 'Workspace Tools',
    icon: 'settings-outline',
    items: [
      { label: 'Performance', icon: 'trophy-outline', module: 'performance' },
      { label: 'Automation',  icon: 'flash-outline',  module: 'automation'  },
    ],
  },
  {
    key: 'helpdesk',
    label: 'Help Desk',
    icon: 'headset-outline',
    items: [
      { label: 'Tickets', icon: 'clipboard-outline', module: 'helpdesk' },
    ],
  },
  {
    key: 'service',
    label: 'Service Operations',
    icon: 'construct-outline',
    items: [
      { label: 'Service Calls', icon: 'build-outline',     module: 'service' },
      { label: 'Daily Report',  icon: 'bar-chart-outline', module: 'service', deepScreen: 'ServiceDailyReport' },
    ],
  },
  {
    key: 'telecaller',
    label: 'Telecaller',
    icon: 'call-outline',
    items: [
      { label: 'Dashboard',   icon: 'grid-outline',   module: 'telecaller', tab: 'TelecallerDashboard'   },
      { label: 'Call Log',    icon: 'call-outline',   module: 'telecaller', tab: 'TelecallerCalls'       },
      { label: 'Leaderboard', icon: 'trophy-outline', module: 'telecaller', tab: 'TelecallerLeaderboard' },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const getFirstTab = (moduleKey) => {
  const mod = MODULE_REGISTRY.find(m => m.key === moduleKey);
  return mod?.tabs?.[0]?.name ?? null;
};

// ── Components ─────────────────────────────────────────────────────────────────

const SuiteHeader = ({ label, icon, isOpen, isActive, colors, onPress }) => (
  <TouchableOpacity
    style={[s.suiteHeader, isActive && !isOpen && { backgroundColor: colors.primary + '10' }]}
    onPress={onPress}
    activeOpacity={0.7}>
    <Icon name={icon} size={14} color={isActive ? colors.primary : colors.textSecondary} />
    <Text style={[s.suiteLabel, { color: isActive ? colors.primary : colors.textSecondary }]}>
      {label.toUpperCase()}
    </Text>
    <Icon
      name={isOpen ? 'chevron-up' : 'chevron-down'}
      size={12}
      color={colors.textLight}
      style={{ marginLeft: 'auto' }}
    />
  </TouchableOpacity>
);

const NavItem = ({ label, icon, active, accentColor, onPress, colors }) => {
  const accent = accentColor || colors.primary;
  return (
    <TouchableOpacity
      style={[s.navItem, active && { backgroundColor: accent + '15' }]}
      onPress={onPress}
      activeOpacity={0.7}>
      <Icon name={icon} size={16} color={active ? accent : colors.textSecondary} />
      <Text style={[s.navLabel, { color: active ? accent : colors.text, fontWeight: active ? '600' : '400' }]}>
        {label}
      </Text>
      {active && <View style={[s.activePill, { backgroundColor: accent }]} />}
    </TouchableOpacity>
  );
};

// ── Main ───────────────────────────────────────────────────────────────────────

const DrawerContent = ({ state, navigation }) => {
  const { colors } = useTheme();
  const dispatch        = useDispatch();
  const user            = useSelector(s => s.auth.user);
  const workspace       = useSelector(s => s.workspace);
  const plan            = useSelector(s => s.plan);
  const userEnabledMods = useSelector(s => s.auth.enabledModules || []);
  const moduleAccess    = useSelector(s => s.permissions.currentPermissionSummary?.moduleAccess ?? null);
  const activeRoute     = state.routes[state.index]?.name;

  const subscriptionModules = plan?.selected_modules || [];
  const isAdmin = user?.role === 'admin' || user?.is_admin === true;

  const canAccess = (moduleKey) => {
    if (!moduleKey) return true;
    if (moduleKey === 'settings' || moduleKey === 'profile') return true;
    if (moduleKey === 'admin') return isAdmin;
    if (isAdmin) return true;
    if (!subscriptionModules.includes(moduleKey)) return false;
    if (userEnabledMods.length > 0 && !userEnabledMods.includes(moduleKey)) return false;
    if (moduleAccess && moduleAccess[moduleKey] === false) return false;
    return true;
  };

  // Determine active module key from current tab route
  const activeModule = MODULE_REGISTRY.find(
    m => m.tabs.some(t => t.name === activeRoute)
  );
  const activeModuleKey = activeModule?.key;
  const activeModuleColor = activeModule?.color;

  // Build which suites are visible (have at least one accessible item)
  const visibleSuites = SUITES.map(suite => ({
    ...suite,
    items: suite.items.filter(item => {
      const key = item.module ?? item.moduleKey ?? null;
      return canAccess(key);
    }),
  })).filter(suite => suite.items.length > 0);

  // Find which suite is active
  const activeSuiteKey = visibleSuites.find(suite =>
    suite.items.some(item =>
      (item.module && item.module === activeModuleKey) ||
      (item.screen && item.screen === activeRoute)
    )
  )?.key ?? 'operations';

  const [openSuites, setOpenSuites] = useState({ [activeSuiteKey]: true });

  const toggleSuite = (key) =>
    setOpenSuites(prev => ({ ...prev, [key]: !prev[key] }));

  const navigateItem = (item) => {
    navigation.closeDrawer();
    if (item.screen) {
      navigation.navigate(item.screen);
    } else if (item.module) {
      const tabName = item.tab || getFirstTab(item.module);
      if (tabName) {
        navigation.navigate('MainTabs', {
          screen: tabName,
          ...(item.deepScreen ? { params: { screen: item.deepScreen } } : {}),
        });
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => dispatch(logout()) },
    ]);
  };

  return (
    <View style={[s.container, { backgroundColor: colors.surface }]}>
      {/* Header */}
      <View style={[s.header, { backgroundColor: activeModuleColor || colors.primary }]}>
        <View style={s.wsIcon}>
          <Text style={s.wsInitial}>
            {(workspace?.company || user?.name || 'W')[0]?.toUpperCase()}
          </Text>
        </View>
        <Text style={s.wsName} numberOfLines={1}>
          {workspace?.company || user?.name || 'My Workspace'}
        </Text>
        <Text style={s.wsUrl} numberOfLines={1}>
          {workspace?.workspace_url || (workspace?.slug ? workspaceWebUrl(workspace.slug) : '')}
        </Text>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Dashboard — always visible */}
        <NavItem
          label="Dashboard"
          icon="home-outline"
          active={activeRoute === 'Dashboard'}
          colors={colors}
          onPress={() => { navigation.closeDrawer(); navigation.navigate('Dashboard'); }}
        />

        <View style={[s.divider, { backgroundColor: colors.border }]} />

        {/* Suite accordion sections */}
        {visibleSuites.map(suite => {
          const isSuiteActive = suite.items.some(item =>
            (item.module && item.module === activeModuleKey) ||
            (item.screen && item.screen === activeRoute)
          );
          const isOpen = !!openSuites[suite.key];

          return (
            <View key={suite.key}>
              <SuiteHeader
                label={suite.label}
                icon={suite.icon}
                isOpen={isOpen}
                isActive={isSuiteActive}
                colors={colors}
                onPress={() => toggleSuite(suite.key)}
              />
              {isOpen && suite.items.map(item => {
                const isActive = item.module
                  ? item.module === activeModuleKey
                  : item.screen === activeRoute;
                return (
                  <NavItem
                    key={item.label}
                    label={item.label}
                    icon={item.icon}
                    active={isActive}
                    accentColor={activeModule?.color}
                    colors={colors}
                    onPress={() => navigateItem(item)}
                  />
                );
              })}
            </View>
          );
        })}

        <View style={[s.divider, { backgroundColor: colors.border }]} />

        {/* Settings */}
        <NavItem
          label="Settings"
          icon="settings-outline"
          active={activeRoute === 'Settings'}
          colors={colors}
          onPress={() => { navigation.closeDrawer(); navigation.navigate('Settings'); }}
        />


        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Footer — user profile + logout */}
      <View style={[s.footer, { borderTopColor: colors.border }]}>
        <TouchableOpacity style={s.footerItem} onPress={() => { navigation.closeDrawer(); navigation.navigate('Profile'); }}>
          <View style={[s.userAvatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[s.userInitial, { color: colors.primary }]}>
              {(user?.name || 'U')[0].toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>
              {user?.name || 'User'}
            </Text>
            <Text style={[s.userRole, { color: colors.textSecondary }]} numberOfLines={1}>
              {user?.role || ''}
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={s.logoutBtn}>
            <Icon name="log-out-outline" size={20} color={colors.error || '#EF4444'} />
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  container:    { flex: 1 },
  header:       { padding: 20, paddingBottom: 18, paddingTop: 56 },
  wsIcon:       { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.25)',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  wsInitial:    { fontSize: 20, fontWeight: '800', color: '#fff' },
  wsName:       { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  wsUrl:        { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  scroll:       { flex: 1, paddingTop: 4 },
  divider:      { height: StyleSheet.hairlineWidth, marginHorizontal: 16, marginVertical: 6 },
  suiteHeader:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16,
                  paddingVertical: 9, borderRadius: 8, marginHorizontal: 8, marginTop: 2 },
  suiteLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.8, flex: 1 },
  navItem:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 24,
                  paddingVertical: 10, position: 'relative' },
  navLabel:     { fontSize: 13, flex: 1 },
  activePill:   { width: 3, height: 20, borderRadius: 2, position: 'absolute', right: 0 },
  footer:       { borderTopWidth: StyleSheet.hairlineWidth, padding: 12 },
  footerItem:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar:   { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  userInitial:  { fontSize: 15, fontWeight: '700' },
  userName:     { fontSize: 13, fontWeight: '600' },
  userRole:     { fontSize: 11, textTransform: 'capitalize' },
  logoutBtn:    { padding: 6 },
});

export default DrawerContent;
