import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import ServiceListScreen        from './screens/ServiceListScreen';
import ServiceDetailScreen      from './screens/ServiceDetailScreen';
import NewTicketScreen          from './screens/NewTicketScreen';
import WorkLogScreen            from './screens/WorkLogScreen';
import ServiceDailyReportScreen from './screens/ServiceDailyReportScreen';

const Stack = createNativeStackNavigator();

function ServiceStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ServiceList"        component={ServiceListScreen} />
      <Stack.Screen name="ServiceDetail"      component={ServiceDetailScreen} />
      <Stack.Screen name="ServiceDailyReport" component={ServiceDailyReportScreen}
        options={{ animation: 'slide_from_right' }} />
      <Stack.Screen
        name="NewTicket"
        component={NewTicketScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="WorkLog"
        component={WorkLogScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

export default {
  key:       'service',
  label:     'Service',
  icon:      'construct-outline',
  iconActive: 'construct',
  color:     '#0EA5E9',
  tabs: [
    { name: 'Service', component: ServiceStack },
  ],
};
