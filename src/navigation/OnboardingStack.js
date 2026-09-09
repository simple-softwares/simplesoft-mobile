import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme/ThemeContext';
import OnboardingScreen       from '../screens/onboarding/OnboardingScreen';
import RegisterScreen         from '../screens/onboarding/RegisterScreen';
import ModulePickerScreen     from '../screens/onboarding/ModulePickerScreen';
import WorkspaceLoadingScreen from '../screens/onboarding/WorkspaceLoadingScreen';
import EnterWorkspaceScreen   from '../screens/onboarding/EnterWorkspaceScreen';
import LoginScreen            from '../screens/auth/LoginScreen';

const Stack = createNativeStackNavigator();

const OnboardingStack = () => {
  const { colors } = useTheme();
  const headerOpts = {
    headerStyle:      { backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0 },
    headerTitleStyle: { color: colors.text, fontWeight: '700' },
    headerTintColor:  colors.primary,
    headerShown:      false,
  };
  return (
    <Stack.Navigator screenOptions={headerOpts}>
      <Stack.Screen name="Welcome"          component={OnboardingScreen}       />
      <Stack.Screen name="Register"         component={RegisterScreen}         options={{ headerShown: true, title: '' }} />
      <Stack.Screen name="ModulePicker"     component={ModulePickerScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="WorkspaceLoading" component={WorkspaceLoadingScreen} options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="EnterWorkspace"   component={EnterWorkspaceScreen}   options={{ headerShown: false }} />
      <Stack.Screen name="Login"            component={LoginScreen}            options={{ headerShown: false }} />
    </Stack.Navigator>
  );
};

export default OnboardingStack;
