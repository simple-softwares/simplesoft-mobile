import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';

import FoundersRadarScreen from './screens/FoundersRadarScreen';

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

const FoundersRadarStack = makeStack(FoundersRadarScreen, 'FoundersRadar');

export default {
  key:        'founders_radar',
  label:      "Founder's Radar",
  icon:       'radio-outline',
  iconActive: 'radio',
  color:      '#7C3AED',
  tabs: [
    {
      name:       'FoundersRadar',
      label:      "Radar",
      icon:       'radio-outline',
      iconActive: 'radio',
      component:  FoundersRadarStack,
    },
  ],
};
