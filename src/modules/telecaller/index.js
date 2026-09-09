import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import TelecallerDashboardScreen  from './screens/TelecallerDashboardScreen';
import TelecallerCallsScreen      from './screens/TelecallerCallsScreen';
import TelecallerLeaderboardScreen from './screens/TelecallerLeaderboardScreen';

const makeStack = (HomeScreen, stackName) => {
  const Stack = createNativeStackNavigator();
  const Nav = () => {
    const { colors } = useTheme();
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown:  false,
          contentStyle: { backgroundColor: colors.background },
          animation:    'slide_from_right',
        }}>
        <Stack.Screen name={`${stackName}Home`} component={HomeScreen} />
      </Stack.Navigator>
    );
  };
  Nav.displayName = stackName;
  return Nav;
};

// Dashboard needs to navigate to Calls/Leaderboard tabs, handled by tab bar
const DashboardStack   = makeStack(TelecallerDashboardScreen,   'TelecallerDashboard');
const CallsStack       = makeStack(TelecallerCallsScreen,       'TelecallerCalls');
const LeaderboardStack = makeStack(TelecallerLeaderboardScreen, 'TelecallerLeaderboard');

export default {
  key:        'telecaller',
  label:      'Telecaller',
  icon:       'call-outline',
  iconActive: 'call',
  color:      '#16A34A',
  tabs: [
    { name: 'TelecallerDashboard',   label: 'Dashboard',   icon: 'grid-outline',    iconActive: 'grid',    component: DashboardStack   },
    { name: 'TelecallerCalls',       label: 'Call Log',    icon: 'list-outline',    iconActive: 'list',    component: CallsStack       },
    { name: 'TelecallerLeaderboard', label: 'Leaderboard', icon: 'trophy-outline',  iconActive: 'trophy',  component: LeaderboardStack },
  ],
};
