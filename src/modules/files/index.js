import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';

import FilesDirectoryScreen from './screens/FilesDirectoryScreen';
import FilesListScreen from './screens/FilesListScreen';
import FilePreviewScreen from './screens/FilePreviewScreen';

const Stack = createNativeStackNavigator();

const makeStack = (HomeScreen, stackName) => {
  const StackNavigator = () => {
    const { colors } = useTheme();
    return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name={`${stackName}Home`} component={HomeScreen} />
        <Stack.Screen name="FilePreview" component={FilePreviewScreen} />
      </Stack.Navigator>
    );
  };
  StackNavigator.displayName = stackName;
  return StackNavigator;
};

const FilesDirectoryStack = makeStack(FilesDirectoryScreen, 'FilesDirectory');
const FilesListStack = makeStack(FilesListScreen, 'FilesList');

export default {
  key: 'files',
  label: 'Files',
  icon: 'folder-outline',
  iconActive: 'folder',
  color: '#F59E0B',
  tabs: [
    {
      name: 'FilesDirectory',
      label: 'Browse',
      icon: 'folder-outline',
      iconActive: 'folder',
      component: FilesDirectoryStack,
    },
    {
      name: 'FilesList',
      label: 'Recent',
      icon: 'list-outline',
      iconActive: 'list',
      component: FilesListStack,
    },
  ],
};
