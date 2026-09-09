import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';

import CRMLeadsScreen      from './screens/CRMLeadsScreen';
import CRMPipelineScreen   from './screens/CRMPipelineScreen';
import CRMActivitiesScreen from './screens/CRMActivitiesScreen';
import LeadDetailScreen    from './screens/LeadDetailScreen';
import LeadFormScreen      from './screens/LeadFormScreen';
import CRMVisitLogScreen   from './screens/CRMVisitLogScreen';

// Each tab that needs detail navigation is wrapped in its own stack
const makeStack = (HomeScreen, stackName) => {
  const Stack = createNativeStackNavigator();
  const StackNavigator = () => {
    const { colors } = useTheme();
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown:      false,
          contentStyle:     { backgroundColor: colors.background },
          animation:        'slide_from_right',
        }}>
        <Stack.Screen name={`${stackName}Home`} component={HomeScreen} />
        <Stack.Screen name="LeadDetail"          component={LeadDetailScreen} />
        <Stack.Screen name="LeadForm"            component={LeadFormScreen} />
      </Stack.Navigator>
    );
  };
  StackNavigator.displayName = stackName;
  return StackNavigator;
};

const CRMLeadsStack      = makeStack(CRMLeadsScreen,      'CRMLeads');
const CRMPipelineStack   = makeStack(CRMPipelineScreen,   'CRMPipeline');
const CRMActivitiesStack = makeStack(CRMActivitiesScreen, 'CRMActivities');
const CRMVisitLogStack   = makeStack(CRMVisitLogScreen,   'CRMVisitLog');

export default {
  key:        'crm',
  label:      'CRM',
  icon:       'trending-up-outline',
  iconActive: 'trending-up',
  color:      '#E91E63',
  tabs: [
    { name: 'CRMLeads',      label: 'Leads',      icon: 'list-outline',            iconActive: 'list',           component: CRMLeadsStack      },
    { name: 'CRMPipeline',   label: 'Pipeline',   icon: 'git-branch-outline',      iconActive: 'git-branch',     component: CRMPipelineStack   },
    { name: 'CRMActivities', label: 'Activities', icon: 'checkmark-done-outline',  iconActive: 'checkmark-done', component: CRMActivitiesStack },
    { name: 'CRMVisitLog',   label: 'Visits',     icon: 'map-outline',             iconActive: 'map',            component: CRMVisitLogStack   },
  ],
};
