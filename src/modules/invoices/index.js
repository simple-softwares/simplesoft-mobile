import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';

import InvoiceListScreen      from './screens/InvoiceListScreen';
import InvoiceDetailScreen    from './screens/InvoiceDetailScreen';
import NewInvoiceScreen       from './screens/NewInvoiceScreen';
import QuotationListScreen    from './screens/QuotationListScreen';
import QuotationDetailScreen  from './screens/QuotationDetailScreen';
import NewQuotationScreen     from './screens/NewQuotationScreen';

const makeStack = (HomeScreen, stackName, extraScreens = []) => {
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
        {extraScreens.map(({ name, component }) => (
          <Stack.Screen key={name} name={name} component={component} />
        ))}
      </Stack.Navigator>
    );
  };
  Nav.displayName = stackName;
  return Nav;
};

const InvoicesStack = makeStack(InvoiceListScreen, 'Invoices', [
  { name: 'InvoiceDetail', component: InvoiceDetailScreen },
  { name: 'NewInvoice',    component: NewInvoiceScreen },
]);

const QuotationsStack = makeStack(QuotationListScreen, 'Quotations', [
  { name: 'QuotationDetail', component: QuotationDetailScreen },
  { name: 'NewQuotation',    component: NewQuotationScreen },
]);

export default {
  key:        'invoices',
  label:      'Invoicing',
  icon:       'receipt-outline',
  iconActive: 'receipt',
  color:      '#7C3AED',
  tabs: [
    {
      name:       'Invoices',
      label:      'Invoices',
      icon:       'receipt-outline',
      iconActive: 'receipt',
      component:  InvoicesStack,
    },
    {
      name:       'Quotations',
      label:      'Quotations',
      icon:       'document-text-outline',
      iconActive: 'document-text',
      component:  QuotationsStack,
    },
  ],
};
