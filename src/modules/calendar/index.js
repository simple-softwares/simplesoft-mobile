import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';

import CalendarViewScreen from './screens/CalendarViewScreen';
import CalendarEventsScreen from './screens/CalendarEventsScreen';
import CreateEventScreen from './screens/CreateEventScreen';
import EventDetailScreen from './screens/EventDetailScreen';

const Stack = createNativeStackNavigator();

// Helper to create stacks for module tabs
const makeStack = (HomeScreen, stackName) => {
  const StackNavigator = () => {
    const { colors } = useTheme();
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name={`${stackName}Home`} component={HomeScreen} />
        <Stack.Screen name="CreateEvent" component={CreateEventScreen} />
        <Stack.Screen name="EventDetail" component={EventDetailScreen} />
      </Stack.Navigator>
    );
  };
  StackNavigator.displayName = stackName;
  return StackNavigator;
};

const CalendarViewStack = makeStack(CalendarViewScreen, 'CalendarView');
const CalendarEventsStack = makeStack(CalendarEventsScreen, 'CalendarEvents');

export default {
  key: 'calendar',
  label: 'Calendar',
  icon: 'calendar-outline',
  iconActive: 'calendar',
  color: '#0EA5E9',
  tabs: [
    {
      name: 'CalendarView',
      label: 'Calendar',
      icon: 'calendar-outline',
      iconActive: 'calendar',
      component: CalendarViewStack,
    },
    {
      name: 'CalendarEvents',
      label: 'Events',
      icon: 'list-outline',
      iconActive: 'list',
      component: CalendarEventsStack,
    },
  ],
};
