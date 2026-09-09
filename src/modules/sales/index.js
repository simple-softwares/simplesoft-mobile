import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';

import SalesQuotationsScreen from './screens/SalesQuotationsScreen';
import SalesOrdersScreen     from './screens/SalesOrdersScreen';
import SalesCustomersScreen  from './screens/SalesCustomersScreen';
import SaleDetailScreen      from './screens/SaleDetailScreen';
import CustomerDetailScreen  from './screens/CustomerDetailScreen';
import NewSaleOrderScreen    from './screens/NewSaleOrderScreen';

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
        <Stack.Screen name="SaleDetail"          component={SaleDetailScreen} />
        {extraScreens.map(({ name, component }) => (
          <Stack.Screen key={name} name={name} component={component} />
        ))}
      </Stack.Navigator>
    );
  };
  StackNavigator.displayName = stackName;
  return StackNavigator;
};

const SalesQuotationsStack = makeStack(SalesQuotationsScreen, 'SalesQuotations');
const SalesOrdersStack     = makeStack(SalesOrdersScreen,     'SalesOrders', [
  { name: 'NewSaleOrder', component: NewSaleOrderScreen },
]);

// Customers stack needs CustomerDetail in addition to SaleDetail
const _CustomersStack = createNativeStackNavigator();
const SalesCustomersStack = () => {
  const { colors } = useTheme();
  return (
    <_CustomersStack.Navigator
      screenOptions={{
        headerShown:  false,
        contentStyle: { backgroundColor: colors.background },
        animation:    'slide_from_right',
      }}>
      <_CustomersStack.Screen name="SalesCustomersHome" component={SalesCustomersScreen} />
      <_CustomersStack.Screen name="CustomerDetail"     component={CustomerDetailScreen} />
      <_CustomersStack.Screen name="SaleDetail"         component={SaleDetailScreen} />
    </_CustomersStack.Navigator>
  );
};
SalesCustomersStack.displayName = 'SalesCustomers';

export default {
  key:        'sales',
  label:      'Sales',
  icon:       'receipt-outline',
  iconActive: 'receipt',
  color:      '#2196F3',
  tabs: [
    { name: 'SalesQuotations', label: 'Quotations', icon: 'document-outline', iconActive: 'document', component: SalesQuotationsStack },
    { name: 'SalesOrders',     label: 'Orders',     icon: 'bag-outline',      iconActive: 'bag',      component: SalesOrdersStack     },
    { name: 'SalesCustomers',  label: 'Customers',  icon: 'people-outline',   iconActive: 'people',   component: SalesCustomersStack  },
  ],
};
