import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';

import PerformanceMyScoreScreen    from './screens/PerformanceMyScoreScreen';
import PerformanceLeaderboardScreen from './screens/PerformanceLeaderboardScreen';
import PerformanceBadgesScreen     from './screens/PerformanceBadgesScreen';

const makeStack = (HomeScreen, stackName) => {
  const Stack = createNativeStackNavigator();
  const StackNavigator = () => {
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
  StackNavigator.displayName = stackName;
  return StackNavigator;
};

const PerformanceMyScoreStack    = makeStack(PerformanceMyScoreScreen,    'PerformanceMyScore');
const PerformanceLeaderboardStack = makeStack(PerformanceLeaderboardScreen, 'PerformanceLeaderboard');
const PerformanceBadgesStack     = makeStack(PerformanceBadgesScreen,     'PerformanceBadges');

export default {
  key:        'performance',
  label:      'Performance',
  icon:       'trophy-outline',
  iconActive: 'trophy',
  color:      '#FF9800',
  tabs: [
    { name: 'PerformanceMyScore',    label: 'My Score',    icon: 'star-outline',          iconActive: 'star',          component: PerformanceMyScoreStack    },
    { name: 'PerformanceLeaderboard',label: 'Leaderboard', icon: 'podium-outline',        iconActive: 'podium',        component: PerformanceLeaderboardStack },
    { name: 'PerformanceBadges',     label: 'Badges',      icon: 'ribbon-outline',        iconActive: 'ribbon',        component: PerformanceBadgesStack     },
  ],
};
