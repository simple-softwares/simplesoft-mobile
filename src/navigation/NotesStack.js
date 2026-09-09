import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NotesScreen from '../screens/notes/NotesScreen';
import NoteEditor  from '../screens/notes/NoteEditor';
import { useTheme } from '../theme/ThemeContext';

const Stack = createNativeStackNavigator();

const NotesStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator screenOptions={{
      headerStyle: { backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0, borderBottomWidth: 0.5, borderBottomColor: colors.border },
      headerTitleStyle: { fontSize: 17, fontWeight: '700', color: colors.text },
      headerTintColor: colors.primary,
    }}>
      <Stack.Screen name="NotesList"  component={NotesScreen} options={{ title: 'Notes', headerShown: false }} />
      <Stack.Screen name="NoteEditor" component={NoteEditor}  options={{ title: '' }} />
    </Stack.Navigator>
  );
};

export default NotesStack;
