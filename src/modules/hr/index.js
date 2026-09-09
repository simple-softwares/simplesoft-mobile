import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';

import HREmployeesScreen   from './screens/HREmployeesScreen';
import HRLeavesScreen      from './screens/HRLeavesScreen';
import HRDepartmentsScreen from './screens/HRDepartmentsScreen';
import HRTeamsScreen       from './screens/HRTeamsScreen';
import EmployeeDetailScreen from './screens/EmployeeDetailScreen';
import TeamDetailScreen from './screens/TeamDetailScreen';
import EmployeeProfileScreen from './screens/EmployeeProfileScreen';
import CreateEmployeeScreen from './screens/CreateEmployeeScreen';

const DrawerMenuBtn = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ paddingLeft: 16 }}>
      <Icon name="menu-outline" size={24} color={colors.text} />
    </TouchableOpacity>
  );
};

const makeStack = (HomeScreen, stackName) => {
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
        <Stack.Screen name={`${stackName}Home`}  component={HomeScreen} />
        <Stack.Screen name="EmployeeDetail"       component={EmployeeDetailScreen} />
        <Stack.Screen name="TeamDetail"           component={TeamDetailScreen} />
        <Stack.Screen name="EmployeeProfile"      component={EmployeeProfileScreen} />
        <Stack.Screen name="CreateEmployee"       component={CreateEmployeeScreen} />
      </Stack.Navigator>
    );
  };
  StackNavigator.displayName = stackName;
  return StackNavigator;
};

const HREmployeesStack   = makeStack(HREmployeesScreen,   'HREmployees');
const HRTeamsStack       = makeStack(HRTeamsScreen,       'HRTeams');
const HRLeavesStack      = makeStack(HRLeavesScreen,      'HRLeaves');
const HRDepartmentsStack = makeStack(HRDepartmentsScreen, 'HRDepartments');

export default {
  key:        'hr',
  label:      'HR',
  icon:       'people-outline',
  iconActive: 'people',
  color:      '#9C27B0',
  tabs: [
    { name: 'HREmployees',   label: 'Employees',   icon: 'people-outline',   iconActive: 'people',   component: HREmployeesStack   },
    { name: 'HRTeams',       label: 'Teams',       icon: 'shield-outline',   iconActive: 'shield',   component: HRTeamsStack       },
    { name: 'HRLeaves',      label: 'Leaves',      icon: 'calendar-outline', iconActive: 'calendar', component: HRLeavesStack      },
    { name: 'HRDepartments', label: 'Departments', icon: 'business-outline', iconActive: 'business', component: HRDepartmentsStack },
  ],
};
