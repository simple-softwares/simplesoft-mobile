import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';

import ExpenseListScreen  from './screens/ExpenseListScreen';
import ExpenseDetailScreen from './screens/ExpenseDetailScreen';
import NewExpenseScreen   from './screens/NewExpenseScreen';

const Stack = createNativeStackNavigator();

function ExpensesStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown:  false,
        contentStyle: { backgroundColor: colors.background },
        animation:    'slide_from_right',
      }}>
      <Stack.Screen name="ExpenseListHome" component={ExpenseListScreen} />
      <Stack.Screen name="ExpenseDetail"   component={ExpenseDetailScreen} />
      <Stack.Screen
        name="NewExpense"
        component={NewExpenseScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

export default {
  key:        'expenses',
  label:      'Expenses',
  icon:       'wallet-outline',
  iconActive: 'wallet',
  color:      '#059669',
  tabs: [
    {
      name:       'Expenses',
      label:      'Expenses',
      icon:       'wallet-outline',
      iconActive: 'wallet',
      component:  ExpensesStack,
    },
  ],
};
