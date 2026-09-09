import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';

import AutomationListScreen  from './screens/AutomationListScreen';
import WorkflowDetailScreen  from './screens/WorkflowDetailScreen';
import WorkflowRunsScreen    from './screens/WorkflowRunsScreen';

const makeStack = (HomeScreen, stackName, extraScreens = []) => {
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
        {extraScreens.map(({ name, component }) => (
          <Stack.Screen key={name} name={name} component={component} />
        ))}
      </Stack.Navigator>
    );
  };
  StackNavigator.displayName = stackName;
  return StackNavigator;
};

const AutomationStack = makeStack(AutomationListScreen, 'AutomationList', [
  { name: 'WorkflowDetail', component: WorkflowDetailScreen },
  { name: 'WorkflowRuns',   component: WorkflowRunsScreen   },
]);

export default {
  key:        'automation',
  label:      'Automation',
  icon:       'flash-outline',
  iconActive: 'flash',
  color:      '#7C3AED',
  tabs: [
    {
      name:       'AutomationWorkflows',
      label:      'Workflows',
      icon:       'flash-outline',
      iconActive: 'flash',
      component:  AutomationStack,
    },
  ],
};
