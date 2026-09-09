import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../theme/ThemeContext';
import DrawerContent from './DrawerContent';
import MainTabNavigator from './MainTabNavigator';
import SettingsScreen from '../screens/workspace/SettingsScreen';
import ModulesStatusScreen from '../screens/workspace/ModulesStatusScreen';
import PaymentHistoryScreen from '../screens/billing/PaymentHistoryScreen';
import TeamManagementScreen from '../screens/workspace/TeamManagementScreen';
import BuyTeamSeatsScreen from '../screens/billing/BuyTeamSeatsScreen';
import CreateEmployeeScreen from '../screens/workspace/CreateEmployeeScreen';
import EmployeePermissionsScreen from '../screens/admin/EmployeePermissionsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import AdminWorkspacesScreen from '../screens/admin/AdminWorkspacesScreen';
import AdminChangeTierScreen from '../screens/admin/AdminChangeTierScreen';
import AdminPaymentsScreen from '../screens/admin/AdminPaymentsScreen';
import TermsAndConditionsScreen from '../screens/info/TermsAndConditionsScreen';
import HowToGuideScreen from '../screens/info/HowToGuideScreen';
import OpenSourceScreen from '../screens/info/OpenSourceScreen';
import CompanyContactScreen from '../screens/info/CompanyContactScreen';
 
const Drawer = createDrawerNavigator();
 
// Placeholder for module routes not yet built as native screens
const PlaceholderScreen = ({ route }) => {
  const { colors } = useTheme();
  const { View, Text } = require('react-native');
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <Icon name="construct-outline" size={48} color={colors.border} />
      <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, marginTop: 12 }}>
        {route.name}
      </Text>
      <Text style={{ fontSize: 14, color: colors.textSecondary, marginTop: 6 }}>
        Coming soon
      </Text>
    </View>
  );
};
 
const MainDrawerNavigator = () => {
  const { colors } = useTheme();
  const user = useSelector(s => s.auth.user);
  const isAdmin = user?.role === 'admin';

  const headerLeft = (navigation) => () => (
    <TouchableOpacity
      onPress={() => navigation.openDrawer()}
      style={{ paddingLeft: 16 }}>
      <Icon name="menu-outline" size={24} color={colors.text} />
    </TouchableOpacity>
  );
 
  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown:         false,
        drawerType:          'slide',
        drawerStyle:         { width: 280, backgroundColor: colors.surface },
        overlayColor:        'rgba(0,0,0,0.4)',
        swipeEdgeWidth:      40,
      })}>
 
      {/* Main tab app */}
      <Drawer.Screen name="MainTabs" component={MainTabNavigator}
        options={{ headerShown: false }} />
 
      {/* Module screens — shown in drawer when installed */}
      <Drawer.Screen name="CRM"           component={PlaceholderScreen} />
      <Drawer.Screen name="Sales"         component={PlaceholderScreen} />
      <Drawer.Screen name="POS"           component={PlaceholderScreen} />
      <Drawer.Screen name="Inventory"     component={PlaceholderScreen} />
      <Drawer.Screen name="Manufacturing" component={PlaceholderScreen} />
      <Drawer.Screen name="Purchase"      component={PlaceholderScreen} />
      <Drawer.Screen name="HR"            component={PlaceholderScreen} />
      <Drawer.Screen name="Payroll"       component={PlaceholderScreen} />
      <Drawer.Screen name="Accounting"    component={PlaceholderScreen} />
      <Drawer.Screen name="Helpdesk"      component={PlaceholderScreen} />
      <Drawer.Screen name="Automation"    component={PlaceholderScreen} />

      {/* Profile & Settings screens */}
      <Drawer.Screen name="Profile" component={ProfileScreen} options={{ headerShown: false }} />
      <Drawer.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
      <Drawer.Screen name="ModulesStatus" component={ModulesStatusScreen} options={{ headerShown: false }} />
      <Drawer.Screen name="PaymentHistory" component={PaymentHistoryScreen} options={{ headerShown: false }} />

      {/* Team management & Admin screens — admin only */}
      {isAdmin && (
        <>
          <Drawer.Screen name="TeamManagement" component={TeamManagementScreen} options={{ headerShown: false }} />
          <Drawer.Screen name="BuyTeamSeats" component={BuyTeamSeatsScreen} options={{ headerShown: false }} />
          <Drawer.Screen name="CreateEmployee" component={CreateEmployeeScreen} options={{ headerShown: false }} />
          <Drawer.Screen name="EmployeePermissions" component={EmployeePermissionsScreen} options={{ headerShown: false }} />
          <Drawer.Screen name="AdminWorkspaces" component={AdminWorkspacesScreen} options={{ headerShown: false }} />
          <Drawer.Screen name="AdminChangeTier" component={AdminChangeTierScreen} options={{ headerShown: false }} />
          <Drawer.Screen name="AdminPayments" component={AdminPaymentsScreen} options={{ headerShown: false }} />
        </>
      )}

      {/* Information screens */}
      <Drawer.Screen name="HowToGuide" component={HowToGuideScreen} options={{ headerShown: false }} />
      <Drawer.Screen name="TermsAndConditions" component={TermsAndConditionsScreen} options={{ headerShown: false }} />
      <Drawer.Screen name="OpenSource" component={OpenSourceScreen} options={{ headerShown: false }} />
      <Drawer.Screen name="CompanyContact" component={CompanyContactScreen} options={{ headerShown: false }} />
    </Drawer.Navigator>
  );
};
 
export default MainDrawerNavigator;
