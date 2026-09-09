import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useDispatch, useSelector } from 'react-redux';
import { setThemeMode } from '../../store/slices/themeSlice';
import { useTheme } from '../../theme/ThemeContext';

const MODES = [
  { value: 'light', icon: 'sunny-outline',   label: 'Light' },
  { value: 'auto',  icon: 'contrast-outline', label: 'Auto'  },
  { value: 'dark',  icon: 'moon-outline',     label: 'Dark'  },
];

const ThemeToggle = () => {
  const dispatch = useDispatch();
  const current  = useSelector(s => s.theme?.mode || 'auto');
  const { colors, layout } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {MODES.map(m => {
        const active = current === m.value;
        return (
          <TouchableOpacity key={m.value}
            style={[styles.btn, active && { backgroundColor: colors.primary }]}
            onPress={() => dispatch(setThemeMode(m.value))}>
            <Icon name={m.icon} size={15}
              color={active ? '#fff' : colors.textSecondary} />
            <Text style={[styles.label, { color: active ? '#fff' : colors.textSecondary }]}>
              {m.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: 'row', borderRadius: 10, borderWidth: 1, padding: 3, gap: 2 },
  btn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 7, borderRadius: 8 },
  label:     { fontSize: 12, fontWeight: '600' },
});

export default ThemeToggle;
