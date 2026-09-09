import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

// Custom toast type for "item deleted · Undo"
// Registered in App.js as toastConfig.undo
const UndoToast = ({ text1, props }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={styles.label} numberOfLines={1}>{text1}</Text>
      <TouchableOpacity onPress={props?.onUndo} style={styles.undoBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={[styles.undoText, { color: colors.primary }]}>Undo</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#1C1C2E',
    elevation: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  label:   { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  undoBtn: { marginLeft: 16 },
  undoText:{ fontSize: 14, fontWeight: '700' },
});

export default UndoToast;
