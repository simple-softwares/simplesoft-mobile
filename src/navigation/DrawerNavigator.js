import React from 'react';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from '@react-navigation/drawer';
import { View, Text, StyleSheet, Image } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';
import DashboardScreen from '../screens/Workspace/DashboardScreen';
import SettingsScreen from '../screens/Workspace/SettingsScreen';
import StorageScreen from '../screens/Workspace/StorageScreen';
import { logout } from '../services/api/auth';

// ── Dark mode shims (layout only — colors come from useTheme) ──
const typography = { h1:28, h2:24, h3:20, h4:18, h5:16, body1:15, body2:14, caption:12, small:11 };
const spacing    = { xs:4, sm:8, md:16, lg:20, xl:24, xxl:32 };
const layout     = { borderRadius: { sm:6, md:8, lg:12, xl:16, round:100 } };


const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props) => {
  const handleLogout = () => {
    logout();
    props.navigation.replace('Auth');
  };

  return (
    <DrawerContentScrollView {...props}>
      <View style={styles.drawerHeader}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>SW</Text>
        </View>
        <Text style={styles.appName}>SimpleSoft</Text>
        <Text style={styles.workspace}>Workspace</Text>
      </View>
      
      <DrawerItemList {...props} />
      
      <DrawerItem
        label="Logout"
        icon={({ color, size }) => (
          <Icon name="log-out-outline" color={color} size={size} />
        )}
        onPress={handleLogout}
        labelStyle={styles.logoutLabel}
      />
    </DrawerContentScrollView>
  );
};

const DrawerNavigator = () => {
  const { colors, isDark } = useTheme();
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        drawerStyle: {
          backgroundColor: colors.surface,
          width: 280,
        },
        drawerLabelStyle: {
          fontSize: typography.body2,
          marginLeft: -20,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        headerTitleStyle: {
          fontSize: typography.h5,
          fontWeight: '600',
          color: colors.text,
        },
      }}>
      <Drawer.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="home-outline" color={color} size={size} />
          ),
          title: 'My Workspace',
        }}
      />
      <Drawer.Screen
        name="Storage"
        component={StorageScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="cloud-outline" color={color} size={size} />
          ),
          title: 'Storage Usage',
        }}
      />
      <Drawer.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          drawerIcon: ({ color, size }) => (
            <Icon name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Drawer.Navigator>
  );
};

const styles = StyleSheet.create({
  drawerHeader: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E8E0',
    marginBottom: spacing.md,
  },
  logoContainer: {
    width: 50,
    height: 50,
    borderRadius: layout.borderRadius.md,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logoText: {
    fontSize: typography.h4,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: typography.h6,
    fontWeight: '600',
    color: '#0D0D14',
  },
  workspace: {
    fontSize: typography.caption,
    color: '#0D0D14'Light,
  },
  logoutLabel: {
    color: '#DC2626',
  },
});

export default DrawerNavigator;
