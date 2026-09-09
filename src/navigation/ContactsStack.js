import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import ContactsScreen      from '../screens/contacts/ContactsScreen';
import ContactDetailScreen from '../screens/contacts/ContactDetailScreen';
import ContactEditScreen   from '../screens/contacts/ContactEditScreen';
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

const ContactsStack = () => {
  const { colors } = useTheme();
  const opts = {
    headerStyle: { backgroundColor: colors.surface, elevation: 0, shadowOpacity: 0, borderBottomWidth: 0.5, borderBottomColor: colors.border },
    headerTitleStyle: { fontSize: 17, fontWeight: '700', color: colors.text },
    headerTintColor: colors.primary,
  };
  return (
    <Stack.Navigator screenOptions={opts}>
      <Stack.Screen name="ContactsList"  component={ContactsScreen}      options={{ title: 'Contacts', headerLeft: () => <DrawerMenuBtn /> }} />
      <Stack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ title: '' }} />
      <Stack.Screen name="ContactEdit"   component={ContactEditScreen}   options={{ title: '' }} />
    </Stack.Navigator>
  );
};
 
export default ContactsStack;
