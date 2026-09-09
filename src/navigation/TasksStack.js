import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import KanbanScreen      from '../screens/kanban/KanbanScreen';
import TasksScreen       from '../screens/tasks/TasksScreen';
import TaskDetailsScreen from '../screens/tasks/details/TaskDetailsScreen';
import CreateTaskScreen  from '../screens/tasks/CreateTaskScreen';
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

const TasksStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0, borderBottomWidth: 0.5, borderBottomColor: colors.border },
      headerTitleStyle: { fontSize: 18, fontWeight: '600', color: colors.text },
      headerTintColor: colors.primary,
    }}>
      <Stack.Screen name="TasksList"  component={TasksScreen}       options={{ title: 'My Tasks', headerLeft: () => <DrawerMenuBtn /> }} />
      <Stack.Screen name="TaskDetail" component={TaskDetailsScreen} options={{ title: 'Task Details' }} />
      <Stack.Screen name="CreateTask" component={CreateTaskScreen}  options={{ title: 'Create Task' }} />
      <Stack.Screen name="Kanban"     component={KanbanScreen}      options={{ title: 'Board' }} />
    </Stack.Navigator>
  );
};

export default TasksStack;
