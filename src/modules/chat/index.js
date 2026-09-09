import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';

import ChatChannelsScreen from './screens/ChatChannelsScreen';
import ChatThreadScreen from './screens/ChatThreadScreen';
import ChatNewScreen from './screens/ChatNewScreen';

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
        <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
        <Stack.Screen name="ChatNew" component={ChatNewScreen} />
      </Stack.Navigator>
    );
  };
  StackNavigator.displayName = stackName;
  return StackNavigator;
};

const ChatChannelsStack = makeStack(ChatChannelsScreen, 'ChatChannels');

export default {
  key: 'chat',
  label: 'Chat',
  icon: 'chatbubbles-outline',
  iconActive: 'chatbubbles',
  color: '#10B981',
  tabs: [
    {
      name: 'ChatChannels',
      label: 'Chats',
      icon: 'chatbubbles-outline',
      iconActive: 'chatbubbles',
      component: ChatChannelsStack,
    },
  ],
};
