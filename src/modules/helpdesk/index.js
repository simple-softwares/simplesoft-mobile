import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HelpdeskListScreen      from './screens/HelpdeskListScreen';
import HelpdeskDetailScreen    from './screens/HelpdeskDetailScreen';
import NewHelpdeskTicketScreen from './screens/NewHelpdeskTicketScreen';

const Stack = createNativeStackNavigator();

function HelpdeskStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HelpdeskList"       component={HelpdeskListScreen} />
      <Stack.Screen name="HelpdeskDetail"     component={HelpdeskDetailScreen} />
      <Stack.Screen
        name="NewHelpdeskTicket"
        component={NewHelpdeskTicketScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </Stack.Navigator>
  );
}

export default {
  key:        'helpdesk',
  label:      'Helpdesk',
  icon:       'headset-outline',
  iconActive:  'headset',
  color:      '#7C3AED',
  tabs: [
    { name: 'Helpdesk', component: HelpdeskStack },
  ],
};
