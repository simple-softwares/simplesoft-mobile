import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../../theme/ThemeContext';

const Input = ({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType    = 'default',
  autoCapitalize  = 'none',
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  multiline      = false,
  numberOfLines  = 1,
  editable       = true,
  style,
  inputStyle,
  ...props
}) => {
  const { colors }    = useTheme();
  const [secure, setSecure] = useState(secureTextEntry);

  return (
    <View style={[s.container, style]}>
      {!!label && (
        <Text style={[s.label, { color: colors.textSecondary }]}>{label}</Text>
      )}

      <View style={[
        s.inputContainer,
        { borderColor: error ? colors.error : colors.border, backgroundColor: colors.surface },
        multiline && s.multilineContainer,
        !editable && { opacity: 0.6 },
      ]}>
        {!!leftIcon && <View style={s.leftIcon}>{leftIcon}</View>}

        <TextInput
          style={[
            s.input,
            { color: colors.text },
            leftIcon  && s.inputWithLeftIcon,
            (rightIcon || secureTextEntry) && s.inputWithRightIcon,
            multiline && s.multilineInput,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          secureTextEntry={secure}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          multiline={multiline}
          numberOfLines={multiline ? numberOfLines : 1}
          editable={editable}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity style={s.rightIcon} onPress={() => setSecure(v => !v)}>
            <Icon
              name={secure ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}

        {rightIcon && !secureTextEntry && (
          <TouchableOpacity style={s.rightIcon} onPress={onRightIconPress}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>

      {!!error && (
        <Text style={[s.errorText, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
};

const s = StyleSheet.create({
  container:          { marginBottom: 16 },
  label:              { fontSize: 12, fontWeight: '600', marginBottom: 4, marginLeft: 2 },
  inputContainer:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  multilineContainer: { minHeight: 100, alignItems: 'flex-start' },
  input:              { flex: 1, paddingVertical: 10, paddingHorizontal: 14, fontSize: 14 },
  inputWithLeftIcon:  { paddingLeft: 0 },
  inputWithRightIcon: { paddingRight: 0 },
  multilineInput:     { textAlignVertical: 'top', minHeight: 100 },
  leftIcon:           { paddingLeft: 12 },
  rightIcon:          { paddingRight: 12 },
  errorText:          { fontSize: 12, marginTop: 4, marginLeft: 2 },
});

export default Input;
