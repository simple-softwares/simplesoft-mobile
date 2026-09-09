import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';

const SIZES = {
  sm: { paddingVertical: 8,  paddingHorizontal: 16, fontSize: 12 },
  md: { paddingVertical: 12, paddingHorizontal: 24, fontSize: 14 },
  lg: { paddingVertical: 16, paddingHorizontal: 32, fontSize: 15 },
};

const Button = ({
  title,
  onPress,
  loading   = false,
  disabled  = false,
  variant   = 'primary', // 'primary' | 'secondary' | 'outline'
  size      = 'md',
  fullWidth = false,
  style,
  textStyle,
}) => {
  const { colors } = useTheme();
  const sz = SIZES[size] || SIZES.md;

  const bgColor =
    variant === 'outline'   ? 'transparent' :
    variant === 'secondary' ? colors.surface :
    colors.primary;

  const textColor =
    variant === 'outline'   ? colors.primary :
    variant === 'secondary' ? colors.text :
    '#fff';

  return (
    <TouchableOpacity
      style={[
        s.btn,
        { backgroundColor: bgColor, paddingVertical: sz.paddingVertical, paddingHorizontal: sz.paddingHorizontal },
        variant === 'outline' && { borderWidth: 1, borderColor: colors.primary },
        fullWidth             && s.fullWidth,
        (disabled || loading) && s.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}>
      {loading
        ? <ActivityIndicator color={variant === 'outline' ? colors.primary : '#fff'} size="small" />
        : <Text style={[s.text, { color: textColor, fontSize: sz.fontSize }, textStyle]}>{title}</Text>
      }
    </TouchableOpacity>
  );
};

const s = StyleSheet.create({
  btn:      { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  fullWidth:{ width: '100%' },
  disabled: { opacity: 0.5 },
  text:     { fontWeight: '600' },
});

export default Button;
