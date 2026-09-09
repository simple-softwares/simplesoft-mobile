import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';

import InventoryProductsScreen from './screens/InventoryProductsScreen';
import InventoryStockScreen    from './screens/InventoryStockScreen';
import InventoryMovesScreen    from './screens/InventoryMovesScreen';
import ProductDetailScreen     from './screens/ProductDetailScreen';
import PickingDetailScreen     from './screens/PickingDetailScreen';
import BarcodeScannerScreen    from './screens/BarcodeScannerScreen';

const makeStack = (HomeScreen, stackName, extras = []) => {
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
        <Stack.Screen name={`${stackName}Home`} component={HomeScreen} />
        <Stack.Screen name="ProductDetail"    component={ProductDetailScreen} />
        <Stack.Screen name="PickingDetail"     component={PickingDetailScreen} />
        <Stack.Screen name="BarcodeScanner"    component={BarcodeScannerScreen}
          options={{ animation: 'slide_from_bottom' }} />
        {extras.map(({ name, component }) => (
          <Stack.Screen key={name} name={name} component={component} />
        ))}
      </Stack.Navigator>
    );
  };
  StackNavigator.displayName = stackName;
  return StackNavigator;
};

const InventoryProductsStack = makeStack(InventoryProductsScreen, 'InventoryProducts');
const InventoryStockStack    = makeStack(InventoryStockScreen,    'InventoryStock');
const InventoryMovesStack    = makeStack(InventoryMovesScreen,    'InventoryMoves');

export default {
  key:        'inventory',
  label:      'Inventory',
  icon:       'cube-outline',
  iconActive: 'cube',
  color:      '#FF9800',
  tabs: [
    { name: 'InventoryProducts', label: 'Products', icon: 'cube-outline',            iconActive: 'cube',            component: InventoryProductsStack },
    { name: 'InventoryStock',    label: 'Stock',    icon: 'layers-outline',          iconActive: 'layers',          component: InventoryStockStack    },
    { name: 'InventoryMoves',    label: 'Moves',    icon: 'swap-horizontal-outline', iconActive: 'swap-horizontal', component: InventoryMovesStack    },
  ],
};
