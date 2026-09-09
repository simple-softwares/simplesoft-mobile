import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PayrollListScreen  from './screens/PayrollListScreen';
import PayrollDetailScreen from './screens/PayrollDetailScreen';

const Stack = createNativeStackNavigator();

function PayrollStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PayrollList"   component={PayrollListScreen} />
      <Stack.Screen name="PayrollDetail" component={PayrollDetailScreen} />
    </Stack.Navigator>
  );
}

export default {
  key:        'payroll',
  label:      'Payroll',
  icon:       'wallet-outline',
  iconActive:  'wallet',
  color:      '#8B5CF6',
  tabs: [
    { name: 'Payroll', component: PayrollStack },
  ],
};
