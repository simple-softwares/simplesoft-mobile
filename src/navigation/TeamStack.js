import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import TeamsScreen           from '../screens/team/TeamsScreen';
import TeamDetailScreen      from '../screens/team/TeamDetailScreen';
import EmployeeProfileScreen from '../screens/team/EmployeeProfileScreen';
import CreateEmployeeScreen  from '../screens/team/CreateEmployeeScreen';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator();

const DrawerMenuBtn = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={() => navigation.dispatch(DrawerActions.openDrawer())} style={{ paddingLeft: 16 }}>
      <Icon name="menu-outline" size={24} color={colors.text} />
    </TouchableOpacity>
  );
};

const TeamStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: colors.border },
      headerTitleStyle: { fontSize: 17, fontWeight: '700', color: colors.text },
      headerTintColor: colors.primary,
    }}>
      <Stack.Screen name="TeamList"        component={TeamsScreen}           options={{ title: 'People & Teams', headerLeft: () => <DrawerMenuBtn /> }} />
      <Stack.Screen name="TeamDetail"      component={TeamDetailScreen}      options={{ title: '' }} />
      <Stack.Screen name="EmployeeProfile" component={EmployeeProfileScreen} options={{ title: '' }} />
      <Stack.Screen name="CreateEmployee"  component={CreateEmployeeScreen}  options={{ title: 'New Employee' }} />
    </Stack.Navigator>
  );
};

export default TeamStack;